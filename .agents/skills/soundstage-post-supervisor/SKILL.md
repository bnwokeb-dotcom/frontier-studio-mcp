---
name: soundstage-post-supervisor
description: Use when enrolling character voices, designing creature audio, building acoustic soundscapes, dynamically mixing score stems, grading, or mastering final MP4/FCPXML/OTIO outputs.
---

# Soundstage & Post-Production Supervisor

## Overview
Audio delivers over 50% of emotional retention on YouTube. Eliminate "dry TTS booth voice", stock predator roars, and wall-to-wall `-12dB` orchestral fatigue by enforcing enrolled `48kHz` vocal anchors, room impulse convolution, surgical `vacuum_silence` drops, synced SFX, `-14 LUFS` web mastering, photochemical `2.39:1` grading, and multi-track NLE export.

## Iron Laws — No Exceptions
1. **Lock Character Voices BEFORE Render (`character_voice_enroll`):** Enroll a permanent `48kHz` mono PCM `voice_sample.wav` + `voice_profile.json` for every recurring speaker (preventing pitch/accent/language drift). **NEVER use stock lion/crocodile roars** for intelligent monsters — speak calm, unhurried baritone layered with close-mic tracheal clicks; if non-verbal, express intelligence through measured tracheal clicks, sub-bass pulse, and rhythmic chitin stillness.
2. **No Dry Studio TTS Over Picture:** Convolve EVERY line cleanly with `acoustic_match` (`stone_cavern`, `cathedral_vault`, `snow_forest`, `wooden_cabin`, `concrete_room`) so voices live inside the architecture.
3. **Ban Wall-to-Wall Constant Music:** Strip continuous orchestra out of the Cold Open (`0:00–0:24`) except low 35Hz tectonic drone. Insert hard **`1.0–2.0s` `vacuum_silence` drops** immediately prior to shocking reveals (`score_arrange_dynamic`).
4. **Sync-Point SFX + Spectral Ducking:** Spot discrete foley (`chain clink`, `basalt shift`, `signet tap`, `steel lock`) via `sfx_spot_video` using verified `sync.at` impact offsets and `-4dB` under-voiceover ducking (`soundscape_build`).
5. **Truthful Finish, Loudness Cap & Vision QC:** Align/mux via `shot_lipsync` (`ffmpeg_mux`, or authenticated `synclabs` — zero silent lies), apply `film_grade` (`kodak_vision3_500t`, `2.39_anamorphic`, subtle grain), assemble via `film_assemble` (**`-14 LUFS` web / `-23 LUFS` cinema, hard `-1.0 dBTP` true-peak ceiling** across master & `9:16` Shorts), verify zero black/freeze tears + audio peak compliance via `qc_vision_audit`, and export editable V1+A1–A3 tracks via `film_export_xml` (`FCPXML 1.10` + `OTIO`).

## Red Flags — Hold Upload If Caught
| Post Shortcut | Why It Ruins Retention | Required Fix |
| --- | --- | --- |
| Dry headphone TTS straight in rough cut | Sounds like pasted podcast narration | Run `dialogue_import`/`dialogue_render` + `acoustic_match` |
| Constant `-12dB` choir/orchestra under whole video | Flattens dramatic contrast; fatigues mobile ears | Run `score_arrange_dynamic` with cold open `vacuum_silence` + `felt_whisper` -> `epic_swell` |
| Flattened MP4 export without NLE backup | Cannot localize, remix stems, or polish cuts | Always run `film_export_xml` (`FCPXML 1.10` + `OTIO`) + `qc_vision_audit` |

**6-LAYER AUDIO MIX & FINISHING RECIPE:** Read [audio-mix-and-post-qc.md](references/audio-mix-and-post-qc.md).
