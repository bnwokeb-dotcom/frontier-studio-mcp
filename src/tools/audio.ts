// src/tools/audio.ts — M4 Audio Tools: dialogue synthesis/import, diegetic acoustic matching, soundscapes, and score mastering.
import { z } from 'zod';
import { mkdir, writeFile, stat, readFile, readdir, rename, rm } from 'node:fs/promises';
import { join, isAbsolute, extname, dirname, basename } from 'node:path';
import { randomBytes } from 'node:crypto';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { loadConfig } from '../config.js';
import { studioPaths, type StudioPaths } from '../store/paths.js';
import { initStudio, getActiveFilm } from '../store/studio.js';
import { shotShow } from '../store/shot.js';
import { appendLine } from '../store/fs.js';
import { ensureBudget, recordSpend } from '../budget.js';
import { errNotFound, errValidation } from '../errors.js';
import { GoogleAudioLane, ElevenLabsAudioLane, type AudioLane } from '../lanes/audio.js';
import { probeMedia, type MediaProbeResult } from '../qa/critic.js';
import { guard, out } from './registry.js';

const execFileAsync = promisify(execFile);

const SUPPORTED_AUDIO_EXTS = new Set(['.wav', '.mp3', '.ogg', '.webm', '.m4a', '.flac']);
const MIN_ACTIVE_PEAK_DB = -75;

type ScoreState = 'felt_whisper' | 'creeping_dread' | 'epic_swell' | 'vacuum_silence';

interface ShotScoreArrangement {
  shot_id: string;
  duration_s: number;
  state: ScoreState;
  active_stems: string[];
  volume_envelope_db: number;
  filter: string;
}

interface AmbientLayerRule {
  keywords: RegExp;
  noiseColor: 'pink' | 'brown' | 'white';
  amplitude: number;
  filterChain: string;
}

const AMBIENT_LAYER_RULES: AmbientLayerRule[] = [
  {
    keywords: /wind|blizzard|gale|breeze|gust|storm|howl/i,
    noiseColor: 'pink',
    amplitude: 0.35,
    filterChain: 'bandpass=f=420:t=q:w=1.8,tremolo=f=0.35:d=0.65,aecho=0.8:0.7:120:0.3',
  },
  {
    keywords: /fire|hearth|flame|crackle|ember|forge|torch/i,
    noiseColor: 'brown',
    amplitude: 0.4,
    filterChain: 'lowpass=f=480,tremolo=f=6.5:d=0.75,highpass=f=60',
  },
  {
    keywords: /cavern|cave|hall|stone|tunnel|cathedral|echo|crypt|ruin/i,
    noiseColor: 'brown',
    amplitude: 0.3,
    filterChain: 'lowpass=f=850,aecho=0.85:0.88:90|180:0.45|0.3',
  },
  {
    keywords: /rain|water|river|ocean|stream|wave|surf|waterfall/i,
    noiseColor: 'white',
    amplitude: 0.25,
    filterChain: 'bandpass=f=1200:t=q:w=0.9,tremolo=f=0.25:d=0.4,lowpass=f=4500',
  },
  {
    keywords: /forest|wood|creak|tree|leaf|leaves|night|snow/i,
    noiseColor: 'pink',
    amplitude: 0.28,
    filterChain: 'bandpass=f=900:t=q:w=1.3,tremolo=f=0.6:d=0.45',
  },
];

async function resolveFilmOrThrow(paths: StudioPaths, explicitFilmId?: string): Promise<string> {
  await initStudio(paths);
  const filmId = explicitFilmId ?? (await getActiveFilm(paths));
  if (!filmId) {
    throw errNotFound('no active film set', 'create one with film_create or pass film_id explicitly');
  }
  return filmId;
}

/**
 * Resolves an audio path (absolute, STUDIO_ROOT-relative, or film-relative) and verifies a supported extension.
 */
