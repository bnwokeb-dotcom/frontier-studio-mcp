// test/tools/flow_prompts.test.ts — TDD tests for Flow & AI Studio zero-API prompt tools & bridge status/result tools.
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { deflateSync } from 'node:zlib';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { buildServer } from '../../src/server.js';
import { studioPaths } from '../../src/store/paths.js';
import { initStudio } from '../../src/store/studio.js';
import { filmCreate } from '../../src/store/film.js';
import { assetRegister } from '../../src/store/asset.js';
import { shotCreate } from '../../src/store/shot.js';
import { getSharedBridgeQueue, WebBridgeServer } from '../../src/bridge/web_bridge_server.js';

function makeSimplePng(width: number, height: number): Buffer {
  const crcTable = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    crcTable[n] = c >>> 0;
  }
  const crc32 = (b: Buffer) => {
    let c = 0xffffffff;
    for (let i = 0; i < b.length; i++) c = crcTable[(c ^ b[i]) & 0xff] ^ (c >>> 8);
    return (c ^ 0xffffffff) >>> 0;
  };
  const chunk = (type: string, data: Buffer) => {
    const t = Buffer.from(type, 'ascii');
    const l = Buffer.alloc(4);
    l.writeUInt32BE(data.length, 0);
    const cb = Buffer.alloc(4);
    cb.writeUInt32BE(crc32(Buffer.concat([t, data])), 0);
    return Buffer.concat([l, t, data, cb]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 2;
  const stride = 1 + width * 3;
  const raw = Buffer.alloc(stride * height);
  let seed = 99991;
  for (let y = 0; y < height; y++) {
    const off = y * stride;
    raw[off] = 0;
    for (let x = 1; x < stride; x++) {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      raw[off + x] = (seed >>> 16) & 0xff;
    }
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 1 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

const isError = (res: unknown) => (res as { isError?: boolean }).isError === true;
const textOf = (res: unknown) => (res as { content: Array<{ text: string }> }).content[0].text;
const dataOf = (res: unknown) => JSON.parse(textOf(res));

describe('Flow & AI Studio Prompt Tools', () => {
  let root: string;
  let client: Client;
  let server: Awaited<ReturnType<typeof buildServer>>;

  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'fsm-flow-prompts-'));
    const paths = studioPaths(root);
    await initStudio(paths);
    await filmCreate(paths, 'film_colossus', {
      title: 'Heart of the Colossus',
      logline: 'An aging foundry master confronts a waking war-machine.',
      budgetUsd: 100,
    });
    // Set active film via film_set_active tool after connecting client
    server = buildServer({ studioRoot: root });
    client = new Client({ name: 'test', version: '0' });
    const [a, b] = InMemoryTransport.createLinkedPair();
    await Promise.all([server.connect(a), client.connect(b)]);
    await client.callTool({ name: 'film_set_active', arguments: { film_id: 'film_colossus' } });
  });

  afterEach(async () => {
    await Promise.all([client.close(), server.close()]);
    await rm(root, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
  });

  it('flow_prompt_sheet enforces character registration & completeness and compiles 3-panel headless 4K prompt', async () => {
    const paths = studioPaths(root);
    // Unregistered character -> NOT_FOUND
    const missing = await client.callTool({
      name: 'flow_prompt_sheet',
      arguments: { character_id: 'char_missing' },
    });
    expect(isError(missing)).toBe(true);
    expect(textOf(missing)).toMatch(/not registered/i);

    // Location passed as character -> VALIDATION
    await assetRegister(paths, 'film_colossus', {
      kind: 'location',
      assetId: 'loc_foundry',
      descriptor: 'Basalt subterranean forge with overhead chain cranes.',
      geoBlock: 'N: molten crucible. S: iron catwalk. Camera: south rail.',
    });
    const wrongKind = await client.callTool({
      name: 'flow_prompt_sheet',
      arguments: { character_id: 'loc_foundry' },
    });
    expect(isError(wrongKind)).toBe(true);
    expect(textOf(wrongKind)).toMatch(/locations|character/i);

    // Register full character with biological markers
    await assetRegister(paths, 'film_colossus', {
      kind: 'character',
      assetId: 'char_corvus',
      descriptor: 'Corvus Vance, late 50s master smith in scarred boiled-wool coat, iron-grey beard.',
      voice: 'Deep unhurried baritone, gravel undertone, crisp diction.',
      acting: 'Economical stillness, jaw clenches before delivering fatal truth.',
      biologicalMarkers: {
        irisColorHex: '#3B596A',
        boneStructure: 'angular jaw, prominent brow ridge',
        signatureMarks: 'crescent burn scar along left temple',
      },
    });

    const res = await client.callTool({
      name: 'flow_prompt_sheet',
      arguments: { character_id: 'char_corvus' },
    });
    expect(isError(res)).toBe(false);
    const out = dataOf(res);

    expect(out.model_hint).toBe('Nano Banana 2.5');
    expect(out.target_resolution).toBe('3840x2160 (4K)');
    expect(out.target_aspect_ratio).toBe('16:9');
    expect(out.bridge_connected).toBe(false);
    expect(out.bridge_job_id).toBeUndefined();
    expect(out.prompt).toContain('#e8e8e8');
    expect(out.prompt).toContain('HEADLESS');
    expect(out.prompt).toContain('Panel 1 (left)');
    expect(out.prompt).toContain('Panel 2 (center)');
    expect(out.prompt).toContain('Panel 3 (right)');
    expect(out.prompt).toContain('Corvus Vance');
    expect(out.prompt).toContain('#3B596A');
    expect(out.prompt).toContain('crescent burn scar');
    expect(out.negative_prompt).toMatch(/second face|watermarks/i);
    expect(out.manual_instructions).toContain('asset_image');

    // Removing voice.md breaks completeness law loudly
    await rm(join(paths.assetDir('film_colossus', 'characters', 'char_corvus'), 'voice.md'));
    const incomplete = await client.callTool({
      name: 'flow_prompt_sheet',
      arguments: { character_id: 'char_corvus' },
    });
    expect(isError(incomplete)).toBe(true);
    expect(textOf(incomplete)).toMatch(/incomplete|voice\.md/i);
  });

  it('flow_prompt_sheet dispatches to BridgeQueue and bridge_job_result tracks completion via WebBridgeServer', async () => {
    const paths = studioPaths(root);
    await assetRegister(paths, 'film_colossus', {
      kind: 'character',
      assetId: 'char_mara',
      descriptor: 'Mara Voss, 30s cartographer in oiled canvas parka.',
      voice: 'Measured alto, cool breath control.',
      acting: 'Alert gaze scanning horizons.',
    });

    const bridge = new WebBridgeServer({ studioRoot: root, port: 0, host: '127.0.0.1' });
    const addr = await bridge.start();
    const baseUrl = `http://${addr.host}:${addr.port}`;
    try {
      // Simulate Chrome extension online heartbeat
      await fetch(`${baseUrl}/bridge/status?client_id=chrome-mara`);

      const promptRes = await client.callTool({
        name: 'flow_prompt_sheet',
        arguments: { character_id: 'char_mara', dispatch_to_bridge: true },
      });
      expect(isError(promptRes)).toBe(false);
      const out = dataOf(promptRes);
      expect(out.bridge_connected).toBe(true);
      expect(out.bridge_job_id).toBeTruthy();

      const pendingRes = await client.callTool({
        name: 'bridge_job_result',
        arguments: { job_id: out.bridge_job_id },
      });
      expect(dataOf(pendingRes).status).toBe('pending');

      // Extension claims and uploads valid PNG
      const claimed = await (await fetch(`${baseUrl}/bridge/jobs/next?client_id=chrome-mara`)).json();
      expect(claimed.job.id).toBe(out.bridge_job_id);
      const png = makeSimplePng(512, 512);
      const uploadRes = await fetch(`${baseUrl}/bridge/jobs/${out.bridge_job_id}/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mime_type: 'image/png', data_base64: png.toString('base64') }),
      });
      expect(uploadRes.status).toBe(200);

      const finalRes = await client.callTool({
        name: 'bridge_job_result',
        arguments: { job_id: out.bridge_job_id },
      });
      const finalData = dataOf(finalRes);
      expect(finalData.status).toBe('completed');
      expect(finalData.output_path).toContain('sheet.png');
    } finally {
      await bridge.stop();
    }
  });

  it('flow_prompt_plate enforces location & light_statement and compiles Panavision C-Series 2.39:1 prompt', async () => {
    const paths = studioPaths(root);
    await assetRegister(paths, 'film_colossus', {
      kind: 'location',
      assetId: 'loc_foundry',
      descriptor: 'Cavernous basalt forge with suspended iron chains and cooling slag troughs.',
      geoBlock: 'N: blast furnace mouth. E: anvil dais. Camera: southwest catwalk.',
    });

    const badLight = await client.callTool({
      name: 'flow_prompt_plate',
      arguments: { location_id: 'loc_foundry', light_statement: '   ' },
    });
    expect(isError(badLight)).toBe(true);
    expect(textOf(badLight)).toMatch(/light_statement is required/i);

    const res = await client.callTool({
      name: 'flow_prompt_plate',
      arguments: {
        location_id: 'loc_foundry',
        light_statement: 'molten slag glow from north furnace mouth casting long hard amber shadows southwest',
        cinematics: {
          film_stock: 'kodak_vision3_500t',
          lens_glass: 'anamorphic_2x_oval_bokeh',
          lighting_setup: 'chiaroscuro_high_contrast',
          color_temp: 'tungsten_3200k',
          atmosphere: 'subtle_volumetric_haze',
        },
        dispatch_to_bridge: true,
      },
    });
    expect(isError(res)).toBe(false);
    const out = dataOf(res);
    expect(out.model_hint).toBe('Nano Banana 2.5');
    expect(out.target_aspect_ratio).toBe('2.39:1');
    expect(out.prompt).toContain('Panavision C-Series');
    expect(out.prompt).toContain('2.39:1');
    expect(out.prompt).toContain('never two suns');
    expect(out.prompt).toContain('N: blast furnace mouth');
    expect(out.prompt).toContain('kodak vision3 500t');
    expect(out.manual_instructions).toContain('asset_image');
    expect(out.bridge_job_id).toBeTruthy();

    const queue = getSharedBridgeQueue(root);
    expect(queue.getJob(out.bridge_job_id)?.target).toBe('flow_plate');
  });

  it('studio_prompt_dialogue loads shot line, voice.md/acting.md/voice_profile.json, and emits Reddington phonetic AI Studio prompt', async () => {
    const paths = studioPaths(root);
    await assetRegister(paths, 'film_colossus', {
      kind: 'location',
      assetId: 'loc_foundry',
      descriptor: 'Basalt forge.',
      geoBlock: 'N: furnace. Camera: south.',
    });
    await assetRegister(paths, 'film_colossus', {
      kind: 'character',
      assetId: 'char_corvus',
      descriptor: 'Corvus Vance, master smith.',
      voice: 'Deep unhurried Reddington baritone with razor precision.',
      acting: 'Hands folded behind back, slight head tilt before speaking.',
      voiceId: 'Charon',
      voiceProvider: 'google',
    });
    await shotCreate(paths, 'film_colossus', {
      id: 'seq01-shot01',
      sequence: 'seq01',
      action: 'Corvus steps to the slag rail and watches the general.',
      geoBlock: 'N: furnace. Camera: south.',
      refs: [
        { assetId: 'loc_foundry', role: 'location' },
        { assetId: 'char_corvus', role: 'character' },
      ],
      camera: { lens: '50mm', move: 'slow push-in', reason: 'status shift' },
      audioBlock: {
        dialogue: [
          {
            voiceRef: 'char_corvus',
            line: 'In the fourth dynasty, General, your predecessors removed their helmets. Sit down.',
          },
        ],
        sfx: 'furnace rumble',
      },
      durationS: 8,
    });

    const res = await client.callTool({
      name: 'studio_prompt_dialogue',
      arguments: { shot_id: 'seq01-shot01', dispatch_to_bridge: true },
    });
    expect(isError(res)).toBe(false);
    const out = dataOf(res);

    expect(out.voice_persona).toBe('Charon');
    expect(out.line_index).toBe(1);
    expect(out.annotated_line).toContain('[pause: 800ms]');
    expect(out.annotated_line).toContain('[breath]');
    expect(out.prompt).toContain('Charon');
    expect(out.prompt).toContain('Reddington');
    expect(out.prompt).toContain('Hands folded behind back');
    expect(out.manual_instructions).toContain('dialogue_import');
    expect(out.bridge_job_id).toBeTruthy();

    const queue = getSharedBridgeQueue(root);
    const job = queue.getJob(out.bridge_job_id);
    expect(job?.target).toBe('aistudio_voice');
    expect(job?.shot_id).toBe('seq01-shot01');

    // Out of range line_index -> VALIDATION
    const badLine = await client.callTool({
      name: 'studio_prompt_dialogue',
      arguments: { shot_id: 'seq01-shot01', line_index: 5 },
    });
    expect(isError(badLine)).toBe(true);
    expect(textOf(badLine)).toMatch(/out of range/i);

    // Explicit tags already in line are preserved verbatim without duplication
    await shotCreate(paths, 'film_colossus', {
      id: 'seq01-shot02',
      sequence: 'seq01',
      action: 'Corvus whispers calmly.',
      geoBlock: 'N: furnace. Camera: south.',
      refs: [{ assetId: 'loc_foundry', role: 'location' }, { assetId: 'char_corvus', role: 'character' }],
      camera: { lens: '85mm', move: 'static', reason: 'subtext' },
      audioBlock: {
        dialogue: [{ voiceRef: 'char_corvus', line: '[breath] Listen carefully. [pause: 500ms] Leave.' }],
      },
      durationS: 5,
    });
    const taggedRes = await client.callTool({
      name: 'studio_prompt_dialogue',
      arguments: { shot_id: 'seq01-shot02', voice_persona: 'Fenrir' },
    });
    const taggedOut = dataOf(taggedRes);
    expect(taggedOut.voice_persona).toBe('Fenrir');
    expect(taggedOut.annotated_line).toBe('[breath] Listen carefully. [pause: 500ms] Leave.');

    // Unknown job_id on bridge_job_result -> NOT_FOUND
    const unknownJob = await client.callTool({
      name: 'bridge_job_result',
      arguments: { job_id: 'bridge_nonexistent_123' },
    });
    expect(isError(unknownJob)).toBe(true);
    expect(textOf(unknownJob)).toMatch(/not found/i);
  });

  it('bridge_status reports setup instructions when disconnected and live stats when connected', async () => {
    const resOffline = await client.callTool({ name: 'bridge_status', arguments: {} });
    expect(isError(resOffline)).toBe(false);
    const d1 = dataOf(resOffline);
    expect(d1.bridge_connected).toBe(false);
    expect(d1.connected_clients).toBe(0);
    expect(d1.setup_instructions).toContain('chrome://extensions');

    const queue = getSharedBridgeQueue(root);
    queue.recordHeartbeat('chrome-popup-1');

    const resOnline = await client.callTool({ name: 'bridge_status', arguments: {} });
    const d2 = dataOf(resOnline);
    expect(d2.bridge_connected).toBe(true);
    expect(d2.connected_clients).toBe(1);
  });
});
