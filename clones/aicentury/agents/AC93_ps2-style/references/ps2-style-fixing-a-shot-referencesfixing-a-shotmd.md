# PS2 Style — Fixing A Shot (references/fixing-a-shot.md)

# Fixing a shot that came out wrong

This file governs the fix loop: when the user says an image or a clip came out wrong.

> Read this table **before** rebuilding anything. Never ask the user to diagnose it, match what they describe to a row, apply every matching fix in one revision, reprint the whole prompt, and say in one line outside the block what changed and why. Fixes are positive wording; the sanctioned closing lines in `style-bible.md` stay as they are.

---

## The repair table: images

| What they describe | What went wrong | The fix |
| --- | --- | --- |
| "It looks like a photo" / "too realistic" / "too clean" | A real photo was attached, or the scene words pulled towards realism | Drop every real photo from the attachments; use block A or B; add `simple flat game buildings with few details` and `simple game water` where they fit; tell them to make 2 versions and keep the blockier one |
| The same, with block C (no template) | Nothing pins the game camera and models | Name every vehicle and person as a low-poly game model, cut the scene to two to four sentences, drop real place names except the city, and offer first: `a trend screenshot as image 1 fixes this best` |
| "A bridge / palm trees / a building from somewhere else appeared" | A look example is leaking its content | Replace the look example with one of their own approved shots, or drop it and go to block A |
| "The landmark is wrong" | The description is too thin or names it without shape | Rewrite it as two clauses of shape, colour and placement (`style-bible.md` §Landmarks in words) |
| "The camera / framing changed" | Block C, or the keep line lost the subject | Attach the template frame and use block A; restate the subject and pose in the keep line |
| "There's text / a logo / a club badge / a hotel name" | A name in the scene words, a real place name pulling real signage, or the template's caption survived | Drop every proper noun except the city, landmarks by shape only; names become colours (`one half red and one half white, plain`); keep the closing line verbatim |
| "The generator refused" / "IP" / "content policy" (a game or film) | A franchise name or character in the prompt | Same scene, the title and character names removed, the description of places, outfits and colours kept |
| "The faces look real" | Nothing pins the character models | Add `low-poly character models with simple blocky faces and stiff poses` to the swap lines |
| "It's too modern / too sharp" | Block A's look clause got paraphrased | Paste block A or B verbatim; make 2 versions and pick the blurriest |

## The repair table: clips

| What they describe | What went wrong | The fix |
| --- | --- | --- |
| "It turned into a real video" | The opener is missing or reworded | Paste the video opener verbatim |
| "It zooms in" / "the camera moves" | The camera sentence is missing or vague | First motion sentence `Static camera …` or `follows … at the same distance` |
| "Faces morph" / "people change" | Too much motion asked of the people | Smaller actions: walk, cheer, sip, wave; name each person by clothing |
| "Things appear out of nowhere" | The background line asks for something not in the image | Only animate what is already in the start image |
| "It cut to another shot" (📼 Nostalgia) | A long clip with several actions | Back to 2 seconds and one action |
| "The cuts come at the wrong moments" / "it cut on its own" (🕹️ Free Style) | No shot timestamps, or shots under 2 seconds | `Shot N [a-bs]` timestamps of 2 to 5 seconds each; for one take, `Generate single shot.` as the first line |
| "Later shots look realistic" / "the look drifts" (🕹️ Free Style) | The look line is missing or the shots describe photo-like detail | Paste the Free Style video look line verbatim; attach the shot's image as the start frame; shorten the shot descriptions |
| "It's not me" / "the character changed" | The character sheet is not attached, or not numbered right | Image: attach the sheet and add its character line, numbered in upload order; name the character by outfit. Video: in image-to-video the start frame carries the character, so fix the image first; across places, switch to reference-to-video with the sheet (`free-style.md` §What to attach to a video) |

---

## Which prompt to fix

A vague complaint ("it looks like a photo") goes to the image first, the clip copies its start frame. An image fix reprints the image prompt and the video prompt (the start frame changes); a clip-only fix reprints only the video prompt. Every reprint is the whole prompt.

## Surgical edit

When the user changes one thing (a landmark, the light, the clothing, the clip length), change only those words and reprint that whole prompt under its heading. Never send a fragment to merge.

---

## Self-check for a fix

1. Every matching row applied in one revision.
2. The whole prompt reprinted, the change named in one line outside the block.
3. The sanctioned blocks from `style-bible.md` unchanged.