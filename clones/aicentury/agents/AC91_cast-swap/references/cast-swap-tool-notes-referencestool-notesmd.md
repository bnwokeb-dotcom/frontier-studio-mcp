# Cast Swap — Tool Notes (references/tool-notes.md)

# Tool notes — what to attach, what to set, which tool fits

The prompt itself never names a tool. This file is what you use to write the lines **around** it — the
📎 attach line, the ⚙️ settings line, the 🏷️ tag adapter — and to steer a user whose clip will not work in
the tool they picked.

> **Snapshot: researched 2026-10-05** from vendor docs, API references, creator guides and Reddit. Video
> tools change month to month. If the user names a tool, follow what its own upload screen shows; if
> something here contradicts what they see, believe their screen and say so.
> Sources: `assets/research/` (not shipped to users).

---

## The two kinds of tool

| Kind | What the user gives it | Does the prompt matter? | Examples (Oct 2026) |
| --- | --- | --- | --- |
| **Instruction editor** | the video + reference images + a text instruction | **Yes — it is the steering wheel** | Seedance 2.0 / 2.5, Kling O1 / 3.0 Omni, Wan 2.7 / 3.0, MiniMax H3, Gemini Omni 1.1, Runway Aleph 2.0, Luma Ray3 Modify, Higgsfield Genjutsu, Decart Lucy |
| **Replacement pipeline** | one character image + the video | Barely or not at all — the inputs do the work | Wan 2.2 Animate (Replace), Kling Motion Control, Viggle Mix / Multi-Track, Higgsfield Recast, DomoAI, OpenArt Replace Character |

The Cast Swap prompt is written for **instruction editors**. For a replacement pipeline, give the user the
**input checklist** (below) instead — and the CHARACTER LOCK for the optional text box, if the tool has one.

Not usable for this job (Oct 2026): **Sora 2** (discontinued — app closed 2026-04-26, API removed
2026-09-24) and **Veo 3.1** (extends its own videos only; cannot edit an uploaded clip).

---

## Which tool for which clip

Read the scan and the images, then check these rows. Print the `🧰 Tool fit:` line **only when a row rules
something out** — at most two short lines, the most limiting first. Nothing ruled out → no line.

