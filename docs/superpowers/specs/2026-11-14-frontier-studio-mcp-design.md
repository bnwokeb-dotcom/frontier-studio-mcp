# Frontier Studio MCP — Design Spec

**Date:** 2026-11-14 · **Status:** draft for review · **Repo:** `frontier-studio-mcp` (private)

## 1. Overview

Frontier Studio MCP is a thin, schema-disciplined MCP server that gives an AI agent real
feature-film production capabilities: a validated shot registry, two paid generation lanes
(Google **Nano Banana Pro / Gemini 3 Pro Image** for images, **MiniMax-H3** via Vultr
Serverless Inference for video), hard budget enforcement, and an append-only generation
ledger.

It is the execution layer the Dominion project never had. The craft brain lives in skills
(`higgsfield` — Hell Grind production doctrine; `frontier-film` — feature assembly;
`STUDIO_LAW_v1.md` — taste law). This server owns **state, money, and API lanes** — nothing else.

**Design source:** TopView MCP proved the pattern (chat-driven pipeline + editable registry);
we reverse-engineer that *system design* at feature-film grade while keeping the brain ours.

## 2. Goals / Non-goals

**Goals (v1):**
1. Produce one 2–3 minute vertical slice of a real film **entirely through MCP tools** — the v1 acceptance test.
2. Make the Hell Grind discipline mechanical: invalid shots are refused by schema; descriptors are injected verbatim by the server.
3. Make money visible and bounded: every billed call is priced before submit, logged after, and hard-stopped at budget.

**Non-goals (v1):**
- No server-side craft intelligence (no prompt generation, no take judgment — the agent does that with skills).
- No remote hosting (stdio local first; StreamableHTTP is a v2 mode).
- No Higgsfield/Seedance lane (v2 — the lane interface is designed for it).
- No manifest-driven auto-render engine (judgment calls stay human/agent).

## 3. Locked decisions

| Decision | Choice |
|---|---|
| Architecture | Thin MCP + skill brain (schema enforces doctrine) |
| Language / runtime | TypeScript, Node ≥20, `@modelcontextprotocol/sdk`, stdio |
| Cost gates | Budget caps only — no per-generation confirmation |
| Workspace | One STUDIO_ROOT per machine, films under it |
| v1 acceptance | Vertical slice end-to-end through tools |
| Hosting | GitHub `frontier-studio-mcp`, private; flip public after acceptance |

## 4. Architecture

```
AGENT (brain: higgsfield skill + STUDIO_LAW + frontier-film)
   │ authors descriptors, prompts, takes judgment
   ▼ stdio
FRONTIER-STUDIO-MCP (TypeScript, ~15 tools)
   ├─ REGISTRY  films / assets / shots / jobs — atomic JSON under STUDIO_ROOT
   ├─ BUDGET    per-film and per-sequence caps, hard stop at tool boundary
   ├─ LEDGER    append-only ledger.jsonl: every take, cost, verdict
   ├─ IMAGE LANE → Gemini Interactions API  POST /v1beta/interactions
   │     model "gemini-3-pro-image"; multi-turn via previous_interaction_id;
   │     ≤14 reference images; response_format image {aspect_ratio, image_size 1K|2K|4K}
   └─ VIDEO LANE → Vultr Serverless Inference (MiniMax-H3), async jobs
        submit → job_id → poll/webhook → download by video_<24hex> id
```

**Lane interface** (both lanes implement it; Higgsfield/Seedance becomes a v2 lane without
touching tools):

```ts
interface GenerationLane {
  price(request: LaneRequest): Money;          // pre-submit quote
  submit(request: LaneRequest): Promise<JobRef>; // returns job/api reference immediately
  status(ref: JobRef): Promise<JobStatus>;
  result(ref: JobRef): Promise<Artifact>;      // bytes + metadata
}
```

## 5. Workspace layout (STUDIO_ROOT)

