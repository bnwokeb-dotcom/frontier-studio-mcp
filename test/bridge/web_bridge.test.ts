// test/bridge/web_bridge.test.ts — TDD tests for WebBridgeServer, BridgeQueue, /bridge/* HTTP routes, and extension manifest.
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, rm, readFile, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { deflateSync } from 'node:zlib';
import { execFile as execFileCb } from 'node:child_process';
import { promisify } from 'node:util';
import {
  BridgeQueue,
  WebBridgeServer,
  getSharedBridgeQueue,
} from '../../src/bridge/web_bridge_server.js';
import { startHttpServer, type StudioHttpServer } from '../../src/http.js';

const execFile = promisify(execFileCb);

// Standard IEEE 802.3 CRC32 for building valid spec-compliant PNG test fixtures
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(buf: Buffer): number {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

function pngChunk(type: string, data: Buffer): Buffer {
  const typeBuf = Buffer.from(type, 'ascii');
  const lenBuf = Buffer.alloc(4);
  lenBuf.writeUInt32BE(data.length, 0);
  const crcInput = Buffer.concat([typeBuf, data]);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(crcInput), 0);
  return Buffer.concat([lenBuf, crcInput, crcBuf]);
}

function buildValidPngFixture(width: number, height: number, opts: { noisy?: boolean; padBytes?: number } = {}): Buffer {
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // RGB color type
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  // Build scanlines: 1 filter byte + width * 3 bytes per row
  const stride = 1 + width * 3;
  const raw = Buffer.alloc(stride * height);
  if (opts.noisy ?? true) {
    let seed = 0x12345678;
    for (let y = 0; y < height; y++) {
      const rowOffset = y * stride;
      raw[rowOffset] = 0;
      for (let x = 1; x < stride; x++) {
        seed = (seed * 1664525 + 1013904223) >>> 0;
        raw[rowOffset + x] = (seed >>> 16) & 0xff;
      }
    }
  }
  const idatData = deflateSync(raw, { level: 1 });
  const chunks: Buffer[] = [sig, pngChunk('IHDR', ihdr), pngChunk('IDAT', idatData)];
  if (opts.padBytes && opts.padBytes > 0) {
    chunks.push(pngChunk('tEXt', Buffer.concat([Buffer.from('Comment\0'), Buffer.alloc(opts.padBytes, 65)])));
  }
  chunks.push(pngChunk('IEND', Buffer.alloc(0)));
  return Buffer.concat(chunks);
}

async function makeAudioFixture(
  dest: string,
  opts: { freq?: number; durationS?: number; sampleRate?: number; channels?: number; silent?: boolean; codecArgs?: string[] } = {},
): Promise<Buffer> {
  const dur = opts.durationS ?? 0.5;
  const sr = opts.sampleRate ?? 44100;
  const ch = opts.channels ?? 2;
  const src = opts.silent
    ? `anullsrc=r=${sr}:cl=${ch === 1 ? 'mono' : 'stereo'}:d=${dur}`
    : `sine=frequency=${opts.freq ?? 440}:duration=${dur}`;
  await execFile('ffmpeg', ['-y', '-f', 'lavfi', '-i', src, '-ar', String(sr), '-ac', String(ch), ...(opts.codecArgs ?? []), dest]);
  return readFile(dest);
}

async function ffprobeAudio(filePath: string): Promise<{ codecName?: string; sampleRate?: string; channels?: number; durationS: number }> {
  const { stdout } = await execFile('ffprobe', ['-v', 'quiet', '-print_format', 'json', '-show_format', '-show_streams', filePath]);
  const parsed = JSON.parse(stdout || '{}') as {
    streams?: Array<{ codec_type?: string; codec_name?: string; sample_rate?: string; channels?: number; duration?: string }>;
    format?: { duration?: string };
  };
  const s = (parsed.streams ?? []).find((st) => st.codec_type === 'audio');
  return {
    codecName: s?.codec_name,
    sampleRate: s?.sample_rate,
    channels: s?.channels,
    durationS: Number(s?.duration ?? parsed.format?.duration ?? 0),
  };
}

