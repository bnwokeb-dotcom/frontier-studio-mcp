# Mini Kittens — Style Bible

# Style bible

The locked look, calibrated frame by frame against 16 reference reels and then checked back against
those frames. Everything here is prompt language — paste the marked blocks **word for word**.

> Night or dim interior is the default. Real place, real camera, real fur. Never a render, never a
> studio, never a cartoon.

---

## 🔒 THE STYLE BLOCK — paste verbatim into every image and video prompt

```text
Photoreal live-action footage of real animals in a real place, handheld and lit only by what is
actually there, at night or in dim indoor light. The picture fills the whole frame edge to edge as one
continuous image. Deep small-sensor focus holds the set and the props sharp, with only the
far background and anything very close to the lens falling fractionally soft. Exposure is metered
automatically on the brightest subject, so lit fur and polished metal clip to white and bloom into a soft
halo along the rim, while the darkest parts of the frame fall away. The whole picture carries ONE
dominant colour cast taken from the light that is actually there, left uncorrected. Highly saturated
objects — red roses, tomato, blue paint — are pushed past the sensor's limit and glow slightly at
their edges. Fur is real animal fur photographed under real room light: individual guard hairs
catching the key, soft down on the cheeks and belly, visible whisker roots, thin translucent whiskers
and eyebrow hairs, damp gloss on the nose leather, one wet catchlight in each large round eye, tiny
translucent claws and pink paw pads, the coat uneven and slightly ruffled with a few hairs out of
place. Every animal, object and person in frame is lit by the same light from the same direction and
rendered with the same photoreal detail, grain and edge quality as everything around it. Real fur,
real light, real place — a candid moment someone happened to catch.
```

> **Never write "shot on a smartphone", "phone footage", "iPhone" or any device name into a prompt.**
> Image models answer a named device by drawing the device: a status bar, a battery icon, a clock, a
> burned-in date stamp, black letterboxing, or the whole picture shrunk into a frame inside the frame.
> The block above gets the same look from the *behaviour* of a phone camera without ever naming one.

---

## 💡 Pick ONE lighting mode per build, and name it

The reels do not share one lighting look. Three modes, each with its own wording. Mixing them is what
makes a frame read as fake.

**A · Close warm practical** — a bulb, lamp, appliance light or street lamp actually in the room:
```text
Lit by one warm tungsten practical high and slightly to one side, about 2900K, close enough that the
falloff is fast: the kittens are correctly exposed and the wall behind them drops away into deep
amber-black within a short distance. Short soft-edged shadows fall from each kitten and each prop
away from that light, with a thin dark contact line where anything touches the surface.
```

**B · Broad soft overhead ambient** — no source visible, the open-plan look:
```text
Lit by soft, wrapping room light coming from above and out of frame, with no light source visible
anywhere in the picture. The light is even edge to edge, shadows are faint and directly underneath,
and the whole scene — the floor, the far wall, the props — stays legible with no part of it crushing
to black.
```

**C · On-axis phone light** — torch or flash, the hard frontal look:
```text
Lit by a hard light on the camera's own axis, so every surface facing the lens is brightly and flatly
lit with pinpoint speculars, each shadow is thrown directly backwards behind its object and barely
visible, and the scene falls off abruptly to black a short distance behind the kittens.
```

The chosen block is pasted into the prompt body right after the style block — see
`video-prompt.md` §The prompt body and `storyboard.md` §What a frame prompt contains, which both
put it there. A build with no lighting mode named fails the self-check.

**Grain follows the mode.** A and C: `visible luminance grain and chroma speckle in the shadows, blacks
soft and slightly macroblocked like a clip that has been uploaded and re-encoded.` B and any bright
commercial interior: `clean, well-exposed and crisp, with the darkest areas falling to flat black
rather than noisy black.` Never ask for both.

---

## 🎥 Camera

**Height and vantage — name one in every shot, in these words.** Six are allowed; the four below are
the common ones and the two under the table are equally legitimate:

