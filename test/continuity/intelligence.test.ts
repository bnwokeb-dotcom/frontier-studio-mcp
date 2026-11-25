// test/continuity/intelligence.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { execFile as execFileCb } from 'node:child_process';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';
import {
  buildReferenceTransferContract,
  enrollCharacterVoice,
  planNextClipContinuity,
  recordSequenceTakeDecision,
  saveSequenceState,
  validateDirectorRead,
  validateShotTable,
  type SequenceProjectState,
} from '../../src/continuity/intelligence.js';
import { assetRegister } from '../../src/store/asset.js';
import { filmCreate } from '../../src/store/film.js';
import { studioPaths } from '../../src/store/paths.js';
import { initStudio } from '../../src/store/studio.js';

const execFile = promisify(execFileCb);

describe('Lumina / Seedance Continuity Intelligence & Dual-Anchor Voice Consistency', () => {
  let root: string;

  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'fsm-cont-'));
    await initStudio(studioPaths(root));
    await filmCreate(studioPaths(root), 'film_lumina', {
      title: 'Winter Covenant',
      logline: 'A mother shields an extraordinary child across a frozen border.',
      budgetUsd: 100,
    });
  });

  afterEach(async () => {
    await rm(root, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
  });

  it('enforces narrative 10-field Director Read and catches Shot Table blank cells, competing actions, and direction traps', async () => {
    expect(() =>
      validateDirectorRead({
        lane: 'narrative',
        dramatic_function: 'turn',
        turn: 'trust to suspicion',
        pov: 'mother',
        power_shift: 'stranger holds doorway until mother steps in front of hearth',
        hidden_objective: 'conceal dragon egg under cloak',
        obstacle_tactic: 'captain inspects rations while mother offers hot broth as decoy',
        suppressed_behavior: 'right thumb rubs scar behind apron fold',
        non_transferable_detail: 'burnt frostbite scar across left knuckle',
        value_before: 'hidden safety',
        value_after: 'compromised refuge',
      }),
    ).not.toThrow();

    const badTable = await validateShotTable({
      floor_plan: 'Cabin interior: oak door faces north, stone hearth glows on west wall, timber table center.',
      rows: [
        {
          shot_id: 's1',
          camera_side: 'south wall wide',
          in_frame: '@char_mother by hearth facing north',
          eyeline: 'toward door',
          action: 'Mother pours broth while her face fell and nobody moves in the room.',
          others_idle_business: 'default',
          light_lock: 'warm tungsten hearth from west wall',
          last_frame: 'steaming bowl on table',
        },
      ],
    });

    expect(badTable.passed).toBe(false);
    expect(badTable.violations.some((v) => v.includes('others_idle_business'))).toBe(true);
    expect(badTable.violations.some((v) => v.includes('her face fell'))).toBe(true);
    expect(badTable.violations.some((v) => v.includes('nobody moves'))).toBe(true);
  });

  it('preserves @tags verbatim and emits Role Isolation Transfer & Ignore clauses', () => {
    const res = buildReferenceTransferContract(
      'Medium 50mm shot of @char_corvus stepping beside @Video1 camera track while @Audio1 whispers.',
      [
        { tag: '@char_corvus', role: 'identity', ignore: ['lighting'] },
        { tag: '@Video1', role: 'camera_rhythm_only', ignore: ['identity', 'wardrobe', 'room'] },
      ],
    );

    expect(res.extractedTags).toEqual(['@char_corvus', '@Video1', '@Audio1']);
    expect(res.compiledPrompt).toContain('@char_corvus controls identity only; ignore lighting from that reference.');
    expect(res.compiledPrompt).toContain('@Video1 controls camera_rhythm_only; ignore identity, wardrobe, room from that reference.');
    expect(res.compiledPrompt).toContain('@Audio1 controls voice_timbre and tempo_only');
  });

  it('enforces Sequence State observed end-state overrides and scheduled re-anchor after max_chain_depth', async () => {
    const paths = studioPaths(root);
    const state: SequenceProjectState = {
      film_id: 'film_lumina',
      sequence_id: 'seq01',
      story_objective: 'Cross the courtyard unseen',
      final_story_outcome: 'Mother reaches the watchtower shadow',
      max_chain_depth: 2,
      canonical_characters: ['char_mother'],
      canonical_location: 'loc_courtyard',
      completed_beats: [],
      reserved_future_beats: ['beat_1', 'beat_2', 'beat_3', 'beat_4'],
      clips: [
        {
          clip_id: 'c1',
          sequence_index: 1,
          beat_id: 'beat_1',
          parent_clip_id: null,
          status: 'planned',
          extension_depth: 0,
          anchor_mode: 'canonical',
          relation: 'sequence_first_clip',
          planned_end_state: 'hand on latch',
          observed_end_state: null,
        },
        {
          clip_id: 'c2',
          sequence_index: 2,
          beat_id: 'beat_2',
          parent_clip_id: 'c1',
          status: 'planned',
          extension_depth: 1,
          anchor_mode: 'tail_frame',
          relation: 'seamless_continuation',
          planned_end_state: 'door cracked',
          observed_end_state: null,
        },
        {
          clip_id: 'c3',
          sequence_index: 3,
          beat_id: 'beat_3',
          parent_clip_id: 'c2',
          status: 'planned',
          extension_depth: 2,
          anchor_mode: 'tail_frame',
          relation: 'seamless_continuation',
          planned_end_state: 'outside archway',
          observed_end_state: null,
        },
        {
          clip_id: 'c4',
          sequence_index: 4,
          beat_id: 'beat_4',
          parent_clip_id: 'c3',
          status: 'planned',
          extension_depth: 3,
          anchor_mode: 'tail_frame',
          relation: 'seamless_continuation',
          planned_end_state: 'watchtower shadow',
          observed_end_state: null,
        },
      ],
      updated_at: new Date().toISOString(),
    };
    await saveSequenceState(paths, state);

    // Chaining c2 before c1 has accepted observed_end_state must fail cleanly
    expect(() => planNextClipContinuity(state, 'c2')).toThrow(/lacks accepted observed_end_state/);

    // Accept c1 and c2 -> c3 chains at depth 2 <= cap 2 -> tail_frame
    const s1 = await recordSequenceTakeDecision(paths, {
      film_id: 'film_lumina',
      sequence_id: 'seq01',
      clip_id: 'c1',
      verdict: 'accept_with_deviation',
      observed_end_state: { character_pos: '2 steps shy of latch' },
    });
    const planC2 = planNextClipContinuity(s1, 'c2');
    expect(planC2.anchor_mode).toBe('tail_frame');
    expect(planC2.opening_state).toEqual({ character_pos: '2 steps shy of latch' });
    expect(planC2.excluded_completed_beats).toContain('beat_1');

    const s2 = await recordSequenceTakeDecision(paths, {
      film_id: 'film_lumina',
      sequence_id: 'seq01',
      clip_id: 'c2',
      verdict: 'accept',
      observed_end_state: { character_pos: 'holding half-open door' },
    });
    const planC3 = planNextClipContinuity(s2, 'c3');
    expect(planC3.anchor_mode).toBe('tail_frame');

    const s3 = await recordSequenceTakeDecision(paths, {
      film_id: 'film_lumina',
      sequence_id: 'seq01',
      clip_id: 'c3',
      verdict: 'accept',
      observed_end_state: { character_pos: 'under stone archway' },
    });
    // c4 exceeds max_chain_depth (depth 3 > 2) -> auto forces canonical re-anchor
    const planC4 = planNextClipContinuity(s3, 'c4');
    expect(planC4.anchor_mode).toBe('canonical');
    expect(planC4.must_reanchor).toBe(true);
    expect(planC4.relation).toBe('reanchor_after_drift');
  });

  it('enrolls and normalizes permanent 48kHz character voice_sample.wav and supports remote voice cloning', async () => {
    const paths = studioPaths(root);
    await assetRegister(paths, 'film_lumina', {
      kind: 'character',
      assetId: 'char_mother',
      descriptor: 'Weathered woman in wolf-trimmed cloak.',
      voice: 'Measured northern alto with slight rasp.',
      acting: 'Alert eyes scanning treeline, protective grip on satchel.',
    });

    const rawAudio = join(root, 'raw_sample.mp3');
    await execFile('ffmpeg', [
      '-y', '-f', 'lavfi', '-i', 'sine=frequency=220:duration=1.2',
      '-ar', '22050', '-ac', '2',
      rawAudio,
    ]);

    const res = await enrollCharacterVoice(paths, {
      film_id: 'film_lumina',
      character_id: 'char_mother',
      sample_source_path: rawAudio,
      persona: 'Aoede',
      pitch: 0.96,
      speed: 1.0,
      timbre: 'warm steady alto',
      clone_remote: true,
      elevenlabs_api_key: 'test-11labs-key',
      fetchFn: async (url) => {
        expect(url).toBe('https://api.elevenlabs.io/v1/voices/add');
        return {
          ok: true,
          status: 200,
          json: async () => ({ voice_id: 'el_cloned_mother_99' }),
          text: async () => '{}',
        };
      },
    });

    expect(res.profile.voiceId).toBe('el_cloned_mother_99');
    expect(res.profile.provider).toBe('elevenlabs');
    expect(res.profile.hasSample).toBe(true);

    const savedProfile = JSON.parse(await readFile(res.voice_profile_path, 'utf8'));
    expect(savedProfile.voiceId).toBe('el_cloned_mother_99');
    expect(savedProfile.hasSample).toBe(true);
  });
});
