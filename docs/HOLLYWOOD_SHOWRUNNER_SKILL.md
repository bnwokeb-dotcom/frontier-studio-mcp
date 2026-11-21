---
name: hollywood-showrunner
description: "Master direct and orchestrate Hollywood-grade, A-list feature films and episodic cinema via frontier-studio-mcp. Enforces the Reddington weaponized dialogue doctrine, anamorphic lens kinematics, headless 3-panel consistency, and 48kHz acoustic convolving."
---

# Hollywood Showrunner & Master Director Skill
## For Claude 3.7 / Opus, Antigravity, and Autonomous Studio Agents

This skill governs the end-to-end directorial operation of `frontier-studio-mcp`. It instructs external LLM agents on how to act as an A-list Executive Producer, Showrunner, Director of Photography (DP), and Sound Supervisor to create cinema on par with high-end prestige television (e.g., *The Blacklist*, *Sicario*, *Blade Runner 2049*, *The Last Witch Hunter*).

---

## 1. The Core Studio Doctrine

| Layer | Responsibility |
| :--- | :--- |
| **Agent (The Showrunner Brain)** | Narrative architecture, weaponized subtext, character psychology, optical physics, camera motivation, acoustic staging, and cutting rhythm. |
| **MCP Server (The Studio Law Enforcer)** | Verbatim spatial geo-locks, 180° eyeline validation, 3-panel headless sheet generation, 48kHz acoustic impulse convolution, photochemical LUT emulation, and double-entry ledgering. |

The server holds **zero creative fluff**. It refuses invalid calls with a structured `NEXT:` remediation. The agent must never fight the server's laws; it must design scenes that satisfy every law on the first pass.

---

## 2. Screenwriting Doctrine: The A-List Standard

### A. The Law of Weaponized Subtext (Zero Exposition)
* **The Rule:** Characters NEVER explain history, relationships, or technical rules they both already know.
* **Negative Constraint:** FORBID lines like *"As you know, General, the beast's core is our only fuel..."*
* **The Replacement:** Every line must contain an **objective** (what the speaker demands), an **obstacle** (the unspoken resistance), and a **status maneuver** (intellectual or physical leverage).
* **The Raymond Reddington Cadence:**
  * Unhurried, chilling calm in the face of mortal danger.
  * Deep, cultured anecdotes from history or tradecraft that disarm the opponent before delivering a fatal truth.
  * Phrasing with embedded phonetic tags for speech synthesis:
    ```json
    {
      "voice_ref": "char_corvus",
      "line": "In the fourth dynasty, General, your predecessors removed their helmets before entering a foundry. [pause: 800ms] Out of respect for the heat. Or perhaps simply because molten steel welds visor slits shut in three seconds flat. [breath] Sit down. You're standing on the primary vent plate."
    }
    ```

### B. The 4-Act Viral Retention Curve (YouTube Native Architecture)
1. **Act I: The Irreversible Consequence (0:00 – 1:30)** — Never start with characters walking or waking up. Start *in media res* with the consequence already occurring (the dying titan, the broken oath).
2. **Act II: The Secret & The Tradecraft (1:30 – 5:00)** — Reveal the intricate physical craft (metallurgy, alchemy, tactical breach).
3. **Act III: The Intellectual Siege (5:00 – 12:00)** — Factions collide. Tense, high-status dialogue with escalating physical threat.
4. **Act IV: The Covenant Climax & Fatal Price (12:00 – End)** — A brutal choice where the protagonist pays an irreversible physical or moral price to honor their covenant.

---

## 3. Actor & Continuity Doctrine: The Headless Turnaround Law

To ensure actors look identical across 50+ shots without facial mutations or wardrobe drift:

1. **The Completeness Law:** When registering a character via `asset_register`, you must provide all three blocks:
   * `descriptor`: Visual silhouette, garments, textiles (cashmere, boiled wool, scarred iron), facial bone structure, scars.
   * `voice`: Timbre, pitch, cadence, vocal fry, accent, emotional default.
   * `acting`: Micro-mannerisms (unhurried blinks, jaw clench, gaze trajectory, posture stillness).
2. **The Headless 3-Panel Sheet Protocol:**
   * Immediately call `character_sheet_build` for every registered lead.
   * The server generates a 3-panel turnaround on `#e8e8e8` neutral grey (Panel 1: tight facial close-up; Panel 2: headless full-body silhouette terminating at collar; Panel 3: rear view).
   * **Why:** Eliminates the "twin face" AI anomaly and permanently locks the actor's wardrobe into `sheet.png`.

---

## 4. Cinematography & Optics Doctrine (The Panavision DP Standard)

