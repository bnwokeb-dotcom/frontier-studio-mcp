// src/narrative/ensemble_skit.ts — Ensemble Multi-Character Episodic Skit Engine
// Upgrades flat AI Century / Nafay prompt templates into serialized, multi-character narrative entertainment.

import type { AutonomousProductionGoal } from '../harness/runner.js';

export type CharacterArchetype =
  | 'protagonist_hustler'
  | 'deadpan_straight_man'
  | 'chaotic_wildcard'
  | 'glitched_npc'
  | 'overconfident_amateur'
  | 'bureaucratic_antagonist';

export interface EnsembleCharacter {
  id: string;
  name: string;
  archetype: CharacterArchetype;
  descriptor: string; // Headless physical description for turnaround sheet
  voice: {
    pitch: number;
    speed: number;
    timbre: string;
    accent?: string;
  };
  acting_quirk: string; // Facial micro-expressions, posture, comic physical tics
}

export type BeatType =
  | 'inciting_collision'
  | 'dialogue_volley'
  | 'reaction_take'
  | 'escalation_absurdity'
  | 'climax_punchline'
  | 'ironic_button';

export interface EnsembleBeat {
  id: string;
  beat_type: BeatType;
  speaker_id?: string;
  dialogue?: string;
  listener_reaction?: {
    character_id: string;
    reaction: string;
  };
  action: string;
  staging: {
    screen_left?: string;
    screen_right?: string;
    center?: string;
  };
  camera: {
    lens: string;
    move: string;
    reason: string;
    framing: 'wide_two_shot' | 'medium_ots' | 'close_up' | 'reaction_punch' | 'dutch_tilt_panic';
  };
  duration_s: number;
  continuity: 'cut' | 'continuous' | 'match_cut' | 'transition';
  chain_from_shot_id?: string;
  diegetic_foley: string[];
}

export interface EnsembleSkitScript {
  universe: string;
  episode_number: number;
  episode_title: string;
  logline: string;
  budget_usd: number;
  target_model?: 'minimax-h3' | 'omniflash-1.2' | 'kling-4';
  aspect_ratio: '9:16' | '16:9';
  characters: EnsembleCharacter[];
  location: {
    id: string;
    name: string;
    descriptor: string;
    geo_block: string;
  };
  beats: EnsembleBeat[];
}

/**
 * Compiles a rich episodic multi-character skit script into an unbending
 * AutonomousProductionGoal ready for headless studio execution.
 */
export function compileEnsembleSkit(script: EnsembleSkitScript): AutonomousProductionGoal {
  if (script.characters.length < 2) {
    throw new Error('Ensemble skit law violation: At least 2 interacting characters required for purposeful narrative drama/comedy.');
  }
  if (!script.beats.length) {
    throw new Error('Ensemble skit law violation: Script must contain at least 1 narrative beat.');
  }

  const shots = script.beats.map((b) => {
    // Generate enriched action beat with character acting quirks
    let enrichedAction = b.action;
    if (b.speaker_id) {
      const char = script.characters.find((c) => c.id === b.speaker_id);
      if (char) {
        enrichedAction += ` [Acting: ${char.name} displays ${char.acting_quirk}]`;
      }
    }
    if (b.listener_reaction) {
      const listener = script.characters.find((c) => c.id === b.listener_reaction?.character_id);
      if (listener) {
        enrichedAction += ` [Reaction: ${listener.name} ${b.listener_reaction.reaction}]`;
      }
    }

    return {
      id: b.id,
      action: enrichedAction,
      camera: {
        lens: b.camera.lens,
        move: b.camera.move,
        reason: b.camera.reason
      },
      duration_s: b.duration_s,
      continuity: b.continuity,
      chain_from_shot_id: b.chain_from_shot_id,
      dialogue: b.speaker_id && b.dialogue ? {
        character: b.speaker_id,
        line: b.dialogue
      } : undefined
    };
  });

  return {
    film_id: `${script.universe}_ep${String(script.episode_number).padStart(2, '0')}`,
    title: script.episode_title,
    logline: script.logline,
    budget_usd: script.budget_usd,
    niche: 'episodic_skit_comedy',
    aspect_ratio: script.aspect_ratio,
    target_model: script.target_model || 'minimax-h3',
    characters: script.characters.map((c) => ({
      asset_id: c.id,
      descriptor: c.descriptor,
      voice: c.voice,
      acting: c.acting_quirk
    })),
    location: {
      asset_id: script.location.id,
      descriptor: script.location.descriptor,
      geo_block: script.location.geo_block
    },
    shots
  };
}

/**
 * PRESET CANONICAL UNIVERSES
 * Transforms raw one-off prompt concepts into recurring, bingeable episodic universes.
 */

