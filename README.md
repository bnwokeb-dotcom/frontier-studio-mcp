# frontier-studio-mcp

A thin, schema-disciplined MCP server for AI film production. The server holds **no creative logic**: it is a registry and law-enforcement layer over a plain-file studio workspace. The "brain" — taste, cinematography, prompt craft — lives in skills; the server's job is to make doctrine violations structurally impossible, not to generate anything. Generation lanes land in stages on top of this registry core: the M2 image lane (Gemini "Nano Banana Pro") and the M3 video lane (Vultr MiniMax-H3) are live.

Every tool accepts `snake_case` arguments at the MCP boundary. Store discipline (character completeness, geo locks, shot schema) is enforced by the store layer and surfaces as structured refusals with a `NEXT:` action — the model is told what to do, not just that it failed.

## Install

```bash
npm install
```

Requires Node >= 20.

**Environment** — copy `.env.example` to `.env` and set:

| Variable        | Required | Purpose                                                        |
| --------------- | -------- | -------------------------------------------------------------- |
| `STUDIO_ROOT`   | yes      | Absolute path to the studio workspace folder (created on demand) |
| `GEMINI_API_KEY` | no      | Gemini image lane — required only for the billed image tools    |
| `VULTR_INFERENCE_API_KEY` | no | Vultr video lane (M3) — required only for the billed video tools |
| `STUDIO_LIVE`   | no       | `1` = real generation lanes enabled; `0` = registry only         |

No credentials are required for the M1 registry core or the free M2/M3 tools; only `STUDIO_ROOT` matters there. The billed image and video tools refuse with a structured `AUTH` error until their lane's key (`GEMINI_API_KEY` / `VULTR_INFERENCE_API_KEY`) is set.

## Tools (16)

### Registry core (M1 — 8)

| Tool                | Description                                                                 |
| ------------------- | --------------------------------------------------------------------------- |
| `film_create`       | Register a film (`film_id`, `title`, `logline`, optional budget/runtime); it becomes the active film. |
| `film_set_active`   | Point subsequent film-scoped calls at the given film.                        |
| `film_show`         | Show the active film: meta, sequence geo locks, universe links. |
| `asset_register`    | Register a `character`/`location`/`prop`/`style` asset from a `descriptor`; characters must also carry `voice` + `acting` blocks. |
| `shot_create`       | Create a shot: verbatim `geo_block`, `refs`, full `camera` (lens/move/reason), `audio_block`, `duration_s` 1–30. |
| `shot_update`       | Patch a shot; `id` is immutable, geo locks re-verify verbatim, `audio_block` merges per-key. |
| `shot_show`         | Read the full shot record (status, geo, refs, camera, audio, takes).         |
| `sequence_lock_geo` | Lock a sequence's geo block verbatim; idempotent — different text is refused. |

### Image lane (M2 — 4)

| Tool                    | Description                                                       |
| ----------------------- | ----------------------------------------------------------------- |
| `image_generate`        | Billed generation via the Gemini Interactions API: `prompt` + optional refs (≤ 14), `aspect_ratio`, `image_size`, `previous_interaction_id`; writes a PNG under `generated/`, returns its path + `interaction_id` + `cost_usd`. |
| `character_sheet_build` | Billed: reads a character's `descriptor.md`, composes the headless 3-panel sheet law, attaches the result as the asset's canonical `sheet.png`, seeds `interaction.md` for multi-turn editing. |
| `keyframe_build`        | Billed: reads a location/style `descriptor.md` (+ `geo_block.md` verbatim when present), composes the light law from `light_statement`, attaches the result as the asset's canonical `plate.png`, seeds `interaction.md`. |
| `asset_image`           | Free (no lane, no budget, no ledger): copies any image file into an asset dir as its canonical `sheet.png`/`plate.png`. |

### Video lane (M3 — 4)

