# Funny Animal Stunts — Prompt Format

# Prompt Format

Both official durations, the output shape, and the rules for filling it.

---

## The output shape

Print the heading `# VIDEO PROMPT`, then put **the entire pasteable prompt inside one fenced code block**:

~~~
# VIDEO PROMPT

```
[Opening paragraph — style, shot type, character, animal, environment,
travel direction, in prose.]

[Camera orientation lock paragraph.]

TIMELINE

0:00–XX
…one beat per block, every block timestamped…

CAMERA BEHAVIOR
…

CONTINUITY & MOTION RULES
- …
- …
```
~~~

**Everything the user pastes into the video model goes inside that single block**, so one click of the Copy button takes the whole prompt. Never split the usable prompt across loose paragraphs, and never leave part of it outside the fence. Any commentary of your own stays *outside* the block, and stays short.

Because the content sits inside a code fence, the section labels are **plain uppercase text**, not markdown headings — `TIMELINE`, not `## TIMELINE`. Markdown does not render inside a fence, and stray `#` and `**` characters get pasted into the video model as literal junk. Use plain text throughout: no bold, no italics, no heading marks.

The `TIMELINE` is the deliverable. `CAMERA BEHAVIOR` and `CONTINUITY & MOTION RULES` are short supporting blocks — a handful of lines each, only what materially improves the generation. If a line would not change what the model produces, cut it. `CONTINUITY & MOTION RULES` stays **bulleted** with plain `-` dashes, never a paragraph.

---

## Never print a metadata block

The prompt does **not** open with labelled fields. No `Duration:`, no `Aspect Ratio:`, no `Visual Style:`, `Shot Type:`, `Character:`, `Animal:` or `Environment:` lines.

**Duration and aspect ratio are set by the user inside the video model**, so printing them in the prompt is noise. Everything else those fields carried moves into the opening paragraph as prose.

> **The duration logic is unchanged.** The chosen length still drives the whole timeline: 10 seconds ends at `0:10`, 15 seconds ends at `0:15`, and the pacing tables below still apply in full. Only the printed `Duration:` line is gone.

---

## The opening paragraph

One short paragraph, prose, in this order:

1. **Style and shot** — "Create photorealistic viral smartphone footage captured in one continuous handheld shot."
2. **The premise** — the uploaded reference character riding the selected animal, in the selected environment.
3. **Identity lock** — instruct the model to preserve the character's exact identity, face, build, hairstyle, clothing, footwear and distinctive features from the uploaded reference image. **Never invent a description of the character** — the reference image is the source of truth.
4. **The animal** — its physical description: coat or hide, colour, build, horns/tusks, distinguishing features.
5. **The environment** — the ground, the terrain features, the light, the atmosphere.
6. **The travel direction** — one clause naming the axis: "moving from left to right across frame."

Then, as its own paragraph immediately after, the **camera orientation lock** (see below). It comes before `TIMELINE`, never buried in `CAMERA BEHAVIOR` at the end — the model weights the opening most heavily, and this is the constraint that fails most often.

### Worked opening

> Create photorealistic viral smartphone footage captured in one continuous handheld shot. The uploaded reference character is riding an adult male polar bear across the North Pole, moving from left to right across frame. Preserve the character's exact identity, face, build, hairstyle, clothing, footwear, and distinctive visual features from the uploaded reference image. The polar bear has a thick cream-white coat with a faint yellow cast, broad heavy shoulders, a black nose, small dark eyes, and wide paws. The surrounding environment consists of flat drifting sea ice, hard wind-packed snow over pale blue ice, pressure ridges of tilted ice slabs, distant dark open water, a low sun near the horizon, and thin surface snow blowing sideways in the wind.
>
> The camera films the entire stunt from a strict lateral side profile, positioned roughly 90 degrees perpendicular to the bear's direction of travel. The bear's full flank stays visible throughout — head toward the right of frame, tail toward the left — and both rider and bear travel horizontally across the frame, never toward or away from the lens. The camera tracks alongside them like someone running parallel to the stunt and filming it from the side. It may pan, follow, tilt, shake and adjust speed to hold the framing, but the viewing angle never rotates into a head-on, frontal, rear, three-quarter, diagonal or orbiting perspective at any point — including during the launch, the airborne phase, the descent and the landing.

Then straight into `TIMELINE`. Nothing between them.

---

## 10-Second Template

Fast and compressed. The complete stunt, nothing removed.

