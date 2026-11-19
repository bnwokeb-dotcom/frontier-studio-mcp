# PS2 Style — Worked Examples (references/worked-examples.md)

# Worked examples: whole replies in the final wording

This file governs the shape of a finished reply. Both examples are 📼 Nostalgia shots; Free Style, character sheet and environment replies follow the same order with their own blocks (no tested example yet). Copy the shape, never the content.

> The shot is the format; the ⚡ and 🎯 endings are written for this skill (example 1 with nothing connected, example 2 with OpenArt connected). The prompts here are the user's own Rotterdam prompts (2026-11-11), the ones that made the finished reel. One edit to fit this skill: the first line `Vertical 9:16 image, 1080x1920, full frame, no borders.` became `Full frame, no borders.` (the size is set in the tool).

---

## Example 1: a reel shot from a template frame (block A)

**The input:** inside a Rotterdam city reel, at shot 5, a screenshot from the trend video, a skater mid-kickflip, low angle, a Ferris wheel and towers behind, golden evening, and "make this Rotterdam, the cube houses".

````markdown
👀 What I can see, shot 5
📷 Camera: low, looking up, static, the skater close
🎯 Subject: a skater mid-kickflip, centre frame
🌇 Light: golden evening, low sun
🏙️ To swap: the Ferris wheel and towers

🎮 **Rotterdam, shot 5 of 8: skater under the Cube Houses** · 📼 Nostalgia · golden evening · 2 s

## 🖼️ Skater under the Cube Houses, Image Prompt
Attach the template screenshot as image 1, then paste this.

```text
Full frame, no borders.

Recreate the reference image as closely as possible: the same camera position and angle, framing, lens, composition, subject size and placement, time of day, weather, lighting, color grading, haze, and exactly the same video game graphics style (a 2000s open-world game like GTA San Andreas / early GTA IV: low-detail character models with simple faces, low-resolution textures, simple geometry, real-time game lighting). Only change the location and the details listed below, so it is set in Rotterdam, the Netherlands. It must still look like a screenshot from that same game, not a photo and not a modern render.

Keep the skater doing a kickflip in mid-air in the same pose and framing. Replace the Ferris wheel and towers with the Cube Houses of Rotterdam: tilted yellow cube-shaped houses balanced on their corners on top of hexagonal concrete pillars, right behind and above him, and the tall slim pencil-shaped tower with a pointed roof next to them. Same golden evening light.

Remove any caption or text from the reference. No text, no captions, no UI, no HUD, no readable signs, no logos, no badges, no watermark.
```

📎 Attach (image): image 1 = the template frame
⚙️ Settings: GPT Image 2 · edit mode · upright full HD · quality high · 2 versions, keep the most blocky and blurry one

## 🎬 Skater under the Cube Houses, Video Prompt
Attach the image you picked as the start frame, then paste this.

```text
Animate this exact start image as one continuous 2-second shot with no cuts. Keep the exact same 2000s open-world video game graphics look as the start image the whole time: the same low-poly models, simple blocky characters, soft low-resolution textures, colors and lighting. It is a game scene coming to life, not a realistic video.

Static low camera. The skater finishes the kickflip in the air: the board spins under his feet, he lands on it and rolls forward out of the frame to the right. Pedestrians walk in the background under the cube houses.

Avoid: zooming or pushing in, cuts, new objects appearing, morphing faces or bodies, changing the buildings, photorealism, extra text.
```

📎 Attach (video): the image you picked, as the start frame
⚙️ Settings: Wan 3.0 · image-to-video · 2 seconds · 1080p · sound off

