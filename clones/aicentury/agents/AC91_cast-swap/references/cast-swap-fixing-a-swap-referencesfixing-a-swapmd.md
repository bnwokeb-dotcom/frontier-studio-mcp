# Cast Swap — Fixing A Swap (references/fixing-a-swap.md)

# Step 5 — Fixing a swap that came out wrong

The user says something is off. Never ask them to diagnose it. Work out the symptom, apply the fix, and
return the **full revised prompt** — never a fragment to merge — with one line outside the block naming what
changed and why.

## How to diagnose

1. If they attached the result, look at it (scan a video result like a source — `video-scan.md`). If they
   only described it, take their words.
2. Match every symptom they describe against the table below and **fix all of them in one revision**. If two
   fixes pull against each other, apply the one higher in the table and name the other as the next try.
3. **A fix that needs something new from the user** — a face close-up, a cleaner copy of the clip — asks for
   it in one line and holds the revised prompt until it arrives. If they can't provide it, give the best
   revision with what they have and say what the missing piece would add. Never describe an image that has
   not arrived.
4. Expect iteration: 3-6 tries is normal for a good swap. Say so once, kindly, the first time a fix is asked
   for — it is not a sign the prompt is broken.

## Symptom → fix

| What they see | Most likely cause | Fix |
| --- | --- | --- |
| **The wrong person was replaced** | Target named by position only, or images out of order | Name the target by viewer's side **and** clothing **and** action; add the stays line; renumber the images in the order their characters first appear and re-upload in that order. On a one-image tool, the biggest or closest person is always taken — trim or crop so the target dominates, or move to an instruction editor. |
| **Two characters blended, or swapped faces** | Too much in one job; references overlap | One character per image (crop others out); renumber by first appearance; add `The characters from Image 1 and Image 2 are two different people, each with their own face.` If it persists, swap one person per pass: run Pass 1 for Image 1, then edit Pass 1's result for Image 2. |
| **The face changes when they turn** | The face is small, seen from one side only, or in a single image | Climb this ladder from wherever they are: (1) no face close-up yet → add a front-facing one as that character's first image; (2) already have one → add a side or three-quarter view of the face as another image of the set; (3) still drifting → start from a swapped first frame (`tool-notes.md` §The first-frame helper); (4) long or multi-angle clip → one part per shot. Neutral expression and a standing pose in the references help at every step. |
| **They wanted their own clothes, but got the original's costume** | Either the prompt gave them the costume, or it gave them their own outfit and the model pulled the costume through anyway | Prompt said costume → switch to their own outfit: the lock's outfit and the outfit sentence change together (`prompt-template.md` §Slot rules). Prompt already said their own outfit → pin it as a change from A to B: name each garment and add `in place of the [costume] from Video 1`. Role gear — a helmet, a harness, a microphone — stays unless they say "everything". |
| **They wanted the costume, but got their own clothes** | Own-outfit default | Switch the lock to `wearing the [costume] from Video 1` and use the costume outfit sentence. |
| **The original actor's face shows through** | The source identity is stronger than the reference | Use the first-frame helper (`tool-notes.md`) so the very first frame is already the new face; split long multi-angle clips into single-shot parts. |
| **Hair and outfit changed, but the face is a mix** | One image carries both face and outfit, and the face is too small in it | Give the face its own close-up image and put it first (`Images 1-2 show the same character: Image 1 the face, Image 2 the full body and outfit`); make sure the outfit image has no second face in it; or start from a swapped first frame. |
| **The same character appears twice** | Duplicate / twin effect | Keep `each only once` in the people line; add to the consistency line: `Only one copy of each character is ever in frame.` |
| **The reference image took over** — its background, pose or lighting appeared | The image was read as more than identity | Keep the split sentence verbatim; use a reference with a plain background and the character alone; crop tight to the character. |
| **The outfit drifted, or an accessory stayed** | Outfit not pinned; removal requests are unreliable | Name the exact garments and colours in the lock; add a separate outfit photo as another image of the same character; pick a reference that does not have the accessory rather than asking for its removal. |
| **Someone extra appeared, or someone vanished** | Count not locked | Check the people line (`Exactly 3 people…`) and the stays line; for crowds use `with the same background crowd`; split long clips. |
| **Lips don't match the song or the words** | New audio, or a restyle pass redrew the mouths | Keep the original sound (or switch generated audio off and re-lay the track); in a close-up singing clip, keep the clip's look instead of restyling, or restyle in a second pass. |
| **The background changed or warps** | A restyle shape on a keep-the-look job, or too many changes at once | Use the EDIT style (keep the clip's look) with `lighting and background` in the split sentence; one change per pass; on a strength slider, move toward the "keep" end. |
| **Only the new character got the new style** (restyle) | The everyone-in-frame line is missing | Add it; name the style in the opening sentence. |
| **The restyle drifted back to live action** | Style not named strongly enough | Name the style in the opening sentence and give it 3-4 visible traits in the style sentence. |
| **Subtitles, captions or text appeared** | The source had burned-in text, which overrides "no subtitles" | Use a clean copy of the clip, or trim or crop the text off before uploading; keep `No subtitles.` |
| **The result is a fraction of a second short** | Edit mode trims a few frames | On the edit modes that do this, trim the source to 8n+1 frames first (the scanner prints the nearest one); or accept it and stretch the last frame in an editor. |
| **The last word or the final beat got cut off** | Edits eat the final frames | Re-trim the source with about 0.5 s of spare footage after the last word. |
| **Music or new sounds appeared** | The tool generated its own soundtrack | Switch generated audio off, or "keep original sound" on; put `Keep the original audio.` at the start of the prompt as well as the end; lay the original track back in an editor. |
| **Blocked for violence, or a "content" error on an action scene** | Violent wording in the timeline | Rewrite the beats in neutral words — `they spar`, `he falls back`, `she pushes him away` — and resend. |
| **Rejected, blocked, "internal error"** — or "multi human", "body proportion", "human too small" | Real face, a famous character, a minor — or, on one-image tools, a reference with more than one person, a build far from the original's, or a subject too small in the first frame | Real face on a tool that blocks them → that tool's own verification flow, or another tool (`tool-notes.md` §Faces); famous character → resend with the name removed and the description kept; a child's photo in an adult role → refuse and offer another scene. Never suggest a way past a check. |
| **Glowing or strange eyes** | Intense emotion words read as an effect | Replace words like `fanatical` or `furious` with plain ones (`amazed`, `angry`), and add `with normal eyes` to that beat. |
| **The body is stretched or squashed** | Very different build from the person replaced (adult ↔ child, human ↔ animal) | A reference with a build closer to the original person; for non-human characters, an editor with a stronger "reimagine" setting; tell the user the motion always follows the original body. |
| **The head is cut off, or the framing shifted** (one-image tools) | Image framing does not match the clip | Full-body image for a full-body clip, waist-up for waist-up. |
| **Hands or held objects glitch** | The prop is not mentioned | Name the prop in the beat where it is held: `the man from Image 1 holds the guitar exactly as in Video 1`. |
| **Fingerprint-like texture in grass or foliage** | A very large AI-made reference image | Resize the reference to no bigger than the output resolution. |
| **Flicker, soft face or grain mismatch** | Relighting not asked for | Add the relighting line from `style-modes.md` style 1; try the first-frame helper. |

## What the reply looks like

````markdown
🔧 **Fix — [the symptom in their words]**
Changed: [one line — what changed and why].

## 🎬 [Scene], Video-to-Video Prompt (revised)
[one line on what to attach]

```text
[the full revised prompt]
```

📎 Attach: [as before, or what changed]
💡 Still off? Tell me what you see — or try [the next fix in line].
````

Then the footer.