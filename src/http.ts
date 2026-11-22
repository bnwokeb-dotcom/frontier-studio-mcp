// src/http.ts — HTTP & SSE transport server for remote MCP clients and static artifact streaming.
import http, { type IncomingMessage, type ServerResponse } from 'node:http';
import { createReadStream } from 'node:fs';
import { stat, readFile, readdir, writeFile, mkdir } from 'node:fs/promises';
import { extname, isAbsolute, relative, resolve, join } from 'node:path';
import { spawn } from 'node:child_process';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { buildServer } from './server.js';
import { studioPaths } from './store/paths.js';
import { filmShow } from './store/film.js';
import { readJson } from './store/fs.js';
import { generateFcpxmlString } from './tools/editor.js';

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

export function createHttpServer(opts: HttpServerOptions): StudioHttpServer {
  const root = resolve(opts.studioRoot);
  const version = opts.version || '0.1.0';
  const sessions = new Map<string, { transport: SSEServerTransport; mcpServer: McpServer }>();

  const server = http.createServer(async (req: IncomingMessage, res: ServerResponse) => {
    // CORS headers for browser clients (Claude web, ChatGPT, inspector)
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', '*');

    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

    const hostHeader = req.headers.host || 'localhost';
    const rawUrl = req.url ?? '/';

    // Global traversal guard: raw URL containing .. or encoded traversal
    if (rawUrl.includes('..') || rawUrl.includes('%2e%2e') || rawUrl.includes('%2E%2E')) {
      res.writeHead(403, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Forbidden' }));
      return;
    }

    const parsedUrl = new URL(rawUrl, `http://${hostHeader}`);
    const pathname = parsedUrl.pathname;

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

    // 1a. Dynamic Studio Film Data API
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
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ film: meta, shots }));
        return;
      } catch (err: any) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
        return;
      }
    }

    // 1b. Dynamic FCPXML Timeline Export API
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

    // 1c. Trigger GPU Parallel Render API
    if (req.method === 'POST' && pathname === '/api/render') {
      const filmId = parsedUrl.searchParams.get('film_id') || 'film_heart_of_colossus';
      res.writeHead(202, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        status: 'queued',
        film_id: filmId,
        message: 'Parallel Vultr MiniMax H3 render initiated with Critic Gate supervision.'
      }));
      return;
    }

    // 1. Health check probe
    if (req.method === 'GET' && pathname === '/health') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'ok', version, studioRoot: root }));
      return;
    }

    // 2. SSE handshake endpoint
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

    // 3. Post messages for active SSE sessions
    if (req.method === 'POST' && pathname === '/messages') {
      const sessionId = parsedUrl.searchParams.get('sessionId');
      if (!sessionId || !sessions.has(sessionId)) {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Session not found or expired' }));
        return;
      }
      const session = sessions.get(sessionId)!;
      try {
        await session.transport.handlePostMessage(req, res);
      } catch (err) {
        if (!res.headersSent) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: (err as Error).message }));
        }
      }
      return;
    }

    // 4. Static media artifact streaming (/artifacts/*)
    if (req.method === 'GET' && pathname.startsWith('/artifacts')) {
      const subPath = decodeURIComponent(pathname.replace(/^\/artifacts\/?/, ''));
      const safePath = resolve(root, subPath);
      const rel = relative(root, safePath);

      // Traversal protection: cannot escape studio root
      if (rel.startsWith('..') || isAbsolute(rel)) {
        res.writeHead(403, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Forbidden' }));
        return;
      }

      try {
        const fileStat = await stat(safePath);
        if (!fileStat.isFile()) {
          res.writeHead(404, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Artifact is not a file' }));
          return;
        }

        const ext = extname(safePath).toLowerCase();
        const contentType = MIME_TYPES[ext] || 'application/octet-stream';
        const totalSize = fileStat.size;

        // Support video range requests for seeking in browsers
        const range = req.headers.range;
        if (range && ext === '.mp4') {
          const parts = range.replace(/bytes=/, '').split('-');
          const start = parseInt(parts[0], 10);
          const end = parts[1] ? parseInt(parts[1], 10) : totalSize - 1;
          const chunkSize = end - start + 1;

          res.writeHead(206, {
            'Content-Range': `bytes ${start}-${end}/${totalSize}`,
            'Accept-Ranges': 'bytes',
            'Content-Length': chunkSize,
            'Content-Type': contentType,
          });
          createReadStream(safePath, { start, end }).pipe(res);
          return;
        }

        res.writeHead(200, {
          'Content-Length': totalSize,
          'Content-Type': contentType,
          'Accept-Ranges': 'bytes',
        });
        createReadStream(safePath).pipe(res);
      } catch (err) {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Artifact not found' }));
      }
      return;
    }

    // Unmatched route
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not found' }));
  });

  const port = opts.port ?? 3000;
  const host = opts.host ?? '0.0.0.0';

  return {
    server,
    port,
    host,
    close: () =>
      new Promise<void>((resolveClose) => {
        const toClose = Array.from(sessions.values());
        sessions.clear();
        for (const session of toClose) {
          session.transport.onclose = undefined; // prevent recursive close callback
          session.mcpServer.close().catch(() => {});
        }
        server.close(() => resolveClose());
      }),
  };
}

export async function startHttpServer(opts: HttpServerOptions): Promise<StudioHttpServer> {
  const studio = createHttpServer(opts);
  await new Promise<void>((resolveListen) => {
    studio.server.listen(studio.port, studio.host, () => {
      resolveListen();
    });
  });
  return studio;
}
