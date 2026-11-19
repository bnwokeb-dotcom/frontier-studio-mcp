# Mini Kittens — Video Prompt

# Mode 3 — Video prompt

Every video prompt in this skill is **timestamped**. Four ways in, one output shape.

> **The main pipeline is two steps: character sheet → video prompt.** The sheet carries the cast, this
> prompt carries everything else, and nothing goes in between. Build for that route by default. The
> storyboard and single-image routes are there for users who want frames approved first or who need a
> picture to start the video from — offered, never imposed, and never asked about.

> Read `style-bible.md` first — the style block and the mini rule are pasted in verbatim.

---

## The one intake question

```
🎥 **Video prompt** — what are we working from?

1️⃣ 🐾 **A character sheet** — the main route. Attach it and I'll build the whole scene around your cast.
2️⃣ ✍️ **Just the idea** — no sheet yet? Tell me the scene and I'll write the whole thing.
3️⃣ 📷 **A single image** — attach one frame and I'll build the motion around it.
4️⃣ 🖼️ **A storyboard** — attach it and I'll animate the frames in order.

A storyboard is optional — the character sheet and this prompt are enough on their own.

And how long, and how many shots?
⏱️ 8s · 10s · 15s (default) · 20s · 30s
🎬 one continuous take (default) · or cut it into 3 · 5 · your own number of shots
```

Add the optional line in the same batch:

```
🙋 Want to be in it yourself? Attach a photo and I'll write you in with them — or say "kittens only".
```

On yes, `you-in-it.md` governs the person, the staging, the scale sentence and the attach line — and
they attach the photo of themselves **alongside** the storyboard, the character sheet or the single
image. A character sheet of themselves works in place of a photo — say which they sent.

**If a PERSON LOCK already exists in the conversation** — because the storyboard was built with them in
it — reuse it verbatim, keep the same staging, and do **not** re-offer the option. Say so in one line:
`Carrying you through from the storyboard — same staging, same look.` The same applies to a character sheet already made in this
conversation — reuse that cast rather than asking again.

If they already said "from this image" or attached something, skip straight to duration and shots. If
they gave a scene but no duration, take **15s as one continuous take in 5 beats** and say so in one line.

---

## The four paths

### 1 · From a character sheet

**This is the main route.** The character sheet is the cast reference and this prompt is everything
else — the scene, the light, the action, the timing. Nothing goes between them.

- **The sheet governs WHO, the prompt governs WHERE.** The sheet supplies the kittens' coats, markings,
  eyes and proportions. It supplies nothing else — so the scene, the surface, the props, the light and
  the action must all be written out in full, in words.
- **Keep the sheet's white backdrop out of the video.** Say what the scene *is* rather than what it is
  not: `The scene takes place in [the real location], on [the real surface], lit by [the real light].
  The attached character sheet supplies only the kittens' appearance.` A sheet handed over without this
  line drags a white studio void into the shot.
- Reference line: `Use the attached character sheet as the look of the kittens — the same coats, the
  same markings, the same eyes, the same size — in the scene described below.`
- **If they name a sheet but attach nothing**, never claim to have seen it. Ask once in one line, and
  offer the way forward in the same breath: `Send the sheet and I'll wire it in — or say "from the
  cast" and I'll write the coats out in the prompt instead, which most models handle fine.`
  With neither, build it as the from-scratch path and say so.
- **With a sheet or photo of the person too**, name both and say what each governs:
  `Use the attached character sheet for the kittens and the attached photo of the person for the
  person.` Then `you-in-it.md` governs the staging and the scale sentence.
- Write the cast out coat by coat in the prompt as well — the text and the sheet reinforce each other.
- Everything else is identical to the from-scratch path: same shot grammar, same timecodes.

### 2 · Just the idea

- Write the scene in two lines first and get a nod, or proceed and say you did — hook, set, cast size.
- Then beat it out with the shot grammar below. Pull the situation from `idea-library.md` when the user
  only gave a vibe.

---

### 3 · From a single image

- **Read the image first**, print a one-line `👀 What I can see`, then treat that image as the opening
  frame and the sole style authority.
- **The set never changes.** Every shot stays in that room, on that surface, in that light. Motion grows
  out of what is already in frame — the kittens move, the camera barely does.
- Open with: `Use the attached image as the first frame and as the look of the whole video.`
- **With the person option on**, they attach their own photo as well, and the reference line names both:
  the image governs the set and the first frame, the photo governs the person's face.
- Do not describe the image's contents as if they were your invention — describe them as the given.

### 4 · From a storyboard

- **Read the storyboard first.** Never claim to have seen frames that were not attached.
- **Frame N governs shot N** — same set, same cast, same framing, same light. The prompt describes the
  motion *between* and *inside* those frames, never a new location.
- Frames and shots rarely match one to one. More shots than frames: hold on a frame and let the action
  continue through a cut. Fewer: drop the weakest middle frame, never the hook or the payoff, and say
  which one you dropped.