⚡ **Want to automate this?** Connect the [OpenArt MCP](https://openart.ai/mcp/?via=virgil) or the [Higgsfield MCP](https://higgsfield.ai/mcp?fpr=3066&fp_sid=mcp), your choice, and I can make the images and the video right here in the chat. Want that?

🎯 **Next shot**: pick one:

1. 🌃 **Witte de Withstraat at night**: wet street, lights, people under awnings
2. 🚲 **Bike ride along the quay**: first person, towards the Erasmus Bridge at sunset
3. 🍷 **Terrace at Hotel New York**: four friends, sunset, the closer
4. 🚋 **Tram on the Coolsingel**: a yellow tram crossing a busy street
5. 🌅 **Rooftop at golden hour**: two friends, the skyline glowing

Type a number, type your own, or type More for fresh ideas.

✨ You can create these images and videos in [OpenArt](https://openart.ai/home?via=virgil)
🎙 Add cinematic voice-overs using [ElevenLabs](https://try.elevenlabs.io/jvbqccfz0mv9)
📚 More viral agent skills like this one → [Agent Skills Library](https://aicenturies.com/agent-skills-library/)
````

---

## Example 2: a fix: a look example leaked its landmark (block B)

**The input:** "The water taxi shot has a weird bridge and palm trees in it. That's not Rotterdam." The earlier versions had used frames from other cities' versions of the trend as look examples. This is the real third version of the Rotterdam opener, word for word apart from the first line and the closing line.

````markdown
🔧 The look examples were leaking their own city, swapped them for two of your approved Rotterdam shots, which carry the look and nothing else. The prompt now says to copy only their look.

🎮 **Rotterdam, shot 1 of 8: water taxi towards the Erasmus Bridge** · 📼 Nostalgia · sunset · 2 s · version 3

## 🖼️ Water Taxi on the Maas, Image Prompt
Attach the template as image 1, then two of your approved shots (the bike shot and the skater) as images 2 and 3.

```text
Full frame, no borders.

Image 1 is the composition template: recreate its camera position and angle, framing, lens, subject size and placement. Images 2 and 3 are finished frames from the same video and show the exact game graphics style this image must match: a 2000s open-world game like GTA San Andreas, with low-poly models, simple blocky characters, soft blurry low-resolution textures, simple flat game lighting, slightly washed-out warm game colors, low contrast and a soft haze. Do not copy any content from images 2 and 3, only their look. Avoid any photorealism: no realistic water or skin, no fine detail, no crisp modern rendering.

Instead of the canal boat in image 1: a small yellow-and-black Rotterdam water taxi speeding over the wide river Maas at sunset, seen from just behind it, two simple low-poly passengers, a wake made of simple game water with flat white foam shapes. Ahead and to the left the Erasmus Bridge (one tall white pylon with a clear kink partway up, leaning back, a fan of white cables down to a long low deck), and behind it the Kop van Zuid skyline made of simple flat game buildings with few details. Simple game water with soft orange reflections.

Remove any caption or text from the reference. No text, no captions, no UI, no HUD, no readable signs, no logos, no badges, no watermark.
```

📎 Attach (image): image 1 = the template frame · images 2 and 3 = your approved bike and skater shots
⚙️ Settings: GPT Image 2 · edit mode · upright full HD · quality high · 2 versions, keep the most blocky and blurry one

## 🎬 Water Taxi on the Maas, Video Prompt
Attach the image you picked as the start frame, then paste this.

```text
Animate this exact start image as one continuous 2-second shot with no cuts. Keep the exact same 2000s open-world video game graphics look as the start image the whole time: the same low-poly models, simple blocky characters, soft low-resolution textures, colors and lighting. It is a game scene coming to life, not a realistic video.

The camera follows directly behind the water taxi at the same distance as it speeds forward over the river toward the bridge. The white wake churns and sprays, small waves roll, the boat bounces slightly on the water. The bridge and skyline come a little closer.

Avoid: zooming or pushing in, cuts, new objects appearing, morphing faces or bodies, changing the buildings, photorealism, extra text.
```

📎 Attach (video): the image you picked, as the start frame
⚙️ Settings: Wan 3.0 · image-to-video · 2 seconds · 1080p · sound off

⚡ **Want to automate this?** Your OpenArt is connected, so I can make the images and the video right here in the chat. Want that?

🎯 **Next shot**: pick one:

1. 🚶 **Crowd in the Markthal**: people walking towards you under the painted ceiling
2. 🚗 **Car on the Erasmus Bridge**: rainy night, following from behind
3. 🏟️ **Fans in De Kuip**: red and white shirts, fists up
4. 🛹 **Skater at the Cube Houses**: kickflip, golden evening
5. 🌃 **Witte de Withstraat at night**: wet street, lights

Type a number, type your own, or type More for fresh ideas.

✨ You can create these images and videos in [OpenArt](https://openart.ai/home?via=virgil)
🎙 Add cinematic voice-overs using [ElevenLabs](https://try.elevenlabs.io/jvbqccfz0mv9)
📚 More viral agent skills like this one → [Agent Skills Library](https://aicenturies.com/agent-skills-library/)
````

The original water-taxi prompt said `Remove any caption.`; the closing line here is the full sanctioned one from `style-bible.md`.