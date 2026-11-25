// src/bridge/web_bridge_server.ts — Local & remote HTTP job queue bridging Google Flow & AI Studio Chrome extension to frontier-studio-mcp.
import http, { type IncomingMessage, type ServerResponse } from 'node:http';
import { mkdir, rename, rm, writeFile } from 'node:fs/promises';
import { randomBytes } from 'node:crypto';
import { basename, dirname, isAbsolute, join, relative, resolve } from 'node:path';
import { studioPaths } from '../store/paths.js';
import { StudioError } from '../errors.js';
import { ingestAndNormalizeAudio } from '../tools/audio.js';

export type BridgeJobTarget = 'flow_sheet' | 'flow_plate' | 'aistudio_voice';
export type BridgeJobStatus = 'pending' | 'claimed' | 'completed' | 'failed';

export interface BridgeJobInput {
  target: BridgeJobTarget;
  film_id: string;
  asset_id?: string;
  shot_id?: string;
  line_index?: number;
  prompt: string;
  negative_prompt?: string;
  model_hint?: string;
  aspect_ratio?: string;
  voice_persona?: string;
  metadata?: Record<string, unknown>;
}

export interface BridgeJob {
  id: string;
  target: BridgeJobTarget;
  film_id: string;
  asset_id?: string;
  shot_id?: string;
  line_index?: number;
  prompt: string;
  negative_prompt?: string;
  model_hint?: string;
  aspect_ratio?: string;
  voice_persona?: string;
  metadata?: Record<string, unknown>;
  status: BridgeJobStatus;
  claimed_by?: string;
  output_path?: string;
  artifact_url?: string;
  width?: number;
  height?: number;
  byte_length?: number;
  sample_rate_hz?: number;
  duration_s?: number;
  error?: string;
  created_at: string;
  updated_at: string;
  claimed_at?: string;
  completed_at?: string;
}

export interface BridgeStatus {
  status: 'ok';
  connectedClients: number;
  pendingTasks: number;
  claimedTasks: number;
  completedTasks: number;
  failedTasks: number;
  lastHeartbeatAt: string | null;
}

export interface BridgeCompletePayload {
  data_base64?: string;
  mime_type?: string;
  error?: string;
}

export class BridgeRequestError extends Error {
  constructor(
    readonly statusCode: number,
    message: string,
  ) {
    super(message);
    this.name = 'BridgeRequestError';
  }
}

const VALID_TARGETS = new Set<BridgeJobTarget>(['flow_sheet', 'flow_plate', 'aistudio_voice']);
const SAFE_ID_RE = /^[a-zA-Z0-9][a-zA-Z0-9._-]{0,127}$/;
const PNG_MAGIC = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const MIN_PNG_BYTES = 10240; // 10 KB minimum prevents 1x1/dummy PNG placeholders
const MIN_PNG_WIDTH = 512;
const MIN_PNG_HEIGHT = 256;
const MIN_AUDIO_BYTES = 1024;
const DEFAULT_HEARTBEAT_TTL_MS = 30_000;
const MAX_BODY_BYTES = 64 * 1024 * 1024;

const MIME_TO_AUDIO_EXT: Record<string, string> = {
  'audio/wav': '.wav',
  'audio/x-wav': '.wav',
  'audio/wave': '.wav',
  'audio/vnd.wave': '.wav',
  'audio/mpeg': '.mp3',
  'audio/mp3': '.mp3',
  'audio/webm': '.webm',
  'audio/ogg': '.ogg',
  'audio/mp4': '.m4a',
  'audio/m4a': '.m4a',
  'audio/x-m4a': '.m4a',
  'audio/flac': '.flac',
  'audio/x-flac': '.flac',
};

function assertSafeId(raw: unknown, field: string): string {
  if (typeof raw !== 'string' || !raw.trim()) {
    throw new BridgeRequestError(400, `${field} is required`);
  }
  const id = raw.trim();
  if (
    id.includes('..') ||
    id.includes('/') ||
    id.includes('\\') ||
    id.includes('\0') ||
    id.includes('%') ||
    !SAFE_ID_RE.test(id)
  ) {
    throw new BridgeRequestError(400, `Invalid ${field}: path traversal or disallowed characters`);
  }
  return id;
}

function assertContainedPath(rootDir: string, targetPath: string): void {
  const rel = relative(resolve(rootDir), resolve(targetPath));
  if (!rel || rel.startsWith('..') || isAbsolute(rel)) {
    throw new BridgeRequestError(403, 'Target path escapes studioRoot');
  }
}

