# Seedance Studio — Video Prompt (references/video-prompt.md)

# 🎬 Video Prompt — knowledge base

Mode 3 of Seedance Studio. How to create cinematic AI video prompts with or without dialogue, using
storyboard images, character references, or rough ideas.

> Converted from `CinePrompt_Video_Prompt_Knowledge_UPDATED.pdf` (the original Seedance Studio knowledge,
> also live on AC71). Content unchanged. Read it together with `character-sheet.md` and `storyboard.md`
> before every 🎭 / 🎞️ / 🎬 answer. **These rules are for videos built from scratch.** A 🔄 Cast Swap
> prompt edits an uploaded video and follows `prompt-template.md` instead — see `SKILL.md` §Which rule wins.

---

## Core goal

Create polished video prompts that are easy to copy, cinematic, consistent, and ready for AI video tools.

**Recommended starter question:**

```
🎬 Do you want a video prompt with dialogue or without dialogue? You can upload a storyboard image or describe the scene.
```

Keep this short.

---

## Video prompt types

1. Video prompt without dialogue
2. Video prompt with dialogue
3. Matching video prompt from storyboard
4. Video prompt from a single image reference
5. Video prompt from a rough idea

---

## Global video rules

Every video prompt must include:

```
No background music.
```

**Character cap:** every video prompt must stay under 2000 characters. Always keep prompts slightly below
the limit, ideally around 1800-1950 characters, and never exceed 2000 characters. If a prompt becomes too
long, automatically compress and optimize it while preserving the scene quality, motion, style, and
important details.

**Aspect ratio:** do not mention aspect ratio in video prompts unless the user explicitly asks for it.
Never write any of these inside video prompts unless the user specifically asks for aspect ratio:
`16:9` · `9:16` · `1:1` · `vertical` · `horizontal` · `landscape` · `portrait` · `aspect ratio`.
Aspect ratio may be used only inside storyboard/image prompts when needed.

**Without dialogue**, include:

```
No dialogue, no subtitles, no text on screen. No background music.
```

**With dialogue**, include:

```
No subtitles, no text on screen. No background music.
```

Dialogue must be short, natural, timed, easy to perform, not too many lines, and matched to the shot.

---

## Dialogue completion rule

When you ask who is speaking and what the conversation is about, treat any user answer as enough
information unless it is impossible to understand. Examples that are enough:

- "he is alone"
- "he talks to himself"
- "2 characters arguing"
- "they talk about escaping"
- "make it emotional"
- "survival dialogue"
- "the girl warns him"
- "the monster whispers"
- "a mother talks to her child"
- "the chef talks to himself while cooking"

Do not ask another clarification question if the speaker, topic, and scene can be understood. If the
user gives a vague answer, intelligently write short natural dialogue that matches the storyboard,
character, tone, and scene.

- **Solo** — create inner monologue or spoken self-talk.
- **2 characters** — create short back-and-forth dialogue.
- **3 characters** — keep dialogue very short and clearly labeled.

---

## Reference use

- **Storyboard image uploaded** — use it as the exact shot structure, timing, framing, and sequence
  reference. Do not reinterpret the storyboard as one single scene. Each panel is one separate cinematic
  shot beat.
- **Character image uploaded** — preserve exact identity, outfit, face, body proportions, props, and
  style.
- **Both uploaded** — use the storyboard as sequence reference and the character image as identity
  reference.

---

## Video prompt must include

Duration · reference instructions · subject · scene · style · rules · shot sequence · camera direction ·
sound design · dialogue section if needed · negative rules · no background music · no aspect ratio unless
the user explicitly asks.

---

## Shot timing examples

**12 seconds / 8 shots**

```
[00:00–00:01.5]
[00:01.5–00:03.0]
[00:03.0–00:04.5]
[00:04.5–00:06.0]
[00:06.0–00:07.5]
[00:07.5–00:09.0]
[00:09.0–00:10.5]
[00:10.5–00:12.0]
```

**15 seconds / 8 shots**

```
[00:00–00:01.8]
[00:01.8–00:03.4]
[00:03.4–00:05.2]
[00:05.2–00:07.0]
[00:07.0–00:08.8]
[00:08.8–00:10.6]
[00:10.6–00:12.8]
[00:12.8–00:15.0]
```

**15 seconds / 10 shots** — 1.5 seconds per shot.
**20 seconds / 10 shots** — 2 seconds per shot.

---

## Video camera language

Wide establishing shot · low-angle tracking shot · side tracking shot · crash zoom · slow push-in · aerial
pull-back · handheld natural lag · overhead beauty shot · extreme close-up · hero close-up · macro texture
shot · 360 orbit · dolly-in · whip pan · smooth connected animation between storyboard poses · rack focus ·
over-the-shoulder shot · point-of-view shot · slow motion hero beat · fast punchy cuts · natural camera
drift · tight reaction shot.

## Video style language

Depending on the user's style: Pixar CGI vivid expressive animation · anime cinematic cel animation ·
ultra-realistic commercial video · fashion film realism · food commercial macro realism · stylized cartoon
comedy · dark magical realism · nostalgic 1990s anime · previs blocking animation · luxury cinematic
commercial · horror atmosphere · fantasy film sequence · documentary realism · high-end product
commercial · emotional cinematic realism · clay animation · stop-motion inspired animation · soft
colorful stylized animation.

---

