# Optical Lookbook, Combat Split Grammar & Creature Material Specs

## 1. Anti-Mud Lighting & Sensor Suffix (Paste Into Every `flow_prompt_plate` / `keyframe_build`)
- **Exterior Monumental Daylight (*Sicario* Clean Edge):**
  > `Cold diffused overcast daylight cutting across pale weathered chalk limestone walls and wet flagstones, sharp 8:1 figure-ground silhouette separation, desaturated mineral slate and oxidized bronze palette, functional damp wool and pitted iron wear, raw 35mm anamorphic digital sensor capture, natural skin pores, zero cross-hatching, zero mesh lines, no neon fog.`
- **Subterranean Architectural Vault (*Dune* Directional Shaft):**
  > `Single high narrow basalt skylight shaft piercing dark carved monolith stone at 35 degrees, deep unlit obsidian vault edges with crisp silver dust particulates inside the beam, cool 5600K shaft contrast against single warm bronze brazier bounce, clean 35mm anamorphic sensor texture, free of artificial orange mud haze.`

## 2. Combat-by-Cut Matrix (`3–5s` Real-Time Clips, Max 1 Primary Verb Each)
| Cut # | Framing / Lens | Single Physical Action Only | Chain / Plate Source |
| --- | --- | --- | --- |
| **Cut A** | `24mm Master Wide` | Armed creature drops behind two guards marching down limestone passage; lands on flagstones. | Sequence anchored `plate.png` |
| **Cut B** | `50mm Medium` | Guard levels ashwood spear toward center; creature traps spear shaft cleanly under forearm iron plate. | Same passage plate (no continuous morph) |
| **Cut C** | `85mm Macro Impact` | Scarred iron gauntlet clamps directly over second guard's crossguard knuckles; sword falls onto wet stone. | Cut C keyframe insert (`staging_build`) |
| **Cut D** | `50mm Reaction` | Injured guard slumps clutching wrist in soft left foreground; creature slowly turns reflective black eyes right. | Tail frame or clean reaction plate |

## 3. Biomechanical Creature Dossier Template (`asset_register`)
Never submit vague creature descriptions. Specify all 5 layers verbatim:
- **Skeletal & Locomotion:** Elongated hunched thoracic curve, asymmetrical scarred right deltoid, heavy two-toe splayed heel displacing dust.
- **Carapace & Wardrobe Integration:** Cast bronze collar tribunal plate notched *around* three paired lateral breathing slits; leather strapping riveted to osteoderms.
- **Material Speculars:** Chalk-dusted matte shoulder plates; localized clear viscous oil sheen along inner joint folds; warm red subsurface scatter on translucent throat membranes when backlit.
- **Corneal Eye Spec:** Deeply recessed liquid-wet black cornea with horizontal goat/reptilian slit aperture clearly reflecting overcast courtyard sky.
- **Clean Role Contract (`shot_prompt_compile`):** `@char_magistrate anchors anatomy, bronze harness, and throat gill cadence verbatim; @loc_courtyard anchors chalk masonry and overcast rim only.`
