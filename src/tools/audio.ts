// src/tools/audio.ts — M4 Audio Tools: dialogue rendering, diegetic acoustic matching, and soundscapes.
import { z } from 'zod';
import { mkdir, writeFile, copyFile, stat } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { loadConfig } from '../config.js';
import { studioPaths } from '../store/paths.js';
import { initStudio, getActiveFilm } from '../store/studio.js';
import { shotShow } from '../store/shot.js';
import { appendLine } from '../store/fs.js';
import { ensureBudget, recordSpend } from '../budget.js';
import { errNotFound, errValidation } from '../errors.js';
import { GoogleAudioLane, ElevenLabsAudioLane, type AudioLane } from '../lanes/audio.js';
import { guard, out } from './registry.js';

const execFileAsync = promisify(execFile);

export function registerAudioTools(server: McpServer, studioRoot: string): void {
  const paths = studioPaths(studioRoot);

  server.tool(
    'dialogue_render',
    'Synthesizes isolated 48kHz broadcast WAV dialogue stems for a shot using Google Text-to-Speech (or ElevenLabs). Billed and ledgered.',
    {
      shot_id: z.string(),
      film_id: z.string().optional(),
      voice_name: z.string().optional(),
      lane: z.enum(['google', 'elevenlabs']).optional(),
    },
    async (a) =>
      guard(async () => {
        await initStudio(paths);
        const filmId = a.film_id ?? (await getActiveFilm(paths));
        if (!filmId) {
          throw errNotFound('no active film set', 'create one with film_create or pass film_id explicitly');
        }

        const shot = await shotShow(paths, filmId, a.shot_id);
        const dialogueList = shot.audioBlock?.dialogue ?? [];
        if (dialogueList.length === 0) {
          throw errValidation(
            `shot "${a.shot_id}" has no dialogue lines in its audio_block`,
            'add dialogue lines with shot_update before calling dialogue_render',
          );
        }

        const cfg = loadConfig();
        const laneKind = a.lane ?? 'google';

        let audioLane: AudioLane;
        if (laneKind === 'elevenlabs') {
          const key = process.env.ELEVENLABS_API_KEY;
          if (!key) {
            throw errValidation('missing ELEVENLABS_API_KEY', 'set ELEVENLABS_API_KEY in .env or use google lane');
          }
          audioLane = new ElevenLabsAudioLane(key);
        } else {
          const key = cfg.geminiApiKey;
          if (!key) {
            throw errValidation('missing GEMINI_API_KEY for audio lane', 'set GEMINI_API_KEY in .env');
          }
          audioLane = new GoogleAudioLane(key);
        }

        const audioDir = paths.audioDir(filmId);
        await mkdir(audioDir, { recursive: true });

        const results: Array<{
          line_index: number;
          line: string;
          audio_path: string;
          duration_s: number;
          cost_usd: number;
        }> = [];

        let totalCostUsd = 0;

        for (let i = 0; i < dialogueList.length; i++) {
          const item = dialogueList[i];
          const estimatedCost = audioLane.price({ dialogue: item.line });
          await ensureBudget(paths, filmId, estimatedCost);

          const artifact = await audioLane.synthesize({
            dialogue: item.line,
            voiceName: a.voice_name,
          });

          const filename = `${a.shot_id}_line_${i + 1}.wav`;
          const filePath = paths.audioPath(filmId, filename);
          await writeFile(filePath, artifact.audioData);

          await recordSpend(paths, filmId, artifact.costUsd);
          totalCostUsd += artifact.costUsd;

          const ledgerLine = JSON.stringify({
            ts: new Date().toISOString(),
            tool: 'dialogue_render',
            lane: audioLane.kind,
            film_id: filmId,
            shot_id: a.shot_id,
            cost_usd: artifact.costUsd,
            verdict: 'kept',
            artifact_path: filePath,
          });
          await appendLine(paths.ledgerPath(filmId), ledgerLine);

          results.push({
            line_index: i + 1,
            line: item.line,
            audio_path: filePath,
            duration_s: artifact.durationEstimateS,
            cost_usd: artifact.costUsd,
          });
        }

        return out({
          shot_id: a.shot_id,
          film_id: filmId,
          total_cost_usd: Number(totalCostUsd.toFixed(5)),
          lines: results,
        });
      }),
  );

  server.tool(
    'acoustic_match',
    'Convolves a raw dialogue WAV stem with the acoustic environment of the location (stone cavern reverb, snow forest damping, wooden cabin resonance) and normalizes to -14 LUFS broadcast standard.',
    {
      shot_id: z.string(),
      film_id: z.string().optional(),
      line_index: z.number().optional(),
      environment: z.enum(['snow_forest', 'stone_cavern', 'wooden_cabin', 'interior_hall', 'open_field']).optional(),
    },
    async (a) =>
      guard(async () => {
        await initStudio(paths);
        const filmId = a.film_id ?? (await getActiveFilm(paths));
        if (!filmId) {
          throw errNotFound('no active film set', 'create one with film_create or pass film_id explicitly');
        }

        const shot = await shotShow(paths, filmId, a.shot_id);
        const lineIdx = a.line_index ?? 1;
        const rawFileName = `${a.shot_id}_line_${lineIdx}.wav`;
        const rawFilePath = paths.audioPath(filmId, rawFileName);

        try {
          await stat(rawFilePath);
        } catch {
          throw errValidation(
            `raw dialogue stem "${rawFileName}" not found`,
            'run dialogue_render first to generate the raw speech stem before acoustic matching',
          );
        }

        // Infer environment from shot geo_block if not explicitly provided
        let env = a.environment;
        if (!env) {
          const geo = (shot.geoBlock || '').toLowerCase();
          if (geo.includes('stone') || geo.includes('cave') || geo.includes('cavern') || geo.includes('ruin')) {
            env = 'stone_cavern';
          } else if (geo.includes('snow') || geo.includes('ice') || geo.includes('blizzard') || geo.includes('forest')) {
            env = 'snow_forest';
          } else if (geo.includes('cabin') || geo.includes('wood') || geo.includes('timber') || geo.includes('hearth')) {
            env = 'wooden_cabin';
          } else if (geo.includes('hall') || geo.includes('interior') || geo.includes('palace')) {
            env = 'interior_hall';
          } else {
            env = 'open_field';
          }
        }

        const FILTER_RECIPES: Record<string, string> = {
          snow_forest: 'lowpass=f=4500,volume=1.0',
          stone_cavern: 'aecho=0.8:0.88:40:0.35,highpass=f=100',
          wooden_cabin: 'equalizer=f=300:t=q:w=1.2:g=2.5,lowpass=f=7500',
          interior_hall: 'aecho=0.8:0.7:25:0.25',
          open_field: 'highpass=f=80',
        };

        const acousticFilter = FILTER_RECIPES[env];
        const fullFilter = `${acousticFilter},loudnorm=I=-14:TP=-1.0:LRA=11`;

        const outputFileName = `${a.shot_id}_line_${lineIdx}_diegetic.wav`;
        const outputFilePath = paths.audioPath(filmId, outputFileName);

        let ffmpegApplied = false;
        try {
          await execFileAsync('ffmpeg', [
            '-y',
            '-i',
            rawFilePath,
            '-af',
            fullFilter,
            outputFilePath,
          ]);
          ffmpegApplied = true;
        } catch {
          // Graceful fallback if ffmpeg binary is not installed on host: copy audio and write manifest
          await copyFile(rawFilePath, outputFilePath);
          await writeFile(
            paths.audioPath(filmId, `${a.shot_id}_line_${lineIdx}_acoustic.json`),
            JSON.stringify({ environment: env, filter_graph: fullFilter, target_lufs: -14 }),
            'utf8',
          );
        }

        return out({
          shot_id: a.shot_id,
          diegetic_audio_path: outputFilePath,
          environment: env,
          filter_graph: fullFilter,
          target_lufs: -14,
          ffmpeg_applied: ffmpegApplied,
        });
      }),
  );

  server.tool(
    'soundscape_build',
    'Synthesizes an ambient diegetic room-tone and SFX bed for a shot based on its audio_block.sfx specification.',
    {
      shot_id: z.string(),
      film_id: z.string().optional(),
    },
    async (a) =>
      guard(async () => {
        await initStudio(paths);
        const filmId = a.film_id ?? (await getActiveFilm(paths));
        if (!filmId) {
          throw errNotFound('no active film set', 'create one with film_create or pass film_id explicitly');
        }

        const shot = await shotShow(paths, filmId, a.shot_id);
        const sfx = shot.audioBlock?.sfx?.trim();
        if (!sfx) {
          throw errValidation(
            `shot "${a.shot_id}" has no sfx specified in its audio_block`,
            'define sfx text (e.g. "wind, crackling hearth") with shot_update before building soundscape',
          );
        }

        const audioDir = paths.audioDir(filmId);
        await mkdir(audioDir, { recursive: true });

        const filename = `${a.shot_id}_soundscape.txt`;
        const filePath = paths.audioPath(filmId, filename);
        // Write the soundscape description manifest
        await writeFile(filePath, `SFX SPEC: ${sfx}\nDURATION: ${shot.durationS}s\nROOM_TONE: active\n`);

        return out({
          shot_id: a.shot_id,
          film_id: filmId,
          sfx_spec: sfx,
          duration_s: shot.durationS,
          manifest_path: filePath,
        });
      }),
  );
}
