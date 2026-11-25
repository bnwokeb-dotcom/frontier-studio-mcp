// src/tools/video.ts — the video-lane tools (M3): async H3 renders, gated.
//
// Binding order for render_shot (the flagship): validate args → resolve film
// (explicit or active, verified) → shot exists → action present (pre-v2
// refusal) → duration 4–15 whole seconds (H3 lane law) → keyframe plate
// (staging before spend) → voice refs resolve (character-only) → geo (sequence
// lock, else the location asset's geo_block.md, else omitted) → composeH3Prompt
// (PURE; the 8000-char law fires here) → STUDIO_LIVE gate → the money law
// (runBilledVideoSubmit in billed.ts: estimate → ensureBudget → submit →
// recordSpend RESERVE → ledger(estimated) → jobs.json — SUBMIT ONLY; the
// result, the reconcile and the failure refund are the lifecycle tools' law).
// Every refusal precedes any fetch by construction.
//
// The ladder from the action rung down lives in ONE place — submitShotRender —
// shared verbatim by repair_shot (M3 Task 4): both tools submit through the
// same rungs, the same composer, the same gate and the same money law; a
// second hand copy is forbidden by the M2 review ruling.
//
// The lifecycle pair closes the async loop under the reserve/reconcile/refund
// money model (billed.ts header): job_status polls lane.status, updates the
// jobs.json entry in place (error_verbatim on failed entries only) and
// RELEASES the reserve when the job dies (failed/cancelled/expired — only
// completed jobs bill, spec §12.1; the negative ledger line note 'refund' is
// the record, idempotent by ledger scan); job_download gates on completed,
// downloads the mp4, and RECONCILES the accrual (actual usage.cost vs the net
// reservation — the delta line is the record, the append-only ledger cannot
// edit the original).
//
// Characters never enter the prompt as references — the plate is the identity
// carrier (frames XOR references; input_references reserved for M3.5 vfx).
// What rides verbatim: action, voice.md descriptors, dialogue lines, the geo
// block, sfx. The shot's own stored geoBlock is deliberately NOT a prompt
// source — the SEQUENCE lock outranks it (the store refuses mismatched copies
// at write time; the prompt takes the lock itself).
//
// NOT WIRED (disclosed): repair_shot's v1 modes avoid POST /v1/videos/edits
// entirely — that endpoint's schema is UNVERIFIED (bring-up item); both modes
// submit plain POST /v1/videos child jobs with parent_job_id lineage. Wiring
// edits requires a verified request shape first (docs or live probe).
import { z } from 'zod';
import { readFile, rename, stat, writeFile } from 'node:fs/promises';
import { execFile as execFileCb } from 'node:child_process';
import { promisify } from 'node:util';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

const execFileAsync = promisify(execFileCb);
import { studioPaths } from '../store/paths.js';
import type { AssetKindDir, StudioPaths } from '../store/paths.js';
import { initStudio, getActiveFilm } from '../store/studio.js';
import { filmMetaOrThrow } from '../store/film.js';
import { shotShow } from '../store/shot.js';
import type { ShotRecord, ShotRef } from '../store/shot.js';
import { sequenceGeo } from '../store/sequence.js';
import { findAssetKindDir } from '../store/asset.js';
import { appendLine, ensureDir, readText } from '../store/fs.js';
import { readJobs, updateJob } from '../store/jobs.js';
import type { VideoJobEntry } from '../store/jobs.js';
import { errLaneDown, errNotFound, errValidation } from '../errors.js';
import { recordSpend } from '../budget.js';
import { auditTake, probeMedia } from '../qa/critic.js';
import { composeH3Prompt } from './h3prompt.js';
import type { H3DialogueLine } from './h3prompt.js';
import { VultrLane } from '../lanes/vultr.js';
import { H3_REAL_LENGTHS } from '../lanes/video.js';
import type { VideoQuality } from '../lanes/video.js';
import { guard, out } from './registry.js';
import { runBilledVideoSubmit } from './billed.js';
import { liveLaneConfig, readRefImage } from './image.js';

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

