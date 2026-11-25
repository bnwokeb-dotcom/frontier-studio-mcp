// src/continuity/intelligence.ts — Lumina / Seedance 2.5 Continuity Intelligence, Shot Table Paper-Render & Dual-Anchor Voice Lock
import { randomBytes } from 'node:crypto';
import { readFile, rename, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { errNotFound, errValidation } from '../errors.js';
import type { BiologicalMarkers } from '../store/asset.js';
import { ensureDir, readJson, writeJsonAtomic } from '../store/fs.js';
import type { StudioPaths } from '../store/paths.js';
import { ingestAndNormalizeAudio } from '../tools/audio.js';

export type ContinuationRelation =
  | 'standalone'
  | 'sequence_first_clip'
  | 'seamless_continuation'
  | 'intentional_next_shot'
  | 'bridge_between_known_states'
  | 'repair_tail'
  | 'reanchor_after_drift';

export type ClipReviewStatus =
  | 'planned'
  | 'generated'
  | 'accepted'
  | 'accepted_with_deviation'
  | 'repair'
  | 'rejected';

export interface NarrativeDirectorRead {
  lane: 'narrative';
  dramatic_function: string;
  turn: string;
  pov: string;
  power_shift: string;
  hidden_objective: string;
  obstacle_tactic: string;
  suppressed_behavior: string;
  non_transferable_detail: string;
  value_before: string;
  value_after: string;
}

export interface NonNarrativeDirectorRead {
  lane: 'non_narrative';
  utility_intent: string;
  non_narrative_refusal: string;
}

export type DirectorRead = NarrativeDirectorRead | NonNarrativeDirectorRead;

export interface ShotTableRow {
  shot_id: string;
  camera_side: string;
  in_frame: string;
  eyeline: string;
  action: string;
  others_idle_business: string;
  light_lock: string;
  last_frame: string;
  speaker_id?: string;
}

export interface ShotTablePlan {
  floor_plan: string;
  rows: ShotTableRow[];
}

export interface SequenceClipState {
  clip_id: string;
  sequence_index: number;
  beat_id: string;
  parent_clip_id: string | null;
  status: ClipReviewStatus;
  extension_depth: number;
  anchor_mode: 'canonical' | 'tail_frame' | 'first_last_bridge';
  relation: ContinuationRelation;
  planned_end_state: string;
  observed_end_state: Record<string, unknown> | null;
  dialogue_spoken?: string[];
  notes?: string;
}

export interface SequenceProjectState {
  film_id: string;
  sequence_id: string;
  story_objective: string;
  final_story_outcome: string;
  max_chain_depth: number;
  canonical_characters: string[];
  canonical_location: string;
  completed_beats: string[];
  reserved_future_beats: string[];
  clips: SequenceClipState[];
  updated_at: string;
}

export interface ReferenceBinding {
  tag: string;
  role: 'identity' | 'camera_rhythm_only' | 'environment' | 'voice_timbre' | 'tempo_only' | 'first_frame' | 'last_frame';
  ignore: string[];
}

const DEFAULT_TRAPS_EN = [
  'his face fell',
  'her face fell',
  'the smile goes',
  'the smile went',
  'a look that could',
  'his face darkens',
  'her face darkens',
  'the air freezes',
  'time stands still',
  'nothing else in the frame moves',
  'stay still for the whole shot',
  'does not move',
  'nobody moves',
];

const COMPETING_LARGE_ACTION_PATTERN = /\b(simultaneously|both walk|everyone runs|all characters fight|meanwhile .* runs across)\b/i;

export async function loadDirectionTraps(dataDir?: string): Promise<string[]> {
  const candidates = [
    ...(dataDir ? [join(dataDir, 'direction_traps.json')] : []),
    join(process.cwd(), 'data', 'direction_traps.json'),
    join(process.cwd(), 'clones', 'seedance-2.0', 'data', 'direction-traps.json'),
  ];
  for (const p of candidates) {
    try {
      const raw = await readFile(p, 'utf8');
      const parsed = JSON.parse(raw) as { traps?: { en?: string[] } };
      if (Array.isArray(parsed.traps?.en) && parsed.traps.en.length > 0) {
        return parsed.traps.en;
      }
    } catch {
      // try next source
    }
  }
  return DEFAULT_TRAPS_EN;
}

/**
 * Validates Director's Read completeness before shot compilation.
 */
export function validateDirectorRead(read: DirectorRead): { valid: true } {
  if (read.lane === 'narrative') {
    const required: Array<keyof NarrativeDirectorRead> = [
      'dramatic_function',
      'turn',
      'pov',
      'power_shift',
      'hidden_objective',
      'obstacle_tactic',
      'suppressed_behavior',
      'non_transferable_detail',
      'value_before',
      'value_after',
    ];
    for (const field of required) {
      if (!String(read[field] ?? '').trim()) {
        throw errValidation(
          `Director's Read missing required narrative field "${field}"`,
          'complete all 10 narrative fields before compiling shots so the dramatic turn is explicit',
        );
      }
    }
    return { valid: true };
  }

  if (!read.utility_intent?.trim() || !read.non_narrative_refusal?.trim()) {
    throw errValidation(
      'non-narrative Director\'s Read requires utility_intent and non_narrative_refusal',
      'specify what the viewer must experience and what invented drama is refused',
    );
  }
  return { valid: true };
}

/**
 * Paper-renders and validates geometric continuity across a multi-shot/multi-character table
 * using Seedance/Lumina's Shot Table law, Three-Tier Action Hierarchy, and Direction Traps lint.
 */
export async function validateShotTable(
  plan: ShotTablePlan,
  customTraps?: string[],
): Promise<{
  passed: boolean;
  violations: string[];
  warnings: string[];
  rowCount: number;
}> {
  const traps = customTraps ?? (await loadDirectionTraps());
  const violations: string[] = [];
  const warnings: string[] = [];

  if (!plan.floor_plan?.trim() || plan.floor_plan.trim().length < 20) {
    violations.push('Floor plan header is missing or too vague (< 20 chars) — name room landmarks, axes, and light direction first.');
  }

  if (!plan.rows || plan.rows.length === 0) {
    violations.push('Shot table contains 0 rows — define at least one shot row.');
    return { passed: false, violations, warnings, rowCount: 0 };
  }

  const BLANK_SENTINELS = new Set(['default', 'wherever', 'as before', 'n/a', 'same', 'tbd']);
  const firstLight = plan.rows[0].light_lock.trim().toLowerCase();

  for (const row of plan.rows) {
    const fields: Array<[string, string]> = [
      ['camera_side', row.camera_side],
      ['in_frame', row.in_frame],
      ['eyeline', row.eyeline],
      ['action', row.action],
      ['others_idle_business', row.others_idle_business],
      ['light_lock', row.light_lock],
      ['last_frame', row.last_frame],
    ];

    for (const [col, val] of fields) {
      const clean = (val ?? '').trim();
      if (!clean || BLANK_SENTINELS.has(clean.toLowerCase())) {
        violations.push(`Shot "${row.shot_id}" cell "${col}" is blank or a placeholder sentinel ("${clean}")`);
      }
    }

    const rowText = `${row.action} ${row.others_idle_business}`.toLowerCase();
    for (const trap of traps) {
      if (rowText.includes(trap.toLowerCase())) {
        violations.push(`Shot "${row.shot_id}" triggers direction trap "${trap}" — rewrite using a plain feeling + physical anchor and live idle business.`);
      }
    }

    if (COMPETING_LARGE_ACTION_PATTERN.test(row.action)) {
      violations.push(`Shot "${row.shot_id}" violates Three-Tier Action Hierarchy (multiple large competing actions in one shot). Split actions across shots.`);
    }

    if (firstLight && row.light_lock.trim() && row.light_lock.trim().toLowerCase() !== firstLight) {
      warnings.push(`Shot "${row.shot_id}" changed light_lock wording from Row 1 ("${plan.rows[0].light_lock}") — verify motivated transition.`);
    }
  }

  return {
    passed: violations.length === 0,
    violations,
    warnings,
    rowCount: plan.rows.length,
  };
}

/**
 * Extracts verbatim @tag mentions (e.g., @char_corvus, @Image1, @Video1, @Audio1)
 * and builds explicit role-isolation Transfer & Ignore contracts.
 */
export function buildReferenceTransferContract(
  prompt: string,
  bindings: ReferenceBinding[] = [],
): {
  extractedTags: string[];
  contractLines: string[];
  compiledPrompt: string;
} {
  const tagMatches = prompt.match(/@[A-Za-z0-9_.-]+/g) ?? [];
  const extractedTags = Array.from(new Set(tagMatches));

  const bindingMap = new Map(bindings.map((b) => [b.tag, b]));
  const contractLines: string[] = [];

  for (const tag of extractedTags) {
    const binding = bindingMap.get(tag);
    if (binding) {
      const roleLabel = binding.role === 'camera_rhythm_only' ? 'camera_rhythm_only' : binding.role;
      const ignoreClause = binding.ignore.length > 0 ? `; ignore ${binding.ignore.join(', ')} from that reference` : '';
      const suffix = binding.role.endsWith('_only') ? '' : ' only';
      contractLines.push(`${binding.tag} controls ${roleLabel}${suffix}${ignoreClause}.`);
    } else if (/^@Video/i.test(tag)) {
      contractLines.push(`${tag} controls camera_rhythm_only; ignore identity, wardrobe, logo, and room from that reference.`);
    } else if (/^@Audio/i.test(tag)) {
      contractLines.push(`${tag} controls voice_timbre and tempo_only; ignore background ambience bleed.`);
    } else {
      contractLines.push(`${tag} anchors canonical identity and wardrobe verbatim.`);
    }
  }

  // Also include explicit bindings whose tag wasn't inline yet
  for (const b of bindings) {
    if (!extractedTags.includes(b.tag)) {
      extractedTags.push(b.tag);
      const ignoreClause = b.ignore.length > 0 ? `; ignore ${b.ignore.join(', ')} from that reference` : '';
      contractLines.push(`${b.tag} controls ${b.role} only${ignoreClause}.`);
    }
  }

  const compiledPrompt =
    contractLines.length > 0
      ? `${prompt.trim()}\n\nReference Transfer Contracts:\n${contractLines.map((l) => `- ${l}`).join('\n')}`
      : prompt.trim();

  return {
    extractedTags,
    contractLines,
    compiledPrompt,
  };
}

export function sequenceStatePath(paths: StudioPaths, filmId: string, sequenceId: string): string {
  return join(paths.filmDir(filmId), 'sequences', `${sequenceId}_state.json`);
}

export async function readSequenceState(
  paths: StudioPaths,
  filmId: string,
  sequenceId: string,
): Promise<SequenceProjectState | null> {
  try {
    return await readJson<SequenceProjectState>(sequenceStatePath(paths, filmId, sequenceId));
  } catch (e) {
    if ((e as { code?: string }).code === 'NOT_FOUND' || (e as NodeJS.ErrnoException).code === 'ENOENT') {
      return null;
    }
    throw e;
  }
}

export async function saveSequenceState(
  paths: StudioPaths,
  state: SequenceProjectState,
): Promise<string> {
  const filePath = sequenceStatePath(paths, state.film_id, state.sequence_id);
  await ensureDir(join(paths.filmDir(state.film_id), 'sequences'));
  const next: SequenceProjectState = {
    ...state,
    max_chain_depth: Math.max(1, Math.min(3, state.max_chain_depth || 2)),
    updated_at: new Date().toISOString(),
  };
  await writeJsonAtomic(filePath, next);
  return filePath;
}

/**
 * Evaluates next-shot continuity against canonical state, parent take acceptance,
 * observed end-state overrides, and extension chain depth cap (auto re-anchor after depth >= max_chain_depth).
 */
export function planNextClipContinuity(
  state: SequenceProjectState,
  targetClipId: string,
): {
  clip_id: string;
  relation: ContinuationRelation;
  anchor_mode: 'canonical' | 'tail_frame' | 'first_last_bridge';
  parent_clip_id: string | null;
  must_reanchor: boolean;
  opening_state: Record<string, unknown> | null;
  excluded_completed_beats: string[];
  excluded_future_beats: string[];
  directive: string;
} {
  const idx = state.clips.findIndex((c) => c.clip_id === targetClipId);
  if (idx === -1) {
    throw errNotFound(`clip "${targetClipId}" not found in sequence "${state.sequence_id}"`, 'register it via sequence_state_plan first');
  }

  const clip = state.clips[idx];
  const maxDepth = Math.max(1, Math.min(3, state.max_chain_depth || 2));
  const excludedCompleted = state.clips
    .slice(0, idx)
    .filter((c) => c.status === 'accepted' || c.status === 'accepted_with_deviation')
    .map((c) => c.beat_id);
  const excludedFuture = state.clips.slice(idx + 1).map((c) => c.beat_id);

  if (idx === 0 || !clip.parent_clip_id || clip.relation === 'sequence_first_clip' || clip.relation === 'reanchor_after_drift') {
    return {
      clip_id: clip.clip_id,
      relation: idx === 0 ? 'sequence_first_clip' : 'reanchor_after_drift',
      anchor_mode: 'canonical',
      parent_clip_id: null,
      must_reanchor: true,
      opening_state: null,
      excluded_completed_beats: excludedCompleted,
      excluded_future_beats: excludedFuture,
      directive: `Open clip "${clip.clip_id}" from canonical references (${state.canonical_characters.join(', ')} @ ${state.canonical_location}). Extension depth resets to 0.`,
    };
  }

  const parent = state.clips.find((c) => c.clip_id === clip.parent_clip_id);
  if (!parent) {
    throw errValidation(`parent clip "${clip.parent_clip_id}" missing from sequence state`, 'pass a valid parent_clip_id');
  }

  if (parent.status === 'rejected' || parent.status === 'repair') {
    throw errValidation(
      `cannot continue from parent clip "${parent.clip_id}" with status "${parent.status}"`,
      'rejected or repair-pending takes never update canon — accept a valid take or re-anchor to canonical refs',
    );
  }

  const parentAccepted = parent.status === 'accepted' || parent.status === 'accepted_with_deviation';
  if (clip.relation === 'seamless_continuation' && (!parentAccepted || !parent.observed_end_state)) {
    throw errValidation(
      `seamless continuation for "${clip.clip_id}" blocked: predecessor "${parent.clip_id}" lacks accepted observed_end_state`,
      'review and accept parent take with observed_end_state via sequence_take_record before chaining',
    );
  }

  const nextDepth = parent.extension_depth + 1;
  const mustReanchor = nextDepth > maxDepth || clip.relation === 'intentional_next_shot';

  return {
    clip_id: clip.clip_id,
    relation: mustReanchor && nextDepth > maxDepth ? 'reanchor_after_drift' : clip.relation,
    anchor_mode: mustReanchor ? 'canonical' : 'tail_frame',
    parent_clip_id: parent.clip_id,
    must_reanchor: mustReanchor,
    opening_state: parent.observed_end_state,
    excluded_completed_beats: excludedCompleted,
    excluded_future_beats: excludedFuture,
    directive: mustReanchor
      ? `SCHEDULED RE-ANCHOR (depth ${nextDepth} > cap ${maxDepth} or intentional cut): Reset to canonical character sheets & locked location plate so facial/wardrobe identity stays 100% locked while carrying observed state.`
      : `SEAMLESS CONTINUATION (depth ${nextDepth}/${maxDepth}): Chain from accepted tail frame of "${parent.clip_id}" inheriting observed_end_state (never replay completed beat "${parent.beat_id}").`,
  };
}

/**
 * Records take review verdict onto sequence state so accepted deviations update canon
 * while rejected takes stay isolated and never corrupt future shots.
 */
export async function recordSequenceTakeDecision(
  paths: StudioPaths,
  input: {
    film_id: string;
    sequence_id: string;
    clip_id: string;
    verdict: 'accept' | 'accept_with_deviation' | 'repair' | 'reject';
    observed_end_state?: Record<string, unknown>;
    notes?: string;
  },
): Promise<SequenceProjectState> {
  const state = await readSequenceState(paths, input.film_id, input.sequence_id);
  if (!state) {
    throw errNotFound(`sequence state "${input.sequence_id}" not found for film "${input.film_id}"`, 'run sequence_state_plan first');
  }

  const clip = state.clips.find((c) => c.clip_id === input.clip_id);
  if (!clip) {
    throw errNotFound(`clip "${input.clip_id}" not found in sequence "${input.sequence_id}"`, 'verify clip_id');
  }

  const statusMap: Record<typeof input.verdict, ClipReviewStatus> = {
    accept: 'accepted',
    accept_with_deviation: 'accepted_with_deviation',
    repair: 'repair',
    reject: 'rejected',
  };
  const nextStatus = statusMap[input.verdict];

  if (nextStatus === 'accepted' || nextStatus === 'accepted_with_deviation') {
    if (!input.observed_end_state || Object.keys(input.observed_end_state).length === 0) {
      throw errValidation(
        'accepted take requires non-empty observed_end_state',
        'record visible character positions, facing, pose, and lighting at clip end',
      );
    }
    clip.observed_end_state = input.observed_end_state;
    if (!state.completed_beats.includes(clip.beat_id)) {
      state.completed_beats.push(clip.beat_id);
    }
    state.reserved_future_beats = state.reserved_future_beats.filter((b) => b !== clip.beat_id);
    // Compute chain depth cleanly from parent
    if (clip.parent_clip_id) {
      const parent = state.clips.find((c) => c.clip_id === clip.parent_clip_id);
      clip.extension_depth = clip.anchor_mode === 'canonical' ? 0 : (parent?.extension_depth ?? 0) + 1;
    } else {
      clip.extension_depth = 0;
    }
  } else {
    clip.observed_end_state = null;
  }

  clip.status = nextStatus;
  if (input.notes) clip.notes = input.notes;

  await saveSequenceState(paths, state);
  return state;
}

export interface CharacterVoiceProfile {
  character_id: string;
  voiceId: string | null;
  provider: 'google' | 'elevenlabs';
  pitch?: number;
  speed?: number;
  timbre?: string;
  accent?: string;
  persona?: string;
  hasSample: boolean;
  samplePath?: string;
  biologicalMarkers?: BiologicalMarkers;
  lockedAt: string;
}

export type VoiceCloneFetchLike = (
  url: string,
  init?: { method?: string; headers?: Record<string, string>; body?: BodyInit },
) => Promise<{ ok: boolean; status: number; json(): Promise<unknown>; text(): Promise<string> }>;

/**
 * Enrolls and locks a permanent Dual-Anchor Character Voice Profile (`voice_sample.wav` + `voice_profile.json`),
 * normalizing any supplied reference sample to verified 48kHz PCM WAV and optionally creating an ElevenLabs instant voice clone.
 */
export async function enrollCharacterVoice(
  paths: StudioPaths,
  input: {
    film_id: string;
    character_id: string;
    sample_source_path?: string;
    provider?: 'google' | 'elevenlabs';
    voice_id?: string;
    persona?: string;
    pitch?: number;
    speed?: number;
    timbre?: string;
    accent?: string;
    clone_remote?: boolean;
    elevenlabs_api_key?: string;
    fetchFn?: VoiceCloneFetchLike;
  },
): Promise<{
  character_id: string;
  voice_profile_path: string;
  voice_sample_path?: string;
  profile: CharacterVoiceProfile;
}> {
  const charDir = paths.assetDir(input.film_id, 'characters', input.character_id);
  try {
    await readFile(`${charDir}/descriptor.md`, 'utf8');
  } catch {
    throw errNotFound(
      `character "${input.character_id}" not registered in film "${input.film_id}"`,
      'register character via asset_register first before enrolling voice',
    );
  }

  let sampleDest: string | undefined;
  let sampleDurationS: number | undefined;
  if (input.sample_source_path) {
    sampleDest = `${charDir}/voice_sample.wav`;
    const ingested = await ingestAndNormalizeAudio({
      sourcePath: input.sample_source_path,
      destPath: sampleDest,
      label: `${input.character_id}_voice_sample`,
      normalizeLufs: -16,
    });
    sampleDurationS = ingested.durationS;
  }

  let resolvedVoiceId = input.voice_id?.trim() || input.persona?.trim() || null;
  let resolvedProvider: 'google' | 'elevenlabs' = input.provider ?? 'google';

  if (input.clone_remote) {
    if (!sampleDest) {
      throw errValidation(
        'sample_source_path is required when clone_remote is true',
        'supply a clean speech sample WAV/MP3 for instant voice cloning',
      );
    }
    const apiKey = input.elevenlabs_api_key ?? process.env.ELEVENLABS_API_KEY;
    if (!apiKey) {
      throw errValidation(
        'ELEVENLABS_API_KEY missing for remote voice cloning',
        'set ELEVENLABS_API_KEY or set clone_remote: false to lock local 48kHz voice_sample.wav + Google/Journey persona',
      );
    }
    const fetchImpl = input.fetchFn ?? (globalThis.fetch as unknown as VoiceCloneFetchLike);
    const wavBytes = await readFile(sampleDest);
    const form = new FormData();
    form.append('name', `${input.film_id}_${input.character_id}`);
    form.append('description', input.timbre ?? `Locked voice anchor for ${input.character_id}`);
    form.append('files', new Blob([wavBytes], { type: 'audio/wav' }), `${input.character_id}_voice_sample.wav`);

    const resp = await fetchImpl('https://api.elevenlabs.io/v1/voices/add', {
      method: 'POST',
      headers: { 'xi-api-key': apiKey },
      body: form,
    });
    if (!resp.ok) {
      const errBody = await resp.text().catch(() => '');
      throw errValidation(
        `ElevenLabs voice clone failed (HTTP ${resp.status}): ${errBody.slice(0, 200)}`,
        'check ELEVENLABS_API_KEY quota/permissions or pass an existing voice_id',
      );
    }
    const cloned = (await resp.json()) as { voice_id?: string };
    if (!cloned.voice_id) {
      throw errValidation('ElevenLabs /v1/voices/add did not return voice_id', 'inspect API response');
    }
    resolvedVoiceId = cloned.voice_id;
    resolvedProvider = 'elevenlabs';
  }

  let existingProfile: Partial<CharacterVoiceProfile> = {};
  const profilePath = `${charDir}/voice_profile.json`;
  try {
    existingProfile = JSON.parse(await readFile(profilePath, 'utf8')) as Partial<CharacterVoiceProfile>;
  } catch {
    // first profile write
  }

  const profile: CharacterVoiceProfile = {
    character_id: input.character_id,
    voiceId: resolvedVoiceId ?? existingProfile.voiceId ?? null,
    provider: input.provider || input.clone_remote ? resolvedProvider : (existingProfile.provider ?? resolvedProvider),
    pitch: input.pitch ?? existingProfile.pitch ?? 1.0,
    speed: input.speed ?? existingProfile.speed ?? 1.0,
    timbre: input.timbre ?? existingProfile.timbre,
    accent: input.accent ?? existingProfile.accent,
    persona: input.persona ?? existingProfile.persona,
    hasSample: Boolean(sampleDest || existingProfile.hasSample),
    samplePath: sampleDest ?? existingProfile.samplePath,
    lockedAt: new Date().toISOString(),
  };

  const tmp = `${profilePath}.tmp-${randomBytes(4).toString('hex')}`;
  await writeFile(tmp, JSON.stringify({ ...profile, sampleDurationS }, null, 2), 'utf8');
  await rename(tmp, profilePath);

  return {
    character_id: input.character_id,
    voice_profile_path: profilePath,
    ...(sampleDest ? { voice_sample_path: sampleDest } : {}),
    profile,
  };
}
