# Full-Capable Frontier Studio MCP Master Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Eliminate every placeholder, mock writer, and toy demo in `frontier-studio-mcp`, and build the complete, deterministic, top-tier AI filmmaking & video production MCP engine for Codex and remote LLM directors—connecting authentic Google AI Pro web sessions (`flow.google` Nano Banana 2.5 + `aistudio.google.com`), Vultr MiniMax H3 GPU rendering, real FFmpeg/FFprobe post-production, and DaVinci Resolve FCPXML 1.10 / OTIO export.

**Architecture:** A strict headless MCP engine (`stdio` locally, `SSE/HTTP` on VPS port `8080`) backed by atomic disk stores (`STUDIO_ROOT`), paired with an authentic-session Manifest V3 Chrome Extension (`frontier-flow-bridge`) + manual asset import protocol. Every generation, audio mix, QC check, and timeline export produces verified binary media on disk (`ffprobe`-validated) and reconciles double-entry accounting in `ledger.jsonl`.

**Tech Stack:** TypeScript, Node.js (v20+), MCP SDK (`@modelcontextprotocol/sdk`), Manifest V3 Chrome Extension, FFmpeg 6.1.1 / FFprobe, Vultr Serverless Inference API (`minimax-h3`), Zod, Vitest.

**Spec:** `docs/TOPNOTCH_PRODUCTION_BLUEPRINT.md`, `docs/HOLLYWOOD_SHOWRUNNER_SKILL.md`, `docs/viduxtool-blueprint/README.md`, `docs/viduxtool-blueprint/originals/adversarial_critique_industry_filmmaking_gap_analysis.md`

---

## Forensic Audit: Every Placeholder & Broken Link to Purge

Before building new capabilities, we explicitly list every toy placeholder uncovered during the full codebase & session audit so none survive:

1. **`googleflow_mcp/src/clients/media_engine.py`**: Falls back to 13 KB PIL black boxes (`CINEMATIC ASSET // IMAGEN 3 PIPELINE`) and 40Hz sine-wave hums, and hits paid REST APIs instead of user's Google AI Pro web session (`flow.google` & `aistudio.google.com`).
2. **`src/tools/image.ts`, `src/tools/staging.ts`, `src/tools/storyboard.ts`**: Hardwired to paid `GeminiLane` REST API; lacks web-bridge / zero-API local assembly and prompt formulation for `flow.google`.
3. **`src/tools/audio.ts` (`dialogue_render`, `soundscape_build`, `score_arrange_dynamic`)**:
   - `dialogue_render` hard-requires `GEMINI_API_KEY` (Cloud TTS) or `ELEVENLABS_API_KEY` with no support for `aistudio.google.com` voice import/capture.
   - `soundscape_build` writes a `.txt` file (`SFX SPEC: ...`) instead of generating/processing real `.wav` audio.
   - `score_arrange_dynamic` has `'RIFF48kHzMasterScoreBed'` string fallback and copies one stem without executing FFmpeg filtergraphs (`volume`, `lowpass`, `amix`, `sidechaincompress`, `loudnorm`).
4. **`src/tools/editor.ts` (`film_assemble`, `film_export_xml`)**:
   - `film_assemble` writes `concat_manifest.txt` and returns a string command without running FFmpeg or verifying media; inserts fake `placeholder_<shot>.mp4` paths.
   - `film_export_xml` omits Audio Tracks A1/A2/A3 (Dialogue/SFX/Score) and uses relative `file://renders/...` paths that break relinking in DaVinci Resolve.
5. **`src/harness/runner.ts`**: Skips video/image/audio generation completely and hardcodes `status: 'COMPLETED'` and `qc_audit_passed: true` when zero MP4s exist.
6. **`src/qa/critic.ts`**: Without `criticApiKey`, hardcodes `9.0–9.2` scores so any non-black frame passes `>= 8.5`.
7. **`src/lanes/video.ts` & `src/lanes/vultr.ts`**: Uses outdated `H3_ESTIMATE_USD_PER_SECOND = 0.153` instead of live verified Vultr SKUs (`turbo` $0.06/s, `standard` $0.09/s, `max`/`4K` $0.18/s, `ultra` $0.30/s).
8. **`scripts/browser/music_bridge.ts` & `canvas_bridge.ts`**: Writes `'RIFFMock...'` strings into `.wav` files and returns mock node JSON instead of real browser bridge orchestration.
9. **`src/storage/r2.ts`**: Returns synthetic public URLs without signing (SigV4) or executing HTTP PUT uploads.
10. **`src/clipping/pipeline.ts`**: Emits static crop command using only `reframe_track[0]` without running FFmpeg or dynamic crop expressions.
11. **`src/saas/viduxtool.ts`**: Lists unimplemented models (`kling-4`, `veo-2`, `omniflash-1.2`) and returns `queued` jobs without dispatching workers.
12. **Cosmetic HTML Demo UI (`web/studio.html`, `web/index.html`)**: Distraction from the headless MCP server for Codex; must not masquerade as the product.

