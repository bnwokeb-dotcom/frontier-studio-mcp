# PS2 Style — Tool Notes (references/tool-notes.md)

# Tool notes: what the user's tools need

This file governs the attach and settings lines printed under each prompt, and the cost line.

> **Snapshot: taken 2026-11-11** from the user's own Rotterdam build, the tools, settings and prices that made the finished reel (the maintainer's research notes). Wan 3.0 format facts from the Wan Studio research of 2026-10-19. If the user's tool screen shows something different, believe their screen and say so.

---

## What the build used

| Step | Tool | Mode | Settings | Cost (2026-11-11) |
| --- | --- | --- | --- | --- |
| Image | GPT Image 2 | edit (image-to-image with attached images) | upright 1080 × 1920, quality high, **2 versions per prompt** | about $0.16 per image |
| Video | Wan 3.0 | image-to-video, the chosen image as start frame | 2 seconds, 1080p, sound off | about $0.40 per 2-second clip (a longer clip costs more) |
| Edit | any editor | cut and finish | 24 frames a second | free |

The whole Rotterdam reel, every test included, cost about $13.

Other image models that take several reference images in an edit mode work the same way (Nano Banana Pro takes up to 3 style references). Other image-to-video models work too; Wan 3.0 is the tested one. Wan 3.0 runs 2-30 seconds and cuts on its own when a long clip has several actions, which is why the default is one action in 2 seconds.

---

## The best models for this look

**Image: GPT Image 2, in edit mode. Video: Wan 3.0, image-to-video.** These made the user's finished Rotterdam reel; every settings line names them. If the user names another tool, write for that tool and say in one line that it is untested for this look. Model names go only in the settings lines and here, never inside a prompt.

---

## Attach and settings lines

Print these under the matching prompt, filled in:

```
📎 Attach (image): image 1 = the template frame · image 2 (and 3) = your look examples, if any
⚙️ Settings: GPT Image 2 · edit mode · upright full HD · quality high · 2 versions, keep the most blocky and blurry one
```

```
📎 Attach (video): the image you picked, as the start frame
⚙️ Settings: Wan 3.0 · image-to-video · 2 seconds · 1080p · sound off
```

With block C (no template), print:

```
📎 Attach (image): nothing, text only
⚙️ Settings: GPT Image 2 · text-to-image · upright full HD · quality high · 2 versions, keep the most blocky and blurry one
```

For a panel shot:

```
📎 Attach (image): one screenshot per panel, in panel order, or nothing
⚙️ Settings: GPT Image 2 · edit mode with screenshots, text-to-image without · upright full HD · quality high · 2 versions, keep the most blocky and blurry one
📎 Attach (video): the cropped panel, as the start frame
```

A 2 by 2 grid on an upright full HD image gives panels of about 540 × 960, enough for a 1080p clip in this soft look. Translate these lines into the reply language (English unless the user writes in another); only the prompts stay English.

**🕹️ Free Style / 🛍️ Promo image** with nothing attached: the block-C lines above.

**🕹️ Free Style / 🛍️ Promo image** with references:

```
📎 Attach (image): image 1 = your character sheet · image 2 = your environment · image 3 = your product (only the ones you use, in this order)
⚙️ Settings: GPT Image 2 · edit mode · upright full HD · quality high · 2 versions, keep the most blocky and blurry one
```

**🕹️ Free Style video** (5 to 15 seconds):

```
📎 Attach (video): [the shot's image, as the start frame | your character sheet, then your environment, in that order | nothing, text only]
⚙️ Settings: Wan 3.0 · [image-to-video | reference-to-video | text-to-video] · [DURATION] seconds · 1080p · [sound on | sound off]
```

Image-to-video when the shot's own image is attached; reference-to-video for a character sheet or environment; text-to-video with nothing attached. Sound on for game-like sound effects or dialogue; sound off when the user adds music in the edit. Where the tool offers prompt rewriting (Auto Polish, prompt extend), keep it off: a rewrite can drop the timestamps and the image numbers. On OpenArt, type `@` and pick each file where the prompt says Image 1, Image 2. Wan 3.0 cost scales with seconds, so a 10-second clip costs about five times a 2-second one.

**The upload order is the numbering.** Image 1 is whatever is uploaded first. If the tool tags uploads (`@Image1`), check which tag each file got before pasting.

---

## Self-check for tool lines

1. The attach line lists the template first and never a real photo.
2. The settings line says 2 versions for images and the chosen clip length for video.
3. Tool and model names appear only in these lines and the cost line, never inside a prompt.