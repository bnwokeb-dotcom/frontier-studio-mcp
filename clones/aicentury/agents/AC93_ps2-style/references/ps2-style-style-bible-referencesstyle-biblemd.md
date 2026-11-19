# PS2 Style — Style Bible (references/style-bible.md)

# Style bible: the PS2 game look, locked

This file governs every block that is pasted verbatim into a PS2 Style prompt: the image look blocks, the video opener, the closing lines, and the rules for what may be attached.

> Blocks A and B, the image closing line and the video opener and closer come from the user's own Rotterdam build (2026-11-11); shots 3, 4 and 5 came out right first time with exactly this wording. Blocks C, D and F, the reference lines and the Free Style video look line are built from that same wording but are **not render-tested yet**. Paste every block word for word; only the slots in `shot-prompts.md`, `free-style.md`, `character-sheet.md` and `environment.md` change.

**Which concept uses what:** 📼 Nostalgia uses blocks A to D and the 2-second video opener. 🕹️ Free Style uses blocks F and D, the reference lines and the Free Style video look line. Both use the closing lines, landmarks in words, the text rule and the drift guards.

---

## The look in one sentence

**A real city as a 2000s open-world PlayStation 2 game: low-poly models, simple blocky characters, soft blurry low-resolution textures, flat simple game lighting, slightly washed-out warm colours, low contrast and a soft haze.** Blocky and blurry beats crisp and smooth, every time. When two versions come back, the more "PS2" one wins.

What it is not: a modern game render, a photo, a cartoon, pixel art or a toy.

---

## Image block A: recreate the template (the default)

Use when the user attaches **one** template frame and no look examples. Paste verbatim:

```text
Recreate the reference image as closely as possible: the same camera position and angle, framing, lens, composition, subject size and placement, time of day, weather, lighting, color grading, haze, and exactly the same video game graphics style (a 2000s open-world game like GTA San Andreas / early GTA IV: low-detail character models with simple faces, low-resolution textures, simple geometry, real-time game lighting). Only change the location and the details listed below, so it is set in [CITY], [COUNTRY]. It must still look like a screenshot from that same game, not a photo and not a modern render.
```

For a Nostalgia subject that is not a place (a game, a film, an era), `[CITY], [COUNTRY]` together become the subject's setting (`a big floodlit football stadium`), the rest of the block unchanged.

---

## Image block B: template plus look examples

Use when the user attaches a template frame **and** two look examples (frames that already have the right look, ideally their own approved shots). This is the look paragraph of the Rotterdam water taxi, version 3, the shot that fixed the leak. Paste verbatim:

```text
Image 1 is the composition template: recreate its camera position and angle, framing, lens, subject size and placement. Images 2 and 3 are finished frames from the same video and show the exact game graphics style this image must match: a 2000s open-world game like GTA San Andreas, with low-poly models, simple blocky characters, soft blurry low-resolution textures, simple flat game lighting, slightly washed-out warm game colors, low contrast and a soft haze. Do not copy any content from images 2 and 3, only their look. Avoid any photorealism: no realistic water or skin, no fine detail, no crisp modern rendering.
```

With only one look example, paste this form instead:

```text
Image 1 is the composition template: recreate its camera position and angle, framing, lens, subject size and placement. Image 2 is a finished frame from the same video and shows the exact game graphics style this image must match: a 2000s open-world game like GTA San Andreas, with low-poly models, simple blocky characters, soft blurry low-resolution textures, simple flat game lighting, slightly washed-out warm game colors, low contrast and a soft haze. Do not copy any content from image 2, only its look. Avoid any photorealism: no realistic water or skin, no fine detail, no crisp modern rendering.
```

Block B carries no city, so its first swap sentence names the place: `Set it in [place] in [City], [Country]: …` or `Instead of [the template's subject] in image 1: …` as the water taxi did, with the city named in that sentence.

---

## Image block C: no template (words only)

Use only when the user has no frame to attach. The camera has to be written out in full because nothing else carries it. Paste verbatim, then the scene:

```text
A screenshot from a 2000s open-world video game like GTA San Andreas, set in [PLACE]: low-poly models, simple blocky characters with simple faces and stiff poses, soft blurry low-resolution textures, simple geometry with straight edges, flat simple real-time game lighting, slightly washed-out warm game colors, low contrast and a soft distance haze. It looks like a game, not a photo and not a modern render.
```

