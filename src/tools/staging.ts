// src/tools/staging.ts — Two-Character Staging Tool (Phase 4: Multi-character composition without identity bleed).
import { z } from 'zod';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { loadConfig } from '../config.js';
import { studioPaths } from '../store/paths.js';
import { initStudio, getActiveFilm } from '../store/studio.js';
import { readText, appendLine } from '../store/fs.js';
import { ensureBudget, recordSpend } from '../budget.js';
import { errNotFound, errValidation } from '../errors.js';
import { GeminiLane } from '../lanes/gemini.js';
import { guard, out } from './registry.js';

export function registerStagingTools(server: McpServer, studioRoot: string): void {
  const paths = studioPaths(studioRoot);

  server.tool(
    'staging_build',
    'Composites two registered characters onto a location keyframe plate with strict spatial boundaries to prevent identity bleed before video generation.',
    {
      film_id: z.string().optional(),
      char_a_id: z.string(),
      char_b_id: z.string(),
      location_id: z.string(),
      light_statement: z.string(),
      staging_layout: z.enum(['a_left_b_right', 'b_left_a_right', 'a_foreground_b_background']),
      scene_action: z.string(),
      image_size: z.enum(['1K', '2K', '4K']).optional(),
    },
    async (a) =>
      guard(async () => {
        await initStudio(paths);
        const filmId = a.film_id ?? (await getActiveFilm(paths));
        if (!filmId) {
          throw errNotFound('no active film set', 'create one with film_create or pass film_id explicitly');
        }

        const charADir = paths.assetDir(filmId, 'characters', a.char_a_id);
        const charBDir = paths.assetDir(filmId, 'characters', a.char_b_id);
        const locDir = paths.assetDir(filmId, 'locations', a.location_id);

        let descA: string;
        let descB: string;
        let descLoc: string;
        try {
          descA = (await readText(join(charADir, 'descriptor.md'))).trim();
          descB = (await readText(join(charBDir, 'descriptor.md'))).trim();
          descLoc = (await readText(join(locDir, 'descriptor.md'))).trim();
        } catch {
          throw errNotFound(
            'one or more assets missing descriptor.md',
            'verify that both characters and the location are registered with descriptors',
          );
        }

        const layoutInstruction =
          a.staging_layout === 'a_left_b_right'
            ? `Subject A is staged firmly on FRAME-LEFT. Subject B is staged firmly on FRAME-RIGHT. There is clear negative space between them.`
            : a.staging_layout === 'b_left_a_right'
              ? `Subject B is staged firmly on FRAME-LEFT. Subject A is staged firmly on FRAME-RIGHT. There is clear negative space between them.`
              : `Subject A is staged in the MEDIUM FOREGROUND. Subject B is staged in the BACKGROUND.`;

        const stagingPrompt = [
          'Cinematic two-shot staging plate for AI film production. 16:9, photographic realism, visible skin pores, motivated lighting.',
          `Setting: ${descLoc}`,
          `Lighting Law: ${a.light_statement} — single motivated light source, consistent shadows across both subjects.`,
          `Subject A (${a.char_a_id}): ${descA}`,
          `Subject B (${a.char_b_id}): ${descB}`,
          `Spatial Blocking Law: ${layoutInstruction}`,
          `Scene Interaction: ${a.scene_action}`,
          'Strict Identity Separation: Both subjects must retain their individual distinct wardrobe, facial features, and coloring without blending or transferring traits.',
          'No text, no watermarks, no split frames.',
        ].join('\n');

        const cfg = loadConfig();
        const geminiKey = cfg.geminiApiKey;
        if (!geminiKey) {
          throw errValidation('missing GEMINI_API_KEY for staging plate generation', 'set GEMINI_API_KEY in .env');
        }

        const lane = new GeminiLane(geminiKey);
        const req = {
          prompt: stagingPrompt,
          refImages: [],
          aspectRatio: '16:9',
          imageSize: a.image_size ?? '2K',
        };

        const price = lane.price(req);
        await ensureBudget(paths, filmId, price);

        const genDir = join(paths.filmDir(filmId), 'generated');
        await mkdir(genDir, { recursive: true });

        const interaction = await lane.submit(req);
        const artifact = await lane.result(interaction);

        const filename = `staging_${a.char_a_id}_${a.char_b_id}_${Date.now()}.png`;
        const artifactPath = join(genDir, filename);
        await writeFile(artifactPath, artifact.data);

        await recordSpend(paths, filmId, artifact.priceUsd);

        const ledgerLine = JSON.stringify({
          ts: new Date().toISOString(),
          tool: 'staging_build',
          lane: 'gemini',
          film_id: filmId,
          cost_usd: artifact.priceUsd,
          verdict: 'kept',
          interaction_id: artifact.interactionId,
          artifact_path: artifactPath,
        });
        await appendLine(paths.ledgerPath(filmId), ledgerLine);

        return out({
          staging_plate_path: artifactPath,
          interaction_id: artifact.interactionId,
          cost_usd: artifact.priceUsd,
          char_a_id: a.char_a_id,
          char_b_id: a.char_b_id,
          location_id: a.location_id,
          layout: a.staging_layout,
        });
      }),
  );
}
