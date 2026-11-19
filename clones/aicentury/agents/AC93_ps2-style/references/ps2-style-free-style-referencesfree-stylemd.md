# PS2 Style — Free Style (references/free-style.md)

# Free Style: any idea in the PS2 look, longer videos

This file governs 🕹️ Free Style, the default concept: the user's own idea, story or scene, in any place, as PS2-game image prompts and video prompts of 5 to 15 seconds.

> The look is the same locked look as 📼 Nostalgia (`style-bible.md`); only the content is free. The image side uses block F (or D when continuing from the user's own image); the video side uses the Free Style video look line and Wan 3.0's own shot format. Nothing here is render-tested yet: say so once per chat, in the notes line.

---

## The Free Style shot

One shot is one image prompt and its video prompt, in the same reply, like every shot in this skill.

### The image prompt

```text
Full frame, no borders.

[BLOCK F from style-bible.md, or block D when the user attached their own earlier image]

[REFERENCE LINES from style-bible.md, only for an attached character sheet or environment]

[SCENE: camera first (height, angle, distance), then the subject and what they are doing at this frozen moment, the place as shape and colour, the light and time of day. Two to five sentences.]

[CLOSING LINE: the block-C form without references, the full A/B form with references]
```

| Slot | Rule |
| --- | --- |
| Camera | First, always: `Low camera behind the car`, `Eye level, across the street`, `High above the rooftops looking down`. A game camera: third person behind the hero, a street-level view, a cutscene angle |
| Subject | Named as a low-poly game character or model; with a character sheet attached, the reference line says who it is and the scene names them by outfit |
| Place | Real place: named once plus its shape and colour (`style-bible.md` §Landmarks in words). Made-up place: shapes and colours only |
| Counts | Small groups (up to six) as a number: `three friends` |
| Frozen moment | The image is the first frame of the video, so it shows the moment just before the action |

### Game moments that suit the look

Free Style ideas work best when they look like a moment from an open-world game: driving and chases, a mission start, a cutscene conversation, a heist, a race, a beach day, a sunset ride, a sports match, a city at night, a character walking into frame. Cinematic moments from any genre work too (horror, fantasy, sci-fi), as long as the look stays PS2.

---

## The Free Style video prompt

Default **10 seconds** in **3 shots**; the user can pick 5 to 15 seconds. Wan 3.0 reads whole-second timestamps and cuts on its own when left alone, so every prompt states either shots or one take.

| Duration | Shots (2 to 5 s each) | One take |
| --- | --- | --- |
| 5 s | 1 to 2 | ✅ good fit |
| 10 s | 3 (default) | possible |
| 15 s | 4 to 5 | risky for the look: say so in the notes line |

### Several shots (the default)

```text
[FREE STYLE VIDEO LOOK LINE from style-bible.md]

[Only with attachments, in upload order: "Image 1 is the start frame: shot 1 begins on this exact image." / the character line / the environment line]

Shot 1 [0-3s]: [camera]. [action].
Shot 2 [3-7s]: [camera]. [action].
Shot 3 [7-10s]: [camera]. [action].

[SOUND LINE]

[FREE STYLE VIDEO CLOSING LINE from style-bible.md]
```

### One continuous take

When the user asks for one take, or the moment is one continuous action (a drive, a walk, a ride):

```text
Generate single shot.
[FREE STYLE VIDEO LOOK LINE]

[attachment lines]

Camera: [the one camera move for the whole take, or a fixed camera].
[0-3s] [action].
[3-6s] [action].
[6-10s] [action].

[SOUND LINE]

[FREE STYLE VIDEO CLOSING LINE, the one-take form from style-bible.md]
```

### What to attach to a video

| The video | Attach | Mode |
| --- | --- | --- |
| Starts on the shot's image, every shot in the same place (other angles, closer, wider) | the shot's image only | image-to-video |
| Moves to other places, or the user wants their character kept across places | the character sheet, then the environments (or product), no start frame | reference-to-video |
| Nothing made yet | nothing | text-to-video |

Default: image-to-video, so every later shot stays in the start frame's place and only shows what that place plausibly holds. A shot in a new place → offer it as its own shot (its own image, its own video), or switch the video to reference-to-video.

### Slot rules

| Slot | Rule |
| --- | --- |
| Timestamps | Whole seconds from 0, each shot starting where the last ended, ending exactly on the duration. Shots of 2 to 5 seconds |
| Camera | Each shot opens with its camera: static, a calm follow at a fixed distance, a slow pan, a first-person ride, or a cut to a new angle. Never a zoom in or an orbit around a subject |
| Action | One clear action per shot; the same characters keep their outfits across shots |
| Sound line | Default: `No dialogue. Game-like sound effects only: [two or three sounds of the scene]. No music.` With dialogue the user asked for: `[Character by outfit] says: "[line]" Lip sync.` once per line, and no music |
| Start frame | With the shot's own image attached: `Image 1 is the start frame: shot 1 begins on this exact image.` (one take: `Image 1 is the start frame: the take begins on this exact image.`). Without it the prompt runs as text-to-video and the look line carries the style |
| One-take beats | Beats of 2 to 5 seconds, like shots |

---

## 💡 Free Style ideas

Ten at a time from `idea-library.md` §Free Style ideas, or written for the user's topic. Each line: number, emoji, **title**, one-line hook. A pick builds the whole shot (image + video prompt) at once.

## 🎯 The next-shot list in Free Style

Five ideas that continue the user's story: the next beat of the action, a reverse angle, the same character somewhere new, the payoff, a twist. Same format as `city-reel.md` §The next-shot list, then the More line.

---

## Switching concept

The router in `SKILL.md` §Start switches at once when the user's words are clear; offer in one line only when they are not. A user in Free Style who says "must feel like" (about anything: a city, a game, a film, an era), or attaches trend screenshots, is offered 📼 Nostalgia in one line (or switched, when they ask). One who mentions their brand or product, or uploads a product photo, is offered 🛍️ Promo (`promo.md`). A user in Nostalgia who wants a longer clip or a story is offered Free Style in one line.

---

## Self-check for Free Style

1. The image prompt opens with `Full frame, no borders.`, has block F (or D) verbatim, the camera first in the scene, and the right closing line.
2. Reference lines only for images the user attaches, as listed in the 📎 line, numbered in upload order.
3. The video prompt opens with the Free Style video look line (or `Generate single shot.` then the look line), and ends with its closing line.
4. Timestamps whole seconds from 0, no gaps, ending on the chosen duration; shots 2 to 5 seconds.
5. Every shot starts with its camera; one action per shot; characters keep their outfits.
6. The sound line is present: no dialogue unless asked, no music.