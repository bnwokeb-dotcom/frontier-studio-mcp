// test/bridge/web_bridge.test.ts — TDD tests for WebBridgeServer, BridgeQueue, /bridge/* HTTP routes, and extension manifest.
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, rm, readFile, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { deflateSync } from 'node:zlib';
import { execFile as execFileCb } from 'node:child_process';
import { promisify } from 'node:util';
import http from 'node:http';
import vm from 'node:vm';
import {
  BridgeQueue,
  BridgeRequestError,
  WebBridgeServer,
  getSharedBridgeQueue,
  sniffAudioExtension,
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
    const badIds = ['../etc', 'foo/bar', 'foo\\bar', '..', '.hidden', 'bad%id'];
    const queue = bridgeServer.getQueue();

    for (const bad of badIds) {
      // 1. film_id
      const r1 = await fetch(`${baseUrl}/bridge/jobs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target: 'flow_sheet', film_id: bad, asset_id: 'char_a', prompt: 'p' }),
      });
      expect(r1.status).toBe(400);

      // 2. asset_id
      const r2 = await fetch(`${baseUrl}/bridge/jobs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target: 'flow_sheet', film_id: 'film_a', asset_id: bad, prompt: 'p' }),
      });
      expect(r2.status).toBe(400);

      // 3. shot_id
      const r3 = await fetch(`${baseUrl}/bridge/jobs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target: 'aistudio_voice', film_id: 'film_a', shot_id: bad, prompt: 'p' }),
      });
      expect(r3.status).toBe(400);

      // 4. job_id (direct queue guards + HTTP route guards)
      expect(() => queue.getJob(bad)).toThrow(BridgeRequestError);
      await expect(queue.completeJob(bad, { error: 'x' })).rejects.toThrow(BridgeRequestError);
    }

    // HTTP route traversal & disallowed job_id characters on GET /bridge/jobs/:id and POST /bridge/jobs/:id/complete
    const encodedBadJobIds = ['foo%5Cbar', 'foo%2Fbar', '.hidden', 'bad%25id'];
    for (const seg of encodedBadJobIds) {
      const g = await fetch(`${baseUrl}/bridge/jobs/${seg}`);
      expect(g.status).toBe(400);
      const p = await fetch(`${baseUrl}/bridge/jobs/${seg}/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'x' }),
      });
      expect(p.status).toBe(400);
    }

    // Raw un-normalized '..' traversal over node:http -> 403
    const rawAddr = new URL(baseUrl);
    const dotdotStatus = await new Promise<number>((resolveStatus) => {
      const req = http.request(
        { host: rawAddr.hostname, port: Number(rawAddr.port), path: '/bridge/jobs/..%2fetc', method: 'GET' },
        (res) => resolveStatus(res.statusCode ?? 0),
      );
      req.end();
    });
    expect(dotdotStatus).toBe(403);
  });

  it('returns 400 (never 500 or unhandled rejection) for malformed %ZZ job IDs, non-object JSON bodies, invalid JSON, and invalid Host headers', async () => {
    // 1. Malformed %ZZ in GET and POST job_id routes -> 400
    const badGet = await fetch(`${baseUrl}/bridge/jobs/%ZZ`);
    expect(badGet.status).toBe(400);
    expect((await badGet.json()).error).toMatch(/malformed|encoding/i);

    const badPost = await fetch(`${baseUrl}/bridge/jobs/%ZZ/complete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'x' }),
    });
    expect(badPost.status).toBe(400);
    expect((await badPost.json()).error).toMatch(/malformed|encoding/i);

    // 2. POST /bridge/jobs with null, array, string, or invalid JSON -> 400
    for (const badBody of ['null', '[]', '"hello"', '123', '{not-json']) {
      const res = await fetch(`${baseUrl}/bridge/jobs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: badBody,
      });
      expect(res.status).toBe(400);
      const parsed = await res.json();
      expect(typeof parsed.error).toBe('string');
    }

    // 3. POST /bridge/jobs/:id/complete with null or array -> 400
    const created = await (
      await fetch(`${baseUrl}/bridge/jobs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target: 'flow_sheet', film_id: 'film_badbody', asset_id: 'char_a', prompt: 'p' }),
      })
    ).json();
    for (const badBody of ['null', '[]', '"str"']) {
      const res = await fetch(`${baseUrl}/bridge/jobs/${created.job.id}/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: badBody,
      });
      expect(res.status).toBe(400);
    }

    // 4. Invalid Host header -> 400 (not 500 or unhandled rejection)
    const rawAddr = new URL(baseUrl);
    const invalidHostRes = await new Promise<{ status: number; body: string }>((resolveRes, rejectRes) => {
      const req = http.request(
        {
          host: rawAddr.hostname,
          port: Number(rawAddr.port),
          path: '/bridge/status',
          method: 'GET',
          headers: { Host: 'bad host:99999' },
        },
        (res) => {
          let data = '';
          res.on('data', (c) => (data += c));
          res.on('end', () => resolveRes({ status: res.statusCode ?? 0, body: data }));
        },
      );
      req.on('error', rejectRes);
      req.end();
    });
    expect(invalidHostRes.status).toBe(400);
    expect(JSON.parse(invalidHostRes.body).error).toMatch(/invalid|url|host/i);
  });

  it('sniffs magic audio bytes BEFORE mime_type fallback in sniffAudioExtension', async () => {
    const mp3Bytes = await makeAudioFixture(join(root, 'sniff.mp3'), {
      freq: 440,
      durationS: 0.3,
      sampleRate: 44100,
      channels: 1,
      codecArgs: ['-c:a', 'libmp3lame'],
    });
    // Even if client sends default 'audio/wav', magic bytes win
    expect(sniffAudioExtension(mp3Bytes, 'audio/wav')).toBe('.mp3');

    const oggHeader = Buffer.concat([Buffer.from('OggS'), Buffer.alloc(64)]);
    expect(sniffAudioExtension(oggHeader, 'audio/wav')).toBe('.ogg');

    const webmHeader = Buffer.concat([Buffer.from([0x1a, 0x45, 0xdf, 0xa3]), Buffer.alloc(64)]);
    expect(sniffAudioExtension(webmHeader, 'audio/wav')).toBe('.webm');

    const flacHeader = Buffer.concat([Buffer.from('fLaC'), Buffer.alloc(64)]);
    expect(sniffAudioExtension(flacHeader, 'audio/wav')).toBe('.flac');

    const m4aHeader = Buffer.concat([Buffer.from([0, 0, 0, 20]), Buffer.from('ftypM4A '), Buffer.alloc(64)]);
    expect(sniffAudioExtension(m4aHeader, 'audio/wav')).toBe('.m4a');

    // Unknown bytes fall back to mime_type
    expect(sniffAudioExtension(Buffer.alloc(32, 0), 'audio/ogg')).toBe('.ogg');
    expect(() => sniffAudioExtension(Buffer.alloc(32, 0), 'audio/x-unknown-codec')).toThrow(BridgeRequestError);
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

  it('extension background hook filters untyped non-audio Blobs and accepts audio magic headers + typed audio Blobs', async () => {
    const extRoot = resolve(process.cwd(), 'extension');
    const bgSrc = await readFile(join(extRoot, 'background.js'), 'utf8');

    const storageData: Record<string, unknown> = { bridgeBaseUrl: baseUrl, clientId: 'test-ext' };
    let injectedMainFunc: (() => void) | null = null;
    const messageHandlers: Array<(msg: unknown, sender: unknown, sendResponse: (r: unknown) => void) => boolean> = [];

    const chromeMock = {
      storage: {
        local: {
          get: async (keys: string[]) => {
            const out: Record<string, unknown> = {};
            for (const k of keys) if (k in storageData) out[k] = storageData[k];
            return out;
          },
          set: async (patch: Record<string, unknown>) => Object.assign(storageData, patch),
        },
      },
      tabs: {
        query: async () => [{ id: 42, active: true }],
        update: async () => ({ id: 42 }),
        create: async () => ({ id: 42 }),
        sendMessage: async () => ({ ok: true }),
        onUpdated: { addListener: () => {}, removeListener: () => {} },
      },
      scripting: {
        executeScript: async (opts: { world?: string; func?: () => void }) => {
          if (opts.world === 'MAIN' && opts.func) {
            injectedMainFunc = opts.func;
          }
          return [];
        },
      },
      runtime: {
        onInstalled: { addListener: () => {} },
        onStartup: { addListener: () => {} },
        onMessage: { addListener: (fn: (m: unknown, s: unknown, sr: (r: unknown) => void) => boolean) => messageHandlers.push(fn) },
      },
    };

    const bgCtx = vm.createContext({
      chrome: chromeMock,
      fetch: async () => ({ ok: true, json: async () => ({ job: null }) }),
      setTimeout: () => 0 as unknown as NodeJS.Timeout,
      clearTimeout: () => {},
      URL,
      Math,
      Date,
      String,
      Promise,
    });
    vm.runInContext(bgSrc, bgCtx);

    await new Promise<void>((resolveDispatch) => {
      messageHandlers[0](
        { type: 'DISPATCH_JOB', job: { id: 'j1', target: 'aistudio_voice', prompt: 'hello' } },
        null,
        () => resolveDispatch(),
      );
    });
    expect(injectedMainFunc).toBeTypeOf('function');

    const dispatched: Array<{ url: string; mimeType: string }> = [];
    let blobSeq = 0;
    const FakeURL = {
      createObjectURL: (_obj: unknown) => `blob:test/${++blobSeq}`,
    };
    const fakeWindow: Record<string, unknown> = {
      dispatchEvent: (ev: { detail: { url: string; mimeType: string } }) => dispatched.push(ev.detail),
      Audio: function FakeAudio(this: Record<string, unknown>, src?: string) {
        this.src = src;
      },
    };
    class FakeCustomEvent {
      type: string;
      detail: unknown;
      constructor(type: string, init: { detail: unknown }) {
        this.type = type;
        this.detail = init.detail;
      }
    }

    const hookCtx = vm.createContext({
      window: fakeWindow,
      URL: FakeURL,
      Blob,
      CustomEvent: FakeCustomEvent,
      Uint8Array,
    });
    vm.runInContext(`(${injectedMainFunc!.toString()})()`, hookCtx);

    // 1. Small untyped blob (< 4096 bytes) -> ignored
    (hookCtx.URL as typeof FakeURL).createObjectURL(new Blob([Buffer.from('RIFF\0\0\0\0WAVE')], { type: '' }));
    // 2. Large untyped telemetry JSON blob (>= 4096 bytes) -> ignored
    (hookCtx.URL as typeof FakeURL).createObjectURL(
      new Blob([Buffer.from('{"telemetry":true}'.repeat(300))], { type: '' }),
    );
    // 3. Large untyped RIFF....WAVE blob -> dispatched
    const wavHeader = Buffer.concat([Buffer.from('RIFF\x00\x20\x00\x00WAVE'), Buffer.alloc(4096, 1)]);
    (hookCtx.URL as typeof FakeURL).createObjectURL(new Blob([wavHeader], { type: '' }));
    // 4. Large untyped ID3 MP3 blob -> dispatched
    const id3Header = Buffer.concat([Buffer.from('ID3\x03\x00'), Buffer.alloc(4096, 2)]);
    (hookCtx.URL as typeof FakeURL).createObjectURL(new Blob([id3Header], { type: '' }));
    // 5. Large untyped \xFF\xFB MP3 blob -> dispatched
    const syncMp3 = Buffer.concat([Buffer.from([0xff, 0xfb, 0x90, 0x00]), Buffer.alloc(4096, 2)]);
    (hookCtx.URL as typeof FakeURL).createObjectURL(new Blob([syncMp3], { type: '' }));
    // 6. Large untyped OggS blob -> dispatched
    const ogg = Buffer.concat([Buffer.from('OggS'), Buffer.alloc(4096, 2)]);
    (hookCtx.URL as typeof FakeURL).createObjectURL(new Blob([ogg], { type: '' }));
    // 7. Large untyped WebM (\x1A\x45\xDF\xA3) blob -> dispatched
    const webm = Buffer.concat([Buffer.from([0x1a, 0x45, 0xdf, 0xa3]), Buffer.alloc(4096, 2)]);
    (hookCtx.URL as typeof FakeURL).createObjectURL(new Blob([webm], { type: '' }));
    // 8. Large untyped fLaC blob -> dispatched
    const flac = Buffer.concat([Buffer.from('fLaC'), Buffer.alloc(4096, 2)]);
    (hookCtx.URL as typeof FakeURL).createObjectURL(new Blob([flac], { type: '' }));
    // 9. Large untyped ftyp (M4A) blob -> dispatched
    const m4a = Buffer.concat([Buffer.from([0, 0, 0, 20]), Buffer.from('ftypM4A '), Buffer.alloc(4096, 2)]);
    (hookCtx.URL as typeof FakeURL).createObjectURL(new Blob([m4a], { type: '' }));
    // 10. Typed audio/wav blob -> dispatched immediately
    (hookCtx.URL as typeof FakeURL).createObjectURL(new Blob([Buffer.alloc(2048, 3)], { type: 'audio/wav' }));

    await new Promise((r) => setTimeout(r, 30));

    expect(dispatched.map((d) => d.url).sort()).toEqual([
      'blob:test/10',
      'blob:test/3',
      'blob:test/4',
      'blob:test/5',
      'blob:test/6',
      'blob:test/7',
      'blob:test/8',
      'blob:test/9',
    ]);
  });

  it('content_aistudio.js and content_flow.js filter visible prompt-container buttons and latch ONLY after { ok: true }', async () => {
    const extRoot = resolve(process.cwd(), 'extension');
    const aistudioSrc = await readFile(join(extRoot, 'content_aistudio.js'), 'utf8');
    const flowSrc = await readFile(join(extRoot, 'content_flow.js'), 'utf8');

    // Minimal DOM element builder supporting closest/querySelector/querySelectorAll/offsetParent/disabled/aria-disabled
    type FakeEl = {
      tagName: string;
      id: string;
      type: string;
      textContent: string;
      value: string;
      src: string;
      currentSrc: string;
      disabled: boolean;
      offsetParent: unknown;
      complete: boolean;
      naturalWidth: number;
      naturalHeight: number;
      width: number;
      height: number;
      style: Record<string, string>;
      attrs: Record<string, string>;
      children: FakeEl[];
      parent: FakeEl | null;
      clicked: number;
      getAttribute: (k: string) => string | null;
      setAttribute: (k: string, v: string) => void;
      append: (...kids: FakeEl[]) => void;
      appendChild: (k: FakeEl) => FakeEl;
      remove: () => void;
      focus: () => void;
      select: () => void;
      click: () => void;
      dispatchEvent: () => void;
      closest: (sel: string) => FakeEl | null;
      querySelector: (sel: string) => FakeEl | null;
      querySelectorAll: (sel: string) => FakeEl[];
      toBlob: (cb: (b: Blob | null) => void) => void;
    };

    const matchesSingle = (el: FakeEl, sel: string): boolean => {
      const s = sel.trim();
      if (s.startsWith('#')) return el.id === s.slice(1);
      if (s === '[role="main"]') return el.attrs.role === 'main';
      if (s === '[role="navigation"]') return el.attrs.role === 'navigation';
      if (s === '[role="banner"]') return el.attrs.role === 'banner';
      if (s === 'button[type="submit"]') return el.tagName === 'BUTTON' && el.type === 'submit';
      if (s === 'textarea') return el.tagName === 'TEXTAREA';
      if (s === 'button') return el.tagName === 'BUTTON';
      if (s === 'img') return el.tagName === 'IMG';
      if (s === 'canvas') return el.tagName === 'CANVAS';
      if (s === 'audio') return el.tagName === 'AUDIO';
      return el.tagName.toLowerCase() === s.toLowerCase();
    };

    const matchesSelector = (el: FakeEl, selector: string): boolean =>
      selector.split(',').some((part) => matchesSingle(el, part));

    const makeEl = (tag: string, props: Partial<FakeEl> = {}, attrs: Record<string, string> = {}): FakeEl => {
      const el: FakeEl = {
        tagName: tag.toUpperCase(),
        id: props.id ?? '',
        type: props.type ?? '',
        textContent: props.textContent ?? '',
        value: props.value ?? '',
        src: props.src ?? '',
        currentSrc: props.currentSrc ?? '',
        disabled: props.disabled ?? false,
        offsetParent: props.offsetParent === undefined ? {} : props.offsetParent,
        complete: props.complete ?? true,
        naturalWidth: props.naturalWidth ?? 0,
        naturalHeight: props.naturalHeight ?? 0,
        width: props.width ?? 0,
        height: props.height ?? 0,
        style: { cssText: '' },
        attrs,
        children: [],
        parent: null,
        clicked: 0,
        getAttribute: (k) => (k in attrs ? attrs[k] : null),
        setAttribute: (k, v) => {
          attrs[k] = v;
        },
        append: (...kids) => {
          for (const k of kids) el.appendChild(k);
        },
        appendChild: (k) => {
          k.parent = el;
          el.children.push(k);
          return k;
        },
        remove: () => {},
        focus: () => {},
        select: () => {},
        click: () => {
          el.clicked += 1;
        },
        dispatchEvent: () => {},
        closest: (sel) => {
          let cur: FakeEl | null = el;
          while (cur) {
            if (matchesSelector(cur, sel)) return cur;
            cur = cur.parent;
          }
          return null;
        },
        querySelector: (sel) => el.querySelectorAll(sel)[0] ?? null,
        querySelectorAll: (sel) => {
          const parts = sel.split(',').map((p) => p.trim());
          const out: FakeEl[] = [];
          const walk = (node: FakeEl) => {
            for (const c of node.children) {
              const hit = parts.some((p) => {
                const segs = p.split(/\s+/);
                if (segs.length === 2) {
                  return matchesSingle(c, segs[1]) && Boolean(c.parent?.closest(segs[0]));
                }
                return matchesSingle(c, p);
              });
              if (hit) out.push(c);
              walk(c);
            }
          };
          walk(el);
          return out;
        },
        toBlob: (cb) => cb(new Blob([Buffer.alloc(12000, 7)], { type: 'image/png' })),
      };
      return el;
    };

    // --- Test 1: content_aistudio.js ---
    {
      const body = makeEl('body');
      const nav = makeEl('nav');
      const navCreateProj = makeEl('button', { textContent: 'Create project' });
      const navRunSample = makeEl('button', { textContent: 'Run in Colab' });
      nav.append(navCreateProj, navRunSample);
      const main = makeEl('main');
      const textarea = makeEl('textarea');
      const hiddenRun = makeEl('button', { textContent: 'Run', offsetParent: null });
      const disabledRun = makeEl('button', { textContent: 'Run', disabled: true });
      const ariaDisabledRun = makeEl('button', { textContent: 'Run' }, { 'aria-disabled': 'true' });
      const realRun = makeEl('button', { textContent: 'Run' });
      main.append(textarea, hiddenRun, disabledRun, ariaDisabledRun, realRun);
      body.append(nav, main);

      const doc = {
        body,
        createElement: (t: string) => makeEl(t),
        getElementById: (id: string) => body.querySelectorAll(`#${id}`)[0] ?? null,
        querySelector: (s: string) => body.querySelector(s),
        querySelectorAll: (s: string) => body.querySelectorAll(s),
      };

      const listeners: Record<string, Array<(ev: unknown) => void>> = {};
      const msgListeners: Array<(m: unknown, s: unknown, sr: (r: unknown) => void) => boolean> = [];
      const completeCalls: string[] = [];
      const responses = [
        { ok: false, error: 'early preview rejected' },
        { ok: true, result: { output_path: 'audio/line1.wav' } },
      ];

      class FakeFileReader {
        result = '';
        onloadend: (() => void) | null = null;
        readAsDataURL(blob: Blob) {
          void blob.arrayBuffer().then((ab) => {
            this.result = `data:audio/wav;base64,${Buffer.from(ab).toString('base64')}`;
            this.onloadend?.();
          });
        }
      }
      class FakeMutationObserver {
        observe() {}
        disconnect() {}
      }

      const ctx = vm.createContext({
        window: {
          addEventListener: (name: string, fn: (ev: unknown) => void) => {
            (listeners[name] ??= []).push(fn);
          },
        },
        document: doc,
        navigator: { clipboard: { writeText: async () => {} } },
        chrome: {
          runtime: {
            onMessage: { addListener: (fn: (m: unknown, s: unknown, sr: (r: unknown) => void) => boolean) => msgListeners.push(fn) },
            sendMessage: async (msg: { type: string; jobId: string }) => {
              completeCalls.push(msg.jobId);
              return responses.shift() ?? { ok: true };
            },
          },
        },
        fetch: async () => ({
          ok: true,
          status: 200,
          blob: async () => new Blob([Buffer.alloc(2048, 5)], { type: 'audio/wav' }),
        }),
        HTMLTextAreaElement: { prototype: {} },
        HTMLInputElement: { prototype: {} },
        Event: class { constructor(public type: string) {} },
        InputEvent: class { constructor(public type: string) {} },
        FileReader: FakeFileReader,
        MutationObserver: FakeMutationObserver,
        setTimeout: (fn: () => void) => {
          fn();
          return 0 as unknown as NodeJS.Timeout;
        },
        clearTimeout: () => {},
        Promise,
      });

      vm.runInContext(aistudioSrc, ctx);
      msgListeners[0](
        { type: 'EXECUTE_BRIDGE_JOB', job: { id: 'job_ai_1', target: 'aistudio_voice', prompt: 'Speak', voice_persona: 'Charon' } },
        null,
        () => {},
      );
      await new Promise((r) => setTimeout(r, 15));

      expect(navCreateProj.clicked).toBe(0);
      expect(navRunSample.clicked).toBe(0);
      expect(hiddenRun.clicked).toBe(0);
      expect(disabledRun.clicked).toBe(0);
      expect(ariaDisabledRun.clicked).toBe(0);
      expect(realRun.clicked).toBe(1);

      // 1st audio URL rejected -> must NOT latch
      for (const fn of listeners['frontier-bridge-audio-url'] ?? []) fn({ detail: { url: 'blob:ai/1' } });
      await new Promise((r) => setTimeout(r, 20));
      expect(completeCalls.length).toBe(1);

      // 2nd audio URL accepted { ok: true } -> MUST retry and latch
      for (const fn of listeners['frontier-bridge-audio-url'] ?? []) fn({ detail: { url: 'blob:ai/2' } });
      await new Promise((r) => setTimeout(r, 20));
      expect(completeCalls.length).toBe(2);

      // 3rd audio URL after latch -> ignored
      for (const fn of listeners['frontier-bridge-audio-url'] ?? []) fn({ detail: { url: 'blob:ai/3' } });
      await new Promise((r) => setTimeout(r, 20));
      expect(completeCalls.length).toBe(2);
    }

    // --- Test 2: content_flow.js ---
    {
      const body = makeEl('body');
      const header = makeEl('header');
      const navCreateProj = makeEl('button', { textContent: 'Create project' });
      header.append(navCreateProj);
      const main = makeEl('main');
      const textarea = makeEl('textarea');
      const hiddenGen = makeEl('button', { textContent: 'Generate', offsetParent: null });
      const ariaDisabledGen = makeEl('button', { textContent: 'Generate' }, { 'aria-disabled': 'true' });
      const realGen = makeEl('button', { textContent: 'Generate' });
      main.append(textarea, hiddenGen, ariaDisabledGen, realGen);
      body.append(header, main);

      const doc = {
        body,
        createElement: (t: string) => makeEl(t),
        getElementById: (id: string) => body.querySelectorAll(`#${id}`)[0] ?? null,
        querySelector: (s: string) => body.querySelector(s),
        querySelectorAll: (s: string) => body.querySelectorAll(s),
      };

      const msgListeners: Array<(m: unknown, s: unknown, sr: (r: unknown) => void) => boolean> = [];
      let observerCb: (() => void) | null = null;
      const completeCalls: string[] = [];
      const responses = [
        { ok: false, error: 'preview PNG too small' },
        { ok: true, result: { width: 1024, height: 576 } },
      ];

      class FakeFileReader {
        result = '';
        onloadend: (() => void) | null = null;
        readAsDataURL(blob: Blob) {
          void blob.arrayBuffer().then((ab) => {
            this.result = `data:image/png;base64,${Buffer.from(ab).toString('base64')}`;
            this.onloadend?.();
          });
        }
      }
      class FakeMutationObserver {
        constructor(cb: () => void) {
          observerCb = cb;
        }
        observe() {}
        disconnect() {}
      }

      const ctx = vm.createContext({
        window: {},
        document: doc,
        navigator: { clipboard: { writeText: async () => {} } },
        chrome: {
          runtime: {
            onMessage: { addListener: (fn: (m: unknown, s: unknown, sr: (r: unknown) => void) => boolean) => msgListeners.push(fn) },
            sendMessage: async (msg: { type: string; jobId: string }) => {
              completeCalls.push(msg.jobId);
              return responses.shift() ?? { ok: true };
            },
          },
        },
        fetch: async () => ({ ok: false }),
        HTMLTextAreaElement: { prototype: {} },
        HTMLInputElement: { prototype: {} },
        Event: class { constructor(public type: string) {} },
        InputEvent: class { constructor(public type: string) {} },
        FileReader: FakeFileReader,
        MutationObserver: FakeMutationObserver,
        setTimeout: (fn: () => void, ms?: number) => {
          if ((ms ?? 0) < 5000) fn();
          return 0 as unknown as NodeJS.Timeout;
        },
        clearTimeout: () => {},
        Promise,
      });

      vm.runInContext(flowSrc, ctx);
      msgListeners[0](
        { type: 'EXECUTE_BRIDGE_JOB', job: { id: 'job_flow_1', target: 'flow_sheet', prompt: '3 panels' } },
        null,
        () => {},
      );
      await new Promise((r) => setTimeout(r, 15));

      expect(navCreateProj.clicked).toBe(0);
      expect(hiddenGen.clicked).toBe(0);
      expect(ariaDisabledGen.clicked).toBe(0);
      expect(realGen.clicked).toBe(1);
      expect(observerCb).toBeTypeOf('function');

      // 1st candidate canvas fails bridge validation -> must NOT latch
      const canvas1 = makeEl('canvas', { width: 1024, height: 576 });
      main.append(canvas1);
      observerCb!();
      await new Promise((r) => setTimeout(r, 20));
      expect(completeCalls.length).toBe(1);

      // 2nd candidate canvas succeeds { ok: true } -> latches
      const canvas2 = makeEl('canvas', { width: 2048, height: 1152 });
      main.append(canvas2);
      observerCb!();
      await new Promise((r) => setTimeout(r, 20));
      expect(completeCalls.length).toBe(2);

      // 3rd mutation after latch -> ignored
      const canvas3 = makeEl('canvas', { width: 3840, height: 2160 });
      main.append(canvas3);
      observerCb!();
      await new Promise((r) => setTimeout(r, 20));
      expect(completeCalls.length).toBe(2);
    }
  });
});
