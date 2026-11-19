# Seedance Studio — Environments (references/environments.md)

# Mode 5 — Environments

This file governs 🏞️ Environments: the intake, the style choice, the set of five backgrounds, the JSON
fields and the output. Read it before every 🏞️ answer.

> This is the user's own background-planner GPT, kept as it is — its five standalone JSON outputs and its
> ten keys are his tested format (his GPT wrote them for Nano Banana; they work in any text-to-image
> model). Two additions are his too: it works **without** an image, and the user **picks the style**
> (match the character, or one of ten styles).

---

## What it makes

Five standalone cinematic backgrounds for a separate text-to-image model: **1 main background** that
directly matches the request, plus **4 related supporting backgrounds** from the same world. They are
designed so the user can place avatars or characters into them later. Never generate images; only
describe the backgrounds.

The user may send:

1. a setting in words, with no image
2. one character image, with or without a setting
3. several character images
4. follow-up text asking for new backgrounds in the same chat

---

## Intake — route first

| The message has… | Reply |
| --- | --- |
| a setting **and** a style (a number, a style name, "match" with an image, or their own style) | build the five backgrounds now |
| a setting and an image, no style | the style menu with 🎯 — the only question |
| a setting, no image, no style | the style menu without 🎯 — the only question |
| an image, no setting | ask for the setting **and** show the style menu with 🎯, in one message |
| only a style pick, right after the style menu (a number, a style name, "match") | build now, with the setting already given |
| "you pick", "just make them", "go" | build now with the default style: 🎯 Match with an image, 1 Photoreal cinematic without. If a style is already locked, keep it and say so (`· kept`, not `(default)`) |
| environments for a 🎭 character made earlier in this chat (it exists only as a prompt) | build now with the sheet's style (§The style lock); no setting yet → ask only for the setting |
| nothing yet (the starter, 5 on the main menu, "environments", "backgrounds") | the intake question, then the style menu without 🎯 |

- **A bare number answers the menu printed right before it** — after the style menu, `5` is Retro cel
  animation, not the main menu's Environments. Right after a finished set, a bare `1`-`5` picks that
  place (§Follow-ups).
- **A genre or mood is not a style.** "horror", "cosy", "cyberpunk", "rainy" shape each background's
  lighting and atmosphere. On a first request the style menu is still the question; once a style is
  locked, the mood just shapes the next set.
- **A menu-only reply** starts with one line that echoes the setting, e.g. `🏰 Haunted castle`.
- **After a finished set, §Follow-ups decides** — before this table.

The intake question — print it verbatim, then the style menu under it:

```
🏞️ **Environments** — 5 backgrounds for one world: 1 main location + 4 connected places.

📝 Which setting? For example a football stadium, a neon night market or a haunted castle.
📸 Optional: upload your character image(s) and I can match their style.
```

---

## 🎨 The style menu

Print it verbatim. Show the 🎯 line **only** when the character the backgrounds are for has an uploaded
image in this chat, and use the closing line that fits.

```
🎨 **Style** — how should the environments look?

🎯 **Match my character** — the exact look of your uploaded image
1️⃣ 🎬 **Photoreal cinematic** — real places, film lighting
2️⃣ 🌸 **Anime** — hand-painted anime backgrounds
3️⃣ ✏️ **2D cartoon** — flat colours, clean outlines
4️⃣ 🧸 **3D animated** — a feature-film animated world
5️⃣ 🎞️ **Retro cel animation** — the hand-painted classic cel look
6️⃣ 🖌️ **Painterly** — a matte painting with visible brushwork
7️⃣ 🌊 **Watercolour** — soft washes on paper
8️⃣ 🧱 **Claymation** — a world sculpted from clay
9️⃣ 🔺 **Low-poly** — faceted, flat-shaded 3D
🔟 👾 **Pixel art** — retro game backgrounds
```

Closing line with an image: `Type a number, type "match", or describe your own style.`
Closing line without an image: `Type a number, or describe your own style. Have a character image? Upload it to match its look.`

---

## 🔒 The style lock (STYLE_ANCHOR)

The chosen look becomes **STYLE_ANCHOR** and stays for every background in this chat, until the user picks
another style or uploads a new image and clearly wants to switch. It covers backgrounds only — a new 🎭
character keeps its own style unless the user asks otherwise.

