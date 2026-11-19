# POV Water Slide — Reference Analysis

# Reference Analysis

Two sets of videos inform this skill, and they are **not** weighted equally.

| Set | Where | Weight |
|---|---|---|
| **Primary viral reference** — `fearvisionofficiel_DcynI6Oj8rA.mp4`, ~13 M views | this folder | **The blueprint.** Its opening sequence outranks everything else here. |
| Three supporting references from the same creator | this folder | Confirm the format and prove it is environment-agnostic. |
| Four **generated examples** | `Generated examples/` | This skill's own past output. Iteration data — what already works and what is still missing. |

**Where the generated examples and the viral reference disagree, follow the viral reference.** The generated clips show what has already been achieved; the viral clip shows what still has to be matched. Never train the skill on a weakness the generations share.

All four references in this folder are **720 × 1280 (9:16), 30 fps**, single continuous first-person takes with no cuts. Timestamps below were read off extracted frames: 0.5 s across full runtimes, **0.25 s across the first 5 s**, and **0.1 s across the commit window** of the primary. Nothing here is inferred from a thumbnail.

| | File | Duration | Role |
|---|---|---|---|
| **PRIMARY BLUEPRINT** | `fearvisionofficiel_DcynI6Oj8rA.mp4` | 20.16 s | Night city · blue LED · ~13 M views — **the target behaviour** |
| Supporting A | `fearvisionofficiel_Dc1L8xImxxW.mp4` | 20.16 s | Night city · blue LED · storm |
| Colour Variant | `fearvisionofficiel_Dcv7cfVDQi0.mp4` | 20.16 s | Blue-hour city · **red LED** · very high altitude |
| Environment Variant | `fearvisionofficiel_Dcwz1hPl7Dm.mp4` | 30.21 s | Golden-hour **mountain** · no LEDs · clear acrylic |

---

## The primary blueprint — its opening, at 0.25 s

Read frame by frame, the first five seconds of the 13-million-view clip are **not** an approach shot and **not** an instant descent. They are a held vertigo reveal with a slow lean toward the edge, a stall, and a fast commit.

| Time | What is on screen |
|---|---|
| **0.00** | Wet dark rooftop deck at night. The camera is angled **steeply downward** — roughly 45° below horizontal, sky reduced to a thin band at the very top. Bare feet low-centre. The deck's edge crosses the frame around the middle, and beyond it the city sits an enormous distance below, avenues radiating outward as orange spokes. The slide mouth is **small** and sits on that seam. |
| **0.25 – 1.50** | The mouth grows slowly. The feet advance — one foot, then the other. The down-angle never lifts. The dominant sensation is *looking down*, not *walking through a scene*. |
| **1.75 – 2.75** | The mouth is now large and centred, blue LED hoops lit. The city still fills the upper 40 % of frame. |
| **2.80 – 3.50** | **The stall.** Forward motion nearly stops. The mouth holds almost the same size for ~0.7 s. Feet together, still, on the wet deck. This is the hesitation beat. |
| **3.80 – 4.10** | **The commit**, over about 0.3 s — fast, not a glide. The deck edge drops out of frame, the chute floor and its converging LED lines appear, the legs come forward. |
| **4.20 – 4.80** | In the chute, descending, LED lines converging to a vanishing point, city still filling the top. |
| **4.90 – 5.20** | Water erupts across the feet, motion blur ramps — acceleration. |

Three measurements matter more than anything else in this document:

1. **The down-angle is present from frame one and never lifts.** The deck and the rider's own feet take the bottom ~48 % of the frame, the city takes ~35 %, the slide mouth only ~10 %. The viewer's eye is on the void, not on the slide.
2. **There is a genuine stall** at 2.8–3.5 s. Motion nearly stops at the mouth. That pause is the anticipation, and it is what the format's fear actually rests on.
3. **The entry is quick** — roughly 0.3 s from standing at the mouth to being in the chute, and acceleration arrives ~0.8 s later. Stillness → falling is a hard change in behaviour, not a fade.

---

## The approach problem — and the correction to it

All four references in this folder spend their opening walking. None starts falling before 4.5 s:

