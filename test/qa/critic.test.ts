// test/qa/critic.test.ts — Unit tests for the Automated VLM Critic Gate
import { describe, it, expect } from 'vitest';
import { auditTake } from '../../src/qa/critic.js';

describe('VLM Critic Gate (Universal Quality Gauntlet)', () => {
  it('returns rejected when mp4 path does not exist', async () => {
    const res = await auditTake({
      mp4Path: 'non_existent_file.mp4',
      shotId: 'shot_test_01',
      expectedAction: 'Corvus hammers glowing iron',
      durationS: 5,
    });

    expect(res.verdict).toBe('rejected');
    expect(res.score).toBeLessThan(8.5);
    expect(res.reasons).toContain('failed_frame_extraction');
  });
});
