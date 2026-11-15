// render-veo.mjs — renders film shots via Veo on Vertex + ADC (live, async LRO).
// FILM_ID=film_paper_boats SHOTS=seq01-shot01,seq02-shot01 npx tsx scripts/render-veo.mjs
// Env: STUDIO_ROOT, STUDIO_LIVE=1. First-frame I2V from each shot's location plate.
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { studioPaths } from '../src/store/paths.js';
import { readText, readJson, writeJsonAtomic, appendLine } from '../src/store/fs.js';
import { filmMetaOrThrow, patchFilmMeta } from '../src/store/film.js';
import { composeH3Prompt } from '../src/tools/h3prompt.js';

const cfg = { project: 'project-bdac4ef0-fcba-4bcb-816', location: 'us-central1', root: process.env.STUDIO_ROOT };
const FILM = process.env.FILM_ID ?? 'film_paper_boats';
const SHOT_IDS = (process.env.SHOTS ?? 'seq01-shot01,seq02-shot01').split(',');
const MODELS = ['veo-3.1-generate-preview', 'veo-3.0-generate-001', 'veo-3.1-fast-generate-preview'];
const paths = studioPaths(cfg.root);
const creds = JSON.parse(await readFile(process.env.APPDATA + '/gcloud/application_default_credentials.json', 'utf8'));
const EST_USD_PER_SEC = 0.40; // conservative reserve; Veo pricing varies by model/tier

async function accessToken() {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ client_id: creds.client_id, client_secret: creds.client_secret, refresh_token: creds.refresh_token, grant_type: 'refresh_token' }).toString(),
  });
  return (await res.json()).access_token;
}

const meta = await filmMetaOrThrow(paths, FILM);
console.log(`film: ${meta.title} — budget $${meta.budgetUsd}, spent $${meta.spentUsd ?? 0}`);
const token = await accessToken();
const bearer = { authorization: 'Bearer ' + token, 'content-type': 'application/json' };

const geoLock = meta.sequences?.seq01?.geoLocked;
const voiceOf = async (assetId) => readText(`${cfg.root}/films/${FILM}/assets/characters/${assetId}/voice.md`);

let workingModel = null;
for (const m of MODELS) {
  const probe = await fetch(`https://aiplatform.googleapis.com/v1/projects/${cfg.project}/locations/${cfg.location}/publishers/google/models/${m}:predictLongRunning`, {
    method: 'POST', headers: bearer, body: JSON.stringify({ instances: [{ prompt: 'ping' }], parameters: { durationSeconds: 4 } }),
  }).catch(() => null);
  const txt = await probe?.text().catch(() => '');
  const ok = probe && (probe.status === 200 || probe.status === 429 || (probe.status === 400 && !/model/i.test(txt.slice(0, 200))));
  console.log(`model probe ${m}: ${probe ? probe.status : 'network-fail'} ${ok ? '→ USABLE' : '→ ' + txt.slice(0, 120)}`);
  if (ok) { workingModel = m; break; }
}
if (!workingModel) throw new Error('no usable Veo model found — check model ids / region / billing');
console.log('working model:', workingModel);

