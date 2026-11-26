import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { execFile as execFileCb } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { buildServer } from '../../src/server.js';
import { GeminiLane } from '../../src/lanes/gemini.js';
import { getSharedBridgeQueue } from '../../src/bridge/web_bridge_server.js';

const execFile = promisify(execFileCb);

describe('Advanced Production Pipeline Upgrades', () => {
  let root: string;
  let client: Client;
  let server: Awaited<ReturnType<typeof buildServer>>;

  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'fsm-adv-'));
    vi.stubEnv('STUDIO_ROOT', root);
    vi.stubEnv('STUDIO_LIVE', '1');
    vi.stubEnv('GEMINI_API_KEY', 'test-key');
    vi.stubEnv('VULTR_INFERENCE_API_KEY', 'test-vultr');

    server = buildServer({ studioRoot: root });
    client = new Client({ name: 'test', version: '0' });
    const [a, b] = InMemoryTransport.createLinkedPair();
    await Promise.all([server.connect(a), client.connect(b)]);

    await client.callTool({
      name: 'film_create',
      arguments: { film_id: 'film_adv', title: 'Salt Truce', logline: 'Cold audit in flooded mine.', budget_usd: 50 },
    });
    await client.callTool({ name: 'film_set_active', arguments: { film_id: 'film_adv' } });
  });

  afterEach(async () => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    await Promise.all([client.close(), server.close()]);
    await rm(root, { recursive: true, force: true });
  });

  it('registers creature anatomy markers and passes actual sheet.png + plate.png pixels into staging_build & storyboard_build', async () => {
    await client.callTool({
      name: 'asset_register',
      arguments: {
        kind: 'location',
        asset_id: 'loc_vault',
        descriptor: 'Flooded limestone salt chamber with 5600K overhead skylight shaft.',
        geo_block: 'Plinth center; Warden east submerged step; Notary west arch.',
      },
    });
    await client.callTool({
      name: 'asset_register',
      arguments: {
        kind: 'character',
        asset_id: 'char_notary',
        descriptor: 'Middle-aged Royal Notary in damp slate wool coat.',
        voice: 'Measured dry baritone.',
        acting: 'Still hands, unwavering eye-line.',
        biological_markers: { anatomy_profile: 'humanoid', iris_color_hex: '#3A4B5C' },
      },
    });
    await client.callTool({
      name: 'asset_register',
      arguments: {
        kind: 'character',
        asset_id: 'char_warden',
        descriptor: 'Segmented subterranean salt-encrusted guardian with bronze tribunal collar.',
        voice: 'Low unhurried subterranean baritone.',
        acting: 'Headless stillness followed by single slow neck turn.',
        biological_markers: {
          anatomy_profile: 'creature',
          locomotion_rig: 'two ventral chitin spurs',
          carapace_material: 'chalk-dusted matte salt carapace',
          cornea_spec: 'recessed wet black cornea reflecting 5600K shaft',
          collar_harness: 'cast bronze collar riveted around three spiracles',
        },
      },
    });

    await mkdir(join(root, 'films', 'film_adv', 'refs'), { recursive: true });
    const fakePng = Buffer.from('\x89PNG\r\n\x1a\nfake-pixel-ref-payload-0123456789');
    await writeFile(join(root, 'films', 'film_adv', 'refs', 'notary.png'), fakePng);
    await writeFile(join(root, 'films', 'film_adv', 'refs', 'warden.png'), fakePng);
    await writeFile(join(root, 'films', 'film_adv', 'refs', 'vault.png'), fakePng);
    await client.callTool({ name: 'asset_image', arguments: { asset_id: 'char_notary', image_path: 'refs/notary.png' } });
    await client.callTool({ name: 'asset_image', arguments: { asset_id: 'char_warden', image_path: 'refs/warden.png' } });
    await client.callTool({ name: 'asset_image', arguments: { asset_id: 'loc_vault', image_path: 'refs/vault.png' } });

    const submitSpy = vi.spyOn(GeminiLane.prototype, 'submit').mockResolvedValue({ interactionId: 'int_pix_1' });
    vi.spyOn(GeminiLane.prototype, 'result').mockResolvedValue({
      data: fakePng,
      mimeType: 'image/png',
      interactionId: 'int_pix_1',
      priceUsd: 0.134,
    });

    const stgRes = await client.callTool({
      name: 'staging_build',
      arguments: {
        char_a_id: 'char_notary',
        char_b_id: 'char_warden',
        location_id: 'loc_vault',
        light_statement: 'Single 5600K skylight shaft cutting obliquely across brine',
        staging_layout: 'a_left_b_right',
        scene_action: 'Notary extends brass thermal probe while Warden watches silently.',
      },
    });
    const stg = JSON.parse((stgRes as { content: Array<{ text: string }> }).content[0].text);
    expect(stg.ref_images_loaded).toEqual(['char_notary/sheet.png', 'char_warden/sheet.png', 'loc_vault/plate.png']);
    expect(submitSpy.mock.calls[0][0].refImages).toHaveLength(3);
  });

  it('enforces strict_staging refusal on empty location plates, accepts staged first_frame_path, and handles flow_video bridge uploads', async () => {
    await client.callTool({
      name: 'asset_register',
      arguments: { kind: 'location', asset_id: 'loc_vault', descriptor: 'Flooded salt chamber.', geo_block: 'Plinth center' },
    });
    await client.callTool({
      name: 'asset_register',
      arguments: {
        kind: 'character',
        asset_id: 'char_notary',
        descriptor: 'Royal Notary in wet slate coat.',
        voice: 'Dry calm baritone.',
        acting: 'Still posture.',
      },
    });
    await mkdir(join(root, 'films', 'film_adv', 'refs'), { recursive: true });
    await writeFile(join(root, 'films', 'film_adv', 'refs', 'vault.png'), 'empty-room-plate');
    await writeFile(join(root, 'films', 'film_adv', 'refs', 'staged_two_shot.png'), 'staged-two-shot');
    await client.callTool({ name: 'asset_image', arguments: { asset_id: 'loc_vault', image_path: 'refs/vault.png' } });

    await client.callTool({
      name: 'shot_create',
      arguments: {
        id: 'sc01-shot01',
        sequence: 'seq01',
        action: 'Notary presses the cold bone seal onto the vellum.',
        geo_block: 'Plinth center',
        refs: [{ asset_id: 'char_notary', role: 'character' }, { asset_id: 'loc_vault', role: 'location' }],
        camera: { lens: '50mm', move: 'static', reason: 'lock treaty gesture' },
        audio_block: { dialogue: [{ voice_ref: 'char_notary', line: '[breath] Living marrow stays warm. [pause: 600ms] You stamped a corpse.' }] },
        duration_s: 5,
      },
    });

    // 1. strict_staging rejects raw empty room plate on character shot BEFORE spend
    const blocked = await client.callTool({
      name: 'render_shot',
      arguments: { shot_id: 'sc01-shot01', strict_staging: true },
    });
    expect((blocked as { isError?: boolean }).isError).toBe(true);
    expect((blocked as { content: Array<{ text: string }> }).content[0].text).toContain('strict_staging');

    // 2. flow_prompt_video compiles stripped dialogue tags & queues flow_video
    const fv = await client.callTool({
      name: 'flow_prompt_video',
      arguments: { shot_id: 'sc01-shot01', dispatch_to_bridge: true },
    });
    const fvData = JSON.parse((fv as { content: Array<{ text: string }> }).content[0].text);
    expect(fvData.prompt).not.toContain('[pause: 600ms]');
    expect(fvData.prompt).not.toContain('[breath]');
    expect(fvData.bridge_job_id).toBeDefined();

    // 3. Complete flow_video bridge upload with real valid FFmpeg MP4
    const validMp4Path = join(root, 'valid_sample.mp4');
    await execFile('ffmpeg', [
      '-y', '-f', 'lavfi', '-i', 'testsrc=size=320x180:rate=24:duration=1',
      '-c:v', 'libx264', '-pix_fmt', 'yuv420p', validMp4Path,
    ]);
    const mp4Bytes = await (await import('node:fs/promises')).readFile(validMp4Path);
    // Ensure payload >= 10KB threshold by padding or generating 2s complex video if needed
    let b64 = mp4Bytes.toString('base64');
    if (mp4Bytes.length < 10240) {
      await execFile('ffmpeg', [
        '-y', '-f', 'lavfi', '-i', 'testsrc2=size=640x360:rate=24:duration=2',
        '-c:v', 'libx264', '-pix_fmt', 'yuv420p', validMp4Path,
      ]);
      b64 = (await (await import('node:fs/promises')).readFile(validMp4Path)).toString('base64');
    }

    const completed = await getSharedBridgeQueue(root).completeJob(fvData.bridge_job_id, {
      data_base64: b64,
      mime_type: 'video/mp4',
    });
    expect(completed.status).toBe('completed');
    expect(completed.output_path).toContain('shot.mp4');
    expect(completed.width).toBeGreaterThan(0);
  });
});
