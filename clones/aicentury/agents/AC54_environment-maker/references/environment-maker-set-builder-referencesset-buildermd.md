# Environment Maker — Set Builder (references/set-builder.md)

# Step 3 — Building the five sets

This file governs every build: how one place becomes five connected sets, the JSON master
template, the field rules, the follow-ups, the length budget and the self-check. Read it before
every build and every follow-up that produces sets.

> Read `style-bible.md` alongside this file — its locked blocks (match, empty, extras, the world
> line, the negative line, chain, placement) go into the sets word for word — and
> `style-library.md` for the chosen style's block.

---

## Expanding the place

Think like a world builder, not a shot planner. One place becomes five connected locations that
belong to the same story world.

1. **Set 1 is the clearest direct match** to what the user asked for — the place itself, seen the
   way most people picture it.
2. **Sets 2-5 are related locations from the same world.** Pick four different ones from this
   list:

| Kind | Example for a football stadium |
| --- | --- |
| Entrance or exterior approach | the stadium gates and the forecourt |
| Hallway, tunnel or corridor | the tunnel to the pitch |
| Backstage or support area | the dressing room |
| Side area or nearby place | the training pitch beside the stadium |
| Elevated overview | the view from the top tier |
| Interior variation | the press room, the VIP lounge |
| Detail-rich spot | the dugout, the trophy cabinet |
| Mood variation of the same place | only when the user asks for one — the one set allowed its own world line |

3. **Never five nearly identical compositions.** Each set must earn its place: a scene
   transition, a story beat, or a spot to put a character.
4. **At least three of the five are standable** — `establishing_wide`, `wide` or `medium`, from
   `eye_level`, `low_angle`, `high_angle`, `pov` or `over_the_shoulder`, with an open spot where a
   character could stand. The others may be overviews (`top_view`), details or atmosphere.
5. **Plan before writing.** Fix the five places and give each its angle, framing and lens first;
   that plan is the Map printed above the blocks.

Football stadium, planned:

```
1 · 🏟️ Main pitch from the touchline — establishing_wide · eye_level · 24 mm
2 · 🚪 Stadium gates and forecourt — wide · low_angle · 18 mm
3 · 🔦 Tunnel to the pitch — medium · eye_level · 35 mm
4 · 👕 Home dressing room — wide · high_angle · 24 mm
5 · 🌿 Training pitch from above — establishing_wide · top_view · 35 mm
```

---

## The master template

One standalone JSON object per set, exactly these ten keys in this order. Every value is a
string. Never one big object with a list of sets.

```text
{
  "background_name": "[Set name]",
  "camera_angle": "[one value from the angle list]",
  "framing": "[one value from the framing list]",
  "lens_mm": "[digits only]",
  "environment": "[the place in a few words]",
  "scene_purpose": "[the role this set plays in the world or the story]",
  "location_cues": "[the concrete things that make this spot this place]",
  "lighting": "[a short light note, taken from the world line]",
  "prompt_text": "[LOOK BLOCK] [SET SENTENCE] [WORLD LINE] [CAMERA SENTENCE] [LAYOUT SENTENCE] [ROOM SENTENCE] [EMPTY BLOCK or EXTRAS BLOCK]",
  "negative_prompt": "[the negative line from style-bible.md]"
}
```

### Field rules

| Key | Fill with | Rule |
| --- | --- | --- |
| `background_name` | A specific name: `Tunnel to the pitch` | Never generic (`Background 3`, `Interior`) |
| `camera_angle` | `eye_level` · `low_angle` · `high_angle` · `top_view` · `dutch_angle` · `over_the_shoulder` · `pov` | One value, exactly as written |
| `framing` | `establishing_wide` · `wide` · `medium` · `medium_close_up` · `close_up` · `extreme_close_up` · `insert_detail` | One value, exactly as written |
| `lens_mm` | A real focal length: `"18"`, `"24"`, `"35"`, `"50"`, `"85"`, `"100"` | Digits only, in quotes |
| `environment` | Short and clear: `stadium tunnel` | A few words |
| `scene_purpose` | The moment, through the place: `the threshold between the dressing room and the pitch` | One clause, no people |
| `location_cues` | Concrete, pointable things: `bare concrete walls, painted deep red stripe, studded rubber floor, bright opening at the far end` | Matches the request and the world |
| `lighting` | A short note taken from the world line: `low white sunlight from the left, cool floodlight spill` | Never a second, different light |
| `prompt_text` | The full prompt — built below | The part the user pastes |
| `negative_prompt` | The negative line from `style-bible.md`, verbatim | Short and practical |

