# Environment Maker — Style Library (references/style-library.md)

# Style library — the look menu

This file governs the look menu: the thirty styles in three batches, each style's locked block,
how plain style words and named studios are routed to a style, and how to write a block for a
style the user describes themselves.

> Each style block opens `prompt_text` and is pasted **verbatim** into all five sets. A block
> describes how the set is **rendered** — medium, line, edge, texture, shading — never the place,
> the time of day or the weather: those come from the world line in `style-bible.md`.
> *Own palette* marks a style that sets its own palette and light; then the world line names the
> time, the weather, the light's source and direction and the materials, with no colour words.
> Snapshot: researched 2026-10-12 (`assets/research/02 Style Library Wording.md`); the blocks are
> not render-tested yet.

---

## How the menu is printed

Ten per batch as `number. emoji **Name** — hook`, numbered 1-10, 11-20 and 21-30 so a number
always means one style. With an upload, the match line comes first in every batch and is the
default. Then the two closing lines for the situation, then the More line verbatim.

```
🎨 **Pick the look for your sets**

0. 🎯 **Match my character** — the sets copy the exact look of your upload (you attach your image to each set)
[the ten styles of the batch]

A style from the list stands alone — nothing to attach.
No pick? Name the place and I'll match your character.
Type a number, type your own, or type More for fresh ideas.

✨ Create these images and videos on [OpenArt](https://openart.ai/home?via=virgil)
🎙 Add optional voice-overs with [ElevenLabs](https://try.elevenlabs.io/jvbqccfz0mv9)
📚 More viral agent skills like this one → [Agent Skills Library](https://aicenturies.com/agent-skills-library/)
```

- **The place is already named:** the second closing line becomes `No pick? Say go and I'll match your character.`
- **No upload:** leave out line 0 and the first closing line, and use
  `No pick? Say "you choose" and I'll pick the look that fits the place best.` A named place is
  confirmed above the menu: `📍 Place: [place] — noted.`
- **The user moves on without a pick** (names a place, asks for ideas): the default is taken —
  Match with an upload, "you choose" without one — and named in the defaults line.

After batch 3, `More` gets: `That's all thirty — describe the look you have in mind and I'll write it.`
and the menu closes with `Type a number, or describe your own look.`

**Backgrounds are painted, not outlined.** In drawn and animated styles the scenery is softer,
less outlined and lower in contrast than the characters who later stand in it. Every block below
describes the background side of its style — so a character added later still stands out.

---

## Batch 1

```
1. 🌸 **Hand-Painted Anime** — pastoral anime-film worlds in gouache and watercolour
2. ✨ **Luminous Cinematic Anime** — hyper-detailed anime with radiant skies and glassy light
3. 📼 **Retro 90s Cel Anime** — painted-cel anime backgrounds with film grain
4. 🧸 **3D Animated Feature** — soft, rounded family-film 3D
5. 🖌️ **Painterly 3D** — dimensional worlds in hand-painted brushwork
6. 🎥 **Photoreal Cinematic** — a real-looking place, lit and graded like a film
7. 🪄 **Classic Hand-Drawn 2D** — fairy-tale feature-animation backgrounds
8. 🟦 **Flat 2D Cartoon** — clean, bright modern TV cartoon
9. 🏺 **Clay Stop-Motion** — a hand-built plasticine miniature set
10. 💧 **Storybook Watercolour** — an illustration in soft washes
```

| # | Style | Locked block — paste verbatim |
| --- | --- | --- |
| 1 | Hand-Painted Anime | `Create a hand-painted anime film background in gouache and watercolour, with soft organic shapes, visible brush texture, gently detailed scenery with soft painted edges, and layered atmospheric depth that fades the distance into pale haze.` |
| 2 | Luminous Cinematic Anime | `Create a modern cinematic anime background painting with crisp, highly detailed architecture and scenery, luminous colour gradients, light scattering through the air, fine atmospheric layering and reflective glassy surfaces that give every surface a soft glow.` |
| 3 | Retro 90s Cel Anime | `Create a late-1980s to 1990s hand-painted anime background in gouache and opaque tempera, with visible brushwork, detailed architecture, soft atmospheric perspective, slightly muted colour, fine film grain and a gentle softness.` |
| 4 | 3D Animated Feature | `Create a stylised 3D animated feature film background, not photorealistic, with soft rounded shapes, gently exaggerated forms, tactile matte materials, soft diffused shadows, gentle rim light and a light atmospheric haze.` |
| 5 | Painterly 3D | `Create a painterly 3D animation background, not photorealistic, in which fully dimensional architecture and scenery wear hand-painted texture, with visible directional brushwork on every surface, dramatic light from one strong motivated source, shadows built from painted colour transitions and a fine illustrated grain over the whole frame.` |
| 6 | Photoreal Cinematic | `Create a photorealistic, cinematically lit photograph that fills the frame edge to edge, with true-to-life materials, natural weathering, physically accurate light from one clear motivated source, a deliberate colour grade with soft contrast, gentle grain and atmospheric depth.` |
| 7 | Classic Hand-Drawn 2D | `Create a classic hand-drawn feature-animation background painted in gouache, with visible brush texture, elegant perspective, layered near, middle and far depth, softened distant detail, and light and shadow painted in broad graphic shapes.` |
| 8 | Flat 2D Cartoon | `Create a flat 2D cartoon background with clean simplified shapes, crisp edges, flat colour fills and minimal shading, drawn in clear, readable perspective, with only a faint paper grain for texture.` |
| 9 | Clay Stop-Motion | `Create a handcrafted stop-motion miniature set built from hand-sculpted plasticine, painted wood, plaster, felt and fabric, with visible fingerprints, tiny dents and slightly uneven surfaces, and soft directional miniature lighting.` |
| 10 | Storybook Watercolour | `Create a whimsical hand-painted illustration in transparent watercolour and gouache, with soft edges, washes that bloom gently into each other, visible paper grain and delicate pencil detail, painted edge to edge across the whole frame.` |