- Open the prompt with a reference line: `Use the attached storyboard: frame 1 governs shot 1, frame 2
  governs shot 2, ...` — and only name frames that actually exist.

## Timecode rules

1. Beats are contiguous: beat 1 starts at `0:00.0`, each beat starts where the last ended, the final
   beat ends on the chosen duration exactly.
2. **In a continuous take the beats are moments inside one unbroken shot** — same timecodes, no cuts,
   and the prompt says `a single continuous [duration] take with no cuts` at the top. Only when the
   user asked to cut it does `N shots = N-1 hard cuts` apply.
3. **No beat is shorter than 0.8s.** There is no upper cap — a 1-BEAT build is the whole duration as a
   single beat, and a 3-beat 15s build runs roughly five seconds a beat. "Continuous" never means
   "1 beat"; it means no cuts between however many beats there are.
4. Re-add the durations before printing. If they do not sum to the chosen duration, fix and re-check.
5. Format: `0:00.0-0:03.5`, ASCII hyphen, one decimal, always.

### Canonical maps

With no count given the build is a continuous take in **5 beats** — take the 5-row for the chosen
duration. The 1-row is only for a user who explicitly asked for one unbroken beat.

| Duration | Beats (or shots in a cut build) | Timecodes |
|---|---|---|
| 8s | 1 | 0:00.0-0:08.0 |
| 8s | 3 | 0:00.0-0:02.5 · 0:02.5-0:05.0 · 0:05.0-0:08.0 |
| 10s | 3 | 0:00.0-0:03.5 · 0:03.5-0:06.5 · 0:06.5-0:10.0 |
| 10s | 5 | 0:00.0-0:02.5 · 0:02.5-0:04.5 · 0:04.5-0:06.0 · 0:06.0-0:07.5 · 0:07.5-0:10.0 |
| 15s | 3 | 0:00.0-0:05.0 · 0:05.0-0:09.5 · 0:09.5-0:15.0 |
| 15s | 5 | 0:00.0-0:03.5 · 0:03.5-0:06.0 · 0:06.0-0:08.5 · 0:08.5-0:11.0 · 0:11.0-0:15.0 |
| 20s | 5 | 0:00.0-0:04.5 · 0:04.5-0:08.0 · 0:08.0-0:11.5 · 0:11.5-0:15.0 · 0:15.0-0:20.0 |
| 30s | 5 | 0:00.0-0:06.5 · 0:06.5-0:12.0 · 0:12.0-0:17.5 · 0:17.5-0:23.0 · 0:23.0-0:30.0 |
| 30s | 8 | 0:00.0-0:04.5 · 0:04.5-0:08.0 · 0:08.0-0:11.5 · 0:11.5-0:15.0 · 0:15.0-0:18.5 · 0:18.5-0:22.0 · 0:22.0-0:25.5 · 0:25.5-0:30.0 |

The same maps serve both: in a continuous take they are the beats, in a cut build they are the shots.
In every map the **payoff beat is the longest or joint-longest, and no middle beat is longer than the
hook or the payoff** — that is the shape the reels actually have, and it is what lets the last beat
hold.

Any other combination: divide evenly, then give the payoff the longest beat and the hook the next
longest, round to one decimal, and put the rounding slack in the last beat.

---

## One continuous take is the default

**Measured on the 16 reference reels:** they run 8-15 seconds and are **mostly ONE continuous handheld
take**. Cuts are the exception, not the default. Build that way unless the user asks otherwise.

A continuous take is still **timestamped** — the timecodes become **beats inside one unbroken shot**,
not separate shots. Nothing about the timing changes; what changes is that the camera never stops
rolling and the action flows from one beat into the next.

**Cut only when the picture genuinely has to change**, which in this niche means one of two things:

- **The reveal cut, and only if the user asked for a cut build.** Done continuously — the default — the
  camera stays outside the opening and the door swings open inside the take, which is how the reference
  reels do it. If they did ask to cut it: two beats of the closed container, then ONE hard cut to the
  interior already dressed and populated, and everything after it continuous again. Never cut twice
  inside a reveal.
- **A real change of place or vantage** — the scene moves to a different surface, room or camera
  position. Moving to a *tighter framing from the same position* is not a change of place; hold and
  let the action carry it.

> 🚫 **Never write `HARD CUT` between two beats that share a framing and a position.** A cut to an
> identical frame is not a cut — it is a continuous take with a break stamped into it, and a video
> model reads `HARD CUT` as *start something new here*, which is exactly the continuity the build is
> trying to keep. If two beats look the same, they are one shot.

---

## Beat grammar

| Beat | Job |
|---|---|
| **1 · the hook** | The situation legible in the first second — mid-action, a still arrangement with the prop, or a closed container leaking one sliver of fur. Second-longest beat, behind the payoff. |
| **middle** | One clear escalation each — a kitten stands up, reaches, wobbles, a second one copies, the prop tips. One idea per beat, never two. |
| **last · the payoff** | The beat someone screenshots — eyes to camera, the prop won or lost, the whole row standing in a line, or one kitten blissed out with its eyes shut. The longest beat in the build. |

