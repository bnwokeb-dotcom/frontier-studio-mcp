# Frontier Studio MCP — M2 Image Lane Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship M2 — the Nano Banana Pro image lane: a GeminiLane implementing the lane interface against the Gemini Interactions API, budget enforcement with pre-submit hard stops, and three billed tools (`image_generate`, `character_sheet_build`, `keyframe_build`) plus free `asset_image` — so a real character sheet can be generated, priced, logged, and attached to a registered asset.

**Architecture:** Thin MCP + skill brain, unchanged. New `src/lanes/` layer behind an injected-fetch lane class (contract tests use recorded fixtures — no live billing in CI); budget lives in `src/budget.ts` enforced at tool boundary BEFORE any API call; every billed call appends a `ledger.jsonl` line and accrues `spentUsd` on the film. Prompt *composition* (Hell Grind sheet law, keyframe light law) lives in `src/tools/prompts.ts` as pure functions — doctrine as tested code, zero API surface.

**Tech Stack:** Existing stack (Node ≥20 ESM, TypeScript strict, vitest, @modelcontextprotocol/sdk, zod). No new runtime deps — `fetch` is global in Node ≥20.

**Spec:** `docs/superpowers/specs/2026-11-14-frontier-studio-mcp-design.md` (§4 lane interface, §5 workspace, §7 image tools, §8 mechanisms, §9 errors, §10 testing, §12 bring-up items). M1 execution record: `docs/superpowers/plans/2026-11-14-m1-registry-core-execution-record.md`.

## Global Constraints (inherited + M2 additions)

