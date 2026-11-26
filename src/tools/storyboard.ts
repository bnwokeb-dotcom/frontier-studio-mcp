// src/tools/storyboard.ts — Pre-Vis Pixel-Anchored Storyboard Contact Sheet & Auto Panel Slicer.
import { z } from 'zod';
import { execFile as execFileCb } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { loadConfig } from '../config.js';
import { studioPaths } from '../store/paths.js';
import { initStudio, getActiveFilm } from '../store/studio.js';
import { sequenceGeo } from '../store/sequence.js';
import { shotShow, type ShotRecord } from '../store/shot.js';
import { appendLine } from '../store/fs.js';
import { ensureBudget, recordSpend } from '../budget.js';
import { errNotFound, errValidation } from '../errors.js';
import { GeminiLane } from '../lanes/gemini.js';
import { probeMedia } from '../qa/critic.js';
import { getSharedBridgeQueue } from '../bridge/web_bridge_server.js';
import { guard, out } from './registry.js';

const execFileAsync = promisify(execFileCb);

async function readOptionalBuffer(filePath: string): Promise<Buffer | undefined> {
  try {
    return await readFile(filePath);
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === 'ENOENT') return undefined;
    throw e;
  }
}

function gridDims(layout: '2x2' | '2x3' | '2x4'): { rows: number; cols: number } {
  if (layout === '2x2') return { rows: 2, cols: 2 };
  if (layout === '2x3') return { rows: 2, cols: 3 };
  return { rows: 2, cols: 4 };
}

/**
 * Slices a generated storyboard grid contact sheet into per-panel PNG crops when
 * ffprobe confirms valid raster dimensions (>= 160x90). Skips cleanly on stub/tiny buffers.
 */
async function sliceStoryboardPanels(opts: {
  storyboardPath: string;
  outDir: string;
  sequence: string;
  layout: '2x2' | '2x3' | '2x4';
  panelCount: number;
}): Promise<string[]> {
  const probe = await probeMedia(opts.storyboardPath).catch(() => undefined);
  if (!probe || !probe.hasVideo || probe.width < 160 || probe.height < 90) {
    return [];
  }
  const { rows, cols } = gridDims(opts.layout);
  const cellW = Math.floor(probe.width / cols);
  const cellH = Math.floor(probe.height / rows);
  if (cellW < 64 || cellH < 64) return [];

  await mkdir(opts.outDir, { recursive: true });
  const panelPaths: string[] = [];
  for (let i = 0; i < opts.panelCount; i++) {
    const r = Math.floor(i / cols);
    const c = i % cols;
    const x = c * cellW;
    const y = r * cellH;
    const panelPath = join(opts.outDir, `${opts.sequence}_panel_${String(i + 1).padStart(2, '0')}.png`);
    await execFileAsync('ffmpeg', [
      '-y',
      '-i',
      opts.storyboardPath,
      '-vf',
      `crop=${cellW}:${cellH}:${x}:${y}`,
      '-frames:v',
      '1',
      panelPath,
    ]);
    panelPaths.push(panelPath);
  }
  return panelPaths;
}

