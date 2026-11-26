// src/tools/registry.ts — the 8 registry tools, wired onto an McpServer.
//
// Wire discipline (plan, Type consistency): the MCP boundary is snake_case in
// BOTH directions — arguments AND tool output — while the store stays camelCase.
// fromWirePatch/toWire here own the mapping; clients can echo tool output back
// into a patch verbatim. Unknown patch keys are refused loudly, never dropped.
import { z } from 'zod';
import { execFile as execFileCb } from 'node:child_process';
import { access, mkdir, readdir, rm, writeFile } from 'node:fs/promises';
import { constants } from 'node:fs';
import { join } from 'node:path';
import { promisify } from 'node:util';
import { McpError } from '@modelcontextprotocol/sdk/types.js';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { loadConfig } from '../config.js';
import { getSharedBridgeQueue } from '../bridge/web_bridge_server.js';
import { studioPaths, type AssetKindDir } from '../store/paths.js';
import { filmCreate, filmShow, patchFilmMeta, type FilmMeta } from '../store/film.js';
import { initStudio, setActiveFilm, getActiveFilm } from '../store/studio.js';
import { assetRegister, type BiologicalMarkers } from '../store/asset.js';
import { shotCreate, shotUpdate, shotShow, type AudioBlock, type CameraBlock, type CinematicsBlock, type ShotRecord, type ShotRef } from '../store/shot.js';
import { sequenceLockGeo } from '../store/sequence.js';
import { StudioError, errValidation } from '../errors.js';

const execFileAsync = promisify(execFileCb);

async function existsReadable(filePath: string): Promise<boolean> {
  try {
    await access(filePath, constants.R_OK);
    return true;
  } catch {
    return false;
  }
}

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
const PATCH_KEYS = new Set(['status', 'sequence', 'geo_block', 'refs', 'camera', 'cinematics', 'aspect_ratio', 'continuity', 'chain_from_shot_id', 'audio_block', 'duration_s', 'action']);

const isStr = (v: unknown): v is string => typeof v === 'string';
const isNum = (v: unknown): v is number => typeof v === 'number';
const isObj = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

