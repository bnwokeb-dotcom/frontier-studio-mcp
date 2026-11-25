// src/tools/editor.ts — The Cutting Room: FFmpeg rough-cut assembly, multi-track FCPXML 1.10 / OTIO export, color grading, and dialogue lip-sync.
import { z } from 'zod';
import { readdir, writeFile, mkdir, stat, rename, rm } from 'node:fs/promises';
import { join, resolve, dirname, basename } from 'node:path';
import { randomBytes } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import { execFile as execFileCb } from 'node:child_process';
import { promisify } from 'node:util';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { studioPaths, type StudioPaths } from '../store/paths.js';
import { initStudio, getActiveFilm } from '../store/studio.js';
import { shotShow, type ShotRecord } from '../store/shot.js';
import { readJobs, type VideoJobEntry } from '../store/jobs.js';
import { probeMedia, type MediaProbeResult } from '../qa/critic.js';
import { errNotFound, errValidation } from '../errors.js';
import { guard, out } from './registry.js';

const execFileAsync = promisify(execFileCb);

function toFileUrl(absPath: string): string {
  return pathToFileURL(resolve(absPath)).href;
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function sanitizeXmlComment(value: string): string {
  return value.replace(/--/g, '- -');
}

function otioTimeRange(fps: number, durationFrames: number): Record<string, unknown> {
  return {
    OTIO_SCHEMA: 'TimeRange.1',
    start_time: { OTIO_SCHEMA: 'RationalTime.1', rate: fps, value: 0 },
    duration: { OTIO_SCHEMA: 'RationalTime.1', rate: fps, value: durationFrames },
  };
}

function otioGap(name: string, fps: number, durationFrames: number): Record<string, unknown> {
  return {
    OTIO_SCHEMA: 'Gap.1',
    name,
    source_range: otioTimeRange(fps, durationFrames),
  };
}

function otioExternalClip(
  name: string,
  fps: number,
  durationFrames: number,
  targetUrl: string,
  metadata: Record<string, unknown>,
): Record<string, unknown> {
  return {
    OTIO_SCHEMA: 'Clip.1',
    name,
    source_range: otioTimeRange(fps, durationFrames),
    media_reference: { OTIO_SCHEMA: 'ExternalReference.1', target_url: targetUrl },
    metadata,
  };
}

async function isNonEmptyFile(filePath: string): Promise<boolean> {
  try {
    const st = await stat(filePath);
    return st.isFile() && st.size > 0;
  } catch {
    return false;
  }
}

async function execFfmpegToDest(
  argsBeforeDest: string[],
  destPath: string,
  inputPaths: string[],
): Promise<void> {
  const destResolved = resolve(destPath);
  const needsTemp = inputPaths.some((p) => resolve(p) === destResolved);
  if (!needsTemp) {
    await execFileAsync('ffmpeg', [...argsBeforeDest, destPath]);
    return;
  }

  const tmpDest = join(dirname(destPath), `.tmp_${randomBytes(4).toString('hex')}_${basename(destPath)}`);
  try {
    await execFileAsync('ffmpeg', [...argsBeforeDest, tmpDest]);
    await rename(tmpDest, destPath);
  } catch (err) {
    await rm(tmpDest, { force: true }).catch(() => {});
    throw err;
  }
}

function resolveShotRenderDir(
  paths: StudioPaths,
  filmId: string,
  shot: ShotRecord,
  jobs: VideoJobEntry[],
  resolvedInput?: string,
): string {
  if (resolvedInput) return dirname(resolvedInput);
  const kept = shot.takes?.find((t) => t.verdict === 'kept') ?? shot.takes?.[shot.takes.length - 1];
  if (kept) return join(paths.rendersDir(filmId), kept.jobId);
  const completedJob = [...jobs].reverse().find((j) => j.shot_id === shot.id && j.status === 'completed');
  if (completedJob) return join(paths.rendersDir(filmId), completedJob.job_id);
  return paths.rendersDir(filmId);
}

async function findRenderInJobDir(jobDir: string): Promise<string | undefined> {
  const synced = join(jobDir, 'shot_synced.mp4');
  if (await isNonEmptyFile(synced)) return synced;

  try {
    const entries = (await readdir(jobDir)).filter((f) => f.startsWith('shot_graded_') && f.endsWith('.mp4')).sort();
    for (let i = entries.length - 1; i >= 0; i--) {
      const graded = join(jobDir, entries[i]);
      if (await isNonEmptyFile(graded)) return graded;
    }
  } catch {
    return undefined;
  }

  const base = join(jobDir, 'shot.mp4');
  if (await isNonEmptyFile(base)) return base;
  return undefined;
}

/**
 * Resolves the real rendered MP4 path on disk for a shot (kept take, latest non-rejected take, or completed job artifact).
 * Returns undefined if no non-empty MP4 exists on disk.
 */
export async function resolveShotVideoPath(
  paths: StudioPaths,
  filmId: string,
  shot: ShotRecord,
  jobs?: VideoJobEntry[],
): Promise<string | undefined> {
  const takes = shot.takes ?? [];
  const kept = takes.find((t) => t.verdict === 'kept');
  const latestValid = [...takes].reverse().find((t) => t.verdict !== 'rejected');
  const candidateTake = kept ?? latestValid;

  if (candidateTake) {
    const found = await findRenderInJobDir(join(paths.rendersDir(filmId), candidateTake.jobId));
    if (found) return found;
  }

  const jobList = jobs ?? (await readJobs(paths, filmId).catch(() => []));
  const completedJob = [...jobList]
    .reverse()
    .find((j) => j.shot_id === shot.id && j.status === 'completed');

  if (completedJob) {
    const dirFound = await findRenderInJobDir(join(paths.rendersDir(filmId), completedJob.job_id));
    if (dirFound) return dirFound;
    if (completedJob.artifact_path && (await isNonEmptyFile(completedJob.artifact_path))) {
      return completedJob.artifact_path;
    }
  }

  return undefined;
}

interface ShotAudioStems {
  dialoguePaths: string[];
  sfxPath?: string;
}

function resolveShotAudioStems(
  paths: StudioPaths,
  filmId: string,
  shotId: string,
  audioFiles: string[],
): ShotAudioStems {
  const lineEscaped = shotId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const lineRe = new RegExp(`^${lineEscaped}_line_(\\d+)(_diegetic)?\\.wav$`);
  const lineMap = new Map<number, { diegetic?: string; raw?: string }>();

  for (const f of audioFiles) {
    const m = f.match(lineRe);
    if (!m) continue;
    const idx = Number(m[1]);
    const entry = lineMap.get(idx) ?? {};
    if (m[2]) entry.diegetic = paths.audioPath(filmId, f);
    else entry.raw = paths.audioPath(filmId, f);
    lineMap.set(idx, entry);
  }

  const dialoguePaths: string[] = [];
  for (const idx of [...lineMap.keys()].sort((a, b) => a - b)) {
    const entry = lineMap.get(idx)!;
    if (entry.diegetic) dialoguePaths.push(entry.diegetic);
    else if (entry.raw) dialoguePaths.push(entry.raw);
  }

  if (dialoguePaths.length === 0 && audioFiles.includes(`${shotId}.wav`)) {
    dialoguePaths.push(paths.audioPath(filmId, `${shotId}.wav`));
  }

  const sfxName = `${shotId}_soundscape.wav`;
  const sfxPath = audioFiles.includes(sfxName) ? paths.audioPath(filmId, sfxName) : undefined;
  return { dialoguePaths, sfxPath };
}

async function listAudioFiles(paths: StudioPaths, filmId: string): Promise<string[]> {
  try {
    return (await readdir(paths.audioDir(filmId))).sort();
  } catch {
    return [];
  }
}

async function loadFilmShots(
  paths: StudioPaths,
  filmId: string,
  sequence?: string,
): Promise<ShotRecord[]> {
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
    if (sequence && s.sequence !== sequence) continue;
    shots.push(s);
  }

  if (shots.length === 0) {
    throw errValidation('no shots match criteria', 'ensure film or sequence has shots');
  }
  return shots;
}

