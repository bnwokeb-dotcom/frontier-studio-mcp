// src/tools/billed.ts — the money-law sequences, extracted (M2 review mandate).
//
// ONE copy of the binding order for every billed take, per lane kind:
//   image (sync):  lane.price → ensureBudget → lane.submit → lane.result
//                  → recordSpend → writeArtifact → ledger line (8-key shape)
//   video (async): lane.estimatePrice → ensureBudget → lane.submit
//                  → ledger line (ESTIMATE, estimated: true) → jobs.json entry
// The three image tools call runBilledTake; render_shot (M3 Task 3) calls
// runBilledVideoSubmit — a hand-copy of either sequence in a tool is forbidden
// by review.
//
// VIDEO MONEY MODEL (binding ruling — reserve at submit, reconcile at
// download, refund on failure): the video lane is ASYNC — the provider charge
// is only knowable when the job COMPLETES, so the submit path RESERVES the
// estimate: recordSpend(estimate) fires HERE, the moment the provider accepts
// the job, so the budget law counts in-flight renders. The submit-time ledger
// line carries the ESTIMATE marked `estimated: true` (one extra key on this
// line type is the reconciliation design — the ledger is append-only JSONL).
// job_download (Task 4) reconciles: actual usage.cost − net reservation →
// delta line (note 'reconcile'); job_status releases the reserve when the job
// dies (failed/cancelled/expired — only completed jobs bill, spec §12.1) via a
// negative line (tool 'job_status', note 'refund'). Per job the ledger sums to
// the truth: estimate (− refund, if it died) + reconcile delta = actual.
//
// Money truth (the M2 deferred minor, hardened here): the provider has charged
// the moment result() returns, so recordSpend precedes local artifact I/O —
// a failed artifact write can never lose a charged take. In that failure the
// ledger line is still written, with cost_usd = the actual charged cost and
// artifact_path = '' (no living file points anywhere), and the write error
// surfaces to the caller.
import { appendLine } from '../store/fs.js';
import { studioPaths } from '../store/paths.js';
import { ensureBudget, recordSpend } from '../budget.js';
import { appendJob } from '../store/jobs.js';
import type { ImageLane, ImageLaneRequest } from '../lanes/types.js';
import type { VideoLane, VideoLaneRequest } from '../lanes/video.js';

export interface BilledTakeResult {
  artifactPath: string;
  data: Buffer;
  mimeType: string;
  costUsd: number;
  interactionId: string;
}

export async function runBilledTake(opts: {
  studioRoot: string;
  filmId: string;
  tool: string; // ledger tool name
  lane: ImageLane;
  request: ImageLaneRequest;
  writeArtifact: (data: Buffer, mimeType: string) => Promise<string>; // returns final living path
}): Promise<BilledTakeResult> {
  const { studioRoot, filmId, tool, lane, request, writeArtifact } = opts;
  const paths = studioPaths(studioRoot);

  // 1. the quote (estimate) — the only input to the budget hard stop
  const price = lane.price(request);

  // 2. hard stop BEFORE the API call
  await ensureBudget(paths, filmId, price);

  // 3. the take itself
  const interaction = await lane.submit(request);
  const artifact = await lane.result(interaction);

  // 4. money truth: the provider charged artifact.priceUsd — accrue BEFORE any
  //    local artifact I/O, so the charged cost is on the film no matter what
  //    the local write does
  await recordSpend(paths, filmId, artifact.priceUsd);

  // the 8-key ledger line builder; cost_usd is the ACTUAL charged cost from
  // result, never the pre-submit quote. lane is 'gemini' — the only billed lane
  // today.
  const ledgerLine = (artifactPath: string) =>
    JSON.stringify({
      ts: new Date().toISOString(),
      tool,
      lane: 'gemini',
      film_id: filmId,
      cost_usd: artifact.priceUsd,
      verdict: 'pending',
      interaction_id: artifact.interactionId,
      artifact_path: artifactPath,
    });

  // 5. the artifact write is the ONLY step allowed to fail after the charge
  let artifactPath: string;
  try {
    artifactPath = await writeArtifact(artifact.data, artifact.mimeType);
  } catch (e) {
    // the artifact is lost but the money is real: write the ledger line with an
    // empty artifact_path, then surface the write error. Best-effort: a failing
    // ledger write must not mask the artifact error the caller needs.
    try {
      await appendLine(paths.ledgerPath(filmId), ledgerLine(''));
    } catch {
      /* the artifact write error is the primary failure */
    }
    throw e;
  }

  // 6. ledger line with the living artifact path
  await appendLine(paths.ledgerPath(filmId), ledgerLine(artifactPath));

  return {
    artifactPath,
    data: artifact.data,
    mimeType: artifact.mimeType,
    costUsd: artifact.priceUsd,
    interactionId: artifact.interactionId,
  };
}

