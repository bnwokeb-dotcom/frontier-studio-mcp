// src/store/studio.ts
import { readJson, writeJsonAtomic } from './fs.js';
import { errNotFound } from '../errors.js';
import type { StudioPaths } from './paths.js';
import { filmMetaOrThrow } from './film.js';

export interface StudioFile {
  activeFilm?: string;
}

export async function initStudio(paths: StudioPaths): Promise<void> {
  try {
    await readJson<StudioFile>(paths.studioJson);
  } catch {
    await writeJsonAtomic(paths.studioJson, {});
  }
}

export async function getActiveFilm(paths: StudioPaths): Promise<string> {
  const s = await readJson<StudioFile>(paths.studioJson);
  if (!s.activeFilm) {
    throw errNotFound('no active film set', 'create one (film_create) and set it active (film_set_active)');
  }
  return s.activeFilm;
}

export async function setActiveFilm(paths: StudioPaths, filmId: string): Promise<void> {
  await filmMetaOrThrow(paths, filmId);
  const s = await readJson<StudioFile>(paths.studioJson);
  await writeJsonAtomic(paths.studioJson, { ...s, activeFilm: filmId });
}
