# Environment Maker — Worked Examples (references/worked-examples.md)

# Worked examples — whole replies in the final wording

This file governs the shape of a finished reply. Copy the shape, never the content.

> Every example here comes from a real test run (fresh-agent round 3, 2026-10-12), never invented.
> Headings, set numbers and the paste, attach and 💡 Next lines were synced to the current wording
> afterwards; the sets themselves are as the test agent wrote them. Each one passes the SKILL.md
> self-check.

---

## Example 1 — a photo upload with a place: the 👀 card and the look menu

**The input:** one studio photo of a young man in a varsity jacket (side view, white backdrop),
with the text `a futuristic space station`.

````markdown
👀 **What I can see**
• Look: a photorealistic studio photograph — true-to-life skin and fabric texture, crisp natural detail, no stylisation
• Palette and light: black, white and red against a plain white backdrop, soft even studio light — stays with the character; the sets get the place's own light
• World: modern streetwear — a varsity jacket over a hoodie, a cap, slim dark jeans and high-top sneakers — a present-day, urban, youth-culture world
• Place: a futuristic space station — noted

🎨 **Pick the look for your sets**

0. 🎯 **Match my character** — the sets copy the exact look of your upload (you attach your image to each set)
1. 🌸 **Hand-Painted Anime** — pastoral anime-film worlds in gouache and watercolour
2. ✨ **Luminous Cinematic Anime** — hyper-detailed anime with radiant skies and glassy light
3. 📼 **Retro 90s Cel Anime** — painted-cel anime backgrounds with film grain
4. 🧸 **3D Animated Feature** — soft, rounded family-film 3D
5. 🖌️ **Painterly 3D** — dimensional worlds in hand-painted brushwork
6. 🎥 **Photoreal Cinematic** — a real-looking place, lit and graded like a film
7. 🪄 **Classic Hand-Drawn 2D** — fairy-tale feature-animation backgrounds
8. 🟦 **Flat 2D Cartoon** — clean, bright modern TV cartoon
9. 🏺 **Clay Stop-Motion** — a hand-built plasticine miniature set
10. 💧 **Storybook Watercolour** — an illustration in soft washes

A style from the list stands alone — nothing to attach.
No pick? Say go and I'll match your character.
Type a number, type your own, or type More for fresh ideas.

