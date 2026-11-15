// src/tools/video.ts — the video-lane tools (M3): async H3 renders, gated.
//
// Binding order for render_shot (the flagship): validate args → resolve film
// (explicit or active, verified) → shot exists → action present (pre-v2
// refusal) → duration 4–15 whole seconds (H3 lane law) → keyframe plate
// (staging before spend) → voice refs resolve (character-only) → geo (sequence
// lock, else the location asset's geo_block.md, else omitted) → composeH3Prompt
// (PURE; the 8000-char law fires here) → STUDIO_LIVE gate → the money law
// (runBilledVideoSubmit in billed.ts: estimate → ensureBudget → submit →
// ledger(estimated) → jobs.json — SUBMIT ONLY; result + recordSpend happen at
// job_download, Task 4). Every refusal precedes any fetch by construction.
//
// Characters never enter the prompt as references — the plate is the identity
// carrier (frames XOR references; input_references reserved for M3.5 vfx).
// What rides verbatim: action, voice.md descriptors, dialogue lines, the geo
// block, sfx. The shot's own stored geoBlock is deliberately NOT a prompt
// source — the SEQUENCE lock outranks it (the store refuses mismatched copies
// at write time; the prompt takes the lock itself).
import { z } from 'zod';
import { readFile } from 'node:fs/promises';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { studioPaths } from '../store/paths.js';
import type { AssetKindDir, StudioPaths } from '../store/paths.js';
import { initStudio, getActiveFilm } from '../store/studio.js';
import { filmMetaOrThrow } from '../store/film.js';
import { shotShow } from '../store/shot.js';
import type { ShotRef } from '../store/shot.js';
import { sequenceGeo } from '../store/sequence.js';
import { findAssetKindDir } from '../store/asset.js';
import { readText } from '../store/fs.js';
import { errNotFound, errValidation } from '../errors.js';
import { composeH3Prompt } from './h3prompt.js';
import type { H3DialogueLine } from './h3prompt.js';
import { VultrLane } from '../lanes/vultr.js';
import { H3_REAL_LENGTHS } from '../lanes/video.js';
import { guard, out } from './registry.js';
import { runBilledVideoSubmit } from './billed.js';
import { liveLaneConfig } from './image.js';

// Composer layout version stamped on every jobs.json entry — the lifecycle
// tools (Task 4) and any future composer revision disambiguate through it.
export const H3_PROMPT_VERSION = 'h3-v1';

// The keyframe plate probe — the findAssetKindDir pattern (ENOENT-tolerant
// readFile over candidate paths). The shot's refs carry explicit roles (the
// store verifies role↔dir on every write), so this walks location/style refs
// in refs order and returns the FIRST asset whose dir holds plate.png — refs
// order is the shot's own determinism. undefined → no plate anywhere → the
// ladder refuses (staging before spend).
async function findPlate(
  paths: StudioPaths,
  filmId: string,
  refs: ShotRef[],
): Promise<{ assetId: string; data: Buffer } | undefined> {
  for (const ref of refs) {
    if (ref.role !== 'location' && ref.role !== 'style') continue;
    const kindDir: AssetKindDir = ref.role === 'location' ? 'locations' : 'styles';
    try {
      const data = await readFile(`${paths.assetDir(filmId, kindDir, ref.assetId)}/plate.png`);
      return { assetId: ref.assetId, data };
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code !== 'ENOENT') throw e;
    }
  }
  return undefined;
}

