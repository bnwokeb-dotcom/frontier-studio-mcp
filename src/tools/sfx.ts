// src/tools/sfx.ts — MCP Tools for Trending SFX Pack, Live API SFX Fetch, and Transient-Accurate FFmpeg Audio Mixing
import { z } from 'zod';
import { join } from 'node:path';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import {
  computeSfxPlacement,
  fetchRemoteApiSfx,
  mixSfxOntoMedia,
  resolveSfxWavPath,
  searchSfxCatalog,
  VIRAL_SFX_PACK_MAP,
  type SfxSpot,
} from '../sfx/sfx_engine.js';
import { guard, out } from './registry.js';

export function registerSfxTools(server: McpServer, studioRoot: string): void {
  server.tool(
    'sfx_search',
    'Searches the 320-sound CC0 48kHz Studio SFX Kit and Viral Creator Preset Pack (whooshes, vine booms, risers, hits, pops, glitches, cash register, UI clicks) by on-screen moment, category, or viral preset.',
    {
      query: z.string().optional(),
      category: z.string().optional(),
      viral_preset: z.string().optional().describe('Preset name e.g. hook_slam, vine_boom, riser_tension, whoosh_cut, caption_pop, ding_highlight, glitch_error, cash_register'),
      max_duration_s: z.number().positive().optional(),
      avoid_speech_overlap: z.boolean().default(false),
      limit: z.number().int().min(1).max(50).default(12),
    },
    async (a) =>
      guard(async () => {
        const res = await searchSfxCatalog({
          query: a.query,
          category: a.category,
          viral_preset: a.viral_preset,
          max_duration_s: a.max_duration_s,
          avoid_speech_overlap: a.avoid_speech_overlap,
          limit: a.limit,
        });
        return out({
          viral_presets: Object.keys(VIRAL_SFX_PACK_MAP),
          total_matches: res.total_matches,
          results: res.results.map((s) => ({
            id: s.id,
            name: s.name,
            category: s.category,
            duration_s: s.duration,
            sync_at_s: s.sync.at,
            sync_meets: s.sync.meets,
            under_voiceover_db: s.under_voiceover_db ?? -4,
            use_for: s.use_for,
            tags: s.tags,
          })),
        });
      }),
  );

  server.tool(
    'sfx_fetch_api',
    'Generates custom AI sound effects via ElevenLabs Sound Effects API v2 OR searches & downloads real organic SFX via Freesound API v2 / SFX Kit CDN, normalized to 48kHz stereo WAV.',
    {
      provider: z.enum(['elevenlabs', 'freesound', 'sfx_kit']),
      query_or_prompt: z.string().describe('SFX Kit ID / viral preset name, Freesound query, or ElevenLabs text-to-SFX prompt'),
      duration_s: z.number().min(0.5).max(22).optional(),
    },
    async (a) =>
      guard(async () => {
        if (a.provider === 'sfx_kit') {
          const resolved = await resolveSfxWavPath(a.query_or_prompt, studioRoot);
          return out({
            provider: 'sfx_kit',
            source: resolved.source,
            sfx_id: resolved.entry.id,
            name: resolved.entry.name,
            audio_path: resolved.filePath,
            duration_s: resolved.entry.duration,
            sync_at_s: resolved.entry.sync.at,
            under_voiceover_db: resolved.entry.under_voiceover_db ?? -4,
          });
        }
        const fetched = await fetchRemoteApiSfx({
          provider: a.provider,
          queryOrPrompt: a.query_or_prompt,
          durationS: a.duration_s,
          studioRoot,
        });
        return out(fetched);
      }),
  );

  server.tool(
    'sfx_spot_video',
    'Spots multiple sound effects onto a video or audio file at exact sync.at transient timestamps (with automatic speech ducking via under_voiceover_db and EBU R128 mastering) via real FFmpeg mixing.',
    {
      input_media_path: z.string(),
      output_path: z.string(),
      events: z.array(
        z.object({
          sound_id_or_preset: z.string(),
          target_moment_s: z.number().min(0),
          fit_duration_s: z.number().positive().optional(),
          extra_gain_db: z.number().optional(),
          reason: z.string().optional(),
        }),
      ),
      speech_intervals: z
        .array(
          z.object({
            start_s: z.number().min(0),
            end_s: z.number().min(0),
          }),
        )
        .default([]),
      loudnorm_lufs: z.number().default(-14),
    },
    async (a) =>
      guard(async () => {
        const spots: SfxSpot[] = [];
        for (const ev of a.events) {
          const { entry, filePath } = await resolveSfxWavPath(ev.sound_id_or_preset, studioRoot);
          spots.push(
            computeSfxPlacement({
              entry,
              filePath,
              targetMomentS: ev.target_moment_s,
              speechIntervals: a.speech_intervals,
              fitDurationS: ev.fit_duration_s,
              extraGainDb: ev.extra_gain_db,
              reason: ev.reason,
            }),
          );
        }

        const outPath =
          a.output_path.startsWith('/') || /^[a-zA-Z]:[\\/]/.test(a.output_path)
            ? a.output_path
            : join(studioRoot, a.output_path);

        const result = await mixSfxOntoMedia({
          inputMediaPath: a.input_media_path,
          outputPath: outPath,
          spots,
          loudnormLufs: a.loudnorm_lufs,
        });

        return out({
          output_path: result.outputPath,
          spots_mixed: result.spotsMixed,
          duration_s: result.durationS,
          spots,
        });
      }),
  );
}
