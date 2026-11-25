// src/sfx/sfx_engine.ts — Studio Sound Effects Kit, Trending Viral SFX Pack, Live API Integration & Sync-Point FFmpeg Mixer
import { execFile as execFileCb } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdir, readFile, rename, rm, stat, writeFile } from 'node:fs/promises';
import { randomBytes } from 'node:crypto';
import { basename, dirname, join } from 'node:path';
import { promisify } from 'node:util';
import { errJobFailed, errLaneDown, errNotFound, errValidation } from '../errors.js';
import { probeMedia } from '../qa/critic.js';

const execFileAsync = promisify(execFileCb);

export interface SfxCatalogEntry {
  id: string;
  name: string;
  category: string;
  file: string;
  description: string;
  use_for: string[];
  avoid_for: string[];
  tags: string[];
  duration: number;
  channels: number;
  sync: {
    at: number;
    meets: string;
    how: string;
  };
  timing?: {
    audible_start: number;
    onset: number;
    peak: number;
    body_end: number;
    audible_end: number;
  };
  fits_seconds?: [number, number];
  level?: {
    lufs: number;
    true_peak_dbtp: number;
    tier: string;
  };
  under_voiceover_db?: number;
  adapt?: {
    rate: [number, number];
  };
}

export interface SfxCatalogDocument {
  name: string;
  version: string;
  categories: Array<{ id: string; title: string; description: string; count: number }>;
  sounds: SfxCatalogEntry[];
}

export interface SfxSpot {
  sound_id: string;
  file_path: string;
  target_moment_s: number;
  timeline_start_s: number;
  trim_start_s: number;
  duration_s: number;
  sync_at_s: number;
  rate: number;
  gain_db: number;
  reason?: string;
}

export type SfxFetchLike = (
  url: string,
  init?: { method?: string; headers?: Record<string, string>; body?: string },
) => Promise<{
  ok: boolean;
  status: number;
  arrayBuffer(): Promise<ArrayBuffer>;
  json(): Promise<unknown>;
  text(): Promise<string>;
}>;

// Mapping of popular viral Reels / TikTok / Shorts SFX archetypes to mastered CC0 SFX Kit IDs
export const VIRAL_SFX_PACK_MAP: Record<string, { sound_id: string; cue_type: string; default_gain_db: number }> = {
  hook_slam: { sound_id: 'boom-hit-medium', cue_type: 'opening_hook', default_gain_db: -2 },
  vine_boom: { sound_id: 'boom-drop-strong', cue_type: 'shock_punchline', default_gain_db: -1 },
  riser_tension: { sound_id: 'riser-2s-strong', cue_type: 'build_reveal', default_gain_db: -3 },
  whoosh_cut: { sound_id: 'whoosh-fast-hard', cue_type: 'scene_cut', default_gain_db: -3 },
  whoosh_soft: { sound_id: 'whoosh-fast-soft', cue_type: 'caption_slide', default_gain_db: -6 },
  swish_arrow: { sound_id: 'swish-medium', cue_type: 'graphic_flick', default_gain_db: -5 },
  caption_pop: { sound_id: 'pop-medium-in', cue_type: 'keyword_pop', default_gain_db: -5 },
  ding_highlight: { sound_id: 'tone-ding-mid', cue_type: 'stat_reveal', default_gain_db: -4 },
  glitch_error: { sound_id: 'digital-glitch-clear', cue_type: 'pattern_interrupt', default_gain_db: -4 },
  cash_register: { sound_id: 'money-register', cue_type: 'money_metric', default_gain_db: -4 },
  clock_urgency: { sound_id: 'time-clock-fast', cue_type: 'countdown_urgency', default_gain_db: -6 },
  ui_click: { sound_id: 'click-button-medium', cue_type: 'cta_tap', default_gain_db: -4 },
};

let cachedCatalog: SfxCatalogDocument | null = null;

function sanitizeSlug(raw: string): string {
  return raw.toLowerCase().replace(/[^a-z0-9_-]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 64) || 'sfx';
}

