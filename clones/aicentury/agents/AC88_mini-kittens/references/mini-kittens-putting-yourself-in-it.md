# Mini Kittens — Putting Yourself In It

# The "you in it" option

An **optional** add-on for storyboards and video prompts: the user appears on screen together with the
mini kittens. Off by default. Never forced, never assumed — offered once, then respected.

---

## The offer

Ask it once per build, in the same batch as the build's other question, in **exactly these words** —
this is the canonical wording and every file uses it verbatim:

```
🙋 Want to be in it yourself? Attach a photo and I'll write you in with them — or say "kittens only".
```

It is one line, not a menu, because it rides inside another question's batch and the default is no.

If they say yes but attach nothing, ask once for the photo and hold the build — never invent a person.
If they decline, drop the subject for the rest of the conversation.

---

## Reading their photo

1. **Read the photo first.** Never describe a photo that was not attached.
2. Print a `👀 What I can see` block.
3. **Preserve, never prettify.** Hair length, facial hair, glasses, build, skin tone, freckles, moles,
   scars and the actual clothes all stay. Nothing gets slimmed, smoothed, aged down or restyled.
4. What the photo does not show is written `[trait] not visible in the photo` and asked in the same
   batch — never invented.
5. Several people in the photo: ask which one, describing each so they can point.

---

## The PERSON LOCK

Print it as its own fenced `text` block, above the frames, so it can be pasted back later.

```text
PERSON LOCK — [name or "the person"]

The same real person appears in every shot: [apparent age range], [build], [skin tone], [hair colour,
length and how it sits], [facial hair], [eye colour], [glasses or none], [distinguishing features],
wearing [top, sleeve length, colour and fit] throughout. Hair, clothing and sleeves are identical in
every shot and never change. Only one person is ever in frame.
```

Then, outside the block:
`📌 Keep this lock — paste it back next time and you come back looking the same.`

**Only one person.** Add that line every time: generators otherwise add a second figure at the edge of
frame, or duplicate the face in the background.

---

## Staging — how a full-size person shares a frame with mini kittens

**Pick ONE staging per build** and state it in every frame. Mixing stagings mid-build breaks the scale.

| Staging | What is in frame | Good for |
|---|---|---|
| 🤲 **Palm** | The kittens standing on their open palm, hand held up near the chest | The clearest scale read there is |
| 🚪 **At the opening** | Crouched or standing at an opened fridge, oven, box or door, one hand still on it, the kittens inside | Container reveals — the archetype that performs best |
| 🦵 **Lap** | Seated, kittens standing on the thigh or knee, torso and face above | Cosy, face visible |
| 🍽️ **Table** | Seated behind a table, kittens upright on the tabletop in front | Food and prop scenes |
| 🧎 **Floor** | Crouched or cross-legged, kittens on the floor at their feet | Lineups and group scenes |
| 🐾 **Shoulder** | One kitten upright on the shoulder, head near their ear | Single-kitten reels |
| 🤳 **Own hands only** | Only their hands and forearms enter frame, no face | When they would rather not show their face |

**The hand scale sentence is mandatory** — the hand is the ruler, whichever staging was picked. Write
it as **contact or containment**, never as a side-by-side comparison, per `style-bible.md` §The scale
anchor:

```text
The kitten stands in the middle of the open palm, taking up only the centre of it with a clear margin
of bare skin all around it.
```

**One kitten at a time.** The hand is a ruler per animal, not per group: with four or more the model
keeps them at normal size and the hands become a shelf. With a bigger cast, prove the scale on ONE
kitten in the palm and let the rest be measured against the room.

Without it the kittens inflate to adult-cat size the moment a person enters the frame. State it in
every frame and every shot.

---

## Writing the person in

- **The person is in every frame** by default, so the storyboard and the video agree. If they want to
  appear only in the payoff, that is a one-line variation — say which frames.
- **Describe what the person DOES relative to the kittens**, not just where they are: their hand lowers
  a bouquet toward the lineup, their thumb steadies a kitten's back, they lean in as the kitten reaches
  up. Contact is an action, never a position — otherwise the two never actually touch.
- **Their hands stay their own.** Bare hands, their real skin tone, no gloves, no sleeves changing, no
  extra hand entering frame.
- **Same photoreal treatment for person and kittens.** Neither is softer, glossier or simpler than the
  other; they are lit by the same source in the same room.
- **The person's expression is warm and quiet** — a small smile, looking down at the kittens. Broad
  performed reactions read as stock footage and break the candid feel.

---

## Attaching it in the generator

This is the part that actually makes the person appear, so always spell it out.

| Build | `📎 Attach in the generator:` |
|---|---|
| Storyboard | the photo of yourself — plus the kitten character sheet if you have one |
| Video from a storyboard | the storyboard **and** the photo of yourself |
| Video from a single image | that image **and** the photo of yourself |
| Video from a character sheet | the kitten character sheet **and** the photo or character sheet of yourself |
| Video from scratch | the photo of yourself |

**A character sheet of themselves works in place of a photo** and is often better, because it gives the
model several views of the same face. Read it the same way, build the PERSON LOCK from it the same way,
and name it as `the attached character sheet of the person` so the two sheets never get confused.

Name the references in the prompt the way they are attached, and never name one that does not exist:

```text
Use the attached photo of the person as the look of the person in every shot, and the attached
storyboard for the set, the framing and the kittens: frame 1 governs shot 1, frame 2 governs shot 2.
```

Add one line under the block, outside it:
`Upload both files together in the generator — the photo is what keeps your face consistent.`

---

## Self-check additions when the person option is on

1. The PERSON LOCK is printed as its own copyable block, with the paste-it-back line.
2. Every trait in the lock came from the photo; nothing invented; unknowns asked, not filled.
3. The `only one person is ever in frame` line is present.
4. One staging, named in every frame and shot, never mixed.
5. The hand scale sentence is present in every frame and shot.
6. The person's action toward the kittens is stated as contact, not position.
7. Hair, clothing and sleeves identical throughout.
8. The attach line names the photo plus whatever else is genuinely attached.