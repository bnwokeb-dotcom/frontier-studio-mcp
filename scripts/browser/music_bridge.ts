// scripts/browser/music_bridge.ts — Headless browser bridge & stem normalizer for Suno & Udio generative audio.
import { execFile as execFileCb } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { mkdir, readdir, rename, rm, writeFile } from 'node:fs/promises';
import { basename, extname, join, resolve } from 'node:path';
import { promisify } from 'node:util';
import { BridgeQueue, BridgeRequestError, type BridgeJobInput } from '../../src/bridge/web_bridge_server.js';
import { errLaneDown, errValidation } from '../../src/errors.js';
import { probeMedia } from '../../src/qa/critic.js';

const execFileAsync = promisify(execFileCb);

export type MusicTensionState = 'felt_whisper' | 'creeping_dread' | 'epic_swell' | 'vacuum_silence';

export interface MusicPromptInput {
  themeMelody: string;
  state: MusicTensionState;
  instruments?: string[];
  bpm?: number;
}

export interface CompiledMusicPrompt {
  prompt: string;
  tags: string[];
  suggestedBpm: number;
  dynamics: string;
}

export function compileMusicPrompt(input: MusicPromptInput): CompiledMusicPrompt {
  const instrumentsStr = (input.instruments ?? []).join(', ');

  switch (input.state) {
    case 'felt_whisper':
      return {
        prompt: `Haunting, delicate theme based on "${input.themeMelody}". Intimate solo acoustic, ${instrumentsStr || 'felt piano and weeping cello'}, very soft, melancholic reverb, slow tempo.`,
        tags: ['intimate', 'felt', 'acoustic', 'slow', 'melancholic', 'cinematic'],
        suggestedBpm: input.bpm ?? 60,
        dynamics: 'pianissimo (-18dB)',
      };
    case 'creeping_dread':
      return {
        prompt: `Ominous suspenseful variation on "${input.themeMelody}". Dark analog synth drone, low 35Hz sub-bass vibration, bowed metallic glass, ${instrumentsStr || 'dissonant strings'}, ticking tension.`,
        tags: ['dark', 'suspense', 'sub-bass', 'drone', 'dissonant', 'dread'],
        suggestedBpm: input.bpm ?? 70,
        dynamics: 'mezzo-piano (-12dB)',
      };
    case 'epic_swell':
      return {
        prompt: `Massive orchestral crescendo and climax on "${input.themeMelody}". Blasting trailer brass Braam, thunderous war taiko drums, ${instrumentsStr || 'soaring choir, full orchestra'}, epic Hans Zimmer style.`,
        tags: ['epic', 'crescendo', 'trailer', 'choir', 'brass', 'orchestral', 'climax'],
        suggestedBpm: input.bpm ?? 88,
        dynamics: 'fortissimo (0dB)',
      };
    case 'vacuum_silence':
      return {
        prompt: `Total vacuum of silence, single isolated sub-harmonic heartbeat pulse on "${input.themeMelody}".`,
        tags: ['silence', 'heartbeat', 'sub-bass', 'minimal'],
        suggestedBpm: input.bpm ?? 50,
        dynamics: 'silence (-inf dB)',
      };
  }
}

export interface MusicBridgeConfig {
  outputDir: string;
  engine?: 'suno' | 'udio';
  headless?: boolean;
  bridgeQueue?: BridgeQueue;
  bridgeUrl?: string;
  sourceStemsDir?: string;
  filmId?: string;
  shotId?: string;
  fetchFn?: typeof fetch;
}

export interface StemExtractionResult {
  status: 'stems_ready' | 'queued_on_bridge';
  engine: 'suno' | 'udio';
  theme: string;
  promptsPath: string;
  stems: Array<{ filename: string; path: string; role: string }>;
  bridgeJobIds?: string[];
  manifestPath: string;
}

function inferStemRole(filename: string): string {
  const lower = filename.toLowerCase();
  if (lower.includes('melody') || lower.includes('lead') || lower.includes('theme')) return 'melody';
  if (lower.includes('drone') || lower.includes('bass') || lower.includes('sub')) return 'sub_drone';
  if (lower.includes('perc') || lower.includes('drum') || lower.includes('taiko')) return 'percussion';
  return basename(filename, extname(filename));
}