// 1. Upgraded GTA Los Santos Chronicles (Transforms AC93 PS2 Style into a viral narrative comedy)
export function createGtaEpisode01(): EnsembleSkitScript {
  return {
    universe: 'gta_los_santos_chronicles',
    episode_number: 1,
    episode_title: 'The Contactless Payment Glitch',
    logline: 'Marcus tries to pay for a 99-cent soda at 2 AM, but the 24/7 store clerk is an unpatched NPC who refuses to break his idle animation.',
    budget_usd: 120,
    aspect_ratio: '9:16',
    target_model: 'minimax-h3',
    characters: [
      {
        id: 'char_marcus',
        name: 'Marcus Vance',
        archetype: 'protagonist_hustler',
        descriptor: 'streetwise male in early 30s wearing a weathered green oversized bomber jacket, gold neck chain, low-poly PS2 aesthetic with sharp jawline and authentic early-2000s game textures',
        voice: { pitch: 0.92, speed: 1.05, timbre: 'gritty, impatient urban baritone' },
        acting_quirk: 'exaggerated hand waves of disbelief, head tilting in frustration, aggressive phone-tapping'
      },
      {
        id: 'char_npc_clerk',
        name: 'Clerk Dale',
        archetype: 'glitched_npc',
        descriptor: 'unblinking convenience store clerk in grease-stained blue apron, stiff PS2 polygon mesh posture, vacant expression with frozen half-smile',
        voice: { pitch: 1.15, speed: 0.9, timbre: 'robotic monotone nasal greeting' },
        acting_quirk: 'stiff T-pose twitch, unblinking 1000-yard stare, repeating the same identical nodding loop regardless of chaos'
      }
    ],
    location: {
      id: 'loc_247_vinewood',
      name: 'Vinewood 24/7 Minimart',
      descriptor: 'flickering fluorescent lit convenience store interior, linoleum floor, snack racks on north aisle, glass soda fridge on east wall, bulletproof glass cash counter on south',
      geo_block: 'Cash counter on south wall with cash register facing north; beverage coolers lining east wall with humming motor; entrance double doors facing west onto foggy neon Los Santos boulevard.'
    },
    beats: [
      {
        id: 'gta_ep01_shot_01',
        beat_type: 'inciting_collision',
        speaker_id: 'char_marcus',
        dialogue: 'Yo Dale, I am just tapping my phone. Why is the terminal saying "Insert Disc 2"?',
        action: 'Marcus aggressively taps his modern smartphone against the ancient gray card reader at the counter, glaring at Dale.',
        staging: { screen_left: 'char_marcus', screen_right: 'char_npc_clerk' },
        camera: {
          lens: '24mm',
          move: 'slow Dutch push-in from entrance toward counter',
          reason: 'establish physical spatial confrontation between player and NPC',
          framing: 'wide_two_shot'
        },
        duration_s: 4,
        continuity: 'cut',
        diegetic_foley: ['harsh electronic terminal beep', 'flickering fluorescent light buzz', 'distant Los Santos sirens']
      },
      {
        id: 'gta_ep01_shot_02',
        beat_type: 'reaction_take',
        speaker_id: 'char_npc_clerk',
        dialogue: 'Welcome to 24/7! Clean up on aisle... never.',
        action: 'Dale performs a glitchy rigid neck twitch, looking past Marcus with zero pupil tracking, lips barely moving in stiff polygon synch.',
        staging: { screen_right: 'char_npc_clerk' },
        camera: {
          lens: '50mm',
          move: 'static lock-off over Marcus shoulder',
          reason: 'accentuate uncanny, lifeless comedic stare of the glitched clerk',
          framing: 'medium_ots'
        },
        duration_s: 3,
        continuity: 'cut',
        chain_from_shot_id: 'gta_ep01_shot_01',
        diegetic_foley: ['convenience store bell chime', 'static humming refrigeration']
      },
      {
        id: 'gta_ep01_shot_03',
        beat_type: 'escalation_absurdity',
        speaker_id: 'char_marcus',
        dialogue: 'Bro, do not make me pull up the weapon wheel over a grape soda!',
        action: 'Marcus throws both arms in the air in pure disbelief, leaning over the counter while a faint translucent radial wheel briefly flickers above his head.',
        staging: { screen_left: 'char_marcus' },
        camera: {
          lens: '35mm',
          move: 'dynamic handheld shake and low tilt',
          reason: 'capture Marcus rising frustration and sudden game UI glitch',
          framing: 'close_up'
        },
        duration_s: 4,
        continuity: 'cut',
        chain_from_shot_id: 'gta_ep01_shot_02',
        diegetic_foley: ['subtle game UI click sound', 'foot stomp on linoleum']
      },
      {
        id: 'gta_ep01_shot_04',
        beat_type: 'climax_punchline',
        action: 'A police cruiser headlights illuminate through the front store window; two wanted stars spontaneously ignite in the top right corner while Dale keeps smiling.',
        staging: { center: 'both characters in silhouette with flashing red and blue police strobe' },
        camera: {
          lens: '24mm',
          move: 'rapid snap zoom-out to wide exterior through broken window glass',
          reason: 'punchline button: maximum comedic consequence for a 99-cent soda',
          framing: 'reaction_punch'
        },
        duration_s: 4,
        continuity: 'cut',
        chain_from_shot_id: 'gta_ep01_shot_03',
        diegetic_foley: ['police siren blare', 'glass rattle', 'GTA wanted star ignition chime']
      }
    ]
  };
}