| Reference | Rider still walking at | Feet inside the chute | Descent actually begins |
|---|---|---|---|
| **Primary blueprint** | 3.0 s | ~3.9 s | **~4.9 s** |
| Supporting A — night city | 3.0 s | ~3.5 s | **~4.5 s** |
| Colour variant — red LED | 3.0 s | ~3.5 s | **~5.0 s** |
| Environment variant — mountain | 2.5 s | ~3.0 s | **~4.5 s** |

That is 22–25 % of runtime spent on a walk. It is still dead weight and this skill still deletes it.

> **But the first version of this skill overcorrected.** It read *no approach* as *no intro*, and cut the **stall** along with the **walk**. The frames show these are two different things: the walk is 0–2.8 s of travel; the dread is the 0.7 s stall plus the sustained downward camera angle. **Delete the travel. Keep — and intensify — the dread.**
>
> The corrected rule: the rider is stationary at the edge from frame one, the POV is already tilted down over it, the depth is held for ~1–1.6 s, then a short hesitation and a fast committing hop. Total pre-drop time ~1.8–2.8 s instead of the reference's 4.9 s — more fear per second, not less.

---

## Supporting reference — night city, blue LED, storm

**20.16 s · 30 fps · 9:16 · one continuous take.**

**Opening frame.** A wet black glass rooftop deck at night, high above a dense grid city — a Manhattan-like peninsula with water on both sides, avenues running to the horizon as continuous chains of warm orange sodium light, a needle-topped supertall in the middle distance. Heavy blue-grey storm cloud presses down on the skyline. Fine rain streaks fall through the air. Sitting on the deck directly ahead is a **glowing cyan translucent funnel** — the slide mouth, flared like a scoop, with curved raised walls and a bright dotted LED line tracing its upper rim. The rider's bare lower legs and bare feet occupy the bottom quarter of the frame; dark shorts, natural skin, wet deck reflecting the glow.

The composition is three stacked bands and it never varies across the whole series:

```
top  ~45–50%   sky + the world, far below and far away
mid  ~25–30%   the slide — mouth, then chute, then walls converging to a V
low  ~25–30%   the rider's legs and bare feet
```

**0:00 – 0:04.5 — approach.** Slow forward walk toward the funnel. See **The approach problem** above.

**0:04.5 – 0:06.0 — first drop.** The rider drops into the chute and the slide immediately pitches over. The horizon snaps to the top edge of frame. The chute walls converge to a sharp V beneath the feet, water sheeting down them in white ribbons. Bright cyan LED dots run along both upper edges in perspective, converging toward the vanishing point. The city fills everything beyond.

**0:06.0 – 0:08.5 — exposed descent + lightning.** Speed is fully up. Water spray flares off both side walls into the lower corners of frame. A **lightning bolt** fires down through the cloud on the left, over the city, illuminating the wet transparent slide surface from outside. The whole environment stays visible through and around the chute — the slide never becomes a tunnel.

**0:08.5 – 0:13.0 — rooftop run and building gaps.** The slide flattens across a rooftop layer, then drops again between two towers. Lit windows pass close on both sides. A second lightning strike hits behind a building. Individual rooftops, water tanks and parapets are legible at speed. The chute banks left and right, and the camera and legs bank with it.

**0:13.0 – 0:17.5 — street canyon.** The slide descends into the gap between buildings, walls rising on both sides. Streetlights and window grids stream past. The vanishing point ahead is a small bright rectangle — the pool.

**0:17.5 – 0:19.0 — final acceleration and splashdown.** One last steep straight. Water spray whites out the upper frame. The POV punches into the water; the frame goes turquoise and foaming.

**0:19.0 – 0:20.16 — resurface.** Feet float in a lit turquoise pool, dark buildings standing around it against the night sky. The camera settles. The take has still not cut.

---

## The primary blueprint — the full ride

**20.16 s · same grammar as the supporting reference.** This is the ~13 M-view clip. Its opening is dissected above; this is the rest of its ride. Read alongside the supporting reference it also shows which elements are *format* and which are merely *dressing*.

The launch deck is **dark wet textured stone rather than glass**, and the funnel is nearly clear — only a thin blue LED hoop arcs over the entrance, so the mouth reads as a pale skeleton rather than a glowing block. The city below is flatter and more radial: avenues fan outward from the centre in bright orange spokes toward a distant horizon line under a deep navy sky.

