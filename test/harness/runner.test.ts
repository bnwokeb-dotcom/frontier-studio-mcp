import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, rm, mkdir, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFile as execFileCb } from 'node:child_process';
import { promisify } from 'node:util';
import { runAutonomousProduction, type AutonomousProductionGoal } from '../../src/harness/runner.js';
import { studioPaths } from '../../src/store/paths.js';
import { readJson, writeJsonAtomic } from '../../src/store/fs.js';
import type { ShotRecord } from '../../src/store/shot.js';

const execFile = promisify(execFileCb);

function makeSampleGoal(filmId = 'film_auto_01'): AutonomousProductionGoal {
  return {
    film_id: filmId,
    title: 'The Great Neanderthal Awakening',
    logline: 'Grok tries to microwave mammoth steak in a time portal',
    budget_usd: 150,
    niche: 'episodic_skit_comedy',
    aspect_ratio: '9:16',
    target_model: 'minimax-h3',
    characters: [
      {
        asset_id: 'char_grok',
        descriptor: 'muscular Neanderthal in mammoth fur pelt with wild dark hair',
        voice: { pitch: 0.85, speed: 1.0, timbre: 'gravelly' },
      },
    ],
    location: {
      asset_id: 'loc_prehistoric_cave',
      descriptor: 'torch-lit prehistoric cave with ancient wall art',
      geo_block: 'hearth on west wall, cave mouth facing east with morning mist',
    },
    shots: [
      {
        id: 'shot_01',
        action: 'Grok sniffs the humming microwave with intense feral suspicion.',
        camera: { lens: '24mm', move: 'push in', reason: 'capturing curious eye-darts' },
        duration_s: 4,
        continuity: 'cut',
      },
      {
        id: 'shot_02',
        action: 'The microwave dings; Grok shrieks and dives behind a boulder.',
        camera: { lens: '24mm', move: 'camera jolt and tilt down', reason: 'comedic panic reaction' },
        duration_s: 4,
        continuity: 'continuous',
        chain_from_shot_id: 'shot_01',
      },
    ],
  };
}

