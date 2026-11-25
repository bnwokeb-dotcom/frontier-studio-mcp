# frontier-studio-mcp

A headless, law-enforcing AI film production MCP server for Codex, Claude, and remote LLM directors. Every tool enforces plain-file studio continuity, spatial geometry locks, double-entry financial accounting, and real binary media verification (`ffprobe` / `ffmpeg`) — never synthetic placeholders or fake completions.

For complete Codex setup, Chrome Extension pairing, and DaVinci Resolve import instructions, see **[docs/CODEX_DIRECTING_GUIDE.md](docs/CODEX_DIRECTING_GUIDE.md)**.

## Core Architecture

- **Zero-API Google AI Pro Web Bridge (`frontier-flow-bridge`)**: Manifest V3 Chrome extension (`extension/`) + `/bridge/*` queue connecting your genuine logged-in `flow.google` (Nano Banana 2.5 4K sheets/plates) and `aistudio.google.com` speech sessions directly to disk at **$0 API cost**, with manual `asset_image` / `dialogue_import` fallbacks.
- **Vultr Serverless Video Lane (`minimax-h3`)**: Async 4–15s first-frame I2V rendering (`standard` 768p at **$0.09/s** default, **4K `seedvr2-7b-sharp-video`** up to `4608x2016` `21:9` at **$0.18/s**, `turbo` at `$0.06/s`, `ultra` at `$0.30/s`) with automatic `tail_frame.png` chaining and reserve/reconcile/refund ledgering.
- **Real FFmpeg Audio Soundstage & Cutting Room**: `dialogue_import` 48kHz mono PCM normalization, room-impulse `acoustic_match` (`-14 LUFS`), procedural `soundscape_build`, dynamic multi-state `score_arrange_dynamic` (`-23 LUFS`), `shot_lipsync`, `film_grade`, `film_assemble` (`rough_cut.mp4`), `qc_vision_audit`, and multi-track **FCPXML 1.10 / OTIO / EDL** timeline export (`V1 + A1 + A2 + A3` with `file:///` URIs).
- **Headless Dual Transport**: Local `stdio` (with automatic local Chrome Bridge on `:8081`) or remote `SSE/HTTP` (`GET /` JSON discovery, `GET /sse`, `POST /messages`, `/bridge/*`, `/artifacts/*`, `/health`).

## Install

```bash
npm install
npm run build
```

Requires **Node >= 20** and **FFmpeg / FFprobe** on `PATH`.

**Environment** — copy `.env.example` to `.env` and set:

| Variable | Required | Purpose |
| --- | --- | --- |
| `STUDIO_ROOT` | yes | Absolute path to the studio workspace folder (created on demand) |
| `VULTR_INFERENCE_API_KEY` | no | Vultr video lane (`minimax-h3`) — required only for billed video renders |
| `GEMINI_API_KEY` | no | Optional paid Gemini image / Google Cloud TTS lanes (not needed with `frontier-flow-bridge`) |
| `ELEVENLABS_API_KEY` | no | Optional ElevenLabs vocal synthesis lane |
| `STUDIO_LIVE` | no | `1` = live generation lanes enabled; `0` = registry/bridge/FFmpeg post only |
| `MCP_TRANSPORT` | no | `stdio` (default) or `sse` for remote HTTP/SSE daemon |
| `BRIDGE_PORT` | no | Local Chrome bridge port in `stdio` mode (default `8081`; `disabled` to omit) |

## Tools (34)

### Registry Core (8)

| Tool | Description |
| --- | --- |
| `film_create` | Register a film (`film_id`, `title`, `logline`, optional `budget_usd` / `target_runtime_min`); sets it active. |
| `film_set_active` | Point subsequent film-scoped calls at the specified `film_id`. |
| `film_show` | Show the active film: metadata, per-sequence geo locks, and universe links. |
| `asset_register` | Register a `character`/`location`/`prop`/`style` asset; characters require `voice` + `acting` blocks and support `biological_markers`, `parent_dna`, `voice_id`, `voice_provider`. |
| `shot_create` | Create a shot with verbatim `geo_block`, `refs`, `camera` (lens/move/reason/rig/eyeline), `cinematics`, `aspect_ratio`, `continuity`, `chain_from_shot_id`, `audio_block`, `duration_s` (1–30), and 180° axis validation. |
| `shot_update` | Patch a shot (`id` is immutable; geo locks re-verify verbatim; `audio_block` merges per-key; unknown patch keys are refused). |
| `shot_show` | Read the full shot record (status, geo, refs, camera, cinematics, audio, takes). |
| `sequence_lock_geo` | Lock a sequence's spatial `geo_block` verbatim across every shot in the sequence. |

### Zero-API Google AI Pro Bridge & Prompt Tools (5)

