# BytePlus / ByteDance Lumina AI Canvas — Reverse Engineering & Architecture (REA) Dossier

**Captured From:** `https://ai.byteplus.com/lumina/en/ai-canvas` & active workspace `https://ai.byteplus.com/lumina/en/canvas/647716524550826153` (`canvas-iframe/647716524550826153`)
**Evidence:** Browser session `0b563777-9be1-4c8c-9f75-52937cd2ab6f` · Host-verified origin `https://ai.byteplus.com` · Screenshot `C:/Users/hp/.gemini/antigravity/brain/df960326-cecd-4139-8f3e-f99c5103c205/browser_evidence/0b563777-9be1-4c8c-9f75-52937cd2ab6f/final_step_351.png`
**Date:** 2026-11-25

---

## 1. Stack & Engine Architecture

| Layer | BytePlus Lumina Implementation | Notes |
| --- | --- | --- |
| **Host Shell** | Garfish Micro-Frontends (`console-oneart/oneart`, `lumina_micro/inference_lumina`) + **Arco Design** (`body[arco-theme="dark"]`) | Provides Project Hub, auth, top nav, billing/credits pill |
| **Canvas Engine** | **React Flow / `@xyflow/react`** (`div.react-flow.dark`, `.react-flow__nodes`, SVG `.react-flow__edges`, DOM node cards) inside same-origin `iframe.canvas-manager-page-iframe` | DOM/CSS cards instead of opaque `<canvas>`, enabling native text inputs, model dropdowns, video/audio players inside nodes |
| **Component / Utility CSS** | Tailwind CSS utilities + ByteArtist (`ba-*`) design system + `svg.byteartist-icon` | Heavy glassmorphic floating `rounded-full` pills around an edge-to-edge canvas viewport |
| **Collaborative / Graph State** | Yjs document snapshot (`ydoc_snapshot`) + typed nodes (`BALLMImage`, `BALLMVideo`, `DirectorNode`, `BAVideoCompose`, `BAStoryboardGrid`) | Supports Undo/Redo, Version History milestones (`Save Milestone` / `Restore`), multi-select grouping, bypass flags |
| **Sub-Editors** | Full-screen **Video Editor** (NLE timeline overlay) + WebGL **3D Director's Desk** (`3D Composition Editor`) | Launched in-place over the graph without losing canvas state |

---

## 2. Exact Visual Design Tokens

### 2.1 Typography
- **Primary Sans**: `Roboto, Helvetica, PingFang SC, Hiragino Sans GB, Microsoft YaHei, Arial, sans-serif, Helvetica Neue, -apple-system, BlinkMacSystemFont, noto sans`
- **UI Sans**: `Inter, -apple-system, BlinkMacSystemFont, PingFang SC, sans-serif`
- **Monospace (IDs, timecodes, counts)**: `monospace` (or `JetBrains Mono` / tabular numerals)
- **Scale**: Node header titles `14px`, body/Arco inputs `14px`, line-height `1.5` (`1.5715` on buttons).

### 2.2 Surfaces, Borders & Glassmorphism
- **Canvas Void**: `#000000` with SVG dot grid `<pattern width="20" height="20" patternUnits="userSpaceOnUse"><circle cx="0.5" cy="0.5" r="0.5" fill="rgba(255,255,255,0.3)"/></pattern>`
- **Arco Dark Surfaces**:
  - `--color-bg-1`: `#17171a` (floating HUD pills) / `#131416`
  - `--color-bg-2`: `#232324`
  - `--color-bg-3`: `#2a2a2b`
  - `--color-bg-4`: `#313132`
  - `--color-bg-5` (popups/menus): `#373739`
- **Canvas Node Card**:
  - Surface: `#1e1e1e` (`rgb(30, 30, 30)`), `min-width: 300px`, `min-height: 100px`, `border-radius: 12px`
  - Header Right Badge: `#141414`, `0.5px solid rgba(255,255,255,0.12)`, `border-radius: 6px`
  - Header Modality Icon Badge: `border-radius: 6px`, `padding: 4px`, `background: rgba(191, 90, 242, 0.25)`, `border: 1px solid rgba(191, 90, 242, 0.75)`
- **Text Hierarchy**:
  - Primary: `rgba(255,255,255,0.9)` (`#c7ccd6`)
  - Secondary: `rgba(255,255,255,0.7)` (`#9da3af`)
  - Muted: `rgba(255,255,255,0.5)` (`#737a87`)
  - Disabled: `rgba(255,255,255,0.3)` (`#42464e`)
- **Glass Fill Tiers**: `rgba(255,255,255,0.04)` / `0.08` / `0.12` / `0.16`, `backdrop-filter: blur(8px | 10px | 20px)`