---

## Global Constraints

- **Zero Fake Artifacts (No Lies Law):** Never generate black PIL placeholders, `'RIFFMock...'` text files, sine-wave stand-ins, or fake `COMPLETED` statuses. Missing inputs or failed binaries MUST throw structured `errValidation`/`errNotFound`/`errLaneDown` with actionable `NEXT:` hints.
- **No Paid Google Cloud APIs for Images/Audio:** Strictly route 4K character turnarounds (`flow.google` Nano Banana 2.5) and character dialogue (`aistudio.google.com`) through the user's **Google AI Pro** web session (via Chrome Extension bridge OR manual drop + `asset_image`/`dialogue_import`).
- **4K Master Quality & Credit Discipline:** Anchor sheets and location plates are true **4K (3840×2160)** headless 3-panel turnarounds (`#e8e8e8`) and 2.39:1 motivated-light plates. Default Vultr GPU video takes target **768p Standard ($0.09/s)** for credit efficiency (with 4–15s takes, plus **4K `seedvr2-7b-sharp-video` at $0.18/s** supported when requested).
- **Double-Entry Financial Integrity:** Pre-flight `ensureBudget` $\rightarrow$ reserve estimate at submit $\rightarrow$ reconcile actual `usage.cost` on download $\rightarrow$ automatic idempotent refund on failure/cancellation.
- **Zero Regression Invariant:** All existing valid unit tests MUST remain green (with obsolete mock expectations updated cleanly as real implementations replace stubs).

---

### Task 1: Truthful Post-Production, FFmpeg Verification & Purge Fake Fallbacks

**Files:**
- Modify: `src/tools/editor.ts`
- Modify: `src/harness/runner.ts`
- Modify: `src/qa/critic.ts`
- Test: `test/tools/editor.test.ts`
- Test: `test/harness/runner.test.ts`
- Test: `test/qa/critic.test.ts`

**Interfaces:**
- Consumes: `shotShow`, `ffprobe`, `ffmpeg`, `paths.rendersDir`, `paths.audioDir`.
- Produces: Real, decoded, verified MP4/WAV artifacts on disk (`rough_cut.mp4`, multi-track FCPXML 1.10 / OTIO / EDL), and honest failure states when footage is absent.

- [ ] **Step 1: Write failing tests for truthful `film_assemble`, multi-track `film_export_xml`, and truthful `runAutonomousProduction`**

Add tests verifying:
1. `film_assemble` refuses (`errValidation`) when shots lack rendered MP4 files on disk (unless `allow_dry_run_manifest: true` is explicitly passed for planning tests).
2. `film_assemble` with real test-generated FFmpeg MP4 clips executes `ffmpeg`, produces an actual readable `rough_cut.mp4`, and returns `ffprobe` duration/stream metadata.
3. `film_export_xml` generates FCPXML 1.10 and OTIO containing Video Track 1 (`V1`) AND Audio Tracks (`A1` Dialogue WAVs + `A2` Room Tone/SFX + `A3` Score) with valid absolute URIs (`file:///...`).
4. `runAutonomousProduction` (`src/harness/runner.ts`) returns `status: 'FAILED'` (or `'STAGED_ONLY'`) and `qc_audit_passed: false` if rendered takes are missing—never falsifying `COMPLETED`.

- [ ] **Step 2: Run tests to verify they fail**

Run: `node node_modules/vitest/vitest.mjs run test/tools/editor.test.ts test/harness/runner.test.ts test/qa/critic.test.ts`

- [ ] **Step 3: Implement truthful execution in `editor.ts`, `runner.ts`, and `critic.ts`**