| Tool | Description |
| --- | --- |
| `flow_prompt_sheet` | Compiles a 4K `#e8e8e8` headless 3-panel character turnaround prompt for `flow.google` (Nano Banana 2.5) with biological markers; optionally queues to `frontier-flow-bridge`. |
| `flow_prompt_plate` | Compiles a 2.39:1 Panavision C-Series motivated-light master location plate prompt with `geo_block.md`; optionally queues to Chrome bridge. |
| `studio_prompt_dialogue` | Compiles a Reddington-cadence `[breath]` / `[pause: 800ms]` vocal script for `aistudio.google.com` (`Charon`, `Fenrir`, `Aoede`, `Puck`, `Kore`); optionally queues to Chrome bridge. |
| `bridge_status` | Reports live `frontier-flow-bridge` extension connectivity, heartbeats, and pending/claimed/completed job counts. |
| `bridge_job_result` | Polls a queued Chrome bridge job (`flow_sheet`, `flow_plate`, `aistudio_voice`) for saved `output_path`, dimensions/sample-rate, and `artifact_url`. |

### Image, Pre-Vis & Staging Lane (6)

| Tool | Description |
| --- | --- |
| `asset_image` | Zero-API attachment: validates and copies any local/generated PNG into `sheet.png` (characters) or `plate.png` (locations/styles). |
| `image_generate` | Optional billed Gemini Interactions API generation (`gemini-3-pro-image`) with multi-turn `previous_interaction_id`. |
| `character_sheet_build` | Optional billed Gemini 3-panel headless turnaround sheet generation (`sheet.png` + `interaction.md`). |
| `keyframe_build` | Optional billed Gemini motivated-light location plate generation (`plate.png` + `interaction.md`). |
| `staging_build` | Optional billed two-character spatial composition onto a location plate before video generation. |
| `storyboard_build` | Optional billed `2x2` / `2x3` / `2x4` sequence storyboard contact sheet generation. |

### Video Lane — Vultr MiniMax H3 (4)

| Tool | Description |
| --- | --- |
| `render_shot` | Async I2V render (`minimax-h3`, 4–15s): verifies model catalog, reserves `$0.06/s` (`turbo`), `$0.09/s` (`standard` 768p default), `$0.18/s` (`max`/`2K`/`4K`), or `$0.30/s` (`ultra`), and auto-chains parent `tail_frame.png` when `chain_from_shot_id` or `continuity: 'continuous'` is set. |
| `job_status` | Polls Vultr job status + progress + `expires_in_hours`; automatically issues an idempotent `refund` line if a job failed, expired, or was cancelled. |
| `job_download` | Downloads finished MP4, validates stream via `ffprobe`, runs automated FFmpeg signal/motion QC (`auditTake` `>= 8.5` for `kept`), extracts `tail_frame.png`, and reconciles actual `usage.cost`. |
| `repair_shot` | Submits billed child render (`extend` from parent final frame or `restyle` from plate) with `parent_job_id` lineage. |

### Audio & Soundstage Lane (5)

| Tool | Description |
| --- | --- |
| `dialogue_import` | Zero-API ingestion of `aistudio.google.com` or local captures (`.wav`/`.mp3`/`.ogg`/`.webm`/`.m4a`/`.flac`): verifies non-silent audio via `ffprobe`/`volumedetect` (`> -75 dB`) and normalizes to `-16 LUFS`, `48kHz` 16-bit mono PCM WAV. |
| `dialogue_render` | Optional billed 48kHz WAV vocal synthesis via Google Cloud TTS or ElevenLabs mapped to character `voice_profile.json`. |
| `soundscape_build` | Synthesizes sculpted ambient room-tone & Foley beds via FFmpeg `anoisesrc` filters (or loops `source_audio_path`) into 48kHz stereo WAV. |
| `acoustic_match` | Convolves dialogue stems with physical room filters (`snow_forest`, `stone_cavern`, `wooden_cabin`, `interior_hall`, `open_field`) and normalizes to `-14 LUFS`. |
| `score_arrange_dynamic` | Executes FFmpeg `filter_complex` multi-state stem mixing (`felt_whisper`, `creeping_dread`, `epic_swell`, `vacuum_silence`) with EBU R128 `-23 LUFS` mastering (`score_master.wav`). |

### Cutting Room, Editorial & QC (6)

| Tool | Description |
| --- | --- |
| `film_export_xml` | Exports multi-track **FCPXML 1.10** (`V1` + `A1` Dialogue + `A2` SFX + `A3` Score), **OpenTimelineIO (`.otio`)**, and **CMX 3600 EDL** with absolute `file:///` media URIs for DaVinci Resolve Studio. |
| `film_assemble` | Probes all shot MP4s via `ffprobe` and executes FFmpeg `filter_complex` concatenation + audio stem mixing (`-af loudnorm=I=-23:TP=-1.0`) to produce verified `rough_cut.mp4`. |
| `film_grade` | Applies Hollywood film stock emulation (`kodak_vision3_500t`, `arri_alexa35_logc4`, `fuji_eterna`, `bleach_bypass`, `tri_x_35mm`), photochemical grain, era styling, and aspect ratio masking via FFmpeg. |
| `shot_lipsync` | Synchronizes and multiplexes 48kHz dialogue WAV stems onto rendered shot MP4s via FFmpeg. |
| `shot_continuity_plan` | Evaluates camera vectors, framing, and 180-degree eyeline axis between shots to advise `CHAIN_TAIL_FRAME` vs `CUT_TO_STAGING_PLATE`. |
| `qc_vision_audit` | Runs automated `ffprobe` + FFmpeg `blackdetect` / `freezedetect` stream integrity verification on rendered MP4s and rough cuts. |

