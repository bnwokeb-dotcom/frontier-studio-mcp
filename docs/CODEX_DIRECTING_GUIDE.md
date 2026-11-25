# Codex & Remote LLM Director's Guide — `frontier-studio-mcp`

`frontier-studio-mcp` is a headless, law-enforcing AI filmmaking MCP server. It pairs strict disk-backed continuity & budget accounting with:
- **Zero-API Google AI Pro Web Bridge (`frontier-flow-bridge`)** for 4K character sheets/plates on `flow.google` (Nano Banana 2.5) and speech performances on `aistudio.google.com`.
- **Vultr Serverless Inference (`minimax-h3`)** for 768p Standard (`$0.09/s`) and 4K (`$0.18/s`) first-frame I2V video rendering.
- **Deterministic FFmpeg/FFprobe Post-Production & QC** for 48kHz audio normalization, acoustic convolution, lip-sync muxing, film-stock grading, rough-cut assembly, and multi-track **FCPXML 1.10 / OTIO / EDL** export.

---

## 1. Connecting Codex / Claude / Cursor via MCP

### Option A: Remote VPS SSE Transport (Recommended for Codex & Cloud Agents)

Connect directly to the headless HTTP/SSE daemon over `/sse`:

```json
{
  "mcpServers": {
    "frontier-studio": {
      "url": "http://159.203.139.253:8080/sse"
    }
  }
}
```

If using Codex CLI `~/.codex/config.toml`:

```toml
[mcp_servers.frontier-studio]
url = "http://159.203.139.253:8080/sse"
```

Verify the headless host before connecting:
- `GET http://159.203.139.253:8080/` returns JSON service discovery (`mode: "headless-mcp"`).
- `GET http://159.203.139.253:8080/health` returns `{ "status": "ok", ... }`.
- `GET http://159.203.139.253:8080/artifacts/<path>` streams generated MP4s, PNGs, and WAVs with byte-range seeking.

### Option B: Local STDIO Transport

Build the TypeScript project first:

```bash
npm install
npm run build
```

Configure your local MCP client to launch `dist/server.js`:

```json
{
  "mcpServers": {
    "frontier-studio": {
      "command": "node",
      "args": ["dist/server.js"],
      "env": {
        "STUDIO_ROOT": "/absolute/path/to/studio_workspace",
        "MCP_TRANSPORT": "stdio",
        "BRIDGE_PORT": "8081",
        "STUDIO_LIVE": "1",
        "VULTR_INFERENCE_API_KEY": "your_vultr_api_key"
      }
    }
  }
}
```

> **Note:** In `stdio` mode, the server automatically starts the Chrome Bridge HTTP listener on `http://127.0.0.1:8081` (configurable via `BRIDGE_PORT`, or set `BRIDGE_PORT=disabled` to omit it).

---

## 2. Chrome Extension (`frontier-flow-bridge`) & Manual Fallback

`frontier-flow-bridge` runs inside your authenticated Chrome browser session so 4K character sheets, location plates, and AI Studio dialogue captures cost **$0 in Google Cloud API fees**.

### Installing the Extension

1. Open Google Chrome and navigate to `chrome://extensions`.
2. Toggle **Developer mode** ON (top-right).
3. Click **Load unpacked** and select this repository's `extension/` directory.
4. Pin **Frontier Flow & AI Studio Bridge** and open its popup.
5. Set **Bridge Server URL** to:
   - `http://127.0.0.1:8081` when running local `stdio` mode, **or**
   - `http://159.203.139.253:8080` when targeting the remote VPS SSE host.
6. Click **Save**. Verify the status indicator turns green (`Online`).
7. Keep logged-in tabs open on `https://flow.google` (Nano Banana 2.5) and `https://aistudio.google.com` (Generate Speech).

From Codex, call `bridge_status` to confirm connected client count, dispatch jobs with `dispatch_to_bridge: true`, and poll non-blocking completion via `bridge_job_result`. Every PNG upload is validated (`>= 10 KB`, `>= 512x256`, valid PNG `IHDR`/`IDAT`/`IEND`), and every audio upload is probed and normalized via FFmpeg to `48kHz` 16-bit mono PCM WAV.

### Manual Zero-API Fallback Workflow

