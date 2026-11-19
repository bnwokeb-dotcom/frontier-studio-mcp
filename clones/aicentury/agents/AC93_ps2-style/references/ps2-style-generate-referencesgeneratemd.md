# PS2 Style — Generate (references/generate.md)

# Making it: the OpenArt and Higgsfield MCP route

This file governs the ⚡ line under every shot, the check for a connected generator, the cost confirmation, and the extra link lines above the footer.

> The prompts are the product; making the images and videos is an extra the user opts into. Nothing is spent until the user says yes to a stated cost. Links are embedded Markdown links only, never a raw URL.

---

## Step 1: check what is connected

Before printing the ⚡ line, look at the tools this assistant can call right now:

| You see tools from | Means |
| --- | --- |
| the OpenArt MCP (tool names with `openart`, loaded or listed as available to load) | OpenArt is connected |
| the Higgsfield MCP (tool names with `higgsfield`, loaded or listed as available to load) | Higgsfield is connected |
| both | offer both, OpenArt first |
| neither | not connected |

Check again whenever the user says they connected one. Never claim a connection you cannot see.

---

## Step 2: the ⚡ line

**Connected** (print the one that applies, in the reply language (English unless the user writes in another)):

```
⚡ **Want to automate this?** Your OpenArt is connected, so I can make the images and the video right here in the chat. Want that?
```

```
⚡ **Want to automate this?** Your Higgsfield is connected, so I can make the images and the video right here in the chat. Want that?
```

**Images only** (a character sheet, an environment), connected or not: the same lines with `the images` instead of `the images and the video`.

**Video-only reply, connected:**

```
⚡ **Want to automate this?** Your [OpenArt | Higgsfield] is connected, so I can make the video right here in the chat. Want that?
```

**Not connected:**

```
⚡ **Want to automate this?** Connect the [OpenArt MCP](https://openart.ai/mcp/?via=virgil) or the [Higgsfield MCP](https://higgsfield.ai/mcp?fpr=3066&fp_sid=mcp), your choice, and I can make the images and the video right here in the chat. Want that?
```

A yes while nothing is connected → one line on how to connect (add the MCP as a connector in their assistant, then come back and say **make it**), with the same two links.

Print it once per shot reply, above the 🎯 next-shot list. If the user said they don't want it, leave it out for the rest of the chat.

---

## Step 3: on a yes

**What gets made:** the latest shot in the chat, unless the user names another (a panel, an earlier shot). On a video-only reply, only the clip.

1. **Use the connected MCP's own official route**: its own tools, in the order its own instructions describe (upload, generate, wait, show). Follow its instructions for uploads and reference images.
2. **Pick the models.** Image: with attachments, a model that edits with several reference images; with nothing attached (block C, a panel without screenshots), text-to-image (the tested one is GPT Image 2, in edit mode, `tool-notes.md`). Video: the mode, length and sound from the video's own settings line (the tested model is Wan 3.0; Nostalgia 2 seconds sound off, Free Style and Promo 5 to 15 seconds). If the tested model is not offered, name the closest one and say it is untested.
3. **Upload in order.** The template frame first (image 1), then any look examples. If the user's screenshots are not yet available to the MCP, use the MCP's own upload route.
4. **State the balance and the cost, then wait.** Use the MCP's own balance and cost tools. One line: `This uses about [X] credits for 2 image versions ([balance] left). Go?` Nothing is generated before a yes. The clip gets its own cost line and its own yes, after the user picks a version.
5. **Two image versions** (two separate calls when the tool repeats one prompt per call), then show them and ask which one is more "PS2", blockier and blurrier wins.
6. **The clip** from the picked version, then show it.
7. **A failed or filtered job**: say so plainly. A re-run costs again, so it needs a new yes.

Never use any other generation tool, never generate without the yes, and never loop retries.

---

## Step 4: the extra footer line

When **Higgsfield** is connected and used, print this line directly above the three CTA links, in every reply from then on:

```
🎬 Create these images and videos in [Higgsfield](https://higgsfield.ai/?fpr=3066)
```

When **OpenArt** is connected, the OpenArt line already in the CTA block covers it, add nothing.

The three CTA links stay the last thing in the reply, word for word.

---

## Self-check for making it

1. The ⚡ line matches what is actually connected (or the connect line, with both embedded links).
2. No generation call before the user said yes to a stated cost; image and clip each had their own yes.
3. The Higgsfield line, when used, sits directly above the three CTA links; nothing comes after them.
4. No raw URL anywhere.