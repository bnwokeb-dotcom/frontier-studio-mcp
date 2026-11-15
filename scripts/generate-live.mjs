// generate-live.mjs — generates film #1's three identity assets via Vertex + ADC (live).
// Uses the byte-pinned prompt laws from src/tools/prompts.ts. Costs ≈ $0.134/image.
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { studioPaths } from '../src/store/paths.js';
import { readText, writeText } from '../src/store/fs.js';
import { characterSheetPrompt, keyframePrompt } from '../src/tools/prompts.js';
import { filmMetaOrThrow, patchFilmMeta } from '../src/store/film.js';

const cfg = { root: process.env.STUDIO_ROOT, project: 'project-bdac4ef0-fcba-4bcb-816' };
const paths = studioPaths(cfg.root);
const creds = JSON.parse(await readFile(process.env.APPDATA + '/gcloud/application_default_credentials.json', 'utf8'));

async function accessToken() {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ client_id: creds.client_id, client_secret: creds.client_secret, refresh_token: creds.refresh_token, grant_type: 'refresh_token' }).toString(),
  });
  return (await res.json()).access_token;
}

async function generate(prompt, outPath) {
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
  const buf = Buffer.from(img.inlineData.data, 'base64');
  await writeFile(outPath, buf);
  const imgTokens = (j.usageMetadata?.candidatesTokensDetails || []).find(d => d.modality === 'IMAGE')?.tokenCount ?? 0;
  return { bytes: buf.length, imgTokens };
}

const meta = await filmMetaOrThrow(paths, 'film_last_deal');
console.log(`film: ${meta.title} — budget $${meta.budgetUsd}, spent $${meta.spentUsd ?? 0}`);
const genDir = `${cfg.root}/films/film_last_deal/generated`;
await mkdir(genDir, { recursive: true });
let totalTokens = 0;

// 1. ELIAS sheet
{
  const dir = `${cfg.root}/films/film_last_deal/assets/characters/char_elias`;
  const descriptor = await readText(`${dir}/descriptor.md`);
  const out = `${genDir}/char_elias-sheet.png`;
  const r = await generate(characterSheetPrompt(descriptor), out);
  totalTokens += r.imgTokens;
  await attach(paths, 'characters', 'char_elias', out, 'sheet.png');
  await writeText(`${dir}/interaction.md`, 'vertex:gemini-3-pro-image:generateContent');
  console.log(`char_elias sheet → ${r.bytes.toLocaleString()} bytes (${r.imgTokens} image tokens)`);
}
// 2. DANIEL sheet
{
  const dir = `${cfg.root}/films/film_last_deal/assets/characters/char_daniel`;
  const descriptor = await readText(`${dir}/descriptor.md`);
  const out = `${genDir}/char_daniel-sheet.png`;
  const r = await generate(characterSheetPrompt(descriptor), out);
  totalTokens += r.imgTokens;
  await attach(paths, 'characters', 'char_daniel', out, 'sheet.png');
  await writeText(`${dir}/interaction.md`, 'vertex:gemini-3-pro-image:generateContent');
  console.log(`char_daniel sheet → ${r.bytes.toLocaleString()} bytes (${r.imgTokens} image tokens)`);
}
// 3. Kitchen plate
{
  const dir = `${cfg.root}/films/film_last_deal/assets/locations/loc_kitchen`;
  const descriptor = await readText(`${dir}/descriptor.md`);
  const light = 'one warm tungsten pendant lamp directly above the table (the key, camera-side), cold blue spill from the hallway beyond the door frame-right as fill; rain-diffused street glow through the windows frame-left; one source dominates, shadows fall away from the table';
  const out = `${genDir}/loc_kitchen-plate.png`;
  const r = await generate(keyframePrompt({ descriptor, lightStatement: light }), out);
  totalTokens += r.imgTokens;
  await attach(paths, 'locations', 'loc_kitchen', out, 'plate.png');
  await writeText(`${dir}/interaction.md`, 'vertex:gemini-3-pro-image:generateContent');
  console.log(`loc_kitchen plate → ${r.bytes.toLocaleString()} bytes (${r.imgTokens} image tokens)`);
}

// ledger + spend (image tokens × $120/1M output — the Vertex pricing model)
const usd = +(totalTokens * 0.00012).toFixed(4);
await patchFilmMeta(paths, 'film_last_deal', m => ({ ...m, spentUsd: +(((m.spentUsd ?? 0) + usd).toFixed(4)) }));
await import('../src/store/fs.js').then(fs =>
  fs.appendLine(paths.ledgerPath('film_last_deal'), JSON.stringify({ ts: new Date().toISOString(), tool: 'generate_assets_live', lane: 'vertex-gemini-3-pro-image', film_id: 'film_last_deal', cost_usd: usd, verdict: 'kept', why: 'identity assets: 2 sheets + 1 plate', image_tokens: totalTokens })));
console.log(`\nASSETS DONE — 3 images, ${totalTokens} image tokens, $${usd.toFixed(4)} ledgered. Film spend now $${(meta.spentUsd ?? 0) + usd} of $${meta.budgetUsd}.`);

async function attach(paths, kindDir, assetId, srcPath, name) {
  const dest = `${cfg.root}/films/film_last_deal/assets/${kindDir}/${assetId}/${name}`;
  await writeFile(dest, await readFile(srcPath));
  return dest;
}