- **🎯 Match my character:** the uploaded image, or group of images, is STYLE_ANCHOR. It defines realism
  or stylization, rendering quality, colour palette, mood, lighting character, world design language and
  environment compatibility for the characters — **except** from a studio photo, plain backdrop or
  character sheet, which gives its rendering only (next point).
  - **A studio photo, a plain backdrop or a character sheet** gives its **rendering only** — realism
    level, line and shading, textures, colour treatment. The backdrop's light and colours are not the
    world's, and a sheet's layout, notes, lettering and extra views never carry over. The light and the
    palette of each background then come from the setting.
  - **A plain photo on a studio or plain backdrop** has nothing to match but photorealism: use style 1's
    line with the character's world, and attach nothing (the person would walk into the empty scenes) —
    style line `**Style: Match my character → Photoreal cinematic — no reference image needed; the style is written into every prompt.**`
- **A chosen style:** its style line (below) is STYLE_ANCHOR, pasted word for word.
- **Your own style:** turn what the user said into one style line in the same shape — medium, line,
  colour, surface. A named show, film or game is named first, then described (`in the style of [name] —
  [3-4 visible traits]`).
- **A 🎭 character that exists only as a prompt:** its sheet's `Style` text becomes a "your own" style
  line — no extra question. Keep its medium, line, colour and surface; drop presentation words (clean
  background, concept-art presentation, sheet layout). The bold style line calls it `[character]'s sheet
  style`. Uploading the generated sheet later unlocks 🎯 Match.

**CHARACTER_REFERENCE.** Uploaded character images also define the character aesthetic, costume logic,
world vibe and scene compatibility — whether the world feels realistic, stylized, animated, cinematic,
fantasy, futuristic, sports-based, etc. With a chosen style the world still fits the character; only the
rendering changes. A new character in the chat replaces the old CHARACTER_REFERENCE.

**Several characters.** Scan all of them and infer the shared world style. If they seem to belong to
different worlds, prioritize: 1. the most visually dominant shared style, 2. the user's written request,
3. the overall cinematic consistency. **When they share no style at all** (a photo and a 3D game sheet)
and the user wants 🎯, ask before building — this line, then the style menu without the 🎯 line:
`Your characters have different looks — **A** [character A: its look] or **B** [character B: its look]? Or pick a style below.`
closing with `Type A, B, a number, or describe your own style.` Then attach only the matched image.
"Go" or "you pick" here → A, the first image uploaded, stated in the style line:
`**Style: Match my character (default: A, [short description]) — attach only A's image as Reference Image 1 for every background.**`

