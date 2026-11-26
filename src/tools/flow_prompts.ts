// src/tools/flow_prompts.ts — Zero-API Google Flow (Nano Banana 2.5) & Google AI Studio prompt tools + bridge dispatch/status.
import { z } from 'zod';
import { readFile } from 'node:fs/promises';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { studioPaths, type StudioPaths } from '../store/paths.js';
import { initStudio, getActiveFilm } from '../store/studio.js';
import { filmMetaOrThrow } from '../store/film.js';
import {
  assetRefCheck,
  findAssetKindDir,
  formatBiologicalMarkersClause,
  readBiologicalMarkers,
  type AnatomyProfile,
} from '../store/asset.js';
import { sequenceGeo } from '../store/sequence.js';
import { shotShow, type CinematicsBlock } from '../store/shot.js';
import { errNotFound, errValidation } from '../errors.js';
import { assetTurnaroundPrompt, keyframePrompt } from './prompts.js';
import { composeH3Prompt } from './h3prompt.js';
import { guard, out } from './registry.js';
import { BridgeRequestError, getSharedBridgeQueue, type BridgeJob, type BridgeJobInput } from '../bridge/web_bridge_server.js';

const AI_STUDIO_PERSONAS = ['Charon', 'Fenrir', 'Aoede', 'Puck', 'Kore'] as const;
type AiStudioPersona = (typeof AI_STUDIO_PERSONAS)[number];
const AI_STUDIO_PERSONA_SET = new Set<string>(AI_STUDIO_PERSONAS);

const FILM_STOCKS = [
  'kodak_vision3_500t',
  'arri_alexa35_logc4',
  'fuji_eterna',
  'panavision_35mm',
  'tri_x_black_and_white',
  'cinestill_800t',
] as const;

const LENS_GLASSES = [
  'anamorphic_2x_oval_bokeh',
  'cooke_speed_panchro',
  'zeiss_master_prime',
  'leica_summilux',
  'vintage_super16',
] as const;

const LIGHTING_SETUPS = [
  'key_fill_4_to_1',
  'key_fill_2_to_1',
  'chiaroscuro_high_contrast',
  'rembrandt',
  'high_key_soft',
  'commercial_high_key',
  'packshot_rim_light',
  'beauty_softbox',
] as const;

const COLOR_TEMPS = [
  'tungsten_3200k',
  'golden_hour_2800k',
  'daylight_5600k',
  'overcast_6500k',
  'neon_mixed',
] as const;

const ATMOSPHERES = [
  'clean_air',
  'subtle_volumetric_haze',
  'heavy_fog',
  'dust_particulates',
  'rain_splatter',
] as const;

function assertSafeIdentifier(raw: string, field: string): string {
  const val = raw.trim();
  if (!val) {
    throw errValidation(`${field} is required`, `pass a valid ${field}`);
  }
  if (val.includes('..') || val.includes('/') || val.includes('\\') || val.includes('\0')) {
    throw errValidation(
      `invalid ${field} "${val}": path traversal characters are forbidden`,
      `pass a clean ${field} without path separators or ".."`,
    );
  }
  return val;
}

async function resolveFilmOrThrow(paths: StudioPaths, explicitFilmId?: string): Promise<string> {
  await initStudio(paths);
  const filmId = explicitFilmId !== undefined ? assertSafeIdentifier(explicitFilmId, 'film_id') : await getActiveFilm(paths);
  await filmMetaOrThrow(paths, filmId);
  return filmId;
}

function enqueueBridgeJobOrThrow(studioRoot: string, input: BridgeJobInput): BridgeJob {
  try {
    return getSharedBridgeQueue(studioRoot).enqueue(input);
  } catch (err) {
    if (err instanceof BridgeRequestError) {
      throw errValidation(err.message, 'pass clean alphanumeric/._- identifiers and non-empty prompt');
    }
    throw err;
  }
}

async function readOptionalFile(filePath: string): Promise<string | undefined> {
  try {
    const content = await readFile(filePath, 'utf8');
    return content.trim() || undefined;
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === 'ENOENT') return undefined;
    throw e;
  }
}

/**
 * Formats dialogue into a Reddington-cadence AI Studio performance script with phonetic [pause]/[breath] cues.
 */