| Tool            | Description                                                                 |
| --------------- | --------------------------------------------------------------------------- |
| `render_shot`   | Billed async render: composes the doctrine-native H3 prompt from the shot record (action verbatim, camera law, dialogue via `voice.md`, the sequence geo lock), renders 4–15s from the shot's keyframe plate (first-frame I2V), **reserves the estimated cost** against the budget, and returns the job handle (`job_id`, `estimated_cost_usd`, `real_length_s`). |
| `job_status`    | Poll a render job: provider status + progress, `expires_in_hours`; updates `jobs.json` in place. A dead job (failed/cancelled/expired) records the provider error verbatim and **refunds the reserved estimate** — only completed jobs bill. |
| `job_download`  | Download the finished mp4 to `renders/<job_id>/shot.mp4` and **reconcile the accrual** to the actual `usage.cost`; updates `jobs.json` (artifact path, actual cost, real length, dimensions, audio) and warns when content expires in <48h. |
| `repair_shot`   | Billed re-render with lineage (`parent_job_id` on the child job and its ledger line): `extend` (the agent-supplied parent final-frame screenshot becomes the child's first frame) or `restyle` (plain re-render from the same plate). |

`film_show` takes no arguments — it always shows the active film. The other film-scoped tools (`asset_register`, `shot_create`, `shot_update`, `shot_show`, `sequence_lock_geo`, and the image/video-lane tools) accept an optional `film_id`; omit it and the active film is used (a clear `NOT_FOUND` refusal tells you to set one if there is none).

## Run

```bash
npm run build          # tsc → dist/
node dist/server.js    # run the built server over stdio
npm run dev            # run from source via tsx
```

Inspect and exercise the tools interactively with the MCP inspector:

```bash
npx @modelcontextprotocol/inspector node dist/server.js
```

The server speaks newline-delimited JSON-RPC over stdio (MCP standard) — point any MCP client at `node dist/server.js` with `STUDIO_ROOT` in its environment.

## Studio workspace layout

The server creates and manages this structure under `STUDIO_ROOT` (plain files, no database):

```
STUDIO_ROOT/
├── studio.json                     # active film pointer
└── films/
    └── <film_id>/
        ├── film.json               # meta + per-sequence geo locks + spentUsd
        ├── assets/
        │   ├── characters/<asset_id>/   descriptor.md · voice.md · acting.md · sheet.png · interaction.md
        │   ├── locations/<asset_id>/    descriptor.md · geo_block.md · plate.png · interaction.md
        │   ├── props/<asset_id>/        descriptor.md
        │   └── styles/<asset_id>/       descriptor.md · plate.png · interaction.md
        ├── generated/              # image_generate artifacts + staging copies (asset images are attached from here)
        ├── shots/<shot_id>.json    # full shot records
        ├── renders/<job_id>/shot.mp4  # downloaded video artifacts (one dir per job)
        ├── jobs.json               # async video-lane job handles (status, artifact path, actual cost)
        └── ledger.jsonl            # one JSON line per billed take / reserve / reconcile / refund
```

## Doctrine the tools enforce

The registry refuses, with a `NEXT:` fix, when a call would:

- create a film without a title or logline, or with a bad id (`^[a-z0-9][a-z0-9_-]{1,63}$`)
- register a **character** without `voice` and `acting` blocks — the completeness law
- register an asset with an empty `descriptor`, or over an existing `asset_id`
- create or update a shot with an empty `geo_block`, no `refs` (≥ 1), a camera move without `lens`/`move`/`reason`, or `duration_s` outside 1–30
- create a shot whose `geo_block` differs from the sequence's locked block — it must be pasted **verbatim**
- update a shot in a way that drifts from the sequence geo lock (re-verified on every patch)
- rename a shot via `shot_update` — shot ids are immutable
- re-lock a sequence with different text — the lock is the point
- reference an asset in a shot that is not registered (or a character missing `voice.md`/`acting.md` on disk)

Refusals map to MCP errors: `VALIDATION`/`NOT_FOUND` → `-32602`; `AUTH`/`BUDGET`/`LANE_DOWN`/`JOB_FAILED` → `-32000`.

## M2 image lane

The four image tools ride one lane: the **Gemini Interactions API**, model `gemini-3-pro-image` ("Nano Banana Pro") — `POST https://generativelanguage.googleapis.com/v1beta/interactions` with the `Api-Revision: 2026-05-20` header and `x-goog-api-key` auth. Image generation is synchronous: the submit response body is cached and read straight back, so there is no polling and no invented GET endpoint. Every response shape the parser accepts is pinned by recorded fixtures (fake bytes, no credentials); the live smoke below guards against shape drift.

**Pricing** (fixed law, quoted before every call and returned as `cost_usd`):

| `image_size` | Price per take |
| ------------ | -------------- |
| `1K` / `2K`  | $0.134         |
| `4K`         | $0.24          |

**Budget law.** Every billed call runs the same binding order: validate args → resolve refs → quote price → `ensureBudget` → call → write artifact → accrue → ledger. If the film has no budget, or `spentUsd + quote > budget_usd`, the call is refused **before any API request fires**. A successful take accrues `spentUsd` on `film.json` and appends one JSON line to `ledger.jsonl` (tool, lane, film, `cost_usd`, `interaction_id`, artifact path); a refused call writes nothing.

**Multi-turn editing.** Every billed generation returns an `interaction_id`. Pass it back as `previous_interaction_id` on the next `image_generate` call to iterate on the same image ("make the sky darker") instead of re-describing it. `character_sheet_build` and `keyframe_build` also write the id — and only the id — to `interaction.md` in the asset dir, so the seeded id survives across sessions: read the file, feed it to `image_generate`.

**Live smoke.** The Gemini live smoke (`test/live/gemini.live.test.ts`) performs one real billed generate (1K/16:9, ~$0.134) and asserts PNG magic bytes on disk, the ledger line and the accrued spend — but only when `STUDIO_LIVE=1` **and** `GEMINI_API_KEY` are both set; otherwise the suite skips itself (CI and plain `npm test` never touch the network). If the live response shape ever drifts from the recorded fixtures (e.g. steps-only output), extend the `result()` parser in `src/lanes/gemini.ts` and keep the fixtures authoritative.

## M3 video lane

The four video tools ride one lane: the **Vultr Serverless Inference API**, model `minimax-h3` (MiniMax H3) — base `https://api.vultrinference.com/v1` with `Authorization: Bearer $VULTR_INFERENCE_API_KEY`. Unlike the synchronous image lane, video is **async**: `POST /videos` answers `202` with a job id, `GET /videos/{id}` polls status (`pending` / `in_progress` / `completed` / `failed` / `cancelled` / `expired`), and `GET /videos/{id}/content` downloads the mp4 once completed. Before every submit the lane verifies the model catalog (`GET /videos/models`): a wrong or renamed model id is refused, never silently billed against a fallback model.

**H3 prompt layout.** `render_shot` never sends the shot record raw — a pure composer maps the doctrine onto H3's native three-field layout: the shot is one `[Shot 1] <lens>: <action>` block with the action text verbatim, a `Camera:` line derived from the stored lens/move/reason, and dialogue lines as `(S1) — <voice descriptor verbatim> says: <d>[English]<line></d>`. The sequence's locked geo block rides as the `Setting (spatial map, locked across every shot of this scene)` line; sound is `overall_soundscape: room tone; <sfx>` (never `N/A` — room tone is always present; silence is chosen in the cut) and `non_diegetic_music: N/A` (music is post, by law). Descriptors are verbatim and never trimmed; the prompt is capped at 8000 chars and an overflow is a structured refusal ("shorten the action text, never the descriptors"). Characters never enter the prompt as references — the shot's keyframe plate is the identity carrier (first-frame I2V; frames XOR references).

**Duration law.** H3 renders 4–15 whole seconds (`render_shot` refuses anything else with "H3 lane renders 4–15s — split the beat or adjust the shot"; the store keeps 1–30 for multi-lane reality). Whole 24fps blocks run long, so the submit output quotes `real_length_s` from a measured table (4s → ~4.46s … 15s → ~15.08s) and the downloaded entry records the real seconds.

**Money model: reserve at submit → reconcile at download → refund on failure.** The video charge is only knowable when the job completes, so `render_shot` **reserves** the estimate ($0.153/s × duration — the only input to the budget hard stop) onto `spentUsd` the moment Vultr accepts the job, and appends the ledger line marked `estimated: true`; in-flight renders count against the cap. `job_download` **reconciles**: the delta between the actual `usage.cost` and the reservation accrues as an append-only line (`note: 'reconcile'` — the original line cannot be edited). `job_status` **refunds** the reservation when a job dies (failed/cancelled/expired bill $0) via a negative line (`note: 'refund'`, idempotent by ledger scan). The ledger per job therefore sums to the truth: `estimate − refund + reconcile = actual`, and `spentUsd` tracks it. There is no budget check at download by design: the provider charged at completion — refusing the download cannot uncharge, it would only block recovering paid content.

**Repair lineage.** `repair_shot` re-renders a shot from a parent job: `extend` feeds the agent-supplied parent final-frame screenshot in as the child's first frame, `restyle` re-renders from the same plate. Both submit plain child jobs stamped with `parent_job_id` lineage in `jobs.json` **and** the ledger line; the provider's edit endpoint is deliberately unwired until its request schema is verified.

**Retention.** Vultr keeps job content for **7 days** (`expires_at`): `job_status`/`job_download` surface `expires_in_hours` and warn below 48h remaining so a take is re-downloaded, not lost. Every job submit, poll and download goes through `jobs.json` — the async handle file the lifecycle tools update in place (status, provider error verbatim on failures, artifact path and actual cost on completion).

**Live smoke.** `test/live/vultr.live.test.ts` renders one real 4s video (≈ $0.61–0.68) end-to-end — verify model → submit → poll → download — and asserts mp4 magic bytes, `usage.cost > 0` and the ledger money law (the per-job ledger sums to the actual charge), but only when `STUDIO_LIVE=1` **and** `VULTR_INFERENCE_API_KEY` are both set; otherwise it skips itself. Its run log records the observed live response shapes so the Task 1 fixtures stay honest (or get re-recorded deliberately).

## Development

```bash
npm test              # vitest — store + server suites (fixture contract tests; no network)
npx vitest run test/live  # live smokes — ONLY with STUDIO_LIVE=1 + the lane key(s): one billed image (~$0.134) and/or one billed 4s render (~$0.61–0.68)
npm run build         # strict tsc, zero-emit-error gate
```

## Roadmap

- ~~**M2** — image lane (Nano Banana Pro), verbatim geo/camera injection into prompts~~ — **shipped** (hard budget-stop + per-take ledger enforcement included; `budget_set`/`budget_show`/ledger read tools follow in M4)
- ~~**M3** — video lane (Vultr H3), repair/extend chaining~~ — **shipped** (async jobs + reserve/reconcile/refund money model + repair lineage included; the vertical slice follows in M5)
- **M4** — budget tools surface (`budget_set`, `budget_show`, `log_take`, `ledger_read`)
- **M5** — end-to-end vertical slice (script → shots → renders)

## License

MIT.