| Vantage | Wording |
|---|---|
| 🧍 **Adult standing, looking down** | `shot from a standing adult's own eye height, roughly a metre and a half up, angled steeply down onto a set that sits at floor level` |
| 🍽️ **Surface eye-line** | `locked off at the surface's own eye line, the lens a hand's width above [the surface] and tilted down only slightly, with [a real object from the set] cropped by the near corner so the viewer is sitting at the table` |
| 🛋️ **Seated POV with own lap** | `shot from someone sitting down, their own thighs and knees filling the bottom of the frame, looking across at the kittens` |
| 🐾 **Kitten eye level, straight on** | `the lens down at the kittens' own eye height, dead level and straight on, the ledge line running parallel to the bottom of the frame` |

| 🚪 **Through the opening** | `shot from outside [the real opening] looking in, the lens level with the mouth of the opening, the opening's own hard edges cropping the set on all four sides` |
| 🔝 **Straight-down overhead** | `shot straight down from directly above the set, the lens parallel to the surface, the whole arrangement flat in frame` |

**Resolve the slots before printing.** `[the real opening]` becomes the one opening this build actually
has — a fridge cavity, an oven, a glovebox, a doorway — and `[the surface]` and `[a real object from
the set]` become what is really there. A bracket that ships is a bug, and naming an opening the scene
does not contain is worse than a bracket.

The **Through the opening** vantage is the container-reveal archetype's camera, and it is the strongest
performer in the reference set. The opening's edges are **architecture inside the photograph** — a real
fridge door, a real oven frame — never a border added over the picture.

**Motion — two states, and say which.**
```text
The camera is hand-held: a fast, slightly smeared approach that settles, then a held frame with only a
faint constant drift.
```
or
```text
The camera is locked off with only a faint constant handheld drift throughout.
```
A slow creep forward of ten to twenty percent across the clip is the only other move. Never a crane,
dolly, orbit, whip pan, zoom punch or transition effect.

**Shot scale stays mid to wide.** The whole set plus a band of context around it; kitten heads are a
small fraction of the frame height. There is no macro insert anywhere in the reference set — the fur
detail comes from the style block, not from going close.

**Framing is usually deliberate, not sloppy.** Lineups, machines and containers are shot centred,
straight-on and dead level, and that symmetry is the composition. Do not ask for a tilted horizon or
an off-centre subject.

---

## 📏 THE MINI RULE — paste verbatim, in the prompt's opening section, before the shots

```text
Every kitten is a four-to-six-week-old baby: small enough to sit in two cupped hands, with newborn
proportions throughout — an oversized round domed head clearly too big for the body, a short pushed-in
muzzle, a tiny low nose, enormous round forward-set eyes, a soft round belly, stubby short legs and
soft rounded paws. The coat is long, soft and plush at this age, standing well out from the body with a
visible ruff of longer fur around the neck and chest, soft feathering on the belly and the backs of the
legs, and small tufts of fur between the toes; the ears are large upright triangles with visible tufts
of fur inside them. The size difference against the real objects around them is measurable in frame: [SCALE ANCHOR].
```

> **The character sheet does not use this block.** It carries its own shortened variant, printed inside
> the template in `character-sheet.md` §The sheet image prompt, with no scale anchor. Never paste this
> one onto a sheet.

**Eyes:** at this age the default is `the cloudy blue of a kitten whose eyes have not yet changed
colour`. Use it unless a locked cast or an uploaded cat says otherwise — it is the single clearest
signal of the age, and adult amber or green undoes the whole read.

**Breed read:** doll-face longhair — Persian and Ragdoll type, very round skull, short pushed-in
muzzle, huge round eyes. Plush semi-longhair is the default coat texture at this age, not a per-kitten
trait.

> These three defaults — doll-face read, plush semi-long coat, cloudy-blue eyes — apply to an
> **invented** cast only. When the user uploads their own cat, the photo wins: breed, coat length, ear
> shape, muzzle and eye colour all come from the picture and replace these. See
> `character-sheet.md` §Path B.

### 🎯 The scale anchor — containment first, comparison last

**Where it belongs:** in storyboard frames and video prompts, never on a character sheet. A sheet has
no scene and nothing to measure against, so its job is identity. How small the kittens are is
established where there are real objects — which is also how the reference reels do it.

**The finding, measured over fifteen test renders:** a *comparison* between two things in frame is
ignored, because the model is free to scale both and its prior wins. A *containment* — the animal
inside or carried by something whose size is fixed — is obeyed, because the container cannot grow.

**Use these shapes, in this order of strength:**