function decodeBase64Payload(raw: string): Buffer {
  const trimmed = raw.trim();
  const commaIdx = trimmed.startsWith('data:') ? trimmed.indexOf(',') : -1;
  const b64 = commaIdx >= 0 ? trimmed.slice(commaIdx + 1) : trimmed;
  if (!b64) {
    throw new BridgeRequestError(400, 'Empty base64 payload');
  }
  return Buffer.from(b64, 'base64');
}

function sniffAudioExtension(bytes: Buffer, mimeType?: string): string {
  if (mimeType) {
    const cleanMime = mimeType.split(';')[0].trim().toLowerCase();
    if (cleanMime in MIME_TO_AUDIO_EXT) {
      return MIME_TO_AUDIO_EXT[cleanMime];
    }
    if (cleanMime.startsWith('audio/') && cleanMime !== 'audio/octet-stream') {
      throw new BridgeRequestError(400, `Unsupported audio mime_type "${cleanMime}"`);
    }
  }

  // Fallback magic-byte sniffing when mime_type is omitted or generic octet-stream
  if (bytes.length >= 12 && bytes.subarray(0, 4).toString('ascii') === 'RIFF' && bytes.subarray(8, 12).toString('ascii') === 'WAVE') {
    return '.wav';
  }
  if (bytes.length >= 4 && bytes.subarray(0, 4).toString('ascii') === 'OggS') {
    return '.ogg';
  }
  if (bytes.length >= 4 && bytes.subarray(0, 4).toString('ascii') === 'fLaC') {
    return '.flac';
  }
  if (bytes.length >= 4 && bytes[0] === 0x1a && bytes[1] === 0x45 && bytes[2] === 0xdf && bytes[3] === 0xa3) {
    return '.webm';
  }
  if (bytes.length >= 3 && bytes.subarray(0, 3).toString('ascii') === 'ID3') {
    return '.mp3';
  }
  if (bytes.length >= 2 && bytes[0] === 0xff && (bytes[1] & 0xe0) === 0xe0) {
    return '.mp3';
  }
  if (bytes.length >= 8 && bytes.subarray(4, 8).toString('ascii') === 'ftyp') {
    return '.m4a';
  }
  return '.wav';
}

function validateAndInspectPng(bytes: Buffer): { width: number; height: number } {
  if (bytes.length < 24 || !bytes.subarray(0, 8).equals(PNG_MAGIC)) {
    throw new BridgeRequestError(400, 'Invalid PNG payload: missing PNG magic signature');
  }
  if (bytes.length < MIN_PNG_BYTES) {
    throw new BridgeRequestError(
      400,
      `Invalid PNG payload: file too small (${bytes.length} bytes < ${MIN_PNG_BYTES} byte minimum)`,
    );
  }
  const ihdrTag = bytes.subarray(12, 16).toString('ascii');
  if (ihdrTag !== 'IHDR') {
    throw new BridgeRequestError(400, 'Invalid PNG payload: missing IHDR header chunk');
  }
  const width = bytes.readUInt32BE(16);
  const height = bytes.readUInt32BE(20);
  if (width < MIN_PNG_WIDTH || height < MIN_PNG_HEIGHT) {
    throw new BridgeRequestError(
      400,
      `PNG resolution too small (${width}x${height}); expected at least ${MIN_PNG_WIDTH}x${MIN_PNG_HEIGHT}`,
    );
  }

  // Walk PNG chunk framing to reject truncated or forged payloads lacking IDAT/IEND
  let offset = 8;
  let seenIdat = false;
  let seenIend = false;
  while (offset + 12 <= bytes.length) {
    const chunkLen = bytes.readUInt32BE(offset);
    const chunkType = bytes.subarray(offset + 4, offset + 8).toString('ascii');
    const nextOffset = offset + 12 + chunkLen;
    if (nextOffset > bytes.length) {
      throw new BridgeRequestError(400, `Invalid PNG payload: truncated ${chunkType} chunk`);
    }
    if (chunkType === 'IDAT') seenIdat = true;
    if (chunkType === 'IEND') {
      seenIend = true;
      break;
    }
    offset = nextOffset;
  }
  if (!seenIdat || !seenIend) {
    throw new BridgeRequestError(400, 'Invalid PNG payload: missing required IDAT/IEND chunks');
  }
  return { width, height };
}