export async function loadSfxCatalog(customCatalogPath?: string): Promise<SfxCatalogDocument> {
  if (!customCatalogPath && cachedCatalog) return cachedCatalog;

  const candidates = [
    ...(customCatalogPath ? [customCatalogPath] : []),
    join(process.cwd(), 'data', 'sfx_kit_catalog.json'),
    join(process.cwd(), 'clones', 'sfx-kit', 'sounds.json'),
  ];

  for (const p of candidates) {
    try {
      const raw = await readFile(p, 'utf8');
      const parsed = JSON.parse(raw) as SfxCatalogDocument;
      if (Array.isArray(parsed.sounds) && parsed.sounds.length > 0) {
        if (!customCatalogPath) cachedCatalog = parsed;
        return parsed;
      }
    } catch {
      // try next path
    }
  }

  throw errNotFound('SFX Kit catalog (sounds.json) not found on disk', 'ensure data/sfx_kit_catalog.json exists');
}

export async function searchSfxCatalog(queryOpts: {
  query?: string;
  category?: string;
  viral_preset?: string;
  max_duration_s?: number;
  avoid_speech_overlap?: boolean;
  limit?: number;
}): Promise<{
  total_matches: number;
  results: SfxCatalogEntry[];
}> {
  const cat = await loadSfxCatalog();
  if (queryOpts.viral_preset && VIRAL_SFX_PACK_MAP[queryOpts.viral_preset]) {
    const targetId = VIRAL_SFX_PACK_MAP[queryOpts.viral_preset].sound_id;
    const hit = cat.sounds.find((s) => s.id === targetId);
    if (hit) {
      return { total_matches: 1, results: [hit] };
    }
  }

  const tokens = (queryOpts.query ?? '')
    .toLowerCase()
    .split(/[\s,]+/)
    .map((t) => t.trim())
    .filter(Boolean);

  const scored: Array<{ entry: SfxCatalogEntry; score: number }> = [];

  for (const sound of cat.sounds) {
    if (queryOpts.category && sound.category !== queryOpts.category) continue;
    if (queryOpts.max_duration_s !== undefined && sound.duration > queryOpts.max_duration_s) continue;
    if (
      queryOpts.avoid_speech_overlap &&
      sound.avoid_for.some((a) => a.toLowerCase().includes('on top of speech'))
    ) {
      continue;
    }

    let score = tokens.length === 0 ? 1 : 0;
    const haystack = [
      sound.id,
      sound.name,
      sound.category,
      sound.description,
      ...sound.tags,
      ...sound.use_for,
    ]
      .join(' ')
      .toLowerCase();

    for (const tok of tokens) {
      if (sound.id.toLowerCase().includes(tok)) score += 6;
      else if (sound.tags.some((t) => t.toLowerCase() === tok)) score += 5;
      else if (sound.use_for.some((u) => u.toLowerCase().includes(tok))) score += 4;
      else if (haystack.includes(tok)) score += 2;
    }

    if (score > 0) {
      scored.push({ entry: sound, score });
    }
  }

  scored.sort((a, b) => b.score - a.score || a.entry.duration - b.entry.duration);
  const limit = Math.max(1, Math.min(50, queryOpts.limit ?? 12));
  return {
    total_matches: scored.length,
    results: scored.slice(0, limit).map((s) => s.entry),
  };
}

/**
 * Resolves a WAV file for an SFX Kit sound ID from local clones/sfx-kit or caches it cleanly from GitHub raw CDN.
 */
export async function resolveSfxWavPath(
  soundIdOrPreset: string,
  studioRoot: string,
  fetchFn: SfxFetchLike = globalThis.fetch as unknown as SfxFetchLike,
): Promise<{ entry: SfxCatalogEntry; filePath: string; source: 'local_pack' | 'cache' | 'remote_github' }> {
  const cat = await loadSfxCatalog();
  const mappedId = VIRAL_SFX_PACK_MAP[soundIdOrPreset]?.sound_id ?? soundIdOrPreset;
  const entry = cat.sounds.find((s) => s.id === mappedId);
  if (!entry) {
    throw errNotFound(
      `sound effect "${soundIdOrPreset}" not found in SFX Kit catalog`,
      'call sfx_search to pick a valid sound_id or viral preset',
    );
  }

  const localPackPath = join(process.cwd(), 'clones', 'sfx-kit', entry.file);
  if (existsSync(localPackPath)) {
    return { entry, filePath: localPackPath, source: 'local_pack' };
  }

  const cacheDir = join(studioRoot, 'sfx_cache', 'kit');
  const cachedPath = join(cacheDir, `${entry.id}.wav`);
  if (existsSync(cachedPath)) {
    return { entry, filePath: cachedPath, source: 'cache' };
  }

  const url = `https://raw.githubusercontent.com/wyzowl/sfx-kit/main/${entry.file}`;
  const resp = await fetchFn(url, { method: 'GET' });
  if (!resp.ok) {
    throw errLaneDown(
      `failed to download SFX "${entry.id}" from SFX Kit CDN (HTTP ${resp.status})`,
      'check network access or ensure clones/sfx-kit is present locally',
    );
  }
  const bytes = Buffer.from(await resp.arrayBuffer());
  await mkdir(cacheDir, { recursive: true });
  const tmp = `${cachedPath}.tmp-${randomBytes(4).toString('hex')}`;
  await writeFile(tmp, bytes);
  await rename(tmp, cachedPath);

  const probe = await probeMedia(cachedPath);
  if (!probe.exists || !probe.hasAudio) {
    await rm(cachedPath, { force: true }).catch(() => {});
    throw errJobFailed(`downloaded SFX "${entry.id}" failed ffprobe decode`, 'retry download');
  }

  return { entry, filePath: cachedPath, source: 'remote_github' };
}

