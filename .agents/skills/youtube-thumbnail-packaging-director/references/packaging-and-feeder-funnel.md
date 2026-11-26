# YouTube Packaging Examples, 16:9 Thumbnail Spec & Feeder Shorts Funnel

## 1. Title Matrix (Tested `Human + Encounter + Impossible Outcome`)
- **FLAGSHIP (*The Black Accord*):**
  `They Sent a Monster to Execute Her. It Arrested the King Instead | Full Dark Fantasy Movie 4K`
- **Alternative A/B Test Variant:**
  `The Executioner Bowed to the Prisoner and Put the King in Chains | Full Dark Fantasy Movie 4K`
- **Sci-Fi/Military Parallel:**
  `An Army Entered the Forest. Only Its Prisoner Was Allowed to Leave | Full Fantasy Movie 4K`
- **Subterranean Scale Parallel:**
  `They Found a Living God Beneath the City. It Asked to Be Executed | Full Dark Fantasy Movie 4K`

## 2. Dedicated `16:9` High-CTR Thumbnail Prompt (*The Black Accord* Exemplar)
> `16:9 widescreen still photograph, 50mm lens, bright diffused overcast daylight cutting across pale chalk limestone courtyard. Centered slightly right, a towering armored reptilian executioner in weathered charcoal chitin and hammered bronze halts between a calm bound female prisoner on frame-left and a richly robed gold-crowned king on mid-right, snapping a serrated oxidized bronze shackle squarely around the king's crimson-sleeved wrist. High 60% luminance separation between dark bronze silhouette and pale chalk mist behind it; bright wind-lit eye catchlights on all three faces (calm certainty on prisoner, raw terror on king). Saturated focal contrast isolated ONLY on the king's crimson silk cuff and gleaming bronze lock. Clean 35mm sensor film frame, zero blurred clutter, lower-right quadrant unobstructed dark flagstone negative space.`

### Mobile Verification Gate Before Export
1. Shrink image to `150×84px`: Are the creature horn/head silhouette, shackle on crimson sleeve, and king's terror legible without text? If not → boost overcast rim exposure on background stone.
2. Add **zero** painted circles/arrows. If text is tested in A/B round 2, limit to `<= 2` stark serif words in upper-left pale space.

## 3. 1-Film → 3 Feeder `9:16` Shorts Protocol (`clip_plan_viral` + `clip_render_viral`)
Extract high-curiosity `24–38s` vertical confrontations from the `rough_cut.mp4` master:
1. **Short A (`0:00–0:26`):** Cold Open (`"The Monster Arrested the King"` — cuts cleanly right after `"Your Majesty. Descend."`).
2. **Short B (`~4:10–4:42`):** Institutional confrontation (`"His Army Couldn't Cross This Line"`).
3. **Short C (`~14:50–15:28`):** Climax reveal setup without final spoil (`"She Wasn't Trying to Escape"`).
Wire `auto_sfx: true` (`sfx_spot_video`), `burn_captions: true` (ASS), and `1080×1920` exponential pan tracking via `clip_render_viral`, plus export localized `.srt`/`.ass` packs for English, Spanish, Russian, Arabic, and Japanese subtitles.
