# Comic Studio — Style Bible & Prompt Kit

# Comic Studio — Style Bible & Prompt Kit

The complete build guide for **Comic Studio's ONE locked look**. Read this before writing any prompt and follow it exactly — reuse the locked wording verbatim so the style never drifts. Vary only the subject, action, and shot.

---

## 0. What Comic Studio makes

The premium **"moving comic book / painted animated feature"** look — a stylized **3D** scene (real depth, form, camera moves) *treated* to look hand-made: cel-shaded toon surfaces, bold graphic ink outlines, halftone dots, offset-print colour shift, painterly brushstroke textures, and cinematic lighting in a lightly muted, softly desaturated cool colour grade. It is **3D underneath, comic-and-paint on top** (a 2.5D hybrid). The same locked look holds across **any genre** — spy action, fantasy, body-horror, street-racing, kaiju.

Each build is a **linked pair**: a **still image prompt** and a **matching video prompt** that continues it.

---

## 1. The Locked Style — never drop

> **Prompt it as 3D, not 2D.** The look has real depth and camera parallax. Words like "2D illustration / flat vector / 2D cartoon" flatten it and break the style. Anchor every prompt as a *stylized 3D render* and let the graphic terms do the styling.

**The Locked Style Clause** — append this **verbatim** to the end of every image prompt:

```text
Rendered as a stylized 3D scene with real depth, form and camera parallax, but treated to look like a moving painted comic book: cel-shaded toon surfaces with bold graphic ink outlines and cross-hatched shadows, overlaid with fine halftone dots in the deepest shadows and subtle offset-print CMYK misregistration and chromatic aberration. Surfaces carry visible hand-painted brushstroke texture and a matte painterly finish, lit with volumetric cinematic lighting in a lightly muted, softly desaturated cool colour grade. Non-photorealistic rendering (NPR), 2.5D hybrid look, clean and graphic — no film grain, no photorealism.
```

**Strongest keywords (rank order — always present):**
1. stylized 3D render · cel-shaded · non-photorealistic rendering (NPR)
2. treated to look like a moving painted comic book · 2.5D hybrid
3. bold graphic ink outlines · cross-hatched shadows
4. hand-painted brushstroke texture · matte painterly surfaces
5. fine halftone dots in the deepest shadows · offset-print CMYK misregistration · chromatic aberration
6. volumetric cinematic lighting · real depth, form, camera parallax
7. lightly muted, softly desaturated cool colour grade (a bit more colour, not washed-out)
8. stylized animated-feature proportions — carved planes, sharp structural edges, large eyes (never semi-realistic head proportions)

**Hard negatives (keep to 3):** `photorealistic` · `film grain / noise` · `flat 2D vector / live-action photo`.

**Forbidden words** (never use): film grain, gritty texture, flat 2D, vibrant, oversaturated, neon-drenched, teal-and-orange, high contrast, glossy plastic, photorealistic, semi-realistic proportions, soft rounded face, small realistic eyes.

### 🗿 Face & hand structure — the sculpt, not just the surface

The style clause controls the **surface**. It does not control the **form**. Left unsaid, a generator builds a realistic head with squinted eyes and soft hands, then paints the surface on top — every surface keyword lands and the character still reads wrong.

**Measured against the reference frames in `02 - Assets/Reference Images/Face Structure/`:**

| Feature | The rule |
|---|---|
| **Eye openness** | The tell. Reference aperture is **1/3 as tall as it is wide**; a failing render measured half that — squinted nearly shut. It is *openness*, not size. Eye width is already right at about a fifth of head width. Age lives in the **lid**, not the eye: young faces are large open almonds with a tall aperture, older faces heavy hooded lids over the top third of the iris with eye bags and fine crease lines. |
| **Eye whites** | **A ratio, not a colour.** They sit at **1.3-1.7x the brightness of neighbouring skin** and take the colour of the scene light — lavender under a magenta rim, cream under warm daylight. A failing render measured 0.80x, darker than the skin, so the eye read as a dark hole. Write them as `pale eye whites clearly lighter than the skin`. The word `grey` on its own pulls them muddy, which also makes any iris drift obvious. |
| **Highlights** | **Two per eye, always.** One cool white specular at the top of the pupil, one warm bounce highlight low on the opposite side of the iris. This pair is what separates a living eye from a dead one, and matched highlights force matched geometry. |
| **Gaze** | Both eyes look at the same point, the irises matched in height and placement. Every other row here describes a *single* eye, so the model builds each one on its own and one iris lands off the shared line — that is a wandering eye. |
| **Upper lid** | One solid tapered dark stroke, thickest over the outer half, flicking past the outer corner. Never a row of separate lashes. |
| **Lower lid** | A single thin warm-brown hairline, roughly a fifth the weight of the upper, fading out toward the outer corner. |
| **Brows** | Hard-edged along the bottom, feathered into painted hair tips along the top, tapering to a fine point. |
| **Bone edges** | Hard at the **brow ridge, cheekbone, nose bridge, jawline and chin** — the silhouette runs straight then turns at a corner rather than curving continuously. |
| **Flesh** | **Soft.** Skin is flat matte with soft airbrushed occlusion under brow, cheekbone and jaw. Hard edges belong to the dark graphic shapes, not the skin shading. |
| **Hands** | Blunt squared fingertips, broad rounded-rectangle nail plates, and two or three short brown strokes at each knuckle. Those three details are the whole tell. |
| **Proportions** | About **8 heads tall**, small head, long legs, shoulders ~2.5 head-widths. Detail density falls off sharply face → hair → hands → clothing, until the suit is nearly a flat silhouette. |

