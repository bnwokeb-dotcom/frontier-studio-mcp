# Seedance Studio — You In A Video (references/you-in-a-video.md)

# 🙋 You in a video — putting the user themselves into a viral clip

The bridge between 🎭 Character Sheet and 🔄 Cast Swap. It applies whenever the user wants **to appear
themselves**, from photo(s) of themselves, in an existing clip (🔄) or in a video built from scratch
(🎞️ 🎬). It decides the route, and when the route needs it, builds a **swap-ready sheet** of the user
first.

Everything here works inside the Cast Swap flow in `SKILL.md`. It adds at most one question and never
changes the order of the steps.

---

## The face rule — read first

> Snapshot 2026-10-05, from `tool-notes.md` §Faces, IP and labels and §Which tool for which clip. If the
> user's own upload screen says otherwise, believe their screen and say so.

- **Seedance 2.0 / 2.5 reject any uploaded image or video with a real-looking human face.** That covers
  a selfie, a live-action source clip, and photoreal AI-made faces, unless the person goes through the
  platform's own real-person verification.
- **The real-face tools** are the ones in `tool-notes.md` §Which tool for which clip, first row: Kling,
  Wan, Luma, Runway Aleph, Viggle, and Higgsfield's own tools. When this file says "a real-face tool", it
  means that list, cut down by every other row that applies (length, number of swaps, cuts).
- **Never suggest a way past a face check.** No noise overlays, face grids, morphs or partial crops, and
  no "semi-realistic" sheet built to slip a likeness through. A rejection is the tool's answer, not a
  puzzle.

A clearly stylised character (anime, cartoon, 3D animated, clay, game) is not a real-looking face. That is
the route this file uses, and `casting.md` §Responsible use names it: *swap in a stylised version of the
character*. Even so, never promise that a tool will accept it. Say it is the Seedance-friendly route,
not a guarantee.

---

## Pick the route

Read the clip type from the 🔍 Scan Report and the reference type from the 👀 card (`casting.md` §Reading
each image), then take the first row that matches:

| The clip is… | The reference is… | Route |
| --- | --- | --- |
| **Live action** (real people on screen) | anything | Cast Swap as normal, for a real-face tool. **Seedance is out for this clip**, because the clip itself carries real faces, other people's included. So never offer the swap-ready sheet, verification, or anything else as a Seedance fix. A restyle (styles 2, 3, 4, 6) still works in a real-face tool. See §Live-action clips. |
| **Animated** (anime, cartoon, 3D, game) | a photo of a real person, and the user is verified on the platform and says so | Their approved asset is the reference, per the platform's own flow. Cast Swap as normal. |
| **Animated** | a **photo of a real person** (the 👀 card says photoreal) | **§The Seedance question**, unless the user already named a real-face tool, or already said to use the photo as it is ("just use my photo"). In either case take option 2 straight away and state it in the defaults line. |
| **Animated** | a stylised version of the user, a drawn or 3D character, or a character sheet | Cast Swap as normal. Seedance 2.5 is the strongest editor here, especially with several people. |

**A later answer replaces an earlier one.** A user who picked the sheet and then says "forget Seedance,
use my photo in Kling" gets option 2 now. The sheet prompt already given simply goes unused.

---

## Live-action clips

**Early notice.** If the user named Seedance (or asked "will this work on Seedance?") and the scan shows
live action, end the 🔍 Scan Report with this line, before the 👥 question:

```
⚠️ Seedance won't take this clip — it rejects videos with real faces in them. I'll write your prompt for a tool that does take them (Kling, Wan, Luma, Runway Aleph, Viggle); it's the same prompt in any of them.
```

**The 🧰 Tool fit line** for a live-action clip names the clip, not only the photo:

```
🧰 Tool fit: this is a live-action clip, so Seedance rejects it (your photo too) — use Kling, Wan, Luma, Runway Aleph, Viggle or Higgsfield's own tools.
```

Then drop every tool another row rules out. Keep only those that take the clip's length, its number of
swaps and its cuts (`tool-notes.md` §Which tool for which clip). If the user named one of them, say
whether that tool fits first.

**The user asks to be made stylised "so it works on Seedance"** on a live-action clip. Never write a sheet
for that purpose. Answer with this, then wait:

```
🙋 Turning you into a drawing won't get this clip past Seedance — the clip itself has real faces in it, and that's what Seedance blocks.

1️⃣ 🌸 **Make the whole clip anime (or 3D, or any style)** — you and everyone in it, in a tool that takes real faces (Kling, Wan, Luma, Runway Aleph, Viggle)
2️⃣ 🎞️ **Keep it real** — your prompt as it is, in one of those tools

No answer? I'll go with 1.
```

Option 1 is the normal Cast Swap RESTYLE (style 3, 4 or 6).