| Segment | Beat | Contains |
|---|---|---|
| **0:00–0:01.5** | Hook | Rider already mounted and moving. Posture, grip, animal's gait, environment, direction of travel. |
| **0:01.5–0:03.0** | Approach | Speed building. Ramp enters frame. Rider shifts into position. |
| **0:03.0–0:04.0** | Launch | Animal contacts the ramp, climbs, reaches the lip. Rider compresses then extends. Both leave together. |
| **0:04.0–0:07.0** | Aerial trick | Separation instant, rider's rotation, animal's rotation, vertical and horizontal offsets, apex. |
| **0:07.0–0:08.5** | Descent + reconnect | Rider opens out, locates the animal, squares up, descends; animal drifts underneath and slightly ahead. |
| **0:08.5–0:10.0** | Remount + landing | Feet-first contact, absorb, crouch, grip; animal lands with an environmental burst; forward motion continues. |

At 10 seconds the remount and the landing may share the final block, but the **remount must still be described first and in full** inside it — mechanics before consequence, never a single clause.

---

## 15-Second Template

Longer preparation, clearer trajectories, a longer airborne spectacle. The remount gets its own segment.

| Segment | Beat | Contains |
|---|---|---|
| **0:00–0:02.0** | Hook | Rider already mounted and moving. Fuller posture and environment detail. |
| **0:02.0–0:05.0** | Approach + build-up | Speed visibly building. Ramp appears early and is read for longer. Rider settles low. |
| **0:05.0–0:06.0** | Launch | Ramp contact, the climb, the crest, the compression, the shared takeoff. |
| **0:06.0–0:10.5** | Aerial trick | The full airborne choreography, both rotations, apex, held station. |
| **0:10.5–0:13.0** | Descent | Rider opens, locates, aligns, descends; animal completes its rotation and sets up the interception. |
| **0:13.0–0:14.0** | Remount | Its own segment. Contact, absorption, grip, stabilization. |
| **0:14.0–0:15.0** | Landing + continuation | Animal touches down, environmental burst, forward motion, camera reaction, end. |

---

## Choosing timestamps

The tables above are the default. Shift them when the animal demands it — but keep the **proportions**, which are what both primary references independently agree on:

| Beat | Share of total runtime |
|---|---|
| Hook | 0–15 % |
| Approach | 15–32 % |
| Ramp + climb | 32–40 % |
| Launch + separation | 39–44 % |
| Aerial trick | 42–72 % |
| Descent + realign | 72–80 % |
| Remount | 80–89 % |
| Landing + continuation | 89–100 % |

**Heavy animals** (elephant, rhino, giraffe) — lengthen the ramp climb and the landing, shorten the approach.
**Fast animals** (bull, horse, tiger) — shorten the ramp climb, lengthen the approach and the airborne phase.

**Every block carries an explicit timestamp.** No exceptions, at either duration.

---

## Writing style

Write **precise visual choreography**: action · timing · direction · position · movement · contact · camera response. The goal is to tell the video model exactly what should visibly happen.

Avoid adjective stacking. One vivid concrete detail beats four decorative ones.

❌ "The magnificent, powerful beast soars majestically through the golden air as the fearless rider performs a breathtaking, gravity-defying aerial maneuver."

✅ "The bull leaves the ramp nose-up and rolls backward onto its spine, all four legs pointing skyward. The rider, two body-lengths above it, pulls into a tight tuck and completes one and a half backward rotations, staying framed directly over the animal."

**State positions relatively, never numerically.** "Two body-lengths above and slightly behind", not "3.4 metres". Timestamps in seconds are the exception — video models use those well.

---

## CAMERA BEHAVIOR

Default: **shocking eyewitness footage, not polished filmmaking.**

Vertical 9:16 · handheld smartphone · **strict side profile, perpendicular to travel** · one continuous shot · imperfect human tracking · small natural camera shake · natural motion blur · realistic phone exposure · reactive reframing · pans and tilts that follow the stunt · slight difficulty keeping the subjects centered.

The operator **reacts** to the stunt. The camera must not appear to know the choreography in advance — its reactions arrive a beat late. That lateness is what makes an impossible event look believable.

**Tracking through the trick — the part that must not be got wrong:**

| Moment | Camera | Orientation |
|---|---|---|
| At launch | Tilt up. Keep both subjects readable in frame. | still side profile |
| During separation | Frame enough empty space around them that the gap stays visible. Do not zoom in. | still side profile |
| At apex | Hold wide. Animal low in frame, rider high, both fully inside it. | still side profile |
| During descent | Tilt and pan down naturally. Keep both trajectories visible and show the rider closing on the animal. | still side profile |
| At the remount | Hold the contact moment readable. This is the payoff — never lose it. | still side profile |
| At the landing | Allow natural shake from the impact. | still side profile |