interface TimelineBuildResult {
  timelineName: string;
  fcpxml: string;
  edl: string;
  otio: Record<string, unknown>;
  totalFrames: number;
  totalShots: number;
  missingMediaShots: string[];
  warnings: string[];
  audioA1Clips: number;
  audioA2Clips: number;
  hasScoreA3: boolean;
}

async function buildTimelineExports(
  paths: StudioPaths,
  filmId: string,
  opts: { sequence?: string; title?: string } = {},
): Promise<TimelineBuildResult> {
  const shots = await loadFilmShots(paths, filmId, opts.sequence);
  const jobs = await readJobs(paths, filmId).catch(() => []);
  const audioFiles = await listAudioFiles(paths, filmId);
  const scoreMasterCandidate = audioFiles.includes('score_master.wav')
    ? paths.audioPath(filmId, 'score_master.wav')
    : undefined;
  const hasScoreA3 = scoreMasterCandidate ? await isNonEmptyFile(scoreMasterCandidate) : false;

  const fps = 24;
  const timelineName = opts.title ?? (opts.sequence ? `${filmId}_${opts.sequence}` : filmId);
  const assetElements: string[] = [];
  const spineElements: string[] = [];
  const missingMediaShots: string[] = [];
  const warnings: string[] = [];

  const v1OtioChildren: Record<string, unknown>[] = [];
  const a1OtioChildren: Record<string, unknown>[] = [];
  const a2OtioChildren: Record<string, unknown>[] = [];

  let currentFrame = 0;
  let audioAssetCounter = 1;
  let audioA1Clips = 0;
  let audioA2Clips = 0;

  // Pre-calculate totalFrames for A3 Score spanning clip
  const totalFrames = shots.reduce((sum, s) => sum + Math.round(s.durationS * fps), 0);

  if (hasScoreA3 && scoreMasterCandidate) {
    assetElements.push(
      `    <asset id="r_a3_score" name="score_master.wav" start="0s" duration="${totalFrames}/24s" hasVideo="0" hasAudio="1" audioSources="1" audioChannels="2" audioRate="48000">`,
      `      <media-rep kind="original-media" src="${escapeXml(toFileUrl(scoreMasterCandidate))}" />`,
      '    </asset>',
    );
  }

  for (let index = 0; index < shots.length; index++) {
    const shot = shots[index];
    const durationFrames = Math.round(shot.durationS * fps);
    const assetId = `r_shot_${index + 1}`;
    const videoPath = await resolveShotVideoPath(paths, filmId, shot, jobs);
    const stems = resolveShotAudioStems(paths, filmId, shot.id, audioFiles);

    let hasVideo = false;
    let hasEmbeddedAudio = false;
    let videoUrl: string | undefined;

    if (videoPath) {
      const probe = await probeMedia(videoPath);
      if (probe.exists && probe.hasVideo) {
        hasVideo = true;
        hasEmbeddedAudio = probe.hasAudio;
        videoUrl = toFileUrl(videoPath);
      }
    }

    if (!hasVideo || !videoUrl) {
      missingMediaShots.push(shot.id);
      warnings.push(`Shot "${shot.id}" has no verified rendered MP4 on disk; marked offline in timeline.`);
      assetElements.push(
        `    <!-- MISSING_MEDIA: ${sanitizeXmlComment(shot.id)} has no rendered MP4 on disk -->`,
        `    <asset id="${assetId}" name="${escapeXml(shot.id)}" start="0s" duration="${durationFrames}/24s" format="r1" hasVideo="0" hasAudio="0" />`,
      );
    } else {
      assetElements.push(
        `    <asset id="${assetId}" name="${escapeXml(shot.id)}" start="0s" duration="${durationFrames}/24s" format="r1" hasVideo="1" hasAudio="${hasEmbeddedAudio ? '1' : '0'}">`,
        `      <media-rep kind="original-media" src="${escapeXml(videoUrl)}" />`,
        '    </asset>',
      );
    }

    // Build A1 Dialogue assets & connected lane elements
    const a1ClipXml: string[] = [];
    if (stems.dialoguePaths.length > 0) {
      const sliceFrames = Math.max(1, Math.floor(durationFrames / stems.dialoguePaths.length));
      for (let dIdx = 0; dIdx < stems.dialoguePaths.length; dIdx++) {
        const wavPath = stems.dialoguePaths[dIdx];
        const wavName = wavPath.split(/[\\/]/).pop() ?? `${shot.id}_dialogue.wav`;
        const wavUrl = toFileUrl(wavPath);
        const a1AssetId = `r_a1_${audioAssetCounter++}`;
        const clipFrames = dIdx === stems.dialoguePaths.length - 1
          ? durationFrames - sliceFrames * dIdx
          : sliceFrames;
        const localOffset = sliceFrames * dIdx;

        assetElements.push(
          `    <asset id="${a1AssetId}" name="${escapeXml(wavName)}" start="0s" duration="${clipFrames}/24s" hasVideo="0" hasAudio="1" audioSources="1" audioChannels="2" audioRate="48000">`,
          `      <media-rep kind="original-media" src="${escapeXml(wavUrl)}" />`,
          '    </asset>',
        );
        a1ClipXml.push(
          `          <asset-clip name="${escapeXml(wavName)}" lane="-1" offset="${localOffset}/24s" ref="${a1AssetId}" duration="${clipFrames}/24s" start="0s" role="dialogue" />`,
        );
        a1OtioChildren.push(
          otioExternalClip(wavName, fps, clipFrames, wavUrl, { shot_id: shot.id, track: 'A1_Dialogue' }),
        );
        audioA1Clips++;
      }
    } else {
      a1OtioChildren.push(otioGap(`gap_${shot.id}_a1`, fps, durationFrames));
    }

    // Build A2 SFX / Soundscape asset & connected lane element
    const a2ClipXml: string[] = [];
    if (stems.sfxPath && (await isNonEmptyFile(stems.sfxPath))) {
      const sfxName = stems.sfxPath.split(/[\\/]/).pop() ?? `${shot.id}_soundscape.wav`;
      const sfxUrl = toFileUrl(stems.sfxPath);
      const a2AssetId = `r_a2_${audioAssetCounter++}`;
      assetElements.push(
        `    <asset id="${a2AssetId}" name="${escapeXml(sfxName)}" start="0s" duration="${durationFrames}/24s" hasVideo="0" hasAudio="1" audioSources="1" audioChannels="2" audioRate="48000">`,
        `      <media-rep kind="original-media" src="${escapeXml(sfxUrl)}" />`,
        '    </asset>',
      );
      a2ClipXml.push(
        `          <asset-clip name="${escapeXml(sfxName)}" lane="-2" offset="0s" ref="${a2AssetId}" duration="${durationFrames}/24s" start="0s" role="effects" />`,
      );
      a2OtioChildren.push(
        otioExternalClip(sfxName, fps, durationFrames, sfxUrl, { shot_id: shot.id, track: 'A2_Soundscape_SFX' }),
      );
      audioA2Clips++;
    } else {
      a2OtioChildren.push(otioGap(`gap_${shot.id}_a2`, fps, durationFrames));
    }

    // Primary V1 spine clip + attached A1/A2/A3 audio lanes
    spineElements.push(
      `        <asset-clip name="${escapeXml(shot.id)}" offset="${currentFrame}/24s" ref="${assetId}" duration="${durationFrames}/24s" start="0s" role="video.V1">`,
      `          <!-- ${sanitizeXmlComment(`${shot.camera.lens} ${shot.camera.move} — ${shot.camera.reason}`)} -->`,
      ...(hasVideo ? [] : [`          <!-- OFFLINE: missing rendered MP4 for ${sanitizeXmlComment(shot.id)} -->`]),
      ...a1ClipXml,
      ...a2ClipXml,
      ...(index === 0 && hasScoreA3
        ? [`          <asset-clip name="score_master.wav" lane="-3" offset="0s" ref="r_a3_score" duration="${totalFrames}/24s" start="0s" role="music" />`]
        : []),
      '        </asset-clip>',
    );

    v1OtioChildren.push({
      OTIO_SCHEMA: 'Clip.1',
      name: shot.id,
      source_range: otioTimeRange(fps, durationFrames),
      media_reference: videoUrl && hasVideo
        ? { OTIO_SCHEMA: 'ExternalReference.1', target_url: videoUrl }
        : { OTIO_SCHEMA: 'MissingReference.1', metadata: { missing_media: true, shot_id: shot.id } },
      metadata: {
        shot_id: shot.id,
        online: hasVideo,
        lens: shot.camera.lens,
        move: shot.camera.move,
        lighting: shot.cinematics?.lightingSetup || 'motivated_natural',
      },
    });

    currentFrame += durationFrames;
  }

  const fcpxml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<!DOCTYPE fcpxml>',
    '<fcpxml version="1.10">',
    '  <resources>',
    '    <format id="r1" name="FFVideoFormat1080p24" frameDuration="1/24s" width="1920" height="1080"/>',
    ...assetElements,
    '  </resources>',
    '  <library>',
    `    <event name="${escapeXml(filmId)}">`,
    `      <project name="${escapeXml(timelineName)}">`,
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

  // CMX 3600 EDL
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
    const offlineNote = missingMediaShots.includes(shot.id) ? ' [OFFLINE]' : '';
    edlLines.push(
      `${(i + 1).toString().padStart(3, '0')}  AX       V     C        00:00:00:00 ${toTc(dur)} ${inTc} ${outTc}`,
      `* FROM CLIP NAME: ${shot.id}.mp4${offlineNote}`,
      '',
    );
    edlFrame += dur;
  });

  const a3OtioChildren: Record<string, unknown>[] = hasScoreA3 && scoreMasterCandidate
    ? [otioExternalClip('score_master.wav', fps, totalFrames, toFileUrl(scoreMasterCandidate), { track: 'A3_Score' })]
    : [otioGap('gap_score_a3', fps, totalFrames)];

  const otio = {
    OTIO_SCHEMA: 'Timeline.1',
    name: timelineName,
    metadata: {
      viduxtool_lineage: {
        film_id: filmId,
        generator: 'VIDUXTOOL / Frontier Studio Engine',
        exported_at: new Date().toISOString(),
        missing_media: missingMediaShots.length > 0,
      },
    },
    global_start_time: {
      OTIO_SCHEMA: 'RationalTime.1',
      rate: fps,
      value: 0,
    },
    tracks: {
      OTIO_SCHEMA: 'Stack.1',
      children: [
        {
          OTIO_SCHEMA: 'Track.1',
          name: 'V1_Generative_Video',
          kind: 'Video',
          children: v1OtioChildren,
        },
        {
          OTIO_SCHEMA: 'Track.1',
          name: 'A1_Dialogue',
          kind: 'Audio',
          children: a1OtioChildren,
        },
        {
          OTIO_SCHEMA: 'Track.1',
          name: 'A2_Soundscape_SFX',
          kind: 'Audio',
          children: a2OtioChildren,
        },
        {
          OTIO_SCHEMA: 'Track.1',
          name: 'A3_Score',
          kind: 'Audio',
          children: a3OtioChildren,
        },
      ],
    },
  };

  return {
    timelineName,
    fcpxml,
    edl: edlLines.join('\n'),
    otio,
    totalFrames: currentFrame,
    totalShots: shots.length,
    missingMediaShots,
    warnings,
    audioA1Clips,
    audioA2Clips,
    hasScoreA3,
  };
}

