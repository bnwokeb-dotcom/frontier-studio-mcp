// test/store/film.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { studioPaths } from '../../src/store/paths.js';
import { filmCreate, filmShow, filmMetaOrThrow } from '../../src/store/film.js';
import { initStudio, setActiveFilm, getActiveFilm } from '../../src/store/studio.js';
import { StudioError } from '../../src/errors.js';

let root: string; let paths: ReturnType<typeof studioPaths>;
beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), 'fsm-'));
  paths = studioPaths(root);
  await initStudio(paths);
});
afterEach(async () => { await rm(root, { recursive: true, force: true }); });

const filmInput = { title: 'Ice Mother', logline: 'A woman raises the dragon that killed her son.', budgetUsd: 50, targetRuntimeMin: 20 };

describe('film registry', () => {
  it('creates a film and shows it back', async () => {
    const meta = await filmCreate(paths, 'film_ice_mother', filmInput);
    expect(meta.filmId).toBe('film_ice_mother');
    expect((await filmShow(paths, 'film_ice_mother')).title).toBe('Ice Mother');
  });
  it('refuses duplicate film ids', async () => {
    await filmCreate(paths, 'film_x', filmInput);
    await expect(filmCreate(paths, 'film_x', filmInput)).rejects.toMatchObject({ code: 'VALIDATION' });
  });
  it('refuses invalid film ids with the rule stated', async () => {
    await expect(filmCreate(paths, 'Bad ID!', filmInput)).rejects.toMatchObject({ code: 'VALIDATION' });
  });
  it('set/get active film; unknown film refused', async () => {
    await filmCreate(paths, 'film_a', filmInput);
    await setActiveFilm(paths, 'film_a');
    expect(await getActiveFilm(paths)).toBe('film_a');
    await expect(setActiveFilm(paths, 'film_missing')).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });
  it('filmMetaOrThrow throws NOT_FOUND for unknown films', async () => {
    await expect(filmMetaOrThrow(paths, 'film_ghost')).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });
});