// 2. Upgraded Prehistoric Tech Chronicles (Transforms AC78 Caveman Vlog into an ensemble sitcom)
export function createCavemanEpisode01(): EnsembleSkitScript {
  return {
    universe: 'prehistoric_tech_chronicles',
    episode_number: 1,
    episode_title: 'The Fire Box Demon',
    logline: 'Grok brings a frozen woolly mammoth tusk into Chad apartment kitchen and mistakes the microwave for a captive sun demon.',
    budget_usd: 120,
    aspect_ratio: '9:16',
    target_model: 'minimax-h3',
    characters: [
      {
        id: 'char_grok',
        name: 'Grok',
        archetype: 'chaotic_wildcard',
        descriptor: 'muscular Neanderthal in primitive stitched mammoth pelt tunic with unkempt matted black beard, intense animalistic eyes, and dirty barefoot posture',
        voice: { pitch: 0.78, speed: 0.95, timbre: 'deep guttural rumbling caveman drawl' },
        acting_quirk: 'feral sniffing of electronics, crouching into defensive low-squat, wide-eyed alarm at chimes'
      },
      {
        id: 'char_chad',
        name: 'Chad',
        archetype: 'deadpan_straight_man',
        descriptor: 'exhausted modern tech worker wearing oversized gray hoodie, beige sweatpants, wired earbuds, and sipping iced coffee from a mason jar',
        voice: { pitch: 1.05, speed: 1.1, timbre: 'flat sarcastic modern urban millennial' },
        acting_quirk: 'pinching bridge of nose in resignation, slow sip from straw without breaking eye contact'
      }
    ],
    location: {
      id: 'loc_modern_kitchen',
      name: 'Downtown Loft Kitchen',
      descriptor: 'white marble kitchen island with chrome microwave on south counter, stainless steel refrigerator on west, breakfast bar stools on east',
      geo_block: 'Kitchen island center; chrome microwave glowing yellow on south counter; floor-to-ceiling glass patio windows on west showing morning skyline.'
    },
    beats: [
      {
        id: 'cave_ep01_shot_01',
        beat_type: 'inciting_collision',
        speaker_id: 'char_grok',
        dialogue: 'Small sun trapped in shiny metal box! It hums with thunder spirits!',
        action: 'Grok squats low on the hardwood floor, cautiously poking the glowing microwave button with a mammoth bone stylus while baring his teeth.',
        staging: { screen_left: 'char_grok', screen_right: 'char_chad' },
        camera: {
          lens: '24mm',
          move: 'low-angle slow creep forward',
          reason: 'frame Grok animalistic dread against clean modern interior',
          framing: 'wide_two_shot'
        },
        duration_s: 4,
        continuity: 'cut',
        diegetic_foley: ['deep microwave motor hum', 'mammoth bone clinking on glass', 'tense guttural breathing']
      },
      {
        id: 'cave_ep01_shot_02',
        beat_type: 'dialogue_volley',
        speaker_id: 'char_chad',
        dialogue: 'Grok, that is a Hot Pocket. If you stab the door seal with that bone, we both get radiation poisoning.',
        action: 'Chad leans against the refrigerator, slowly rotating his iced coffee with a look of profound spiritual fatigue.',
        staging: { screen_right: 'char_chad' },
        camera: {
          lens: '50mm',
          move: 'static eye-level lock',
          reason: 'contrast deadpan modern apathy against prehistoric terror',
          framing: 'medium_ots'
        },
        duration_s: 4,
        continuity: 'cut',
        chain_from_shot_id: 'cave_ep01_shot_01',
        diegetic_foley: ['slurping iced coffee through straw', 'refrigerator hum']
      },
      {
        id: 'cave_ep01_shot_03',
        beat_type: 'climax_punchline',
        speaker_id: 'char_grok',
        dialogue: 'IT SCREAMS! RUN FOR TREES!',
        action: 'The microwave dings loudly; Grok shrieks in visceral panic, drops to all fours, and tackles Chad behind the kitchen island.',
        staging: { center: 'chaotic dive toward camera' },
        camera: {
          lens: '24mm',
          move: 'violent handheld jolt and crash pan down',
          reason: 'slapstick impact: sudden kinetic collision',
          framing: 'dutch_tilt_panic'
        },
        duration_s: 4,
        continuity: 'cut',
        chain_from_shot_id: 'cave_ep01_shot_02',
        diegetic_foley: ['high-pitched microwave DING', 'shrieking vocal shout', 'crashing plastic and ice cubes on hardwood']
      }
    ]
  };
}
