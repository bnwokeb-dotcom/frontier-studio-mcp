// test/clipping/pipeline.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, rm, writeFile, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFile as execFileCb } from 'node:child_process';
import { promisify } from 'node:util';
import {
  scoreHighlightMoment,
  calculateDynamicReframeTrack,
  generateClipProductionPlan,
  buildDynamicCropXExpr,
  executeClipRender,
  extractViralHookVariants,
  computeDeadAirJumpCuts,
  generateKineticAssSubtitles,
  autoSpotClipSfx,
  type HighlightCandidate,
  type VideoSourceMeta,
  type ReframeKeyframe,
} from '../../src/clipping/pipeline.js';
import { probeMedia } from '../../src/qa/critic.js';
import { StudioError } from '../../src/errors.js';

const execFile = promisify(execFileCb);

describe('Autonomous 20-Repo Viral Video Clipping Pipeline', () => {
  let root: string;

  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'fsm-clip-'));
  });

  afterEach(async () => {
    await rm(root, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
  });

  it('correctly scores viral highlight moments and filters out dead silence', () => {
    // Dead air test
    const deadAir = scoreHighlightMoment({
      start_s: 10,
      duration_s: 20,
      avg_volume_db: -45,
      peak_volume_db: -38,
      vad_speech_ratio: 0.1, // only 10% speech
      sentiment_intensity: 0.1,
      scene_cut_count: 0,
    });
    expect(deadAir.is_viable).toBe(false);
    expect(deadAir.viral_score).toBe(0);

    // High-energy highlight (streamer screams, cuts happen, speech continuous)
    const hypeMoment = scoreHighlightMoment({
      start_s: 120,
      duration_s: 30,
      avg_volume_db: -14,
      peak_volume_db: -6,
      vad_speech_ratio: 0.85,
      sentiment_intensity: 0.9,
      scene_cut_count: 4,
    });
    expect(hypeMoment.is_viable).toBe(true);
    expect(hypeMoment.viral_score).toBeGreaterThanOrEqual(80);
  });

  it('calculates smooth dynamic 9:16 reframe keyframes from face coordinates', () => {
    const facePoints = [
      { time_s: 0.0, face_center_x: 0.3, face_center_y: 0.4 },
      { time_s: 1.0, face_center_x: 0.35, face_center_y: 0.4 },
      { time_s: 2.0, face_center_x: 0.7, face_center_y: 0.4 }, // Sudden jump to right
    ];

    const track = calculateDynamicReframeTrack(facePoints, 1920, 1080);
    expect(track.length).toBe(3);

    // Initial frame should start around 0.30
    expect(track[0].crop_x).toBeCloseTo(0.3, 1);
    // At time 2.0, smoothing filter prevents an immediate leap to 0.70
    expect(track[2].crop_x).toBeLessThan(0.7);
    expect(track[2].crop_width).toBe(608); // 1080 * (9/16)
  });

  it('generates piecewise linear FFmpeg crop x-expression across multiple moving keyframes', () => {
    const movingTrack: ReframeKeyframe[] = [
      { time_s: 10.0, frame: 300, crop_x: 0.25, crop_y: 0.5, crop_width: 608, crop_height: 1080, easing: 'linear' },
      { time_s: 11.0, frame: 330, crop_x: 0.5, crop_y: 0.5, crop_width: 608, crop_height: 1080, easing: 'linear' },
      { time_s: 12.0, frame: 360, crop_x: 0.8, crop_y: 0.5, crop_width: 608, crop_height: 1080, easing: 'linear' },
    ];

    const expr = buildDynamicCropXExpr(movingTrack, 1920, 10.0);
    // x0 = round(0.25*1920 - 304) = 176, x1 = round(960 - 304) = 656, x2 = round(1536 - 304) = 1232
    expect(expr).toContain('if(lt(t,1)');
    expect(expr).toContain('if(lt(t,2)');
    expect(expr).toContain('176+(656-176)*(t-0)/(1-0)');
    expect(expr).toContain('656+(1232-656)*(t-1)/(2-1)');
    expect(expr).toContain('1232');

    // Single keyframe emits exact clamped integer
    expect(buildDynamicCropXExpr([movingTrack[0]], 1920, 10.0)).toBe('176');

    // Clamps extreme coordinates within [0, sourceWidth - cropWidth]
    const clampedTrack: ReframeKeyframe[] = [
      { time_s: 0, frame: 0, crop_x: 0.0, crop_y: 0.5, crop_width: 608, crop_height: 1080, easing: 'linear' },
      { time_s: 1, frame: 30, crop_x: 1.0, crop_y: 0.5, crop_width: 608, crop_height: 1080, easing: 'linear' },
    ];
    const clampedExpr = buildDynamicCropXExpr(clampedTrack, 1920, 0);
    expect(clampedExpr).toContain('0+(1312-0)*(t-0)/(1-0)');
  });

  it('generates an executable FFmpeg GPU production plan with dynamic crop expression and EBU R128 normalization', () => {
    const candidate: HighlightCandidate = {
      clip_id: 'gta6_trailer_hype_01',
      start_s: 18.0,
      end_s: 48.0,
      duration_s: 30.0,
      viral_score: 94,
      title_hook: 'VICE CITY HITS DIFFERENT',
      reason: 'Fast car chase with police sirens and high transcript engagement',
      speech_density: 0.8,
      audio_energy_db: -6.4,
      words: [
        { word: 'VICE', start_s: 18.2, end_s: 18.6 },
        { word: 'CITY', start_s: 18.6, end_s: 19.0 },
        { word: 'HITS', start_s: 19.0, end_s: 19.3 },
        { word: 'DIFFERENT', start_s: 19.3, end_s: 19.8 },
      ],
    };

    const source: VideoSourceMeta = {
      source_id: 'gta_vi_trailer_01',
      local_path: 'C:/media/gta6_trailer.mp4',
      duration_s: 90.0,
      width: 1920,
      height: 1080,
      fps: 60,
    };

    const reframe = calculateDynamicReframeTrack(
      [
        { time_s: 18.0, face_center_x: 0.3, face_center_y: 0.5 },
        { time_s: 20.0, face_center_x: 0.5, face_center_y: 0.5 },
        { time_s: 22.0, face_center_x: 0.7, face_center_y: 0.5 },
      ],
      1920,
      1080,
    );

    const plan = generateClipProductionPlan(candidate, source, reframe, 'C:/output/shorts');

    expect(plan.clip_id).toBe('gta6_trailer_hype_01');
    expect(plan.export_spec.resolution).toEqual({ width: 1080, height: 1920 });
    expect(plan.ffmpeg_pipeline_command).toContain('-ss 18.00 -to 48.00');
    expect(plan.ffmpeg_pipeline_command).toContain("x='if(lt(t,2)");
    expect(plan.ffmpeg_pipeline_command).toContain('loudnorm=I=-14');
    expect(plan.ffmpeg_pipeline_command).toContain('scale=1080:1920');
  });

  it('executes real FFmpeg clip render with dynamic crop, ASS subtitles, and audio -> 1080x1920 MP4 verified by ffprobe', async () => {
    const sourcePath = join(root, 'landscape_source.mp4');
    const assPath = join(root, 'captions.ass');
    const outDir = join(root, 'shorts_out');

    // Generate 3s 1920x1080 video + audio fixture
    await execFile('ffmpeg', [
      '-y',
      '-f', 'lavfi', '-i', 'testsrc2=size=1920x1080:rate=24:duration=3',
      '-f', 'lavfi', '-i', 'sine=frequency=440:duration=3',
      '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-c:a', 'aac',
      sourcePath,
    ]);

    await writeFile(
      assPath,
      `[Script Info]
ScriptType: v4.00+
PlayResX: 1080
PlayResY: 1920

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,Arial,54,&H0000DEFF,&H00FFFFFF,&H00000000,&H00000000,1,0,0,0,100,100,0,0,1,3,0,2,20,20,160,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
Dialogue: 0,0:00:00.00,0:00:02.00,Default,,0,0,0,,DYNAMIC CROP TEST
`,
      'utf8',
    );

    const candidate: HighlightCandidate = {
      clip_id: 'real_clip_01',
      start_s: 0.5,
      end_s: 2.5,
      duration_s: 2.0,
      viral_score: 92,
      title_hook: 'DYNAMIC CROP TEST',
      reason: 'Moving subject',
      speech_density: 0.9,
      audio_energy_db: -8,
      words: [],
    };
    const source: VideoSourceMeta = {
      source_id: 'src_landscape',
      local_path: sourcePath,
      duration_s: 3.0,
      width: 1920,
      height: 1080,
      fps: 24,
    };
    const reframe = calculateDynamicReframeTrack(
      [
        { time_s: 0.5, face_center_x: 0.25, face_center_y: 0.5 },
        { time_s: 1.5, face_center_x: 0.5, face_center_y: 0.5 },
        { time_s: 2.5, face_center_x: 0.75, face_center_y: 0.5 },
      ],
      1920,
      1080,
    );

    const plan = generateClipProductionPlan(candidate, source, reframe, outDir);
    const result = await executeClipRender(plan, { subtitleAssPath: assPath });

    expect(result.outputPath).toBe(plan.export_spec.output_path);
    expect(result.width).toBe(1080);
    expect(result.height).toBe(1920);
    expect(result.hasAudio).toBe(true);
    expect(result.fileBytes).toBeGreaterThan(1000);
    expect(result.durationS).toBeGreaterThanOrEqual(1.7);

    const probe = await probeMedia(result.outputPath);
    expect(probe.exists).toBe(true);
    expect(probe.hasVideo).toBe(true);
    expect(probe.hasAudio).toBe(true);
    expect(probe.width).toBe(1080);
    expect(probe.height).toBe(1920);
  }, 25_000);

  it('handles video-only clips safely without failing -map [outa] and rejects corrupt/missing source_path', async () => {
    const videoOnlyPath = join(root, 'silent_landscape.mp4');
    await execFile('ffmpeg', [
      '-y',
      '-f', 'lavfi', '-i', 'testsrc=size=1280x720:rate=24:duration=2',
      '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-an',
      videoOnlyPath,
    ]);

    const candidate: HighlightCandidate = {
      clip_id: 'silent_clip_01',
      start_s: 0.0,
      end_s: 1.5,
      duration_s: 1.5,
      viral_score: 85,
      title_hook: 'SILENT CLIP',
      reason: 'Visual only',
      speech_density: 0.5,
      audio_energy_db: -12,
      words: [],
    };
    const source: VideoSourceMeta = {
      source_id: 'src_silent',
      local_path: videoOnlyPath,
      duration_s: 2.0,
      width: 1280,
      height: 720,
      fps: 24,
    };
    const reframe = calculateDynamicReframeTrack(
      [
        { time_s: 0.0, face_center_x: 0.35, face_center_y: 0.5 },
        { time_s: 1.5, face_center_x: 0.65, face_center_y: 0.5 },
      ],
      1280,
      720,
    );
    const plan = generateClipProductionPlan(candidate, source, reframe, join(root, 'out_silent'));
    const res = await executeClipRender(plan);
    expect(res.width).toBe(1080);
    expect(res.height).toBe(1920);
    expect(res.hasAudio).toBe(false);

    const probe = await probeMedia(res.outputPath);
    expect(probe.hasVideo).toBe(true);
    expect(probe.hasAudio).toBe(false);
    expect(probe.width).toBe(1080);
    expect(probe.height).toBe(1920);

    // Missing source file refuses cleanly
    const missingPlan = generateClipProductionPlan(
      candidate,
      { ...source, local_path: join(root, 'does_not_exist.mp4') },
      reframe,
      join(root, 'out_missing'),
    );
    await expect(executeClipRender(missingPlan)).rejects.toThrow(StudioError);

    // Corrupt text file refuses cleanly
    const corruptPath = join(root, 'corrupt.mp4');
    await writeFile(corruptPath, 'not a real mp4 file', 'utf8');
    const corruptPlan = generateClipProductionPlan(
      candidate,
      { ...source, local_path: corruptPath },
      reframe,
      join(root, 'out_corrupt'),
    );
    await expect(executeClipRender(corruptPlan)).rejects.toThrow(StudioError);
    await expect(stat(corruptPlan.export_spec.output_path)).rejects.toThrow();
  }, 25_000);

  it('prevents crop x + cropW overflow on 720x1280 sources with empty reframeTrack and mixed-width keyframes', async () => {
    // 1. Empty reframeTrack on 720x1280 (cropW = round(1280 * 9/16) = 720, so x MUST be 0, not 56!)
    expect(buildDynamicCropXExpr([], 720, 0, 720)).toBe('0');

    // 2. Mixed-width keyframes where kf[1].crop_width < targetCropWidth (300 < 720) on 1000px wide source
    const mixedTrack: ReframeKeyframe[] = [
      { time_s: 0, frame: 0, crop_x: 0.5, crop_y: 0.5, crop_width: 720, crop_height: 1280, easing: 'linear' },
      { time_s: 1, frame: 24, crop_x: 1.0, crop_y: 0.5, crop_width: 300, crop_height: 1280, easing: 'linear' },
    ];
    const expr = buildDynamicCropXExpr(mixedTrack, 1000, 0, 720);
    // For targetCropWidth=720 on width=1000, maxX is 1000 - 720 = 280 (never 1000 - 300 = 700)
    expect(expr).toContain('140+(280-140)*(t-0)/(1-0)');
    expect(expr).not.toContain('700');

    // 3. Real FFmpeg render on 720x1280 fixture with empty [] track and mixed-width track
    const verticalSrc = join(root, 'vertical_720x1280.mp4');
    await execFile('ffmpeg', [
      '-y',
      '-f', 'lavfi', '-i', 'testsrc=size=720x1280:rate=24:duration=2',
      '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-an',
      verticalSrc,
    ]);

    const candidate: HighlightCandidate = {
      clip_id: 'portrait_empty_track',
      start_s: 0.0,
      end_s: 1.5,
      duration_s: 1.5,
      viral_score: 88,
      title_hook: 'PORTRAIT EMPTY TRACK',
      reason: '720x1280 portrait source',
      speech_density: 0.8,
      audio_energy_db: -10,
      words: [],
    };
    const source: VideoSourceMeta = {
      source_id: 'src_720p_portrait',
      local_path: verticalSrc,
      duration_s: 2.0,
      width: 720,
      height: 1280,
      fps: 24,
    };

    const emptyPlan = generateClipProductionPlan(candidate, source, [], join(root, 'out_720_empty'));
    expect(emptyPlan.ffmpeg_pipeline_command).toContain("crop=w=720:h=1280:x='0':y=0");
    const emptyRes = await executeClipRender(emptyPlan);
    expect(emptyRes.width).toBe(1080);
    expect(emptyRes.height).toBe(1920);

    const mixedPortraitTrack: ReframeKeyframe[] = [
      { time_s: 0.0, frame: 0, crop_x: 0.5, crop_y: 0.5, crop_width: 720, crop_height: 1280, easing: 'linear' },
      { time_s: 1.0, frame: 24, crop_x: 1.0, crop_y: 0.5, crop_width: 300, crop_height: 1280, easing: 'linear' },
    ];
    const mixedPlan = generateClipProductionPlan(
      { ...candidate, clip_id: 'portrait_mixed_track' },
      source,
      mixedPortraitTrack,
      join(root, 'out_720_mixed'),
    );
    expect(mixedPlan.ffmpeg_pipeline_command).toContain("crop=w=720:h=1280:x='if(lt(t,1),0+(0-0)*(t-0)/(1-0),0)':y=0");
    const mixedRes = await executeClipRender(mixedPlan);
    expect(mixedRes.width).toBe(1080);
    expect(mixedRes.height).toBe(1920);
  }, 25_000);

  it('extracts A/B viral hooks, trims dead-air pauses, spots synced SFX, and renders captioned + SFX-mixed 9:16 MP4', async () => {
    const words = [
      { word: 'This', start_s: 0.1, end_s: 0.3 },
      { word: 'secret', start_s: 0.35, end_s: 0.65 },
      { word: '$10k', start_s: 0.7, end_s: 1.0 },
      { word: 'trick', start_s: 1.05, end_s: 1.35 },
      // 0.8s dead air gap -> stripped by computeDeadAirJumpCuts
      { word: 'works', start_s: 2.15, end_s: 2.4 },
      { word: 'fast!', start_s: 2.45, end_s: 2.8 },
    ];

    const hooks = extractViralHookVariants(words, 'GTA VI CLIP HACK');
    expect(hooks.length).toBe(3);
    expect(hooks.some((h) => h.hook_text.includes('SECRET'))).toBe(true);

    const cut = computeDeadAirJumpCuts(words, 0.45, 0.05);
    expect(cut.keepSegments.length).toBe(2);
    expect(cut.removedSeconds).toBeGreaterThan(0.5);
    expect(cut.remappedWords.length).toBe(6);

    const assText = generateKineticAssSubtitles(words, { titleHook: 'CLIP THAT' });
    expect(assText).toContain('[V4+ Styles]');
    expect(assText).toContain('CLIP THAT');
    expect(assText).toContain('\\fscx122');

    const srcVideo = join(root, 'source_16_9_audio.mp4');
    await execFile('ffmpeg', [
      '-y',
      '-f', 'lavfi', '-i', 'testsrc=size=1280x720:rate=24:duration=3',
      '-f', 'lavfi', '-i', 'sine=frequency=440:duration=3',
      '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-c:a', 'aac',
      srcVideo,
    ]);

    const candidate: HighlightCandidate = {
      clip_id: 'viral_full_test',
      start_s: 0,
      end_s: 2.9,
      duration_s: 2.9,
      viral_score: 94,
      title_hook: 'CLIP THAT',
      reason: 'secret $10k trick',
      speech_density: 0.85,
      audio_energy_db: -6,
      words,
    };
    const reframe = calculateDynamicReframeTrack([], 1280, 720);
    const plan = generateClipProductionPlan(
      candidate,
      { source_id: 's1', local_path: srcVideo, duration_s: 3, width: 1280, height: 720, fps: 24 },
      reframe,
      join(root, 'out_viral'),
    );
    const sfxSpots = await autoSpotClipSfx(candidate, root);
    expect(sfxSpots.length).toBeGreaterThanOrEqual(2);

    const rendered = await executeClipRender(plan, {
      burnCaptions: true,
      sfxSpots,
      studioRoot: root,
    });

    expect(rendered.width).toBe(1080);
    expect(rendered.height).toBe(1920);
    expect(rendered.burnedCaptions).toBe(true);
    expect(rendered.sfxSpotsMixed).toBe(sfxSpots.length);
  }, 30_000);

  it('wraps long HookCard titles cleanly and strips 2.39:1 letterbox bars during 9:16 render', async () => {
    const assText = generateKineticAssSubtitles([], {
      titleHook: 'SHE HID A BABY DRAGON IN THE FLOOR',
    });
    expect(assText).toContain('WrapStyle: 1');
    expect(assText).toContain('HookCard,Arial,46');
    expect(assText).toContain('SHE HID A BABY DRAGON\\NIN THE FLOOR');

    // Synthesize a 1344x768 source with bright gray active 2.39:1 band (1344x562) padded inside black bars
    const srcLetterboxed = join(root, 'source_239_letterbox.mp4');
    await execFile('ffmpeg', [
      '-y',
      '-f', 'lavfi', '-i', 'color=c=#C8C8C8:s=1344x562:r=24:d=2',
      '-f', 'lavfi', '-i', 'sine=frequency=440:duration=2',
      '-vf', 'pad=1344:768:0:103:black',
      '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-c:a', 'aac',
      srcLetterboxed,
    ]);

    const candidate: HighlightCandidate = {
      clip_id: 'letterbox_crop_test',
      start_s: 0,
      end_s: 1.5,
      duration_s: 1.5,
      viral_score: 90,
      title_hook: 'SHE HID A BABY DRAGON IN THE FLOOR',
      reason: 'borderless vertical crop',
      speech_density: 0.7,
      audio_energy_db: -12,
      words: [],
    };
    const reframe = calculateDynamicReframeTrack([], 1344, 768);
    const plan = generateClipProductionPlan(
      candidate,
      { source_id: 's_lb', local_path: srcLetterboxed, duration_s: 2, width: 1344, height: 768, fps: 24 },
      reframe,
      join(root, 'out_borderless'),
    );

    const rendered = await executeClipRender(plan, {
      studioRoot: root,
      activeContentAspect: 2.39,
    });
    expect(rendered.width).toBe(1080);
    expect(rendered.height).toBe(1920);

    // Measure top 100px strip luminance: with 2.39:1 bars stripped, top strip must match bright gray (~180+ Y), not black (~16 Y)
    const { stderr } = await execFile('ffmpeg', [
      '-i', plan.export_spec.output_path,
      '-vf', 'crop=1080:100:0:0,signalstats,metadata=print',
      '-vframes', '1',
      '-f', 'null', '-',
    ]);
    const yavgMatch = /lavfi\.signalstats\.YAVG=([0-9.]+)/.exec(stderr);
    expect(yavgMatch).not.toBeNull();
    expect(Number(yavgMatch![1])).toBeGreaterThan(150);
  }, 30_000);
});