✨ Create these images and videos on [OpenArt](https://openart.ai/home?via=virgil)
🎙 Add optional voice-overs with [ElevenLabs](https://try.elevenlabs.io/jvbqccfz0mv9)
📚 More viral agent skills like this one → [Agent Skills Library](https://aicenturies.com/agent-skills-library/)
````

---

## Example 2 — 🎯 Match my character: a full build

**The input:** `0` — after Example 1. The studio light, the white backdrop and the costume colours
stay with the character; the station gets its own light, palette and materials.

````markdown
🎬 **Futuristic space station — 5 movie sets** · 🎯 Match my character · empty

1 · 🪐 Main observation deck — establishing_wide · eye_level · 24 mm
2 · 🚀 Docking bay airlock — wide · low_angle · 18 mm
3 · 🔦 Ring corridor — medium · pov · 35 mm
4 · 🛰️ Command bridge — wide · over_the_shoulder · 28 mm
5 · ⚛️ Reactor core housing — close_up · high_angle · 85 mm

## 🪐 Set 1 · Main observation deck, Text-to-Image Prompt

```text
{
  "background_name": "Main observation deck",
  "camera_angle": "eye_level",
  "framing": "establishing_wide",
  "lens_mm": "24",
  "environment": "space station observation deck",
  "scene_purpose": "the heart of the station, where its world first opens up",
  "location_cues": "full-height curved viewport, ribbed composite deck, low curved benches, brushed titanium wall panels",
  "lighting": "cool blue ceiling light strips, warm amber floor-level guide lights",
  "prompt_text": "Create a new image of an empty place in the exact visual style of the attached reference image, using it only as a style reference: take its rendering, level of realism or stylisation, line, texture and colour treatment, and show a completely different scene from a new viewpoint, lit the way that place is lit. Written out, the look is photorealistic cinematic photography with true-to-life materials and surface texture, crisp natural detail, a natural colour grade with gentle contrast and fine grain. It shows the empty main observation deck of a futuristic space station, with a full-height curved viewport, low curved benches and brushed titanium wall panels. During the station's evening cycle, with stars and the blue curve of a planet beyond every window and viewport, lit by cool blue light strips along the ceilings with a warm amber glow from floor-level guide lights, in a palette of gunmetal grey, pale ice blue, brushed silver and warm amber, with brushed titanium panels, ribbed composite decking and tinted glass throughout. Seen from eye level as an establishing wide shot of the whole place with a 24 mm lens. The ribbed deck runs from the near foreground past the benches in the middle distance to the viewport in the far distance, in sharp focus throughout. An open stretch of deck in the centre foreground stays clear and catches the main light. The whole place is empty, deserted and completely still, every space in it unoccupied, with no one in the frame and no lettering anywhere.",
  "negative_prompt": "people, figures, text, lettering, logo, watermark"
}
```

## 🚀 Set 2 · Docking bay airlock, Text-to-Image Prompt

```text
{
  "background_name": "Docking bay airlock",
  "camera_angle": "low_angle",
  "framing": "wide",
  "lens_mm": "18",
  "environment": "space station docking bay",
  "scene_purpose": "the arrival point where every journey onto the station begins",
  "location_cues": "heavy round airlock door, folded docking clamps, amber hazard chevrons on the deck, ribbed bulkhead arches",
  "lighting": "cool blue ceiling light strips, warm amber guide lights along the deck",
  "prompt_text": "Create a new image of an empty place in the exact visual style of the attached reference image, using it only as a style reference: take its rendering, level of realism or stylisation, line, texture and colour treatment, and show a completely different scene from a new viewpoint, lit the way that place is lit. Written out, the look is photorealistic cinematic photography with true-to-life materials and surface texture, crisp natural detail, a natural colour grade with gentle contrast and fine grain. It shows the empty docking bay airlock, with a heavy round airlock door, docking clamps folded against the walls and amber hazard chevrons painted on the deck. During the station's evening cycle, with stars and the blue curve of a planet beyond every window and viewport, lit by cool blue light strips along the ceilings with a warm amber glow from floor-level guide lights, in a palette of gunmetal grey, pale ice blue, brushed silver and warm amber, with brushed titanium panels, ribbed composite decking and tinted glass throughout. Seen from a low angle looking up as a wide shot with an 18 mm lens. Scuffed deck plating fills the near foreground, ribbed bulkhead arches frame the middle distance and the round door closes the far end, in sharp focus throughout. An open stretch of deck in the centre foreground, in front of the door, stays clear and catches the main light. The whole place is empty, deserted and completely still, every space in it unoccupied, with no one in the frame and no lettering anywhere.",
  "negative_prompt": "people, figures, text, lettering, logo, watermark"
}
```

## 🔦 Set 3 · Ring corridor, Text-to-Image Prompt

```text
{
  "background_name": "Ring corridor",
  "camera_angle": "pov",
  "framing": "medium",
  "lens_mm": "35",
  "environment": "curved station ring corridor",
  "scene_purpose": "the passage that links every part of the station",
  "location_cues": "floor curving upward out of sight, sealed side hatches, narrow tinted glass portholes, recessed light strips",
  "lighting": "cool blue light strips along the ceiling, warm amber guide lights at the floor edges",
  "prompt_text": "Create a new image of an empty place in the exact visual style of the attached reference image, using it only as a style reference: take its rendering, level of realism or stylisation, line, texture and colour treatment, and show a completely different scene from a new viewpoint, lit the way that place is lit. Written out, the look is photorealistic cinematic photography with true-to-life materials and surface texture, crisp natural detail, a natural colour grade with gentle contrast and fine grain. It shows the empty ring corridor, with sealed side hatches, narrow tinted glass portholes and a floor that curves gently upward out of sight. During the station's evening cycle, with stars and the blue curve of a planet beyond every window and viewport, lit by cool blue light strips along the ceilings with a warm amber glow from floor-level guide lights, in a palette of gunmetal grey, pale ice blue, brushed silver and warm amber, with brushed titanium panels, ribbed composite decking and tinted glass throughout. Seen from standing head height, looking straight ahead along the space, as a medium shot with a 35 mm lens. The corridor runs from the near floor past the hatches in the middle distance to its upward curve in the far distance, in sharp focus throughout. An open stretch of corridor floor in the centre foreground stays clear and catches the main light. The whole place is empty, deserted and completely still, every space in it unoccupied, with no one in the frame and no lettering anywhere.",
  "negative_prompt": "people, figures, text, lettering, logo, watermark"
}
```

## 🛰️ Set 4 · Command bridge, Text-to-Image Prompt

```text
{
  "background_name": "Command bridge",
  "camera_angle": "over_the_shoulder",
  "framing": "wide",
  "lens_mm": "28",
  "environment": "space station command bridge",
  "scene_purpose": "the nerve centre that steers the whole station",
  "location_cues": "tiered console desks with dark glass panels, raised central command chair, wide curved front viewport, brushed titanium doorframe",
  "lighting": "cool blue ceiling light strips, warm amber guide lights along the floor",
  "prompt_text": "Create a new image of an empty place in the exact visual style of the attached reference image, using it only as a style reference: take its rendering, level of realism or stylisation, line, texture and colour treatment, and show a completely different scene from a new viewpoint, lit the way that place is lit. Written out, the look is photorealistic cinematic photography with true-to-life materials and surface texture, crisp natural detail, a natural colour grade with gentle contrast and fine grain. It shows the empty command bridge, with tiered console desks of dark glass panels, a raised central command chair and a wide curved front viewport. During the station's evening cycle, with stars and the blue curve of a planet beyond every window and viewport, lit by cool blue light strips along the ceilings with a warm amber glow from floor-level guide lights, in a palette of gunmetal grey, pale ice blue, brushed silver and warm amber, with brushed titanium panels, ribbed composite decking and tinted glass throughout. Seen past a doorframe edge in the near foreground as a wide shot with a 28 mm lens. The brushed titanium doorframe edges the near foreground, the consoles step down through the middle distance and the viewport fills the far distance, in sharp focus throughout. An open stretch of floor in front of the command chair stays clear and catches the main light. The whole place is empty, deserted and completely still, every space in it unoccupied, with no one in the frame and no lettering anywhere.",
  "negative_prompt": "people, figures, text, lettering, logo, watermark"
}
```

## ⚛️ Set 5 · Reactor core housing, Text-to-Image Prompt

```text
{
  "background_name": "Reactor core housing",
  "camera_angle": "high_angle",
  "framing": "close_up",
  "lens_mm": "85",
  "environment": "space station reactor chamber",
  "scene_purpose": "the power source that keeps the whole station running",
  "location_cues": "ring of brushed titanium plating, sealed core of pale blue tinted glass, thick ribbed conduits, grated catwalk",
  "lighting": "cool blue overhead light strips, warm amber guide lights on the catwalk",
  "prompt_text": "Create a new image of an empty place in the exact visual style of the attached reference image, using it only as a style reference: take its rendering, level of realism or stylisation, line, texture and colour treatment, and show a completely different scene from a new viewpoint, lit the way that place is lit. Written out, the look is photorealistic cinematic photography with true-to-life materials and surface texture, crisp natural detail, a natural colour grade with gentle contrast and fine grain. In the empty reactor chamber, it shows the reactor core housing, a ring of brushed titanium plating around a sealed core of pale blue tinted glass, fed by thick ribbed conduits. During the station's evening cycle, with stars and the blue curve of a planet beyond every window and viewport, lit by cool blue light strips along the ceilings with a warm amber glow from floor-level guide lights, in a palette of gunmetal grey, pale ice blue, brushed silver and warm amber, with brushed titanium panels, ribbed composite decking and tinted glass throughout. Seen from a high angle looking down as a close-up of the reactor core housing with an 85 mm lens. The plating and its bolts sit sharp in the near foreground, while the conduits and the grated catwalk behind them fall soft. The whole place is empty, deserted and completely still, every space in it unoccupied, with no one in the frame and no lettering anywhere.",
  "negative_prompt": "people, figures, text, lettering, logo, watermark"
}
```

📋 Paste: only the prompt_text of each set into your image tool — the other fields are notes for you.
📎 Attach: your character image (or images) to every set, as a style reference. Works best in a tool with a style-reference slot, such as Nano Banana Pro.

Defaults: empty sets · 🎯 Match my character — photorealistic cinematic photography with true-to-life materials, a natural grade and fine grain; your studio light, backdrop and outfit colours stay with your character · the station's evening cycle — cool blue ceiling strips, amber guide lights, a blue planet beyond the viewports, gunmetal, ice blue, silver and amber · "futuristic" read as a sleek orbital station above a blue planet. Say the word and I'll change any of them.

💡 Next
1. 🌿 Five more places in this world — the hydroponics garden bay, the cargo hold
2. 🔗 Chain the set — render set 1 first, and I'll tie the other four to it so all five read as one place
3. 🧍 Put my character in — a prompt that places your character into the set you pick

Want one set changed? Name it and what should change — I'll rewrite it and keep the other four in the same world.

✨ Create these images and videos on [OpenArt](https://openart.ai/home?via=virgil)
🎙 Add optional voice-overs with [ElevenLabs](https://try.elevenlabs.io/jvbqccfz0mv9)
📚 More viral agent skills like this one → [Agent Skills Library](https://aicenturies.com/agent-skills-library/)
````

---

## Example 3 — a fix: garbled writing on one set

**The input:** `set 3 has garbled writing on the shop sign` — after a 3D Animated Feature build of
a cosy bookshop in a snowy village at night (no upload). Only set 3 is reprinted.

````markdown
🔧 Set 3 fixed: the board hanging over the door was already blank, but a board on a bracket above a shop door still reads as a shop sign, so the tool filled it with a name — it's gone, and a carved oak lintel garlanded with holly now sits above the door; the look, the world line and everything else stay word for word, and none of the other four sets carries a sign.

## 🏮 Set 3 · Shop front on the cobbled lane, Text-to-Image Prompt

```text
{
  "background_name": "Shop front on the cobbled lane",
  "camera_angle": "low_angle",
  "framing": "wide",
  "lens_mm": "18",
  "environment": "bookshop front on a village lane",
  "scene_purpose": "the arrival, the threshold between the quiet village and the warm shop",
  "location_cues": "a bow-fronted window full of books, a deep burgundy oak door, a carved oak lintel garlanded with holly, a brass lantern, crooked timbered cottages",
  "lighting": "warm amber lantern light, cool blue moonlight from the upper left",
  "prompt_text": "Create a stylised 3D animated feature film background, not photorealistic, with soft rounded shapes, gently exaggerated forms, tactile matte materials, soft diffused shadows, gentle rim light and a light atmospheric haze. It shows the empty lane outside the bookshop, with a bow-fronted window full of books, a deep burgundy oak door and a carved oak lintel garlanded with holly above it. Deep night with snow falling outside and settling on every sill, ledge and open surface, lit by warm amber light from brass lanterns and lamps, with cool blue moonlight from the upper left, in a palette of honey amber, midnight blue, snow white and deep burgundy, with dark carved oak, frosted leaded glass and plain cloth-bound books throughout. Seen from a low angle looking up as a wide shot with an 18 mm lens. Cobbles run through the near foreground, the shop front and its brass lantern fill the middle ground, and crooked timbered cottages with glowing windows line the lane into the distance, in sharp focus throughout. An open stretch of cobbles in the centre foreground stays clear and catches the main light. The whole place is empty, deserted and completely still, every space in it unoccupied, with no one in the frame and no lettering anywhere.",
  "negative_prompt": "people, figures, text, lettering, logo, watermark"
}
```

Want one set changed? Name it and what should change — I'll rewrite it and keep the other four in the same world.

✨ Create these images and videos on [OpenArt](https://openart.ai/home?via=virgil)
🎙 Add optional voice-overs with [ElevenLabs](https://try.elevenlabs.io/jvbqccfz0mv9)
📚 More viral agent skills like this one → [Agent Skills Library](https://aicenturies.com/agent-skills-library/)
````

---

## Example 4 — 🧍 Put my character in

**The input:** `put my character in set 1`, then an upload of an inked, painted illustration of a
man in a navy suit drinking coffee in front of a crowd — same chat as Example 3.

````markdown
## 🧍 Young man in a navy suit in set 1, Image-Edit Prompt

```text
Using Image 1 as the scene, place the character from Image 2 — a young man with a dark buzz cut, navy suit jacket and white open-collared shirt — standing on the open stretch of floorboards in the centre foreground, facing the camera, looking slightly past it. Keep everything in Image 1 unchanged: the same framing, camera angle and background. Keep the character's face, hair, outfit and proportions from Image 2, with any logos simplified to plain shapes, leave Image 2's own background behind, and render the character in the same look as the scene, lit by the scene's own light from the same direction, with matching contact shadows, scale and perspective.
```

📎 Attach: Image 1 = your render of set 1 · Image 2 = your character. Set the image size to match your set.

👤 I've taken the man in front as your character — the crowd behind him stays out, and his coffee cup stays in his hand.
✂️ Your picture shows him from the chest up, so the tool has to invent the rest of him for a standing spot in a wide set — a full-body picture gives a closer match.
🎨 He's drawn as an inked, painted illustration, so he'll be repainted in the sets' soft 3D look to sit in the scene — or say "match him" and I'll rebuild the five sets in his look instead.

💡 Next
1. 🏘️ Five more places in this world — the village bakery next door, the stone bridge over the frozen brook
2. 🔗 Chain the set — I'll tie the other four to your empty render of set 1 so all five read as one place
3. 🕯️ Add a little life — exactly two villagers browsing the far shelves, with his spot kept clear

✨ Create these images and videos on [OpenArt](https://openart.ai/home?via=virgil)
🎙 Add optional voice-overs with [ElevenLabs](https://try.elevenlabs.io/jvbqccfz0mv9)
📚 More viral agent skills like this one → [Agent Skills Library](https://aicenturies.com/agent-skills-library/)
````