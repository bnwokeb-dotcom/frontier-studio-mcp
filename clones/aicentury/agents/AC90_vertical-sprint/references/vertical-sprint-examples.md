# Vertical Sprint — Examples

# Examples

One full workflow walkthrough, then three complete builds. Same loop every time, with a different character, structure and trick.

---

## Workflow walkthrough (logic test)

```
User:  start
Skill: 🏃 VERTICAL SPRINT. Step 1: How would you like to create the main character?
       1️⃣ Use a specific person or character reference
       2️⃣ New character (no reference image): describe one yourself, or let me create one
User:  2
Skill: Step 2: Tell me about the new character:
       A. Gender: 1️⃣ Male · 2️⃣ Female
       B. Who designs them? 1️⃣ ✍️ I'll describe them myself · 2️⃣ 🎲 Create one for me
User:  A2 B2
Skill: Your athlete: [a freshly generated woman, different every run] (type "another" for a different one)
       Step 3: What should she sprint up?  1️⃣ 🛹 Mega ramp … 5️⃣ 🌊 Dam wall  6️⃣ ➕ More
User:  1
Skill: Step 4: Pick the trick at the top:  1️⃣ 🔄 Backflip … 6️⃣ 🎲 Pick for me  7️⃣ ➕ More
User:  2
Skill: Step 5: Which video model?  1️⃣ 🎬 Seedance 2.5  2️⃣ 🌀 Wan 3.0
User:  1
Skill: [prints the full prompt + the follow-up menu]
```

**Describe-it-yourself path:** `start → 2 → "A1 B1, a grumpy 70-year-old in a yellow raincoat and wellies"` → the skill confirms in one line (adding only missing gaps such as footwear) → Step 3 → Step 4 → Step 5 → prompt.

**Reference path:** `start → 1 → "Upload a clear reference image…" → (image arrives)` → the skill confirms what it reads (gender included, so **no Step 2**) → Step 3 → Step 4 → Step 5 → prompt. If the user replies with text instead of an image, the skill asks once more and does not build.

**Shortcut path:** `start — male bodybuilder, ship bow, backflip` → every step is answered → the skill builds immediately.

**More path:** at Step 3, `6` → five new structures numbered 1–5 + `6 ➕ More`. The user picks one, or types More again for five more (never repeats).

---

## Example A — Uploaded reference × Ship bow × Backflip (15 s)

# 🏃 VERTICAL SPRINT — Your character × Ship bow × Backflip

```text
VIDEO CONCEPT
Photorealistic smartphone footage, filmed by a spectator at the start line, of the uploaded character sprinting straight up the giant bow of a dry-docked cargo ship at a packed shipyard stunt event, launching a high backflip above the top of the bow, and running back down to celebrate in front of the camera.

CHARACTER
The athlete is the person in the uploaded reference image. Preserve their exact identity throughout: the same face, hair, skin tone, body shape and proportions, outfit, colours, footwear and accessories. Do not redesign, restyle or change their clothing. Visual anchor: bald, heavily muscled man, shirtless, in neon-orange shorts and black trainers.

ENVIRONMENT
An enormous cargo ship sits in dry dock, its rust-red bow rising straight ahead: the bulbous base flares into a smooth curve and then a sheer vertical prow about fifty-five times the athlete's height, as tall as a thirty-storey skyscraper, perfectly vertical, ending in a railed top edge against the sky. Blue gantry cranes stand behind it. A long wet concrete runway leads to the bow, lined on both sides by steel crowd barriers holding back a dense crowd several rows deep, most of them filming on raised phones. Flat grey overcast light, damp reflections on the ground.

CAMERA SETUP
Filmed handheld on a smartphone by a member of the public in the front row of the crowd, behind the steel barrier at the start of the runway, just to one side of it, at eye level, facing the ship; the barrier rail and other spectators' heads and raised phones frame the lower edge of the shot, never covering the runway or the ship. The camera never changes position: no tracking, dolly, orbit, drone or side view, and no cuts. It follows the action only by tilting and zooming. It starts wide with the athlete close in the foreground, back to camera, and the whole bow visible straight ahead. It tilts up and zooms in as he climbs, holds on the top edge and open sky during the trick, then tilts down and zooms back out as he runs back toward the lens. Phone main lens at the start and end, smooth 3-4x punch-in for the top of the bow. Natural handheld micro-shake, realistic phone exposure.

TIMELINE
0.0-1.5s
The athlete stands just in front of the lens with his back to camera, shoulders rolling, then drives off into his first explosive strides toward the ship. Camera: wide and static, athlete large in the foreground, bow dead centre.

1.5-4.5s
He sprints straight down the runway away from the camera, arms pumping, orange shorts bright against the wet concrete, shrinking with distance as the crowd on both sides cheers. Camera: static, beginning a slow zoom-in.

4.5-7.5s
At full speed his feet hit the flared base of the bow and he runs up the curve, his body tilting with it until he is sprinting straight up the vertical prow with short, fast, flat-footed steps. Camera: tilts up and zooms in, keeping him and the top edge in frame.

7.5-8.5s
He reaches the top edge, plants one last strong step and pops upward off it into the open grey sky. Camera: the top of the bow sits in the lower third, sky above.

8.5-10.5s
Rising about three body heights above the edge, he tucks his knees to his chest and completes one clean backward rotation, reaches the apex inverted, then opens out feet-down above the top of the bow. Camera: holds steady with slight reactive drift; the edge stays in frame.

10.5-11.5s
He lands feet-first on the top edge, knees bending deeply, arms out for balance, then throws both fists up. Camera: holds, then starts tilting down.

11.5-13.5s
He turns and runs straight down the vertical prow facing the camera, out of the curve and back up the runway toward the lens as the crowd roars. Camera: tilts down and zooms out smoothly.

13.5-15.0s
He slows to a stop close to the lens, chest heaving, roaring with both arms raised while spectators behind the barriers cheer and film. Camera: medium close-up, chest to head, crowd and ship behind.

MOTION & PHYSICS RULES
- One continuous out-and-back run: away from the camera, up the bow, backflip, down the bow, back toward the camera.
- Clear foot contact on the runway, the curve, the vertical prow and the top edge.
- On the curve and the prow his body stays perpendicular to the surface underfoot, as if gravity follows the hull.
- The backflip is one continuous rotation with a clear apex; gravity brings him back onto the top edge.
- Feet-first landing with bent knees and visible weight transfer.
- His identity, orange shorts and proportions stay constant at every distance.

NEGATIVE / FAILURE PREVENTION
- No cuts, no change of camera position, no side or drone angles.
- No climbing with the hands, no ropes or harness, no sliding down the hull.
- No floating, hovering or freezing in mid-air.
- No extra limbs, body warping or face changes when he is small in frame.
- No second athlete.
- No captions, text, watermarks or logos.
```

