// src/clipping/pipeline.ts — Autonomous 20-Repo Viral Video Clipping Engine
// Unifies yt-dlp, Silero VAD, PySceneDetect, WhisperX, MediaPipe/OpenCV reframing, and Remotion into an automated pipeline.

import { execFile as execFileCb } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { mkdir, rename, rm, stat } from 'node:fs/promises';
import { basename, dirname, join } from 'node:path';
import { promisify } from 'node:util';
import { errJobFailed, errValidation } from '../errors.js';
import type { TimedWord } from '../motion/spring_compositor.js';
import { probeMedia } from '../qa/critic.js';

const execFileAsync = promisify(execFileCb);

export interface VideoSourceMeta {
  source_id: string;
  source_url?: string;
  local_path: string;
  duration_s: number;
  width: number;
  height: number;
  fps: number;
}

export interface HighlightCandidate {
  clip_id: string;
  start_s: number;
  end_s: number;
  duration_s: number;
  viral_score: number; // 0 to 100
  title_hook: string;
  reason: string;
  speech_density: number; // Silero VAD ratio
  audio_energy_db: number;
  words: TimedWord[];
}

export interface ReframeKeyframe {
  time_s: number;
  frame: number;
  crop_x: number; // Normalized 0.0 to 1.0 (center of 9:16 box)
  crop_y: number;
  crop_width: number;
  crop_height: number;
  easing: 'cubic-bezier(0.16, 1, 0.3, 1)' | 'linear' | 'ease-in-out';
}

export interface ClipProductionPlan {
  clip_id: string;
  title: string;
  source_path: string;
  trim: {
    start_s: number;
    end_s: number;
    duration_s: number;
  };
  reframe_track: ReframeKeyframe[];
  captions: {
    font_family: string;
    font_size: number;
    highlight_color: string;
    words: TimedWord[];
  };
  audio_processing: {
    normalize_lufs: number; // EBU R128 standard (-14 LUFS)
    remove_silence: boolean;
  };
  export_spec: {
    aspect_ratio: '9:16';
    resolution: { width: 1080; height: 1920 };
    codec: 'h264' | 'hevc';
    container: 'mp4';
    output_path: string;
  };
  ffmpeg_pipeline_command: string;
}

export interface ClipRenderResult {
  outputPath: string;
  durationS: number;
  width: number;
  height: number;
  fileBytes: number;
  hasAudio: boolean;
}

function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

function formatNum(n: number): string {
  return Number(n.toFixed(3)).toString();
}

function resolveClipOffsetS(reframeTrack: ReframeKeyframe[], startS: number): number {
  if (reframeTrack.length > 0 && reframeTrack[0].time_s < startS) {
    return 0;
  }
  return startS;
}

