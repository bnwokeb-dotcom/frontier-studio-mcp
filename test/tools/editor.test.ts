// test/tools/editor.test.ts — Unit tests for FCPXML / EDL export and FFmpeg assembly tools.
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, rm, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { buildServer } from '../../src/server.js';

describe('Editor Tools (FCPXML, EDL & FFmpeg Assembly)', () => {
  let root: string;
  let client: Client;
  let server: Awaited<ReturnType<typeof buildServer>>;

  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'fsm-editor-'));
    process.env.STUDIO_ROOT = root;
    server = buildServer({ studioRoot: root });
    client = new Client({ name: 'test', version: '0' });
    const [a, b] = InMemoryTransport.createLinkedPair();
    await Promise.all([server.connect(a), client.connect(b)]);

    // Create film, location, and 2 shots
    await client.callTool({
      name: 'film_create',
      arguments: { film_id: 'film_edit', title: 'The Edit', logline: 'Timeline test', budget_usd: 100 },
    });
    await client.callTool({
      name: 'asset_register',
      arguments: {
        kind: 'location',
        asset_id: 'loc_cabin',
        descriptor: 'wooden cabin in snow',
        geo_block: 'hearth on left, door on right',
      },
    });

    await client.callTool({
      name: 'shot_create',
      arguments: {
        id: 'seq01-shot01',
        sequence: 'seq01',
        action: 'Mara enters the cabin, shaking off snow.',
        geo_block: 'hearth on left, door on right',
        refs: [{ asset_id: 'loc_cabin', role: 'location' }],
        camera: { lens: '35mm', move: 'tracking in', reason: 'following entrance' },
        duration_s: 5,
      },
    });

    await client.callTool({
      name: 'shot_create',
      arguments: {
        id: 'seq01-shot02',
        sequence: 'seq01',
        action: 'Close up on the fire in the hearth.',
        geo_block: 'hearth on left, door on right',
        refs: [{ asset_id: 'loc_cabin', role: 'location' }],
        camera: { lens: '50mm', move: 'static', reason: 'establishing heat' },
        duration_s: 4,
      },
    });
  });

  afterEach(async () => {
    await Promise.all([client.close(), server.close()]);
    await rm(root, { recursive: true, force: true });
  });

  it('film_export_xml generates compliant FCPXML 1.10 and EDL files for DaVinci Resolve / Premiere', async () => {
    const res = await client.callTool({
      name: 'film_export_xml',
      arguments: { film_id: 'film_edit' },
    });

    const content = (res as { content: Array<{ text: string }> }).content[0].text;
    const data = JSON.parse(content);

    expect(data.total_shots).toBe(2);
    expect(data.total_runtime_s).toBe(9); // 5s + 4s
    expect(data.fcpxml_path).toContain('.fcpxml');
    expect(data.edl_path).toContain('.edl');
    expect(data.otio_path).toContain('.otio');

    // Read and verify FCPXML structure
    const fcpxml = await readFile(data.fcpxml_path, 'utf8');
    expect(fcpxml).toContain('<!DOCTYPE fcpxml>');
    expect(fcpxml).toContain('<fcpxml version="1.10">');
    expect(fcpxml).toContain('FFVideoFormat1080p24');
    expect(fcpxml).toContain('seq01-shot01');
    expect(fcpxml).toContain('seq01-shot02');
    expect(fcpxml).toContain('duration="120/24s"'); // 5s * 24fps = 120 frames
    expect(fcpxml).toContain('duration="96/24s"'); // 4s * 24fps = 96 frames

    // Read and verify EDL structure
    const edl = await readFile(data.edl_path, 'utf8');
    expect(edl).toContain('TITLE: film_edit');
    expect(edl).toContain('001  AX       V     C');
    expect(edl).toContain('002  AX       V     C');

    // Read and verify OpenTimelineIO structure
    const otio = JSON.parse(await readFile(data.otio_path, 'utf8'));
    expect(otio.OTIO_SCHEMA).toBe('Timeline.1');
    expect(otio.name).toBe('film_edit');
    expect(otio.tracks.children[0].name).toBe('V1_Generative_Video');
    expect(otio.tracks.children[0].children.length).toBe(2);
  });

  it('qc_vision_audit tool refuses unknown video file path with NOT_FOUND', async () => {
    const res = await client.callTool({
      name: 'qc_vision_audit',
      arguments: { video_path: 'renders/non_existent_shot.mp4' },
    });
    expect((res as any).isError).toBe(true);
    expect((res as any).content[0].text).toContain('video file not found');
  });

  it('film_assemble creates FFmpeg concat manifest and copy command', async () => {
    const res = await client.callTool({
      name: 'film_assemble',
      arguments: { film_id: 'film_edit' },
    });

    const content = (res as { content: Array<{ text: string }> }).content[0].text;
    const data = JSON.parse(content);

    expect(data.total_clips).toBe(2);
    expect(data.manifest_path).toContain('concat_manifest.txt');
    expect(data.ffmpeg_command).toContain('ffmpeg -f concat');
    expect(data.output_rough_cut).toContain('rough_cut.mp4');

    const manifestText = await readFile(data.manifest_path, 'utf8');
    expect(manifestText).toContain('file \'');
    expect(manifestText).toContain('seq01-shot01');
  });

  it('film_grade builds FFmpeg 35mm grain, era emulation, and letterbox filter pipeline', async () => {
    const res = await client.callTool({
      name: 'film_grade',
      arguments: {
        film_id: 'film_edit',
        shot_id: 'seq01-shot01',
        era: '1970s_panavision',
        grain: 'medium',
        aspect_ratio: '2.39_anamorphic',
        apply: false,
      },
    });

    const content = (res as { content: Array<{ text: string }> }).content[0].text;
    const data = JSON.parse(content);

    expect(data.shot_id).toBe('seq01-shot01');
    expect(data.era).toBe('1970s_panavision');
    expect(data.grain).toBe('medium');
    expect(data.aspect_ratio).toBe('2.39_anamorphic');
    expect(data.filter_complex).toContain('eq=contrast=1.08');
    expect(data.filter_complex).toContain('noise=alls=12:allf=t+u');
    expect(data.filter_complex).toContain('drawbox=y=0:h=(ih-iw/2.39)/2');
    expect(data.ffmpeg_command).toContain('ffmpeg -y -i');
  });

  it('shot_lipsync validates dialogue audio presence and generates audio-video sync command', async () => {
    // Calling shot_lipsync without dialogue audio must refuse
    const errRes = await client.callTool({
      name: 'shot_lipsync',
      arguments: {
        film_id: 'film_edit',
        shot_id: 'seq01-shot01',
      },
    });
    expect((errRes as { isError?: boolean }).isError).toBe(true);

    // Create dialogue audio stem for seq01-shot01
    const { writeFile, mkdir } = await import('node:fs/promises');
    const { studioPaths } = await import('../../src/store/paths.js');
    const paths = studioPaths(root);
    await mkdir(paths.audioDir('film_edit'), { recursive: true });
    await writeFile(paths.audioPath('film_edit', 'seq01-shot01.wav'), Buffer.from('RIFF mock wav bytes'));

    const res = await client.callTool({
      name: 'shot_lipsync',
      arguments: {
        film_id: 'film_edit',
        shot_id: 'seq01-shot01',
        apply: false,
      },
    });

    const content = (res as { content: Array<{ text: string }> }).content[0].text;
    const data = JSON.parse(content);

    expect(data.shot_id).toBe('seq01-shot01');
    expect(data.engine).toBe('ffmpeg_mux');
    expect(data.audio_stem).toContain('seq01-shot01.wav');
    expect(data.ffmpeg_command).toContain('ffmpeg -y -i');
    expect(data.ffmpeg_command).toContain('-c:v copy -c:a aac');
  });

  it('shot_continuity_plan advises on continuous motion vs cut point', async () => {
    // seq01-shot01 is tracking in; create seq01-shot02 as continuous tracking in
    await client.callTool({
      name: 'shot_create',
      arguments: {
        id: 'seq01-shot03',
        sequence: 'seq01',
        action: 'Mara approaches the fireplace.',
        geo_block: 'hearth on left, door on right',
        refs: [{ asset_id: 'loc_cabin', role: 'location' }],
        camera: { lens: '35mm', move: 'dolly_in', movement: 'dolly_in', framing: 'medium_ots', reason: 'continuing push' },
        continuity: 'continuous',
        chain_from_shot_id: 'seq01-shot01',
        duration_s: 4,
      },
    });

    const res = await client.callTool({
      name: 'shot_continuity_plan',
      arguments: {
        film_id: 'film_edit',
        shot_id: 'seq01-shot01',
        target_shot_id: 'seq01-shot03',
      },
    });

    const content = (res as { content: Array<{ text: string }> }).content[0].text;
    const data = JSON.parse(content);

    expect(data.source_shot).toBe('seq01-shot01');
    expect(data.target_shot).toBe('seq01-shot03');
    expect(data.recommended_transition).toBe('continuous');
    expect(data.frame_strategy).toBe('CHAIN_TAIL_FRAME');
    expect(data.chain_parent_id).toBe('seq01-shot01');
    expect(data.directorial_directive).toContain('AUTOMATED CONTINUITY');
  });
});