---

## Batch 2

```
11. 📺 **Modern TV Anime** — clean, bright anime-series scenery
12. 💥 **Comic Halftone 3D** — a 3D world finished like print
13. 🖋️ **Graphic Novel Ink** — high-contrast inked illustration
14. 🎞️ **Film Noir** — black-and-white crime-film shadows
15. 🌆 **Neon Cyberpunk** — neon light on wet surfaces
16. 🔍 **Miniature Tilt-Shift** — a real place shrunk to toy scale
17. 🦇 **Gothic Stop-Motion** — a crooked, candle-lit puppet-film set
18. 🧶 **Needle-Felt Wool** — a world made of felted wool
19. ✂️ **Layered Paper Cut-Out** — torn and stacked paper scenery
20. 🖼️ **Fantasy Oil Painting** — thick impasto and dramatic light
```

| # | Style | Locked block — paste verbatim |
| --- | --- | --- |
| 11 | Modern TV Anime | `Create a clean modern anime-series background with crisp shapes, smooth painted colour and simple two-tone shading, with the distance softened and lower in contrast.` |
| 12 | Comic Halftone 3D | `Create a stylised 3D animation background, not photorealistic, finished like a printed illustration, with crisp hand-inked contour lines on the architecture, fine halftone dots inside the deepest shadows, a slight colour offset along the edges, saturated graphic colour and hatched shading laid over the 3D forms.` |
| 13 | Graphic Novel Ink | `Create a gritty inked illustration with confident brush-and-pen linework, dense black shadow shapes, fine cross-hatching and textured paper grain, coloured in a restrained, slightly desaturated palette, with hard-edged shadows that carve the architecture into dramatic planes.` |
| 14 | Film Noir · own palette | `Create a black-and-white film noir image that fills the frame edge to edge, with deep blacks, silver highlights and fine grain, lit by hard single sources that throw long shadows across the architecture, with a faint haze of smoke in the air.` |
| 15 | Neon Cyberpunk · own palette | `Create a neon-drenched cyberpunk background with glowing neon light strips, soft holographic glows, rising steam and haze, glossy reflective surfaces and deep shadow between the shapes, washed in magenta and cyan light.` |
| 16 | Miniature Tilt-Shift | `Create a real-world scene that looks like a highly detailed miniature, with toy-like scale, crisp tiny details and saturated colour, and a tilt-shift focus band that keeps a sharp middle strip and softly blurs the top and bottom.` |
| 17 | Gothic Stop-Motion · own palette | `Create a gothic stop-motion miniature set with tall, crooked, asymmetrical architecture, spiralling shapes and striped decorative motifs, built from handmade materials with fine sculpted texture, in gloomy desaturated colour with moonlit blue shadows and small pools of warm candlelight.` |
| 18 | Needle-Felt Wool | `Create a handcrafted needle-felted stop-motion world in which every surface is shaped from densely compressed wool, with visible fuzzy fibres and stray hairs, uneven handmade surfaces and warm miniature lighting with soft shadows.` |
| 19 | Layered Paper Cut-Out · own palette | `Create a handcrafted layered paper cut-out world built entirely from cut and torn textured craft paper stacked on separate planes, with deckled edges, visible fibres and small soft shadows between the layers, in warm craft-paper colours of faded ochre, rust, dusty teal and cream.` |
| 20 | Fantasy Oil Painting | `Create a fantasy oil painting with thick impasto brushstrokes, rich layered glazes, dramatic chiaroscuro light, sublime scale and soft atmospheric distance, painted edge to edge.` |

---

