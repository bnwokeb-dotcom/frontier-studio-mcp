// test/tools/editor.test.ts — Unit tests for FCPXML / EDL / OTIO export and FFmpeg assembly tools.
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, rm, readFile, mkdir, writeFile, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFile as execFileCb } from 'node:child_process';
import { promisify } from 'node:util';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { buildServer } from '../../src/server.js';
import { studioPaths } from '../../src/store/paths.js';
import { readJson, writeJsonAtomic } from '../../src/store/fs.js';
import type { ShotRecord } from '../../src/store/shot.js';

const execFile = promisify(execFileCb);

async function makeTestMp4(dest: string, opts: { testsrc?: string; withAudio?: boolean; durationS?: number } = {}): Promise<void> {
  const src = opts.testsrc ?? 'testsrc=size=640x360:rate=24';
  const dur = opts.durationS ?? 1;
  const args = ['-y', '-f', 'lavfi', '-i', `${src}:duration=${dur}`];
  if (opts.withAudio) {
    args.push('-f', 'lavfi', '-i', `sine=frequency=440:duration=${dur}`);
  }
  args.push('-c:v', 'libx264', '-pix_fmt', 'yuv420p');
  if (opts.withAudio) {
    args.push('-c:a', 'aac', '-b:a', '128k');
  }
  args.push(dest);
  await execFile('ffmpeg', args);
}

