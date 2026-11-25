// test/tools/audio.test.ts — Unit tests for dialogue_render, dialogue_import, acoustic_match, soundscape_build, and score_arrange_dynamic tools.
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mkdtemp, rm, readFile, mkdir, writeFile, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFile as execFileCb } from 'node:child_process';
import { promisify } from 'node:util';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { buildServer } from '../../src/server.js';

const execFile = promisify(execFileCb);

async function makeAudioFixture(
  dest: string,
  opts: {
    freq?: number;
    durationS?: number;
    sampleRate?: number;
    channels?: number;
    silent?: boolean;
    codecArgs?: string[];
  } = {},
): Promise<void> {
  const dur = opts.durationS ?? 0.6;
  const sr = opts.sampleRate ?? 48000;
  const ch = opts.channels ?? 1;
  const inputSource = opts.silent
    ? `anullsrc=r=${sr}:cl=${ch === 1 ? 'mono' : 'stereo'}:d=${dur}`
    : `sine=frequency=${opts.freq ?? 440}:duration=${dur}`;
  const args = ['-y', '-f', 'lavfi', '-i', inputSource, '-ar', String(sr), '-ac', String(ch), ...(opts.codecArgs ?? []), dest];
  await execFile('ffmpeg', args);
}

async function ffprobeAudio(filePath: string): Promise<{
  codecName?: string;
  sampleRate?: string;
  channels?: number;
  durationS: number;
}> {
  const { stdout } = await execFile('ffprobe', [
    '-v', 'quiet',
    '-print_format', 'json',
    '-show_format',
    '-show_streams',
    filePath,
  ]);
  const parsed = JSON.parse(stdout || '{}') as {
    streams?: Array<{ codec_type?: string; codec_name?: string; sample_rate?: string; channels?: number; duration?: string }>;
    format?: { duration?: string };
  };
  const stream = (parsed.streams ?? []).find((s) => s.codec_type === 'audio');
  const dur = Number(stream?.duration ?? parsed.format?.duration ?? 0);
  return {
    codecName: stream?.codec_name,
    sampleRate: stream?.sample_rate,
    channels: stream?.channels,
    durationS: Number.isFinite(dur) ? dur : 0,
  };
}

const isError = (res: unknown) => (res as { isError?: boolean }).isError === true;
const textOf = (res: unknown) => (res as { content: Array<{ text: string }> }).content[0].text;

