# Frontier Studio MCP — M3 Video Lane Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship M3 — the Vultr MiniMax-H3 video lane: extracted money-law helper (mandated by the M2 branch review), VideoLane with runtime model verification, the H3 prompt composer that maps our doctrine onto H3's native layout, `render_shot` (async, first-frame I2V from the keyframe plate), `job_status`/`job_download`/`repair_shot` with lineage — the machinery the vertical slice runs on.

**Architecture:** Same thin-MCP + skill-brain. New `src/lanes/vultr.ts` (async VideoLane: submit → poll → download, all fixture-tested); new `src/tools/h3prompt.ts` (PURE composer: our shot record → H3's native three-field layout — the API natively encodes our laws: `non_diegetic_music: N/A` is our no-music law, first-frame mode is images-first, subject definitions are verbatim descriptors); shot schema v2 gains a required `action` field (action text was deferred from M1 to here — H3's `[Shot N]` blocks need it). `render_shot` schema-requires the shot's keyframe plate (digest feature #1: staging before spend).

**Tech Stack:** Unchanged. Vultr facts are VERIFIED (spec §12.1): base `https://api.vultrinference.com/v1`, `Authorization: Bearer`, `minimax-h3`, duration 4–15s (whole 24fps blocks — real lengths run long), `usage.cost` actual billing, only `completed` bills.

**Spec:** `docs/superpowers/specs/2026-11-14-frontier-studio-mcp-design.md` (§4, §6, §7, §8, §12.1 resolved) · Topnotch digest: `docs/superpowers/research/2026-11-15-topnotch-platforms-digest.md` · M2 record: `docs/superpowers/plans/2026-11-15-m2-image-lane-execution-record.md`

## Global Constraints (inherited + M3)

