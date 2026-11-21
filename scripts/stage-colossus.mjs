// scripts/stage-colossus.mjs — Stages the flagship film "The Heart of the Colossus" (Niche #1 Dark Mythological Epic).
// Features Master Corvus Vance, Ignis-Vael (The Colossus), and General Malic.
// Fully satisfies every store law (completeness law, verbatim geo-lock, Panavision kinematics, audio stems).
// Run via: npm run stage:colossus  OR  node scripts/stage-colossus.mjs
import { studioPaths } from '../src/store/paths.js';
import { initStudio, setActiveFilm } from '../src/store/studio.js';
import { filmCreate } from '../src/store/film.js';
import { assetRegister } from '../src/store/asset.js';
import { sequenceLockGeo } from '../src/store/sequence.js';
import { shotCreate } from '../src/store/shot.js';
import { loadConfig } from '../src/config.js';

const cfg = loadConfig();
const root = process.env.STUDIO_ROOT || cfg.studioRoot;
if (!root) {
  console.error('❌ STUDIO_ROOT env var or .env setting required');
  process.exit(1);
}

const paths = studioPaths(root);
await initStudio(paths);

const skipIfExists = async (fn, label) => {
  try {
    return await fn();
  } catch (e) {
    if (String(e.message).includes('already exists')) {
      console.log(`[EXISTS] ${label} — skipped`);
      return undefined;
    }
    throw e;
  }
};

console.log('🎬 ========================================================');
console.log('   STAGING FLAGSHIP FILM: THE HEART OF THE COLOSSUS');
console.log('   (The Blacksmith Who Forged a Heart for a Dying God)');
console.log('==========================================================\n');

const FILM_ID = 'film_heart_of_colossus';

// ── 1. FILM INITIALIZATION ──────────────────────────────────────────────────
await skipIfExists(
  () =>
    filmCreate(paths, FILM_ID, {
      title: 'The Heart of the Colossus',
      logline:
        'To replace the shattered heart of the last living Titan before the Imperial Foundry finds its lair, an exiled master smith must burn away the enchanted iron armor that protects his own dying body from the volcanic heat.',
      budgetUsd: 45.0,
      targetRuntimeMin: 5,
    }),
  `Film: ${FILM_ID} ($45 budget, 5 min)`,
);
await setActiveFilm(paths, FILM_ID);
console.log(`✅ Active film set to: ${FILM_ID}`);

// ── 2. CAST & IDENTITY ASSETS (Completeness Law Enforced) ───────────────────
await skipIfExists(
  () =>
    assetRegister(paths, FILM_ID, {
      kind: 'character',
      assetId: 'char_corvus',
      descriptor:
        'CORVUS VANCE — 50s, weathered master metallurgist. Severe jaw, dark unblinking eyes, silver-streaked dark hair tied at the nape, deep burn scars along his forearms. Wears a tailored charcoal boiled-leather smith greatcoat with brass calipers in breast pockets, heavy aproned leather trousers, and blackened iron-threaded gauntlets. Moves with the absolute, unhurried calm of a man who has mastered heat and steel.',
      voice:
        'deep resonant baritone; gravelled vocal fry; slow, measured cadence; cultured diction that treats every word like a forged rivet; never shouts.',
      acting:
        'stillness as absolute authority; unhurried eye contact; slow deliberate blinks; jaw sets before delivering a fatal truth; hands remain completely steady even when surrounded by weapons.',
    }),
  'Lead: char_corvus (Master Corvus Vance)',
);

await skipIfExists(
  () =>
    assetRegister(paths, FILM_ID, {
      kind: 'character',
      assetId: 'char_colossus',
      descriptor:
        'IGNIS-VAEL — The Slumbering Colossus. A 60-foot horned obsidian titan collapsed in the volcanic basalt cavern. Weathered black volcanic rock plates for skin, glowing amber fissures pulsing like veins along its massive chest. Its ribcage is cracked open, exposing a dying, stuttering molten core that leaks liquid fire into the stone floor.',
      voice:
        'sub-harmonic tectonic resonance, deep basalt rumble that vibrates stone; slow, ancient cadence speaking like the earth itself.',
      acting:
        'heavy, rhythmic chest heave every six seconds; a single colossal golden iris slowly dilating in the cavern shadows; slow exhalation of sulfurous smoke from jaw fissures.',
    }),
  'Co-Lead: char_colossus (Ignis-Vael)',
);