1. **Inside something** — the strongest, and it almost never fails:
   - `curled up asleep entirely inside the white coffee mug, its whole body swallowed by the mug, just the top of its head and two ear tips showing above the rim`
   - `sitting down inside a white teacup, loose inside it with room to spare on both sides`
   - `peeking out of the breast pocket of a denim shirt, the pocket holding all of it`
2. **Carried by a hand** — reliable for ONE kitten:
   - `standing in the middle of the open palm of an adult hand, taking up only the centre of the palm with a clear margin of bare skin all around it`
3. **Under or against a full-size fixture** — works when the fixture is unmistakably real and large:
   - `standing upright underneath the full-size bamboo restaurant tray, their ear tips only just reaching the underside of its rim`
4. **Side-by-side comparison** — weakest, and it failed in every test. Only as a backup on top of one
   of the above, never on its own:
   - `the TV remote lying beside it is longer than the kitten is tall`

**Two limits, both measured:**

- **The hand is a ruler per kitten, not per group.** One kitten in a palm convinces. Four or more
  across two hands does not — the model keeps the kittens at normal size and widens the arrangement,
  and the hands become a shelf.
- **A container smaller than the model's kitten prior breaks instead of shrinking.** Ask for a kitten
  inside an espresso cup and it will be rendered perched on top of it. Use containers a kitten
  plausibly fits in: a mug, a teacup, a cupped hand, a pocket, a bowl.

**Say what the object IS, at its real size**, and let the animal follow:
`a full-size restaurant zaru at its real width` · `a full-size 5-litre paint can` · `a standard mug`.

### 🔤 What earns a place in a prompt

Every word must be something **a viewer could point at in the finished picture**. If it cannot be
pointed at, it dilutes everything around it and comes out.

| Cut | Why |
|---|---|
| `astonishingly small`, `perfectly formed`, `impossible` | mood adjectives — nothing to render |
| `doll-sized`, `figurine`, `toy-sized`, `porcelain` | **size** words carrying a material, and this niche's worst failure is a plastic toy read. The breed term `doll-face` and the prop term `doll-scale` describe a shape, not a size — they stay |
| `That is the point of this sheet`, `every panel exists to prove...` | explanation aimed at a reader, not a renderer |
| `shrunk down`, `scaled to` | process words — the picture shows a state, never a process |
| `not a newborn` and other ad-hoc negations in the body | a negation cannot be drawn, and it hands over the token |

**Exempt from this test: every block this skill orders pasted verbatim** — the style block, the chosen
lighting mode and its grain line, the mini rule, the camera vantage wording, the negatives line, the
drift-guard blocks and the sheet template. Those are fixed, sanctioned wording printed unchanged. The
test governs only the scene, action and cast wording you write yourself.

Carry the size with `miniature` plus a containment, never with a material word:
`a complete cat in miniature, small enough to sit in a cupped hand`.

### 📦 Full-size world, miniature hero props

Both are true at once, and the prompt must say which is which:

- **The place and its fixtures are real and full-size** — the fridge, the table, the kerb, the
  dishwasher, the paint can, the packaging. These are the rulers. `a full-size [object] at its real
  size` whenever one is doing the measuring.
- **The hero props they hold or use are miniature, built to kitten scale** — the tiny guitar, the
  doll-scale gaming chairs, the little bouquets, the miniature furniture. Say so:
  `a miniature kitten-scale [prop], sized to be held in two front paws`.

Getting this backwards is the most common way the premise dies.

---

## 🧍 The upright stance

The signature pose of the niche, and it needs its anatomy stated or it turns human:

```text
Standing upright on two hind legs with kitten anatomy throughout: short hind legs, hind paws pressed
flat on the surface, a round belly pushed forward, the tail lowered behind as a counterweight, and the
two front paws held loosely in front of the chest, with the small shuffling balance of an animal that
has just worked out how to do this.
```

---

## 🎭 Staging vocabulary

