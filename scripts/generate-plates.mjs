// generate-plates.mjs — keyframe plates for a film's locations via Vertex + ADC (live).
// FILM_ID=film_paper_boats npx tsx scripts/generate-plates.mjs
import { readFile, writeFile, mkdir, rm } from 'node:fs/promises';
import { studioPaths } from '../src/store/paths.js';
import { readText, writeText, appendLine } from '../src/store/fs.js';
import { keyframePrompt } from '../src/tools/prompts.js';
import { filmMetaOrThrow, patchFilmMeta } from '../src/store/film.js';

const cfg = { project: 'project-bdac4ef0-fcba-4bcb-816', root: process.env.STUDIO_ROOT };
const FILM = process.env.FILM_ID ?? 'film_paper_boats';
// location assetId + its light statement (the light law: one source, stated)
const PLATES = [
  ['loc_kitchen_morning', 'soft morning sun through the sheer-curtained window center-background (the only key), warm rectangles of light on the floor, gentle bounce from the pale yellow walls as fill; no other source — the room breathes morning'],
  ['loc_memory_field', 'low golden-hour sun directly behind the boy (the only key), heavy backlight with soft lens flare, warm bounce from the burning grass as fill; one source — the sun — and everything else is glow'],
];
const paths = studioPaths(cfg.root);
const creds = JSON.parse(await readFile(process.env.APPDATA + '/gcloud/application_default_credentials.json', 'utf8'));

async function accessToken() {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ client_id: creds.client_id, client_secret: creds.client_secret, refresh_token: creds.refresh_token, grant_type: 'refresh_token' }).toString(),
  });
  return (await res.json()).access_token;
}
async function generate(prompt) {
  const token = await accessToken();
  const r = await fetch(`https://aiplatform.googleapis.com/v1/projects/${cfg.project}/locations/global/publishers/google/models/gemini-3-pro-image:generateContent`, {
    method: 'POST', headers: { authorization: 'Bearer ' + token, 'content-type': 'application/json' },
    body: JSON.stringify({ contents: [{ role: 'user', parts: [{ text: prompt }] }], generationConfig: { responseModalities: ['TEXT', 'IMAGE'], imageConfig: { aspectRatio: '16:9' } } }),
  });
  const j = await r.json();
  if (r.status !== 200) throw new Error(`HTTP ${r.status}: ` + JSON.stringify(j).slice(0, 300));
  const images = (j.candidates?.[0]?.content?.parts || []).filter(p => p.inlineData && !p.thought);
  const img = images[images.length - 1];
  if (!img) throw new Error('no final image part');
  return { data: Buffer.from(img.inlineData.data, 'base64'), imgTokens: (j.usageMetadata?.candidatesTokensDetails || []).find(d => d.modality === 'IMAGE')?.tokenCount ?? 0 };
}

const meta = await filmMetaOrThrow(paths, FILM);
console.log(`film: ${meta.title} — budget $${meta.budgetUsd}, spent $${meta.spentUsd ?? 0}`);
let totalTokens = 0;

for (const [assetId, light] of PLATES) {
  const dir = `${cfg.root}/films/${FILM}/assets/locations/${assetId}`;
  const descriptor = await readText(`${dir}/descriptor.md`);
  const r = await generate(keyframePrompt({ descriptor, lightStatement: light }));
  totalTokens += r.imgTokens;
  const dest = `${dir}/plate.png`;
  await writeFile(dest, r.data);
  await writeText(`${dir}/interaction.md`, 'vertex:gemini-3-pro-image:generateContent');
  console.log(`${assetId} plate → ${dest} (${r.data.length.toLocaleString()} bytes, ${r.imgTokens} tokens)`);
}

const usd = +(totalTokens * 0.00012).toFixed(4);
await patchFilmMeta(paths, FILM, m => ({ ...m, spentUsd: +(((m.spentUsd ?? 0) + usd).toFixed(4)) }));
await appendLine(paths.ledgerPath(FILM), JSON.stringify({ ts: new Date().toISOString(), tool: 'generate_plates_live', lane: 'vertex-gemini-3-pro-image', film_id: FILM, cost_usd: usd, verdict: 'kept', why: 'keyframe plates: ' + PLATES.map(p => p[0]).join(', '), image_tokens: totalTokens }));
console.log(`\nPLATES DONE — $${usd.toFixed(4)} ledgered. Film spend now $${((meta.spentUsd ?? 0) + usd).toFixed(4)} of $${meta.budgetUsd}.`);
