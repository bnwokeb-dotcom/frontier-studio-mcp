# PS2 Style — Shot Prompts (references/shot-prompts.md)

# Shot prompts (📼 Nostalgia): the image prompt and the 2-second video prompt for one shot

This file governs how one 📼 Nostalgia shot is written: the image prompt that makes the start frame, and the 2-second video prompt that brings it to life. A 🕹️ Free Style shot is written with `free-style.md`.

> Read `style-bible.md` first, every block it locks goes in verbatim. One shot is always two prompts, in this order: image first (the start frame), then video (the motion). Real examples of both: `worked-examples.md`.

---

## The two-step shot

| Step | What the user does | What this skill writes |
| --- | --- | --- |
| 1 · Image | Attaches the template frame (and any look examples) to an image model in edit mode, pastes the image prompt, makes **2 versions** and keeps the most blocky and blurry | The image prompt |
| 2 · Video | Attaches the chosen image as the start frame of an image-to-video model, pastes the video prompt, makes one clip | The video prompt |

The template frame is a still from the trend video they are copying (any city): they pause the trend on the shot and take a screenshot. One screenshot per shot.

---

## Reading the template frame

When a template frame is attached, read it first and print a short card:

```
👀 What I can see
📷 Camera: [height, angle, distance, static or moving]
🎯 Subject: [what is in focus and where it sits in the frame]
🌇 Light: [time of day, weather]
🏙️ To swap: [the landmark, vehicle, crowd or clothing that belongs to the old city]
```

Inside a reel, add ` · shot [N]` to the card's first line. Translate the card labels into the reply language (English unless the user writes in another).

Then say what it becomes in the user's city in one line. If the user already named the city and the subject, that line is a statement and the prompts follow in the same reply; only when the city is missing is it a question (with a proposal). The camera, framing and light of the template stay; only what belongs to the old city changes.

---

## The image prompt

Fill the slots; paste the look block and the closing line from `style-bible.md` word for word.

```text
Full frame, no borders.

[LOOK BLOCK, A, B or C from style-bible.md, with CITY and COUNTRY filled]

[KEEP LINE, one sentence: what stays from the template, e.g. "Keep the skater doing a kickflip in mid-air in the same pose and framing."]

[SWAP LINES, what changes: the landmark written as shape and colour, the people and their clothing, the vehicle, the light if it changes. Two to four sentences.]

[IMAGE CLOSING LINE from style-bible.md, the A/B form, or the block-C form]
```

### Slot rules

| Slot | Rule |
| --- | --- |
| Look block | A when only a template is attached (the default, first-time hits on 3 of 3 shots) · B when look examples are attached too · C when nothing is attached · D when only the user's own earlier images are attached (continue from my image) |
| Keep line | Names the subject and its action exactly as in the template, the pose, the vehicle, the crowd. Block B carries the camera itself, so its keep line can be skipped |
| Swap lines | Landmark as shape and colour (`style-bible.md` §Landmarks in words) · placement in frame (`right behind and above him`, `ahead and to the left`) · people by age, clothing and action · colours instead of logos |
| Block C and D | No keep line. The scene opens with the camera written in full: height, angle, distance, what is in the foreground, middle and back. Name every vehicle and person as a low-poly game model |
| Replacing a landmark | When the template's old landmark is big in frame, name it in the swap: `Replace the Ferris wheel and towers with …` |
| Counts | For small groups (up to six), give the number: `a group of four friends`, `two simple low-poly passengers`. Crowds are carried by the template |

**Short scenes win.** The shots that hit first time had two to four swap sentences. Every word should be something a viewer could point at.

---

## The video prompt

```text
[VIDEO OPENER from style-bible.md]

[CAMERA SENTENCE]. [SUBJECT MOTION, one to two sentences]. [BACKGROUND MOTION, one sentence].

[VIDEO CLOSING LINE from style-bible.md]
```

### Slot rules

| Slot | Rule |
| --- | --- |
| Duration | 2 seconds by default, the trend cuts every 1 to 2 seconds. A longer clip only when the user asks; then change `2-second` in the opener to match, keep the same single action, and say once that the reel uses about 2 seconds of it |
| Camera sentence | First, always. One of three: `Static camera` (with the vantage: `at eye level`, `from inside the stand`, `low`) · a calm follow at a fixed distance: `The camera follows directly behind the water taxi at the same distance` · for a ride, first person: `First-person view of the rider, moving forward at a steady pace` (untested, the bike shot has no saved prompt) |
| A camera move asked for | Pan, orbit, spin: say in one line that a moving camera makes the model invent parts of the city that are not in the start image, so buildings and faces warp. Keep it static by default; a slow sideways pan is the one opt-in, marked untested. Never an orbit |
| Subject motion | The movement comes from the subject, never the camera: the boat speeds and bounces, the crowd walks towards the camera, the fans jump, the skater lands and rolls out of frame, the friend sips. Name the people from the image by what they wear or do |
| Background motion | One small sign of life: pedestrians, a passing water taxi, flags waving, lamps glowing, string lights swaying |
| The image | Describe only what moves. The start image carries the look, the place and the people |

---

## Self-check for a shot

1. The image prompt opens with `Full frame, no borders.` and holds exactly one look block, verbatim, matching what the user attaches.
2. `[CITY]` and `[COUNTRY]` are filled (for a subject that is not a place, `[CITY], [COUNTRY]` together become its setting, as `[PLACE]` in `style-bible.md` §Image block C); no `[SLOT]` placeholder survives in any fenced block.
3. Every landmark is shape and colour; no real photo, no club or brand name; nothing the template does not show is described as if it did (no ball unless one is visible).
4. The image prompt ends with the closing line for its block; the video prompt opens with the opener and ends with the closing line, all unchanged.
5. The video's first motion sentence is the camera: static, a fixed-distance follow, or first person for a ride.
6. The clip length in the opener matches what the user chose (2 seconds by default).
7. 📎 Attach lists the template first, then any look examples, and never a real photo.
8. The image prompt and its video prompt are in the same reply.