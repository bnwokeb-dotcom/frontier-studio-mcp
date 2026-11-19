# Environment Maker — Style Bible (references/style-bible.md)

# Style bible — the locked blocks

This file governs every build in every mode: the blocks that go into the sets word for word, the
world line, the negative line, the chain and placement wording, the people-calling words and the
drift guards. Read it before writing any set.

> Locked blocks are pasted verbatim. Paraphrasing one is the most common way a set of five drifts
> apart. Only the `[slots]` change: `[LOOK IN WORDS]` and the world line are filled once per build
> and reused identically in all five sets (a requested mood-variation set has its own world line);
> `[EXTRAS]` is filled per set.
> Snapshot: researched 2026-10-12 (`assets/research/01 Environment Plates on Nano Banana.md`); not
> render-tested yet.

---

## 🔒 The match block — when the user picks 🎯 Match my character

It opens every `prompt_text`. It asks for a **new** image of an **empty place**, states that the
place matches the exact visual style of the attached image, and writes the look out in words, so
the prompt still works if the image is left out.

### One image

```text
Create a new image of an empty place in the exact visual style of the attached reference image, using it only as a style reference: take its rendering, level of realism or stylisation, line, texture and colour treatment, and show a completely different scene from a new viewpoint, lit the way that place is lit. Written out, the look is [LOOK IN WORDS].
```

### Several images

```text
Create a new image of an empty place in the exact visual style of the attached reference images, using them only as a style reference: take their shared rendering, level of realism or stylisation, line, texture and colour treatment, and show a completely different scene from a new viewpoint, lit the way that place is lit. Written out, the look is [LOOK IN WORDS].
```

Several pictures of **one** character (front, side, back) count as one image for the 👀 card, but
the plural block is used because several images are attached.

### `[LOOK IN WORDS]` — one phrase of 15-35 words, written once from the 👀 card

- **Medium first**, then line and edge, shading and texture, and colour treatment. No light — the world line gives the place its light.
- **A drawn or animated character** → the background side of that look. Scenery around such a
  character is painted, softer, less outlined and lower in contrast than the character:
  `a hand-painted anime background with soft painted edges, smooth cel shading and warm pastel colour`.
- **A photo** (a selfie, a studio shot, a realistic render) → realism, grade and grain only:
  `photorealistic cinematic photography with true-to-life materials, a natural colour grade and fine grain`,
  or for a clean studio shot `crisp, clean photorealistic photography with true-to-life materials and a natural colour grade`.
  Never light, depth of field, the camera, the studio backdrop or the costume colours.
- No time of day, no weather, no place — those belong to the world line.
- Never the character: no face, hair, clothing, pose or name. No studio, artist or show name.

---

## 🔒 The empty block — every set, by default

```text
The whole place is empty, deserted and completely still, every space in it unoccupied, with no one in the frame and no lettering anywhere.
```

Emptiness is written as a feature of the place, with one short clause for the two things that
must stay out. "Film still" and "movie" words invite a person in unless this block is there.

---

## 🔒 The extras block — only when the user asks for people

It replaces the empty block.

```text
Small in the background, in the same look and light as the place: [EXTRAS]. The place stays the subject, with no lettering anywhere.
```

**`[EXTRAS]`** — filled **per set**, with the people who belong in that spot:
- A number and a ceiling when they are few: `exactly three ground staff and no more`.
- The area they fill when it is a crowd: `a crowd filling the far stands`.
- A mix: `exactly two sentries at the far gate and one carter beside his cart, and no more`.
- Never in the open spot the room sentence keeps clear.
- When the requested people do not belong in a set (a match crowd in the dressing room), use the
  people who would be there (`Exactly two kit staff and no more`) or keep that set empty, and say
  which in the defaults line.

---

## 🔒 The world line — identical in all five sets (except a requested mood-variation set)

One sentence, written once per build:

```text
[Time of day], [weather and its traces, worded to read indoors and out], lit by [main light: source, direction and colour] [with any secondary light], in a palette of [three or four colours], with [two or three materials that recur everywhere].
```

`Late afternoon under drifting high cloud, lit by low white sunlight from the left with cool floodlight spill, in a palette of grass green, concrete grey, white and deep red, with weathered concrete and red-painted steel throughout.`

