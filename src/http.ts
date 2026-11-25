// src/http.ts — HTTP & SSE transport server for remote MCP clients and static artifact streaming.
import http, { type IncomingMessage, type ServerResponse } from 'node:http';
import { createReadStream } from 'node:fs';
import { stat, readFile, readdir, writeFile, mkdir } from 'node:fs/promises';
import { extname, isAbsolute, relative, resolve, join } from 'node:path';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { buildServer } from './server.js';
import { studioPaths } from './store/paths.js';
import { filmShow, filmCreate, filmMetaOrThrow, type FilmMeta } from './store/film.js';
import { shotShow, shotCreate, shotUpdate, type ShotRecord } from './store/shot.js';
import { readJson, writeJsonAtomic } from './store/fs.js';
import { readJobs, updateJob } from './store/jobs.js';
import { generateFcpxmlString } from './tools/editor.js';
import { submitShotRender } from './tools/video.js';
import { VultrLane } from './lanes/vultr.js';
import { loadConfig } from './config.js';
import type { VideoQuality } from './lanes/video.js';
import { WebBridgeServer, getSharedBridgeQueue } from './bridge/web_bridge_server.js';

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
    if (req.method === 'GET' && (pathname === '/' || pathname === '/studio')) {
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
        const filmId = body.film_id || 'film_heart_of_colossus';
        const jobId = body.job_id;
        if (!jobId) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'job_id is required' }));
          return;
        }

        const cfg = loadConfig();
        const apiKey = cfg.vultrApiKey || process.env.VULTR_INFERENCE_API_KEY || '';
        const lane = new VultrLane(apiKey);
        const jobStatus = await lane.status({ jobId });
        const paths = studioPaths(root);

        if (jobStatus.status === 'completed') {
          // Download video artifact and store on disk
          const artifact = await lane.result({ jobId });
          const rendersDir = join(paths.rendersDir(filmId), jobId);
          await mkdir(rendersDir, { recursive: true });
          const mp4Path = join(rendersDir, 'shot.mp4');
          await writeFile(mp4Path, artifact.data);

          await updateJob(paths, filmId, jobId, (j) => ({
            ...j,
            status: 'completed',
            cost_usd: artifact.costUsd,
          }));

          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            status: 'completed',
            progress: 100,
            jobId,
            videoUrl: `/artifacts/films/${filmId}/renders/${jobId}/shot.mp4`,
            costUsd: artifact.costUsd,
            duration: artifact.realSeconds || 5.0,
          }));
          return;
        }

        await updateJob(paths, filmId, jobId, (j) => ({
          ...j,
          status: jobStatus.status as any,
          progress: jobStatus.progress,
        }));

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          status: jobStatus.status,
          progress: jobStatus.progress,
          jobId,
        }));
        return;
      } catch (err: any) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
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