function fromWirePatch(patch: Record<string, unknown>, current: ShotRecord): Partial<ShotRecord> {
  const p: Record<string, unknown> = {};
  for (const k of Object.keys(patch)) {
    if (!PATCH_KEYS.has(k)) {
      throw errValidation(`unknown patch key "${k}"`,
        'allowed keys: action, geo_block, refs, camera, cinematics, aspect_ratio, continuity, chain_from_shot_id, audio_block, duration_s, status');
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
  if ('aspect_ratio' in patch) {
    if (!isStr(patch.aspect_ratio) || !['16:9', '9:16', '1:1', '21:9', '4:3', '3:4'].includes(patch.aspect_ratio)) {
      throw errValidation('patch.aspect_ratio must be 16:9|9:16|1:1|21:9|4:3|3:4', 'specify supported aspect ratio');
    }
    p.aspectRatio = patch.aspect_ratio as any;
  }
  if ('continuity' in patch) {
    if (!isStr(patch.continuity) || !['cut', 'continuous', 'match_cut', 'transition'].includes(patch.continuity)) {
      throw errValidation('patch.continuity must be cut|continuous|match_cut|transition', 'specify continuity');
    }
    p.continuity = patch.continuity as any;
  }
  if ('chain_from_shot_id' in patch) {
    if (patch.chain_from_shot_id !== null && !isStr(patch.chain_from_shot_id)) {
      throw errValidation('patch.chain_from_shot_id must be a string or null', 'pass parent shot id');
    }
    p.chainFromShotId = (patch.chain_from_shot_id as string) ?? undefined;
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
    ...(r.aspectRatio !== undefined ? { aspect_ratio: r.aspectRatio } : {}),
    ...(r.continuity !== undefined ? { continuity: r.continuity } : {}),
    ...(r.chainFromShotId !== undefined ? { chain_from_shot_id: r.chainFromShotId } : {}),
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
    voice_sample_path: z.string().optional(),
    voice_id: z.string().optional(),
    voice_provider: z.enum(['google', 'elevenlabs']).optional(),
    parent_dna: z.string().optional(),
    biological_markers: z.object({
      anatomy_profile: z.enum(['humanoid', 'creature', 'hybrid']).optional(),
      iris_color_hex: z.string().optional(),
      bone_structure: z.string().optional(),
      signature_marks: z.string().optional(),
      ethnic_ancestry: z.string().optional(),
      locomotion_rig: z.string().optional(),
      carapace_material: z.string().optional(),
      cornea_spec: z.string().optional(),
      collar_harness: z.string().optional(),
    }).optional(),
  }, async (a) => guard(async () => {
    const filmId = await filmIdOf(a.film_id);
    const biologicalMarkers: BiologicalMarkers | undefined = a.biological_markers
      ? {
          ...(a.biological_markers.anatomy_profile !== undefined ? { anatomyProfile: a.biological_markers.anatomy_profile } : {}),
          ...(a.biological_markers.iris_color_hex !== undefined ? { irisColorHex: a.biological_markers.iris_color_hex } : {}),
          ...(a.biological_markers.bone_structure !== undefined ? { boneStructure: a.biological_markers.bone_structure } : {}),
          ...(a.biological_markers.signature_marks !== undefined ? { signatureMarks: a.biological_markers.signature_marks } : {}),
          ...(a.biological_markers.ethnic_ancestry !== undefined ? { ethnicAncestry: a.biological_markers.ethnic_ancestry } : {}),
          ...(a.biological_markers.locomotion_rig !== undefined ? { locomotionRig: a.biological_markers.locomotion_rig } : {}),
          ...(a.biological_markers.carapace_material !== undefined ? { carapaceMaterial: a.biological_markers.carapace_material } : {}),
          ...(a.biological_markers.cornea_spec !== undefined ? { corneaSpec: a.biological_markers.cornea_spec } : {}),
          ...(a.biological_markers.collar_harness !== undefined ? { collarHarness: a.biological_markers.collar_harness } : {}),
        }
      : undefined;
    const { assetDir } = await assetRegister(paths, filmId, {
      kind: a.kind, assetId: a.asset_id, descriptor: a.descriptor,
      voice: a.voice, acting: a.acting, geoBlock: a.geo_block,
      voiceSamplePath: a.voice_sample_path,
      voiceId: a.voice_id,
      voiceProvider: a.voice_provider,
      parentDna: a.parent_dna,
      ...(biologicalMarkers && Object.keys(biologicalMarkers).length > 0 ? { biologicalMarkers } : {}),
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
    aspect_ratio: z.enum(['16:9', '9:16', '1:1', '21:9', '4:3', '3:4']).optional(),
    continuity: z.enum(['cut', 'continuous', 'match_cut', 'transition']).optional(),
    chain_from_shot_id: z.string().optional(),
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
      ...(a.aspect_ratio ? { aspectRatio: a.aspect_ratio } : {}),
      ...(a.continuity ? { continuity: a.continuity } : {}),
      ...(a.chain_from_shot_id ? { chainFromShotId: a.chain_from_shot_id } : {}),
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

  server.tool(
    'budget_set',
    'Sets or updates the hard budget cap (budget_usd) on a film record so pre-flight spend limits stay accurate.',
    {
      film_id: z.string().optional(),
      budget_usd: z.number(),
    },
    async (a) =>
      guard(async () => {
        if (!Number.isFinite(a.budget_usd) || a.budget_usd < 0) {
          throw errValidation(
            `invalid budget_usd "${a.budget_usd}"`,
            'pass a non-negative dollar budget_usd (e.g. 25)',
          );
        }
        const filmId = await filmIdOf(a.film_id);
        const updated = await patchFilmMeta(paths, filmId, (m) => ({
          ...m,
          budgetUsd: Number(a.budget_usd.toFixed(4)),
        }));
        const spent = updated.spentUsd ?? 0;
        const remaining = Math.max(0, Number(((updated.budgetUsd ?? 0) - spent).toFixed(4)));
        return out({
          film_id: updated.filmId,
          budget_usd: updated.budgetUsd,
          spent_usd: spent,
          remaining_usd: remaining,
        });
      }),
  );

  server.tool(
    'asset_list',
    'Lists all registered characters, locations, props, and styles in the film with sheet/plate/voice-lock readiness flags.',
    {
      film_id: z.string().optional(),
      kind: z.enum(['character', 'location', 'prop', 'style']).optional(),
    },
    async (a) =>
      guard(async () => {
        const filmId = await filmIdOf(a.film_id);
        await filmShow(paths, filmId);
        const kinds: Array<{ kind: 'character' | 'location' | 'prop' | 'style'; dir: AssetKindDir }> = [
          { kind: 'character', dir: 'characters' },
          { kind: 'location', dir: 'locations' },
          { kind: 'prop', dir: 'props' },
          { kind: 'style', dir: 'styles' },
        ];
        const filtered = a.kind ? kinds.filter((k) => k.kind === a.kind) : kinds;
        const assets: Array<Record<string, unknown>> = [];

        for (const entry of filtered) {
          const baseDir = join(paths.assetsDir(filmId), entry.dir);
          let names: string[] = [];
          try {
            names = (await readdir(baseDir)).sort();
          } catch {
            continue;
          }
          for (const assetId of names) {
            const dir = paths.assetDir(filmId, entry.dir, assetId);
            if (!(await existsReadable(join(dir, 'descriptor.md')))) continue;
            assets.push({
              asset_id: assetId,
              kind: entry.kind,
              has_sheet: await existsReadable(join(dir, 'sheet.png')),
              has_plate: await existsReadable(join(dir, 'plate.png')),
              has_geo_block: await existsReadable(join(dir, 'geo_block.md')),
              has_voice_sample: await existsReadable(join(dir, 'voice_sample.wav')),
              has_voice_profile: await existsReadable(join(dir, 'voice_profile.json')),
              asset_dir: dir,
            });
          }
        }

        return out({ film_id: filmId, count: assets.length, assets });
      }),
  );

  server.tool(
    'shot_list',
    'Lists registered shots in the film (optionally filtered by sequence or status) with continuity chaining and latest QC verdict.',
    {
      film_id: z.string().optional(),
      sequence: z.string().optional(),
      status: z.enum(['draft', 'rendering', 'kept', 'rejected']).optional(),
    },
    async (a) =>
      guard(async () => {
        const filmId = await filmIdOf(a.film_id);
        await filmShow(paths, filmId);
        let files: string[] = [];
        try {
          files = (await readdir(paths.shotsDir(filmId))).filter((f) => f.endsWith('.json')).sort();
        } catch {
          return out({ film_id: filmId, count: 0, shots: [] });
        }

        const shots: Array<Record<string, unknown>> = [];
        for (const f of files) {
          const s = await shotShow(paths, filmId, f.replace(/\.json$/, ''));
          if (a.sequence && s.sequence !== a.sequence) continue;
          if (a.status && s.status !== a.status) continue;
          const takes = s.takes ?? [];
          const latestTake = takes.length > 0 ? takes[takes.length - 1] : undefined;
          shots.push({
            id: s.id,
            sequence: s.sequence,
            status: s.status,
            duration_s: s.durationS,
            aspect_ratio: s.aspectRatio ?? '16:9',
            continuity: s.continuity ?? 'cut',
            chain_from_shot_id: s.chainFromShotId ?? null,
            takes_count: takes.length,
            latest_qc_verdict: latestTake?.verdict ?? null,
          });
        }
        return out({ film_id: filmId, count: shots.length, shots });
      }),
  );

  server.tool(
    'studio_doctor',
    'Runs a pre-flight production environment diagnostic checking FFmpeg/FFprobe, writable STUDIO_ROOT, active credentials, Chrome Bridge status, and active film health.',
    {
      film_id: z.string().optional(),
    },
    async (a) =>
      guard(async () => {
        const cfg = loadConfig();
        let ffmpegVersion: string | null = null;
        let ffprobeVersion: string | null = null;
        try {
          const r = await execFileAsync('ffmpeg', ['-version']);
          ffmpegVersion = (r.stdout || '').split(/\r?\n/)[0]?.trim() || 'available';
        } catch {}
        try {
          const r = await execFileAsync('ffprobe', ['-version']);
          ffprobeVersion = (r.stdout || '').split(/\r?\n/)[0]?.trim() || 'available';
        } catch {}

        let studioRootWritable = false;
        try {
          await initStudio(paths);
          const probeFile = join(studioRoot, `.doctor_probe_${Date.now()}`);
          await mkdir(studioRoot, { recursive: true });
          await writeFile(probeFile, 'ok', 'utf8');
          await rm(probeFile, { force: true });
          studioRootWritable = true;
        } catch {}

        const bridgeStatus = getSharedBridgeQueue(studioRoot).getStatus();
        let activeFilmSummary: Record<string, unknown> | null = null;
        try {
          const targetFilm = a.film_id ?? (await getActiveFilm(paths));
          const meta = await filmShow(paths, targetFilm);
          activeFilmSummary = {
            film_id: meta.filmId,
            title: meta.title,
            budget_usd: meta.budgetUsd ?? null,
            spent_usd: meta.spentUsd ?? 0,
            sequences_locked: Object.values(meta.sequences).filter((s) => Boolean(s.geoLocked)).length,
          };
        } catch {}

        const recommendations: string[] = [];
        if (!ffmpegVersion || !ffprobeVersion) {
          recommendations.push('Install ffmpeg and ffprobe onto PATH for audio normalization, rough cuts, and QC.');
        }
        if (!cfg.vultrApiKey) {
          recommendations.push('Set VULTR_INFERENCE_API_KEY + STUDIO_LIVE=1 for live MiniMax H3 video generation (or use video_import with Flow/Lumina MP4s).');
        }
        if (!cfg.geminiApiKey && bridgeStatus.connectedClients === 0) {
          recommendations.push('Either set GEMINI_API_KEY for API image/TTS calls OR connect the Chrome extension (extension/) for zero-API Google AI Pro captures.');
        }

        const ok = Boolean(ffmpegVersion && ffprobeVersion && studioRootWritable);
        return out({
          status: ok ? 'ready' : 'degraded',
          studio_root: studioRoot,
          studio_root_writable: studioRootWritable,
          binaries: { ffmpeg: ffmpegVersion, ffprobe: ffprobeVersion },
          lanes: {
            studio_live: cfg.studioLive,
            vultr_minimax_h3: Boolean(cfg.vultrApiKey),
            gemini_api: Boolean(cfg.geminiApiKey),
            elevenlabs_api: Boolean(cfg.elevenLabsApiKey),
            freesound_api: Boolean(cfg.freesoundApiKey),
            synclabs_api: Boolean(cfg.syncLabsApiKey),
            r2_storage: cfg.r2Configured,
          },
          bridge: bridgeStatus,
          active_film: activeFilmSummary,
          recommendations,
        });
      }),
  );
}