---

## The Seedance question

This covers an animated clip plus a real-face photo, when no exception in the route table applies. Ask it
**in Step 3, in place of the prompt**, as the reply's one blocking question. It goes after the 👀 card(s)
and before any swap map. On those cards the tail reads `→ P1 (for your swap-ready sheet or the prompt)`,
not an image number, since numbering waits for the answer.

The clip's style comes from the scan: `anime`, `cartoon`, `3D animated` or `3D game`. Print it in exactly
this shape:

```
🙋 **Seedance blocks real-face photos** — so here are two ways to get you into this clip:

1️⃣ 🎨 **Become the [3D game] version of yourself first** (the Seedance-friendly route) — I write one image prompt that turns your photo(s) into a [3D game] character sheet. Generate it, upload it here, and it goes straight into the swap.
2️⃣ 📷 **Keep your photo(s)** — I write the swap prompt now, for Kling, Wan, Luma, Runway Aleph or Viggle. The prompt asks for you drawn in the clip's style.

No answer? I'll go with 1.
```

- **1** → §The swap-ready sheet, then hold.
- **2** → the normal Step 4 output, with the 🧰 face line for the photo.
- **Several people to swap, only one of them a real photo** → the question covers that photo only. The
  other images go in as they are.
- Ask it **once per conversation**. The 🙋 lines in the from-scratch modes don't count as asking it.

---

## The swap-ready sheet

A 🎭 character sheet built for one job: being a reference image in a Cast Swap. It is deliberately **not**
the premium production board in `character-sheet.md`, and the rules for modes 1-3 don't apply to it (see
`SKILL.md` §Which rule wins). A video editor reads everything in a reference image, so handwritten notes,
callouts, expression grids and props leak into the video as text, extra people or stray objects.

**Rules**

1. **Read the photo(s) first** and use their 👀 card(s). Preserve, never prettify: hair, facial hair,
   glasses, skin tone, build and marks all stay. What the photos don't show is not invented.
2. **The style is the clip's own style** from the scan, described by visible traits (line work or surface,
   shading, colour, shapes). Use the same traits the Cast Swap style line will use. Values: `anime`,
   `cartoon`, `3D animated`, `3D game` (e.g. blocky low-detail game avatar: simple box shapes, smooth
   plastic surfaces, flat bright colour). It must be **clearly stylised**: never photoreal, hyper-real,
   "semi-realistic" or "realistic 3D". A real-looking result is exactly what the face check exists to
   stop, and building one to get past it is off-limits.
3. **Very simple styles carry little likeness.** For a blocky game avatar, a stick figure or a chibi, add
   one line: `In this style there's little room for a face — you'll be recognisable by your hair, skin tone and outfit more than your features.`
4. **The outfit follows `casting.md` §The outfit rule**, decided now as if the photo(s) went straight into
   the swap. For a set, decide once, from the image that shows the most body:
   - An everyday selfie or a face-only photo wears the costume of the person being replaced, described
     from the scan by clothing only, never by their face.
   - A full-body studio photo keeps its own outfit.
   - A waist-up photo takes its own top and the replaced person's bottom half.
   - Role gear stays.

   **Lettering, brand logos and patches on the clothes are left off.** The garment stays, the print goes.
   Say so in the 👕 line.
5. **One character, plain background, nothing else.** No text, labels, callouts, logos, props or scenery.
6. **Views**: a large front-facing head-and-shoulders close-up (neutral expression, eyes open, face fully
   visible), plus full-body front, three-quarter and back views, standing still with relaxed arms. That
   gives the editor the face close-up and the full body that `casting.md` asks for, in one image.
7. Image prompts may state an aspect ratio. This one uses 16:9.

**Template**: fill every bracket. Nothing in brackets survives into the prompt.

```text
Character reference sheet of one stylised [anime / cartoon / 3D animated / 3D game] character, redrawn from the person in the attached photo(s), for use as a video reference.

Character: [from the 👀 card — age range, build, skin tone, hair colour, length and style, facial hair, glasses, marks], wearing [the outfit per the outfit rule, without lettering or logos].

Style: [the clip's style in visible traits — e.g. modern TV anime: clean thin line work, flat two-tone cel shading, soft pastel colour]. Clearly drawn or rendered as a stylised character, not photographic.

Layout: plain light-grey background, 16:9. Left: a large front-facing head-and-shoulders close-up, neutral expression, eyes open, face fully visible. Right: the same character three times, full body, standing still with relaxed arms — front view, three-quarter view, back view.

Identity: the same face, hair, skin tone, build and outfit in every view — recognisably the person in the photo(s), redrawn in this style. No reinterpretation between views.

Only this one character. No text, no labels, no callouts, no logos, no props, no scenery, no watermark.
```

