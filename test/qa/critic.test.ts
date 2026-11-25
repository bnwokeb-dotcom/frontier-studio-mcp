// test/qa/critic.test.ts — Unit tests for the Automated VLM Critic Gate
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFile as execFileCb } from 'node:child_process';
import { promisify } from 'node:util';
import { auditTake } from '../../src/qa/critic.js';

const execFile = promisify(execFileCb);

describe('VLM Critic Gate (Universal Quality Gauntlet)', () => {
  let root: string;

  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'fsm-critic-'));
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    await rm(root, { recursive: true, force: true });
  });

  it('returns rejected when mp4 path does not exist', async () => {
    const res = await auditTake({
      mp4Path: join(root, 'non_existent_file.mp4'),
      shotId: 'shot_test_01',
      expectedAction: 'Corvus hammers glowing iron',
      durationS: 5,
    });

    expect(res.verdict).toBe('rejected');
    expect(res.score).toBeLessThan(8.5);
    expect(res.reasons).toContain('failed_frame_extraction');
  });

  it('rejects a corrupt non-video file with failed_frame_extraction', async () => {
    const badPath = join(root, 'corrupt.mp4');
    await writeFile(badPath, 'not a real mp4 stream');

    const res = await auditTake({
      mp4Path: badPath,
      shotId: 'shot_corrupt',
      expectedAction: 'Mara opens the iron gate',
      durationS: 2,
    });

    expect(res.verdict).toBe('rejected');
    expect(res.score).toBeLessThan(8.5);
    expect(res.reasons).toContain('failed_frame_extraction');
  });

  it('rejects a pure solid-black MP4 via blackdetect and signalstats', async () => {
    const blackPath = join(root, 'black.mp4');
    await execFile('ffmpeg', [
      '-y',
      '-f', 'lavfi',
      '-i', 'color=c=black:size=640x360:rate=24:duration=1.5',
      '-c:v', 'libx264',
      '-pix_fmt', 'yuv420p',
      blackPath,
    ]);

    const res = await auditTake({
      mp4Path: blackPath,
      shotId: 'shot_black',
      expectedAction: 'Torch illuminates the stone chamber',
      durationS: 1.5,
    });

    expect(res.verdict).toBe('rejected');
    expect(res.score).toBeLessThan(8.5);
    expect(res.reasons.some((r) => r.includes('black') || r.includes('uniform'))).toBe(true);
  });

  it('rejects a static/frozen MP4 with zero inter-frame motion', async () => {
    const frozenPath = join(root, 'frozen.mp4');
    await execFile('ffmpeg', [
      '-y',
      '-f', 'lavfi',
      '-i', 'smptebars=size=640x360:rate=24:duration=1.5',
      '-c:v', 'libx264',
      '-pix_fmt', 'yuv420p',
      frozenPath,
    ]);

    const res = await auditTake({
      mp4Path: frozenPath,
      shotId: 'shot_frozen',
      expectedAction: 'Hero walks swiftly across the courtyard',
      durationS: 1.5,
    });

    expect(res.verdict).toBe('rejected');
    expect(res.score).toBeLessThan(8.5);
    expect(res.reasons).toContain('frozen_video_detected');
  });

  it('rejects a strobe/flicker MP4 with extreme frame-to-frame luminance spikes', async () => {
    const whiteClip = join(root, 'white.mp4');
    const blackClip = join(root, 'black_seg.mp4');
    const listFile = join(root, 'strobe.txt');
    const strobePath = join(root, 'strobe.mp4');

    await execFile('ffmpeg', [
      '-y', '-f', 'lavfi', '-i', 'color=c=white:size=320x180:rate=24:duration=0.25',
      '-c:v', 'libx264', '-pix_fmt', 'yuv420p', whiteClip,
    ]);
    await execFile('ffmpeg', [
      '-y', '-f', 'lavfi', '-i', 'color=c=black:size=320x180:rate=24:duration=0.25',
      '-c:v', 'libx264', '-pix_fmt', 'yuv420p', blackClip,
    ]);
    await writeFile(
      listFile,
      [
        `file '${whiteClip.replace(/\\/g, '/')}'`,
        `file '${blackClip.replace(/\\/g, '/')}'`,
        `file '${whiteClip.replace(/\\/g, '/')}'`,
        `file '${blackClip.replace(/\\/g, '/')}'`,
        `file '${whiteClip.replace(/\\/g, '/')}'`,
        `file '${blackClip.replace(/\\/g, '/')}'`,
      ].join('\n'),
      'utf8',
    );
    await execFile('ffmpeg', ['-y', '-f', 'concat', '-safe', '0', '-i', listFile, '-c', 'copy', strobePath]);

    const res = await auditTake({
      mp4Path: strobePath,
      shotId: 'shot_strobe',
      expectedAction: 'Steady candlelight portrait',
      durationS: 1.5,
    });

    expect(res.verdict).toBe('rejected');
    expect(res.score).toBeLessThan(8.5);
  });

  it('accepts a real moving textured FFmpeg MP4 with deterministic score >= 8.5', async () => {
    const movingPath = join(root, 'moving.mp4');
    await execFile('ffmpeg', [
      '-y',
      '-f', 'lavfi',
      '-i', 'testsrc=size=640x360:rate=24:duration=1.5',
      '-c:v', 'libx264',
      '-pix_fmt', 'yuv420p',
      movingPath,
    ]);

    const res = await auditTake({
      mp4Path: movingPath,
      shotId: 'shot_moving',
      expectedAction: 'Dynamic moving test pattern',
      durationS: 1.5,
    });

    expect(res.verdict).toBe('kept');
    expect(res.score).toBeGreaterThanOrEqual(8.5);
    expect(res.sampleFramePaths).toHaveLength(3);
    expect(res.reasons).toEqual([]);
  });

  it('rejects a video with malformed sub-64px resolution', async () => {
    const tinyPath = join(root, 'tiny.mp4');
    await execFile('ffmpeg', [
      '-y', '-f', 'lavfi', '-i', 'testsrc=size=32x32:rate=24:duration=1',
      '-c:v', 'libx264', '-pix_fmt', 'yuv420p', tinyPath,
    ]);

    const res = await auditTake({
      mp4Path: tinyPath,
      shotId: 'shot_tiny',
      expectedAction: 'Establishing skyline shot',
      durationS: 1,
    });

    expect(res.verdict).toBe('rejected');
    expect(res.score).toBeLessThan(8.5);
    expect(res.reasons).toContain('malformed_resolution');
  });

  it('dispatches VLM inspection with reference sheet and plate when criticApiKey is set', async () => {
    const movingPath = join(root, 'vlm_moving.mp4');
    const sheetPath = join(root, 'sheet.png');
    const platePath = join(root, 'plate.png');
    await execFile('ffmpeg', [
      '-y', '-f', 'lavfi', '-i', 'testsrc=size=640x360:rate=24:duration=1.2',
      '-c:v', 'libx264', '-pix_fmt', 'yuv420p', movingPath,
    ]);
    await writeFile(sheetPath, Buffer.from('fake-sheet-png'));
    await writeFile(platePath, Buffer.from('fake-plate-png'));

    let capturedBody = '';
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (_url, init) => {
      capturedBody = String(init?.body ?? '');
      return new Response(
        JSON.stringify({
          candidates: [
            {
              content: {
                parts: [
                  {
                    text: JSON.stringify({
                      identity_score: 7.2,
                      temporal_stability_score: 7.5,
                      lighting_compliance_score: 8.0,
                      kinematics_score: 7.5,
                      overall_score: 7.5,
                      reasons: ['wardrobe_drift_vs_sheet'],
                      verdict: 'rejected',
                    }),
                  },
                ],
              },
            },
          ],
        }),
        { status: 200 },
      );
    });

    const res = await auditTake({
      mp4Path: movingPath,
      shotId: 'shot_vlm',
      expectedAction: 'Hero walks through alley',
      referenceSheetPath: sheetPath,
      referencePlatePath: platePath,
      durationS: 1.2,
      criticApiKey: 'test-vlm-key',
    });

    expect(capturedBody).toContain('REFERENCE CHARACTER 3-PANEL SHEET');
    expect(capturedBody).toContain('REFERENCE LOCATION / STAGING KEYFRAME PLATE');
    expect(res.verdict).toBe('rejected');
    expect(res.score).toBe(7.5);
    expect(res.reasons).toContain('wardrobe_drift_vs_sheet');
  });
});
