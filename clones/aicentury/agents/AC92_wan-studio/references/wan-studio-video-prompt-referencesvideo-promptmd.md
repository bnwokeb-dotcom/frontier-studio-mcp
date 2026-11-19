# Wan Studio — Video Prompt (references/video-prompt.md)

# 🎬 Video Prompt — knowledge base

Mode 3 of Wan Studio. How to create cinematic Wan video prompts with or without dialogue, using storyboard
images, character references, or rough ideas.

> Seedance Studio's video knowledge (converted from `CinePrompt_Video_Prompt_Knowledge_UPDATED.pdf`), set to
> Wan 3.0's own prompt format: shot timestamps and lengths, the one-shot line, dialogue, sound, reference
> names and the negative list follow Alibaba's Wan 3.0 prompt guide (`assets/research/wan/01`, re-read
> 2026-10-19). Everything else is the original. Read it together with `character-sheet.md` and
> `storyboard.md` before every 🎭 / 🎞️ / 🎬 answer. **These rules are for videos built from scratch.** A 🔄
> Cast Swap prompt edits an uploaded video and follows `prompt-template.md` instead — see `SKILL.md` §Which
> rule wins.

---

## Core goal

Create polished video prompts that are easy to copy, cinematic, consistent, and ready for Wan.

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

