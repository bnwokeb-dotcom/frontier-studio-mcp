# POV Water Slide — Prompt Format

# Prompt Format

The output shape, the timestamp tables, the mandatory language, and the negative list.

---

## The output shape

Print the heading `# VIDEO PROMPT`, then put **the entire pasteable prompt inside one fenced code block**:

~~~
# VIDEO PROMPT

```
[Opening paragraph — style, shot, the rider already at the edge, the slide,
the environment, the height, the light. Prose, no labels.]

[The POV lock paragraph.]

[The opening sequence paragraph — look down, understand the depth,
hesitate, commit, hop, gravity catches. Explicit chronological language.]

TIMELINE

0:00–0:01.4
…one beat per block, every block timestamped…

CAMERA BEHAVIOR
…3–5 sentences…

CONTINUITY & MOTION RULES
- …short bulleted list, including the negatives…
```
~~~

Section labels inside the fence are **plain uppercase text**. No `#`, no `**`, no markdown of any kind — none of it renders inside a code block and all of it would be pasted into the video model as literal characters.

Everything you say outside the block stays short. One line before it at most, then the menu after it.

---

## Paragraph 1 — the opening

Everything the model needs before the first timestamp, in prose. It must carry:

- **Format and render** — vertical 9:16, hyperrealistic, one continuous single-take first-person POV
- **Where the rider already is** — standing or seated at the very edge of the launch platform, **completely stationary**, not approaching and not yet sliding
- **The body** — bare legs and feet filling the lower portion of the frame
- **The platform and its edge** — the wet deck, glass floor, rock ledge or steel grating under the feet, and the fact that it simply stops
- **The slide** — transparent or translucent, wet, water flowing, LED treatment if any, visible support structure. Described as **small in frame and just ahead**, not as the thing filling the shot.
- **The environment** — specific, named, with time of day and weather
- **The height** — at least one concrete altitude cue with known real-world scale
- **The drop** — that a near-vertical descent waits immediately past the edge

Worked example:

> Vertical 9:16, hyperrealistic single-take first-person POV. The rider is already standing completely still at the very edge of a wet black glass roof deck on a supertall skyscraper, bare legs and feet filling the lower third of the frame, the deck's edge crossing the middle of the shot and simply stopping. Just ahead and slightly below sits the flared mouth of an enormous transparent water slide — small in frame at this distance — with electric-blue LED strips tracing its wet rims and a sheet of water pouring over its lip and vanishing. Beyond the edge there is nothing but four hundred metres of open air and a vast night city, avenues running to the horizon as thin chains of orange light, traffic crawling as barely visible specks, the roofs of other skyscrapers far below. Dark storm cloud presses down on the skyline. The chute pitches away almost vertically past the mouth, and the drop is fully visible from the first frame.

---

## Paragraph 2 — the POV lock

Its own paragraph, immediately after the opening, in every prompt. Adapt the wording, never the content:

> The entire video is one continuous first-person shot from an action camera mounted at the rider's chest and looking down the body in the direction of travel. The rider's thighs, lower legs and bare feet stay visible in the lower portion of the frame from the first frame to the last. The camera banks with the body through every curve, pitches down with the slide through every drop, and carries constant subtle high-frequency vibration from the speed. It never detaches from the rider, never cuts, never switches to a third-person or drone angle, never orbits, never looks backward, and never jumps to a different part of the slide. There is no approach, no walking, no stairs and no establishing shot — the video begins with the rider already in position at the lip.

---

## Paragraph 3 — the opening sequence

**Required in every prompt.** Its own paragraph, immediately after the POV lock, before the timeline. It states the six micro-beats in explicit chronological language so the model cannot collapse them into motion-from-frame-one.

Adapt the environment details; keep the chronology and the causal words — *begin · then · hold · long enough · suddenly · immediately.*

> Begin with the rider completely stationary at the very top of the slide, legs and bare feet visible at the bottom of the first-person frame. The POV deliberately tilts downward over the edge for a brief moment, revealing the city streets impossibly far below and making the enormous vertical height immediately understandable. Hold this vertigo-inducing view long enough for the viewer to register the danger. The rider's legs subtly tense in hesitation. Then the rider suddenly commits, making one small forward hop and push from the platform into the flowing transparent chute. The POV jolts and dips with the body movement, the legs extend forward, and gravity immediately catches the rider, transforming the brief stillness into violent downward acceleration.