The right-hand column is not decoration. Tilting is rotation about the horizontal axis and is fine; **panning must never become arcing.** The camera's position relative to the animal's travel line stays perpendicular from the first frame to the last.

**Never frame the rider out of shot during the airborne or remount phases.** Losing him there destroys the whole premise.

Foreground occlusion — a bystander's shoulder, a vehicle rail, another phone held up — strengthens the eyewitness read and is worth adding when the environment supports it. It must never be placed so that it forces the camera behind or in front of the animal.

---

## The camera orientation lock — the hardest rule in the format

**The stunt is always filmed from a strict lateral side profile.** This is not a preference, and it is not one option among several. It is the single thing that makes the footage read as the reference format, and it is the rule generations break most often.

Every prompt must state the lock explicitly, in its own paragraph, using wording of this shape:

> The camera films the entire stunt from a strict lateral side profile, positioned roughly 90 degrees perpendicular to the animal's direction of travel. The animal's full flank stays visible throughout — head toward one side of frame, tail toward the other — and both rider and animal travel horizontally across the frame, never toward or away from the lens. The camera tracks alongside them like someone running parallel to the stunt and filming it from the side. It may pan, follow, tilt, shake and adjust speed to hold the framing, but the viewing angle never rotates into a head-on, frontal, rear, three-quarter, diagonal or orbiting perspective at any point — including during the launch, the airborne phase, the descent and the landing.

You may reword this for a particular model, but never weaken it and never drop a clause.

**Also fix the travel direction in every prompt.** State it once, in the opening paragraph, and keep it consistent through every timeline beat: *"the animal runs from left to right across frame"* (or right to left). A prompt that never names an axis invites the model to pick one — and the one it picks is usually into the depth of the frame.

### The one-line test

The animal's **full flank is visible in every frame**: you can see the length of its body, its legs in side view, its head pointing to one edge of the frame and its tail to the other. If a generation ever shows the animal's face straight on, or its backside receding, the lock has failed.

### What is still allowed

The camera is **not** locked off. It should still:

- track alongside the animal at roughly its speed
- pan horizontally to follow
- tilt up for the launch and down for the descent
- carry natural handheld shake and imperfect framing
- speed up or slow down slightly to keep the subjects in frame

What none of that may do is **rotate the viewing angle**. Movement that gradually carries the camera behind, in front of, or around the animal is exactly the failure this rule exists to prevent.

### Explicitly forbidden, every time

Name these in the prompt's constraints, not just in your head:

- head-on or frontal angles; the animal running toward the lens
- rear or behind angles; the animal running away from the lens
- three-quarter front or three-quarter rear views
- diagonal or oblique perspectives
- orbiting, arcing or rotating around the rider or animal
- any drift from side profile into any of the above partway through the shot

---

## CONTINUITY & MOTION RULES

Short, targeted, relevant. **Never a generic negative-prompt wall.** Choose from:

**Identity**
- The rider is the same person throughout, matching the uploaded reference exactly — face, hairstyle, body proportions, skin tone, clothing, footwear, accessories.
- Identity holds through fast aerial motion; no transformation, no second rider.
- The animal is the same individual from start to finish — same species, scale, coat, markings, horns or tusks, tail, proportions and limb count.
- No duplicate animals. No replacement animal for the landing. No morphing during the rotation.

**Motion**
- Continuous forward momentum throughout.
- Consistent gravity, one unbroken rotation, no direction reversals.
- No teleportation, no sudden pose reset, no sudden size change.
- No human-animal body fusion; correct limb count on both.
- One continuous shot, no cuts.

**Camera**
- Strict side-profile throughout; the camera stays perpendicular to the animal's direction of travel.
- The animal's full flank stays visible; it never turns toward or away from the lens.
- No head-on, frontal, rear, three-quarter, diagonal or orbiting angles at any point.
- The camera may track, pan, tilt and shake, but the viewing angle never rotates.

**Outcome**
- The rider lands **on top of the animal**, not beside or behind it.
- The rider does not miss the remount.
- The animal completes its landing with the rider mounted.

**Housekeeping**
- No captions, subtitles, watermarks or on-screen text.
- No background music unless the user asked for it.

Include the ones that apply to the shot you are writing. A focused list of eight lines outperforms thirty generic ones.