The ride: near-vertical first drop with the LED hoops passing overhead in rhythm · a long transparent straight where the whole illuminated city sits directly beneath the transparent floor · a cloud-and-lightning band around 0:09 where the slide passes through a bright mist layer · banked curves over rooftops · a street-canyon descent between towers at 0:15 · a foaming splashdown at 0:17.5 · resurface in a rooftop pool with buildings around it.

**What the blueprint and the supporting reference agree on, and therefore what the format actually is:**

- rider's bare legs and feet in the lower quarter, always
- transparent chute, walls converging to a V, seen from inside
- water sheeting continuously down the chute, spraying off the sides
- the city visible *through* the slide, not just past it
- exactly one storm/lightning beat in the middle third
- a street-canyon or building-gap section before the end
- splashdown into a lit pool, then a brief float

---

## Colour Variant — blue-hour city, red LED

**20.16 s.** Same ride, different palette and much greater apparent altitude.

**Opening.** A glass-floored observation deck at **blue hour**, so high that the horizon shows visible curvature and a hazy cloud layer sits *below* the deck. A lakeshore grid city glows in miniature far underneath. Red LED strips run along the deck floor and around the funnel mouth, which is moulded in **translucent red acrylic**. Glass wind-screens stand on both sides; a curved canopy edge cuts the upper right corner.

The ride is more **curve-dominated** than the two night-city clips: after the drop it settles into long sweeping banked turns in a wide red half-pipe, the twilight sky sliding across the top of the frame while the city rotates below. The red walls take the light and glow from inside. A small **cyan rectangle — the target pool** — is repeatedly visible far below, appearing and disappearing as the slide banks, which is what makes the height keep re-registering. Final steep run, spray whiteout, splash into a turquoise pool, feet floating.

**What this variant proves:** the LED colour recolours the *entire interior* of the shot, not just the trim. A red slide makes the rider's legs, the water and the spray all read warm. Whichever colour the user picks, the light must spill onto the water, the wet walls and the skin.

---

## Environment Variant — golden-hour mountain, no LEDs

**30.21 s.** The proof that the format is not about cities.

**Opening.** The rider stands barefoot on a **bare granite ledge** in late golden light. Directly ahead, a clear acrylic chute mouth with raised transparent side rails sits on the rock. Beyond it: a Yosemite-like valley — a sunlit granite monolith catching orange light, a tall thin waterfall falling hundreds of metres down the cliff face opposite, and a dark forested valley floor an enormous distance below. No LEDs anywhere. Black shorts, bare feet, natural skin.

**The ride.** Drop straight down the cliff face · the chute runs so close to the rock that the granite texture streams past at arm's length · **passes alongside the waterfall**, spray and roar · through a thick white mist/cloud band around 0:13–0:15 where visibility drops to almost nothing · out again into blazing gold light on the sunlit granite wall · a long transparent chute descending the cliff with the valley continuously visible beneath the floor · the monolith reappearing ahead as the route curves.

**What this variant proves:**

- The format survives with **no LEDs at all.** Clear acrylic in daylight works; the environment supplies the colour.
- The **environment must supply the spectacle beat.** In the city it is lightning; here it is the waterfall pass and the cloud-band blackout. The beat is structural, the content is local.
- **Height must be re-established repeatedly.** In the city, gaps between buildings do it. Here, the valley floor under the transparent chute does it.
- A 30-second version fills the extra time with **more route**, never with more setup.

---

## Generated examples — what this skill actually produced

Four clips in `Generated examples/`, all made with the **first** version of this skill, across four different video models. Each was read at 0.25 s intervals across its first five seconds.

| File | Model | Length | Opening frame | Motion begins | Verdict |
|---|---|---|---|---|---|
| `Minimax H3.mp4` | Minimax H3 | 15.1 s | Already **inside** the flowing chute, ringed by glowing LED hoops | **0.0 s** | ❌ worst |
| `Seedance 2.5.mp4` | Seedance 2.5 | 15.1 s | Seated at the chute mouth, knees up, camera already aligned down the slide | ~1.0 s | ❌ |
| `Seedance 2.5 (2).mp4` | Seedance 2.5 | 20.0 s | Seated in the chute, camera **level and slightly up** toward a tower spire | ~0.5 s | ❌ |
| `Wan 3.0.mp4` | Wan 3.0 | 15.0 s | Standing on a steel grate deck, feet visible, slide pod ahead | ~1.0 s | ⚠ closest |

