# Wan Studio — You In A Video (references/you-in-a-video.md)

# 🙋 You in a video — putting the user themselves into a clip

This file governs the user appearing **as themselves**, from photo(s) of themselves, in an existing clip (🔄)
or in a video built from scratch (🎞️ 🎬): the face rule for Wan, the photo checklist, the optional stylised
"you" (the swap-ready sheet), and consent.

Everything here works inside the flows in `SKILL.md`. It never adds a blocking question and never changes the
order of the steps.

---

## The face rule — read first

> Snapshot: researched 2026-10-19 (`assets/research/wan/03`). If the user's own screen says otherwise,
> believe their screen and say so.

- **Wan takes real faces.** A selfie, a photo of the user, a live-action clip and photoreal AI-made faces all
  go in as they are — there is no face verification step. That is the big difference from Seedance: in Wan
  Studio the user is simply themselves in the swap.
- **Every job still passes Wan's automatic checks**: a content check on everything, and — on Wan 2.2
  Animate's one-image route — photo checks that reject unclear or crowded pictures: no person found, more
  than one person, a hidden or tilted face, a subject too small or too big, an image that is too dark.
  §The photo checklist avoids them on every route. A character sheet — one character in several views — is
  fine as a Wan 3.0 reference; its text labels are what can leak (§🎭 sheets from earlier in the chat).
- **Consent.** The user's own face, or someone who agreed to it — `casting.md` §Responsible use holds for
  every mode.
- **Never suggest a way past a check** — no crops, blurs or noise to slip a picture through, no lookalike
  descriptions or misspelled names, no other host to dodge a refusal. A refusal is the tool's answer.

---

## The photo checklist

Wan's own photo checks, as advice. In 🔄 the 📸 image ask already carries these points (`casting.md`
§Asking for the images), so print the checklist only when the user's photo arrives without them — once per
conversation. In 🎭 🎞️ 🎬 it replaces the 🙋 line when the photo has a problem:

```
📸 For the best likeness in Wan:
✅ Just you in the photo — one person
✅ Facing the camera, the whole face visible, head straight
✅ Bright, even light
✅ Not tiny in the frame and not cropped off — a face close-up plus a full-body shot is best
✅ A plain background
```

A photo that misses one of them still goes in; say which point it misses in its 👀 card (`casting.md`
§Warnings worth printing).

---

## The route in 🔄

Read the clip type from the 🔍 Scan Report and the reference type from the 👀 card (`casting.md` §Reading
each image):

| The clip is… | The reference is… | Route |
| --- | --- | --- |
| **Live action** | the user's photo(s) | Cast Swap as normal. Default: keep the clip's look — the user, in the real scene. A restyle (styles 2, 3, 4, 6) works too. |
| **Animated** (anime, cartoon, 3D, game) | the user's photo(s) | Cast Swap as normal: the style line draws them in the clip's own style (`style-modes.md` §1, the photo-into-animation row). Offer §The swap-ready sheet in 💡 Next for a stronger likeness in that style — never as a blocking question. |
| **Either** | a stylised version of the user, a drawn or 3D character, or a character sheet | Cast Swap as normal. |

**A later answer replaces an earlier one.** A user who asked for the swap-ready sheet and then says "just use
my photo" gets the prompt with the photo now; the sheet prompt simply goes unused.

---

## The swap-ready sheet — becoming the anime / cartoon / 3D you first

An optional extra for a stylised clip: a 🎭 character sheet of the user, built for one job — being a clean
reference image in a Cast Swap. It is deliberately **not** the premium production board in
`character-sheet.md`, and the rules for modes 1-3 don't apply to it (`SKILL.md` §Which rule wins). A video
model reads everything in a reference image, so handwritten notes, callouts, expression grids and props leak
into the video as text, extra people or stray objects.

Give it when the user asks ("make me anime first", "turn me into a cartoon") or picks it from 💡 Next.

**Rules**

1. **Read the photo(s) first** and use their 👀 card(s). Preserve, never prettify: hair, facial hair,
   glasses, skin tone, build and marks all stay. What the photos don't show is not invented.
2. **The style is the clip's own style** from the scan, described by visible traits (line work or surface,
   shading, colour, shapes). Use the same traits the Cast Swap style line will use. Values: `anime`,
   `cartoon`, `3D animated`, `3D game` (e.g. blocky low-detail game avatar: simple box shapes, smooth plastic
   surfaces, flat bright colour). It is **clearly stylised** in that style — the point is to match the clip,
   so it is never photoreal or "semi-realistic".
3. **Very simple styles carry little likeness.** For a blocky game avatar, a stick figure or a chibi, add
   one line: `In this style there's little room for a face — you'll be recognisable by your hair, skin tone and outfit more than your features.`
