// src/tools/editor.ts — The Cutting Room: FFmpeg rough-cut assembly and FCPXML timeline export for DaVinci Resolve / Premiere.
import { z } from 'zod';
import { readdir, writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { studioPaths } from '../store/paths.js';
import { initStudio, getActiveFilm } from '../store/studio.js';
import { shotShow, type ShotRecord } from '../store/shot.js';
import { readJson } from '../store/fs.js';
import { errNotFound, errValidation } from '../errors.js';
import { guard, out } from './registry.js';

export function registerEditorTools(server: McpServer, studioRoot: string): void {
  const paths = studioPaths(studioRoot);

  server.tool(
    'film_export_xml',
    'Exports an industry-standard FCPXML (Final Cut Pro / DaVinci Resolve / Premiere) timeline for all kept shots in a sequence or film.',
    {
      film_id: z.string().optional(),
      sequence: z.string().optional(),
      title: z.string().optional(),
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

        const shots: ShotRecord[] = [];
        for (const f of files.sort()) {
          const s = await shotShow(paths, filmId, f.replace(/\.json$/, ''));
          if (a.sequence && s.sequence !== a.sequence) continue;
          shots.push(s);
        }

        if (shots.length === 0) {
          throw errValidation('no shots match criteria', 'ensure sequence has shots');
        }

        const timelineName = a.title ?? (a.sequence ? `${filmId}_${a.sequence}` : filmId);
        const timelinesDir = join(paths.filmDir(filmId), 'timelines');
        await mkdir(timelinesDir, { recursive: true });

        // Build FCPXML 1.10
        let currentFrame = 0;
        const fps = 24;
        const assetElements: string[] = [];
        const spineElements: string[] = [];

        shots.forEach((shot, index) => {
          const durationFrames = Math.round(shot.durationS * fps);
          const assetId = `r_shot_${index + 1}`;
          const keptTake = shot.takes?.find((t) => t.verdict === 'kept');
          const videoFile = keptTake ? `renders/${keptTake.jobId}/shot.mp4` : `renders/placeholder_${shot.id}.mp4`;

          assetElements.push(
            `    <asset id="${assetId}" name="${shot.id}" src="file://${videoFile}" duration="${durationFrames}/24s" format="r1" hasVideo="1" hasAudio="1" />`,
          );

          spineElements.push(
            `        <video name="${shot.id}" offset="${currentFrame}/24s" ref="${assetId}" duration="${durationFrames}/24s" start="0s">`,
            `          <!-- ${shot.camera.lens} ${shot.camera.move} — ${shot.camera.reason} -->`,
            `        </video>`,
          );

          currentFrame += durationFrames;
        });

        const fcpxml = [
          '<?xml version="1.0" encoding="UTF-8"?>',
          '<!DOCTYPE fcpxml>',
          '<fcpxml version="1.10">',
          '  <resources>',
          '    <format id="r1" name="FFVideoFormat1080p24" frameDuration="1/24s" width="1920" height="1080"/>',
          ...assetElements,
          '  </resources>',
          '  <library>',
          `    <event name="${filmId}">`,
          `      <project name="${timelineName}">`,
          `        <sequence format="r1" duration="${currentFrame}/24s" tcStart="0s">`,
          '          <spine>',
          ...spineElements,
          '          </spine>',
          '        </sequence>',
          '      </project>',
          '    </event>',
          '  </library>',
          '</fcpxml>',
        ].join('\n');

        const xmlPath = join(timelinesDir, `${timelineName}.fcpxml`);
        await writeFile(xmlPath, fcpxml, 'utf8');

        // Also generate standard EDL file
        const edlLines = [
          `TITLE: ${timelineName}`,
          'FCM: NON-DROP FRAME',
          '',
        ];

        let edlFrame = 0;
        const toTc = (f: number) => {
          const h = Math.floor(f / (24 * 3600)).toString().padStart(2, '0');
          const m = Math.floor((f % (24 * 3600)) / (24 * 60)).toString().padStart(2, '0');
          const s = Math.floor((f % (24 * 60)) / 24).toString().padStart(2, '0');
          const fr = (f % 24).toString().padStart(2, '0');
          return `${h}:${m}:${s}:${fr}`;
        };

        shots.forEach((shot, i) => {
          const dur = Math.round(shot.durationS * 24);
          const inTc = toTc(edlFrame);
          const outTc = toTc(edlFrame + dur);
          edlLines.push(
            `${(i + 1).toString().padStart(3, '0')}  AX       V     C        00:00:00:00 ${toTc(dur)} ${inTc} ${outTc}`,
            `* FROM CLIP NAME: ${shot.id}.mp4`,
            '',
          );
          edlFrame += dur;
        });

        const edlPath = join(timelinesDir, `${timelineName}.edl`);
        await writeFile(edlPath, edlLines.join('\n'), 'utf8');

        return out({
          timeline_name: timelineName,
          total_shots: shots.length,
          total_runtime_s: Number((currentFrame / 24).toFixed(2)),
          fcpxml_path: xmlPath,
          edl_path: edlPath,
          compatibility: ['DaVinci Resolve', 'Adobe Premiere Pro', 'Final Cut Pro'],
        });
      }),
  );

  server.tool(
    'film_assemble',
    'Generates an FFmpeg concatenation manifest and assembly recipe to render rough_cut.mp4 from all kept shots.',
    {
      film_id: z.string().optional(),
      sequence: z.string().optional(),
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

        const clips: Array<{ shot_id: string; file_path: string; duration_s: number }> = [];

        for (const f of files.sort()) {
          const s = await shotShow(paths, filmId, f.replace(/\.json$/, ''));
          if (a.sequence && s.sequence !== a.sequence) continue;
          const kept = s.takes?.find((t) => t.verdict === 'kept');
          const file = kept ? join(paths.rendersDir(filmId), kept.jobId, 'shot.mp4') : join(paths.rendersDir(filmId), `placeholder_${s.id}.mp4`);
          clips.push({ shot_id: s.id, file_path: file, duration_s: s.durationS });
        }

        const timelinesDir = join(paths.filmDir(filmId), 'timelines');
        await mkdir(timelinesDir, { recursive: true });

        // FFmpeg concat demuxer manifest
        const concatLines = clips.map((c) => `file '${c.file_path.replace(/\\/g, '/')}'`);
        const manifestPath = join(timelinesDir, 'concat_manifest.txt');
        await writeFile(manifestPath, concatLines.join('\n'), 'utf8');

        const roughCutPath = join(paths.rendersDir(filmId), 'rough_cut.mp4');
        const ffmpegCommand = `ffmpeg -f concat -safe 0 -i "${manifestPath.replace(/\\/g, '/')}" -c copy "${roughCutPath.replace(/\\/g, '/')}"`;

        return out({
          film_id: filmId,
          total_clips: clips.length,
          manifest_path: manifestPath,
          output_rough_cut: roughCutPath,
          ffmpeg_command: ffmpegCommand,
        });
      }),
  );
}