async function makeTestWav(dest: string, freq = 660, durationS = 0.8): Promise<void> {
  await execFile('ffmpeg', [
    '-y', '-f', 'lavfi', '-i', `sine=frequency=${freq}:duration=${durationS}`,
    '-ar', '48000', '-ac', '2', dest,
  ]);
}

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
    await rm(root, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
  });

  it('film_export_xml generates compliant FCPXML 1.10, EDL, and OTIO and flags missing media honestly', async () => {
    const res = await client.callTool({
      name: 'film_export_xml',
      arguments: { film_id: 'film_edit' },
    });

    const content = (res as { content: Array<{ text: string }> }).content[0].text;
    const data = JSON.parse(content);

    expect(data.total_shots).toBe(2);
    expect(data.total_runtime_s).toBe(9);
    expect(data.missing_media).toBe(true);
    expect(data.warnings?.length).toBeGreaterThanOrEqual(2);
    expect(data.fcpxml_path).toContain('.fcpxml');
    expect(data.edl_path).toContain('.edl');
    expect(data.otio_path).toContain('.otio');

    const fcpxml = await readFile(data.fcpxml_path, 'utf8');
    expect(fcpxml).toContain('<!DOCTYPE fcpxml>');
    expect(fcpxml).toContain('<fcpxml version="1.10">');
    expect(fcpxml).toContain('FFVideoFormat1080p24');
    expect(fcpxml).toContain('seq01-shot01');
    expect(fcpxml).toContain('seq01-shot02');
    expect(fcpxml).toContain('duration="120/24s"');
    expect(fcpxml).toContain('duration="96/24s"');
    expect(fcpxml).toContain('hasVideo="0"');

    const edl = await readFile(data.edl_path, 'utf8');
    expect(edl).toContain('TITLE: film_edit');
    expect(edl).toContain('001  AX       V     C');
    expect(edl).toContain('002  AX       V     C');

    const otio = JSON.parse(await readFile(data.otio_path, 'utf8'));
    expect(otio.OTIO_SCHEMA).toBe('Timeline.1');
    expect(otio.name).toBe('film_edit');
    expect(otio.tracks.children[0].name).toBe('V1_Generative_Video');
    expect(otio.tracks.children[0].children.length).toBe(2);
  });

  it('film_export_xml emits multi-track FCPXML 1.10 (V1, A1, A2, A3) and OTIO with valid file:/// URIs', async () => {
    const paths = studioPaths(root);

    // Create real rendered takes for both shots
    await mkdir(join(paths.rendersDir('film_edit'), 'job_s1'), { recursive: true });
    await mkdir(join(paths.rendersDir('film_edit'), 'job_s2'), { recursive: true });
    await makeTestMp4(join(paths.rendersDir('film_edit'), 'job_s1', 'shot.mp4'), { withAudio: true, durationS: 1 });
    await makeTestMp4(join(paths.rendersDir('film_edit'), 'job_s2', 'shot.mp4'), { testsrc: 'testsrc2=size=640x360:rate=24', withAudio: false, durationS: 1 });

    // Attach takes to shot JSONs
    const s1 = await readJson<ShotRecord>(paths.shotPath('film_edit', 'seq01-shot01'));
    s1.takes = [{ jobId: 'job_s1', verdict: 'kept' }];
    await writeJsonAtomic(paths.shotPath('film_edit', 'seq01-shot01'), s1);

    const s2 = await readJson<ShotRecord>(paths.shotPath('film_edit', 'seq01-shot02'));
    s2.takes = [{ jobId: 'job_s2', verdict: 'kept' }];
    await writeJsonAtomic(paths.shotPath('film_edit', 'seq01-shot02'), s2);

    // Create A1 dialogue, A2 soundscape, and A3 score WAV stems
    await mkdir(paths.audioDir('film_edit'), { recursive: true });
    await makeTestWav(paths.audioPath('film_edit', 'seq01-shot01_line_1_diegetic.wav'), 520, 0.9);
    await makeTestWav(paths.audioPath('film_edit', 'seq01-shot02_line_1.wav'), 640, 0.9);
    await makeTestWav(paths.audioPath('film_edit', 'seq01-shot01_soundscape.wav'), 200, 1.0);
    await makeTestWav(paths.audioPath('film_edit', 'score_master.wav'), 330, 2.0);

    const res = await client.callTool({
      name: 'film_export_xml',
      arguments: { film_id: 'film_edit' },
    });
    const data = JSON.parse((res as { content: Array<{ text: string }> }).content[0].text);

    expect(data.missing_media).toBe(false);
    expect(data.warnings ?? []).toEqual([]);

    const fcpxml = await readFile(data.fcpxml_path, 'utf8');
    expect(fcpxml).toContain('file:///');
    expect(fcpxml).not.toMatch(/file:\/\/[^/]/);
    expect(fcpxml).toContain('job_s1/shot.mp4');
    expect(fcpxml).toContain('job_s2/shot.mp4');
    expect(fcpxml).toContain('seq01-shot01_line_1_diegetic.wav');
    expect(fcpxml).toContain('seq01-shot02_line_1.wav');
    expect(fcpxml).toContain('seq01-shot01_soundscape.wav');
    expect(fcpxml).toContain('score_master.wav');
    expect(fcpxml).toContain('role="dialogue"');
    expect(fcpxml).toContain('role="effects"');
    expect(fcpxml).toContain('role="music"');

    const otio = JSON.parse(await readFile(data.otio_path, 'utf8'));
    const trackNames = otio.tracks.children.map((t: { name: string }) => t.name);
    expect(trackNames).toEqual([
      'V1_Generative_Video',
      'A1_Dialogue',
      'A2_Soundscape_SFX',
      'A3_Score',
    ]);
    expect(otio.tracks.children[0].children[0].media_reference.target_url).toMatch(/^file:\/\/\/.*job_s1\/shot\.mp4$/);
    expect(otio.tracks.children[1].children.some((c: any) => c.media_reference?.target_url?.includes('seq01-shot01_line_1_diegetic.wav'))).toBe(true);
    expect(otio.tracks.children[2].children.some((c: any) => c.media_reference?.target_url?.includes('seq01-shot01_soundscape.wav'))).toBe(true);
    expect(otio.tracks.children[3].children.some((c: any) => c.media_reference?.target_url?.includes('score_master.wav'))).toBe(true);
  });

  it('qc_vision_audit tool refuses unknown video file path with NOT_FOUND', async () => {
    const res = await client.callTool({
      name: 'qc_vision_audit',
      arguments: { video_path: 'renders/non_existent_shot.mp4' },
    });
    expect((res as any).isError).toBe(true);
    expect((res as any).content[0].text).toContain('video file not found');
  });

  it('film_assemble refuses when rendered MP4 footage is missing unless allow_dry_run_manifest is true', async () => {
    const errRes = await client.callTool({
      name: 'film_assemble',
      arguments: { film_id: 'film_edit' },
    });
    expect((errRes as { isError?: boolean }).isError).toBe(true);
    const errText = (errRes as { content: Array<{ text: string }> }).content[0].text;
    expect(errText).toContain('seq01-shot01');
    expect(errText).toContain('render_shot');

    // Dry-run manifest planning mode remains explicitly accessible
    const dryRes = await client.callTool({
      name: 'film_assemble',
      arguments: { film_id: 'film_edit', allow_dry_run_manifest: true },
    });
    expect((dryRes as { isError?: boolean }).isError).not.toBe(true);
    const dryData = JSON.parse((dryRes as { content: Array<{ text: string }> }).content[0].text);
    expect(dryData.executed).toBe(false);
    expect(dryData.manifest_path).toContain('concat_manifest.txt');
  });

  it('film_assemble executes ffmpeg on real rendered MP4s and audio stems to produce verified rough_cut.mp4', async () => {
    const paths = studioPaths(root);
    await mkdir(join(paths.rendersDir('film_edit'), 'job_01'), { recursive: true });
    await mkdir(join(paths.rendersDir('film_edit'), 'job_02'), { recursive: true });

    // Mix one clip WITH audio and one clip WITHOUT audio to verify normalization resilience
    await makeTestMp4(join(paths.rendersDir('film_edit'), 'job_01', 'shot.mp4'), { withAudio: true, durationS: 1 });
    await makeTestMp4(join(paths.rendersDir('film_edit'), 'job_02', 'shot.mp4'), { testsrc: 'testsrc2=size=640x360:rate=24', withAudio: false, durationS: 1 });

    const s1 = await readJson<ShotRecord>(paths.shotPath('film_edit', 'seq01-shot01'));
    s1.takes = [{ jobId: 'job_01', verdict: 'kept' }];
    await writeJsonAtomic(paths.shotPath('film_edit', 'seq01-shot01'), s1);

    const s2 = await readJson<ShotRecord>(paths.shotPath('film_edit', 'seq01-shot02'));
    s2.takes = [{ jobId: 'job_02', verdict: 'kept' }];
    await writeJsonAtomic(paths.shotPath('film_edit', 'seq01-shot02'), s2);

    // Add real WAV stems for dialogue & score
    await mkdir(paths.audioDir('film_edit'), { recursive: true });
    await makeTestWav(paths.audioPath('film_edit', 'seq01-shot01_line_1_diegetic.wav'), 520, 0.8);
    await makeTestWav(paths.audioPath('film_edit', 'score_master.wav'), 300, 2.0);

    const res = await client.callTool({
      name: 'film_assemble',
      arguments: { film_id: 'film_edit' },
    });

    expect((res as { isError?: boolean }).isError).not.toBe(true);
    const data = JSON.parse((res as { content: Array<{ text: string }> }).content[0].text);

    expect(data.executed).toBe(true);
    expect(data.total_clips).toBe(2);
    expect(data.output_rough_cut).toContain('rough_cut.mp4');
    expect(data.duration_s).toBeGreaterThanOrEqual(1.8);
    expect(data.width).toBe(640);
    expect(data.height).toBe(360);
    expect(data.fps).toBe(24);
    expect(data.file_bytes).toBeGreaterThan(1000);

    const st = await stat(data.output_rough_cut);
    expect(st.isFile()).toBe(true);

    // Independently verify rough_cut.mp4 decodes with ffprobe
    const { stdout } = await execFile('ffprobe', [
      '-v', 'quiet', '-print_format', 'json', '-show_format', '-show_streams', data.output_rough_cut,
    ]);
    const probe = JSON.parse(stdout);
    const vStream = probe.streams.find((s: any) => s.codec_type === 'video');
    const aStream = probe.streams.find((s: any) => s.codec_type === 'audio');
    expect(vStream).toBeDefined();
    expect(vStream.width).toBe(640);
    expect(vStream.height).toBe(360);
    expect(aStream).toBeDefined();
    expect(Number(probe.format.duration)).toBeGreaterThanOrEqual(1.8);
  }, 20_000);

  it('film_assemble concatenates video-only clips with mismatched resolution/fps cleanly without failing', async () => {
    const paths = studioPaths(root);
    await mkdir(join(paths.rendersDir('film_edit'), 'job_v1'), { recursive: true });
    await mkdir(join(paths.rendersDir('film_edit'), 'job_v2'), { recursive: true });

    await makeTestMp4(join(paths.rendersDir('film_edit'), 'job_v1', 'shot.mp4'), {
      testsrc: 'testsrc=size=640x360:rate=24',
      withAudio: false,
      durationS: 1,
    });
    await makeTestMp4(join(paths.rendersDir('film_edit'), 'job_v2', 'shot.mp4'), {
      testsrc: 'testsrc2=size=320x240:rate=30',
      withAudio: false,
      durationS: 1,
    });

    const s1 = await readJson<ShotRecord>(paths.shotPath('film_edit', 'seq01-shot01'));
    s1.takes = [{ jobId: 'job_v1', verdict: 'kept' }];
    await writeJsonAtomic(paths.shotPath('film_edit', 'seq01-shot01'), s1);

    const s2 = await readJson<ShotRecord>(paths.shotPath('film_edit', 'seq01-shot02'));
    s2.takes = [{ jobId: 'job_v2', verdict: 'kept' }];
    await writeJsonAtomic(paths.shotPath('film_edit', 'seq01-shot02'), s2);

    const res = await client.callTool({
      name: 'film_assemble',
      arguments: { film_id: 'film_edit' },
    });

    expect((res as { isError?: boolean }).isError).not.toBe(true);
    const data = JSON.parse((res as { content: Array<{ text: string }> }).content[0].text);
    expect(data.executed).toBe(true);
    expect(data.has_audio).toBe(false);
    expect(data.width).toBe(640);
    expect(data.height).toBe(360);
    expect(data.fps).toBe(24);
    expect(data.duration_s).toBeGreaterThanOrEqual(1.8);
  }, 20_000);

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
    const errRes = await client.callTool({
      name: 'shot_lipsync',
      arguments: {
        film_id: 'film_edit',
        shot_id: 'seq01-shot01',
      },
    });
    expect((errRes as { isError?: boolean }).isError).toBe(true);

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