export interface BilledVideoSubmitResult {
  jobId: string;
  estimateUsd: number;
}

// The async money path, SUBMIT TIME ONLY (see the header money model):
// estimatePrice → ensureBudget → submit → recordSpend(RESERVE) →
// ledger(estimated) → jobs.json → return the handle. The caller must have
// resolved every refusal before here — no validation, ref or prompt-composition
// failure may follow the budget check.
export async function runBilledVideoSubmit(opts: {
  studioRoot: string;
  filmId: string;
  shotId: string;
  tool: string; // ledger tool name
  laneName?: 'vultr' | 'vertex';
  lane: VideoLane;
  request: VideoLaneRequest;
  promptVersion: string; // stamped on the jobs.json entry
  parentJobId?: string; // repair lineage (Task 4)
}): Promise<BilledVideoSubmitResult> {
  const { studioRoot, filmId, shotId, tool, lane, request, promptVersion, parentJobId } = opts;
  const laneName = opts.laneName ?? 'vultr';
  const paths = studioPaths(studioRoot);

  // 1. the quote (estimate) — the only input to the budget hard stop
  const estimate = lane.estimatePrice(request);

  // 2. hard stop BEFORE the API call
  await ensureBudget(paths, filmId, estimate);

  // 3. the async submit — 202 → job ref. The provider charge is NOT knowable
  //    here, but the quote becomes a RESERVED accrual the moment the provider
  //    accepts the job (the money model above): recordSpend precedes the local
  //    ledger/jobs writes — a failed write can never lose the reservation.
  //    job_download reconciles actual − estimate; job_status refunds the
  //    reserve when the job dies.
  const ref = await lane.submit(request);
  await recordSpend(paths, filmId, estimate);

  // 4. the money record: the ledger line carries the ESTIMATE, marked
  //    `estimated: true`. job_id replaces interaction_id (async jobs have no
  //    interaction); artifact_path is '' — no living file points anywhere yet.
  //    Repair submits (repair_shot, Task 4) stamp parent_job_id lineage too.
  await appendLine(paths.ledgerPath(filmId), JSON.stringify({
    ts: new Date().toISOString(),
    tool,
    lane: laneName,
    film_id: filmId,
    cost_usd: estimate,
    verdict: 'pending',
    job_id: ref.jobId,
    artifact_path: '',
    estimated: true,
    ...(parentJobId !== undefined ? { parent_job_id: parentJobId } : {}),
  }));

  // 5. jobs.json: the async handle the lifecycle tools (Task 4) poll and update
  await appendJob(paths, filmId, {
    job_id: ref.jobId,
    shot_id: shotId,
    lane: laneName,
    ...(parentJobId !== undefined ? { parent_job_id: parentJobId } : {}),
    status: 'pending',
    submitted_ts: new Date().toISOString(),
    prompt_version: promptVersion,
  });

  return { jobId: ref.jobId, estimateUsd: estimate };
}
