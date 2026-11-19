# PS2 Style — Character Sheet (references/character-sheet.md)

# Character sheet: you (or anyone) as a PS2 game character

This file governs 🧍 Character Sheet: one image prompt that turns a photo of the user, or a described character, into a PS2-game character on a clean sheet, ready to attach to every shot after it.

> The sheet locks who the character is; the shots put them in places. The layout (four views side by side on white) is the user's own tested layout from Character Sheet Master; the PS2 wording on top of it is **not render-tested yet**: say so once. Read `style-bible.md` first.

---

## Intake

```
🧍 **Character sheet**: upload a photo of yourself (or of someone who agreed to it), or describe your character. Default: the photo, kept as recognisable as the look allows.
```

**From a photo:** read it first and print a short card:

```
👀 What I can see
💇 Hair: [style, length, colour]
🙂 Face: [shape, skin tone, beard, glasses]
👕 Outfit: [top, bottoms, shoes, colours]
🧍 Build: [build, rough height impression]
```

Only what the photo shows. What is not visible (shoes in a selfie) gets a simple game default, and the card says so (`👟 Shoes: not in the photo, white sneakers by default`).

**From a description:** turn the idea into the same four fields; fill gaps with the archetype of a 2000s game hero (a hoodie, jeans, sneakers; a simple oval game face when no face is given) and say which defaults you used.

**Who:** the user themselves, a made-up character, or someone who agreed to it. Never a real public figure, never a child in a romantic or violent scene.

---

## The sheet prompt: master template

```text
A character sheet of one 2000s open-world video game character like in GTA San Andreas: a low-poly model with a simple blocky face and stiff pose, soft blurry low-resolution textures, simple geometry, flat simple game lighting, slightly washed-out warm game colors. It looks like a game model, not a photo and not a modern render.

[With a photo: "Image 1 is the person to turn into this game character: keep their hair, face shape, skin tone, facial hair, glasses and outfit recognisable, simplified into the low-poly game style."]

The character: [HAIR]. [FACE]. [OUTFIT, top to bottom, with colours]. [BUILD].

Four views of the same character side by side, standing at the same height in the image, in a relaxed game idle pose with arms slightly away from the body: front view, side view facing right, back view, and a close-up of the head and shoulders from the front. One continuous plain white background running edge to edge behind all four views, separated only by white space.

Exactly one character, shown four times. No text, no labels, no captions, no UI, no logos, no watermark.
```

### Slot rules

| Slot | Rule |
| --- | --- |
| Hair, face, outfit, build | From the 👀 card, in plain visible words: `short black curly hair`, `round face, light brown skin, short beard`, `white oversized T-shirt, baggy blue jeans, white sneakers` |
| Logos on clothing | Become plain colours (`a plain red hoodie`) |
| Photo line | Only when a photo is attached |
| Layout | Pasted as written: it describes the result, not a grid (layout words like "panels" or "baseline" get drawn) |

---

## Using the sheet afterwards

The finished sheet image is attached to every later shot, with the character line from `style-bible.md` §The reference lines. Print this offer under the sheet:

```
🎯 **Put yourself in a shot**: pick one:

1. 🚗 **Driving into the city at sunset**: you behind the wheel, camera behind the car
2. 🌃 **Walking down a wet night street**: lights, reflections, game cutscene feel
3. 🏖️ **A beach day**: you on the sand, the sea and palm trees behind
4. 🏙️ **In your own city**: the 📼 Nostalgia reel with you in it
5. 🏞️ **Build your world first**: an environment set to put yourself in
```

Then the More line.

---

## Output shape

1. The 👀 card (photo) or the four filled fields (description), and the notes line.
2. `## 🧍 [Name or "You"], Character Sheet Prompt`, one line on what to attach, the prompt in ONE fenced `text` block.
3. The attach and settings lines. With a photo: `📎 Attach (image): image 1 = your photo` and `⚙️ Settings: GPT Image 2 · edit mode · landscape · quality high · 2 versions, keep the one that looks most like you and most like a PS2 game`. Without: `📎 Attach (image): nothing, text only` and the same settings with `text-to-image` instead of `edit mode`. The defaults line: `Defaults: four views on white, 2 versions, [kept from your photo | built from your description]. Say the word and I'll change any of them.`
4. The ⚡ line (`generate.md`), the 🎯 offer above, the footer.

A sheet has no video prompt: it is a reference, not a shot.

---

## Self-check for a character sheet

1. Every trait comes from the photo, the description, or a stated default.
2. Exactly one character, four views as written, white background, no labels.
3. The photo line only when a photo is attached; no logo or brand on the clothing.
4. No real public figure; consent for anyone who is not the user.