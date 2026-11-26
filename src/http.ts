// src/http.ts — HTTP & SSE transport server for remote MCP clients and static artifact streaming.
import http, { type IncomingMessage, type ServerResponse } from 'node:http';
import { createReadStream } from 'node:fs';
import { stat, readFile, readdir, writeFile, mkdir, rename } from 'node:fs/promises';
import { execFile as execFileCb } from 'node:child_process';
import { promisify } from 'node:util';
import { extname, isAbsolute, relative, resolve, join } from 'node:path';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { buildServer } from './server.js';
import { studioPaths } from './store/paths.js';
import { filmShow, filmCreate, filmMetaOrThrow, type FilmMeta } from './store/film.js';
import { shotShow, shotCreate, shotUpdate, type ShotRecord } from './store/shot.js';
import { readJson, writeJsonAtomic } from './store/fs.js';
import { readJobs, updateJob, type VideoJobEntry } from './store/jobs.js';
import { generateFcpxmlString } from './tools/editor.js';
import { submitShotRender, jobEntryOrThrow, reconcileJobDownload, refundDeadJob } from './tools/video.js';
import { VultrLane } from './lanes/vultr.js';
import { loadConfig } from './config.js';
import type { VideoQuality } from './lanes/video.js';
import { probeMedia } from './qa/critic.js';
import { StudioError } from './errors.js';
import { WebBridgeServer, getSharedBridgeQueue } from './bridge/web_bridge_server.js';
import { enrollCharacterVoice, validateShotTable } from './continuity/intelligence.js';
import { compileDirectorDeskScene } from './continuity/director_desk.js';
import { fetchRemoteApiSfx, loadSfxCatalog, resolveSfxWavPath, searchSfxCatalog, VIRAL_SFX_PACK_MAP } from './sfx/sfx_engine.js';
import { autoSpotClipSfx, calculateDynamicReframeTrack, computeDeadAirJumpCuts, executeClipRender, extractViralHookVariants, generateClipProductionPlan } from './clipping/pipeline.js';
import { MODEL_CATALOG, NICHE_TOOLKITS } from './saas/viduxtool.js';

const execFileAsync = promisify(execFileCb);

const MIME_TYPES: Record<string, string> = {
  '.mp4': 'video/mp4',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.wav': 'audio/wav',
  '.mp3': 'audio/mpeg',
  '.json': 'application/json',
  '.jsonl': 'application/x-ndjson',
  '.md': 'text/markdown; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml',
};

export interface HttpServerOptions {
  studioRoot: string;
  port?: number;
  host?: string;
  version?: string;
}

export interface StudioHttpServer {
  server: http.Server;
  port: number;
  host: string;
  close: () => Promise<void>;
}

async function readBodyJson<T = any>(req: IncomingMessage): Promise<T> {
  return new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', (chunk) => { raw += chunk.toString(); });
    req.on('end', () => {
      try {
        resolve(raw ? JSON.parse(raw) : {} as T);
      } catch (e) {
        reject(e);
      }
    });
    req.on('error', reject);
  });
}

