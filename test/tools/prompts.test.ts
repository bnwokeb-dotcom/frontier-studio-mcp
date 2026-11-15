// test/tools/prompts.test.ts — the image-lane laws are PURE functions with
// BINDING wording. The exact-template assertion below is pinned on purpose:
// editing the law text must break this test loudly, not drift silently.
import { describe, it, expect } from 'vitest';
import { characterSheetPrompt, keyframePrompt } from '../../src/tools/prompts.js';
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

// --- Task 5: keyframePrompt (the light law) -----------------------------------

const LOCATION_DESCRIPTOR =
  'A rain-slicked fishing dock at low tide, diesel sheen on black water, pilings crusted with barnacles';
const LIGHT_STATEMENT =
  'single sodium flood on a pole behind camera left, amber, hard shadows raking across the planks';
const GEO_BLOCK = 'dock runs east-west; winch house at the west end; the tide gate is the only way onto the water';

describe('keyframePrompt (the light law)', () => {
  it('matches the binding template exactly — no geoBlock', () => {
    expect(keyframePrompt({ descriptor: LOCATION_DESCRIPTOR, lightStatement: LIGHT_STATEMENT })).toBe(
      [
        'Cinematic keyframe for AI film production. One frame, 16:9, photographic realism, film grain, motivated lighting only.',
        `Location: ${LOCATION_DESCRIPTOR}`,
        `Light: ${LIGHT_STATEMENT}  — one source, one direction of shadows; never two suns.`,
        'Composition: 3/4 view of the space (never flat frontal), one visual anchor stated by name in the scene, depth readable from foreground to background.',
        'No text, no watermarks, no people unless the descriptor names them.',
      ].join('\n'),
    );
  });

  it('matches the binding template exactly — geoBlock line between Composition and the closing law', () => {
    expect(
      keyframePrompt({ descriptor: LOCATION_DESCRIPTOR, lightStatement: LIGHT_STATEMENT, geoBlock: GEO_BLOCK }),
    ).toBe(
      [
        'Cinematic keyframe for AI film production. One frame, 16:9, photographic realism, film grain, motivated lighting only.',
        `Location: ${LOCATION_DESCRIPTOR}`,
        `Light: ${LIGHT_STATEMENT}  — one source, one direction of shadows; never two suns.`,
        'Composition: 3/4 view of the space (never flat frontal), one visual anchor stated by name in the scene, depth readable from foreground to background.',
        `spatial map the staging must respect, verbatim: ${GEO_BLOCK}`,
        'No text, no watermarks, no people unless the descriptor names them.',
      ].join('\n'),
    );
  });

  it('carries descriptor, light statement and geoBlock verbatim, with the law keywords present', () => {
    const p = keyframePrompt({ descriptor: LOCATION_DESCRIPTOR, lightStatement: LIGHT_STATEMENT, geoBlock: GEO_BLOCK });
    expect(p).toContain(LOCATION_DESCRIPTOR);
    expect(p).toContain(LIGHT_STATEMENT);
    expect(p).toContain(GEO_BLOCK);
    expect(p).toContain('never two suns');
    expect(p).toContain('3/4 view');
    expect(p).toContain('motivated lighting only');
  });

  it('omits the spatial-map line entirely when no geoBlock is given, leaves no placeholder tokens', () => {
    const p = keyframePrompt({ descriptor: LOCATION_DESCRIPTOR, lightStatement: LIGHT_STATEMENT });
    expect(p).not.toContain('spatial map');
    expect(p).not.toContain('<geoBlock');
    expect(p).not.toContain('<descriptor');
    expect(p).not.toContain('<light_statement');
  });

  it('empty and whitespace-only light_statement → VALIDATION naming what a light statement must state', () => {
    for (const bad of ['', '   ', ' \n\t ']) {
      try {
        keyframePrompt({ descriptor: LOCATION_DESCRIPTOR, lightStatement: bad });
        expect.unreachable('whitespace-only light_statement must throw');
      } catch (e) {
        expect(e).toBeInstanceOf(StudioError);
        expect((e as StudioError).code).toBe('VALIDATION');
        expect((e as StudioError).message).toMatch(/light_statement is required/);
        expect((e as StudioError).message).toMatch(/state the light source: what it is, where it comes from, what color/);
        expect((e as StudioError).message).toMatch(/NEXT: /);
      }
    }
  });
});
