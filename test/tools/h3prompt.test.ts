// test/tools/h3prompt.test.ts — the H3 prompt layout is a PURE function with
// BINDING wording (M3 plan, Task 2). The exact-template assertions below are
// pinned on purpose: editing the law text must break these tests loudly, not
// drift silently. Rulings pinned here:
// - NO separate Characters section — characters enter the frame through the
//   PLATE (Picture 1); the frames-XOR API law makes a Characters list redundant.
// - overall_soundscape is never 'N/A': 'room tone;' alone when no sfx — silence
//   is chosen in the cut, not at generation.
// - Lines 1–2 exist only when the plate is wired (platePresents).
import { describe, it, expect } from 'vitest';
import { composeH3Prompt, type H3PromptParts } from '../../src/tools/h3prompt.js';
import { StudioError } from '../../src/errors.js';

const ACTION = 'Mara stops at the treeline, breath fogging. She looks back at the cabin once.';
const CAMERA = { lens: '35mm', move: 'slow push-in', reason: 'closing on the choice' };
const GEO = '— CLEARING = center; — CABIN: frame-LEFT; camera north of treeline';
const SFX = 'wind, distant ice crack';
const DIALOGUE = [
  { voiceRef: 'char_mara', voiceDescriptor: 'MARA — frost-pale, wool coat, breath fogging', line: "Don't move." },
  { voiceRef: 'char_eli', voiceDescriptor: 'ELI — younger, restless hands, parka too big', line: 'The ice is talking.' },
];

const parts = (over: Partial<H3PromptParts> = {}): H3PromptParts => ({
  action: ACTION,
  camera: CAMERA,
  geoBlock: GEO,
  dialogue: DIALOGUE,
  sfx: SFX,
  durationS: 10,
  platePresents: true,
  ...over,
});

