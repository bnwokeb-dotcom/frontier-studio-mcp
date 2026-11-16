// src/tools/storyboard.ts — Pre-Vis Storyboard Contact Sheet Generator (Pillar 1).
import { z } from 'zod';
import { mkdir, readdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { loadConfig } from '../config.js';
import { studioPaths } from '../store/paths.js';
import { initStudio, getActiveFilm } from '../store/studio.js';
import { shotShow, type ShotRecord } from '../store/shot.js';
import { appendLine } from '../store/fs.js';
import { ensureBudget, recordSpend } from '../budget.js';
import { errNotFound, errValidation } from '../errors.js';
import { GeminiLane } from '../lanes/gemini.js';
import { guard, out } from './registry.js';

export function registerStoryboardTools(server: McpServer, studioRoot: string): void {
  const paths = studioPaths(studioRoot);

  server.tool(
    'storyboard_build',
    'Renders a single 2x3 or 2x4 visual storyboard contact sheet for an entire sequence using Gemini, allowing the director to pre-visualize framing, eye-trace, and cut pacing before rendering video.',
    {
      film_id: z.string().optional(),
      sequence: z.string(),
      grid_layout: z.enum(['2x2', '2x3', '2x4']).optional(),
      image_size: z.enum(['1K', '2K', '4K']).optional(),
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

        const promptLines = [
          `Cinematic pre-visualization storyboard contact sheet. ${layout} panel grid layout, clean black borders between panels, photographic realism, film grain, directional lighting.`,
          `Sequence ID: ${a.sequence}.`,
        ];

        panels.forEach((shot, index) => {
          const framing = shot.camera.framing ? shot.camera.framing.replace(/_/g, ' ') : 'cinematic';
          promptLines.push(
            `Panel ${index + 1}: [Shot ${shot.id}] Framing: ${framing}, Lens: ${shot.camera.lens}, Camera: ${shot.camera.move}. Action: ${shot.action}.`,
          );
        });

        promptLines.push(
          'Continuity Law: Maintain clear spatial orientation, consistent eye-trace between adjacent panels, and motivated lighting across all panels. Crisp panel delineation with neat lower-third labels.',
        );

        const cfg = loadConfig();
        const geminiKey = cfg.geminiApiKey;
        if (!geminiKey) {
          throw errValidation('missing GEMINI_API_KEY for storyboard generation', 'set GEMINI_API_KEY in .env');
        }

        const lane = new GeminiLane(geminiKey);
        const req = {
          prompt: promptLines.join('\n'),
          refImages: [],
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
        });
        await appendLine(paths.ledgerPath(filmId), ledgerLine);

        return out({
          storyboard_path: artifactPath,
          sequence: a.sequence,
          grid_layout: layout,
          shots_included: panels.length,
          cost_usd: artifact.priceUsd,
          interaction_id: artifact.interactionId,
        });
      }),
  );
}
