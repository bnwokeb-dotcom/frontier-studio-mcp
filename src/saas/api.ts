// src/saas/api.ts — VIDUXTOOL SaaS REST API & Headless Daemon
// Built using Node native HTTP for high performance and zero dependency overhead.

import { execFile as execFileCb } from 'node:child_process';
import { createHash, randomBytes } from 'node:crypto';
import { existsSync } from 'node:fs';
import { mkdir, rename, rm } from 'node:fs/promises';
import http from 'node:http';
import { join, resolve } from 'node:path';
import { promisify } from 'node:util';
import { StudioError, errAuth, errJobFailed, errValidation } from '../errors.js';
import type { FetchLike } from '../lanes/types.js';
import { VultrLane } from '../lanes/vultr.js';
import { probeMedia } from '../qa/critic.js';
import {
  ViduxToolEngine,
  MODEL_CATALOG,
  NICHE_TOOLKITS,
  type GenerationRequest,
  type JobDispatcher,
} from './viduxtool.js';

const execFileAsync = promisify(execFileCb);

export interface ViduxApiServerOptions {
  engine?: ViduxToolEngine;
  dispatcher?: JobDispatcher;
  outputDir?: string;
  vultrApiKey?: string;
  fetchFn?: FetchLike;
}

function resolveDimensions(aspectRatio: string): { width: number; height: number } {
  switch (aspectRatio) {
    case '16:9':
      return { width: 1920, height: 1080 };
    case '1:1':
      return { width: 1080, height: 1080 };
    case '9:16':
    default:
      return { width: 1080, height: 1920 };
  }
}

const FONT_CANDIDATES = [
  'C:/Windows/Fonts/arial.ttf',
  'C:/Windows/Fonts/segoeui.ttf',
  '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',
  '/System/Library/Fonts/Helvetica.ttc',
];

function findDrawtextFontOption(): string {
  for (const candidate of FONT_CANDIDATES) {
    if (existsSync(candidate)) {
      const escaped = candidate.replace(/\\/g, '/').replace(/:/g, '\\:');
      return `fontfile='${escaped}':`;
    }
  }
  return '';
}

function derivePromptPalette(prompt: string): { bgHex: string; accentHex: string } {
  const digest = createHash('sha256').update(prompt).digest();
  const toHex = (n: number) => n.toString(16).padStart(2, '0');
  const bgHex = `${toHex(10 + (digest[0] % 34))}${toHex(16 + (digest[1] % 34))}${toHex(28 + (digest[2] % 44))}`;
  const accentHex = `${toHex(70 + (digest[3] % 165))}${toHex(120 + (digest[4] % 120))}${toHex(180 + (digest[5] % 75))}`;
  return { bgHex, accentHex };
}

