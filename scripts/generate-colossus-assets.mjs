// scripts/generate-colossus-assets.mjs — Live Keyframe Plates & Headless 3-Panel Sheets
// for the flagship film "The Heart of the Colossus" (film_heart_of_colossus).
// Powered by Vertex AI / Gemini Image Lane. Fully ledgered against film budget.
import { readFile, writeFile, mkdir, rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { studioPaths } from '../src/store/paths.js';
import { readText, writeText, appendLine } from '../src/store/fs.js';
import { filmShow } from '../src/store/film.js';
import { loadConfig } from '../src/config.js';
import { GeminiLane } from '../src/lanes/gemini.js';
import { runBilledTake } from '../src/tools/billed.js';
import { characterSheetPrompt, keyframePrompt } from '../src/tools/prompts.js';
import { attachImage } from '../src/store/asset.js';

const cfg = loadConfig();
if (!cfg.studioLive) {
  console.error('❌ STUDIO_LIVE=1 required in .env');
  process.exit(1);
}

const FILM_ID = 'film_heart_of_colossus';
const paths = studioPaths(cfg.studioRoot);
const meta = await filmShow(paths, FILM_ID);
console.log('🎨 ========================================================');
console.log(`   GENERATING IDENTITY ASSETS: ${meta.title}`);
console.log(`   Budget: $${meta.budgetUsd} | Current Spent: $${(meta.spentUsd ?? 0).toFixed(2)}`);
console.log('==========================================================\n');

// ── Auth Resolution (API Key or Google Cloud ADC) ───────────────────────────
const adcPath =
  process.env.GOOGLE_APPLICATION_CREDENTIALS ?? `${process.env.APPDATA}/gcloud/application_default_credentials.json`;
let lane;
if (cfg.geminiApiKey) {
  lane = GeminiLane.fromConfig(cfg);
  console.log('🔑 Auth: GEMINI_API_KEY');
} else if (existsSync(adcPath)) {
  lane = await GeminiLane.fromAdc(adcPath);
  console.log(`🔑 Auth: Google Cloud ADC (${adcPath})`);
} else {
  console.error('❌ No credentials found: set GEMINI_API_KEY, or run gcloud auth application-default login');
  process.exit(1);
}

// ── Helper: Character Sheet Builder ─────────────────────────────────────────
async function buildSheet(assetId) {
  const dir = `${cfg.studioRoot}/films/${FILM_ID}/assets/characters/${assetId}`;
  const targetSheet = `${dir}/sheet.png`;
  if (existsSync(targetSheet)) {
    console.log(`[EXISTS] Character sheet for ${assetId} already built — skipping`);
    return;
  }

  console.log(`⏳ Generating 3-Panel Headless Sheet for: ${assetId}...`);
  const descriptor = await readText(`${dir}/descriptor.md`);
  const result = await runBilledTake({
    studioRoot: cfg.studioRoot,
    filmId: FILM_ID,
    tool: 'character_sheet_build',
    lane,
    request: {
      prompt: characterSheetPrompt(descriptor),
      refImages: [],
      aspectRatio: '16:9',
      imageSize: '1K',
    },
    writeArtifact: async (data, mimeType) => {
      const tmp = `${cfg.studioRoot}/films/${FILM_ID}/generated/${assetId}-sheet.png`;
      await mkdir(`${cfg.studioRoot}/films/${FILM_ID}/generated`, { recursive: true });
      await writeFile(tmp, data);
      const dest = await attachImage(paths, FILM_ID, 'characters', assetId, tmp, 'sheet.png');
      await rm(tmp, { force: true });
      return dest;
    },
    metaUpdates: (prev, costUsd) => ({
      ...prev,
      spentUsd: +(((prev.spentUsd ?? 0) + costUsd).toFixed(4)),
    }),
  });

  await writeText(`${dir}/interaction.md`, result.interactionId ?? 'vertex-gemini');
  console.log(`✅ ${assetId} sheet attached → ${result.artifactPath} (Cost: $${result.costUsd.toFixed(3)})`);
}

// ── Helper: Location Plate Builder ──────────────────────────────────────────
async function buildPlate(assetId, lightStatement) {
  const dir = `${cfg.studioRoot}/films/${FILM_ID}/assets/locations/${assetId}`;
  const targetPlate = `${dir}/plate.png`;
  if (existsSync(targetPlate)) {
    console.log(`[EXISTS] Location plate for ${assetId} already built — skipping`);
    return;
  }

  console.log(`⏳ Generating Keyframe Plate for location: ${assetId}...`);
  const descriptor = await readText(`${dir}/descriptor.md`);
  const result = await runBilledTake({
    studioRoot: cfg.studioRoot,
    filmId: FILM_ID,
    tool: 'keyframe_build',
    lane,
    request: {
      prompt: keyframePrompt({ descriptor, lightStatement }),
      refImages: [],
      aspectRatio: '16:9',
      imageSize: '1K',
    },
    writeArtifact: async (data, mimeType) => {
      const tmp = `${cfg.studioRoot}/films/${FILM_ID}/generated/${assetId}-plate.png`;
      await mkdir(`${cfg.studioRoot}/films/${FILM_ID}/generated`, { recursive: true });
      await writeFile(tmp, data);
      const dest = await attachImage(paths, FILM_ID, 'locations', assetId, tmp, 'plate.png');
      await rm(tmp, { force: true });
      return dest;
    },
    metaUpdates: (prev, costUsd) => ({
      ...prev,
      spentUsd: +(((prev.spentUsd ?? 0) + costUsd).toFixed(4)),
    }),
  });

  await writeText(`${dir}/interaction.md`, result.interactionId ?? 'vertex-gemini');
  console.log(`✅ ${assetId} plate attached → ${result.artifactPath} (Cost: $${result.costUsd.toFixed(3)})`);
}

// ── Generate All Core Assets ────────────────────────────────────────────────
// 1. Lead Characters
await buildSheet('char_corvus');
await buildSheet('char_malic');
await buildSheet('char_colossus');

// 2. Location Plate (Caldera Forge with explicit Light Statement)
await buildPlate(
  'loc_caldera_forge',
  'Molten orange forge fire (2400K) and simmering magma canals center-left (the primary key), casting long dramatic chiaroscuro shadows across black basalt; cold blue ambient draft (6500K) spilling through high cavern crevices as subtle fill; single dominant heat source.',
);

const updatedMeta = await filmShow(paths, FILM_ID);
console.log('\n🎉 ========================================================');
console.log('   ALL VISUAL IDENTITY ASSETS GENERATED & LOCKED!');
console.log(`   Total Spent: $${(updatedMeta.spentUsd ?? 0).toFixed(2)} of $${updatedMeta.budgetUsd}`);
console.log('   Ready for parallel video renders (MiniMax H3).');
console.log('==========================================================\n');