async function resolveAudioSourcePath(studioRoot: string, filmDir: string, rawPath: string): Promise<string> {
  const candidates = isAbsolute(rawPath) ? [rawPath] : [join(studioRoot, rawPath), join(filmDir, rawPath)];
  let foundPath: string | undefined;
  for (const candidate of candidates) {
    try {
      const st = await stat(candidate);
      if (st.isFile()) {
        foundPath = candidate;
        break;
      }
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code !== 'ENOENT') throw e;
    }
  }
  if (!foundPath) {
    throw errNotFound(
      `source audio not found: ${rawPath}`,
      'use an absolute path, a STUDIO_ROOT-relative path, or a film-relative path that exists',
    );
  }
  const ext = extname(foundPath).toLowerCase();
  if (!SUPPORTED_AUDIO_EXTS.has(ext)) {
    throw errValidation(
      `unsupported audio extension "${ext || rawPath}"`,
      'supported audio extensions: .wav, .mp3, .ogg, .webm, .m4a, .flac',
    );
  }
  return foundPath;
}

/**
 * Probes an audio file via ffprobe and throws VALIDATION if unreadable or missing a valid audio stream.
 */
async function requireValidAudioFile(filePath: string, label: string): Promise<MediaProbeResult> {
  const probe = await probeMedia(filePath);
  if (!probe.exists || probe.error || !probe.hasAudio || probe.durationS <= 0) {
    throw errValidation(
      `invalid or unreadable audio stream in "${label}"`,
      'provide a readable audio file containing a valid audio stream with duration > 0',
    );
  }
  return probe;
}

/**
 * Measures peak and mean loudness via FFmpeg volumedetect filter.
 */
async function detectAudioVolume(filePath: string): Promise<{ maxVolumeDb: number; meanVolumeDb: number }> {
  let stderr = '';
  try {
    const res = await execFileAsync(
      'ffmpeg',
      ['-nostdin', '-vn', '-i', filePath, '-af', 'volumedetect', '-f', 'null', '-'],
      { maxBuffer: 8 * 1024 * 1024 },
    );
    stderr = res.stderr || '';
  } catch (err: unknown) {
    const e = err as { stderr?: string; message?: string };
    stderr = e.stderr || e.message || '';
  }

  const parseDb = (label: string): number => {
    const match = stderr.match(new RegExp(`${label}:\\s*([-+]?\\d+(?:\\.\\d+)?|-inf)\\s*dB`, 'i'));
    if (!match || match[1].toLowerCase() === '-inf') return -Infinity;
    const val = Number(match[1]);
    return Number.isFinite(val) ? val : -Infinity;
  };

  return {
    maxVolumeDb: parseDb('max_volume'),
    meanVolumeDb: parseDb('mean_volume'),
  };
}

/**
 * Executes FFmpeg to a temporary WAV file, verifies 48kHz PCM audio via ffprobe, and atomically moves to destPath.
 */
async function execFfmpegWavAtomic(
  argsBeforeDest: string[],
  destPath: string,
  expectedChannels?: number,
): Promise<MediaProbeResult> {
  await mkdir(dirname(destPath), { recursive: true });
  const tmpDest = join(dirname(destPath), `.tmp_${randomBytes(4).toString('hex')}_${basename(destPath)}`);
  try {
    await execFileAsync('ffmpeg', [...argsBeforeDest, tmpDest], { maxBuffer: 32 * 1024 * 1024 });
    const probe = await probeMedia(tmpDest);
    if (
      !probe.exists
      || probe.error
      || !probe.hasAudio
      || probe.durationS <= 0
      || probe.audioSampleRate !== 48000
      || (expectedChannels !== undefined && probe.audioChannels !== expectedChannels)
    ) {
      throw errValidation(
        `transcoded WAV failed 48kHz verification (${basename(destPath)})`,
        'check source audio integrity and retry',
      );
    }
    await rename(tmpDest, destPath);
    return probe;
  } catch (err) {
    await rm(tmpDest, { force: true }).catch(() => {});
    if (err instanceof Error && err.name === 'StudioError') throw err;
    const msg = (err as { stderr?: string; message?: string }).stderr || (err as Error).message || String(err);
    throw errValidation(
      `ffmpeg audio processing failed: ${msg.slice(-400)}`,
      'verify ffmpeg is installed and input audio files are valid',
    );
  }
}