1. In `src/tools/editor.ts`:
   - `film_assemble`: Add `apply` (default `true`). Verify each shot has an existing MP4 file on disk. Normalize mismatched codecs/fps cleanly if needed and execute `ffmpeg` concat + audio stem mixing (`-c:v libx264 -pix_fmt yuv420p` or stream copy when uniform, `-af loudnorm=I=-23:TP=-1.0`). Run `ffprobe -v quiet -print_format json -show_format -show_streams` on `rough_cut.mp4` and include `duration_s`, `width`, `height`, `fps`, `file_bytes` in tool output.
   - `film_export_xml`: Resolve existing rendered MP4s and `audio/` stems (`<shot>_line_*_diegetic.wav` or `<shot>_line_*.wav`, `<shot>_soundscape.wav`, `score_master.wav`), emitting full V1 + A1 + A2 + A3 tracks in both FCPXML 1.10 and OTIO with absolute `file:///` paths so DaVinci Resolve links media cleanly.
2. In `src/qa/critic.ts`:
   - Replace hardcoded `9.0` scores with real `ffprobe` + `ffmpeg` checks (`blackdetect`, `freezedetect`, `signalstats` frame-to-frame luminance delta, `ffprobe` stream/frame-count verification, resolution check). When `criticApiKey` is set, run VLM inspection against `sheet.png`/`plate.png`. Include deterministic fail triggers when streams are corrupt, resolution is malformed, or frames freeze/flicker.
3. In `src/harness/runner.ts`:
   - Update `runAutonomousProduction` to check whether takes/assets exist, invoke `qc_vision_audit` on real MP4s, and truthfully report `status: 'STAGED_AWAITING_RENDERS'` vs `'COMPLETED'` vs `'FAILED'` based on verified media existence and `ffprobe` decode success.

- [ ] **Step 4: Run tests to verify they pass**

Run: `node node_modules/vitest/vitest.mjs run test/tools/editor.test.ts test/harness/runner.test.ts test/qa/critic.test.ts`

- [ ] **Step 5: Commit**

```bash
git add src/tools/editor.ts src/harness/runner.ts src/qa/critic.ts test/tools/editor.test.ts test/harness/runner.test.ts test/qa/critic.test.ts
git commit -m "fix(core): enforce truthful FFmpeg assembly, multi-track FCPXML/OTIO, and real QC gates"
```

---

### Task 2: Real FFmpeg Audio Mastering, Dialogue Import (`dialogue_import`), & Soundstage

**Files:**
- Modify: `src/tools/audio.ts`
- Modify: `src/server.ts`
- Test: `test/tools/audio.test.ts`

**Interfaces:**
- Produces:
  - `dialogue_import` MCP tool: ingests user-captured or extension-captured audio from `aistudio.google.com` (WAV/MP3/OGG/WebM), validates real audio via `ffprobe`, transcodes/normalizes via FFmpeg to 48kHz 16/24-bit mono PCM WAV at `audio/<shot_id>_line_<n>.wav`, zero API cost.
  - Hardened `score_arrange_dynamic`: executes actual FFmpeg `filter_complex` mixing across `felt_whisper`, `creeping_dread`, `epic_swell`, `vacuum_silence` states, EBU R128 `-23 LUFS` mastering, producing real decoded `score_master.wav` (removing the `'RIFF48kHzMasterScoreBed'` fake text fallback).
  - Hardened `soundscape_build`: synthesizes textured ambient beds via FFmpeg (`anoisesrc` sculpted with acoustic bandpass/echo matching the environment) OR ingests/loops supplied SFX audio into a real playable `audio/<shot_id>_soundscape.wav` verified by `ffprobe` (replacing `.txt`-only stub).

- [ ] **Step 1: Write failing tests in `test/tools/audio.test.ts`**

Verify:
1. `dialogue_import` takes a source audio file, converts to 48kHz PCM WAV via FFmpeg, validates duration/loudness, saves to `<shot_id>_line_1.wav`, and rejects corrupt/silent/missing files.
2. `score_arrange_dynamic` runs real FFmpeg filtergraph across test WAV stems, outputs valid RIFF WAVE `score_master.wav` verified by `ffprobe` (`sample_rate === '48000'`), and fails loudly if stems are unreadable/corrupt (never writing text strings).
3. `soundscape_build` outputs a real `.wav` ambient stem verified by `ffprobe`.

- [ ] **Step 2: Run test to verify it fails**

Run: `node node_modules/vitest/vitest.mjs run test/tools/audio.test.ts`

- [ ] **Step 3: Implement `dialogue_import` and real FFmpeg audio rendering in `src/tools/audio.ts`**

