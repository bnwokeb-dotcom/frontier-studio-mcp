import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { runAutonomousProduction, type AutonomousProductionGoal } from '../../src/harness/runner.js';

describe('Hermes-Style Autonomous Studio Harness Runner', () => {
  let root: string;

  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'fsm-harness-'));
  });

  afterEach(async () => {
    await rm(root, { recursive: true, force: true });
  });

  it('autonomously runs a full production goal with OTIO timeline and rough cut assembly', async () => {
    const goal: AutonomousProductionGoal = {
      film_id: 'film_auto_01',
      title: 'The Great Neanderthal Awakening',
      logline: 'Grok tries to microwave mammoth steak in a time portal',
      budget_usd: 150,
      niche: 'episodic_skit_comedy',
      aspect_ratio: '9:16',
      target_model: 'minimax-h3',
      characters: [
        {
          asset_id: 'char_grok',
          descriptor: 'muscular Neanderthal in mammoth fur pelt with wild dark hair',
          voice: { pitch: 0.85, speed: 1.0, timbre: 'gravelly' }
        }
      ],
      location: {
        asset_id: 'loc_prehistoric_cave',
        descriptor: 'torch-lit prehistoric cave with ancient wall art',
        geo_block: 'hearth on west wall, cave mouth facing east with morning mist'
      },
      shots: [
        {
          id: 'shot_01',
          action: 'Grok sniffs the humming microwave with intense feral suspicion.',
          camera: { lens: '24mm', move: 'push in', reason: 'capturing curious eye-darts' },
          duration_s: 4,
          continuity: 'cut'
        },
        {
          id: 'shot_02',
          action: 'The microwave dings; Grok shrieks and dives behind a boulder.',
          camera: { lens: '24mm', move: 'camera jolt and tilt down', reason: 'comedic panic reaction' },
          duration_s: 4,
          continuity: 'continuous',
          chain_from_shot_id: 'shot_01'
        }
      ]
    };

    const report = await runAutonomousProduction(goal, root);

    expect(report.status).toBe('COMPLETED');
    expect(report.film_id).toBe('film_auto_01');
    expect(report.total_shots).toBe(2);
    expect(report.total_runtime_s).toBe(8);
    expect(report.otio_timeline_path).toContain('.otio');
    expect(report.fcpxml_timeline_path).toContain('.fcpxml');
    expect(report.rough_cut_path).toBeDefined();
    expect(report.qc_audit_passed).toBe(true);
  });
});
