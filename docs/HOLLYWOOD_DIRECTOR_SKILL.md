# Hollywood Director Agent Skill & Operating Manual
## For ChatGPT, Claude 3.7, Cursor, and Autonomous Film Agents

This skill manual instructs external LLM agents (ChatGPT Custom GPTs, Claude Desktop / Projects, Cursor Composer, Antigravity) on how to operate `frontier-studio-mcp` to direct, shoot, soundstage, and edit professional films without hallucinations or spatial drift.

---

## 1. The Core Law: Server vs. Agent Separation

| Layer | Responsibility |
| :--- | :--- |
| **Agent (The Brain)** | Screenplay adaptation, aesthetic direction, camera motivation, acting guidance, and cutting rhythm. |
| **MCP Server (The Studio Law)** | Unbending spatial geometry, 180° line enforcement, 3-panel turnaround sheets, 48kHz audio convolution, FCPXML NLE export, and double-entry financial ledgering. |

The server **holds no creative fluff**: it enforces physical and optical constraints. If an agent tries to flip camera eyelines, change locked location geography, or render dialogue without a registered voice, the server halts execution with a structured refusal and a `NEXT:` remediation action.

---

## 2. Directorial Workflow Pipeline

### Step 1: Initialize Film & Financial Hard-Stop
```json
{
  "name": "film_create",
  "arguments": {
    "film_id": "the_iron_divide",
    "title": "The Iron Divide",
    "logline": "Two rival cartographers uncover a mountain pass that rewrites the war.",
    "budget_usd": 25.00
  }
}
```

### Step 2: Register Cast & Enforce 3-Panel Headless Consistency
Every character must satisfy the **Completeness Law** (`descriptor` + `voice` + `acting`):
```json
{
  "name": "asset_register",
  "arguments": {
    "kind": "character",
    "asset_id": "char_mara",
    "descriptor": "34-year-old surveyor, severe cheekbones, chapped lips, dark wool fur-collared greatcoat, brass compass pendant.",
    "voice": "Low raspy contralto, clipped Nordic cadence, quiet authority.",
    "acting": "Subtle jaw clench when challenged, minimal body movement, intense steady gaze."
  }
}
```
**Lock the reference sheet before any video render:**
```json
{
  "name": "character_sheet_build",
  "arguments": {
    "asset_id": "char_mara"
  }
}
```
*Why:* The server generates a 3-panel sheet with a **headless center figure** on neutral grey. This permanently locks face, clothing, and posture without spawning ghost faces or visual drift.

### Step 3: Register Location & Lock Spatial Geometry
```json
{
  "name": "asset_register",
  "arguments": {
    "kind": "location",
    "asset_id": "loc_outpost",
    "descriptor": "Frozen timber stone observation outpost at high altitude, snow drifts banked against heavy oak doors, ice-crusted slit windows.",
    "geo_block": "North wall = stone hearth with ember glow; East wall = heavy barred oak door; West wall = timber drafting table with map lantern; Center = frozen flagstones."
  }
}
```
**Freeze the spatial map across the sequence:**
```json
{
  "name": "sequence_lock_geo",
  "arguments": {
    "sequence": "seq01",
    "geo_block": "North wall = stone hearth with ember glow; East wall = heavy barred oak door; West wall = timber drafting table with map lantern; Center = frozen flagstones."
  }
}
```
*Why:* Once locked, every shot in `seq01` must submit this exact text. If an agent hallucinates a door on the North wall, the server rejects the shot before money is spent.

### Step 4: Staging & Pre-Vis Storyboarding
- For two characters sharing a scene: call `staging_build` to compose them with distinct spatial boundaries onto the location plate.
- To verify visual pacing before video rendering: call `storyboard_build` to generate a 2x3 contact sheet grid.

### Step 5: Directing Shots (Cinematography & 180° Rule)
```json
{
  "name": "shot_create",
  "arguments": {
    "id": "seq01-shot01",
    "sequence": "seq01",
    "action": "Mara leans over the drafting table, her brass compass ticking against the parchment.",
    "geo_block": "North wall = stone hearth with ember glow; East wall = heavy barred oak door; West wall = timber drafting table with map lantern; Center = frozen flagstones.",
    "refs": [
      { "asset_id": "loc_outpost", "role": "location" },
      { "asset_id": "char_mara", "role": "character" }
    ],
    "camera": {
      "lens": "35mm anamorphic",
      "move": "slow push-in",
      "reason": "focusing audience attention on the false border line",
      "rig": "dolly_track",
      "framing": "medium_ots",
      "screen_direction": "screen_left",
      "eyeline_target": "char_eli",
      "depth_of_field": "shallow"
    },
    "cinematics": {
      "film_stock": "kodak_vision3_500t",
      "lens_glass": "anamorphic_2x_oval_bokeh",
      "lighting_setup": "key_fill_4_to_1",
      "color_temp": "golden_hour_2800k",
      "atmosphere": "subtle_volumetric_haze"
    },
    "audio_block": {
      "dialogue": [
        { "voice_ref": "char_mara", "line": "The map was drawn before the glacier moved." }
      ],
      "sfx": "lantern flame hiss, cold wind howling through wall slits"
    },
    "duration_s": 5
  }
}
```

### Step 6: Soundstage & Audio Engineering
1. **Dialogue Stem:** Call `dialogue_render` to produce 48kHz WAV speech mapped to `char_mara`'s voice profile.
2. **Room Tone Bed:** Call `soundscape_build` to synthesize ambient environmental noise and diegetic SFX.
3. **Physical Acoustic Convolution:** Call `acoustic_match` with `wooden_cabin` or `stone_cavern` to convolve dry speech into the physical reverberation profile and normalize to EBU R128 (-14 LUFS).
4. **Lip-Sync Pass:** Call `shot_lipsync` to align and multiplex the dialogue audio track with the video take.

### Step 7: Color Grading & Final Cut Pro Export
1. **Film Grade:** Call `film_grade` with `era: "1970s_panavision"` or `film_stock: "kodak_vision3_500t"` to apply 35mm grain, color curves, and anamorphic 2.39:1 letterbox masking.
2. **Rough Cut Assembly:** Call `film_assemble` to generate an FFmpeg concatenation recipe.
3. **NLE Timeline Export:** Call `film_export_xml` to export compliant FCPXML 1.10 and EDL files directly into DaVinci Resolve or Adobe Premiere Pro.

---

## 3. Directorial Rules of Thumb for AI Agents

1. **Never move the camera without a reason:** Static camera creates tension; push-in creates revelation; dolly-out creates abandonment. State the reason in `camera.reason`.
2. **Never break the 180° line:** If Mara is on screen-left facing right, Eli must be on screen-right facing left. The server mathematically forbids opposite eyelines looking the same direction.
3. **Pre-vis before spending:** Run `storyboard_build` to review sequence continuity before triggering async video jobs.
4. **Trust the ledger:** The ledger balances `estimate - refund + reconcile = actual spend`. Never override budget limits.
