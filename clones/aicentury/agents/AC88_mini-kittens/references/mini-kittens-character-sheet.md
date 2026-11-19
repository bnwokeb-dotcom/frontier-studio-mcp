# Mini Kittens — Character Sheet

# Mode 1 — Character sheet

Locks the cast so the same kittens come back in every storyboard and every video. One sheet, solid
white background, mini kittens only, **every kitten standing upright on its two hind legs** — that
upright stance is the signature of this niche and the sheet's job is to lock it.

> Read `style-bible.md` alongside this file — the sheet carries the same mini rule and the same fur and
> eye detail wording as every other prompt, but **not** the phone-shot capture look. A sheet is a clean
> studio reference, not a candid reel frame.

---

## The one intake question

```
🐾 **Character sheet** — how should we build your cast?

1️⃣ 🐈 **Pick a number** — how many kittens in the sheet? 1 · 3 · 5 (the classic lineup) · or your own number
2️⃣ 📸 **Upload your own cat** — send a photo and it comes back as a mini kitten version of itself

Type 1 with a number, or attach the photo.
```

Nothing else is blocking. Names, poses and backdrop are defaulted and stated in one line.

---

## Path A — pick a number

All of them are doll-face longhair kittens — very round skull, short pushed-in muzzle, huge round eyes,
plush semi-long coat, large upright ears with fur tufts inside — and all of them have the cloudy blue
eyes of a kitten whose eye colour has not changed yet, unless the user asks otherwise.

Take the first N coats from the **house cast**, in this order, so lineups stay recognisable across
every reel in the series:

| # | Coat | Read |
|---|------|------|
| 1 | **Cream-and-ginger tabby** | warm apricot coat with faint ghost tabby banding, white muzzle and chest bib, pink nose |
| 2 | **Pure white longhair** | dense white plush coat, pink nose and pink inner ears, white whiskers |
| 3 | **Grey-blue** | soft dove-grey plush coat, faint darker mottling on the flank, white chin flash |
| 4 | **Black longhair** | dense pure black coat that stays black under the light, pale nose leather |
| 5 | **Calico** | white base with black and ginger patches, one patch crossing the right eye |
| 6 | **Silver-grey tabby** | pale silver-grey with dark mackerel bars, white chin and chest |
| 7 | **Dark brown tabby** | warm brown with black bars, pale spectacle markings around the eyes |
| 8 | **Tuxedo** | glossy black with a clean white bib, white chin and four white boots |
| 9 | **Cream point** | pale cream body with darker cream on the ears, muzzle, paws and tail |
| 10 | **Tortoiseshell** | mottled black and ginger with no white, the split running down the face |

Past ten, keep going by varying the existing coats with a stated difference — *a second grey-blue, one
shade darker* — never by repeating a coat description word for word. Prefer coats told apart at a
glance, but a repeat is allowed if the user wants two greys, as long as they keep different positions
and stay consistent.

**Names:** offer, never invent silently — one name per kitten, taken in cast order from
**Biscuit · Marshmallow · Pebble · Olive · Patch · Smudge · Nutmeg · Domino · Custard · Pumpkin**,
stopping at N; past ten, ask for the rest. One line:
`I'll name them [the first N names] — say the word if you want your own.`

---

## Path B — upload your own cat

**Preserve the identity, convert the age.** The user's cat becomes a mini kitten version of *itself*,
not a generic kitten.

1. **Read the photo first** with the Read tool. Never describe a photo that was not attached.
2. Print a `👀 What I can see` block — coat colour and pattern, markings and where they sit, eye colour,
   ear shape, nose and paw-pad colour, coat length, breed read.
3. **The photo overrides the house defaults.** The doll-face longhair read, the plush semi-long coat and
   the cloudy-blue eyes are defaults for an *invented* cast only. On this path the breed read, coat
   length, coat texture, ear shape, muzzle shape and eye colour all come from the photo and replace
   them. A short-haired tabby with green eyes and a narrow face stays exactly that — only younger.
   In the template this means rewriting the **three breed-carrying clauses** — the muzzle, the coat
   length and texture, and the ear shape — plus `[SHARED BREED LINE]`. §The sheet image prompt has the
   exact table for the upload-only and the mixed case. On a mixed sheet those clauses stay with the
   house kittens and the cat's own traits live in its cast line.