## Natural sound design

Use only realistic sounds unless the user specifically requests voice or dialogue. Examples: footsteps ·
fabric movement · breathing · room tone · wind · fire crackle · steam hiss · knife taps · object impacts ·
water splashes · crowd murmur · soft environmental ambience · character exhale · mechanical sounds ·
animal sounds · door creaks · snow crunch · rain taps · distant thunder · wood cracking · glass clink ·
paper rustle · chair movement · soft hand contact · nervous breathing · whispered voice · spoken
self-talk.

Always include: `No background music.`

---

## Negative rules

Always include: no background music · no subtitles · no text on screen · no watermark · no logo · no UI ·
no aspect ratio unless the user explicitly asks · no extra characters unless requested · no identity drift
· no style drift · no costume drift · no environment drift · no extra story events outside the
storyboard/reference · no random camera changes · no inconsistent lighting · no unexplained object
changes.

---

## Video prompt without dialogue — template

```text
Create a [duration] cinematic video.

Reference:
Use the uploaded storyboard/image as the exact visual and timing reference if provided.

Subject:
[subject]

Scene:
[scene]

Style:
[style]

Rules:
- Follow the shot order exactly if a storyboard is provided
- Each panel is one separate cinematic shot beat if a storyboard is provided
- Maintain character, outfit, environment, lighting, and prop continuity
- No dialogue
- No subtitles
- No text on screen
- No background music
- Natural sound design only
- Do not mention aspect ratio

Shot Sequence:
[00:00–00:01.5]
SHOT 1 - [title]
[action, camera, emotion, movement]

[00:01.5–00:03.0]
SHOT 2 - [title]
[action, camera, emotion, movement]

Continue until complete.

Camera:
[wide/medium/close-up/overhead/tracking/low angle/hero shot details]

Audio:
Natural sound effects only: [environment sounds, movement sounds, object sounds, breathing, ambience]. No background music.

Negative:
No background music, no subtitles, no text on screen, no watermark, no logo, no UI, no aspect ratio, no extra story events, no extra characters unless requested, no identity drift, no style drift, no costume drift, no environment drift.
```

---

## Video prompt with dialogue — template

```text
Create a [duration] cinematic video.

Reference:
Use the uploaded storyboard/image as the exact visual and timing reference if provided.

Subject:
[subject]

Scene:
[scene]

Style:
[style]

Rules:
- Follow the shot order exactly if a storyboard is provided
- Each panel is one separate cinematic shot beat if a storyboard is provided
- Maintain character, outfit, environment, lighting, and prop continuity
- Dialogue must be short, natural, and timed to the shots
- No subtitles
- No text on screen
- No background music
- Natural sound design only
- Do not mention aspect ratio

Shot Sequence:
[00:00–00:02]
SHOT 1 - [title]
[action, camera, expression, movement]
Dialogue:
Character:
"[line]"

[00:02–00:04]
SHOT 2 - [title]
[action, camera, expression, movement]
Dialogue:
Character:
"[line]"

Continue until complete.

Audio:
Clear dialogue, natural room tone, movement sounds, object sounds, atmosphere, and realistic effects. No background music.

Negative:
No background music, no subtitles, no text on screen, no watermark, no logo, no UI, no aspect ratio, no extra characters unless requested, no off-story events, no identity drift, no style drift, no costume drift, no environment drift.
```

---

## Matching video prompt from storyboard — template

```text
Use the uploaded storyboard image as the exact shot structure, timing, framing, and sequence reference.

Create a [duration] cinematic video that follows the storyboard panel order exactly. Each panel is one separate cinematic shot beat. Do not reinterpret the storyboard as one single scene.

Preserve:
- Same character identity
- Same outfit and proportions
- Same environment
- Same lighting direction
- Same visual style
- Same props and story continuity

Rules:
- Follow the storyboard exactly
- Each panel is one separate cinematic shot beat
- Maintain continuity across every shot
- Do not mention aspect ratio
- No background music

Shot Sequence:
1. [shot 1]
2. [shot 2]
3. [shot 3]
Continue until all shots are complete.

Camera:
Follow the storyboard camera logic exactly. Use smooth connected motion between shots where appropriate.

Style:
[style details]

Audio:
Natural sound design only. No background music. Use realistic environmental sounds, movement sounds, breathing, impacts, footsteps, fabric, atmosphere, or object sounds as needed.

Dialogue:
[No dialogue / or include dialogue per shot]

Negative:
No background music, no subtitles, no text on screen, no watermark, no logo, no UI, no aspect ratio, no extra characters, no story events outside the storyboard, no identity drift, no style drift, no costume drift, no environment drift.
```

---

## Solo self-talk example

If the user says "he is alone and talks to himself", create short self-talk lines:

```
Character:
"Stay calm."
Character:
"Just one more step."
Character:
"I can make it through this."
```

Keep solo dialogue emotional, natural, and short.

---

## Good video prompt principles

- Follow the storyboard exactly
- Use one shot per storyboard panel
- Do not add new story events
- Preserve identity
- Preserve style
- Preserve environment
- Preserve lighting logic
- Keep dialogue short
- Keep action clear
- Keep sound natural
- Always include "No background music"
- Never mention aspect ratio unless requested

## Quality standard

Every video prompt should feel clear, cinematic, timed, structured, consistent, easy to copy, and strong
enough for professional AI video generation.