export function createHttpServer(opts: HttpServerOptions): StudioHttpServer {
  const root = resolve(opts.studioRoot);
  const version = opts.version || '0.1.0';
  const sessions = new Map<string, { transport: SSEServerTransport; mcpServer: McpServer }>();
  const bridgeServer = new WebBridgeServer({ studioRoot: root, queue: getSharedBridgeQueue(root) });

  const dispatchRequest = async (req: IncomingMessage, res: ServerResponse): Promise<void> => {
    // CORS headers for browser clients
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', '*');

    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

    const hostHeader = req.headers.host || 'localhost';
    const rawUrl = req.url ?? '/';

    // Global traversal guard
    if (rawUrl.includes('..') || rawUrl.toLowerCase().includes('%2e%2e')) {
      res.writeHead(403, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Forbidden' }));
      return;
    }

    let parsedUrl: URL;
    try {
      parsedUrl = new URL(rawUrl, `http://${hostHeader}`);
    } catch {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Invalid request URL or Host header' }));
      return;
    }
    const pathname = parsedUrl.pathname;

    // Google AI Pro Browser Extension Bridge API (/bridge/*)
    if (pathname === '/bridge' || pathname.startsWith('/bridge/')) {
      await bridgeServer.handleRequest(req, res);
      return;
    }

    // Web Director Console UI & Landing Page
    if (req.method === 'GET' && pathname === '/studio') {
      const consolePath = resolve(process.cwd(), 'web', 'studio.html');
      try {
        const content = await readFile(consolePath, 'utf8');
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(content);
        return;
      } catch {}
    }

    if (req.method === 'GET' && pathname === '/landing') {
      const landingPath = resolve(process.cwd(), 'web', 'index.html');
      try {
        const content = await readFile(landingPath, 'utf8');
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(content);
        return;
      } catch {}
    }

    const discoveryPayload = {
      service: 'frontier-studio-mcp',
      mode: 'hybrid-studio-and-mcp',
      version,
      studioRoot: root,
      endpoints: {
        studio_ui: '/studio',
        landing_ui: '/landing',
        sse: '/sse',
        messages: '/messages',
        health: '/health',
        bridge_status: '/bridge/status',
        bridge_jobs: '/bridge/jobs',
        artifacts: '/artifacts/*',
        films: '/api/films',
        fcpxml: '/api/export/fcpxml',
      },
    };

    if (req.method === 'GET' && pathname === '/api/info') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(discoveryPayload));
      return;
    }

    // Content-negotiated Root: Browsers receive the Studio Console UI, headless/API clients receive MCP discovery JSON
    if (req.method === 'GET' && pathname === '/') {
      const accept = String(req.headers.accept ?? '');
      if (accept.includes('text/html')) {
        const consolePath = resolve(process.cwd(), 'web', 'studio.html');
        try {
          const content = await readFile(consolePath, 'utf8');
          res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
          res.end(content);
          return;
        } catch {}
      }
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(discoveryPayload));
      return;
    }

    // ── 1. Dynamic Projects List API ──────────────────────────────────────────
    if (req.method === 'GET' && pathname === '/api/films') {
      try {
        const paths = studioPaths(root);
        let filmDirs: string[] = [];
        try {
          filmDirs = await readdir(paths.filmsDir);
        } catch {}
        const films: FilmMeta[] = [];
        for (const dir of filmDirs) {
          try {
            films.push(await filmShow(paths, dir));
          } catch {}
        }
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ films }));
        return;
      } catch (err: any) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
        return;
      }
    }

    // ── 2. Create Film Project API ───────────────────────────────────────────
    if (req.method === 'POST' && pathname === '/api/films') {
      try {
        const body = await readBodyJson(req);
        const paths = studioPaths(root);
        const filmId = body.film_id || `film_${Date.now()}`;
        const meta = await filmCreate(paths, filmId, {
          title: body.title,
          logline: body.logline,
          budgetUsd: body.budget_usd ? Number(body.budget_usd) : undefined,
          targetRuntimeMin: body.target_runtime_min ? Number(body.target_runtime_min) : undefined,
        });
        res.writeHead(201, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ film: meta }));
        return;
      } catch (err: any) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
        return;
      }
    }

    // ── 3. Dynamic Studio Film Data API ───────────────────────────────────────
    if (req.method === 'GET' && pathname === '/api/film') {
      try {
        const filmId = parsedUrl.searchParams.get('film_id') || 'film_heart_of_colossus';
        const paths = studioPaths(root);
        const meta = await filmShow(paths, filmId);
        const shotsDir = paths.shotsDir(filmId);
        let shotFiles: string[] = [];
        try {
          shotFiles = (await readdir(shotsDir)).filter((f) => f.endsWith('.json'));
        } catch {}
        const shots = [];
        for (const sf of shotFiles.sort()) {
          try {
            shots.push(await readJson(`${shotsDir}/${sf}`));
          } catch {}
        }

        // Discover characters and locations
        const charDir = paths.assetDir(filmId, 'characters', '');
        let characters: any[] = [];
        try {
          const cNames = await readdir(charDir.replace(/\/$/, ''));
          for (const cn of cNames) {
            characters.push({
              id: cn,
              sheetUrl: `/artifacts/films/${filmId}/assets/characters/${cn}/sheet.png`,
            });
          }
        } catch {}

        const locDir = paths.assetDir(filmId, 'locations', '');
        let locations: any[] = [];
        try {
          const lNames = await readdir(locDir.replace(/\/$/, ''));
          for (const ln of lNames) {
            locations.push({
              id: ln,
              plateUrl: `/artifacts/films/${filmId}/assets/locations/${ln}/plate.png`,
            });
          }
        } catch {}

        // Read jobs.json & ledger
        let jobs: any[] = [];
        try {
          jobs = await readJobs(paths, filmId);
        } catch {}

        let totalSpentUsd = 0;
        try {
          const ledgerRaw = await readFile(paths.ledgerPath(filmId), 'utf8');
          for (const line of ledgerRaw.split('\n')) {
            if (!line.trim()) continue;
            try {
              const entry = JSON.parse(line);
              if (entry.cost_usd && !entry.estimated) totalSpentUsd += entry.cost_usd;
            } catch {}
          }
        } catch {}

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          film: meta,
          shots,
          assets: { characters, locations },
          jobs,
          totalSpentUsd: Math.round(totalSpentUsd * 100) / 100,
        }));
        return;
      } catch (err: any) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
        return;
      }
    }

    // ── 4. Create / Update Shot API ──────────────────────────────────────────
    if (req.method === 'POST' && pathname === '/api/shots') {
      try {
        const body = await readBodyJson(req);
        const paths = studioPaths(root);
        const filmId = body.film_id;
        const shotData = body.shot;
        if (!filmId || !shotData || !shotData.id) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'film_id and shot.id are required' }));
          return;
        }

        const shotPath = paths.shotPath(filmId, shotData.id);
        await writeJsonAtomic(shotPath, shotData);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ shot: shotData }));
        return;
      } catch (err: any) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
        return;
      }
    }

    // ── 5. Real GPU Video Render Submission API ───────────────────────────────
    if (req.method === 'POST' && pathname === '/api/shots/render') {
      try {
        const body = await readBodyJson(req);
        const filmId = body.film_id || 'film_heart_of_colossus';
        const shotId = body.shot_id;
        const quality = (body.quality || 'standard') as VideoQuality;
        const aspectRatio = body.aspect_ratio || '16:9';

        if (!shotId) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'shot_id is required' }));
          return;
        }

        const paths = studioPaths(root);
        const shot = await shotShow(paths, filmId, shotId);
        const sub = await submitShotRender({
          studioRoot: root,
          paths,
          filmId,
          shot,
          quality,
          aspectRatio,
          tool: 'render_shot',
        });

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          status: 'submitted',
          jobId: sub.jobId,
          estimateUsd: sub.estimateUsd,
          durationS: sub.durationS,
        }));
        return;
      } catch (err: any) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
        return;
      }
    }

    // ── 6. Live Job Status & Auto-Download Poller API ─────────────────────────
    if (req.method === 'POST' && pathname === '/api/jobs/poll') {
      try {
        const body = await readBodyJson(req);
        const filmId = typeof body?.film_id === 'string' && body.film_id.trim() ? body.film_id.trim() : 'film_heart_of_colossus';
        const jobId = typeof body?.job_id === 'string' ? body.job_id.trim() : '';
        if (!jobId) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'job_id is required' }));
          return;
        }
        if (
          filmId.includes('..') || filmId.includes('/') || filmId.includes('\\')
          || jobId.includes('..') || jobId.includes('/') || jobId.includes('\\')
        ) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Invalid film_id or job_id' }));
          return;
        }

        const paths = studioPaths(root);
        await filmMetaOrThrow(paths, filmId);
        await jobEntryOrThrow(paths, filmId, jobId);

        const cfg = loadConfig({ ...process.env, STUDIO_ROOT: process.env.STUDIO_ROOT || root });
        const apiKey = cfg.vultrApiKey || '';
        if (!apiKey) {
          res.writeHead(401, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'VULTR_INFERENCE_API_KEY is not set' }));
          return;
        }
        const lane = new VultrLane(apiKey);
        const jobStatus = await lane.status({ jobId });

        if (jobStatus.status === 'completed') {
          const artifact = await lane.result({ jobId });
          // Money-law order: settle provider charge BEFORE saving/probing MP4
          await reconcileJobDownload(paths, filmId, jobId, artifact.costUsd, 'http_job_poll');

          const rendersDir = join(paths.rendersDir(filmId), jobId);
          await mkdir(rendersDir, { recursive: true });
          const mp4Path = join(rendersDir, 'shot.mp4');
          await writeFile(mp4Path, artifact.data);

          const probe = await probeMedia(mp4Path);
          const isProbeValid =
            probe.exists &&
            probe.hasVideo &&
            probe.width > 0 &&
            probe.height > 0 &&
            probe.durationS > 0.05 &&
            !(probe.nbFrames > 0 && probe.nbFrames < 2);

          let ffmpegDecodeError: string | undefined;
          if (isProbeValid) {
            try {
              await execFileAsync('ffmpeg', ['-v', 'error', '-i', mp4Path, '-frames:v', '1', '-f', 'null', '-']);
            } catch (e: unknown) {
              ffmpegDecodeError = (e as { stderr?: string; message?: string }).stderr || (e as Error).message || 'ffmpeg_decode_error';
            }
          }

          if (!isProbeValid || ffmpegDecodeError) {
            await rename(mp4Path, join(rendersDir, 'shot.corrupt.mp4')).catch(() => {});
            await updateJob(paths, filmId, jobId, (j) => {
              const next: VideoJobEntry = {
                ...j,
                status: 'failed',
                error_verbatim: 'downloaded video failed ffprobe decode validation',
                actual_cost_usd: artifact.costUsd,
              };
              delete next.artifact_path;
              delete next.note;
              return next;
            });
            res.writeHead(502, { 'Content-Type': 'application/json' });
            res.end(
              JSON.stringify({
                status: 'failed',
                jobId,
                error: `downloaded video failed probeMedia/ffmpeg decode validation (${ffmpegDecodeError ?? probe.error ?? 'invalid video stream'})`,
              }),
            );
            return;
          }

          // Best-effort tail frame extraction for downstream continuous chaining
          await execFileAsync('ffmpeg', [
            '-y', '-sseof', '-0.1', '-i', mp4Path, '-frames:v', '1', '-q:v', '2', join(rendersDir, 'tail_frame.png'),
          ]).catch(() => {});

          const durationS = Number(probe.durationS.toFixed(2));
          const resolution = `${probe.width}x${probe.height}`;
          await updateJob(paths, filmId, jobId, (j) => {
            const next: VideoJobEntry = {
              ...j,
              status: 'completed',
              artifact_path: mp4Path,
              actual_cost_usd: artifact.costUsd,
              ...(artifact.realSeconds !== undefined ? { real_seconds: artifact.realSeconds } : {}),
              width: probe.width,
              height: probe.height,
              resolution,
              fps: probe.fps,
              duration_s: durationS,
              has_audio: probe.hasAudio,
            };
            delete next.note;
            delete next.error_verbatim;
            return next;
          });

          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(
            JSON.stringify({
              status: 'completed',
              progress: 100,
              jobId,
              videoUrl: `/artifacts/films/${filmId}/renders/${jobId}/shot.mp4`,
              costUsd: artifact.costUsd,
              duration: artifact.realSeconds || durationS,
              width: probe.width,
              height: probe.height,
              fps: probe.fps,
              resolution,
            }),
          );
          return;
        }

        let refundNote: string | undefined;
        if (
          jobStatus.status === 'failed'
          || jobStatus.status === 'cancelled'
          || jobStatus.status === 'expired'
        ) {
          refundNote = await refundDeadJob(paths, filmId, jobId, 'http_job_poll');
        }

        await updateJob(paths, filmId, jobId, (j) => {
          const next: VideoJobEntry = {
            ...j,
            status: jobStatus.status,
          };
          if (jobStatus.status === 'failed' && jobStatus.errorVerbatim !== undefined) {
            next.error_verbatim = jobStatus.errorVerbatim;
          } else {
            delete next.error_verbatim;
          }
          if (refundNote !== undefined) {
            next.note = refundNote;
          }
          return next;
        });

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(
          JSON.stringify({
            status: jobStatus.status,
            progress: jobStatus.progress,
            jobId,
            ...(jobStatus.errorVerbatim !== undefined ? { error_verbatim: jobStatus.errorVerbatim } : {}),
            ...(refundNote !== undefined ? { note: refundNote } : {}),
          }),
        );
        return;
      } catch (err: any) {
        let status = 500;
        if (err instanceof SyntaxError) status = 400;
        else if (err instanceof StudioError) {
          if (err.code === 'VALIDATION') status = 400;
          else if (err.code === 'NOT_FOUND') status = 404;
          else if (err.code === 'AUTH') status = 401;
          else if (err.code === 'BUDGET') status = 402;
          else status = 502;
        }
        res.writeHead(status, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err?.message || 'Internal error' }));
        return;
      }
    }

    // ── 7. Dynamic FCPXML Timeline Export API ─────────────────────────────────
    if (req.method === 'GET' && pathname === '/api/export/fcpxml') {
      try {
        const filmId = parsedUrl.searchParams.get('film_id') || 'film_heart_of_colossus';
        const paths = studioPaths(root);
        const timelinesDir = join(paths.filmDir(filmId), 'timelines');
        await mkdir(timelinesDir, { recursive: true });
        const xmlContent = await generateFcpxmlString(paths, filmId);
        const xmlPath = join(timelinesDir, `${filmId}.fcpxml`);
        await writeFile(xmlPath, xmlContent, 'utf8');

        res.writeHead(200, {
          'Content-Type': 'application/xml',
          'Content-Disposition': `attachment; filename="${filmId}.fcpxml"`,
        });
        res.end(xmlContent);
        return;
      } catch (err: any) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
        return;
      }
    }

    // ── 7b. Trending SFX Kit & API Routes ─────────────────────────────────────
    if (req.method === 'GET' && pathname === '/api/sfx/search') {
      try {
        const q = parsedUrl.searchParams.get('q') ?? undefined;
        const category = parsedUrl.searchParams.get('category') ?? undefined;
        const preset = parsedUrl.searchParams.get('preset') ?? undefined;
        const limit = Number(parsedUrl.searchParams.get('limit') || '24');
        const catalog = await loadSfxCatalog();
        const resSearch = await searchSfxCatalog({ query: q, category, viral_preset: preset, limit });
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          categories: catalog.categories,
          viral_presets: VIRAL_SFX_PACK_MAP,
          total_matches: resSearch.total_matches,
          results: resSearch.results,
        }));
        return;
      } catch (err: any) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
        return;
      }
    }

    if (req.method === 'GET' && pathname === '/api/sfx/wav') {
      try {
        const id = parsedUrl.searchParams.get('id') || '';
        const resolved = await resolveSfxWavPath(id, root);
        const st = await stat(resolved.filePath);
        res.writeHead(200, {
          'Content-Type': 'audio/wav',
          'Content-Length': st.size,
          'Accept-Ranges': 'bytes',
        });
        createReadStream(resolved.filePath).pipe(res);
        return;
      } catch (err: any) {
        const code = err instanceof StudioError && err.code === 'NOT_FOUND' ? 404 : 500;
        res.writeHead(code, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
        return;
      }
    }

    if (req.method === 'POST' && pathname === '/api/sfx/fetch') {
      try {
        const body = await readBodyJson(req);
        const result = await fetchRemoteApiSfx({
          provider: body.provider === 'freesound' ? 'freesound' : 'elevenlabs',
          queryOrPrompt: String(body.query || body.prompt || ''),
          durationS: body.duration_s ? Number(body.duration_s) : undefined,
          studioRoot: root,
        });
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(result));
        return;
      } catch (err: any) {
        const status = err instanceof StudioError && err.code === 'VALIDATION' ? 400 : 502;
        res.writeHead(status, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
        return;
      }
    }

    // ── 7c. Continuity Paper-Render & Voice Enrollment APIs ───────────────────
    if (req.method === 'POST' && pathname === '/api/continuity/validate-table') {
      try {
        const body = await readBodyJson(req);
        const audit = await validateShotTable(body);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(audit));
        return;
      } catch (err: any) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
        return;
      }
    }

    if (req.method === 'POST' && pathname === '/api/continuity/voice-enroll') {
      try {
        const body = await readBodyJson(req);
        const resEnroll = await enrollCharacterVoice(studioPaths(root), body);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(resEnroll));
        return;
      } catch (err: any) {
        res.writeHead(err instanceof StudioError && err.code === 'NOT_FOUND' ? 404 : 400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
        return;
      }
    }

    if (req.method === 'POST' && pathname === '/api/director-desk/compile') {
      try {
        const body = await readBodyJson(req);
        const compiled = compileDirectorDeskScene(body);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(compiled));
        return;
      } catch (err: any) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
        return;
      }
    }

    // ── 7d. Clip Studio / VI APIs & Toolkit Discovery ─────────────────────────
    if (req.method === 'GET' && pathname === '/api/toolkits') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        toolkits: Object.values(NICHE_TOOLKITS),
        models: Object.values(MODEL_CATALOG),
      }));
      return;
    }

    if (req.method === 'POST' && (pathname === '/api/clipping/plan' || pathname === '/api/clipping/render')) {
      try {
        const body = await readBodyJson(req);
        const clipId = String(body.clip_id || `clip_${Date.now()}`);
        const startS = Number(body.start_s ?? 0);
        const endS = Number(body.end_s ?? 15);
        const words = Array.isArray(body.words) ? body.words : [];
        const srcPath = String(body.source_path || '');
        const srcW = Number(body.source_width ?? 1920);
        const srcH = Number(body.source_height ?? 1080);

        const reframe = calculateDynamicReframeTrack(body.face_coordinates || [], srcW, srcH);
        const hooks = extractViralHookVariants(words, String(body.title_hook || 'CLIP THAT'));
        const deadAir = computeDeadAirJumpCuts(words);
        const candidate = {
          clip_id: clipId,
          start_s: startS,
          end_s: endS,
          duration_s: Number((endS - startS).toFixed(3)),
          viral_score: 90,
          title_hook: String(body.title_hook || 'CLIP THAT'),
          reason: hooks[0]?.hook_text ?? 'viral highlight',
          speech_density: 0.85,
          audio_energy_db: -6,
          words,
        };
        const outDir = join(root, 'clips');
        const plan = generateClipProductionPlan(
          candidate,
          { source_id: clipId, local_path: srcPath, duration_s: endS, width: srcW, height: srcH, fps: 30 },
          reframe,
          outDir,
        );

        if (pathname === '/api/clipping/plan') {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ plan, hook_variants: hooks, dead_air: deadAir }));
          return;
        }

        const sfxSpots = body.auto_sfx !== false ? await autoSpotClipSfx(candidate, root) : [];
        const rendered = await executeClipRender(plan, {
          burnCaptions: body.burn_captions !== false,
          sfxSpots,
          studioRoot: root,
        });
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ rendered, sfx_spots: sfxSpots, artifact_url: `/artifacts/clips/${clipId}.mp4` }));
        return;
      } catch (err: any) {
        const status = err instanceof StudioError && err.code === 'VALIDATION' ? 400 : 500;
        res.writeHead(status, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
        return;
      }
    }

    // ── 8. Health Check Probe ────────────────────────────────────────────────
    if (req.method === 'GET' && pathname === '/health') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'ok', version, studioRoot: root }));
      return;
    }

    // ── 9. SSE Handshake Endpoint ─────────────────────────────────────────────
    if (req.method === 'GET' && pathname === '/sse') {
      try {
        const transport = new SSEServerTransport('/messages', res);
        const mcpServer = buildServer({ studioRoot: root });
        const sessionId = transport.sessionId;

        sessions.set(sessionId, { transport, mcpServer });

        let isClosing = false;
        transport.onclose = () => {
          sessions.delete(sessionId);
          if (!isClosing) {
            isClosing = true;
            mcpServer.close().catch(() => {});
          }
        };

        await mcpServer.connect(transport);
      } catch (err) {
        if (!res.headersSent) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: (err as Error).message }));
        }
      }
      return;
    }

    // ── 10. Post Messages for Active SSE Sessions ─────────────────────────────
    if (req.method === 'POST' && pathname === '/messages') {
      const sessionId = parsedUrl.searchParams.get('sessionId');
      if (!sessionId || !sessions.has(sessionId)) {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Session not found or expired' }));
        return;
      }
      const { transport } = sessions.get(sessionId)!;
      await transport.handlePostMessage(req, res);
      return;
    }

    // ── 11. Static Artifact Streaming ────────────────────────────────────────
    if (req.method === 'GET' && pathname.startsWith('/artifacts/')) {
      const rawRelPath = pathname.slice('/artifacts/'.length);
      const safeRelPath = rawRelPath.split('/').filter((seg) => seg && seg !== '.' && seg !== '..').join('/');
      const filePath = resolve(root, safeRelPath);

      const rel = relative(root, filePath);
      if (rel.startsWith('..') || isAbsolute(rel)) {
        res.writeHead(403, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Forbidden' }));
        return;
      }

      try {
        const fileStat = await stat(filePath);
        if (!fileStat.isFile()) {
          res.writeHead(404, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Not a file' }));
          return;
        }

        const ext = extname(filePath).toLowerCase();
        const contentType = MIME_TYPES[ext] || 'application/octet-stream';

        res.writeHead(200, {
          'Content-Type': contentType,
          'Content-Length': fileStat.size,
          'Accept-Ranges': 'bytes',
        });

        const stream = createReadStream(filePath);
        stream.pipe(res);
        return;
      } catch (err: any) {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'File not found' }));
        return;
      }
    }

    // Default 404
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not found' }));
  };

  const server = http.createServer((req: IncomingMessage, res: ServerResponse) => {
    dispatchRequest(req, res).catch((err) => {
      if (!res.headersSent) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: (err as Error)?.message || 'Internal server error' }));
      } else if (!res.writableEnded) {
        res.end();
      }
    });
  });

  return {
    server,
    port: opts.port ?? 3000,
    host: opts.host ?? '0.0.0.0',
    close: async () => {
      for (const { transport, mcpServer } of sessions.values()) {
        try {
          await mcpServer.close();
          await transport.close();
        } catch {}
      }
      sessions.clear();
      await new Promise<void>((resolve, reject) => {
        server.close((err) => (err ? reject(err) : resolve()));
        server.closeIdleConnections?.();
      });
    },
  };
}

export async function startHttpServer(opts: HttpServerOptions): Promise<StudioHttpServer> {
  const instance = createHttpServer(opts);
  return new Promise((resolve, reject) => {
    instance.server.listen(instance.port, instance.host, () => {
      const addr = instance.server.address();
      if (typeof addr === 'object' && addr !== null) {
        instance.port = addr.port;
      }
      resolve(instance);
    });
    instance.server.on('error', reject);
  });
}