- All M1/M2 constraints hold (StudioError+NEXT, atomic writes, snake_case wire, env-only credentials, no credential literals in fixtures, fixture contract tests, live smoke env-gated).
- **M3 Task 0 gates:** ① money-law extraction (`runBilledTake`) — `render_shot` is FORBIDDEN from a 4th hand copy (M2 branch review, binding); ② the manual Gemini live smoke (user's key) confirms the image fixture contract before any render_shot work ships — if the live shape differs, fixtures get re-recorded deliberately first.
- **H3 lane duration law:** H3 accepts 4–15s; `render_shot` refuses a shot whose `duration_s` is outside 4–15 with fix text ('H3 lane renders 4–15s — split the beat or adjust the shot'). The store keeps 1–30 (multi-lane reality).
- **Composer laws (binding, byte-pinned by tests):** descriptors verbatim never trimmed; `non_diegetic_music:` always `N/A` (music is post); dialogue only from `audio_block.dialogue` in `<d>[English]...</d>`; prompt ≤8000 chars — over cap → VALIDATION naming the law ('shorten the action text, never the descriptors').
- Prices: estimate = `0.153 USD/s × duration` (`H3_ESTIMATE_USD_PER_SECOND` const — bring-up verification vs Vultr pricing page); actual = `usage.cost` from the completed job; `recordSpend` uses the actual.
- Job retention: Vultr keeps content 7 days (`expires_at`) — `job_download` warns under 48h remaining.

---

### Task 0: Money-law extraction — `runBilledTake` (review-mandated opener)

**Files:**
- Create: `src/tools/billed.ts`
- Modify: `src/tools/image.ts` (three call sites become thin)
- Test: existing 113 must pass unchanged; add `test/tools/billed.test.ts` (order assertions)

**Interfaces:**
- Produces: `runBilledTake(opts: { studioRoot, filmId, tool, lane: ImageLane, request: ImageLaneRequest, writeArtifact: (data: Buffer, mimeType: string) => Promise<string> }): Promise<{ artifactPath: string; costUsd: number; interactionId: string }>` — the invariant sequence: `lane.price → ensureBudget → submit → result → recordSpend(actual costUsd) → writeArtifact cb → appendLine ledger (8-key shape, tool from opts) → return`. This ALSO hardens the M2 deferred minor: recordSpend now precedes local artifact I/O (provider-charged money is always accrued). Callers keep only: validation, ref resolution, prompt composition, artifact-path decision, snake_case output.
- [ ] **Step 1:** Write `test/tools/billed.test.ts` — order test: with a scripted lane, assert call order is price→budget→submit→result→spend→artifact→ledger (spy sequence), and that a `writeArtifact` failure still leaves spend accrued + ledger written with cost (money truth) while the tool surfaces the write error.
- [ ] **Step 2:** RED → **Step 3:** implement `runBilledTake`; refactor the three call sites onto it (behavior-preserving) → **Step 4:** GREEN — full suite 113/113 unchanged → **Step 5:** Commit `refactor(m3): runBilledTake money-law extraction (review-mandated)`

---

### Task 1: VideoLane — VultrLane against fixtures

**Files:**
- Create: `src/lanes/video.ts` (VideoLane interface + types), `src/lanes/vultr.ts`
- Test: `test/lanes/vultr.test.ts`; fixtures `test/fixtures/vultr/{submit-202.json,job-in-progress.json,job-completed.json,job-failed.json,models-list.json,video.mp4.txt}` (mp4 fixture = fake bytes `VULTRFAKE`, no credentials)

**Interfaces:**
- Produces:
```ts
// src/lanes/video.ts
export type VideoQuality = 'turbo' | 'standard' | 'max' | 'ultra';
export interface VideoLaneRequest {
  prompt: string;                       // ≤8000 chars, enforced by caller + lane
  durationS: number;                    // 4–15 for h3
  aspectRatio: string;                  // enum per API
  quality: VideoQuality;                // default 'standard'
  firstFrame?: { data: Buffer; mimeType: string };   // frame_images[0], mutually exclusive with references
  lastFrame?: { data: Buffer; mimeType: string };
}
export interface VideoJobRef { jobId: string; pollingUrl?: string }
export interface VideoJobStatus { status: 'pending'|'in_progress'|'completed'|'failed'|'cancelled'|'expired'; progress: number; errorVerbatim?: string; warnings?: string[] }
export interface VideoArtifact { data: Buffer; jobId: string; costUsd: number; billedSeconds?: number; realSeconds?: number; width?: number; height?: number; hasAudio?: boolean }
export interface VideoLane {
  readonly cameraVocabulary: 'named';
  verifyModel(): Promise<'minimax-h3'>;              // GET /v1/videos/models; absent → errLaneDown naming the check
  estimatePrice(req: VideoLaneRequest): number;      // H3_ESTIMATE_USD_PER_SECOND × durationS
  submit(req: VideoLaneRequest): Promise<VideoJobRef>;      // POST /v1/videos (202 → id, status pending)
  status(ref: VideoJobRef): Promise<VideoJobStatus>;        // GET /v1/videos/{id}
  result(ref: VideoJobRef): Promise<VideoArtifact>;         // GET content after status completed; costUsd from usage.cost
}
export const H3_REAL_LENGTHS: Record<number, number> = { 4: 4.46, 5: 5.17, 6: 6.58, 7: 7.29, 8: 8.0, 9: 9.42, 10: 10.12, 11: 11.54, 12: 12.25, 13: 13.67, 14: 14.38, 15: 15.08 };
export const H3_ESTIMATE_USD_PER_SECOND = 0.153; // bring-up verify vs pricing page
```
- VultrLane error map: 401/403 → errAuth; 400–499 → errValidation with provider text (8000-char prompt 400 names the composer law); 5xx/network → errLaneDown; `verifyModel` without minimax-h3 → errLaneDown('model minimax-h3 not in Vultr catalog', 'check GET /v1/videos/models'); failed job → errJobFailed(error_verbatim, 'inspect jobs.json; failed jobs bill $0').
- [ ] **Step 1: Failing tests** — submit body shape (model/prompt/duration/aspect_ratio/quality/generate_audio true/frame_images first_frame as data URL when provided; frames XOR references enforced by lane), 202→{id,status pending}, poll map (all 6 statuses), result downloads content only when completed (else errValidation naming status), usage.cost surfaced, verifyModel happy + absent-model paths, auth/400/5xx map, estimatePrice math.
- [ ] **Step 2: RED** → **Step 3: implement** → **Step 4: GREEN + full suite (≈113 + 12)** → **Step 5:** Commit `feat(m3): VultrLane VideoLane with model verification`

---

### Task 2: Shot schema v2 (`action`) + H3 prompt composer

**Files:**
- Modify: `src/store/shot.ts` (schema v2), `src/tools/h3prompt.ts` (new, PURE)
- Test: extend `test/store/shot.test.ts`, new `test/tools/h3prompt.test.ts`

**Interfaces:**
- Shot v2: `action: string` REQUIRED on create and update-merge (validate(): present-tense law is agent-side; store enforces non-empty, ≤3 sentences (split on `. ` — 4+ → VALIDATION 'one beat, up to three sentences'), no dialogue quotes (`"` in action → VALIDATION 'dialogue lives only in audio_block')). Existing shots without `action`: `render_shot` refuses (fix: 'shot_update the action'), store create/update enforce for NEW writes only — no migration of old files.
- `composeH3Prompt(parts: { action, camera: CameraBlock, geoBlock?: string, dialogue: { voiceRef, voiceDescriptor, line }[], sfx?: string, durationS: number, platePresents: boolean }): string` — PURE, binding layout (byte-pinned tests):
```
Live-action, cinematic realism, 24fps.
Picture 1 is fully referenced at 0.00s in Shot 1.
[Shot 1] <lens>: <action>
Camera: The camera <move>, with <small|large> amplitude at <slow|fast> speed — <reason>.
<per dialogue line i: (S<i+1>) — <voiceDescriptor verbatim> says: <d>[English]<line></d>>
Setting (spatial map, locked across every shot of this scene): <geoBlock verbatim>
Characters (identity locked to Picture 1): <per character ref: <Subject N> = <descriptor verbatim>>
overall_soundscape: room tone; <sfx verbatim> (never N/A — silence is a choice made in the cut, not here)
non_diegetic_music: N/A
```
  - move amplitude/speed: parse from camera.move text if it contains 'slow'/'fast'/'subtle'/'strong' else default 'small amplitude', 'normal speed' — deterministic rules, disclosed.
  - Length guard: result ≤8000 chars else errValidation naming the law.
- [ ] **Step 1: Failing tests** — schema v2 (action required on create; 4-sentence refusal; dialogue-quote refusal; update-merge enforcement), composer (byte-pinned happy path with 2 dialogue lines + sfx + geo; no-dialogue variant; 8000-char refusal; camera amplitude parsing table).
- [ ] **Step 2: RED** → **Step 3: implement** → **Step 4: GREEN + full suite** → **Step 5:** Commit `feat(m3): shot action field + H3 prompt composer (doctrine-native layout)`

---

### Task 3: `render_shot` — async, first-frame I2V, verbatim, gated

**Files:**
- Create: `src/tools/video.ts` (registerVideoTools)
- Modify: `src/server.ts`
- Test: `test/tools/video.test.ts` (fixture-injected VultrLane)

**Interfaces:**
- `render_shot({ shot_id, film_id?, quality? default 'standard' })` — REFUSAL LADDER (all pre-fetch): shot exists → `action` present → duration 4–15 (H3 law) → keyframe plate exists (`plate.png` in a referenced location/style asset dir — digest feature #1 as schema rule; missing → VALIDATION 'no keyframe plate — keyframe_build the location first (staging before spend)') → characters' plates/identity come THROUGH the plate (frames XOR references — the plate is the identity carrier; input_references reserved for M3.5 vfx) → quality enum → budget: `estimatePrice` → `ensureBudget` → VideoLane submit → jobs.json entry `{job_id, shot_id, lane:'vultr', parent_job_id?, status:'pending', submitted_ts, prompt_version}` → ledger line (tool 'render_shot', verdict 'pending', cost_usd = estimate, `estimated: true`) → snake_case `{ job_id, status, estimated_cost_usd, duration_s, real_length_s }`.
- Prompt: `composeH3Prompt` with verbatim injections (descriptors from asset dirs, voice.md for speaking refs, geo_block from the SEQUENCE lock — never the asset's advisory copy unless no lock exists) + firstFrame = plate bytes.
- [ ] **Step 1: Failing tests** — happy path (fixture): jobs.json entry written, ledger estimated line, output shape, firstFrame = plate bytes, body prompt contains descriptor verbatim + `<d>[English]` lines + `non_diegetic_music: N/A`; every refusal rung (no action / 3s duration / no plate / no budget / over budget — fetchNever); 8000-char overflow → VALIDATION naming the law.
- [ ] **Step 2: RED** → **Step 3: implement** → **Step 4: GREEN + full suite** → **Step 5:** Commit `feat(m3): render_shot — async H3 render, first-frame I2V, doctrine-gated`

---

### Task 4: `job_status` / `job_download` / `repair_shot` — lifecycle + lineage

**Files:**
- Modify: `src/tools/video.ts`
- Test: extend `test/tools/video.test.ts`

**Interfaces:**
- `job_status({ job_id, film_id? })` — polls lane.status, updates jobs.json, returns snake_case `{ job_id, status, progress, error_verbatim?, expires_in_hours? }`. Failed → ledger verdict stays 'pending' + error recorded (failed bills $0 — spec §12.1).
- `job_download({ job_id, film_id? })` — status must be completed (else VALIDATION naming status); lane.result → write `<filmDir>/renders/<job_id>/shot.mp4`; **recordSpend RECONCILE: actual `usage.cost` minus the estimate already accrued** (delta accrual — ledger line `tool:'job_download', verdict:'pending', cost_usd: delta`, plus a `reconciled: true` note on the original line is NOT possible in append-only — the delta line is the record); update jobs.json (status completed, artifact_path, actual cost, realSeconds, hasAudio); 7-day retention warning when `expires_at` < 48h.
- `repair_shot({ shot_id, parent_job_id, mode, params?, film_id? })` — v1 modes: `extend` (last frame of parent → first frame of child: download parent content, extract last frame is M3.5 — v1 accepts `first_frame_path` arg supplied by the agent from the parent's final frame screenshot) and `restyle` (re-render same shot with adjusted action via shot_update first — plain re-render with lineage). Edit-endpoint (`POST /v1/videos/edits`) schema is UNVERIFIED — do not invent; verify at bring-up (docs/reference page or live) before wiring; until then repair_shot supports only the two modes above, both via plain `POST /v1/videos` child jobs with `parent_job_id` lineage in jobs.json + ledger.
- [ ] **Step 1: Failing tests** — status transitions update jobs.json; download writes mp4 + reconcile delta accrual (estimate 0.918 vs usage.cost 1.02 → delta 0.102 accrued); download-before-completed → VALIDATION; repair extends lineage; expiry warning path.
- [ ] **Step 2: RED** → **Step 3: implement** → **Step 4: GREEN + full suite (≈135)** → **Step 5:** Commit `feat(m3): job lifecycle, reconcile accrual, repair lineage`

---

### Task 5: Vultr live smoke + README + M3 close

**Files:**
- Create: `test/live/vultr.live.test.ts` — `describe.skipIf(!(STUDIO_LIVE=1 && VULTR_INFERENCE_API_KEY))`: verifyModel → one real 4s render ('a single red apple on a white plate, studio light, static camera') → poll → download → assert mp4 magic bytes + usage.cost recorded + reconcile line. Header note: record the OBSERVED live shapes (job payload, usage.cost vs estimate) in the report — first real render costs ≈ $0.61–0.68.
- Modify: `README.md` — 16-tool table, M3 section (endpoints, H3 layout, duration law, reconcile accrual, 7-day retention), workspace `renders/<job_id>/`.
- [ ] **Step 1: live smoke file (skipped without env)** → **Step 2: README** → **Step 3: full suite + build** → **Step 4: Commit** `feat(m3): live smoke + README; M3 video lane complete` → **Step 5: tag** `m3-video-lane`

---

## Self-review notes (applied while writing)

- Spec coverage: §4 lane interface (VideoLane async realization), §7 video tools (Tasks 3–4), §8 mechanisms (verbatim injection via composer, async jobs, pricing transparency estimate→actual reconcile, model-ID pinning via /models), §9 errors (JobFailed/LaneDown/Auth/Budget/Validation), §10 fixtures + gated live smoke, §12.1 RESOLVED facts baked as constants. Digest deltas: keyframe-exists render gate (Task 3, feature #1), two-hander slice guidance → M5.
- Known unverified (honest): frame_images data-URL acceptance (multipart binary fallback documented), edits-endpoint schema (repair Shot v1 avoids it), Vultr $0.153/s per-quality-tier pricing (reconcile accrual makes estimate drift harmless — actual always wins).
- Type consistency: VideoLane/VideoJobRef/VideoJobStatus/VideoArtifact shared by Tasks 1/3/4; `runBilledTake` is IMAGE-lane-scoped in Task 0 (VideoLane's money path gets the same shape in Task 3 as `runBilledVideoTake` — same file, same order test pattern; no 4th copy).
- Duration-law conflict resolved by lane-level refusal (store stays 1–30 for multi-lane reality).