| The clip has… | Route | Why |
| --- | --- | --- |
| **Real human faces** — live-action footage, a photo of the user, or a photoreal AI-made face | An editor that accepts real faces with consent: **Kling, Wan, Luma, Runway Aleph, Viggle**, and Higgsfield's own tools | **Seedance 2.0 / 2.5 reject any uploaded image or video with a real-looking human face** — the source clip and realistic AI faces included — unless the person is verified through the platform's own authorization flow. Higgsfield runs its own eligibility check on uploads (creators report their own face passing and celebrities failing), but tools there that run on Seedance can still apply Seedance's rule. Gemini Omni blocks some recognisable people and cannot edit uploads in the EEA, Switzerland or the UK. |
| **Two or more people to replace *and* real faces** | **Viggle Multi-Track** (up to 7 people, no prompt), **Higgsfield Genjutsu**, or one person per pass in Kling, Wan, Luma or Aleph (Pass 2 edits Pass 1's result) | The strongest multi-person editor (Seedance) is the one that blocks real faces. |
| An **animated** source (anime, cartoon, 3D, game) and drawn or 3D characters | Any instruction editor — **Seedance 2.5** is the strongest with several people | No real faces to block. Big-franchise characters can still hit IP filters. |
| **Two or more people to replace** | **Seedance 2.5** (official two-person example), **Viggle Multi-Track** (up to 7, no prompt), **Genjutsu** | Most pipelines handle one person only: Wan 2.2 Animate's mask is single-person, Kling Motion Control takes the largest person in frame. |
| **One person, one continuous shot** | A pipeline, or an editor — both work | For the strongest identity: swap the first frame first (see §The first-frame helper), then animate it. |
| **Longer than 15 s** | Seedance 2.5 (4-30 s, best under 20 s), Aleph 2.0 (2-30 s), Genjutsu (up to 30 s), Wan 2.2 Animate (2-30 s), Kling Motion Control (up to 30 s), Viggle (up to 60 s) — or split it | Kling O1, Gemini Omni, Luma Ray3 Modify and Wan 2.7 videoedit take 10 s; Seedance 2.0, Kling 3.0 Omni, MiniMax H3 and Wan 3.0 editing take about 15 s. |
| **Cuts** inside the clip | An instruction editor, or one job per shot | Kling Motion Control truncates at cuts. Seedance 2.5 edit keeps the source cuts. |

---

## The tag adapter

The prompt calls the clip **Video 1** and the references **Image 1, Image 2…** — the literal names Seedance,
Wan and MiniMax H3 use, and plain enough for every other editor. Print this line under the prompt:

```
🏷️ Using @-tags? Replace "Video 1" with your tool's video tag (@Video1, [@Video]) and each image number with its tag — "Image 1" → @Image1, "Images 1-2" → @Image1 and @Image2 — same numbers, same upload order.
```

Per tool, when the user names one:

| Tool | The video | The images | Notes |
| --- | --- | --- | --- |
| Seedance 2.0 (API docs) | `[Video 1]` | `[Image 1]` | Set the duration to the clip's length yourself. |
| Seedance 2.5 (Dreamina / CapCut) | `@Video 1` | `@Image 1` | Needs an edit word — the prompt opens with "Edit". |
| Seedance on fal | `@Video1` | `@Image1` | |
| Kling app (O1, 3.0 Omni) | `[@Video]` | `[@Image1]`, `[@Element]` | At most 4 references. Prompt cap 2,500 characters. |
| Kling API | `@video_1` | `@image_1` | |
| Wan 2.7 videoedit / Wan 3.0 | `Video 1` | `Image 1` | Needs an edit word ("Edit the video", "replace"). 2.7: clips 2-10 s, up to 4 images. 3.0: clips up to 15 s, up to 10 images. |
| MiniMax H3 | `Video 1` wrapped in angle brackets | `Picture 1` wrapped in angle brackets | The angle brackets are part of the tag. |
| Gemini Omni 1.1 | a `[# Sources …@Video1]` tag | a `[# References …@Image1]` tag | Copy the full tags (they carry an internal id in angle brackets) from the tool's own guide. Clips up to 10 s. |
| Luma Ray3 Modify | the input video | `image1` = the character, `image2` = a keyframe | Up to 10 s. Start at the Adhere end of the slider. |
| Runway Aleph 2.0 | the input video | a keyframe and a reference image | One edit per run. |
| Higgsfield Genjutsu | `@Video` | `@Image 1` | Prompt optional. |
| Decart Lucy | — | one image | Short, plain sentences; one edit per prompt. |

**Never write "reference Video 1" in an edit prompt.** In Seedance the word "reference" turns an edit into a
reference task, which no longer keeps the clip.

---

## Settings that change the result

| Setting | What to tell the user |
| --- | --- |
| **Duration** | Edit modes keep the source length on their own (Seedance 2.5 edit locks it: ratio `adaptive`, duration `-1`). Anywhere a length must be picked, pick the source length in whole seconds — the number the prompt states. |
| **Exact length on Seedance 2.5 edit** | Edit output can come out about 0.3 s short. Trimming the source to **8n+1 frames** (e.g. 161, 241) makes the output match exactly. The scanner prints the nearest 8n+1 trim. Keep about 0.5 s of spare footage after the last word or beat — edits tend to eat the final frames. If the clip ends on a very short shot with nothing after it, hold its last frame for half a second in an editor before uploading — hold first, then trim to 8n+1. |
| **Draft first** | Where a draft or 480p mode exists, test there and render the 1080p final once the swap holds — an edit costs about twice a normal generation. |
| **Sound** | Most editors make a new soundtrack or none. Keep the original: switch "keep original sound" on where it exists (Kling), use "origin" audio (Wan 2.7), otherwise switch generated audio off and lay the original track back in an editor. Mouths stay in sync because the motion comes from the source. |
| **Prompt enhance / prompt extend** | Switch it off. It rewrites the prompt, and a rewrite can scramble which image goes to which person. |
| **Reference image size** | Huge AI-made images can leave fingerprint-like textures in grass and foliage. Resize them to no bigger than the output resolution. |
| **Aspect ratio** | Set it in the tool (edit modes copy the source). Never in the prompt. |

---

## Seedance 2.5 — the specifics

The strongest editor for several people at once, and the one users ask about most. From the official
BytePlus guide and tutorials (Oct 2026):

- **Two modes, pick on purpose.** *Edit* swaps people in place and locks the source's length and frame
  shape (source 4-30 s, best under 20 s). *Reference* re-creates the motion in a new world or style and
  lets you choose the length. The Cast Swap prompt is an Edit (it opens with "Edit"). On the API, set the
  task type to edit, ratio `adaptive`, duration `-1`, and MOV output for the best colour match.
- **Limits that hold up:** 1-5 reference images per edit; up to about 3 replaced people per pass; up to 10
  videos and 30 images per request in total.
- **Where it runs:** Dreamina / CapCut (Smart Edit or Omni Reference — type `@` to pick an asset; prompts
  over about 5,000 characters get rejected), Higgsfield (Edit video, and Genjutsu's Object Swap / Motion
  Transfer), fal, OpenArt and others. On a surface that asks for a duration instead of locking it, set the
  source length in whole seconds — the number the prompt states.
- **A restyle that drifts in Edit** can be run as a Reference task. Replace the prompt's opening with the
  official fidelity sentence, then keep everything else:

```text
Use Video 1 only for the camera movement, motion, character positions and timing — not for its look. Create a continuous one-to-one temporal correspondence with Video 1 from the first frame through the final frame. Each output moment corresponds to the same moment in Video 1 at the same playback speed.
```

- **Real faces:** blocked on upload (§Faces). The official route for the user's own face is BytePlus's
  real-person verification — a QR invite, a phone liveness check, a front full-body photo and a neutral face
  close-up — after which the face becomes an approved asset. Some third-party hosts check differently; a
  rejection there is still a rejection, not a puzzle to solve.

---

## Wan — the specifics

Wan has both kinds of tool, and they behave nothing alike (official Wan / Alibaba docs, the Wan-Animate paper,
ComfyUI guides and creator tests, Oct 2026):

- **Wan 2.2 Animate, Replace mode ("Mix")** — a pipeline: one character image + the clip (2-30 s), the
  background, camera, body motion and expressions are kept and a relighting step matches the light. The
  hosted versions (Alibaba, fal, Replicate) **take no prompt at all**, and the model's own authors say text is
  a minor input. It replaces **one** person — the largest in frame, or the one marked in ComfyUI's points
  editor; for two people, run one pass each. Output is silent: lay the original sound back. Anime, chibi or
  non-human characters often stretch to the original's skeleton — a first frame already swapped in the
  target proportions helps. Give the user the input checklist, not the prompt.
- **Wan-Animate-2** (Aug 2026) is **not** an in-place swap: it re-generates the background from text. Don't
  route a swap there, whatever the name suggests.
- **Wan 2.7 videoedit** — an instruction editor: clips 2-10 s, up to 4 reference images, `duration 0` keeps the
  length, `audio_setting: origin` keeps the original sound, and turn `prompt_extend` off. The Cast Swap prompt
  works as written.
- **Wan 3.0** — an instruction editor: the clip (up to 15 s) goes in as a reference video, the prompt needs an
  edit word, `duration -1` and `ratio adaptive` keep length and shape, up to 10 images numbered in upload order.
  Its own guide changes one thing per pass and keeps role gear explicitly ("keep the baseball cap, knee pads…
  from the original video") — exactly this skill's rules. Timestamps are hints: a swap covers the whole clip.

---

## Faces, IP and labels

- **Seedance** — real human faces are blocked in uploads, including the source clip and realistic AI faces.
  The compliant routes are the platform's own: verified, authorized real-person assets, a liveness-verified
  avatar of yourself, preset digital characters, or the platform's own recent outputs. Never suggest a way
  past the check.
- **Gemini Omni** — blocks some recognisable people; editing uploads is unavailable in the EEA, Switzerland
  and the UK.
- **Runway** — public figures are blocked by default.
- **IP filters** — Seedance / Dreamina, Higgsfield (major franchises) and Alibaba's Wan API can reject
  famous characters. Fallback: send the prompt with the character's name removed and the description kept,
  and say why.
- **Labels** — Kling requires outputs to be labelled; Luma requires disclosure; Seedance, Runway and Google
  embed watermarks, C2PA or SynthID. TikTok requires a label on photorealistic AI or face-swapped people.

---

## The input checklist — for replacement pipelines

Give this instead of (or alongside) the prompt when the user's tool is a pipeline:

```
🧰 For one-image tools (motion control, animate-replace, body swap):
✅ One person to replace, and they are the biggest or closest person in the clip
✅ One continuous shot — trim at the cuts and run one job per shot
✅ Matching framing — a full-body image for a full-body clip, waist-up for waist-up
✅ A similar build to the person you replace — big differences stretch the body
✅ Face clear, expression neutral, standing still (not mid-step), on a plain background
✅ Framed like the clip and close to its shape — some hosts crop your image to fit
✅ Want to keep the original costume? A face-only image keeps it; a full-body image brings your clothes
✅ For tools that take the background from your image: use a first frame with you already swapped in
```

---

## The first-frame helper

The most reported way to lift identity and keep the original background: swap the person in **frame 1**
with an image model first, then hand that frame to the video tool (as the keyframe, the start frame, or the
motion-control character image).

Offer it in 💡 Next when the clip has one person, or when a pipeline tool is in play, or as a fix for faces
that keep drifting. It is a **separate image-edit job with its own numbering**: the user uploads the video's
first frame first, then the character's image(s). The image prompt:

```text
Replace [target — position and clothing] in the first image with the [person / character] in the second image, in exactly the same pose, position, size and framing. Keep the background, the lighting, the camera angle and everyone else in the first image exactly the same. The [person / character] [keeps their own outfit: … / wears the [costume] from the first image].
```

With two characters, add `and replace [target 2] with the [person / character] in the third image` — one
sentence per swap, as in the video prompt. The first frame is in the scanner's `frames/` folder. Check that
the edited frame lines up with the real first frame before using it — a shifted pose breaks the motion
transfer. Then attach it to the video job as the start frame or keyframe, alongside the usual images.