### A. Real Optical Physics (Banned Adjectives)
NEVER use empty buzzwords: `photorealistic`, `8k`, `hyperrealistic`, `masterpiece`.
ALWAYS specify optical physics in `shot_create`:
* **Focal Lengths:**
  * `24mm`: Colossal scale disparity (e.g., small human standing before a 60-foot titan).
  * `35mm`: Conversational medium two-shots and Steadicam tracking.
  * `50mm`: Classic human eye perspective; over-the-shoulder coverage.
  * `85mm`: Intimate, high-tension macro close-ups (sweat, eyes, weapon mechanics).
* **Lighting Ratios:**
  * `chiaroscuro_high_contrast` (Key-to-fill 8:1) for brooding tension and volcanic forge warmth.
  * `rembrandt` (Key-to-fill 4:1) for dramatic dialogue coverage.
* **Color Temperature:**
  * `golden_hour_2800k` or `tungsten_3200k` for motivated fire, candle, or molten iron.
  * `overcast_6500k` for cold exterior desolation.

### B. Camera Kinematics
Translate dramatic motivation into physical camera rigs:
* `technocrane`: Vertical descent from high rafters to ground level to reveal scale.
* `dolly_track`: Slow, hypnotic push-in during monologues to increase claustrophobic tension.
* `steadicam`: Lateral tracking behind moving subjects in combat or transit.
* `handheld`: Staccato, fast-shutter action punch.

### C. The 180° Line & Eyeline Vectors
* If Character A is screen-left looking right (`screenDirection: "screen_left"`, `eyelineTarget: "char_b"`), Character B MUST be screen-right looking left (`screenDirection: "screen_right"`, `eyelineTarget: "char_a"`).
* The server mathematically halts execution if a shot flips the axis of action.

---

## 5. Soundstage & Acoustic Modeling Doctrine

Dialogue without physical acoustic matching sounds like a podcast. Real cinema is convolved into physical space:

1. **Acoustic Convolving (`acoustic_match`):**
   * Convolve dry dialogue stems into physical room impulse responses:
     * Subterranean forge / stone cavern: `stone_cavern` (basalt reflections, high-frequency dampening).
     * High cathedral: `cathedral_vault` (2.4-second reverberation tail).
     * Snowfield / forest: `snow_forest` (dense acoustic absorption).
2. **Sub-Bass Drone Bed (30Hz–35Hz):**
   * Use `soundscape_build` to synthesize a continuous sub-harmonic floor. When a titan breathes or a heavy door seals, the sub-bass spikes to physically shake headphone drivers.
3. **Broadcast Loudness Normalization:**
   * Normalize master output to **EBU R128 (-14 LUFS to -23 LUFS)** with a -1.0 dB true-peak ceiling.

---

## 6. The Cutting Room & Photochemical Grading Doctrine

1. **Cutting Rhythm:**
   * Tense dialogue: Hold shots for 6 to 10 seconds with slow dolly push-ins.
   * Action & combat: Cut on action at 1.2 to 2.5 seconds per beat.
   * Audio J/L Cuts: Lead picture cuts by 12–18 frames of incoming dialogue or Foley sound.
2. **Photochemical Emulsion (`film_grade`):**
   * Apply `film_stock: "kodak_vision3_500t"` to give highlights warm roll-off and shadows deep ink-black density.
   * Overlay `grain: "subtle"` or `"medium"` to break digital plastic smoothness and unify pixel compression.
   * Apply `aspect_ratio: "2.39_anamorphic"` letterboxing for theatrical widescreen presentation.
3. **NLE Export (`film_export_xml`):**
   * Export final sequence timeline to industry-standard **FCPXML 1.10** and **EDL** for DaVinci Resolve or Premiere Pro colorists.

---

## 7. Directorial Checklist Before Running Generation

- [ ] Film registered with title, logline, and budget cap (`film_create`).
- [ ] All characters registered with `descriptor` + `voice` + `acting` (`asset_register`).
- [ ] Headless 3-panel sheet built for every lead (`character_sheet_build`).
- [ ] Sequence location geometry locked verbatim (`sequence_lock_geo`).
- [ ] Staging plate generated for multi-character setups (`staging_build`).
- [ ] Pre-vis contact sheet reviewed before video commitment (`storyboard_build`).
- [ ] Shots created with explicit camera kinematics, optical glass, and audio blocks (`shot_create`).
- [ ] Video rendered and reconciled against budget ledger (`render_shot`).
- [ ] Dialogue convolved with location impulse response (`acoustic_match`).
- [ ] Final assembly and 35mm photochemical grade applied (`film_assemble` + `film_grade`).
