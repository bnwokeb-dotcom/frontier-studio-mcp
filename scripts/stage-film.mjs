// stage-film.mjs — stages film #1's complete pre-production through the REAL store code.
// Run from the repo root:  STUDIO_ROOT=<path> npx tsx scripts/stage-film.mjs
// Idempotent: re-running stages nothing twice (the store refuses duplicates).
// Everything here is FREE (no API keys) — images and renders are the key-gated steps.
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

// ── FILM ─────────────────────────────────────────────────────────────────────
await skipIfExists(() => filmCreate(paths, 'film_last_deal', {
  title: 'The Last Deal',
  logline: 'A dying money launderer forces his estranged son to sign away the family empire before dawn — and discovers the son has been signing it away from him for a year.',
  budgetUsd: 25,
  targetRuntimeMin: 3,
}), 'film: film_last_deal (budget $25, 3 min)');
await setActiveFilm(paths, 'film_last_deal');

// ── CAST + WORLD (identity packages; descriptors are verbatim law) ───────────
await skipIfExists(() => assetRegister(paths, 'film_last_deal', {
  kind: 'character', assetId: 'char_elias',
  descriptor: 'ELIAS VOSS — late 60s, gaunt, grey stubble, faded blue button-down over a white T-shirt, reading glasses pushed up on his forehead, a fine tremor in his right hand. Terminal, and hides it behind precision.',
  voice: 'low, gravelled, measured; each sentence lands like a signature; never raises his voice.',
  acting: 'stillness as control: hands flat on the table, jaw set, blinks less when it matters; the tremor shows only when the pen is near.',
}), 'char_elias');
await skipIfExists(() => assetRegister(paths, 'film_last_deal', {
  kind: 'character', assetId: 'char_daniel',
  descriptor: 'DANIEL VOSS — mid-30s, lean, dark hair pushed back, black turtleneck, steel watch, red-rimmed eyes that have not slept in a year. Grief worn as anger.',
  voice: 'quiet, clipped, controlled fury; sentences that stop early.',
  acting: 'coiled stillness; jaw muscle working; hands ball and release; looks away exactly when the truth is closest.',
}), 'char_daniel');
await skipIfExists(() => assetRegister(paths, 'film_last_deal', {
  kind: 'location', assetId: 'loc_kitchen',
  descriptor: 'The kitchen of an old family house at night: dark wood cabinets, a worn oak table center-frame, one pendant lamp above it (warm tungsten), rain on the windows behind, a contract and two pens on the oak, cold blue hallway light spilling past the door frame.',
  geoBlock: 'THE KITCHEN — NIGHT. TABLE center-frame under the pendant lamp (warm tungsten, camera-side key). DOOR frame-right, hallway cold blue beyond it. WINDOWS frame-left, rain. Chairs: ELIAS seat-left, DANIEL seat-right. Camera lives EAST of the table shooting WEST; never crosses the table axis.',
}), 'loc_kitchen');
await skipIfExists(() => assetRegister(paths, 'film_last_deal', {
  kind: 'style', assetId: 'style_noir_drama',
  descriptor: 'Cinematic realism, 24fps, fine film grain, deep contrast with detail held in shadows, warm tungsten key against cold blue fill, 35mm lens language, breath-held close-ups.',
}), 'style_noir_drama');

// ── SCENE GEO (locked once; every shot pastes it verbatim — teleport law) ────
const GEO = 'THE KITCHEN — NIGHT. TABLE center-frame under the pendant lamp (warm tungsten, camera-side key). DOOR frame-right, hallway cold blue beyond it. WINDOWS frame-left, rain. Chairs: ELIAS seat-left, DANIEL seat-right. Camera lives EAST of the table shooting WEST; never crosses the table axis.';
await skipIfExists(() => sequenceLockGeo(paths, 'film_last_deal', 'seq01', GEO), 'seq01 geo locked');


