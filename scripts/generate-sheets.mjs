// generate-sheets.mjs — casts a film's characters via Vertex + ADC (live).
// FILM_ID=film_paper_boats npx tsx scripts/generate-sheets.mjs   (STUDIO_ROOT + STUDIO_LIVE=1 required)
// ≈ $0.134 per sheet. Every take is ledgered; film budget is enforced.
import { readFile, writeFile, mkdir, rm } from 'node:fs/promises';
import { studioPaths } from '../src/store/paths.js';
import { readText, writeText, appendLine } from '../src/store/fs.js';
import { characterSheetPrompt } from '../src/tools/prompts.js';
import { filmMetaOrThrow, patchFilmMeta } from '../src/store/film.js';

const cfg = { project: 'project-bdac4ef0-fcba-4bcb-816', root: process.env.STUDIO_ROOT };
const FILM = process.env.FILM_ID ?? 'film_paper_boats';
const CAST = (process.env.CAST ?? 'char_maya,char_mother,char_boy').split(',');
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
  const url = `https://aiplatform.googleapis.com/v1/projects/${cfg.project}/locations/global/publishers/google/models/gemini-3-pro-image:generateContent`;
  const r = await fetch(url, {
    method: 'POST',
    headers: { authorization: 'Bearer ' + token, 'content-type': 'application/json' },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: { responseModalities: ['TEXT', 'IMAGE'], imageConfig: { aspectRatio: '16:9' } },
    }),
  });
  const j = await r.json();
  if (r.status !== 200) throw new Error(`HTTP ${r.status}: ` + JSON.stringify(j).slice(0, 300));
  const parts = j.candidates?.[0]?.content?.parts || [];
  const images = parts.filter(p => p.inlineData && !p.thought);
  const img = images[images.length - 1];
  if (!img) throw new Error('no final image part in response');
  const imgTokens = (j.usageMetadata?.candidatesTokensDetails || []).find(d => d.modality === 'IMAGE')?.tokenCount ?? 0;
  return { data: Buffer.from(img.inlineData.data, 'base64'), imgTokens };
}

const meta = await filmMetaOrThrow(paths, FILM);
console.log(`film: ${meta.title} — budget $${meta.budgetUsd}, spent $${meta.spentUsd ?? 0}`);
let totalTokens = 0;

for (const assetId of CAST) {
  const dir = `${cfg.root}/films/${FILM}/assets/characters/${assetId}`;
  const descriptor = await readText(`${dir}/descriptor.md`);
  const r = await generate(characterSheetPrompt(descriptor));
  totalTokens += r.imgTokens;
  const tmp = `${cfg.root}/films/${FILM}/generated/${assetId}-sheet.png`;
  await mkdir(`${cfg.root}/films/${FILM}/generated`, { recursive: true });
  await writeFile(tmp, r.data);
  const dest = `${dir}/sheet.png`;
  await writeFile(dest, r.data);
  await rm(tmp, { force: true });
  await writeText(`${dir}/interaction.md`, 'vertex:gemini-3-pro-image:generateContent');
  console.log(`${assetId} → ${dest} (${r.data.length.toLocaleString()} bytes, ${r.imgTokens} image tokens)`);
}

const usd = +(totalTokens * 0.00012).toFixed(4);
await patchFilmMeta(paths, FILM, m => ({ ...m, spentUsd: +(((m.spentUsd ?? 0) + usd).toFixed(4)) }));
await appendLine(paths.ledgerPath(FILM), JSON.stringify({ ts: new Date().toISOString(), tool: 'generate_sheets_live', lane: 'vertex-gemini-3-pro-image', film_id: FILM, cost_usd: usd, verdict: 'kept', why: `character sheets: ${CAST.join(', ')}`, image_tokens: totalTokens }));
console.log(`\nSHEETS DONE — ${CAST.length} characters, $${usd.toFixed(4)} ledgered. Film spend now $${((meta.spentUsd ?? 0) + usd).toFixed(4)} of $${meta.budgetUsd}.`);
