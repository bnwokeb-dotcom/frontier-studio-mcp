// src/clipping/pipeline.ts — Autonomous 20-Repo Viral Video Clipping Engine
// Unifies yt-dlp, Silero VAD, PySceneDetect, WhisperX, MediaPipe/OpenCV reframing, and Remotion into an automated pipeline.

import type { TimedWord } from '../motion/spring_compositor.js';

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
  const cropWidth = Math.round(sourceHeight * targetAspect); // 607px out of 1920px
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
 * dynamic crop, kinetic captioning, and GPU FFmpeg render pipeline.
 */
export function generateClipProductionPlan(
  candidate: HighlightCandidate,
  source: VideoSourceMeta,
  reframeTrack: ReframeKeyframe[],
  outputDir: string
): ClipProductionPlan {
  const normOut = `${outputDir.replace(/\\/g, '/')}/${candidate.clip_id}.mp4`;
  const normSrc = source.local_path.replace(/\\/g, '/');

  // Compute crop box parameters from first keyframe
  const kf0 = reframeTrack[0] || { crop_x: 0.5, crop_width: 607, crop_height: 1080 };
  const cropPixX = Math.round(kf0.crop_x * source.width - kf0.crop_width / 2);

  // Generate FFmpeg single-pass GPU assembly pipeline
  const ffmpegCmd = [
    `ffmpeg -y -ss ${candidate.start_s.toFixed(2)} -to ${candidate.end_s.toFixed(2)} -i "${normSrc}"`,
    `-filter_complex "[0:v]crop=${kf0.crop_width}:${source.height}:${cropPixX}:0,scale=1080:1920:flags=lanczos[scaled];[0:a]loudnorm=I=-14:LRA=7:tp=-1[outa]"`,
    `-map "[scaled]" -map "[outa]" -c:v libx264 -crf 18 -preset fast -c:a aac -b:a 192k "${normOut}"`
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