**The reply** for option 1, in this order:

1. `## 🎭 Swap-Ready Sheet — [you as anime / cartoon / 3D / a game avatar]`
2. `👕 [the outfit and why, in one line] — say "[the other option]" to switch.` Add the likeness line from
   rule 3 if it applies.
3. One line: `**Attach your photo(s) to an image model, then paste this.**` With two photos, put the face
   close-up first.
4. The prompt in one fenced `text` block.
5. `📌 Upload the sheet here when it's ready — it becomes your character image in the swap.`
6. `👀 Check it before you upload: does it still look like you, and is it clearly drawn, not photo-like? If it came out photo-like, say "more [anime]" and I'll push the style harder.`
7. The footer.

**When the sheet comes back**, it is a single image of one character. Read it and print its 👀 card (type:
anime, cartoon, 3D-animated or game). The outfit is the one drawn on it (`casting.md` §The outfit rule,
character-sheet row), and its number follows `prompt-template.md` §Slot rules, Image numbers. The cards for
the original photo(s) were already shown, so don't reprint them. One defaults line covers what carried
over. If the sheet looks photoreal after all, don't send it to Seedance. Say so and offer the stronger-style
retry.

---

## 🎭 sheets from earlier in the chat

- **A generated 🎭 sheet image** is a valid 🔄 reference. A premium production board (notes, callouts,
  expression studies) gets a ⚠️ on its 👀 card:
  `⚠️ This is a production board — its notes and extra panels can leak into the video. Say "clean sheet" and I'll write a swap-ready version (one image prompt).`
- **A 🎭 character that exists only as a prompt** (the user never generated or uploaded it) is not an
  image. Nothing in it can go into a CHARACTER LOCK. Ask once:
  `Your [astronaut] sheet only exists as a prompt so far — generate it and upload the image here, or say "use my photo" and I'll use the photo you sent.`
  With the photo, the route table applies, and the photo's own outfit rule decides the outfit. The
  🎭 costume then goes into 💡 Next: `Want to wear the [spacesuit]? Generate the sheet first and upload it.`

---

## You in a video built from scratch (🎭 🎞️ 🎬)

When the user's character reference for a sheet, storyboard or video prompt is **a photo of themselves**
— or any other real-looking face, a photoreal AI character included — add one line under the finished
prompt, outside the block, before the 🔁 Next Step, once per conversation. Pick the variant:

- **🎭 in a clearly stylised style** (anime, cartoon, clay, cel, Pixar-style 3D animation):
  `🙋 Using Seedance? Upload the generated sheet as your reference, not your photo — Seedance rejects real-face photos.`
- **Anything else** (🎞️, 🎬, or a realistic 🎭 style):
  `🙋 Using Seedance? It rejects real-face photos as references — say "make me anime" (or cartoon, or 3D) and I'll turn you into a character sheet first, or run this in a tool that accepts real faces.`
- **A real-looking face that isn't the user** (a photoreal AI character, a photo of someone else):
  `🙋 Using Seedance? It rejects real-looking faces as references, AI-made ones too — say "make it anime" (or cartoon, or 3D) and I'll turn this character into a stylised sheet first, or run this in a tool that accepts real faces.`

A "make me anime" here goes to 🎭 Mode 1 with the photo as Reference Image 1 and a **clearly stylised**
style. Anime, cartoon, clay, cel and Pixar-style 3D animation all qualify; semi-realistic, hyper-realistic
and "stylized realism" do not. The finished sheet then replaces the photo as the reference.

These lines are for videos built from scratch only. Never show them inside 🔄. A live-action clip can't be
fixed for Seedance by stylising the user (§Live-action clips).

---

## Responsible use — every mode

`casting.md` §Responsible use applies here too. Your own face, or someone who agreed to it. Public figures
only as clearly AI-made fan or parody content, never deceptive, never sexual. Never a minor in a romantic,
sexual or violent role. When the result is photoreal and the user mentions posting it, add one line:
`📝 TikTok and others require an AI label on photoreal or face-swapped people.`

---

## Self-check additions

1. The route matches the table: clip type from the scan, reference type from the 👀 card, the exceptions
   applied.
2. Seedance is never suggested for a live-action clip or a real-face photo, and nothing is offered as a
   Seedance fix for a live-action clip.
3. The Seedance question was asked at most once, only for an animated clip with a real-face photo, and
   not when the user had already chosen.
4. A swap-ready sheet has one character, a plain background, no text or logos, a clearly stylised look in
   the clip's style, the outfit from the outfit rule, and the 👕 line.
5. No tool is promised to accept anything; the stylised route is called Seedance-friendly, not
   guaranteed.
6. Nothing anywhere suggests a way past a face check.