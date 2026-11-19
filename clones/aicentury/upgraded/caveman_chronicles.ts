// clones/aicentury/upgraded/caveman_chronicles.ts
// PRO-GRADE UPGRADED SKIT SERIES: "Grok Unfiltered: Prehistoric Tech Chronicles"
// Replaces static AI Century AC78 "display mode" with multi-shot comedic acting,
// slapstick choreography, diegetic Foley, and continuous frame chaining.

export interface SkitShot {
  shot_id: string;
  shot_title: string;
  duration_sec: number;
  aspect_ratio: '9:16';
  continuity: 'new_setup' | 'continuous';
  chain_from_shot_id?: string;
  camera: {
    movement: string;
    framing: string;
    lens: string;
    lighting: string;
  };
  acting_performance: {
    emotion: string;
    micro_expressions: string;
    body_language: string;
  };
  prompt: string;
  negative_prompt: string;
  dialogue?: {
    character: string;
    line: string;
  };
  foley_sfx: string[];
}

export interface SkitEpisode {
  episode_number: number;
  title: string;
  logline: string;
  shots: SkitShot[];
}

export const CAVEMAN_SERIES: SkitEpisode[] = [
  {
    episode_number: 1,
    title: 'The Fire God in the Glass',
    logline: 'Grok unboxes an indestructible smartphone on a mossy boulder in 20,000 BC, mistaking face recognition for tribal sorcery.',
    shots: [
      {
        shot_id: 'ep01_shot_01',
        shot_title: 'The Discovery & Taste Test',
        duration_sec: 4,
        aspect_ratio: '9:16',
        continuity: 'new_setup',
        camera: {
          movement: 'slow push-in from ground level tilting up to Grok',
          framing: 'medium close-up, low angle',
          lens: '24mm wide angle, shallow depth of field',
          lighting: 'dappled prehistoric morning sunlight through giant ferns'
        },
        acting_performance: {
          emotion: 'feral curiosity and deep suspicion',
          micro_expressions: 'flared nostrils, aggressive squint, sniffing the camera lens with rapid eye twitches',
          body_language: 'crouched in an animalistic defensive hunch, gently poking the glass screen with a flint tip'
        },
        prompt: 'Cinematic comedy film shot. In 20,000 BC, a hyper-realistic Neanderthal man named Grok with wild matted dark hair, dirt-streaked weathered skin with visible pores, and wearing a rugged mammoth fur pelt crouches over a pristine titanium smartphone on a mossy boulder. He leans in close, smelling the screen with intense suspicion, his brow furrowed in feral curiosity. Raw prehistoric wilderness in background with giant prehistoric pine trees and morning mist. Cinematic natural sunlight, volumetric sunbeams, photorealistic skin texture, 35mm film grain, 8k resolution, no plastic CGI.',
        negative_prompt: 'smooth plastic skin, CGI cartoon look, modern clothing, blurry hands, extra fingers, studio glamour lighting',
        dialogue: {
          character: 'Grok',
          line: '*[Sniffs phone loudly, grunts softly]* "Mmph... black shiny rock no smell like food. Why rock cold?"'
        },
        foley_sfx: ['dappled forest wind', 'flint scraping glass clink', 'heavy nasal sniffing', 'creaking mammoth pelt leather']
      },
      {
        shot_id: 'ep01_shot_02',
        shot_title: 'The Blinding Flash & Panic Jolt',
        duration_sec: 4,
        aspect_ratio: '9:16',
        continuity: 'continuous',
        chain_from_shot_id: 'ep01_shot_01',
        camera: {
          movement: 'frantic camera jolt and slight Dutch tilt',
          framing: 'extreme close-up on Grok’s face',
          lens: '24mm front-facing selfie vlog perspective at arm’s length',
          lighting: 'harsh white screen illumination contrasting with warm sunlight'
        },
        acting_performance: {
          emotion: 'pure primal terror',
          micro_expressions: 'jaw unhinged in shock, pupils dilating, eyes bulging as the lock screen glows bright',
          body_language: 'head snapping violently backward while arms stiffen, dropping the phone onto his knee'
        },
        prompt: 'Continuation of previous shot. Front-facing wide selfie camera angle held at trembling arm’s length. The phone screen suddenly bursts with bright white OLED light, casting stark high-contrast glow onto Grok’s face. Grok’s eyes bug out in catastrophic horror, his mouth opening in an unhinged scream of panic, teeth gritted, jaw dropping. The camera shakes violently with authentic handheld kinetic motion. Prehistoric wilderness background shakes with motion blur. Ultra-realistic facial performance, hyper-detailed sweat beads and dirt smudges, 35mm film stock.',
        negative_prompt: 'static posture, unemotional face, smooth skin, synthetic render, cartoon exaggeration',
        dialogue: {
          character: 'Grok',
          line: '*[High-pitched guttural shriek]* "GAAAH! ROCK BITEY WITH SUN! SUN LIVE IN ROCK!"'
        },
        foley_sfx: ['digital OLED wake chime', 'terrified guttural gasp', 'frantic arm rustle', 'phone clattering against kneecap']
      },
      {
        shot_id: 'ep01_shot_03',
        shot_title: 'Siri Speaks — The Peace Offering',
        duration_sec: 4,
        aspect_ratio: '9:16',
        continuity: 'continuous',
        chain_from_shot_id: 'ep01_shot_02',
        camera: {
          movement: 'dramatic low-angle tilt down to phone on boulder, rack focus back to Grok',
          framing: 'medium close-up, ground perspective',
          lens: '28mm anamorphic',
          lighting: 'glowing cyan Siri waveform reflecting on dark mammoth leather'
        },
        acting_performance: {
          emotion: 'reverence mixed with sheer bafflement',
          micro_expressions: 'timid apologetic grimace, lips trembling, whispering reverently',
          body_language: 'prostrating slightly, delicately holding a piece of dried mammoth jerky toward the USB-C port'
        },
        prompt: 'Cinematic comedy acting shot. Grok is on his knees before the glowing phone rested against a prehistoric mossy rock. Grok gingerly holds out a piece of tough, smoked brown mammoth meat toward the bottom charging port of the phone, attempting to appease the glowing device like an angry deity. His brow is furrowed in deep submissive confusion. Prehistoric misty forest background with ferns. Rich chiaroscuro lighting, natural film tones, cinematic comedy timing, realistic textures.',
        negative_prompt: 'flat lighting, modern room, fake prop look, smooth CGI, smiling modern actor',
        dialogue: {
          character: 'Grok',
          line: '*[Whispering humbly]* "Peace, tiny sun-woman. Grok bring mammoth jerky. You eat, no burn Grok."'
        },
        foley_sfx: ['calm Siri synthetic voice: "I found several results for mammoth near you"', 'Grok whimpering gasp', 'slap of dried meat hitting stone', 'distant crow caw']
      },
      {
        shot_id: 'ep01_shot_04',
        shot_title: 'The Catastrophic Drop & Cliffhanger Stare',
        duration_sec: 4,
        aspect_ratio: '9:16',
        continuity: 'continuous',
        chain_from_shot_id: 'ep01_shot_03',
        camera: {
          movement: 'accidental drop: phone tilts, rolls into muddy puddle, lands pointing upward at Grok',
          framing: 'extreme low angle looking up from muddy puddle',
          lens: '18mm ultra-wide lens covered in prehistoric mud splatters',
          lighting: 'murky green under-canopy lighting with phone screen backlight'
        },
        acting_performance: {
          emotion: 'stunned deadpan disbelief',
          micro_expressions: 'single slow blink, jaw slowly dropping, frozen side-eye to an unseen tribe member',
          body_language: 'frozen in mid-gesture, hand hovering in air where phone used to be'
        },
        prompt: 'High-comedy climax shot. The camera is landed face-up in a shallow prehistoric muddy puddle, with realistic water droplets and brown mud splattered across the bottom edge of the lens. Looking straight up at Grok standing above, his face framed against ancient towering pine trees and cloudy sky. Grok looks down directly into the camera lens with an unforgettable deadpan comedic stare of utter shock, frozen like a statue, one hand still hovering in the shape of holding the phone. Cinematic comedy gold, crisp water droplet reflections, 8k film texture.',
        negative_prompt: 'clean lens, flat digital video, artificial CGI, unnatural anatomy',
        dialogue: {
          character: 'Grok',
          line: '*[Dead silence, then a low defeated mutter]* "Sun-woman sleep in mud now. Chieftain gonna be mad."'
        },
        foley_sfx: ['wet mud splash squelch', 'water droplet landing on glass lens', 'distant saber-tooth tiger roar', 'awkward crickets chirping']
      }
    ]
  },
  {
    episode_number: 2,
    title: 'Grok Discovers FaceTime',
    logline: 'An accidental swipe connects Grok to a Tokyo corporate strategy board meeting. The managers assume he is an eccentric viral marketer.',
    shots: [
      {
        shot_id: 'ep02_shot_01',
        shot_title: 'The Accidental Video Call',
        duration_sec: 4,
        aspect_ratio: '9:16',
        continuity: 'new_setup',
        camera: {
          movement: 'unstable handheld shaking, lens pressed uncomfortably close to nostrils',
          framing: 'tight selfie macro',
          lens: '20mm wide lens',
          lighting: 'phone screen glow flickering on sweat and dirt'
        },
        acting_performance: {
          emotion: 'intense aggression and dominance display',
          micro_expressions: 'bared teeth, flaring nostrils, eyebrow arch of pure intimidation',
          body_language: 'puffing chest, shaking the phone like a spear'
        },
        prompt: 'Extreme comedic performance. Up-close selfie vlog perspective held by a muscular Neanderthal with thick mud war-paint and mammoth bone necklace. His face fills 80% of the frame, scowling with intense primal ferocity into the camera, teeth bared in an aggressive war grimace. In the corner of the phone interface, a picture-in-picture shows a bewildered Japanese corporate executive in a suit in an ultra-modern glass boardroom. Photorealistic, dramatic comedy contrast, authentic 35mm grain.',
        negative_prompt: 'CGI, blurry, smooth skin, cartoon teeth, fake background',
        dialogue: {
          character: 'Grok',
          line: '*[Loud guttural war-grunt]* "RRRRAAAAGH! WHO ARE SMALL SUIT-MEN TRAPPED IN TINY BOX?!"'
        },
        foley_sfx: ['FaceTime ringing chime connects', 'corporate boardroom echo', 'heavy caveman chest-thump', 'wind through cave opening']
      },
      {
        shot_id: 'ep02_shot_02',
        shot_title: 'Corporate Misunderstanding',
        duration_sec: 4,
        aspect_ratio: '9:16',
        continuity: 'continuous',
        chain_from_shot_id: 'ep02_shot_01',
        camera: {
          movement: 'quick whip-pan around cave as Grok shows off his "office"',
          framing: 'wide selfie perspective at arm’s length',
          lens: '24mm front-facing',
          lighting: 'torchlight flickering against stone cave art'
        },
        acting_performance: {
          emotion: 'smug pride and condescending superiority',
          micro_expressions: 'smirking side-eye, lifting chin, pointing thumb back at cave drawings',
          body_language: 'showing off his stone club and dried fish hanging from the cave ceiling'
        },
        prompt: 'High-comedy continuation shot. Grok holds the phone at arm’s length, turning around with exaggerated swagger inside a dark torch-lit prehistoric cave. He gestures grandly with a heavy stone club toward cave wall paintings of mammoths and hanging dried fish, treating it like a luxury penthouse tour for the people on the call. Warm glowing torchlight illuminates his weathered face and pelt. Cinematic realism, crisp comedy acting, vivid dynamic lighting.',
        negative_prompt: 'static scene, modern background, cartoon stylization, oversaturated colors',
        dialogue: {
          character: 'Grok',
          line: '"You like Grok cave? Mammoth pelt 100% genuine. No synthetic garbage like suit-men wear."'
        },
        foley_sfx: ['crackling torch fire', 'executive through speaker: "Is this the new Q3 branding campaign?"', 'stone club thumping ground']
      },
      {
        shot_id: 'ep02_shot_03',
        shot_title: 'The Mute Button Incident',
        duration_sec: 4,
        aspect_ratio: '9:16',
        continuity: 'continuous',
        chain_from_shot_id: 'ep02_shot_02',
        camera: {
          movement: 'rapid push-in as Grok aggressively taps the screen',
          framing: 'close-up on Grok’s bewildered eyes and mouth',
          lens: '24mm wide angle',
          lighting: 'torchlight mixed with red mute icon glow'
        },
        acting_performance: {
          emotion: 'confounded frustration',
          micro_expressions: 'lips moving frantically but suddenly realizing no sound is coming out',
          body_language: 'tapping the phone frantically with a massive calloused thumb'
        },
        prompt: 'Comedy shot. Grok stares with wide, panicked eyes at the phone screen where a glowing red microphone with a slash through it appears. Grok is furiously shouting and waving his stone club, but his face freezes as he realizes the small people in the screen are cupping their ears and laughing. Intense comedic facial expression, sweat glistens on his furrowed forehead, authentic Neanderthal features, film grain.',
        negative_prompt: 'unemotional, wooden acting, flat lighting, digital smoothing',
        dialogue: {
          character: 'Grok',
          line: '*[Muffled silence, followed by panicked tapping]* "WHY VOICE DISAPPEAR?! RED SLASH DEVIL TOOK GROK VOICE!"'
        },
        foley_sfx: ['muffled microphone rub', 'executive voice: "Grok, you are on mute, unmute yourself"', 'frantic heavy thumb tapping on glass']
      },
      {
        shot_id: 'ep02_shot_04',
        shot_title: 'The Sacred Screenshot Climax',
        duration_sec: 4,
        aspect_ratio: '9:16',
        continuity: 'continuous',
        chain_from_shot_id: 'ep02_shot_03',
        camera: {
          movement: 'blinding white flash frame, then slow camera tilt down',
          framing: 'medium shot of Grok frozen in fear holding phone like a hot potato',
          lens: '28mm lens',
          lighting: 'white flash dissipating into soft torchlight'
        },
        acting_performance: {
          emotion: 'mystified awe and dread',
          micro_expressions: 'quivering lip, eyes looking down at phone as if expecting it to explode',
          body_language: 'holding phone delicately with just two fingertips, tiptoeing backwards'
        },
        prompt: 'Climactic episode punchline shot. An intense camera screenshot flash fades away, leaving Grok standing in his torch-lit cave frozen in pure astonishment. On the screen, a saved screenshot of his own horrified face is frozen. Grok stares at his own digital reflection holding the phone with just two trembling fingertips as if it might detonate. In the background, other cavemen peek nervously from behind a boulder. Masterful comedic directing, high-fidelity film lighting, 8k realism.',
        negative_prompt: 'cheap prop, bad anatomy, cartoon aesthetics, oversaturated CGI',
        dialogue: {
          character: 'Grok',
          line: '*[Trembling whisper]* "Box stole Grok soul. Grok lives inside box now. Goodbye cruel world."'
        },
        foley_sfx: ['iPhone shutter click echo through cave', 'distant tribal murmurs', 'lone drop of water hitting puddle', 'comedic low cello drone']
      }
    ]
  }
];
