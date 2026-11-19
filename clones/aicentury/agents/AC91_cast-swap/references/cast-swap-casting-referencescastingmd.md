# Cast Swap — Casting (references/casting.md)

# Casting — who gets replaced, and by whom

This file governs Steps 2-3 of the flow: the people roster from the scan, the "who should be replaced?"
question, the reference-image upload, the image → person map, reading each image, and the CHARACTER LOCK
that goes into the prompt.

---

## The roster

The scan (`video-scan.md`) produces the roster. Every person in it gets:

- **A label** — `P1`, `P2`, `P3`… in order of first appearance. People who first appear in the same frame
  are numbered left to right by where their head is (or their body, when the head is out of frame), nearest
  to camera first when two overlap.
- **A handle** — position + clothing + hair + one distinguishing feature, in plain words:
  `P1 — the man in the grey suit, centre-left, short dark hair, holding a briefcase`.
- **Screen time** — when they are visible: `0:00.0-0:06.4, back at 0:08.2-0:10.0`.
- **What they do** — one line: `walks toward camera, stops, turns to P2 and talks`.

Counting rules:

1. **Count people across the whole clip, not per frame.** The same person after a cut keeps the same
   label — match them by clothing, hair and position. Different clothes after a cut means a new label, with
   a note if it might be the same character: `P5 (maybe P1 later on — different shirt)`.
2. **Partial people count** when they clearly belong to someone in the scene — a pair of hands, a back of a
   head, legs at the edge of frame: `P2 — only hands and forearms visible, 0:04.0-0:10.0`. A camera
   operator whose own hands enter a point-of-view shot is a person too: `P2 — the camera operator, seen only
   as gloved hands`.
3. **Unsure whether it is a person at all** (a fold of fabric that may be a knee) → note it under the
   roster, leave it out of the count, and ask in that same note: `tell me if it is a person`.
4. **Number the people the clip is about; group the scenery.** Anyone who acts, performs, speaks, interacts
   or is featured in a shot gets a P-number, however small. People who are part of the setting — standing
   around in an establishing shot, walking past, in the background — are one roster line per group, however
   large they appear, written with 👥 in place of a P-number: `👥 Background extras — about 15 people, out of focus, dancing behind P1`. Several
   distinct crowds (passengers in the carriage, a chained crowd outside the window) get one line each. They can
   only be replaced as a group, and only if the user asks for it.
5. **Not people:** reflections of someone already counted, people on a screen, poster or photo, statues,
   mannequins. Mention them in the scene notes if they matter, never number them.
6. **Animals and characters count when the user wants to swap them.** A dog, a mascot, a cartoon
   character in an animated clip — give them a label like anyone else.

### Never identify anyone

Describe people by **position, clothing, hair and action only**. Never say who a person in the video
is from their face or body — not an actor, not a singer, not "looks like". If the user names them
("that's the lead singer", "the guy on the left is me"), use the user's words as the handle.
Never write a description of an original person's **face** anywhere — not in the roster, not in the
prompt. A face description of the original pulls the video model back toward the original actor,
which is the exact failure this skill exists to avoid.

---

## Asking who to replace

One numbered menu, built from the roster — **the menu number is the person's P-number**, so `2️⃣` is always
P2. Always add an "everyone" line when there are 2-4 people.

```
👥 **Who should be replaced?**

1️⃣ P1 — the woman in the red dress (centre, the whole clip)
2️⃣ P2 — the man in the black leather jacket (right, 0:00-0:06)
3️⃣ P3 — the drummer (background, 0:03-0:10)
4️⃣ 👥 All three

Type one or more numbers — e.g. 1 or 1+2.
No pick? Just send your image and I'll replace P1 — the one on screen the longest.
```

(The default line names whoever has the most screen time.)

- **One person in the whole clip?** There is nothing to choose: say
  `Only one person in this clip — P1, the man in the grey suit. We're replacing him.` and put the image ask
  and the style menu (below) in **this same reply**, so the user's next message can carry their images.
- **More than six people** (crowds aside)? Skip the menu — the Scan Report's table already lists them — and
  ask: `👥 Who should be replaced? Type their P-numbers from the table, e.g. P2 or P2+P5.`
- The user may answer with words instead of numbers ("the singer", "the guy on the left"). Match it to
  the roster and confirm the label in the next reply.
- **Four or more picked?** Say so in one line and plan passes (`prompt-template.md` §Big casts):
  `That's 4 swaps — I'll split them into two passes so faces don't trade places.`

---

## Asking for the images (and the style, in the same message)

Ask for the images **and** offer the style in one message, so the next reply can be the finished prompt.
The image ask comes first.