/**
 * Fetches or generates a custom sound effect from live external APIs (ElevenLabs SFX v2 or Freesound API v2)
 * and transcodes/stores it as 48kHz WAV under <studioRoot>/sfx_cache/api/.
 */
export async function fetchRemoteApiSfx(opts: {
  queryOrPrompt: string;
  provider: 'elevenlabs' | 'freesound';
  studioRoot: string;
  durationS?: number;
  apiKey?: string;
  fetchFn?: SfxFetchLike;
}): Promise<{
  provider: 'elevenlabs' | 'freesound';
  sfx_id: string;
  title: string;
  audio_path: string;
  duration_s: number;
  sample_rate_hz: number;
}> {
  const prompt = opts.queryOrPrompt.trim();
  if (!prompt) {
    throw errValidation('queryOrPrompt is required', 'describe the viral sound effect or search query');
  }

  const fetchImpl = opts.fetchFn ?? (globalThis.fetch as unknown as SfxFetchLike);
  const apiDir = join(opts.studioRoot, 'sfx_cache', 'api');
  await mkdir(apiDir, { recursive: true });

  const slug = sanitizeSlug(prompt);
  const destWav = join(apiDir, `${opts.provider}_${slug}_${randomBytes(3).toString('hex')}.wav`);
  const tmpRaw = join(apiDir, `.tmp_${randomBytes(4).toString('hex')}.bin`);
  const tmpWav = join(apiDir, `.tmp_${randomBytes(4).toString('hex')}.wav`);

  let title = prompt;
  let sfxId = slug;

  try {
    if (opts.provider === 'elevenlabs') {
      const key = opts.apiKey ?? process.env.ELEVENLABS_API_KEY;
      if (!key) {
        throw errValidation(
          'ELEVENLABS_API_KEY is not configured',
          'set ELEVENLABS_API_KEY for AI custom sound generation, or use built-in SFX Kit / freesound',
        );
      }
      const dur = Math.max(0.5, Math.min(22, opts.durationS ?? 2.0));
      const resp = await fetchImpl('https://api.elevenlabs.io/v1/sound-generation', {
        method: 'POST',
        headers: {
          'xi-api-key': key,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: prompt,
          duration_seconds: dur,
          prompt_influence: 0.45,
        }),
      });
      if (!resp.ok) {
        const body = await resp.text().catch(() => '');
        throw errLaneDown(
          `ElevenLabs SFX API error (HTTP ${resp.status}): ${body.slice(0, 200)}`,
          'verify ELEVENLABS_API_KEY credits and prompt parameters',
        );
      }
      const rawBytes = Buffer.from(await resp.arrayBuffer());
      await writeFile(tmpRaw, rawBytes);
    } else {
      const key = opts.apiKey ?? process.env.FREESOUND_API_KEY;
      if (!key) {
        throw errValidation(
          'FREESOUND_API_KEY is not configured',
          'set FREESOUND_API_KEY in .env or use built-in SFX Kit catalog (no API key needed)',
        );
      }
      const searchUrl =
        `https://freesound.org/apiv2/search/text/?query=${encodeURIComponent(prompt)}` +
        `&fields=id,name,duration,previews,license&filter=duration:[0.1 TO 12.0]&sort=rating_desc&page_size=5&token=${encodeURIComponent(key)}`;
      const searchResp = await fetchImpl(searchUrl, { method: 'GET' });
      if (!searchResp.ok) {
        const body = await searchResp.text().catch(() => '');
        throw errLaneDown(
          `Freesound API search error (HTTP ${searchResp.status}): ${body.slice(0, 200)}`,
          'check FREESOUND_API_KEY and query terms',
        );
      }
      const payload = (await searchResp.json()) as {
        results?: Array<{
          id: number;
          name: string;
          duration?: number;
          previews?: Record<string, string>;
        }>;
      };
      const best = payload.results?.[0];
      if (!best) {
        throw errNotFound(`no Freesound results found for "${prompt}"`, 'broaden query keywords or use SFX Kit');
      }
      const previewUrl = best.previews?.['preview-hq-mp3'] ?? best.previews?.['preview-lq-mp3'];
      if (!previewUrl) {
        throw errLaneDown(`Freesound hit "${best.name}" had no downloadable preview URL`, 'retry another query');
      }
      const dlResp = await fetchImpl(previewUrl, { method: 'GET' });
      if (!dlResp.ok) {
        throw errLaneDown(`Freesound preview download failed (HTTP ${dlResp.status})`, 'retry search');
      }
      const rawBytes = Buffer.from(await dlResp.arrayBuffer());
      await writeFile(tmpRaw, rawBytes);
      title = best.name;
      sfxId = `freesound_${best.id}`;
    }

    // Normalize any downloaded MP3/WAV into clean 48kHz stereo PCM WAV
    await execFileAsync('ffmpeg', [
      '-y', '-nostdin', '-i', tmpRaw, '-vn',
      '-ar', '48000', '-ac', '2', '-c:a', 'pcm_s16le',
      tmpWav,
    ]);
    const probe = await probeMedia(tmpWav);
    if (!probe.exists || !probe.hasAudio || probe.durationS <= 0) {
      throw errJobFailed('fetched SFX stream failed 48kHz WAV verification', 'retry SFX fetch');
    }
    await rename(tmpWav, destWav);
    return {
      provider: opts.provider,
      sfx_id: sfxId,
      title,
      audio_path: destWav,
      duration_s: Number(probe.durationS.toFixed(3)),
      sample_rate_hz: probe.audioSampleRate ?? 48000,
    };
  } finally {
    await rm(tmpRaw, { force: true }).catch(() => {});
    await rm(tmpWav, { force: true }).catch(() => {});
  }
}