// ── SHOTS (8 shots ≈ 3 min with real-length padding) ─────────────────────────
const shots = [
  {
    id: 'seq01-shot01', sequence: 'seq01', durationS: 8,
    action: 'The pendant lamp hums over the oak table. Rain runs down the black windows. ELIAS sits already seated, hands flat, the contract squared in front of him, a pen laid across it like a knife.',
    camera: { lens: '35mm', move: 'slow push-in', reason: 'the room is the trap — close on it before anyone speaks' },
    audioBlock: { sfx: 'rain on glass, lamp hum, a clock somewhere', music: 'none' },
    refs: [
      { assetId: 'loc_kitchen', role: 'location' },
      { assetId: 'style_noir_drama', role: 'style' },
    ],
  },
  {
    id: 'seq01-shot02', sequence: 'seq01', durationS: 6,
    action: 'DANIEL enters through the door frame-right, does not take off his coat, and stops one step inside. The two men look at each other across the contract for the first time in a year.',
    camera: { lens: '35mm', move: 'static, then a slow truck right with Daniel', reason: 'the door is the crossing — let him cross it in frame' },
    audioBlock: {
      dialogue: [
        { voiceRef: 'char_elias', line: 'Sit down, Daniel.' },
      ],
      sfx: 'door latch, rain, chair scrape as Daniel does not sit', music: 'none',
    },
    refs: [
      { assetId: 'loc_kitchen', role: 'location' },
      { assetId: 'char_daniel', role: 'character' },
      { assetId: 'char_elias', role: 'character' },
      { assetId: 'style_noir_drama', role: 'style' },
    ],
  },
  {
    id: 'seq01-shot03', sequence: 'seq01', durationS: 8,
    action: 'Wide from EAST of the table: ELIAS slides the contract across the oak to his son. DANIEL does not touch it. The pendant lamp swings a half-inch, and the shadows of both men sway with it.',
    camera: { lens: '35mm', move: 'static wide', reason: 'let the audience read the geography of the ask' },
    audioBlock: { sfx: 'paper sliding on oak, rain', music: 'none' },
    refs: [
      { assetId: 'loc_kitchen', role: 'location' },
      { assetId: 'char_elias', role: 'character' },
      { assetId: 'char_daniel', role: 'character' },
      { assetId: 'style_noir_drama', role: 'style' },
    ],
  },
  {
    id: 'seq01-shot04', sequence: 'seq01', durationS: 8,
    action: 'Close on ELIAS: the jaw sets, the hands stay flat. He announces the terms of the sale in the tone of a man reading a death certificate — his own.',
    camera: { lens: '50mm', move: 'slow push-in', reason: 'the terms are the wound — close while he says them' },
    audioBlock: {
      dialogue: [
        { voiceRef: 'char_elias', line: 'Everything goes to Meridian Holdings. Sign it tonight, and the family is clean.' },
      ],
      sfx: 'rain, lamp hum, the tremor knocks the pen half an inch', music: 'none',
    },
    refs: [
      { assetId: 'loc_kitchen', role: 'location' },
      { assetId: 'char_elias', role: 'character' },
      { assetId: 'style_noir_drama', role: 'style' },
    ],
  },
  {
    id: 'seq01-shot05', sequence: 'seq01', durationS: 8,
    action: 'Close on DANIEL: the jaw muscle works. He does not look at the contract — he looks at his father, and asks the question he has carried for a year.',
    camera: { lens: '50mm', move: 'static, subtle breath', reason: 'the question is the turn — hold his face while he asks it' },
    audioBlock: {
      dialogue: [
        { voiceRef: 'char_daniel', line: 'Whose name is on the Meridian filings, Dad?' },
      ],
      sfx: 'rain, the clock, one breath', music: 'none',
    },
    refs: [
      { assetId: 'loc_kitchen', role: 'location' },
      { assetId: 'char_daniel', role: 'character' },
      { assetId: 'style_noir_drama', role: 'style' },
    ],
  },
  {
    id: 'seq01-shot06', sequence: 'seq01', durationS: 8,
    action: 'ELIAS reaches for the pen. The tremor takes the whole hand now. He sets it down without signing and looks, for the first time tonight, at the rain.',
    camera: { lens: '50mm', move: 'slow pull-out', reason: 'the tremor is the confession the mouth will not make — pull back to hold both' },
    audioBlock: { sfx: 'the pen rolling a quarter-turn on oak, rain, lamp hum', music: 'none' },
    refs: [
      { assetId: 'loc_kitchen', role: 'location' },
      { assetId: 'char_elias', role: 'character' },
      { assetId: 'style_noir_drama', role: 'style' },
    ],
  },
  {
    id: 'seq01-shot07', sequence: 'seq01', durationS: 8,
    action: 'DANIEL turns his phone around on the oak: the Meridian filing, his own name as sole signatory, dated one year ago tonight. ELIAS reads it. The room gets one degree colder.',
    camera: { lens: '35mm', move: 'slow push-in on the phone screen, then rack to Elias', reason: 'the reveal lands on glass, then on the father — the turn of the film' },
    audioBlock: {
      dialogue: [
        { voiceRef: 'char_daniel', line: 'I signed it away from you a year ago, Dad. You were already dying.' },
      ],
      sfx: 'phone screen wake, rain, a long exhale from ELIAS', music: 'none',
    },
    refs: [
      { assetId: 'loc_kitchen', role: 'location' },
      { assetId: 'char_daniel', role: 'character' },
      { assetId: 'char_elias', role: 'character' },
      { assetId: 'style_noir_drama', role: 'style' },
    ],
  },
  {
    id: 'seq01-shot08', sequence: 'seq01', durationS: 8,
    action: 'Two shot from EAST: DANIEL signs the contract with his own pen and slides it back. ELIAS takes it, slides it into the drawer beneath the lamp, and closes the drawer. Neither man looks at the other; the lamp hums; rain.',
    camera: { lens: '35mm', move: 'static two-shot, slow push on the drawer at the end', reason: 'the deal closes in silence — the drawer, not the signature, is the button' },
    audioBlock: {
      dialogue: [
        { voiceRef: 'char_elias', line: 'You always were the better accountant.' },
      ],
      sfx: 'pen on paper, paper slide, drawer wood, rain, lamp hum', music: 'none',
    },
    refs: [
      { assetId: 'loc_kitchen', role: 'location' },
      { assetId: 'char_elias', role: 'character' },
      { assetId: 'char_daniel', role: 'character' },
      { assetId: 'style_noir_drama', role: 'style' },
    ],
  },
];

for (const s of shots) {
  try {
    await shotCreate(paths, 'film_last_deal', {
      id: s.id, sequence: s.sequence, action: s.action, geoBlock: GEO,
      refs: s.refs, camera: s.camera, audioBlock: s.audioBlock, durationS: s.durationS,
    });
    console.log(`shot: ${s.id} (${s.durationS}s) — created`);
  } catch (e) {
    if (String(e.message).includes('already exists')) { console.log(`shot: ${s.id} — exists, skipped`); continue; }
    throw e;
  }
}

console.log('\nDONE — film_last_deal staged: 2 characters, 1 location, 1 style, seq01 locked, 8 shots.');
console.log('Key-gated next steps (need API keys): character_sheet_build ×2 → keyframe_build → render_shot ×8 → job_download ×8.');