> In prompts, do **not** spell this structure out landmark by landmark — render tests showed geometry words produce either low-poly facets or a gaunt hollow skull. The validated style block in §2 carries the face shape on its own. This table is here so you know what "right" looks like when reviewing an image, not to be pasted into a prompt.

### 👥 Background cast — line work is a hero-only treatment

Measured ink-stroke density: **3.70** per 1000px² on the hero, **0.00-0.57** on the people behind him. The line does not thin with distance — it **stops**.

```text
background soft and out of focus
```

That short phrase is all a prompt needs. Depth is carried by three cues together: the line work stopping, the edges softening in one step (hero ~0.8px, nearest bystander ~1.2px, everyone beyond ~3.5px and no softer), and the tones compressing so the subject holds the only true black and the only clean white. A failing render inverted the last one — its background was brighter and more contrasty than its subject.

---

## 2. The validated style block — render-tested, copy this

Tested across six renders on 2026-09-07. This exact wording produced the look; approved and rejected renders sit side by side in `02 - Assets/Style Examples/Validated 2026-09-07/`.

**Prompt shape — short. One line of scene, one style block.**

```text
[Shot] of [subject, complexion + hair if they matter, wardrobe] [action], [setting]. Painterly cel-shaded 3D animated feature film still. Thin warm-brown contour ink lines, soft airbrushed skin gradients, fine halftone dots inside the deepest shadows. Warm skin tones against a dim hazy grey [setting], low-key light, deep shadow across most of the frame, background soft and out of focus. [His/Her] eyes are large open almonds with a tall aperture, a big amber iris ringed in darker brown around a solid black pupil, pale eye whites clearly lighter than the skin, a soft dark lash line clipping the top of the iris, one cool white highlight at the top of the pupil and one warm bounce highlight low on the opposite side, and thick brushy brows tapering to fine points. Both eyes look at the same point, the irises matched in height and placement. Glossy hair in sharp painted flicks.
```

**Approved example 1 — dark-haired, tan:**

```text
Medium close-up of a young woman in a leather jacket on a rain-slicked rooftop at night, city lights behind her. Painterly cel-shaded 3D animated feature film still. Thin warm-brown contour ink lines, soft airbrushed skin gradients, fine halftone dots inside the deepest shadows. Warm tan skin against a dim hazy blue-grey skyline, low-key light, deep shadow across most of the frame, background soft and out of focus. Her eyes are large open almonds with a tall aperture, a big amber iris ringed in darker brown around a solid black pupil, pale eye whites clearly lighter than the skin, a soft dark lash line clipping the top of the iris, one cool white highlight at the top of the pupil and one warm bounce highlight low on the opposite side, and thick brushy black brows tapering to fine points. Both eyes look at the same point, the irises matched in height and placement. Glossy black hair in sharp painted flicks.
```

**Approved example 2 — pale and red-haired, same scene. Proof the complexion is free and the style still holds:**

```text
Medium close-up of a young woman with pale fair skin and red hair in a leather jacket on a rain-slicked rooftop at night, city lights behind her. Painterly cel-shaded 3D animated feature film still. Thin warm-brown contour ink lines, soft airbrushed skin gradients, fine halftone dots inside the deepest shadows. Warm skin tones against a dim hazy grey skyline, low-key light, deep shadow across most of the frame, background soft and out of focus. Her eyes are large open almonds with a tall aperture, a big amber iris ringed in darker brown around a solid black pupil, pale eye whites clearly lighter than the skin, a soft dark lash line clipping the top of the iris, one cool white highlight at the top of the pupil and one warm bounce highlight low on the opposite side, and thick brushy brows tapering to fine points. Both eyes look at the same point, the irises matched in height and placement. Glossy hair in sharp painted flicks.
```

