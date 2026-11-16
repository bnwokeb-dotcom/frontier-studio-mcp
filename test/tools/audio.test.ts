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
});