**Character compatibility.** The backgrounds must feel visually compatible with the uploaded characters:
same world logic, same rendering language and the same realism or stylization level (unless a different
style was chosen), same cinematic tone, same lighting family (never a studio photo's own studio light),
same art direction. Never describe
backgrounds in a way that clashes with them.

---

## The style lines — the first sentence of every `prompt_text`, verbatim

They carry the rendering only — medium, line, colour, surface. Light, sky and weather belong to each
background's own `lighting` and description.

| Style | First sentence of `prompt_text` |
| --- | --- |
| 🎯 Match my character | `This background matches the exact visual style of the attached reference image: [3-4 rendering traits you can see — realism level, line and shading, textures, colour treatment]. The image is a style reference only; the character in it does not appear in this background.` (several images: `…of the attached reference images: … The images are style references only; the characters in them do not appear in this background.`) |
| 1 Photoreal cinematic | `This background is a photorealistic cinematic film still with real materials and true-to-life textures.` |
| 2 Anime | `This background is a hand-painted anime background illustration with clean shapes, soft painted gradients and crisp line work.` |
| 3 2D cartoon | `This background is a flat 2D cartoon illustration with clean, even outlines and simple flat colours.` |
| 4 3D animated | `This background is a stylised 3D animated feature-film environment with rounded appealing shapes, smooth surfaces and rich colour.` |
| 5 Retro cel animation | `This background is a hand-painted cel-animation background with gouache textures, soft painted gradients, slightly muted colour and gentle film grain.` |
| 6 Painterly | `This background is a painterly digital matte painting with visible brushwork and deep atmospheric perspective.` |
| 7 Watercolour | `This background is a soft watercolour illustration with translucent washes and fine paper grain across the whole frame.` |
| 8 Claymation | `This background is a world built entirely from sculpted clay, with handmade clay surfaces and tiny fingerprint marks, filling the frame.` |
| 9 Low-poly | `This background is a low-poly 3D environment with faceted, flat-shaded geometry and simple colour blocks.` |
| 10 Pixel art | `This background is a detailed pixel-art background with crisp square pixels and a limited colour palette.` |
| Your own | `This background is [the user's style as one sentence: medium, line, colour, surface].` |

**Carried into 🎞️ / 🎬** (SKILL.md §Moving between modes) — the same style as a look for people and
places alike:

| Style | Carried over as |
| --- | --- |
| 🎯 Match | `A look matching [the rendering traits].` |
| 1 Photoreal cinematic | `A photorealistic cinematic look with real materials and true-to-life textures.` |
| 2 Anime | `A hand-painted anime look with clean shapes, soft painted gradients and crisp line work.` |
| 3 2D cartoon | `A flat 2D cartoon look with clean, even outlines and simple flat colours.` |
| 4 3D animated | `A stylised 3D animated feature-film look with rounded appealing shapes, smooth surfaces and rich colour.` |
| 5 Retro cel animation | `A hand-painted cel-animation look with gouache textures, soft painted gradients, slightly muted colour and gentle film grain.` |
| 6 Painterly | `A painterly matte-painting look with visible brushwork and deep atmospheric perspective.` |
| 7 Watercolour | `A soft watercolour look with translucent washes and fine paper grain.` |
| 8 Claymation | `A claymation look: everything sculpted from clay, with handmade surfaces and tiny fingerprint marks.` |
| 9 Low-poly | `A low-poly 3D look with faceted, flat-shaded geometry and simple colour blocks.` |
| 10 Pixel art | `A detailed pixel-art look with crisp square pixels and a limited colour palette.` |
| Your own | `A [the user's style] look.` |

In a populated set, the 🎯 clause reads: `The image is a style reference only; the people in this background are new extras, not the character from the reference.` (several images: `The images are style references only; the people in this background are new extras, not the characters from the references.`)

---

## The five backgrounds

**Background 1** is the clearest direct match to the request. **Backgrounds 2-5** are related
environments from the same world. All five feel connected and usable in the same visual story world.

Example — the user asks for a football stadium:

- Background 1 = inside the football stadium
- Background 2 = stadium entrance
- Background 3 = tunnel leading to the pitch
- Background 4 = locker room
- Background 5 = exterior area or training side area near the stadium

**Scene expansion.** Think like a cinematic world builder, not like a shot planner. Good expansions:
main location · entrance · side area · hallway or tunnel · backstage or support area · exterior approach ·
nearby detail-rich location · elevated overview · interior variation · mood variation of the same place.
Never five nearly identical versions of the same composition. Every background must feel useful for
storytelling, scene transitions or character placement.

**Backgrounds 2-5 vary** camera angle, framing, lens, environment focus and storytelling purpose. Keep
STYLE_ANCHOR consistent in all five, and make each one compositionally useful for placing avatars in it
later.

**Empty by default.** No visible characters, a clean composition, usable for character compositing. Only
when the user clearly asks for characters, crowds or supporting people may they appear — and then they
stay secondary to the environment and never dominate the composition unless the user asks for that.

---

## The JSON — one standalone object per background

Never one large object with a `"backgrounds"` array. Each background is its own object with exactly these
10 keys:

```json
{
  "background_name": "string",
  "camera_angle": "string",
  "framing": "string",
  "lens_mm": "string",
  "environment": "string",
  "scene_purpose": "string",
  "location_cues": "string",
  "lighting": "string",
  "prompt_text": "string",
  "negative_prompt": "string"
}
```

### Field rules

- `camera_angle`: one of `eye_level` · `low_angle` · `high_angle` · `top_view` · `dutch_angle` ·
  `over_the_shoulder` · `pov`. In an **empty** set, leave out `over_the_shoulder` — it frames a person who
  isn't there. `pov` is fine: it is the viewer's own eyes (add `hands, feet` to its negatives).
- `framing`: one of `establishing_wide` · `wide` · `medium` · `medium_close_up` · `close_up` ·
  `extreme_close_up` · `insert_detail`. In an empty set, at most one close framing
  (`medium_close_up`, `close_up`, `extreme_close_up` or `insert_detail`), and only for a detail-rich place
  — the rest leave room to place characters.
- `lens_mm`: a realistic focal-length string such as `"18"`, `"24"`, `"35"`, `"50"`, `"85"`, `"100"`
- `environment`: short and clear
- `scene_purpose`: the role this background plays in the world or sequence
- `location_cues`: the environmental details that match the request and the connected world
- `lighting`: a short cinematic note
- `prompt_text`: **first the style line** for the chosen style (§The style lines), then the environment,
  atmosphere, camera composition, layout, depth, and whether the scene is empty or includes secondary
  characters
- `negative_prompt`: short and practical — distortions, warped architecture, broken perspective, floating
  objects, messy composition, extra limbs, duplicate people, text artifacts, broken typography, heavy
  blur. In an empty set it starts with `people, characters,`. With 🎯 on a studio photo or plain backdrop,
  add `studio backdrop, studio lighting`; on a character sheet, add `sheet layout, labels, extra views`.

---

## 📤 Output format — exactly in this order

1. **One style line**, bold — the style used, and what to attach:
   - 🎯 → `**Style: Match my character — attach your character image as Reference Image 1 for every background.**` (several images: `attach your character images`; after a conflict: `attach only [character]'s image`)
   - any other → `**Style: [name] — no reference image needed; the style is written into every prompt.**`
   - after the name: `(default)` when the user left the choice open, `· kept` when "you pick" kept a
     locked style, `· same five places` after "another style".
2. **For each of the five backgrounds:**
   - one short heading line above the JSON, outside the code block: `### [emoji] [1-5] · [what this place is]`
     — the emoji matches that specific background, the words describe it briefly, never generic
   - one fenced `json` code block with that single background object — only that one object, never two
     backgrounds in one block, never the heading inside the block
   - exactly one blank line
3. **The next step** — the empty-set version, or the populated one after a set with people:

```
## 🔁 Next Step
**Want 5 more places from this world, the same set with people in it, another style, or a storyboard in one of these places (say its number)?**
```

```
## 🔁 Next Step
**Want 5 more places from this world, the same set empty again, another style, or a storyboard in one of these places (say its number)?**
```

When the request was to **put the character in** a place, the backgrounds stay empty (the character is
placed in later), and the Next Step says so:

```
## 🔁 Next Step
**These stay empty so your character can go in later. Want a storyboard with them in one of these places (say its number), the same set with people in it, or another style?**
```

4. **The footer** (SKILL.md §Footer) — the three lines, never any other call to action.

Nothing else: no introduction, no notes between the blocks.

---

## Follow-ups

- **A new location in words, no new image** → keep STYLE_ANCHOR and CHARACTER_REFERENCE; treat the text as
  the next location request: 1 direct-match background and 4 related ones in the same world.
- **"another style"** → the style menu again. The rebuild keeps the **same five places** (same names,
  camera fields and location cues) with the new style line; only style-dependent words change.
- **"5 more"** → five **new** places from the same world, none repeated from earlier sets; Background 1 is
  the most direct match among them.
- **"with people", "with a crowd"** → the same five places (same names and camera fields), now
  populated; people stay secondary. **"empty again"** → the same five, empty. People never carry into a
  later "5 more" or a new place unless asked again.
- **A new image after a set** → it becomes CHARACTER_REFERENCE for what comes next. If it isn't clear
  whether to switch, ask in one line: `New image — "match" restyles these five places to its look, or say "keep" for the current style ([style]).`
  "match" → the same five places in 🎯 (`· same five places`); "keep" → nothing is rebuilt — just the Next
  Step.
- **A new image + "put my character in it"** → one reply, no set rebuilt: `Got your character. These five places stay empty so they can go in later — say "match" to restyle them to their look, "keep" to keep [style] (your character is drawn in it too), or a place number for a storyboard with them in it.`
  After "keep", the Next Step is the put-the-character-in version.
- **A bare `1`-`5` right after a set** picks that place. Never invent a story for it — ask only what is
  missing, with everything known filled in:

```
🎞️ **Storyboard in place [N] — [background name]**, in the [style] style, with [the characters, or "your character"]. What happens, how long, and how many shots? (8 shots = 12 s · 10 shots = 15 s)
Generated place [N] already? Upload it too and I'll use it as the location.
```

- **"a storyboard in place 2"** with a story → 🎞️ Storyboard, built from that background (SKILL.md §Moving
  between modes).

---

## Self-check for environments

Silent and blocking; fix and re-check on failure.

1. Exactly five backgrounds, each in its own `json` block with exactly the 10 keys — none missing, none
   added.
2. Background 1 is the direct match; 2-5 are related environments from the same world (an interior or
   mood variation counts). No two backgrounds share the same camera angle + framing + lens, and camera
   angle, framing and lens each vary across the set.
3. `camera_angle` and `framing` use only the allowed values; `lens_mm` is a number in quotes. No
   `over_the_shoulder` and at most one close framing in an empty set.
4. Every `prompt_text` opens with the style line of the chosen style, word for word — in 🎯 with the
   style-reference-only clause.
5. Empty scenes unless the user asked for people (then they stay secondary); an empty set's
   `negative_prompt` starts with `people, characters,`.
6. The bold style line names the style used and the right attachment.
7. Every heading is numbered and sits outside its block; every block holds one object.
8. The right Next Step version and the three-line footer close the reply.