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
import { getSharedBridgeQueue } from '../bridge/web_bridge_server.js';
import { guard, out } from './registry.js';

export function registerStoryboardTools(server: McpServer, studioRoot: string): void {
  const paths = studioPaths(studioRoot);

  server.tool(
    'storyboard_build',
    'Renders a single 2x2, 2x3, or 2x4 visual storyboard contact sheet for an entire sequence via Gemini API, Chrome Extension Web Bridge (dispatch_to_bridge), or zero-API Flow prompt output.',
    {
      film_id: z.string().optional(),
      sequence: z.string(),
      grid_layout: z.enum(['2x2', '2x3', '2x4']).optional(),
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
        const selectedMode = a.mode ?? (a.dispatch_to_bridge ? 'bridge' : 'auto');

        if (selectedMode === 'gemini' && !geminiKey) {
          throw errValidation('missing GEMINI_API_KEY for storyboard generation', 'set GEMINI_API_KEY in .env or pass dispatch_to_bridge: true');
        }

        if (selectedMode === 'bridge' || selectedMode === 'prompt_only' || (!geminiKey && selectedMode === 'auto')) {
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
                  metadata: { sequence: a.sequence, grid_layout: layout, shots_included: panels.length },
                })
              : undefined;
          return out({
            mode: bridgeJob ? 'bridge_queued' : 'prompt_only',
            sequence: a.sequence,
            grid_layout: layout,
            shots_included: panels.length,
            storyboard_prompt: storyboardPrompt,
            ...(bridgeJob ? { bridge_job_id: bridgeJob.id } : {}),
            bridge_connected: queue.getStatus().connectedClients > 0,
            manual_instructions: `Open https://flow.google (Nano Banana 2.5, 16:9, ${a.image_size ?? '2K'}), paste storyboard_prompt, and save the contact sheet PNG.`,
          });
        }

        const lane = new GeminiLane(geminiKey!);
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