Camera moves the way a phone moves: mostly locked with a faint handheld drift, or one slow push. Never
a crane, never a dolly, never an orbit. When a cut is genuinely needed it is a hard cut, never a whip
pan or a transition effect.

**Inside a continuous take the camera is described once, at the top**, and every beat after that says
what the animals do — not where the camera is, because it has not moved.

---

## The prompt body

**This order is the single authority for what goes inside the block** — `SKILL.md` §Output format
describes the message around it, not the block's contents.

One fenced `text` block, in this order:

1. **Reference line** — only if something is attached, naming what each attachment governs.
2. **Opener** — `A single continuous [duration] photorealistic take with no cuts, [N] beats` by
   default. Only if the user asked to cut it: `A [duration] photorealistic video in [N] shots with
   [N-1] hard cuts`.
3. **Camera and set** — ONE vantage wording from `style-bible.md` §Camera verbatim, ONE of the two
   motion states, and the set named concretely. In a continuous take this appears **once** and no beat
   restates the camera position.
4. **Style block** — verbatim from `style-bible.md`.
5. **Lighting mode** — ONE of the three blocks in `style-bible.md` §Pick ONE lighting mode, verbatim,
   plus the matching grain line. Never omit this and never mix two modes. An enclosure — a fridge, an
   oven, a glovebox, a dishwasher — takes mode A, with the appliance's own bulb as the practical.
6. **Mini rule** — verbatim, ending on the scale anchor.
7. **Cast block** — every kitten named by coat, matching the character sheet when one exists.
7b. **Drift guards** — the blocks from `style-bible.md` §Drift guards that this build actually needs,
   brackets resolved, printed here between the cast block and the shots. The empty-slots variant is
   mandatory at five kittens or more.
8. **PERSON LOCK** — only when the person option is on. **This file is the authority for where it
   goes:** print it verbatim from `you-in-it.md` as its **own fenced `text` block immediately above**
   the prompt block, with the paste-it-back line under it — never inside the prompt block. The prompt
   block itself then carries the staging sentence and the hand scale sentence, not the lock.
9. **The beats** — in a continuous take, each as `0:00.0-0:03.5 —` then what moves and where the
   kittens are when the beat ends. **No beat label, no `SHOT n`, no `HARD CUT`.** Carry the action
   across with a connective: `The camera holds as...`, `Still holding, ...`, `Without cutting, ...`.
   In a cut build only, each as `SHOT n · 0:00.0-0:03.5 — HARD CUT to [a genuinely different framing
   or place]`.
10. **Continuity** — the set, light and cast do not change; every state only moves forward.
11. **Sound** — diegetic only, one cue per beat in beat order.
12. **Negatives** — the single line from `style-bible.md` §Negatives, printed last and unchanged, except
    for the one `No second person in frame.` clause that file adds when a person is in the build.

### Example beat

```text
0:06.5-0:09.5 — Still holding, the orange tabby rises onto its hind legs, front paws lifted loosely in
front of its chest, and stretches toward the rim of the bowl; its back paws shuffle twice to keep
balance. The white longhair watches from the left, head tilting. The beat ends with the tabby's right
paw just touching the rim.
```

No beat label, no camera restatement — the vantage was set once at the top and has not moved, and the
connective carries the action across from the previous beat.

Two beats shown is enough when demonstrating format — then write
`Continue the same structure for the remaining beats.` For a real build, print every beat in full.

---

## Self-check for a video prompt

1. Timecodes contiguous from `0:00.0`, re-added = the chosen duration, no beat under 0.8s, the payoff
   beat longest or joint-longest, and no middle beat longer than the hook or the payoff.
2. Continuous by default: the opener says `a single continuous take with no cuts`, the beats carry no
   `SHOT n` label and no `HARD CUT`, and connectives carry the action across. A cut build only where
   the user asked for one, and then every `HARD CUT` leads to a genuinely different framing or place —
   never to the same framing from the same position.
3. Mini rule and style block present verbatim, and ONE lighting mode named with its grain line.
4. Kitten count stated and identical in every shot; no coat swaps.
5. The camera vantage from `style-bible.md` §Camera is named once at the top of a continuous take (or
   once per shot in a cut build), and every beat states where the action ends.
6. Storyboard path names only frames that exist; single-image path never changes the set;
   character-sheet path states the real location, surface and light in words and keeps the sheet's
   white backdrop out of the scene.
7. Scale anchor present — kittens measured against a nameable object.
8. No captions, no dialogue, no music.
9. Negatives line present and last.
10. Person option on: PERSON LOCK present, one staging named in every shot, the hand scale sentence in
    every shot, attach line names the photo or their sheet plus whatever else is attached.
10b. No square bracket survives anywhere inside the fenced block — every `[N]`, `[prop]`, `[surface]`,
    `[SCALE ANCHOR]` and PERSON LOCK slot carries a real value.
11. Footer closes the response.