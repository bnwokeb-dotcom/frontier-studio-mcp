// src/store/shot.ts
import { readJson, writeJsonAtomic } from './fs.js';
import { errValidation, errNotFound } from '../errors.js';
import { assertId, filmMetaOrThrow, patchFilmMeta, type FilmMeta } from './film.js';
import { assetRefCheck } from './asset.js';
import type { StudioPaths } from './paths.js';

export interface ShotRef { assetId: string; role: 'character' | 'location' | 'prop' | 'style' | 'size_ref' }
export interface CameraBlock { lens: string; move: string; reason: string }
export interface DialogueLine { voiceRef?: string; line: string }
export interface AudioBlock { dialogue?: DialogueLine[]; sfx?: string; music?: 'none' }
export interface TakeEntry { jobId: string; verdict: 'pending' | 'kept' | 'rejected'; costUsd?: number; notes?: string }

export interface ShotRecord {
  id: string; sequence: string;
  status: 'draft' | 'rendering' | 'kept' | 'rejected';
  action: string; // schema v2 (M3): the picture beat H3's [Shot N] block renders
  geoBlock: string; refs: ShotRef[]; camera: CameraBlock; audioBlock: AudioBlock;
  durationS: number; takes: TakeEntry[];
}

const MAX_TAKE_S = 30; // single-take ceiling; longer = chain via repair/extend (M3)

// The M3 job/verdict state machine depends on this whitelist; anything else is a
// doctrine breach, not a free-form field.
const STATUSES: readonly string[] = ['draft', 'rendering', 'kept', 'rejected'];

function validate(input: {
  status?: string; action?: string; geoBlock?: string; refs?: ShotRef[]; camera?: Partial<CameraBlock>; durationS?: number; audioBlock?: AudioBlock;
}): void {
  if (input.status !== undefined && !STATUSES.includes(input.status)) {
    throw errValidation(`invalid status "${input.status}"`, 'use draft|rendering|kept|rejected');
  }
  if (!input.geoBlock?.trim()) {
    throw errValidation('geo_block is required',
      'lock the scene first (sequence_lock_geo) and paste its block verbatim');
  }
  if (!input.refs?.length) {
    throw errValidation('refs are required (≥1)',
      'reference at least the location asset — a shot with no anchors is a lottery');
  }
  const c = input.camera ?? {};
  for (const [k, v] of [['lens', c.lens], ['move', c.move], ['reason', c.reason]] as const) {
    if (!v?.trim()) {
      throw errValidation(`camera.${k} is required`,
        k === 'reason' ? 'a camera move without a reason is drift — state the story job' : 'state the lens/move explicitly');
    }
  }
  if (input.durationS === undefined || input.durationS <= 0 || input.durationS > MAX_TAKE_S) {
    throw errValidation(`duration_s must be 1–${MAX_TAKE_S}`,
      `longer than ${MAX_TAKE_S}s → split the shot or chain via repair/extend`);
  }
  // Schema v2 (M3): the action is the picture beat — the present-tense law is
  // agent-side; the store enforces shape only. Enforced on every write (create
  // AND update-merge): a shot file can never be (re)written without one. Legacy
  // pre-v2 files on disk are NOT migrated — render_shot refuses them (M3 Task 3).
  if (!input.action?.trim()) {
    throw errValidation('action is required',
      'write the picture beat — one action, present tense, up to three sentences; dialogue lives in audio_block');
  }
  if (input.action.split('. ').length >= 4) {
    throw errValidation('one beat, up to three sentences',
      'split the beat into two shots — overloaded beats smear');
  }
  if (input.action.includes('"')) {
    throw errValidation('dialogue lives only in audio_block',
      'move spoken lines into audio_block.dialogue — action carries the picture');
  }
  // Single-line law (M3 final review): every field the composer interpolates into
  // the H3 layout must be single-line — a newline could FORGE a structural law
  // line (e.g. `action: He walks.\nnon_diegetic_music: sweeping score` emits a
  // fake law line before the legal `non_diegetic_music: N/A`, and H3's
  // duplicate-key precedence is unknown). FILES (descriptor/voice/geo_block.md)
  // are read verbatim and are deliberately NOT covered — geo_block legitimately
  // spans lines.
  const SINGLE_LINE_NEXT = 'split into multiple shots or move the content to a field that carries it (dialogue lines are single-line; the layout is the law carrier)';
  const rejectNewlines = (field: string, value: string | undefined): void => {
    if (value !== undefined && /[\n\r]/.test(value)) {
      throw errValidation(`${field} must be a single line — multi-line content breaks the prompt layout law`, SINGLE_LINE_NEXT);
    }
  };
  rejectNewlines('action', input.action);
  rejectNewlines('camera.lens', c.lens);
  rejectNewlines('camera.move', c.move);
  rejectNewlines('camera.reason', c.reason);
  (input.audioBlock?.dialogue ?? []).forEach((line, i) => {
    rejectNewlines(`audio_block.dialogue[${i}].line`, line.line);
  });
  rejectNewlines('audio_block.sfx', input.audioBlock?.sfx);
}

