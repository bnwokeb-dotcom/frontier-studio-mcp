# Cast Swap — Prompt Template (references/prompt-template.md)

# Step 4 — The prompt

One master template, filled from the scan, the casting and the style. Two complete, checked builds are in
`worked-examples.md` — read them once before your first build. It is written for **instruction
editors** — video tools that take the source video, reference images and a text instruction (see
`tool-notes.md`). The same text works across them; only the tag names change, and the tag adapter line
outside the block handles that.

> Why it is shaped this way — every rule below comes from the research in `assets/research/`:
> the official Seedance 2.5 guide (edit trigger, upload-order mapping, whole-second timestamps,
> reference-don't-redescribe), creator prompts that went viral (viewer's-side targeting, the
> identity/wardrobe vs motion split, listing who stays), and the cross-tool landscape (Video 1 / Image 1
> naming, short positive wording, the 2,500-character box).

---

## The master template

Fill every slot; drop the lines marked *(only if…)* when they do not apply. Plain sentences, no headings
inside the block. Fixed wording is kept verbatim — it is short on purpose.

```text
Edit the entire source video, Video 1[RESTYLE ONLY: , and turn it into a [N]-second [STYLE NAME] version of itself].
Replace [TARGET 1] with the [person / character] in Image 1.
(only if a second person is replaced) Replace [TARGET 2] with the [person / character] in Image 2.
(only if anyone stays) Keep [EVERYONE WHO STAYS] exactly as [they are / themselves, in the same style].

[IMAGE LABEL 1]: [CHARACTER LOCK 1].
(only if) [IMAGE LABEL 2]: [CHARACTER LOCK 2].
[OUTFIT SENTENCE]
Video 1 provides the motion, expressions, lip movements, timing, camera moves, [cuts, — only with 2+ shots] framing[EDIT: , lighting and background / RESTYLE: and every person's position]. Each new character appears exactly where and when the person they replace appears — the same entrances, movements, occlusions and exits — and everyone keeps their original position and performance.

Keep the full [N] seconds and the same [SHOTS] as Video 1. [PEOPLE LINE]
Video 1 timeline — keep the action order and timing exactly:
[0s-Xs] [shot size]: [who is where — doing what, in a few words].
[Xs-Ys] ...

[CONSISTENCY LINE]
[STYLE LINES — from style-modes.md]
(only if the source has overlaid caption text) Remove the overlaid [describe it: white caption text at the top, 0s-3s]; text that belongs to the scene stays.
Keep the original audio. No subtitles.
```

### Slot rules

| Slot | Rule |
| --- | --- |
| **Opening** | Always `Edit the entire source video, Video 1` — the edit word is what makes an editor keep the clip. RESTYLE styles (2, 3, 4, 6) add `, and turn it into a 10-second anime version of itself`. Never write `reference Video 1`. |
| **TARGET** | The **viewer's** side (`the viewer's LEFT`, `RIGHT`, `CENTRE`, `FAR RIGHT`) + clothing + one action or prop: `the viewer's LEFT person — the man in the grey suit carrying a briefcase`. Someone who arrives later gets a time window: `the woman in the yellow coat who enters at 4s`. One person in the whole clip: `the man in the orange helmet` is enough — no side needed. Never the person's face, never a name the user did not give. |
| **One sentence per swap** | Each replacement is its own sentence. Never `respectively`, never two mappings in one sentence — both are documented causes of characters landing on the wrong person. |
| **Image numbers** | Numbered in the order **their characters first appear** in Video 1: Image 1 replaces whoever appears first. Within one character's set, the face close-up comes first, then the full body. If that differs from the order the user sent them, renumber here and spell out the upload order in the 📎 attach line. Mismatched order is the documented cause of the wrong face landing on the wrong person. |
| **IMAGE LABEL** | One image: `Image 1`. A set of one character: `Images 1-2 (the same person — Image 1 the face, Image 2 the full body)`. The replace sentence says `the person in Images 1-2`. |
| **STAYS** | Every roster person who is not replaced, by position + clothing; crowds as `the people in the background crowd`. Nobody else in the clip → drop the line. |
| **CHARACTER LOCK** | From `casting.md` §The CHARACTER LOCK — 20-60 words, visible facts only, the outfit stated. The line reads `[IMAGE LABEL]: [lock].` — the lock itself carries no label. |
| **OUTFIT SENTENCE** | Every character wears their own outfit → `The images provide identity and outfit only; everything around the characters comes from Video 1.` Every character wears the original's costume → `The images provide identity only — face, hair and build; the outfits and everything around the characters come from Video 1.` A mix → `Each image provides identity, and its outfit only where its line says so; everything else comes from Video 1.` |
| **The Video 1 sentence** | Verbatim, with three switches: `cuts,` appears only when the clip has two or more shots or scenes; EDIT styles (1, 5) end the list with `lighting and background`, RESTYLE styles with `and every person's position` — their light and background are redrawn, not kept; and with one new character, `Each new character appears…` becomes `The new character appears…`. |
| **Duration** | Whole seconds — the scanner's `duration` (the video stream) rounded to the nearest second: `9.98 s` → `10`. |
| **SHOTS** | From the scan: `3 shots and cuts`; one take → `single continuous shot`; scenes joined by transitions → `7 scenes and black wipes`, `2 shots joined by a dissolve`. A soft transition counts as a scene change only if the scan confirmed a new place. |
| **PEOPLE LINE** | Count every P-labelled person; groups of extras are described, not counted. Two or more: `Exactly 3 people appear, each only once.` One: `Exactly 1 person appears, only once.` People in different places across the clip: `Exactly 6 people appear across the clip, each only once.` Extras: add `, plus the same six people on the plaza` or `, with the same background crowd`. Count every roster person, partial people included; an uncertain partial person (a knee at the frame edge that may be the camera operator) is left out of the count and named in neither line. |
| **CONSISTENCY LINE** | One line for all: `Each new character keeps the same face, hair and outfit in every shot and from every angle, even in profile or partly hidden.` One character: `The new character keeps…`. |
| **STYLE LINES** | From `style-modes.md`: the relighting line or the animated-source line (style 1), the mixed line (5), or the style sentence + the everyone-in-frame line (2, 3, 4, 6). |
| **Caption removal** | Only for **overlaid caption or title text** someone added on top of the picture, named by what and when. Never for a creator's watermark or channel logo — that is the owner's mark (`casting.md` §Responsible use). Signs, screens and labels that belong to the scene always stay. |
| **Closing** | `Keep the original audio. No subtitles.` — the two negatives the official guide supports, and always the last line. Everything else is said positively. |