async function writeFileAtomic(destPath: string, bytes: Buffer): Promise<void> {
  await mkdir(dirname(destPath), { recursive: true });
  const tmpPath = join(dirname(destPath), `.tmp_${randomBytes(4).toString('hex')}_${basename(destPath)}`);
  try {
    await writeFile(tmpPath, bytes);
    await rename(tmpPath, destPath);
  } catch (err) {
    await rm(tmpPath, { force: true }).catch(() => {});
    throw err;
  }
}

export class BridgeQueue {
  readonly studioRoot: string;
  private readonly jobs = new Map<string, BridgeJob>();
  private readonly jobOrder: string[] = [];
  private readonly clients = new Map<string, number>();
  private readonly heartbeatTtlMs: number;
  private readonly nowFn: () => number;
  private lastHeartbeatMs: number | null = null;

  constructor(studioRoot: string, opts: { heartbeatTtlMs?: number; nowFn?: () => number } = {}) {
    this.studioRoot = resolve(studioRoot);
    this.heartbeatTtlMs = opts.heartbeatTtlMs ?? DEFAULT_HEARTBEAT_TTL_MS;
    this.nowFn = opts.nowFn ?? (() => Date.now());
  }

  private pruneExpiredClients(now: number): void {
    for (const [clientId, seenAt] of this.clients.entries()) {
      if (now - seenAt > this.heartbeatTtlMs) {
        this.clients.delete(clientId);
      }
    }
  }

  recordHeartbeat(clientId = 'extension-default'): void {
    const cleanId = (clientId || 'extension-default').trim().slice(0, 128) || 'extension-default';
    const now = this.nowFn();
    this.clients.set(cleanId, now);
    this.lastHeartbeatMs = now;
    this.pruneExpiredClients(now);
  }

  getStatus(): BridgeStatus {
    const now = this.nowFn();
    this.pruneExpiredClients(now);
    let pendingTasks = 0;
    let claimedTasks = 0;
    let completedTasks = 0;
    let failedTasks = 0;
    for (const job of this.jobs.values()) {
      if (job.status === 'pending') pendingTasks += 1;
      else if (job.status === 'claimed') claimedTasks += 1;
      else if (job.status === 'completed') completedTasks += 1;
      else if (job.status === 'failed') failedTasks += 1;
    }
    return {
      status: 'ok',
      connectedClients: this.clients.size,
      pendingTasks,
      claimedTasks,
      completedTasks,
      failedTasks,
      lastHeartbeatAt: this.lastHeartbeatMs !== null ? new Date(this.lastHeartbeatMs).toISOString() : null,
    };
  }

  enqueue(input: BridgeJobInput): BridgeJob {
    if (!VALID_TARGETS.has(input.target)) {
      throw new BridgeRequestError(400, `Invalid target "${String(input.target)}"; use flow_sheet | flow_plate | aistudio_voice`);
    }
    const filmId = assertSafeId(input.film_id, 'film_id');
    if (typeof input.prompt !== 'string' || !input.prompt.trim()) {
      throw new BridgeRequestError(400, 'prompt is required');
    }

    let assetId: string | undefined;
    let shotId: string | undefined;
    let lineIndex: number | undefined;

    if (input.target === 'flow_sheet' || input.target === 'flow_plate') {
      assetId = assertSafeId(input.asset_id, 'asset_id');
    } else if (input.target === 'aistudio_voice') {
      shotId = assertSafeId(input.shot_id, 'shot_id');
      lineIndex = input.line_index ?? 1;
      if (!Number.isInteger(lineIndex) || lineIndex < 1) {
        throw new BridgeRequestError(400, 'line_index must be a positive integer >= 1');
      }
    }

    const nowIso = new Date(this.nowFn()).toISOString();
    const job: BridgeJob = {
      id: `bridge_${this.nowFn()}_${randomBytes(4).toString('hex')}`,
      target: input.target,
      film_id: filmId,
      ...(assetId ? { asset_id: assetId } : {}),
      ...(shotId ? { shot_id: shotId } : {}),
      ...(lineIndex !== undefined ? { line_index: lineIndex } : {}),
      prompt: input.prompt,
      ...(input.negative_prompt ? { negative_prompt: input.negative_prompt } : {}),
      ...(input.model_hint ? { model_hint: input.model_hint } : {}),
      ...(input.aspect_ratio ? { aspect_ratio: input.aspect_ratio } : {}),
      ...(input.voice_persona ? { voice_persona: input.voice_persona } : {}),
      ...(input.metadata ? { metadata: input.metadata } : {}),
      status: 'pending',
      created_at: nowIso,
      updated_at: nowIso,
    };

    this.jobs.set(job.id, job);
    this.jobOrder.push(job.id);
    return job;
  }

