// src/tools/image.ts — image-lane tools: billed, budgeted, ledgered.
//
// The Gemini lane is constructed lazily, per call, ONLY here: registry tools
// never touch it, so a missing GEMINI_API_KEY (AUTH) surfaces only when a
// billed call actually executes. Binding order for every billed call:
// validate args → resolve refs → lane.price → ensureBudget → submit → result
// → write artifact → recordSpend → ledger line. Every refusal (validation,
// NOT_FOUND, AUTH, BUDGET) precedes the API call by construction.
import { z } from 'zod';
import { readFile, writeFile } from 'node:fs/promises';
import { extname, isAbsolute, join } from 'node:path';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { studioPaths } from '../store/paths.js';
import type { StudioPaths } from '../store/paths.js';
import { initStudio, getActiveFilm } from '../store/studio.js';
import { appendLine, ensureDir } from '../store/fs.js';
import { ensureBudget, recordSpend } from '../budget.js';
import { GeminiLane } from '../lanes/gemini.js';
import { errNotFound, errValidation } from '../errors.js';
import { guard, out } from './registry.js';

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

// <YYYYMMDD-HHmmss>, local time
function stampOf(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
}

// Absolute paths pass through as-is; relative paths resolve against STUDIO_ROOT
// first, then the film dir (so `films/<id>/refs/x.png` and `refs/x.png` both
// work). Missing everywhere → NOT_FOUND; unsupported extension → VALIDATION
// naming the supported set. Existence is checked before the extension so a
// missing file never masquerades as a type refusal.
async function readRefImage(
  paths: StudioPaths,
  studioRoot: string,
  filmId: string,
  raw: string,
): Promise<{ data: Buffer; mimeType: string }> {
  const candidates = isAbsolute(raw) ? [raw] : [join(studioRoot, raw), join(paths.filmDir(filmId), raw)];
  let data: Buffer | undefined;
  for (const candidate of candidates) {
    try {
      data = await readFile(candidate);
      break;
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code !== 'ENOENT') throw e;
    }
  }
  if (!data) {
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
  return { data, mimeType };
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

    // 4. lane + quote (lazily, per call)
    const lane = GeminiLane.fromConfig({
      studioRoot,
      geminiApiKey: process.env.GEMINI_API_KEY || undefined,
      studioLive: process.env.STUDIO_LIVE === '1',
    });
    const req = {
      prompt: a.prompt,
      refImages,
      aspectRatio: a.aspect_ratio ?? '16:9',
      imageSize: a.image_size ?? '1K',
      ...(a.previous_interaction_id ? { previousInteractionId: a.previous_interaction_id } : {}),
    };
    const price = lane.price(req);

    // 5. hard stop BEFORE the API call
    await ensureBudget(paths, filmId, price);

    // 6. generate (images are synchronous: submit caches the body, result reads it back)
    const interaction = await lane.submit(req);
    const artifact = await lane.result(interaction);

    // 7. artifact → <filmDir>/generated/<YYYYMMDD-HHmmss>-<slug>.png
    const generatedDir = `${paths.filmDir(filmId)}/generated`;
    const artifactPath = `${generatedDir}/${stampOf(new Date())}-${slugOf(a.prompt)}.png`;
    await ensureDir(generatedDir);
    await writeFile(artifactPath, artifact.data);

    // 8. spend accrues ONLY after a successful artifact
    await recordSpend(paths, filmId, artifact.priceUsd);

    // 9. ledger line
    await appendLine(paths.ledgerPath(filmId), JSON.stringify({
      ts: new Date().toISOString(),
      tool: 'image_generate',
      lane: 'gemini',
      film_id: filmId,
      cost_usd: artifact.priceUsd,
      verdict: 'pending',
      interaction_id: artifact.interactionId,
      artifact_path: artifactPath,
    }));

    // 10. snake_case wire output
    return out({
      artifact_path: artifactPath,
      interaction_id: artifact.interactionId,
      cost_usd: artifact.priceUsd,
      image_size: req.imageSize,
      aspect_ratio: req.aspectRatio,
    });
  }));
}
