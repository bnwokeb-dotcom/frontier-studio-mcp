// test/narrative/ensemble_skit.test.ts
import { describe, it, expect } from 'vitest';
import {
  compileEnsembleSkit,
  createGtaEpisode01,
  createCavemanEpisode01,
  type EnsembleSkitScript
} from '../../src/narrative/ensemble_skit.js';

describe('Ensemble Skit Engine (Multi-Character Episodic Narrative)', () => {
  it('enforces at least 2 interacting characters for narrative comedy and drama', () => {
    const invalidScript: EnsembleSkitScript = {
      universe: 'lonely_universe',
      episode_number: 1,
      episode_title: 'Solo Monologue',
      logline: 'One person talks to wall',
      budget_usd: 50,
      aspect_ratio: '9:16',
      characters: [
        {
          id: 'char_solo',
          name: 'Solo',
          archetype: 'protagonist_hustler',
          descriptor: 'lonely character',
          voice: { pitch: 1, speed: 1, timbre: 'flat' },
          acting_quirk: 'blinks'
        }
      ],
      location: {
        id: 'loc_room',
        name: 'Empty Room',
        descriptor: 'empty',
        geo_block: 'four walls'
      },
      beats: [
        {
          id: 'shot_01',
          beat_type: 'inciting_collision',
          action: 'stands there',
          staging: { center: 'char_solo' },
          camera: { lens: '24mm', move: 'static', reason: 'lonely', framing: 'close_up' },
          duration_s: 3,
          continuity: 'cut',
          diegetic_foley: []
        }
      ]
    };

    expect(() => compileEnsembleSkit(invalidScript)).toThrow(/Ensemble skit law violation/);
  });

  it('compiles GTA Los Santos Chronicles Episode 01 into an unbending autonomous production goal', () => {
    const gtaScript = createGtaEpisode01();
    const goal = compileEnsembleSkit(gtaScript);

    expect(goal.film_id).toBe('gta_los_santos_chronicles_ep01');
    expect(goal.title).toBe('The Contactless Payment Glitch');
    expect(goal.characters.length).toBe(2);
    expect(goal.characters.find((c) => c.asset_id === 'char_marcus')).toBeDefined();
    expect(goal.characters.find((c) => c.asset_id === 'char_npc_clerk')).toBeDefined();
    expect(goal.location.asset_id).toBe('loc_247_vinewood');
    expect(goal.shots.length).toBe(4);

    // Verify shot 1 has dialogue and character acting injected into action
    const s1 = goal.shots[0];
    expect(s1.dialogue?.character).toBe('char_marcus');
    expect(s1.dialogue?.line).toContain('Yo Dale, I am just tapping my phone');
    expect(s1.action).toContain('Marcus Vance displays exaggerated hand waves');

    // Verify shot 2 has Dale reaction
    const s2 = goal.shots[1];
    expect(s2.dialogue?.character).toBe('char_npc_clerk');
    expect(s2.dialogue?.line).toContain('Welcome to 24/7');
    expect(s2.action).toContain('Clerk Dale displays stiff T-pose twitch');
  });

  it('compiles Prehistoric Tech Chronicles Episode 01 with slapstick physical kinetics', () => {
    const caveScript = createCavemanEpisode01();
    const goal = compileEnsembleSkit(caveScript);

    expect(goal.film_id).toBe('prehistoric_tech_chronicles_ep01');
    expect(goal.title).toBe('The Fire Box Demon');
    expect(goal.characters.length).toBe(2);
    expect(goal.shots.length).toBe(3);

    const s3 = goal.shots[2];
    expect(s3.dialogue?.line).toBe('IT SCREAMS! RUN FOR TREES!');
    expect(s3.camera.reason).toContain('slapstick impact');
  });
});
