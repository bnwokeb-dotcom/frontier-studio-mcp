# Mini Kittens — Storyboard

# Mode 2 — Storyboard

A scene broken into linked image prompts, one per frame. **This mode is optional.** Use it when the user wants to
see and approve the frames before committing to motion, or needs a picture to start the video from —
frame 1 is that picture. A video prompt can also be built straight from a character sheet with nothing
in between, so never treat a storyboard as a step the user has to pass through. Same set, same light, same cast in every
frame — only the action moves forward. The storyboard is what Mode 3 animates.

> Read `style-bible.md` first — every frame carries the style block and the mini rule verbatim.

---

## Intake

**If they already named the scene, skip the menu entirely** — name the archetype it lands in and build.
The menu is only for someone who has not said what they want.

Otherwise ask what they want to see, then immediately print **10 numbered ideas** from
`idea-library.md` — never leave an empty question sitting there.

```
🎬 **Storyboard** — what do you want to see?
```

Then the ten ideas, each `emoji + **Title** — one-line hook`, then the closer verbatim:

```
Type a number, type your own, or type More for fresh ideas.
```

`More` moves to the next batch in `idea-library.md` and never repeats an idea already shown.

**Frame count and cast are defaulted, not asked.** Say it in one line:
`Building this as 5 frames with the 5-kitten lineup — say "3 frames", "8 frames" or a different cast
size and I'll re-cut it.`

If a character sheet exists — attached, or made earlier in this conversation — read it and describe that
exact cast, coat by coat. If not, offer once:
`Want me to lock this cast as a character sheet first, so the same kittens come back in every reel?`

**Offer the "you in it" option once**, in the same batch as the idea pick:

```
🙋 Want to be in it yourself? Attach a photo and I'll write you in with them — or say "kittens only".
```

On yes, `you-in-it.md` takes over the person: read the photo, print the PERSON LOCK, pick one staging,
and put the person in **every** frame so the storyboard matches the video that comes from it. The
attach line then names the photo of themselves.

---

## Frame architecture

| Frames | Beats |
|---|---|
| **3** | hook → escalation → payoff |
| **5** (default) | hook → first move → escalation → the turn → payoff |
| **8** | hook → establish cast → first move → escalation → complication → the turn → payoff → button |

**Frame 1 is the hook.** The whole situation must read in one still with zero setup — the cast, the
prop, the place, all legible at a glance. If frame 1 needs explaining, the scene is wrong; re-stage it.

**The payoff frame is the screenshot.** Eyes to camera, the prop won or lost, the line-up all standing.

**One idea per frame.** A frame that carries two new things reads as neither.

---

## Frames are chained, not generated separately

**This is what makes a storyboard read as one continuous scene.** Five independent text-to-image
generations re-roll the set, the light and every kitten's position five times, and no wording however
precise holds them together. The continuity has to come from the images themselves:

> **Generate frame 1. Then attach frame 1 when you generate frame 2, attach frame 2 for frame 3, and
> so on down the chain.** The previous frame carries the set, the light and the cast forward, so each
> prompt only has to say what changed.

Say it plainly in the handover, because the user has to do it by hand — see §Output shape.

**Because of the chain, frame 1 and the rest are written differently:**

| | Frame 1 | Frames 2 and on |
|---|---|---|
| Job | establish everything | state what changed |
| Length | the full block | short — the reference image carries the look |
| Carries | camera, set, style block, lighting, mini rule, cast, guards, action | a reference line, the action, and the negatives |

Repeating 790 words of identical boilerplate in every frame is what makes them average into five
near-identical pictures with random differences instead of a sequence. The reference image replaces
that boilerplate.

---

## What a frame prompt contains

**Every frame is one standalone JSON object.** Not one object with a `frames` array — separate objects,
each in its own fenced json block, so the user copies one frame at a time into a generator.

The field discipline is taken from the B-roll shot planner in the library; the logic is different.
B-roll covers **one moment from several angles**. A storyboard advances **a story across time**, so two
fields exist here that B-roll does not need: what changed, and what carried over.

### Frame 1 — the STYLE ANCHOR

Frame 1 establishes everything and becomes the anchor every later frame refers back to. **The anchor
defines the look only** — realism, palette, grading, mood, lighting character and the cast's appearance.
It does not fix the composition; each later frame stages its own.

```json
{
  "frame": 1,
  "frame_name": "faces in the roast",
  "camera_angle": "eye_level",
  "framing": "medium",
  "lens_mm": "35",
  "subject": "five mini kittens",
  "action": "all five stand along the near rim of the plate, faces buried in the roast chicken, tails raised",
  "location_cues": "middle glass shelf of a full-size fridge at night, door open, picked-over roast on a white dinner plate, an open ice cream tub either side",
  "lighting": "the fridge's own interior bulb is the only light, the dark kitchen falling to black",
  "scale_anchor": "the full-size ice cream tubs stand taller than their ear tips, and all five together span no wider than the dinner plate",
  "cast": "left to right: cream-and-ginger tabby, grey-blue, black longhair, calico, pure white longhair, each a mini kitten small enough to sit in two cupped hands",
  "prompt_text": "[the full prose frame: the camera vantage wording, the set, the action, the style block, the chosen lighting mode, the mini rule, the cast block and the guards this frame needs]",
  "negative_prompt": "warping, distortion, extra limbs, extra paws, melted or fused paws, warped faces, jitter, heavy motion blur, added lettering or logos"
}
```