### Building `prompt_text` — one paragraph, in this order

1. **The look block** — the match block (match) or the chosen style's block (a style from the
   list), verbatim. Every look block starts with `Create`, so the paragraph opens with a creation
   verb and the medium comes first. In a chained set, follow `style-bible.md` §The chain blocks.
2. **The set sentence** — `It shows the empty` and what this spot is, with two to four of its
   `location_cues`: `It shows the empty tunnel leading out to the pitch, with bare concrete walls, a painted deep red stripe and a studded rubber floor.`
   A close-up or detail set puts `empty` on the room, not the object: `In the empty kitchen, it
   shows the back stove with three dented stockpots.` A set with extras opens `It shows the`.
3. **The world line** — from `style-bible.md`, identical in all five sets (a requested
   mood-variation set excepted).
4. **The camera sentence** — the angle and framing in plain words (table below) and the lens:
   `Seen from eye level as a wide shot with a 24 mm lens.` Isometric Miniature leaves the lens out.
5. **The layout sentence** — near, middle and far, so the set has depth, ending `in sharp focus
   throughout`. Miniature Tilt-Shift always keeps its own focus band instead; a close-up or detail
   set may let what is behind the detail fall soft. A `top_view` set reads as one plane: `laid out as
   one flat plane, in sharp focus throughout` (Tilt-Shift keeps its band here too).
6. **The room sentence** — for a standable set, where the open spot is:
   `An open stretch of floor in the centre foreground stays clear and catches the main light.`
   Leave it out of overviews and detail sets.
7. **The empty block** — or, when the user asked for people, the extras block.

Plain sentences only — no headings, lists or line breaks inside the string. Short and positive:
describe what the set IS. It must work when pasted on its own.

**Signs, boards, screens and banners** are named as plain shapes and colour — `a plain dark
wooden panel`, `a dark scoreboard`, `plain deep red banners` — never with words on them, and
without nouns that imply writing (`menu`, `ticket`, `sign`, `poster`, `notice`) where a shape
word will do. Never put a board, panel or plaque where a sign would hang — over a shop door, on a
fascia, at an entrance — put a non-sign object there (`a carved oak lintel with a sprig of holly`).
Books have `plain cloth spines`.

**The other nine fields stay short, visual and neutral** — no instructions, no tool names, and in
an empty set no people-calling word (`style-bible.md` §People-calling words). Weather words appear
only in the world line and `lighting`.

### Angle and framing in plain words

| Value | Words in `prompt_text` |
| --- | --- |
| `eye_level` | seen from eye level |
| `low_angle` | seen from a low angle looking up |
| `high_angle` | seen from a high angle looking down |
| `top_view` | seen from directly above |
| `dutch_angle` | seen with the camera tilted to one side |
| `over_the_shoulder` | seen past a doorframe edge or a railing in the near foreground |
| `pov` | seen from standing head height, looking straight ahead along the space |
| `establishing_wide` | as an establishing wide shot of the whole place |
| `wide` | as a wide shot |
| `medium` | as a medium shot |
| `medium_close_up` | as a medium close-up |
| `close_up` | as a close-up of [the detail] |
| `extreme_close_up` | as an extreme close-up of [the detail] |
| `insert_detail` | as an insert detail of [the object] |

---

## Variety rules

