// src/store/film.ts
import { readJson, writeJsonAtomic } from './fs.js';
import { errValidation, errNotFound } from '../errors.js';
import type { StudioPaths } from './paths.js';

const ID_RE = /^[a-z0-9][a-z0-9_-]{1,63}$/;

export interface SequenceLock { geoLocked?: string; budgetUsd?: number }
export interface FilmMeta {
  filmId: string;
  title: string;
  logline: string;
  budgetUsd?: number;
  spentUsd?: number;
  targetRuntimeMin?: number;
  sequences: Record<string, SequenceLock>;
  universeLinks: string[];
  createdAt: string;
}

export function assertId(id: string, what: string): void {
  if (!ID_RE.test(id)) {
    throw errValidation(`invalid ${what} id "${id}"`, 'use lowercase letters/digits with - or _ (≥2 chars)');
  }
}

export async function filmMetaOrThrow(paths: StudioPaths, filmId: string): Promise<FilmMeta> {
  const meta = await readJson<FilmMeta>(paths.filmJson(filmId)).catch(() => null);
  if (!meta) throw errNotFound(`film "${filmId}" is not registered`, 'create it with film_create first');
  return meta;
}

export async function filmCreate(
  paths: StudioPaths,
  filmId: string,
  input: { title: string; logline: string; budgetUsd?: number; targetRuntimeMin?: number },
): Promise<FilmMeta> {
  assertId(filmId, 'film');
  if (await filmJsonExists(paths, filmId)) {
    throw errValidation(`film "${filmId}" already exists`, 'use film_show, or pick a new film_id');
  }
  if (!input.title?.trim() || !input.logline?.trim()) {
    throw errValidation('title and logline are required', 'a film without a logline is a hobby — write the one-sentence promise');
  }
  const meta: FilmMeta = {
    filmId, title: input.title.trim(), logline: input.logline.trim(),
    budgetUsd: input.budgetUsd, targetRuntimeMin: input.targetRuntimeMin,
    sequences: {}, universeLinks: [], createdAt: new Date().toISOString(),
  };
  await writeJsonAtomic(paths.filmJson(filmId), meta);
  return meta;
}

async function filmJsonExists(paths: StudioPaths, filmId: string): Promise<boolean> {
  try { await readJson(paths.filmJson(filmId)); return true; } catch { return false; }
}

export async function filmShow(paths: StudioPaths, filmId: string): Promise<FilmMeta> {
  return filmMetaOrThrow(paths, filmId);
}

export async function patchFilmMeta(paths: StudioPaths, filmId: string, patch: (m: FilmMeta) => FilmMeta): Promise<FilmMeta> {
  const meta = await filmMetaOrThrow(paths, filmId);
  const next = patch(structuredClone(meta));
  await writeJsonAtomic(paths.filmJson(filmId), next);
  return next;
}
