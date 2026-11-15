// src/store/jobs.ts — jobs.json: the async handle file for video-lane jobs.
//
// render_shot appends one entry per submit (runBilledVideoSubmit in
// src/tools/billed.ts); the lifecycle tools (job_status / job_download, M3
// Task 4) poll and update entries in place. Shape (binding, M3 plan Task 3):
// { job_id, shot_id, lane, parent_job_id?, status, submitted_ts,
// prompt_version } — status uses the Vultr six-enum.
import { readJson, writeJsonAtomic } from './fs.js';
import { StudioError } from '../errors.js';
import type { StudioPaths } from './paths.js';

export interface VideoJobEntry {
  job_id: string;
  shot_id: string;
  lane: 'vultr';
  parent_job_id?: string; // repair lineage (Task 4)
  status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'cancelled' | 'expired';
  submitted_ts: string;
  prompt_version: string;
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