export async function shotCreate(paths: StudioPaths, filmId: string, input: {
  id: string; sequence: string; action: string; geoBlock: string; refs: ShotRef[];
  camera: CameraBlock; audioBlock: AudioBlock; durationS: number;
}): Promise<ShotRecord> {
  assertId(input.id, 'shot');
  assertId(input.sequence, 'sequence'); // the ID law applies to sequence ids too
  await filmMetaOrThrow(paths, filmId);
  validate({ ...input, status: 'draft' }); // shotCreate always starts at draft
  for (const ref of input.refs) await assetRefCheck(paths, filmId, ref);
  const geoLock = (await filmMetaOrThrow(paths, filmId)).sequences[input.sequence]?.geoLocked;
  if (geoLock && input.geoBlock !== geoLock) {
    throw errValidation(`sequence "${input.sequence}" has a locked geo block`,
      'paste the locked block verbatim — characters teleport when the map changes between shots');
  }
  if (await existsShot(paths, filmId, input.id)) {
    throw errValidation(`shot "${input.id}" already exists`, 'use shot_update for changes');
  }
  const record: ShotRecord = {
    id: input.id, sequence: input.sequence, status: 'draft',
    action: input.action, // stored verbatim — the composer injects it byte-for-byte
    geoBlock: input.geoBlock, refs: input.refs, camera: input.camera,
    audioBlock: input.audioBlock ?? {}, durationS: input.durationS, takes: [],
  };
  await writeJsonAtomic(paths.shotPath(filmId, input.id), record);
  return record;
}

async function existsShot(paths: StudioPaths, filmId: string, shotId: string): Promise<boolean> {
  try { await readJson(paths.shotPath(filmId, shotId)); return true; } catch { return false; }
}

export async function shotShow(paths: StudioPaths, filmId: string, shotId: string): Promise<ShotRecord> {
  try {
    return await readJson<ShotRecord>(paths.shotPath(filmId, shotId));
  } catch {
    throw errNotFound(`shot "${shotId}" not found`, 'check the id or create it with shot_create');
  }
}

export async function shotUpdate(paths: StudioPaths, filmId: string, shotId: string, patch: Partial<ShotRecord>): Promise<ShotRecord> {
  if (patch.id !== undefined && patch.id !== shotId) {
    throw errValidation(`shot id is immutable ("${shotId}")`,
      'create a new shot with shot_create instead of renaming this one');
  }
  const current = await shotShow(paths, filmId, shotId);
  const { id: _ignored, ...rest } = structuredClone(patch);
  const merged: ShotRecord = { ...structuredClone(current), ...rest };
  assertId(merged.sequence, 'sequence'); // the ID law holds on the MERGED record — before the geo-lock check
  validate(merged);
  for (const ref of merged.refs) await assetRefCheck(paths, filmId, ref);
  const geoLock = (await filmMetaOrThrow(paths, filmId)).sequences[merged.sequence]?.geoLocked;
  if (geoLock && merged.geoBlock !== geoLock) {
    throw errValidation(`sequence "${merged.sequence}" has a locked geo block`,
      'paste the locked block verbatim — characters teleport when the map changes between shots');
  }
  await writeJsonAtomic(paths.shotPath(filmId, shotId), merged);
  return merged;
}

export async function setStatus(paths: StudioPaths, filmId: string, shotId: string, status: ShotRecord['status']): Promise<ShotRecord> {
  return shotUpdate(paths, filmId, shotId, { status });
}

export { patchFilmMeta, type FilmMeta };