Implement real `ffmpeg` filtergraph generation & execution for `score_arrange_dynamic` (`[0:a]atrim=...` per-shot state gains + `lowpass=f=650` + `amix` + `loudnorm=I=-23:TP=-1.0`), real acoustic ambient synthesis for `soundscape_build`, and `dialogue_import` for Google AI Studio web captures. Register cleanly on `server`.

- [ ] **Step 4: Run test to verify it passes**

Run: `node node_modules/vitest/vitest.mjs run test/tools/audio.test.ts`

- [ ] **Step 5: Commit**

```bash
git add src/tools/audio.ts test/tools/audio.test.ts
git commit -m "feat(audio): add dialogue_import for AI Studio captures and real FFmpeg score/soundscape mixing"
```

---

### Task 3: Authentic Google AI Pro Bridge (`frontier-flow-bridge` Chrome Extension + Local Bridge Queue + Prompt Tools)

**Files:**
- Create: `extension/manifest.json`
- Create: `extension/background.js`
- Create: `extension/popup.html`
- Create: `extension/popup.js`
- Create: `extension/content_flow.js`
- Create: `extension/content_aistudio.js`
- Create: `src/bridge/web_bridge_server.ts`
- Create: `src/tools/flow_prompts.ts`
- Modify: `src/http.ts`
- Modify: `src/server.ts`
- Test: `test/bridge/web_bridge.test.ts`
- Test: `test/tools/flow_prompts.test.ts`

**Interfaces:**
- Consumes: Registered character dossiers (`descriptor.md`, `voice.md`, `acting.md`, biological markers) & locations (`geo_block.md`, motivated `light_statement`).
- Produces:
  1. **Local & Remote Bridge Endpoints** (mounted in `src/http.ts` and `src/bridge/web_bridge_server.ts`):
     - `GET /bridge/status` (shows whether extension is online & heartbeat age)
     - `POST /bridge/jobs` (queues a prompt job for Flow or AI Studio)
     - `GET /bridge/jobs/next` (extension long-polls or polls for queued tasks)
     - `POST /bridge/jobs/:id/complete` (extension uploads raw extracted 4K PNG or audio blob; server verifies magic bytes, dimensions/duration via `ffprobe`/PNG IHDR, writes atomically to `sheet.png` / `plate.png` / `<shot>_line_<n>.wav`)
  2. **MCP Tools (`src/tools/flow_prompts.ts`)**:
     - `flow_prompt_sheet`: Builds locked 3-panel headless turnaround prompt (`#e8e8e8` backdrop, face close-up, headless torso ending at collar, rear view, biological markers, negative constraints). Can queue to Chrome Extension (`dispatch_to_bridge: true`) OR return exact prompt + `asset_image` command for manual drop.
     - `flow_prompt_plate`: Builds Panavision 2.39:1 C-Series anamorphic master plate prompt with motivated light statement & `geo_block.md`. Can queue to extension OR return manual drop instructions.
     - `studio_prompt_dialogue`: Formats Raymond Reddington subtext + phonetic tags (`[pause: 800ms]`, `[breath]`) + Google AI Studio persona (`Charon`, `Fenrir`, `Aoede`, `Puck`, `Kore`). Can queue to extension OR return `dialogue_import` manual instructions.
     - `bridge_status` / `bridge_job_result`: Lets Codex inspect extension connectivity and retrieve captured 4K/WAV outputs asynchronously without hanging!
  3. **Unpacked Manifest V3 Chrome Extension (`extension/`)**:
     - Runs inside user's genuine logged-in Chrome browser (zero bot detection, Google AI Pro active).
     - `content_flow.js`: Injects prompt into `flow.google` / `labs.google/fx`, selects Nano Banana 2.5 / 16:9 / 4K if present, waits for result image/canvas, extracts raw unwatermarked image bytes (`canvas.toBlob` or full-res `<img>` blob fetch), posts to `/bridge/jobs/:id/complete`.
     - `content_aistudio.js`: Injects speaking prompt into `aistudio.google.com`, selects voice persona, triggers generation, intercepts audio blob / download stream, posts to `/bridge/jobs/:id/complete`.
     - Explicit selector fallback + toast notification on the active Chrome tab so if Google updates its DOM selectors, the extension copies the prompt to clipboard and highlights a 1-click "Upload Downloaded File to Studio" button in the popup—never failing silently!

- [ ] **Step 1: Write failing tests in `test/bridge/web_bridge.test.ts` and `test/tools/flow_prompts.test.ts`**

