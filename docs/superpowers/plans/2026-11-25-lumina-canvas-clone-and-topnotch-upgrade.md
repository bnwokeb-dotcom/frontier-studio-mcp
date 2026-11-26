# Lumina AI Canvas Clone & Top-Notch Frontier Studio Improvement Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Clone the spatial `#000000` dot-grid node-graph UX, glassmorphic HUD, interactive node docks, right Agent Mode drawer, Video Editor, and 3D Director's Desk of BytePlus Lumina AI Canvas (`ai.byteplus.com/lumina/en/ai-canvas`), and fuse it directly with Frontier Studio MCP's superior continuity engine, 48kHz voice enrollment, 320-sound sync SFX engine, 20-repo Clip Studio / VI pipeline, and truthful FFprobe/ledger billing.

**Architecture:** We add a file-backed Canvas Graph & Version History persistence layer (`src/canvas/store.ts` + `src/http.ts` endpoints) under each film/workspace, keep our existing HTTP/SSE + MCP server zero-bloat (`dist/` standalone), and serve a modular spatial Canvas OS at `/studio` (with `/hub` Project Hub view + full NLE Video/Clip Editor + interactive 3D Director's Desk overlay) backed by real Frontier Studio MCP APIs rather than mocks. Every node edge carries explicit typed contracts (`IMAGE`, `VIDEO`, `AUDIO`, `PROMPT`, `GEO_LOCK`, `VOICE_ANCHOR`) and feeds real `render_shot`, `keyframe_build`, `dialogue_render`, `sfx_spot_video`, and `clip_render_viral` backends.

**Tech Stack:** TypeScript (ESM, Node >= 20), Node `http` server (`src/http.ts`), FFmpeg/FFprobe, Vitest, lightweight browser-native ES Modules (`web/canvas/*.js` + `web/css/lumina-tokens.css` — zero bundler lock-in, works offline & inside Docker image directly).

**Spec:** `docs/research/lumina/LUMINA_REA_DOSSIER.md`

## Global Constraints

- **Design Fidelity Tokens**: Canvas background `#000000` with `20x20px` `rgba(255,255,255,0.3)` radial/SVG dot grid; Node cards `#1e1e1e` with `0.5px solid rgba(255,255,255,0.12)`; Glass floating pills `rgba(23,23,26,0.88)` + `backdrop-filter: blur(12px)`; Lumina Electric Cyan CTA `#31F0F4`; Typed slot colors verbatim from `docs/research/lumina/LUMINA_REA_DOSSIER.md`.
- **No Fake Media / No Stub Execution**: Every Generate button on a canvas node MUST hit real studio APIs (`image_generate`, `render_shot`, `dialogue_render`, `sfx_spot_video`, `clip_render_viral`, `film_assemble`) and update real `film.json` / `ledger.jsonl` / `jobs.json` — when API keys are unset (`STUDIO_LIVE=0`), return honest dry-run/prompt preview or bridge handoff (`WebBridgeServer`), never fake MP4/WAV bytes.
- **Backward Compatibility**: All existing routes (`/`, `/landing`, `/studio`, `/api/info`, `/api/films`, `/api/shots`, `/api/jobs/poll`, `/api/sfx/*`, `/api/continuity/*`, `/api/clipping/*`, `/api/toolkits`, `/api/export/fcpxml`, `/artifacts/*`, `/sse`) and all 43 MCP tools + 357 passing tests MUST remain green.
- **Standalone Build**: `npm run build` (`tsc -p tsconfig.json`) and `npm test` must pass with 0 errors after every task.

---

### Task 1: Canvas Graph, Version Milestones & Billing Telemetry Backend (`src/canvas/store.ts`)

**Files:**
- Create: `src/canvas/store.ts`
- Modify: `src/store/paths.ts` (add `canvasDir`, `canvasFile`, `canvasVersionsDir`)
- Modify: `src/http.ts` (add `/api/canvas/*` routes)
- Test: `test/canvas/store.test.ts`

**Interfaces:**
- Produces: `CanvasDocument`, `CanvasNode`, `CanvasEdge`, `CanvasVersionSnapshot`, `loadCanvas`, `saveCanvas`, `saveCanvasMilestone`, `restoreCanvasMilestone`, `listCanvasWorkflows`, `summarizeCanvasCredits`
- Consumes: `studioPaths`, `readJson`, `writeJsonAtomic`, `filmShow` (`src/store/film.ts`), `readJobs` (`src/store/jobs.ts`)

- [ ] **Step 1: Write failing tests for Canvas graph persistence, milestone restore, `@` node indexing, and truthful ledger credit aggregation**
  - Test saving a multi-node workflow (`Text`, `Image`, `DirectorNode`, `Video`, `Audio`, `VideoCompose`), creating a named milestone (`Save Milestone`), mutating nodes, restoring the milestone back identically, and verifying `summarizeCanvasCredits` reads `ledger.jsonl` + `jobs.json` (showing `$0` net spend for failed/refunded nodes).
- [ ] **Step 2: Run test to verify failure**
  - `cmd.exe /c "node node_modules/vitest/vitest.mjs run test/canvas/store.test.ts"` -> FAIL (`Cannot find module`).
- [ ] **Step 3: Implement `src/canvas/store.ts` and register HTTP REST endpoints in `src/http.ts`**
  - `GET /api/canvas/workflows` — list saved workflows + folders + built-in Lumina & Clip Studio templates (`Creative Short Drama`, `3-View Character Sheet`, `All-Round Ref Video`, `9-Panel Storyboard`, `Podcast-to-Viral-Shorts`).
  - `GET /api/canvas/workflows/:id` & `PUT /api/canvas/workflows/:id` — atomic Yjs-compatible JSON graph read/save + node/edge validation (slot compatibility checks + auto-continuity chain-depth warnings on `Video -> Video` edges!).
  - `GET /api/canvas/versions/:id`, `POST /api/canvas/versions/:id/milestone`, `POST /api/canvas/versions/:id/restore` — timestamped snapshots.
  - `GET /api/canvas/credits/:filmId` — live breakdown per node/job/model/status from `ledger.jsonl` & `jobs.json`.
- [ ] **Step 4: Re-run tests and build**
  - `cmd.exe /c "npm run build && node node_modules/vitest/vitest.mjs run test/canvas/store.test.ts test/http.test.ts"` -> PASS.
- [ ] **Step 5: Commit**
  - `git commit -m "feat(canvas): add spatial workflow store, version milestones, and credits telemetry API"`

---

### Task 2: Interactive 3D Director's Desk & Spatial Blocking Compiler (`src/continuity/director_desk.ts`)

**Files:**
- Create: `src/continuity/director_desk.ts`
- Modify: `src/continuity/intelligence.ts` (add geometric eyeline / 180-degree camera-side crossing validator from 3D coordinates!)
- Modify: `src/http.ts` (`POST /api/director-desk/compile`)
- Modify: `src/server.ts` + `src/tools/continuity.ts` (add `director_desk_compile` MCP tool)
- Test: `test/continuity/director_desk.test.ts`

**Interfaces:**
- Produces: `DirectorDeskScene` (`cameras[]`, `roles[]`, `ground`, `sky`, `panoramaUrl`, `activeCameraId`), `compileDirectorDeskToShotSpec(scene)` returning `{ geoBlockDraft, cameraSetup, eyelineVector, lineOfActionSide, warnings[] }`
- Consumes: `validateShotTable`, `buildReferenceTransferContract`

- [ ] **Step 1: Write failing tests for 3D-to-Prompt & 180-degree Line-of-Action verification**
  - Assert that two `Role` actors (`Role A` at `(-2, 0, 0)`, `Role B` at `(2, 0, 0)`) establish the Line of Action (`z = 0` plane); placing `Camera 1` on `z = +5` (`north` side) and `Camera 2` on `z = -5` (`south` side) triggers an automatic `180_DEGREE_AXIS_CROSS` continuity violation unless explicitly marked `motivated_axis_switch: true`.
  - Assert compiling a scene produces exact clockwise spatial prose compatible with `sequence_lock_geo` and Seedance/H3 camera movement strings (`35mm`, azimuth, elevation, distance).
- [ ] **Step 2: Run test to verify it fails**
  - `cmd.exe /c "node node_modules/vitest/vitest.mjs run test/continuity/director_desk.test.ts"` -> FAIL.
- [ ] **Step 3: Implement `src/continuity/director_desk.ts`, wire MCP tool + HTTP route**
- [ ] **Step 4: Run build & tests**
  - `cmd.exe /c "npm run build && node node_modules/vitest/vitest.mjs run test/continuity/director_desk.test.ts test/continuity/intelligence.test.ts"` -> PASS.
- [ ] **Step 5: Commit**
  - `git commit -m "feat(continuity): add 3D Director's Desk compiler with 180-degree axis enforcement"`

---

### Task 3: Canvas Agent Planner & Multi-Step Skill Executor (`src/canvas/agent.ts`)

**Files:**
- Create: `src/canvas/agent.ts`
- Modify: `src/http.ts` (`POST /api/canvas/agent`, `GET /api/canvas/skills`)
- Test: `test/canvas/agent.test.ts`

**Interfaces:**
- Produces: `CanvasAgentPlanRequest`, `CanvasAgentPlanResult` (`assistantMessage`, `operations: CanvasPatchOp[]`, `skillId`, `mode: 'manual' | 'auto'`, `estimatedCostUsd`), `planCanvasAgentTurn`, `listCanvasSkills`
- Consumes: `buildReferenceTransferContract`, `planNextClipContinuity`, `NICHE_TOOLKITS`, `VIRAL_SFX_PACK_MAP`

- [ ] **Step 1: Write failing tests for `@` node resolution, `/` skill commands, Manual vs Auto workflow synthesis**
  - Passing prompt `"Use @char_corvus and @loc_hall to plan a 3-shot turn using /short-drama-director"` resolves live canvas node references, emits non-overlapping `(x, y)` node graph patch operations (`DirectorNode -> StoryboardGrid -> BALLMImage -> BALLMVideo -> BAVideoCompose`), enforces continuity chain re-anchoring every 2–3 video nodes, and quotes accurate budget estimate.
- [ ] **Step 2: Run test to verify failure**
  - `cmd.exe /c "node node_modules/vitest/vitest.mjs run test/canvas/agent.test.ts"` -> FAIL.
- [ ] **Step 3: Implement `src/canvas/agent.ts` with 7 built-in skills (`Creative Short Drama Director`, `Creative Ad Director`, `Viral Clip Architect`, `Horror/Thriller Pacing Director`, `3-View Character Sheet`, `All-Round Ref Video`, `Podcast-to-Shorts Factory`) & `/api/canvas/agent` route**
- [ ] **Step 4: Run tests & build**
  - `cmd.exe /c "npm run build && node node_modules/vitest/vitest.mjs run test/canvas/agent.test.ts test/http.test.ts"` -> PASS.
- [ ] **Step 5: Commit**
  - `git commit -m "feat(agent): add Lumina Canvas Agent workflow planner with @node and /skill triggers"`

---

### Task 4: Lumina Design Token Layer + Project Hub (`/hub` & `/studio` Entry) (`web/css/lumina-tokens.css` & `web/hub.html`)

**Files:**
- Create: `web/css/lumina-tokens.css`
- Create: `web/hub.html`
- Modify: `src/http.ts` (serve `/css/*`, `/canvas/*`, `/hub`, and `/studio`)
- Test: `test/http.test.ts` (verify `/hub`, `/css/lumina-tokens.css`, `/studio` return `200` with strict MIME types)

- [ ] **Step 1: Write failing HTTP asset-serving tests**
- [ ] **Step 2: Create `web/css/lumina-tokens.css` matching all extracted Arco dark + `#000000` dot-grid + `#31F0F4` sparkle + `--ba-color-slot-*` CSS custom properties**
- [ ] **Step 3: Build `web/hub.html` matching Lumina Project Hub**: Left rail (`Home`, `Canvas Agent`, `Image`, `Video`, `Audio`, `Canvas`, `Clip Studio / VI`, `Assets`), teal-black hero banner, live Projects grid from `/api/canvas/workflows` & `/api/films`, Canvas Agent Skills row, filterable Workflow Template Gallery (`All | Video | Image | Clipping | Continuity`).
- [ ] **Step 4: Update `src/http.ts` static asset whitelist (strict traversal-safe resolution under `web/`) & verify tests pass**
- [ ] **Step 5: Commit**
  - `git commit -m "feat(ui): add Lumina Obsidian/Cyan design system and Project Hub"`

---

### Task 5: Infinite Node-Graph Spatial Canvas OS (`web/studio.html` & `web/canvas/graph.js`)

**Files:**
- Create: `web/canvas/graph.js` (zero-dependency pan/zoom/snap/marquee/Bezier-wire engine + Undo/Redo stack + keyboard shortcuts `Space+Drag`, `Ctrl+F` node search, `Ctrl+S` milestone, `Delete`, `Enter` focus)
- Create: `web/canvas/nodes.js` (renders all 8+ node types: `Text`, `Image`, `Video`, `Audio` with 48kHz waveform + Voice Enroll, `Script Planning` + Paper-Render lint badge, `Storyboard Grid 2x2/3x3`, `Director's Desk` card, `Video Splice / Clip Studio` node)
- Create: `web/canvas/agent_drawer.js` (slide-over right Agent drawer with `@node` popover, `/skill` command palette, Model tabs, Manual/Auto switch, live workflow graph application)
- Rewrite: `web/studio.html` (clean thin spatial host assembling floating top-left/top-right pills, 8-button left dock, bottom-left view bar, Version History & Credits modals, Ask Agent cyan pill, and sub-editor containers)
- Test: `test/http.test.ts` + live Playwright/browser visual verification against Lumina aesthetic

- [ ] **Step 1: Implement `web/canvas/graph.js` with `20x20` SVG dot-grid transform, typed Bezier spline connections colored by slot type, multi-node selection box + floating action toolbar (`Typesetting`, `Group`, `Bypass`, `Save to Templates`, `Run Selected`), and Minimap overlay**
- [ ] **Step 2: Implement `web/canvas/nodes.js` with inline selected bottom prompt dock, model/aspect/resolution/duration/`1×–4×` batch controls, real API execution wiring (`POST /api/shots`, `POST /api/jobs/poll`, `POST /api/sfx/search`, `POST /api/continuity/validate-table`, `POST /api/continuity/voice-enroll`, `POST /api/clipping/plan`, `POST /api/clipping/render`), and real media previews (`<img>`, `<video>`, `<audio>`) inside nodes**
- [ ] **Step 3: Implement `web/canvas/agent_drawer.js` + Version History & Credits Consumption modals**
- [ ] **Step 4: Verify `/studio` renders cleanly, saves/restores canvas workflows, and triggers real backend routes (verify via `test/http.test.ts` + browser check)**
- [ ] **Step 5: Commit**
  - `git commit -m "feat(canvas-ui): ship Lumina spatial node-graph OS, Agent drawer, and live node execution"`

---

### Task 6: Embedded Full-Screen Sub-Editors — 3D Director's Desk + Unified NLE & Viral Clip Studio (`web/canvas/director_desk.js` & `web/canvas/video_editor.js`)

**Files:**
- Create: `web/canvas/director_desk.js` (interactive 3D perspective stage using HTML5 WebGL/3D projection: draggable `Camera` + `Role A..N` blocking dummies, `Director's Perspective` vs `Camera Preview`, real-time `180° Line-of-Action` laser indicator, 1-click compile to Paper-Render Shot Table & `geo_block.md`)
- Create: `web/canvas/video_editor.js` (full-screen dark NLE + Clip Studio / VI fusion launched from Left Dock Scissors or `Video Splice` node: Media Bin, `16:9` / `9:16` toggle Player with draggable crop box & kinetic caption preview, multi-track `V1` / `Captions` / `Reframe` / `SFX Auto-Spot` / `A1 Voice` timeline, `00:00:00:00` scrubbing, Split/Trim/Dead-Air Jump Cut/Viral SFX buttons, Export `MP4` / `FCPXML 1.10` / `OTIO`)
- Test: `test/http.test.ts` (verify static JS assets served with `application/javascript`) + live browser screenshot QA diff vs `docs/research/lumina/LUMINA_REA_DOSSIER.md`

- [ ] **Step 1: Build interactive `web/canvas/director_desk.js` wired to `/api/director-desk/compile` & `/api/continuity/validate-table`**
- [ ] **Step 2: Build unified `web/canvas/video_editor.js` fusing Lumina Video Editor + Clip Studio / VI + 320 SFX Kit preview**
- [ ] **Step 3: Run full `npm run build && npm test`, run browser visual QA screenshot on `http://127.0.0.1:<port>/studio` & `/hub`, compare desktop `1440px` layout against `LUMINA_REA_DOSSIER.md` tokens, fix any spacing/contrast glitches, and commit**
- [ ] **Step 4: Push clean verified commits to `origin/main`**

---

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-11-25-lumina-canvas-clone-and-topnotch-upgrade.md` with supporting REA dossier at `docs/research/lumina/LUMINA_REA_DOSSIER.md`. Two execution options:

1. **Subagent-Driven (recommended)** — Dispatch fresh subagents per task (`Task 1`–`Task 6`) with two-stage review and live browser visual QA against our Lumina dossier.
2. **Inline Execution** — Execute Tasks 1–6 sequentially in this session with verification checkpoints after each task.
