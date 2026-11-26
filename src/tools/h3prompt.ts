// src/tools/h3prompt.ts — PURE composition: the H3 prompt layout, the
// doctrine-native heart of the video lane.
//
// No I/O, no lanes, no clocks — the same discipline as prompts.ts (the only
// runtime import is errors.js; CameraBlock is a type-only import from the
// store). The layout below is BINDING (M3 plan, Task 2): byte-pinned by test,
// so any edit here is a law change, never a silent refactor.
//
// Rulings baked into this layout (M3 plan + Task 2 ruling):
// - NO separate Characters section: characters enter the frame through the
//   PLATE (Picture 1), and the frames-XOR API law makes the plate the only
//   identity carrier — a Characters list would be redundant. (The plan's
//   sketch had one; the ruling supersedes it.)
// - overall_soundscape is NEVER 'N/A' — room tone is always present (the
//   sound law): silence is chosen in the cut, not at generation. sfx joins it
//   verbatim when present; 'room tone;' alone when absent.
// - Lines 1–2 (the 24fps realism law + the Picture 1 identity line) are
//   emitted only when the plate is wired (platePresents) — text-only mode
//   drops them entirely; without a plate there is no Picture 1.
// - durationS is carried on parts but NEVER rendered: length travels in the
//   lane request (VideoLaneRequest.durationS), not in the prompt text.
//   voiceRef is carried per dialogue line for the caller's ref resolution;
//   the layout's per-line identity is the (S<i+1>) index only.
import { errValidation } from '../errors.js';
import type { CameraBlock, CinematicsBlock } from '../store/shot.js';

export interface H3DialogueLine { voiceRef: string; voiceDescriptor: string; line: string }

export interface H3PromptParts {
  action: string; // injected verbatim — the picture beat, never trimmed
  camera: CameraBlock; // { lens, move, reason } from the stored shot
  cinematics?: CinematicsBlock;
  geoBlock?: string; // the sequence's locked geo block, verbatim; line omitted when absent
  dialogue: H3DialogueLine[];
  sfx?: string; // verbatim; 'room tone;' alone when absent
  durationS: number; // not rendered — see the ruling block above
  platePresents: boolean; // false → lines 1–2 omitted (text-only mode)
}

// Deterministic motion parsing (disclosed law): the amplitude/speed words are
// derived from the camera.move text, case-insensitively, first match wins —
// 'slow' beats 'fast'; 'subtle' beats the strong/wide/dramatic family; anything
// unmapped falls to the defaults (small amplitude, normal speed).
function motionOf(move: string): { amplitude: string; speed: string } {
  const m = move.toLowerCase();
  const speed = m.includes('slow') ? 'slow speed' : m.includes('fast') ? 'fast speed' : 'normal speed';
  const amplitude = m.includes('subtle') ? 'small amplitude'
    : (m.includes('strong') || m.includes('wide') || m.includes('dramatic'))
      ? 'large amplitude'
      : 'small amplitude';
  return { amplitude, speed };
}

/**
 * Strips TTS-only bracketed cue tags ([pause: 800ms], [breath], [whisper], [sigh])
 * before rendering video speech lines so models never vocalize or render raw brackets.
 */
const TTS_CUE_TAG_RE = /\[(?:pause(?:\s*:\s*[^\]]*)?|breath|sigh|whisper|beat)\]/i;

export function sanitizeVideoDialogue(raw: string): string {
  if (!TTS_CUE_TAG_RE.test(raw)) return raw;
  return raw
    .replace(/\[(?:pause(?:\s*:\s*[^\]]*)?|breath|sigh|whisper|beat)\]/gi, ' ')
    .replace(/\s+([,.!?;:])/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();
}

const H3_PROMPT_CAP = 8000; // lane-side prompt ceiling (spec §12.1)

export function composeH3Prompt(parts: H3PromptParts): string {
  const { amplitude, speed } = motionOf(parts.camera.move);
  const lines: string[] = [];
  if (parts.platePresents) {
    lines.push('Live-action, cinematic realism, 24fps.');
    lines.push('Picture 1 is fully referenced at 0.00s in Shot 1.');
  }
  const framing = parts.camera.framing ? ` (${parts.camera.framing.replace(/_/g, ' ')})` : '';
  lines.push(`[Shot 1] ${parts.camera.lens}${framing}: ${parts.action}`);

  const rig = parts.camera.rig ? `[${parts.camera.rig}] ` : '';
  const dof = parts.camera.depthOfField ? `, ${parts.camera.depthOfField.replace(/_/g, ' ')} depth of field` : '';
  lines.push(`Camera: The camera ${rig}${parts.camera.move}, with ${amplitude} at ${speed}${dof} — ${parts.camera.reason}.`);
  if (parts.cinematics) {
    const c = parts.cinematics;
    const details: string[] = [];
    if (c.filmStock) details.push(`Stock: ${c.filmStock.replace(/_/g, ' ')}`);
    if (c.lensGlass) details.push(`Optics: ${c.lensGlass.replace(/_/g, ' ')}`);
    if (c.lightingSetup) details.push(`Lighting: ${c.lightingSetup.replace(/_/g, ' ')}`);
    if (c.colorTemp) details.push(`Color temperature: ${c.colorTemp.replace(/_/g, ' ')}`);
    if (c.atmosphere) details.push(`Atmosphere: ${c.atmosphere.replace(/_/g, ' ')}`);
    if (details.length > 0) {
      lines.push(`Cinematic Physics: ${details.join('; ')}.`);
    }
  }
  parts.dialogue.forEach((d, i) => {
    const cleanLine = sanitizeVideoDialogue(d.line);
    if (cleanLine) {
      lines.push(`(S${i + 1}) — ${d.voiceDescriptor} says: <d>[English]${cleanLine}</d>`);
    }
  });
  if (parts.geoBlock) {
    lines.push(`Setting (spatial map, locked across every shot of this scene): ${parts.geoBlock}`);
  }
  lines.push(parts.sfx ? `overall_soundscape: room tone; ${parts.sfx}` : 'overall_soundscape: room tone;');
  lines.push('non_diegetic_music: N/A');
  const prompt = lines.join('\n');
  if (prompt.length > H3_PROMPT_CAP) {
    throw errValidation(
      `prompt is ${prompt.length} chars (H3 cap ${H3_PROMPT_CAP})`,
      'shorten the action text — descriptors are verbatim law and never trimmed',
    );
  }
  return prompt;
}
