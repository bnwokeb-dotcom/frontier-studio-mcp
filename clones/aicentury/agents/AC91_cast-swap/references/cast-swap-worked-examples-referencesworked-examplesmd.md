# Cast Swap — Worked Examples (references/worked-examples.md)

# Worked examples

Two finished builds from real test runs, in the skill's final wording. Copy their shape, not their content:
every scene, person and timestamp in your build comes from your own scan.

---

## Example A — one person, keep the clip's look, own outfit with role gear

**The clip (from the scan):** 10.04 s, 24 fps, one continuous handheld take inside a helicopter. P1, a man in
an orange flight helmet, navy flight suit, orange harness and tan gloves, pushes a block of ice out of the
open door; the camera tilts down to a lava lake, a lava fountain erupts, and the camera turns back to him
sitting in the doorway. He is only partly visible from 0:02.5 to 0:09.5. The two `soft?` flags on the soft
sheet are camera tilts in the same place, so the clip stays one shot.

**The user:** "both are me, keep the original look" + a face close-up and a full-body photo on a plain
background → one character's set, own outfit (full-body on a plain background), role gear kept.

```text
Edit the entire source video, Video 1.
Replace the man in the orange flight helmet who pushes the ice block out of the helicopter door with the person in Images 1-2.

Images 1-2 (the same person — Image 1 the face, Image 2 the full body): a man in his twenties, slim, fair skin, short dark-brown hair faded at the sides, brown eyes, light stubble, wearing his own black varsity jacket with white sleeves, black jeans and red, white and black high-tops in place of the navy flight suit from Video 1, with the orange flight helmet, harness and tan gloves kept on.
The images provide identity and outfit only; everything around the characters comes from Video 1.
Video 1 provides the motion, expressions, lip movements, timing, camera moves, framing, lighting and background. The new character appears exactly where and when the person they replace appears — the same entrances, movements, occlusions and exits — and everyone keeps their original position and performance.

Keep the full 10 seconds and the same single continuous shot as Video 1. Exactly 1 person appears, only once.
Video 1 timeline — keep the action order and timing exactly:
[0s-2s] Medium shot: at the open helicopter door on the right, the man from Images 1-2 pushes an ice block out.
[2s-5s] The camera tilts down to the lava lake as he leaves frame right; the ice block falls in and steam rises.
[5s-7s] A lava fountain erupts; the camera pulls back as his gloved hand and knee return on the right.
[7s-10s] Smoke rises; the camera turns back to him sitting in the doorway on the right, watching.

The new character keeps the same face, hair and outfit in every shot and from every angle, even in profile or partly hidden.
The new character is lit by the scene's own light — same direction, strength and colour — with the same grain, sharpness and colour grade as Video 1.
Keep the original audio. No subtitles.
```

What to notice: no viewer's side in the replace sentence (one person in the clip); no `cuts,` in the Video 1
sentence (one take); the outfit written as a change from A to B with the role gear kept; four beats that
mark where he is, not how he moves; one person, `only once`.

---

## Example B — two people, renumbered, anime restyle (the whole reply)

**The clip (from the scan):** 9.98 s, 29.97 fps, four shots — a zoom-blur scene change at 0:00.9 (confirmed on
the soft sheet: bedroom → plaza), hard cuts at 0:03.8 and 0:09.6. Roster: P1 man in a black beanie in bed;
👥 six people on an office-tower plaza; P2 woman at a desk, left; P3 man in teal at the back; P4 man in a white
shirt in the aisle; P5 man in a grey polo who walks in from the right at ~0:05.0. A channel watermark sits
bottom-left the whole time.

**The user:** "the guy in the grey polo who walks in, and the woman at the desk" → then two images, "first image
is for the polo guy, second for the woman. make it anime". The woman (P2) appears first, so the singer becomes
Image 1 in the prompt.

````markdown
👀 **Your second image — what I can see** → replaces P2 (Image 1 in the prompt)
🧬 Type: anime
💇 Look: young woman, slim, long straight pink hair with blunt bangs, large pink eyes
👕 Outfit: sparkly silver sequined blazer over a dark top · below the waist not visible → her own blazer, with P2's black skirt and heels
🖼️ Framing: waist up — background: busy stage (only her look is used)

👀 **Your first image — what I can see** → replaces P5 (Image 2 in the prompt)
🧬 Type: photoreal person (a real photo or AI-made — video tools treat both the same)
💇 Look: young man, slim, short dark-brown hair faded at the sides, clean-shaven
👕 Outfit: black snapback worn backwards, black varsity jacket with white sleeves over a black hoodie, black slim jeans, red-white-black high-tops → his own outfit
🖼️ Framing: full body, side view — background: plain
⚠️ The face is only seen from the side — a front-facing face close-up holds it much better.

Defaults: anime for the whole clip · the singer keeps her blazer, you keep your own outfit · renumbered by first appearance — the singer is Image 1, your photo Image 2.

---

🎬 **Office Walk-In — Cast Swap** · 10 s · 5 people + 6 extras · P2 → the singer, P5 → you · anime

🗺️ **Swap map**