/**
 * Builds an FFmpeg filter_complex graph synthesizing textured ambient soundscapes matching sfx keywords.
 */
function buildSoundscapeFilterGraph(sfx: string, durationS: number): string {
  const durStr = durationS.toFixed(3);
  const matched = AMBIENT_LAYER_RULES.filter((r) => r.keywords.test(sfx)).slice(0, 3);
  const layers = matched.length > 0
    ? matched
    : [{
        keywords: /.*/,
        noiseColor: 'brown' as const,
        amplitude: 0.25,
        filterChain: 'lowpass=f=500,highpass=f=45',
      }];

  const parts: string[] = [];
  const labels: string[] = [];
  for (let i = 0; i < layers.length; i++) {
    const layer = layers[i];
    const lbl = `[l${i}]`;
    parts.push(
      `anoisesrc=color=${layer.noiseColor}:amplitude=${layer.amplitude}:r=48000:d=${durStr},${layer.filterChain},atrim=0:${durStr},asetpts=PTS-STARTPTS${lbl}`,
    );
    labels.push(lbl);
  }

  const mixPrefix = layers.length > 1
    ? `${labels.join('')}amix=inputs=${layers.length}:duration=shortest:normalize=0,`
    : labels[0];
  parts.push(`${mixPrefix}aformat=sample_rates=48000:channel_layouts=stereo,loudnorm=I=-24:TP=-1.5:LRA=11[aout]`);
  return parts.join(';');
}

/**
 * Builds FFmpeg inputs and filter_complex mixing stems per shot tension state with EBU R128 mastering.
 */