4. **Keep exactly:** coat colour, pattern and every marking with its position, eye colour, nose and
   paw-pad colour, coat length and texture, ear shape, breed read, and any asymmetry — a crooked
   blaze, one white toe, a notched ear. Asymmetry is what makes it *their* cat.
5. **Convert only:** age and proportions. Adult proportions become weeks-old kitten proportions per
   `style-bible.md` §The mini rule.
6. **Never prettify.** A scruffy cat stays scruffy, a chunky cat keeps a round face, a scarred ear keeps
   the scar. What the photo does not show is written `[trait] not visible in the photo` and asked in the
   same batch — never invented.
7. Ask for the cat's real name in that batch: `What's their name? I'll use it for the sheet.`

**When the photo doesn't cooperate** — never refuse. Name what IS readable, then ask for the rest:

| Problem | What to do |
|---------|------------|
| Several cats | Ask which one, describing each by coat so the user can point |
| Blurry or dark | Lock what reads — coat colour, rough pattern — and ask for eye colour and markings |
| Face hidden, back view | Lock the coat and ask for face markings and eye colour |
| Cropped tight | Lock the face and ask coat length and tail markings |
| Not a cat | Say what it shows in one line and offer Path A or a fresh photo |

**Mixing paths:** their cat plus house cast kittens is fine and popular — their cat leads the lineup as
kitten 1, leftmost in both rows. Say so in one line. Every kitten still gets the same two views and the
same upright stance — a sheet has no room for a special pose.

---

## The cast lines

**Mode 1 prints ONE block: the sheet image prompt.** There is no separate pasteable cast document and no
keep-this reminder — the generated sheet image *is* the cast lock, and the user attaches that image to
whatever they build next.

The cast still has to be written out **inside** the prompt, though, or the coats drift. One line per
kitten, in lineup order, dropped into the prompt's `The kittens, left to right:` slot:

```
[coat colour and pattern], [eye colour] eyes, [nose and paw-pad colour], [coat length and texture],
[one signature marking with its position]
```

On the number path each line comes from the coat table in §Path A, and the shared breed line is the
house default. On the upload path both come from the photo, per §Path B.

**Output shape — one heading, one block:**

```
🐾 **[N]-kitten cast — character sheet**

## 🖼️ Character Sheet, Text-to-Image Prompt
Paste this into your image model. Everything is written in — nothing needs attaching.

[the sheet image prompt block]
```

**Carrying the cast forward.** Later builds get the cast from the sheet image: the user attaches it, the
agent reads it and describes that exact cast coat by coat. Say so when handing the sheet over.

---

## The sheet image prompt

One fenced `text` block, and nothing else. This is the approved template — it is the prompt that
produced the best-measured sheet of the whole build, and it is reproduced here as it was written.
Substitute the bracketed slots and print it.

> **The only change from the render it was approved on:** the black kitten's coat line. The original
> said `a dense black coat that goes warm brown where the light hits it`, and the render came back
> chocolate brown, because `warm brown` is handed straight to the model. It now reads
> `that stays black under the light`. Revert that clause if you want the original byte for byte.

