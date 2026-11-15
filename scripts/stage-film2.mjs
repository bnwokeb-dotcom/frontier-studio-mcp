// stage-film2.mjs — stages film #2 "Paper Boats" (15s) through the REAL store code. Idempotent.
import { studioPaths } from '../src/store/paths.js';
import { initStudio, setActiveFilm } from '../src/store/studio.js';
import { filmCreate } from '../src/store/film.js';
import { assetRegister } from '../src/store/asset.js';
import { sequenceLockGeo } from '../src/store/sequence.js';
import { shotCreate } from '../src/store/shot.js';

const root = process.env.STUDIO_ROOT;
if (!root) { console.error('STUDIO_ROOT env var required'); process.exit(1); }
const paths = studioPaths(root);
await initStudio(paths);
const skipIfExists = async (fn, label) => {
  try { return await fn(); } catch (e) {
    if (String(e.message).includes('already exists')) { console.log(label + ' — exists, skipped'); return undefined; }
    throw e;
  }
};

// NOTE: the age law — never write age; role, clothes, action carry the person.
await skipIfExists(() => filmCreate(paths, 'film_paper_boats', {
  title: 'Paper Boats',
  logline: 'A young woman tells her mother she has met someone — and for fifteen seconds, the memory of him is brighter than the kitchen they stand in.',
  budgetUsd: 15,
  targetRuntimeMin: 1,
}), 'film: film_paper_boats (budget $15, 15s)');
await setActiveFilm(paths, 'film_paper_boats');

await skipIfExists(() => assetRegister(paths, 'film_paper_boats', {
  kind: 'character', assetId: 'char_maya',
  descriptor: 'MAYA — a young woman, soft round face, warm brown eyes that cannot stop smiling, hair in a loose bun with strands escaping, oversized cream knit sweater, hands that talk when she is happy. She glows from inside.',
  voice: 'bright, quick, breathless with joy; words tumble over each other; a small laugh catches at the end of sentences.',
  acting: 'bounces slightly on her feet; hands press to her chest when she says his name; cannot stand still; glances away into the middle distance when the memory takes her.',
}), 'char_maya');
await skipIfExists(() => assetRegister(paths, 'film_paper_boats', {
  kind: 'character', assetId: 'char_mother',
  descriptor: 'The MOTHER — a woman with kind tired eyes, reading glasses on a chain, soft grey-streaked hair pinned up, warm cardigan over a housedress, flour dusting one wrist. She has heard everything in life and still leans in.',
  voice: 'calm, warm, unhurried; asks one question at a time; a smile she tries to keep off her face and fails.',
  acting: 'wipes her hands on a dish towel in slow circles; stillness that listens; the towel stops moving when the answer matters.',
}), 'char_mother');
await skipIfExists(() => assetRegister(paths, 'film_paper_boats', {
  kind: 'character', assetId: 'char_boy',
  descriptor: 'THE BOY — a young man with sun-bleached hair falling over one eye, white linen shirt open over a faded tee, a paper boat held in both hands like something alive. He exists only in golden light.',
  voice: 'one line, remembered: warm and playful, half a laugh inside it.',
  acting: 'leans back laughing; holds the paper boat out like an offering; backlit so his edges burn gold.',
}), 'char_boy');
await skipIfExists(() => assetRegister(paths, 'film_paper_boats', {
  kind: 'location', assetId: 'loc_kitchen_morning',
  descriptor: 'A small family kitchen in soft morning light: pale yellow walls, a window over the sink with sheer curtains breathing, a wooden counter with a dish towel, a bowl of oranges, morning sun making warm rectangles on the floor.',
  geoBlock: 'THE KITCHEN — MORNING. WINDOW with sheer curtains center-background (sun source). COUNTER with dish towel and orange bowl frame-left. MAYA center-frame facing camera-left toward the mother. MOTHER at the counter frame-left with her back half-turned. Camera static at eye height, hallway of light behind Maya.',
}), 'loc_kitchen_morning');
await skipIfExists(() => assetRegister(paths, 'film_paper_boats', {
  kind: 'location', assetId: 'loc_memory_field',
  descriptor: 'A memory of a golden field at late afternoon: tall grass burning gold in backlight, a slow breeze, sun flares, the world soft at the edges like something remembered rather than seen.',
  geoBlock: 'THE MEMORY FIELD — GOLDEN HOUR. THE BOY center-frame, backlit, edges burning gold. Grass waist-high, moving in slow breeze. Sun low behind him. Camera drifts slowly forward as if floating through the memory.',
}), 'loc_memory_field');
await skipIfExists(() => assetRegister(paths, 'film_paper_boats', {
  kind: 'style', assetId: 'style_warm_memory',
  descriptor: 'Cinematic realism, 24fps, gentle film grain, soft warm highlights, kitchen scenes in airy morning light; memory scenes in heavy golden backlight with lens flare and soft-focus edges — two looks, clearly distinct.',
}), 'style_warm_memory');