async function firstExistingFile(candidates: string[]): Promise<string | undefined> {
  for (const candidate of candidates) {
    try {
      const st = await stat(candidate);
      if (st.isFile()) return candidate;
    } catch {
      // ignore missing reference candidates
    }
  }
  return undefined;
}

async function resolveShotAuditRefs(
  paths: StudioPaths,
  filmId: string,
  refs: ShotRef[],
): Promise<{ referenceSheetPath?: string; referencePlatePath?: string }> {
  const sheetCandidates: string[] = [];
  const plateCandidates: string[] = [];

  const kinds = await Promise.all(refs.map((r) => findAssetKindDir(paths, filmId, r.assetId)));
  for (let i = 0; i < refs.length; i += 1) {
    const ref = refs[i];
    const kindDir =
      kinds[i] ??
      (ref.role === 'character'
        ? 'characters'
        : ref.role === 'location'
          ? 'locations'
          : ref.role === 'style'
            ? 'styles'
            : undefined);
    if (kindDir === 'characters') {
      sheetCandidates.push(`${paths.assetDir(filmId, kindDir, ref.assetId)}/sheet.png`);
    } else if (kindDir === 'locations' || kindDir === 'styles') {
      plateCandidates.push(`${paths.assetDir(filmId, kindDir, ref.assetId)}/plate.png`);
    }
  }

  const [referenceSheetPath, referencePlatePath] = await Promise.all([
    firstExistingFile(sheetCandidates),
    firstExistingFile(plateCandidates),
  ]);
  return { referenceSheetPath, referencePlatePath };
}

// Hours until the provider drops the content (expires_at), rounded to 0.1h.
// null when the payload sent no (parseable) expires_at — the tools then simply
// have no retention facts and stay silent about them.
function hoursUntil(expiresAt: string | undefined): number | null {
  if (!expiresAt) return null;
  const ms = Date.parse(expiresAt);
  if (Number.isNaN(ms)) return null;
  return Math.round(((ms - Date.now()) / 3_600_000) * 10) / 10;
}

// Kills float noise before the ledger records it (1.02 − 0.918 is
// 0.1020000000000002 in IEEE 754); 0.0001 USD precision keeps every real delta.
function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}

// The async handle: job_id must exist in the film's jobs.json — the file
// render_shot / repair_shot wrote at submit. Unknown id → NOT_FOUND naming
// the fix; this is the resolve rung, strictly before any fetch.
async function jobEntryOrThrow(paths: StudioPaths, filmId: string, jobId: string): Promise<VideoJobEntry> {
  const jobs = await readJobs(paths, filmId);
  const entry = jobs.find((j) => j.job_id === jobId);
  if (!entry) {
    throw errNotFound(
      `no such job "${jobId}" in film "${filmId}" (jobs.json)`,
      'check render_shot output — job_status/job_download poll those handles',
    );
  }
  return entry;
}

