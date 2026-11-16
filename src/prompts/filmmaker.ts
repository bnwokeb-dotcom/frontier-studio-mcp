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
}
