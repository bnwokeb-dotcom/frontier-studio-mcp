// src/store/jobs.ts — jobs.json: the async handle file for video-lane jobs.
//
// render_shot / repair_shot append one entry per submit (runBilledVideoSubmit
// in src/tools/billed.ts); the lifecycle tools (job_status / job_download, M3
// Task 4) poll and update entries in place. Shape (binding, M3 plan Task 3):
// { job_id, shot_id, lane, parent_job_id?, status, submitted_ts,
// prompt_version } — status uses the Vultr six-enum; the lifecycle tools fill
// the observation fields in place (error_verbatim on failed entries only, the
// download facts on completed ones).
import { readJson, writeJsonAtomic } from './fs.js';
import { StudioError, errNotFound } from '../errors.js';
import type { StudioPaths } from './paths.js';

export interface VideoJobEntry {
  job_id: string;
  shot_id: string;
  lane: 'vultr';
  parent_job_id?: string; // repair lineage (Task 4)
  status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'cancelled' | 'expired';
  submitted_ts: string;
  prompt_version: string;
  // lifecycle observations (Task 4), filled in place by job_status/job_download:
  error_verbatim?: string; // FAILED entries only — the provider's error, verbatim
  note?: string; // lifecycle note (e.g. 'estimate refunded (only completed jobs bill)')
  artifact_path?: string; // set once by job_download
  actual_cost_usd?: number; // usage.cost at completion (never the estimate)
  real_seconds?: number;
  width?: number;
  height?: number;
  has_audio?: boolean;
}

// Missing file → [] (no jobs submitted yet). Malformed JSON stays LOUD: a
// corrupted job file must never silently reset to empty — the lifecycle tools
// would lose their handles without anyone noticing.
export async function readJobs(paths: StudioPaths, filmId: string): Promise<VideoJobEntry[]> {
  try {
    return await readJson<VideoJobEntry[]>(paths.jobsPath(filmId));
  } catch (e) {
    if (e instanceof StudioError && e.code === 'NOT_FOUND') return [];
    throw e;
  }
}

// Read-modify-write via writeJsonAtomic (the film.json pattern); entries are
// appended in submit order.
export async function appendJob(paths: StudioPaths, filmId: string, entry: VideoJobEntry): Promise<void> {
  const jobs = await readJobs(paths, filmId);
  await writeJsonAtomic(paths.jobsPath(filmId), [...jobs, entry]);
}

// In-place entry update for the lifecycle tools (M3 Task 4): patch maps the
// current entry to the next one; the write is atomic. Unknown job_id →
// NOT_FOUND — the tools resolve the handle first, so this only fires on a
// jobs.json rewritten underneath a running call.
export async function updateJob(
  paths: StudioPaths,
  filmId: string,
  jobId: string,
  patch: (entry: VideoJobEntry) => VideoJobEntry,
): Promise<VideoJobEntry> {
  const jobs = await readJobs(paths, filmId);
  const idx = jobs.findIndex((j) => j.job_id === jobId);
  if (idx === -1) {
    throw errNotFound(`no such job "${jobId}"`, 'check render_shot output');
  }
  const next = jobs.map((j, i) => (i === idx ? patch(j) : j));
  await writeJsonAtomic(paths.jobsPath(filmId), next);
  return next[idx];
}
