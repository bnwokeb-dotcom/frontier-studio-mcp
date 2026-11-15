// test/tools/prompts.test.ts — the image-lane laws are PURE functions with
// BINDING wording. The exact-template assertion below is pinned on purpose:
// editing the law text must break this test loudly, not drift silently.
import { describe, it, expect } from 'vitest';
import { characterSheetPrompt } from '../../src/tools/prompts.js';
import { StudioError } from '../../src/errors.js';

const DESCRIPTOR = 'A weathered trawler captain, mid-50s, salt-grey beard, patched oilskin coat';

describe('characterSheetPrompt (the Hell Grind sheet law)', () => {
  it('matches the binding template exactly, descriptor interpolated verbatim', () => {
    expect(characterSheetPrompt(DESCRIPTOR)).toBe(
      [
        'Character reference sheet for AI film production. Three panels on ONE neutral light-grey background (#e8e8e8), flat even studio light, no dramatic shadows, real skin texture with visible pores, no retouch, no makeup-glamour, photographic realism.',
        'Panel 1 (left): tight close-up of the face, 3/4 view, neutral expression, eyes open, one readable face.',
        'Panel 2 (center): full body, front view, HEADLESS — the neck ends cleanly at the collar line; no face on this figure.',
        'Panel 3 (right): full body, back view.',
        `Subject, identical in all three panels: ${DESCRIPTOR}`,
        'Clothing identical across panels. No props except what the descriptor states. No background scenery — the grey studio backdrop only. No text, no labels, no watermarks.',
      ].join('\n'),
    );
  });

  it('carries the descriptor verbatim, HEADLESS, #e8e8e8', () => {
    const p = characterSheetPrompt(DESCRIPTOR);
    expect(p).toContain(DESCRIPTOR);
    expect(p).toContain('HEADLESS');
    expect(p).toContain('#e8e8e8');
  });

  it('orders the three panel lines 1 → 2 → 3', () => {
    const p = characterSheetPrompt(DESCRIPTOR);
    const p1 = p.indexOf('Panel 1 (left)');
    const p2 = p.indexOf('Panel 2 (center)');
    const p3 = p.indexOf('Panel 3 (right)');
    expect(p1).toBeGreaterThanOrEqual(0);
    expect(p2).toBeGreaterThan(p1);
    expect(p3).toBeGreaterThan(p2);
  });

  it('leaves no <descriptor> placeholder token after interpolation', () => {
    expect(characterSheetPrompt(DESCRIPTOR)).not.toContain('<descriptor');
  });

  it('whitespace-only descriptor → VALIDATION', () => {
    expect(() => characterSheetPrompt('   ')).toThrow(StudioError);
    try {
      characterSheetPrompt(' \n\t ');
      expect.unreachable('whitespace-only descriptor must throw');
    } catch (e) {
      expect(e).toBeInstanceOf(StudioError);
      expect((e as StudioError).code).toBe('VALIDATION');
      expect((e as StudioError).message).toMatch(/descriptor is required/);
      expect((e as StudioError).message).toMatch(/NEXT: /);
    }
  });
});