Verify:
1. Bridge job lifecycle: queue job $\rightarrow$ poll `next` $\rightarrow$ upload PNG/WAV payload $\rightarrow$ verifies PNG signature / writes to `assets/characters/<id>/sheet.png` atomically.
2. Rejects invalid/empty/tiny dummy uploads (`< 10KB` PNGs or non-PNG bytes refused loudly).
3. `flow_prompt_sheet`, `flow_prompt_plate`, `studio_prompt_dialogue` enforce character/location completeness laws and produce exact structured prompts.

- [ ] **Step 2: Run tests to verify they fail**

Run: `node node_modules/vitest/vitest.mjs run test/bridge/web_bridge.test.ts test/tools/flow_prompts.test.ts`

- [ ] **Step 3: Implement `web_bridge_server.ts`, `flow_prompts.ts`, and `extension/*`**

Wire `/bridge/*` endpoints into `src/http.ts` and register the MCP tools in `src/server.ts`. Author complete, clean Manifest V3 extension files under `extension/`.

- [ ] **Step 4: Run tests to verify they pass**

Run: `node node_modules/vitest/vitest.mjs run test/bridge/web_bridge.test.ts test/tools/flow_prompts.test.ts`

- [ ] **Step 5: Commit**

```bash
git add extension/ src/bridge/ src/tools/flow_prompts.ts src/http.ts src/server.ts test/bridge/ test/tools/flow_prompts.test.ts
git commit -m "feat(bridge): implement frontier-flow-bridge Chrome extension, HTTP queue, and Flow/AI Studio prompt tools"
```

---

### Task 4: Vultr MiniMax H3 Live Pricing Alignment, 4K / 21:9 Support, & Automated Post-Download QC

**Files:**
- Modify: `src/lanes/video.ts`
- Modify: `src/lanes/vultr.ts`
- Modify: `src/tools/video.ts`
- Test: `test/lanes/vultr.test.ts`
- Test: `test/tools/video.test.ts`

**Interfaces:**
- Consumes: Live Vultr `/v1/videos/models` contract (`pricing_skus`, `supported_sizes`).
- Produces:
  - Accurate pricing per quality tier:
    - `turbo`: `$0.06 / s`
    - `standard` (default, 768p): `$0.09 / s` ($1.35 per 15s take)
    - `max` / `2K` / `4K` (`seedvr2-7b-sharp-video` up to 4608×2016 21:9): `$0.18 / s`
    - `ultra`: `$0.30 / s`
  - Quality enum expanded cleanly (`turbo | standard | max | ultra | 2K | 4K`) with `standard` as default.
  - `job_download` runs `ffprobe` + `auditTake` automatically after saving `shot.mp4` and surfaces real technical metrics (`fps`, `resolution`, `duration_s`, `qc_verdict`, `qc_issues`) alongside reconciled `actual_cost_usd`.

- [ ] **Step 1: Write/update tests in `test/lanes/vultr.test.ts` and `test/tools/video.test.ts`**

Verify per-quality `estimatePrice` calculations ($0.09/s for `standard`, $0.18/s for `4K`, $0.06/s for `turbo`, $0.30/s for `ultra`), `21:9` aspect ratio forwarding, and reconciled cost ledgering.

- [ ] **Step 2: Run tests to verify failures before edit**

Run: `node node_modules/vitest/vitest.mjs run test/lanes/vultr.test.ts test/tools/video.test.ts`

- [ ] **Step 3: Update `src/lanes/video.ts`, `src/lanes/vultr.ts`, and `src/tools/video.ts`**

Update `VideoQuality`, `VULTR_PRICING_PER_SEC`, `estimatePrice`, Zod schemas in `registerVideoTools`, and `ffprobe` verification in `job_download`.

- [ ] **Step 4: Run tests to verify all pass**

Run: `node node_modules/vitest/vitest.mjs run test/lanes/vultr.test.ts test/tools/video.test.ts`

- [ ] **Step 5: Commit**

```bash
git add src/lanes/video.ts src/lanes/vultr.ts src/tools/video.ts test/lanes/vultr.test.ts test/tools/video.test.ts
git commit -m "feat(vultr): align pricing to live Vultr SKUs ($0.09/s standard, $0.18/s 4K) and add post-download ffprobe QC"
```

---

### Task 5: Purge Remaining Stubs (R2 Real SigV4 Upload, Real Clipping Execution, Clean SaaS/Browser Bridge)

