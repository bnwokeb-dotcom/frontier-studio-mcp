# AI Century Cloned Engine & Offline Skills MCP

This directory contains a complete, local, zero-latency clone of the **AI Century Agent Skills Library** (75 agent skills and full reference knowledge bibles).

## Architecture

Unlike the original remote HTTP endpoint which only serves text prompts and forces users to manually copy-paste into third-party sites with affiliate links, this local clone provides:
1. **Zero-Latency Local Search & Retrieval**: All 75 skills and full markdown bibles are stored locally.
2. **Offline MCP Server (`server.mjs`)**: Runs locally via stdio or SSE.
3. **Native Frontier Studio Bridge (`aicentury_to_frontier_scene`)**: Directly converts AI Century's prompt structures into structured shot definitions for `frontier-studio-mcp`, ready for immediate GPU rendering (MiniMax H3 / Veo 2 / Kling), tail-frame continuity chaining, and FFmpeg assembly.

## Available Tools

1. `aicentury_list`: Browse skills filtered by category (`Cinematic Filmmaking`, `AI Shorts`, `Advertisement`, `ASMR`, `YouTube Automation`, `Styles`, etc.).
2. `aicentury_search`: Full-text keyword search across all 75 skills, prompt instructions, and reference bibles (e.g. "caveman", "vlog", "turnaround", "kling", "wan", "cast swap").
3. `aicentury_get_skill`: Get complete prompt engineering instructions and templates for any skill (`AC78` Time Travel / Caveman Vlog, `AC71` Seedance Studio, `AC91` Cast Swap, `AC44` Kling Studio, `AC92` Wan Studio, `AC9` Brand Cartoon, etc.).
4. `aicentury_read_reference`: Read any specific attached markdown reference guide (e.g. `video-prompt.md`, `character-sheet.md`, `environments.md`, `you-in-a-video.md`).
5. `aicentury_to_frontier_scene`: Format any AI Century prompt into a production-ready Frontier Studio shot payload.

## Included Key Agents

- **`AC78` (Time Travel Vlog / Cavemen in Modern World)**: Arm's-length selfie-vlog camera perspective, modern clothing vs era-accurate environment, matching ambient light, contact shadows, spoken dialogue with background action.
- **`AC71` (Seedance Studio)**: Film-grade character turnaround sheets, shot-by-shot storyboards, 5 matching world environments, dialogue rules.
- **`AC91` (Cast Swap)**: Timestamped video-to-video prompts preserving cuts, camera vectors, and movement while swapping characters.
- **`AC89` (Frame Match Character)**: Recreates exact shot, pose, style, and composition with custom characters.
- **`AC44` & `AC92` (Kling & Wan Studios)**: Model-optimized cinematic prompts.
- **`AC9` (Brand Cartoon)**: 3D animated talking mascot advertisements.
- **`AC67` (Room Glow Up)** & **`AC64` (Restoration Timelapse)**: Derelict to luxury multi-stage transformation timelapses.
- **`AC86` (Lava Drop)** & **`AC90` (Vertical Sprint)**: High-velocity viral shorts.
