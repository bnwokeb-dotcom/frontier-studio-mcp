// test/sfx/sfx_engine.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { execFile as execFileCb } from 'node:child_process';
import { mkdtemp, readFile, rm, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';
import {
  computeSfxPlacement,
  fetchRemoteApiSfx,
  loadSfxCatalog,
  mixSfxOntoMedia,
  resolveSfxWavPath,
  searchSfxCatalog,
} from '../../src/sfx/sfx_engine.js';
import { probeMedia } from '../../src/qa/critic.js';

const execFile = promisify(execFileCb);

describe('Trending SFX Kit & Remote API Mixer Engine', () => {
  let root: string;

  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'fsm-sfx-'));
  });

  afterEach(async () => {
    await rm(root, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
  });

  it('loads 320 catalog sounds and searches by query, category, and viral preset', async () => {
    const cat = await loadSfxCatalog();
    expect(cat.sounds.length).toBe(320);

    const whooshes = await searchSfxCatalog({ query: 'whip pan whoosh', category: 'whooshes' });
    expect(whooshes.total_matches).toBeGreaterThan(0);
    expect(whooshes.results[0].id).toContain('whoosh');

    const preset = await searchSfxCatalog({ viral_preset: 'vine_boom' });
    expect(preset.results[0].id).toBe('boom-drop-strong');
  });

  it('computes sync.at alignment, negative-start trimming, and under_voiceover_db ducking', async () => {
    const { entry, filePath } = await resolveSfxWavPath('riser-2s-strong', root);
    expect(filePath.endsWith('.wav')).toBe(true);

    // Placing a 2s riser with sync.at ~1.98s at 0.5s reveal -> negative raw start triggers trim_start_s > 0
    const earlySpot = computeSfxPlacement({
      entry,
      filePath,
      targetMomentS: 0.5,
      speechIntervals: [{ start_s: 0.0, end_s: 3.0 }],
      reason: 'early_reveal',
    });

    expect(earlySpot.timeline_start_s).toBe(0);
    expect(earlySpot.trim_start_s).toBeGreaterThan(1.0);
    expect(earlySpot.gain_db).toBeLessThan(0); // speech overlap ducking applied
  });

  it('mixes multiple real 48kHz SFX spots onto an MP4 video cleanly via FFmpeg', async () => {
    const srcVideo = join(root, 'base.mp4');
    await execFile('ffmpeg', [
      '-y', '-f', 'lavfi', '-i', 'testsrc=size=320x180:rate=24:duration=2.5',
      '-f', 'lavfi', '-i', 'sine=frequency=440:duration=2.5',
      '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-c:a', 'aac',
      srcVideo,
    ]);

    const boom = await resolveSfxWavPath('hook_slam', root);
    const pop = await resolveSfxWavPath('caption_pop', root);

    const spots = [
      computeSfxPlacement({ entry: boom.entry, filePath: boom.filePath, targetMomentS: 0.15 }),
      computeSfxPlacement({ entry: pop.entry, filePath: pop.filePath, targetMomentS: 1.2 }),
    ];

    const outMp4 = join(root, 'mixed.mp4');
    const mixed = await mixSfxOntoMedia({
      inputMediaPath: srcVideo,
      outputPath: outMp4,
      spots,
    });

    expect(mixed.spotsMixed).toBe(2);
    expect(mixed.hasVideo).toBe(true);
    const probe = await probeMedia(outMp4);
    expect(probe.exists).toBe(true);
    expect(probe.hasVideo).toBe(true);
    expect(probe.hasAudio).toBe(true);
  });

  it('fetches and normalizes remote API SFX via ElevenLabs & Freesound into 48kHz WAV', async () => {
    const sampleWav = join(root, 'mock_api.wav');
    await execFile('ffmpeg', [
      '-y', '-f', 'lavfi', '-i', 'sine=frequency=330:duration=0.6',
      '-ar', '44100', '-ac', '1', sampleWav,
    ]);
    const wavBytes = await readFile(sampleWav);

    const elRes = await fetchRemoteApiSfx({
      provider: 'elevenlabs',
      queryOrPrompt: 'cyberpunk glitch whoosh',
      studioRoot: root,
      durationS: 1.0,
      apiKey: 'test-el-key',
      fetchFn: async (url) => {
        expect(url).toContain('/v1/sound-generation');
        return {
          ok: true,
          status: 200,
          arrayBuffer: async () => wavBytes.buffer.slice(wavBytes.byteOffset, wavBytes.byteOffset + wavBytes.byteLength),
          json: async () => ({}),
          text: async () => '',
        };
      },
    });

    expect(elRes.provider).toBe('elevenlabs');
    expect(elRes.sample_rate_hz).toBe(48000);
    await expect(stat(elRes.audio_path)).resolves.toBeTruthy();

    const fsRes = await fetchRemoteApiSfx({
      provider: 'freesound',
      queryOrPrompt: 'vine boom impact',
      studioRoot: root,
      apiKey: 'test-fs-key',
      fetchFn: async (url) => {
        if (url.includes('freesound.org/apiv2/search')) {
          return {
            ok: true,
            status: 200,
            arrayBuffer: async () => new ArrayBuffer(0),
            json: async () => ({
              results: [
                {
                  id: 777,
                  name: 'Deep Vine Boom.wav',
                  duration: 0.6,
                  previews: { 'preview-hq-mp3': 'https://cdn.freesound.org/previews/777.wav' },
                },
              ],
            }),
            text: async () => '{}',
          };
        }
        return {
          ok: true,
          status: 200,
          arrayBuffer: async () => wavBytes.buffer.slice(wavBytes.byteOffset, wavBytes.byteOffset + wavBytes.byteLength),
          json: async () => ({}),
          text: async () => '',
        };
      },
    });

    expect(fsRes.provider).toBe('freesound');
    expect(fsRes.sfx_id).toBe('freesound_777');
    expect(fsRes.sample_rate_hz).toBe(48000);
  });
});