| Person in the video | On screen | Replaced by | Outfit |
|---|---|---|---|
| P1 — man in a black beanie, in bed | 0:00.0-0:00.9 | stays, redrawn as anime | — |
| 👥 six people on the plaza | 0:00.9-0:03.8 | stay, redrawn as anime | — |
| P2 — woman at the desk, left | 0:03.8-0:09.6 | your second image — the pink-haired singer | her blazer + P2's skirt and heels |
| P3 — man in teal, at the back | 0:03.8-0:10.0 | stays, redrawn as anime | — |
| P4 — man in a white shirt, in the aisle | 0:03.8-0:10.0 | stays, redrawn as anime | — |
| P5 — man in a grey polo who walks in | ~0:05.0-0:10.0 | your first image — you | your own outfit |

⏱️ **Timeline**
1 · 0:00.0-0:00.9 — close-up: P1 on his phone in bed → zoom-blur
2 · 0:00.9-0:03.8 — wide: the plaza, slow push-in
3 · 0:03.8-~0:05.0 — wide office: the singer (P2) at her desk, left
4 · ~0:05.0-~0:07.2 — you (P5) walk in from the right
5 · ~0:07.2-0:09.6 — you stop in the aisle next to her desk; she looks at you
6 · 0:09.6-0:10.0 — close-up: you glance sideways with a smirk

## 🎬 Office Walk-In, Video-to-Video Prompt
Attach Video 1, then Image 1 (the singer), then Image 2 (your photo).

```text
Edit the entire source video, Video 1, and turn it into a 10-second anime version of itself.
Replace the woman in the black shirt-dress seated at the desk on the viewer's LEFT from 4s with the character in Image 1.
Replace the man in the grey polo and light-blue jeans who enters from the viewer's RIGHT at 5s with the person in Image 2.
Keep the man in the beanie, the six people on the plaza, the man in white in the aisle and the man in teal at the back exactly as themselves, in the same style.

Image 1: a young woman with long straight pink hair, blunt bangs and pink eyes, wearing her own silver sequined blazer, with the black skirt and heels from Video 1.
Image 2: a young man with short dark-brown hair, clean-shaven, wearing his own black snapback backwards, a black varsity jacket with white sleeves, black jeans and red-and-white high-tops.
Each image provides identity, and its outfit only where its line says so; everything else comes from Video 1.
Video 1 provides the motion, expressions, lip movements, timing, camera moves, cuts, framing and every person's position. Each new character appears exactly where and when the person they replace appears — the same entrances, movements, occlusions and exits — and everyone keeps their original position and performance.

Keep the full 10 seconds and the same 4 shots, zoom-blur and cuts as Video 1. Exactly 5 people appear across the clip, each only once, plus the same six people on the plaza.
Video 1 timeline — keep the action order and timing exactly:
[0s-1s] Close-up: the man in the black beanie looks at his phone in bed, then a fast zoom-blur.
[1s-4s] Wide shot: the six people stand on the office-tower plaza as the camera pushes in.
[4s-7s] Office: the woman from Image 1 at her desk, left; the man from Image 2 enters from the right at 5s.
[7s-10s] He stops next to her desk as she looks at him, ending on a close-up of his sideways smirk.

Each new character keeps the same face, hair and outfit in every shot and from every angle, even in profile or partly hidden.
Render the whole video as a 2D Japanese anime film — clean cel shading, crisp line art, softly painted backgrounds and expressive eyes, with the light and colour of Video 1 carried into the drawing.
Everyone in frame — the new characters, the other people and any crowd — and the whole background get this same style, from the foreground to the back. Distant figures are drawn simpler, as cleanly as the foreground.
Keep the original audio. No subtitles.
```

📎 **Attach:** Video 1 = the full clip, with its last frame held half a second (the final shot is only 0.4 s, and edits eat the last frames) · Image 1 = your **second** image (the singer) · Image 2 = your **first** image (your photo). Renumbered because the woman at the desk appears before the man in the polo — upload them in this order.
⚙️ **Settings:** 10 s · sound: keep the original (generated audio off, or "keep original sound" on) · prompt enhance: off · draft at 480p first, render 1080p once both faces hold
🏷️ Using @-tags? Replace "Video 1" with your tool's video tag (@Video1, [@Video]) and each image number with its tag — "Image 1" → @Image1, "Images 1-2" → @Image1 and @Image2 — same numbers, same upload order.
🧰 **Tool fit:** your photo has a real-looking face, so Seedance will reject it unless you pass its own verification. Two swaps with a real face → Higgsfield Genjutsu or Viggle Multi-Track, or one person per pass in Kling, Wan, Luma or Aleph.

💡 **Next**
1. Steadier version: two passes — both swaps in the clip's own look first, then restyle that result to anime.
2. Send a front-facing face close-up and I'll add it as Image 2, moving your full-body photo to Image 3.
3. It came out wrong? Tell me what you see.

✨ Make your swap video on [OpenArt](https://openart.ai/home?via=virgil)
🎙 Add a new voice or dub it with [ElevenLabs](https://try.elevenlabs.io/jvbqccfz0mv9)
📚 More viral agent skills like this one → [Agent Skills Library](https://aicenturies.com/agent-skills-library/)
````

What to notice: renumbered by first appearance, said in the defaults line and again in the attach line; the
mix outfit sentence because one character keeps a costume half; no medium word in either lock (not a Mixed
build — the style line sets the medium); the plaza people grouped as scenery, described not counted; his
entrance marked as a time point (`at 5s`) inside a beat instead of a one-second beat of its own; the 0.4 s
close-up folded into the last beat; the watermark left alone; the tool-fit line because one face is
real-looking and there are two swaps.