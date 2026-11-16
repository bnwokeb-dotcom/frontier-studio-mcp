// src/tools/registry.ts — the 8 registry tools, wired onto an McpServer.
//
// Wire discipline (plan, Type consistency): the MCP boundary is snake_case in
// BOTH directions — arguments AND tool output — while the store stays camelCase.
// fromWirePatch/toWire here own the mapping; clients can echo tool output back
// into a patch verbatim. Unknown patch keys are refused loudly, never dropped.
import { z } from 'zod';
import { McpError } from '@modelcontextprotocol/sdk/types.js';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { studioPaths } from '../store/paths.js';
import { filmCreate, filmShow, type FilmMeta } from '../store/film.js';
import { initStudio, setActiveFilm, getActiveFilm } from '../store/studio.js';
import { assetRegister } from '../store/asset.js';
import { shotCreate, shotUpdate, shotShow, type AudioBlock, type CameraBlock, type CinematicsBlock, type ShotRecord, type ShotRef } from '../store/shot.js';
import { sequenceLockGeo } from '../store/sequence.js';
import { StudioError, errValidation } from '../errors.js';

// Error map (binding ruling): VALIDATION|NOT_FOUND → -32602 (InvalidParams);
// AUTH|BUDGET|LANE_DOWN|JOB_FAILED → -32000 (implementation-defined server error).
// The message is the StudioError message, which already embeds " — NEXT: <fix>".
const VALIDATION_CLASS = new Set(['VALIDATION', 'NOT_FOUND']);

export function toMcpError(e: unknown): unknown {
  if (e instanceof StudioError) {
    return new McpError(VALIDATION_CLASS.has(e.code) ? -32602 : -32000, e.message);
  }
  return e;
}

// Exported for the image-lane tools (src/tools/image.ts) — the guard→MCP error
// map and the JSON text-block wrapper are shared, never duplicated.
export async function guard<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (e) {
    throw toMcpError(e);
  }
}

export function out(x: unknown) {
  return { content: [{ type: 'text' as const, text: typeof x === 'string' ? x : JSON.stringify(x, null, 2) }] };
}

// --- wire → store mapping ---------------------------------------------------

type WireRef = { asset_id: string; role: 'character' | 'location' | 'prop' | 'style' | 'size_ref' };
type WireAudioBlock = {
  dialogue?: { voice_ref?: string; line: string }[];
  sfx?: string;
  music?: 'none';
};

const toStoreRef = (r: WireRef) => ({ assetId: r.asset_id, role: r.role });

function toWireCamera(c: CameraBlock | undefined) {
  if (!c) return { lens: '', move: '', reason: '' };
  const w: Record<string, unknown> = {
    lens: c.lens,
    move: c.move,
    reason: c.reason,
  };
  if (c.rig !== undefined) w.rig = c.rig;
  if (c.movement !== undefined) w.movement = c.movement;
  if (c.framing !== undefined) w.framing = c.framing;
  if (c.screenDirection !== undefined) w.screen_direction = c.screenDirection;
  if (c.eyelineTarget !== undefined) w.eyeline_target = c.eyelineTarget;
  if (c.depthOfField !== undefined) w.depth_of_field = c.depthOfField;
  return w;
}

function fromWireCamera(c: Record<string, unknown>): CameraBlock {
  const store: Record<string, unknown> = {};
  if ('lens' in c) store.lens = c.lens;
  if ('move' in c) store.move = c.move;
  if ('reason' in c) store.reason = c.reason;
  if ('rig' in c) store.rig = c.rig;
  if ('movement' in c) store.movement = c.movement;
  if ('framing' in c) store.framing = c.framing;
  if ('screen_direction' in c) store.screenDirection = c.screen_direction;
  if ('screenDirection' in c) store.screenDirection = c.screenDirection;
  if ('eyeline_target' in c) store.eyelineTarget = c.eyeline_target;
  if ('eyelineTarget' in c) store.eyelineTarget = c.eyelineTarget;
  if ('depth_of_field' in c) store.depthOfField = c.depth_of_field;
  if ('depthOfField' in c) store.depthOfField = c.depthOfField;
  return store as unknown as CameraBlock;
}

function toWireCinematics(c: CinematicsBlock | undefined) {
  if (!c) return undefined;
  const w: Record<string, unknown> = {};
  if (c.filmStock !== undefined) w.film_stock = c.filmStock;
  if (c.lensGlass !== undefined) w.lens_glass = c.lensGlass;
  if (c.lightingSetup !== undefined) w.lighting_setup = c.lightingSetup;
  if (c.colorTemp !== undefined) w.color_temp = c.colorTemp;
  if (c.atmosphere !== undefined) w.atmosphere = c.atmosphere;
  return w;
}

