// src/store/shot.ts
import { readJson, writeJsonAtomic } from './fs.js';
import { errValidation, errNotFound } from '../errors.js';
import { assertId, filmMetaOrThrow, patchFilmMeta, type FilmMeta } from './film.js';
import { assetRefCheck } from './asset.js';
import type { StudioPaths } from './paths.js';

export interface ShotRef { assetId: string; role: 'character' | 'location' | 'prop' | 'style' | 'size_ref' }
export interface CameraBlock {
  lens: string;
  move: string;
  reason: string;
  rig?: 'tripod' | 'steadicam' | 'handheld' | 'technocrane' | 'dolly_track' | 'orbit_rig';
  movement?: 'static' | 'pan' | 'tilt' | 'dolly_in' | 'dolly_out' | 'truck_left' | 'truck_right' | 'pedestal_up' | 'pedestal_down' | 'orbit_180' | 'rack_focus';
  framing?: 'extreme_wide' | 'master_wide' | 'medium_ots' | 'close_up' | 'extreme_close_up';
  screenDirection?: 'screen_left' | 'screen_right' | 'center';
  eyelineTarget?: string;
  depthOfField?: 'deep' | 'shallow' | 'rack_focus';
}

export type FilmStock =
  | 'kodak_vision3_500t'
  | 'arri_alexa35_logc4'
  | 'fuji_eterna'
  | 'panavision_35mm'
  | 'tri_x_black_and_white'
  | 'cinestill_800t';

export type LensGlass =
  | 'anamorphic_2x_oval_bokeh'
  | 'cooke_speed_panchro'
  | 'zeiss_master_prime'
  | 'leica_summilux'
  | 'vintage_super16';

export type LightingSetup =
  | 'key_fill_4_to_1'
  | 'key_fill_2_to_1'
  | 'chiaroscuro_high_contrast'
  | 'rembrandt'
  | 'high_key_soft';

export type ColorTemperature =
  | 'tungsten_3200k'
  | 'golden_hour_2800k'
  | 'daylight_5600k'
  | 'overcast_6500k'
  | 'neon_mixed';

export type AtmosphereHaze =
  | 'clean_air'
  | 'subtle_volumetric_haze'
  | 'heavy_fog'
  | 'dust_particulates'
  | 'rain_splatter';

export interface CinematicsBlock {
  filmStock?: FilmStock;
  lensGlass?: LensGlass;
  lightingSetup?: LightingSetup;
  colorTemp?: ColorTemperature;
  atmosphere?: AtmosphereHaze;
}

export type ContinuityType = 'cut' | 'continuous' | 'match_cut' | 'transition';

export interface DialogueLine { voiceRef?: string; line: string }
export interface AudioBlock { dialogue?: DialogueLine[]; sfx?: string; music?: 'none' }
export interface TakeEntry { jobId: string; verdict: 'pending' | 'kept' | 'rejected'; costUsd?: number; notes?: string }

export interface ShotRecord {
  id: string; sequence: string;
  status: 'draft' | 'rendering' | 'kept' | 'rejected';
  action: string; // schema v2 (M3): the picture beat H3's [Shot N] block renders
  geoBlock: string; refs: ShotRef[]; camera: CameraBlock;
  cinematics?: CinematicsBlock;
  continuity?: ContinuityType;
  chainFromShotId?: string;
  audioBlock: AudioBlock;
  durationS: number; takes: TakeEntry[];
}

const MAX_TAKE_S = 30; // single-take ceiling; longer = chain via repair/extend (M3)

// The M3 job/verdict state machine depends on this whitelist; anything else is a
// doctrine breach, not a free-form field.
const STATUSES: readonly string[] = ['draft', 'rendering', 'kept', 'rejected'];

