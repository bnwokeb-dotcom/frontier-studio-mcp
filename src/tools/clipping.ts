// src/tools/clipping.ts — MCP Tools for Advanced 20-Repo Viral Clipping Studio (Hooks, Dead-Air Cut, Dynamic 9:16 Reframe, Kinetic Subtitles, Trending SFX)
import { z } from 'zod';
import { join } from 'node:path';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import {
  autoSpotClipSfx,
  calculateDynamicReframeTrack,
  computeDeadAirJumpCuts,
  executeClipRender,
  extractViralHookVariants,
  generateClipProductionPlan,
  scoreHighlightMoment,
  type HighlightCandidate,
  type VideoSourceMeta,
} from '../clipping/pipeline.js';
import { guard, out } from './registry.js';

const TimedWordSchema = z.object({
  word: z.string(),
  start_s: z.number().min(0),
  end_s: z.number().min(0),
});

export function registerClippingTools(server: McpServer, studioRoot: string): void {
  server.tool(
    'clip_plan_viral',
    'Scores highlight virality, generates 3 A/B opening hook variants, computes dead-air jump cuts, calculates smooth exponential 9:16 dynamic reframe keyframes, and compiles an FFmpeg Viral Short production plan.',
    {
      clip_id: z.string(),
      source_path: z.string(),
      source_width: z.number().int().positive().default(1920),
      source_height: z.number().int().positive().default(1080),
      source_fps: z.number().positive().default(30),
      start_s: z.number().min(0),
      end_s: z.number().positive(),
      title_hook: z.string(),
      avg_volume_db: z.number().default(-16),
      peak_volume_db: z.number().default(-6),
      vad_speech_ratio: z.number().min(0).max(1).default(0.82),
      sentiment_intensity: z.number().min(0).max(1).default(0.85),
      scene_cut_count: z.number().int().min(0).default(4),
      words: z.array(TimedWordSchema).default([]),
      face_coordinates: z
        .array(
          z.object({
            time_s: z.number().min(0),
            face_center_x: z.number().min(0).max(1),
            face_center_y: z.number().min(0).max(1),
          }),
        )
        .default([]),
      output_dir: z.string().optional(),
    },
    async (a) =>
      guard(async () => {
        const durationS = Number((a.end_s - a.start_s).toFixed(3));
        const score = scoreHighlightMoment({
          start_s: a.start_s,
          duration_s: durationS,
          avg_volume_db: a.avg_volume_db,
          peak_volume_db: a.peak_volume_db,
          vad_speech_ratio: a.vad_speech_ratio,
          sentiment_intensity: a.sentiment_intensity,
          scene_cut_count: a.scene_cut_count,
        });
        const hookVariants = extractViralHookVariants(a.words, a.title_hook);
        const deadAir = computeDeadAirJumpCuts(a.words);
        const reframeTrack = calculateDynamicReframeTrack(
          a.face_coordinates,
          a.source_width,
          a.source_height,
        );
        const candidate: HighlightCandidate = {
          clip_id: a.clip_id,
          start_s: a.start_s,
          end_s: a.end_s,
          duration_s: durationS,
          viral_score: score.viral_score,
          title_hook: a.title_hook,
          reason: hookVariants[0]?.hook_text ?? a.title_hook,
          speech_density: a.vad_speech_ratio,
          audio_energy_db: a.peak_volume_db,
          words: a.words,
        };
        const source: VideoSourceMeta = {
          source_id: `src_${a.clip_id}`,
          local_path: a.source_path,
          duration_s: Math.max(a.end_s, durationS),
          width: a.source_width,
          height: a.source_height,
          fps: a.source_fps,
        };
        const outDir = a.output_dir ?? join(studioRoot, 'clips');
        const plan = generateClipProductionPlan(candidate, source, reframeTrack, outDir);

        return out({
          viral_score: score,
          hook_variants: hookVariants,
          dead_air_analysis: {
            keep_segments: deadAir.keepSegments,
            removed_seconds: deadAir.removedSeconds,
          },
          plan,
        });
      }),
  );

  server.tool(
    'clip_render_viral',
    'Executes end-to-end 9:16 viral vertical clip rendering via real FFmpeg: piecewise-interpolated dynamic subject crop, kinetic word-level ASS subtitle burn-in, automated sync-point trending SFX spotting, EBU R128 -14 LUFS mastering, and ffprobe verification.',
    {
      clip_id: z.string(),
      source_path: z.string(),
      source_width: z.number().int().positive().default(1920),
      source_height: z.number().int().positive().default(1080),
      source_fps: z.number().positive().default(30),
      start_s: z.number().min(0),
      end_s: z.number().positive(),
      title_hook: z.string(),
      words: z.array(TimedWordSchema).default([]),
      face_coordinates: z
        .array(
          z.object({
            time_s: z.number().min(0),
            face_center_x: z.number().min(0).max(1),
            face_center_y: z.number().min(0).max(1),
          }),
        )
        .default([]),
      burn_captions: z.boolean().default(true),
      auto_sfx: z.boolean().default(true),
      active_content_aspect: z.number().positive().optional().describe('Optional inner frame ratio (e.g. 2.39) to trim letterbox bars before vertical crop'),
      output_dir: z.string().optional(),
    },
    async (a) =>
      guard(async () => {
        const durationS = Number((a.end_s - a.start_s).toFixed(3));
        const candidate: HighlightCandidate = {
          clip_id: a.clip_id,
          start_s: a.start_s,
          end_s: a.end_s,
          duration_s: durationS,
          viral_score: 85,
          title_hook: a.title_hook,
          reason: a.title_hook,
          speech_density: 0.85,
          audio_energy_db: -6,
          words: a.words,
        };
        const source: VideoSourceMeta = {
          source_id: `src_${a.clip_id}`,
          local_path: a.source_path,
          duration_s: Math.max(a.end_s, durationS),
          width: a.source_width,
          height: a.source_height,
          fps: a.source_fps,
        };
        const reframeTrack = calculateDynamicReframeTrack(
          a.face_coordinates,
          a.source_width,
          a.source_height,
        );
        const outDir = a.output_dir ?? join(studioRoot, 'clips');
        const plan = generateClipProductionPlan(candidate, source, reframeTrack, outDir);
        const sfxSpots = a.auto_sfx ? await autoSpotClipSfx(candidate, studioRoot) : [];

        const rendered = await executeClipRender(plan, {
          burnCaptions: a.burn_captions,
          sfxSpots,
          studioRoot,
          ...(a.active_content_aspect !== undefined ? { activeContentAspect: a.active_content_aspect } : {}),
        });

        return out({
          clip_id: a.clip_id,
          output_path: rendered.outputPath,
          width: rendered.width,
          height: rendered.height,
          duration_s: rendered.durationS,
          file_bytes: rendered.fileBytes,
          burned_captions: rendered.burnedCaptions,
          sfx_spots_mixed: rendered.sfxSpotsMixed,
          sfx_spots: sfxSpots,
        });
      }),
  );
}