```
STUDIO_ROOT/
  studio.json                    lane config, budget defaults
  films/<film_id>/
    film.json                    title, logline, target_runtime_min, budget, universe links
    assets/
      characters/<char_id>/      sheet.png · descriptor.md · voice.md · acting.md
      locations/<loc_id>/        plate.png · geo_block.md
      props/<prop_id>/           image + descriptor.md
      styles/<style_id>/         reference images + style.md
    shots/<seq>-<nn>.json        shot records (§6)
    renders/<job_id>/            downloaded artifacts per take
    jobs.json                    live + finished async video jobs
    ledger.jsonl                 append-only generation log
```

## 6. Data model

**Shot record** (`shots/<seq>-<nn>.json`) — the discipline enforcer. `shot_create` **refuses**
creation unless every required field validates:

```yaml
id: seq01-shot03
status: draft | rendering | kept | rejected
geo_block: <string>            # REQUIRED — pasted verbatim into every shot of the scene
sequence: seq01                # shots in a sequence share the locked geo_block
refs:                          # REQUIRED, ≥1; every ref id must exist in the registry
  - asset_id: char_mara        # resolved to descriptor.md at render time (verbatim injection)
    role: character            # character | location | prop | style | size_ref
  - asset_id: loc_frozen_forest
    role: location
camera:                        # REQUIRED
  lens: "35mm"
  move: "slow push-in"
  reason: "closing on the choice"   # a move without a reason fails validation
audio_block:                   # REQUIRED — dialogue lives ONLY here, never in action text
  dialogue: []
  sfx: "wind, distant ice crack"
  music: none                  # v1 always none in generation (music is post)
duration_s: 10                 # REQUIRED, billed at lane price × seconds
takes:                         # filled by jobs: {job_id, verdict, cost, notes}
```

**Asset record:** `descriptor.md` (appearance, verbatim-injected), `voice.md` (register,
tempo, accent, manner — characters only), `acting.md` (behavior paragraph — characters
only), plus the sheet/plate image. `asset_register` validates that character assets carry
voice + acting files before any shot may reference them.

**Ledger entry** (ledger.jsonl, one line): `{ts, film_id, tool, lane, job_id?, asset_id?,
cost_usd, verdict: kept|rejected|pending, why?, prompt_version?}`

**Jobs** (jobs.json): `{job_id, shot_id, lane, parent_job_id?, status, submitted_ts,
completed_ts?, error_verbatim?, artifact_path?, cost_usd}`

## 7. Tool surface

**Registry (free):**
- `film_create({film_id, title, logline, budget_usd, target_runtime_min})`
- `film_set_active({film_id})` · `film_show()` — active film resolved from studio.json
- `asset_register({film_id, kind: character|location|prop|style, asset_id, descriptor, voice?, acting?, geo_block?})` — writes the .md files
- `asset_image({asset_id, image_path | image_generate_result})` — attaches/updates the image
- `shot_create({film_id, sequence, id, geo_block, refs[], camera, audio_block, duration_s})` — full validation
- `shot_update({shot_id, fields})` — same validation on changed fields
- `sequence_lock_geo({film_id, sequence, geo_block})` — freezes it; later shots in the sequence must match verbatim

**Image lane (billed):**
- `image_generate({prompt, ref_image_paths[] ≤14, aspect_ratio, image_size: 1K|2K|4K, previous_interaction_id?})` → image file + interaction_id, priced and logged
- `character_sheet_build({asset_id})` — composes the 3-panel headless-sheet prompt (close-up face / headless front full-body / back; neutral grey bg; flat light; no retouch) and calls image_generate
- `keyframe_build({asset_id | shot_id, light_statement})` — location plate or shot keyframe; light source must be stated (refused otherwise)

**Video lane (billed, async):**
- `render_shot({shot_id})` — server composes the render prompt: verbatim descriptors + ref
  images + geo_block + camera + audio_block; submits to Vultr; returns `{job_id, projected_cost_usd}`
- `job_status({job_id})` · `job_download({job_id})` — download prices actual seconds, decrements budget, appends ledger
- `repair_shot({shot_id, parent_job_id, mode: timestamp|region|extend, params})` — child job with lineage

**Money:** `budget_set({film_id, sequence?, amount_usd})` — film-level cap, or an optional
tighter cap scoped to one sequence · `budget_show({film_id, sequence?})` — spent, remaining,
takes-per-kept (sequence scope rolls up to film). Hard stop: billed call with insufficient
remaining budget at its scope → `BudgetExceeded` **before any API call is made**.

