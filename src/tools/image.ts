// src/tools/image.ts — image-lane tools: billed, budgeted, ledgered.
//
// The Gemini lane is constructed lazily, per call, ONLY here: registry tools
// never touch it, so a missing GEMINI_API_KEY (AUTH) surfaces only when a
// billed call actually executes. Binding order for every billed call:
// validate args → resolve refs → STUDIO_LIVE gate → runBilledTake (the money
// law, ONE copy in src/tools/billed.ts: lane.price → ensureBudget → submit →
// result → recordSpend → writeArtifact → ledger line). Every refusal
// (validation, NOT_FOUND, AUTH, BUDGET) precedes the API call by construction;
// the STUDIO_LIVE gate precedes any lane construction at all. Callers own only
// validation, ref resolution, prompt composition, the artifact-path decision
// and their snake_case output.
import { z } from 'zod';
import { randomBytes } from 'node:crypto';
import { readFile, rm, writeFile } from 'node:fs/promises';
import { extname, isAbsolute, join } from 'node:path';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { loadConfig } from '../config.js';
import type { StudioConfig } from '../config.js';
import { studioPaths } from '../store/paths.js';
import type { StudioPaths } from '../store/paths.js';
import { initStudio, getActiveFilm } from '../store/studio.js';
import { ensureDir, readText, writeText } from '../store/fs.js';
import { attachImage, findAssetKindDir } from '../store/asset.js';
import { GeminiLane } from '../lanes/gemini.js';
import { errNotFound, errValidation } from '../errors.js';
import { characterSheetPrompt, keyframePrompt } from './prompts.js';
import { guard, out } from './registry.js';
import { runBilledTake } from './billed.js';

const MAX_REFS = 14;

// mimeType is inferred from the extension; anything else is refused loudly.
const REF_MIME: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
};

// slug = lowercased alnum-hyphen of the first ~40 prompt chars ('' → 'image')
function slugOf(prompt: string): string {
  return (
    prompt.slice(0, 40).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'image'
  );
}

