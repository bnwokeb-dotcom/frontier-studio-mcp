// test/browser/browser_bridge.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, rm, writeFile, readFile, readdir, mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFile as execFileCb } from 'node:child_process';
import { promisify } from 'node:util';
import { MusicBridgeRunner, compileMusicPrompt } from '../../scripts/browser/music_bridge.js';
import { CanvasBridgeRunner } from '../../scripts/browser/canvas_bridge.js';
import { BridgeQueue, WebBridgeServer } from '../../src/bridge/web_bridge_server.js';
import { probeMedia } from '../../src/qa/critic.js';
import { StudioError } from '../../src/errors.js';

const execFile = promisify(execFileCb);

async function makeRealWav(destPath: string, freq = 440, sampleRate = 44100): Promise<void> {
  await execFile('ffmpeg', [
    '-y',
    '-f', 'lavfi', '-i', `sine=frequency=${freq}:duration=0.4`,
    '-ar', String(sampleRate), '-ac', '2', '-c:a', 'pcm_s16le',
    destPath,
  ]);
}

describe('Browser Automation Bridge', () => {
  let root: string;

  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'fsm-bridge-'));
  });

  afterEach(async () => {
    await rm(root, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
  });

  describe('MusicBridge (Suno / Udio Automation)', () => {
    it('compiles emotional tension prompts for Suno/Udio', () => {
      const p1 = compileMusicPrompt({
        themeMelody: 'Mothers Lullaby',
        state: 'felt_whisper',
        instruments: ['felt_piano', 'cello'],
      });
      expect(p1.prompt).toContain('Mothers Lullaby');
      expect(p1.prompt).toContain('felt_piano');
      expect(p1.tags).toContain('intimate');
      expect(p1.suggestedBpm).toBe(60);

      const p2 = compileMusicPrompt({
        themeMelody: 'Mothers Lullaby',
        state: 'epic_swell',
        instruments: ['brass', 'timpani', 'choir'],
      });
      expect(p2.prompt).toContain('crescendo');
      expect(p2.prompt).toContain('choir');
      expect(p2.suggestedBpm).toBeGreaterThanOrEqual(80);
    });

    it('refuses loudly when neither sourceStemsDir nor Chrome bridge is configured and creates zero RIFFMock files', async () => {
      const outDir = join(root, 'music_unconfigured');
      const runner = new MusicBridgeRunner({ outputDir: outDir, engine: 'udio' });

      try {
        await runner.generateAndExtractStems({
          themeMelody: 'CorvusTheme',
          targetStates: ['felt_whisper', 'epic_swell'],
        });
        expect.fail('Expected generateAndExtractStems to refuse unconfigured audio source');
      } catch (err) {
        expect(err).toBeInstanceOf(StudioError);
        expect((err as StudioError).code).toBe('VALIDATION');
        expect((err as Error).message).toMatch(/refusing to synthesize fake mock WAV/i);
      }

      const files = await readdir(outDir);
      expect(files).toContain('music_prompts.json');
      expect(files.some((f) => f.endsWith('.wav'))).toBe(false);
    });

    it('rejects fake RIFFMock stems in sourceStemsDir instead of copying mock text', async () => {
      const stemsDir = join(root, 'bad_stems');
      const outDir = join(root, 'bad_out');
      await mkdir(stemsDir, { recursive: true });
      await writeFile(join(stemsDir, 'stem_melody.wav'), 'RIFFMockudioMelodyData', 'utf8');

      const runner = new MusicBridgeRunner({
        outputDir: outDir,
        engine: 'udio',
        sourceStemsDir: stemsDir,
      });

      await expect(
        runner.generateAndExtractStems({
          themeMelody: 'CorvusTheme',
          targetStates: ['felt_whisper'],
        }),
      ).rejects.toThrow(StudioError);

      const outFiles = await readdir(outDir);
      expect(outFiles.some((f) => f.endsWith('.wav'))).toBe(false);
    });

    it('validates, normalizes to 48kHz WAV, and writes stems_ready manifest from real sourceStemsDir', async () => {
      const stemsDir = join(root, 'real_stems');
      const outDir = join(root, 'real_out');
      await mkdir(stemsDir, { recursive: true });

      await makeRealWav(join(stemsDir, 'stem_melody.wav'), 440, 44100);
      await makeRealWav(join(stemsDir, 'stem_sub_drone.wav'), 110, 44100);
      await makeRealWav(join(stemsDir, 'stem_percussion.wav'), 220, 44100);

      const runner = new MusicBridgeRunner({
        outputDir: outDir,
        engine: 'udio',
        sourceStemsDir: stemsDir,
      });

      const result = await runner.generateAndExtractStems({
        themeMelody: 'CorvusTheme',
        targetStates: ['felt_whisper', 'creeping_dread', 'epic_swell'],
      });

      expect(result.status).toBe('stems_ready');
      expect(result.stems.length).toBe(3);

      const manifest = JSON.parse(await readFile(result.manifestPath, 'utf8'));
      expect(manifest.status).toBe('stems_ready');
      expect(manifest.theme).toBe('CorvusTheme');
      expect(manifest.stems.length).toBe(3);

      for (const stem of result.stems) {
        const rawHead = (await readFile(stem.path)).subarray(0, 12).toString('ascii');
        expect(rawHead).not.toContain('RIFFMock');
        expect(rawHead.slice(0, 4)).toBe('RIFF');
        expect(rawHead.slice(8, 12)).toBe('WAVE');
        const probe = await probeMedia(stem.path);
        expect(probe.hasAudio).toBe(true);
        expect(probe.audioSampleRate).toBe(48000);
        expect(probe.durationS).toBeGreaterThan(0.2);
      }
    }, 20_000);

    it('enqueues real bridge jobs onto BridgeQueue and HTTP WebBridgeServer', async () => {
      const outDir = join(root, 'bridge_q_out');
      const queue = new BridgeQueue(root);
      const runner = new MusicBridgeRunner({
        outputDir: outDir,
        engine: 'suno',
        bridgeQueue: queue,
        filmId: 'film_music_test',
      });

      const result = await runner.generateAndExtractStems({
        themeMelody: 'WinterDirge',
        targetStates: ['felt_whisper', 'epic_swell'],
        instruments: ['cello'],
      });

      expect(result.status).toBe('queued_on_bridge');
      expect(result.bridgeJobIds?.length).toBe(2);
      expect(result.stems.length).toBe(0);

      const manifest = JSON.parse(await readFile(result.manifestPath, 'utf8'));
      expect(manifest.status).toBe('queued_on_bridge');
      expect(manifest.bridge_job_ids).toEqual(result.bridgeJobIds);

      const queuedJobs = queue.listJobs();
      expect(queuedJobs.length).toBe(2);
      expect(queuedJobs.every((j) => j.target === 'aistudio_voice' && j.status === 'pending')).toBe(true);

      // Also verify HTTP bridgeUrl dispatch against live WebBridgeServer
      const srv = new WebBridgeServer({ port: 0, host: '127.0.0.1', studioRoot: root });
      const { port } = await srv.start();
      try {
        const outUrlDir = join(root, 'bridge_url_out');
        const httpRunner = new MusicBridgeRunner({
          outputDir: outUrlDir,
          engine: 'udio',
          bridgeUrl: `http://127.0.0.1:${port}`,
          filmId: 'film_http_music',
        });
        const httpRes = await httpRunner.generateAndExtractStems({
          themeMelody: 'SolarFlare',
          targetStates: ['creeping_dread'],
        });
        expect(httpRes.status).toBe('queued_on_bridge');
        expect(httpRes.bridgeJobIds?.length).toBe(1);
        expect(srv.getQueue().getJob(httpRes.bridgeJobIds![0])?.prompt).toContain('SolarFlare');
      } finally {
        await srv.stop();
      }
    });

    it('throws LANE_DOWN cleanly when bridgeUrl returns invalid JSON on HTTP 200', async () => {
      const outDir = join(root, 'music_bad_json');
      const runner = new MusicBridgeRunner({
        outputDir: outDir,
        engine: 'udio',
        bridgeUrl: 'http://127.0.0.1:9999',
        fetchFn: (async () => ({
          ok: true,
          status: 200,
          text: async () => '<html>not-json</html>',
        })) as unknown as typeof fetch,
      });

      try {
        await runner.generateAndExtractStems({
          themeMelody: 'BadJsonTheme',
          targetStates: ['felt_whisper'],
        });
        expect.fail('Expected MusicBridgeRunner to throw LANE_DOWN on invalid JSON');
      } catch (err) {
        expect(err).toBeInstanceOf(StudioError);
        expect((err as StudioError).code).toBe('LANE_DOWN');
        expect((err as Error).message).toContain('invalid JSON');
      }
    });
  });

  describe('CanvasBridge (Web Canvas Staging)', () => {
    it('creates node graph payload and validates real PNG/JPEG magic headers when validateAssets is true', async () => {
      const sheetPath = join(root, 'sheet.png');
      const platePath = join(root, 'plate.jpg');
      await writeFile(sheetPath, 'mockSheetData', 'utf8');
      await writeFile(platePath, 'mockPlateData', 'utf8');

      const runner = new CanvasBridgeRunner();

      // Pure graph compilation still works without asset validation
      const unvalidated = runner.buildCanvasNodeGraph({
        filmTitle: 'The Mother Monster',
        characterNodes: [{ id: 'char_mother', sheetPath, mark: 'left' }],
        locationNode: { id: 'loc_tundra', platePath },
        prompt: '@char_mother kneels in deep snow, holding swaddle',
      });
      expect(unvalidated.nodes.length).toBe(3);
      expect(unvalidated.connections.length).toBeGreaterThanOrEqual(2);
      expect(unvalidated.promptText).toContain('@char_mother');

      // Refuses fake text files when validateAssets: true
      expect(() =>
        runner.buildCanvasNodeGraph({
          filmTitle: 'The Mother Monster',
          characterNodes: [{ id: 'char_mother', sheetPath, mark: 'left' }],
          locationNode: { id: 'loc_tundra', platePath },
          prompt: '@char_mother kneels in deep snow',
          validateAssets: true,
        }),
      ).toThrow(StudioError);

      // Write valid PNG and JPEG magic bytes
      await writeFile(sheetPath, Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d]));
      await writeFile(platePath, Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46]));

      const validated = runner.buildCanvasNodeGraph({
        filmTitle: 'The Mother Monster',
        characterNodes: [{ id: 'char_mother', sheetPath, mark: 'left' }],
        locationNode: { id: 'loc_tundra', platePath },
        prompt: '@char_mother kneels in deep snow',
        validateAssets: true,
      });
      expect(validated.nodes.length).toBe(3);

      // Missing asset file fails when validateAssets: true
      expect(() =>
        runner.buildCanvasNodeGraph({
          filmTitle: 'The Mother Monster',
          characterNodes: [{ id: 'char_mother', sheetPath: join(root, 'missing.png'), mark: 'left' }],
          locationNode: { id: 'loc_tundra', platePath },
          prompt: '@char_mother kneels',
          validateAssets: true,
        }),
      ).toThrow(StudioError);
    });

    it('dispatches flow_plate and flow_sheet jobs onto BridgeQueue and WebBridgeServer', async () => {
      const sheetPath = join(root, 'sheet.png');
      const platePath = join(root, 'plate.png');
      const pngMagic = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d]);
      await writeFile(sheetPath, pngMagic);
      await writeFile(platePath, pngMagic);

      const runner = new CanvasBridgeRunner();
      const graph = runner.buildCanvasNodeGraph({
        filmTitle: 'The Mother Monster',
        characterNodes: [{ id: 'char_mother', sheetPath, mark: 'left' }],
        locationNode: { id: 'loc_tundra', platePath },
        prompt: '@char_mother kneels in deep snow',
        validateAssets: true,
      });

      const queue = new BridgeQueue(root);
      const dispatched = await runner.dispatchToBridge(graph, queue, 'film_canvas_01');
      expect(dispatched.jobIds.length).toBe(2);

      const jobs = queue.listJobs();
      expect(jobs.some((j) => j.target === 'flow_plate' && j.asset_id === 'loc_tundra')).toBe(true);
      expect(jobs.some((j) => j.target === 'flow_sheet' && j.asset_id === 'char_mother')).toBe(true);

      // Also test HTTP URL dispatch
      const srv = new WebBridgeServer({ port: 0, host: '127.0.0.1', studioRoot: root });
      const { port } = await srv.start();
      try {
        const httpDispatched = await runner.dispatchToBridge(graph, `http://127.0.0.1:${port}`, 'film_canvas_http');
        expect(httpDispatched.jobIds.length).toBe(2);
        expect(srv.getQueue().listJobs().length).toBe(2);
      } finally {
        await srv.stop();
      }
    });

    it('throws LANE_DOWN cleanly when CanvasBridge HTTP 200 returns invalid JSON', async () => {
      const runner = new CanvasBridgeRunner({
        fetchFn: (async () => ({
          ok: true,
          status: 200,
          text: async () => 'not-valid-json',
        })) as unknown as typeof fetch,
      });
      const graph = runner.buildCanvasNodeGraph({
        filmTitle: 'BadJsonFilm',
        characterNodes: [],
        locationNode: { id: 'loc_1', platePath: 'plate.png' },
        prompt: 'Test',
      });

      try {
        await runner.dispatchToBridge(graph, 'http://127.0.0.1:9999', 'film_bad_json');
        expect.fail('Expected CanvasBridgeRunner to throw LANE_DOWN on invalid JSON');
      } catch (err) {
        expect(err).toBeInstanceOf(StudioError);
        expect((err as StudioError).code).toBe('LANE_DOWN');
        expect((err as Error).message).toContain('invalid JSON');
      }
    });
  });
});