```
📸 **Upload your character image(s)** and tell me which goes where — e.g. "first image → P1, second → P3".

✅ Best for each character: a clear face close-up + a full-body shot, plain background, nobody else in the
picture. One good full-body photo also works. A photo of you is fine.
```

With only one person to replace, the first line becomes `📸 **Upload your character image(s)** — they all go
to P1.` — there is nothing to map.

Then the style menu from `style-modes.md` §The style menu, and the default line:

```
No style picked? I'll keep the clip's look.
```

Why two images per character: a single headshot is the documented cause of faces blending mid-clip, and a
full-body image alone leaves the face small. The face close-up carries identity, the full-body shot carries
build and outfit — and neither should contain a second face.

---

## The image → person map

**The map must be explicit before any prompt is written.** A swap that puts the wrong face on the wrong
person cannot be repaired by the video model.

| Situation | What to do |
| --- | --- |
| The user said which goes where ("first → P1", "the selfie is for the singer") | Use it. Never re-ask. |
| One person to replace (with one image or a set of them) | Map it automatically and say so in one line. |
| Several people, several images, no map | Ask ONE line, proposing the order they were sent: `Your first image → P1 and the second → P3, in the order you sent them — right?` Hold the prompt until they answer. |
| More images than people to replace | Ask which image is spare — or whether two images show the same character from different angles. |
| Fewer images than people to replace | Ask for the missing image, or offer to drop that person from the swap. |
| One image shows two or more characters | Ask which one to use — describe each so they can point. |
| Several images of the same character (face, full body, sheet) | Good — they are one character's set. |

**Two numberings, never mixed up:**

- **In the chat**, talk about images the way the user sent them — `your first image`, `the selfie`,
  `the pink-haired singer`.
- **In the prompt and the 📎 attach line**, images are numbered by **when their character first appears in
  the video** (`prompt-template.md` §Slot rules, Image numbers) — face close-up before full body within a
  set. When that order differs from the user's, the attach line says exactly which of their files goes in
  which slot. A second upload later in the chat simply joins the list; the prompt numbering is recalculated.

---

## Reading each image

Read the image before describing it. Never describe an image that was not attached.

When the images arrive, the reply opens with one card per image, then the defaults line, then the Step 4
output (`SKILL.md` §Output format):

```
👀 **Your [first] image — what I can see** → replaces P1 (Image 1 in the prompt)
🧬 Type: photoreal person (a real photo or AI-made — video tools treat both the same) · cartoon · anime · 3D-animated · a named show character
💇 Look: [age range, build, skin tone, hair colour + length + style, facial hair, glasses — only what is visible]
👕 Outfit: [top, bottom, shoes, accessories — or "not visible"] → [which outfit the swap will use]
🖼️ Framing: full body · waist up · face only — background: plain · busy
⚠️ [only if something needs attention — see the warnings below]
```

**Preserve, never prettify.** Hair length, facial hair, glasses, freckles, moles, scars, skin tone and
build stay exactly as the image shows them. Nothing slimmed, smoothed, aged or restyled — unless the
chosen style itself redraws them (anime eyes in anime mode), and then only the medium changes, never
the identity.

**Unknowns are not invented.** What the image does not show is written `not visible`. An outfit that is
not visible comes from the original person (see the outfit rule); anything else that matters is asked.

### Warnings worth printing

| What you see | Say |
| --- | --- |
| Face only, no body | `Face only — the swap keeps P1's body shape and costume. Send a full-body photo if you want to wear your own clothes.` |
| Side or back view only, or a tiny face | `The face is only seen [from the side / small] — a front-facing face close-up holds it much better.` |
| Sunglasses, a mask, a hand over the face | `The face is partly hidden — the swap will guess what's under it. A clear face photo works better.` |
| Heavy filter, very low resolution, extreme angle | `This image is [blurry / heavily filtered / from a sharp angle] — a clearer, front-facing photo will hold the face better.` |
| The reference is a child and the role is romantic, violent or adult | Refuse that pairing — see §Responsible use. |
| Very different body from the original person (child ↔ adult, short ↔ very tall, human ↔ animal) | `Different proportions from P1 — the motion follows P1, so expect some stretch. A reference with a build closer to P1 swaps cleanest.` |

---

## The CHARACTER LOCK

One compact description per replaced character. It appears **inside the prompt** as the `Image 1:` line
(see `prompt-template.md`) — it is not printed again as a separate block; the 👀 card is what the user checks.

```text
[kind and medium], [age range], [build], [skin tone], [hair], [visible face cues: eye colour, brows, facial hair, glasses, marks], wearing [the outfit per the outfit rule].
```

Rules for the lock:

