// src/clipping/pipeline.ts — Autonomous 20-Repo Viral Video Clipping Engine
// Unifies yt-dlp, Silero VAD, PySceneDetect, WhisperX, MediaPipe/OpenCV reframing, and Remotion into an automated pipeline.

import { execFile as execFileCb } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { mkdir, rename, rm, stat, writeFile } from 'node:fs/promises';
import { basename, dirname, join } from 'node:path';
import { promisify } from 'node:util';
import { errJobFailed, errValidation } from '../errors.js';
import type { TimedWord } from '../motion/spring_compositor.js';
import { probeMedia } from '../qa/critic.js';
import { computeSfxPlacement, mixSfxOntoMedia, resolveSfxWavPath, type SfxSpot } from '../sfx/sfx_engine.js';

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
  targetCropWidth?: number,
): string {
  if (reframeTrack.length === 0) {
    const defaultW = Math.max(2, Math.min(targetCropWidth ?? Math.min(608, sourceWidth), sourceWidth));
    const maxX = Math.max(0, sourceWidth - defaultW);
    return String(Math.round(clamp(0.5 * sourceWidth - defaultW / 2, 0, maxX)));
  }

  const points = reframeTrack.map((kf) => {
    const activeCropW = Math.max(2, Math.min(targetCropWidth ?? kf.crop_width, sourceWidth));
    const maxX = Math.max(0, sourceWidth - activeCropW);
    const x = Math.round(clamp(kf.crop_x * sourceWidth - activeCropW / 2, 0, maxX));
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
  const cropExpr = buildDynamicCropXExpr(reframeTrack, source.width, offsetS, cropW);

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
  opts: {
    subtitleAssPath?: string;
    burnCaptions?: boolean;
    sfxSpots?: SfxSpot[];
    studioRoot?: string;
    activeContentAspect?: number;
  } = {},
): Promise<ClipRenderResult & { burnedCaptions: boolean; sfxSpotsMixed: number }> {
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

  let autoAssPath: string | undefined;
  let assPathToUse = opts.subtitleAssPath;
  if (!assPathToUse && opts.burnCaptions && plan.captions.words.length > 0) {
    const outDir = dirname(plan.export_spec.output_path);
    await mkdir(outDir, { recursive: true });
    autoAssPath = join(outDir, `.tmp_${randomBytes(4).toString('hex')}_${plan.clip_id}.ass`);
    const assContent = generateKineticAssSubtitles(plan.captions.words, {
      titleHook: plan.title,
      highlightHex: plan.captions.highlight_color,
      clipOffsetS: plan.trim.start_s,
    });
    await writeFile(autoAssPath, assContent, 'utf8');
    assPathToUse = autoAssPath;
  }

  let assFilter = '';
  if (assPathToUse) {
    try {
      const st = await stat(assPathToUse);
      if (!st.isFile() || st.size === 0) {
        throw errValidation(
          `subtitle ASS file "${assPathToUse}" is empty or not a regular file`,
          'provide a valid non-empty .ass subtitle file',
        );
      }
    } catch (err) {
      if (err instanceof Error && err.name === 'StudioError') throw err;
      throw errValidation(
        `subtitle ASS file "${assPathToUse}" not found`,
        'generate or provide an existing .ass subtitle file',
      );
    }
    assFilter = `,ass='${escapeFfmpegFilterPath(assPathToUse)}'`;
  }

  const kf0 = plan.reframe_track[0] ?? {
    crop_x: 0.5,
    crop_width: Math.round(srcProbe.height * (9 / 16)),
    crop_height: srcProbe.height,
  };
  let cropW = Math.max(2, Math.min(kf0.crop_width, srcProbe.width));
  let cropH = Math.max(2, Math.min(kf0.crop_height || srcProbe.height, srcProbe.height));
  let cropY = 0;

  if (opts.activeContentAspect && opts.activeContentAspect > srcProbe.width / srcProbe.height) {
    const activeH = Math.max(2, Math.floor((srcProbe.width / opts.activeContentAspect) / 2) * 2);
    cropH = activeH;
    cropW = Math.max(2, Math.min(Math.floor((activeH * (9 / 16)) / 2) * 2, srcProbe.width));
    cropY = Math.max(0, Math.floor((srcProbe.height - activeH) / 2));
  }

  const offsetS = resolveClipOffsetS(plan.reframe_track, plan.trim.start_s);
  const cropExpr = buildDynamicCropXExpr(plan.reframe_track, srcProbe.width, offsetS, cropW);

  const videoChain = `[0:v]crop=w=${cropW}:h=${cropH}:x='${cropExpr}':y=${cropY},scale=1080:1920:flags=lanczos,setsar=1${assFilter}[scaled]`;
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

    let sfxSpotsMixed = 0;
    if (opts.sfxSpots && opts.sfxSpots.length > 0) {
      const sfxMixedTmp = join(dirname(outPath), `.tmp_sfx_${randomBytes(4).toString('hex')}_${basename(outPath)}`);
      try {
        const mixed = await mixSfxOntoMedia({
          inputMediaPath: tmpPath,
          outputPath: sfxMixedTmp,
          spots: opts.sfxSpots,
          loudnormLufs: plan.audio_processing.normalize_lufs,
        });
        await rm(tmpPath, { force: true }).catch(() => {});
        await rename(sfxMixedTmp, outPath);
        sfxSpotsMixed = mixed.spotsMixed;
      } catch (err) {
        await rm(sfxMixedTmp, { force: true }).catch(() => {});
        throw err;
      }
    } else {
      await rename(tmpPath, outPath);
    }

    const finalProbe = await probeMedia(outPath);
    return {
      outputPath: outPath,
      durationS: finalProbe.durationS || outProbe.durationS,
      width: finalProbe.width || outProbe.width,
      height: finalProbe.height || outProbe.height,
      fileBytes: finalProbe.fileBytes || outProbe.fileBytes,
      hasAudio: finalProbe.hasAudio,
      burnedCaptions: Boolean(assPathToUse),
      sfxSpotsMixed,
    };
  } catch (err) {
    await rm(tmpPath, { force: true }).catch(() => {});
    if (err instanceof Error && err.name === 'StudioError') throw err;
    const msg = (err as { stderr?: string; message?: string }).stderr || (err as Error).message || String(err);
    throw errJobFailed(
      `FFmpeg clip render failed: ${msg.slice(-500)}`,
      'verify ffmpeg is installed and clip source/filter parameters are valid',
    );
  } finally {
    if (autoAssPath) {
      await rm(autoAssPath, { force: true }).catch(() => {});
    }
  }
}

export interface HookVariant {
  variant_id: string;
  strategy: 'curiosity_gap' | 'numeric_proof' | 'climax_teaser';
  hook_text: string;
  teaser_start_s: number;
  teaser_end_s: number;
  viral_hook_score: number;
}

const HOOK_POWER_REGEX = /\b(secret|never|stop|insane|million|billion|warning|truth|glitch|hack|trick|impossible|crazy|watch)\b/i;

/**
 * Generates up to 3 A/B opening hook variants from word-level transcript energy & tension keywords.
 */
export function extractViralHookVariants(words: TimedWord[], fallbackTitle: string): HookVariant[] {
  if (words.length === 0) {
    return [
      {
        variant_id: 'hook_01_curiosity',
        strategy: 'curiosity_gap',
        hook_text: fallbackTitle.toUpperCase(),
        teaser_start_s: 0,
        teaser_end_s: 2.5,
        viral_hook_score: 72,
      },
    ];
  }

  // Sliding window chunks of ~5-7 words to locate peak phrases
  const windows: Array<{ text: string; start: number; end: number; score: number }> = [];
  const winSize = Math.min(6, words.length);
  for (let i = 0; i <= words.length - winSize; i++) {
    const slice = words.slice(i, i + winSize);
    const phrase = slice.map((w) => w.word).join(' ');
    let score = 60;
    if (HOOK_POWER_REGEX.test(phrase)) score += 20;
    if (/\d+|[$%#!]|\?/.test(phrase)) score += 15;
    if (slice[0].start_s < 4) score += 5;
    windows.push({
      text: phrase,
      start: slice[0].start_s,
      end: slice[slice.length - 1].end_s,
      score: Math.min(99, score),
    });
  }

  windows.sort((a, b) => b.score - a.score);
  const top = windows[0] ?? { text: fallbackTitle, start: 0, end: 2.5, score: 75 };
  const second = windows.find((w) => Math.abs(w.start - top.start) > 2.0) ?? top;

  return [
    {
      variant_id: 'hook_01_curiosity',
      strategy: 'curiosity_gap',
      hook_text: fallbackTitle.toUpperCase(),
      teaser_start_s: words[0].start_s,
      teaser_end_s: Math.min(words[words.length - 1].end_s, words[0].start_s + 2.5),
      viral_hook_score: top.score,
    },
    {
      variant_id: 'hook_02_climax_teaser',
      strategy: 'climax_teaser',
      hook_text: top.text.toUpperCase(),
      teaser_start_s: top.start,
      teaser_end_s: top.end,
      viral_hook_score: Math.min(99, top.score + 4),
    },
    {
      variant_id: 'hook_03_numeric_proof',
      strategy: 'numeric_proof',
      hook_text: second.text.toUpperCase(),
      teaser_start_s: second.start,
      teaser_end_s: second.end,
      viral_hook_score: second.score,
    },
  ];
}

/**
 * Strips dead-air pauses exceeding maxPauseS while preserving tight speech rhythm
 * and returning remapped word timestamps for zero-drift caption sync.
 */
export function computeDeadAirJumpCuts(
  words: TimedWord[],
  maxPauseS: number = 0.45,
  padS: number = 0.06,
): {
  keepSegments: Array<{ start_s: number; end_s: number }>;
  removedSeconds: number;
  remappedWords: TimedWord[];
} {
  if (words.length === 0) {
    return { keepSegments: [], removedSeconds: 0, remappedWords: [] };
  }

  const sorted = [...words].sort((a, b) => a.start_s - b.start_s);
  const keepSegments: Array<{ start_s: number; end_s: number }> = [];
  let curStart = Math.max(0, sorted[0].start_s - padS);
  let curEnd = sorted[0].end_s + padS;
  let removedSeconds = 0;

  for (let i = 1; i < sorted.length; i++) {
    const w = sorted[i];
    const gap = w.start_s - curEnd;
    if (gap > maxPauseS) {
      keepSegments.push({ start_s: Number(curStart.toFixed(3)), end_s: Number(curEnd.toFixed(3)) });
      removedSeconds += Math.max(0, w.start_s - padS - curEnd);
      curStart = Math.max(0, w.start_s - padS);
      curEnd = w.end_s + padS;
    } else {
      curEnd = Math.max(curEnd, w.end_s + padS);
    }
  }
  keepSegments.push({ start_s: Number(curStart.toFixed(3)), end_s: Number(curEnd.toFixed(3)) });

  // Remap word timings onto contiguous timeline
  const remappedWords: TimedWord[] = [];
  let accumOffset = 0;
  for (const seg of keepSegments) {
    const segWords = sorted.filter((w) => w.start_s >= seg.start_s - 0.001 && w.end_s <= seg.end_s + 0.001);
    for (const w of segWords) {
      remappedWords.push({
        word: w.word,
        start_s: Number((accumOffset + (w.start_s - seg.start_s)).toFixed(3)),
        end_s: Number((accumOffset + (w.end_s - seg.start_s)).toFixed(3)),
      });
    }
    accumOffset += seg.end_s - seg.start_s;
  }

  return {
    keepSegments,
    removedSeconds: Number(removedSeconds.toFixed(3)),
    remappedWords,
  };
}

function toAssTimestamp(sec: number): string {
  const safe = Math.max(0, sec);
  const h = Math.floor(safe / 3600);
  const m = Math.floor((safe % 3600) / 60);
  const s = Math.floor(safe % 60);
  const cs = Math.floor((safe - Math.floor(safe)) * 100);
  return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${String(cs).padStart(2, '0')}`;
}

function hexToAssBgr(hex: string): string {
  const clean = hex.replace('#', '');
  if (clean.length !== 6) return '&H0000DEFF';
  const r = clean.slice(0, 2);
  const g = clean.slice(2, 4);
  const b = clean.slice(4, 6);
  return `&H00${b}${g}${r}`.toUpperCase();
}

function wrapHookBanner(raw: string, maxCharsPerLine = 22): string {
  const words = raw.trim().toUpperCase().split(/\s+/).filter(Boolean);
  if (words.length <= 1) return words.join('');
  const lines: string[] = [];
  let cur = '';
  for (const w of words) {
    if (!cur) {
      cur = w;
    } else if (cur.length + 1 + w.length <= maxCharsPerLine) {
      cur += ` ${w}`;
    } else {
      lines.push(cur);
      cur = w;
    }
  }
  if (cur) lines.push(cur);
  return lines.join('\\N');
}

/**
 * Generates an ASS v4+ script for 1080x1920 vertical Shorts/Reels/TikTok with
 * safe-zone caption margins, 3-word punch phrasing, bouncy spring pop, and top hook card.
 */
export function generateKineticAssSubtitles(
  words: TimedWord[],
  opts: {
    titleHook?: string;
    highlightHex?: string;
    clipOffsetS?: number;
    wordsPerChunk?: number;
  } = {},
): string {
  const highlightAss = hexToAssBgr(opts.highlightHex ?? '#FFDE00');
  const offset = opts.clipOffsetS ?? 0;
  const chunkSize = Math.max(1, Math.min(5, opts.wordsPerChunk ?? 3));

  const lines: string[] = [
    '[Script Info]',
    'Title: Frontier Studio Kinetic Captions',
    'ScriptType: v4.00+',
    'PlayResX: 1080',
    'PlayResY: 1920',
    'WrapStyle: 1',
    'ScaledBorderAndShadow: yes',
    '',
    '[V4+ Styles]',
    'Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding',
    `Style: Kinetic,Arial,72,&H00FFFFFF,${highlightAss},&H00000000,&H80000000,-1,0,0,0,100,100,0,0,1,6,3,2,72,72,360,1`,
    'Style: HookCard,Arial,46,&H00000000,&H00000000,&H0000DEFF,&H0000DEFF,-1,0,0,0,100,100,0,0,3,16,0,8,72,72,180,1',
    '',
    '[Events]',
    'Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text',
  ];

  if (opts.titleHook?.trim()) {
    lines.push(
      `Dialogue: 1,0:00:00.00,0:00:02.60,HookCard,,0,0,0,,{\\fad(120,180)}${wrapHookBanner(opts.titleHook)}`,
    );
  }

  for (let i = 0; i < words.length; i += chunkSize) {
    const chunk = words.slice(i, i + chunkSize);
    for (let j = 0; j < chunk.length; j++) {
      const activeWord = chunk[j];
      const wStart = Math.max(0, activeWord.start_s - offset);
      const wEnd = Math.max(wStart + 0.08, activeWord.end_s - offset);
      const renderedChunk = chunk
        .map((w, idx) =>
          idx === j
            ? `{\\c${highlightAss}\\fscx122\\fscy122\\t(0,85,\\fscx100\\fscy100)}${w.word.toUpperCase()}{\\c&H00FFFFFF&\\fscx100\\fscy100}`
            : w.word.toUpperCase(),
        )
        .join(' ');
      lines.push(`Dialogue: 0,${toAssTimestamp(wStart)},${toAssTimestamp(wEnd)},Kinetic,,0,0,0,,${renderedChunk}`);
    }
  }

  return lines.join('\n') + '\n';
}

/**
 * Automatically spots synced trending SFX cues (hook slam, emphasized keywords, transition whooshes)
 * against spoken word intervals so dialogue stays 100% intelligible under -14 LUFS mastering.
 */
export async function autoSpotClipSfx(
  candidate: HighlightCandidate,
  studioRoot: string,
): Promise<SfxSpot[]> {
  const spots: SfxSpot[] = [];
  const speechIntervals = candidate.words.map((w) => ({
    start_s: Math.max(0, w.start_s - candidate.start_s),
    end_s: Math.max(0, w.end_s - candidate.start_s),
  }));

  // 1. Opening Hook Slam / Riser
  const opener = await resolveSfxWavPath('hook_slam', studioRoot);
  spots.push(
    computeSfxPlacement({
      entry: opener.entry,
      filePath: opener.filePath,
      targetMomentS: 0.12,
      speechIntervals,
      reason: 'opening_hook_impact',
    }),
  );

  // 2. Scan words for viral emphasis triggers (capped at 4 crisp accents)
  let accents = 0;
  for (const w of candidate.words) {
    if (accents >= 4) break;
    const relMoment = Number(Math.max(0.4, w.start_s - candidate.start_s).toFixed(3));
    if (relMoment > candidate.duration_s - 0.3) continue;

    let preset: string | null = null;
    if (/\$|money|cash|profit|thousand|million|\d+k/i.test(w.word)) {
      preset = 'cash_register';
    } else if (/\d+%|\d+x|top|first|best/i.test(w.word)) {
      preset = 'ding_highlight';
    } else if (/warning|glitch|stop|error|wtf|broken/i.test(w.word)) {
      preset = 'glitch_error';
    } else if (HOOK_POWER_REGEX.test(w.word)) {
      preset = 'caption_pop';
    }

    if (preset) {
      const resolved = await resolveSfxWavPath(preset, studioRoot);
      spots.push(
        computeSfxPlacement({
          entry: resolved.entry,
          filePath: resolved.filePath,
          targetMomentS: relMoment,
          speechIntervals,
          reason: `keyword_${preset}_${w.word}`,
        }),
      );
      accents += 1;
    }
  }

  return spots;
}