/**
 * Computes sample-accurate SFX timeline placement from SFX Kit sync.at & under_voiceover_db law.
 */
export function computeSfxPlacement(opts: {
  entry: SfxCatalogEntry;
  filePath: string;
  targetMomentS: number;
  speechIntervals?: Array<{ start_s: number; end_s: number }>;
  fitDurationS?: number;
  extraGainDb?: number;
  reason?: string;
}): SfxSpot {
  let rate = 1.0;
  if (opts.fitDurationS && opts.entry.fits_seconds && opts.entry.adapt?.rate) {
    const [minR, maxR] = opts.entry.adapt.rate;
    const rawRate = opts.entry.duration / Math.max(0.05, opts.fitDurationS);
    rate = Number(Math.max(minR, Math.min(maxR, rawRate)).toFixed(3));
  }

  const effectiveSyncAt = opts.entry.sync.at / rate;
  const effectiveDuration = opts.entry.duration / rate;
  const rawStart = opts.targetMomentS - effectiveSyncAt;
  const trimStartS = rawStart < 0 ? Number(Math.abs(rawStart).toFixed(3)) : 0;
  const timelineStartS = rawStart < 0 ? 0 : Number(rawStart.toFixed(3));

  const endS = timelineStartS + Math.max(0.05, effectiveDuration - trimStartS);
  const overlapsSpeech = Boolean(
    opts.speechIntervals?.some((sp) => timelineStartS < sp.end_s && endS > sp.start_s),
  );
  const voiceDuckDb = overlapsSpeech ? (opts.entry.under_voiceover_db ?? -4) : 0;
  const gainDb = Number(((opts.extraGainDb ?? 0) + voiceDuckDb).toFixed(2));

  return {
    sound_id: opts.entry.id,
    file_path: opts.filePath,
    target_moment_s: opts.targetMomentS,
    timeline_start_s: timelineStartS,
    trim_start_s: trimStartS,
    duration_s: Number((effectiveDuration - trimStartS).toFixed(3)),
    sync_at_s: Number(effectiveSyncAt.toFixed(3)),
    rate,
    gain_db: gainDb,
    reason: opts.reason,
  };
}