function fromWireCinematics(c: Record<string, unknown>): CinematicsBlock {
  const store: Record<string, unknown> = {};
  if ('film_stock' in c) store.filmStock = c.film_stock;
  if ('filmStock' in c) store.filmStock = c.filmStock;
  if ('lens_glass' in c) store.lensGlass = c.lens_glass;
  if ('lensGlass' in c) store.lensGlass = c.lensGlass;
  if ('lighting_setup' in c) store.lightingSetup = c.lighting_setup;
  if ('lightingSetup' in c) store.lightingSetup = c.lightingSetup;
  if ('color_temp' in c) store.colorTemp = c.color_temp;
  if ('colorTemp' in c) store.colorTemp = c.colorTemp;
  if ('atmosphere' in c) store.atmosphere = c.atmosphere;
  return store as unknown as CinematicsBlock;
}

// R3: emit ONLY the keys present on the wire — absent keys stay absent so a
// partial patch never persists undefined over stored data.
const toStoreAudio = (b: WireAudioBlock): AudioBlock => {
  const audio: AudioBlock = {};
  if (b.dialogue !== undefined) audio.dialogue = b.dialogue.map((d) => ({ voiceRef: d.voice_ref, line: d.line }));
  if (b.sfx !== undefined) audio.sfx = b.sfx;
  if (b.music !== undefined) audio.music = b.music;
  return audio;
};

// shot_update patch: snake_case wire keys → camelCase store keys. The patch is
// built ONLY from the known snake_case keys; ANY other key is refused loudly —
// a silently dropped key would turn an echo-driven patch into a silent no-op.
// The store re-validates the merged record, so malformed values surface as
// doctrine refusals; wrong-typed known keys are refused here so they can never
// be silently skipped or smuggled past the store's checks.
// audio_block merges ONTO the current record's audioBlock (the store merges
// shallowly, so without this a partial audio patch would drop stored keys).
const PATCH_KEYS = new Set(['status', 'sequence', 'geo_block', 'refs', 'camera', 'cinematics', 'audio_block', 'duration_s', 'action']);

const isStr = (v: unknown): v is string => typeof v === 'string';
const isNum = (v: unknown): v is number => typeof v === 'number';
const isObj = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

function fromWirePatch(patch: Record<string, unknown>, current: ShotRecord): Partial<ShotRecord> {
  const p: Record<string, unknown> = {};
  for (const k of Object.keys(patch)) {
    if (!PATCH_KEYS.has(k)) {
      throw errValidation(`unknown patch key "${k}"`,
        'allowed keys: action, geo_block, refs, camera, cinematics, audio_block, duration_s, status');
    }
  }
  if ('status' in patch) p.status = patch.status; // store enforces the status whitelist
  if ('sequence' in patch) p.sequence = patch.sequence; // store enforces the ID law + geo-lock re-check
  if ('action' in patch) {
    if (!isStr(patch.action)) throw errValidation('patch.action must be a string', 'action is the picture beat — one action, up to three sentences, no dialogue');
    p.action = patch.action; // store enforces the schema-v2 shape (non-empty, ≤3 sentences, no quotes)
  }
  if ('geo_block' in patch) {
    if (!isStr(patch.geo_block)) throw errValidation('patch.geo_block must be a string', 'paste the geo block text verbatim');
    p.geoBlock = patch.geo_block;
  }
  if ('duration_s' in patch) {
    if (!isNum(patch.duration_s)) throw errValidation('patch.duration_s must be a number', 'duration is seconds, 1–30');
    p.durationS = patch.duration_s;
  }
  if ('refs' in patch) {
    if (!Array.isArray(patch.refs)) throw errValidation('patch.refs must be an array', 'send refs as [{ asset_id, role }]');
    p.refs = (patch.refs as WireRef[]).map(toStoreRef);
  }
  if ('camera' in patch) {
    if (!isObj(patch.camera)) throw errValidation('patch.camera must be an object', 'send camera as { lens, move, reason, ... }');
    p.camera = fromWireCamera(patch.camera);
  }
  if ('cinematics' in patch) {
    if (!isObj(patch.cinematics)) throw errValidation('patch.cinematics must be an object', 'send cinematics as { film_stock?, lens_glass?, lighting_setup?, color_temp?, atmosphere? }');
    p.cinematics = fromWireCinematics(patch.cinematics);
  }
  if ('audio_block' in patch) {
    if (!isObj(patch.audio_block)) throw errValidation('patch.audio_block must be an object', 'send audio_block as { dialogue?, sfx?, music? }');
    p.audioBlock = { ...current.audioBlock, ...toStoreAudio(patch.audio_block as WireAudioBlock) };
  }
  return p as Partial<ShotRecord>;
}

