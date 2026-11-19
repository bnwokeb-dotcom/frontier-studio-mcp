# Vertical Sprint — Prompt Format

# Prompt Format

The output shape, the timing tables, the camera wording and the failure list.

---

## The output shape

Print one title line, then **the entire pasteable prompt in one fenced `text` block**:

~~~
# 🏃 VERTICAL SPRINT —  ×  × 

```text
VIDEO CONCEPT


CHARACTER


ENVIRONMENT


CAMERA SETUP


TIMELINE
0.0-1.5s
 Camera: 
...
13.5-15.0s
 Camera: 

MOTION & PHYSICS RULES
- ...

NEGATIVE / FAILURE PREVENTION
- ...
```
~~~

Then the follow-up menu from `SKILL.md`.

**Formatting inside the block:** plain uppercase labels, timestamps as `0.0-1.5s` on their own line, plain `-` bullets. No `#`, no `**`, no emoji. These would be pasted into the video model as literal characters.

**Never print a metadata block** (`Duration:`, `Aspect Ratio:`…). The user sets those in the video model. The timeline length carries the duration.

**Length:** set by the model profile below. Each `TIMELINE` beat is 1–3 sentences: action first, then `Camera:`. Each bullet list has 5–8 lines.

---

## Section by section

### VIDEO CONCEPT
One sentence: *"Photorealistic smartphone footage, filmed by a spectator at the start line, of [character] sprinting up a [structure] at a packed [event], performing a [trick] above the top edge, and running back down to celebrate in front of the camera."*

### CHARACTER
**Generated:** one compact description covering gender, approximate age, build, skin tone, hair, outfit with its colour block, and footwear. End with *"Refer to them as the same athlete throughout."*

**Uploaded reference:** use this lock, then the one-line anchor:
> The athlete is the person in the uploaded reference image. Preserve their exact identity throughout: the same face, hair, skin tone, body shape and proportions, outfit, colours, footwear and accessories. Do not redesign, restyle or change their clothing. Visual anchor: [what you read off the image, one line].

### ENVIRONMENT
Always open with the **scale lock** (see `SPRINT_LOGIC.md` → **Scale**): the runway length, the structure's height as a multiple of the athlete's height, and how it fills the frame. Then three to four sentences: the structure (material, colour, curved base, vertical face, height relative to the athlete, top deck), what stands behind it, the runway with barriers and the crowd (two sentences at most), and the light.

### CAMERA SETUP: the camera lock
Always include this paragraph. Reword lightly if needed, but never drop a clause:

> Filmed handheld on a smartphone by a member of the public standing in the front row of the crowd, behind the steel barrier at the start of the runway, just to one side of it, at eye level, facing the structure. The foreground is the crowd: the barrier rail along the lower edge, other spectators' heads, shoulders, raised phones and hands at the lower and side edges, never covering the runway or the structure. The camera is never on the runway itself and never behind the athlete like a camera operator. The camera never changes position: no tracking, dolly, orbit, drone or side view, and no cuts. It follows the action only by tilting and zooming, and stays at ground eye level the whole time: it never rises, cranes or lifts toward the top, so the top of the structure is always seen from below, looking up. It starts wide with the athlete close in the foreground, back to camera, and the whole structure visible straight ahead. It tilts up and zooms in as the athlete climbs, holds on the top edge and open sky during the trick, then tilts down and zooms back out as the athlete runs back toward the lens. Natural handheld micro-shake, slightly reactive framing, realistic phone exposure.

Then one line on the lens: *"Phone main lens at the start and end, smooth 3–4× punch-in zoom for the top of the structure."*

### TIMELINE
Every beat gets a timestamp and a `Camera:` clause. Use the tables below.

### MOTION & PHYSICS RULES
Pick the 5–8 most relevant:
- One continuous out-and-back run: away from the camera, up the wall, trick, down the wall, back toward the camera.
- Clear foot contact on every surface: runway, curve, vertical face, top deck.
- On the curve and the vertical face the body stays perpendicular to the surface underfoot, as if gravity follows the wall; short, fast, flat-footed steps.
- Momentum always points the right way: away and up on the climb, down and toward the camera on the return.
- The trick is one continuous rotation on one axis with a clear apex; gravity brings the athlete back down onto the top deck.
- Feet-first landing with bent knees and visible weight transfer.
- The athlete's identity, outfit and proportions stay constant at every distance and through the rotation.
- The structure, crowd and barriers stay fixed in place for the whole shot.

### NEGATIVE / FAILURE PREVENTION
Pick the 5–8 most relevant:
- No cuts, no scene changes, no change of camera position, no side or drone angles.
- No climbing with the hands, no sliding down the wall, no ropes or harness.
- No teleporting, floating, hovering, or freezing in mid-air.
- No extra limbs, merged limbs, body warping, or face changes when the athlete is small in frame.
- No second athlete and no duplicate of the athlete.
- The trick never happens off-screen; the top edge stays in frame during the trick.
- No captions, on-screen text, watermarks, logos or sponsor branding.
- The video does not end before the athlete is back near the camera.

---

## 15-second template (DEFAULT)

Measured from the references (trick peak at 55–67 % of the runtime, close-up in the last 1.5–2.5 s).