## Batch 3

```
21. 🏔️ **Concept Art Matte Painting** — epic, production-ready vistas
22. 🗡️ **Cel-Shaded Fantasy** — painterly open-world adventure scenery
23. 👾 **Pixel Art** — a backdrop in crisp pixels
24. 🔺 **Low-Poly** — a faceted geometric world
25. 🧊 **Voxel Blocks** — a world built from cubes
26. 🏘️ **Isometric Miniature** — a tidy small world seen from above
27. 🌫️ **Ink-Wash** — black ink, grey washes and mist
28. 🌊 **Ukiyo-e Woodblock** — Edo-period woodblock print
29. 🌴 **Retro Synthwave** — an 80s neon-grid glow
30. 🎠 **Golden-Age Gouache Animation** — 1930s feature-animation backgrounds
```

| # | Style | Locked block — paste verbatim |
| --- | --- | --- |
| 21 | Concept Art Matte Painting | `Create a cinematic concept-art matte painting with production-ready architectural detail, dramatic directional light, deep aerial perspective, painterly yet precise surfaces, grand scale and layered haze dissolving the far distance.` |
| 22 | Cel-Shaded Fantasy | `Create a stylised cel-shaded fantasy background with soft cel-shaded forms, brush-textured surfaces, elegant simplified shapes with gentle outlines, naturalistic fantasy colour and atmospheric depth built from painterly layers fading into a pale distance.` |
| 23 | Pixel Art | `Create a pixel-art background built from crisp, square, evenly sized pixels on a strict grid, with a limited palette of about sixteen colours, clean pixel clusters, readable shapes and layered planes of scenery receding into the distance.` |
| 24 | Low-Poly | `Create a low-poly 3D world, not photorealistic, built from minimal triangular facets, each flat-shaded in a single colour, with crisp geometric edges on every form and soft light picking out the angular planes.` |
| 25 | Voxel Blocks | `Create a voxel 3D world, not photorealistic, built entirely from small uniform cubes on a grid, with hard-edged blocky forms in simple flat material colours and crisp cube shadows.` |
| 26 | Isometric Miniature · own palette | `Create a clean isometric 3D miniature world seen from a high three-quarter angle, extending past every edge of the frame, with precise geometry, tidy small-scale detail, smooth rounded forms, soft pastel colour, gentle shadows and subtle reflections.` |
| 27 | Ink-Wash · own palette | `Create an ink-wash painting with confident black brushwork, diluted grey washes, pooled ink and dry-brush texture over rice-paper grain, the distance fading into pale grey and mist left as untouched paper, with restrained accents of muted indigo and pale jade, painted edge to edge.` |
| 28 | Ukiyo-e Woodblock · own palette | `Create a woodblock print in the ukiyo-e manner with flat colour planes, elegant carved contour lines, stylised natural forms and a flattened, decorative perspective, in a limited palette of indigo, soft red and pale ochre with visible wood-grain texture, printed edge to edge.` |
| 29 | Retro Synthwave · own palette | `Create a retro 1980s synthwave image with glowing neon grid lines across the surfaces, chrome highlights and pink, orange, magenta and electric-cyan gradients in a soft glowing haze.` |
| 30 | Golden-Age Gouache Animation · own palette | `Create a late-1930s hand-painted animation background in gouache, with visible brush texture, softened distant detail and lavish fairy-tale grandeur, in a restrained early colour-film palette of aged ivory, faded peach, dusty rose, ochre, sage green and dusty blue, with very fine film grain and a slight warm glow.` |

**Styles that fix the camera or the light:**
- **Miniature Tilt-Shift** sets use `high_angle` or `top_view`; **Isometric Miniature** sets use
  `high_angle` only and leave the lens out of the camera sentence (`set-builder.md` §Variety
  rules).
- **Neon Cyberpunk**, **Film Noir** and **Gothic Stop-Motion** read best at night; set the world
  line's time to match and say so in the defaults line.
- **Miniature Tilt-Shift** always keeps its own focus band, whatever the framing.
- **Film Noir** — a character added later must be black and white too; mention it once in 💡 Next.
- **Ukiyo-e Woodblock** and **Ink-Wash** pull in East Asian motifs; fine for most places, but say
  so in the defaults line when the place is, say, a Wild West town.

---

## When the user names a look in their own words

Route it to a style and name the pick in the defaults line; never paste a studio, show, artist or
brand name into a prompt. For a named studio or artist, say once:
`I'll describe that look in words — names of studios and artists can make some tools refuse.`