  claimNext(clientId?: string, targets?: BridgeJobTarget[]): BridgeJob | null {
    this.recordHeartbeat(clientId || 'extension-poller');
    const targetSet = targets && targets.length > 0 ? new Set(targets) : null;
    for (const id of this.jobOrder) {
      const job = this.jobs.get(id);
      if (!job || job.status !== 'pending') continue;
      if (targetSet && !targetSet.has(job.target)) continue;
      const nowIso = new Date(this.nowFn()).toISOString();
      job.status = 'claimed';
      job.claimed_by = (clientId || 'extension-poller').trim() || 'extension-poller';
      job.claimed_at = nowIso;
      job.updated_at = nowIso;
      return job;
    }
    return null;
  }

  getJob(jobId: string): BridgeJob | undefined {
    const cleanId = assertSafeId(jobId, 'job_id');
    return this.jobs.get(cleanId);
  }

  listJobs(): BridgeJob[] {
    const list: BridgeJob[] = [];
    for (let i = this.jobOrder.length - 1; i >= 0; i--) {
      const job = this.jobs.get(this.jobOrder[i]);
      if (job) list.push(job);
    }
    return list;
  }

  async completeJob(jobId: string, payload: BridgeCompletePayload): Promise<BridgeJob> {
    const cleanId = assertSafeId(jobId, 'job_id');
    const job = this.jobs.get(cleanId);
    if (!job) {
      throw new BridgeRequestError(404, `Bridge job "${cleanId}" not found`);
    }
    if (job.status === 'completed') {
      throw new BridgeRequestError(409, `Bridge job "${cleanId}" is already completed`);
    }

    const nowIso = new Date(this.nowFn()).toISOString();
    if (payload.error && !payload.data_base64) {
      job.status = 'failed';
      job.error = String(payload.error);
      job.completed_at = nowIso;
      job.updated_at = nowIso;
      return job;
    }

    if (typeof payload.data_base64 !== 'string' || !payload.data_base64.trim()) {
      throw new BridgeRequestError(400, 'data_base64 (or error) is required to complete a bridge job');
    }

    const bytes = decodeBase64Payload(payload.data_base64);
    const paths = studioPaths(this.studioRoot);

    if (job.target === 'flow_sheet' || job.target === 'flow_plate') {
      const { width, height } = validateAndInspectPng(bytes);
      const kindDir =
        job.target === 'flow_sheet'
          ? 'characters'
          : job.metadata?.asset_kind === 'styles'
            ? 'styles'
            : 'locations';
      const fileName = job.target === 'flow_sheet' ? 'sheet.png' : 'plate.png';
      const destPath = join(paths.assetDir(job.film_id, kindDir, job.asset_id!), fileName);
      assertContainedPath(this.studioRoot, destPath);

      await writeFileAtomic(destPath, bytes);
      const relArtifact = relative(this.studioRoot, destPath).replace(/\\/g, '/');

      job.status = 'completed';
      job.output_path = destPath;
      job.artifact_url = `/artifacts/${relArtifact}`;
      job.width = width;
      job.height = height;
      job.byte_length = bytes.length;
      job.error = undefined;
      job.completed_at = nowIso;
      job.updated_at = nowIso;
      return job;
    }

    // aistudio_voice -> validate >= 1KB audio, FFmpeg normalize to 48kHz mono PCM WAV atomically
    if (bytes.length < MIN_AUDIO_BYTES) {
      throw new BridgeRequestError(
        400,
        `Invalid audio payload: file too small (${bytes.length} bytes < ${MIN_AUDIO_BYTES} byte minimum)`,
      );
    }

    const lineIdx = job.line_index ?? 1;
    const audioDir = paths.audioDir(job.film_id);
    const destPath = paths.audioPath(job.film_id, `${job.shot_id}_line_${lineIdx}.wav`);
    assertContainedPath(this.studioRoot, destPath);
    await mkdir(audioDir, { recursive: true });

    const ext = sniffAudioExtension(bytes, payload.mime_type);
    const tmpIn = join(audioDir, `.tmp_bridge_${randomBytes(4).toString('hex')}${ext}`);
    try {
      await writeFile(tmpIn, bytes);
      const ingested = await ingestAndNormalizeAudio({
        sourcePath: tmpIn,
        destPath,
        label: `${job.shot_id}_line_${lineIdx}${ext}`,
      });
      const relArtifact = relative(this.studioRoot, destPath).replace(/\\/g, '/');

      job.status = 'completed';
      job.output_path = destPath;
      job.artifact_url = `/artifacts/${relArtifact}`;
      job.sample_rate_hz = ingested.sampleRateHz;
      job.duration_s = ingested.durationS;
      job.byte_length = bytes.length;
      job.error = undefined;
      job.completed_at = nowIso;
      job.updated_at = nowIso;
      return job;
    } catch (err) {
      if (err instanceof BridgeRequestError) throw err;
      if (err instanceof StudioError) {
        throw new BridgeRequestError(400, err.message);
      }
      throw new BridgeRequestError(400, (err as Error).message || 'Audio ingestion failed');
    } finally {
      await rm(tmpIn, { force: true }).catch(() => {});
    }
  }
}