| Time | Beat | Action | Camera |
|---|---|---|---|
| **0.0-1.5s** | Hook | Athlete close to the lens, back turned, at the start line; takes the first explosive strides. Structure dead centre; crowd on both sides, phones up. | Wide, static, athlete large in the foreground. |
| **1.5-4.5s** | Sprint away | Full sprint straight down the runway, shrinking with distance; the crowd cheers as they pass. | Static; begins a slow zoom-in. |
| **4.5-7.5s** | Ascent | Hits the curve at full speed, the body rotates with it, sprints straight up the vertical face. | Tilts up and zooms in, keeping the athlete and the top edge in frame. |
| **7.5-8.5s** | Launch | Reaches the top edge, plants and pops upward into open sky. | Top edge in the lower third, sky above. |
| **8.5-10.5s** | Trick | The trick in stages: pop, rotate, apex, open out. | Holds steady with slight reactive drift; the edge stays in frame. |
| **10.5-11.5s** | Landing | Lands feet-first on the top deck or lip, absorbs, a brief balanced beat (arms up or a quick pose). | Holds, then starts tilting down. |
| **11.5-13.5s** | Return | Runs straight down the vertical face facing camera, out of the curve, sprints back up the runway. | Tilts down and zooms out smoothly. |
| **13.5-15.0s** | Payoff | Decelerates close to the lens; celebration (arms up, roar, pointing to the sky, flex or pose). The crowd erupts. | Medium close-up, chest to head, crowd behind. |

## 10-second compact (option)

Same loop, compressed. Use only if the user asks or the model is capped at 10 s.

| Time | Beat |
|---|---|
| 0.0-1.0s | Hook + first strides |
| 1.0-3.0s | Sprint away |
| 3.0-5.0s | Curve + vertical ascent |
| 5.0-5.5s | Launch |
| 5.5-7.0s | Trick |
| 7.0-7.5s | Landing |
| 7.5-9.0s | Down the face + back up the runway |
| 9.0-10.0s | Celebration close-up |

## 30-second extended (option; clips 03 and 04)

The extra time goes into the air and the payoff, not the approach.

| Time | Beat |
|---|---|
| 0.0-2.0s | Hook |
| 2.0-6.0s | Sprint away |
| 6.0-10.0s | Ascent |
| 10.0-11.0s | Launch (optional swan pose at the lip) |
| 11.0-21.0s | Extended airtime: 3–5 consecutive flips, rising and falling above the edge, each rotation clean |
| 21.0-22.5s | Landing |
| 22.5-26.0s | Down the face + back up the runway |
| 26.0-30.0s | Long celebration close-up, crowd going wild |

---

## Camera variants (only on request, or via follow-up option 6)

| Variant | Use when | Change |
|---|---|---|
| **A. Start-line spectator** (default) | always | as above |
| **B. Side entry** (clips 03, 04, 10, 13) | the user wants more face time at the start | 0.0-2.0s: the athlete runs toward and past the camera from the front-right, face visible. The camera swings to follow onto the runway axis, then behaves exactly like A. |
| **C. Mid-climb start** (clips 05, 06, 17) | more time for tricks | Filmed from behind a row of spectators' heads. The athlete is already at the foot of the ramp at 0.0s; ascent 0.0-4.0s; top + trick 4.0-7.0s; a second trick on the way down 9.0-11.0s; landing and celebration at the bottom 12.0-15.0s. |

The camera **position** is static in every variant. Only the start of B includes a swing.

---

## Model profiles (STEP 5)

| | Seedance 2.5 | Wan 3.0 |
|---|---|---|
| Length | **No cap.** About 600–1,000 words is fine. Use the room for scale, foot contact, camera path and crowd reactions. | **Hard cap: 4,800 characters** for the whole block (Wan rejects anything over 5,000). Trim crowd and lighting wording first, never a timeline beat. |
| Reference upload | omni-reference: pass the image as an image reference and say "the person in the reference image" | pass the image as `image_references`; same wording |
| Emphasis | Can carry the full MOTION & PHYSICS and NEGATIVE lists (8 lines each). | Keep 5–6 lines per list. Put the scale and the ground-level camera clauses in ENVIRONMENT and CAMERA SETUP, where the model weights them most. |
| Settings | 15 s, 9:16, 720p or 1080p, audio on | 15 s, 9:16, 720p or 1080p, audio on |

## Model notes

- **Wan 3.0 (Higgsfield `wan3_0`)**: hard limit of 5,000 prompt characters. Pass the character sheet as `image_references`. Tested 2026-10-02: identity, full loop and finish pose held well, but the model (a) ran the beats about 3 s early (trick at 5.5–7.5 s, longer close-up) and (b) lifted the camera to deck height during the climb. The "stays at ground eye level" clause above is the fix for (b). For (a), the timeline still matches the references, so it is left unchanged.

## Self-check before printing

- [ ] Frame one: athlete near the lens, structure dead centre, crowd and barriers on both sides.
- [ ] Scale lock: long runway (~50× athlete height), 90° face 50–60× athlete height, at least 6× taller than wide, short base curve, top cut off or barely visible in frame one.
- [ ] Length fits the chosen model (Wan 3.0 ≤ 4,800 characters; Seedance 2.5 uncapped).
- [ ] The camera lock paragraph is present: a spectator in the crowd behind the barrier, beside the runway, foreground heads/phones/barrier rail; never moves position.
- [ ] Every timeline beat has a timestamp and a `Camera:` clause, and the timeline ends exactly at the chosen duration.
- [ ] The trick is named with direction, shape, count and height, and broken into stages.
- [ ] The full loop: away → up → trick → land → down → toward → celebrate.
- [ ] The character is described once (or locked to the upload) and referenced by the same tag.
- [ ] No brands, no markdown inside the block, at most 4,800 characters.