# Cast Swap — Video Scan (references/video-scan.md)

# Step 1 — Scanning the video

The scan is the foundation of the prompt. Every person, cut and timestamp the prompt names must come
from here — so the scan has to be done for real, and honestly.

---

## The honesty ladder — use the highest rung you actually have

| Rung | You can… | Do this | Timestamp precision |
| --- | --- | --- | --- |
| **1 · Watch** | open the video file natively, sound included | Watch the whole clip. Then still run rung 2 if you can run code — native viewing samples about one frame a second and can miss fast cuts. | about ±1 s on its own |
| **2 · Measure** | run Python in a sandbox | Run `scripts/scan_video.py` (below) and look at every contact sheet it writes. | cuts ±0.1 s, tiles ±0.05 s, things between tiles ±0.5-1 s |
| **3 · Ask** | neither | Say so plainly, then ask for the facts below. | whatever the user gives |

Which rung an assistant is on (checked October 2026 — trust what you can actually do over this table):

| Assistant | Rung |
| --- | --- |
| Gemini (app, AI Studio, API) | **1** — watches uploaded video with its sound; then 2 if code is available |
| ChatGPT | **2** — it accepts video files, but OpenAI says its own analysis may skip parts and misread the audio, so measure with the script |
| Claude | **2** — no video input of its own; the code sandbox reads the file |
| Copilot, Perplexity, Mistral and other assistants without video or code | **3** — or suggest the user runs this skill in Gemini |

**Sound is the honesty trap.** The scanner only says *whether* there is a sound track. Unless you actually
heard it (rung 1) or the user told you, never claim music, singing or speech — write
`🔊 sound track: yes (I can't hear it — tell me if someone sings or talks)`.

**Rung 3 wording** — never skip the first sentence:

```
⚠️ I can't play video files here, so I won't guess what's in it. Send me:
1. The exact length (e.g. 0:10)
2. A screenshot at the start, at every cut, and at the end — 4-8 screenshots is perfect
3. One line on what happens (e.g. "two people dance, then the guy spins her at 0:06")
```

Build the roster and the timeline from the screenshots and the user's line, and mark the timestamps in
the Scan Report as `(from your screenshots)`.

**Never** describe a video from its file name, title, link, thumbnail or your memory of a famous scene.
A famous film clip still gets scanned — the user's cut of it is not the version you remember.

---

## Running the scanner (rung 2)

`scripts/scan_video.py` ships with this skill. If your environment has the skill's files, run it from
there. If you only have the skill as text, the scanner is supplied as its own document (`scan_video.py`) —
save it to a file in your sandbox and run that.

```bash
python3 scripts/scan_video.py --check                                       # which video readers exist here
python3 scripts/scan_video.py "your-clip.mp4" --out "scan-output" --grab 0,segments
# the user's tool takes 10 s per job? add  --max-seg 10   (the default plans parts of up to 15 s)
```

`--grab` takes one comma list — `0` saves the first frame (for the first-frame helper), `segments` the first
and last frame of every planned part. Add any extra moments to the same list: `--grab 0,segments,6.5`.

It prints:

- **the facts** — `duration` (the video stream's length — **this is the clip's length**; the container
  figure next to it can include audio padding), frame count, frame rate, size, rotation, sound track yes/no;
- **the hard cuts** with timestamps and a confidence (`low` = same layout, probably a lighting change or an
  overlay — confirm on the cuts sheet), and possible soft transitions (`soft?`) and black gaps (`dark`) —
  hypotheses, not facts;
- **`prompt`** — the hard cuts already rounded to whole-second beats (`[0s-4s] [4s-10s]`), and when the clip
  has soft transitions or black gaps, a second line with those added as scene changes;
- **`edit trim`** — the 8n+1 frame count for edit modes that need it (`tool-notes.md` §Settings);
- **`segments`** — the planned parts (balanced, cut at scene changes, 4 s or longer) and each part's local
  whole-second beats; one part means the clip fits in one job;
- **the sheets and stills** — `timeline_NN.jpg`, `shots_NN.jpg`, `cuts_NN.jpg`, `soft_NN.jpg`, and
  `frames/`.

**Look before you write — in this order:** the timeline sheets in order (tiles labelled `M:SS.s` and the shot
number; a red CUT tag means a new shot began since the previous tile), then the shots sheets (count the
people in each shot here), then the cuts sheets (keep or reject each cut), then the soft sheets — four frames
across each possible transition: **a new place by the last frame = a scene change** (a dissolve, wipe or
zoom-blur into another shot, which counts as a shot); **the same place = a camera move** inside the shot. The
numbers tell you *when*; only the frames tell you *who* and *what*. Crowded shot? Grab a full-size frame.
**When most of the picture is replaced, it is a scene change** — even if part of the frame stays (a window
frame, a passenger in the foreground, a dashboard): a view through a train window that wipes from a canyon to
a castle is two scenes. It is one continuous take only when nothing in the picture is swapped out.