function escapeDrawtextLiteral(text: string): string {
  return text
    .replace(/'/g, ' ')
    .replace(/\\/g, '\\\\')
    .replace(/:/g, '\\:')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,');
}

export function createDefaultViduxDispatcher(opts: ViduxApiServerOptions = {}): JobDispatcher {
  const outRoot = resolve(opts.outputDir ?? join(process.cwd(), 'renders', 'vidux'));

  return async (req, jobId, model) => {
    if (model.id === 'minimax-h3') {
      const apiKey = opts.vultrApiKey ?? process.env.VULTR_INFERENCE_API_KEY;
      if (!apiKey) {
        throw errAuth(
          'VULTR_INFERENCE_API_KEY is not set for minimax-h3 dispatch',
          'set VULTR_INFERENCE_API_KEY in environment or provide a custom dispatcher',
        );
      }
      const lane = new VultrLane(apiKey, opts.fetchFn);
      const ref = await lane.submit({
        prompt: req.prompt,
        durationS: req.duration_sec,
        aspectRatio: req.aspect_ratio,
        quality: 'standard',
      });
      return {
        status: 'rendering',
        provider_job_id: ref.jobId,
      };
    }

    if (model.id === 'ffmpeg-compositor') {
      if (
        typeof req.duration_sec !== 'number' ||
        !Number.isFinite(req.duration_sec) ||
        req.duration_sec < 1 ||
        req.duration_sec > model.max_duration_sec
      ) {
        throw errValidation(
          `duration_sec ${String(req.duration_sec)} out of range for ${model.id} (1..${model.max_duration_sec}s)`,
          `pass numeric duration_sec between 1 and ${model.max_duration_sec}`,
        );
      }

      await mkdir(outRoot, { recursive: true });
      const { width, height } = resolveDimensions(req.aspect_ratio);
      const dur = req.duration_sec;
      const outPath = join(outRoot, `${jobId}.mp4`);
      const tmpPath = join(outRoot, `.tmp_${randomBytes(4).toString('hex')}_${jobId}.mp4`);

      const promptRendered = req.prompt.replace(/\s+/g, ' ').trim().slice(0, 72);
      const { bgHex, accentHex } = derivePromptPalette(promptRendered);
      const baseFilter = `drawbox=x='mod(t*220,${width})':y=${Math.floor(height / 2) - 40}:w=180:h=80:color=#${accentHex}@0.9:t=fill`;
      const fontOpt = findDrawtextFontOption();
      const drawtextFilter = `drawtext=${fontOpt}expansion=none:text='${escapeDrawtextLiteral(promptRendered)}':fontcolor=white:fontsize=36:x=(w-text_w)/2:y=${Math.floor(height * 0.25)}`;

      const runFfmpeg = async (vf: string) => {
        await execFileAsync(
          'ffmpeg',
          [
            '-y',
            '-nostdin',
            '-f',
            'lavfi',
            '-i',
            `color=c=#${bgHex}:size=${width}x${height}:rate=24:duration=${dur}`,
            '-vf',
            vf,
            '-metadata',
            `title=${promptRendered}`,
            '-c:v',
            'libx264',
            '-pix_fmt',
            'yuv420p',
            '-an',
            tmpPath,
          ],
          { maxBuffer: 32 * 1024 * 1024 },
        );
      };

      try {
        try {
          await runFfmpeg(`${baseFilter},${drawtextFilter}`);
        } catch {
          // Safe fallback when fontconfig/libfreetype has no usable font in minimal containers
          await runFfmpeg(baseFilter);
        }

        const probe = await probeMedia(tmpPath);
        if (!probe.exists || probe.error || !probe.hasVideo || probe.width !== width || probe.height !== height || probe.durationS <= 0) {
          throw errJobFailed(
            `ffmpeg-compositor output failed ffprobe verification (${probe.width}x${probe.height}, error=${probe.error ?? 'none'})`,
            'inspect local ffmpeg installation and parameters',
          );
        }

        await rename(tmpPath, outPath);
        return {
          status: 'succeeded',
          output_path: outPath,
          prompt_rendered: promptRendered,
        };
      } catch (err) {
        await rm(tmpPath, { force: true }).catch(() => {});
        if (err instanceof StudioError) throw err;
        throw errJobFailed(
          `ffmpeg-compositor render failed: ${(err as Error).message}`,
          'verify ffmpeg is installed and writable outputDir is configured',
        );
      }
    }

    throw errValidation(
      `model "${model.id}" has no live backend adapter`,
      'use an available backed model: minimax-h3 or ffmpeg-compositor',
    );
  };
}

function httpStatusForError(err: unknown): number {
  const withStatus = err as { statusCode?: unknown };
  if (typeof withStatus?.statusCode === 'number') {
    return withStatus.statusCode;
  }
  if (err instanceof StudioError) {
    switch (err.code) {
      case 'VALIDATION':
        return 400;
      case 'AUTH':
        return 401;
      case 'BUDGET':
        return 402;
      case 'NOT_FOUND':
        return 404;
      case 'LANE_DOWN':
      case 'JOB_FAILED':
        return 502;
    }
  }
  return 500;
}

export function createViduxApiServer(engineOrOpts?: ViduxToolEngine | ViduxApiServerOptions): http.Server {
  let vidux: ViduxToolEngine;
  if (engineOrOpts instanceof ViduxToolEngine) {
    vidux = engineOrOpts;
  } else {
    const opts = engineOrOpts ?? {};
    const dispatcher = opts.dispatcher ?? createDefaultViduxDispatcher(opts);
    vidux = opts.engine ?? new ViduxToolEngine({ dispatcher });
  }

  const server = http.createServer(async (req, res) => {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

    const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
    const pathname = url.pathname;

    const sendJson = (statusCode: number, data: unknown) => {
      res.writeHead(statusCode, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(data, null, 2));
    };

    const parseBody = async (): Promise<Record<string, any>> => {
      let body = '';
      for await (const chunk of req) {
        body += chunk;
      }
      if (!body.trim()) {
        return {};
      }
      let parsed: unknown;
      try {
        parsed = JSON.parse(body);
      } catch {
        throw errValidation('invalid JSON request body', 'send valid application/json payload');
      }
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        throw errValidation('JSON request body must be an object', 'send a JSON object payload');
      }
      return parsed as Record<string, any>;
    };

    try {
      // 1. Health & Discovery (honestly list only live backed available models)
      if (req.method === 'GET' && pathname === '/health') {
        return sendJson(200, {
          status: 'ok',
          platform: 'VIDUXTOOL SaaS Video Toolkit',
          version: '1.0.0',
          models_available: Object.values(MODEL_CATALOG)
            .filter((m) => m.available)
            .map((m) => m.id),
          niches_available: Object.keys(NICHE_TOOLKITS)
        });
      }

      // 2. Catalog: Niches
      if (req.method === 'GET' && pathname === '/api/v1/toolkits') {
        return sendJson(200, {
          total: Object.keys(NICHE_TOOLKITS).length,
          toolkits: Object.values(NICHE_TOOLKITS)
        });
      }

      // 3. Catalog: Models & Credit Pricing
      if (req.method === 'GET' && pathname === '/api/v1/models') {
        return sendJson(200, {
          credit_exchange_rate: '100 credits = $1.00 USD',
          models: Object.values(MODEL_CATALOG)
        });
      }

      // 4. User Registration & Starter Credits
      if (req.method === 'POST' && pathname === '/api/v1/users/register') {
        const body = await parseBody();
        const userId = body.user_id || `usr_${Date.now()}`;
        const email = body.email || `${userId}@viduxtool.com`;
        const tier = body.tier || 'free_starter';

        const wallet = vidux.ledger.registerUser(userId, email, tier);
        return sendJson(201, {
          message: 'User registered successfully. Starter credits granted.',
          wallet
        });
      }

      // 5. User Wallet
      if (req.method === 'GET' && pathname.startsWith('/api/v1/users/') && pathname.endsWith('/wallet')) {
        const parts = pathname.split('/');
        const userId = parts[4];
        const wallet = vidux.ledger.getWallet(userId);
        const txs = vidux.ledger.getTransactions(userId);
        return sendJson(200, { wallet, transactions: txs });
      }

      // 6. Generate Job (Pre-flight Credit Reservation + Honest Dispatch)
      if (req.method === 'POST' && pathname === '/api/v1/generate') {
        const body = (await parseBody()) as Partial<GenerationRequest>;
        if (
          typeof body.user_id !== 'string' ||
          !body.user_id ||
          typeof body.niche_id !== 'string' ||
          !body.niche_id ||
          typeof body.model_id !== 'string' ||
          !body.model_id ||
          typeof body.prompt !== 'string' ||
          !body.prompt.trim()
        ) {
          return sendJson(400, {
            error: 'Missing or invalid required fields: user_id, niche_id, model_id, prompt (non-empty string), duration_sec'
          });
        }
        const result = await vidux.createProject({
          user_id: body.user_id,
          niche_id: body.niche_id,
          model_id: body.model_id,
          prompt: body.prompt,
          duration_sec: body.duration_sec ?? 5,
          aspect_ratio: body.aspect_ratio,
          webhook_url: body.webhook_url
        });
        return sendJson(202, {
          message: 'Generation job dispatched. Credits reserved.',
          job: result
        });
      }

      // 7. Commit Job (Reconcile Credits)
      if (req.method === 'POST' && pathname.startsWith('/api/v1/jobs/') && pathname.endsWith('/commit')) {
        const parts = pathname.split('/');
        const jobId = parts[4];
        const body = await parseBody();
        const actualDuration = body.actual_duration_sec ?? 5;

        const debited = vidux.ledger.commit(jobId, actualDuration);
        return sendJson(200, {
          message: 'Job completed. Actual compute credits debited.',
          job_id: jobId,
          debited_credits: debited
        });
      }

      // 8. Refund Job (Failed Render)
      if (req.method === 'POST' && pathname.startsWith('/api/v1/jobs/') && pathname.endsWith('/refund')) {
        const parts = pathname.split('/');
        const jobId = parts[4];
        const body = await parseBody();
        const reason = body.reason || 'Render failure or GPU timeout';

        vidux.ledger.refund(jobId, reason);
        return sendJson(200, {
          message: 'Job refunded. Reserved credits returned to wallet.',
          job_id: jobId,
          reason
        });
      }

      sendJson(404, { error: 'Endpoint not found' });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Internal Server Error';
      sendJson(httpStatusForError(err), { error: msg });
    }
  });

  return server;
}