await skipIfExists(
  () =>
    assetRegister(paths, FILM_ID, {
      kind: 'character',
      assetId: 'char_malic',
      descriptor:
        'GENERAL MALIC — 40s, Imperial Iron Guard commander. Immaculate burnished steel breastplate etched with imperial eagles, wolf-fur mantle, high leather boots with polished brass spurs. Cold, aristocratic bone structure, close-cropped blond hair, a hand that never leaves the pommel of his longsword.',
      voice:
        'sharp, clipped, aristocratic cadence; used to commanding thousands; irritation masked behind imperial arrogance.',
      acting:
        'rigid military posture; eyes darting suspiciously across the dark forge; subtle weight shift when realizing he is standing on danger; hand tightening on sword pommel.',
    }),
  'Antagonist: char_malic (General Malic)',
);

await skipIfExists(
  () =>
    assetRegister(paths, FILM_ID, {
      kind: 'location',
      assetId: 'loc_caldera_forge',
      descriptor:
        'The Subterranean Caldera Forge beneath Mount Vael. 60-foot vaulted basalt cavern, natural volcanic vents glowing dull orange, a massive 3-ton black iron anvil center-frame, hanging brass pulleys and heavy iron chains, water troughs hissing steam, the massive breathing silhouette of the Colossus resting in the volcanic caldera background.',
      geoBlock:
        'SUBTERRANEAN CALDERA FORGE — NIGHT. ANVIL center-frame with hammer and tongs. COLOSSUS resting background-left in the volcanic depression, amber chest fissure visible. MAIN LIFT PLATFORM frame-right with iron grate. STEAM VENT PLATES under the center flagstones. Camera operates SOUTH of the anvil looking NORTH toward the Colossus; never crosses the molten run-off trench.',
    }),
  'Location: loc_caldera_forge',
);

await skipIfExists(
  () =>
    assetRegister(paths, FILM_ID, {
      kind: 'style',
      assetId: 'style_prestige_mythic',
      descriptor:
        'Prestige cinematic realism, 24fps, Kodak Vision3 500T 5219 photochemical film stock, authentic 35mm grain, Chiaroscuro 8:1 contrast (searing 2400K molten orange forge keys against crushed obsidian slate shadows), Panavision 2.39:1 anamorphic widescreen, subtle atmospheric convective heat shimmer and airborne soot motes.',
    }),
  'Style: style_prestige_mythic',
);

// ── 3. SEQUENCE GEO-LOCK (Verbatim Law) ──────────────────────────────────────
const GEO_FORGE =
  'SUBTERRANEAN CALDERA FORGE — NIGHT. ANVIL center-frame with hammer and tongs. COLOSSUS resting background-left in the volcanic depression, amber chest fissure visible. MAIN LIFT PLATFORM frame-right with iron grate. STEAM VENT PLATES under the center flagstones. Camera operates SOUTH of the anvil looking NORTH toward the Colossus; never crosses the molten run-off trench.';

await skipIfExists(
  () => sequenceLockGeo(paths, FILM_ID, 'seq01', GEO_FORGE),
  'Sequence Geo-Lock: seq01 (Caldera Forge)',
);

