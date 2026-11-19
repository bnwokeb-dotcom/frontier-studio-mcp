# PS2 Style — Environment (references/environment.md)

# Environment: empty PS2 game worlds to build shots in

This file governs 🏞️ Environment: a set of connected, empty backgrounds of one place in the PS2 look, to attach to later shots so the place stays the same.

> Modelled on the user's Environment Maker (AC54): one world, several connected backgrounds, empty by default. The PS2 wording is block F from `style-bible.md`; **not render-tested yet**: say so once.

---

## Intake

```
🏞️ **Environment**: which place? A real place (your street, a city, a beach) or a made-up one (a desert gas station, a neon harbour). Default: 3 backgrounds of it, empty, golden hour.
```

Options in the same line, not a second question: `3 (default) · 5 backgrounds · day · sunset · night · rain`.

---

## The backgrounds

**Background 1** is the clearest view of the place. **The others** are connected spots of the same world, each useful for a different kind of shot:

| Place asked | 1 | 2 | 3 | 4 | 5 |
| --- | --- | --- | --- | --- | --- |
| A football stadium | inside the stadium | the entrance | the tunnel to the pitch | the dressing room | the car park outside |
| A beach town | the beach | the boulevard | a side street | the pier | a beach bar |
| A neon harbour | the quay | a warehouse alley | the harbour office | the lighthouse | the ferry deck |

Vary the camera between backgrounds (wide, street level, high overview, a corridor view) and keep each one open in the middle, with room to put a character in later. Never five near-copies of one view.

**Empty by default:** no people and no vehicles in motion. Parked cars, birds or distant crowds only when the place needs them, kept small.

---

## The environment prompt: master template (one per background)

```text
Full frame, no borders.

[BLOCK F from style-bible.md]

[CAMERA: height, angle, distance]. [THE PLACE: the main shapes and colours from front to back, the ground, the sky]. [LIGHT and time of day, the same in every background of the set]. The place is empty, with open space in the middle of the frame.

No text, no captions, no UI, no HUD, no readable signs, no logos, no badges, no watermark.
```

The light and time of day are written identically in every background of a set, so the set reads as one world.

---

## Output shape

1. One line naming the place, the light and how many backgrounds; the defaults line `Defaults: 3 backgrounds, empty, [light], room in the middle for your character. Say the word and I'll change any of them.`; the notes line.
2. Per background: `## 🏞️ Background [N], [name], Image Prompt`, one line, the prompt in ONE fenced `text` block, then `📎 Attach (image): nothing, text only` and `⚙️ Settings: GPT Image 2 · text-to-image · upright full HD · quality high · 2 versions, keep the most blocky and blurry one`.
3. One line on use: `Attach a background next to your character sheet in any shot and I'll set the shot there.`
4. The ⚡ line, images-only form (`generate.md`), then `🎯 **Shots in this world**: pick one:` with five shot ideas set in these backgrounds (with the user in them when they have a sheet), the More line, the footer.

Backgrounds have no video prompt: they are references, not shots. A user who wants one moving gets a Free Style video prompt with the background as the start frame.

---

## Self-check for an environment

1. The number of backgrounds asked (3 by default), each a different spot of the same world, with a different camera.
2. Block F verbatim in every prompt; the same light sentence in every prompt.
3. Every background empty, with open space in the middle, unless the user asked for people.
4. No text, logos or brand names; real landmarks as shape and colour.