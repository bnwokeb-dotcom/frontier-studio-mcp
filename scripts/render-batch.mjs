// render-batch.mjs — the KEY-GATED video step: renders all 8 shots of film #1 via Vultr H3.
// Run from the repo root AFTER setting: VULTR_INFERENCE_API_KEY, STUDIO_LIVE=1, STUDIO_ROOT
//   npx tsx scripts/render-batch.mjs
// Requires the assets first (scripts/generate-assets.mjs) — render_shot refuses without a keyframe plate.
// Cost ≈ $0.15/s × ~60s real length ≈ $9.25 total. Reserve/reconcile/refund applies per shot.
import { readdir } from 'node:fs/promises';
import { readText, writeText, readJson, writeJsonAtomic, appendLine } from '../src/store/fs.js';
import { studioPaths } from '../src/store/paths.js';
import { filmMetaOrThrow, filmShow } from '../src/store/film.js';
import { loadConfig } from '../src/config.js';
import { VultrLane } from '../src/lanes/vultr.js';
import { composeH3Prompt } from '../src/tools/h3prompt.js';
import { ensureBudget, recordSpend } from '../src/budget.js';

const cfg = loadConfig();
if (!cfg.vultrApiKey) { console.error('VULTR_INFERENCE_API_KEY not set — Vultr console → Serverless Inference → subscription → API key'); process.exit(1); }
if (!cfg.studioLive) { console.error('STUDIO_LIVE=1 required'); process.exit(1); }
const paths = studioPaths(cfg.studioRoot);
const FILM = 'film_last_deal';
const meta = await filmShow(paths, FILM);
console.log(`film: ${meta.title} — budget $${meta.budgetUsd}, spent $${meta.spentUsd ?? 0}`);

const lane = new VultrLane(cfg.vultrApiKey);
await lane.verifyModel();
console.log('model verified: minimax-h3');

const dir = `${cfg.studioRoot}/films/${FILM}/shots`;
const shotFiles = (await readdir(dir)).filter(f => f.endsWith('.json')).sort();
const voiceOf = async (assetId) => readText(`${cfg.studioRoot}/films/${FILM}/assets/characters/${assetId}/voice.md`);
const geoLock = meta.sequences?.seq01?.geoLocked;

for (const f of shotFiles) {
  const shot = await readJson(`${dir}/${f}`);
  console.log(`\n── ${shot.id} (${shot.durationS}s)`);
  if (shot.durationS < 4 || shot.durationS > 15) { console.log('  SKIP: outside H3 4–15s'); continue; }

  // locate the keyframe plate (location/style ref with plate.png)
  let plate = null;
  for (const ref of shot.refs) {
    if (ref.role !== 'location' && ref.role !== 'style') continue;
    const kindDir = ref.role === 'location' ? 'locations' : 'styles';
    try { plate = { data: Buffer.from(await (await import('node:fs/promises')).readFile(`${cfg.studioRoot}/films/${FILM}/assets/${kindDir}/${ref.assetId}/plate.png`)), assetId: ref.assetId }; break; } catch {}
  }
  if (!plate) { console.log('  SKIP: no keyframe plate — run generate-assets first'); continue; }

  const dialogue = [];
  for (const d of shot.audioBlock?.dialogue ?? []) {
    dialogue.push({ voiceRef: d.voiceRef, voiceDescriptor: await voiceOf(d.voiceRef), line: d.line });
  }
  const prompt = composeH3Prompt({
    action: shot.action, camera: shot.camera, geoBlock: geoLock, dialogue,
    sfx: shot.audioBlock?.sfx, durationS: shot.durationS, platePresents: true,
  });

  const estimate = lane.estimatePrice({ prompt, durationS: shot.durationS, aspectRatio: '16:9', quality: 'standard' });
  await ensureBudget(paths, FILM, estimate);
  const job = await lane.submit({
    prompt, durationS: shot.durationS, aspectRatio: '16:9', quality: 'standard',
    firstFrame: { data: plate.data, mimeType: 'image/png' },
  });
  await recordSpend(paths, FILM, estimate); // reserve
  await appendLine(paths.ledgerPath(FILM), JSON.stringify({ ts: new Date().toISOString(), tool: 'render_shot', lane: 'vultr', film_id: FILM, cost_usd: estimate, verdict: 'pending', job_id: job.jobId, artifact_path: '', estimated: true }));
  console.log(`  submitted: ${job.jobId} (reserve $${estimate.toFixed(2)})`);

  // poll to completion
  let st; const deadline = Date.now() + 8 * 60 * 1000;
  while (Date.now() < deadline) {
    await new Promise(r => setTimeout(r, 10000));
    st = await lane.status(job);
    process.stdout.write(`  ${st.status} ${st.progress ?? ''}\r`);
    if (['completed', 'failed', 'cancelled', 'expired'].includes(st.status)) break;
  }
  if (!st || st.status !== 'completed') {
    console.log(`\n  FAILED/${st?.status} — bills $0; run again later (no refund needed: reconcile at download)`);
    continue;
  }
  const art = await lane.result(job);
  const { writeFile, mkdir } = await import('node:fs/promises');
  const outDir = `${cfg.studioRoot}/films/${FILM}/renders/${job.jobId}`;
  await mkdir(outDir, { recursive: true });
  await writeFile(`${outDir}/shot.mp4`, art.data);
  const delta = art.costUsd - estimate;
  if (Math.abs(delta) > 0.001) await recordSpend(paths, FILM, delta);
  await appendLine(paths.ledgerPath(FILM), JSON.stringify({ ts: new Date().toISOString(), tool: 'job_download', lane: 'vultr', film_id: FILM, cost_usd: delta, verdict: 'pending', job_id: job.jobId, artifact_path: `${outDir}/shot.mp4`, note: 'reconcile' }));
  console.log(`\n  DONE: ${outDir}/shot.mp4 — actual $${art.costUsd.toFixed(2)} (delta ${delta >= 0 ? '+' : ''}${delta.toFixed(2)})`);
}

const after = await filmShow(paths, FILM);
console.log(`\nBATCH COMPLETE — film spend: $${(after.spentUsd ?? 0).toFixed(2)} of $${after.budgetUsd}.`);
console.log('Assemble the 8 mp4s in order (seq01-shot01..08) in any editor — that is the vertical slice.');