**Files:**
- Modify: `src/storage/r2.ts`
- Modify: `src/clipping/pipeline.ts`
- Modify: `src/saas/viduxtool.ts`
- Modify: `scripts/browser/music_bridge.ts`
- Modify: `scripts/browser/canvas_bridge.ts`
- Test: `test/clipping/pipeline.test.ts`
- Test: `test/browser/browser_bridge.test.ts`
- Test: `test/saas/viduxtool.test.ts`

**Interfaces:**
- Produces:
  1. Real AWS SigV4 `PUT` upload implementation in `src/storage/r2.ts` (using Node built-in `node:crypto` + `fetch`), failing loudly if HTTP status is non-2xx or credentials missing when required.
  2. Real dynamic FFmpeg crop-expression generation + execution helper in `src/clipping/pipeline.ts` (`executeClipRender`) interpolating across all `reframe_track` keyframes using `crop=w=...:h=...:x='if(lt(t,...),...)'`.
  3. Removal of fake `'RIFFMock...'` file writers in `scripts/browser/music_bridge.ts` (instead compiling prompt payloads and queuing to `WebBridgeServer` or failing loudly when no audio source exists).
  4. Honest `MODEL_CATALOG` in `src/saas/viduxtool.ts` reflecting verified backed models (`minimax-h3`, `ffmpeg-compositor`) rather than unimplemented fantasy models, and wiring job dispatch cleanly instead of orphaned `'queued'` state.

- [ ] **Step 1: Write failing tests for dynamic crop expression interpolation, R2 SigV4 signing, and non-mock bridge behavior**

- [ ] **Step 2: Run tests to verify failure**

Run: `node node_modules/vitest/vitest.mjs run test/clipping/pipeline.test.ts test/browser/browser_bridge.test.ts test/saas/viduxtool.test.ts`

- [ ] **Step 3: Implement real SigV4 R2 upload, interpolated crop expressions, and clean non-mock browser bridge**

- [ ] **Step 4: Run tests to verify pass**

Run: `node node_modules/vitest/vitest.mjs run test/clipping/pipeline.test.ts test/browser/browser_bridge.test.ts test/saas/viduxtool.test.ts`

- [ ] **Step 5: Commit**

```bash
git add src/storage/r2.ts src/clipping/pipeline.ts src/saas/viduxtool.ts scripts/browser/ test/
git commit -m "refactor(hardening): replace remaining R2, clipping, and browser bridge stubs with real implementations"
```

---

### Task 6: Clean Headless HTTP/SSE Host, Codex Directing Guide, & Live End-to-End Verification

**Files:**
- Modify: `src/http.ts`
- Create: `docs/CODEX_DIRECTING_GUIDE.md`
- Create: `test/e2e/full_pipeline.test.ts`
- Modify: `README.md`

**Interfaces:**
- Consumes: All 32+ registered MCP tools over `SSEServerTransport` & `StdioServerTransport`.
- Produces:
  - Clean headless HTTP daemon (SSE MCP, `/artifacts/*`, `/bridge/*`, `/api/*`, `/health`) without misleading cosmetic demo dashboards.
  - Full E2E integration test using real FFmpeg video/audio fixtures + mocked Vultr HTTP verifying: `film_create` -> `asset_register` -> `flow_prompt_sheet` -> `asset_image` -> `flow_prompt_plate` -> `sequence_lock_geo` -> `shot_create` -> `render_shot` -> `job_status` -> `job_download` -> `dialogue_import` -> `acoustic_match` -> `shot_lipsync` -> `film_grade` -> `film_assemble` (real decoded `rough_cut.mp4`) -> `film_export_xml` (valid multi-track FCPXML 1.10 + OTIO + EDL) -> `qc_vision_audit`.
  - GitHub push + live deploy to VPS `159.203.139.253:8080` + live SSE MCP client verification against the VPS!

- [ ] **Step 1: Write comprehensive E2E test in `test/e2e/full_pipeline.test.ts`**

- [ ] **Step 2: Run full Vitest suite & TypeScript check**

Run: `node node_modules/typescript/bin/tsc --noEmit ; node node_modules/vitest/vitest.mjs run`
Expected: 0 TypeScript errors, 100% PASS across all test suites.

- [ ] **Step 3: Write `docs/CODEX_DIRECTING_GUIDE.md` with exact Codex MCP config and workflow**

- [ ] **Step 4: Deploy to VPS `159.203.139.253` and verify live SSE connection + tool execution**

- [ ] **Step 5: Commit & Push**

```bash
git add -A
git commit -m "feat(release): full production-hardened frontier-studio-mcp for Codex"
git push origin main
```
