# Wan Studio — Storyboard (references/storyboard.md)

# 🎞️ Storyboard — knowledge base

Mode 2 of Wan Studio. How to create cinematic storyboard prompts for AI image tools, and the matching
video prompts.

> Converted from `CinePrompt_Storyboard_Knowledge.pdf` (the original knowledge of Seedance Studio, Wan
> Studio's sister skill). Content unchanged except three things: the shot counts and durations are re-timed
> for Wan's 2-5-second shots, the matching video prompt opens with Wan's own storyboard line, and the one
> section marked ⚖️ follows `SKILL.md` §Which rule wins. Read it together with `character-sheet.md` and
> `video-prompt.md` before every 🎭 / 🎞️ / 🎬 answer.

---

## Core goal

Help the user create clean, cinematic storyboard prompts in any style, with strong shot structure,
duration, timing, camera logic, and continuity.

**Recommended starter question:**

```
🎞️ What is the video idea, duration, number of shots, style, and will you upload or describe a character?
```

Keep this short. If the user does not know duration or shot count, suggest (Wan takes 2-5 seconds a shot
and makes up to 30 seconds in one go):

- 6 shots = 15 seconds
- 8 shots = 20 seconds
- 10 shots = 25 seconds
- 12 shots = 30 seconds

---

## Storyboard must include

- Project title
- Duration
- Number of panels
- Aspect ratio 16:9
- Visual style
- Character or subject
- Environment
- Panel layout
- Shot titles
- Timing hints
- Camera notes
- Action notes
- Continuity rules
- Negative rules

---

## Best storyboard structures

**6-shot, 15-second structure**

1. Establish world and character
2. Trigger action
3. Escalation or detail close-up
4. Peak motion or transformation
5. Reaction or hero reveal
6. Final payoff

**8-shot, 20-second structure**

1. Opener / establishing shot
2. First action impact
3. Process or escalation
4. Texture or detail close-up
5. Main transformation or reveal
6. Peak motion or conflict
7. Final build or emotional setup
8. Hero ending or payoff

**10-shot, 25-second structure**

1. Establish world
2. Introduce character
3. Trigger action
4. First escalation
5. Detail close-up
6. Motion peak
7. Transformation or twist
8. Emotional reaction
9. Hero reveal
10. Final payoff

**12-shot, 30-second structure**

1. Establishing beat
2. Character intention
3. First action
4. Detail action
5. Process beat
6. Environmental shift
7. Escalation
8. Peak action
9. Slow-motion or hero beat
10. Final detail
11. Presentation/reveal
12. Emotional payoff

---

## Camera grammar

Use varied cinematic shots: wide establishing shot · medium shot · close-up · extreme close-up · overhead
shot · low-angle shot · side tracking shot · handheld natural lag · push-in · pull-back · whip pan · hero
shot · POV shot · texture macro · reaction close-up.

Each panel must feel visually different.

---

## Continuity rules

Preserve: same character identity · same outfit · same proportions · same props · same environment logic
· same lighting direction · same visual style · same emotional progression.

Avoid: identity drift · costume drift · extra characters · random new locations · repeated camera angles
· crowded text inside panels · messy panel layout.

---

## Storyboard layout types

1. **Clean infographic storyboard** — white background, black borders, bold titles, numbered panels,
   footer notes.
2. **Professional production storyboard** — cream paper, pencil/ink notes, red camera boxes, blue motion
   arrows, timing notes.
3. **Previs storyboard** — low-detail figures, simple shapes, camera arrows, motion clarity,
   blocking-first.
4. **Cinematic commercial storyboard** — realistic shots, luxury lighting, emotional progression, shallow
   depth of field.
5. **Anime production board** — handwritten notes, manga motion lines, sound effects, timing notes,
   dramatic angles.

---

## When the user uploads a character image

Use it as Reference Image 1. Preserve exact identity in all storyboard panels.

## When the user uploads a story idea only

Automatically create the full panel sequence. Do not wait for exact beat-by-beat instructions.

---

## Storyboard prompt template

```text
Create a professional cinematic storyboard sheet.

Project:
[title]

Duration:
[duration]

Panels:
[number of shots]

Aspect Ratio:
16:9

Style:
[visual style]

Character/Subject:
[character or subject description]

Environment:
[location/world]

Storyboard Layout:
Clean widescreen production storyboard sheet with numbered panels, clear shot titles, camera notes, action notes, timing hints, and strong visual flow. Use a professional layout with readable panel structure.

Continuity Rules:
- Same character identity throughout
- Same outfit, proportions, props, and style throughout
- Same environment logic and lighting direction throughout
- Each panel must be a distinct cinematic shot
- Strong variety in camera angles: wide, medium, close-up, extreme close-up, overhead, low angle, tracking, hero shot where useful

Shot Sequence:
1. [shot title] — [action, camera, timing, emotion]
2. [shot title] — [action, camera, timing, emotion]
3. [shot title] — [action, camera, timing, emotion]
Continue until all shots are complete.

Visual Direction:
Use clear cinematic composition, readable silhouettes, emotional progression, strong pacing, and dynamic motion. Prioritize shot grammar, continuity, and story clarity.

Footer Notes:
Include camera tips, timing flow, style notes, and continuity reminders.

Negative:
No watermark, no logo, no random text inside panels, no inconsistent costume, no identity drift, no messy layout, no extra characters unless requested.
```

---

## Matching video prompt

⚖️ The original rule said: after every storyboard prompt, also create a matching video prompt unless the
user says not to, and include 16:9 in it. **In Wan Studio the 🔁 Next Step question offers the
matching video prompt instead, and a video prompt never states an aspect ratio** — see `SKILL.md` §Which
rule wins. Everything else below still applies when the matching video prompt is written.

The matching video prompt must open with Wan's own storyboard line, so the whole sheet is never read as one
frame, then restate the panels in order, left to right and top to bottom:

```
Use the storyboard in Image 1 only as shot guidance; do not generate the video from the storyboard as a single image.
```

It must include:

- Duration
- Shot-by-shot sequence
- Camera instructions
- Style instructions
- Natural sound design only
- No background music
- Dialogue or no dialogue rule
- Negative rules

The full template is in `video-prompt.md` §Matching video prompt from storyboard.

---

## Storyboard output style

```
## 🎞️ Storyboard Prompt
**Use Reference Image 1 if uploaded.**
```

followed by the prompt in one fenced `text` block.