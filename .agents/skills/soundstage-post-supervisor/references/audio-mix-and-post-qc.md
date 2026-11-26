# 6-Layer Soundstage Architecture, Photochemical Grade & Post QC Gate

## 1. The 6-Layer Soundstage Bus Hierarchy
Build sound from physical geometry outward rather than masking weak visuals with loud music:
1. **Bus A1 — Environmental Bed (`-24 dBFS`):** Courtyard cold wind, distant rain hiss, subterranean water drip (`soundscape_build`).
2. **Bus A2 — Procedural & Material Foley:** Chalk dragging basalt, brass plumb tick, dry limestone grit, heavy boot/heel displacement (`sfx_spot_video` + synced `sync.at` offsets).
3. **Bus A3 — Creature Signatures:** Tracheal breath intake `0.5s` prior to line, leather harness creak, chitin click — **zero stock feline/crocodile roars**.
4. **Bus A4 — Institutional Acoustic Markers:** Hollow gavel strike, serrated lock bolt snap, marble rail signet tap.
5. **Bus A5 — Enrolled Convolved Dialogue (`-14 LUFS` foreground):** Locked `48kHz` mono PCM stems processed via `acoustic_match` matching set geometry (`stone_cavern`, `open_field`, `cathedral_vault`).
6. **Bus A6 — Dynamic Adaptive Score (`score_arrange_dynamic`):**
   - `0:00–0:24` Cold Open: `vacuum_silence` (35Hz tectonic thrum only on Blade Halts / Shackle Unclips).
   - Tension buildup: `felt_whisper` (`650Hz` low-pass, `-18dB`).
   - Midpoint squeeze: `creeping_dread` (35Hz drone + muted strings, `-12dB`).
   - Major Reveal Pre-Drop: **`1.5s` `vacuum_silence`** -> sharp **Tracheal/Metallic Impact** -> `epic_swell` (`-2dB`, ducked during speech).

## 2. Finishing Order Inside Frontier Studio MCP
1. `character_voice_enroll` -> verify permanent `voice_sample.wav` (`48kHz`) + `voice_profile.json` per lead.
2. `dialogue_import` or `dialogue_render` -> `acoustic_match(shot_id, acoustic_profile)`.
3. `music_bridge_dispatch` (optional Suno/Udio stems) -> `score_arrange_dynamic`.
4. `shot_lipsync(shot_id, engine: 'ffmpeg_mux')` (or `synclabs` when `SYNC_API_KEY` + R2 active).
5. `sfx_spot_video` to lock precision impacts onto shots (`boom-hit-medium`, `click-button-medium`, `riser-2s-strong`).
6. `film_grade(era: '1970s_panavision', film_stock: 'kodak_vision3_500t', grain: 'subtle', aspect_ratio: '2.39_anamorphic')`.
7. `film_assemble` -> `qc_vision_audit` (pass check: 0 black frames, 0 freeze frames, playable audio).
8. `film_export_xml` (`FCPXML 1.10` + `OTIO` + `EDL`) + `film_publish` (when R2 configured).