### 2.3 Brand & Typed Port Color Tokens
- **Lumina Signature Electric Cyan (Agent CTA, Sparkle, Active Highlights)**: `#31F0F4` (hover/secondary `#66FFFF`, inner dark `#061416`, Arco `--cyan-6: #14c9c9`)
- **Typed Graph Connection Slots (`--ba-color-slot-*`)**:
  - `IMAGE`: `#80a1c0`
  - `AUDIO`: `rgba(192, 255, 18, 1)`
  - `VIDEO`: `rgba(230, 78, 255, 1)`
  - `STRING`: `rgba(119, 123, 199, 1)`
  - `PROMPT`: `rgba(50, 215, 75, 1)`
  - `MASK`: `#a3bd8d`
  - `MODEL`: `#8978a7`
  - `CONTROL_NET`: `#00d78d`
  - `CONDITIONING`: `#cf876f`
  - `LATENT`: `#b38ead`
  - `BOOLEAN`: `#D65F5F`
  - `any`: `rgba(105, 183, 203, 1)`
  - Active connection stroke: `#ffffff`

---

## 3. Spatial Workspace Layout & Interaction Model

1. **Top-Left Floating Pill (`ba-ui-top-bar-wrapper`)**:
   - `<` Return to Project Hub | Inline-editable Workflow Name (`Untitled Canvas ✎`) | `+` Import Local Workflow JSON | Cloud Download Export JSON | Undo / Redo.
2. **Top-Right Floating Pills (`ba-canvas-top-right-toolbar`)**:
   - Split pill: `Switch Canvas` + `Version History` (modal with `All Savers`, `Save Milestone`, timestamped `Restore`)
   - `Credits consumption` pill (modal with date filter, model/task ID filter, **honest refund rule**: incomplete/failed nodes are never charged)
   - `Message Center` + `Canvas Error` bell
3. **Left Vertical Floating Pill Dock (`40×40px` icon buttons)**:
   - `+` **Add Node & Add Resources**: `Text`, `Image`, `Audio`, `Video`, `Sticky Notes`, `Video Editing`, `Video Splice`, `Script Planning`, `Director's Desk`, `Storyboard Grid`, `Interactive Story` (`Interactive Planning`, `Selector`, `Continue`) + `Upload`, `Material Library`, `Global Assets`.
   - Magnifier (**Node Search**): `Fuzzy` / `Precise` + `Enter` snap-to-node + `Esc` close.
   - Bookshelf (**Global Assets**): Persistent characters, locations, props, costumes, voices.
   - Folder (**Material Library**): Filterable by `Image` / `Video` / `Audio` & `Character` / `Props` / `Costume` / `Scene` / `Effects`.
   - Branch (**Tool Templates**): `Public` / `Private` graph presets (`Three-View Character Sheet`, `All-Round Ref Video`, `4/9/25-Panel Storyboard`, `Camera Choreography`, `Director's Desk Shot Design`).
   - Clock (**Creative History**): All generated outputs across runs with Collection filter.
   - Scissors (**Video Editor**): Full-screen multi-track NLE overlay.
   - `?` (**Shortcuts / Help**).
4. **Bottom-Left View Bar (`ba-simple-view-bar`)**:
   - `Canvas Minimap` | `Grid Adsorption` (snap toggle) | `Hide Node Connections` | `Zoom Slider` (`10%–200%`) | `Quick Focus` (fit view).
5. **Bottom-Right `Ask Agent` Cyan Pill -> Slide-Over Right Agent Drawer**:
   - Header: `New Chat` | `+` Reset | History | `X` Close.
   - Empty state: Recommended Skill Cards (`Creative Short Drama Director`, `Creative Ad Director`, `AD Motion Director`, `Viral Clip Architect` + `Create Skill`).
   - Composer: `@` Mention picker (lists every live canvas node with short ID + global assets), `/` Skill trigger, `+` attachment (`Add from Canvas`, `Upload`, `Assets`), `Skill` picker, `Model` selector (`Auto`, Image models tab, Video models tab, Text reasoning LLM selector), and **`Manual mode` vs `Auto mode`** switch.
6. **Multi-Node Floating Action Bar (on marquee/Shift-click of ≥2 nodes)**:
   - `Add to Agent` | `Typesetting` (`Grid`, `Horizontal`, `Vertical`) | `Download` | `Bypass` | `Save to Templates` | `Group` / `Create storyboard` | `Generate` | `More`.

---

## 4. Node Types & Parameter Contracts