describe('Audio Tools', () => {
  let root: string;
  let client: Client;
  let server: Awaited<ReturnType<typeof buildServer>>;

  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'fsm-audio-'));
    process.env.STUDIO_ROOT = root;
    process.env.GEMINI_API_KEY = 'test_key';
    process.env.STUDIO_LIVE = '1';

    server = buildServer({ studioRoot: root });
    client = new Client({ name: 'test', version: '0' });
    const [a, b] = InMemoryTransport.createLinkedPair();
    await Promise.all([server.connect(a), client.connect(b)]);

    await client.callTool({
      name: 'film_create',
      arguments: { film_id: 'film_audio', title: 'Audio Test', logline: 'Testing sound', budget_usd: 50 },
    });
    await client.callTool({
      name: 'asset_register',
      arguments: {
        kind: 'location',
        asset_id: 'loc_forest',
        descriptor: 'frozen forest',
        geo_block: 'dense pine trees, deep snow',
      },
    });
  });

  afterEach(async () => {
    await Promise.all([client.close(), server.close()]);
    await rm(root, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
    vi.restoreAllMocks();
  });

  it('dialogue_render synthesizes dialogue lines, creates WAV file, records spend and ledger', async () => {
    await client.callTool({
      name: 'shot_create',
      arguments: {
        id: 'shot_dialogue',
        sequence: 'seq01',
        action: 'Mara turns around quickly.',
        geo_block: 'dense pine trees, deep snow',
        refs: [{ asset_id: 'loc_forest', role: 'location' }],
        camera: { lens: '50mm', move: 'static', reason: 'close up on Mara' },
        audio_block: {
          dialogue: [{ line: 'Look at the ridge.' }],
          sfx: 'distant howling wind',
        },
        duration_s: 5,
      },
    });

    const fakeBase64 = Buffer.from('RIFF48kHzAudioData').toString('base64');
    vi.spyOn(globalThis, 'fetch').mockImplementation(async () => {
      return new Response(JSON.stringify({ audioContent: fakeBase64 }), { status: 200 });
    });

    const res = await client.callTool({
      name: 'dialogue_render',
      arguments: { shot_id: 'shot_dialogue' },
    });

    const data = JSON.parse(textOf(res));
    expect(data.shot_id).toBe('shot_dialogue');
    expect(data.lines.length).toBe(1);
    expect(data.lines[0].line).toBe('Look at the ridge.');
    expect(data.lines[0].audio_path).toContain('shot_dialogue_line_1.wav');

    const wavBytes = await readFile(data.lines[0].audio_path);
    expect(wavBytes.toString('utf8')).toContain('RIFF');

    const ledgerContent = await readFile(join(root, 'films', 'film_audio', 'ledger.jsonl'), 'utf8');
    expect(ledgerContent).toContain('dialogue_render');
    expect(ledgerContent).toContain('shot_dialogue');
  });

  it('dialogue_render automatically binds to character voice_profile.json', async () => {
    await client.callTool({
      name: 'asset_register',
      arguments: {
        kind: 'character',
        asset_id: 'char_corvus',
        descriptor: 'Corvus Vance, blacksmith in apron',
        voice: 'Deep weathered baritone',
        acting: 'Quiet and motionless',
        voice_id: 'en-US-Journey-D',
        voice_provider: 'google',
      },
    });

    await client.callTool({
      name: 'shot_create',
      arguments: {
        id: 'shot_corvus',
        sequence: 'seq01',
        action: 'Corvus speaks.',
        geo_block: 'dense pine trees, deep snow',
        refs: [{ asset_id: 'char_corvus', role: 'character' }, { asset_id: 'loc_forest', role: 'location' }],
        camera: { lens: '50mm', move: 'static', reason: 'close up on Corvus' },
        audio_block: {
          dialogue: [{ voice_ref: 'char_corvus', line: 'The heat remains.' }],
        },
        duration_s: 4,
      },
    });

    let requestedVoiceName: string | undefined;
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (_url, init) => {
      if (init && init.body) {
        const payload = JSON.parse(init.body as string);
        requestedVoiceName = payload.voice?.name;
      }
      const fakeBase64 = Buffer.from('RIFF48kHzAudioData').toString('base64');
      return new Response(JSON.stringify({ audioContent: fakeBase64 }), { status: 200 });
    });

    await client.callTool({
      name: 'dialogue_render',
      arguments: { shot_id: 'shot_corvus' },
    });

    expect(requestedVoiceName).toBe('en-US-Journey-D');
  });

  it('dialogue_import converts non-48k stereo capture to 48kHz mono PCM WAV at zero API cost', async () => {
    process.env.STUDIO_LIVE = '0';
    process.env.GEMINI_API_KEY = '';

    await client.callTool({
      name: 'shot_create',
      arguments: {
        id: 'shot_import',
        sequence: 'seq01',
        action: 'Mara whispers into the cold.',
        geo_block: 'dense pine trees, deep snow',
        refs: [{ asset_id: 'loc_forest', role: 'location' }],
        camera: { lens: '50mm', move: 'static', reason: 'close up on Mara' },
        duration_s: 4,
      },
    });

    const captureDir = join(root, 'captures');
    await mkdir(captureDir, { recursive: true });
    const mp3Path = join(captureDir, 'ai_studio_take1.mp3');
    await makeAudioFixture(mp3Path, {
      freq: 520,
      durationS: 0.5,
      sampleRate: 44100,
      channels: 2,
      codecArgs: ['-c:a', 'libmp3lame'],
    });

    const res = await client.callTool({
      name: 'dialogue_import',
      arguments: {
        shot_id: 'shot_import',
        source_audio_path: 'captures/ai_studio_take1.mp3',
      },
    });
    expect(isError(res)).toBe(false);

    const data = JSON.parse(textOf(res));
    expect(data.film_id).toBe('film_audio');
    expect(data.shot_id).toBe('shot_import');
    expect(data.line_index).toBe(1);
    expect(data.audio_path).toContain('shot_import_line_1.wav');
    expect(data.sample_rate_hz).toBe(48000);
    expect(data.channels).toBe(1);
    expect(data.duration_s).toBeGreaterThan(0.3);
    expect(data.max_volume_db).toBeGreaterThan(-75);
    expect(data.zero_api_cost).toBe(true);

    const probe = await ffprobeAudio(data.audio_path);
    expect(probe.codecName).toBe('pcm_s16le');
    expect(probe.sampleRate).toBe('48000');
    expect(probe.channels).toBe(1);
    expect(probe.durationS).toBeGreaterThan(0.3);

    // Budget spent must remain zero
    const filmShowRes = await client.callTool({ name: 'film_show', arguments: {} });
    const filmInfo = JSON.parse(textOf(filmShowRes));
    expect(filmInfo.budget?.spent_usd ?? filmInfo.spent_usd ?? 0).toBe(0);

    // Also verify WebM Opus capture and explicit line_index=2
    const webmPath = join(captureDir, 'ai_studio_take2.webm');
    await makeAudioFixture(webmPath, {
      freq: 330,
      durationS: 0.4,
      sampleRate: 48000,
      channels: 1,
      codecArgs: ['-c:a', 'libopus'],
    });
    const res2 = await client.callTool({
      name: 'dialogue_import',
      arguments: {
        shot_id: 'shot_import',
        source_audio_path: webmPath,
        line_index: 2,
      },
    });
    expect(isError(res2)).toBe(false);
    const data2 = JSON.parse(textOf(res2));
    expect(data2.line_index).toBe(2);
    expect(data2.audio_path).toContain('shot_import_line_2.wav');
    const probe2 = await ffprobeAudio(data2.audio_path);
    expect(probe2.sampleRate).toBe('48000');
    expect(probe2.channels).toBe(1);
  }, 15_000);

  it('dialogue_import rejects missing, unsupported, corrupt, video-only, and silent audio files', async () => {
    await client.callTool({
      name: 'shot_create',
      arguments: {
        id: 'shot_bad_dlg',
        sequence: 'seq01',
        action: 'Mara waits.',
        geo_block: 'dense pine trees, deep snow',
        refs: [{ asset_id: 'loc_forest', role: 'location' }],
        camera: { lens: '50mm', move: 'static', reason: 'close up' },
        duration_s: 3,
      },
    });

    // Missing file
    const missingRes = await client.callTool({
      name: 'dialogue_import',
      arguments: { shot_id: 'shot_bad_dlg', source_audio_path: join(root, 'does_not_exist.wav') },
    });
    expect(isError(missingRes)).toBe(true);
    expect(textOf(missingRes)).toMatch(/not found/i);

    // Unsupported extension
    const txtPath = join(root, 'notes.txt');
    await writeFile(txtPath, 'hello');
    const extRes = await client.callTool({
      name: 'dialogue_import',
      arguments: { shot_id: 'shot_bad_dlg', source_audio_path: txtPath },
    });
    expect(isError(extRes)).toBe(true);
    expect(textOf(extRes)).toMatch(/unsupported/i);

    // Corrupt audio
    const corruptPath = join(root, 'corrupt.wav');
    await writeFile(corruptPath, 'RIFFNotActuallyAudioBytes');
    const corruptRes = await client.callTool({
      name: 'dialogue_import',
      arguments: { shot_id: 'shot_bad_dlg', source_audio_path: corruptPath },
    });
    expect(isError(corruptRes)).toBe(true);

    // Video-only webm/mp4 renamed .webm
    const videoOnlyWebm = join(root, 'video_only.webm');
    await execFile('ffmpeg', [
      '-y', '-f', 'lavfi', '-i', 'testsrc=size=160x120:rate=12:duration=0.4',
      '-an', '-c:v', 'libvpx', videoOnlyWebm,
    ]);
    const videoOnlyRes = await client.callTool({
      name: 'dialogue_import',
      arguments: { shot_id: 'shot_bad_dlg', source_audio_path: videoOnlyWebm },
    });
    expect(isError(videoOnlyRes)).toBe(true);

    // Digital silence
    const silentPath = join(root, 'silent.wav');
    await makeAudioFixture(silentPath, { silent: true, durationS: 0.6, sampleRate: 48000, channels: 1 });
    const silentRes = await client.callTool({
      name: 'dialogue_import',
      arguments: { shot_id: 'shot_bad_dlg', source_audio_path: silentPath },
    });
    expect(isError(silentRes)).toBe(true);
    expect(textOf(silentRes)).toMatch(/silent|noise floor/i);
  }, 15_000);

  it('soundscape_build synthesizes a real 48kHz WAV ambient stem alongside manifest', async () => {
    await client.callTool({
      name: 'shot_create',
      arguments: {
        id: 'shot_sfx',
        sequence: 'seq01',
        action: 'Wind sweeps across the clearing.',
        geo_block: 'dense pine trees, deep snow',
        refs: [{ asset_id: 'loc_forest', role: 'location' }],
        camera: { lens: '24mm', move: 'pan', reason: 'establishing wide' },
        audio_block: { sfx: 'freezing blizzard, creaking wood' },
        duration_s: 2,
      },
    });

    const res = await client.callTool({
      name: 'soundscape_build',
      arguments: { shot_id: 'shot_sfx' },
    });
    expect(isError(res)).toBe(false);

    const data = JSON.parse(textOf(res));
    expect(data.sfx_spec).toBe('freezing blizzard, creaking wood');
    expect(data.manifest_path).toContain('shot_sfx_soundscape.txt');
    expect(data.soundscape_audio_path).toContain('shot_sfx_soundscape.wav');

    const manifestText = await readFile(data.manifest_path, 'utf8');
    expect(manifestText).toContain('freezing blizzard');

    const probe = await ffprobeAudio(data.soundscape_audio_path);
    expect(probe.codecName).toBe('pcm_s16le');
    expect(probe.sampleRate).toBe('48000');
    expect(probe.channels).toBe(2);
    expect(probe.durationS).toBeGreaterThanOrEqual(1.8);
    expect(probe.durationS).toBeLessThanOrEqual(2.2);
  }, 15_000);

  it('soundscape_build supports custom source_audio_path looped and trimmed to shot duration', async () => {
    await client.callTool({
      name: 'shot_create',
      arguments: {
        id: 'shot_sfx_custom',
        sequence: 'seq01',
        action: 'Embers pop inside the iron stove.',
        geo_block: 'dense pine trees, deep snow',
        refs: [{ asset_id: 'loc_forest', role: 'location' }],
        camera: { lens: '35mm', move: 'static', reason: 'hearth insert' },
        audio_block: { sfx: 'crackling hearth' },
        duration_s: 2,
      },
    });

    const rawSfx = join(root, 'hearth_short.wav');
    await makeAudioFixture(rawSfx, { freq: 180, durationS: 0.4, sampleRate: 44100, channels: 1 });

    const res = await client.callTool({
      name: 'soundscape_build',
      arguments: { shot_id: 'shot_sfx_custom', source_audio_path: rawSfx },
    });
    expect(isError(res)).toBe(false);
    const data = JSON.parse(textOf(res));
    const probe = await ffprobeAudio(data.soundscape_audio_path);
    expect(probe.sampleRate).toBe('48000');
    expect(probe.channels).toBe(2);
    expect(probe.durationS).toBeGreaterThanOrEqual(1.9);
    expect(probe.durationS).toBeLessThanOrEqual(2.1);
  }, 15_000);

  it('acoustic_match applies acoustic environment matching and -14 LUFS filter recipe on real WAV', async () => {
    await client.callTool({
      name: 'shot_create',
      arguments: {
        id: 'shot_dialogue',
        sequence: 'seq01',
        action: 'Mara turns around quickly.',
        geo_block: 'dense pine trees, deep snow',
        refs: [{ asset_id: 'loc_forest', role: 'location' }],
        camera: { lens: '50mm', move: 'static', reason: 'close up on Mara' },
        audio_block: {
          dialogue: [{ line: 'Look at the ridge.' }],
          sfx: 'distant howling wind',
        },
        duration_s: 5,
      },
    });

    const audioDir = join(root, 'films', 'film_audio', 'audio');
    await mkdir(audioDir, { recursive: true });
    await makeAudioFixture(join(audioDir, 'shot_dialogue_line_1.wav'), { freq: 380, durationS: 0.8, sampleRate: 48000, channels: 1 });

    const res = await client.callTool({
      name: 'acoustic_match',
      arguments: {
        shot_id: 'shot_dialogue',
        environment: 'stone_cavern',
      },
    });
    expect(isError(res)).toBe(false);

    const data = JSON.parse(textOf(res));
    expect(data.shot_id).toBe('shot_dialogue');
    expect(data.environment).toBe('stone_cavern');
    expect(data.filter_graph).toContain('aecho=0.8:0.88:40:0.35');
    expect(data.filter_graph).toContain('loudnorm=I=-14:TP=-1.0:LRA=11');
    expect(data.diegetic_audio_path).toContain('shot_dialogue_line_1_diegetic.wav');
    expect(data.ffmpeg_applied).toBe(true);

    const probe = await ffprobeAudio(data.diegetic_audio_path);
    expect(probe.codecName).toBe('pcm_s16le');
    expect(probe.sampleRate).toBe('48000');
    expect(probe.durationS).toBeGreaterThan(0.5);
  });

  it('score_arrange_dynamic mixes real WAV stems across states including vacuum_silence and verifies score_master.wav', async () => {
    await Promise.all([
      client.callTool({
        name: 'shot_create',
        arguments: {
          id: 'shot_s1',
          sequence: 'seq01',
          action: 'Close on eyes.',
          geo_block: 'dense pine trees, deep snow',
          refs: [{ asset_id: 'loc_forest', role: 'location' }],
          camera: { lens: '50mm', move: 'static', reason: 'close up' },
          duration_s: 1,
        },
      }),
      client.callTool({
        name: 'shot_create',
        arguments: {
          id: 'shot_s2',
          sequence: 'seq01',
          action: 'Silence before impact.',
          geo_block: 'dense pine trees, deep snow',
          refs: [{ asset_id: 'loc_forest', role: 'location' }],
          camera: { lens: '50mm', move: 'static', reason: 'breath' },
          duration_s: 1,
        },
      }),
      client.callTool({
        name: 'shot_create',
        arguments: {
          id: 'shot_s3',
          sequence: 'seq01',
          action: 'Titan rises.',
          geo_block: 'dense pine trees, deep snow',
          refs: [{ asset_id: 'loc_forest', role: 'location' }],
          camera: { lens: '24mm', move: 'crane up', reason: 'epic reveal' },
          duration_s: 1,
        },
      }),
    ]);

    const stemsDir = join(root, 'real_stems');
    await mkdir(stemsDir, { recursive: true });
    await Promise.all([
      makeAudioFixture(join(stemsDir, 'stem_melody.wav'), { freq: 440, durationS: 0.3, sampleRate: 44100, channels: 2 }),
      makeAudioFixture(join(stemsDir, 'stem_sub_drone.wav'), { freq: 110, durationS: 0.3, sampleRate: 48000, channels: 1 }),
      makeAudioFixture(join(stemsDir, 'stem_percussion.wav'), { freq: 220, durationS: 0.3, sampleRate: 48000, channels: 2 }),
    ]);

    const res = await client.callTool({
      name: 'score_arrange_dynamic',
      arguments: {
        film_id: 'film_audio',
        stems_dir: stemsDir,
        shots: [
          { shot_id: 'shot_s1', state: 'felt_whisper' },
          { shot_id: 'shot_s2', state: 'vacuum_silence' },
          { shot_id: 'shot_s3', state: 'creeping_dread', duck_db: -10 },
          { shot_id: 'shot_s3', state: 'epic_swell' },
        ],
      },
    });
    expect(isError(res)).toBe(false);

    const data = JSON.parse(textOf(res));
    expect(data.film_id).toBe('film_audio');
    expect(data.total_duration_s).toBe(4);
    expect(data.shots.length).toBe(4);
    expect(data.shots[0].state).toBe('felt_whisper');
    expect(data.shots[0].active_stems).toContain('stem_melody.wav');
    expect(data.shots[0].active_stems).not.toContain('stem_percussion.wav');
    expect(data.shots[1].state).toBe('vacuum_silence');
    expect(data.shots[1].active_stems).toEqual([]);
    expect(data.shots[2].state).toBe('creeping_dread');
    expect(data.shots[2].active_stems).toEqual(['stem_melody.wav', 'stem_sub_drone.wav']);
    expect(data.shots[2].volume_envelope_db).toBe(-10);
    expect(data.shots[3].state).toBe('epic_swell');
    expect(data.shots[3].active_stems).toContain('stem_melody.wav');
    expect(data.shots[3].active_stems).toContain('stem_percussion.wav');
    expect(data.target_lufs).toBe(-23);

    const probe = await ffprobeAudio(data.score_audio_path);
    expect(probe.codecName).toBe('pcm_s16le');
    expect(probe.sampleRate).toBe('48000');
    expect(probe.channels).toBe(2);
    expect(probe.durationS).toBeGreaterThanOrEqual(3.9);
    expect(probe.durationS).toBeLessThanOrEqual(4.1);
  }, 15_000);

  it('score_arrange_dynamic handles vacuum_silence across all shots cleanly', async () => {
    await client.callTool({
      name: 'shot_create',
      arguments: {
        id: 'shot_sil_only',
        sequence: 'seq01',
        action: 'Dead air across the ridge.',
        geo_block: 'dense pine trees, deep snow',
        refs: [{ asset_id: 'loc_forest', role: 'location' }],
        camera: { lens: '35mm', move: 'static', reason: 'silence' },
        duration_s: 1,
      },
    });

    const stemsDir = join(root, 'sil_stems');
    await mkdir(stemsDir, { recursive: true });
    await makeAudioFixture(join(stemsDir, 'stem_melody.wav'), { freq: 440, durationS: 0.3, sampleRate: 48000, channels: 2 });

    const res = await client.callTool({
      name: 'score_arrange_dynamic',
      arguments: {
        film_id: 'film_audio',
        stems_dir: stemsDir,
        shots: [{ shot_id: 'shot_sil_only', state: 'vacuum_silence' }],
      },
    });
    expect(isError(res)).toBe(false);
    const data = JSON.parse(textOf(res));
    const probe = await ffprobeAudio(data.score_audio_path);
    expect(probe.sampleRate).toBe('48000');
    expect(probe.channels).toBe(2);
    expect(probe.durationS).toBeGreaterThanOrEqual(0.9);
    expect(probe.durationS).toBeLessThanOrEqual(1.1);
  }, 15_000);

  it('score_arrange_dynamic fails loudly on corrupt text WAV stems and never writes fake RIFF text', async () => {
    await client.callTool({
      name: 'shot_create',
      arguments: {
        id: 'shot_bad_score',
        sequence: 'seq01',
        action: 'Mara listens.',
        geo_block: 'dense pine trees, deep snow',
        refs: [{ asset_id: 'loc_forest', role: 'location' }],
        camera: { lens: '50mm', move: 'static', reason: 'listening' },
        duration_s: 2,
      },
    });

    const badStemsDir = join(root, 'corrupt_stems');
    await mkdir(badStemsDir, { recursive: true });
    await writeFile(join(badStemsDir, 'stem_melody.wav'), 'RIFFMockMelodyData', 'utf8');

    const res = await client.callTool({
      name: 'score_arrange_dynamic',
      arguments: {
        film_id: 'film_audio',
        stems_dir: badStemsDir,
        shots: [{ shot_id: 'shot_bad_score', state: 'felt_whisper' }],
      },
    });
    expect(isError(res)).toBe(true);
    expect(textOf(res)).toMatch(/stem_melody\.wav|audio|valid/i);

    const scoreMasterPath = join(root, 'films', 'film_audio', 'audio', 'score_master.wav');
    await expect(stat(scoreMasterPath)).rejects.toThrow();
  });
});
