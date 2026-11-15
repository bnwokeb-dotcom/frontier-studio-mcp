// generate-assets.mjs — the KEY-GATED step: generates film #1's identity assets for real.
// Run from the repo root AFTER setting: GEMINI_API_KEY, STUDIO_LIVE=1, STUDIO_ROOT
//   npx tsx scripts/generate-assets.mjs
// Costs ≈ $0.13 per image (3 images ≈ $0.40). Every take is budget-checked and ledgered.
import { readText } from '../src/store/fs.js';
import { studioPaths } from '../src/store/paths.js';
import { filmShow } from '../src/store/film.js';
import { loadConfig } from '../src/config.js';
import { GeminiLane } from '../src/lanes/gemini.js';
import { runBilledTake } from '../src/tools/billed.js';
import { characterSheetPrompt, keyframePrompt } from '../src/tools/prompts.js';
import { attachImage } from '../src/store/asset.js';
import { writeText } from '../src/store/fs.js';

const cfg = loadConfig();
if (!cfg.studioLive) { console.error('STUDIO_LIVE=1 required (the real-lanes switch)'); process.exit(1); }
const paths = studioPaths(cfg.studioRoot);
const meta = await filmShow(paths, 'film_last_deal');
console.log(`film: ${meta.title} — budget $${meta.budgetUsd}, spent $${meta.spentUsd ?? 0}`);

// Auth: API key when set; otherwise Google Cloud ADC (org policies that disallow keys).
const { existsSync } = await import('node:fs');
const adcPath = process.env.GOOGLE_APPLICATION_CREDENTIALS
  ?? `${process.env.APPDATA}/gcloud/application_default_credentials.json`;
let lane;
if (cfg.geminiApiKey) {
  lane = GeminiLane.fromConfig(cfg);
  console.log('auth: GEMINI_API_KEY');
} else if (existsSync(adcPath)) {
  lane = await GeminiLane.fromAdc(adcPath);
  console.log(`auth: ADC (${adcPath})`);
} else {
  console.error('No credentials: set GEMINI_API_KEY, or run gcloud auth application-default login');
  process.exit(1);
}
const sheet = async (assetId, kindDir) => {
  const dir = `${cfg.studioRoot}/films/film_last_deal/assets/${kindDir}/${assetId}`;
  const descriptor = await readText(`${dir}/descriptor.md`);
  const result = await runBilledTake({
    studioRoot: cfg.studioRoot, filmId: 'film_last_deal', tool: 'character_sheet_build',
    lane, request: { prompt: characterSheetPrompt(descriptor), refImages: [], aspectRatio: '16:9', imageSize: '1K' },
    writeArtifact: async (data, mimeType) => {
      const tmp = `${cfg.studioRoot}/films/film_last_deal/generated/${assetId}-sheet.png`;
      const { writeFile } = await import('node:fs/promises');
      await writeFile(tmp, data);
      const dest = await attachImage(paths, 'film_last_deal', kindDir, assetId, tmp, 'sheet.png');
      const { rm } = await import('node:fs/promises');
      await rm(tmp, { force: true });
      return dest;
    },
  });
  await writeText(`${dir}/interaction.md`, result.interactionId);
  console.log(`${assetId}: sheet → ${result.artifactPath} ($${result.costUsd.toFixed(3)})`);
};

await sheet('char_elias', 'characters');
await sheet('char_daniel', 'characters');

// Kitchen plate — the light law demands a stated source; the location carries one.
const locDir = `${cfg.studioRoot}/films/film_last_deal/assets/locations/loc_kitchen`;
const locDescriptor = await readText(`${locDir}/descriptor.md`);
const lightStatement = 'one warm tungsten pendant lamp directly above the table (the key, camera-side), cold blue spill from the hallway beyond the door frame-right as fill; rain-diffused street glow through the windows frame-left; one source dominates, shadows fall away from the table';
const result = await runBilledTake({
  studioRoot: cfg.studioRoot, filmId: 'film_last_deal', tool: 'keyframe_build',
  lane, request: { prompt: keyframePrompt({ descriptor: locDescriptor, lightStatement }), refImages: [], aspectRatio: '16:9', imageSize: '1K' },
  writeArtifact: async (data) => {
    const { writeFile, rm } = await import('node:fs/promises');
    const tmp = `${cfg.studioRoot}/films/film_last_deal/generated/${'loc_kitchen'}-plate.png`;
    await writeFile(tmp, data);
    const dest = await attachImage(paths, 'film_last_deal', 'locations', 'loc_kitchen', tmp, 'plate.png');
    await rm(tmp, { force: true });
    return dest;
  },
});
await writeText(`${locDir}/interaction.md`, result.interactionId);
console.log(`loc_kitchen: plate → ${result.artifactPath} ($${result.costUsd.toFixed(3)})`);

console.log('\nASSETS DONE. Next: video lane (VULTR_INFERENCE_API_KEY) → render_shot ×8.');
