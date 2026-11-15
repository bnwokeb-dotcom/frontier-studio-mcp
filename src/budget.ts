// src/budget.ts
import { filmMetaOrThrow, patchFilmMeta } from './store/film.js';
import type { FilmMeta } from './store/film.js';
import type { StudioPaths } from './store/paths.js';
import { errBudget } from './errors.js';

/**
 * Hard stop before the API call: refuses to quote a price the film cannot pay.
 * - film missing → NOT_FOUND (filmMetaOrThrow)
 * - no budget on film → BUDGET
 * - spent + price > budget → BUDGET with the exact numbers in the message
 * - else returns meta unchanged (no write)
 */
export async function ensureBudget(paths: StudioPaths, filmId: string, priceUsd: number): Promise<FilmMeta> {
  const meta = await filmMetaOrThrow(paths, filmId);
  if (meta.budgetUsd === undefined) {
    throw errBudget(
      `no budget set on film "${filmId}"`,
      'recreate the film with budget_usd, or add one via film metadata',
    );
  }
  const spent = meta.spentUsd ?? 0;
  if (spent + priceUsd > meta.budgetUsd) {
    throw errBudget(
      `budget exceeded: ${spent} spent + ${priceUsd} quote > ${meta.budgetUsd} cap`,
      'raise the film budget or reject cheaper takes',
    );
  }
  return meta;
}

/**
 * Accrue the cost of a successful artifact onto the film's spend total.
 * Call ONLY after a successful artifact; writes atomically via patchFilmMeta.
 */
export async function recordSpend(paths: StudioPaths, filmId: string, costUsd: number): Promise<FilmMeta> {
  return patchFilmMeta(paths, filmId, (m) => {
    m.spentUsd = (m.spentUsd ?? 0) + costUsd;
    return m;
  });
}