- No two sets share the same `camera_angle` and `framing` pair.
- The five use at least three different framings and at least three different angles.
- Lenses follow the framing: wide sets 18-35, medium sets 35-50, close and detail sets 50-100.
- Set 1 is standable, at eye level or slightly low, so it works as the main plate.
- Each set has its own story purpose; two sets never do the same job.
- **Miniature Tilt-Shift and Isometric Miniature** look down on a small world: Tilt-Shift sets use
  `high_angle` or `top_view`, Isometric sets use `high_angle` only. Vary framing and lens instead
  (Tilt-Shift keeps its focus band in every set); the angle rules above and set 1's eye level do
  not apply, and the room sentence names an open patch of ground at miniature scale.

---

## Extras

Only when the user asks for people, a crowd, an audience or life in the scene. Keep the same five
places and cameras, swap the empty block for the extras block, fill `[EXTRAS]` per set and switch
to the extras negative line (`style-bible.md`). The people stay small and secondary, the open spot
stays clear, and the place stays the subject. A set built around a crowd ("a packed stadium") may
fill the stands, never the open spot.

---

## Follow-ups

- **More for the same place** → five new sets from the same world, none repeating a set already
  given in this chat; one of them may be a new angle on the main place.
- **Set numbers keep counting through the chat.** The first build is sets 1-5, the next 6-10, then
  11-15 — in the map and the headings — so "set 7" always means one set. A More build is titled
  `5 more movie sets`.
- **A new place** → five new sets in the same look.
- **A mood change** → the same five places and cameras, a new world line, new `lighting` values.
- **Extras** → §Extras.
- **One set changed** → rewrite that set only, keep the look block and the world line, reprint it
  in full; the other four stay as they are.
- **🔗 Chain the set** → the other four sets of the latest build again with the chain block
  (`style-bible.md` §The chain blocks), `[reference set name]` filled with its first set's
  `background_name` in lower case, and the chained attach line from `tool-notes.md`. The first set
  is not reprinted. After a mood change, the chain uses the latest world line.
- **🧍 Put my character in** → one placement prompt from `style-bible.md` §The placement prompt,
  under the heading `## 🧍 [character in a few words] in set [N], Image-Edit Prompt`, with its
  attach line. The exact spot comes from that set's room sentence.

---

## Length budget

- Aim for a `prompt_text` of 700-1,400 characters; match mode and chained sets may run to about
  1,550.
- **Hard limit: every JSON object under 2,200 characters**, counted as printed in its block.
- Over budget, trim in this order: (1) the layout sentence to one clause; (2) the set sentence to
  two cues; (3) `location_cues` to four items. Never cut the look block, the world line, the room
  sentence or the empty block.

---

## Self-check for the sets

1. Each object is valid JSON with exactly the ten keys in the template order, every value a
   string, and under 2,200 characters.
2. In a full build: the first set is standable (and, in the first build for a place, the direct
   match), at least three of the five
   are standable, no angle-and-framing pair repeats, and the five use at least three framings and
   three angles — except for Miniature Tilt-Shift and Isometric Miniature (§Variety rules).
3. Every `prompt_text` is one paragraph in the seven-part order, opening with `Create`, with the
   look block, the world line (a requested mood-variation set has its own) and the empty (or
   extras) block word for word.
4. No set describes the uploaded character; no set asks for lettering, logos or brand names; signs
   and screens are plain shapes and nothing sits where a sign would hang; in an empty set, no field holds a people-calling word.
5. `over_the_shoulder` and `pov` sets name a doorframe, a railing or head height — never a body.

---

## What comes next

Offer, do not ask:

```
💡 Next
1. [emoji] Five more places in this world — [two examples]
2. 🔗 Chain the set — render set [N] first, and I'll tie the other four to it so all five read as one place
3. 🧍 Put my character in — a prompt that places your character into the set you pick
```

Swap in `The same five sets at [another time or weather]`, `Add [extras that fit the place]`, a
tool tip from `tool-notes.md` or a style note from `style-library.md` when they fit the chat
better. Don't offer again what the user just took — except more places, which can always come
again.