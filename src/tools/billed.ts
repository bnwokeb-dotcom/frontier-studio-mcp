// src/tools/billed.ts — the money-law sequence, extracted (M2 review mandate).
//
// ONE copy of the binding order for every billed take:
//   lane.price → ensureBudget → lane.submit → lane.result → recordSpend
//   → writeArtifact → ledger line (8-key shape)
// The three image tools call this; render_shot (Task 3) must too — a 4th
// hand-copy is forbidden by review.
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
import type { ImageLane, ImageLaneRequest } from '../lanes/types.js';

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