for (const shotId of SHOT_IDS) {
  console.log(`\n── ${shotId}`);
  const shot = await readJson(`${cfg.root}/films/${FILM}/shots/${shotId}.json`);
  // locate plate
  let plate = null;
  for (const ref of shot.refs) {
    if (ref.role !== 'location' && ref.role !== 'style') continue;
    const kindDir = ref.role === 'location' ? 'locations' : 'styles';
    try { plate = { data: await readFile(`${cfg.root}/films/${FILM}/assets/${kindDir}/${ref.assetId}/plate.png`), assetId: ref.assetId }; break; } catch {}
  }
  if (!plate) { console.log('  SKIP: no keyframe plate'); continue; }

  const dialogue = [];
  for (const d of shot.audioBlock?.dialogue ?? []) {
    dialogue.push({ name: d.voiceRef.replace('char_', '').toUpperCase(), line: d.line, voice: await voiceOf(d.voiceRef) });
  }
  // Veo prose prompt: style + setting + action + camera + spoken dialogue + audio law
  const lines = [
    'Live-action, cinematic realism, 24fps, gentle film grain.',
    `Setting: ${shot.geoBlock}`,
    `Action: ${shot.action}`,
    `Camera: ${shot.camera.lens}, ${shot.camera.move} — ${shot.camera.reason}.`,
    ...dialogue.map(d => `${d.name} says with a voice that is ${d.voice}: "${d.line}"`),
    `Audio: room tone; ${shot.audioBlock?.sfx ?? 'ambient only'}; no music.`,
  ];
  const prompt = lines.join('\n');
  console.log('  prompt chars:', prompt.length);

  const estimate = +(EST_USD_PER_SEC * shot.durationS).toFixed(2);
  await ensureReserve(FILM, estimate);
  const opRes = await fetch(`https://aiplatform.googleapis.com/v1/projects/${cfg.project}/locations/${cfg.location}/publishers/google/models/${workingModel}:predictLongRunning`, {
    method: 'POST', headers: bearer,
    body: JSON.stringify({
      instances: [{ prompt, image: { bytesBase64Encoded: plate.data.toString('base64'), mimeType: 'image/png' } }],
      parameters: { aspectRatio: '16:9', durationSeconds: shot.durationS, generateAudio: true, personGeneration: 'allow_adult' },
    }),
  });
  const opText = await opRes.text();
  if (!opRes.ok) { console.log(`  SUBMIT FAILED ${opRes.status}: ${opText.slice(0, 250)}`); await releaseReserve(FILM, estimate); continue; }
  const op = JSON.parse(opText);
  const opName = op.name;
  console.log(`  LRO: ${opName.slice(-40)} (reserve $${estimate})`);

  // poll
  let done = null, tries = 0;
  while (tries++ < 40) {
    await new Promise(r => setTimeout(r, 10000));
    const p = await fetch(`https://aiplatform.googleapis.com/v1/${opName}`, { headers: { authorization: 'Bearer ' + token } });
    const pj = await p.json();
    if (pj.done) { done = pj; break; }
    process.stdout.write(`  polling ${tries * 10}s\r`);
  }
  if (!done || !done.done) { console.log('\n  LRO still running after timeout — job saved, poll again later'); await saveJob(FILM, shotId, opName, estimate, 'pending'); continue; }
  if (done.error) { console.log('\n  LRO ERROR:', JSON.stringify(done.error).slice(0, 300)); await releaseReserve(FILM, estimate); continue; }

  const sample = done.response?.generateVideoResponse?.generatedSamples?.[0]?.video
    ?? done.response?.videos?.[0]
    ?? done.response?.generateVideoResponse?.videos?.[0];
  const uri = sample?.uri || sample?.gcsUri;
  if (!uri) { console.log('\n  no video uri in response:', JSON.stringify(done.response).slice(0, 400)); continue; }
  const dl = await fetch(uri, { headers: { authorization: 'Bearer ' + token } });
  const bytes = Buffer.from(await dl.arrayBuffer());
  const outDir = `${cfg.root}/films/${FILM}/renders/${shotId}`;
  await mkdir(outDir, { recursive: true });
  await writeFile(`${outDir}/shot.mp4`, bytes);
  console.log(`\n  RENDERED: ${outDir}/shot.mp4 (${bytes.length.toLocaleString()} bytes) — reserve kept as accrual (provider metadata may add reconcile later)`);
}

async function ensureReserve(filmId, amount) {
  await patchFilmMeta(paths, filmId, m => ({ ...m, spentUsd: +(((m.spentUsd ?? 0) + amount).toFixed(4)) }));
}
async function releaseReserve(filmId, amount) {
  await patchFilmMeta(paths, filmId, m => ({ ...m, spentUsd: +(((m.spentUsd ?? 0) - amount).toFixed(4)) }));
}
async function saveJob(filmId, shotId, opName, estimate, status) {
  const jp = `${cfg.root}/films/${filmId}/jobs.json`;
  const jobs = await readJson(jp).catch(() => []);
  jobs.push({ job_id: opName.split('/').pop(), op_name: opName, shot_id: shotId, lane: 'veo-vertex', status, estimated: estimate, submitted_ts: new Date().toISOString() });
  await writeJsonAtomic(jp, jobs);
  await appendLine(paths.ledgerPath(filmId), JSON.stringify({ ts: new Date().toISOString(), tool: 'render_shot', lane: 'veo-vertex', film_id: filmId, cost_usd: estimate, verdict: 'pending', job_id: opName.split('/').pop(), estimated: true }));
}
