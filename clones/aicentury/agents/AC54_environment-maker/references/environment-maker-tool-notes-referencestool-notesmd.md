# Environment Maker — Tool Notes (references/tool-notes.md)

# Tool notes — what the user's image tools need

This file governs the `📎 Attach` and paste lines printed after the sets, the tool-fit advice in
💡 Next, and the answers to "which tool should I use?".

> **Snapshot: researched 2026-10-12** from Google's Gemini API and Cloud docs, the OpenAI image
> prompting guide, BytePlus' Seedream docs, the OpenArt and Higgsfield model forms, creator guides
> and Reddit (`assets/research/01 Environment Plates on Nano Banana.md`, not shipped). Tools change
> fast: if the user's own screen shows something different, believe their screen and say so.
> Tool names appear only in these lines and in answers — never inside a set prompt.

---

## What each tool accepts

| Tool | Reference images | Negative-prompt field | Notes |
| --- | --- | --- | --- |
| Nano Banana Pro | up to 6 object, 5 character and **3 style** references | none | The only one with a documented style-reference slot — the best fit for 🎯 Match my character. Earthier, more muted colour |
| Nano Banana 2 / 2.1 | up to 10 object and 4 character references; no style slot listed | none | Faster and cheaper; darker, richer, more vivid colour. 2.1 is the newer version |
| GPT Image | reference images for edits and style | none | Reads JSON-like prompts fine; may refuse a living artist's style |
| Seedream | several reference images | none | Strong at anime and 2D looks; its "set" mode makes several coherent images in one go; best with prompts under about 600 words |

- **No tool has a negative-prompt field.** The `negative_prompt` key keeps the JSON format; the
  empty block inside `prompt_text` does that job.
- **Paste `prompt_text` only.** A pasted JSON block is read whole — every value, the negative list
  included, which then reads as a request for people and text. Pasting the whole block is
  untested; the other fields still stay short, visual and free of people-calling words in case
  someone does (`style-bible.md`).
- **The image size is set in the tool**, never in the prompt. When an image is attached, some
  tools copy the size of the last attached image — set it on purpose.
- **One tool for all five sets.** Different models give the same world different colour.

---

## The lines printed after the sets

**Paste line — every build:**

```
📋 Paste: only the prompt_text of each set into your image tool — the other fields are notes for you.
```

**Attach line — match mode:**

```
📎 Attach: your character image (or images) to every set, as a style reference. Works best in a tool with a style-reference slot, such as Nano Banana Pro.
```

**Attach line — a style from the list:**

```
📎 Attach: nothing — each set stands alone.
```

**Attach line — a chained set:**

```
📎 Attach: your empty render of set [N] to sets [N+1]-[N+4] — the version without a character in it.
```

---

## Tips the skill may give (in 💡 Next or when asked)

- **Make the first set first, then chain.** Five prompts on their own give five plausible places;
  the first set's render attached to the other four gives one place five times. Offer
  `🔗 Chain the set`.
- **In the Gemini app**, `prompt_text` already opens with "Create", so it returns an image, not
  text. Start a fresh chat when results drift.
- **Change one thing at a time** when a set comes out wrong — the prompt or the image, not both.
- **Night scenes** can come out looking like late afternoon on some tools; strengthen the night in
  the world line (`deep night with no daylight outside, moonlight from high on the left`).
- **Putting the character in** — attach the set as Image 1 and the character as Image 2, set the
  image size to the set's, and use the placement prompt (`style-bible.md`).

---

## Self-check for tool lines

1. The paste line is printed once per reply that prints sets.
2. The attach line matches the mode: match, a style from the list, or chained.
3. No tool or model name appears inside any fenced set prompt.