// The reconciliation facts for one job, read off the append-only ledger:
// - estimate: the FIRST submit line for this job_id carrying `estimated: true`
//   (the flag — not the tool name — is the submit-line marker, so repair_shot
//   children reconcile exactly like render_shot parents). The submit RESERVED
//   this amount onto spentUsd (billed.ts money model).
// - reconciled: a prior `note: 'reconcile'` line means the delta already
//   accrued (crash-window recovery: a retry after a failed artifact write must
//   never double the accrual).
// - refunded: a prior `note: 'refund'` line means the reserve was already
//   released (a second dead-status poll must not refund again).
// No ledger / no submit line → estimate 0: nothing was reserved, nothing
// refunds, and the reconcile accrues the FULL actual — the money tooling
// never under-accrues on a missing record.
async function ledgerFactsForJob(
  paths: StudioPaths,
  filmId: string,
  jobId: string,
): Promise<{ estimate: number; reconciled: boolean; refunded: boolean }> {
  let raw: string;
  try {
    raw = await readFile(paths.ledgerPath(filmId), 'utf8');
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === 'ENOENT') {
      return { estimate: 0, reconciled: false, refunded: false };
    }
    throw e;
  }
  let estimate: number | undefined;
  let reconciled = false;
  let refunded = false;
  for (const [i, l] of raw.split('\n').entries()) {
    if (l.trim() === '') continue;
    let line: unknown;
    try {
      line = JSON.parse(l);
    } catch {
      // Loud, like jobs.json: a corrupted money record must never be skipped
      // silently — the reconcile reads every line between here and the truth.
      throw errValidation(
        `ledger line ${i + 1} is not valid JSON`,
        'the ledger is append-only — check what wrote to it by hand',
      );
    }
    if (line == null || typeof line !== 'object') continue;
    const rec = line as Record<string, unknown>;
    if (rec.job_id !== jobId) continue;
    if (rec.note === 'reconcile') reconciled = true;
    if (rec.note === 'refund') refunded = true;
    if (rec.estimated === true) {
      if (typeof rec.cost_usd !== 'number' || Number.isNaN(rec.cost_usd)) {
        throw errValidation(
          `the estimate line for job "${jobId}" has no numeric cost_usd`,
          'the ledger is the money truth — check what wrote to it by hand',
        );
      }
      estimate ??= rec.cost_usd; // first submit line wins (submit order)
    }
  }
  return { estimate: estimate ?? 0, reconciled, refunded };
}

