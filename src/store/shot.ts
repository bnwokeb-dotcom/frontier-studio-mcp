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
  geoBlock: string; refs: ShotRef[]; camera: CameraBlock; audioBlock: AudioBlock;
  durationS: number; takes: TakeEntry[];
}

const MAX_TAKE_S = 30; // single-take ceiling; longer = chain via repair/extend (M3)

function validate(input: {
  geoBlock?: string; refs?: ShotRef[]; camera?: Partial<CameraBlock>; durationS?: number;
}): void {
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
}

export async function shotCreate(paths: StudioPaths, filmId: string, input: {
  id: string; sequence: string; geoBlock: string; refs: ShotRef[];
  camera: CameraBlock; audioBlock: AudioBlock; durationS: number;
}): Promise<ShotRecord> {
  assertId(input.id, 'shot');
  await filmMetaOrThrow(paths, filmId);
  validate(input);
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
