// src/tools/prompts.ts — PURE prompt composition: the image-lane laws.
//
// No I/O, no lanes, no clocks. These functions turn stored doctrine text into
// the exact lane prompts, and are the only place the law wording lives. The
// wording below is BINDING (M2 plan): a test pins it verbatim, so any edit
// here is a law change, never a silent refactor.
import { errValidation } from '../errors.js';
import type { CinematicsBlock } from '../store/shot.js';

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

// The keyframe light law: ONE motivated light source, one direction of shadows,
// a 3/4 composition — the frame a whole sequence gets staged against. Descriptor,
// light statement and geo block all interpolate verbatim: doctrine travels
// exactly as registered, never paraphrased. The law text is BINDING (M2 plan)
// and pinned byte-for-byte by a test.
export interface KeyframePromptInput {
  descriptor: string;
  lightStatement: string;
  geoBlock?: string;
  cinematics?: CinematicsBlock;
}

export function keyframePrompt({ descriptor, lightStatement, geoBlock, cinematics }: KeyframePromptInput): string {
  if (!lightStatement.trim()) {
    throw errValidation(
      'light_statement is required',
      'state the light source: what it is, where it comes from, what color',
    );
  }
  const cinDetails: string[] = [];
  if (cinematics) {
    if (cinematics.filmStock) cinDetails.push(`Film stock: ${cinematics.filmStock.replace(/_/g, ' ')}`);
    if (cinematics.lensGlass) cinDetails.push(`Lens glass: ${cinematics.lensGlass.replace(/_/g, ' ')}`);
    if (cinematics.lightingSetup) cinDetails.push(`Lighting: ${cinematics.lightingSetup.replace(/_/g, ' ')}`);
    if (cinematics.colorTemp) cinDetails.push(`Color temp: ${cinematics.colorTemp.replace(/_/g, ' ')}`);
    if (cinematics.atmosphere) cinDetails.push(`Atmosphere: ${cinematics.atmosphere.replace(/_/g, ' ')}`);
  }
  return [
    'Cinematic keyframe for AI film production. One frame, 16:9, photographic realism, film grain, motivated lighting only.',
    `Location: ${descriptor}`,
    `Light: ${lightStatement}  — one source, one direction of shadows; never two suns.`,
    ...(cinDetails.length > 0 ? [`Cinematic Optics: ${cinDetails.join('; ')}.`] : []),
    'Composition: 3/4 view of the space (never flat frontal), one visual anchor stated by name in the scene, depth readable from foreground to background.',
    ...(geoBlock ? [`spatial map the staging must respect, verbatim: ${geoBlock}`] : []),
    'No text, no watermarks, no people unless the descriptor names them.',
  ].join('\n');
}
