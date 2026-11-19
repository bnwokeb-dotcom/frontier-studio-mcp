# PS2 Style — Panel Shot (references/panel-shot.md)

# Panel shot: several game screenshots in one image

This file governs the panel shot: one image prompt that makes 2, 4 or 6 different shots of the city as panels of one image, and one video prompt per panel.

> One image, several shots, a fast way to get a set of start frames in one generation, all with the same look. Each panel is cropped out and animated on its own. The panel look block is new and **not render-tested yet**: say so in one line the first time it is used. Read `style-bible.md` and `shot-prompts.md` first; their video rules apply to every panel.

---

## Layout

| Panels | Grid | Default |
| --- | --- | --- |
| 2 | 1 column, 2 rows | |
| 4 | 2 columns, 2 rows | ✅ |
| 6 | 2 columns, 3 rows | |

More than six makes each panel too small to animate. Each panel is one shot from the city's idea list (`city-reel.md`), in reel order, and counts as that shot of the reel: after a 4-panel shot of shots 1 to 4, the next pick is shot 5.

---

## The panel image prompt: master template

```text
Full frame, no borders.

One image made of [N] separate game screenshots in a grid of [COLUMNS] columns and [ROWS] rows, divided by thin straight white lines, every panel a different shot of [CITY], [COUNTRY], all from the same 2000s open-world video game like GTA San Andreas: low-poly models, simple blocky characters with simple faces and stiff poses, soft blurry low-resolution textures, simple geometry with straight edges, flat simple real-time game lighting, slightly washed-out warm game colors, low contrast and a soft distance haze. Every panel looks like a game, not a photo and not a modern render.

[TEMPLATE LINE, only when screenshots are attached: "Image 1 is the composition template for panel 1, image 2 for panel 2, and so on: in each panel recreate its template's camera position and angle, framing, lens, subject size and placement."]

Panel 1, top left: [camera in one clause]. [the scene, subject, landmark as shape and colour, light].
Panel 2, top right: [same].
Panel 3, bottom left: [same].
Panel 4, bottom right: [same].

No text, no captions, no UI, no HUD, no readable signs, no logos, no badges, no watermark.
```

### Slot rules

| Slot | Rule |
| --- | --- |
| Panel lines | One per panel, in grid order (left to right, top to bottom), each with its position named. Camera first, then one or two sentences of scene |
| Template line | Only when there is one screenshot per panel, attached in panel order. Without screenshots leave it out, the camera clause in each panel line carries it |
| Place | `[CITY], [COUNTRY]`, or the setting of a subject that is not a place, or (Free Style) the user's place; a made-up place drops the `of [CITY], [COUNTRY]` phrase |
| Light | Mix like the trend: at least one night or one bright day panel among the sunsets |
| Landmarks | Shape and colour, `style-bible.md` §Landmarks in words |
| People and vehicles | Named as low-poly game models, like block C |

The closing line is the block-C form (no single reference to clean up). When screenshots are attached, use the full A/B closing line instead, because they carry the trend's caption.

---

## The video prompts: one per panel

Tell the user, in one line above the first video prompt: crop each panel out as its own image (upscale it if the tool offers it, the soft result suits the look), then animate it. Then print one `## 🎬 Panel [N], [shot], Video Prompt` heading and block per panel, each built exactly like a single-shot video prompt (`shot-prompts.md` §The video prompt).

---

## Self-check for a panel shot

1. Panel count is 2, 4 or 6, and the grid line matches it.
2. One panel line per panel, positions named, camera first.
3. The template line appears only when one screenshot per panel is attached.
4. One video prompt per panel, in panel order, each with the locked opener and closing line.
5. The untested note is printed the first time a panel shot is used in the chat.