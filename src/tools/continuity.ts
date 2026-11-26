// src/tools/continuity.ts — MCP tools for Lumina/Seedance Continuity Intelligence, Shot Table Paper-Render, & Dual-Anchor Voice Consistency
import { z } from 'zod';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import {
  buildReferenceTransferContract,
  enrollCharacterVoice,
  planNextClipContinuity,
  readSequenceState,
  recordSequenceTakeDecision,
  saveSequenceState,
  validateDirectorRead,
  validateShotTable,
  type SequenceProjectState,
} from '../continuity/intelligence.js';
import { compileDirectorDeskScene } from '../continuity/director_desk.js';
import { errNotFound, errValidation } from '../errors.js';
import { filmMetaOrThrow } from '../store/film.js';
import { studioPaths } from '../store/paths.js';
import { getActiveFilm, initStudio } from '../store/studio.js';
import { guard, out } from './registry.js';

export function registerContinuityTools(server: McpServer, studioRoot: string): void {
  const paths = studioPaths(studioRoot);

  server.tool(
    'sequence_state_plan',
    'Initializes or updates Sequence Project State, enforces Director\'s Read (narrative 10-field or non-narrative 2-field), validates the geometric Shot Table Paper-Render against Three-Tier Action Hierarchy and Direction Traps, and computes chain-depth re-anchors.',
    {
      film_id: z.string().optional(),
      sequence_id: z.string(),
      story_objective: z.string(),
      final_story_outcome: z.string(),
      canonical_characters: z.array(z.string()),
      canonical_location: z.string(),
      max_chain_depth: z.number().int().min(1).max(3).default(2),
      director_read: z.discriminatedUnion('lane', [
        z.object({
          lane: z.literal('narrative'),
          dramatic_function: z.string(),
          turn: z.string(),
          pov: z.string(),
          power_shift: z.string(),
          hidden_objective: z.string(),
          obstacle_tactic: z.string(),
          suppressed_behavior: z.string(),
          non_transferable_detail: z.string(),
          value_before: z.string(),
          value_after: z.string(),
        }),
        z.object({
          lane: z.literal('non_narrative'),
          utility_intent: z.string(),
          non_narrative_refusal: z.string(),
        }),
      ]),
      shot_table: z.object({
        floor_plan: z.string(),
        rows: z.array(
          z.object({
            shot_id: z.string(),
            camera_side: z.string(),
            in_frame: z.string(),
            eyeline: z.string(),
            action: z.string(),
            others_idle_business: z.string(),
            light_lock: z.string(),
            last_frame: z.string(),
            speaker_id: z.string().optional(),
          }),
        ),
      }),
      clips: z.array(
        z.object({
          clip_id: z.string(),
          beat_id: z.string(),
          parent_clip_id: z.string().nullable().default(null),
          relation: z.enum([
            'standalone',
            'sequence_first_clip',
            'seamless_continuation',
            'intentional_next_shot',
            'bridge_between_known_states',
            'repair_tail',
            'reanchor_after_drift',
          ]),
          planned_end_state: z.string(),
        }),
      ),
    },
    async (a) =>
      guard(async () => {
        await initStudio(paths);
        const filmId = a.film_id ?? (await getActiveFilm(paths));
        await filmMetaOrThrow(paths, filmId);

        validateDirectorRead(a.director_read);
        const tableAudit = await validateShotTable(a.shot_table);
        if (!tableAudit.passed) {
          throw errValidation(
            `Shot Table Paper-Render failed (${tableAudit.violations.length} violations): ${tableAudit.violations.join(' | ')}`,
            'fix blank cells, competing multi-actor actions, or direction traps before committing GPU credits',
          );
        }

        const existing = await readSequenceState(paths, filmId, a.sequence_id);
        const existingMap = new Map((existing?.clips ?? []).map((c) => [c.clip_id, c]));

        const state: SequenceProjectState = {
          film_id: filmId,
          sequence_id: a.sequence_id,
          story_objective: a.story_objective,
          final_story_outcome: a.final_story_outcome,
          max_chain_depth: a.max_chain_depth,
          canonical_characters: a.canonical_characters,
          canonical_location: a.canonical_location,
          completed_beats: existing?.completed_beats ?? [],
          reserved_future_beats: a.clips
            .map((c) => c.beat_id)
            .filter((b) => !(existing?.completed_beats ?? []).includes(b)),
          clips: a.clips.map((c, idx) => {
            const prev = existingMap.get(c.clip_id);
            return {
              clip_id: c.clip_id,
              sequence_index: idx + 1,
              beat_id: c.beat_id,
              parent_clip_id: c.parent_clip_id,
              status: prev?.status ?? 'planned',
              extension_depth: prev?.extension_depth ?? 0,
              anchor_mode:
                idx === 0 || c.relation === 'intentional_next_shot' || c.relation === 'reanchor_after_drift'
                  ? 'canonical'
                  : prev?.anchor_mode ?? 'tail_frame',
              relation: c.relation,
              planned_end_state: c.planned_end_state,
              observed_end_state: prev?.observed_end_state ?? null,
            };
          }),
          updated_at: new Date().toISOString(),
        };

        const statePath = await saveSequenceState(paths, state);
        return out({
          film_id: filmId,
          sequence_id: a.sequence_id,
          state_path: statePath,
          shot_table_audit: tableAudit,
          next_clip_plan: planNextClipContinuity(state, state.clips[0].clip_id),
        });
      }),
  );

  server.tool(
    'sequence_take_record',
    'Records take review (accept, accept_with_deviation, repair, reject) with observed_end_state, updating canonical continuity and computing whether the next shot chains via tail_frame or triggers canonical re-anchor.',
    {
      film_id: z.string().optional(),
      sequence_id: z.string(),
      clip_id: z.string(),
      verdict: z.enum(['accept', 'accept_with_deviation', 'repair', 'reject']),
      observed_end_state: z.record(z.unknown()).optional(),
      next_clip_id: z.string().optional(),
      notes: z.string().optional(),
    },
    async (a) =>
      guard(async () => {
        await initStudio(paths);
        const filmId = a.film_id ?? (await getActiveFilm(paths));
        await filmMetaOrThrow(paths, filmId);

        const updated = await recordSequenceTakeDecision(paths, {
          film_id: filmId,
          sequence_id: a.sequence_id,
          clip_id: a.clip_id,
          verdict: a.verdict,
          observed_end_state: a.observed_end_state,
          notes: a.notes,
        });

        const nextClipPlan = a.next_clip_id
          ? planNextClipContinuity(updated, a.next_clip_id)
          : undefined;

        return out({
          film_id: filmId,
          sequence_id: a.sequence_id,
          recorded_clip: updated.clips.find((c) => c.clip_id === a.clip_id),
          completed_beats: updated.completed_beats,
          reserved_future_beats: updated.reserved_future_beats,
          ...(nextClipPlan ? { next_clip_plan: nextClipPlan } : {}),
        });
      }),
  );

  server.tool(
    'shot_prompt_compile',
    'Compiles a Lumina / Seedance 2.5 prompt with verbatim @character / @Image / @Video / @Audio Transfer & Ignore contracts, checks Direction Traps, and injects Sequence Project State continuity locks.',
    {
      film_id: z.string().optional(),
      sequence_id: z.string().optional(),
      clip_id: z.string().optional(),
      prompt_text: z.string(),
      reference_bindings: z
        .array(
          z.object({
            tag: z.string(),
            role: z.enum([
              'identity',
              'camera_rhythm_only',
              'environment',
              'voice_timbre',
              'tempo_only',
              'first_frame',
              'last_frame',
            ]),
            ignore: z.array(z.string()).default([]),
          }),
        )
        .default([]),
    },
    async (a) =>
      guard(async () => {
        await initStudio(paths);
        const filmId = a.film_id ?? (await getActiveFilm(paths));
        await filmMetaOrThrow(paths, filmId);

        const transfer = buildReferenceTransferContract(a.prompt_text, a.reference_bindings);

        // Verify any @char_* / @loc_* / @prop_* asset refs exist when registered in film
        const unresolvedCharacterTags: string[] = [];
        for (const tag of transfer.extractedTags) {
          if (tag.startsWith('@char_') || tag.startsWith('@loc_') || tag.startsWith('@prop_')) {
            const id = tag.slice(1);
            const subDir = tag.startsWith('@char_')
              ? 'characters'
              : tag.startsWith('@loc_')
                ? 'locations'
                : 'props';
            try {
              await readFile(join(paths.assetDir(filmId, subDir, id), 'descriptor.md'), 'utf8');
            } catch {
              unresolvedCharacterTags.push(tag);
            }
          }
        }
        if (unresolvedCharacterTags.length > 0) {
          throw errNotFound(
            `unregistered @asset tags referenced in prompt: ${unresolvedCharacterTags.join(', ')}`,
            'register each referenced asset via asset_register first',
          );
        }

        let continuityHeader = '';
        let clipPlan: ReturnType<typeof planNextClipContinuity> | undefined;
        if (a.sequence_id && a.clip_id) {
          const state = await readSequenceState(paths, filmId, a.sequence_id);
          if (state) {
            clipPlan = planNextClipContinuity(state, a.clip_id);
            const lines = [
              `[Continuity Mode: ${clipPlan.anchor_mode} | Directive: ${clipPlan.directive}]`,
            ];
            if (clipPlan.opening_state) {
              lines.push(`Opening Observed State: ${JSON.stringify(clipPlan.opening_state)}`);
            }
            if (clipPlan.excluded_completed_beats.length > 0) {
              lines.push(`Do NOT Replay Completed Beats: ${clipPlan.excluded_completed_beats.join(', ')}`);
            }
            if (clipPlan.excluded_future_beats.length > 0) {
              lines.push(`Do NOT Leak Future Beats: ${clipPlan.excluded_future_beats.join(', ')}`);
            }
            continuityHeader = lines.join('\n') + '\n\n';
          }
        }

        return out({
          film_id: filmId,
          extracted_tags: transfer.extractedTags,
          transfer_contracts: transfer.contractLines,
          ...(clipPlan ? { continuity_plan: clipPlan } : {}),
          compiled_prompt: `${continuityHeader}${transfer.compiledPrompt}`,
        });
      }),
  );

  server.tool(
    'character_voice_enroll',
    'Locks a character\'s permanent Dual-Anchor Vocal Identity (`voice_sample.wav` normalized to 48kHz PCM mono + `voice_profile.json` + optional ElevenLabs instant voice clone ID) so every shot speaks with the exact same actor voice.',
    {
      film_id: z.string().optional(),
      character_id: z.string(),
      sample_source_path: z.string().optional().describe('Path to clean speech sample WAV/MP3/OGG/M4A'),
      provider: z.enum(['google', 'elevenlabs']).optional(),
      voice_id: z.string().optional().describe('Locked Google Journey/AI Studio persona or ElevenLabs voice ID'),
      persona: z.enum(['Charon', 'Fenrir', 'Aoede', 'Puck', 'Kore']).optional(),
      pitch: z.number().min(0.5).max(2.0).optional(),
      speed: z.number().min(0.5).max(2.0).optional(),
      timbre: z.string().optional(),
      accent: z.string().optional(),
      clone_remote: z.boolean().default(false).describe('Upload voice_sample.wav to ElevenLabs /v1/voices/add to mint a permanent cloned voice_id'),
    },
    async (a) =>
      guard(async () => {
        await initStudio(paths);
        const filmId = a.film_id ?? (await getActiveFilm(paths));
        await filmMetaOrThrow(paths, filmId);

        const res = await enrollCharacterVoice(paths, {
          film_id: filmId,
          character_id: a.character_id,
          sample_source_path: a.sample_source_path,
          provider: a.provider,
          voice_id: a.voice_id,
          persona: a.persona,
          pitch: a.pitch,
          speed: a.speed,
          timbre: a.timbre,
          accent: a.accent,
          clone_remote: a.clone_remote,
        });
        return out(res);
      }),
  );

  server.tool(
    'shot_table_validate',
    'Runs Paper-Render continuity linting over a proposed Shot Table (floor plan, 7-cell completeness, Three-Tier Action Hierarchy, Direction Traps, and optional Director Read) BEFORE creating shots or spending GPU credits.',
    {
      floor_plan: z.string(),
      rows: z.array(
        z.object({
          shot_id: z.string(),
          camera_side: z.string(),
          in_frame: z.string(),
          eyeline: z.string(),
          action: z.string(),
          others_idle_business: z.string(),
          light_lock: z.string(),
          last_frame: z.string(),
          speaker_id: z.string().optional(),
        }),
      ),
      director_read: z
        .discriminatedUnion('lane', [
          z.object({
            lane: z.literal('narrative'),
            dramatic_function: z.string(),
            turn: z.string(),
            pov: z.string(),
            power_shift: z.string(),
            hidden_objective: z.string(),
            obstacle_tactic: z.string(),
            suppressed_behavior: z.string(),
            non_transferable_detail: z.string(),
            value_before: z.string(),
            value_after: z.string(),
          }),
          z.object({
            lane: z.literal('non_narrative'),
            utility_intent: z.string(),
            non_narrative_refusal: z.string(),
          }),
        ])
        .optional(),
    },
    async (a) =>
      guard(async () => {
        if (a.director_read) {
          validateDirectorRead(a.director_read);
        }
        const audit = await validateShotTable({ floor_plan: a.floor_plan, rows: a.rows });
        return out(audit);
      }),
  );

  server.tool(
    'director_desk_stage',
    'Compiles 3D Director\'s Desk character marks and camera positions into a cardinal spatial geo_block draft and validates 180-degree Line-of-Action side preservation across every camera setup.',
    {
      location_summary: z.string().optional(),
      roles: z.array(
        z.object({
          role_id: z.string(),
          label: z.string().optional(),
          x: z.number(),
          y: z.number().optional(),
          z: z.number(),
          facing_deg: z.number().optional(),
          action: z.string().optional(),
        }),
      ),
      cameras: z.array(
        z.object({
          camera_id: z.string(),
          lens_mm: z.number().optional(),
          x: z.number(),
          y: z.number().optional(),
          z: z.number(),
          target_role_id: z.string().optional(),
          move: z.string().optional(),
          motivated_axis_switch: z.boolean().optional(),
        }),
      ),
    },
    async (a) =>
      guard(async () => {
        const compiled = compileDirectorDeskScene(a);
        return out(compiled);
      }),
  );
}
