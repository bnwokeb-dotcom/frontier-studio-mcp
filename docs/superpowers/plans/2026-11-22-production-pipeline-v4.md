# Production Pipeline v4 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the Hollywood-grade v4 production pipeline in `frontier-studio-mcp`: dual-anchor character voice locking, biological multi-age inheritance, dynamic additive score stem arrangement, and headless browser automation bridge for VPS deployment.

**Architecture:** Extend asset store for physical voice samples and biological marker inheritance, implement `score_arrange_dynamic` in audio tools with FFmpeg volume envelopes and spectral sidechain ducking, construct the headless browser automation suite for Suno/Udio/Canvases, and containerize for VPS hosting.

**Tech Stack:** TypeScript, Node.js (v20+), Vitest, FFmpeg, Playwright / Chrome DevTools, Zod, Model Context Protocol (MCP) SDK, Docker.

**Spec:** `docs/superpowers/specs/2026-11-22-production-pipeline-design.md`

## Global Constraints

- **Zero Regression Invariant:** All 261 existing tests across 28 test files MUST remain passing at all times.
- **Byte-Pinned Consistency:** Descriptors and spatial geo-blocks are verbatim law and never trimmed or hallucinated.
- **EBU R128 Audio Standard:** Master loudness target is -14 to -23 LUFS with -1.0 dB true-peak ceiling at 48kHz 24-bit PCM.
- **Deterministic Stores:** Local JSON/Markdown stores on disk (`STUDIO_ROOT`) remain inspectable and atomic.

---

### Task 1: Dual-Anchor Character Dossier & Voice Sample Store

**Files:**
- Modify: `src/store/asset.ts`
- Test: `test/store/asset.test.ts`

**Interfaces:**
- Consumes: `paths.assetDir(filmId, 'characters', assetId)`
- Produces: `voice_sample.wav` and `voice_profile.json` stored in character asset directory.

- [ ] **Step 1: Write failing test in `test/store/asset.test.ts`**
  Add a test verifying that `assetRegister` accepts `voiceSamplePath`, `voiceId`, and copies/writes `voice_sample.wav` and `voice_profile.json` into the character directory.

- [ ] **Step 2: Run test to verify it fails**
  Run: `cmd /c "npx vitest run test/store/asset.test.ts"`
  Expected: FAIL with property not supported on `AssetInput`.

- [ ] **Step 3: Implement `voiceSamplePath` and `voiceId` in `src/store/asset.ts`**
  Extend `AssetInput` interface with `voiceSamplePath?: string`, `voiceId?: string`, and `voiceProvider?: 'google' | 'elevenlabs'`.
  When registering a character, if `voiceSamplePath` is provided, copy the file to `voice_sample.wav`.
  Write `voice_profile.json` with provider, voiceId, and reference sample path.

- [ ] **Step 4: Run test to verify it passes**
  Run: `cmd /c "npx vitest run test/store/asset.test.ts"`
  Expected: PASS.

- [ ] **Step 5: Commit changes**
  Run: `git add src/store/asset.ts test/store/asset.test.ts && git commit -m "feat(store): add dual-anchor voice sample and profile support"`

---

### Task 2: Locked Voice Dialogue Rendering

**Files:**
- Modify: `src/tools/audio.ts`
- Test: `test/tools/audio.test.ts`

**Interfaces:**
- Consumes: `paths.assetDir(filmId, 'characters', voiceRef)` for `voice_profile.json` and `voice_sample.wav`.
- Produces: Isolated 48kHz WAV dialogue stems matched to the character's locked voice profile.

- [ ] **Step 1: Write failing test in `test/tools/audio.test.ts`**
  Add test verifying `dialogue_render` inspects character's `voice_profile.json` to automatically use their locked `voiceId` and provider without manual overrides.

- [ ] **Step 2: Run test to verify it fails**
  Run: `cmd /c "npx vitest run test/tools/audio.test.ts"`
  Expected: FAIL.

- [ ] **Step 3: Implement automatic character voice resolution in `src/tools/audio.ts`**
  In `dialogue_render`: Before synthesizing, read the speaking character's `voice_profile.json` if it exists. If it defines a custom `voiceId` or `lane`, bind the lane and voiceId automatically.

- [ ] **Step 4: Run test to verify it passes**
  Run: `cmd /c "npx vitest run test/tools/audio.test.ts"`
  Expected: PASS.

- [ ] **Step 5: Commit changes**
  Run: `git add src/tools/audio.ts test/tools/audio.test.ts && git commit -m "feat(audio): bind dialogue_render to character voice_profile"`

---

### Task 3: Dynamic Music Supervision & Additive Stem Arrangement

**Files:**
- Modify: `src/tools/audio.ts`
- Modify: `src/server.ts`
- Test: `test/tools/audio.test.ts`

**Interfaces:**
- Produces: `score_arrange_dynamic` tool registered on MCP server.
- Output: `audio/score_master.wav` and `audio/score_timeline.json`.

- [ ] **Step 1: Write failing test for `score_arrange_dynamic` in `test/tools/audio.test.ts`**
  Test creating an arrangement from 3 stems (melody, sub_drone, percussion) across multiple shot dramatic states (`felt_whisper`, `creeping_dread`, `epic_swell`), verifying volume envelope math and manifest generation.