| Pattern | What it is |
|---|---|
| 🪑 **The ledge** | A strong real horizontal edge the cast sits on or behind — a kerb top, a windowsill, a fridge shelf lip, an open glovebox door. It runs level across the frame and it is what makes the row read as a row. |
| 🧺 **The vessel** | A real container that does the framing and the scale work at once — a heart box, a waffle cone, a pulled-out drawer, a takeaway bag. |
| 🗼 **The stack** | Kittens piled head to rump in a single column, bottom to top, each chin resting on the head below. Describe them bottom-to-top, never left-to-right. |
| 🎪 **Two tiers** | One performer raised on the upper level with the prop, the audience row on the lower level, the ledge between them. |
| 🔄 **Backs to camera, then the turn** | The row seen from behind, watching something — then every head swivels to the lens. The arc is a rotation, not an escalation. |
| 🚪 **Through the opening** | The camera outside a real opening looking in, the opening's edges cropping the set on all four sides. |
| 🛍️ **The product-shot lineup** | Even spacing, identical posture, one prop per kitten in a different colour each, all eye contact, straight on. Composed like a row of collectibles. |
| 🙈 **The tease** | A closed container leaking exactly one sliver of fur — enough to know something is alive, not enough to know what. |

**Composition habits that carry the look:** a large area of plain empty surface around the cast; one
saturated colour block against an otherwise drab neutral scene; no horizon and no sky — the frame is
floor, shelf, sill or interior all the way up.

---

## 🖼️ Surfaces worth naming

- **Polished or wet floors return a full inverted mirror reflection** of the kittens, plus long
  specular streaks from the ceiling lights. Say so when the floor is stone, tile or wet asphalt.
- **Shooting through glass** — an oven door, an elevator door, a fridge — adds veiling haze, lowered
  contrast, visible smudges and a faint second reflected layer over the scene.
- **White fur at the light's edge blows out** into a soft glowing halo where the guard hairs dissolve
  into pure white.

---

## 🚫 NEGATIVES — one line, printed last, backup only

Default, kittens only:
```text
No on-screen text, no captions, no subtitles, no added lettering, no watermark, no added logo overlay, no interface overlay, no status bar, no timestamp, no added border, no picture-in-picture frame, no letterboxing. No adult cats, no juvenile or long-legged cats. No CGI, 3D-render or plush-toy look, no cartoon, no illustration, no painting. No crane, dolly, orbit, whip pan or zoom punch, no added lens flare, no colour grade, no music, no voice-over.
```

**The storyboard has its own short artefact line** in its `negative_prompt` field — see
`storyboard.md` §Field rules — because a JSON frame carries a compact one, not this long line.

**The character sheet has its own negatives line** in `character-sheet.md` — a white-backdrop sheet bans
lettering outright, including labels and name tags, and that is deliberate. Those three lines are the only three; never write a fourth.

**With a person in the build**, drop nothing — people are allowed by default in this niche. Appending
the one clause below is the **only** permitted change to the line, and the "unchanged" rules in
`SKILL.md` and `storyboard.md` carry that exception explicitly. Laps,
thighs, knees, shoes, hands and forearms appear throughout the reference reels and are often the POV
anchor and the scale ruler. Add this clause to the end of the line instead of writing a new one:
`No second person in frame.`

**Real-world print is not banned.** Brand packaging, machine badges, wine labels, shop signage and menu
boards are load-bearing realism and often the scale ruler. The ban is on **added overlay text** —
captions, subtitles, lettering stamped over the picture. Say `no added lettering`, never `no text`.

---

## 🛡️ Drift guards

Positive wording, because naming a failure hands the model the token. Apply the ones the build needs —
and **these blocks are templates: every square bracket must be replaced with the real value before the
prompt is printed.** A bracket that ships is a bug.

The **Empty slots** block below is the single authority for that wording. When another file asks for
"the no-empty-space line" or "the empty-slots guard", it means this one — never write a second version.

**Count drifts / extra animal**
```text
Exactly [N] kittens are in frame and [N] is the total, counted one by one, and they are the entire cast of the whole take — no further animal of any kind anywhere in the scene.
```

**Empty slots** (always include at 5 or more, or when the set has countable stations). **Two sanctioned
variants — pick the one that matches the staging, and never write a third for a scene.**

**(a) The set has one countable station or prop per kitten** — five monitors, five bouquets, five glasses:
```text
Every position is occupied: each of the [N] places has one whole kitten in it, [N] complete heads, [N] complete bodies and [N] tails, with no gap and no unused place between them, and each kitten has its own [prop] directly in front of it.
```

**(b) No per-kitten station** — a vessel, a stack, a lineup on a bare ledge, kittens inside one container:
```text
Every position is occupied: [N] whole kittens, [N] complete heads, [N] complete bodies and [N] tails, packed together with no gap and no unused space where a kitten should be.
```