describe('composeH3Prompt (the doctrine-native H3 layout)', () => {
  it('matches the binding template exactly — plate, 2 dialogue lines, sfx, geo', () => {
    expect(composeH3Prompt(parts())).toBe(
      [
        'Live-action, cinematic realism, 24fps.',
        'Picture 1 is fully referenced at 0.00s in Shot 1.',
        `[Shot 1] 35mm: ${ACTION}`,
        'Camera: The camera slow push-in, with small amplitude at slow speed — closing on the choice.',
        `(S1) — MARA — frost-pale, wool coat, breath fogging says: <d>[English]Don't move.</d>`,
        `(S2) — ELI — younger, restless hands, parka too big says: <d>[English]The ice is talking.</d>`,
        `Setting (spatial map, locked across every shot of this scene): ${GEO}`,
        'overall_soundscape: room tone; wind, distant ice crack',
        'non_diegetic_music: N/A',
      ].join('\n'),
    );
  });

  it('no-plate variant: lines 1–2 omitted entirely, the rest intact', () => {
    expect(composeH3Prompt(parts({ platePresents: false }))).toBe(
      [
        `[Shot 1] 35mm: ${ACTION}`,
        'Camera: The camera slow push-in, with small amplitude at slow speed — closing on the choice.',
        `(S1) — MARA — frost-pale, wool coat, breath fogging says: <d>[English]Don't move.</d>`,
        `(S2) — ELI — younger, restless hands, parka too big says: <d>[English]The ice is talking.</d>`,
        `Setting (spatial map, locked across every shot of this scene): ${GEO}`,
        'overall_soundscape: room tone; wind, distant ice crack',
        'non_diegetic_music: N/A',
      ].join('\n'),
    );
  });

  it('no-dialogue variant: no (S…) lines, everything else unchanged', () => {
    const p = composeH3Prompt(parts({ dialogue: [] }));
    expect(p).not.toContain('(S1)');
    expect(p).not.toContain('<d>');
    expect(p).toContain('Picture 1 is fully referenced at 0.00s in Shot 1.');
    expect(p).toBe(
      [
        'Live-action, cinematic realism, 24fps.',
        'Picture 1 is fully referenced at 0.00s in Shot 1.',
        `[Shot 1] 35mm: ${ACTION}`,
        'Camera: The camera slow push-in, with small amplitude at slow speed — closing on the choice.',
        `Setting (spatial map, locked across every shot of this scene): ${GEO}`,
        'overall_soundscape: room tone; wind, distant ice crack',
        'non_diegetic_music: N/A',
      ].join('\n'),
    );
  });

  it('no-sfx variant: "room tone;" alone — the soundscape is never N/A', () => {
    const p = composeH3Prompt(parts({ sfx: undefined }));
    expect(p).toContain('overall_soundscape: room tone;\nnon_diegetic_music: N/A');
    expect(p).not.toMatch(/overall_soundscape: N\/A/);
  });

  it('no-geo variant: the Setting line is omitted entirely, no placeholder tokens', () => {
    const p = composeH3Prompt(parts({ geoBlock: undefined }));
    expect(p).not.toContain('Setting (spatial map');
    expect(p).not.toContain('<geoBlock');
  });

  it('numbers dialogue lines 1-based (S1, S2, …) in array order', () => {
    const p = composeH3Prompt(parts());
    expect(p.indexOf('(S1)')).toBeLessThan(p.indexOf('(S2)'));
    expect(p).toContain('(S2)');
  });

  it('camera amplitude/speed table — deterministic parsing of the move text', () => {
    const cameraLine = (move: string) => {
      const p = composeH3Prompt(parts({ camera: { ...CAMERA, move } }));
      return p.split('\n').find((l) => l.startsWith('Camera:'))!;
    };
    const cases: [string, string][] = [
      ['slow push-in', 'Camera: The camera slow push-in, with small amplitude at slow speed — closing on the choice.'],
      ['fast whip pan', 'Camera: The camera fast whip pan, with small amplitude at fast speed — closing on the choice.'],
      ['static hold', 'Camera: The camera static hold, with small amplitude at normal speed — closing on the choice.'],
      ['subtle drift', 'Camera: The camera subtle drift, with small amplitude at normal speed — closing on the choice.'],
      ['strong crash-in', 'Camera: The camera strong crash-in, with large amplitude at normal speed — closing on the choice.'],
      ['wide reveal', 'Camera: The camera wide reveal, with large amplitude at normal speed — closing on the choice.'],
      ['dramatic pull-back', 'Camera: The camera dramatic pull-back, with large amplitude at normal speed — closing on the choice.'],
      // both families at once: strong → large, fast → fast
      ['strong fast crash-in', 'Camera: The camera strong fast crash-in, with large amplitude at fast speed — closing on the choice.'],
      // parsing is case-insensitive (disclosed deterministic rule)
      ['Slow push-in', 'Camera: The camera Slow push-in, with small amplitude at slow speed — closing on the choice.'],
    ];
    for (const [move, expected] of cases) expect(cameraLine(move)).toBe(expected);
  });

  it('8000-char cap: an over-cap prompt → VALIDATION naming the law, never trimmed', () => {
    const longAction = 'word '.repeat(1700); // 8500 chars of picture beat
    try {
      composeH3Prompt(parts({ action: longAction }));
      expect.unreachable('an over-cap prompt must throw');
    } catch (e) {
      expect(e).toBeInstanceOf(StudioError);
      const err = e as StudioError;
      expect(err.code).toBe('VALIDATION');
      expect(err.message).toMatch(/prompt is \d+ chars \(H3 cap 8000\)/);
      expect(err.nextAction).toBe('shorten the action text — descriptors are verbatim law and never trimmed');
    }
  });

  it('a prompt just under the cap passes (the cap is 8000, not smaller)', () => {
    const nearCapAction = 'word '.repeat(1500); // 7500 chars + the law lines stay under 8000
    const p = composeH3Prompt(parts({ action: nearCapAction, dialogue: [] }));
    expect(p.length).toBeLessThanOrEqual(8000);
    expect(p).toContain('word');
  });

  it('verbatim injection law: descriptor, action, geo and sfx are never trimmed or altered', () => {
    const raggedDescriptor = '  MARA — frost-pale,   wool coat.  ';
    const raggedAction = '  Mara stops at the treeline,   breath fogging.  ';
    const raggedGeo = 'CLEARING =   center;   CABIN frame-LEFT  ';
    const raggedSfx = 'wind,   distant  ice crack';
    const p = composeH3Prompt(parts({
      action: raggedAction,
      dialogue: [{ voiceRef: 'char_mara', voiceDescriptor: raggedDescriptor, line: '  hold.  ' }],
      geoBlock: raggedGeo,
      sfx: raggedSfx,
    }));
    expect(p).toContain(raggedDescriptor);
    expect(p).toContain(raggedAction);
    expect(p).toContain(raggedGeo);
    expect(p).toContain(raggedSfx);
    expect(p).toContain('<d>[English]  hold.  </d>'); // the line travels verbatim too
  });

  it('leaves no template placeholder tokens after interpolation', () => {
    const p = composeH3Prompt(parts());
    for (const token of ['<lens', '<action', '<move', '<reason', '<voiceDescriptor', '<geoBlock', '<sfx', '<amplitude', '<speed']) {
      expect(p).not.toContain(token);
    }
  });

  it('interpolates cinematics block into prompt when present', () => {
    const p = composeH3Prompt(parts({
      cinematics: {
        filmStock: 'kodak_vision3_500t',
        lensGlass: 'anamorphic_2x_oval_bokeh',
        lightingSetup: 'key_fill_4_to_1',
        colorTemp: 'daylight_5600k',
        atmosphere: 'subtle_volumetric_haze',
      },
    }));
    expect(p).toContain('Cinematic Physics: Stock: kodak vision3 500t; Optics: anamorphic 2x oval bokeh; Lighting: key fill 4 to 1; Color temperature: daylight 5600k; Atmosphere: subtle volumetric haze.');
  });

  it('strips TTS phonetic tags like [breath] and [pause: 800ms] from video dialogue lines', () => {
    const p = composeH3Prompt(parts({
      dialogue: [{ voiceRef: 'char_mara', voiceDescriptor: 'MARA', line: '[breath] Living marrow stays warm. [pause: 800ms] You stamped a corpse.' }],
    }));
    expect(p).toContain('<d>[English]Living marrow stays warm. You stamped a corpse.</d>');
    expect(p).not.toContain('[pause: 800ms]');
    expect(p).not.toContain('[breath]');
  });
});