- [ ] **Step 2: Run test to verify it fails**
  Run: `cmd /c "npx vitest run test/tools/audio.test.ts"`
  Expected: FAIL with tool not found.

- [ ] **Step 3: Implement `score_arrange_dynamic` in `src/tools/audio.ts`**
  Add schema with `film_id`, `stems_dir`, `shots: [{ shot_id, state: 'felt_whisper' | 'creeping_dread' | 'epic_swell' | 'vacuum_silence', duck_db?: number }]`.
  Implement stem volume automation filtergraph:
  - `felt_whisper`: melody at -18dB, lowpass=650.
  - `creeping_dread`: melody + 35Hz sub-drone at -12dB.
  - `epic_swell`: all stems unmuted at -2dB.
  - `vacuum_silence`: volume=0.
  Loudnorm to -23 LUFS EBU R128.

- [ ] **Step 4: Run test to verify it passes**
  Run: `cmd /c "npx vitest run test/tools/audio.test.ts"`
  Expected: PASS.

- [ ] **Step 5: Commit changes**
  Run: `git add src/tools/audio.ts src/server.ts test/tools/audio.test.ts && git commit -m "feat(audio): add score_arrange_dynamic tool with additive stem mixer"`

---

### Task 4: Biological Multi-Age Character Inheritance

**Files:**
- Modify: `src/store/asset.ts`
- Modify: `src/tools/image.ts`
- Test: `test/store/asset.test.ts`
- Test: `test/tools/image.test.ts`

**Interfaces:**
- Consumes: `parent_dna` linking age variants to parent character.
- Produces: `biological_markers.json` in character asset directory, injected into `character_sheet_build`.

- [ ] **Step 1: Write failing test in `test/store/asset.test.ts`**
  Test registering child character with `parent_dna: "corvus"` and verifying inheritance of biological markers (iris hex, bone structure, signature marks).

- [ ] **Step 2: Run test to verify it fails**
  Run: `cmd /c "npx vitest run test/store/asset.test.ts"`
  Expected: FAIL.

- [ ] **Step 3: Implement biological inheritance in `src/store/asset.ts` and `src/tools/image.ts`**
  Add `biologicalMarkers` to `AssetInput`.
  When `parent_dna` is passed, merge parent's biological markers.
  In `character_sheet_build`, automatically append biological consistency tokens to the Imagen 3 prompt.

- [ ] **Step 4: Run test to verify it passes**
  Run: `cmd /c "npx vitest run test/store/asset.test.ts test/tools/image.test.ts"`
  Expected: PASS.

- [ ] **Step 5: Commit changes**
  Run: `git add src/store/asset.ts src/tools/image.ts test/store/asset.test.ts test/tools/image.test.ts && git commit -m "feat(characters): add biological multi-age inheritance"`

---

### Task 5: Headless Browser Automation Bridge (Suno / Udio / Web Canvases)

**Files:**
- Create: `scripts/browser/music_bridge.ts`
- Create: `scripts/browser/canvas_bridge.ts`
- Test: `test/browser/browser_bridge.test.ts`

**Interfaces:**
- Produces: Executable headless browser automation utilities for generating and extracting stems and canvas nodes.

- [ ] **Step 1: Write unit test in `test/browser/browser_bridge.test.ts`**
  Verify the prompt compiler, stem download resolver, and mock browser runner contracts.

- [ ] **Step 2: Run test to verify it fails**
  Run: `cmd /c "npx vitest run test/browser/browser_bridge.test.ts"`
  Expected: FAIL.

- [ ] **Step 3: Implement `music_bridge.ts` and `canvas_bridge.ts`**
  Implement modular browser orchestrator handling session cookie auth, prompt injection, variation trigger, and stem asset retrieval.

- [ ] **Step 4: Run test to verify it passes**
  Run: `cmd /c "npx vitest run test/browser/browser_bridge.test.ts"`
  Expected: PASS.

- [ ] **Step 5: Commit changes**
  Run: `git add scripts/browser/ test/browser/ && git commit -m "feat(browser): add headless browser automation bridge"`

---

### Task 6: Full Integration, VPS Deployment Packaging & Verification

**Files:**
- Modify: `Dockerfile`
- Modify: `docker-compose.yml`
- Modify: `package.json`

- [ ] **Step 1: Update `Dockerfile` and `docker-compose.yml` for VPS hosting**
  Ensure FFmpeg, Node 20, and all studio persistent volume mounts (`/data/studio`) are properly configured. Add port 3000 exposure for remote SSE/HTTP streaming.

- [ ] **Step 2: Run complete test suite**
  Run: `cmd /c "npm test"`
  Expected: 100% PASS across all test files (all 261 existing tests + new tests).

- [ ] **Step 3: Build production bundle**
  Run: `cmd /c "npm run build"`
  Expected: Compiled successfully with zero TypeScript errors.

- [ ] **Step 4: Commit and finalize**
  Run: `git add Dockerfile docker-compose.yml package.json && git commit -m "chore(vps): ready studio for VPS hosting and full deployment"`
