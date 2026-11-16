// test/http.test.ts — HTTP server, SSE handshake, and static artifact streaming tests.
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, rm, writeFile, mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { startHttpServer, type StudioHttpServer } from '../src/http.js';

describe('StudioHttpServer', () => {
  let root: string;
  let server: StudioHttpServer;
  let baseUrl: string;

  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'fsm-http-'));
    // pick ephemeral port by passing port: 0
    server = await startHttpServer({
      studioRoot: root,
      port: 0,
      host: '127.0.0.1',
    });
    const addr = server.server.address();
    const port = typeof addr === 'object' && addr ? addr.port : 3000;
    baseUrl = `http://127.0.0.1:${port}`;
  });

  afterEach(async () => {
    await server.close();
    await rm(root, { recursive: true, force: true });
  });

  it('responds with 200 on /health', async () => {
    const res = await fetch(`${baseUrl}/health`);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.status).toBe('ok');
    expect(data.version).toBe('0.1.0');
    expect(data.studioRoot).toBeTruthy();
  });

  it('serves CORS headers on OPTIONS', async () => {
    const res = await fetch(`${baseUrl}/health`, { method: 'OPTIONS' });
    expect(res.status).toBe(204);
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe('*');
    expect(res.headers.get('Access-Control-Allow-Methods')).toContain('GET');
  });

  it('serves static files under /artifacts', async () => {
    const filePath = join(root, 'test.txt');
    await writeFile(filePath, 'cinematic realism');

    const res = await fetch(`${baseUrl}/artifacts/test.txt`);
    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toContain('text/plain');
    const body = await res.text();
    expect(body).toBe('cinematic realism');
  });

  it('serves nested directory artifacts under /artifacts', async () => {
    const rendersDir = join(root, 'films', 'f1', 'renders');
    await mkdir(rendersDir, { recursive: true });
    await writeFile(join(rendersDir, 'shot.json'), JSON.stringify({ ok: true }));

    const res = await fetch(`${baseUrl}/artifacts/films/f1/renders/shot.json`);
    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toContain('application/json');
    const data = await res.json();
    expect(data.ok).toBe(true);
  });

  it('blocks path traversal attacks attempting to escape studio root', async () => {
    // node:http allows sending raw un-normalized paths without WHATWG URL pre-normalization
    const addr = server.server.address();
    const port = typeof addr === 'object' && addr ? addr.port : 3000;
    
    const statusCode = await new Promise<number>((resolveStatus) => {
      import('node:http').then((http) => {
        const req = http.request(
          {
            host: '127.0.0.1',
            port,
            path: '/artifacts/../etc/passwd',
            method: 'GET',
          },
          (res) => {
            resolveStatus(res.statusCode ?? 0);
          },
        );
        req.end();
      });
    });

    expect(statusCode).toBe(403);
  });

  it('returns 404 for missing artifacts', async () => {
    const res = await fetch(`${baseUrl}/artifacts/missing-shot.mp4`);
    expect(res.status).toBe(404);
  });

  it('rejects POST /messages when sessionId is missing or invalid', async () => {
    const res = await fetch(`${baseUrl}/messages?sessionId=non-existent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/list' }),
    });
    expect(res.status).toBe(404);
    const data = await res.json();
    expect(data.error).toMatch(/Session not found/);
  });

  it('initiates an SSE connection on GET /sse and emits endpoint event', async () => {
    const controller = new AbortController();
    const res = await fetch(`${baseUrl}/sse`, {
      signal: controller.signal,
      headers: { Accept: 'text/event-stream' },
    });

    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toContain('text/event-stream');

    const reader = res.body?.getReader();
    expect(reader).toBeTruthy();

    if (reader) {
      const { value } = await reader.read();
      const text = new TextDecoder().decode(value);
      // SSEServerTransport emits event: endpoint \n data: /messages?sessionId=...
      expect(text).toContain('event: endpoint');
      expect(text).toContain('/messages?sessionId=');
      await reader.cancel().catch(() => {});
    }
  });
});
