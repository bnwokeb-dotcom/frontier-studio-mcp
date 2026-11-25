// src/prompts/filmmaker.ts — MCP Directorial Prompts for AI Agents (ChatGPT, Claude, Cursor).
// Provides native MCP prompt templates so connected LLM agents act as disciplined film directors,
// cinematographers, sound designers, and post-production editors.
import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

export function registerFilmmakerPrompts(server: McpServer): void {
  // 1. Director's Screenplay Breakdown
  server.prompt(
    'director_breakdown',
    'Converts a screenplay or beat sheet into an unbending, law-enforced film production plan with characters, locked locations, and shot lists.',
    {
      screenplay: z.string().describe('The screenplay, scene, or beat sheet to direct'),
      era: z.string().optional().describe('Stylistic era (e.g. 1970s Panavision, 1940s Noir, Contemporary Prestige, Cyberpunk)'),
    },
    async (args) => {
      const eraNotice = args.era ? `ERA / PERIOD DIRECTIVE: ${args.era}\n` : '';
      return {
        description: 'Directorial Screenplay Breakdown & Studio Law Strategy',
        messages: [
          {
            role: 'user',
            content: {
              type: 'text',
              text: `${eraNotice}You are the Supervising Film Director operating the frontier-studio-mcp production operating system.

Break down the following screenplay into a production plan. You must enforce structural continuity, spatial geometry, and double-entry accounting at every step.

SCREENPLAY:
${args.screenplay}

DIRECTORIAL LAWS (ENFORCE IN SEQUENCE):
1. FILM SETUP: Call \`film_create\` with film_id, title, logline, and budget.
2. CHARACTER CONTINUITY: For every actor, call \`asset_register\` with kind: 'character'. Characters MUST carry a physical descriptor, a \`voice\` block (pitch, speed, accent), and an \`acting\` block (posture, facial tics). Call \`character_sheet_build\` to generate their canonical 3-panel headless turnaround sheet.
3. LOCATION GEOMETRY: Register locations with \`asset_register\` including a \`geo_block\` (physical walls, cardinal directions, light placement). Freeze this map immediately with \`sequence_lock_geo\` — all shots in this sequence must paste this block verbatim.
4. KEYFRAME LIGHTING: Call \`keyframe_build\` to render the sequence anchor plate with motivated lighting.
5. PRE-VIS STORYBOARD: For multi-shot sequences, call \`storyboard_build\` to review the 2x3 contact sheet before committing render budget.
6. SHOT LIST & 180° RULE: Call \`shot_create\` for each shot. Enforce camera lens, movement motivation, screen direction (screen_left vs screen_right), and eyeline targets. Axis flips are structurally refused by the server.
7. CINEMATIC RENDER: Render shots via \`render_shot\`, track status with \`job_status\`, and download with \`job_download\` (which reconciles budget).
8. SOUNDSTAGE & POST: Render dialogue with \`dialogue_render\`, convolve room tone with \`acoustic_match\`, sync lips with \`shot_lipsync\`, apply 35mm grain and LUT with \`film_grade\`, and export DaVinci Resolve timelines with \`film_export_xml\`.`,
            },
          },
        ],
      };
    },
  );

  // 2. Cinematographer (DoP) Shot Designer
  server.prompt(
    'cinematographer_shot_designer',
    'Designs a single dramatic shot adhering to camera kinematics, 180-degree eyeline geometry, and physical optical physics.',
    {
      sequence: z.string().describe('Sequence identifier (e.g. seq01)'),
      action_beat: z.string().describe('The single action beat (present tense, max 3 sentences, no dialogue in action)'),
      actor_speaking: z.string().optional().describe('Registered character asset ID speaking, if any'),
      eyeline_target: z.string().optional().describe('Character this actor is looking at, if in dialogue'),
      screen_direction: z.enum(['screen_left', 'screen_right', 'center']).optional().describe('Actor staging direction in frame'),
      era: z.enum(['1920s_silent', '1940s_film_noir', '1970s_panavision', '1980s_vhs', '1990s_indie', 'contemporary']).optional(),
    },
    async (args) => {
      return {
        description: 'Cinematographer (DoP) Lens & Camera Block Generator',
        messages: [
          {
            role: 'user',
            content: {
              type: 'text',
              text: `You are the Director of Photography (DoP). Design a shot for sequence "${args.sequence}" following professional cinematography principles:

BEAT: ${args.action_beat}
ACTOR: ${args.actor_speaking ?? 'N/A'}
EYELINE TARGET: ${args.eyeline_target ?? 'N/A'}
SCREEN DIRECTION: ${args.screen_direction ?? 'center'}
ERA / STYLE: ${args.era ?? 'contemporary'}

CINEMATOGRAPHY RULES:
1. LENS SELECTION:
   - 24mm: Wide environmental isolation, deep perspective distortion.
   - 35mm: Establishing medium shots, natural environmental context.
   - 50mm: Human eye perspective, balanced drama.
   - 85mm: Close-up portrait, emotional intimacy, compressed background bokeh.
2. CAMERA RIG & MOVEMENT:
   - Tripod: Static tension, clinical observation.
   - Dolly / Track: Push-in on realization; pull-out on isolation/vulnerability.
   - Steadicam / Handheld: Kinetic pursuit, visceral urgency.
   - Technocrane: High vertical sweep revealing scale or fate.
3. 180-DEGREE CONTINUITY:
   - If Actor A was staged on screen_left looking right, Actor B in the reverse angle MUST be staged on screen_right looking left. Never cross the line.
4. OPTICS & LIGHTING:
   - Film Stock: Kodak Vision3 500T (warm golden halation) or ARRI Alexa 35 (wide dynamic range).
   - Lighting Setup: 4:1 key-to-fill ratio, 5600K daylight key with 3200K tungsten bounce fill.
5. EXECUTION:
   Formulate the exact arguments and call \`shot_create\`.`,
            },
          },
        ],
      };
    },
  );

  // 3. Soundstage & Acoustic Master
  server.prompt(
    'soundstage_master',
    'Directs the acoustic design, vocal synthesis, room convolution, and lip-sync multiplexing for a shot.',
    {
      shot_id: z.string().describe('The shot to engineer sound for'),
      location_profile: z.enum(['snow_forest', 'stone_cavern', 'wooden_cabin', 'concrete_room', 'open_desert']).describe('Physical acoustic environment'),
    },
    async (args) => {
      return {
        description: 'Soundstage & Audio Engineering Workflow',
        messages: [
          {
            role: 'user',
            content: {
              type: 'text',
              text: `You are the Supervising Sound Editor. Direct the audio post-production for shot "${args.shot_id}" in environment "${args.location_profile}":

ACOUSTIC PROTOCOL:
1. VOCAL SYNTHESIS: Call \`dialogue_render\` to synthesize broadcast-grade 48kHz WAV audio from the registered character's voice profile.
2. DIEGETIC SOUNDSCAPE: Call \`soundscape_build\` to synthesize ambient room tones and Foley SFX.
3. PHYSICAL CONVOLUTION: Call \`acoustic_match\` to convolve the vocal stem with the impulse response of "${args.location_profile}" and normalize to EBU R128 (-14 LUFS).
4. LIP-SYNC & MULTIPLEX: Call \`shot_lipsync\` to mux and sync the dialogue WAV with the rendered video take.`,
            },
          },
        ],
      };
    },
  );

  // 4. Commercial Ad Architect (Topview AI / High-Converting Video Ad Standard)
  server.prompt(
    'commercial_ad_architect',
    'Architects high-converting, Topview AI-grade commercial video ads for TikTok, Instagram Reels, and YouTube with hook pacing, packshot lighting, and viral retention structure.',
    {
      product_name: z.string().describe('The name of the product or brand'),
      product_category: z.string().describe('Category (e.g. tech_gadget, beauty_skincare, apparel, fmcg, saas_app)'),
      ad_format: z.enum(['tiktok_reels_9_16', 'youtube_16_9', 'instagram_1_1']).describe('Target video ad aspect ratio'),
      hook_type: z.enum(['problem_agitator', 'visual_spectacle', 'before_after', 'curiosity_gap', 'unboxing_satisfying']).describe('Hook mechanism for first 3 seconds'),
      target_audience: z.string().optional().describe('Target demographic / psychographic audience'),
    },
    async (args) => {
      const ratio = args.ad_format === 'tiktok_reels_9_16' ? '9:16' : args.ad_format === 'instagram_1_1' ? '1:1' : '16:9';
      return {
        description: 'Topview AI-Grade Commercial Video Ad Blueprint',
        messages: [
          {
            role: 'user',
            content: {
              type: 'text',
              text: `You are the Commercial Creative Director designing a high-converting video ad for "${args.product_name}" (${args.product_category}).
Aspect Ratio: ${ratio} | Hook Strategy: ${args.hook_type} | Target Audience: ${args.target_audience ?? 'General Consumers'}

COMMERCIAL AD PRODUCTION PROTOCOL:
1. PRODUCT ASSET REGISTRATION:
   - Call \`asset_register\` with kind: 'prop' and assetId: 'prop_product'. Write the physical descriptor with macro packaging details, material finish (matte, brushed aluminum, glossy glass), and exact brand branding.
   - Call \`keyframe_build\` with lighting: 'packshot_rim_light' or 'commercial_high_key' to anchor product photorealism.
2. 5-BEAT HIGH-RETENTION AD STRUCTURE:
   - BEAT 1 (0–3s, The Hook): Immediate visual pattern interrupt using hook_type: "${args.hook_type}". Fast camera motion (e.g. camera.movement: 'dolly_in', duration: 4s). Aspect ratio: "${ratio}".
   - BEAT 2 (3–8s, The Agitation / Pain Point): UGC creator or relatable character reacting to the frustration. Call \`shot_create\` with camera.framing: 'close_up', aspect_ratio: "${ratio}".
   - BEAT 3 (8–14s, Product Hero Demonstration): Macro rotating hero shot of "${args.product_name}". Call \`shot_create\` with lighting_setup: 'packshot_rim_light', camera.movement: 'orbit_180', aspect_ratio: "${ratio}".
   - BEAT 4 (14–20s, The Transformation / Social Proof): Immediate visible benefit or glowing customer satisfaction beat.
   - BEAT 5 (20–25s, The Call-To-Action): Clean hero packshot with kinetic offer text / promo code reminder.
3. BATCH & PARALLEL PRODUCTION:
   - Enforce aspect_ratio: "${ratio}" across all shot_create calls.
   - Execute parallel cluster rendering via \`npm run render:parallel\` to render all beats across Vultr in ~90 seconds.
   - Grade with \`film_grade\` (era: 'commercial_ad', aspect_ratio: '${ratio === '9:16' ? '9_16_vertical' : '16_9_native'}') for vibrant, punchy commercial finish.`,
            },
          },
        ],
      };
    },
  );

  // 5. Skit & Acting Director Architect (High-Comedy Narrative & Hot Series Standard)
  server.prompt(
    'skit_director_architect',
    'Architects dynamic, multi-shot comedy skits and hot series episodes with expressive acting, physical slapstick, diegetic Foley, and continuous frame chaining.',
    {
      skit_title: z.string().describe('Title or premise of the skit / episode'),
      comedy_style: z.enum(['fish_out_of_water', 'slapstick_physical', 'deadpan_satire', 'chaotic_escalation', 'mockumentary']).describe('Comic delivery tone'),
      main_character: z.string().describe('Protagonist identity, flaw, and comic obsession (e.g. "Marcus: impatient street hustler in green bomber jacket")'),
      supporting_cast: z.string().optional().describe('Secondary character, rival, or glitched NPC (e.g. "Dale: unblinking gas station clerk repeating idle animations")'),
      environment: z.string().describe('Setting with physical interactive props (e.g. "24/7 Vinewood Minimart counter with flickering neon")'),
      aspect_ratio: z.enum(['9:16', '16:9', '1:1']).default('9:16').describe('Aspect ratio for viral shorts or widescreen'),
    },
    async (args) => {
      const castNotice = args.supporting_cast ? `Supporting Cast / NPC: ${args.supporting_cast} | ` : '';
      return {
        description: 'High-Comedy Skit & Episodic Directing Blueprint',
        messages: [
          {
            role: 'user',
            content: {
              type: 'text',
              text: `You are the Comedy Showrunner and Director staging a viral narrative skit: "${args.skit_title}".
Comedy Style: ${args.comedy_style} | Main Character: ${args.main_character} | ${castNotice}Setting: ${args.environment} | Ratio: ${args.aspect_ratio}

SKIT ACTING & ENSEMBLE PRODUCTION PROTOCOL (NO STATIC DISPLAY MODE):
1. MULTI-CHARACTER ENSEMBLE REGISTRATION:
   - Call \`asset_register\` for the protagonist AND supporting cast / NPCs.
   - Every character MUST include an \`acting\` block detailing micro-expressions: jaw unhinge, frantic eye-darts, stiff NPC head-bobbing, pupil flares, and posture quirks.
   - Register distinct voice profiles with \`voice\` (pitch, speed, cadence, timbre) so character lines contrast sharply.
   - Call \`character_sheet_build\` to freeze turnaround sheets for both characters.

2. PURPOSEFUL NARRATIVE BEAT SPINES (ESTABLISH → DIALOGUE VOLLEY → ESCALATION → BUTTON):
   - BEAT 1 (0–4s, The Inciting Two-Shot): Wide establishing shot framing both characters in the locked geometry (\`sequence_lock_geo\`). The protagonist encounters the conflict or ridiculous obstacle.
   - BEAT 2 (4–8s, Shot-Reverse-Shot Dialogue Volley): Over-The-Shoulder (OTS) on Character A delivering the setup punchline. Camera enforces the 180-degree rule.
   - BEAT 3 (8–12s, The Reaction & Physical Escalation): Reverse OTS or close-up on Character B reacting with unhinged micro-acting (e.g. NPC glitching, deadpan stare, comic panic). Chained continuously (\`continuity: 'continuous'\`).
   - BEAT 4 (12–16s, The Climax & Button): Comedic consequence or sudden visual twist (e.g. GTA wanted stars lighting up, physics engine freakout, sudden sirens). Ends on a cliffhanger hook for Episode 2.

3. DIEGETIC FOLEY & AUDIO STAGING:
   - Call \`soundscape_build\` to create rich environmental Foley: crunchy footsteps, stone scrapes, clothing rustle, breath gasps, digital synth beeps.
   - Call \`dialogue_render\` for punchy spoken lines or grunted vocalizations.
   - Call \`acoustic_match\` to ensure room tone reverb matches the physical space.

4. CONTINUITY CHAINING EXECUTION:
   - Use Frontier Studio's native tail-frame injection: every chained shot inherits the exact pose and position from the previous shot's downloaded \`tail_frame.png\`.
   - Batch-render all 4 beats in parallel via \`npm run render:parallel\`.`,
            },
          },
        ],
      };
    },
  );

  // 6. Lumina Canvas & Seedance 2.5 Infinite Sequence Director
  server.prompt(
    'lumina_canvas_director',
    'Directs BytePlus Lumina / Seedance 2.5 style sequences with @character/@location/@video/@audio transfer contracts, Director\'s Read, Shot Table Paper-Render, and Three-Tier Action Hierarchy.',
    {
      story_premise: z.string().describe('Core story premise, characters, and final outcome'),
      sequence_id: z.string().default('seq01').describe('Target sequence identifier'),
    },
    async (args) => {
      return {
        description: 'Lumina Infinite Canvas & Seedance 2.5 Continuity Pipeline',
        messages: [
          {
            role: 'user',
            content: {
              type: 'text',
              text: `You are operating the Lumina / Seedance 2.5 Infinite Canvas Pipeline inside Frontier Studio MCP.

PREMISE: ${args.story_premise}
SEQUENCE: ${args.sequence_id}

MANDATORY EXECUTION PROTOCOL:
1. DUAL-ANCHOR VOICE & VISUAL LOCK:
   - Register every recurring cast member with \`asset_register\`, build 3-panel headless turnarounds via \`flow_prompt_sheet\` / \`character_sheet_build\`, and lock permanent 48kHz voice identity via \`character_voice_enroll\`.
2. PAPER RENDER BEFORE GPU SPEND:
   - Call \`sequence_state_plan\` with full 10-field narrative Director's Read + complete geometric Shot Table (\`floor_plan\`, \`camera_side\`, \`in_frame\`, \`eyeline\`, \`action\`, \`others_idle_business\`, \`light_lock\`, \`last_frame\`).
3. @TAG TRANSFER CONTRACTS:
   - Compile each clip with \`shot_prompt_compile\` preserving exact \`@char_id\` / \`@Video1\` / \`@Audio1\` tags and role-isolation contracts.
4. OBSERVED CANON OVERRIDES & CHAIN CAP:
   - After rendering each shot, call \`sequence_take_record\` with actual \`observed_end_state\`. Never chain more than 2-3 consecutive takes before canonical re-anchoring.`,
            },
          },
        ],
      };
    },
  );

  // 7. Viral Clip Studio / VI Architect (20-Repo + Trending SFX Pack)
  server.prompt(
    'viral_clip_architect',
    'Architects ultra-viral 9:16 Reels, TikToks, and Shorts from long-form VODs using A/B hook extraction, dead-air jump cuts, exponential 9:16 subject reframing, kinetic captions, and sync.at trending SFX.',
    {
      source_path: z.string().describe('Path or URL of the source video/VOD'),
      topic_hook: z.string().describe('Target viral hook or headline banner'),
    },
    async (args) => {
      return {
        description: 'Clip Studio / VI Viral Short Production Protocol',
        messages: [
          {
            role: 'user',
            content: {
              type: 'text',
              text: `You are the Lead Viral Clipper operating Clip Studio / VI on Source: "${args.source_path}" | Hook: "${args.topic_hook}".

PIPELINE:
1. Call \`sfx_search\` to browse matching transitions/impacts/risers/glitches in the 320-sound 48kHz SFX Kit (or \`sfx_fetch_api\` for custom ElevenLabs/Freesound SFX).
2. Call \`clip_plan_viral\` to score highlight viability, compute A/B hook variants, strip dead-air pauses, and generate piecewise-interpolated 9:16 reframe keyframes.
3. Call \`clip_render_viral\` with \`burn_captions: true\` and \`auto_sfx: true\` to render an ffprobe-verified 1080x1920 H.264 MP4 mastered to -14 LUFS.`,
            },
          },
        ],
      };
    },
  );
}