---

## Example B — Generated female, casual × City-plaza mega wall × Swan layout (15 s)

# 🏃 VERTICAL SPRINT — Woman in cream sweatpants × City-plaza wall × Swan layout

```text
VIDEO CONCEPT
Photorealistic smartphone footage, filmed by a spectator at the start line, of a casually dressed young woman sprinting up a giant black quarter-pipe wall in a glass-tower plaza at a packed city street event, posing with arms spread at the top, launching a stretched layout backflip, and running back down to celebrate in front of the camera.

CHARACTER
A woman in her late 20s with a lean athletic build, warm brown skin and a high curly dark ponytail, wearing a cropped chocolate-brown long-sleeve sweater, baggy cream sweatpants and red-and-white high-top sneakers. Refer to her as the same athlete throughout.

ENVIRONMENT
A matte-black curved wall stands at the end of a wide stone plaza: its base sweeps up in a smooth quarter-pipe curve into a sheer vertical face a narrow, perfectly vertical 90° face about fifty-five times her height, taller than the neighbouring skyscrapers, with a clean flat top edge. Behind it rise diagonal steel-and-glass skyscrapers under a crisp blue sky with a few white clouds. A straight paved runway leads to the wall, lined on both sides by steel crowd barriers and a dense crowd of city spectators filming on raised phones. Bright midday light, sharp shadows.

CAMERA SETUP
Filmed handheld on a smartphone by a member of the public in the front row of the crowd, behind the steel barrier at the start of the runway, just to one side of it, at eye level, facing the wall; the barrier rail and other spectators' heads and raised phones frame the lower edge of the shot, never covering the runway or the wall. The camera never changes position: no tracking, dolly, orbit, drone or side view, and no cuts. It follows the action only by tilting and zooming. It starts wide with the athlete close in the foreground, back to camera, and the whole wall visible straight ahead. It tilts up and zooms in as she climbs, holds on the top edge and open sky during the trick, then tilts down and zooms back out as she runs back toward the lens. Phone main lens at the start and end, smooth 3x punch-in for the top. Natural handheld micro-shake.

TIMELINE
0.0-1.5s
The athlete bounces on her toes just in front of the lens, back to camera, ponytail swinging, then bursts into a sprint toward the wall. Camera: wide and static, wall dead centre, a spectator's phone at the lower edge.

1.5-4.5s
She sprints straight down the runway away from the camera, baggy sweatpants flapping, shrinking with distance as the crowd cheers her on. Camera: static, slow zoom-in begins.

4.5-7.5s
She hits the curve at full speed and runs up it, her body tilting with the surface until she is sprinting straight up the black vertical face with quick, flat-footed steps. Camera: tilts up and zooms in, keeping her and the top edge in frame.

7.5-8.5s
She steps onto the top edge, stops for a beat and spreads both arms wide like wings, silhouetted against the sky, then pushes off upward. Camera: the top edge sits in the lower third.

8.5-10.5s
Rising high above the edge, she performs a fully stretched layout backflip: body straight like a plank, arms out, one slow clean backward rotation, then she opens out feet-down. Camera: holds steady, slight drift, edge in frame.

10.5-11.5s
She lands feet-first on the top edge, knees bending, arms out to balance. Camera: holds, then starts tilting down.

11.5-13.5s
She turns and runs straight down the vertical face toward the camera, out of the curve and back up the runway, laughing. Camera: tilts down and zooms out.

13.5-15.0s
She stops close to the lens, throws both arms in the air and laughs in disbelief, one hand going to her chest, while the crowd behind her erupts. Camera: medium close-up, crowd and wall behind.

MOTION & PHYSICS RULES
- One continuous out-and-back run: away, up the wall, layout backflip, down the wall, back toward the camera.
- Clear foot contact on every surface; on the curve and the face her body stays perpendicular to the surface.
- The layout stays straight-bodied through one continuous rotation with a clear apex.
- Feet-first landing with bent knees.
- Her outfit, ponytail and proportions stay identical at every distance.

NEGATIVE / FAILURE PREVENTION
- No cuts, no change of camera position, no side or drone angles.
- No hand climbing, no sliding down the wall.
- No floating or freezing mid-air.
- No extra limbs or face changes when she is small in frame.
- No second athlete, no text, no logos.
```