**Character cap:** every video prompt up to 15 seconds must stay under 2000 characters — ideally around
1800-1950, never more. Longer videos (20-30 seconds, more shots) may run to 3000. If a prompt becomes too
long, automatically compress and optimize it while preserving the scene quality, motion, style, and
important details. (Wan 3.0's prompt box on OpenArt takes 4,500 — the cap keeps prompts tight, not just legal.)

**Aspect ratio:** never write a ratio or an orientation inside a video prompt — `16:9`, `9:16`, `1:1`,
vertical, horizontal, landscape, portrait. The user sets it in Wan. Aspect ratio may be used only inside
storyboard/image prompts when needed.

**Without dialogue**, include:

```
No dialogue, no subtitles, no text on screen. No background music.
```

Wan decides on its own whether people talk unless the prompt says `No dialogue` — so this line is never
dropped.

**With dialogue**, include:

```
No subtitles, no text on screen. No background music.
```

Dialogue must be short, natural, timed, easy to perform, not too many lines, and matched to the shot.

---

## One shot or several — always say which

Left alone, Wan cuts on its own (a short prompt came back as five cuts in five seconds). Every video prompt
states one of the two:

- **Several shots** — `Shot 1 [0-3s] …`, `Shot 2 [3-5s] …`: whole seconds, starting at 0, each shot
  starting where the last one ended (no gaps, no overlaps), ending exactly on the stated duration. **2 to 5
  seconds per shot** (Wan's own guide). Where a cut matters, end that shot's line with `Hard cut.`
- **One continuous shot** — the very first line of the prompt is `Generate single shot.`, the camera does
  one named move (or stays fixed), the timeline is written as beats of 2-5 s inside the take — `[0-3s] …`,
  `[3-6s] …`, never `Shot 1` — and `no cuts` joins the negative list. Use it when the user asks for one take, no cuts or a
  oner, or when the scene is one continuous moment.

**How many shots fit:**

| Duration | Shots |
| --- | --- |
| 10 s | 3-4 |
| 15 s | 5-6 |
| 20 s | 6-8 |
| 25 s | 8-10 |
| 30 s | 10-12 |

Wan 3.0 makes 2-30 seconds in one go. More panels or beats than fit → lengthen the video, or fold two quick
moments into one shot (a storyboard guides the shots; it doesn't have to map one panel to one shot).

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

## How Wan reads dialogue

- **One line per speaker, in the shot where it is spoken:** the character, a speaking verb, a colon and
  the line in quotes — `The detective says: "We're too late."`, `She whispers: "Don't move."`,
  `The boy replies: "Then we run."`. A narrator: `Voiceover: "…"`.
- **Close the dialogue with `Lip sync.`** — one line after the shot sequence.
- **Name each speaker the same way every time**, by look or by image: `the woman in the red coat`, or
  `the character in Image 1`. Two speakers must never be described alike.
- **Budget:** about half the clip is speech — roughly 2-3 seconds of spoken words per 5 seconds of video.
  Fewer, shorter lines lip-sync better.
- **Language:** a line is spoken in the language it is written in. Write the lines in English unless the
  user asks for another language for the dialogue; everything else in the prompt stays English.
- **A specific voice:** if the user uploads a voice clip, add once, after that character's first line:
  `[the character] voice timbre references Audio 1.`

---

## Reference use

References are named the way Wan reads them: `Image 1`, `Image 2`… numbered in **upload order** (videos and
audio counted separately: `Video 1`, `Audio 1`) — even a single image is `Image 1`. The numbers below are
examples; use the real upload order.

- **Storyboard image uploaded** — open the prompt with: `Use the storyboard in Image 1 only as shot
  guidance; do not generate the video from the storyboard as a single image.` Then restate the panels in
  order — left to right, top to bottom — as the shot sequence. Each panel is a shot beat; never treat the
  sheet as one scene. The storyboard is always Image 1 — ask for it to be uploaded first (the ⚙️ line gives
  the order). Read it before writing: if it isn't a storyboard, or its panels, cast or style don't match the
  plan, say so in one line and ask — never pass something else to Wan as the storyboard.
- **A storyboard that exists only as a prompt** (the generated image was never uploaded) — leave the
  storyboard line out and write its panels as the shots.
- **Character image uploaded** — `Image 2 is [the character]: keep the same face, hair, build, outfit
  and props.` Preserve exact identity, outfit, face, body proportions and props. Several images
  of one character: `Images 2-3 show the same [character] — generate only one of them.`
- **A character sheet as the character image** — `Image 2 is [the character]'s character sheet: keep the
  same face, hair, build and outfit; its labels and notes never appear in the video.`
- **A reference in another medium than the video's style** (a photo in an anime video, a drawn character in
  a photoreal one) — `Image 2 gives [the character]'s identity only — face shape, hair, build and outfit;
  render them in this video's style.` The video's style wins over the reference's own look.
- **Both at once** (a labelled sheet in another medium) — one sentence: `Image 2 is [the character]'s
  character sheet and gives their identity only — face shape, hair, build and outfit; render them in this
  video's style. Its labels never appear in the video.`
- **Location image uploaded** — `Image 3 is the location: keep its layout, architecture, palette and light;
  any people in it are ignored.`
- **Storyboard and character both uploaded** — the storyboard is the sequence reference, the character
  image the identity reference: name both, in upload order.
- **One picture to bring to life as the first frame** (image-to-video) — the picture already holds the
  subject, the place and the framing; the prompt describes only the motion, the camera, the dialogue and the
  sound. This mode takes no other references.

---

## Video prompt must include

Duration · one shot or several · reference instructions · subject · scene · style · rules · shot sequence ·
camera direction · sound design · dialogue section if needed · a short negative list · no background music ·
no aspect ratio.

---

## Shot timing examples

Whole seconds, end to end, 2-5 seconds a shot:

**10 seconds / 4 shots**

```
Shot 1 [0-3s]
Shot 2 [3-5s]
Shot 3 [5-8s]
Shot 4 [8-10s]
```

**15 seconds / 6 shots**

```
Shot 1 [0-3s]
Shot 2 [3-5s]
Shot 3 [5-8s]
Shot 4 [8-10s]
Shot 5 [10-13s]
Shot 6 [13-15s]
```

**20 seconds / 8 shots** — the same 3 s / 2 s rhythm, ending `Shot 8 [18-20s]`.
**30 seconds / 12 shots** — the same rhythm, ending `Shot 12 [28-30s]`.
**One continuous 10-second take** — `Generate single shot.` first, then beats: `[0-3s]`, `[3-7s]`, `[7-10s]`.

---

## Video camera language

Wide establishing shot · low-angle tracking shot · side tracking shot · crash zoom · slow push-in · aerial
pull-back · handheld natural lag · overhead beauty shot · extreme close-up · hero close-up · macro texture
shot · 360 orbit · dolly-in · whip pan · smooth connected animation between storyboard poses · rack focus ·
over-the-shoulder shot · point-of-view shot · slow motion hero beat · fast punchy cuts · natural camera
drift · tight reaction shot.

One camera move and one main action per shot holds best on Wan; stacked moves tend to add cuts of their own.

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

Wan fills in the ambience from what is on screen. A sound that must land at a moment gets its own sentence
with its time: `At 8s, a door slams.`

Always include: `No background music.`

---

## Negative rules

Wan has no separate negative field, and its own guide says: write only what must not appear, once, and
don't repeat what the rest of the prompt already says. So every prompt ends with **one short `Negative:`
line**, built from: no watermark · no logo · no UI · no extra characters unless requested · no identity
drift · no style drift · no costume drift · no environment drift · no extra story events outside the
storyboard/reference — plus `no cuts` for a single shot. `No background music.`, `No dialogue` and `no
subtitles, no text on screen` live in the Audio line and are not repeated here. Pick the items that matter
for this scene; never more than about ten.

---

## Video prompt without dialogue — template

```text
[Only with a storyboard image: Use the storyboard in Image 1 only as shot guidance; do not generate the video from the storyboard as a single image.]
Create a [duration]-second cinematic video. [One sentence: theme, point of view, narrative style and mood.]

Reference:
[Only with uploaded images, in upload order: the character line, the location line.]

Subject:
[subject]

Scene:
[scene]

Style:
[style]

Rules:
- Follow the storyboard panels in order, left to right and top to bottom, if a storyboard is provided
- Maintain character, outfit, environment, lighting, and prop continuity
- Natural sound design only

Shot Sequence:
Shot 1 [0-3s] [title]: [action, camera, emotion, movement]
Shot 2 [3-5s] [title]: [action, camera, emotion, movement]
Continue until complete.

Camera:
[wide/medium/close-up/overhead/tracking/low angle/hero shot details]

Audio:
No dialogue, no subtitles, no text on screen. Natural sound effects only: [environment sounds, movement sounds, object sounds, breathing, ambience]. No background music.

Negative:
No watermark, no logo, no UI, no extra characters, no identity drift, no style drift, no costume drift, no environment drift.
```

**As one continuous shot** (with or without dialogue): put `Generate single shot.` above the first line
(it is always the very first line, above a storyboard line too), replace `Shot Sequence:` with `Action:` and beats of 2-5 s (`[0-3s] …`), name the one camera move in a
`Camera:` line, and add `no cuts` to `Negative:`.

---

## Video prompt with dialogue — template

```text
[Only with a storyboard image: Use the storyboard in Image 1 only as shot guidance; do not generate the video from the storyboard as a single image.]
Create a [duration]-second cinematic video. [One sentence: theme, point of view, narrative style and mood.]

Reference:
[Only with uploaded images, in upload order: the character line, the location line.]

Subject:
[subject]

Scene:
[scene]

Style:
[style]

Rules:
- Follow the storyboard panels in order, left to right and top to bottom, if a storyboard is provided
- Maintain character, outfit, environment, lighting, and prop continuity
- Dialogue must be short, natural, and timed to the shots

Shot Sequence:
Shot 1 [0-3s] [title]: [action, camera, expression, movement]
[Character] says: "[line]"

Shot 2 [3-5s] [title]: [action, camera, expression, movement]
[Character] replies: "[line]"

Continue until complete.
Lip sync.

Audio:
Clear dialogue, natural room tone, movement sounds, object sounds, atmosphere, and realistic effects. No subtitles, no text on screen. No background music.

Negative:
No watermark, no logo, no UI, no extra characters, no off-story events, no identity drift, no style drift, no costume drift, no environment drift.
```

---

## Matching video prompt from storyboard — template

```text
Use the storyboard in Image 1 only as shot guidance; do not generate the video from the storyboard as a single image.

Reference:
[Only with more uploaded images, in upload order: the character line, the location line.]

Create a [duration]-second cinematic video that follows the storyboard panel order, left to right and top to bottom. Each panel is one shot beat; do not reinterpret the storyboard as one single scene.

Preserve:
- Same character identity
- Same outfit and proportions
- Same environment
- Same lighting direction
- Same visual style
- Same props and story continuity

Rules:
- Follow the storyboard order exactly
- Maintain continuity across every shot

Shot Sequence:
Shot 1 [0-3s] [panel 1: shot size, camera, action]
Shot 2 [3-5s] [panel 2: shot size, camera, action]
Continue until all panels are covered.

Camera:
Follow the storyboard camera logic exactly. Use smooth connected motion between shots where appropriate.

Style:
[style details]

Audio:
[No dialogue, no subtitles, no text on screen. — or the spoken lines inside their shots and "Lip sync." after the sequence] Natural sound design only: [environment sounds, movement sounds, breathing, impacts, footsteps, fabric, atmosphere, or object sounds as needed]. No background music.

Negative:
No watermark, no logo, no UI, no extra characters, no story events outside the storyboard, no identity drift, no style drift, no costume drift, no environment drift.
```

With dialogue, the `Audio:` line opens `No subtitles, no text on screen.` instead of the no-dialogue line.

**As one continuous shot:** `Generate single shot.` comes first, above the storyboard line, and the panels
become beats of 2-5 s inside one take: replace `Each panel is one shot beat; do not reinterpret the
storyboard as one single scene.` with `Follow the storyboard's moments in order as beats of one continuous
shot.`, write `Action:` beats instead of `Shot Sequence:`, name the one camera move in `Camera:`, and add
`no cuts` to `Negative:`.

---

## Solo self-talk example

If the user says "he is alone and talks to himself", create short self-talk lines, one per shot:

```
The climber whispers to himself: "Stay calm."
The climber mutters: "Just one more step."
The climber says: "I can make it through this."
```

Keep solo dialogue emotional, natural, and short.

---

## ⚙️ The Wan settings line

Printed under every finished video prompt, outside the block, before the 🔁 Next Step — Wan's defaults
would otherwise cut a 15-second prompt to 5 seconds or rewrite it:

```
⚙️ **Wan 3.0:** [N] s · [text-to-video / reference-to-video — upload [Image 1 = …, Image 2 = …] in this order / image-to-video — your picture is the first frame] · audio on · Auto Polish / prompt extend off where offered
```

- **Duration** — the prompt's own, in whole seconds (Wan 3.0 takes 2-30).
- **Mode** — no image: text-to-video. Character, location or storyboard images: reference-to-video, in the
  prompt's order. One picture to animate as the opening frame: image-to-video.
- **On OpenArt**, the references are tagged: type `@` in the prompt box and pick each file where the prompt
  says `Image 1`, `Image 2`… — then check which tag each file got. Say it once per conversation, in the
  first settings line that has images: `On OpenArt, type @ and pick each file where the prompt says Image 1, Image 2 (for "Images 2-3", pick both, in order).`
- **Prompt rewriting** — OpenArt's Auto Polish is its own rewrite (off by default — keep it off). Alibaba's
  prompt extend has a switch on its API and some hosts, but not on OpenArt's Wan 3.0 form. Where a switch
  shows, turn it off: a rewrite can drop the timings and the image numbers.
- **Using Wan 2.7 instead?** It runs 2-15 s (reference-to-video 2-10 s), takes up to 5 references and has a
  separate negative-prompt box: put the `Negative:` items there and drop that line from the prompt. Say this
  only when the user names Wan 2.7.

---

## Good video prompt principles

- Follow the storyboard exactly
- Use one shot per storyboard panel when the timing allows
- Do not add new story events
- Preserve identity
- Preserve style
- Preserve environment
- Preserve lighting logic
- Keep dialogue short
- Keep action clear
- Keep sound natural
- Always include "No background music"
- Always say one shot or several
- Never state an aspect ratio in a video prompt

## Quality standard

Every video prompt should feel clear, cinematic, timed, structured, consistent, easy to copy, and strong
enough for professional AI video generation on Wan.

---

## Self-check for video prompts

Silent and blocking, before printing any 🎬 video prompt; fix and re-check on failure.

1. One shot or several is stated: `Shot N [a-bs]` lines, or `Generate single shot.` as the very first line
   with beats and one camera move.
2. Whole seconds from 0, end to end, every shot or beat 2-5 s, ending exactly on the stated duration.
3. `No background music.` is there; `No dialogue` when nobody speaks; with dialogue, `says:` / `replies:`
   lines inside their shots and `Lip sync.` after the sequence.
4. No ratio or orientation, no tool or model name, and no `[slot]` left inside the block.
5. References are `Image N` in upload order; a storyboard opens with the shot-guidance line; a reference in
   another medium gets the identity-only line.
6. One `Negative:` line, each item once, nothing repeated from the Audio line.
7. Under the character cap: 2,000 up to 15 s, 3,000 for 20-30 s.
8. Under the block, in this order: the ⚙️ Wan line, the 🙋 line when it applies, the 🔁 Next Step, then
   the footer, last.