function buildScoreFilterGraph(
  stemsDir: string,
  arrangements: ShotScoreArrangement[],
): { inputArgs: string[]; filterComplex: string } {
  const stemOrder: string[] = [];
  const stemUseCounts = new Map<string, number>();

  for (const shot of arrangements) {
    for (const stem of shot.active_stems) {
      if (!stemUseCounts.has(stem)) {
        stemOrder.push(stem);
        stemUseCounts.set(stem, 0);
      }
      stemUseCounts.set(stem, stemUseCounts.get(stem)! + 1);
    }
  }

  const inputArgs: string[] = [];
  for (const stem of stemOrder) {
    inputArgs.push('-stream_loop', '-1', '-i', join(stemsDir, stem));
  }

  const filterParts: string[] = [];
  const stemBranchQueue = new Map<string, string[]>();

  for (let idx = 0; idx < stemOrder.length; idx++) {
    const stem = stemOrder[idx];
    const count = stemUseCounts.get(stem)!;
    const branches: string[] = [];
    for (let b = 0; b < count; b++) {
      branches.push(`[st${idx}_${b}]`);
    }
    stemBranchQueue.set(stem, branches);

    if (count === 1) {
      filterParts.push(`[${idx}:a]aformat=sample_rates=48000:channel_layouts=stereo${branches[0]}`);
    } else {
      filterParts.push(`[${idx}:a]aformat=sample_rates=48000:channel_layouts=stereo,asplit=${count}${branches.join('')}`);
    }
  }

  const segLabels: string[] = [];
  for (let i = 0; i < arrangements.length; i++) {
    const shot = arrangements[i];
    const durStr = shot.duration_s.toFixed(3);
    const segLabel = `[seg${i}]`;
    segLabels.push(segLabel);

    if (shot.state === 'vacuum_silence' || shot.active_stems.length === 0) {
      filterParts.push(`anullsrc=r=48000:cl=stereo:d=${durStr}${segLabel}`);
      continue;
    }

    const trimmedLabels: string[] = [];
    for (let k = 0; k < shot.active_stems.length; k++) {
      const stem = shot.active_stems[k];
      const srcLabel = stemBranchQueue.get(stem)!.shift()!;
      const trimLabel = `[tr${i}_${k}]`;
      filterParts.push(`${srcLabel}atrim=0:${durStr},asetpts=PTS-STARTPTS${trimLabel}`);
      trimmedLabels.push(trimLabel);
    }

    const lowpass = shot.state === 'felt_whisper' ? 'lowpass=f=650,' : '';
    const vol = `${lowpass}volume=${shot.volume_envelope_db}dB`;
    if (trimmedLabels.length === 1) {
      const src = trimmedLabels[0];
      filterParts.push(`${src}${vol}${segLabel}`);
    } else {
      filterParts.push(`${trimmedLabels.join('')}amix=inputs=${trimmedLabels.length}:duration=shortest:normalize=0,${vol}${segLabel}`);
    }
  }

  if (segLabels.length === 1) {
    filterParts.push(`${segLabels[0]}loudnorm=I=-23:TP=-1.0:LRA=7[aout]`);
  } else {
    filterParts.push(`${segLabels.join('')}concat=n=${segLabels.length}:v=0:a=1,loudnorm=I=-23:TP=-1.0:LRA=7[aout]`);
  }

  return { inputArgs, filterComplex: filterParts.join(';') };
}

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
        const filmId = await resolveFilmOrThrow(paths, a.film_id);
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
          let lineVoiceName = a.voice_name;
          let lineVoiceId: string | undefined;
          let lineLaneKind = a.lane;

          if (item.voiceRef) {
            try {
              const profPath = `${paths.assetDir(filmId, 'characters', item.voiceRef)}/voice_profile.json`;
              const profRaw = await readFile(profPath, 'utf8');
              const prof = JSON.parse(profRaw);
              if (prof.voiceId) {
                lineVoiceId = prof.voiceId;
                if (!lineVoiceName) lineVoiceName = prof.voiceId;
              }
              if (!lineLaneKind && prof.provider) {
                lineLaneKind = prof.provider;
              }
            } catch {
              // Plain or legacy character without voice_profile.json
            }
          }

          const currentLaneKind = lineLaneKind ?? 'google';
          let lineAudioLane = audioLane;
          if (currentLaneKind === 'elevenlabs' && audioLane.kind !== 'elevenlabs') {
            const key = process.env.ELEVENLABS_API_KEY;
            if (!key) throw errValidation('missing ELEVENLABS_API_KEY', 'set ELEVENLABS_API_KEY in .env');
            lineAudioLane = new ElevenLabsAudioLane(key);
          } else if (currentLaneKind === 'google' && audioLane.kind !== 'google') {
            const key = cfg.geminiApiKey;
            if (!key) throw errValidation('missing GEMINI_API_KEY for audio lane', 'set GEMINI_API_KEY in .env');
            lineAudioLane = new GoogleAudioLane(key);
          }

          const estimatedCost = lineAudioLane.price({ dialogue: item.line, voiceId: lineVoiceId });
          await ensureBudget(paths, filmId, estimatedCost);

          const artifact = await lineAudioLane.synthesize({
            dialogue: item.line,
            voiceName: lineVoiceName,
            voiceId: lineVoiceId,
          });

          const filename = `${a.shot_id}_line_${i + 1}.wav`;
          const filePath = paths.audioPath(filmId, filename);
          await writeFile(filePath, artifact.audioData);

          await recordSpend(paths, filmId, artifact.costUsd);
          totalCostUsd += artifact.costUsd;

          const ledgerLine = JSON.stringify({
            ts: new Date().toISOString(),
            tool: 'dialogue_render',
            lane: lineAudioLane.kind,
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
    'dialogue_import',
    'Imports an external dialogue recording (e.g. Google AI Studio web capture) at zero API cost, checks non-silent audio via ffprobe/volumedetect, and transcodes/normalizes to 48kHz 16-bit mono PCM WAV.',
    {
      shot_id: z.string(),
      source_audio_path: z.string(),
      film_id: z.string().optional(),
      line_index: z.number().int().min(1).optional(),
      normalize_lufs: z.number().optional(),
    },
    async (a) =>
      guard(async () => {
        if (!a.shot_id.trim()) {
          throw errValidation('shot_id is required', 'pass the target shot id');
        }
        if (!a.source_audio_path.trim()) {
          throw errValidation('source_audio_path is required', 'pass the path to the captured audio file');
        }
        if (a.normalize_lufs !== undefined && (!Number.isFinite(a.normalize_lufs) || a.normalize_lufs < -70 || a.normalize_lufs > -5)) {
          throw errValidation('normalize_lufs must be between -70 and -5 LUFS', 'omit normalize_lufs for -16 LUFS default or pass a value in [-70, -5]');
        }

        const filmId = await resolveFilmOrThrow(paths, a.film_id);
        await shotShow(paths, filmId, a.shot_id);

        const resolvedSource = await resolveAudioSourcePath(studioRoot, paths.filmDir(filmId), a.source_audio_path);
        await requireValidAudioFile(resolvedSource, a.source_audio_path);

        const { maxVolumeDb, meanVolumeDb } = await detectAudioVolume(resolvedSource);
        if (!Number.isFinite(maxVolumeDb) || maxVolumeDb < MIN_ACTIVE_PEAK_DB) {
          throw errValidation(
            `source audio "${a.source_audio_path}" is silent or below noise floor (max_volume: ${Number.isFinite(maxVolumeDb) ? `${maxVolumeDb} dB` : '-inf dB'})`,
            'capture non-silent speech (> -75 dB peak) and retry dialogue_import',
          );
        }

        const lineIdx = a.line_index ?? 1;
        const targetLufs = a.normalize_lufs ?? -16;
        const destPath = paths.audioPath(filmId, `${a.shot_id}_line_${lineIdx}.wav`);

        const outProbe = await execFfmpegWavAtomic(
          [
            '-y', '-nostdin', '-i', resolvedSource, '-vn',
            '-af', `loudnorm=I=${targetLufs}:TP=-1.5:LRA=11`,
            '-ar', '48000', '-ac', '1', '-c:a', 'pcm_s16le',
          ],
          destPath,
          1,
        );

        return out({
          film_id: filmId,
          shot_id: a.shot_id,
          line_index: lineIdx,
          audio_path: destPath,
          sample_rate_hz: outProbe.audioSampleRate ?? 48000,
          channels: outProbe.audioChannels ?? 1,
          duration_s: outProbe.durationS,
          max_volume_db: maxVolumeDb,
          mean_volume_db: Number.isFinite(meanVolumeDb) ? meanVolumeDb : maxVolumeDb,
          zero_api_cost: true,
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
        const filmId = await resolveFilmOrThrow(paths, a.film_id);
        const shot = await shotShow(paths, filmId, a.shot_id);
        const lineIdx = a.line_index ?? 1;
        const rawFileName = `${a.shot_id}_line_${lineIdx}.wav`;
        const rawFilePath = paths.audioPath(filmId, rawFileName);

        try {
          await stat(rawFilePath);
        } catch {
          throw errValidation(
            `raw dialogue stem "${rawFileName}" not found`,
            'run dialogue_render or dialogue_import first to generate the raw speech stem before acoustic matching',
          );
        }

        await requireValidAudioFile(rawFilePath, rawFileName);

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

        const outProbe = await execFfmpegWavAtomic(
          ['-y', '-nostdin', '-i', rawFilePath, '-af', fullFilter, '-ar', '48000', '-c:a', 'pcm_s16le'],
          outputFilePath,
        );

        return out({
          shot_id: a.shot_id,
          diegetic_audio_path: outputFilePath,
          environment: env,
          filter_graph: fullFilter,
          target_lufs: -14,
          sample_rate_hz: outProbe.audioSampleRate ?? 48000,
          ffmpeg_applied: true,
        });
      }),
  );

  server.tool(
    'soundscape_build',
    'Synthesizes an ambient diegetic room-tone and SFX 48kHz WAV bed for a shot from audio_block.sfx (or ingests/loops an optional source_audio_path).',
    {
      shot_id: z.string(),
      film_id: z.string().optional(),
      source_audio_path: z.string().optional(),
    },
    async (a) =>
      guard(async () => {
        if (a.source_audio_path !== undefined && !a.source_audio_path.trim()) {
          throw errValidation('source_audio_path must not be blank when provided', 'omit source_audio_path for procedural synthesis or pass a valid audio file path');
        }

        const filmId = await resolveFilmOrThrow(paths, a.film_id);
        const shot = await shotShow(paths, filmId, a.shot_id);
        const sfx = shot.audioBlock?.sfx?.trim();
        if (!sfx && !a.source_audio_path) {
          throw errValidation(
            `shot "${a.shot_id}" has no sfx specified in its audio_block`,
            'define sfx text (e.g. "wind, crackling hearth") with shot_update or pass source_audio_path before building soundscape',
          );
        }

        const dur = shot.durationS > 0 ? shot.durationS : 4;
        const wavPath = paths.audioPath(filmId, `${a.shot_id}_soundscape.wav`);
        const manifestPath = paths.audioPath(filmId, `${a.shot_id}_soundscape.txt`);

        let ffmpegArgs: string[];
        if (a.source_audio_path) {
          const resolvedSource = await resolveAudioSourcePath(studioRoot, paths.filmDir(filmId), a.source_audio_path);
          await requireValidAudioFile(resolvedSource, a.source_audio_path);
          ffmpegArgs = [
            '-y', '-nostdin', '-stream_loop', '-1', '-i', resolvedSource, '-vn',
            '-af', `atrim=0:${dur.toFixed(3)},asetpts=PTS-STARTPTS,aformat=sample_rates=48000:channel_layouts=stereo,loudnorm=I=-24:TP=-1.5:LRA=11`,
            '-ar', '48000', '-ac', '2', '-c:a', 'pcm_s16le',
          ];
        } else {
          const filterComplex = buildSoundscapeFilterGraph(sfx!, dur);
          ffmpegArgs = [
            '-y', '-nostdin', '-filter_complex', filterComplex, '-map', '[aout]',
            '-ar', '48000', '-ac', '2', '-c:a', 'pcm_s16le',
          ];
        }

        const wavProbe = await execFfmpegWavAtomic(ffmpegArgs, wavPath, 2);
        const sfxSpec = sfx || `imported:${basename(a.source_audio_path!)}`;
        await writeFile(manifestPath, `SFX SPEC: ${sfxSpec}\nDURATION: ${dur}s\nROOM_TONE: active\nAUDIO_WAV: ${wavPath}\n`);

        return out({
          shot_id: a.shot_id,
          film_id: filmId,
          sfx_spec: sfxSpec,
          duration_s: wavProbe.durationS,
          sample_rate_hz: wavProbe.audioSampleRate ?? 48000,
          channels: wavProbe.audioChannels ?? 2,
          soundscape_audio_path: wavPath,
          manifest_path: manifestPath,
        });
      }),
  );

  server.tool(
    'score_arrange_dynamic',
    'Arranges an additive multi-track musical score across shot emotional tension states (felt_whisper, creeping_dread, epic_swell, vacuum_silence), applying dynamic volume envelopes, spectral low-pass filtering, and EBU R128 (-23 LUFS) mastering.',
    {
      film_id: z.string().optional(),
      stems_dir: z.string(),
      shots: z.array(
        z.object({
          shot_id: z.string(),
          state: z.enum(['felt_whisper', 'creeping_dread', 'epic_swell', 'vacuum_silence']),
          duck_db: z.number().optional(),
        }),
      ),
    },
    async (a) =>
      guard(async () => {
        if (a.shots.length === 0) {
          throw errValidation('shots array must not be empty', 'pass at least one shot arrangement in shots');
        }

        const filmId = await resolveFilmOrThrow(paths, a.film_id);

        let stemFiles: string[] = [];
        try {
          stemFiles = (await readdir(a.stems_dir)).filter((f) => f.endsWith('.wav') || f.endsWith('.mp3'));
        } catch {
          throw errValidation(
            `stems directory "${a.stems_dir}" not found or cannot be read`,
            'provide a valid stems directory containing stem audio files',
          );
        }

        if (stemFiles.length === 0) {
          throw errValidation(
            `no audio stems (.wav/.mp3) found in "${a.stems_dir}"`,
            'ensure stems directory contains stem files',
          );
        }

        const melodyStem = stemFiles.find((f) => f.includes('melody') || f.includes('lead') || f.includes('theme')) ?? stemFiles[0];
        const droneStem = stemFiles.find((f) => f.includes('drone') || f.includes('bass') || f.includes('sub')) ?? null;

        let totalDurationS = 0;
        const shotArrangements: ShotScoreArrangement[] = [];

        for (const item of a.shots) {
          const shot = await shotShow(paths, filmId, item.shot_id);
          const dur = shot.durationS > 0 ? shot.durationS : 4;
          totalDurationS += dur;

          let active: string[] = [];
          let volumeDb = 0;
          let filter = 'volume=1.0';

          switch (item.state) {
            case 'felt_whisper':
              active = [melodyStem];
              volumeDb = item.duck_db ?? -18;
              filter = `lowpass=f=650,volume=${volumeDb}dB`;
              break;
            case 'creeping_dread':
              active = [melodyStem, ...(droneStem ? [droneStem] : [])];
              volumeDb = item.duck_db ?? -12;
              filter = `volume=${volumeDb}dB`;
              break;
            case 'epic_swell':
              active = [...stemFiles];
              volumeDb = item.duck_db ?? -2;
              filter = `volume=${volumeDb}dB`;
              break;
            case 'vacuum_silence':
              active = [];
              volumeDb = -99;
              filter = 'volume=0';
              break;
          }

          shotArrangements.push({
            shot_id: item.shot_id,
            duration_s: dur,
            state: item.state,
            active_stems: active,
            volume_envelope_db: volumeDb,
            filter,
          });
        }

        // Probe every active stem referenced across shots before executing FFmpeg
        const referencedStems = [...new Set(shotArrangements.flatMap((s) => s.active_stems))];
        for (const stemName of referencedStems) {
          await requireValidAudioFile(join(a.stems_dir, stemName), stemName);
        }

        const { inputArgs, filterComplex } = buildScoreFilterGraph(a.stems_dir, shotArrangements);
        const manifestPath = paths.audioPath(filmId, 'score_manifest.json');
        const scoreMasterPath = paths.audioPath(filmId, 'score_master.wav');

        const scoreProbe = await execFfmpegWavAtomic(
          [
            '-y', '-nostdin',
            ...inputArgs,
            '-filter_complex', filterComplex,
            '-map', '[aout]',
            '-ar', '48000', '-ac', '2', '-c:a', 'pcm_s16le',
          ],
          scoreMasterPath,
          2,
        );

        const manifestData = {
          film_id: filmId,
          total_duration_s: totalDurationS,
          actual_duration_s: scoreProbe.durationS,
          target_lufs: -23,
          shots: shotArrangements,
          created_at: new Date().toISOString(),
        };
        await writeFile(manifestPath, JSON.stringify(manifestData, null, 2), 'utf8');

        return out({
          film_id: filmId,
          total_duration_s: totalDurationS,
          actual_duration_s: scoreProbe.durationS,
          sample_rate_hz: scoreProbe.audioSampleRate ?? 48000,
          channels: scoreProbe.audioChannels ?? 2,
          target_lufs: -23,
          score_audio_path: scoreMasterPath,
          manifest_path: manifestPath,
          shots: shotArrangements,
        });
      }),
  );
}