function validate(input: {
  status?: string; action?: string; geoBlock?: string; refs?: ShotRef[]; camera?: Partial<CameraBlock>; cinematics?: CinematicsBlock; continuity?: ContinuityType; chainFromShotId?: string; durationS?: number; audioBlock?: AudioBlock;
}): void {
  if (input.continuity !== undefined && !['cut', 'continuous', 'match_cut', 'transition'].includes(input.continuity)) {
    throw errValidation(`invalid continuity "${input.continuity}"`, 'allowed continuity: cut, continuous, match_cut, transition');
  }
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
  if (c.rig !== undefined && !['tripod', 'steadicam', 'handheld', 'technocrane', 'dolly_track', 'orbit_rig'].includes(c.rig)) {
    throw errValidation(`invalid camera.rig "${c.rig}"`, 'allowed rigs: tripod, steadicam, handheld, technocrane, dolly_track, orbit_rig');
  }
  if (c.movement !== undefined && !['static', 'pan', 'tilt', 'dolly_in', 'dolly_out', 'truck_left', 'truck_right', 'pedestal_up', 'pedestal_down', 'orbit_180', 'rack_focus'].includes(c.movement)) {
    throw errValidation(`invalid camera.movement "${c.movement}"`, 'allowed movement: static, pan, tilt, dolly_in, dolly_out, truck_left, truck_right, pedestal_up, pedestal_down, orbit_180, rack_focus');
  }
  if (c.framing !== undefined && !['extreme_wide', 'master_wide', 'medium_ots', 'close_up', 'extreme_close_up'].includes(c.framing)) {
    throw errValidation(`invalid camera.framing "${c.framing}"`, 'allowed framing: extreme_wide, master_wide, medium_ots, close_up, extreme_close_up');
  }
  if (c.screenDirection !== undefined && !['screen_left', 'screen_right', 'center'].includes(c.screenDirection)) {
    throw errValidation(`invalid camera.screen_direction "${c.screenDirection}"`, 'allowed directions: screen_left, screen_right, center');
  }
  if (c.depthOfField !== undefined && !['deep', 'shallow', 'rack_focus'].includes(c.depthOfField)) {
    throw errValidation(`invalid camera.depth_of_field "${c.depthOfField}"`, 'allowed depth_of_field: deep, shallow, rack_focus');
  }
  if (input.cinematics !== undefined) {
    const cin = input.cinematics;
    if (cin.filmStock !== undefined && !['kodak_vision3_500t', 'arri_alexa35_logc4', 'fuji_eterna', 'panavision_35mm', 'tri_x_black_and_white', 'cinestill_800t'].includes(cin.filmStock)) {
      throw errValidation(`invalid cinematics.film_stock "${cin.filmStock}"`, 'allowed film_stock: kodak_vision3_500t, arri_alexa35_logc4, fuji_eterna, panavision_35mm, tri_x_black_and_white, cinestill_800t');
    }
    if (cin.lensGlass !== undefined && !['anamorphic_2x_oval_bokeh', 'cooke_speed_panchro', 'zeiss_master_prime', 'leica_summilux', 'vintage_super16'].includes(cin.lensGlass)) {
      throw errValidation(`invalid cinematics.lens_glass "${cin.lensGlass}"`, 'allowed lens_glass: anamorphic_2x_oval_bokeh, cooke_speed_panchro, zeiss_master_prime, leica_summilux, vintage_super16');
    }
    if (cin.lightingSetup !== undefined && !['key_fill_4_to_1', 'key_fill_2_to_1', 'chiaroscuro_high_contrast', 'rembrandt', 'high_key_soft'].includes(cin.lightingSetup)) {
      throw errValidation(`invalid cinematics.lighting_setup "${cin.lightingSetup}"`, 'allowed lighting_setup: key_fill_4_to_1, key_fill_2_to_1, chiaroscuro_high_contrast, rembrandt, high_key_soft');
    }
    if (cin.colorTemp !== undefined && !['tungsten_3200k', 'golden_hour_2800k', 'daylight_5600k', 'overcast_6500k', 'neon_mixed'].includes(cin.colorTemp)) {
      throw errValidation(`invalid cinematics.color_temp "${cin.colorTemp}"`, 'allowed color_temp: tungsten_3200k, golden_hour_2800k, daylight_5600k, overcast_6500k, neon_mixed');
    }
    if (cin.atmosphere !== undefined && !['clean_air', 'subtle_volumetric_haze', 'heavy_fog', 'dust_particulates', 'rain_splatter'].includes(cin.atmosphere)) {
      throw errValidation(`invalid cinematics.atmosphere "${cin.atmosphere}"`, 'allowed atmosphere: clean_air, subtle_volumetric_haze, heavy_fog, dust_particulates, rain_splatter');
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

export function validateEyelineContinuity(current: ShotRecord, previous?: ShotRecord): void {
  if (!previous || !current.camera || !previous.camera) return;
  const cCur = current.camera;
  const cPrev = previous.camera;

  if (
    current.sequence === previous.sequence &&
    cCur.eyelineTarget &&
    cPrev.eyelineTarget &&
    cCur.eyelineTarget !== cPrev.eyelineTarget &&
    cCur.screenDirection &&
    cPrev.screenDirection
  ) {
    if (cCur.screenDirection === cPrev.screenDirection && cCur.screenDirection !== 'center') {
      throw errValidation(
        `180-degree axis violation between "${previous.id}" and "${current.id}": both actors staged on ${cCur.screenDirection} looking across the scene in the same direction`,
        `reverse angle on "${cCur.eyelineTarget}" must be placed on ${cCur.screenDirection === 'screen_left' ? 'screen_right' : 'screen_left'} to preserve eyeline continuity`,
      );
    }
  }
}

export async function shotCreate(paths: StudioPaths, filmId: string, input: {
  id: string; sequence: string; action: string; geoBlock: string; refs: ShotRef[];
  camera: CameraBlock; cinematics?: CinematicsBlock; continuity?: ContinuityType; chainFromShotId?: string; audioBlock: AudioBlock; durationS: number;
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

  // Eyeline and 180° axis continuity check if eyelines are specified
  if (input.camera?.eyelineTarget && input.camera?.screenDirection) {
    try {
      const { readdir } = await import('node:fs/promises');
      const files = await readdir(paths.shotsDir(filmId)).catch(() => []);
      for (const file of files) {
        if (!file.endsWith('.json')) continue;
        const s = await readJson<ShotRecord>(paths.shotPath(filmId, file.replace(/\.json$/, ''))).catch(() => null);
        if (s && s.sequence === input.sequence && s.id !== input.id) {
          validateEyelineContinuity({ ...input, status: 'draft', takes: [] }, s);
        }
      }
    } catch (e) {
      if ((e as { code?: string })?.code === 'VALIDATION') throw e;
    }
  }

  const record: ShotRecord = {
    id: input.id, sequence: input.sequence, status: 'draft',
    action: input.action, // stored verbatim — the composer injects it byte-for-byte
    geoBlock: input.geoBlock, refs: input.refs, camera: input.camera,
    ...(input.cinematics ? { cinematics: input.cinematics } : {}),
    ...(input.continuity ? { continuity: input.continuity } : {}),
    ...(input.chainFromShotId ? { chainFromShotId: input.chainFromShotId } : {}),
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