// ── 4. SHOT LIST (A-List Kinematics & Dialogue Stems) ────────────────────────
const shots = [
  {
    id: 'seq01-shot01',
    sequence: 'seq01',
    durationS: 8,
    action:
      'High-angle opening reveal: Looking down from the cavern rafters, a small silhouetted figure of CORVUS stands at the massive black iron anvil center-frame. In the background, the colossal mountain-like mass of the COLOSSUS heaves with slow, dying breaths, its fractured chest fissures pulsing amber light into the basalt dark.',
    geoBlock: GEO_FORGE,
    camera: {
      lens: '24mm',
      move: 'slow technocrane vertical descent',
      reason: 'establish the colossal scale disparity between the solitary human smith and the dying ancient god',
      rig: 'technocrane',
      framing: 'master_wide',
      depthOfField: 'deep',
    },
    cinematics: {
      filmStock: 'kodak_vision3_500t',
      lensGlass: 'anamorphic_2x_oval_bokeh',
      lightingSetup: 'chiaroscuro_high_contrast',
      colorTemp: 'golden_hour_2800k',
      atmosphere: 'dust_particulates',
    },
    audioBlock: {
      dialogue: [
        {
          voiceRef: 'char_corvus',
          line: 'A god does not die when you break its bone. [pause: 800ms] It dies when you make it beg.',
        },
      ],
      sfx: 'sub-bass 32Hz heartbeat, distant tectonic grinding, hissing volcanic steam vents',
      music: 'none',
    },
    refs: [
      { assetId: 'loc_caldera_forge', role: 'location' },
      { assetId: 'char_corvus', role: 'character' },
      { assetId: 'char_colossus', role: 'character' },
      { assetId: 'style_prestige_mythic', role: 'style' },
    ],
  },
  {
    id: 'seq01-shot02',
    sequence: 'seq01',
    durationS: 6,
    action:
      'Macro close-up on the black iron anvil: A glowing red-hot brass-and-iron mechanical heart valve sits pinned in tongs. Corvus’s scarred, blackened gauntlet drives a cold punch through a runic gear. Molten orange sparks spray across the dark slate table.',
    geoBlock: GEO_FORGE,
    camera: {
      lens: '85mm',
      move: 'static macro focus on impact point',
      reason: 'ground the audience in the tangible physical metallurgy and precision required to save the beast',
      rig: 'tripod',
      framing: 'close_up',
      depthOfField: 'shallow',
    },
    cinematics: {
      filmStock: 'kodak_vision3_500t',
      lensGlass: 'anamorphic_2x_oval_bokeh',
      lightingSetup: 'chiaroscuro_high_contrast',
      colorTemp: 'tungsten_3200k',
      atmosphere: 'subtle_volumetric_haze',
    },
    audioBlock: {
      sfx: 'hammer on iron ringing strike, sharp oil hiss, mechanical gear click, 32Hz deep rumble',
      music: 'none',
    },
    refs: [
      { assetId: 'loc_caldera_forge', role: 'location' },
      { assetId: 'char_corvus', role: 'character' },
      { assetId: 'style_prestige_mythic', role: 'style' },
    ],
  },
  {
    id: 'seq01-shot03',
    sequence: 'seq01',
    durationS: 7,
    action:
      'The industrial iron lift shudders and grinds to a halt frame-right. Steam bursts from the lift chains. GENERAL MALIC steps out onto the iron grate, hand resting on the pommel of his longsword, followed by four Imperial guards with drawn crossbows.',
    geoBlock: GEO_FORGE,
    camera: {
      lens: '35mm',
      move: 'slow lateral tracking right with Malic',
      reason: 'track the military intrusion into sacred artisan space',
      rig: 'steadicam',
      framing: 'master_wide',
      screenDirection: 'screen_right',
      depthOfField: 'deep',
    },
    cinematics: {
      filmStock: 'kodak_vision3_500t',
      lensGlass: 'anamorphic_2x_oval_bokeh',
      lightingSetup: 'chiaroscuro_high_contrast',
      colorTemp: 'tungsten_3200k',
      atmosphere: 'heavy_fog',
    },
    audioBlock: {
      dialogue: [
        {
          voiceRef: 'char_malic',
          line: 'Twelve years in exile, Corvus. And yet you still smell of sulfur and treason.',
        },
      ],
      sfx: 'heavy iron chain rattle, pressurized steam discharge, metal boots echoing on iron grating',
      music: 'none',
    },
    refs: [
      { assetId: 'loc_caldera_forge', role: 'location' },
      { assetId: 'char_malic', role: 'character' },
      { assetId: 'style_prestige_mythic', role: 'style' },
    ],
  },
  {
    id: 'seq01-shot04',
    sequence: 'seq01',
    durationS: 8,
    action:
      'Medium over-the-shoulder shot past Malic’s burnished armor looking at Corvus at the anvil. Corvus does not look up; he dunks a glowing rivet into an oil trough with calm, hypnotic deliberate precision as black smoke coils upward.',
    geoBlock: GEO_FORGE,
    camera: {
      lens: '50mm',
      move: 'slow creeping dolly push-in on Corvus',
      reason: 'emphasize Corvus total lack of fear and psychological dominance over the armed invaders',
      rig: 'dolly_track',
      framing: 'medium_ots',
      screenDirection: 'screen_left',
      eyelineTarget: 'char_malic',
      depthOfField: 'shallow',
    },
    cinematics: {
      filmStock: 'kodak_vision3_500t',
      lensGlass: 'anamorphic_2x_oval_bokeh',
      lightingSetup: 'chiaroscuro_high_contrast',
      colorTemp: 'golden_hour_2800k',
      atmosphere: 'subtle_volumetric_haze',
    },
    audioBlock: {
      dialogue: [
        {
          voiceRef: 'char_corvus',
          line: 'In the fourth dynasty, General, your predecessors removed their helmets before entering a foundry. [pause: 700ms] Out of respect for the heat.',
        },
      ],
      sfx: 'violent oil quench hiss, water bubbling, subtle draft of volcanic wind',
      music: 'none',
    },
    refs: [
      { assetId: 'loc_caldera_forge', role: 'location' },
      { assetId: 'char_corvus', role: 'character' },
      { assetId: 'char_malic', role: 'character' },
      { assetId: 'style_prestige_mythic', role: 'style' },
    ],
  },
  {
    id: 'seq01-shot05',
    sequence: 'seq01',
    durationS: 7,
    action:
      'Tight close-up on Corvus setting down the tongs with a deliberate click. His scarred face turns toward camera, eyes locking onto Malic with chilling, amused authority.',
    geoBlock: GEO_FORGE,
    camera: {
      lens: '50mm',
      move: 'static locked off',
      reason: 'unyielding stillness conveys absolute power',
      rig: 'tripod',
      framing: 'close_up',
      screenDirection: 'screen_left',
      eyelineTarget: 'char_malic',
      depthOfField: 'shallow',
    },
    cinematics: {
      filmStock: 'kodak_vision3_500t',
      lensGlass: 'anamorphic_2x_oval_bokeh',
      lightingSetup: 'chiaroscuro_high_contrast',
      colorTemp: 'golden_hour_2800k',
      atmosphere: 'dust_particulates',
    },
    audioBlock: {
      dialogue: [
        {
          voiceRef: 'char_corvus',
          line: 'You are standing on the primary steam vent plate, Malic. Take two steps to your left, or become grease.',
        },
      ],
      sfx: 'tongs click on iron, high-pitched steam pipe whistling beneath the floor',
      music: 'none',
    },
    refs: [
      { assetId: 'loc_caldera_forge', role: 'location' },
      { assetId: 'char_corvus', role: 'character' },
      { assetId: 'char_malic', role: 'character' },
      { assetId: 'style_prestige_mythic', role: 'style' },
    ],
  },
  {
    id: 'seq01-shot06',
    sequence: 'seq01',
    durationS: 8,
    action:
      'From the cavern darkness behind the anvil, the ground violently trembles. Dust cascades from the ceiling. A massive 8-foot golden iris dilates in the shadow as the COLOSSUS raises its horned head, looking directly down at the Imperial soldiers.',
    geoBlock: GEO_FORGE,
    camera: {
      lens: '24mm',
      move: 'slow pedestal up revealing the titan eye',
      reason: 'unveil the terrifying awakening of the slumbering power',
      rig: 'technocrane',
      framing: 'master_wide',
      depthOfField: 'deep',
    },
    cinematics: {
      filmStock: 'kodak_vision3_500t',
      lensGlass: 'anamorphic_2x_oval_bokeh',
      lightingSetup: 'chiaroscuro_high_contrast',
      colorTemp: 'golden_hour_2800k',
      atmosphere: 'dust_particulates',
    },
    audioBlock: {
      dialogue: [
        {
          voiceRef: 'char_colossus',
          line: 'They brought iron, Corvus. [pause: 900ms] Small men always bring iron to a conversation about blood.',
        },
      ],
      sfx: 'deep sub-bass 28Hz earth tremor, rock fracturing, sulfur breath hiss',
      music: 'none',
    },
    refs: [
      { assetId: 'loc_caldera_forge', role: 'location' },
      { assetId: 'char_colossus', role: 'character' },
      { assetId: 'char_corvus', role: 'character' },
      { assetId: 'char_malic', role: 'character' },
      { assetId: 'style_prestige_mythic', role: 'style' },
    ],
  },
  {
    id: 'seq01-shot07',
    sequence: 'seq01',
    durationS: 6,
    action:
      'Extreme close-up on General Malic’s eyes. The imperial confidence completely shatters. Sweat beads on his brow, illuminated by the glowing amber eye of the titan reflected in his polished breastplate.',
    geoBlock: GEO_FORGE,
    camera: {
      lens: '85mm',
      move: 'subtle handheld breath tension',
      reason: 'register the visceral terror of human military facing a living cosmic calamity',
      rig: 'handheld',
      framing: 'extreme_close_up',
      screenDirection: 'screen_right',
      eyelineTarget: 'char_colossus',
      depthOfField: 'shallow',
    },
    cinematics: {
      filmStock: 'kodak_vision3_500t',
      lensGlass: 'anamorphic_2x_oval_bokeh',
      lightingSetup: 'chiaroscuro_high_contrast',
      colorTemp: 'golden_hour_2800k',
      atmosphere: 'subtle_volumetric_haze',
    },
    audioBlock: {
      sfx: 'Malic sharp intake of breath, leather armor creaking, crossbow strings shaking',
      music: 'none',
    },
    refs: [
      { assetId: 'loc_caldera_forge', role: 'location' },
      { assetId: 'char_malic', role: 'character' },
      { assetId: 'style_prestige_mythic', role: 'style' },
    ],
  },
  {
    id: 'seq01-shot08',
    sequence: 'seq01',
    durationS: 8,
    action:
      'Widescreen 2.39:1 tableau: Corvus stands unmoving center-frame between the trembling Imperial squad on the right and the colossal glowing silhouette of the Colossus on the left. Corvus raises his tongs holding the mechanical heart core, glowing like an artificial sun.',
    geoBlock: GEO_FORGE,
    camera: {
      lens: '24mm',
      move: 'slow dramatic push-in to full symmetry',
      reason: 'cement the central moral covenant: the smith who holds the fate of humanity and gods in his tongs',
      rig: 'dolly_track',
      framing: 'master_wide',
      depthOfField: 'deep',
    },
    cinematics: {
      filmStock: 'kodak_vision3_500t',
      lensGlass: 'anamorphic_2x_oval_bokeh',
      lightingSetup: 'chiaroscuro_high_contrast',
      colorTemp: 'golden_hour_2800k',
      atmosphere: 'dust_particulates',
    },
    audioBlock: {
      dialogue: [
        {
          voiceRef: 'char_corvus',
          line: 'Tell the Emperor his empire ends at this anvil.',
        },
      ],
      sfx: 'molten core hum, sub-bass 32Hz swell, distant volcanic thunder',
      music: 'none',
    },
    refs: [
      { assetId: 'loc_caldera_forge', role: 'location' },
      { assetId: 'char_corvus', role: 'character' },
      { assetId: 'char_colossus', role: 'character' },
      { assetId: 'char_malic', role: 'character' },
      { assetId: 'style_prestige_mythic', role: 'style' },
    ],
  },
];

for (const s of shots) {
  await skipIfExists(() => shotCreate(paths, FILM_ID, s), `Shot: ${s.id}`);
}

console.log('\n🎉 ========================================================');
console.log('   FLAGSHIP PRE-PRODUCTION STAGED SUCCESSFULLY!');
console.log(`   Film ID: ${FILM_ID}`);
console.log(`   Total Shots: ${shots.length} (48 seconds of master cinema)`);
console.log('   Ready for character sheets, contact sheets, and parallel render.');
console.log('==========================================================\n');