// --- store → wire mapping (the mirror of the above) --------------------------
// Tool output is snake_case too, so a client can read a shot_show record and
// feed its keys straight back into a shot_update patch (symmetric boundary).

const toWireRef = (r: ShotRef) => ({ asset_id: r.assetId, role: r.role });

const toWireAudio = (b: AudioBlock | undefined): WireAudioBlock => {
  const audio: WireAudioBlock = {};
  if (!b) return audio;
  if (b.dialogue !== undefined) {
    audio.dialogue = b.dialogue.map((d) => ({
      ...(d.voiceRef !== undefined ? { voice_ref: d.voiceRef } : {}),
      line: d.line,
    }));
  }
  if (b.sfx !== undefined) audio.sfx = b.sfx;
  if (b.music !== undefined) audio.music = b.music;
  return audio;
};

function toWireShot(r: ShotRecord) {
  return {
    id: r.id,
    sequence: r.sequence,
    status: r.status,
    action: r.action, // absent on legacy pre-v2 records — JSON drops undefined
    geo_block: r.geoBlock,
    refs: (r.refs ?? []).map(toWireRef),
    camera: toWireCamera(r.camera),
    ...(r.cinematics !== undefined ? { cinematics: toWireCinematics(r.cinematics) } : {}),
    audio_block: toWireAudio(r.audioBlock),
    duration_s: r.durationS,
    takes: (r.takes ?? []).map((t) => {
      const w: Record<string, unknown> = { job_id: t.jobId, verdict: t.verdict };
      if (t.costUsd !== undefined) w.cost_usd = t.costUsd;
      if (t.notes !== undefined) w.notes = t.notes;
      return w;
    }),
  };
}

function toWireFilm(m: FilmMeta) {
  return {
    film_id: m.filmId,
    title: m.title,
    logline: m.logline,
    ...(m.budgetUsd !== undefined ? { budget_usd: m.budgetUsd } : {}),
    ...(m.targetRuntimeMin !== undefined ? { target_runtime_min: m.targetRuntimeMin } : {}),
    sequences: Object.fromEntries(Object.entries(m.sequences).map(([seq, lock]) => [seq, {
      ...(lock.geoLocked !== undefined ? { geo_locked: lock.geoLocked } : {}),
      ...(lock.budgetUsd !== undefined ? { budget_usd: lock.budgetUsd } : {}),
    }])),
    universe_links: m.universeLinks,
    created_at: m.createdAt,
  };
}

// --- tool registration ------------------------------------------------------