If Chrome automation is offline or Google updates its DOM selectors:

1. **Images (`flow.google`):**
   - Call `flow_prompt_sheet` or `flow_prompt_plate` (with `dispatch_to_bridge: false`).
   - Copy the returned `prompt` (and `negative_prompt`) into `https://flow.google` (select **Nano Banana 2.5**, **4K**, `16:9` for sheets or `2.39:1` for plates).
   - Download the PNG (or upload it in the extension popup's **1-Click Upload Capture** box).
   - Attach at $0 API cost via `asset_image(film_id, asset_id, image_path)`.
2. **Dialogue (`aistudio.google.com`):**
   - Call `studio_prompt_dialogue` for the target shot line.
   - Select the returned `voice_persona` (`Charon`, `Fenrir`, `Aoede`, `Puck`, or `Kore`) on `https://aistudio.google.com`.
   - Paste `annotated_line` (preserving `[breath]` and `[pause: 800ms]` cues), generate, and download the WAV/MP3/WebM capture.
   - Ingest at $0 API cost via `dialogue_import(film_id, shot_id, line_index, source_audio_path)` — FFmpeg validates non-silent audio (`> -75 dB`) and normalizes to `-16 LUFS`, `48kHz` mono PCM WAV.

---

## 3. Verified Live Vultr MiniMax H3 Pricing Matrix

All Vultr rates are enforced in `src/lanes/video.ts` (`VULTR_PRICING_PER_SECOND`) with `standard` as default:

| Quality Tier | Target Spec | Rate (`$/s`) | 4s Take | 5s Take | 15s Max Take |
| --- | --- | --- | --- | --- | --- |
| `turbo` | Fast draft pre-vis | `$0.06 / s` | `$0.24` | `$0.30` | `$0.90` |
| `standard` *(default)* | **768p Standard** | **`$0.09 / s`** | **`$0.36`** | **`$0.45`** | **`$1.35`** |
| `max` / `2K` / `4K` | **4K `seedvr2-7b-sharp-video`** (up to `4608x2016` `21:9`) | **`$0.18 / s`** | `$0.72` | `$0.90` | `$2.70` |
| `ultra` | Maximum fidelity tier | `$0.30 / s` | `$1.20` | `$1.50` | `$4.50` |

### Double-Entry Money & Retention Law
1. **`render_shot`:** Verifies `GET /v1/videos/models` (`minimax-h3`), checks `ensureBudget`, **reserves** `rate * duration_s` onto `film.json` (`spentUsd`), and appends `estimated: true` to `ledger.jsonl`.
2. **`job_status`:** Polls progress and `expires_in_hours` (7-day retention). Dead jobs (`failed`, `cancelled`, `expired`) automatically issue an idempotent negative **refund** line (`note: "refund"`).
3. **`job_download`:** Downloads MP4, runs `ffprobe` decode validation + `auditTake` signal/motion QC (`>= 8.5` for `kept`), extracts `tail_frame.png`, and writes the **reconcile** delta against actual `usage.cost` (`estimate - refund + reconcile = actual`).

---

## 4. Complete 7-Tier Directing Workflow

Execute the pipeline in strict sequence — the MCP store refuses doctrine violations with `NEXT:` fixes:

1. **Tier 1 — Film & Character/Location Registry:**
   - `film_create(film_id, title, logline, budget_usd, target_runtime_min)`
   - `asset_register` for every `character` (requires `descriptor`, `voice`, `acting`, optional `voice_id`, `voice_provider`, `biological_markers`, `parent_dna`) and every `location` (`descriptor`, `geo_block`).
2. **Tier 2 — 4K Headless Character Turnaround (`sheet.png`):**
   - `flow_prompt_sheet(character_id, dispatch_to_bridge: true)` -> bridge auto-saves `sheet.png` (or attach manually with `asset_image`).
   - Enforces `#e8e8e8` backdrop, face close-up panel, **headless** torso panel ending at collar line, rear panel, and biological markers.
3. **Tier 3 — 2.39:1 Motivated-Light Location Plate (`plate.png`):**
   - `flow_prompt_plate(location_id, light_statement, sequence, cinematics, dispatch_to_bridge)` -> saves `plate.png` (or `asset_image`).
4. **Tier 4 — Spatial Geometry Lock & 180° Continuity:**
   - `sequence_lock_geo(sequence, geo_block)` freezes the cardinal spatial map.
   - `shot_create` validates verbatim `geo_block`, `camera` (`lens`, `move`, `reason`, `screen_direction`, `eyeline_target`), `cinematics`, `duration_s`, and refuses 180-degree eyeline axis flips across a sequence.
   - `shot_continuity_plan(shot_id, target_shot_id)` advises `CHAIN_TAIL_FRAME` (`continuity: "continuous"`, `chain_from_shot_id`) vs `CUT_TO_STAGING_PLATE`.
5. **Tier 5 — GPU Video Generation & Automated QC:**
   - `render_shot(shot_id, quality: "standard", aspect_ratio: "16:9")` (auto-injects parent `tail_frame.png` when chained, else location `plate.png`).
   - `job_status(job_id)` -> `job_download(job_id)` -> verify `qc_verdict: "kept"` and `qc_score >= 8.5` (use `repair_shot` for `extend` or `restyle` lineage takes).
6. **Tier 6 — Soundstage, Acoustic Convolution & Score:**
   - `studio_prompt_dialogue` -> `dialogue_import` (48kHz mono PCM) -> `acoustic_match` (`stone_cavern` / `snow_forest` / `wooden_cabin` / `interior_hall` / `open_field`, normalized to `-14 LUFS`).
   - `soundscape_build` (48kHz stereo ambient bed) and optional `score_arrange_dynamic` (`felt_whisper`, `creeping_dread`, `epic_swell`, `vacuum_silence`, `-23 LUFS`).
7. **Tier 7 — Cutting Room, Grading, QC & Timeline Export:**
   - `shot_lipsync(shot_id, apply: true)` -> `film_grade(shot_id, era, film_stock, grain, aspect_ratio, apply: true)`.
   - `film_assemble(apply: true)` renders FFprobe-verified `renders/rough_cut.mp4` (`-af loudnorm=I=-23:TP=-1.0`).
   - `qc_vision_audit(video_path)` verifies zero black/frozen frame defects.
   - `film_export_xml` writes multi-track `.fcpxml`, `.otio`, and `.edl` under `timelines/`.

---

## 5. DaVinci Resolve Studio Import (FCPXML 1.10 / OTIO)

`film_export_xml` (and HTTP `GET /api/export/fcpxml?film_id=<id>`) generates timelines with absolute `file:///` `media-rep` URIs across four synchronized tracks:
- **`V1_Generative_Video`** — Rendered / synced / graded shot MP4 clips (`24fps`, `FFVideoFormat1080p24`).
- **`A1_Dialogue` (`lane="-1"`, role `dialogue`)** — Diegetic convolved speech stems (`*_line_*_diegetic.wav` or `*_line_*.wav`).
- **`A2_Soundscape_SFX` (`lane="-2"`, role `effects`)** — Ambient room-tone & Foley beds (`*_soundscape.wav`).
- **`A3_Score` (`lane="-3"`, role `music`)** — Dynamic mastered score (`score_master.wav`).

### Importing into DaVinci Resolve Studio

1. Open DaVinci Resolve Studio and create/open a **24.000 fps** project (`Project Settings -> Master Settings -> Timeline frame rate: 24`).
2. Select **File -> Import -> Timeline...** (shortcut `Ctrl+Shift+I` / `Cmd+Shift+I`).
3. Choose `<STUDIO_ROOT>/films/<film_id>/timelines/<timeline>.fcpxml` (or `<timeline>.otio` in Resolve 18.5+).
4. In the Import Timeline dialog:
   - Keep **Automatically set project settings** checked (or confirm `24 fps`).
   - Ensure **Automatically import source clips into media pool** is checked.
5. If rendering on a remote Linux VPS (`STUDIO_ROOT=/data/studio`) and editing locally on Windows/macOS:
   - Sync the film folder locally (e.g. `films/<film_id>/`), then in Resolve's **Media Pool**, right-click any offline clip -> **Relink Selected Clips...** -> point to your local `films/<film_id>/` directory so `renders/` and `audio/` relink instantaneously.
