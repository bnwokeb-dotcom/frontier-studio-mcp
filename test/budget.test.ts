// test/budget.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { studioPaths } from '../src/store/paths.js';
import { filmCreate, filmShow, patchFilmMeta } from '../src/store/film.js';
import { initStudio } from '../src/store/studio.js';
import { ensureBudget, recordSpend } from '../src/budget.js';
import { StudioError } from '../src/errors.js';

let root: string; let paths: ReturnType<typeof studioPaths>;
beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), 'fsm-budget-'));
  paths = studioPaths(root);
  await initStudio(paths);
});
afterEach(async () => { await rm(root, { recursive: true, force: true }); });

const filmInput = { title: 'Ice Mother', logline: 'A woman raises the dragon that killed her son.' };

describe('budget hard stop', () => {
  it('refuses a film with no budget set', async () => {
    await filmCreate(paths, 'film_nobudget', filmInput);
    const err = await ensureBudget(paths, 'film_nobudget', 0.134).then(() => null, (e) => e);
    expect(err).toBeInstanceOf(StudioError);
    expect(err.code).toBe('BUDGET');
    expect(err.message).toBe('no budget set on film "film_nobudget" — NEXT: recreate the film with budget_usd, or add one via film metadata');
  });

  it('refuses over-budget with the exact numbers in the message', async () => {
    await filmCreate(paths, 'film_capped', { ...filmInput, budgetUsd: 0.25 });
    await patchFilmMeta(paths, 'film_capped', (m) => ({ ...m, spentUsd: 0.134 }));
    const err = await ensureBudget(paths, 'film_capped', 0.134).then(() => null, (e) => e);
    expect(err).toBeInstanceOf(StudioError);
    expect(err.code).toBe('BUDGET');
    expect(err.message).toBe('budget exceeded: 0.134 spent + 0.134 quote > 0.25 cap — NEXT: raise the film budget or reject cheaper takes');
  });

  it('passes under budget and returns meta unchanged without writing', async () => {
    await filmCreate(paths, 'film_open', { ...filmInput, budgetUsd: 1 });
    const before = JSON.stringify(await filmShow(paths, 'film_open'));
    const meta = await ensureBudget(paths, 'film_open', 0.134);
    expect(meta.budgetUsd).toBe(1);
    expect(meta.spentUsd).toBeUndefined();
    expect(JSON.stringify(await filmShow(paths, 'film_open'))).toBe(before);
  });

  it('throws NOT_FOUND for an unknown film', async () => {
    await expect(ensureBudget(paths, 'film_ghost', 0.134)).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });
});

describe('spend accrual', () => {
  it('recordSpend accrues 0 → 0.134 → 0.268 across three calls', async () => {
    await filmCreate(paths, 'film_spend', { ...filmInput, budgetUsd: 0.3 });
    expect((await filmShow(paths, 'film_spend')).spentUsd).toBeUndefined();
    // call 1: under budget → accrue 0 → 0.134
    await ensureBudget(paths, 'film_spend', 0.134);
    expect((await recordSpend(paths, 'film_spend', 0.134)).spentUsd).toBeCloseTo(0.134, 12);
    // call 2: still under budget → accrue 0.134 → 0.268
    await ensureBudget(paths, 'film_spend', 0.134);
    expect((await recordSpend(paths, 'film_spend', 0.134)).spentUsd).toBeCloseTo(0.268, 12);
    // call 3: hard stop before it could spend again
    const err = await ensureBudget(paths, 'film_spend', 0.134).then(() => null, (e) => e);
    expect(err).toBeInstanceOf(StudioError);
    expect(err.code).toBe('BUDGET');
    // no spend was recorded for the refused call
    expect((await filmShow(paths, 'film_spend')).spentUsd).toBeCloseTo(0.268, 12);
  });

  it('recordSpend on an unknown film throws NOT_FOUND', async () => {
    await expect(recordSpend(paths, 'film_ghost', 0.134)).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });
});