---

## Timestamps

The prompt's timeline is an **anchor map**, not a choreography. The source video already carries the
motion; describing every gesture makes editors re-stage the scene. Each beat says only what keeps the right
face on the right person at the right moment: the shot size, who is where, and the main action.

1. **Whole seconds**, written `[0s-3s]` — the unit current editors respond to (Seedance 2.0 ignored
   timestamps entirely; 2.5 reads whole seconds). These brackets are the only square brackets allowed in a
   finished prompt.
2. **Boundaries come from the scan.** The scanner's `prompt` line gives the hard cuts already rounded;
   `with the soft transitions / black gaps too` adds the scene changes made by dissolves and wipes — keep
   those only where the soft sheet shows a new place. Add a boundary inside a long shot at each real change
   of action.
3. **A cut that rounds onto another boundary or onto the clip's end is folded in**, not dropped: mention its
   shot inside the neighbouring beat — `[4s-10s] … ending on a close-up of him smirking.`
4. Contiguous from `[0s-…]` to the stated duration; no gaps, no overlaps. Beats of 2 seconds or more read
   best; a 1-second beat only when a real shot that short forces it.
5. **Few words per beat** — about 8-20. Name each new character the same way every time, **by their own
   look**: `the man from Image 1`, even when he replaces a woman, a child or an animal. Say which side of
   frame they are on whenever two or more people are visible.
6. Mark entrances and exits — `the woman from Image 2 enters from the right`, `he leaves frame left` — the
   moments an editor most often loses track of who is who.
7. Neutral words for fights, stunts and falls (`they spar`, `he falls back onto the sofa`) — violent
   wording trips moderation filters. Plain emotion words too (`surprised`, not `fanatical`).
8. Never more beats than the clip has events: about 3-6 for 10 s, 4-8 for 15 s, 6-12 for 30 s.

Example — a 10-second clip with cuts at 3.2 s, 6.8 s and 9.6 s:

```text
Video 1 timeline — keep the action order and timing exactly:
[0s-3s] Wide shot: the man from Image 1 walks toward camera on the viewer's left; the woman in red walks beside him on the right.
[3s-7s] Medium shot: he stops and turns to her; she laughs.
[7s-10s] Close-up on the woman as she answers, ending on a close-up of the man from Image 1 looking into the lens.
```

---

## Long clips

| Source length | What to deliver |
| --- | --- |
| **up to 15 s** | One prompt. |
| **15-30 s** | One prompt for the full length (it states the full duration and carries the full timeline), then directly under the block: `✂️ Your tool takes 15 s per job? Say "split" — or "split 10" for a 10-second tool — and I'll cut it at the natural scene changes.` For edits over 20 s, add that splitting gives steadier results. Plain "split" means parts of up to 15 s. |
| **over 30 s** | Split automatically, and print one prompt per part. |

**How to split** — the scanner's `segments` already do the hard part (run it with `--max-seg 15`, or 10 for
a 10-second tool):

1. Parts are **balanced** and cut at the source's own boundaries — a hard cut, else the middle of a black
   gap, else a confirmed soft transition — and the scanner takes an extra part rather than split mid-shot.
   Every part is 4 s or longer; none exceeds the maximum.
2. A part marked `ends at mid-shot` needs continuity: tell the user to use the last frame of the previous
   result as the first frame of the next part.