const SHARED_QUEUES = new Map<string, BridgeQueue>();

function queueCacheKey(studioRoot: string): string {
  const abs = resolve(studioRoot);
  return process.platform === 'win32' ? abs.toLowerCase() : abs;
}

export function getSharedBridgeQueue(studioRoot: string): BridgeQueue {
  const key = queueCacheKey(studioRoot);
  let queue = SHARED_QUEUES.get(key);
  if (!queue) {
    queue = new BridgeQueue(resolve(studioRoot));
    SHARED_QUEUES.set(key, queue);
  }
  return queue;
}

async function readJsonBody<T = Record<string, unknown>>(req: IncomingMessage): Promise<T> {
  return new Promise((resolveBody, rejectBody) => {
    const chunks: Buffer[] = [];
    let total = 0;
    req.on('data', (chunk: Buffer) => {
      total += chunk.length;
      if (total > MAX_BODY_BYTES) {
        rejectBody(new BridgeRequestError(413, 'Request body exceeds 64MB limit'));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => {
      const raw = Buffer.concat(chunks).toString('utf8').trim();
      if (!raw) {
        resolveBody({} as T);
        return;
      }
      try {
        resolveBody(JSON.parse(raw) as T);
      } catch {
        rejectBody(new BridgeRequestError(400, 'Invalid JSON body'));
      }
    });
    req.on('error', rejectBody);
  });
}

function sendJson(res: ServerResponse, statusCode: number, body: unknown): void {
  if (!res.headersSent) {
    res.writeHead(statusCode, { 'Content-Type': 'application/json' });
  }
  res.end(JSON.stringify(body));
}

export interface WebBridgeServerOptions {
  port?: number;
  host?: string;
  studioRoot?: string;
  queue?: BridgeQueue;
}

export class WebBridgeServer {
  private readonly host: string;
  private port: number;
  private readonly queue: BridgeQueue;
  private server: http.Server | null = null;
  private running = false;

  constructor(opts: WebBridgeServerOptions = {}) {
    this.host = opts.host ?? '127.0.0.1';
    this.port = opts.port ?? 8081;
    const root = opts.studioRoot || process.env.STUDIO_ROOT || process.cwd();
    this.queue = opts.queue ?? getSharedBridgeQueue(root);
  }

  getQueue(): BridgeQueue {
    return this.queue;
  }

  getStatus(): BridgeStatus {
    return this.queue.getStatus();
  }

  isRunning(): boolean {
    return this.running;
  }

  async handleRequest(req: IncomingMessage, res: ServerResponse): Promise<boolean> {
    if (!res.headersSent && !res.hasHeader('Access-Control-Allow-Origin')) {
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', '*');
    }
    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return true;
    }

    const rawUrl = req.url ?? '/';
    if (rawUrl.includes('..') || rawUrl.includes('%2e%2e') || rawUrl.includes('%2E%2E')) {
      sendJson(res, 403, { error: 'Forbidden' });
      return true;
    }

    const hostHeader = req.headers.host || '127.0.0.1';
    const parsedUrl = new URL(rawUrl, `http://${hostHeader}`);
    const pathname = parsedUrl.pathname;

    if (pathname !== '/bridge' && !pathname.startsWith('/bridge/')) {
      return false;
    }

    try {
      // GET /bridge/status
      if (req.method === 'GET' && pathname === '/bridge/status') {
        const clientId = parsedUrl.searchParams.get('client_id') || (req.headers['x-client-id'] as string | undefined);
        if (clientId && clientId.trim()) {
          this.queue.recordHeartbeat(clientId);
        }
        sendJson(res, 200, this.queue.getStatus());
        return true;
      }

      // GET /bridge/jobs
      if (req.method === 'GET' && pathname === '/bridge/jobs') {
        sendJson(res, 200, { jobs: this.queue.listJobs() });
        return true;
      }

      // POST /bridge/jobs
      if (req.method === 'POST' && pathname === '/bridge/jobs') {
        const body = await readJsonBody<BridgeJobInput>(req);
        const job = this.queue.enqueue(body);
        sendJson(res, 201, { job_id: job.id, status: job.status, job });
        return true;
      }

      // GET /bridge/jobs/next
      if (req.method === 'GET' && pathname === '/bridge/jobs/next') {
        const clientId = parsedUrl.searchParams.get('client_id') || (req.headers['x-client-id'] as string | undefined);
        const targetsParam = parsedUrl.searchParams.get('targets');
        const targets = targetsParam
          ? (targetsParam.split(',').map((s) => s.trim()).filter(Boolean) as BridgeJobTarget[])
          : undefined;
        const job = this.queue.claimNext(clientId, targets);
        sendJson(res, 200, { job });
        return true;
      }

      // POST /bridge/jobs/:id/complete
      const completeMatch = pathname.match(/^\/bridge\/jobs\/([^/]+)\/complete$/);
      if (req.method === 'POST' && completeMatch) {
        const jobId = decodeURIComponent(completeMatch[1]);
        const body = await readJsonBody<BridgeCompletePayload>(req);
        const job = await this.queue.completeJob(jobId, body);
        sendJson(res, 200, {
          job_id: job.id,
          status: job.status,
          output_path: job.output_path ?? null,
          artifact_url: job.artifact_url ?? null,
          width: job.width,
          height: job.height,
          byte_length: job.byte_length,
          sample_rate_hz: job.sample_rate_hz,
          duration_s: job.duration_s,
          error: job.error,
          job,
        });
        return true;
      }

      // GET /bridge/jobs/:id
      const jobMatch = pathname.match(/^\/bridge\/jobs\/([^/]+)$/);
      if (req.method === 'GET' && jobMatch) {
        const jobId = decodeURIComponent(jobMatch[1]);
        const job = this.queue.getJob(jobId);
        if (!job) {
          sendJson(res, 404, { error: `Bridge job "${jobId}" not found` });
          return true;
        }
        sendJson(res, 200, {
          job_id: job.id,
          status: job.status,
          target: job.target,
          output_path: job.output_path ?? null,
          error: job.error ?? null,
          job,
        });
        return true;
      }

      sendJson(res, 404, { error: 'Bridge endpoint not found' });
      return true;
    } catch (err) {
      if (err instanceof BridgeRequestError) {
        sendJson(res, err.statusCode, { error: err.message });
        return true;
      }
      sendJson(res, 500, { error: (err as Error).message || 'Internal bridge error' });
      return true;
    }
  }

  async start(): Promise<{ port: number; host: string }> {
    if (this.server && this.running) {
      return { port: this.port, host: this.host };
    }
    const srv = http.createServer((req, res) => {
      void this.handleRequest(req, res).then((handled) => {
        if (!handled && !res.headersSent) {
          sendJson(res, 404, { error: 'Not found' });
        }
      });
    });
    this.server = srv;

    return new Promise((resolveStart, rejectStart) => {
      srv.once('error', rejectStart);
      srv.listen(this.port, this.host, () => {
        srv.off('error', rejectStart);
        const addr = srv.address();
        if (addr && typeof addr === 'object') {
          this.port = addr.port;
        }
        this.running = true;
        resolveStart({ port: this.port, host: this.host });
      });
    });
  }

  async stop(): Promise<void> {
    if (!this.server) return;
    const srv = this.server;
    this.server = null;
    this.running = false;
    await new Promise<void>((resolveStop, rejectStop) => {
      srv.close((err) => (err ? rejectStop(err) : resolveStop()));
    });
  }
}