**If no reader is found**, run `pip install imageio-ffmpeg` (it brings its own video reader) and run the
script again. If installing is not possible, drop to rung 3 — never guess.

**File size:** Claude's sandbox takes files up to 30 MB, ChatGPT's 512 MB, the Gemini app 2 GB. A rejected
upload → ask for a shorter trim or a 720p export.

---

## What the scan extracts

1. **Facts** — duration to 0.1 s, frame rate, orientation (vertical / horizontal / square — a fact for the
   user, never written into the prompt), sound: music, singing, speech, effects, or silent.
2. **Shots** — every hard cut with its timestamp, every confirmed scene change by dissolve, wipe or
   zoom-blur, and what each shot is: framing (wide, medium, close-up), camera behaviour (locked off,
   handheld, push in, pan, orbit), who is in it. No changes at all → `one continuous take`; scenes joined
   only by transitions → say so: `7 scenes joined by black wipes, no hard cuts`.
3. **The roster** — every person, labelled `P1`, `P2`… per `casting.md` §The roster: handle, screen
   time, what they do. Crowds as one line.
4. **The timeline** — beats with timestamps. A new beat starts at every cut and at every real change of
   action (someone enters or leaves, a turn, a jump, a kiss, a hit, the chorus starts). Each beat says
   who is visible, where each one is in frame, and what they do.
5. **The look** — setting, light (direction, time of day, colour), and the medium: live action,
   anime, 3D animation, cartoon, game footage, AI-generated.
6. **Things that will cause trouble** — overlaid captions or title text (tools copy them, and they
   override "no subtitles" — the prompt can ask to remove them); a creator's watermark or channel logo
   (tools copy or smear it — mention it, never offer to remove it); very fast motion; a face hidden for most
   of the clip; two people dressed alike; people crossing in front of each other; a cut mid-action; a final
   shot under a second (edits tend to eat the last frames).

---

## Timeline rules

- In the Scan Report, timestamps are written `0:00.0-0:03.2` — minutes, seconds, one decimal, ASCII hyphen.
  (The prompt itself uses whole seconds, `[0s-3s]` — `prompt-template.md` §Timestamps.)
- The first beat starts at `0:00.0`; each beat starts where the last ended; the last ends at the exact
  duration. No gaps, no overlaps.
- **Every hard cut is a beat boundary.** Inside a long shot, add a boundary at each real change of
  action. Rough guide: 3-6 beats for 10 s, 4-8 for 15 s, 6-12 for 30 s. Never a beat under 0.5 s unless a
  cut forces it.
- Say what is measured and what is estimated. Cuts measured by the scanner are exact; action changes
  read from contact sheets are ±0.5 s — mark those with `~` (`~0:06.5`). Never print more precision than
  you have.

---

## The Scan Report

Print it in this shape, then the "who should be replaced?" menu from `casting.md`.

```
🔍 **Scan Report**

⏱️ **10.0 s** · 30 fps · vertical · 🔊 sound track: yes (I can't hear it — tell me if someone sings or talks)
🎞️ **3 shots** — cuts at 0:03.2 and 0:06.8
📍 Night street, wet asphalt, pink and teal neon light from the right · live action

👥 **3 people**
| | Who | On screen | Doing |
|---|---|---|---|
| P1 | woman in the red dress, centre | 0:00.0-0:10.0 | sings, walks toward camera, spins at 0:07 |
| P2 | man in the black leather jacket, right | 0:00.0-0:06.8 | plays guitar, leaves frame right |
| P3 | drummer, background left | 0:03.2-0:10.0 | drums, mostly out of focus |

🕒 **What happens**
1 · 0:00.0-0:03.2 — wide: P1 walks toward camera singing, P2 plays guitar on the right
2 · 0:03.2-0:06.8 — medium: P1 sings to camera, P2 steps out of frame right, P3 drums behind
3 · 0:06.8-0:10.0 — close-up: P1 spins once and ends looking into the lens

⚠️ White title text overlaid 0:00-0:02 — video tools copy it; the prompt will ask to remove it.
📝 If this isn't your own footage: fan edits for personal use are the norm; publishing is your call.
```

Keep the report to what the user needs to choose — one screen, not an essay. The detail goes into the
prompt.