---

## Example C — Generated male, martial artist × Dam wall (More) × Pick for me (15 s)

*🎲 picked for a martial artist: backflip at the top, a front flip on the way down, a salute at the finish (clip 17 pattern).*

# 🏃 VERTICAL SPRINT — Kung-fu athlete × Dam wall × Backflip + front flip

```text
VIDEO CONCEPT
Photorealistic smartphone footage, filmed by a spectator at the start line, of a martial artist sprinting up the curved concrete face of a giant dam at a riverside festival, backflipping above the crest, front-flipping on the way back down, and finishing with a martial-arts salute in front of the camera.

CHARACTER
A man in his early 30s with a lean, wiry build, light-tan skin and a short black topknot, wearing a black sleeveless kung-fu top with white knot buttons, wide white trousers tied with a red sash, and black kung-fu slippers. Refer to him as the same athlete throughout.

ENVIRONMENT
A huge pale-grey concrete dam wall rises straight ahead: its base sweeps up in a smooth curved spillway apron into a narrow, perfectly vertical 90° running lane about fifty-five times his height, topped by a railed crest road with spectators along it. Green forested hills sit behind under soft hazy daylight. A straight concrete runway along the river apron leads to the wall, lined on both sides by steel crowd barriers and a dense festival crowd holding up phones.

CAMERA SETUP
Filmed handheld on a smartphone by a member of the public in the front row of the crowd, behind the steel barrier at the start of the runway, just to one side of it, at eye level, facing the dam; the barrier rail and other spectators' heads and raised phones frame the lower edge of the shot, never covering the runway or the dam. The camera never changes position: no tracking, dolly, orbit, drone or side view, and no cuts. It follows the action only by tilting and zooming. It starts wide with the athlete close in the foreground, back to camera, and the whole dam visible straight ahead. It tilts up and zooms in as he climbs, holds on the crest and sky during the trick, then tilts down and zooms out as he runs back toward the lens. Phone main lens at the start and end, smooth 4x punch-in for the crest.

TIMELINE
0.0-1.5s
The athlete stands in front of the lens, back to camera, presses his fist into his palm, then launches into a sprint. Camera: wide and static, dam dead centre.

1.5-4.5s
He sprints straight down the runway away from the camera, red sash streaming, shrinking with distance between the cheering crowds. Camera: static, slow zoom-in.

4.5-7.5s
He hits the curved apron at full speed and runs up it, his body tilting with the surface until he is sprinting straight up the concrete face. Camera: tilts up and zooms in.

7.5-8.5s
He reaches the crest railing line, plants and springs upward into the sky. Camera: the crest sits in the lower third.

8.5-10.5s
High above the crest he tucks into one tight backward rotation, then opens out feet-down and lands on the crest edge, knees bent. Camera: holds steady, the crest in frame.

10.5-11.5s
He turns to face the camera, takes two steps down the vertical face and springs out into a tucked front flip, landing back on the face still running downward. Camera: begins tilting down.

11.5-13.5s
He runs down the rest of the face, out of the curve and back up the runway toward the lens. Camera: tilts down and zooms out.

13.5-15.0s
He stops close to the lens in a wide stance and bows with a fist-in-palm salute as the crowd roars and films. Camera: medium close-up.

MOTION & PHYSICS RULES
- One continuous out-and-back run with exactly two flips: a backflip above the crest, then a front flip on the descent.
- Clear foot contact everywhere; his body stays perpendicular to the surface on the curve and the face.
- Each flip is one continuous rotation with a clear apex and a feet-first landing.
- His outfit, sash and proportions stay identical at every distance.

NEGATIVE / FAILURE PREVENTION
- No cuts, no change of camera position, no side or drone angles.
- No hand climbing, no sliding, no ropes.
- No floating or freezing mid-air.
- No extra limbs or warping when he is small in frame.
- No second athlete, no text, no logos.
```