export class MusicBridgeRunner {
  constructor(private config: MusicBridgeConfig) {}

  async generateAndExtractStems(params: {
    themeMelody: string;
    targetStates: MusicTensionState[];
    instruments?: string[];
    filmId?: string;
    shotId?: string;
  }): Promise<StemExtractionResult> {
    if (!params.themeMelody.trim()) {
      throw errValidation('themeMelody is required', 'provide a non-empty themeMelody');
    }
    if (!params.targetStates.length) {
      throw errValidation('targetStates must not be empty', 'pass at least one MusicTensionState');
    }

    const dir = resolve(this.config.outputDir);
    await mkdir(dir, { recursive: true });
    const engine = this.config.engine ?? 'udio';

    const compiledPrompts = params.targetStates.map((state) => ({
      state,
      ...compileMusicPrompt({
        themeMelody: params.themeMelody,
        state,
        instruments: params.instruments,
      }),
    }));

    const promptsPath = join(dir, 'music_prompts.json');
    await writeFile(
      promptsPath,
      JSON.stringify(
        {
          engine,
          theme: params.themeMelody,
          prompts: compiledPrompts,
          created_at: new Date().toISOString(),
        },
        null,
        2,
      ),
      'utf8',
    );

    // 1. Explicit verified audio stems on disk
    if (this.config.sourceStemsDir) {
      const stemsSrcDir = resolve(this.config.sourceStemsDir);
      let entries: string[];
      try {
        entries = (await readdir(stemsSrcDir))
          .filter((f) => {
            const ext = extname(f).toLowerCase();
            return ext === '.wav' || ext === '.mp3';
          })
          .sort();
      } catch {
        throw errValidation(
          `sourceStemsDir "${stemsSrcDir}" could not be read`,
          'provide an existing directory containing real .wav or .mp3 stem files',
        );
      }

      if (entries.length === 0) {
        throw errValidation(
          `no .wav or .mp3 stems found in "${stemsSrcDir}"`,
          'place real WAV/MP3 stem files in sourceStemsDir',
        );
      }

      // Probe every source stem first so corrupt/mock files fail before writing outputs
      for (const file of entries) {
        const srcPath = join(stemsSrcDir, file);
        const probe = await probeMedia(srcPath);
        if (!probe.exists || probe.error || !probe.hasAudio || probe.durationS <= 0) {
          throw errValidation(
            `invalid or corrupt stem audio file "${file}" (${probe.error ?? 'no_audio_stream'})`,
            'provide valid real WAV/MP3 audio stems in sourceStemsDir',
          );
        }
      }

      const stems: Array<{ filename: string; path: string; role: string }> = [];
      for (const file of entries) {
        const srcPath = join(stemsSrcDir, file);
        const outFilename = `${basename(file, extname(file))}.wav`;
        const destPath = join(dir, outFilename);
        const tmpPath = join(dir, `.tmp_${randomBytes(4).toString('hex')}_${outFilename}`);

        try {
          await execFileAsync(
            'ffmpeg',
            ['-y', '-nostdin', '-i', srcPath, '-vn', '-ar', '48000', '-c:a', 'pcm_s16le', tmpPath],
            { maxBuffer: 32 * 1024 * 1024 },
          );
          const outProbe = await probeMedia(tmpPath);
          if (!outProbe.exists || outProbe.error || !outProbe.hasAudio || outProbe.audioSampleRate !== 48000 || outProbe.durationS <= 0) {
            throw errValidation(
              `normalized stem "${outFilename}" failed 48kHz WAV verification`,
              'verify source stem audio integrity and retry',
            );
          }
          await rename(tmpPath, destPath);
        } catch (err) {
          await rm(tmpPath, { force: true }).catch(() => {});
          if (err instanceof Error && err.name === 'StudioError') throw err;
          throw errValidation(
            `failed to normalize stem "${file}" to 48kHz WAV: ${(err as Error).message}`,
            'ensure ffmpeg is installed and stem files are valid audio',
          );
        }

        stems.push({
          filename: outFilename,
          path: destPath,
          role: inferStemRole(outFilename),
        });
      }

      const manifestPath = join(dir, 'music_manifest.json');
      await writeFile(
        manifestPath,
        JSON.stringify(
          {
            status: 'stems_ready',
            engine,
            theme: params.themeMelody,
            targetStates: params.targetStates,
            promptsPath,
            stems,
            created_at: new Date().toISOString(),
          },
          null,
          2,
        ),
        'utf8',
      );

      return {
        status: 'stems_ready',
        engine,
        theme: params.themeMelody,
        promptsPath,
        stems,
        manifestPath,
      };
    }

    // 2. Real Chrome Bridge queue / HTTP dispatch
    if (this.config.bridgeQueue || this.config.bridgeUrl) {
      const filmId = (this.config.filmId ?? params.filmId ?? 'music_bridge_session').trim();
      const baseShotId = this.config.shotId ?? params.shotId;
      const bridgeJobIds: string[] = [];
      const fetchFn = this.config.fetchFn ?? globalThis.fetch.bind(globalThis);

      for (let idx = 0; idx < compiledPrompts.length; idx++) {
        const compiled = compiledPrompts[idx];
        const jobInput: BridgeJobInput = {
          target: 'aistudio_voice',
          film_id: filmId,
          shot_id: baseShotId ?? `music_${compiled.state}`,
          line_index: idx + 1,
          prompt: `${compiled.prompt}\nTags: ${compiled.tags.join(', ')} | BPM: ${compiled.suggestedBpm} | Dynamics: ${compiled.dynamics}`,
          model_hint: engine,
          metadata: {
            bridge: 'music_bridge',
            role: 'music_stem',
            tension_state: compiled.state,
            theme: params.themeMelody,
            tags: compiled.tags,
            suggested_bpm: compiled.suggestedBpm,
            dynamics: compiled.dynamics,
          },
        };

        if (this.config.bridgeQueue) {
          try {
            const job = this.config.bridgeQueue.enqueue(jobInput);
            bridgeJobIds.push(job.id);
          } catch (err) {
            if (err instanceof BridgeRequestError) {
              throw errValidation(err.message, 'pass safe filmId/shotId identifiers');
            }
            throw err;
          }
        } else {
          const endpoint = `${this.config.bridgeUrl!.replace(/\/+$/, '')}/bridge/jobs`;
          let res: Response;
          try {
            res = await fetchFn(endpoint, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(jobInput),
            });
          } catch (err) {
            throw errLaneDown(
              `Music bridge HTTP dispatch failed: ${(err as Error).message}`,
              'verify WebBridgeServer is running at bridgeUrl',
            );
          }
          const raw = await res.text();
          if (!res.ok) {
            throw errLaneDown(
              `Music bridge HTTP error (${res.status}): ${raw}`,
              'check WebBridgeServer /bridge/jobs payload requirements',
            );
          }
          let parsed: { job_id?: string; job?: { id?: string } };
          try {
            parsed = JSON.parse(raw) as { job_id?: string; job?: { id?: string } };
          } catch {
            throw errLaneDown(
              `Music bridge returned invalid JSON on HTTP ${res.status}`,
              'inspect WebBridgeServer /bridge/jobs response body',
            );
          }
          const jobId = parsed.job_id ?? parsed.job?.id;
          if (!jobId) {
            throw errLaneDown('Music bridge returned no job_id', 'inspect WebBridgeServer /bridge/jobs response');
          }
          bridgeJobIds.push(jobId);
        }
      }

      const manifestPath = join(dir, 'music_manifest.json');
      await writeFile(
        manifestPath,
        JSON.stringify(
          {
            status: 'queued_on_bridge',
            engine,
            theme: params.themeMelody,
            targetStates: params.targetStates,
            promptsPath,
            bridge_job_ids: bridgeJobIds,
            stems: [],
            created_at: new Date().toISOString(),
          },
          null,
          2,
        ),
        'utf8',
      );

      return {
        status: 'queued_on_bridge',
        engine,
        theme: params.themeMelody,
        promptsPath,
        stems: [],
        bridgeJobIds,
        manifestPath,
      };
    }

    // 3. No verified audio source or Chrome bridge -> refuse loudly (never synthesize placeholder bytes)
    throw errValidation(
      'no verified audio source or Chrome bridge configured — refusing to synthesize fake mock WAV files',
      'provide sourceStemsDir with real WAV stems or configure bridgeQueue/bridgeUrl',
    );
  }
}