**The character sheet has its own every-position-occupied line** in `character-sheet.md` §The sheet
image prompt, because a sheet counts figures rather than kittens. Those three — (a), (b) and the
sheet's — are the only three; never write a fourth.

**Adult-cat proportions** — reinstate the mini rule plus the scale anchor, both in the first third.

**Paw anatomy**
```text
Each front paw is a small rounded kitten paw with soft toes clearly separated, pink pads and tiny translucent claws, and each kitten has exactly two front legs, each joining cleanly to a visible shoulder; the reaching paw sits at the front of the group where nothing overlaps it.
```

**Welded into the prop**
```text
Where a paw meets the [prop], the paw rests on top of the surface and presses into it: the fur compresses at the contact point, the [prop] dents very slightly under the weight, and a thin dark shadow line runs along the edge where they touch, so the kitten and the [prop] stay two separate objects with two separate outlines.
```

**Floating**
```text
Each kitten's weight is on the surface: hind paws flat and pressed down, a short soft-edged contact shadow directly beneath each paw and under the belly, and the [surface] visibly compressed and darkened where the kitten stands.
```

**Coats swap between shots**
```text
Each kitten keeps the same coat, the same markings in the same places, the same eye colour and the same position from the first shot to the last: [kitten 1] is the cream-and-ginger tabby in every shot, [kitten 2] is the pure white longhair in every shot, and no kitten changes place.
```

**CGI / plush sheen** — restore the fur sentence from the style block in full; cut any word that
implies render, model, toy or figurine.

**Upright stance turns human** — use the upright-stance block above, in full.

**Human hand goes wrong** (when only a hand is in frame)
```text
One adult hand enters from the lower edge: five fingers and one thumb, natural skin with knuckle creases and one visible fingernail, wrapped around the [object] from the side so the fingertips flatten against it, occupying one corner and leaving the rest of the picture to the kittens.
```

**Relighting mismatch** — the artefact that makes an otherwise perfect frame read as fake
```text
The kittens are lit by the same light as the place around them: the key falls on them from the same direction and at the same strength as it falls on the [surface] beside them, they sit inside the same shadow band as the props, the shadow side of each face goes as dark as the shadow side of the [prop], and their edges carry the same grain and the same softness as the rest of the picture.
```

**Props silently shrink** — see §Full-size world, miniature hero props. State the real size of any
prop that is doing the measuring.

**The dark kitten's face disappears**
```text
The black kitten's face reads clearly: a visible muzzle line, a lighter nose leather, whiskers catching the key as bright thin lines, and a sharp catchlight in each eye, with enough light along the crown to separate the head from the background.
```

**The phone renders itself** — a status bar, a clock, a date stamp, black bars or a photo-inside-a-photo
```text
The photograph fills the whole frame edge to edge as one continuous image, with no added border, no picture-in-picture frame, no letterboxing and no black bars, and no phone screen, status bar, signal or battery icon, clock or date stamp anywhere. Real architecture inside the scene — a fridge cavity, an oven frame, a doorway, an open glovebox — is part of the photograph and is not a border.
```
Add this to any build that mentions phones, screens or footage anywhere in its scene description, and
strip every device name out of the prompt body.

**States reset between shots**
```text
The mess only grows: the [suds / stain / crumbs / spill] stay exactly where they are and spread, every object that was moved stays where it was moved to, and the state at the end of one shot is the state at the start of the next.
```

---

## 🐱 The cast

A **new sheet** takes the default ordered lineup in `character-sheet.md` §Path A, so the house cast
stays recognisable. Inside a **built reel** there is no fixed order — the reference lineups all run
different orders and one even repeats a coat — so whatever order the first frame sets is the order every
later frame keeps.

**The palette that actually appears:** cream-and-ginger tabby · pure white · grey-blue · silver-grey
tabby · dark brown tabby · black · calico.

- Prefer coats that are told apart at a glance, but **a repeated coat is allowed** if the build wants
  two greys — just give them different positions and keep them consistent.
- **Order is per reel, not global.** Whatever order the first frame sets, every later frame keeps.
- **Eye colour defaults to kitten-blue** at this age. Only give an adult eye colour when an uploaded
  cat or an attached character sheet calls for it.
- Longhair plush is the default texture, not a distinguishing trait.

Full cast mechanics and naming: `character-sheet.md`.