export function registerVideoTools(server: McpServer, studioRoot: string): void {
  const paths = studioPaths(studioRoot);

  // The flagship: the shot's doctrine → one gated, budgeted, async H3 render.
  // Identity travels THROUGH the plate (first_frame I2V); characters speak via
  // their voice.md; money is quoted and hard-stopped BEFORE the submit.
  server.tool('render_shot', {
    shot_id: z.string(),
    film_id: z.string().optional(),
    quality: z.enum(['turbo', 'standard', 'max', 'ultra']).optional(),
  }, async (a) => guard(async () => {
    // 1. args
    if (!a.shot_id.trim()) {
      throw errValidation('shot_id is required', 'pass the shot to render');
    }

    // 2. film: explicit id or the active one — VERIFIED (unknown → NOT_FOUND)
    await initStudio(paths);
    const filmId = a.film_id ?? (await getActiveFilm(paths));
    await filmMetaOrThrow(paths, filmId);

    // 3. shot exists
    const shot = await shotShow(paths, filmId, a.shot_id);

    // 4. the picture beat (schema v2; legacy pre-v2 records are refused, never
    //    guessed at — the H3 [Shot N] block renders it verbatim)
    if (!shot.action?.trim()) {
      throw errValidation(
        `shot "${a.shot_id}" has no action (pre-v2 record)`,
        'shot_update the action — the H3 prompt needs the picture beat',
      );
    }

    // 5. duration: the H3 lane law 4–15 whole seconds (the store keeps 1–30 —
    //    multi-lane reality; whole-second because the real-length table is
    //    integer-keyed and real_length_s must never be undefined)
    if (!Number.isInteger(shot.durationS)) {
      throw errValidation(
        `duration_s must be a whole number of seconds (got ${shot.durationS})`,
        'H3 renders whole-second blocks — use a whole 4–15s duration',
      );
    }
    if (shot.durationS < 4 || shot.durationS > 15) {
      throw errValidation(
        `shot "${a.shot_id}" is ${shot.durationS}s — H3 lane renders 4–15s`,
        'split the beat or adjust the shot',
      );
    }

    // 6. the keyframe plate: staging before spend (digest feature #1 as a
    //    schema rule). Characters/props/size_refs are skipped — a plate lives
    //    in location/style dirs only.
    const plate = await findPlate(paths, filmId, shot.refs);
    if (!plate) {
      throw errValidation(
        `shot "${a.shot_id}" has no keyframe plate`,
        'keyframe_build the location first (staging before spend)',
      );
    }

    // 7. dialogue voices: every spoken line needs a registered CHARACTER —
    //    voice.md is the descriptor, verbatim; the line rides verbatim.
    //    Unknown ref → NOT_FOUND pre-fetch; a non-character ref names its kind.
    const dialogue: H3DialogueLine[] = [];
    for (const [i, d] of (shot.audioBlock.dialogue ?? []).entries()) {
      if (!d.voiceRef?.trim()) {
        throw errValidation(
          `dialogue line S${i + 1} has no voice_ref`,
          'shot_update audio_block with a voice_ref — every spoken line needs a registered voice',
        );
      }
      const kindDir = await findAssetKindDir(paths, filmId, d.voiceRef);
      if (kindDir !== 'characters') {
        throw errNotFound(
          kindDir
            ? `voice_ref "${d.voiceRef}" is a ${kindDir} asset — dialogue needs a character voice`
            : `voice_ref "${d.voiceRef}" is not a registered character`,
          'register the character (asset_register stores voice.md), or fix audio_block (shot_update)',
        );
      }
      const voice = await readText(`${paths.assetDir(filmId, 'characters', d.voiceRef)}/voice.md`);
      dialogue.push({ voiceRef: d.voiceRef, voiceDescriptor: voice, line: d.line });
    }

    // 8. prompt geo: the SEQUENCE lock is the law; only an unlocked sequence
    //    falls back to the location asset's geo_block.md advisory copy;
    //    neither → the Setting line is omitted entirely (composeH3Prompt).
    let geoBlock = await sequenceGeo(paths, filmId, shot.sequence);
    if (geoBlock === undefined) {
      const loc = shot.refs.find((r) => r.role === 'location');
      if (loc) {
        try {
          geoBlock = await readFile(
            `${paths.assetDir(filmId, 'locations', loc.assetId)}/geo_block.md`,
            'utf8',
          );
        } catch (e) {
          if ((e as NodeJS.ErrnoException).code !== 'ENOENT') throw e;
        }
      }
    }

    // 9. compose (PURE; the 8000-char cap surfaces here as VALIDATION — before
    //    the gate, the quote and any fetch)
    const prompt = composeH3Prompt({
      action: shot.action,
      camera: shot.camera,
      geoBlock,
      dialogue,
      sfx: shot.audioBlock.sfx,
      durationS: shot.durationS,
      platePresents: true, // the plate rung above guarantees Picture 1
    });

    // 10. STUDIO_LIVE gate + lane (lazily, per call) — the gate fires before
    //     the lane exists; a missing VULTR_INFERENCE_API_KEY → AUTH here.
    const lane = VultrLane.fromConfig(liveLaneConfig(studioRoot));
    const req = {
      prompt,
      durationS: shot.durationS,
      aspectRatio: '16:9', // the H3 lane's v1 frame — no wire arg by design
      quality: a.quality ?? ('standard' as const),
      firstFrame: { data: plate.data, mimeType: 'image/png' }, // plate.png is png by name law
    };

    // 11. the money law, ONE copy (billed.ts): estimate → ensureBudget →
    //     submit → ledger(estimated) → jobs.json. NO result, NO recordSpend —
    //     download reconciles (Task 4).
    const sub = await runBilledVideoSubmit({
      studioRoot,
      filmId,
      shotId: a.shot_id,
      tool: 'render_shot',
      lane,
      request: req,
      promptVersion: H3_PROMPT_VERSION,
    });

    // 12. snake_case wire output
    return out({
      job_id: sub.jobId,
      status: 'pending', // 202 → pending, per the submit contract
      estimated_cost_usd: sub.estimateUsd,
      duration_s: shot.durationS,
      real_length_s: H3_REAL_LENGTHS[shot.durationS], // whole 24fps blocks run long
    });
  }));
}