Example 2 is the safer default for a GPT: `warm skin tones` + `dim hazy grey` leaves complexion free and keeps the background from over-cooling, while `warm tan skin` + `blue-grey` bakes in one look.

### Two rules that govern every prompt

**Short beats long.** A long keyword pile makes the model average competing instructions into mush, and structure words bleed onto every figure in frame — the long test inked the entire background crowd because the ink words applied to everyone. Say it once, briefly.

**No negatives, ever.** Never write "no X", "never X" or "avoid X" in a prompt; a negation hands the model the token. Describe what the image IS.

| Instead of | Write |
|---|---|
| no halftone everywhere | `fine halftone dots inside the deepest shadows` |
| no heavy black outlines | `thin warm-brown contour ink lines` |
| no hard cel banding | `soft airbrushed skin gradients` |
| no cold washed-out skin | `warm tan skin against a dim hazy blue-grey [setting]` |
| not small squinted eyes | `his/her eyes are large open almonds with a tall aperture` |
| no lazy eye / no wandering eye | `both eyes look at the same point, the irises matched in height and placement` |

### Words that break the style — keep these OUT of prompts

| Word | What it does |
|---|---|
| `Ben-Day` | The strongest retro trigger. Ben-Day **is** the 1950s newsprint screen — it reframes the render as a printed comic *page*, which is uniformly line-arted by definition, and inks the whole background crowd. Write `fine halftone dots` instead: the dots survive, the retro does not. |
| `comic-book` (in the medium slot) | Stamps caption lettering across the frame. Write `animated feature film still` — a film still has no captions, no page and no print screen. |
| `bold` (on ink) | A black keyline at 3.5x reference weight wrapping every edge. Write `thin warm-brown contour ink lines`. |
| `sclera` (the clinical word), `glowing white eyes` | Bulging anime eyes and glowing white cut-outs. Write `pale eye whites clearly lighter than the skin`. |
| `planar`, `faceted`, `flat forehead plate`, `hard temple corner`, `wedge chin` | Low-poly facets, or a gaunt hollow skull. The style block already carries the face shape. |
| `blocky`, `angular` (on hands) | Polygonal claw-hands. |
| `bright white sclera` | Glowing white cut-outs. Write `pale eye whites clearly lighter than the skin` — they read bright from sitting ~1.5x the skin's brightness, not from being pure white. |

### Load-bearing phrases — removing these breaks the render

- `low-key light, deep shadow across most of the frame` — the reference runs 39-50% of frame in shadow. Drop it and the image goes bright, flat and generic-corporate.
- `Warm tan skin against a dim hazy [cool setting]` — the colour split. The environment is near-monochrome cool; the skin stays warm and **more** saturated. Applying the cool grade globally is what produced the cold blue failures.
- `background soft and out of focus` — keeps all line work on the subject.

### 🧑 Skin tone — the style block sets a default, the subject line overrides it

`warm tan skin` in the style block is a **default**, not a fixed complexion. Render-tested: naming the character's complexion in the **subject line** overrides it completely — a prompt reading *"a young woman with pale fair skin and red hair"* moved measured skin from R-B **+44.7** to **-4.7** while every other style trait held.

So: **if the character is not tan, say their complexion in the subject line.** Never edit the style block to do it.

What must survive whatever the complexion is, is the **relationship**: the figure stays warmer and more saturated than the environment. That contrast is the look; the actual skin colour is free.

> **Calibration note:** both ends of the split are easy to overshoot. Reference skin measures R-B **+32 to +40** and the reference environment sits close to neutral (roughly **-5**). Test renders reached skin **+71** and background **-51** — twice as hot and ten times as cold as the reference. If a render looks garish, the split has been pushed too far, not too little.

---

## 3. Model-agnostic prompting (never name an engine)

Comic Studio prompts must work in **any** image or video generator. **Never name, recommend, compare or imply a model, engine or app** — not in the prose, not in a heading, not as an aside. No "I'd use [model] here." No "— [Model] Prompt" headings: a heading names the shot only, e.g. `🖼 [Name] — Character Sheet Prompt`, `🎞 Board 1 — Storyboard Prompt`, `🎥 [Shot] — Video Prompt`. The user picks their own model in **OpenArt**. Only if the user names a model first may you repeat that name back.