| The user types | Route to |
| --- | --- |
| anime, manga style | 1 Hand-Painted Anime |
| 2D, hand-drawn | 7 Classic Hand-Drawn 2D |
| cartoon | 8 Flat 2D Cartoon |
| 3D, animated movie | 4 3D Animated Feature |
| realistic, real, photoreal, live action | 6 Photoreal Cinematic |
| claymation, clay | 9 Clay Stop-Motion |
| watercolour, storybook | 10 Storybook Watercolour |
| comic | 13 Graphic Novel Ink |
| pixel, 8-bit, 16-bit, retro game | 23 Pixel Art |
| Ghibli, Miyazaki | 1 Hand-Painted Anime |
| Shinkai, Your Name | 2 Luminous Cinematic Anime |
| Akira, 90s anime | 3 Retro 90s Cel Anime |
| Pixar, DreamWorks, Disney 3D | 4 3D Animated Feature |
| Arcane | 5 Painterly 3D |
| Disney classic, Disney 2D | 7 Classic Hand-Drawn 2D |
| Spider-Verse | 12 Comic Halftone 3D |
| Aardman, Wallace and Gromit | 9 Clay Stop-Motion |
| Burton, Coraline | 17 Gothic Stop-Motion |
| Zelda, Genshin | 22 Cel-Shaded Fantasy |
| Minecraft, LEGO | 25 Voxel Blocks |
| Unreal, game engine | 6 Photoreal Cinematic, or 4 3D Animated Feature if they want it stylised — pick by their other words |

---

## "You choose" with no upload

Pick from any batch by the place, and name the pick in the defaults line:

| The place | Style |
| --- | --- |
| A fantasy, fairy-tale or countryside place | 1 Hand-Painted Anime |
| A modern city, futuristic or sci-fi place | 2 Luminous Cinematic Anime |
| A place for a family or children's story | 4 3D Animated Feature |
| A haunted, gothic or spooky place | 17 Gothic Stop-Motion |
| An epic historical or mythical place | 21 Concept Art Matte Painting |
| Anything else — a real-world place | 6 Photoreal Cinematic |

---

## Writing a new style block

For a look the user describes themselves, or after batch 3:

1. Open with `Create a` or `Create an`, then the **medium** — what the picture is made of or
   painted with (`a linocut print`, `a stained-glass world`).
2. Add the **line and edge** (`soft painted edges`, `crisp carved lines`), the **shading and
   texture** (`flat colour planes`, `visible paper grain`), and a palette only if the look owns
   one (then it is an own-palette style).
3. One sentence, two at most, 200-450 characters. No place, no time of day, no weather.
4. Keep out the words in the table below, and any studio, artist, brand or product name.
5. Show it in the defaults line: `Defaults: look — "[the block]" · …`, so the user can approve or
   change it.

---

## Words that misfire in a style

| Word | What it brings in | Use instead |
| --- | --- | --- |
| `comic-book`, `comic panel`, `graphic novel` | Panels, captions, speech bubbles | `inked illustration` |
| `Ben-Day` | 1950s newsprint | `fine halftone dots inside the deepest shadows` |
| `bold` outlines | Thick keylines | `crisp` or `fine` contour lines |
| `poster`, `key visual`, `splash art` | A title logo and a hero figure | the medium words alone |
| `sticker`, `kawaii`, `chibi`, `sprite`, `game asset`, `game screenshot` | One object on a plain ground, or an interface overlay | `background`, `world`, `scenery` |
| `book`, `page`, `pop-up book`, `in a box`, `diorama`, `cutaway` | The object itself — a page, a desk, a box, a plinth | `world`, `set`, `miniature world` |
| `on canvas`, `framed`, `on paper` | A frame, a wall, a sheet with margins | `painted edge to edge` |
| `photographed`, `film still`, `TV` | A photo of a physical artwork, letterbox bars, a television | `fine film grain`, `fills the frame edge to edge`, `anime-series` |
| `photorealistic` inside a drawn style | The photo look comes back | lead with the medium |
| `neon signs`, `holographic ads` | Garbled lettering | `neon light strips` |
| `seal`, `scroll`, `calligraphy` | Stamps and writing | `carved lines`, `flat planes` |
| `children's`, `proportions`, `shonen`, `slice-of-life` | People | describe the place and the medium |
| `rubber hose` | 1930s black-and-white cartoon figures | `1930s hand-painted gouache background` |
| `vaporwave` | Classical busts and marble | `synthwave` |
| `8K`, `masterpiece`, keyword piles | A generic average | one concrete texture phrase |

---

## Self-check for the look

1. The menu shows one batch with its own numbers (1-10, 11-20 or 21-30), the match line first
   when there is an upload, the closing lines for the situation, and the More line verbatim last
   (after batch 3: `Type a number, or describe your own look.`).
2. The chosen block is pasted verbatim at the start of all five `prompt_text`s.
3. No studio, artist, show, brand or product name appears in any prompt.
4. For an own-palette style, the world line carries no colour words.
5. A new block opens with `Create`, names the medium first and contains no misfire word.