describe('WebBridgeServer & BridgeQueue', () => {
  let root: string;
  let bridgeServer: WebBridgeServer;
  let baseUrl: string;

  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'fsm-webbridge-'));
    bridgeServer = new WebBridgeServer({ studioRoot: root, port: 0, host: '127.0.0.1' });
    const addr = await bridgeServer.start();
    baseUrl = `http://${addr.host}:${addr.port}`;
  });

  afterEach(async () => {
    await bridgeServer.stop();
    await rm(root, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
  });

  it('shares BridgeQueue instance per resolved studioRoot', async () => {
    const q1 = getSharedBridgeQueue(root);
    const q2 = getSharedBridgeQueue(resolve(root, '.'));
    expect(q1).toBe(q2);
    const otherRoot = await mkdtemp(join(tmpdir(), 'fsm-webbridge-other-'));
    try {
      expect(getSharedBridgeQueue(otherRoot)).not.toBe(q1);
    } finally {
      await rm(otherRoot, { recursive: true, force: true });
    }
  });

  it('tracks heartbeats and connectedClients accurately on /bridge/status and /bridge/jobs/next', async () => {
    expect(bridgeServer.isRunning()).toBe(true);
    expect(bridgeServer.getStatus().connectedClients).toBe(0);

    const res0 = await fetch(`${baseUrl}/bridge/status`);
    expect(res0.status).toBe(200);
    const s0 = await res0.json();
    expect(s0.status).toBe('ok');
    expect(s0.connectedClients).toBe(0);
    expect(s0.lastHeartbeatAt).toBeNull();

    // Extension heartbeat ping via status?client_id=...
    const res1 = await fetch(`${baseUrl}/bridge/status?client_id=chrome-ext-1`);
    expect(res1.status).toBe(200);
    const s1 = await res1.json();
    expect(s1.connectedClients).toBe(1);
    expect(typeof s1.lastHeartbeatAt).toBe('string');

    // Second extension polling /bridge/jobs/next?client_id=...
    const resNext = await fetch(`${baseUrl}/bridge/jobs/next?client_id=chrome-ext-2`);
    expect(resNext.status).toBe(200);
    const nextData = await resNext.json();
    expect(nextData.job).toBeNull();

    const res2 = await fetch(`${baseUrl}/bridge/status`);
    const s2 = await res2.json();
    expect(s2.connectedClients).toBe(2);
  });

  it('prunes expired client heartbeats after TTL', async () => {
    let now = 1000;
    const queue = new BridgeQueue(root, { heartbeatTtlMs: 500, nowFn: () => now });
    queue.recordHeartbeat('ext-a');
    expect(queue.getStatus().connectedClients).toBe(1);
    now = 1600;
    expect(queue.getStatus().connectedClients).toBe(0);
  });

  it('completes full flow_sheet lifecycle: queue -> claim -> upload >= 10KB PNG -> atomic write to sheet.png', async () => {
    const enqueueRes = await fetch(`${baseUrl}/bridge/jobs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        target: 'flow_sheet',
        film_id: 'film_colossus',
        asset_id: 'char_corvus',
        prompt: 'Three panels on #e8e8e8, HEADLESS center figure',
      }),
    });
    expect(enqueueRes.status).toBe(201);
    const created = await enqueueRes.json();
    const jobId = created.job.id;
    expect(created.job.status).toBe('pending');

    // Claim atomically
    const claimRes = await fetch(`${baseUrl}/bridge/jobs/next?client_id=ext-flow`);
    expect(claimRes.status).toBe(200);
    const claimed = await claimRes.json();
    expect(claimed.job.id).toBe(jobId);
    expect(claimed.job.status).toBe('claimed');

    // Second poll sees nothing pending
    const claimRes2 = await fetch(`${baseUrl}/bridge/jobs/next?client_id=ext-flow`);
    expect((await claimRes2.json()).job).toBeNull();

    // Generate valid 512x512 noisy PNG (>= 10KB)
    const pngBytes = buildValidPngFixture(512, 512, { noisy: true });
    expect(pngBytes.length).toBeGreaterThanOrEqual(10240);

    const completeRes = await fetch(`${baseUrl}/bridge/jobs/${jobId}/complete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        mime_type: 'image/png',
        data_base64: `data:image/png;base64,${pngBytes.toString('base64')}`,
      }),
    });
    expect(completeRes.status).toBe(200);
    const done = await completeRes.json();
    expect(done.status).toBe('completed');
    expect(done.width).toBe(512);
    expect(done.height).toBe(512);

    const expectedPath = join(root, 'films', 'film_colossus', 'assets', 'characters', 'char_corvus', 'sheet.png');
    const saved = await readFile(expectedPath);
    expect(saved.equals(pngBytes)).toBe(true);

    const statusRes = await fetch(`${baseUrl}/bridge/jobs/${jobId}`);
    const jobInfo = await statusRes.json();
    expect(jobInfo.job.status).toBe('completed');
    expect(jobInfo.job.output_path).toContain('sheet.png');
  });

  it('completes flow_plate lifecycle writing atomically to locations/<id>/plate.png', async () => {
    const enqueueRes = await fetch(`${baseUrl}/bridge/jobs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        target: 'flow_plate',
        film_id: 'film_colossus',
        asset_id: 'loc_forge',
        prompt: 'Panavision 2.39:1 motivated forge plate',
      }),
    });
    const { job } = await enqueueRes.json();
    await fetch(`${baseUrl}/bridge/jobs/next`);

    const pngBytes = buildValidPngFixture(640, 360, { noisy: true });
    expect(pngBytes.length).toBeGreaterThanOrEqual(10240);

    const completeRes = await fetch(`${baseUrl}/bridge/jobs/${job.id}/complete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mime_type: 'image/png', data_base64: pngBytes.toString('base64') }),
    });
    expect(completeRes.status).toBe(200);

    const platePath = join(root, 'films', 'film_colossus', 'assets', 'locations', 'loc_forge', 'plate.png');
    const saved = await readFile(platePath);
    expect(saved.equals(pngBytes)).toBe(true);
  });

  it('rejects non-PNG bytes, tiny < 10KB PNGs, and tiny-dimension < 512px PNGs loudly', async () => {
    const enqueue = async (assetId: string) => {
      const r = await fetch(`${baseUrl}/bridge/jobs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target: 'flow_sheet', film_id: 'film_bad', asset_id: assetId, prompt: 'test' }),
      });
      return (await r.json()).job.id as string;
    };

    // 1. Non-PNG bytes (>= 10KB)
    const job1 = await enqueue('char_nonpng');
    const nonPng = Buffer.alloc(16384, 0x41);
    const res1 = await fetch(`${baseUrl}/bridge/jobs/${job1}/complete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mime_type: 'image/png', data_base64: nonPng.toString('base64') }),
    });
    expect(res1.status).toBe(400);
    expect((await res1.json()).error).toMatch(/PNG|magic|signature/i);
    await expect(stat(join(root, 'films', 'film_bad', 'assets', 'characters', 'char_nonpng', 'sheet.png'))).rejects.toThrow();

    // 2. Tiny valid PNG (< 10240 bytes)
    const job2 = await enqueue('char_tinypng');
    const tinyPng = buildValidPngFixture(64, 64, { noisy: false });
    expect(tinyPng.length).toBeLessThan(10240);
    const res2 = await fetch(`${baseUrl}/bridge/jobs/${job2}/complete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mime_type: 'image/png', data_base64: tinyPng.toString('base64') }),
    });
    expect(res2.status).toBe(400);
    expect((await res2.json()).error).toMatch(/10240|too small/i);

    // 3. Padded PNG with tiny resolution (< 512px width)
    const job3 = await enqueue('char_smallres');
    const smallResPng = buildValidPngFixture(256, 256, { noisy: false, padBytes: 12000 });
    expect(smallResPng.length).toBeGreaterThanOrEqual(10240);
    const res3 = await fetch(`${baseUrl}/bridge/jobs/${job3}/complete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mime_type: 'image/png', data_base64: smallResPng.toString('base64') }),
    });
    expect(res3.status).toBe(400);
    expect((await res3.json()).error).toMatch(/512|resolution/i);

    // 4. Forged PNG header + IHDR >= 10KB without IDAT/IEND chunks
    const job4 = await enqueue('char_forgedpng');
    const ihdrOnly = Buffer.alloc(13);
    ihdrOnly.writeUInt32BE(1024, 0);
    ihdrOnly.writeUInt32BE(1024, 4);
    ihdrOnly[8] = 8;
    ihdrOnly[9] = 2;
    const forgedPng = Buffer.concat([
      Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
      pngChunk('IHDR', ihdrOnly),
      Buffer.alloc(12000, 0),
    ]);
    const res4 = await fetch(`${baseUrl}/bridge/jobs/${job4}/complete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mime_type: 'image/png', data_base64: forgedPng.toString('base64') }),
    });
    expect(res4.status).toBe(400);
    expect((await res4.json()).error).toMatch(/IDAT|IEND|truncated/i);

    const listRes = await fetch(`${baseUrl}/bridge/jobs`);
    expect(listRes.status).toBe(200);
    expect((await listRes.json()).jobs.length).toBe(4);
  });

  it('completes aistudio_voice lifecycle with FFmpeg 48kHz mono PCM WAV normalization and rejects silent/corrupt audio', async () => {
    const enqueueRes = await fetch(`${baseUrl}/bridge/jobs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        target: 'aistudio_voice',
        film_id: 'film_colossus',
        shot_id: 'shot_01',
        line_index: 2,
        voice_persona: 'Charon',
        prompt: 'Sit down. You are standing on the primary vent plate.',
      }),
    });
    const { job } = await enqueueRes.json();

    const mp3Bytes = await makeAudioFixture(join(root, 'voice_raw.mp3'), {
      freq: 380,
      durationS: 0.5,
      sampleRate: 44100,
      channels: 2,
      codecArgs: ['-c:a', 'libmp3lame'],
    });
    expect(mp3Bytes.length).toBeGreaterThanOrEqual(1024);

    const okRes = await fetch(`${baseUrl}/bridge/jobs/${job.id}/complete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mime_type: 'audio/mpeg', data_base64: mp3Bytes.toString('base64') }),
    });
    expect(okRes.status).toBe(200);
    const okData = await okRes.json();
    expect(okData.sample_rate_hz).toBe(48000);

    const wavPath = join(root, 'films', 'film_colossus', 'audio', 'shot_01_line_2.wav');
    const probe = await ffprobeAudio(wavPath);
    expect(probe.codecName).toBe('pcm_s16le');
    expect(probe.sampleRate).toBe('48000');
    expect(probe.channels).toBe(1);
    expect(probe.durationS).toBeGreaterThan(0.3);

    // Reject silent WAV and tiny audio
    const jobSilent = (
      await (
        await fetch(`${baseUrl}/bridge/jobs`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ target: 'aistudio_voice', film_id: 'film_colossus', shot_id: 'shot_02', prompt: 'test' }),
        })
      ).json()
    ).job.id;

    const silentWav = await makeAudioFixture(join(root, 'silent.wav'), { silent: true, durationS: 0.5, sampleRate: 48000, channels: 1 });
    const silentRes = await fetch(`${baseUrl}/bridge/jobs/${jobSilent}/complete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mime_type: 'audio/wav', data_base64: silentWav.toString('base64') }),
    });
    expect(silentRes.status).toBe(400);
    expect((await silentRes.json()).error).toMatch(/silent|noise floor/i);

    const tinyRes = await fetch(`${baseUrl}/bridge/jobs/${jobSilent}/complete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mime_type: 'audio/wav', data_base64: Buffer.alloc(128).toString('base64') }),
    });
    expect(tinyRes.status).toBe(400);
  }, 15_000);

  it('marks job failed cleanly when extension posts error', async () => {
    const r = await fetch(`${baseUrl}/bridge/jobs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ target: 'flow_sheet', film_id: 'film_x', asset_id: 'char_a', prompt: 'p' }),
    });
    const { job } = await r.json();
    const failRes = await fetch(`${baseUrl}/bridge/jobs/${job.id}/complete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Flow selector timeout' }),
    });
    expect(failRes.status).toBe(200);
    const failed = await failRes.json();
    expect(failed.status).toBe('failed');
    expect(failed.error).toBe('Flow selector timeout');
  });

  it('guards film_id, asset_id, shot_id, and job_id against path traversal', async () => {
    const badIds = ['../etc', 'foo/bar', 'foo\\bar', '..'];
    for (const bad of badIds) {
      const r1 = await fetch(`${baseUrl}/bridge/jobs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target: 'flow_sheet', film_id: bad, asset_id: 'char_a', prompt: 'p' }),
      });
      expect(r1.status).toBe(400);

      const r2 = await fetch(`${baseUrl}/bridge/jobs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target: 'flow_sheet', film_id: 'film_a', asset_id: bad, prompt: 'p' }),
      });
      expect(r2.status).toBe(400);
    }
  });

  it('mounts identical /bridge/* routes inside StudioHttpServer (src/http.ts) sharing the same BridgeQueue', async () => {
    const httpServer: StudioHttpServer = await startHttpServer({ studioRoot: root, port: 0, host: '127.0.0.1' });
    try {
      const addr = httpServer.server.address();
      const port = typeof addr === 'object' && addr ? addr.port : 3000;
      const httpUrl = `http://127.0.0.1:${port}`;

      // Enqueue via standalone WebBridgeServer, claim via http.ts /bridge/jobs/next!
      const createRes = await fetch(`${baseUrl}/bridge/jobs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target: 'flow_sheet', film_id: 'film_shared', asset_id: 'char_shared', prompt: 'Shared queue test' }),
      });
      expect(createRes.status).toBe(201);
      const { job } = await createRes.json();

      const statusRes = await fetch(`${httpUrl}/bridge/status?client_id=vps-ext`);
      expect(statusRes.status).toBe(200);
      const st = await statusRes.json();
      expect(st.pendingTasks).toBe(1);
      expect(st.connectedClients).toBe(1);

      const claimRes = await fetch(`${httpUrl}/bridge/jobs/next?client_id=vps-ext`);
      expect(claimRes.status).toBe(200);
      expect((await claimRes.json()).job.id).toBe(job.id);
    } finally {
      await httpServer.close();
    }
  });

  it('ships valid Manifest V3 Chrome extension files under extension/', async () => {
    const extRoot = resolve(process.cwd(), 'extension');
    const manifestRaw = await readFile(join(extRoot, 'manifest.json'), 'utf8');
    const manifest = JSON.parse(manifestRaw);
    expect(manifest.manifest_version).toBe(3);
    expect(manifest.name).toBe('Frontier Flow & AI Studio Bridge');
    expect(manifest.permissions).toEqual(expect.arrayContaining(['storage', 'activeTab', 'scripting', 'clipboardWrite']));
    expect(manifest.host_permissions).toEqual(
      expect.arrayContaining(['https://flow.google/*', 'https://aistudio.google.com/*', 'http://127.0.0.1:*/*']),
    );
    expect(manifest.background.service_worker).toBe('background.js');
    expect(manifest.action.default_popup).toBe('popup.html');

    for (const file of ['background.js', 'popup.html', 'popup.js', 'content_flow.js', 'content_aistudio.js']) {
      const st = await stat(join(extRoot, file));
      expect(st.size).toBeGreaterThan(100);
    }
  });
});
