# Environment Maker — Fixing A Set (references/fixing-a-set.md)

# Fixing a set that came out wrong

When the user says a set came out wrong, read this table **before** rebuilding anything. Never ask
them to diagnose it — match what they describe to a row, apply every matching fix in one revision,
and reprint every set the fix touches in full, with one line outside the blocks naming what
changed and why.

> The fixes are **positive wording**. Naming a thing in a negative hands the model the token.
> Fix the set, not the look: the look block and the world line stay word for word unless the row
> says otherwise, so the fixed set still belongs to the other four.

---

## A complaint with no symptom

"It came out wrong", "it's bad", with nothing about what or where: ask once, with quick picks and
a default, then fix.

```
🔧 **What's off, and in which set?**
1️⃣ 🧍 Someone appeared in it
2️⃣ 🔤 Garbled writing
3️⃣ 🎨 Wrong look or not one world
4️⃣ 📐 Warped, blurry or no room to stand

Type a number and the set — or say "all" and I'll tighten all five against the commonest problems.

✨ Create these images and videos on [OpenArt](https://openart.ai/home?via=virgil)
🎙 Add optional voice-overs with [ElevenLabs](https://try.elevenlabs.io/jvbqccfz0mv9)
📚 More viral agent skills like this one → [Agent Skills Library](https://aicenturies.com/agent-skills-library/)
```

"All" → apply the rows for people, lettering and warping to every set in the last build and
reprint them (right after a chain, that is the four chained sets; the reference set is the user's
own render).

---

## The repair table

| What they describe | What actually went wrong | The fix |
| --- | --- | --- |
| "There's a person in it" (an empty set) | A people-calling word in a field, or a "still"/"movie" word without the empty block | Remove every people-calling word from all ten fields (`style-bible.md` §People-calling words); check the empty block is there word for word |
| "There's a person in the open spot" (a set with extras) | `[EXTRAS]` placed people where the room sentence keeps clear | Keep the extras the user asked for; move them to a named far area (`in the distant stands`) and repeat the open spot in the room sentence |
| "My character showed up in the set" (match mode) | The tool used the attached character as content, not as style | One tip line: use a tool with a style-reference slot (`tool-notes.md`). Still there → reprint all five for use **without** the image: the match block becomes `Create a new image of an empty place in this look: [LOOK IN WORDS].`, everything else stays, and the attach line becomes `📎 Attach: nothing — each set stands alone.` |
| "It doesn't look like my character's style" | The image was left off, or `[LOOK IN WORDS]` is too vague | One line: attach the character image to every set. Sharpen `[LOOK IN WORDS]` — medium first, then edges, shading and colour treatment — and reprint all five |
| "It looks too much like my character" — outlines, hard cel shadows on the walls | `[LOOK IN WORDS]` described the character side of the look | Rewrite `[LOOK IN WORDS]` as the painted background side: softer edges, less outline, lower contrast in the distance |
| "It copied my photo's white studio" / "the colours are my jacket's" | `[LOOK IN WORDS]` or the world line took the studio light or the costume colours | `[LOOK IN WORDS]` names realism, grade and grain only — never light; the world line gives the place its own light and palette (`style-bible.md` §The world line) |
| "The five sets don't feel like one world" | Different tools, a changed world line, or nothing tying the rooms together | Same tool for all five; the world line word for word with its shared materials (a requested mood-variation set excepted); if set 1 is rendered, apply `🔗 Chain the set` now — otherwise offer it |
| "They all look the same" | Angles and framings too close | Re-plan with `set-builder.md` §Variety rules — a new kind of location and a new angle for each set that repeats |
| "The chained sets copy set 1" | The chain block pulled set 1's composition into sets 2-5 | Keep the chain block; give each of sets 2-5 a location kind and an angle further from set 1, and name in its set sentence what is new there |
| "There's no room to put my character" | Close framing, a high or tilted angle, or a cluttered foreground | Wide or medium framing at eye level (`high_angle` for the two miniature styles), the room sentence naming the open spot, and the foreground objects moved to the sides |
| "Garbled writing on signs, banners or screens" | Signs and screens invite lettering — and so do the nouns `menu`, `ticket`, `sign`, `poster` | If the object sits where a sign would hang (over a door, on a fascia, at an entrance), replace it with a non-sign object (`a carved oak lintel`) — first time and every time. Otherwise, first time: name it as a plain shape and colour (`plain deep red banners`, `dark screens`); already plain and still lettered: drop the noun that implies writing (`menu board` → `a plain dark wooden panel`). Offer the same fix for sibling sets that carry the same object |
| "The building is warped" / "things float" | Too many objects or two competing perspectives | Fewer named objects; one clear vanishing direction in the layout sentence (`the corridor runs straight away from the camera`) |
| "It's blurry behind" | The lens or framing read as portrait-style | A wider lens, and `in sharp focus throughout` in the layout sentence (Miniature Tilt-Shift keeps its focus band — say so) |
| "It came out as a book, a box or a model on a table" | An object word in the look (`page`, `diorama`, `in a box`) | Swap it for `world` or `set` (`style-library.md` §Words that misfire in a style) |
| "The night looks like afternoon" | The world line is too mild | Strengthen it: `deep night with no daylight outside, moonlight from high on the left` |
| "The anime, 2D or 3D look turned into a photo" | The tool's photo default won | Keep the style block first; for a 3D style without it, add `not photorealistic` straight after the medium; suggest a tool that favours stylised looks (`tool-notes.md`) |
| "Wrong place" / "that's not what I meant" | The set sentence missed the user's idea | Rewrite set 1 from the user's own words and adjust the four related sets to match |

---

## Rewriting one set

Rewrite only the set the user names. Keep its look block, the world line and the negative line;
change only what the row says; re-run `set-builder.md` §Self-check for the sets; reprint it in full
under its heading. The other four stay as they are and are not reprinted.

## Rewriting all five

When the fix touches the look block, `[LOOK IN WORDS]` or the world line, all five change: reprint
the map and all five sets.

---

## Self-check for a fix

1. Every matching row applied in one revision.
2. Every touched set reprinted whole, never a fragment.
3. One line outside the blocks names what changed and why (a tip, if any, goes on the same line).
4. The look block and the world line are still identical across the five (a requested
   mood-variation set excepted), unless the fix rewrote them in all five.