export function registerStoryboardTools(server: McpServer, studioRoot: string): void {
  const paths = studioPaths(studioRoot);

  server.tool(
    'storyboard_build',
    'Renders a pixel-anchored 2x2, 2x3, or 2x4 storyboard contact sheet for a sequence (loading character sheet.pngs, location plate.pngs, and locked geo_block), and optionally slices panels into individual frames.',
    {
      film_id: z.string().optional(),
      sequence: z.string(),
      grid_layout: z.enum(['2x2', '2x3', '2x4']).optional(),
      image_size: z.enum(['1K', '2K', '4K']).optional(),
      slice_panels: z.boolean().optional(),
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

        const shotsDir = paths.shotsDir(filmId);
        let files: string[] = [];
        try {
          files = (await readdir(shotsDir)).filter((f) => f.endsWith('.json'));
        } catch {
          throw errNotFound(`no shots found for film "${filmId}"`, 'create shots with shot_create first');
        }

        const sequenceShots: ShotRecord[] = [];
        for (const file of files.sort()) {
          const s = await shotShow(paths, filmId, file.replace(/\.json$/, ''));
          if (s.sequence === a.sequence) {
            sequenceShots.push(s);
          }
        }

        if (sequenceShots.length < 2) {
          throw errValidation(
            `sequence "${a.sequence}" has only ${sequenceShots.length} shot(s)`,
            'register at least 2 shots in this sequence before building a storyboard contact sheet',
          );
        }

        const layout = a.grid_layout ?? '2x3';
        const maxPanels = layout === '2x2' ? 4 : layout === '2x3' ? 6 : 8;
        const panels = sequenceShots.slice(0, maxPanels);

        // Gather unique canonical sheets/plates referenced across sequence shots (max 14 refs)
        const seenAssets = new Set<string>();
        const refImages: Array<{ data: Buffer; mimeType: string }> = [];
        const refImagesLoaded: string[] = [];
        let firstLocationId: string | undefined;

        for (const shot of panels) {
          for (const ref of shot.refs ?? []) {
            if (refImages.length >= 14) break;
            if (ref.role !== 'character' && ref.role !== 'location' && ref.role !== 'style') continue;
            const key = `${ref.role}:${ref.assetId}`;
            if (seenAssets.has(key)) continue;
            seenAssets.add(key);

            if (ref.role === 'location' && !firstLocationId) firstLocationId = ref.assetId;
            const kindDir = ref.role === 'character' ? 'characters' : ref.role === 'location' ? 'locations' : 'styles';
            const fileName = ref.role === 'character' ? 'sheet.png' : 'plate.png';
            const buf = await readOptionalBuffer(join(paths.assetDir(filmId, kindDir, ref.assetId), fileName));
            if (buf) {
              refImages.push({ data: buf, mimeType: 'image/png' });
              refImagesLoaded.push(`${ref.assetId}/${fileName}`);
            }
          }
        }

        let geoBlock = await sequenceGeo(paths, filmId, a.sequence);
        if (!geoBlock && firstLocationId) {
          const locGeo = await readOptionalBuffer(join(paths.assetDir(filmId, 'locations', firstLocationId), 'geo_block.md'));
          geoBlock = locGeo?.toString('utf8').trim() || panels[0]?.geoBlock;
        }

        const promptLines = [
          `Cinematic pre-visualization storyboard contact sheet. Exact uniform ${layout} grid layout, thin hairline dividers only (no text boxes or margins), raw 35mm anamorphic photographic frames, motivated lighting, crisp figure-ground contrast, strictly max 2 foreground bodies per panel (zero crowd limb blobs).`,
          `Sequence ID: ${a.sequence}.`,
          ...(geoBlock ? [`Locked Spatial Map: ${geoBlock}`] : []),
          ...(refImagesLoaded.length > 0 ? [`Match Attached Character/Location References Strictly: ${refImagesLoaded.join(', ')}.`] : []),
        ];

        panels.forEach((shot, index) => {
          const framing = shot.camera.framing ? shot.camera.framing.replace(/_/g, ' ') : 'cinematic';
          promptLines.push(
            `Panel ${index + 1}: [Shot ${shot.id}] Framing: ${framing}, Lens: ${shot.camera.lens}, Camera: ${shot.camera.move}. Action: ${shot.action}.`,
          );
        });

        promptLines.push(
          'Continuity Law: Maintain exact screen direction, eye-trace between adjacent panels, and identical facial/wardrobe/architecture design from attached references. Zero text overlays or UI watermarks.',
        );

        const cfg = loadConfig();
        const hasGeminiCreds = Boolean(cfg.geminiApiKey || cfg.googleApplicationCredentials);
        const selectedMode = a.mode ?? (a.dispatch_to_bridge ? 'bridge' : 'auto');

        if (selectedMode === 'gemini' && !hasGeminiCreds) {
          throw errValidation(
            'missing GEMINI_API_KEY and GOOGLE_APPLICATION_CREDENTIALS for storyboard generation',
            'set GEMINI_API_KEY or GOOGLE_APPLICATION_CREDENTIALS in .env, or pass dispatch_to_bridge: true',
          );
        }

        if (selectedMode === 'bridge' || selectedMode === 'prompt_only' || (!hasGeminiCreds && selectedMode === 'auto')) {
          const queue = getSharedBridgeQueue(studioRoot);
          const storyboardPrompt = promptLines.join('\n');
          const bridgeJob =
            a.dispatch_to_bridge || selectedMode === 'bridge'
              ? queue.enqueue({
                  target: 'flow_storyboard',
                  film_id: filmId,
                  asset_id: a.sequence,
                  prompt: storyboardPrompt,
                  model_hint: 'Nano Banana 2.5',
                  aspect_ratio: '16:9',
                  metadata: {
                    sequence: a.sequence,
                    grid_layout: layout,
                    shots_included: panels.length,
                    ref_images_loaded: refImagesLoaded,
                  },
                })
              : undefined;
          return out({
            mode: bridgeJob ? 'bridge_queued' : 'prompt_only',
            sequence: a.sequence,
            grid_layout: layout,
            shots_included: panels.length,
            ref_images_loaded: refImagesLoaded,
            storyboard_prompt: storyboardPrompt,
            ...(bridgeJob ? { bridge_job_id: bridgeJob.id } : {}),
            bridge_connected: queue.getStatus().connectedClients > 0,
            manual_instructions: `Open https://flow.google (Nano Banana 2.5, 16:9, ${a.image_size ?? '2K'}), attach sheets (${refImagesLoaded.join(', ') || 'none found'}), paste storyboard_prompt, and save the contact sheet PNG.`,
          });
        }

        const lane = await GeminiLane.fromConfigOrAdc(cfg);
        const req = {
          prompt: promptLines.join('\n'),
          refImages,
          aspectRatio: '16:9',
          imageSize: a.image_size ?? '2K',
        };

        const price = lane.price(req);
        await ensureBudget(paths, filmId, price);

        const storyDir = paths.storyboardsDir(filmId);
        await mkdir(storyDir, { recursive: true });

        const interaction = await lane.submit(req);
        const artifact = await lane.result(interaction);

        const filename = `${a.sequence}_storyboard_${Date.now()}.png`;
        const artifactPath = join(storyDir, filename);
        await writeFile(artifactPath, artifact.data);

        const panelPaths =
          a.slice_panels !== false
            ? await sliceStoryboardPanels({
                storyboardPath: artifactPath,
                outDir: join(storyDir, 'panels'),
                sequence: a.sequence,
                layout,
                panelCount: panels.length,
              })
            : [];

        await recordSpend(paths, filmId, artifact.priceUsd);

        const ledgerLine = JSON.stringify({
          ts: new Date().toISOString(),
          tool: 'storyboard_build',
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
          storyboard_path: artifactPath,
          ...(panelPaths.length > 0 ? { panel_paths: panelPaths } : {}),
          sequence: a.sequence,
          grid_layout: layout,
          shots_included: panels.length,
          ref_images_loaded: refImagesLoaded,
          cost_usd: artifact.priceUsd,
          interaction_id: artifact.interactionId,
        });
      }),
  );
}
