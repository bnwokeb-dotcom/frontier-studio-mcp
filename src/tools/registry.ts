// src/tools/registry.ts — the 8 registry tools, wired onto an McpServer.
//
// Wire discipline (plan, Type consistency): snake_case argument names at the MCP
// boundary, camelCase in the store. All wire → store mapping lives in this file only.
import { z } from 'zod';
import { McpError } from '@modelcontextprotocol/sdk/types.js';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { studioPaths } from '../store/paths.js';
import { filmCreate, filmShow } from '../store/film.js';
import { initStudio, setActiveFilm, getActiveFilm } from '../store/studio.js';
import { assetRegister } from '../store/asset.js';
import { shotCreate, shotUpdate, shotShow, type AudioBlock, type ShotRecord } from '../store/shot.js';
import { sequenceLockGeo } from '../store/sequence.js';
import { StudioError } from '../errors.js';

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

async function guard<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (e) {
    throw toMcpError(e);
  }
}

function out(x: unknown) {
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

// R3: emit ONLY the keys present on the wire — absent keys stay absent so a
// partial patch never persists undefined over stored data.
const toStoreAudio = (b: WireAudioBlock): AudioBlock => {
  const audio: AudioBlock = {};
  if (b.dialogue !== undefined) audio.dialogue = b.dialogue.map((d) => ({ voiceRef: d.voice_ref, line: d.line }));
  if (b.sfx !== undefined) audio.sfx = b.sfx;
  if (b.music !== undefined) audio.music = b.music;
  return audio;
};

// shot_update patch: snake_case wire keys → camelCase store keys. Only known
// ShotRecord fields pass; unknown keys are dropped. The store re-validates the
// merged record, so a malformed patch surfaces as a doctrine refusal.
// audio_block merges ONTO the current record's audioBlock (the store merges
// shallowly, so without this a partial audio patch would drop stored keys).
function fromWirePatch(patch: Record<string, unknown>, current: ShotRecord): Partial<ShotRecord> {
  const p: Record<string, unknown> = {};
  for (const k of ['id', 'status', 'sequence', 'camera'] as const) {
    if (k in patch) p[k] = patch[k];
  }
  if (typeof patch.geo_block === 'string') p.geoBlock = patch.geo_block;
  if (typeof patch.duration_s === 'number') p.durationS = patch.duration_s;
  if (Array.isArray(patch.refs)) p.refs = (patch.refs as WireRef[]).map(toStoreRef);
  if ('audio_block' in patch && patch.audio_block && typeof patch.audio_block === 'object') {
    const wireAudio = toStoreAudio(patch.audio_block as WireAudioBlock);
    p.audioBlock = { ...current.audioBlock, ...wireAudio };
  }
  return p as Partial<ShotRecord>;
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
    return out(await filmShow(paths, filmId));
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

  // Doctrine fields (geo_block/refs/camera/duration_s) stay optional at the zod
  // layer on purpose: the discipline refusals ("geo_block is required", the NEXT
  // lines, …) are StudioErrors from the store — a strict shape would replace them
  // with generic zod "Input validation error" text before the handler ever runs.
  server.tool('shot_create', {
    film_id: z.string().optional(),
    id: z.string(),
    sequence: z.string(),
    geo_block: z.string().optional(),
    refs: z.array(z.object({
      asset_id: z.string(),
      role: z.enum(['character', 'location', 'prop', 'style', 'size_ref']),
    })).optional(),
    camera: z.object({
      lens: z.string().optional(),
      move: z.string().optional(),
      reason: z.string().optional(),
    }).optional(),
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
      geoBlock: a.geo_block ?? '',
      refs: (a.refs ?? []).map(toStoreRef),
      camera: { lens: a.camera?.lens ?? '', move: a.camera?.move ?? '', reason: a.camera?.reason ?? '' },
      audioBlock: a.audio_block ? toStoreAudio(a.audio_block) : {},
      durationS: a.duration_s ?? 0,
    });
    return out(record);
  }));

  server.tool('shot_update', 'Patch a shot; patch keys are snake_case: status, sequence, geo_block, refs, camera, audio_block, duration_s (id is immutable).', {
    film_id: z.string().optional(),
    shot_id: z.string(),
    patch: z.record(z.unknown()),
  }, async (a) => guard(async () => {
    const filmId = await filmIdOf(a.film_id);
    const current = await shotShow(paths, filmId, a.shot_id); // NOT_FOUND surfaces before any merge
    return out(await shotUpdate(paths, filmId, a.shot_id, fromWirePatch(a.patch, current)));
  }));

  server.tool('shot_show', { film_id: z.string().optional(), shot_id: z.string() },
    async (a) => guard(async () => out(await shotShow(paths, await filmIdOf(a.film_id), a.shot_id))));

  server.tool('sequence_lock_geo', { film_id: z.string().optional(), sequence: z.string(), geo_block: z.string() },
    async (a) => guard(async () => {
      const filmId = await filmIdOf(a.film_id);
      await sequenceLockGeo(paths, filmId, a.sequence, a.geo_block);
      return out(`locked ${a.sequence}`);
    }));
}