**Ledger:** `log_take({job_id, verdict: kept|rejected, why?})` · `ledger_read({film_id, filter?})`

## 8. Key mechanisms

1. **Verbatim injection.** Shots store asset IDs. At `render_shot` time the server reads each
   referenced asset's `descriptor.md` and injects it word-for-word into the prompt. Golden
   test: rendered prompt contains the descriptor byte-for-byte. The agent cannot forget it
   and cannot paraphrase it.
2. **Schema-enforced doctrine.** Missing geo_block, unknown ref ID, camera move without
   reason, dialogue outside audio_block, character asset without voice/acting files — all
   `ValidationRefused` with the fix stated. The Hell Grind rules become validation errors.
3. **Async jobs.** H3 renders take minutes; `render_shot` returns `job_id` immediately and
   never blocks stdio. State lives in jobs.json; `job_status` polls Vultr.
4. **Pricing transparency.** `render_shot` returns projected cost in the same response as
   `job_id`; `image_generate` returns cost with the artifact. No silent spend.
5. **Model-ID pinning.** The Vultr lane pins the exact model ID and verifies it per call;
   a wrong/renamed ID is refused (`LaneDown` with the check to run), never silently billed
   against a fallback model (field-reported Vultr trap).

## 9. Error handling

Typed errors, each stating the **next permitted action**:
`AuthError` (check env key) · `BudgetExceeded` (raise via budget_set) ·
`ValidationRefused` (named field + fix) · `LaneDown` (endpoint/status to verify) ·
`JobFailed` (provider error verbatim, artifact path null). No dead ends, no partial burns.

## 10. Testing

- **Unit (vitest):** shot validation matrix (each refusal), budget math + hard stop,
  verbatim-injection golden test, ledger append/atomicity, job state machine.
- **Contract:** recorded HTTP fixtures for Gemini Interactions + Vultr submit/poll/download;
  lanes tested against fixtures — no live billing in CI.
- **Live smoke (manual, `STUDIO_LIVE=1`):** one real image; one real video render polled to
  completion. Run at lane bring-up (M2/M3) only.

## 11. Milestones

- **M1 — Registry core.** Scaffold, config, atomic JSON store, film/asset/shot CRUD with the
  full validation matrix, geo locking. No API keys needed. *Verify: vitest green; CRUD demo
  against a temp STUDIO_ROOT.*
- **M2 — Image lane.** Gemini Interactions client (fixture-tested), image_generate,
  character_sheet_build, keyframe_build. *Verify: one real Nano Banana Pro sheet generated,
  registered, cost logged.*
- **M3 — Video lane.** Vultr client (submit/poll/download, fixture-tested), verbatim prompt
  composition, render_shot/job_status/job_download, repair lineage. *Verify: one real H3
  render downloaded, priced, logged.*
- **M4 — Money + ledger complete.** Budget caps with hard stop, budget_show stats,
  log_take/ledger_read. *Verify: over-budget call refused pre-submit; takes-per-kept correct
  on a scripted ledger.*
- **M5 — Vertical slice.** One 2–3 min sequence of film #1 end-to-end through tools only.
  *Verify: every artifact traceable to a ledger entry; spend within budget_set.* Then:
  GitHub publish (private), CI (lint+tests on push), `npx`-installable.

## 12. Open items to verify at bring-up (not design gaps)

1. **Vultr exact endpoint paths + webhook payload schema** — public docs were not retrievable
   during research (404s); M3 starts with a docs/API verification pass, endpoints live as
   constants in `src/lanes/vultr.ts`.
2. **Vultr billing of failed renders** — assumed $0 for failed jobs; verify on first failed
   job and encode the answer in the ledger notes.
3. **Gemini API variant** — spec targets the Gemini Developer API (`x-goog-api-key`,
   `POST https://generativelanguage.googleapis.com/v1beta/interactions`, `Api-Revision:
   2026-05-20`); Vertex AI variant is a config alternative if the project ends up on GCP
   billing.