Swap the altitude cue for the chosen environment — *the valley floor and the river impossibly far below* · *the canyon floor and the thread of river a thousand metres down* · *the crevasse field and the tents reduced to dots* · *the canopy and the winding river far beneath*. Everything else stays.

**Three things this paragraph must never do:**

- describe any forward travel before the hop
- describe the hop as a jump, a leap, a dive or a run-up
- describe the view as beautiful, stunning or breathtaking — it is a **depth** statement, not a scenery statement

---

## The TIMELINE

Every block timestamped. Seven blocks by default, one per beat; the mid-ride may be split into two if the duration allows.

Write **what visibly happens**: pitch angle, direction, speed change, what the water does, what the environment does, what the feet do, what the camera does. Not mood.

❌ "The rider plunges terrifyingly down the side of the enormous building at breathtaking speed."
✅ "0:01.6–0:04.0 — The chute pitches past 75 degrees down the glass face of the tower. The horizon snaps to the top edge of frame and the city fills the lower two-thirds. Water accelerates around the calves in white ribbons, spray flares off both side walls into the lower corners, and the rider's feet lift briefly before slamming back into the sheet of water. Motion blur ramps hard on the passing façade; the LED rims converge to a single vanishing point ahead."

### 10 seconds

```
0:00–0:01.0    VERTIGO REVEAL — stationary at the edge, POV tilts down, depth registers
0:01.0–0:01.4  HESITATION — feet settle, legs tense, body leans and stops
0:01.4–0:01.8  COMMIT + HOP — one small push into the chute, POV dips and jolts
0:01.8–0:03.4  FIRST DROP — gravity catches, near-vertical, hard acceleration
0:03.4–0:05.4  MID-RIDE — one banked curve into one exposed straight
0:05.4–0:07.2  SECOND SPECTACLE — the single big environmental event
0:07.2–0:09.0  FINAL DESCENT — steepest run, destination visible ahead
0:09.0–0:10.0  SPLASHDOWN — impact, foam, brief settle
```

### 15 seconds *(the standard)*

```
0:00–0:01.4    VERTIGO REVEAL
0:01.4–0:02.0  HESITATION
0:02.0–0:02.5  COMMIT + HOP
0:02.5–0:05.0  FIRST DROP
0:05.0–0:08.0  MID-RIDE — two or three linked features
0:08.0–0:11.0  SECOND SPECTACLE
0:11.0–0:13.7  FINAL DESCENT
0:13.7–0:15.0  SPLASHDOWN
```

### 20 seconds

```
0:00–0:01.6    VERTIGO REVEAL
0:01.6–0:02.3  HESITATION
0:02.3–0:02.8  COMMIT + HOP
0:02.8–0:06.0  FIRST DROP — long enough to include a second stepped drop
0:06.0–0:10.2  MID-RIDE — four or five linked features
0:10.2–0:14.2  SECOND SPECTACLE — plus one extra height reveal
0:14.2–0:18.4  FINAL DESCENT
0:18.4–0:20.0  SPLASHDOWN
```

### Custom durations

Hold the same proportions. **The vertigo reveal never drops below one second at any length**, and the opening three beats always stay separate blocks. Extra seconds go to mid-ride and the second spectacle.

> Timing is elastic, not arithmetic. If a model needs a slightly longer hold to land the reveal, take it from the mid-ride. Never take it from beats 1–3.

---

## CAMERA BEHAVIOR

Three to five sentences after the timeline. Cover: the mount position · how it responds to drops (horizon rises, pitch follows the chute) · how it responds to curves (whole-frame banking, body sliding outward) · vibration and motion blur scaling with speed · water hitting the lens.

Open it with the head behaviour, then the ride behaviour.

> In the opening seconds the camera behaves like the rider's head rather than a mounted rig: it is still, angled down over the edge, and drifts only as much as a person deciding whether to go. It does not begin aligned straight down the chute. At the hop it dips and jolts sharply with the body, and from that point on it is body-mounted and moves only as the rider moves. On each drop it pitches down with the chute so the horizon rides the top edge of frame; on each banked turn the whole frame rolls with the body and the legs slide toward the outer wall. Vibration and motion blur are near zero before the hop and increase with speed after it, dropping back on the flatter sections. Spray sweeps across the lens repeatedly and beads on it briefly before clearing. Focus stays wide and deep throughout, with slight natural barrel distortion at the frame edges.