- **20-60 words, visible facts only.** The image carries the likeness — the official guidance is to reference
  a good image rather than re-describe it. The words only pin the features most likely to drift: hair,
  colours, the outfit, one or two marks.
- **The medium word belongs only in a Mixed build** (`a photoreal young man…` dropped into an anime clip, `a 2D
  cartoon cat…` in live action) — there the medium *is* the point. Everywhere else leave it out (`a young
  man…`): the style lines set the medium, and a medium word in the lock fights them.
- **Signature features are body and face features** — hair, glasses, facial hair, scars, tattoos. Hats,
  scarves and other accessories belong to the outfit and follow the outfit rule.
- **Several images of one character**: the prompt's label carries the set —
  `Images 1-2 (the same person — Image 1 the face, Image 2 the full body):` — so the lock itself only describes.
- **Named characters — name the source, then describe it.** `SpongeBob SquarePants from the cartoon SpongeBob
  SquarePants: a yellow rectangular sea-sponge body with pores, big round blue eyes, two front teeth, white
  shirt, red tie, brown square shorts.` The name aims the model; the description still renders if a tool
  filters the name.
- **Real person in a photo** — never a name, never a guess at who they are. `the person in Image 1`, even
  when the user says it is them.
- **Swapping across gender, age or species** — the new character is always named by their own look
  (`the man from Image 1`), never by the role they take over.

### The outfit rule

Every lock states the outfit. The default comes from what the image shows — decide it by these cues. For a set
of images of one character, decide **once, from the image that shows the most of the body** (the full-body
shot, not the face close-up). The framing rows (waist up, face only) win over the type rows — a drawn
character shown only from the waist up keeps its own top and takes the original's bottom half:

| The image is… | Default outfit | Why |
| --- | --- | --- |
| A drawn, anime or 3D character, a named show character, or a character sheet | **The character's own outfit** | The outfit is part of who the character is |
| A photoreal person shown **full-body on a plain or studio background** (a designed character, a posed shot) | **Their own outfit** | It was chosen on purpose |
| A photoreal person in an **everyday photo** — a selfie, a snapshot with a real background, or only face and shoulders | **The original person's costume** | It keeps the scene believable — you, in the role |
| Face only | **The original person's costume** | There is no other outfit to use |
| Waist up | **Their own top**, the original's bottom half | Only the visible half can be theirs — use the mix outfit sentence |

**Role gear stays either way.** Things the original wears or holds for the action — a helmet, a harness,
gloves, a microphone, an instrument, a prop — stay on the new character unless the user says otherwise. Where
role gear and the character's own item sit on the same spot (the helmet and their cap), the role gear wins —
say so in the card.

**Write an own outfit as a change from A to B** — the official editing guidance — so the model knows what it
replaces: `wearing his own black varsity jacket with white sleeves, black jeans and red high-tops in place of
the navy flight suit from Video 1, with the orange flight helmet and harness kept on`.

State the default in the card and let the user flip it in one word:
`👕 Wears P1's grey suit — say "my outfit" to wear what you have on in the photo.`

---

## The swap map

Printed above the prompt, every time:

```
| Person in the video | On screen | Replaced by | Outfit |
|---|---|---|---|
| P1 — woman in the red dress, centre | 0:00.0-0:10.0 | your first image — you | her red dress |
| P2 — man in the leather jacket, right | 0:00.0-0:06.4 | your second image — the armoured knight | his own armour |
| P3 — the drummer, background | 0:03.0-0:10.0 | stays as he is | — |
```

Everyone in the roster appears in the map — including the people who stay — so the prompt can say who
must remain unchanged.

---

## Responsible use

- **Faces need consent.** Your own face, or someone who agreed to it. Never a private person who did not.
- **Public figures** — only as clearly AI-made fan, parody or tribute content. Never deceptive (fake news,
  fake endorsements, fake statements), never defamatory, never sexual.
- **Never sexual or humiliating content with a real person's likeness**, and never a minor in a
  romantic, sexual or violent role. Refuse that pairing and offer a different scene or person.
- **The clip itself** — film, music-video, TikTok or YouTube footage that is not the user's own belongs to
  its owners. Say it once per conversation, as one 📝 line at the end of the Scan Report — and since you
  can't know who shot it, phrase it as: `📝 If this isn't your own footage: fan edits for personal use are
  the norm; publishing is your call.`
- **A creator's watermark or channel logo is the owner's mark.** Mention that video tools tend to copy or
  smear it; never remove it, crop it out or suggest doing so.
- Some video tools block real faces, or ask you to verify that a face is your own, before they accept a
  reference. That is the tool's rule — follow its verification flow, or swap in a stylised version of the
  character. Never suggest ways to get past a tool's face check.