const GEO_K = 'THE KITCHEN — MORNING. WINDOW with sheer curtains center-background (sun source). COUNTER with dish towel and orange bowl frame-left. MAYA center-frame facing camera-left toward the mother. MOTHER at the counter frame-left with her back half-turned. Camera static at eye height, hallway of light behind Maya.';
await skipIfExists(() => sequenceLockGeo(paths, 'film_paper_boats', 'seq01', GEO_K), 'seq01 (kitchen) geo locked');
const GEO_M = 'THE MEMORY FIELD — GOLDEN HOUR. THE BOY center-frame, backlit, edges burning gold. Grass waist-high, moving in slow breeze. Sun low behind him. Camera drifts slowly forward as if floating through the memory.';
await skipIfExists(() => sequenceLockGeo(paths, 'film_paper_boats', 'seq02', GEO_M), 'seq02 (memory field) geo locked');

// Two shots, 8s + 8s ≈ the 15-second film.
await skipIfExists(() => shotCreate(paths, 'film_paper_boats', {
  id: 'seq01-shot01', sequence: 'seq01', durationS: 8,
  action: 'MAYA stands center kitchen, morning sun behind her, glowing. Her hands press to her chest. The MOTHER at the counter wipes a dish in slow circles, half-turned, and the towel STOPS moving.',
  geoBlock: GEO_K,
  camera: { lens: '35mm', move: 'static, subtle breath', reason: 'the confession needs stillness — the room listens' },
  audioBlock: {
    dialogue: [
      { voiceRef: 'char_maya', line: 'Mom. I met him. He made me a paper boat.' },
    ],
    sfx: 'morning room tone, birds outside, the dish towel stopping', music: 'none',
  },
  refs: [
    { assetId: 'loc_kitchen_morning', role: 'location' },
    { assetId: 'char_maya', role: 'character' },
    { assetId: 'char_mother', role: 'character' },
    { assetId: 'style_warm_memory', role: 'style' },
  ],
}), 'seq01-shot01');
await skipIfExists(() => shotCreate(paths, 'film_paper_boats', {
  id: 'seq02-shot01', sequence: 'seq02', durationS: 8,
  action: 'Inside Maya\'s head: the golden field. THE BOY leans back laughing, backlit, holding a paper boat out toward camera like an offering. The grass burns gold around him.',
  geoBlock: GEO_M,
  camera: { lens: '35mm', move: 'slow drift forward', reason: 'the memory floats — the camera drifts like remembering' },
  audioBlock: {
    dialogue: [
      { voiceRef: 'char_boy', line: 'It floats, Maya. Just like us.' },
    ],
    sfx: 'wind through grass, distant laughter, one warm swell of strings', music: 'none',
  },
  refs: [
    { assetId: 'loc_memory_field', role: 'location' },
    { assetId: 'char_boy', role: 'character' },
    { assetId: 'style_warm_memory', role: 'style' },
  ],
}), 'seq02-shot01 (the memory)');

console.log('\nDONE — film_paper_boats staged: 3 characters, 2 locations, 1 style, kitchen geo locked, 2 shots (8s + 8s).');
console.log('Next (characters first): 3 sheets → 2 plates → 2 renders.');