### Frames 2 and on — the short form

The attached reference image carries the look, so these carry only what changed. **No style block, no
lighting block, no mini rule, no cast block** — repeating them is what averages five frames into five
near-identical pictures.

```json
{
  "frame": 2,
  "frame_name": "the white kitten breaks off",
  "reference": "the attached image of frame 1",
  "camera_angle": "eye_level",
  "framing": "medium",
  "lens_mm": "35",
  "subject": "five mini kittens",
  "action": "the white kitten pulls its head out of the roast and reaches both front paws onto the rim of the chocolate tub",
  "changed_from_reference": "only the white kitten moves; the other four stay exactly as they are in the attached image",
  "carried_over": "the chicken shreds and torn skin stay where they are, both tubs stay open, the light does not change",
  "prompt_text": "This shot matches the exact visual style of the attached reference image - the same fridge, the same shelf, the same light and the same five kittens in the same order. [then the action and what changed]",
  "negative_prompt": "warping, distortion, extra limbs, extra paws, melted or fused paws, warped faces, jitter, heavy motion blur, added lettering or logos"
}
```

### Field rules

- `camera_angle` — one of `eye_level`, `low_angle`, `high_angle`, `top_view`, `dutch_angle`,
  `over_the_shoulder`, `pov`. Map the skill's vantages onto it: *through the opening* and *surface
  eye-line* are `eye_level`, *adult standing looking down* is `high_angle`, *seated POV with own lap*
  is `pov`, *straight-down overhead* is `top_view`.
- `framing` — one of `establishing_wide`, `wide`, `medium`, `medium_close_up`, `close_up`,
  `extreme_close_up`, `insert_detail`.
- `lens_mm` — a real focal length as a string: `"18"`, `"24"`, `"35"`, `"50"`, `"85"`, `"100"`.
- `action` — present tense, one idea.
- `prompt_text` — frame 1 carries the full prose. Frames 2 and on **open by stating that the shot
  matches the exact visual style of the attached reference image**, then say what changed. That sentence
  is the continuity, and it is what replaces the repeated blocks.
- `scale_anchor` — frame 1 only, containment-first per `style-bible.md` §The scale anchor.
- `negative_prompt` — **short and practical, artefacts only**: warping, distortion, extra limbs, melted
  or fused paws, warped faces, jitter, heavy motion blur, plus added lettering or logos, because a real
  set otherwise grows invented branding. This replaces the long negatives line **in this mode only**;
  the long line still governs video prompts.

### The linked-frame rules

- **The set never changes mid-storyboard.** Same room, same surface, same props, same light direction
  and colour in every frame. A new location is a new storyboard.
- **The kitten count is stated in frame 1** and the reference image holds it after that. At five or
  more, frame 1 carries the empty-slots guard from `style-bible.md` §Drift guards → Empty slots.
- **Coats never swap.** Frame 1 names them left to right; the reference carries it forward.
- **States only move forward.** Spilled stays spilled, wet stays wet — that is what `carried_over` is
  for, and it names those states explicitly in every frame.
- **One new idea per frame.** A frame carrying two new things reads as neither.

---

## Output shape

1. **Title** — `🎬 **[Scene] — storyboard** · [N] frames · [cast size] kittens`
2. **Frame map** — one line per frame: `1 · 🐾 the lineup waits at the door`
3. **One fenced json block per frame**, each under its own heading:
   `## 🖼️ Frame 2 — [what it shows]`
4. **`📎 How to generate this:`** spell the chain out, because it is manual work:
   ```
   1. Generate frame 1 from its JSON. Attach your character sheet if you have one.
   2. Generate frame 2 with frame 1 attached as a reference image.
   3. Keep going — each frame takes the one before it as its reference.
   ```
5. **`💡 Next`** — `Say "video prompt" and I'll turn these frames into a timestamped video.`

When demonstrating the format rather than delivering, print frames 1-2 in full then
`Continue the same structure for the remaining frames.` For a real build, print every frame.

---

## Self-check for a storyboard

1. Frame count = what was chosen; frame 1 reads with no setup; the last frame is a real payoff.
2. **Each frame is its own standalone JSON object** in its own fenced block — never one object with a
   frames array, and never prose.
3. Frame 1 carries the full `prompt_text`, the `scale_anchor` and the `cast`; frames 2 and on carry
   `reference`, `changed_from_reference` and `carried_over`, and do **not** repeat the style block, the
   lighting block, the mini rule or the cast block.
4. Every `prompt_text` from frame 2 on opens by stating the shot matches the exact visual style of the
   attached reference image.
5. `camera_angle`, `framing` and `lens_mm` each hold a value from their allowed list.
6. Same set, same light, same props in every frame; `carried_over` names the states that persist.
7. One new idea per frame; `action` is present tense.
8. `negative_prompt` is the short artefact line, not the long video negatives line.
9. No square bracket survives in any field — every placeholder carries a real value.
10. Person option on: the PERSON LOCK is in frame 1's `prompt_text`, one staging named, the hand scale
    sentence present — `you-in-it.md` §Self-check additions.
11. The handover spells out the chain: generate frame 1, attach it for frame 2, and so on.
12. Footer closes the response.