4. **The outfit follows `casting.md` §The outfit rule**, decided now as if the photo(s) went straight into the
   swap. For a set, decide once, from the image that shows the most body:
   - An everyday selfie or a face-only photo wears the costume of the person being replaced, described from
     the scan by clothing only, never by their face.
   - A full-body studio photo keeps its own outfit.
   - A waist-up photo takes its own top and the replaced person's bottom half.
   - Role gear stays.

   **Lettering, brand logos and patches on the clothes are left off.** The garment stays, the print goes.
   Say so in the 👕 line.
5. **One character, plain background, nothing else.** No text, labels, callouts, logos, props or scenery.
6. **Views**: a large front-facing head-and-shoulders close-up (neutral expression, eyes open, face fully
   visible), plus full-body front, three-quarter and back views, standing still with relaxed arms. That gives
   the editor the face close-up and the full body that `casting.md` asks for, in one image.
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

**The reply**, in this order:

1. `## 🎭 Swap-Ready Sheet — [you as anime / cartoon / 3D / a game avatar]`
2. `👕 [the outfit and why, in one line] — say "[the other option]" to switch.` Add the likeness line from
   rule 3 if it applies.
3. One line: `**Attach your photo(s) to an image model, then paste this.**` With two photos, put the face
   close-up first.
4. The prompt in one fenced `text` block.
5. `📌 Upload the sheet here when it's ready — it becomes your character image in the swap.`
6. `👀 Check it before you upload: does it still look like you, and is it in the clip's style? If it came out photo-like, say "more [anime]" and I'll push the style harder.`
7. The footer.

**When the sheet comes back**, it is a single image of one character. Read it and print its 👀 card (type:
anime, cartoon, 3D-animated or game). The outfit is the one drawn on it (`casting.md` §The outfit rule,
character-sheet row), and its number follows `prompt-template.md` §Slot rules, Image numbers. The cards for
the original photo(s) were already shown, so don't reprint them. One defaults line covers what carried over.
If the sheet looks photo-like after all, offer the stronger-style retry — or use it anyway if the user
prefers.

---

## 🎭 sheets from earlier in the chat

- **A generated 🎭 sheet image** is a valid 🔄 reference. A sheet with notes, labels or callouts (a premium
  production board, a labelled turnaround) gets a ⚠️ on its 👀 card:
  `⚠️ This sheet has notes or labels on it — they can leak into the video. Say "clean sheet" for a stylised swap-ready version, or, to keep it real, send a plain face close-up and a full-body photo instead.`
- **A 🎭 character that exists only as a prompt** (the user never generated or uploaded it) is not an
  image. Nothing in it can go into a CHARACTER LOCK. Ask once:
  `Your [astronaut] sheet only exists as a prompt so far — generate it and upload the image here, or say "use my photo" and I'll use the photo you sent.`
  With the photo, the route table applies, and the photo's own outfit rule decides the outfit. The 🎭
  costume then goes into 💡 Next: `Want to wear the [spacesuit]? Generate the sheet first and upload it.`

---

## You in a video built from scratch (🎭 🎞️ 🎬)

When the reference for a sheet, storyboard or video prompt is **a photo of the user** — or of another real
person — add one line under the finished prompt, outside the block, before the 🔁 Next Step, once per
conversation:

- **The user's own photo:** `🙋 Your photo works in Wan as it is — clear, front-facing and well lit holds your face best.`
- **Someone else's photo:** `🙋 Wan takes this photo as it is — use it only with that person's OK.`

A photo with a problem (several people, a hidden face, too dark) gets §The photo checklist instead. A
photoreal AI-made character needs no line; when you can't tell a real person from an AI-made one, print the
consent line.

---

## Responsible use — every mode

`casting.md` §Responsible use applies here too. Your own face, or someone who agreed to it. Public figures
only as clearly AI-made fan or parody content, never deceptive, never sexual. Never a minor in a romantic,
sexual or violent role; a child's photo only with a parent's or guardian's consent. When the result is
photoreal and the user mentions posting it, add one line:
`📝 TikTok and others require an AI label on photoreal or face-swapped people — add one when you post.`

---

## Self-check additions

1. Real faces go in as they are — no verification step, no stylised workaround is ever demanded.
2. The route matches the table: clip type from the scan, reference type from the 👀 card.
3. The photo checklist and the 🙋 line appear at most once per conversation, and only where they fit.
4. Someone else's face is used only with their consent; a child only per §Responsible use.
5. A swap-ready sheet (only when asked for or picked) has one character, a plain background, no text or
   logos, the clip's style, the outfit from the outfit rule, and the 👕 line.
6. Nothing anywhere suggests a way past a check.