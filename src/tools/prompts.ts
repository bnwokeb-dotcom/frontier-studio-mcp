// src/tools/prompts.ts — PURE prompt composition: the image-lane laws.
//
// No I/O, no lanes, no clocks. These functions turn stored doctrine text into
// the exact lane prompts, and are the only place the law wording lives. The
// wording below is BINDING (M2 plan): a test pins it verbatim, so any edit
// here is a law change, never a silent refactor.
import { errValidation } from '../errors.js';

// The Hell Grind sheet law: three panels on ONE shared background so the
// identity can never drift, and the center figure is HEADLESS so the sheet
// can never grow a second face. The descriptor is interpolated verbatim —
// the identity travels exactly as registered.
export function characterSheetPrompt(descriptor: string): string {
  if (!descriptor.trim()) {
    throw errValidation(
      'descriptor is required',
      'register the asset with a full descriptor before building its sheet',
    );
  }
  return [
    'Character reference sheet for AI film production. Three panels on ONE neutral light-grey background (#e8e8e8), flat even studio light, no dramatic shadows, real skin texture with visible pores, no retouch, no makeup-glamour, photographic realism.',
    'Panel 1 (left): tight close-up of the face, 3/4 view, neutral expression, eyes open, one readable face.',
    'Panel 2 (center): full body, front view, HEADLESS — the neck ends cleanly at the collar line; no face on this figure.',
    'Panel 3 (right): full body, back view.',
    `Subject, identical in all three panels: ${descriptor}`,
    'Clothing identical across panels. No props except what the descriptor states. No background scenery — the grey studio backdrop only. No text, no labels, no watermarks.',
  ].join('\n');
}