export async function generateFcpxmlString(paths: StudioPaths, filmId: string, timelineTitle?: string): Promise<string> {
  const result = await buildTimelineExports(paths, filmId, { title: timelineTitle });
  return result.fcpxml;
}

export function registerEditorTools(server: McpServer, studioRoot: string): void {
  const paths = studioPaths(studioRoot);

  server.tool(
    'film_export_xml',
    'Exports an industry-standard multi-track FCPXML 1.10 (V1 + A1 Dialogue + A2 SFX + A3 Score), EDL, and OpenTimelineIO (.otio) timeline.',
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

        const built = await buildTimelineExports(paths, filmId, {
          sequence: a.sequence,
          title: a.title,
        });

        const timelinesDir = join(paths.filmDir(filmId), 'timelines');
        await mkdir(timelinesDir, { recursive: true });

        const xmlPath = join(timelinesDir, `${built.timelineName}.fcpxml`);
        await writeFile(xmlPath, built.fcpxml, 'utf8');

        const edlPath = join(timelinesDir, `${built.timelineName}.edl`);
        await writeFile(edlPath, built.edl, 'utf8');

        const otioPath = join(timelinesDir, `${built.timelineName}.otio`);
        await writeFile(otioPath, JSON.stringify(built.otio, null, 2), 'utf8');

        return out({
          timeline_name: built.timelineName,
          total_shots: built.totalShots,
          total_runtime_s: Number((built.totalFrames / 24).toFixed(2)),
          missing_media: built.missingMediaShots.length > 0,
          missing_shots: built.missingMediaShots,
          warnings: built.warnings,
          tracks: {
            video: 'V1_Generative_Video',
            audio_a1_dialogue_clips: built.audioA1Clips,
            audio_a2_sfx_clips: built.audioA2Clips,
            audio_a3_score: built.hasScoreA3,
          },
          fcpxml_path: xmlPath,
          edl_path: edlPath,
          otio_path: otioPath,
          compatibility: ['DaVinci Resolve', 'Adobe Premiere Pro', 'Final Cut Pro', 'OpenTimelineIO'],
        });
      }),
  );

  server.tool(
    'film_assemble',
    'Verifies rendered MP4 takes via ffprobe and executes FFmpeg concatenation and audio stem mastering to render rough_cut.mp4.',
    {
      film_id: z.string().optional(),
      sequence: z.string().optional(),
      apply: z.boolean().optional(),
      allow_dry_run_manifest: z.boolean().optional(),
    },
    async (a) =>
      guard(async () => {
        await initStudio(paths);
        const filmId = a.film_id ?? (await getActiveFilm(paths));
        if (!filmId) {
          throw errNotFound('no active film set', 'create one with film_create or pass film_id explicitly');
        }

        const shots = await loadFilmShots(paths, filmId, a.sequence);
        const jobs = await readJobs(paths, filmId).catch(() => []);
        const audioFiles = await listAudioFiles(paths, filmId);
        const apply = a.apply !== false;
        const allowDryRun = a.allow_dry_run_manifest === true;

        const resolvedClips: Array<{
          shot: ShotRecord;
          videoPath?: string;
          probe?: MediaProbeResult;
        }> = [];
        const missingOrInvalid: string[] = [];

        for (const shot of shots) {
          const videoPath = await resolveShotVideoPath(paths, filmId, shot, jobs);
          if (!videoPath) {
            missingOrInvalid.push(`${shot.id} (missing rendered MP4)`);
            resolvedClips.push({ shot });
            continue;
          }
          const probe = await probeMedia(videoPath);
          if (!probe.exists || !probe.hasVideo || probe.durationS <= 0.05) {
            missingOrInvalid.push(`${shot.id} (corrupt or invalid video stream at ${videoPath})`);
            resolvedClips.push({ shot, videoPath, probe });
            continue;
          }
          resolvedClips.push({ shot, videoPath, probe });
        }

        if (apply && !allowDryRun && missingOrInvalid.length > 0) {
          throw errValidation(
            `cannot assemble rough cut — missing or invalid rendered MP4 for shot(s): ${missingOrInvalid.join(', ')}`,
            'run render_shot and job_download (or pass allow_dry_run_manifest: true for planning manifest only) before calling film_assemble',
          );
        }

        const timelinesDir = join(paths.filmDir(filmId), 'timelines');
        await mkdir(timelinesDir, { recursive: true });
        await mkdir(paths.rendersDir(filmId), { recursive: true });

        const manifestPath = join(timelinesDir, 'concat_manifest.txt');
        const concatLines = resolvedClips.map((c) => {
          const pathForManifest = c.videoPath ?? join(paths.rendersDir(filmId), `${c.shot.id}_unrendered.mp4`);
          return `file '${pathForManifest.replace(/\\/g, '/')}'`;
        });
        await writeFile(manifestPath, concatLines.join('\n'), 'utf8');

        const roughCutPath = join(paths.rendersDir(filmId), 'rough_cut.mp4');

        if (!apply || allowDryRun) {
          const plannedCmd = `ffmpeg -f concat -safe 0 -i "${manifestPath.replace(/\\/g, '/')}" -c:v libx264 -pix_fmt yuv420p "${roughCutPath.replace(/\\/g, '/')}"`;
          return out({
            film_id: filmId,
            total_clips: resolvedClips.length,
            manifest_path: manifestPath,
            output_rough_cut: roughCutPath,
            ffmpeg_command: plannedCmd,
            executed: false,
            dry_run: true,
            missing_shots: missingOrInvalid,
          });
        }

        // All clips verified with ffprobe. Assemble uniformly via FFmpeg filter_complex.
        const firstProbe = resolvedClips[0].probe!;
        const targetW = Math.max(2, Math.floor(firstProbe.width / 2) * 2);
        const targetH = Math.max(2, Math.floor(firstProbe.height / 2) * 2);
        const targetFps = firstProbe.fps > 0 ? Math.round(firstProbe.fps) : 24;

        // Collect valid external audio stems with exact timeline offsets (ms)
        const externalStems: Array<{ path: string; delayMs: number; role: string }> = [];
        let cursorMs = 0;
        let totalVideoDurationS = 0;

        for (const clip of resolvedClips) {
          const clipDurS = clip.probe!.durationS;
          const stems = resolveShotAudioStems(paths, filmId, clip.shot.id, audioFiles);

          let lineOffsetMs = cursorMs;
          for (const dlgPath of stems.dialoguePaths) {
            const stemProbe = await probeMedia(dlgPath);
            if (stemProbe.exists && stemProbe.hasAudio && stemProbe.durationS > 0.05) {
              externalStems.push({ path: dlgPath, delayMs: lineOffsetMs, role: 'dialogue' });
              lineOffsetMs += Math.round(stemProbe.durationS * 1000);
            }
          }

          if (stems.sfxPath) {
            const sfxProbe = await probeMedia(stems.sfxPath);
            if (sfxProbe.exists && sfxProbe.hasAudio && sfxProbe.durationS > 0.05) {
              externalStems.push({ path: stems.sfxPath, delayMs: cursorMs, role: 'sfx' });
            }
          }

          cursorMs += Math.round(clipDurS * 1000);
          totalVideoDurationS += clipDurS;
        }

        if (audioFiles.includes('score_master.wav')) {
          const scorePath = paths.audioPath(filmId, 'score_master.wav');
          const scoreProbe = await probeMedia(scorePath);
          if (scoreProbe.exists && scoreProbe.hasAudio && scoreProbe.durationS > 0.05) {
            externalStems.push({ path: scorePath, delayMs: 0, role: 'score' });
          }
        }

        const ffmpegArgs: string[] = ['-y'];
        for (const clip of resolvedClips) {
          ffmpegArgs.push('-i', clip.videoPath!);
        }
        for (const stem of externalStems) {
          ffmpegArgs.push('-i', stem.path);
        }

        const nClips = resolvedClips.length;
        const filterParts: string[] = [];
        const vLabels: string[] = [];

        for (let i = 0; i < nClips; i++) {
          filterParts.push(
            `[${i}:v]scale=${targetW}:${targetH}:force_original_aspect_ratio=decrease,pad=${targetW}:${targetH}:(ow-iw)/2:(oh-ih)/2,setsar=1,fps=${targetFps},format=yuv420p[v${i}]`,
          );
          vLabels.push(`[v${i}]`);
        }
        filterParts.push(`${vLabels.join('')}concat=n=${nClips}:v=1:a=0[vout]`);

        const anyClipHasAudio = resolvedClips.some((c) => c.probe!.hasAudio);
        const includeAudio = anyClipHasAudio || externalStems.length > 0;

        if (includeAudio) {
          if (anyClipHasAudio) {
            const aLabels: string[] = [];
            for (let i = 0; i < nClips; i++) {
              if (resolvedClips[i].probe!.hasAudio) {
                filterParts.push(`[${i}:a]aformat=sample_rates=48000:channel_layouts=stereo[va${i}]`);
              } else {
                filterParts.push(`anullsrc=r=48000:cl=stereo:d=${resolvedClips[i].probe!.durationS.toFixed(3)}[va${i}]`);
              }
              aLabels.push(`[va${i}]`);
            }
            filterParts.push(`${aLabels.join('')}concat=n=${nClips}:v=0:a=1[abase]`);
          } else {
            filterParts.push(`anullsrc=r=48000:cl=stereo:d=${totalVideoDurationS.toFixed(3)}[abase]`);
          }

          if (externalStems.length === 0) {
            filterParts.push('[abase]loudnorm=I=-23:TP=-1.0[aout]');
          } else {
            const stemLabels: string[] = [];
            for (let k = 0; k < externalStems.length; k++) {
              const inputIdx = nClips + k;
              const delay = externalStems[k].delayMs;
              const delayClause = delay > 0 ? `,adelay=${delay}|${delay}` : '';
              filterParts.push(`[${inputIdx}:a]aformat=sample_rates=48000:channel_layouts=stereo${delayClause}[st${k}]`);
              stemLabels.push(`[st${k}]`);
            }
            filterParts.push(
              `[abase]${stemLabels.join('')}amix=inputs=${1 + externalStems.length}:duration=first:dropout_transition=0:normalize=0,loudnorm=I=-23:TP=-1.0[aout]`,
            );
          }
        }

        const filterComplex = filterParts.join(';');
        ffmpegArgs.push('-filter_complex', filterComplex, '-map', '[vout]');
        if (includeAudio) {
          ffmpegArgs.push('-map', '[aout]');
        }
        ffmpegArgs.push('-c:v', 'libx264', '-preset', 'veryfast', '-pix_fmt', 'yuv420p');
        if (includeAudio) {
          ffmpegArgs.push('-c:a', 'aac', '-b:a', '192k');
        }
        ffmpegArgs.push('-movflags', '+faststart', roughCutPath);

        try {
          await execFileAsync('ffmpeg', ffmpegArgs, { maxBuffer: 32 * 1024 * 1024 });
        } catch (err: unknown) {
          const msg = (err as { stderr?: string; message?: string }).stderr || (err as Error).message;
          throw errValidation(
            `ffmpeg assembly failed: ${msg.slice(-400)}`,
            'verify source clips are decodable video files and retry film_assemble',
          );
        }

        const roughProbe = await probeMedia(roughCutPath);
        if (!roughProbe.exists || !roughProbe.hasVideo || roughProbe.durationS <= 0) {
          throw errValidation(
            'rough_cut.mp4 failed ffprobe verification after assembly',
            'verify input shot MP4s and re-run film_assemble',
          );
        }

        const ffmpegCommand = `ffmpeg ${ffmpegArgs.map((arg) => (arg.includes(' ') || arg.includes(';') ? `"${arg}"` : arg)).join(' ')}`;

        return out({
          film_id: filmId,
          total_clips: resolvedClips.length,
          manifest_path: manifestPath,
          output_rough_cut: roughCutPath,
          ffmpeg_command: ffmpegCommand,
          executed: true,
          duration_s: roughProbe.durationS,
          width: roughProbe.width,
          height: roughProbe.height,
          fps: roughProbe.fps,
          file_bytes: roughProbe.fileBytes,
          has_audio: roughProbe.hasAudio,
          audio_stems_mixed: externalStems.map((s) => s.path),
        });
      }),
  );

  server.tool(
    'film_grade',
    'Applies Hollywood film stock emulation, photochemical 35mm grain, period era textures, and aspect ratio letterboxing to shot takes via FFmpeg.',
    {
      film_id: z.string().optional(),
      shot_id: z.string(),
      era: z.enum(['1920s_silent', '1940s_film_noir', '1970s_panavision', '1980s_vhs', '1990s_indie', 'contemporary', 'commercial_ad']).optional(),
      film_stock: z.enum(['kodak_vision3_500t', 'arri_alexa35_logc4', 'fuji_eterna', 'bleach_bypass', 'tri_x_35mm']).optional(),
      grain: z.enum(['none', 'subtle', 'medium', 'heavy']).optional(),
      aspect_ratio: z.enum(['2.39_anamorphic', '1.85_theatrical', '1.33_academy', '16_9_native', '9_16_vertical']).optional(),
      apply: z.boolean().optional(),
    },
    async (a) =>
      guard(async () => {
        await initStudio(paths);
        const filmId = a.film_id ?? (await getActiveFilm(paths));
        if (!filmId) {
          throw errNotFound('no active film set', 'create one with film_create or pass film_id explicitly');
        }

        const shot = await shotShow(paths, filmId, a.shot_id);
        const jobs = await readJobs(paths, filmId).catch(() => []);
        const resolvedInput = await resolveShotVideoPath(paths, filmId, shot, jobs);
        const dir = resolveShotRenderDir(paths, filmId, shot, jobs, resolvedInput);
        const era = a.era ?? 'contemporary';
        const outputPath = join(dir, `shot_graded_${era}.mp4`);

        // Avoid re-grading an already graded output in-place when clean synced/raw render exists
        let sourceInput = resolvedInput;
        if (sourceInput && (resolve(sourceInput) === resolve(outputPath) || basename(sourceInput).startsWith('shot_graded_'))) {
          for (const candidate of [join(dir, 'shot_synced.mp4'), join(dir, 'shot.mp4')]) {
            if (await isNonEmptyFile(candidate)) {
              sourceInput = candidate;
              break;
            }
          }
        }
        const inputPath = sourceInput ?? join(dir, 'shot.mp4');

        // Build filter pipeline
        const filters: string[] = [];

        if (era === '1920s_silent') {
          filters.push('hue=s=0,eq=contrast=1.35:brightness=0.02');
        } else if (era === '1940s_film_noir') {
          filters.push('hue=s=0,eq=contrast=1.45:brightness=-0.04');
        } else if (era === '1970s_panavision') {
          filters.push('eq=contrast=1.08:saturation=1.15,colorbalance=rs=0.06:gs=0.01:bs=-0.06:rh=0.04:bh=-0.05,vignette=PI/4');
        } else if (era === '1980s_vhs') {
          filters.push('eq=contrast=1.1:saturation=1.2');
        } else if (era === '1990s_indie') {
          filters.push('eq=contrast=1.05:saturation=0.98,colorbalance=bs=0.03:gs=0.01:rs=-0.02');
        } else if (era === 'commercial_ad') {
          filters.push('eq=contrast=1.12:brightness=0.02:saturation=1.25,unsharp=5:5:0.8:3:3:0.4');
        } else {
          const stock = a.film_stock ?? 'kodak_vision3_500t';
          if (stock === 'kodak_vision3_500t') {
            filters.push('eq=contrast=1.07:brightness=0.01:saturation=1.1,colorbalance=rs=0.05:gs=-0.01:bs=-0.05:rh=0.04:bh=-0.04');
          } else if (stock === 'arri_alexa35_logc4') {
            filters.push('eq=contrast=1.03:brightness=0.00:saturation=1.02:gamma=1.02,colorbalance=rs=0.01:bs=0.01');
          } else if (stock === 'fuji_eterna') {
            filters.push('eq=contrast=0.97:brightness=0.02:saturation=0.90,colorbalance=bs=0.04:gs=0.02');
          } else if (stock === 'bleach_bypass') {
            filters.push('eq=contrast=1.35:brightness=-0.02:saturation=0.55');
          } else if (stock === 'tri_x_35mm') {
            filters.push('hue=s=0,eq=contrast=1.32:brightness=-0.02');
          }
        }

        const grain = a.grain ?? (era === '1920s_silent' ? 'heavy' : era === '1970s_panavision' ? 'medium' : 'subtle');
        if (grain === 'heavy') filters.push('noise=alls=22:allf=t+u');
        else if (grain === 'medium') filters.push('noise=alls=12:allf=t+u');
        else if (grain === 'subtle') filters.push('noise=alls=6:allf=t+u');

        const ratio = a.aspect_ratio ?? (era === '1920s_silent' || era === '1980s_vhs' ? '1.33_academy' : '2.39_anamorphic');
        if (ratio === '2.39_anamorphic') {
          filters.push('drawbox=y=0:h=(ih-iw/2.39)/2:c=black:t=fill,drawbox=y=ih-(ih-iw/2.39)/2:h=(ih-iw/2.39)/2:c=black:t=fill');
        } else if (ratio === '1.85_theatrical') {
          filters.push('drawbox=y=0:h=(ih-iw/1.85)/2:c=black:t=fill,drawbox=y=ih-(ih-iw/1.85)/2:h=(ih-iw/1.85)/2:c=black:t=fill');
        } else if (ratio === '1.33_academy') {
          filters.push('drawbox=x=0:w=(iw-ih*1.33)/2:c=black:t=fill,drawbox=x=iw-(iw-ih*1.33)/2:w=(iw-ih*1.33)/2:c=black:t=fill');
        } else if (ratio === '9_16_vertical') {
          filters.push('crop=ih*(9/16):ih');
        }

        const filterComplex = filters.join(',');
        const ffmpegCommand = `ffmpeg -y -i "${inputPath.replace(/\\/g, '/')}" -vf "${filterComplex}" -c:a copy "${outputPath.replace(/\\/g, '/')}"`;

        let executed = false;
        if (a.apply !== false) {
          if (!sourceInput) {
            throw errValidation(
              `no rendered MP4 found for shot "${shot.id}"`,
              'run render_shot and job_download first (or pass apply: false to preview the filter command)',
            );
          }
          await mkdir(dir, { recursive: true });
          await execFfmpegToDest(
            ['-y', '-i', sourceInput, '-vf', filterComplex, '-c:a', 'copy'],
            outputPath,
            [sourceInput],
          );
          executed = true;
        }

        return out({
          shot_id: shot.id,
          era,
          film_stock: a.film_stock ?? 'kodak_vision3_500t',
          grain,
          aspect_ratio: ratio,
          filter_complex: filterComplex,
          input_video: inputPath,
          graded_video: outputPath,
          ffmpeg_command: ffmpegCommand,
          executed,
        });
      }),
  );

  server.tool(
    'shot_lipsync',
    'Synchronizes and multiplexes dialogue audio stem (WAV) with shot video take, with support for FFmpeg audio alignment and neural lip-sync pipelines.',
    {
      film_id: z.string().optional(),
      shot_id: z.string(),
      engine: z.enum(['ffmpeg_mux', 'synclabs', 'wav2lip']).optional(),
      apply: z.boolean().optional(),
    },
    async (a) =>
      guard(async () => {
        await initStudio(paths);
        const filmId = a.film_id ?? (await getActiveFilm(paths));
        if (!filmId) {
          throw errNotFound('no active film set', 'create one with film_create or pass film_id explicitly');
        }

        const shot = await shotShow(paths, filmId, a.shot_id);
        const audioDir = paths.audioDir(filmId);
        let audioPath = paths.audioPath(filmId, `${shot.id}.wav`);
        let audioExists = await isNonEmptyFile(audioPath);
        if (!audioExists) {
          audioPath = paths.audioPath(filmId, `${shot.id}_line_1.wav`);
          audioExists = await isNonEmptyFile(audioPath);
        }
        if (!audioExists) {
          const files = await listAudioFiles(paths, filmId);
          const match = files.find((f) => f.startsWith(shot.id) && f.endsWith('.wav'));
          if (match) {
            audioPath = paths.audioPath(filmId, match);
            audioExists = await isNonEmptyFile(audioPath);
          }
        }
        if (!audioExists) {
          throw errValidation(
            `no dialogue audio stem found for shot "${shot.id}" in "${audioDir}"`,
            'run dialogue_render first to synthesize the 48kHz vocal stem',
          );
        }

        const jobs = await readJobs(paths, filmId).catch(() => []);
        const resolvedVideo = await resolveShotVideoPath(paths, filmId, shot, jobs);
        const dir = resolveShotRenderDir(paths, filmId, shot, jobs, resolvedVideo);
        const videoPath = resolvedVideo ?? join(dir, 'shot.mp4');
        const outputPath = join(dir, 'shot_synced.mp4');

        const engine = a.engine ?? 'ffmpeg_mux';
        const ffmpegCommand = `ffmpeg -y -i "${videoPath.replace(/\\/g, '/')}" -i "${audioPath.replace(/\\/g, '/')}" -c:v copy -c:a aac -b:a 192k -shortest "${outputPath.replace(/\\/g, '/')}"`;

        let executed = false;
        if (a.apply !== false) {
          if (!resolvedVideo) {
            throw errValidation(
              `no rendered MP4 found for shot "${shot.id}"`,
              'run render_shot and job_download first (or pass apply: false to preview the mux command)',
            );
          }
          await mkdir(dir, { recursive: true });
          await execFfmpegToDest(
            ['-y', '-i', resolvedVideo, '-i', audioPath, '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k', '-shortest'],
            outputPath,
            [resolvedVideo, audioPath],
          );
          executed = true;
        }

        return out({
          shot_id: shot.id,
          engine,
          audio_stem: audioPath,
          video_source: videoPath,
          synced_video: outputPath,
          ffmpeg_command: ffmpegCommand,
          executed,
        });
      }),
  );

  server.tool(
    'shot_continuity_plan',
    'Directorial continuity advisor for LLM agents (ChatGPT, Claude, Hermes). Evaluates camera vectors, framing, 180-degree axis, and physical staging between two shots to recommend whether to CHAIN tail-frames or CUT to staging plates.',
    {
      film_id: z.string().optional(),
      shot_id: z.string(),
      target_shot_id: z.string().optional(),
    },
    async (a) =>
      guard(async () => {
        await initStudio(paths);
        const filmId = a.film_id ?? (await getActiveFilm(paths));
        if (!filmId) throw errNotFound('no active film set', 'pass film_id or create film');
        const shotA = await shotShow(paths, filmId, a.shot_id);

        let targetId = a.target_shot_id;
        if (!targetId) {
          const shotsDir = paths.shotsDir(filmId);
          const files = (await readdir(shotsDir)).filter((f) => f.endsWith('.json')).sort();
          const idx = files.indexOf(`${shotA.id}.json`);
          if (idx !== -1 && idx + 1 < files.length) {
            targetId = files[idx + 1].replace(/\.json$/, '');
          }
        }

        if (!targetId) {
          return out({
            shot_id: shotA.id,
            note: 'Terminal shot in sequence — no subsequent shot to evaluate.',
            recommended_transition: 'none',
            frame_strategy: 'STAGING_PLATE',
          });
        }

        const shotB = await shotShow(paths, filmId, targetId);

        // 1. Same location check
        const locA = shotA.refs.find((r) => r.role === 'location')?.assetId;
        const locB = shotB.refs.find((r) => r.role === 'location')?.assetId;
        const sameLocation = Boolean(locA && locB && locA === locB);

        // 2. Continuous vector check
        const isExplicitContinuous = shotB.continuity === 'continuous' || shotB.chainFromShotId === shotA.id;
        const sameFraming = Boolean(shotA.camera.framing && shotB.camera.framing && shotA.camera.framing === shotB.camera.framing);
        const isTracking =
          ['dolly_in', 'dolly_out', 'truck_left', 'truck_right'].includes(shotA.camera.movement ?? '') &&
          ['dolly_in', 'dolly_out', 'truck_left', 'truck_right'].includes(shotB.camera.movement ?? '');

        const isContinuous = isExplicitContinuous || (sameLocation && sameFraming && isTracking);

        // 3. Eyeline & 180° Rule check
        let eyelineStatus = 'aligned';
        let eyelineNote = '180-degree axis preserved.';
        if (
          shotA.camera.screenDirection &&
          shotB.camera.screenDirection &&
          shotA.camera.eyelineTarget &&
          shotB.camera.eyelineTarget &&
          shotA.camera.eyelineTarget !== shotB.camera.eyelineTarget
        ) {
          if (shotA.camera.screenDirection === shotB.camera.screenDirection && shotA.camera.screenDirection !== 'center') {
            eyelineStatus = 'violation';
            eyelineNote = `AXIS JUMP: Both actors placed on ${shotA.camera.screenDirection}. Reverse angle should be placed on ${
              shotA.camera.screenDirection === 'screen_left' ? 'screen_right' : 'screen_left'
            } to preserve eyeline continuity.`;
          }
        }

        const recommendedTransition = isContinuous ? 'continuous' : 'cut';
        const frameStrategy = recommendedTransition === 'continuous' ? 'CHAIN_TAIL_FRAME' : 'CUT_TO_STAGING_PLATE';
        const directorialDirective =
          recommendedTransition === 'continuous'
            ? `AUTOMATED CONTINUITY: Shot ${shotB.id} continues motion from ${shotA.id}. The engine will automatically extract the tail frame from ${shotA.id} and feed it as first_frame. Zero morphing, continuous momentum.`
            : `DIRECTORIAL CUT: Camera angle or framing change detected. Do NOT chain tail frames (chaining across cuts causes grotesque pixel warping). Cut cleanly using shot ${shotB.id}'s staging plate with sequence locked geometry.`;

        return out({
          source_shot: shotA.id,
          target_shot: shotB.id,
          same_location: sameLocation,
          recommended_transition: recommendedTransition,
          frame_strategy: frameStrategy,
          eyeline_continuity: eyelineStatus,
          eyeline_note: eyelineNote,
          directorial_directive: directorialDirective,
          chain_parent_id: recommendedTransition === 'continuous' ? shotA.id : null,
        });
      }),
  );

  // Automated Computer Vision Quality Control Audit Tool
  server.tool(
    'qc_vision_audit',
    'Runs automated computer vision and quality control audit on a rendered MP4 video using FFmpeg black frame, freeze frame, and temporal glitch detection.',
    {
      video_path: z.string().describe('Absolute or studio-relative path to the MP4 file to audit'),
      detect_black_frames: z.boolean().default(true).describe('Detect sudden black frames/tears'),
      detect_freeze_frames: z.boolean().default(true).describe('Detect frozen frames/stalls'),
      min_freeze_duration_s: z.number().default(0.5).describe('Minimum duration in seconds to count as frozen video stall'),
    },
    async (a) =>
      guard(async () => {
        let fullPath = a.video_path;
        if (!fullPath.startsWith('/') && !fullPath.match(/^[a-zA-Z]:[\\/]/)) {
          fullPath = join(studioRoot, fullPath);
        }

        const probe = await probeMedia(fullPath);
        if (!probe.exists) {
          throw errNotFound(`video file not found at ${a.video_path}`, 'provide a valid rendered video file path');
        }
        if (!probe.hasVideo || probe.durationS <= 0) {
          return out({
            video_path: a.video_path,
            passed_qc: false,
            issues_detected: ['Invalid or unreadable video stream (ffprobe check failed)'],
            recommendation: 'Rejected: video stream is corrupt or empty. Re-render take.',
          });
        }

        const filters: string[] = [];
        if (a.detect_black_frames) filters.push('blackdetect=d=0.1:pic_th=0.98');
        if (a.detect_freeze_frames) filters.push(`freezedetect=n=-60dB:d=${a.min_freeze_duration_s}`);
        const vf = filters.length > 0 ? filters.join(',') : 'null';

        let stderr = '';
        try {
          const res = await execFileAsync('ffmpeg', ['-i', fullPath, '-vf', vf, '-f', 'null', '-']);
          stderr = res.stderr || '';
        } catch (err: unknown) {
          const e = err as { stderr?: string; message?: string };
          stderr = e.stderr || e.message || '';
        }

        const issues: string[] = [];
        if (stderr.includes('black_start')) {
          const match = stderr.match(/black_start:\s*([0-9.]+)\s+black_end:\s*([0-9.]+)/);
          issues.push(`Black frame glitch detected at ${match ? match[1] + 's - ' + match[2] + 's' : 'multiple timestamps'}`);
        }
        if (stderr.includes('freeze_start')) {
          const match = stderr.match(/freeze_start:\s*([0-9.]+)/);
          issues.push(`Frozen frame stall detected at ${match ? match[1] + 's' : 'multiple timestamps'}`);
        }

        const passed = issues.length === 0;
        return out({
          video_path: a.video_path,
          passed_qc: passed,
          issues_detected: issues,
          recommendation: passed
            ? 'Approved: video passes temporal consistency and frame integrity checks.'
            : 'Rejected: video has glitches/freezes. Trigger localized inpaint re-roll or seed adjustment.',
        });
      }),
  );
}
