// correct-ledger.mjs — appends the duplicate-line correction and fixes film spend.
import { appendLine } from '../src/store/fs.js';
import { filmMetaOrThrow, patchFilmMeta } from '../src/store/film.js';
import { studioPaths } from '../src/store/paths.js';

const paths = studioPaths(process.env.STUDIO_ROOT);
const ledger = `${process.env.STUDIO_ROOT}/films/film_paper_boats/ledger.jsonl`;
await appendLine(ledger, JSON.stringify({
  ts: new Date().toISOString(), tool: 'ledger_correction', lane: 'vertex-gemini-omni-1.2-flash',
  film_id: 'film_paper_boats', cost_usd: -4.6336, verdict: 'kept',
  why: 'duplicate render line — cancelled foreground run survived as orphan and double-appended; renders belong to the background run; orphaned interactions (if any) reconcile on the Google bill',
}));
const meta = await filmMetaOrThrow(paths, 'film_paper_boats');
const corrected = +(((meta.spentUsd ?? 0) - 4.6336).toFixed(4));
await patchFilmMeta(paths, 'film_paper_boats', m => ({ ...m, spentUsd: corrected }));
console.log(`ledger corrected — film spend now $${corrected} of $${meta.budgetUsd}`);