Because the wording carries the whole style, write every prompt so it survives any engine:
- **Lead with the medium:** `stylized 3D render, cel-shaded, painterly brushstroke textures, non-photorealistic`.
- **State the print grit explicitly** — `halftone dots + offset-print CMYK misregistration + graphic ink outlines` — generators under-do it on their own.
- **Force the grade positively:** `muted desaturated cool colour grade, cool neutral white balance`; name one motivated warm light only, never a neon or warm-orange wash.
- **Say what you DO want** — never rely on a negative field existing.
- **Push the stylization hard** if a frame drifts photoreal: add `flat cel banding, matte, non-photorealistic, no photoreal skin or reflections`.
- **Never state aspect ratio, resolution or frame size** — the user sets those in their own generator.

---

## 4. Master templates (one per mode)

### 🎭 Character Sheet — master template
```text
Character model sheet of [CHARACTER: name, age, build, face, hair, wardrobe, signature props], three views (front, 3/4, back) plus one expression close-up, neutral studio backdrop, clean layout. [THE FACE STRUCTURE CLAUSE] [THE LOCKED STYLE CLAUSE]
```

### 🎞 Storyboard sheet — master template
One image = a numbered grid (2x2 or 3x3) of panels, each **captioned with its camera angle**. Build with proper **BUILD-UP** (establish → tension/B-roll → reveal → react → climax); vary the shot type every panel; keep the character identical across all panels. For a full story, deliver **several boards in sequence** (e.g. three 2x2 boards = 12 shots: SETUP → ESCALATION → CLIMAX).
```text
A storyboard sheet, clean [2x2 / 3x3] grid of numbered panels with a camera-angle caption under each. Same [character(s) from the sheet], exact likeness kept across every panel. Panel 1 "[CAMERA ANGLE]" [shot], Panel 2 "[CAMERA ANGLE]" [shot], … [continue]. [THE LOCKED STYLE CLAUSE]
```
**Camera-angle vocabulary:** WIDE ESTABLISHING · MEDIUM · CLOSE-UP · EXTREME CLOSE-UP · INSERT / B-ROLL · HIGH ANGLE / TOP VIEW · LOW ANGLE · OVER-THE-SHOULDER · DUTCH ANGLE · AERIAL · POV. Weave B-ROLL / insert cutaways (hands, objects, textures, a tremor) between story beats for a cinematic edit.

### 🎥 Video Prompt — master template (continues a still)
```text
Animate the still: [character/subject] [motion beat 0-3s], then [beat 3-6s], camera [move]. Keep the exact same stylized-3D comic-painterly look, muted grade and lighting. Stepped, reduced frame-rate "on twos" feel with subtle dropped frames and faint comic motion lines. Natural diegetic sound only, no background music.
```

---

## 5. Worked examples (genre range — one locked style)

> These two predate the 2026-09-07 render test and still carry the older clause wording (including `Ben-Day`). The tested, approved prompts are in **§2** — prefer those. Keep these for their scene construction and genre range.

### 🕶 Action — the string-lit kitchen fight
**🖼 Image prompt**
```text
Medium wide low-angle shot. A lean man in a dark tailored suit and dark sunglasses throws a tight elbow at a hulking figure with pale blue-grey skin, glowing cyan eyes and bandaged fists, both mid-motion. A cramped domestic kitchen at night with wooden cabinets and clutter, a single strand of warm string lights as the only warm accent while the overall grade stays cool and muted. Rendered as a stylized 3D scene with real depth, form and camera parallax, but treated to look like a moving painted comic book: cel-shaded toon surfaces with bold graphic ink outlines and cross-hatched shadows, overlaid with halftone Ben-Day dots and subtle offset-print CMYK misregistration and chromatic aberration. Surfaces carry visible hand-painted brushstroke texture and a matte painterly finish, lit with volumetric cinematic lighting in a lightly muted, softly desaturated cool colour grade. Non-photorealistic rendering (NPR), 2.5D hybrid look, clean and graphic — no film grain, no photorealism.
```
**🎥 Video prompt**
```text
Animate the still: the two fighters trade one fast blow, the suited man ducks and counters, handheld camera whips with the motion. Keep the exact stylized-3D comic-painterly look, muted grade and string-light warmth. Stepped "on twos" frame-rate feel, subtle dropped frames, faint comic motion lines. Diegetic sound only, no music.
```

