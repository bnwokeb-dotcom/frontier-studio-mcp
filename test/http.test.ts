// test/http.test.ts — HTTP server, headless discovery, SSE handshake, bridge routes, job poll QC, and static artifact streaming tests.
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mkdtemp, rm, writeFile, mkdir, stat, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFile as execFileCb } from 'node:child_process';
import { promisify } from 'node:util';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js';
import { startHttpServer, type StudioHttpServer } from '../src/http.js';
import { studioPaths } from '../src/store/paths.js';
import { filmCreate, filmShow } from '../src/store/film.js';
import { appendLine } from '../src/store/fs.js';
import { recordSpend } from '../src/budget.js';
import { appendJob, readJobs } from '../src/store/jobs.js';
import { VultrLane } from '../src/lanes/vultr.js';

const execFile = promisify(execFileCb);

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
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
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

  it('serves JSON discovery on GET / (API) and serves Studio & Landing UIs on /studio, /landing, and HTML GET /', async () => {
    const res = await fetch(`${baseUrl}/`, { headers: { Accept: 'application/json' } });
    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toContain('application/json');
    const body = await res.json();
    expect(body).toEqual({
      service: 'frontier-studio-mcp',
      mode: 'hybrid-studio-and-mcp',
      version: '0.1.0',
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
    });

    const htmlRoot = await fetch(`${baseUrl}/`, { headers: { Accept: 'text/html' } });
    expect(htmlRoot.status).toBe(200);
    expect(htmlRoot.headers.get('Content-Type')).toContain('text/html');

    const studio = await fetch(`${baseUrl}/studio`);
    expect(studio.status).toBe(200);
    expect(studio.headers.get('Content-Type')).toContain('text/html');
    expect(await studio.text()).toContain('FRONTIER STUDIO OS');

    const landing = await fetch(`${baseUrl}/landing`);
    expect(landing.status).toBe(200);
    expect(landing.headers.get('Content-Type')).toContain('text/html');
    expect(await landing.text()).toContain('VIDUX TOOL');
  });

  it('mounts /bridge/status cleanly on StudioHttpServer', async () => {
    const res = await fetch(`${baseUrl}/bridge/status?client_id=test-http-bridge`);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.status).toBe('ok');
    expect(data.connectedClients).toBeGreaterThanOrEqual(1);
    expect(typeof data.pendingTasks).toBe('number');
  });

  it('connects an MCP Client via SSEClientTransport over /sse and /messages', async () => {
    const client = new Client({ name: 'http-sse-test', version: '0.1.0' });
    const transport = new SSEClientTransport(new URL(`${baseUrl}/sse`));
    await client.connect(transport);
    try {
      const listed = await client.listTools();
      expect(listed.tools.length).toBe(52);
      const created = await client.callTool({
        name: 'film_create',
        arguments: { film_id: 'film_sse', title: 'SSE Test', logline: 'Headless SSE roundtrip', budget_usd: 10 },
      });
      expect((created as { isError?: boolean }).isError).not.toBe(true);
      const shown = await client.callTool({ name: 'film_show', arguments: {} });
      expect(JSON.stringify(shown)).toContain('film_sse');
    } finally {
      await client.close();
    }
  });

  it('POST /api/jobs/poll rejects non-MP4 corrupt bytes via probeMedia without marking completed', async () => {
    const paths = studioPaths(root);
    await filmCreate(paths, 'film_poll', { title: 'Poll Guard', logline: 'Decode guard test' });
    await appendJob(paths, 'film_poll', {
      job_id: 'vid-poll-corrupt',
      shot_id: 's1',
      lane: 'vultr',
      status: 'in_progress',
      submitted_ts: new Date().toISOString(),
      prompt_version: 'h3-v1',
    });

    const originalFetch = globalThis.fetch;
    vi.stubEnv('VULTR_INFERENCE_API_KEY', 'test-vultr-key');
    vi.stubGlobal('fetch', async (input: RequestInfo | URL, init?: RequestInit) => {
      const urlStr = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
      if (urlStr === `${VultrLane.BASE_URL}/videos/vid-poll-corrupt`) {
        return new Response(
          JSON.stringify({ id: 'vid-poll-corrupt', status: 'completed', progress: 100, usage: { cost: 0.45 } }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        );
      }
      if (urlStr === `${VultrLane.BASE_URL}/videos/vid-poll-corrupt/content`) {
        return new Response(Buffer.from('NOT_A_VALID_MP4_STREAM'), { status: 200 });
      }
      return originalFetch(input, init);
    });

    const res = await fetch(`${baseUrl}/api/jobs/poll`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ film_id: 'film_poll', job_id: 'vid-poll-corrupt' }),
    });
    expect(res.status).toBe(502);
    const body = await res.json();
    expect(body.status).toBe('failed');
    expect(body.error).toMatch(/probeMedia|decode/i);

    const jobs = await readJobs(paths, 'film_poll');
    expect(jobs[0].status).toBe('failed');
    expect(jobs[0].artifact_path).toBeUndefined();
    await expect(stat(join(paths.rendersDir('film_poll'), 'vid-poll-corrupt', 'shot.mp4'))).rejects.toThrow();
    await expect(stat(join(paths.rendersDir('film_poll'), 'vid-poll-corrupt', 'shot.corrupt.mp4'))).resolves.toBeTruthy();
  });

  it('POST /api/jobs/poll accepts valid FFmpeg MP4 bytes after probeMedia & ffmpeg verification', async () => {
    const paths = studioPaths(root);
    await filmCreate(paths, 'film_poll_ok', { title: 'Poll Ok', logline: 'Decode pass test' });
    await appendJob(paths, 'film_poll_ok', {
      job_id: 'vid-poll-valid',
      shot_id: 's1',
      lane: 'vultr',
      status: 'in_progress',
      submitted_ts: new Date().toISOString(),
      prompt_version: 'h3-v1',
    });

    const validMp4Path = join(root, 'sample_valid.mp4');
    await execFile('ffmpeg', [
      '-y', '-f', 'lavfi', '-i', 'testsrc=size=320x180:rate=24:duration=1',
      '-c:v', 'libx264', '-pix_fmt', 'yuv420p',
      validMp4Path,
    ]);
    const validMp4Bytes = await (await import('node:fs/promises')).readFile(validMp4Path);

    const originalFetch = globalThis.fetch;
    vi.stubEnv('VULTR_INFERENCE_API_KEY', 'test-vultr-key');
    vi.stubGlobal('fetch', async (input: RequestInfo | URL, init?: RequestInit) => {
      const urlStr = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
      if (urlStr === `${VultrLane.BASE_URL}/videos/vid-poll-valid`) {
        return new Response(
          JSON.stringify({ id: 'vid-poll-valid', status: 'completed', progress: 100, usage: { cost: 0.45 }, output: { duration: 5.17 } }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        );
      }
      if (urlStr === `${VultrLane.BASE_URL}/videos/vid-poll-valid/content`) {
        return new Response(validMp4Bytes, { status: 200, headers: { 'Content-Type': 'video/mp4' } });
      }
      return originalFetch(input, init);
    });

    const res = await fetch(`${baseUrl}/api/jobs/poll`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ film_id: 'film_poll_ok', job_id: 'vid-poll-valid' }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe('completed');
    expect(body.videoUrl).toBe('/artifacts/films/film_poll_ok/renders/vid-poll-valid/shot.mp4');

    const jobs = await readJobs(paths, 'film_poll_ok');
    expect(jobs[0].status).toBe('completed');
    expect(jobs[0].width).toBe(320);
    expect(jobs[0].height).toBe(180);
  });

  it('POST /api/jobs/poll returns 404 for unknown film_id or job_id without creating renders/ directories', async () => {
    const paths = studioPaths(root);
    const originalFetch = globalThis.fetch;
    vi.stubEnv('VULTR_INFERENCE_API_KEY', 'test-vultr-key');
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', async (input: RequestInfo | URL, init?: RequestInit) => {
      const urlStr = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
      if (urlStr.startsWith(VultrLane.BASE_URL)) {
        fetchSpy(urlStr);
        return new Response('should not poll Vultr on missing film/job', { status: 500 });
      }
      return originalFetch(input, init);
    });

    const missingFilmRes = await fetch(`${baseUrl}/api/jobs/poll`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ film_id: 'film_missing', job_id: 'vid-ghost' }),
    });
    expect(missingFilmRes.status).toBe(404);
    await expect(stat(paths.filmDir('film_missing'))).rejects.toThrow();

    await filmCreate(paths, 'film_poll_404', { title: 'Poll 404', logline: 'Missing job test' });
    const missingJobRes = await fetch(`${baseUrl}/api/jobs/poll`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ film_id: 'film_poll_404', job_id: 'vid-ghost' }),
    });
    expect(missingJobRes.status).toBe(404);
    await expect(stat(paths.rendersDir('film_poll_404'))).rejects.toThrow();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('POST /api/jobs/poll reconciles completed actual cost delta onto film.json and ledger.jsonl', async () => {
    const paths = studioPaths(root);
    await filmCreate(paths, 'film_poll_reconcile', { title: 'Poll Reconcile', logline: 'Reconcile test', budgetUsd: 10 });
    await recordSpend(paths, 'film_poll_reconcile', 0.45);
    await appendLine(paths.ledgerPath('film_poll_reconcile'), JSON.stringify({
      ts: new Date().toISOString(),
      tool: 'render_shot',
      lane: 'vultr',
      film_id: 'film_poll_reconcile',
      cost_usd: 0.45,
      verdict: 'pending',
      job_id: 'vid-poll-reconcile',
      artifact_path: '',
      estimated: true,
    }));
    await appendJob(paths, 'film_poll_reconcile', {
      job_id: 'vid-poll-reconcile',
      shot_id: 's1',
      lane: 'vultr',
      status: 'pending',
      submitted_ts: new Date().toISOString(),
      prompt_version: 'h3-v1',
    });

    const validMp4Path = join(root, 'sample_reconcile.mp4');
    await execFile('ffmpeg', [
      '-y', '-f', 'lavfi', '-i', 'testsrc=size=320x180:rate=24:duration=1',
      '-c:v', 'libx264', '-pix_fmt', 'yuv420p',
      validMp4Path,
    ]);
    const validMp4Bytes = await readFile(validMp4Path);

    const originalFetch = globalThis.fetch;
    vi.stubEnv('VULTR_INFERENCE_API_KEY', 'test-vultr-key');
    vi.stubGlobal('fetch', async (input: RequestInfo | URL, init?: RequestInit) => {
      const urlStr = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
      if (urlStr === `${VultrLane.BASE_URL}/videos/vid-poll-reconcile`) {
        return new Response(
          JSON.stringify({ id: 'vid-poll-reconcile', status: 'completed', progress: 100, usage: { cost: 0.55 }, output: { duration: 5.1 } }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        );
      }
      if (urlStr === `${VultrLane.BASE_URL}/videos/vid-poll-reconcile/content`) {
        return new Response(validMp4Bytes, { status: 200, headers: { 'Content-Type': 'video/mp4' } });
      }
      return originalFetch(input, init);
    });

    const res = await fetch(`${baseUrl}/api/jobs/poll`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ film_id: 'film_poll_reconcile', job_id: 'vid-poll-reconcile' }),
    });
    expect(res.status).toBe(200);

    const film = await filmShow(paths, 'film_poll_reconcile');
    expect(film.spentUsd).toBeCloseTo(0.55, 6);

    const ledgerRaw = await readFile(paths.ledgerPath('film_poll_reconcile'), 'utf8');
    const lines = ledgerRaw.trim().split('\n').map((l) => JSON.parse(l) as Record<string, unknown>);
    expect(lines).toHaveLength(2);
    expect(lines[1]).toMatchObject({
      job_id: 'vid-poll-reconcile',
      note: 'reconcile',
      cost_usd: 0.1,
    });
  });

  it('POST /api/jobs/poll refunds reserved estimate idempotently onto film.json and ledger.jsonl when job fails', async () => {
    const paths = studioPaths(root);
    await filmCreate(paths, 'film_poll_refund', { title: 'Poll Refund', logline: 'Refund test', budgetUsd: 10 });
    await recordSpend(paths, 'film_poll_refund', 0.45);
    await appendLine(paths.ledgerPath('film_poll_refund'), JSON.stringify({
      ts: new Date().toISOString(),
      tool: 'render_shot',
      lane: 'vultr',
      film_id: 'film_poll_refund',
      cost_usd: 0.45,
      verdict: 'pending',
      job_id: 'vid-poll-fail',
      artifact_path: '',
      estimated: true,
    }));
    await appendJob(paths, 'film_poll_refund', {
      job_id: 'vid-poll-fail',
      shot_id: 's1',
      lane: 'vultr',
      status: 'pending',
      submitted_ts: new Date().toISOString(),
      prompt_version: 'h3-v1',
    });

    const originalFetch = globalThis.fetch;
    vi.stubEnv('VULTR_INFERENCE_API_KEY', 'test-vultr-key');
    vi.stubGlobal('fetch', async (input: RequestInfo | URL, init?: RequestInit) => {
      const urlStr = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
      if (urlStr === `${VultrLane.BASE_URL}/videos/vid-poll-fail`) {
        return new Response(
          JSON.stringify({ id: 'vid-poll-fail', status: 'failed', progress: 20, error: 'safety filter triggered' }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        );
      }
      return originalFetch(input, init);
    });

    const res1 = await fetch(`${baseUrl}/api/jobs/poll`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ film_id: 'film_poll_refund', job_id: 'vid-poll-fail' }),
    });
    expect(res1.status).toBe(200);
    const body1 = await res1.json();
    expect(body1.status).toBe('failed');

    const filmAfter1 = await filmShow(paths, 'film_poll_refund');
    expect(filmAfter1.spentUsd).toBeCloseTo(0, 6);

    const ledgerRaw1 = await readFile(paths.ledgerPath('film_poll_refund'), 'utf8');
    const lines1 = ledgerRaw1.trim().split('\n').map((l) => JSON.parse(l) as Record<string, unknown>);
    expect(lines1).toHaveLength(2);
    expect(lines1[1]).toMatchObject({
      job_id: 'vid-poll-fail',
      note: 'refund',
      cost_usd: -0.45,
    });

    const jobs1 = await readJobs(paths, 'film_poll_refund');
    expect(jobs1[0]).toMatchObject({
      status: 'failed',
      error_verbatim: 'safety filter triggered',
      note: 'estimate refunded (only completed jobs bill)',
    });

    // Idempotent second poll must not refund again
    const res2 = await fetch(`${baseUrl}/api/jobs/poll`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ film_id: 'film_poll_refund', job_id: 'vid-poll-fail' }),
    });
    expect(res2.status).toBe(200);
    const filmAfter2 = await filmShow(paths, 'film_poll_refund');
    expect(filmAfter2.spentUsd).toBeCloseTo(0, 6);
    const ledgerRaw2 = await readFile(paths.ledgerPath('film_poll_refund'), 'utf8');
    expect(ledgerRaw2.trim().split('\n')).toHaveLength(2);
  });

  it('serves SFX search/wav, continuity validate-table, and toolkits API endpoints', async () => {
    const sfxRes = await fetch(`${baseUrl}/api/sfx/search?q=boom&limit=5`);
    expect(sfxRes.status).toBe(200);
    const sfxJson = await sfxRes.json() as {
      results: Array<{ id: string }>;
      viral_presets: Record<string, { sound_id: string }>;
    };
    expect(sfxJson.results.some((r) => r.id === 'boom-hit-medium')).toBe(true);
    expect(sfxJson.viral_presets.vine_boom.sound_id).toBe('boom-drop-strong');

    const wavRes = await fetch(`${baseUrl}/api/sfx/wav?id=boom-hit-medium`);
    expect(wavRes.status).toBe(200);
    expect(wavRes.headers.get('content-type')).toContain('audio/wav');
    const wavBuf = Buffer.from(await wavRes.arrayBuffer());
    expect(wavBuf.subarray(0, 4).toString('ascii')).toBe('RIFF');

    const valRes = await fetch(`${baseUrl}/api/continuity/validate-table`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        floor_plan: 'Hall interior: oak doors north, hearth west, long timber table center.',
        rows: [
          {
            shot_id: '01',
            camera_side: 'south wall wide',
            in_frame: '@char enters north door toward table',
            eyeline: 'toward hearth',
            action: '@char sets lantern down slowly on timber table.',
            others_idle_business: 'sentry shifts boots near west wall',
            light_lock: 'steady warm tungsten hearth from west',
            last_frame: 'lantern resting beside @char hand',
          },
          {
            shot_id: '02',
            camera_side: 'south wall tight',
            in_frame: '@char profile left',
            eyeline: 'off-screen right toward sentry',
            action: '@char speaks quietly without raising chin.',
            others_idle_business: 'hearth sparks drift behind @char shoulder',
            light_lock: 'steady warm tungsten hearth from west',
            last_frame: '@char eyes fixed off-screen right',
          },
        ],
      }),
    });
    expect(valRes.status).toBe(200);
    const valJson = await valRes.json() as { passed: boolean; rowCount: number };
    expect(valJson.passed).toBe(true);
    expect(valJson.rowCount).toBe(2);

    const tkRes = await fetch(`${baseUrl}/api/toolkits`);
    expect(tkRes.status).toBe(200);
    const tkJson = await tkRes.json() as { toolkits: unknown[]; models: unknown[] };
    expect(tkJson.toolkits.length).toBeGreaterThanOrEqual(6);
    expect(tkJson.models.length).toBeGreaterThan(0);

    const ddRes = await fetch(`${baseUrl}/api/director-desk/compile`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        location_summary: 'Basalt foundry',
        roles: [
          { role_id: 'role_a', x: -2, z: 0 },
          { role_id: 'role_b', x: 2, z: 0 },
        ],
        cameras: [
          { camera_id: 'cam_1', lens_mm: 35, x: 0, z: 5, target_role_id: 'role_a' },
          { camera_id: 'cam_2', lens_mm: 50, x: 1, z: 4, target_role_id: 'role_b' },
        ],
      }),
    });
    expect(ddRes.status).toBe(200);
    const ddJson = await ddRes.json() as { passed_axis_check: boolean; geo_block_draft: string };
    expect(ddJson.passed_axis_check).toBe(true);
    expect(ddJson.geo_block_draft).toContain('Basalt foundry');
  });
});
