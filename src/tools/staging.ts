// src/tools/staging.ts — Two-Character Staging Tool (Phase 4: Multi-character pixel-anchored composition without identity bleed).
import { z } from 'zod';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { loadConfig } from '../config.js';
import { studioPaths } from '../store/paths.js';
import { initStudio, getActiveFilm } from '../store/studio.js';
import { readText, appendLine } from '../store/fs.js';
import { formatBiologicalMarkersClause, readBiologicalMarkers } from '../store/asset.js';
import { ensureBudget, recordSpend } from '../budget.js';
import { errNotFound, errValidation } from '../errors.js';
import { GeminiLane } from '../lanes/gemini.js';
import { getSharedBridgeQueue } from '../bridge/web_bridge_server.js';
import { guard, out } from './registry.js';

async function readOptionalPng(filePath: string): Promise<Buffer | undefined> {
  try {
    return await readFile(filePath);
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === 'ENOENT') return undefined;
    throw e;
  }
}

export function registerStagingTools(server: McpServer, studioRoot: string): void {
  const paths = studioPaths(studioRoot);

  server.tool(
    'staging_build',
    'Composites two registered characters onto a location keyframe plate using their actual sheet.png/plate.png pixels (plus geo_block & bio markers) to prevent identity bleed before video generation.',
    {
      film_id: z.string().optional(),
      char_a_id: z.string(),
      char_b_id: z.string(),
      location_id: z.string(),
      light_statement: z.string(),
      staging_layout: z.enum(['a_left_b_right', 'b_left_a_right', 'a_foreground_b_background']),
      scene_action: z.string(),
      image_size: z.enum(['1K', '2K', '4K']).optional(),
      dispatch_to_bridge: z.boolean().optional(),
      mode: z.enum(['auto', 'gemini', 'bridge', 'prompt_only']).optional(),
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

        const [bioA, bioB, geoRaw, sheetABuf, sheetBBuf, plateBuf] = await Promise.all([
          readBiologicalMarkers(charADir),
          readBiologicalMarkers(charBDir),
          readOptionalPng(join(locDir, 'geo_block.md')).then((b) => b?.toString('utf8').trim()),
          readOptionalPng(join(charADir, 'sheet.png')),
          readOptionalPng(join(charBDir, 'sheet.png')),
          readOptionalPng(join(locDir, 'plate.png')),
        ]);

        const refImages: Array<{ data: Buffer; mimeType: string }> = [];
        const refImagesLoaded: string[] = [];
        const refLabels: string[] = [];
        if (sheetABuf) {
          refImages.push({ data: sheetABuf, mimeType: 'image/png' });
          refImagesLoaded.push(`${a.char_a_id}/sheet.png`);
          refLabels.push(`Reference ${refImages.length}: Character A (${a.char_a_id}) canonical turnaround`);
        }
        if (sheetBBuf) {
          refImages.push({ data: sheetBBuf, mimeType: 'image/png' });
          refImagesLoaded.push(`${a.char_b_id}/sheet.png`);
          refLabels.push(`Reference ${refImages.length}: Character B (${a.char_b_id}) canonical turnaround`);
        }
        if (plateBuf) {
          refImages.push({ data: plateBuf, mimeType: 'image/png' });
          refImagesLoaded.push(`${a.location_id}/plate.png`);
          refLabels.push(`Reference ${refImages.length}: Location (${a.location_id}) locked architectural plate`);
        }

        const bioAClause = bioA ? formatBiologicalMarkersClause(bioA) : undefined;
        const bioBClause = bioB ? formatBiologicalMarkersClause(bioB) : undefined;

        const layoutInstruction =
          a.staging_layout === 'a_left_b_right'
            ? 'Subject A is staged firmly on FRAME-LEFT. Subject B is staged firmly on FRAME-RIGHT. There is clear negative space between them.'
            : a.staging_layout === 'b_left_a_right'
              ? 'Subject B is staged firmly on FRAME-LEFT. Subject A is staged firmly on FRAME-RIGHT. There is clear negative space between them.'
              : 'Subject A is staged in the MEDIUM FOREGROUND. Subject B is staged in the BACKGROUND.';

        const stagingPrompt = [
          'Cinematic two-shot staging plate for AI film production. 16:9, raw 35mm anamorphic digital sensor capture, natural skin pores, zero cross-hatching, zero extra crowd figures or background limb blobs.',
          `Setting: ${descLoc}`,
          ...(geoRaw ? [`Locked Spatial Map: ${geoRaw}`] : []),
          `Lighting Law: ${a.light_statement} — sharp figure-ground separation, consistent shadows across both subjects.`,
          `Subject A (${a.char_a_id}): ${descA}${bioAClause ? ` ${bioAClause}` : ''}`,
          `Subject B (${a.char_b_id}): ${descB}${bioBClause ? ` ${bioBClause}` : ''}`,
          ...(refLabels.length > 0 ? [`Anchored Pixel References (match faces, anatomy, harness, and stone architecture strictly): ${refLabels.join(' | ')}`] : []),
          `Spatial Blocking Law: ${layoutInstruction}`,
          `Scene Interaction: ${a.scene_action}`,
          'Strict Identity Separation: Both subjects must retain their individual distinct wardrobe, anatomy, and coloring without blending traits.',
          'No text, no watermarks, no split frames.',
        ].join('\n');

        const cfg = loadConfig();
        const hasGeminiCreds = Boolean(cfg.geminiApiKey || cfg.googleApplicationCredentials);
        const selectedMode = a.mode ?? (a.dispatch_to_bridge ? 'bridge' : 'auto');

        if (selectedMode === 'gemini' && !hasGeminiCreds) {
          throw errValidation(
            'missing GEMINI_API_KEY and GOOGLE_APPLICATION_CREDENTIALS for staging plate generation',
            'set GEMINI_API_KEY or GOOGLE_APPLICATION_CREDENTIALS in .env, or use dispatch_to_bridge: true',
          );
        }

        if (selectedMode === 'bridge' || selectedMode === 'prompt_only' || (!hasGeminiCreds && selectedMode === 'auto')) {
          const queue = getSharedBridgeQueue(studioRoot);
          const bridgeJob =
            a.dispatch_to_bridge || selectedMode === 'bridge'
              ? queue.enqueue({
                  target: 'flow_staging',
                  film_id: filmId,
                  asset_id: `${a.char_a_id}_${a.char_b_id}`,
                  prompt: stagingPrompt,
                  model_hint: 'Nano Banana 2.5',
                  aspect_ratio: '16:9',
                  metadata: {
                    char_a_id: a.char_a_id,
                    char_b_id: a.char_b_id,
                    location_id: a.location_id,
                    layout: a.staging_layout,
                    ref_images_loaded: refImagesLoaded,
                  },
                })
              : undefined;
          return out({
            mode: bridgeJob ? 'bridge_queued' : 'prompt_only',
            char_a_id: a.char_a_id,
            char_b_id: a.char_b_id,
            location_id: a.location_id,
            layout: a.staging_layout,
            ref_images_loaded: refImagesLoaded,
            staging_prompt: stagingPrompt,
            ...(bridgeJob ? { bridge_job_id: bridgeJob.id } : {}),
            bridge_connected: queue.getStatus().connectedClients > 0,
            manual_instructions: `Open https://flow.google (Nano Banana 2.5, 16:9, ${a.image_size ?? '2K'}), attach sheets (${refImagesLoaded.join(', ') || 'none found'}), paste staging_prompt, and use the result as first_frame_path in render_shot.`,
          });
        }

        const lane = await GeminiLane.fromConfigOrAdc(cfg);
        const req = {
          prompt: stagingPrompt,
          refImages,
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
          ref_images_loaded: refImagesLoaded,
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
          ref_images_loaded: refImagesLoaded,
        });
      }),
  );
}