function formatReddingtonDelivery(rawLine: string): string {
  const line = rawLine.trim();
  if (/\[pause\s*:/i.test(line) && /\[breath\]/i.test(line)) {
    return line;
  }
  if (/\[pause\s*:/i.test(line) || /\[breath\]/i.test(line)) {
    const hasBreath = /\[breath\]/i.test(line);
    const hasPause = /\[pause\s*:/i.test(line);
    return `${hasBreath ? '' : '[breath] '}${line}${hasPause ? '' : ' [pause: 800ms]'}`.trim();
  }

  // Split at sentence boundary to place a natural weaponized pause before the final beat
  const sentences = line.split(/(?<=[.!?])\s+/).filter(Boolean);
  if (sentences.length >= 2) {
    const head = sentences.slice(0, -1).join(' ');
    const tail = sentences[sentences.length - 1];
    return `${head} [pause: 800ms] [breath] ${tail}`;
  }
  return `[breath] ${line} [pause: 800ms]`;
}

export function registerFlowPromptTools(server: McpServer, studioRoot: string): void {
  const paths = studioPaths(studioRoot);

  server.tool(
    'flow_prompt_sheet',
    'Formulates a locked 3-panel character or creature turnaround prompt for Google Flow (Nano Banana 2.5, 4K, #e8e8e8) from a registered character dossier, with optional Chrome bridge dispatch at zero API cost.',
    {
      film_id: z.string().optional(),
      character_id: z.string(),
      anatomy_profile: z.enum(['humanoid', 'creature', 'hybrid']).optional(),
      dispatch_to_bridge: z.boolean().optional(),
    },
    async (a) =>
      guard(async () => {
        const charId = assertSafeIdentifier(a.character_id, 'character_id');
        const filmId = await resolveFilmOrThrow(paths, a.film_id);

        const kindDir = await findAssetKindDir(paths, filmId, charId);
        if (!kindDir) {
          throw errNotFound(
            `character "${charId}" is not registered`,
            'register it with asset_register (kind: "character") before building a Flow sheet prompt',
          );
        }
        if (kindDir !== 'characters') {
          throw errValidation(
            `asset "${charId}" is a ${kindDir} asset — flow_prompt_sheet requires a character`,
            'pass a character_id, or use flow_prompt_plate for locations',
          );
        }

        // Enforce character completeness law (descriptor.md + voice.md + acting.md)
        await assetRefCheck(paths, filmId, { assetId: charId, role: 'character' });

        const assetDir = paths.assetDir(filmId, 'characters', charId);
        const descriptor = (await readOptionalFile(`${assetDir}/descriptor.md`)) ?? '';
        const voiceText = (await readOptionalFile(`${assetDir}/voice.md`)) ?? '';
        const actingText = (await readOptionalFile(`${assetDir}/acting.md`)) ?? '';
        if (!descriptor || !voiceText || !actingText) {
          throw errValidation(
            `character "${charId}" has empty descriptor.md, voice.md, or acting.md`,
            're-register complete character blocks with asset_register before generating sheet prompt',
          );
        }

        const bio = await readBiologicalMarkers(assetDir);
        const bioClause = bio ? formatBiologicalMarkersClause(bio) : undefined;
        const fullDescriptor = bioClause ? `${descriptor} ${bioClause}` : descriptor;
        const anatomyProfile: AnatomyProfile = a.anatomy_profile ?? bio?.anatomyProfile ?? 'humanoid';
        const basePrompt = assetTurnaroundPrompt(fullDescriptor, anatomyProfile);

        const prompt = [
          basePrompt,
          `Acting Posture & Presence (acting.md): ${actingText}`,
          `Vocal Persona Metadata (voice.md): ${voiceText}`,
          'Production Target: Google Flow / Nano Banana 2.5 | Output Resolution: 3840x2160 (4K) | Aspect Ratio: 16:9 | Zero beauty filter, raw natural pore texture.',
        ].join('\n');

        const negativePrompt =
          anatomyProfile === 'creature'
            ? 'glowing LED eyes, neon eyes, uniform glossy rubber slime, background crowd limbs, floating extra claws, background scenery, text, watermarks, logos, anatomy drift'
            : 'second face on center figure, head on center torso, duplicate face, beauty retouch, plastic airbrushed skin, dramatic directional shadows, background scenery, unrequested props, text, watermarks, logos, cropped limbs, wardrobe drift';

        const queue = getSharedBridgeQueue(studioRoot);
        let job: BridgeJob | undefined;
        if (a.dispatch_to_bridge) {
          job = enqueueBridgeJobOrThrow(studioRoot, {
            target: 'flow_sheet',
            film_id: filmId,
            asset_id: charId,
            prompt,
            negative_prompt: negativePrompt,
            model_hint: 'Nano Banana 2.5',
            aspect_ratio: '16:9',
            metadata: { target_resolution: '3840x2160 (4K)' },
          });
        }

        const status = queue.getStatus();
        return out({
          film_id: filmId,
          character_id: charId,
          prompt,
          negative_prompt: negativePrompt,
          model_hint: 'Nano Banana 2.5',
          target_resolution: '3840x2160 (4K)',
          target_aspect_ratio: '16:9',
          ...(job ? { bridge_job_id: job.id } : {}),
          bridge_connected: status.connectedClients > 0,
          manual_instructions: `Open https://flow.google (select Nano Banana 2.5, 16:9, 4K), paste the prompt (and negative constraints if available), download the generated PNG, then attach it at zero API cost via asset_image(film_id="${filmId}", asset_id="${charId}", image_path="<downloaded_png_path>") or upload it via the Frontier Flow Bridge popup.`,
        });
      }),
  );

  server.tool(
    'flow_prompt_plate',
    'Formulates a Panavision C-Series 2.39:1 motivated-light master location plate prompt for Google Flow (Nano Banana 2.5, 4K) from registered location descriptor and geo_block.md, with optional Chrome bridge dispatch.',
    {
      film_id: z.string().optional(),
      location_id: z.string(),
      light_statement: z.string(),
      sequence: z.string().optional(),
      cinematics: z
        .object({
          film_stock: z.enum(FILM_STOCKS).optional(),
          lens_glass: z.enum(LENS_GLASSES).optional(),
          lighting_setup: z.enum(LIGHTING_SETUPS).optional(),
          color_temp: z.enum(COLOR_TEMPS).optional(),
          atmosphere: z.enum(ATMOSPHERES).optional(),
        })
        .optional(),
      dispatch_to_bridge: z.boolean().optional(),
    },
    async (a) =>
      guard(async () => {
        const locId = assertSafeIdentifier(a.location_id, 'location_id');
        const filmId = await resolveFilmOrThrow(paths, a.film_id);

        const kindDir = await findAssetKindDir(paths, filmId, locId);
        if (!kindDir) {
          throw errNotFound(
            `location "${locId}" is not registered`,
            'register it with asset_register (kind: "location") before building a Flow plate prompt',
          );
        }
        if (kindDir !== 'locations' && kindDir !== 'styles') {
          throw errValidation(
            `asset "${locId}" is a ${kindDir} asset — flow_prompt_plate builds location or style plates only`,
            'pass a location_id or style asset_id, or use flow_prompt_sheet for characters',
          );
        }

        const assetDir = paths.assetDir(filmId, kindDir, locId);
        const descriptor = await readOptionalFile(`${assetDir}/descriptor.md`);
        if (!descriptor) {
          throw errValidation(`location "${locId}" has an empty descriptor.md`, 're-register location descriptor');
        }

        let geoBlock = await readOptionalFile(`${assetDir}/geo_block.md`);
        if (!geoBlock && a.sequence) {
          geoBlock = await sequenceGeo(paths, filmId, assertSafeIdentifier(a.sequence, 'sequence'));
        }

        const cinematics: CinematicsBlock | undefined = a.cinematics
          ? {
              ...(a.cinematics.film_stock ? { filmStock: a.cinematics.film_stock } : {}),
              ...(a.cinematics.lens_glass ? { lensGlass: a.cinematics.lens_glass } : {}),
              ...(a.cinematics.lighting_setup ? { lightingSetup: a.cinematics.lighting_setup } : {}),
              ...(a.cinematics.color_temp ? { colorTemp: a.cinematics.color_temp } : {}),
              ...(a.cinematics.atmosphere ? { atmosphere: a.cinematics.atmosphere } : {}),
            }
          : undefined;

        const basePrompt = keyframePrompt({
          descriptor,
          lightStatement: a.light_statement,
          geoBlock,
          cinematics,
        });

        const prompt = [
          basePrompt,
          'Optical Format: Panavision C-Series anamorphic 2.39:1 widescreen master plate, oval specular bokeh, natural horizontal optical flare falloff, Kodak photochemical emulsion grain.',
          'Production Target: Google Flow / Nano Banana 2.5 | Resolution: 3840x2160 (4K) | Aspect Ratio: 2.39:1 Anamorphic Scope.',
        ].join('\n');

        const negativePrompt =
          'flat frontal wall, two suns, conflicting shadow directions, plastic CGI surface, digital oversharpening, unrequested people, text, watermarks, logos, split frames';

        const queue = getSharedBridgeQueue(studioRoot);
        let job: BridgeJob | undefined;
        if (a.dispatch_to_bridge) {
          job = enqueueBridgeJobOrThrow(studioRoot, {
            target: 'flow_plate',
            film_id: filmId,
            asset_id: locId,
            prompt,
            negative_prompt: negativePrompt,
            model_hint: 'Nano Banana 2.5',
            aspect_ratio: '2.39:1',
            metadata: {
              target_resolution: '3840x2160 (4K)',
              ...(kindDir === 'styles' ? { asset_kind: 'styles' } : {}),
            },
          });
        }

        const status = queue.getStatus();
        return out({
          film_id: filmId,
          location_id: locId,
          prompt,
          negative_prompt: negativePrompt,
          model_hint: 'Nano Banana 2.5',
          target_resolution: '3840x2160 (4K)',
          target_aspect_ratio: '2.39:1',
          ...(job ? { bridge_job_id: job.id } : {}),
          bridge_connected: status.connectedClients > 0,
          manual_instructions: `Open https://flow.google (Nano Banana 2.5, 2.39:1 / 21:9 widescreen, 4K), paste the prompt, download the generated PNG plate, then attach it at zero API cost via asset_image(film_id="${filmId}", asset_id="${locId}", image_path="<downloaded_png_path>") or upload it via the Frontier Flow Bridge popup.`,
        });
      }),
  );

  server.tool(
    'studio_prompt_dialogue',
    'Compiles a Reddington-cadence phonetic speech performance prompt for Google AI Studio (Charon/Fenrir/Aoede/Puck/Kore) from a shot dialogue line and character voice/acting blocks, with optional Chrome bridge dispatch.',
    {
      film_id: z.string().optional(),
      shot_id: z.string(),
      line_index: z.number().int().min(1).optional(),
      voice_persona: z.enum(AI_STUDIO_PERSONAS).optional(),
      acting_notes: z.string().optional(),
      dispatch_to_bridge: z.boolean().optional(),
    },
    async (a) =>
      guard(async () => {
        const shotId = assertSafeIdentifier(a.shot_id, 'shot_id');
        const filmId = await resolveFilmOrThrow(paths, a.film_id);
        const shot = await shotShow(paths, filmId, shotId);

        const dialogueList = shot.audioBlock?.dialogue ?? [];
        if (dialogueList.length === 0) {
          throw errValidation(
            `shot "${shotId}" has no dialogue lines in its audio_block`,
            'add dialogue lines with shot_update before calling studio_prompt_dialogue',
          );
        }

        const lineIdx = a.line_index ?? 1;
        if (lineIdx < 1 || lineIdx > dialogueList.length) {
          throw errValidation(
            `line_index ${lineIdx} out of range (shot "${shotId}" has ${dialogueList.length} dialogue line(s))`,
            `pass line_index between 1 and ${dialogueList.length}`,
          );
        }

        const item = dialogueList[lineIdx - 1];
        if (typeof item.line !== 'string' || !item.line.trim()) {
          throw errValidation(
            `shot "${shotId}" dialogue line ${lineIdx} is empty`,
            'update the dialogue line text with shot_update before calling studio_prompt_dialogue',
          );
        }
        const voiceRef = item.voiceRef ? assertSafeIdentifier(item.voiceRef, 'voice_ref') : undefined;

        let voiceDesc: string | undefined;
        let actingDesc: string | undefined;
        let profilePersona: AiStudioPersona | undefined;

        if (voiceRef) {
          const charDir = paths.assetDir(filmId, 'characters', voiceRef);
          voiceDesc = await readOptionalFile(`${charDir}/voice.md`);
          actingDesc = await readOptionalFile(`${charDir}/acting.md`);
          const profRaw = await readOptionalFile(`${charDir}/voice_profile.json`);
          if (profRaw) {
            try {
              const prof = JSON.parse(profRaw) as { voiceId?: string };
              if (prof.voiceId && AI_STUDIO_PERSONA_SET.has(prof.voiceId)) {
                profilePersona = prof.voiceId as AiStudioPersona;
              }
            } catch {
              // Ignore malformed optional voice_profile.json
            }
          }
        }

        const persona: AiStudioPersona = a.voice_persona ?? profilePersona ?? 'Charon';
        const annotatedLine = formatReddingtonDelivery(item.line);

        const promptLines = [
          'Google AI Studio Speech Performance Directive (Reddington Weaponized Subtext Standard)',
          `Voice Persona: ${persona}`,
          ...(voiceRef ? [`Speaking Character: ${voiceRef}`] : []),
          ...(voiceDesc ? [`Vocal Timbre & Cadence (voice.md): ${voiceDesc}`] : []),
          ...(actingDesc ? [`Subtext & Physical Behavior (acting.md): ${actingDesc}`] : []),
          ...(a.acting_notes?.trim() ? [`Director Performance Note: ${a.acting_notes.trim()}`] : []),
          'Delivery Law: Unhurried, chilling stillness with lethal precision. Zero announcer cadence, zero rushing. Honor every [breath] and [pause: 800ms] marker literally.',
          `Original Line: ${item.line}`,
          `Perform Exact Script:\n${annotatedLine}`,
        ];
        const prompt = promptLines.join('\n');

        const queue = getSharedBridgeQueue(studioRoot);
        let job: BridgeJob | undefined;
        if (a.dispatch_to_bridge) {
          job = enqueueBridgeJobOrThrow(studioRoot, {
            target: 'aistudio_voice',
            film_id: filmId,
            shot_id: shotId,
            line_index: lineIdx,
            voice_persona: persona,
            prompt,
            model_hint: 'Google AI Studio Speech',
            metadata: {
              voice_ref: voiceRef ?? null,
              raw_line: item.line,
              annotated_line: annotatedLine,
            },
          });
        }

        const status = queue.getStatus();
        return out({
          film_id: filmId,
          shot_id: shotId,
          line_index: lineIdx,
          voice_ref: voiceRef ?? null,
          voice_persona: persona,
          raw_line: item.line,
          annotated_line: annotatedLine,
          prompt,
          ...(job ? { bridge_job_id: job.id } : {}),
          bridge_connected: status.connectedClients > 0,
          manual_instructions: `Open https://aistudio.google.com (Generate Speech / Native Audio), select voice persona "${persona}", paste the Perform Exact Script text, generate & download the audio capture, then import it at zero API cost via dialogue_import(film_id="${filmId}", shot_id="${shotId}", line_index=${lineIdx}, source_audio_path="<downloaded_audio_path>") or upload via the Frontier Flow Bridge popup.`,
        });
      }),
  );

  server.tool(
    'bridge_status',
    'Reports live frontier-flow-bridge Chrome extension connection count, pending/claimed/completed job counts, and setup instructions if disconnected.',
    {},
    async () =>
      guard(async () => {
        const queue = getSharedBridgeQueue(studioRoot);
        const status = queue.getStatus();
        const connected = status.connectedClients > 0;
        return out({
          status: status.status,
          bridge_connected: connected,
          connected_clients: status.connectedClients,
          pending_tasks: status.pendingTasks,
          claimed_tasks: status.claimedTasks,
          completed_tasks: status.completedTasks,
          failed_tasks: status.failedTasks,
          last_heartbeat_at: status.lastHeartbeatAt,
          setup_instructions: connected
            ? 'Chrome extension frontier-flow-bridge is online and actively polling.'
            : 'Extension offline. Open chrome://extensions in Chrome, enable Developer Mode, click "Load unpacked", and select the repo extension/ directory. Set Bridge URL to http://127.0.0.1:8081 (local stdio) or your VPS :8080 / :3000 URL.',
        });
      }),
  );

  server.tool(
    'bridge_job_result',
    'Polls the status and saved artifact path of a queued Chrome bridge job (flow_sheet, flow_plate, or aistudio_voice) without blocking.',
    {
      job_id: z.string(),
    },
    async (a) =>
      guard(async () => {
        const jobId = assertSafeIdentifier(a.job_id, 'job_id');
        const queue = getSharedBridgeQueue(studioRoot);
        let job: BridgeJob | undefined;
        try {
          job = queue.getJob(jobId);
        } catch (err) {
          if (err instanceof BridgeRequestError) {
            throw errValidation(err.message, 'pass a valid bridge job_id');
          }
          throw err;
        }
        if (!job) {
          throw errNotFound(
            `bridge job "${jobId}" not found`,
            'queue a job first with dispatch_to_bridge: true on flow_prompt_sheet, flow_prompt_plate, or studio_prompt_dialogue',
          );
        }
        return out({
          job_id: job.id,
          status: job.status,
          target: job.target,
          film_id: job.film_id,
          ...(job.asset_id ? { asset_id: job.asset_id } : {}),
          ...(job.shot_id ? { shot_id: job.shot_id } : {}),
          ...(job.line_index !== undefined ? { line_index: job.line_index } : {}),
          output_path: job.output_path ?? null,
          ...(job.artifact_url ? { artifact_url: job.artifact_url } : {}),
          ...(job.width !== undefined ? { width: job.width } : {}),
          ...(job.height !== undefined ? { height: job.height } : {}),
          ...(job.sample_rate_hz !== undefined ? { sample_rate_hz: job.sample_rate_hz } : {}),
          ...(job.duration_s !== undefined ? { duration_s: job.duration_s } : {}),
          ...(job.error ? { error: job.error } : {}),
        });
      }),
  );

  server.tool(
    'flow_prompt_video',
    'Compiles a zero-API Veo/Flow video generation prompt from a registered shot (with sequence/location geo_block, stripped TTS dialogue tags, and sheet/plate attach paths) with optional flow_video Chrome bridge dispatch.',
    {
      film_id: z.string().optional(),
      shot_id: z.string(),
      model_hint: z.string().optional(),
      dispatch_to_bridge: z.boolean().optional(),
    },
    async (a) =>
      guard(async () => {
        const shotId = assertSafeIdentifier(a.shot_id, 'shot_id');
        const filmId = await resolveFilmOrThrow(paths, a.film_id);
        const shot = await shotShow(paths, filmId, shotId);

        const attachPaths: string[] = [];
        const dialogue: Array<{ voiceRef: string; voiceDescriptor: string; line: string }> = [];
        for (const ref of shot.refs ?? []) {
          if (ref.role === 'character') {
            attachPaths.push(paths.assetDir(filmId, 'characters', ref.assetId) + '/sheet.png');
          } else if (ref.role === 'location') {
            attachPaths.push(paths.assetDir(filmId, 'locations', ref.assetId) + '/plate.png');
          }
        }
        for (const d of shot.audioBlock.dialogue ?? []) {
          if (!d.voiceRef) continue;
          const voice = (await readOptionalFile(`${paths.assetDir(filmId, 'characters', d.voiceRef)}/voice.md`)) ?? '';
          dialogue.push({ voiceRef: d.voiceRef, voiceDescriptor: voice, line: d.line });
        }

        let geoBlock = await sequenceGeo(paths, filmId, shot.sequence);
        if (!geoBlock) {
          const loc = shot.refs.find((r) => r.role === 'location');
          if (loc) {
            geoBlock = await readOptionalFile(`${paths.assetDir(filmId, 'locations', loc.assetId)}/geo_block.md`);
          }
          geoBlock = geoBlock ?? shot.geoBlock;
        }

        const prompt = composeH3Prompt({
          action: shot.action ?? '',
          camera: shot.camera,
          cinematics: shot.cinematics,
          geoBlock,
          dialogue,
          sfx: shot.audioBlock.sfx,
          durationS: shot.durationS ?? 5,
          platePresents: attachPaths.length > 0,
        });

        const queue = getSharedBridgeQueue(studioRoot);
        let job: BridgeJob | undefined;
        if (a.dispatch_to_bridge) {
          job = enqueueBridgeJobOrThrow(studioRoot, {
            target: 'flow_video',
            film_id: filmId,
            shot_id: shotId,
            prompt,
            model_hint: a.model_hint ?? 'Veo 3.1',
            aspect_ratio: shot.aspectRatio ?? '16:9',
            metadata: { duration_s: shot.durationS ?? 5, attach_paths: attachPaths },
          });
        }

        return out({
          film_id: filmId,
          shot_id: shotId,
          prompt,
          duration_s: shot.durationS ?? 5,
          aspect_ratio: shot.aspectRatio ?? '16:9',
          attach_paths: attachPaths,
          ...(job ? { bridge_job_id: job.id } : {}),
          bridge_connected: queue.getStatus().connectedClients > 0,
        });
      }),
  );
}