// The render ladder, rungs action → submit, ONE copy shared by render_shot and
// repair_shot. Every refusal here precedes any fetch by construction (the
// callers resolve film/shot/lineage args first). firstFrame: the caller's
// override (repair extend — the agent's parent final-frame) or the keyframe
// plate (staging before spend). The tool name and optional parent lineage ride
// into the ledger line and the jobs.json entry via runBilledVideoSubmit.
export async function submitShotRender(opts: {
  studioRoot: string;
  paths: StudioPaths;
  filmId: string;
  shot: ShotRecord;
  quality: VideoQuality;
  firstFrame?: { data: Buffer; mimeType: string }; // repair extend — INSTEAD of the plate
  tool: string; // ledger tool name: 'render_shot' | 'repair_shot'
  parentJobId?: string; // repair lineage
  chainFromShotId?: string;
  aspectRatio?: string;
}): Promise<{ jobId: string; estimateUsd: number; durationS: number }> {
  const { studioRoot, paths, filmId, shot, quality, tool } = opts;

  // 1. the picture beat (schema v2; legacy pre-v2 records are refused, never
  //    guessed at — the H3 [Shot N] block renders it verbatim)
  if (!shot.action?.trim()) {
    throw errValidation(
      `shot "${shot.id}" has no action (pre-v2 record)`,
      'shot_update the action — the H3 prompt needs the picture beat',
    );
  }

  // 2. duration: the H3 lane law 4–15 whole seconds (the store keeps 1–30 —
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
      `shot "${shot.id}" is ${shot.durationS}s — H3 lane renders 4–15s`,
      'split the beat or adjust the shot',
    );
  }

  // 3. the identity carrier: the caller's firstFrame (repair extend),
  //    or auto-chain from parent shot's tail frame, else the keyframe plate.
  let firstFrame = opts.firstFrame;
  const chainId = opts.chainFromShotId || shot.chainFromShotId;
  if (!firstFrame && (chainId || shot.continuity === 'continuous')) {
    let resolvedParentId = chainId;
    if (!resolvedParentId) {
      try {
        const { readdir } = await import('node:fs/promises');
        const files = (await readdir(paths.shotsDir(filmId))).filter((f) => f.endsWith('.json')).sort();
        const idx = files.indexOf(`${shot.id}.json`);
        if (idx > 0) resolvedParentId = files[idx - 1].replace(/\.json$/, '');
      } catch {}
    }
    if (resolvedParentId) {
      try {
        const parentShot = await shotShow(paths, filmId, resolvedParentId);
        let parentJobId: string | undefined = parentShot.takes?.find((t) => t.verdict === 'kept')?.jobId
          ?? parentShot.takes?.[parentShot.takes.length - 1]?.jobId;
        if (!parentJobId) {
          const jobs = await readJobs(paths, filmId).catch(() => []);
          const keptJob = [...jobs].reverse().find((j) => j.shot_id === resolvedParentId && j.status === 'completed' && j.qc_verdict === 'kept');
          const completedJob = [...jobs].reverse().find((j) => j.shot_id === resolvedParentId && j.status === 'completed');
          parentJobId = (keptJob ?? completedJob)?.job_id;
        }
        if (parentJobId) {
          const parentDir = `${paths.filmDir(filmId)}/renders/${parentJobId}`;
          const tailPath = `${parentDir}/tail_frame.png`;
          const mp4Path = `${parentDir}/shot.mp4`;
          try {
            const tailData = await readFile(tailPath);
            firstFrame = { data: tailData, mimeType: 'image/png' };
          } catch {
            try {
              await execFileAsync('ffmpeg', ['-y', '-sseof', '-0.1', '-i', mp4Path, '-frames:v', '1', '-q:v', '2', tailPath]);
              const tailData = await readFile(tailPath);
              firstFrame = { data: tailData, mimeType: 'image/png' };
            } catch {}
          }
        }
      } catch {}
    }
  }

  if (!firstFrame) {
    const plate = await findPlate(paths, filmId, shot.refs);
    if (!plate) {
      throw errValidation(
        `shot "${shot.id}" has no keyframe plate`,
        'keyframe_build the location first (staging before spend)',
      );
    }
    firstFrame = { data: plate.data, mimeType: 'image/png' }; // plate.png is png by name law
  }

  // 4. dialogue voices: every spoken line needs a registered CHARACTER —
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

  // 5. prompt geo: the SEQUENCE lock is the law; only an unlocked sequence
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

  // 6. compose (PURE; the 8000-char cap surfaces here as VALIDATION — before
  //    the gate, the quote and any fetch)
  const prompt = composeH3Prompt({
    action: shot.action,
    camera: shot.camera,
    cinematics: shot.cinematics,
    geoBlock,
    dialogue,
    sfx: shot.audioBlock.sfx,
    durationS: shot.durationS,
    platePresents: true, // the plate/firstFrame rung above guarantees Picture 1
  });

  // 7. STUDIO_LIVE gate + lane (lazily, per call) — the gate fires before
  //    the lane exists; a missing VULTR_INFERENCE_API_KEY → AUTH here.
  const lane = VultrLane.fromConfig(liveLaneConfig(studioRoot));
  const req = {
    prompt,
    durationS: shot.durationS,
    aspectRatio: opts.aspectRatio ?? shot.aspectRatio ?? '16:9',
    quality,
    firstFrame,
  };

  // 8. the money law, ONE copy (billed.ts): estimate → ensureBudget →
  //    submit → ledger(estimated) → jobs.json. NO result, NO recordSpend —
  //    download reconciles.
  const sub = await runBilledVideoSubmit({
    studioRoot,
    filmId,
    shotId: shot.id,
    tool,
    lane,
    request: req,
    promptVersion: H3_PROMPT_VERSION,
    ...(opts.parentJobId !== undefined ? { parentJobId: opts.parentJobId } : {}),
  });
  return { jobId: sub.jobId, estimateUsd: sub.estimateUsd, durationS: shot.durationS };
}