- **It must read right indoors and out.** A mostly indoor world: `rain falling outside and
  glistening on every open surface`, `mist beyond the windows and openings`. A mostly outdoor world:
  `rain falling and glistening on every surface`. Never a sky in a windowless room; the traces (wet
  paving, puddles, reflections) stay with the weather here.
- **No sky** (space, underwater, underground): use the place's own cycle and what shows beyond its
  openings — `the station's night cycle, stars and the blue curve of a planet beyond every viewport`.
- **Weather words** — rain, snow, snowy, fog, foggy, mist, wet, frosted, stormy, sunny — live here
  and in `lighting` only. A place whose name carries one (`a snowy village`) may keep it in
  `environment` too.
- **Weather words live only here and in `lighting`.** Set and layout sentences carry none, so a
  mood change never leaves a stale word behind.
- **The materials clause** is what makes five rooms read as one world: name two or three that
  recur in every set.
- **Match mode, drawn character:** the light family (warm or cool, soft or hard) and the palette
  come from the upload; the time and weather the user asks for win over it.
- **Match mode, photo:** the place owns its light and palette — what that place naturally looks
  like — never the studio light or the white backdrop, and the costume colours never lead the
  palette (a colour the place naturally owns may stay).
- **An own-palette style** (`style-library.md` marks the styles that set their own palette and light): name
  the time, the weather, the light's source and direction, and the materials — no colour words, no
  palette.
- **One light only** for styles whose block names a single motivated source (Painterly 3D,
  Photoreal Cinematic): leave out the secondary light. Glowing props and screens that belong to the
  place are part of the place, not a second light.
- **A mood change** writes a new world line and keeps everything else.
- **A mood-variation set** (only on request) is the one set allowed its own world line.
- The `lighting` field of each set is a short note taken from this line, never a second light.

---

## 🔒 The negative line — the `negative_prompt` field

Empty sets:

```text
people, figures, text, lettering, logo, watermark
```

Sets with extras:

```text
duplicate people, extra limbs, text, lettering, logo, watermark
```

None of the user's image tools has a negative-prompt field (`tool-notes.md`), and the user pastes
`prompt_text` only. The key stays because the JSON format has it; it never grows into a list of
qualities.

---

## 🔒 The chain blocks — for "chain the set" (Step 4)

Once the user has rendered the first set of the latest build, the other four use that image as the
location reference, so the world
holds together better than words alone can manage. Chain and placement act on the **latest
build**: its first set is the reference, and `[reference set name]` is that set's
`background_name` in lower case. Lines shown to the user print the real set numbers.

**A style from the list** — the style block first, then this line straight after it:

```text
The attached image of the [reference set name] is the location reference for this world: keep its materials, palette and light, and let its architecture continue into a different part of the same place.
```

