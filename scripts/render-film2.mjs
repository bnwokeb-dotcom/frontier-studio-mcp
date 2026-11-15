// render-film2.mjs — renders film_paper_boats' two shots via the verified Interactions-on-Vertex path.
// First-frame I2V from each location plate; dialogue spoken by the omni model.
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { studioPaths } from '../src/store/paths.js';
import { readText, readJson, appendLine } from '../src/store/fs.js';
import { filmMetaOrThrow, patchFilmMeta } from '../src/store/film.js';

const cfg = { project: 'project-bdac4ef0-fcba-4bcb-816', root: process.env.STUDIO_ROOT };
const FILM = 'film_paper_boats';
const paths = studioPaths(cfg.root);
const creds = JSON.parse(await readFile(process.env.APPDATA + '/gcloud/application_default_credentials.json', 'utf8'));

async function accessToken() {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ client_id: creds.client_id, client_secret: creds.client_secret, refresh_token: creds.refresh_token, grant_type: 'refresh_token' }).toString(),
  });
  return (await res.json()).access_token;
}

async function renderVideo(prompt, firstFrame) {
  const token = await accessToken();
  const u = `https://aiplatform.googleapis.com/v1beta1/projects/${cfg.project}/locations/global/interactions`;
  const body = {
    model: 'gemini-omni-1.2-flash',
    input: [
      ...(firstFrame ? [{ type: 'image', mime_type: 'image/png', data: firstFrame.toString('base64') }] : []),
      { type: 'text', text: prompt },
    ],
    response_format: { type: 'video', aspect_ratio: '16:9' },
  };
  const r = await fetch(u, { method: 'POST', headers: { authorization: 'Bearer ' + token, 'x-goog-user-project': cfg.project, 'content-type': 'application/json' }, body: JSON.stringify(body) });
  const j = await r.json();
  if (r.status !== 200) throw new Error(`HTTP ${r.status}: ` + JSON.stringify(j).slice(0, 300));
  const interactionId = j.id;
  // re-fetch the interaction to get the final model_output (sync generation may return steps inline)
  const r2 = await fetch(`${u}/${interactionId}`, { headers: { authorization: 'Bearer ' + token, 'x-goog-user-project': cfg.project } });
  const j2 = await r2.json();
  const out = (j2.steps || j.steps || []).find(s => s.type === 'model_output');
  const v = (out?.content || []).find(p => p.type === 'video');
  if (!v) throw new Error('no video part in model_output');
  const imgTokens = (j2.usage || j.usage || {});
  return { id: interactionId, data: Buffer.from(v.data, 'base64'), videoTokens: imgTokens.output_tokens_by_modality?.find(m => m.modality === 'video')?.tokens ?? null, usage: imgTokens };
}

const meta = await filmMetaOrThrow(paths, FILM);
console.log(`film: ${meta.title} — budget $${meta.budgetUsd}, spent $${meta.spentUsd ?? 0}`);
const shots = [
  {
    file: 'seq01-shot01.json', scene: 'THE KITCHEN',
    prompt: (s) => [
      'Live-action, cinematic realism, 24fps, gentle film grain.',
      `Setting: ${s.geoBlock}`,
      `Action: ${s.action}`,
      `Camera: ${s.camera.lens}, ${s.camera.move} — ${s.camera.reason}.`,
      'MAYA says with a voice that is bright, quick, breathless with joy, words tumbling over each other: "Mom. I met him. He made me a paper boat."',
      `Audio: room tone; ${s.audioBlock?.sfx ?? 'ambient only'}; no music.`,
    ].join('\n'),
  },
  {
    file: 'seq02-shot01.json', scene: 'THE MEMORY FIELD',
    prompt: (s) => [
      'Live-action, cinematic realism, 24fps, gentle film grain, heavy golden backlight with soft lens flare, soft-focus edges — a memory, brighter than reality.',
      `Setting: ${s.geoBlock}`,
      `Action: ${s.action}`,
      `Camera: ${s.camera.lens}, ${s.camera.move} — ${s.camera.reason}.`,
      'THE BOY says with a voice that is warm and playful, half a laugh inside it: "It floats, Maya. Just like us."',
      `Audio: wind through tall grass, distant laughter, one warm swell of strings; no music bed.`,
    ].join('\n'),
  },
];

await mkdir(`${cfg.root}/films/${FILM}/renders`, { recursive: true });
let totalTokens = 0;
for (const s of shots) {
  console.log(`\n── ${s.file} (${s.scene})`);
  const shot = await readJson(`${cfg.root}/films/${FILM}/shots/${s.file}`);
  const plateRef = shot.refs.find(r => r.role === 'location');
  const kindDir = 'locations';
  const plate = await readFile(`${cfg.root}/films/${FILM}/assets/${kindDir}/${plateRef.assetId}/plate.png`);
  const prompt = s.prompt(shot);
  console.log('  prompt chars:', prompt.length, '| first frame:', plateRef.assetId, 'plate,', Math.round(plate.length / 1024), 'KB');
  const r = await renderVideo(prompt, plate);
  totalTokens += r.videoTokens ?? 0;
  const outDir = `${cfg.root}/films/${FILM}/renders/${shot.id}`;
  await mkdir(outDir, { recursive: true });
  await writeFile(`${outDir}/shot.mp4`, r.data);
  console.log(`  RENDERED: ${outDir}/shot.mp4 (${r.data.length.toLocaleString()} bytes) | interaction: ${r.id.slice(-12)} | video tokens: ${r.videoTokens}`);
}

// ledger (video tokens; rate TBD on bill — recorded with tokens for exact reconcile)
const est = +(totalTokens * 0.00004).toFixed(4); // conservative placeholder rate, reconcile on bill
await patchFilmMeta(paths, FILM, m => ({ ...m, spentUsd: +(((m.spentUsd ?? 0) + est).toFixed(4)) }));
await appendLine(paths.ledgerPath(FILM), JSON.stringify({ ts: new Date().toISOString(), tool: 'render_film2_live', lane: 'vertex-gemini-omni-1.2-flash', film_id: FILM, cost_usd: est, verdict: 'kept', why: '2 shots rendered (kitchen confession + memory field)', video_tokens: totalTokens, reconcile: 'rate TBD on bill — tokens recorded' }));
console.log(`\nFILM #2 RENDERED — 2 shots on disk. Video tokens: ${totalTokens.toLocaleString()}.`);
console.log('Assemble: renders/seq01-shot01/shot.mp4 + renders/seq02-shot01/shot.mp4 — 16s, the film.');