export function registerVideoTools(server: McpServer, studioRoot: string): void {
  const paths = studioPaths(studioRoot);

  // The flagship: the shot's doctrine → one gated, budgeted, async H3 render.
  // Identity travels THROUGH the plate (first_frame I2V); characters speak via
  // their voice.md; money is quoted and hard-stopped BEFORE the submit.
  server.tool('render_shot', {
    shot_id: z.string(),
    film_id: z.string().optional(),
    quality: z.enum(['turbo', 'standard', 'max', 'ultra', '2K', '4K']).optional(),
    aspect_ratio: z.enum(['16:9', '9:16', '1:1', '21:9', '4:3', '3:4']).optional(),
    chain_from_shot_id: z.string().optional(),
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

    // 4–8. the shared ladder (ONE copy — repair_shot reuses it verbatim)
    const sub = await submitShotRender({
      studioRoot,
      paths,
      filmId,
      shot,
      quality: a.quality ?? ('standard' as const),
      tool: 'render_shot',
      chainFromShotId: a.chain_from_shot_id,
      aspectRatio: a.aspect_ratio,
    });

    // 9. snake_case wire output
    return out({
      job_id: sub.jobId,
      status: 'pending', // 202 → pending, per the submit contract
      estimated_cost_usd: sub.estimateUsd,
      duration_s: sub.durationS,
      real_length_s: H3_REAL_LENGTHS[sub.durationS], // whole 24fps blocks run long
    });
  }));

  // Lifecycle poll: lane.status → jobs.json entry updated in place. A dead
  // job (failed/cancelled/expired) records its provider error verbatim (on
  // failed entries) and RELEASES the reserved estimate — only completed jobs
  // bill, spec §12.1; the negative ledger line (note 'refund') is the record,
  // idempotent by ledger scan. The reconcile only ever happens on a completed
  // download.
  server.tool('job_status', {
    job_id: z.string(),
    film_id: z.string().optional(),
  }, async (a) => guard(async () => {
    // 1. args
    if (!a.job_id.trim()) {
      throw errValidation('job_id is required', 'pass the job_id from render_shot output');
    }

    // 2. film + handle (all local — no fetch yet)
    await initStudio(paths);
    const filmId = a.film_id ?? (await getActiveFilm(paths));
    await filmMetaOrThrow(paths, filmId);
    const entry = await jobEntryOrThrow(paths, filmId, a.job_id);

    // 3. STUDIO_LIVE gate + lane (lazily, per call) — the gate precedes any fetch
    const lane = VultrLane.fromConfig(liveLaneConfig(studioRoot));
    const st = await lane.status({ jobId: entry.job_id });

    // 4. the refund law (reserve at submit → refund on failure): a dead job
    //    never bills — release the reserved estimate onto the film (negative
    //    spend) and record it append-only (tool 'job_status', note 'refund').
    //    Idempotent via the same ledger scan the reconcile uses: a prior
    //    'refund' line means the reserve is already back in the film's pocket;
    //    a prior 'reconcile' line means the job billed before dying (defensive
    //    — terminal statuses cannot follow a completed download).
    let refundNote: string | undefined;
    if (st.status === 'failed' || st.status === 'cancelled' || st.status === 'expired') {
      const { estimate, reconciled, refunded } = await ledgerFactsForJob(paths, filmId, entry.job_id);
      if (!reconciled && !refunded && estimate > 0.001) {
        await recordSpend(paths, filmId, -estimate);
        await appendLine(paths.ledgerPath(filmId), JSON.stringify({
          ts: new Date().toISOString(),
          tool: 'job_status',
          lane: 'vultr',
          film_id: filmId,
          cost_usd: -estimate,
          verdict: 'pending',
          job_id: entry.job_id,
          note: 'refund',
        }));
        refundNote = 'estimate refunded (only completed jobs bill)';
      }
    }

    // 5. jobs.json: status in place; error_verbatim on FAILED only — a
    //    completed entry must not keep a stale failure text; the refund note
    //    rides only when a refund actually fired.
    const updated = await updateJob(paths, filmId, entry.job_id, (e) => {
      const next = { ...e, status: st.status };
      if (st.status === 'failed' && st.errorVerbatim !== undefined) {
        next.error_verbatim = st.errorVerbatim;
      } else {
        delete next.error_verbatim;
      }
      if (refundNote !== undefined) next.note = refundNote;
      return next;
    });

    // 6. snake_case wire output — expires_in_hours from the payload's
    //    expires_at (null when the provider sent none)
    return out({
      job_id: updated.job_id,
      status: st.status,
      progress: st.progress,
      ...(st.errorVerbatim !== undefined ? { error_verbatim: st.errorVerbatim } : {}),
      expires_in_hours: hoursUntil(st.expiresAt),
    });
  }));

  // The download: gate on completed → lane.result (content + usage.cost) →
  // RECONCILE the accrual → mp4 → jobs.json completed entry. No budget check
  // here BY DESIGN: the provider charged at completion — refusing the download
  // cannot uncharge, it would only block recovering paid content.
  server.tool('job_download', {
    job_id: z.string(),
    film_id: z.string().optional(),
  }, async (a) => guard(async () => {
    // 1. args
    if (!a.job_id.trim()) {
      throw errValidation('job_id is required', 'pass the job_id from render_shot output');
    }

    // 2. film + handle (local)
    await initStudio(paths);
    const filmId = a.film_id ?? (await getActiveFilm(paths));
    await filmMetaOrThrow(paths, filmId);
    const entry = await jobEntryOrThrow(paths, filmId, a.job_id);

    // 3. one download per job: a second pass would reconcile the SAME charge
    //    twice. (A retry after a failed artifact write stays reachable — the
    //    entry gets no artifact_path until the write lands, and the ledger
    //    reconcile note keeps that path from double-accruing.)
    if (entry.artifact_path !== undefined) {
      throw errValidation(
        `job "${entry.job_id}" is already downloaded — artifact at ${entry.artifact_path}`,
        'use the stored artifact; re-running job_download would double the reconcile accrual',
      );
    }

    // 4. STUDIO_LIVE gate + lane — poll FIRST: content exists only on completed
    const lane = VultrLane.fromConfig(liveLaneConfig(studioRoot));
    const st = await lane.status({ jobId: entry.job_id });
    if (st.status !== 'completed') {
      if (st.status === 'failed') {
        // truthfulness: the refund law lives ONLY in job_status — this tool
        // cannot know whether the agent polled, so the NEXT points at the
        // (idempotent) poll instead of claiming a refund already ran
        throw errValidation(
          'job is failed, not completed',
          'failed jobs bill $0 — poll job_status to release the reserved estimate; re-render via repair_shot',
        );
      }
      if (st.status === 'cancelled' || st.status === 'expired') {
        // same truthfulness, dead-but-not-failed: job_status releases the
        // reserve (idempotent); this tool only refuses the download
        throw errValidation(
          `job is ${st.status}, not completed`,
          `${st.status} jobs bill $0 — poll job_status to release any reserved estimate`,
        );
      }
      throw errValidation(
        `job is ${st.status}, not completed — poll again`,
        'poll job_status until completed, then job_download',
      );
    }

    // 5. the download — usage.cost is the ACTUAL charge (the lane refuses a
    //    completed payload without it: money truth never silently zero)
    const art = await lane.result({ jobId: entry.job_id });

    // 6. RECONCILE ACCRUAL (the async money law): delta = actual − NET
    //    reservation (a refunded job's estimate is back in the film's pocket,
    //    so its reconcile accrues the ACTUAL in full — the ledger per job sums
    //    to the truth: estimate − refund + reconcile = actual);
    //    |delta| > 0.001 → recordSpend(delta) + the delta line (the append-only
    //    record — the original estimate line cannot be edited). recordSpend
    //    precedes the artifact write (money truth, billed.ts law): a failed
    //    mp4 write can never lose the charged delta. A prior reconcile line
    //    (the crash window above) skips the accrual — never double it.
    const { estimate, reconciled, refunded } = await ledgerFactsForJob(paths, filmId, entry.job_id);
    const net = refunded ? 0 : estimate;
    const delta = round4(art.costUsd - net);
    if (!reconciled && Math.abs(delta) > 0.001) {
      await recordSpend(paths, filmId, delta);
      await appendLine(paths.ledgerPath(filmId), JSON.stringify({
        ts: new Date().toISOString(),
        tool: 'job_download',
        lane: 'vultr',
        film_id: filmId,
        cost_usd: delta,
        verdict: 'pending',
        job_id: entry.job_id,
        note: 'reconcile',
      }));
    }

    // 7. the artifact: <filmDir>/renders/<job_id>/shot.mp4
    const jobDir = `${paths.filmDir(filmId)}/renders/${entry.job_id}`;
    const artifactPath = `${jobDir}/shot.mp4`;
    await ensureDir(jobDir);
    await writeFile(artifactPath, art.data);

    // 7b. post-download decode verification via ffprobe before ever marking completed
    const probe = await probeMedia(artifactPath);
    if (
      !probe.exists ||
      !probe.hasVideo ||
      probe.width <= 0 ||
      probe.height <= 0 ||
      probe.durationS <= 0.05 ||
      (probe.nbFrames > 0 && probe.nbFrames < 2)
    ) {
      await rename(artifactPath, `${jobDir}/shot.corrupt.mp4`).catch(() => {});
      await updateJob(paths, filmId, entry.job_id, (e) => {
        const next: VideoJobEntry = {
          ...e,
          status: 'failed',
          error_verbatim: 'downloaded video failed ffprobe decode validation',
          actual_cost_usd: art.costUsd,
        };
        delete next.artifact_path;
        delete next.note;
        return next;
      });
      throw errLaneDown(
        `downloaded video failed probeMedia decode validation (${probe.error ?? 'invalid video stream'})`,
        're-render with repair_shot',
      );
    }

    // Auto-extract tail frame for instant continuous chaining
    const tailFramePath = `${jobDir}/tail_frame.png`;
    try {
      await execFileAsync('ffmpeg', ['-y', '-sseof', '-0.1', '-i', artifactPath, '-frames:v', '1', '-q:v', '2', tailFramePath]);
    } catch {}

    // 7c. automated perceptual & signal QC via auditTake (local FFmpeg/FFprobe deterministic gate)
    const shot = await shotShow(paths, filmId, entry.shot_id).catch(() => undefined);
    const { referenceSheetPath, referencePlatePath } = await resolveShotAuditRefs(paths, filmId, shot?.refs ?? []);
    const qc = await auditTake({
      mp4Path: artifactPath,
      shotId: entry.shot_id,
      expectedAction: shot?.action ?? '',
      referenceSheetPath,
      referencePlatePath,
      durationS: probe.durationS || shot?.durationS || 5,
    });

    const fps = probe.fps;
    const reportedWidth = probe.width > 0 ? probe.width : art.width;
    const reportedHeight = probe.height > 0 ? probe.height : art.height;
    const resolution =
      reportedWidth && reportedHeight ? `${reportedWidth}x${reportedHeight}` : undefined;
    const durationS = Number(probe.durationS.toFixed(2));
    const hasAudio = art.hasAudio ?? probe.hasAudio;

    // 8. jobs.json: the completed entry carries the artifact + the actual facts;
    //    the refund note and any failure text described interim states — the
    //    reconcile supersedes them
    const updated = await updateJob(paths, filmId, entry.job_id, (e) => {
      const next: VideoJobEntry = {
        ...e,
        status: 'completed',
        artifact_path: artifactPath,
        actual_cost_usd: art.costUsd,
        ...(art.realSeconds !== undefined ? { real_seconds: art.realSeconds } : {}),
        ...(reportedWidth !== undefined ? { width: reportedWidth } : {}),
        ...(reportedHeight !== undefined ? { height: reportedHeight } : {}),
        has_audio: hasAudio,
        fps,
        ...(resolution !== undefined ? { resolution } : {}),
        duration_s: durationS,
        qc_verdict: qc.verdict,
        qc_score: qc.score,
        qc_issues: qc.reasons,
      };
      delete next.note;
      delete next.error_verbatim;
      return next;
    });

    // 9. snake_case wire output; retention: Vultr keeps content 7 days —
    //    warn under 48h remaining so the take is re-downloaded, not lost
    const expiresIn = hoursUntil(st.expiresAt);
    return out({
      job_id: updated.job_id,
      status: 'completed',
      artifact_path: updated.artifact_path,
      actual_cost_usd: updated.actual_cost_usd,
      ...(art.realSeconds !== undefined ? { real_length_s: art.realSeconds } : {}),
      ...(reportedWidth !== undefined ? { width: reportedWidth } : {}),
      ...(reportedHeight !== undefined ? { height: reportedHeight } : {}),
      has_audio: hasAudio,
      fps,
      ...(resolution !== undefined ? { resolution } : {}),
      duration_s: durationS,
      qc_verdict: qc.verdict,
      qc_score: qc.score,
      qc_issues: qc.reasons,
      ...(expiresIn !== null && expiresIn < 48
        ? { warning: `content expires in ${expiresIn}h — download or re-render` }
        : {}),
    });
  }));

  // The repair: v1 modes ONLY — extend (the agent's parent final-frame becomes
  // the child's first frame) and restyle (plain re-render of the same shot).
  // POST /v1/videos/edits is NOT wired (schema unverified — bring-up item,
  // see the file header); both modes submit plain /v1/videos child jobs with
  // parent_job_id lineage in jobs.json + the ledger line.
  server.tool('repair_shot', {
    shot_id: z.string(),
    parent_job_id: z.string(),
    mode: z.string(), // validated in the ladder — the refusal must name both v1 modes
    first_frame_path: z.string().optional(),
    film_id: z.string().optional(),
  }, async (a) => guard(async () => {
    // 1. args — mode first (pure arg check, precedes every resolution)
    if (!a.shot_id.trim()) {
      throw errValidation('shot_id is required', 'pass the shot to repair');
    }
    if (!a.parent_job_id.trim()) {
      throw errValidation(
        'parent_job_id is required',
        'pass the parent job_id from the earlier render_shot / repair_shot output',
      );
    }
    if (a.mode !== 'extend' && a.mode !== 'restyle') {
      throw errValidation(
        `mode "${a.mode}" is not a v1 repair mode`,
        "v1 modes: extend (first_frame_path = the parent's final-frame screenshot) or restyle (plain re-render of the same shot)",
      );
    }

    // 2. film: explicit id or the active one — VERIFIED
    await initStudio(paths);
    const filmId = a.film_id ?? (await getActiveFilm(paths));
    await filmMetaOrThrow(paths, filmId);

    // 3. shot exists
    const shot = await shotShow(paths, filmId, a.shot_id);

    // 4. the parent handle must exist — the lineage anchor
    await jobEntryOrThrow(paths, filmId, a.parent_job_id);

    // 5. mode-specific first frame: extend takes the agent-supplied parent
    //    final-frame (path resolution + extension law, one copy in image.ts);
    //    restyle renders from the plate and refuses the arg loudly — a
    //    silently dropped key would turn a repair into a wrong take.
    let firstFrame: { data: Buffer; mimeType: string } | undefined;
    if (a.mode === 'extend') {
      if (!a.first_frame_path?.trim()) {
        throw errValidation(
          'first_frame_path is required for mode extend',
          "supply the parent's final-frame screenshot path (M3.5 will extract it; until then the agent screenshots the parent render)",
        );
      }
      firstFrame = await readRefImage(paths, studioRoot, filmId, a.first_frame_path);
    } else if (a.first_frame_path !== undefined) {
      throw errValidation(
        'first_frame_path applies only to mode extend',
        'restyle re-renders the same shot — the plate carries identity; drop the arg or switch to extend',
      );
    }

    // 6. the SAME render ladder (shared core — one copy): action → duration →
    //    firstFrame-or-plate → voices → geo → compose → gate → budget → submit
    const sub = await submitShotRender({
      studioRoot,
      paths,
      filmId,
      shot,
      quality: 'standard', // v1 repair renders standard (render_shot's default)
      ...(firstFrame !== undefined ? { firstFrame } : {}),
      tool: 'repair_shot',
      parentJobId: a.parent_job_id,
    });

    // 7. snake_case wire output — same shape as render_shot plus the lineage
    return out({
      job_id: sub.jobId,
      status: 'pending',
      estimated_cost_usd: sub.estimateUsd,
      duration_s: sub.durationS,
      real_length_s: H3_REAL_LENGTHS[sub.durationS],
      parent_job_id: a.parent_job_id,
    });
  }));
}
