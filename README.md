# frontier-studio-mcp

A thin, schema-disciplined MCP server for AI film production. The server holds **no creative logic**: it is a registry and law-enforcement layer over a plain-file studio workspace. The "brain" — taste, cinematography, prompt craft — lives in skills; the server's job is to make doctrine violations structurally impossible, not to generate anything. Generation lanes (verbatim geo-block injection, image, video) arrive in M2/M3 on top of this registry core.

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
| `GEMINI_API_KEY` | no      | Reserved for the M2 image lane                                  |
| `VULTR_API_KEY`  | no      | Reserved for the M3 video lane                                  |
| `STUDIO_LIVE`   | no       | `1` = real generation lanes enabled; `0` = registry only         |

No credentials are required for the M1 registry core; only `STUDIO_ROOT` matters.

## Tools (M1 registry core — 8)

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

`film_show` takes no arguments — it always shows the active film. The other film-scoped tools (`asset_register`, `shot_create`, `shot_update`, `shot_show`, `sequence_lock_geo`) accept an optional `film_id`; omit it and the active film is used (a clear `NOT_FOUND` refusal tells you to set one if there is none).

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
        ├── film.json               # meta + per-sequence geo locks
        ├── assets/
        │   ├── characters/<asset_id>/   descriptor.md · voice.md · acting.md
        │   ├── locations/<asset_id>/    descriptor.md · geo_block.md
        │   ├── props/<asset_id>/        descriptor.md
        │   └── styles/<asset_id>/       descriptor.md
        ├── shots/<shot_id>.json    # full shot records
        ├── renders/                # (M2/M3 lane output)
        ├── jobs.json               # (M3 lane jobs)
        └── ledger.jsonl            # (M4 cost ledger)
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

## Development

```bash
npm test              # vitest — store + server suites
npm run build         # strict tsc, zero-emit-error gate
```

## Roadmap

- **M2** — image lane (Nano Banana Pro), verbatim geo/camera injection into prompts
- **M3** — video lane (Vultr H3), repair/extend chaining
- **M4** — budget enforcement + cost ledger
- **M5** — end-to-end vertical slice (script → shots → renders)

## License

MIT.