3. **Each part is a complete prompt of its own**, with **local timestamps from `[0s-…]`** (the scanner prints
   each part's local beats), its own duration, people line and shots — because the user uploads each trimmed
   part as its own Video 1.
4. The heading carries the global range: `## 🎬 Part 2 (0:10.5-0:18.4), Video-to-Video Prompt`, and the
   attach line says exactly what to trim: `Trim the source to 0:10.5-0:18.4 and upload that as Video 1.`
5. Every part uses **the same images, numbering and CHARACTER LOCKs**, word for word — that is what keeps
   the character identical. Add to each part after the first:
   `This is part [n] of [total]; the characters look exactly as in part 1.`
6. **A part with nobody to replace** needs no prompt when the style stays the same — say `Part 3 (0:18.4-0:30.0): nobody to swap here — use the original footage as it is.` With a restyle, that part still gets
   a restyle-only prompt, so it matches the other parts:

```text
Edit the entire source video, Video 1, and turn it into a [N]-second [STYLE NAME] version of itself. This is part [n] of [total]; it keeps exactly the look of the earlier parts.
Video 1 provides the motion, expressions, lip movements, timing, camera moves, [cuts, ]framing and every person's position.
Keep the full [N] seconds and the same [SHOTS] as Video 1. [The same people and crowds as Video 1 appear, each only once. — or the usual people line when P-numbered people are in this part]
Video 1 timeline — keep the action order and timing exactly:
[0s-Xs] ...
[STYLE SENTENCE]
Everyone and everything in frame — the people, any crowd and the whole background — get this same style, from the foreground to the back.
Keep the original audio. No subtitles.
```
7. A replaced person missing from a part: that part's prompt drops their replace sentence and image, and
   the attach line says not to upload their image for that part. A replaced person on screen in two parts
   is replaced in both, with the same image and the same lock.
8. **A part's whole seconds come from its rounded boundaries**, not its rounded length — the scanner's
   `prompt: N s` — so the parts always add up to the full clip and the joined result stays in step with the
   original sound. The heading and the trim line use the scanner's one-decimal times, `0:10.5-0:18.4`.
9. The scanner's per-part beats include **candidate** transitions; keep a boundary only where the soft sheet
   showed a new place, as for the full clip.

---

## Big casts — more than 3 people to replace

Swaps hold reliably for up to **3 replaced people per job**; beyond that, faces start trading places. With 4 or
more, deliver it in passes and say so in one line:

- **Pass 1** — the first 2-3 replaced people (by first appearance), with the full prompt; everyone else stays.
- **Pass 2** — upload Pass 1's result as Video 1 and replace the rest; the people swapped in Pass 1 are now
  listed as staying, by position and their new look.

Each pass numbers its own images by first appearance.

---

## Length budget

- **Aim for 2,500 characters or fewer** — the smallest box among the listed editors (Kling's). Wan 3.0 takes
  4,500, Seedance 2.5 and Dreamina about 5,000. Count before printing.
- Over 2,500, trim in this order: (1) shorten every timeline beat to 20 words or fewer; (2) trim the
  CHARACTER LOCKs to signature features and outfit; (3) shorten the stays line to position + one clothing word
  per person, and groups for extras; (4) only then merge beats — only beats inside the same shot, and never a
  beat where a replaced person is on screen (those are the anchors that matter; merge scenery beats first).
  Never cut the opening, the replace sentences, the outfit and Video 1 sentences, the duration or the people
  line.
- Still over (a 30-second clip with several people can be): print it anyway if it is under 4,000, and add
  one line under it — `This prompt is [N] characters; Kling's box takes 2,500 — say "short" for a compact
  version.` The compact version keeps only the scene-change beats and the signature features. When the `✂️`
  split line is also due, it comes first and this note second.

---

## Self-check for the prompt

1. Opens with `Edit the entire source video, Video 1`; no `reference Video 1` anywhere.
2. One replace sentence per replaced person, each with a position **and** clothing or action (the
   position may be dropped only when the clip has one person).
3. Image numbers follow first appearance (face before full body within a set); the attach line uses the
   same numbers and says when they differ from the order the user sent them.
4. Every roster person who stays is named as staying, or the clip has nobody else.
5. Every character has its `Image N:` or `Images N-M (…):` line, holding a lock of 20-60 words with no label
   inside it; nothing invented; outfit stated.
6. The outfit sentence matches the characters' outfits; the Video 1 sentence has `cuts,` only for a multi-shot
   clip and ends the way the style shape says; the appears-exactly-where-and-when sentence is present.
7. Duration in whole seconds; shots or transitions as scanned; the people line uses the right singular or
   plural form with a number.
8. Timeline in `[0s-3s]` whole seconds, contiguous, ending on the duration; every source cut is a boundary
   or folded into a neighbouring beat; beats are short anchors, not choreography.
9. One sentence per replacement, no `respectively`; no more than 3 replaced people in one prompt.
10. One consistency line; style lines match `style-modes.md`; a RESTYLE carries the everyone-in-frame line.
11. Caption removal only for overlaid captions, never a watermark; `Keep the original audio. No subtitles.`
    is the last line, and no other negative line exists (everything else is phrased positively).
12. No tool or model name, no aspect ratio, no camera-device name, no original person's face described, and no
    square bracket left except the `[0s-3s]` timestamps.
13. 2,500 characters or fewer, or the over-length note is printed.