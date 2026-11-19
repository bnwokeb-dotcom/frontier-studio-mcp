# Mini Kittens — Fixing A Reel

# Fixing a reel

When the user says it came out wrong, read this table **before** rebuilding anything. Never ask them to
diagnose it — match what they describe to a row, apply the fix, reprint the whole prompt.

> The fixes are **positive wording**. Naming a thing in a negative hands the model the token, so the
> guard says what the frame *does* contain. Negatives are backup, never the primary fix.

---

## The repair table

| What they describe | What actually went wrong | The fix |
|---|---|---|
| "They look like big cats" / "not kittens" | The mini rule was diluted or the scale anchor was missing | Reinstate the mini rule verbatim and add a scale anchor measured against a nameable object in frame. Put both in the first third of the prompt, not the tail. |
| "The kittens are standing like people" | The upright stance was written without anatomy | Keep the upright stance but add the anatomy clause: short hind legs, round belly, hind paws flat on the surface, tail lowered as a counterweight, front paws loose in front of the chest. |
| "One kitten is missing" / "there's a gap" | Cluster prompts under-supply above ~4 subjects | State the count as a number AND add the **Empty slots** block from `style-bible.md` §Drift guards verbatim — that block is the single authority for this wording, so never write your own version of it. |
| "There are too many kittens" | The count set a floor with no ceiling | Cap it: exactly [N] kittens and no more. "All five" or "the whole group" invites over-supply — name the number and check it in QC. |
| "The coats changed between shots" | The cast block was summarised instead of pasted | Write the cast out coat by coat in every shot, plus: each kitten keeps the same coat, markings and eye colour in every shot. |
| "It looks like CGI / a plush toy" | The fur and capture detail lost out to the situation description | Restore the fur micro-detail sentence and the capture sentence. Add: real animal fur photographed under real light. Cut any word that implies render, model, toy or figurine. |
| "It looks like a cartoon" | A style word imported a medium | Grep the prompt for adjectives that carry a medium — illustration, storybook, Pixar, anime, painterly — and remove them. Keep the function, rename it: *soft warm light*, not *storybook light*. |
| "The paws are melted / wrong" | Too many small extremities in one frame | Fewer kittens per frame, or move the reaching paw to the front of the group where it has room. Add the paw guard from `style-bible.md` verbatim: soft toes clearly separated, pink pads, tiny translucent claws, exactly two front legs each joining a visible shoulder. Never give a toe count — it is the human-hand wording and it pulls the paw toward a hand. |
| "The tool/prop doesn't touch them" | Two objects described separately, never in relation | State what each object DOES relative to the other: the paw presses into the rim, the bouquet rests against the chest. Contact must be an action, not a position. |
| "The background people are blurry" / "the kittens look pasted in" | The generator keyed the subjects separately from the plate, so they carry a different key and a different detail level | Add the relighting clause from `style-bible.md` §Drift guards → Relighting mismatch: same light, same direction, same shadow band, same grain and edge softness. A *fractionally* soft far background is correct and stays — the style block asks for it. |
| "Nothing moves" / "it's a slideshow" | Beats described states instead of transitions | Every beat must state where the action ENDS, and the next beat must start from that state. Add one physical verb per beat. |
| "The camera swoops around" | A move word crept in | Phone-camera motion only: locked off with a faint handheld drift, or one slow push. Remove crane, orbit, dolly, sweep, whip. |
| "The storyboard frames don't look like the same scene" | Each frame was generated independently from text, so the set, light and kitten positions were re-rolled every time | Chain them: generate frame 1, then attach it as the reference for frame 2, and so on. Frame 1 carries the full block; frames 2 and on carry only a reference line, the action and the negatives — see `storyboard.md` §Frames are chained. |
| "The video jumps" / "it doesn't flow" | The build was cut into shots when it should have been one take, usually with `HARD CUT` between beats that share a framing | Rebuild as a continuous take: the beats keep their timecodes but lose the `SHOT n` labels and the cuts, and connectives carry the action across. A cut to an identical framing is not a cut — see `video-prompt.md` §One continuous take is the default. |
| "The cuts feel wrong" / "it changed location" | The set was allowed to drift | One set per build. Restate the set in every shot and add: the room, the surface, the props and the light do not change. |
| "The last shot doesn't land" | No payoff beat | Give the final beat eyes to camera, the prop resolved, or one kitten blissed out with its eyes shut — and the longest duration in the build. |
| "There's a phone status bar / a date stamp / black bars" / "it looks like a screenshot" | The prompt named a phone, so the model drew the phone | Strip every device name from the prompt body and add the edge-to-edge line from `style-bible.md` §Drift guards → The phone renders itself. The handheld look comes from the style block's behaviour wording, never from naming the camera. |
| "Text appeared on screen" | Something implied stamped-on lettering | Re-add the negatives line from `style-bible.md` §Negatives verbatim, and check nothing asks for a caption, title, label or name tag *over* the picture. Leave the scene's real print alone — packaging, badges, menu boards and signs are realism and often the scale ruler. |
| "It's the wrong length" | Timecodes were not re-added | Re-derive from the canonical map in `video-prompt.md`, re-add, confirm the total. |

---

## Splitting a long prompt

If their generator caps below the chosen duration, reprint the same build as chunks — each chunk a
complete prompt with its own style block, cast block and recomputed timecodes starting at `0:00.0`,
cutting on the same beats. Say which shots are in which chunk. Never hand over a fragment that is
missing the style or cast block.

---

## Surgical edit

When they name one shot and what should change: rewrite only that shot, then re-run the timecode,
continuity and count checks — re-add to the chosen duration, keep the set and cast fixed, keep adjacent
camera positions from repeating silently. **Reprint the whole prompt**, never a fragment.