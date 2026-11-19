# Cast Swap — Style Modes (references/style-modes.md)

# Style modes — keep the clip's look, or restyle it

The user picks one style per build. The style decides two things: **which prompt shape** to use (EDIT or
RESTYLE, see `prompt-template.md`) and **which style sentences** go into it.

---

## The style menu

Offered in the same message as the image ask (`casting.md` §Asking for the images). Print it verbatim:

```
🎨 **Style** — keep the video's look, or restyle the whole clip?

1️⃣ 🎞️ **Keep the clip's look** — your character, in the clip's own world (default)
2️⃣ 🧬 **Your character's world** — the whole clip in your character's own style, e.g. their show
3️⃣ 🌸 **Anime**
4️⃣ 🧸 **3D animated**
5️⃣ 🧩 **Mixed** — the clip keeps its look, your character keeps theirs (a cartoon in a real clip, or the other way round)
6️⃣ ✍️ **Your own** — claymation, oil painting, pixel art… type More for ideas
```

No answer → style 1, stated in the defaults line.

| # | Style | Prompt shape | What changes |
| --- | --- | --- | --- |
| 1 | Keep the clip's look | **EDIT** | only the chosen people |
| 2 | Your character's world | **RESTYLE** | the whole frame, in the character's own style |
| 3 | Anime | **RESTYLE** | the whole frame |
| 4 | 3D animated | **RESTYLE** | the whole frame |
| 5 | Mixed | **EDIT** | only the chosen people — they keep their own medium inside the clip's |
| 6 | Your own | **RESTYLE** | the whole frame |

---

## 1 · Keep the clip's look (EDIT)

The new character takes on the clip's own medium. Pick the line that fits the source:

**Live-action / photoreal source** — the relighting match (the realism failure is a character keyed in
brighter and cleaner than the plate, not blur):

```text
The new character is lit by the scene's own light — same direction, strength and colour — with the same grain, sharpness and colour grade as Video 1.
```

**Animated source** (anime, cartoon, 3D, game):

```text
The new character is drawn in Video 1's own [anime / cartoon / 3D] style, with the same line work, shading and colour as everyone else in the clip.
```

With two or more new characters, write `The new characters are…`.

**When the reference and the source are different media**, say what happens and offer the alternative in
one line outside the prompt:

| Reference | Source | What "keep the clip's look" does | Offer |
| --- | --- | --- | --- |
| cartoon / anime / 3D character | live action | the character becomes a **live-action version of itself** — same signature colours, shapes and outfit | `Want them to stay a cartoon inside the real clip? Say "mixed".` |
| photo of a real person | anime / cartoon / 3D | the person is **drawn in the clip's style**, keeping their hair, skin tone, build and features | — |

For the first case the `Image 1:` lock ends with: `Image 1's character appears as a real, live-action version of themselves, keeping [signature colours, shapes and outfit].`

---

## 2 · Your character's world (RESTYLE)

The whole clip is redrawn in the reference character's own style — Homer in a Simpsons-style clip, an anime
OC in an anime clip. **Name the source, then describe it**: the name aims the model, the description is what
still renders if a tool filters the name.

```text
Render the whole video in the style of [the show / film / game the character comes from] — [3-4 visible traits: line work, colour palette, shading, how faces and backgrounds look].
```

If the character has no show (an original design), describe the style from the image instead:
`Render the whole video in the same art style as Image 1 — [the traits you can see].`

Some tools filter famous franchises by name *and* by look. If a named version is rejected, resend the same
prompt with the name removed and the description kept, and tell the user why.

---

## 3 · Anime (RESTYLE)

```text
Render the whole video as a 2D Japanese anime film — clean cel shading, crisp line art, softly painted backgrounds and expressive eyes, with the light and colour of Video 1 carried into the drawing.
```

## 4 · 3D animated (RESTYLE)

```text
Render the whole video as a 3D animated feature film — soft global illumination, rounded stylised shapes, smooth skin with a gentle glow, and rich saturated colour.
```

---

## 5 · Mixed (EDIT)

The clip keeps its own look and the character keeps theirs — a cartoon walking through a real movie, or a
real person dropped into an anime. Pick the line that matches:

**Drawn or 3D character, live-action clip:**

```text
The character from Image 1 keeps its own [2D cartoon / anime / 3D animated] look — [its flat colours, outlines, proportions] — while everything else in Video 1 stays live-action. The character is lit from the scene's direction and casts a shadow on the ground it stands on.
```