describe('Hermes-Style Autonomous Studio Harness Runner', () => {
  let root: string;
  let prevStudioLive: string | undefined;

  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'fsm-harness-'));
    prevStudioLive = process.env.STUDIO_LIVE;
    delete process.env.STUDIO_LIVE;
  });

  afterEach(async () => {
    if (prevStudioLive !== undefined) process.env.STUDIO_LIVE = prevStudioLive;
    else delete process.env.STUDIO_LIVE;
    await rm(root, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
  });

  it('truthfully returns STAGED_AWAITING_RENDERS and qc_audit_passed=false when rendered MP4 takes are missing', async () => {
    const goal = makeSampleGoal('film_auto_stage');
    const report = await runAutonomousProduction(goal, root);

    expect(report.status).toBe('STAGED_AWAITING_RENDERS');
    expect(report.film_id).toBe('film_auto_stage');
    expect(report.total_shots).toBe(2);
    expect(report.total_runtime_s).toBe(8);
    expect(report.otio_timeline_path).toContain('.otio');
    expect(report.fcpxml_timeline_path).toContain('.fcpxml');
    expect(report.rough_cut_path).toBeUndefined();
    expect(report.qc_audit_passed).toBe(false);
    expect(report.qc_issues.length).toBeGreaterThanOrEqual(2);
  });

  it('returns COMPLETED and qc_audit_passed=true when real FFmpeg takes pass auditTake and rough_cut.mp4 decodes cleanly', async () => {
    const goal = makeSampleGoal('film_auto_done');

    // Stage 1: create film, shots, and initial timeline
    const staged = await runAutonomousProduction(goal, root);
    expect(staged.status).toBe('STAGED_AWAITING_RENDERS');

    // Render real moving textured MP4 takes for both shots
    const paths = studioPaths(root);
    await mkdir(join(paths.rendersDir('film_auto_done'), 'job_s01'), { recursive: true });
    await mkdir(join(paths.rendersDir('film_auto_done'), 'job_s02'), { recursive: true });

    await execFile('ffmpeg', [
      '-y', '-f', 'lavfi', '-i', 'testsrc=size=360x640:rate=24:duration=1',
      '-f', 'lavfi', '-i', 'sine=frequency=440:duration=1',
      '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-c:a', 'aac',
      join(paths.rendersDir('film_auto_done'), 'job_s01', 'shot.mp4'),
    ]);
    await execFile('ffmpeg', [
      '-y', '-f', 'lavfi', '-i', 'testsrc2=size=360x640:rate=24:duration=1',
      '-f', 'lavfi', '-i', 'sine=frequency=520:duration=1',
      '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-c:a', 'aac',
      join(paths.rendersDir('film_auto_done'), 'job_s02', 'shot.mp4'),
    ]);

    const s1 = await readJson<ShotRecord>(paths.shotPath('film_auto_done', 'shot_01'));
    s1.takes = [{ jobId: 'job_s01', verdict: 'pending' }];
    await writeJsonAtomic(paths.shotPath('film_auto_done', 'shot_01'), s1);

    const s2 = await readJson<ShotRecord>(paths.shotPath('film_auto_done', 'shot_02'));
    s2.takes = [{ jobId: 'job_s02', verdict: 'pending' }];
    await writeJsonAtomic(paths.shotPath('film_auto_done', 'shot_02'), s2);

    // Stage 2: run autonomous production again to audit takes, assemble rough_cut.mp4, and finalize
    const report = await runAutonomousProduction(goal, root);

    expect(report.status).toBe('COMPLETED');
    expect(report.qc_audit_passed).toBe(true);
    expect(report.qc_issues).toEqual([]);
    expect(report.rough_cut_path).toContain('rough_cut.mp4');

    const st = await stat(report.rough_cut_path!);
    expect(st.isFile()).toBe(true);

    const { stdout } = await execFile('ffprobe', [
      '-v', 'quiet', '-print_format', 'json', '-show_format', '-show_streams', report.rough_cut_path!,
    ]);
    const probe = JSON.parse(stdout);
    const vStream = probe.streams.find((s: any) => s.codec_type === 'video');
    expect(vStream).toBeDefined();
    expect(Number(probe.format.duration)).toBeGreaterThanOrEqual(1.8);
  }, 20_000);

  it('returns FAILED and qc_audit_passed=false when a rendered take is solid black and fails auditTake', async () => {
    const goal = makeSampleGoal('film_auto_qc_fail');
    await runAutonomousProduction(goal, root);

    const paths = studioPaths(root);
    await mkdir(join(paths.rendersDir('film_auto_qc_fail'), 'job_bad'), { recursive: true });
    await mkdir(join(paths.rendersDir('film_auto_qc_fail'), 'job_good'), { recursive: true });

    await execFile('ffmpeg', [
      '-y', '-f', 'lavfi', '-i', 'color=c=black:size=360x640:rate=24:duration=1',
      '-c:v', 'libx264', '-pix_fmt', 'yuv420p',
      join(paths.rendersDir('film_auto_qc_fail'), 'job_bad', 'shot.mp4'),
    ]);
    await execFile('ffmpeg', [
      '-y', '-f', 'lavfi', '-i', 'testsrc=size=360x640:rate=24:duration=1',
      '-c:v', 'libx264', '-pix_fmt', 'yuv420p',
      join(paths.rendersDir('film_auto_qc_fail'), 'job_good', 'shot.mp4'),
    ]);

    const s1 = await readJson<ShotRecord>(paths.shotPath('film_auto_qc_fail', 'shot_01'));
    s1.takes = [{ jobId: 'job_bad', verdict: 'pending' }];
    await writeJsonAtomic(paths.shotPath('film_auto_qc_fail', 'shot_01'), s1);

    const s2 = await readJson<ShotRecord>(paths.shotPath('film_auto_qc_fail', 'shot_02'));
    s2.takes = [{ jobId: 'job_good', verdict: 'pending' }];
    await writeJsonAtomic(paths.shotPath('film_auto_qc_fail', 'shot_02'), s2);

    const report = await runAutonomousProduction(goal, root);

    expect(report.status).toBe('FAILED');
    expect(report.qc_audit_passed).toBe(false);
    expect(report.rough_cut_path).toBeUndefined();
    expect(report.qc_issues.some((i) => i.includes('shot_01'))).toBe(true);
  }, 20_000);
});