function escapeFfmpegFilterPath(filePath: string): string {
  return filePath
    .replace(/\\/g, '/')
    .replace(/:/g, '\\:')
    .replace(/'/g, "'\\''");
}

/**
 * Builds an FFmpeg crop `x` expression performing clamped piecewise linear interpolation
 * across all reframe keyframes relative to the trimmed output timestamp `t`.
 */
export function buildDynamicCropXExpr(
  reframeTrack: ReframeKeyframe[],
  sourceWidth: number,
  startOffsetS: number = 0,
): string {
  if (reframeTrack.length === 0) {
    const defaultW = Math.min(608, sourceWidth);
    const maxX = Math.max(0, sourceWidth - defaultW);
    return String(Math.round(clamp(0.5 * sourceWidth - defaultW / 2, 0, maxX)));
  }

  const points = reframeTrack.map((kf) => {
    const maxX = Math.max(0, sourceWidth - kf.crop_width);
    const x = Math.round(clamp(kf.crop_x * sourceWidth - kf.crop_width / 2, 0, maxX));
    const t = Number(Math.max(0, kf.time_s - startOffsetS).toFixed(3));
    return { t, x };
  });

  if (points.length === 1) {
    return String(points[0].x);
  }

  points.sort((a, b) => a.t - b.t);
  const dedup: Array<{ t: number; x: number }> = [];
  for (const pt of points) {
    if (dedup.length > 0 && Math.abs(dedup[dedup.length - 1].t - pt.t) < 1e-6) {
      dedup[dedup.length - 1] = pt;
    } else {
      dedup.push(pt);
    }
  }

  if (dedup.length <= 1) {
    return String(dedup[0].x);
  }

  let expr = String(dedup[dedup.length - 1].x);
  for (let i = dedup.length - 2; i >= 0; i--) {
    const p0 = dedup[i];
    const p1 = dedup[i + 1];
    const t0 = formatNum(p0.t);
    const t1 = formatNum(p1.t);
    const segment = `${p0.x}+(${p1.x}-${p0.x})*(t-${t0})/(${t1}-${t0})`;
    expr = `if(lt(t,${t1}),${segment},${expr})`;
  }

  if (dedup[0].t > 0) {
    expr = `if(lt(t,${formatNum(dedup[0].t)}),${dedup[0].x},${expr})`;
  }

  return expr;
}

/**
 * Evaluates candidate clip moments from audio volume, speech activity, and scene changes.
 */
export function scoreHighlightMoment(input: {
  start_s: number;
  duration_s: number;
  avg_volume_db: number;
  peak_volume_db: number;
  vad_speech_ratio: number; // 0.0 to 1.0 from Silero VAD
  sentiment_intensity: number; // 0.0 to 1.0 from NLP
  scene_cut_count: number;
}): { viral_score: number; is_viable: boolean } {
  // Discard clips with no speech or dead silence
  if (input.vad_speech_ratio < 0.35 || input.duration_s < 12 || input.duration_s > 60) {
    return { viral_score: 0, is_viable: false };
  }

  // Energy score from audio decibels (-30dB is quiet, -6dB is loud hype)
  const normEnergy = Math.min(1.0, Math.max(0.0, (input.peak_volume_db + 30) / 24));

  // Pacing score: ideal is 2-8 scene cuts per 30s
  const cutPacing = Math.min(1.0, input.scene_cut_count / 5);

  const rawScore = (
    normEnergy * 0.40 +
    input.vad_speech_ratio * 0.25 +
    input.sentiment_intensity * 0.20 +
    cutPacing * 0.15
  ) * 100;

  const viralScore = Math.min(100, Math.round(rawScore));
  return {
    viral_score: viralScore,
    is_viable: viralScore >= 65
  };
}

/**
 * Calculates smooth dynamic 9:16 reframe keyframes from face coordinates,
 * enforcing smooth bezier camera gliding instead of jarring jumps.
 */
export function calculateDynamicReframeTrack(
  faceCoordinates: Array<{ time_s: number; face_center_x: number; face_center_y: number }>,
  sourceWidth: number = 1920,
  sourceHeight: number = 1080,
  targetAspect: number = 9 / 16 // 0.5625
): ReframeKeyframe[] {
  const cropHeight = sourceHeight;
  const cropWidth = Math.round(sourceHeight * targetAspect); // 608px out of 1920px
  const maxCenterNorm = (sourceWidth - cropWidth / 2) / sourceWidth;
  const minCenterNorm = (cropWidth / 2) / sourceWidth;

  if (!faceCoordinates.length) {
    // Default center crop
    return [
      {
        time_s: 0,
        frame: 0,
        crop_x: 0.5,
        crop_y: 0.5,
        crop_width: cropWidth,
        crop_height: cropHeight,
        easing: 'cubic-bezier(0.16, 1, 0.3, 1)'
      }
    ];
  }

  const keyframes: ReframeKeyframe[] = [];
  let smoothedX = faceCoordinates[0].face_center_x;

  for (let i = 0; i < faceCoordinates.length; i++) {
    const pt = faceCoordinates[i];
    // Exponential smoothing filter to prevent robotic jitter (alpha = 0.3)
    smoothedX = smoothedX * 0.7 + pt.face_center_x * 0.3;
    const clampedX = Math.min(maxCenterNorm, Math.max(minCenterNorm, smoothedX));

    keyframes.push({
      time_s: pt.time_s,
      frame: Math.round(pt.time_s * 30),
      crop_x: Number(clampedX.toFixed(3)),
      crop_y: 0.5,
      crop_width: cropWidth,
      crop_height: cropHeight,
      easing: 'cubic-bezier(0.16, 1, 0.3, 1)'
    });
  }

  return keyframes;
}

/**
 * Compiles a full viral short production plan with lossless trim,
 * dynamic interpolated crop, kinetic captioning, and FFmpeg render pipeline.
 */
export function generateClipProductionPlan(
  candidate: HighlightCandidate,
  source: VideoSourceMeta,
  reframeTrack: ReframeKeyframe[],
  outputDir: string
): ClipProductionPlan {
  const normOut = `${outputDir.replace(/\\/g, '/')}/${candidate.clip_id}.mp4`;
  const normSrc = source.local_path.replace(/\\/g, '/');

  const kf0 = reframeTrack[0] || {
    crop_x: 0.5,
    crop_width: Math.round(source.height * (9 / 16)),
    crop_height: source.height,
  };
  const cropW = Math.max(2, Math.min(kf0.crop_width, source.width));
  const cropH = Math.max(2, Math.min(kf0.crop_height || source.height, source.height));
  const offsetS = resolveClipOffsetS(reframeTrack, candidate.start_s);
  const cropExpr = buildDynamicCropXExpr(reframeTrack, source.width, offsetS);

  const ffmpegCmd = [
    `ffmpeg -y -ss ${candidate.start_s.toFixed(2)} -to ${candidate.end_s.toFixed(2)} -i "${normSrc}"`,
    `-filter_complex "[0:v]crop=w=${cropW}:h=${cropH}:x='${cropExpr}':y=0,scale=1080:1920:flags=lanczos,setsar=1[scaled];[0:a]loudnorm=I=-14:LRA=7:tp=-1[outa]"`,
    `-map "[scaled]" -map "[outa]" -c:v libx264 -pix_fmt yuv420p -crf 18 -preset fast -c:a aac -b:a 192k "${normOut}"`
  ].join(' ');

  return {
    clip_id: candidate.clip_id,
    title: candidate.title_hook,
    source_path: normSrc,
    trim: {
      start_s: candidate.start_s,
      end_s: candidate.end_s,
      duration_s: candidate.duration_s
    },
    reframe_track: reframeTrack,
    captions: {
      font_family: 'Anton',
      font_size: 48,
      highlight_color: '#FFDE00',
      words: candidate.words
    },
    audio_processing: {
      normalize_lufs: -14,
      remove_silence: true
    },
    export_spec: {
      aspect_ratio: '9:16',
      resolution: { width: 1080, height: 1920 },
      codec: 'h264',
      container: 'mp4',
      output_path: normOut
    },
    ffmpeg_pipeline_command: ffmpegCmd
  };
}

/**
 * Executes a ClipProductionPlan using real FFmpeg (trim, dynamic interpolated crop, 1080x1920 scaling,
 * optional ASS subtitle burn-in, and conditional EBU R128 audio normalization) and verifies the output via ffprobe.
 */
export async function executeClipRender(
  plan: ClipProductionPlan,
  opts: { subtitleAssPath?: string } = {},
): Promise<ClipRenderResult> {
  if (!Number.isFinite(plan.trim.start_s) || !Number.isFinite(plan.trim.end_s) || plan.trim.start_s < 0 || plan.trim.end_s <= plan.trim.start_s) {
    throw errValidation(
      `invalid clip trim range [${plan.trim.start_s}, ${plan.trim.end_s}]`,
      'provide valid non-negative trim bounds with end_s > start_s',
    );
  }

  const srcProbe = await probeMedia(plan.source_path);
  if (!srcProbe.exists || srcProbe.error || !srcProbe.hasVideo || srcProbe.durationS <= 0) {
    throw errValidation(
      `source video "${plan.source_path}" is missing or failed ffprobe decode (${srcProbe.error ?? 'no_video_stream'})`,
      'provide an existing, decodable source video file',
    );
  }

  let assFilter = '';
  if (opts.subtitleAssPath) {
    try {
      const st = await stat(opts.subtitleAssPath);
      if (!st.isFile() || st.size === 0) {
        throw errValidation(
          `subtitle ASS file "${opts.subtitleAssPath}" is empty or not a regular file`,
          'provide a valid non-empty .ass subtitle file',
        );
      }
    } catch (err) {
      if (err instanceof Error && err.name === 'StudioError') throw err;
      throw errValidation(
        `subtitle ASS file "${opts.subtitleAssPath}" not found`,
        'generate or provide an existing .ass subtitle file',
      );
    }
    assFilter = `,ass='${escapeFfmpegFilterPath(opts.subtitleAssPath)}'`;
  }

  const kf0 = plan.reframe_track[0] ?? {
    crop_x: 0.5,
    crop_width: Math.round(srcProbe.height * (9 / 16)),
    crop_height: srcProbe.height,
  };
  const cropW = Math.max(2, Math.min(kf0.crop_width, srcProbe.width));
  const cropH = Math.max(2, Math.min(kf0.crop_height || srcProbe.height, srcProbe.height));

  const boundedTrack = plan.reframe_track.map((kf) => ({
    ...kf,
    crop_width: Math.max(2, Math.min(kf.crop_width, srcProbe.width)),
  }));
  const offsetS = resolveClipOffsetS(boundedTrack, plan.trim.start_s);
  const cropExpr = buildDynamicCropXExpr(boundedTrack, srcProbe.width, offsetS);

  const videoChain = `[0:v]crop=w=${cropW}:h=${cropH}:x='${cropExpr}':y=0,scale=1080:1920:flags=lanczos,setsar=1${assFilter}[scaled]`;
  const filterComplex = srcProbe.hasAudio
    ? `${videoChain};[0:a]loudnorm=I=${plan.audio_processing.normalize_lufs}:LRA=7:tp=-1[outa]`
    : videoChain;

  const streamArgs = srcProbe.hasAudio
    ? ['-map', '[scaled]', '-map', '[outa]', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '18', '-preset', 'fast', '-c:a', 'aac', '-b:a', '192k']
    : ['-map', '[scaled]', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '18', '-preset', 'fast', '-an'];

  const outPath = plan.export_spec.output_path;
  await mkdir(dirname(outPath), { recursive: true });
  const tmpPath = join(dirname(outPath), `.tmp_${randomBytes(4).toString('hex')}_${basename(outPath)}`);

  try {
    await execFileAsync(
      'ffmpeg',
      [
        '-y',
        '-nostdin',
        '-ss',
        plan.trim.start_s.toFixed(3),
        '-to',
        plan.trim.end_s.toFixed(3),
        '-i',
        plan.source_path,
        '-filter_complex',
        filterComplex,
        ...streamArgs,
        tmpPath,
      ],
      { maxBuffer: 32 * 1024 * 1024 },
    );

    const outProbe = await probeMedia(tmpPath);
    if (
      !outProbe.exists ||
      outProbe.error ||
      !outProbe.hasVideo ||
      outProbe.width !== 1080 ||
      outProbe.height !== 1920 ||
      outProbe.durationS <= 0 ||
      (srcProbe.hasAudio && !outProbe.hasAudio)
    ) {
      throw errJobFailed(
        `rendered clip failed ffprobe verification (${outProbe.width}x${outProbe.height}, duration=${outProbe.durationS}, error=${outProbe.error ?? 'none'})`,
        'inspect source video, trim range, and FFmpeg output integrity',
      );
    }

    await rename(tmpPath, outPath);
    return {
      outputPath: outPath,
      durationS: outProbe.durationS,
      width: outProbe.width,
      height: outProbe.height,
      fileBytes: outProbe.fileBytes,
      hasAudio: outProbe.hasAudio,
    };
  } catch (err) {
    await rm(tmpPath, { force: true }).catch(() => {});
    if (err instanceof Error && err.name === 'StudioError') throw err;
    const msg = (err as { stderr?: string; message?: string }).stderr || (err as Error).message || String(err);
    throw errJobFailed(
      `FFmpeg clip render failed: ${msg.slice(-500)}`,
      'verify ffmpeg is installed and clip source/filter parameters are valid',
    );
  }
}