**Match mode** — this block replaces the match block (the reference render already carries the
character's look, so only that image is attached):

```text
Create a new image of an empty place in the exact visual style of the attached image of the [reference set name]. Show another part of this same world: keep its rendering, palette, light and materials, and let its architecture continue into a different part of the same place, seen from a new viewpoint. Written out, the look is [LOOK IN WORDS].
```

The user attaches the **empty** render of the reference set — never one with a character placed
in it — made with the latest world line. "Chain the set" counts as confirmation that it is
rendered.

---

## 🔒 The placement prompt — for "put my character in" (Step 4)

A separate prompt, not a set: it places the user's character into one finished set. Printed under
its own heading, in its own `text` block.

```text
Using Image 1 as the scene, place the character from Image 2 — [CHARACTER BY VISIBLE TRAITS] — [EXACT SPOT], [POSE AND GAZE]. Keep everything in Image 1 unchanged: the same framing, camera angle and background. Keep the character's face, hair, outfit and proportions from Image 2, with any logos simplified to plain shapes, leave Image 2's own background behind, and render the character in the same look as the scene, lit by the scene's own light from the same direction, with matching contact shadows, scale and perspective.
```

- `[CHARACTER BY VISIBLE TRAITS]` — what the upload shows, in plain words and at most 15 words
  (`a young man in a black varsity jacket with white sleeves and a black cap`): no name, no file
  name, no brand.
- `[EXACT SPOT]` — the set's open spot from its room sentence (`standing on the open stretch of
  floor in the centre foreground`). A set with no room sentence (an overview or a detail): the
  nearest clear ground, or suggest a standable set in one line.
- `[POSE AND GAZE]` — the user's words, or a calm default (`facing the camera, looking slightly
  past it`).
- No set named → the first set of the latest build. Several characters → the first one shown; a
  main subject in front of bystanders → the main subject; props in hand are kept unless the user
  says otherwise.
- An upload showing only the head and shoulders, placed into a wide set → one line suggesting a
  full-body picture, because the tool has to invent the rest.
- An upload showing only a profile or the back → keep the pose at that angle (`seen in profile,
  looking across the room`), or suggest a front picture in one line.
- Ask for the image with `🧍 Upload your character image, and have your render of set [N] ready — I'll write the prompt that places them in it.`, then the footer.
- **Notes:** at most three lines under the prompt, in this order — who (several characters,
  bystanders, props), the picture (crop or angle), the look (repainted in the set's look). Merge
  what you can.
- A character in another look (a photo into an anime set) is repainted in the set's look — say so
  in one line.

Attach line: `📎 Attach: Image 1 = your render of set [N] · Image 2 = your character. Set the image size to match your set.`

---

## People-calling words

Keep these out of every field of an empty set — `prompt_text`, `scene_purpose`, `location_cues`
and `background_name` included, because the user may paste a whole block. Whole words only
(`cast-iron` and `cast shadows` are fine). The exceptions: the locked negative line, the locked
empty block's `no one in the frame`, the fixed `camera_angle` value `over_the_shoulder`, and a role
word that names a room or a thing rather than a person in it (`the captain's cabin`, `the
sheriff's office`, `an American diner`, `a record player`, `a guard rail`):

`actor`, `hero`, `character`, `the cast`, `player`, `fans`, `audience`, `crowd`, `guests`, `staff`,
`visitor`, `passenger`, `pedestrian`, `shopper`, `customer`, `diner`, `chef`, `cook`, `keeper`,
`shopkeeper`, `guard`, `student`, `patient`, `crew`, `worker`, `people`, `person`, `walk-out`,
`portrait`, `figure`, `ghost`, `spirit`, `phantom`, `silhouette`, `someone`, `shoulder`, `hands`.

Describe the moment through the place instead: `the threshold between the dressing room and the
pitch`. A haunted place is eerie through light, mist and objects — a rocking chair, a guttering
lamp, a door ajar — never through a presence.

**Busy places.** "A busy city" or "a bustling market" in an empty set: the set's own space stays
empty, and the life shows at a distance — traffic far below, lit windows, steam, strings of
lanterns. Say this reading in the defaults line and offer extras in 💡 Next.

---

## 🧯 Drift guards

| What drifts | The one-line counter |
| --- | --- |
| A person appears in an empty set | The empty block is there, and no people-calling word is left in any field |
| The uploaded character appears in a match set | The match block asks for a new image of an empty place; if it persists, paste without the image (`fixing-a-set.md`) |
| Match mode copies the photo's studio light or costume colours | `[LOOK IN WORDS]` names realism, grade and grain only — never light; the world line gives the place its own light and palette |
| The look changes from set to set | The same look block, world line and materials, word for word (a requested mood-variation set excepted); one tool for all five |
| Signs, screens and banners fill with garbled lettering | Name them as plain shapes and colour: `plain deep red banners`, `plain dark wooden panels`, `dark screens` — never over a door, on a fascia or at an entrance |
| The five sets look alike | `set-builder.md` §Variety rules |
| Nowhere for a character to stand | The room sentence, eye level, sharp focus throughout (the miniature styles: a high angle and their own focus) |
| Match-mode scenery comes out outlined like the character | `[LOOK IN WORDS]` describes the painted background side of the look |

---

## Self-check for the locked blocks

1. Every set opens with the same look block — the match block or a style block — word for word;
   in a chained set, the four chained sets follow the chain order for their mode.
2. `[LOOK IN WORDS]`, the world line and the negative line are identical in all five (a requested
   mood-variation set has its own world line).
3. The empty block is in every empty set; the extras block, filled per set, only where the user
   asked for people.
4. No people-calling word in any field of an empty set.
5. For an own-palette style, the world line carries no colour words.