1. **Image Generation (`BALLMImage`)**: Aspect (`21:9`..`9:21`, `Free WxH`), Resolution (`1K/2K/4K`), `output_format` (`jpeg`/`png`), `seed`, `background` (`auto`/`opaque`/`transparent`), `watermark`, batch `1×–4×`.
2. **Video Generation (`BALLMVideo`)**: Modes (`omnipotent reference`, `First & Last Frame`, `video editing`, `video extension`); Resolution (`480p`/`720p`/`1080p`); Aspect (`16:9`/`9:16`/`21:9`/etc.); `Smart Duration` / `1–15s` slider; `Generate sound`; batch `1×–4×`.
3. **Text Generation**: Model selector, `Thinking mode`, `Max response length` slider, `Seed`, `system prompt` toggle + textarea, multimodal understanding inputs (`image`/`video`/`audio`).
4. **Audio Generation**: Modes (`Text to Audio`, `Audio to Audio`, `Image to Audio`, `Dialogue TTS`); `Tone Settings` (`Speed`, `Volume`, `Pitch`); `Format` (`wav`), `48000Hz`.
5. **Script Planning**: Structured beat/scene sheet + `Fullscreen` expanded editor.
6. **Storyboard Grid (`BAStoryboardGrid`)**: `2x2` / `3x3` / `5x5` panel grid with drag-reorder & per-cell regenerate.
7. **Video Splice (`BAVideoCompose`)**: Multi-input ordered clip concatenation timeline inside node.
8. **Director's Desk (`DirectorNode`)**: Interactive 3D perspective stage (`Camera 1..N`, `Role A..N` blocking dummies, sky/ground/panorama settings, camera frustum preview).

---

## 5. REA Gap Analysis: BytePlus Lumina vs Frontier Studio MCP

| Dimension | BytePlus Lumina AI Canvas | Current `frontier-studio-mcp` | Verdict / Top-Notch Merge Strategy |
| --- | --- | --- | --- |
| **Spatial UI & Visual Polish** | True `#000000` dot-grid node graph, `#31F0F4` glass HUD, inline node docks, marquee typesetting, floating `@` / `/` pickers | Form-driven 4-tab HTML console (`web/studio.html`) with no pan/zoom node graph | **CLONE & MATCH LUMINA UX**: Build spatial `#000000` dot-grid Canvas OS with floating pills, typed wires, `@` node chips, Agent drawer |
| **Continuity & Story Logic** | Optional text/storyboard nodes; relies on generic LLM prompting | **Deterministic Continuity Intelligence (`src/continuity/intelligence.ts`)**: 10-field Director Read, Paper-Render lint, 180°-rule check, Sequence State chain-depth cap (2–3), verbatim `@tag` Transfer & Ignore | **FRONTIER WINS**: Wire Paper-Render + Sequence State directly onto every `Storyboard Grid` & `Video` node edge automatically! |
| **Voice Consistency** | Basic Speed/Volume/Pitch sliders on Audio node | **Dual-Anchor Voice Consistency (`enrollCharacterVoice`, `dialogue_render`, `acoustic_match`, `score_arrange_dynamic`)**: permanent 48kHz `voice_sample.wav` + ElevenLabs Voice Clone ID + LUFS room matching | **FRONTIER WINS**: Expose Voice Profiles inside `Audio` & `Global Assets` nodes with waveform preview |
| **SFX & Foley** | Generic Audio node (`Seed Audio`) | **320 CC0 SFX Kit + Live APIs (`sfx_engine.ts`)**: `sync.at` exact impact alignment, `VIRAL_SFX_PACK_MAP`, ElevenLabs SFX + Freesound API + auto-ducking | **FRONTIER WINS**: Embed 1-click Viral SFX Spotting inside **Video Splice** & **NLE Video Editor** |
| **Viral Clipping** | Manual Video Editor only | **20-Repo Clip Studio / VI (`clipping/pipeline.ts`)**: 9:16 dynamic keyframe face tracking, A/B hooks, dead-air jump cuts, ASS captions, FCPXML/OTIO/EDL export | **FRONTIER WINS**: Unify **Clip Studio / VI** as a dedicated mode inside the full-screen NLE Video Editor + Canvas nodes |
| **3D Director's Desk** | Silver mannequin WebGL viewport with `Camera` + `Role` + panorama | `sequence_lock_geo` N-S-E-W lock + Floor Plan string (no visual 3D stage yet) | **UPGRADE FRONTIER**: Build lightweight Three.js/Canvas3D Director's Desk modal that exports exact spatial coordinates & camera frustum directly into `geo_block.md` & H3/Seedance prompts! |
| **Billing & Execution Trust** | Closed SaaS credits ledger; cloud vendor lock-in | **Open BYO-Key Ledger (`ledger.jsonl`) + FFprobe QC + Refund Law + Local Web Bridge** | **FRONTIER WINS**: Map Lumina's `Credits consumption` modal directly onto live `ledger.jsonl` & `jobs.json` with real USD delta breakdown! |