// <YYYYMMDD-HHmmss>-<hex4>, local time — the 4 random hex chars (drawn from
// randomBytes(4), the same pattern as writeJsonAtomic's tmp suffix) make two
// same-slug takes inside one second collision-proof: the loser's ledger line
// must never point at the winner's bytes.
function stampOf(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0');
  const hex4 = randomBytes(4).toString('hex').slice(0, 4);
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}-${hex4}`;
}

// The STUDIO_LIVE switch, enforced (README row: `1` = real lanes, `0` =
// registry only): every billed tool loads the config and refuses BEFORE any
// lane is constructed unless the studio is live. STUDIO_ROOT is passed through
// so the load works even when the env var itself isn't set (buildServer owns
// the root); GEMINI_API_KEY still rides from the environment. The free
// asset_image tool never calls this. Exported for the video lane (M3) — the
// gate is one law, never a second copy.
export function liveLaneConfig(studioRoot: string): StudioConfig {
  const cfg = loadConfig({ ...process.env, STUDIO_ROOT: studioRoot });
  if (!cfg.studioLive) {
    throw errValidation(
      'real generation lanes are disabled (STUDIO_LIVE=0)',
      'set STUDIO_LIVE=1 to enable billed calls',
    );
  }
  return cfg;
}

// Absolute paths pass through as-is; relative paths resolve against STUDIO_ROOT
// first, then the film dir (so `films/<id>/refs/x.png` and `refs/x.png` both
// work). Returns the first candidate that reads, with its bytes; undefined when
// none exist (the caller words its own NOT_FOUND).
async function readFirstExisting(
  studioRoot: string,
  filmDir: string,
  raw: string,
): Promise<{ path: string; data: Buffer } | undefined> {
  const candidates = isAbsolute(raw) ? [raw] : [join(studioRoot, raw), join(filmDir, raw)];
  for (const candidate of candidates) {
    try {
      return { path: candidate, data: await readFile(candidate) };
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code !== 'ENOENT') throw e;
    }
  }
  return undefined;
}

// Missing everywhere → NOT_FOUND; unsupported extension → VALIDATION naming the
// supported set. Existence is checked before the extension so a missing file
// never masquerades as a type refusal. Exported for repair_shot (M3 Task 4):
// the agent-supplied first_frame_path rides the same path-resolution and
// extension law — never a second copy of it.
export async function readRefImage(
  paths: StudioPaths,
  studioRoot: string,
  filmId: string,
  raw: string,
): Promise<{ data: Buffer; mimeType: string }> {
  const found = await readFirstExisting(studioRoot, paths.filmDir(filmId), raw);
  if (!found) {
    throw errNotFound(
      `reference image not found: ${raw}`,
      'use an absolute path, a STUDIO_ROOT-relative path, or a film-relative path that exists',
    );
  }
  const ext = extname(raw).toLowerCase();
  const mimeType = REF_MIME[ext];
  if (!mimeType) {
    throw errValidation(
      `unsupported reference image type "${ext || raw}"`,
      'reference images must be .png, .jpg, .jpeg or .webp',
    );
  }
  return { data: found.data, mimeType };
}

export function registerImageTools(server: McpServer, studioRoot: string): void {
  const paths = studioPaths(studioRoot);

  server.tool('image_generate', {
    prompt: z.string(),
    film_id: z.string().optional(),
    ref_image_paths: z.array(z.string()).optional(),
    aspect_ratio: z.string().optional(),
    image_size: z.enum(['1K', '2K', '4K']).optional(),
    previous_interaction_id: z.string().optional(),
  }, async (a) => guard(async () => {
    // 1. validate args (price non-finite/negative is impossible here — the
    // quote comes from the lane's price table — so the tool-layer guards are
    // prompt and interaction id)
    if (!a.prompt.trim()) {
      throw errValidation('prompt is required', 'describe the still you want generated');
    }
    if (a.previous_interaction_id === '') {
      throw errValidation(
        'previous_interaction_id must be a non-empty string',
        'pass the interaction_id from the earlier generation, or omit it',
      );
    }
    const refPaths = a.ref_image_paths ?? [];
    if (refPaths.length > MAX_REFS) {
      throw errValidation(
        `too many ref_image_paths: ${refPaths.length} (max ${MAX_REFS})`,
        'send at most 14 reference images',
      );
    }

    // 2. film: explicit id or the active one (NOT_FOUND when neither is set)
    await initStudio(paths);
    const filmId = a.film_id ?? (await getActiveFilm(paths));

    // 3. resolve + read refs BEFORE the quote — no refusals may follow the budget check
    const refImages = [];
    for (const raw of refPaths) {
      refImages.push(await readRefImage(paths, studioRoot, filmId, raw));
    }

    // 4. STUDIO_LIVE gate + lane (lazily, per call) — the gate fires before the
    // lane exists, so STUDIO_LIVE=0 can never reach a billed call
    const lane = GeminiLane.fromConfig(liveLaneConfig(studioRoot));
    const req = {
      prompt: a.prompt,
      refImages,
      aspectRatio: a.aspect_ratio ?? '16:9',
      imageSize: a.image_size ?? '1K',
      ...(a.previous_interaction_id ? { previousInteractionId: a.previous_interaction_id } : {}),
    };

    // 5. the money law, ONE copy (billed.ts): price → ensureBudget → submit →
    // result → recordSpend → artifact → ledger
    const take = await runBilledTake({
      studioRoot,
      filmId,
      tool: 'image_generate',
      lane,
      request: req,
      writeArtifact: async (data) => {
        // artifact → <filmDir>/generated/<YYYYMMDD-HHmmss>-<slug>.png
        const generatedDir = `${paths.filmDir(filmId)}/generated`;
        const artifactPath = `${generatedDir}/${stampOf(new Date())}-${slugOf(a.prompt)}.png`;
        await ensureDir(generatedDir);
        await writeFile(artifactPath, data);
        return artifactPath;
      },
    });

    // 6. snake_case wire output
    return out({
      artifact_path: take.artifactPath,
      interaction_id: take.interactionId,
      cost_usd: take.costUsd,
      image_size: req.imageSize,
      aspect_ratio: req.aspectRatio,
    });
  }));

  // The Hell Grind sheet law, billed: descriptor.md → sheet prompt → 1K/16:9 →
  // budget → lane → attach as the asset's canonical sheet.png. Same binding
  // order as image_generate; the sheet becomes the multi-turn seed.
  server.tool('character_sheet_build', {
    asset_id: z.string(),
    film_id: z.string().optional(),
  }, async (a) => guard(async () => {
    // 1. validate args
    if (!a.asset_id.trim()) {
      throw errValidation('asset_id is required', 'pass the character asset_id to sheet');
    }

    // 2. film: explicit id or the active one
    await initStudio(paths);
    const filmId = a.film_id ?? (await getActiveFilm(paths));

    // 3. resolve the asset BEFORE the quote — no refusal may follow the budget
    // check. Explicit kind probe (findAssetKindDir): a non-character id fails
    // here with its actual kind named, never as a silent characters-path miss.
    const kindDir = await findAssetKindDir(paths, filmId, a.asset_id);
    if (!kindDir) {
      throw errNotFound(
        `asset "${a.asset_id}" is not registered`,
        'register it with asset_register before building its sheet',
      );
    }
    if (kindDir !== 'characters') {
      throw errNotFound(
        `asset "${a.asset_id}" is a ${kindDir} asset — character_sheet_build sheets characters only`,
        'pass a character asset_id, or attach a location plate with asset_image',
      );
    }
    const assetDir = paths.assetDir(filmId, kindDir, a.asset_id);
    const descriptor = await readText(`${assetDir}/descriptor.md`);

    // 4. compose the sheet law (pure; VALIDATION on a whitespace-only descriptor)
    const prompt = characterSheetPrompt(descriptor);

    // 5. STUDIO_LIVE gate + lane (lazily, per call) — sheets are 1K, 16:9 by
    // law; the gate fires before the lane exists
    const lane = GeminiLane.fromConfig(liveLaneConfig(studioRoot));
    const req = { prompt, refImages: [], aspectRatio: '16:9', imageSize: '1K' as const };

    // 6. the money law, ONE copy (billed.ts): price → ensureBudget → submit →
    // result → recordSpend → artifact → ledger. The write attaches the lane
    // bytes as the canonical sheet.png via attachImage: staged under the
    // standard generated/ naming, copied, then the staging copy is dropped
    // (best-effort: a leftover is a well-named generated artifact, never
    // garbage) — the asset dir keeps the only copy.
    const take = await runBilledTake({
      studioRoot,
      filmId,
      tool: 'character_sheet_build',
      lane,
      request: req,
      writeArtifact: async (data) => {
        const generatedDir = `${paths.filmDir(filmId)}/generated`;
        const stagedPath = `${generatedDir}/${stampOf(new Date())}-${slugOf(prompt)}.png`;
        await ensureDir(generatedDir);
        await writeFile(stagedPath, data);
        const sheetPath = await attachImage(paths, filmId, kindDir, a.asset_id, stagedPath, 'sheet.png');
        try { await rm(stagedPath); } catch { /* staging removal is best-effort */ }
        return sheetPath;
      },
    });

    // 7. the multi-turn seed for this asset's future generations — ONLY the id
    await writeText(`${assetDir}/interaction.md`, take.interactionId);

    // 8. snake_case wire output (Task 3 shape; the durable artifact is the attached sheet)
    return out({
      sheet_path: take.artifactPath,
      interaction_id: take.interactionId,
      cost_usd: take.costUsd,
    });
  }));

  // The keyframe light law, billed: descriptor.md (+ geo_block.md when the asset
  // has one) → keyframe prompt → 1K/16:9 → budget → lane → attach as the asset's
  // canonical plate.png. Locations and styles only — a character keyframe is a
  // category error (characters get character_sheet_build). Same binding order as
  // image_generate / character_sheet_build.
  server.tool('keyframe_build', {
    asset_id: z.string(),
    light_statement: z.string(),
    film_id: z.string().optional(),
  }, async (a) => guard(async () => {
    // 1. validate args
    if (!a.asset_id.trim()) {
      throw errValidation('asset_id is required', 'pass the location or style asset_id to keyframe');
    }

    // 2. film: explicit id or the active one
    await initStudio(paths);
    const filmId = a.film_id ?? (await getActiveFilm(paths));

    // 3. resolve the asset BEFORE the quote — no refusal may follow the budget
    // check. Explicit kind probe (findAssetKindDir): unregistered → NOT_FOUND;
    // a character/prop id → VALIDATION naming what keyframes are for.
    const kindDir = await findAssetKindDir(paths, filmId, a.asset_id);
    if (!kindDir) {
      throw errNotFound(
        `asset "${a.asset_id}" is not registered`,
        'register it with asset_register before keyframing it',
      );
    }
    if (kindDir !== 'locations' && kindDir !== 'styles') {
      throw errValidation(
        kindDir === 'characters'
          ? 'keyframes are for locations/styles — characters get character_sheet_build'
          : `keyframes are for locations/styles — ${kindDir} assets don't take keyframes`,
        // Truthful NEXT per branch: characters keep the sheet tool; a prop must
        // never be told to sheet itself (character_sheet_build would refuse it
        // again) — it takes no keyframe at all.
        kindDir === 'characters'
          ? `pass a location or style asset_id, or sheet "${a.asset_id}" with character_sheet_build`
          : 'props take no keyframe — register it as a location or style, or keyframe_build a location',
      );
    }
    const assetDir = paths.assetDir(filmId, kindDir, a.asset_id);
    const descriptor = await readText(`${assetDir}/descriptor.md`);

    // 4. the spatial map: geo_block.md when the asset dir has one, loaded verbatim
    let geoBlock: string | undefined;
    try {
      geoBlock = await readFile(`${assetDir}/geo_block.md`, 'utf8');
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code !== 'ENOENT') throw e;
    }

    // 5. compose the light law (pure; VALIDATION on a whitespace-only light_statement)
    const prompt = keyframePrompt({ descriptor, geoBlock, lightStatement: a.light_statement });

    // 6. STUDIO_LIVE gate + lane (lazily, per call) — keyframes are 1K, 16:9 by
    // law; the gate fires before the lane exists
    const lane = GeminiLane.fromConfig(liveLaneConfig(studioRoot));
    const req = { prompt, refImages: [], aspectRatio: '16:9', imageSize: '1K' as const };

    // 7. the money law, ONE copy (billed.ts): price → ensureBudget → submit →
    // result → recordSpend → artifact → ledger. The write attaches the lane
    // bytes as the canonical plate.png via attachImage (locations AND styles
    // under the extended name law): staged under the standard generated/ naming,
    // copied, then the staging copy is dropped (best-effort) — the asset dir
    // keeps the only copy.
    const take = await runBilledTake({
      studioRoot,
      filmId,
      tool: 'keyframe_build',
      lane,
      request: req,
      writeArtifact: async (data) => {
        const generatedDir = `${paths.filmDir(filmId)}/generated`;
        const stagedPath = `${generatedDir}/${stampOf(new Date())}-${slugOf(prompt)}.png`;
        await ensureDir(generatedDir);
        await writeFile(stagedPath, data);
        const platePath = await attachImage(paths, filmId, kindDir, a.asset_id, stagedPath, 'plate.png');
        try { await rm(stagedPath); } catch { /* staging removal is best-effort */ }
        return platePath;
      },
    });

    // 8. the multi-turn seed for this asset's future generations — ONLY the id
    await writeText(`${assetDir}/interaction.md`, take.interactionId);

    // 9. snake_case wire output (Task 3 shape; the durable artifact is the attached plate)
    return out({
      plate_path: take.artifactPath,
      interaction_id: take.interactionId,
      cost_usd: take.costUsd,
    });
  }));

  // Free tool: a straight byte copy into an asset dir — no lane, no budget, no
  // ledger. Name defaults to the asset kind's canonical image; an explicit name
  // goes through the same attachImage validation.
  server.tool('asset_image', {
    asset_id: z.string(),
    image_path: z.string(),
    name: z.string().optional(),
    film_id: z.string().optional(),
  }, async (a) => guard(async () => {
    if (!a.asset_id.trim()) {
      throw errValidation('asset_id is required', 'pass the asset to attach the image to');
    }
    if (!a.image_path.trim()) {
      throw errValidation('image_path is required', 'pass the path of the image file to attach');
    }

    await initStudio(paths);
    const filmId = a.film_id ?? (await getActiveFilm(paths));

    // resolve the asset kind by probe; unknown id → NOT_FOUND
    const kindDir = await findAssetKindDir(paths, filmId, a.asset_id);
    if (!kindDir) {
      throw errNotFound(
        `asset "${a.asset_id}" is not registered`,
        'register it with asset_register (characters take sheet.png, locations and styles take plate.png)',
      );
    }
    const name = a.name
      ?? (kindDir === 'characters' ? 'sheet.png' : undefined)
      ?? (kindDir === 'locations' || kindDir === 'styles' ? 'plate.png' : undefined);
    if (!name) {
      throw errValidation(
        `${kindDir} assets have no canonical image (sheet.png is characters · plate.png is locations and styles)`,
        'register the asset as a character, location, or style to carry a canonical image',
      );
    }

    const found = await readFirstExisting(studioRoot, paths.filmDir(filmId), a.image_path);
    if (!found) {
      throw errNotFound(
        `image not found: ${a.image_path}`,
        'use an absolute path, a STUDIO_ROOT-relative path, or a film-relative path that exists',
      );
    }

    const assetPath = await attachImage(paths, filmId, kindDir, a.asset_id, found.path, name);
    return out({ asset_path: assetPath });
  }));
}