/**
 * Composites placed SFX spots onto an existing video or audio file via real FFmpeg filter_complex.
 */
export async function mixSfxOntoMedia(opts: {
  inputMediaPath: string;
  outputPath: string;
  spots: SfxSpot[];
  loudnormLufs?: number;
}): Promise<{
  outputPath: string;
  spotsMixed: number;
  hasVideo: boolean;
  durationS: number;
}> {
  const srcProbe = await probeMedia(opts.inputMediaPath);
  if (!srcProbe.exists || srcProbe.error || srcProbe.durationS <= 0) {
    throw errValidation(
      `input media "${opts.inputMediaPath}" is missing or unreadable`,
      'provide an existing decodable MP4 or WAV file',
    );
  }
  if (!opts.spots.length) {
    throw errValidation('at least 1 SFX spot is required for mixing', 'provide spotted SFX events');
  }

  for (const s of opts.spots) {
    const st = await stat(s.file_path).catch(() => null);
    if (!st || !st.isFile()) {
      throw errNotFound(`SFX WAV file missing: ${s.file_path}`, 'resolve SFX via resolveSfxWavPath first');
    }
  }

  const inputs: string[] = ['-y', '-nostdin', '-i', opts.inputMediaPath];
  const filterChains: string[] = [];
  const mixLabels: string[] = [];

  if (srcProbe.hasAudio) {
    filterChains.push('[0:a]aformat=sample_rates=48000:channel_layouts=stereo[basea]');
    mixLabels.push('[basea]');
  } else {
    filterChains.push(`anullsrc=r=48000:cl=stereo:d=${srcProbe.durationS.toFixed(3)}[basea]`);
    mixLabels.push('[basea]');
  }

  opts.spots.forEach((spot, i) => {
    inputs.push('-i', spot.file_path);
    const inputIdx = i + 1;
    const delayMs = Math.max(0, Math.round(spot.timeline_start_s * 1000));
    const parts: string[] = [];
    if (spot.trim_start_s > 0.005) {
      parts.push(`atrim=start=${spot.trim_start_s.toFixed(3)},asetpts=PTS-STARTPTS`);
    }
    if (Math.abs(spot.rate - 1.0) > 0.01) {
      parts.push(`atempo=${Math.max(0.5, Math.min(2.0, spot.rate)).toFixed(3)}`);
    }
    if (spot.gain_db !== 0) {
      parts.push(`volume=${spot.gain_db}dB`);
    }
    parts.push('aformat=sample_rates=48000:channel_layouts=stereo');
    parts.push(`adelay=${delayMs}|${delayMs}`);
    const lbl = `[sfx${i}]`;
    filterChains.push(`[${inputIdx}:a]${parts.join(',')}${lbl}`);
    mixLabels.push(lbl);
  });

  const targetLufs = opts.loudnormLufs ?? -14;
  filterChains.push(
    `${mixLabels.join('')}amix=inputs=${mixLabels.length}:duration=first:dropout_transition=0:normalize=0,loudnorm=I=${targetLufs}:TP=-1.0:LRA=9[outa]`,
  );

  await mkdir(dirname(opts.outputPath), { recursive: true });
  const tmpOut = join(dirname(opts.outputPath), `.tmp_${randomBytes(4).toString('hex')}_${basename(opts.outputPath)}`);
  const isAudioOnly = !srcProbe.hasVideo;
  const outputArgs = isAudioOnly
    ? ['-map', '[outa]', '-ar', '48000', '-ac', '2', '-c:a', 'pcm_s16le', tmpOut]
    : ['-map', '0:v', '-map', '[outa]', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k', '-shortest', tmpOut];

  try {
    await execFileAsync('ffmpeg', [...inputs, '-filter_complex', filterChains.join(';'), ...outputArgs], {
      maxBuffer: 32 * 1024 * 1024,
    });
    const outProbe = await probeMedia(tmpOut);
    if (!outProbe.exists || outProbe.error || !outProbe.hasAudio) {
      throw errJobFailed('FFmpeg SFX mix output failed ffprobe verification', 'check filtergraph and input streams');
    }
    await rename(tmpOut, opts.outputPath);
    return {
      outputPath: opts.outputPath,
      spotsMixed: opts.spots.length,
      hasVideo: outProbe.hasVideo,
      durationS: Number(outProbe.durationS.toFixed(2)),
    };
  } catch (err) {
    await rm(tmpOut, { force: true }).catch(() => {});
    throw err;
  }
}