### What they get right

Confirmed working, and preserved unchanged by this revision: photorealism · vertical 9:16 single take · rider's bare legs and feet in the lower frame · transparent chute with converging walls · continuous flowing water and spray · LED colour spilling onto water and skin · genuinely extreme height in the environment · connected slide geometry · steep first drops · splashdown endings.

### What they are all missing

**Anticipation.** Three of the four are in motion within half a second and the fourth within one. None of them contains a moment where a still camera looks down and lets the drop land. The structure they produced is:

```
already aligned with the slide  →  immediately sliding
```

There is no *before*, so there is no fear — only spectacle. The viewer never gets to imagine sitting there.

### The specific framing failure

`Minimax H3.mp4` is the clearest diagnostic. Its opening frame is roughly **70 % slide structure** — concentric glowing rings, chute walls, water — and the city survives only as a small keyhole at the centre. Every element the earlier skill asked for is present, and the height is invisible anyway.

Compare the composition of the first frame of each:

| | World below | Body + platform | Slide structure |
|---|---|---|---|
| **Primary blueprint** | ~35 % | ~48 % | ~10 % |
| `Wan 3.0` | ~45 % | ~35 % | ~12 % |
| `Seedance 2.5` | ~40 % | ~35 % | ~20 % |
| `Seedance 2.5 (2)` | ~35 %, but framed as a **horizon vista**, not a void below | ~35 % | ~20 % |
| `Minimax H3` | **~5 %** | ~25 % | **~70 %** |

Two rules come straight out of that table and are now in `SKILL.md` → **Frame the void, not the slide**: the slide entrance must stay **small** in the opening frame, and the camera must be angled **down**, not level — a horizon vista reads as a view, while a downward angle past a visible platform edge reads as a fall.

### Why `Wan 3.0` is closest

It is the only one that opens **standing and briefly still** — roughly 0.75 s on a steel grate deck with the city far below before the rider moves. That fragment is the right instinct. What it still lacks is everything this revision adds: a pronounced downward tilt, a visible platform edge with the void past it, hesitation body language, and a distinct committing hop instead of a smooth glide forward.

---

## The physics, as filmed

Consistent across all four:

- **Acceleration is gravity-shaped**, not linear. Slow over the lip, violent through the first drop, sustained fast, another surge on each subsequent drop.
- **Motion blur scales with speed.** The chute edges and passing environment smear; the legs and feet stay comparatively sharp because they move with the camera.
- **Camera shake is small and high-frequency** — an action camera strapped to a body, not a handheld operator. It never swings.
- **Banking is whole-body.** On a curve the horizon tilts, the legs slide toward the outer wall, and the water piles up on the high side.
- **Water spray comes from the side walls**, sweeping into the lower corners and occasionally across the lens. It intensifies exactly when speed does.
- **The feet move.** They lift slightly on crests, bounce on impacts, and splay against the water. They are never a static overlay.
- **Reflections do the work.** The wet chute reflects the city lights, the lightning, the sunset. This is the main thing separating these from a CGI look.

---

## What every reference has in common — the irreducible format

1. **A held, downward-angled opening in which nothing is falling yet** — the platform edge visible, the world enormous distances below, the slide entrance small in frame.
2. **A stall before the commit**, followed by a fast entry into the chute — a hard change from stillness to falling, not a fade.
3. Vertical 9:16, one continuous first-person take, no cuts, no third-person frame anywhere.
4. Rider's thighs, lower legs and bare feet in the lower quarter to third of the frame throughout.
5. A transparent or translucent slide, wet, with raised side walls converging to a V ahead.
6. Water flowing continuously down the chute and spraying off the walls.
7. An extreme, near-vertical first descent.
8. The surrounding world visible beside, beyond and beneath the slide for essentially the whole ride.
9. Height so extreme it stays frightening even after the viewer adjusts.
10. Exactly one major mid-ride spectacle beat drawn from the environment.
11. A final steep acceleration into a splashdown, then a brief float.
12. Photorealistic rendering of an impossible structure.

**Kept in full by this skill.** Only the walk is discarded — items 1 and 2 are the ones the first version of this skill dropped by mistake, and restoring them is the whole point of the revision.