---

## CONTINUITY & MOTION RULES

A short bulleted list. Positives first, then the targeted negatives. Keep it to roughly 10–14 bullets — a focused list beats a generic wall.

Always present:

```
- One continuous first-person take from start to finish, no cuts.
- The rider is completely stationary until the hop; no forward travel of any kind before it.
- The hop is one small human push-off, never a leap, dive, run-up or jump into open air.
- The rider's two legs and two bare feet stay visible and anatomically correct throughout.
- The slide is a single continuous connected structure; every section physically joins the one before it.
- Water flows down the chute and sprays off the walls without interruption.
- The surrounding environment stays visible beside, beyond and beneath the transparent slide.
- Acceleration is gravity-driven: slow over the lip, violent through each drop, sustained fast between them.
- Photorealistic lighting, reflections, water physics and skin; real-world scale and atmospheric depth.
- No walking toward the slide, no stairs, no establishing shot, no third-person or drone angle.
- The video does not open mid-slide or already in motion, and the opening is not framed so tightly on the slide that the drop below is hidden.
- No cuts, no camera detaching from the rider, no teleporting between slide sections.
- No disconnected or floating slide pieces without visible support; no sudden environment change.
- No duplicated, deformed, extra or missing limbs; no hands entering frame distorted; the rider never turns around.
- No dry slide, no static water, no slow casual descent, no low theme-park scale.
- No enclosed opaque tube for more than a brief moment.
- No CGI, video-game or cartoon appearance.
```

Adapt the last few to the build — add "no visible ropes or harness", "no other riders", "no text or watermark" when relevant. Drop bullets that do not apply.

---

## Mandatory language checklist

Before printing, confirm the prompt explicitly contains all of it:

- [ ] first-person POV
- [ ] rider's legs and bare feet visible in the lower frame
- [ ] rider **already positioned at the edge in frame one, and stationary**
- [ ] the **POV deliberately tilts down over the edge**
- [ ] the **depth is held long enough to register** — stated, not implied
- [ ] a concrete altitude cue with known real-world scale
- [ ] the platform edge is visible and the void below has frame space
- [ ] **hesitation** — subtle body language before movement
- [ ] **one small forward hop or push-off** into the chute
- [ ] the **camera dips and jolts** at the hop; a visible transition from stillness to acceleration
- [ ] extremely steep initial drop
- [ ] **no walking toward the slide**, stated as a negative
- [ ] **no motion before the hop**, stated as a negative
- [ ] one continuous single take, no cuts
- [ ] realistic gravity-driven acceleration
- [ ] transparent or translucent slide (unless overridden)
- [ ] realistic flowing water and water spray
- [ ] immersive action-camera movement, shake and motion blur
- [ ] environmental scale kept visible through the ride
- [ ] photorealism, no CGI look
- [ ] continuous connected slide geometry, no teleporting
- [ ] final splashdown into the chosen body of water

Any missing item is a rewrite, not a note to the user.

---

## Priority order

When two goals conflict, the higher one wins:

1. Vertigo / fear reveal before any movement
2. Immediate understanding of extreme vertical height
3. POV deliberately looking downward
4. Brief anticipation / hesitation
5. Small physical hop or push into the slide
6. Clear transition from stillness to gravity-driven acceleration
7. Extremely steep first descent
8. Authentic first-person body and camera behaviour
9. Environment remaining visible so height perception survives
10. Continuous connected slide geometry
11. Speed, water spray and realistic physics
12. Spectacle and environmental interactions
13. Final splashdown

**The opening outranks everything.** A beautiful environment with a weak opening is a failed prompt. So is a technically perfect slide with four seconds of walking before the drop — and so is one that starts already sliding, which is the newer and more common failure. If pausing the first two seconds does not instantly communicate *"that is how far down this goes"*, nothing after it matters.

---

## Never print

- A metadata block — no `Duration:`, `Aspect Ratio:`, `Visual Style:`, `Shot Type:`, `Environment:`, `LED:` lines
- Multiple alternative prompts, unless variations were asked for
- Advice about how video generation works, or which model to use
- Camera brand names, lens specs or focal lengths
- Shot lists, scene numbers or storyboard tables
- Anything outside the code block except one short line and the follow-up menu