export function registerRegistryTools(server: McpServer, studioRoot: string): void {
  const paths = studioPaths(studioRoot);

  // film-scoped tools take film_id optionally; omitted → the active film
  // (getActiveFilm throws NOT_FOUND with the fix when none is set).
  const filmIdOf = async (filmId: string | undefined): Promise<string> => {
    await initStudio(paths);
    return filmId ?? getActiveFilm(paths);
  };

  server.tool('film_create', {
    film_id: z.string(),
    title: z.string(),
    logline: z.string(),
    budget_usd: z.number().optional(),
    target_runtime_min: z.number().optional(),
  }, async (a) => guard(async () => {
    await initStudio(paths);
    await filmCreate(paths, a.film_id, {
      title: a.title, logline: a.logline,
      budgetUsd: a.budget_usd, targetRuntimeMin: a.target_runtime_min,
    });
    // A newly created film becomes the active one, so film_show() resolves it.
    await setActiveFilm(paths, a.film_id);
    return out(a.film_id);
  }));

  server.tool('film_set_active', { film_id: z.string() }, async (a) => guard(async () => {
    await initStudio(paths);
    await setActiveFilm(paths, a.film_id);
    return out(`active film: ${a.film_id}`);
  }));

  server.tool('film_show', {}, async () => guard(async () => {
    const filmId = await filmIdOf(undefined); // getActiveFilmOrThrow ≡ store getActiveFilm (throws NOT_FOUND when unset)
    return out(toWireFilm(await filmShow(paths, filmId)));
  }));

  server.tool('asset_register', {
    film_id: z.string().optional(),
    kind: z.enum(['character', 'location', 'prop', 'style']),
    asset_id: z.string(),
    descriptor: z.string(),
    voice: z.string().optional(),
    acting: z.string().optional(),
    geo_block: z.string().optional(),
  }, async (a) => guard(async () => {
    const filmId = await filmIdOf(a.film_id);
    const { assetDir } = await assetRegister(paths, filmId, {
      kind: a.kind, assetId: a.asset_id, descriptor: a.descriptor,
      voice: a.voice, acting: a.acting, geoBlock: a.geo_block,
    });
    return out(assetDir);
  }));

  // Doctrine fields (action/geo_block/refs/camera/duration_s) stay optional at
  // the zod layer on purpose: the discipline refusals ("action is required",
  // "geo_block is required", the NEXT lines, …) are StudioErrors from the
  // store — a strict shape would replace them with generic zod "Input
  // validation error" text before the handler ever runs.
  server.tool('shot_create', {
    film_id: z.string().optional(),
    id: z.string(),
    sequence: z.string(),
    action: z.string().optional(),
    geo_block: z.string().optional(),
    refs: z.array(z.object({
      asset_id: z.string(),
      role: z.enum(['character', 'location', 'prop', 'style', 'size_ref']),
    })).optional(),
    camera: z.object({
      lens: z.string().optional(),
      move: z.string().optional(),
      reason: z.string().optional(),
      rig: z.enum(['tripod', 'steadicam', 'handheld', 'technocrane', 'dolly_track', 'orbit_rig']).optional(),
      movement: z.enum(['static', 'pan', 'tilt', 'dolly_in', 'dolly_out', 'truck_left', 'truck_right', 'pedestal_up', 'pedestal_down', 'orbit_180', 'rack_focus']).optional(),
      framing: z.enum(['extreme_wide', 'master_wide', 'medium_ots', 'close_up', 'extreme_close_up']).optional(),
      screen_direction: z.enum(['screen_left', 'screen_right', 'center']).optional(),
      eyeline_target: z.string().optional(),
      depth_of_field: z.enum(['deep', 'shallow', 'rack_focus']).optional(),
    }).passthrough().optional(),
    cinematics: z.object({
      film_stock: z.string().optional(),
      lens_glass: z.string().optional(),
      lighting_setup: z.string().optional(),
      color_temp: z.string().optional(),
      atmosphere: z.string().optional(),
    }).passthrough().optional(),
    audio_block: z.object({
      dialogue: z.array(z.object({ voice_ref: z.string().optional(), line: z.string() })).optional(),
      sfx: z.string().optional(),
      music: z.literal('none').optional(),
    }).optional(),
    duration_s: z.number().optional(),
  }, async (a) => guard(async () => {
    const filmId = await filmIdOf(a.film_id);
    const record = await shotCreate(paths, filmId, {
      id: a.id,
      sequence: a.sequence,
      action: a.action ?? '',
      geoBlock: a.geo_block ?? '',
      refs: (a.refs ?? []).map(toStoreRef),
      camera: fromWireCamera(a.camera ?? {}),
      ...(a.cinematics ? { cinematics: fromWireCinematics(a.cinematics) } : {}),
      audioBlock: a.audio_block ? toStoreAudio(a.audio_block) : {},
      durationS: a.duration_s ?? 0,
    });
    return out(toWireShot(record));
  }));

  server.tool('shot_update', 'Patch a shot; patch keys are snake_case: action, status, sequence, geo_block, refs, camera, cinematics, audio_block, duration_s (id is immutable; unknown keys are refused).', {
    film_id: z.string().optional(),
    shot_id: z.string(),
    patch: z.record(z.unknown()),
  }, async (a) => guard(async () => {
    const filmId = await filmIdOf(a.film_id);
    const current = await shotShow(paths, filmId, a.shot_id); // NOT_FOUND surfaces before any merge
    return out(toWireShot(await shotUpdate(paths, filmId, a.shot_id, fromWirePatch(a.patch, current))));
  }));

  server.tool('shot_show', { film_id: z.string().optional(), shot_id: z.string() },
    async (a) => guard(async () => out(toWireShot(await shotShow(paths, await filmIdOf(a.film_id), a.shot_id)))));

  server.tool('sequence_lock_geo', { film_id: z.string().optional(), sequence: z.string(), geo_block: z.string() },
    async (a) => guard(async () => {
      const filmId = await filmIdOf(a.film_id);
      await sequenceLockGeo(paths, filmId, a.sequence, a.geo_block);
      return out(`locked ${a.sequence}`);
    }));
}