Block C is not render-tested yet (the user's build always had a template). Say so in one line on the first block-C shot of a chat, once, not on every shot, and recommend a template frame.

`[PLACE]` is the city and country, or the setting of the Nostalgia subject when it is not a place (`a big floodlit football stadium`, `a 2000s suburban street in summer`). With block C there is no keep line: the camera sentence comes first in the scene (`shot-prompts.md` §The image prompt).

---

## Image block D: continue from my image (look example, no template)

Use when the user attaches one or two images they already made in this look and wants the next shot, with no trend screenshot for it. Their image carries the look; the camera is written in words. It is block B's look-example wording with no composition template, so it is **not render-tested yet**: say so once. Paste verbatim (with one image, write `Image 1 is a finished frame` / `from image 1` / `its look`):

```text
Images 1 and 2 are finished frames from the same video and show the exact game graphics style this image must match: a 2000s open-world game like GTA San Andreas, with low-poly models, simple blocky characters, soft blurry low-resolution textures, simple flat game lighting, slightly washed-out warm game colors, low contrast and a soft haze. Do not copy any content from images 1 and 2, only their look. Make a new shot set in [PLACE]. Avoid any photorealism: no realistic water or skin, no fine detail, no crisp modern rendering.
```

With one image, paste this form:

```text
Image 1 is a finished frame from the same video and shows the exact game graphics style this image must match: a 2000s open-world game like GTA San Andreas, with low-poly models, simple blocky characters, soft blurry low-resolution textures, simple flat game lighting, slightly washed-out warm game colors, low contrast and a soft haze. Do not copy any content from image 1, only its look. Make a new shot set in [PLACE]. Avoid any photorealism: no realistic water or skin, no fine detail, no crisp modern rendering.
```

`[PLACE]` is the city and country in 📼 Nostalgia, or the place of the user's scene in 🕹️ Free Style. Like block C, there is no keep line: the camera sentence comes first in the scene. It ends with the full A/B closing line (the attached images are references).

If the user also attaches a trend screenshot for the new shot, use block B instead: the screenshot becomes image 1 and their images become images 2 and 3.

---

## Image block F: Free Style (any scene, any place)

Use for 🕹️ Free Style shots: the user's own idea, a real or made-up place, any time. The camera is written in the scene. Paste verbatim, then the scene:

```text
A screenshot from a 2000s open-world video game like GTA San Andreas: low-poly models, simple blocky characters with simple faces and stiff poses, soft blurry low-resolution textures, simple geometry with straight edges, flat simple real-time game lighting, slightly washed-out warm game colors, low contrast and a soft distance haze. It looks like a game, not a photo and not a modern render.
```

When the scene is in a real place, the scene names it (`on a beach in Ibiza, Spain`). Block F has no keep line: the scene opens with the camera. It ends with the block-C closing line, or the full A/B closing line when reference images are attached.

---

## The reference lines: a character sheet and an environment

Paste these right after the look block (any block) when the user attaches their character sheet or an environment from this skill. Number the images in upload order, after any template and look examples.

```text
Image [N] is the character sheet: the [subject in the scene] is this exact character, with the same face, hair, build and outfit, in the same game look.
```

```text
Image [N] is the environment: set the shot in this exact place, from the camera described below.
```

With two characters, one character line each, and the scene names each one by their outfit.

---

## The Free Style video look line

The first lines of every 🕹️ Free Style video prompt (5 to 15 seconds). Paste verbatim, with the duration filled:

```text
Create a [DURATION]-second video in the look of a 2000s open-world PlayStation 2 game like GTA San Andreas: low-poly models, simple blocky characters with simple faces and stiff poses, soft blurry low-resolution textures, flat simple game lighting, slightly washed-out warm game colors, low contrast and a soft haze. It is a game scene, not a realistic video, and every shot keeps this exact look.
```

And its closing line, unchanged:

```text
Avoid: zooming or pushing in, new objects appearing out of nowhere, morphing faces or bodies, changing the buildings, photorealism, extra text, style drift.
```

For one continuous take, this form instead:

```text
Avoid: zooming or pushing in, cuts, new objects appearing out of nowhere, morphing faces or bodies, changing the buildings, photorealism, extra text, style drift.
```

---

## The image closing line: sanctioned

Every image prompt with a template (blocks A and B) ends with this line, unchanged. The template frames come from someone else's trend video and carry its caption, so the first sentence is load-bearing:

```text
Remove any caption or text from the reference. No text, no captions, no UI, no HUD, no readable signs, no logos, no badges, no watermark.
```

With block C there is no reference, so it ends with the same line minus its first sentence:

```text
No text, no captions, no UI, no HUD, no readable signs, no logos, no badges, no watermark.
```

Every image prompt also opens with `Full frame, no borders.` on its own line.

---

## The video opener: sanctioned

Every 📼 Nostalgia video prompt opens with this block, unchanged (Free Style and Promo use §The Free Style video look line):

```text
Animate this exact start image as one continuous 2-second shot with no cuts. Keep the exact same 2000s open-world video game graphics look as the start image the whole time: the same low-poly models, simple blocky characters, soft low-resolution textures, colors and lighting. It is a game scene coming to life, not a realistic video.
```

When the user chose a longer clip, change only `2-second` to the chosen length.

## The video closing line: sanctioned

Every 📼 Nostalgia video prompt ends with this line, unchanged:

```text
Avoid: zooming or pushing in, cuts, new objects appearing, morphing faces or bodies, changing the buildings, photorealism, extra text.
```

**The sanctioned negatives, all of them:** the look clauses inside blocks A, B, C, D, F and the panel paragraph; the image closing line and its block-C form; the Nostalgia video opener and closer; the Free Style video closing line and its one-take form; the character-sheet closing line (`character-sheet.md`); the Free Style sound line (`free-style.md`); and the Promo logo closing line (`promo.md` §The product line). Never add another. A `Replace X with Y` sentence is a swap, not a negative, and `plain, without any badge or text` on shirts and flags is a description of the clothing, allowed in the scene.

---

## Landmarks in words

**Describe every landmark by its shape, never by attaching a photo of it.** A real photo pulls the whole image towards photorealism and the game look disappears. Photos of the place are for the user to learn what it looks like, not for the generator.

Write a landmark as geometry and colour a low-poly model could carry, in one or two clauses:

| Landmark (from the Rotterdam build) | Written as |
| --- | --- |
| Erasmus Bridge | one tall white pylon with a clear kink partway up, leaning back, a fan of white cables down to a long low deck |
| Cube Houses | tilted yellow cube-shaped houses balanced on their corners on top of hexagonal concrete pillars |
| Markthal | a giant horseshoe-shaped arched market hall, the whole curved ceiling one enormous colorful mural of oversized fruit, vegetables, flowers and insects with rows of small square windows in it |
| De Kuip | a steep oval stadium: two rings of stands, the upper ring overhanging the lower one, a ring-shaped roof with white steel lattice trusses underneath, tall floodlight masts in the corners |
| Hotel New York | the historic red-brick hotel with green copper roof towers at the tip of a pier |

The landmark's name may appear once next to its description (`the Erasmus Bridge (one tall white pylon …)`); the description does the work. Two exceptions, describe only, no name:

- **A name that carries a brand, club, sponsor or living person** (a stadium named after a company, an arena named after a player). Landmarks named after historical figures (the Erasmus Bridge) may be named.
- **After a text complaint**: real place names can pull real signage into the image, so a fix drops every proper noun except the city.

**Landmarks outside this table:** write only the two or three features you are sure of (overall shape, colour, one signature detail), never a guessed detail, and say in one line outside the prompt which features you used, so the user can correct them. If the user describes the landmark, their description wins.

**The user's city is the trend's own city:** the template frames already show it, so block A would copy them unchanged. Swap in a different landmark of that city for each shot and say so in one line.

---

## Look examples: what may be attached as image 2 and 3

- **Best: the user's own approved shots** from the same reel. They carry the look and nothing else.
- **A frame from the trend video only if it shows no recognisable landmark.** A bridge, tower or palm tree in a look example leaks into the new image (the Rotterdam water taxi grew a Buenos Aires bridge and palm trees until the look examples were swapped for approved Rotterdam shots).
- **Never a real photo**: see Landmarks in words.

---

## No text, no logos, no club names

The generator cannot write and a wordmark is a brand copy. Football clubs, shops and teams become **colours and shapes**: `every fan wears a shirt split vertically, one half red and one half white, plain without any badge or text`. The pixel caption is added in the edit, never in a prompt (`edit-plan.md`).

---

## Drift guards

| Symptom | Counter, in the scene wording |
| --- | --- |
| It looks like a photo | Remove any real photo from the attachments; use block A or B; add `simple flat game buildings with few details` to the backdrop |
| A landmark from another city appears | A look example is leaking, swap it for an approved own shot or drop it |
| Faces look real | `low-poly character models with simple blocky faces and stiff poses` in the scene line |
| Water or skin is too real | `simple game water with flat white foam shapes`, `simple game water with soft orange reflections` |
| The video turns into real footage | The opener is missing or reworded, paste it verbatim |
| The camera zooms in the clip | Write the camera as `Static camera` or `follows … at the same distance` in the first motion sentence |
| The old city's landmark survived | Name it in a replace sentence, as the skater shot did: `Replace the Ferris wheel and towers with …`, and describe the new one in more detail |

---

## Self-check for the style

1. Exactly one image look block (A, B, C, D or F, or the panel paragraph from `panel-shot.md`), verbatim, matching what is attached and the concept.
2. Shots and backgrounds open with `Full frame, no borders.` and end with the image closing line for their block (A/B and D or F with attachments, or the block-C form without), unchanged.
3. 📼 Nostalgia video prompts open with the video opener and end with the video closing line; 🕹️ Free Style and 🛍️ Promo video prompts open with the Free Style video look line (after `Generate single shot.` for one take) and end with its closing line or one-take form; all unchanged.
4. Every landmark is written as shape and colour; no real photo is listed under Attach.
5. No club, brand, shop or team name in a scene description, colours only.