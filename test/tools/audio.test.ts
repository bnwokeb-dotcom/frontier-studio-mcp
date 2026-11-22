// test/tools/audio.test.ts — Unit tests for dialogue_render and soundscape_build tools.
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mkdtemp, rm, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { buildServer } from '../../src/server.js';
import { GoogleAudioLane } from '../../src/lanes/audio.js';

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

    // Create film and character asset
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
    await rm(root, { recursive: true, force: true });
    vi.restoreAllMocks();
  });

  it('dialogue_render synthesizes dialogue lines, creates WAV file, records spend and ledger', async () => {
    // Create shot with dialogue
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

    // Mock fetch for Google Audio lane
    const fakeBase64 = Buffer.from('RIFF48kHzAudioData').toString('base64');
    vi.spyOn(globalThis, 'fetch').mockImplementation(async () => {
      return new Response(JSON.stringify({ audioContent: fakeBase64 }), { status: 200 });
    });

    const res = await client.callTool({
      name: 'dialogue_render',
      arguments: { shot_id: 'shot_dialogue' },
    });

    const content = (res as { content: Array<{ text: string }> }).content[0].text;
    const data = JSON.parse(content);
    expect(data.shot_id).toBe('shot_dialogue');
    expect(data.lines.length).toBe(1);
    expect(data.lines[0].line).toBe('Look at the ridge.');
    expect(data.lines[0].audio_path).toContain('shot_dialogue_line_1.wav');

    // Verify WAV file on disk
    const wavBytes = await readFile(data.lines[0].audio_path);
    expect(wavBytes.toString('utf8')).toContain('RIFF');

    // Verify ledger entry
    const ledgerContent = await readFile(join(root, 'films', 'film_audio', 'ledger.jsonl'), 'utf8');
    expect(ledgerContent).toContain('dialogue_render');
    expect(ledgerContent).toContain('shot_dialogue');
  });

  it('soundscape_build generates manifest for shot sfx', async () => {
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
        duration_s: 6,
      },
    });

    const res = await client.callTool({
      name: 'soundscape_build',
      arguments: { shot_id: 'shot_sfx' },
    });

    const content = (res as { content: Array<{ text: string }> }).content[0].text;
    const data = JSON.parse(content);
    expect(data.sfx_spec).toBe('freezing blizzard, creaking wood');
    expect(data.manifest_path).toContain('shot_sfx_soundscape.txt');

    const manifestText = await readFile(data.manifest_path, 'utf8');
    expect(manifestText).toContain('freezing blizzard');
  });

  it('acoustic_match applies acoustic environment matching and -14 LUFS filter recipe', async () => {
    // Create shot first
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

    // Write a mock raw WAV stem directly
    const audioDir = join(root, 'films', 'film_audio', 'audio');
    const { mkdir, writeFile } = await import('node:fs/promises');
    await mkdir(audioDir, { recursive: true });
    await writeFile(join(audioDir, 'shot_dialogue_line_1.wav'), 'RIFF48kHzMockAudio');

    const res = await client.callTool({
      name: 'acoustic_match',
      arguments: {
        shot_id: 'shot_dialogue',
        environment: 'stone_cavern',
      },
    });

    const content = (res as { content: Array<{ text: string }> }).content[0].text;
    const data = JSON.parse(content);

    expect(data.shot_id).toBe('shot_dialogue');
    expect(data.environment).toBe('stone_cavern');
    expect(data.filter_graph).toContain('aecho=0.8:0.88:40:0.35');
    expect(data.filter_graph).toContain('loudnorm=I=-14:TP=-1.0:LRA=11');
    expect(data.diegetic_audio_path).toContain('shot_dialogue_line_1_diegetic.wav');

    // Verify diegetic file on disk
    const diegeticBytes = await readFile(data.diegetic_audio_path);
    expect(diegeticBytes.toString('utf8')).toContain('RIFF');
  });

  it('dialogue_render automatically binds to character voice_profile.json', async () => {
    // Register character with locked voice_profile
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

  it('score_arrange_dynamic constructs additive stem arrangement across emotional tension states', async () => {
    // Create shots for this test
    await client.callTool({
      name: 'shot_create',
      arguments: {
        id: 'shot_s1',
        sequence: 'seq01',
        action: 'Close on eyes.',
        geo_block: 'dense pine trees, deep snow',
        refs: [{ asset_id: 'loc_forest', role: 'location' }],
        camera: { lens: '50mm', move: 'static', reason: 'close up' },
        duration_s: 4,
      },
    });
    await client.callTool({
      name: 'shot_create',
      arguments: {
        id: 'shot_s2',
        sequence: 'seq01',
        action: 'Titan rises.',
        geo_block: 'dense pine trees, deep snow',
        refs: [{ asset_id: 'loc_forest', role: 'location' }],
        camera: { lens: '24mm', move: 'crane up', reason: 'epic reveal' },
        duration_s: 6,
      },
    });

    const stemsDir = join(root, 'mock_stems');
    const { mkdir, writeFile } = await import('node:fs/promises');
    await mkdir(stemsDir, { recursive: true });
    await writeFile(join(stemsDir, 'stem_melody.wav'), 'RIFFMockMelodyData');
    await writeFile(join(stemsDir, 'stem_sub_drone.wav'), 'RIFFMockDroneData');
    await writeFile(join(stemsDir, 'stem_percussion.wav'), 'RIFFMockPercussionData');

    const res = await client.callTool({
      name: 'score_arrange_dynamic',
      arguments: {
        film_id: 'film_audio',
        stems_dir: stemsDir,
        shots: [
          { shot_id: 'shot_s1', state: 'felt_whisper' },
          { shot_id: 'shot_s2', state: 'epic_swell' },
        ],
      },
    });

    const content = (res as { content: Array<{ text: string }> }).content[0].text;
    const data = JSON.parse(content);
    expect(data.film_id).toBe('film_audio');
    expect(data.shots.length).toBe(2);
    expect(data.shots[0].state).toBe('felt_whisper');
    expect(data.shots[0].active_stems).toContain('stem_melody.wav');
    expect(data.shots[0].active_stems).not.toContain('stem_percussion.wav');
    expect(data.shots[1].state).toBe('epic_swell');
    expect(data.shots[1].active_stems).toContain('stem_melody.wav');
    expect(data.shots[1].active_stems).toContain('stem_percussion.wav');
    expect(data.target_lufs).toBe(-23);
  });
});