## Directorial MCP Prompts (5)

Connected agents can invoke built-in directorial prompt workflows:

- `director_breakdown`: Screenplay breakdown into cast dossiers, locked geo blocks, and continuous shot lists.
- `cinematographer_shot_designer`: Camera lenses, rigs, 180° eyeline rules, and physical optics design.
- `soundstage_master`: Dialogue ingestion/synthesis, diegetic room-tone beds, convolution, and muxing.
- `commercial_ad_architect`: High-converting 9:16 / 1:1 / 16:9 ad structure with hook pacing and packshot lighting.
- `skit_director_architect`: Multi-shot ensemble skit choreography with continuous tail-frame chaining.

## Run

### Local (`stdio` + Chrome Bridge on `:8081`)

```bash
npm run build
node dist/server.js
```

### Remote (`sse` / HTTP Headless Daemon & Docker)

```bash
# Set MCP_TRANSPORT=sse in .env (or run container):
docker compose up -d
```

Headless HTTP endpoints:
- `GET /`: JSON service discovery (`service: "frontier-studio-mcp"`, `mode: "headless-mcp"`, endpoint catalog)
- `GET /sse`: Server-Sent Events MCP stream
- `POST /messages`: MCP JSON-RPC incoming calls
- `GET /bridge/status`, `GET /bridge/jobs`, `POST /bridge/jobs`, `GET /bridge/jobs/next`, `POST /bridge/jobs/:id/complete`: `frontier-flow-bridge` extension queue
- `GET /artifacts/*`: Static media streaming with range-seeking (MP4, PNG, WAV)
- `GET /api/films`, `GET /api/export/fcpxml`: Studio metadata & FCPXML download endpoints
- `GET /health`: Health-check probe

See [docs/CODEX_DIRECTING_GUIDE.md](docs/CODEX_DIRECTING_GUIDE.md) for Codex `mcpServers` JSON/TOML snippets, Chrome Extension setup, and DaVinci Resolve FCPXML import steps.

## Studio Workspace Layout

```
STUDIO_ROOT/
├── studio.json                     # active film pointer
└── films/
    └── <film_id>/
        ├── film.json               # meta + per-sequence geo locks + spentUsd
        ├── assets/
        │   ├── characters/<asset_id>/   descriptor.md · voice.md · acting.md · biological_markers.json · voice_profile.json · sheet.png
        │   ├── locations/<asset_id>/    descriptor.md · geo_block.md · plate.png
        │   ├── props/<asset_id>/        descriptor.md
        │   └── styles/<asset_id>/       descriptor.md · plate.png
        ├── generated/              # staged/generated image assets attached via asset_image
        ├── audio/                  # 48kHz dialogue WAVs, diegetic stems, soundscapes, score_master.wav
        ├── shots/<shot_id>.json    # full shot records
        ├── renders/
        │   ├── rough_cut.mp4       # assembled rough cut MP4
        │   └── <job_id>/           # shot.mp4 · tail_frame.png · shot_synced.mp4 · shot_graded_*.mp4
        ├── timelines/              # <timeline>.fcpxml · <timeline>.otio · <timeline>.edl · concat_manifest.txt
        ├── jobs.json               # async video-lane job handles (status, QC score/verdict, actual cost)
        └── ledger.jsonl            # append-only JSONL money ledger (reserve / reconcile / refund)
```

## M3 Video Lane Pricing & Accounting

| Quality Tier | Rate | 15s Max Take | Notes |
| --- | --- | --- | --- |
| `turbo` | `$0.06 / s` | `$0.90` | Fast draft iteration |
| `standard` *(default)* | **`$0.09 / s`** | **`$1.35`** | 768p Standard (`minimax-h3`) |
| `max` / `2K` / `4K` | **`$0.18 / s`** | **`$2.70`** | 4K `seedvr2-7b-sharp-video` up to `4608x2016` (`21:9`) |
| `ultra` | `$0.30 / s` | `$4.50` | Maximum fidelity tier |

Budget law per job: `ensureBudget` hard stop -> `render_shot` **reserves** estimate (`estimated: true`) -> `job_download` **reconciles** delta to actual `usage.cost` (`note: "reconcile"`) -> `job_status` **refunds** dead jobs idempotently (`note: "refund"`).

## Development

```bash
npm run build         # strict tsc compilation to dist/
npm test              # vitest — full unit, bridge, FFmpeg, and SSE E2E suite (no external network spend)
```

Live smokes (`test/live/gemini.live.test.ts` and `test/live/vultr.live.test.ts`) execute real billed API calls only when `STUDIO_LIVE=1` and the corresponding API key are explicitly set; otherwise they self-skip.

## License

MIT.