```text
Photorealistic character reference sheet of [N] mini kittens, each four to six weeks old, on a seamless pure white studio backdrop that fills the frame edge to edge with no horizon line, no visible seam and no wall-to-floor join. Even, soft, shadowless studio lighting from the front and both sides; the white stays clean white, with only a faint soft contact shadow directly under each paw so the kittens sit on a real surface. Deep focus holds every kitten sharp from front to back, with no shallow-depth falloff anywhere.

Every kitten is a four-to-six-week-old baby: small enough to sit in two cupped hands, with newborn proportions throughout — an oversized round domed head clearly too big for the body, a short pushed-in muzzle, a tiny low nose, enormous round forward-set eyes, a soft round belly, stubby short legs and soft rounded paws. The coat is plush and semi-long at this age, standing out from the body and softest on the cheeks and belly, and the ears are large upright triangles with visible tufts of fur inside them.

The kittens, left to right: [one cast line per kitten, separated by semicolons]. [SHARED BREED LINE]

Every position on the sheet is occupied: [F] complete figures, [F] complete heads, [F] complete bodies and [F] tails, evenly spaced with no gap and no unused place in any row. Each of the [N] kittens appears exactly twice, once in each view, so every kitten has the same number of figures as every other.

Sheet layout: each kitten is shown in the same two views, arranged in two clean rows with generous white space between them and nothing overlapping. In EVERY view the kitten is standing upright on its two hind legs, balanced and steady, back straight, hind paws flat on the surface, tail lowered behind it as a counterweight, and its two front paws held loosely in front of its chest —
1. standing upright, full body, seen straight from the front
2. standing upright, full body, side profile
The upright stance is the same in every view: a real kitten balancing on its hind legs, with kitten anatomy throughout — short hind legs, round belly, plantigrade hind paws pressed flat, no human legs, no human posture, no tiptoe, never floating above the surface.
All views of one kitten show the identical animal — same coat, same markings in the same places, same eye colour, same proportions. Every kitten is rendered with the same photoreal treatment and the same level of detail; none is softer, blurrier or simpler than the others.

Fur reads as real fur: individual guard hairs catching the light, soft down on the belly and cheeks, visible whisker roots, fine whiskers and eyebrow hairs, a wet highlight in each eye, tiny translucent claws and soft paw pads with clearly separated toes.

No on-screen text, no captions, no subtitles, no lettering, no labels, no name tags, no watermark, no logos. No adult cats, no juvenile or teenage cats, no long-legged bodies. No human legs, human knees, human posture or anthropomorphic body; no kitten on all four paws, no sitting, no lying down, no floating or hovering above the surface. No coloured, grey, gradient, textured or paper-roll background; no props, furniture, floor, table or horizon. No plush toy sheen, no CGI or 3D-render look, no cartoon, no illustration, no painting.
```

### On the house-cast path, print it exactly as above

With an invented cast the template is correct word for word — only the slots below get filled. That is
the version that produced the approved render.

### On the upload or mixed path, three clauses are rewritten

The template describes **every kitten on the sheet**, so on a sheet containing the user's own cat it
would otherwise assert two opposite animals in the same block. §Path B says the photo wins, so rewrite
exactly these three, and nothing else:

| Clause in the template | Upload-only sheet | Mixed sheet |
|---|---|---|
| `a short pushed-in muzzle` (in the proportions list) | the muzzle shape from the photo | **cut it from the proportions list** and fold it into the rescoped sentence below, so it covers the house kittens only |
| `The coat is plush and semi-long at this age, standing out from the body and softest on the cheeks and belly` | the coat length and texture from the photo | change to `The other [N-1] kittens have a short pushed-in muzzle and coats that are plush and semi-long at this age, standing out from the body and softest on the cheeks and belly` and put the cat's coat in its cast line |
| `the ears are large upright triangles with visible tufts of fur inside them` | the ear shape from the photo | change to `...and their ears are large upright triangles...` and put the cat's ears in its cast line |

Everything else in the template — the backdrop, the lighting, the layout, the views, the fur sentence
and the negatives — stays identical on every path.

**Resolve before printing** — nothing in square brackets, and no literal `...`, may survive:

- `[N]` is the kitten count. `[F]` is `N × 2`, the number of figures on the sheet.
- `[one cast line per kitten...]` becomes the real cast lines from §The cast lines, in lineup order,
  separated by semicolons. Each one carries that kitten's own eye colour.