**Photoreal person, animated clip:**

```text
The person from Image 1 stays photoreal — real skin, hair and fabric — while everything else in Video 1 keeps its [anime / cartoon / 3D] look. The person is lit from the scene's direction and casts a shadow on the ground they stand on.
```

When reference and clip are already the same medium, there is nothing to mix — treat it as style 1.

---

## 6 · Your own (RESTYLE) — the More list

Show 8 at a time, each as emoji + name + a few words. `More` shows the next 8 and never repeats one.

| | Style | Style sentence |
| --- | --- | --- |
| 🧱 | Claymation | `Render the whole video as a stop-motion claymation film — handmade plasticine characters with fingerprint texture, miniature sets and slightly stepped stop-motion movement.` |
| 🖼️ | Oil painting | `Render the whole video as a moving oil painting — thick visible brushstrokes, rich layered colour and canvas texture.` |
| 👾 | Pixel art | `Render the whole video as 16-bit pixel art — chunky square pixels, a limited bright palette and crisp hard edges.` |
| 🧶 | Wool felt | `Render the whole video as a needle-felted wool animation — fuzzy felt characters and sets with soft fibre texture.` |
| 🌃 | Cyberpunk | `Render the whole video in a cyberpunk look — neon magenta and cyan light, wet reflective surfaces and glowing city haze.` |
| 🖋️ | Ink wash | `Render the whole video as an ink wash painting — flowing black ink strokes, soft grey washes and empty paper-white space.` |
| 🎨 | Watercolour | `Render the whole video as a watercolour animation — soft bleeding edges, translucent washes and paper grain.` |
| 📰 | Graphic novel | `Render the whole video as an inked graphic-novel film — bold ink outlines, flat colour and fine halftone dots in the deepest shadows.` |
| 🎞️ | Film noir | `Render the whole video as black-and-white film noir — hard shadows, high contrast and smoky light.` |
| 🧸 | Toy bricks | `Render the whole video as a plastic toy-brick animation — characters as small block-built figures with studded brick sets.` |
| 🔺 | Low-poly 3D | `Render the whole video as low-poly 3D — flat-shaded faceted shapes and a clean pastel palette.` |
| ✂️ | Papercraft | `Render the whole video as a papercraft cut-out animation — layered card shapes, visible paper edges and soft drop shadows.` |
| 🕹️ | Cel-shaded game | `Render the whole video as a cel-shaded video game — bold outlines, flat two-tone shading and saturated colour.` |
| 🎩 | 1930s cartoon | `Render the whole video as a 1930s rubber-hose cartoon — black-and-white ink, bendy limbs, pie-cut eyes and film grain.` |

A style the user types themselves gets the same treatment: name it, then add 3-4 visible traits.

**Words that import more than the look** — rename the function instead:

- `comic-book` → imports caption lettering stamped across the frame. Use `inked graphic-novel film`.
- `Ben-Day` → imports 1950s newsprint and inks the whole background. Use `fine halftone dots in the deepest shadows`.
- `Pixar`, `Disney` and other studio names in a *generic* style request → describe the look instead; names
  are only for the user's own character's world (style 2).

---

## Rules for every RESTYLE

1. **One style per prompt.** Never two styles mixed.
2. **The style is named in the summary sentence at the top of the prompt** and described once in the style
   sentence. Without a named style, edit models drift back to live action.
3. **Everyone and everything in frame changes with it.** Add this line to every RESTYLE prompt:

```text
Everyone in frame — the new characters, the other people and any crowd — and the whole background get this same style, from the foreground to the back.
```

   For flat 2D styles (anime, cartoon, graphic novel, pixel art, papercraft, ink wash, watercolour) add:
   `Distant figures are drawn simpler, as cleanly as the foreground.` For 3D and claymation, natural depth of
   field is fine.
4. **The style never re-stages the clip.** Motion, timing, camera moves, cuts, framing and positions still
   come from Video 1 — the RESTYLE prompt says so in its first lines.
5. **The replaced characters keep their exact identity in the new style** — same hair, colours, outfit and
   signature features, only drawn in the new medium.
6. **One change per pass is the safe route.** Replacing *and* restyling in one job is supported but less
   stable. If the result drifts, offer the two-pass version: Pass 1 = the swap in the clip's own look (EDIT);
   Pass 2 = restyle the Pass 1 video (a short RESTYLE prompt with no replacement in it).