### 🏎 Automotive — the dusk highway (Style 5)
**🖼 Image prompt**
```text
Wide low rear shot. A lone white JDM coupe with black graffiti-ink markings and a soft red underglow drives away down an almost-empty elevated highway at dusk, small in frame far down the road, leaving a low red-tinted smoke trail on the asphalt, toward a hazy distant city skyline; a smooth sky gradient from a muted warm horizon up to a deep desaturated blue, sodium lamps and sign gantries, overall grade cool and muted. Rendered as a stylized 3D scene with real depth, form and camera parallax, but treated to look like a moving painted comic book: cel-shaded toon surfaces with bold graphic ink outlines and cross-hatched shadows, overlaid with halftone Ben-Day dots and subtle offset-print CMYK misregistration and chromatic aberration. Surfaces carry visible hand-painted brushstroke texture and a matte painterly finish, lit with volumetric cinematic lighting in a lightly muted, softly desaturated cool colour grade. Non-photorealistic rendering (NPR), 2.5D hybrid look, clean and graphic — no film grain, no photorealism.
```
**🎥 Video prompt**
```text
Animate the still: the coupe pulls away down the highway, red smoke trailing, a slow low tracking shot with gentle parallax on the sign gantries, distant traffic drifting. Keep the exact stylized-3D comic-painterly look and muted dusk grade. Stepped "on twos" feel, subtle dropped frames. Diegetic engine + wind, no music.
```

> **Continue the same structure** for the other genres — Fantasy (a young witch on a broomstick under the Milky Way, cool indigo nocturne), Body-horror (an office worker engulfed by a glossy black symbiote under cold fluorescents), Kaiju (a suited figure crouched on rubble beside a mech-hound, smoke and fire) — each is the SAME locked clause with a new subject, setting and light.

---

## 6. The three modes (workflow)

1. **🎭 Character Sheet** — first ask: *📸 upload a reference* (redraw a real photo/person into the locked style, keeping their features) **or** *✍️ describe*. Build from the Character Sheet template — the **Face Structure Clause** is mandatory here, since the sheet is what every later shot inherits. Lock the character's look for reuse.
2. **🎞 Storyboard (build-up maker)** — recommend uploading the Character Sheet(s) + element sheets. Build like a REAL MOVIE with **BUILD-UP**: establish → build tension with detail/B-roll shots → reveal → react → climax. Vary the shot type + camera angle each panel and **label it** (see the camera-angle vocabulary above). Weave B-roll/insert cutaways between beats. On any panel with a crowd or extras, append the **Background Cast Clause** so the background people carry the same ink and halftone as the hero. Lay each board out as ONE storyboard sheet (a numbered 2x2 or 3x3 grid); for a full story deliver **several boards in sequence** (e.g. three 2x2 boards = 12 shots: SETUP → ESCALATION → CLIMAX). Keep it continuous + expandable; after a storyboard also output a matching video prompt.
3. **🎥 Video Prompt** — ask "with or without dialogue?"; offer to use an uploaded still/character; build from the Video Prompt template — always "no background music", diegetic sound only, and never name a model or state aspect ratio or resolution.

---

## 7. Continuity & QC checklist

```text
[ ] Prompted as stylized 3D (NPR), never "2D / flat vector"
[ ] Locked Style Clause appended verbatim to every image prompt
[ ] Graphic ink outlines + halftone dots + CMYK misregistration + brushstroke texture all named
[ ] Muted desaturated grade; one motivated warm light max; no neon / orange wash
[ ] NO film grain, NO photorealism, NO glossy plastic
[ ] Same character look reused across every shot (from the sheet)
[ ] Face Structure Clause appended whenever a face is visible; Hand Structure Clause whenever hands are visible
[ ] Carved flat planes with sharp structural edges + a hard-edged shadow terminator, never soft gradients
[ ] Eye sentence bound to the subject ("His/Her eyes are..."), pale eye whites at 1.3-1.7x skin brightness
[ ] Both highlights present - cool white high on the pupil, warm bounce low opposite
[ ] Both eyes look at the same point, irises matched in height and placement
[ ] Background people carry the SAME ink + cel + halftone treatment — depth from simplification and cooler flat tones, never blur
[ ] Background Cast Clause appended whenever anyone besides the main subject is in frame
[ ] Video prompt reuses the still's exact subject/set/light + "on twos" motion + no music
[ ] No model, engine or app named anywhere — not in the prose, not in a heading
[ ] No aspect ratio, resolution or frame size stated
```

> **Golden rule:** one locked look — stylized 3D treated as a moving painted comic. Vary only the subject, action and shot. Reuse the wording verbatim so nothing drifts.