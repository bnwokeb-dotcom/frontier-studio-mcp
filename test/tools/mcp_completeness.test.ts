// test/tools/mcp_completeness.test.ts — Verifies all remaining planned MCP tools & hardenings.
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { execFile as execFileCb } from 'node:child_process';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { buildServer } from '../../src/server.js';
import { studioPaths } from '../../src/store/paths.js';

const execFileAsync = promisify(execFileCb);

describe('MCP Completeness & Production Hardening Tools', () => {
  let root: string;
  let client: Client;
  let server: ReturnType<typeof buildServer>;
  const origEnv = { ...process.env };

  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'fsm-complete-'));
    process.env.STUDIO_ROOT = root;
    delete process.env.GEMINI_API_KEY;
    delete process.env.SYNC_API_KEY;
    delete process.env.SYNCLABS_API_KEY;
    delete process.env.R2_ACCOUNT_ID;
    delete process.env.R2_ACCESS_KEY_ID;
    delete process.env.R2_SECRET_ACCESS_KEY;

    server = buildServer({ studioRoot: root });
    client = new Client({ name: 'test-complete', version: '1.0' });
    const [a, b] = InMemoryTransport.createLinkedPair();
    await Promise.all([server.connect(a), client.connect(b)]);

    await client.callTool({
      name: 'film_create',
      arguments: {
        film_id: 'film_mythos',
        title: 'Heart of Colossus',
        logline: 'A forge master trades memory to rekindle a dying titan.',
        budget_usd: 25,
      },
    });
    await client.callTool({
      name: 'asset_register',
      arguments: {
        kind: 'character',
        asset_id: 'char_corvus',
        descriptor: 'Weather-beaten blacksmith in soot-darkened heavy wool coat.',
        voice: 'low gravel baritone, unhurried cadence',
        acting: 'jaw clenches before speaking; eyes hold the anvil',
      },
    });
    await client.callTool({
      name: 'asset_register',
      arguments: {
        kind: 'character',
        asset_id: 'char_malic',
        descriptor: 'Imperial inquisitor in charcoal plate and scarlet collar.',
        voice: 'clipped aristocratic tenor',
        acting: 'tilts chin slowly; folds gauntleted hands behind back',
      },
    });
    await client.callTool({
      name: 'asset_register',
      arguments: {
        kind: 'location',
        asset_id: 'loc_forge',
        descriptor: 'Basalt subterranean foundry glowing with a molten crucible pit.',
        geo_block: 'Crucible pit center; anvil west; iron blast doors north.',
      },
    });
  });

  afterEach(async () => {
    process.env = { ...origEnv };
    await Promise.all([client.close(), server.close()]);
    await rm(root, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
    vi.restoreAllMocks();
  });

  const callJson = async (name: string, args: Record<string, unknown>) => {
    const res = await client.callTool({ name, arguments: args });
    const text = (res as { content: Array<{ text: string }> }).content[0].text;
    return { isError: Boolean((res as { isError?: boolean }).isError), text, json: () => JSON.parse(text) };
  };

  it('supports studio_doctor, budget_set, asset_list, and shot_list', async () => {
    const doc = (await callJson('studio_doctor', {})).json();
    expect(doc.status).toBe('ready');
    expect(doc.studio_root_writable).toBe(true);
    expect(doc.binaries.ffmpeg).toBeTruthy();
    expect(doc.active_film.film_id).toBe('film_mythos');

    const b = (await callJson('budget_set', { budget_usd: 60 })).json();
    expect(b.budget_usd).toBe(60);
    expect(b.remaining_usd).toBe(60);

    const assets = (await callJson('asset_list', {})).json();
    expect(assets.count).toBe(3);
    expect(assets.assets.some((a: { asset_id: string; kind: string }) => a.asset_id === 'char_corvus' && a.kind === 'character')).toBe(true);

    await callJson('sequence_lock_geo', {
      sequence: 'seq01',
      geo_block: 'Crucible pit center; anvil west; iron blast doors north.',
    });
    await callJson('shot_create', {
      id: 'seq01-shot01',
      sequence: 'seq01',
      action: 'Corvus raises tongs over the crucible while Malic waits by the blast doors.',
      geo_block: 'Crucible pit center; anvil west; iron blast doors north.',
      refs: [{ asset_id: 'loc_forge', role: 'location' }],
      camera: { lens: '35mm', move: 'slow push-in', reason: 'build tension' },
      duration_s: 5,
    });

    const shots = (await callJson('shot_list', { sequence: 'seq01' })).json();
    expect(shots.count).toBe(1);
    expect(shots.shots[0].id).toBe('seq01-shot01');
  });

  it('allows staging_build and storyboard_build via Chrome Bridge / prompt_only without GEMINI_API_KEY', async () => {
    await callJson('sequence_lock_geo', {
      sequence: 'seq01',
      geo_block: 'Crucible pit center; anvil west; iron blast doors north.',
    });
    await callJson('shot_create', {
      id: 'seq01-shot01',
      sequence: 'seq01',
      action: 'Wide view of forge floor.',
      geo_block: 'Crucible pit center; anvil west; iron blast doors north.',
      refs: [{ asset_id: 'loc_forge', role: 'location' }],
      camera: { lens: '24mm', move: 'static', reason: 'establish space' },
      duration_s: 5,
    });
    await callJson('shot_create', {
      id: 'seq01-shot02',
      sequence: 'seq01',
      action: 'Close on anvil sparks.',
      geo_block: 'Crucible pit center; anvil west; iron blast doors north.',
      refs: [{ asset_id: 'loc_forge', role: 'location' }],
      camera: { lens: '85mm', move: 'slow push-in', reason: 'tighten focus' },
      duration_s: 4,
    });

    const stg = (await callJson('staging_build', {
      char_a_id: 'char_corvus',
      char_b_id: 'char_malic',
      location_id: 'loc_forge',
      light_statement: 'molten crucible up-light from center pit',
      staging_layout: 'a_left_b_right',
      scene_action: 'Corvus faces Malic across the glowing pit',
      dispatch_to_bridge: true,
    })).json();
    expect(stg.mode).toBe('bridge_queued');
    expect(stg.bridge_job_id).toMatch(/^bridge_/);

    const sb = (await callJson('storyboard_build', {
      sequence: 'seq01',
      grid_layout: '2x2',
      dispatch_to_bridge: true,
    })).json();
    expect(sb.mode).toBe('bridge_queued');
    expect(sb.shots_included).toBe(2);
    expect(sb.bridge_job_id).toMatch(/^bridge_/);
  });

  it('ingests external video via video_import with ffprobe, tail_frame.png, QC, and $0 ledger entry', async () => {
    await callJson('sequence_lock_geo', {
      sequence: 'seq01',
      geo_block: 'Crucible pit center; anvil west; iron blast doors north.',
    });
    await callJson('shot_create', {
      id: 'seq01-shot01',
      sequence: 'seq01',
      action: 'Molten steel splashes across the anvil.',
      geo_block: 'Crucible pit center; anvil west; iron blast doors north.',
      refs: [{ asset_id: 'loc_forge', role: 'location' }],
      camera: { lens: '35mm', move: 'static', reason: 'witness impact' },
      duration_s: 5,
    });

    const srcMp4 = join(root, 'external_seedance.mp4');
    await execFileAsync('ffmpeg', [
      '-y', '-f', 'lavfi', '-i', 'testsrc2=size=640x360:rate=24:duration=2',
      '-f', 'lavfi', '-i', 'sine=frequency=440:duration=2',
      '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-c:a', 'aac', srcMp4,
    ]);

    const imp = (await callJson('video_import', {
      shot_id: 'seq01-shot01',
      source_video_path: srcMp4,
      source_platform: 'lumina_seedance',
    })).json();

    expect(imp.actual_cost_usd).toBe(0);
    expect(imp.width).toBe(640);
    expect(imp.height).toBe(360);
    expect(imp.tail_frame_path).toContain('tail_frame.png');
    const tailStat = await readFile(imp.tail_frame_path);
    expect(tailStat.subarray(0, 8).toString('hex')).toBe('89504e470d0a1a0a');

    const bad = await callJson('video_import', {
      shot_id: 'seq01-shot01',
      source_video_path: join(root, 'does_not_exist.mp4'),
    });
    expect(bad.isError).toBe(true);
  });

  it('refuses neural shot_lipsync without credentials, validates Shot Table + 3D Director Desk 180-axis, and queues music stems', async () => {
    const paths = studioPaths(root);
    await callJson('sequence_lock_geo', {
      sequence: 'seq01',
      geo_block: 'Crucible pit center; anvil west; iron blast doors north.',
    });
    await callJson('shot_create', {
      id: 'seq01-shot01',
      sequence: 'seq01',
      action: 'Corvus speaks.',
      geo_block: 'Crucible pit center; anvil west; iron blast doors north.',
      refs: [{ asset_id: 'loc_forge', role: 'location' }],
      camera: { lens: '50mm', move: 'static', reason: 'dialogue delivery' },
      duration_s: 4,
    });
    await mkdir(paths.audioDir('film_mythos'), { recursive: true });
    await writeFile(paths.audioPath('film_mythos', 'seq01-shot01.wav'), Buffer.from('RIFF_WAV'));

    const refuseSync = await callJson('shot_lipsync', {
      shot_id: 'seq01-shot01',
      engine: 'synclabs',
      apply: true,
    });
    expect(refuseSync.isError).toBe(true);
    expect(refuseSync.text).toContain('SYNC_API_KEY');

    const deskBad = (await callJson('director_desk_stage', {
      location_summary: 'Basalt foundry floor',
      roles: [
        { role_id: 'char_corvus', x: -2, z: 0 },
        { role_id: 'char_malic', x: 2, z: 0 },
      ],
      cameras: [
        { camera_id: 'cam_1', lens_mm: 35, x: 0, z: 4, target_role_id: 'char_corvus' },
        { camera_id: 'cam_2', lens_mm: 50, x: 0, z: -4, target_role_id: 'char_malic' },
      ],
    })).json();
    expect(deskBad.passed_axis_check).toBe(false);
    expect(deskBad.violations[0]).toContain('180_DEGREE_AXIS_CROSS');

    const tbl = (await callJson('shot_table_validate', {
      floor_plan: 'Crucible center, doors north, anvil west.',
      rows: [
        {
          shot_id: 's1',
          camera_side: 'south side',
          in_frame: '@char_corvus by anvil',
          eyeline: 'screen right toward doors',
          action: 'Corvus cools glowing tongs slowly in oil trough.',
          others_idle_business: 'sparks settle across dark stone floor',
          light_lock: 'molten crucible from center pit',
          last_frame: 'steam rising past Corvus shoulder',
        },
      ],
    })).json();
    expect(tbl.passed).toBe(true);

    const music = (await callJson('music_bridge_dispatch', {
      theme_melody: 'low mournful cello motif in D minor',
      states: ['felt_whisper', 'creeping_dread'],
      dispatch_to_bridge: true,
    })).json();
    expect(music.specs).toHaveLength(2);
    expect(music.specs[0].bridge_job_id).toMatch(/^bridge_/);

    const pub = await callJson('film_publish', { target: 'rough_cut' });
    expect(pub.isError).toBe(true);
    expect(pub.text).toContain('R2_ACCOUNT_ID');
  });
});