- `[SHARED BREED LINE]` is the house breed read, used when the cast is invented:
  `All [N] are doll-face longhair type: round skull, short pushed-in muzzle, huge round eyes, large
  upright ears with fur tufts inside, and the cloudy blue eyes of a young cat.`
  **On the upload path it is replaced** by the breed read from the photo. On a **mixed** sheet it
  covers the house kittens only and reads `The other [N-1] are doll-face longhair type: ...`, while the
  uploaded cat's own breed and eye colour live in its cast line.

---

## 📐 The layout rule — two rows, five across, measured

This is the single biggest driver of whether the kittens come out compact or stretched, and it was
measured on the real renders rather than guessed.

The model draws each figure at roughly a fixed fraction of the **height** of the space it is given.
The only thing that changes is how **wide** that space is. So the number of figures per row decides
the body shape:

| Per row | Cell shape at 16:9 | Measured body width/height | Result |
|---|---|---|---|
| 5, in **two rows** | 0.72, near square | **0.68** | round belly, short legs — correct |
| 5, in one row | 0.36, a tall column | 0.38 | stretched, meerkat |
| 6, in one row | 0.30 | 0.36 | stretched |

Identical prompt text produced 0.68 and 0.38 depending only on the number of rows.

**The rules that follow:**

- **Always two rows.** Never put every view in a single row.
- **Five kittens per row is the ceiling** at 16:9. At six the cell is already 0.60 and the stretching starts.
- **Above five kittens, split into more sheets** rather than widening the row — see §Scale the sheet
  to the cast size.
- Leave air: a correct figure occupies roughly **40-45%** of the frame height, not 80%.

---

## Scale the sheet to the cast size

Five kittens per row is the measured ceiling (§The layout rule), and every kitten gets two views in two
rows. So one sheet holds up to five kittens and ten figures.

| Kittens | Sheets | Per sheet |
|---|---|---|
| 1-5 | one | the whole cast, two rows, two views each |
| 6-10 | two | the cast split in lineup order, five and the rest |
| 11+ | one per five | divided in lineup order, rounded up |

When more than one sheet is needed, print one fenced block per sheet, each under its own
`## 🖼️ Character Sheet [n of m], Text-to-Image Prompt` heading, with identical wording apart from the
cast lines and the counts. Say which split you took in one line.

---

## Self-check for a sheet

1. Every kitten is four to six weeks old; the mini-rule paragraph is present and carries no scale
   anchor, because the backdrop is deliberately empty.
2. Kitten count equals what was asked, and the every-position-occupied line is present at any cast
   size and counts **figures** (`N × 2`), not kittens. **Count the figures in the render:** each kitten
   must appear exactly twice. A render where one kitten has three views and another has two is a failed
   sheet, and it is the commonest way the count slips. This line is the sheet's own sanctioned version —
   the scene variants in `style-bible.md` §Drift guards → Empty slots do not apply to a sheet, and
   neither does `SKILL.md` self-check 2's empty-slots clause.
3. No two kittens share a coat — unless the user asked for a repeat, in which case they hold different
   positions and stay consistent.
4. Upload path: every marking in the `👀 What I can see` block appears in the cast line, and nothing
   appears that the photo did not show.
5. The backdrop is a seamless pure white studio backdrop with the no-seam and no-horizon wording.
6. Every kitten stands upright on its two hind legs in every view, with kitten anatomy and no human
   legs or posture.
7. Two views per kitten, arranged in two rows, at most five kittens per row — see §The layout rule.
   Above five kittens the cast is split across more sheets.
8. No square bracket and no literal `...` survives inside the fenced block — `[N]`, `[F]`, the cast
   lines and the shared breed line all carry real values — and no camera, lens or device is named.
9. No labels and no captions anywhere.
10. One fenced block per sheet — the sheet image prompt — each under its own heading, and no other
    block printed alongside it.
11. The response closes with the three-line footer.

---

## What comes next

Offer, do not ask:
```
💡 Next
🎥 Say "video prompt" — some video models need nothing but this sheet and a good prompt, and I'll write one.
🎬 Or, if you want to see it frame by frame first, say "storyboard" — optional, not a required step.
🐾 Or name one kitten and I'll build a solo reel around them.
```