- All M1 constraints hold: Node ≥20 ESM; runtime deps only @modelcontextprotocol/sdk + zod; StudioError 6-code union with NEXT actions; atomic JSON writes; IDs `/^[a-z0-9][a-z0-9_-]{1,63}$/`; snake_case wire both directions via `toWire`/`fromWirePatch`; no credential literals anywhere (source, tests, fixtures — fixtures use fake 8-byte base64).
- **Credentials:** `GEMINI_API_KEY` from env only. Tools construct the lane lazily per call; missing key → `AUTH` with NEXT 'set GEMINI_API_KEY in the environment, then retry' — registry tools keep working without any key.
- **M2 budget ruling (brings M4's hard-stop forward for billed calls):** a film with no `budgetUsd` refuses ALL billed calls; `spentUsd + price > budgetUsd` refuses BEFORE the API call. Spend accrues only after a successful artifact.
- **Bring-up item (spec §12.1 analog):** the Interactions API GET-endpoint shape is unverified; the lane returns the artifact from the submit response body (cached by interactionId) and `result()` re-fetches only via the documented POST response — no invented endpoints. The live smoke verifies real payload shapes (spec §12.3: Gemini Developer API, `POST https://generativelanguage.googleapis.com/v1beta/interactions`, `x-goog-api-key`, `Api-Revision: 2026-05-20`).
- Tests use `mkdtemp` roots; contract tests inject a fake `fetch`; the live smoke is `describe.skipIf` on `STUDIO_LIVE=1` + `GEMINI_API_KEY`.
- Commit after every task (conventional commits).

---

### Task 1: Lane types + GeminiLane against fixtures

**Files:**
- Create: `src/lanes/types.ts`, `src/lanes/gemini.ts`
- Test: `test/lanes/gemini.test.ts`
- Create: `test/fixtures/gemini/success-output-image.json`, `test/fixtures/gemini/success-steps.json`, `test/fixtures/gemini/error-400.json`

**Interfaces:**
- Consumes: `StudioError` helpers from `src/errors.js`; `StudioConfig` from `src/config.js`.
- Produces (binding for Tasks 2–5):

```ts
// src/lanes/types.ts
export type ImageSize = '1K' | '2K' | '4K';
export interface ImageLaneRequest {
  prompt: string;
  refImages: { data: Buffer; mimeType: string }[];   // max 14, enforced by caller
  aspectRatio: string;                                // e.g. '16:9'
  imageSize: ImageSize;
  previousInteractionId?: string;
}
export interface LaneInteraction { interactionId: string }
export interface LaneStatus { done: boolean; interactionId: string }
export interface ImageArtifact { data: Buffer; mimeType: string; interactionId: string; priceUsd: number }
export interface ImageLane {
  readonly cameraVocabulary: 'prose';
  price(req: ImageLaneRequest): number;
  submit(req: ImageLaneRequest): Promise<LaneInteraction>;
  status(ref: LaneInteraction): Promise<LaneStatus>;  // images are synchronous: { done: true }
  result(ref: LaneInteraction): Promise<ImageArtifact>;
}
export type FetchLike = (url: string, init?: { method?: string; headers?: Record<string, string>; body?: string }) => Promise<{ ok: boolean; status: number; text(): Promise<string> }>;
```

```ts
// src/lanes/gemini.ts — shape
export const GEMINI_PRICES: Record<ImageSize, number> = { '1K': 0.134, '2K': 0.134, '4K': 0.24 };
export class GeminiLane implements ImageLane {
  static readonly ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/interactions';
  static readonly MODEL = 'gemini-3-pro-image';
  static readonly API_REVISION = '2026-05-20';
  readonly cameraVocabulary = 'prose' as const;
  constructor(apiKey: string, private fetchFn: FetchLike = fetch) {}
  static fromConfig(cfg: StudioConfig): GeminiLane; // no key → errAuth('GEMINI_API_KEY is not set', 'set GEMINI_API_KEY in the environment, then retry')
  price(req) { return GEMINI_PRICES[req.imageSize]; }
  async submit(req): body = { model, input: [ { type:'text', text }, ...refs.map(r => ({ type:'image', mime_type: r.mimeType, data: r.data.toString('base64') })) ], response_format: { type:'image', mime_type:'image/png', aspect_ratio: req.aspectRatio, image_size: req.imageSize }, ...(req.previousInteractionId ? { previous_interaction_id: req.previousInteractionId } : {}) };
    // headers: { 'x-goog-api-key': key, 'content-type': 'application/json', 'Api-Revision': API_REVISION }
    // !ok → 401|403 errAuth('Gemini rejected the API key', ...); 400..499 errValidation(`Gemini rejected the request: ${provider error text}`, 'check aspect_ratio / image_size / reference count (max 14)'); 5xx or thrown fetch → errLaneDown(`Gemini unreachable (HTTP ${status})`, 'retry; if it persists check status.google.com');
    // parse id: json.interaction?.id ?? json.id; missing → errLaneDown(...'unexpected response shape')
    // cache full body by id for result()
  async status(ref) { return { done: true, interactionId: ref.interactionId }; }
  async result(ref) { body = cache.get(ref.interactionId) ?? errNotFound('interaction not in this session', 're-generate; images are cached per submit'); data = body.output_image?.data ?? first steps[] entry with type==='model_output' containing an image block; none → errLaneDown('no image in the Gemini response', ...); return { data: Buffer.from(data,'base64'), mimeType: block.mime_type ?? 'image/png', interactionId, priceUsd: this.lastPrice(ref.interactionId) } }
}
```

- [ ] **Step 1: Write the failing tests** — `test/lanes/gemini.test.ts`: price table (1K 0.134, 4K 0.24); `fromConfig` without key throws AUTH with NEXT matching /GEMINI_API_KEY/; submit happy path — assert request URL = ENDPOINT, headers carry x-goog-api-key + Api-Revision 2026-05-20, body has model gemini-3-pro-image, response_format image_size '1K', input[0].type 'text', refs mapped to base64 image blocks, previous_interaction_id included only when provided; result parses `output_image.data` (fixture 1); result parses steps[] model_output fallback (fixture 2); 401 → AUTH; 400 → VALIDATION with provider text; 503 → LANE_DOWN; result with no image → LANE_DOWN. Fixtures: fake base64 `aGVsbG8=` (no real images, no credentials).
- [ ] **Step 2: Run** `npx vitest run test/lanes/gemini.test.ts` — FAIL (modules missing).
- [ ] **Step 3: Implement** `src/lanes/types.ts` + `src/lanes/gemini.ts` per the shapes above (private `cache: Map<string, any>` + `priceCache: Map<string, number>`).
- [ ] **Step 4: Run** — PASS (≈11 tests). Full suite once (43 + new ≈ 54).
- [ ] **Step 5: Commit** `feat(m2): GeminiLane against Interactions API fixtures`

---

### Task 2: Budget slice — hard stop before the API call

**Files:**
- Create: `src/budget.ts`
- Modify: `src/store/film.ts` (add `spentUsd?: number` to `FilmMeta`)
- Test: `test/budget.test.ts`

**Interfaces:**
- Produces: `ensureBudget(paths, filmId, priceUsd): Promise<FilmMeta>` — film missing → NOT_FOUND; `budgetUsd === undefined` → errBudget(`no budget set on film "<id>"`, 'recreate the film with budget_usd, or add one via film metadata'); `spentUsd + price > budgetUsd` → errBudget(`budget exceeded: ${spent} spent + ${price} quote > ${budget} cap`, 'raise the film budget or reject cheaper takes'); else returns meta. `recordSpend(paths, filmId, costUsd): Promise<FilmMeta>` — patchFilmMeta `spentUsd += cost` (atomic; only called after a successful artifact). errBudget already exists in errors.ts.
- [ ] **Step 1: Failing tests** — no-budget refusal; over-budget refusal with exact numbers in message; under-budget passes and recordSpend accrues (0 → 0.134 → 0.268).
- [ ] **Step 2: RED** → **Step 3: implement** → **Step 4: GREEN + full suite** → **Step 5: Commit** `feat(m2): budget hard stop + spend accrual`

---

### Task 3: `image_generate` tool — billed, ledgered, budgeted

**Files:**
- Create: `src/tools/image.ts`
- Modify: `src/server.ts` (import + register), `src/tools/registry.ts` (export a shared `guard`/`out` if not already exported — reuse, do not duplicate)
- Test: `test/tools/image.test.ts` (+ fixture-injected server test)

**Interfaces:**
- Produces: `registerImageTools(server, studioRoot)` registering:
  - `image_generate({ prompt, film_id?, ref_image_paths? ≤14, aspect_ratio? default '16:9', image_size? enum '1K'|'2K'|'4K' default '1K', previous_interaction_id? })` — film_id defaults to active film (M1 pattern); ref paths resolved against STUDIO_ROOT (absolute or film-relative), missing → NOT_FOUND; >14 → VALIDATION; lane built via `GeminiLane.fromConfig`; `ensureBudget` BEFORE `submit`; artifact written to `<filmDir>/generated/<YYYYMMDD-HHmmss>-<slug(prompt)>.png`; `recordSpend` AFTER success; ledger line appended (`{ts, tool:'image_generate', lane:'gemini', film_id, cost_usd, verdict:'pending', interaction_id, artifact_path}`); output via `toWire`-style snake_case object `{ artifact_path, interaction_id, cost_usd, image_size, aspect_ratio }`.
  - Error order: AUTH (no key) only when a billed call actually executes — registry tools never construct the lane.
- [ ] **Step 1: Failing tests** — happy path with injected fake fetch (fixture): file exists on disk, output snake_case, ledger line count 1, spentUsd 0.134; no-key → AUTH; no-budget → BUDGET; over-budget → BUDGET before any fetch (fake fetch throws if called); 15 refs → VALIDATION; missing ref file → NOT_FOUND.
- [ ] **Step 2: RED** → **Step 3: implement** → **Step 4: GREEN + full suite** → **Step 5: Commit** `feat(m2): image_generate tool (budgeted, ledgered)`

---

### Task 4: `character_sheet_build` + `asset_image` — the Hell Grind sheet law

**Files:**
- Create: `src/tools/prompts.ts`
- Modify: `src/tools/image.ts` (register two more tools), `src/store/asset.ts` (add `attachImage(paths, filmId, kindDir, assetId, srcPath, name): Promise<string>` — copies file into the asset dir under `name` (sheet.png / plate.png), refuses unknown asset)
- Test: `test/tools/prompts.test.ts`, extend `test/tools/image.test.ts`

**Interfaces:**
- Produces: `characterSheetPrompt(descriptor: string): string` — PURE function; the exact Hell Grind law (brief text, binding):

```
Character reference sheet for AI film production. Three panels on ONE neutral light-grey background (#e8e8e8), flat even studio light, no dramatic shadows, real skin texture with visible pores, no retouch, no makeup-glamour, photographic realism.
Panel 1 (left): tight close-up of the face, 3/4 view, neutral expression, eyes open, one readable face.
Panel 2 (center): full body, front view, HEADLESS — the neck ends cleanly at the collar line; no face on this figure.
Panel 3 (right): full body, back view.
Subject, identical in all three panels: <descriptor verbatim>
Clothing identical across panels. No props except what the descriptor states. No background scenery — the grey studio backdrop only. No text, no labels, no watermarks.
```

  `character_sheet_build({ asset_id, film_id? })` — loads descriptor.md verbatim (NOT_FOUND if unregistered), composes prompt, submits (1K default, 16:9), budget+ledger as Task 3, attaches as `sheet.png` via attachImage, writes `interaction.md` containing the interaction_id (multi-turn seed), returns snake_case `{ sheet_path, interaction_id, cost_usd }`.
  `asset_image({ asset_id, kind?, image_path, film_id? })` — free tool: copies a user-provided file into the asset dir as `sheet.png` (characters) / `plate.png` (locations, default) or explicit `name` arg; unknown asset → NOT_FOUND.
- [ ] **Step 1: Failing tests** — prompts.test: sheet prompt contains the descriptor verbatim, contains 'HEADLESS', contains '#e8e8e8', three panel lines ordered 1/2/3, no placeholder tokens; image.test: character_sheet_build happy path (fixture fetch) → sheet.png exists in asset dir, interaction.md written, spentUsd accrued; missing asset → NOT_FOUND; asset_image copies file bytes identically.
- [ ] **Step 2: RED** → **Step 3: implement** → **Step 4: GREEN + full suite** → **Step 5: Commit** `feat(m2): character_sheet_build (headless 3-panel law) + asset_image`

---

### Task 5: `keyframe_build` — the light law

**Files:**
- Modify: `src/tools/prompts.ts` (add `keyframePrompt`), `src/tools/image.ts` (register)
- Test: extend `test/tools/prompts.test.ts`, `test/tools/image.test.ts`

**Interfaces:**
- Produces: `keyframePrompt({ descriptor, geoBlock?, lightStatement }): string` — PURE; refuses empty lightStatement (errValidation('light_statement is required', 'state the light source: what it is, where it comes from, what color')). Composition (binding text):

```
Cinematic keyframe for AI film production. One frame, 16:9, photographic realism, film grain, motivated lighting only.
Location: <descriptor verbatim>
Light: <light_statement verbatim>  — one source, one direction of shadows; never two suns.
Composition: 3/4 view of the space (never flat frontal), one visual anchor stated by name in the scene, depth readable from foreground to background.
<if geoBlock: spatial map the staging must respect, verbatim: <geoBlock>>
No text, no watermarks, no people unless the descriptor names them.
```

  `keyframe_build({ asset_id, light_statement, film_id? })` — location or style assets only (character → VALIDATION 'keyframes are for locations/styles — characters get character_sheet_build'); attaches as `plate.png`, writes `interaction.md`, budget+ledger identical to Task 3/4.
- [ ] **Step 1: Failing tests** — empty light_statement → VALIDATION; character asset → VALIDATION; happy path → plate.png + interaction.md + ledger; prompt contains descriptor verbatim + light statement verbatim + 'never two suns' + geoBlock verbatim when present.
- [ ] **Step 2: RED** → **Step 3: implement** → **Step 4: GREEN + full suite** → **Step 5: Commit** `feat(m2): keyframe_build with light law`

---

### Task 6: Multi-turn editing + README + M2 verification

**Files:**
- Modify: `README.md` (tools table +3, env GEMINI_API_KEY activates M2 section, budget law note, workspace `generated/` dir), `scripts/e2e.mjs` untouched (registry-only smoke stays valid)
- Create: `test/live/gemini.live.test.ts`
- Test: extend `test/tools/image.test.ts`

**Interfaces:**
- `image_generate` with `previous_interaction_id` → GeminiLane body carries `previous_interaction_id` (fixture test asserts body field); response artifact cached — a second `image_generate` reusing the id works in contract tests.
- Live smoke (`describe.skipIf(!(process.env.STUDIO_LIVE === '1' && process.env.GEMINI_API_KEY))`): one real generate (tiny prompt 'a single red apple on a white plate, studio light', 1K, 16:9) → assert PNG magic bytes `\x89PNG` on disk, cost 0.134 logged, ledger line written; SKIPPED in CI (no env). Spec §12.3 verification note: if the live run shows a different response shape (e.g. steps-only), extend the result() parser, keep fixtures authoritative.
- [ ] **Step 1: Failing multi-turn test** → **Step 2: RED** → **Step 3: implement (body field already in Task 1 — this task wires the tool arg through; assert end-to-end)** → **Step 4: GREEN + full suite (expect ≈ 66)** → **Step 5: README** → **Step 6: Commit** `feat(m2): multi-turn editing + README; live smoke behind STUDIO_LIVE` → **Step 7: tag** `git tag m2-image-lane`

---

## Self-review notes (applied while writing)

- Spec coverage: §4 lane interface (Task 1, with the documented ruling that images are synchronous — `status()` returns done; no invented GET endpoint, §12 bring-up respected), §7 image tools (Tasks 3–5), §8 pricing transparency (cost in every output), §9 typed errors (AUTH/VALIDATION/LANE_DOWN/BUDGET), §10 fixture contract tests + gated live smoke (Task 1/6), §12.3 Gemini Developer API constants (Task 1). Budget caps: locked user decision enforced from the first billed call (Task 2) — the M4 remainder is `budget_set`/`budget_show`/`log_take`/`ledger_read` tools, not the enforcement itself.
- Type consistency: ImageLane/LaneInteraction/ImageArtifact/FetchLike shared by Tasks 1/3/4/5/6 exactly; `ensureBudget`/`recordSpend` signatures shared by Tasks 3–5; `attachImage` shared by Tasks 4–5.
- M1 invariants honored: snake_case wire via new toWire helpers in tools/image.ts (same pattern as registry.ts), StudioError-only error surface, no credentials in fixtures (fake base64 `aGVsbG8=`).
