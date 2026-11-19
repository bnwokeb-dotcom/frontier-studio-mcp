# Dancing Pet — Style Bible & Prompt Kit (updated)

# Dancing Pet — Style Bible & Prompt Kit

*(Niche 22 — filed under "Dancing Dog". Dogs are the default pet, never the limit.)*

The complete, self-contained reference for building **a photoreal still of a real pet standing upright on its own hind legs in a real everyday place** — and then animating that exact still into a dance clip.

Read this file before every build. Reuse its wording **verbatim** — that is what stops the look from drifting.

**One sentence:** *a real animal, its own real body, balanced upright on its own two hind legs, filmed on a phone by someone who lives there — standing still in the image, dancing in the video.*

The joke is never a cartoon animal. The joke is that **it looks real** — an ordinary untouched room or street, ordinary phone footage, and one absurd thing in the middle of it.

| ✅ This | ❌ Not this |
| --- | --- |
| A real Beagle's fur, wet nose, real forelegs hanging loose | A humanoid dog with arms and hands |
| A shampoo-cluttered bathtub, a real marble rail | A stage, a dance floor, a seamless backdrop |
| Overhead ceiling light, crushed blacks, phone auto-exposure | Rim light, HDR, a cinematic grade |
| Hind paws pressing water into ripples | An animal floating an inch above the surface |
| A tap still running behind the dancing pet | A dancing pet inside a frozen photograph |

> **Golden rule:** real animal anatomy + two hind legs + a real unstyled place + straight-out-of-phone grade + a world that keeps moving. Everything else is a dial.

---

## 0. ⭐ THE LOAD-BEARING RULE — THE IMAGE IS THE *BEFORE*, THE VIDEO IS THE *MOTION*

**The still is the pet STANDING STILL. The dance comes from the reference video.**

The user supplies a reference dance clip and the video engine transfers that motion onto the still. If the still is already frozen mid-dance, the written pose fights the transferred motion and both degrade — you get a blended, mushy result. So the default still is a calm, neutral, balanced upright stand: the canine equivalent of a T-pose.

This is the same principle as **Niche 16 — Pimple ASMR**: *image = the before state, video = the action.* There the still holds an intact blemish and a tool gap; here the still holds a calm upright stand. Cross-niche rule, worth reusing.

**Say the trade-off to the user in one line whenever they ask for a dance pose in the still:**
> *"Heads up — a mid-dance still fights the motion from your reference clip. Neutral stand animates better. Dance pose is the right call only if this is a still-only post."*

### 0.1 The three-stage pipeline (say this outside prompt bodies only, never inside one)

```text
1. 🐾 / 🐕  STAGE 1  REFERENCE  → the pet standing neutral on a pure solid white sweep
                                  (text-to-image, or the user's own uploaded photo)
2. 🌍       STAGE 2  PLACEMENT  → that exact pet placed into the chosen environment
                                  (image-to-image from the reference, or one self-contained prompt)
3. 🎬       STAGE 3  ANIMATION  → the placement still + the user's dance clip → the dance
```

Each stage inherits the identity of the one before it. **State the handoff to the user at every step — which image to upload, and where.** Never name a tool, model or engine inside a prompt body; engines are named in chat only.

### 0.2 What changed in this revision — read before "fixing" anything

| # | Change | Why |
| --- | --- | --- |
| 1 | **Neutral stand is now the default pose**, dance poses demoted to a still-only alternative | The dance arrives from a reference video; a still already mid-dance fights the transfer |
| 2 | The single image template became a **two-stage pipeline** — white reference, then placement | The white sweep is the reusable identity anchor and the clean start frame |
| 3 | Placement has **two modes** — with a reference image, and fully self-contained without one | A reference image is not required, and a prompt must never point at an image that does not exist |
| 4 | **Any pet**, not just dogs | Cats, rabbits, birds, reptiles, farm and exotic all work |
| 5 | One video template became **two routes** — with and without a dance clip | Only the Seedance family accepts a reference *video* on OpenArt |
| 6 | **Ambient motion is now mandatory** in every video prompt | The reference clip animates the pet, nothing animates the world unless the prompt says so |
| 7 | The **handheld phone-cam clause** is now a named verbatim block | Ad-hoc "handheld" adjectives were producing gimbal-smooth output |
| 8 | Four fixed **conversation starters**, each with an explicit handler | An unhandled starter produces a confused first reply |

---

## 1. ⭐ THE #1 RULE — THE STAND

**This is the whole format, and it is the thing image models break.** Asked for an upright animal, a model reaches for mascots, cartoon characters and people in animal suits. It grows a human torso, human shoulders, hands instead of paws, or it mangles the hind legs into two bent sticks.

So the stand is not a description. It is a **locked clause**, pasted **verbatim**, right beside the Locked Look. Never reword it, never shorten it, never fold the room, the light or the props into it.

### 1.1 Three blocks — exactly one is used at a time

| Block | Used in | When |
| --- | --- | --- |
| **§1.2 THE NEUTRAL STAND** | Stage 1 reference **and** Stage 2 placement stills | **Default. Always, unless the user is doing a still-only post.** |
| **§1.3 THE DANCE STAND** | Stage 2 placement still only | Only when the user says they want a still and no video |
| **§1.4 THE ANATOMY GUARD** | Every video prompt, both routes | Always. The pose is owned by the reference clip or the beat list, so the stand's pose sentences are dropped and the anatomy sentences are pasted at full strength |

**Never paste two of them into the same prompt.** The neutral stand and a dance pose in one block produce a blurred average of both.

### 1.2 THE NEUTRAL STAND — the default, paste verbatim, never reword

```text
The [ANIMAL] stands upright on its own two hind legs in a neutral resting stance, held upright and completely still, balanced exactly the way a real [ANIMAL] balances when it sits up or stands at a table. Hind legs carrying the weight evenly between them, both hind paws flat on the surface about shoulder-width apart, pads pressing down with a true contact shadow, hock and stifle naturally bent the way a real [ANIMAL]'s are, never straight human legs. Pelvis under the body, spine straight, chest lifted, belly turned toward the lens. Both front legs are real [ANIMAL] forelegs, relaxed and symmetrical, hanging loose and low at the sides of the chest with the elbows softly bent and the wrists limp so the paws droop naturally, real toes, real claws and real pads visible. Nothing is raised, nothing is reaching, nothing is mid-swing. The head is a completely real unmodified [ANIMAL] head of the exact species and breed in the character lock, carried level on an upright neck, facing the camera calmly, with real fur, real ears, real moist eyes and a real wet nose. This is a real [ANIMAL]'s own body and anatomy simply balanced on two legs, not anthropomorphic: no human torso, no human shoulders, no human arms, no human hands, no humanoid proportions, exactly four real [ANIMAL] limbs and no more, every joint bending the way a real [ANIMAL]'s joints bend.
```

### 1.3 THE DANCE STAND — still-only alternative, paste verbatim *instead of* §1.2

Use this **only** when the user has said they want a still and no video. It is the original mid-motion stand and it still works perfectly for a one-image post.

```text
The [ANIMAL] stands upright on its own two hind legs, held upright, balanced exactly the way a real [ANIMAL] balances when it begs or stands up at a table. Hind legs straight or near-straight and carrying all the weight, both hind paws flat on the surface and close together, pads pressing down with a true contact shadow. Pelvis tucked forward, spine straight to leaning back slightly, chest lifted and open, belly turned toward the lens. Both front legs are real [ANIMAL] forelegs, raised and asymmetric mid-motion: one forearm folded in against the chest, the other swung out, wrists loose, paws open with real toes and real pads visible. The head is a completely real unmodified [ANIMAL] head of the exact species and breed in the character lock, carried high on an extended neck, with real fur, real ears, real moist eyes and a real wet nose. This is a real [ANIMAL]'s own body and anatomy simply balanced on two legs, not anthropomorphic: no human torso, no human shoulders, no human arms, no human hands, no humanoid proportions, exactly four real [ANIMAL] limbs and no more, every joint bending the way a real [ANIMAL]'s joints bend.
```

Then add exactly one pose line from **§5**.

### 1.4 THE ANATOMY GUARD — every video prompt, both routes, paste verbatim

```text
Anatomy through the whole clip: the [ANIMAL] keeps a real [ANIMAL]'s own body and anatomy, balanced on its own two hind legs, the hind legs carrying all the weight with the hock and stifle bending the way a real [ANIMAL]'s do and never as straight human legs, both hind paws staying in visible contact with the surface in every single frame, never hovering, never jumping clear, never lifting both at once. The front legs are real [ANIMAL] forelegs with real toes, real claws and real pads, never hands. A completely real unmodified [ANIMAL] head throughout, with real ear movement, a real blink and real breathing. Exactly four real [ANIMAL] limbs and no more, every joint bending the way a real [ANIMAL]'s joints bend, not anthropomorphic: no human torso, no human shoulders, no human arms, no human hands, no humanoid proportions. Real animal weight throughout: it shifts, it wobbles, it corrects its balance. Never floaty.
```

### 1.5 The species token — the only substitution allowed

`[ANIMAL]` is replaced with the real species word — *dog, cat, rabbit, ferret, parrot, bearded dragon, goat*. **Nothing else in the block changes.** For a species without fur, paws or a wet nose, swap only the true equivalents in the same slots:

| Group | Swap |
| --- | --- |
| 🐈 Fur (dog, cat, rabbit, ferret, rat) | No swap — the clause is written for this |
| 🦜 Feathers (parrot, chicken, duck) | *fur* → **feathers with visible individual barbs** · *wet nose* → **a real keratin beak with real nostrils** · *paws and pads* → **real scaled feet with real claws** |
| 🦎 Scales (bearded dragon, gecko, tortoise) | *fur* → **real scaled skin with individual scales** · *wet nose* → **real nostrils and a real mouth line** · *pads* → **real scaled toes with real claws** |
| 🐐 Hooves (goat, pig, lamb) | *paws and pads* → **real cloven hooves with real horn texture** · *contact shadow* unchanged |

Naturally bipedal animals — parrots, chickens, meerkats — still get the guard. The failure mode there is a humanoid torso, not a mangled leg.

### 1.6 The four ways the stand fails, and what holds it

| Failure | What causes it | What holds it |
| --- | --- | --- |
| 🧍 Humanoid / anthro drift | "upright", "dancing" and "on two legs" all retrieve mascot and cartoon training data | The words **"a real animal's own body and anatomy simply balanced on two legs"** plus the five explicit *no human* clauses |
| 🦴 Mangled or extra hind legs | The model has few real photos of a load-bearing bipedal animal | Name the mechanics: **flat, shoulder-width apart, pads pressing down, hock and stifle naturally bent, true contact shadow** |
| 🖐️ Paws become hands | "front paws used as hands" is exactly the wrong wording here | Never say *used as hands*. Say **"real forelegs… real toes, real claws and real pads visible"** |
| 🎈 Floating animal | Nothing anchors the paws to the surface | Every placement prompt names **what the hind paws are doing to the surface** — pressing water into ripples, gripping stone, denting a rug |

> **Never write "dancing dog" as a genre label inside a prompt body.** Write what the body is physically doing. The dance is limb positions and weight, not an adjective.

---

## 2. 🔒 THE LOCKED LOOK

One invariant text governing **medium, material and grade only**. It never changes, for any pet, any pose, any place. Situational wording — the room, the props, the light source, the camera position, the pose — lives in its own slots in the template, **never folded inside this clause**.

There are two, because Stage 1 is a studio white sweep and Stage 2 is a real room. They are not interchangeable.

### 2.1 THE LOCKED LOOK — Stage 2 placement stills and every video prompt

```text
Photoreal handheld phone realism: a real living animal, real fur in individual strands with natural sheen, real moist eyes with true catchlights, a real wet nose, real paw pads and real claws, correct real animal anatomy under the coat. Ordinary available light only, never studio or stage lighting, soft realistic shadows and a true contact shadow where the hind paws press the surface. Phone main camera, mild wide-angle perspective, faint handheld shake, slight motion blur only on whichever limb is actually moving while the face and torso stay sharp. Straight-out-of-phone grade: auto exposure, crushed blacks, slightly hot highlights, mild sharpening halos, subtle sensor grain, natural true-to-life colour with no grading. Looks exactly like an unedited photo someone took of their own real pet.
```

### 2.2 THE WHITE-SWEEP LOOK — Stage 1 reference image only

```text
Photoreal studio reference photograph: a real living animal, real fur in individual strands with natural sheen, real moist eyes with true catchlights, a real wet nose, real paw pads and real claws, correct real animal anatomy under the coat. Clean even soft studio light from the front with no harsh shadow on the animal, the whole animal sharp from nose to hind paws with no shallow-focus falloff, natural true-to-life colour, fine natural detail with no grading and no beautification. Looks exactly like a real photograph of a real animal, not a render and not an illustration.
```

### 2.3 HARD NEGATIVES — on every image prompt and every video prompt

```text
not a cartoon, not anime, not an illustration, not a painting, not CGI, not a 3D render, not a game engine render, no plastic or waxy fur, no glossy render sheen, no toy or plush or figurine look, no HDR overcook, no teal-and-orange grade, no clean studio lighting, no advertisement look, no pasted-on cutout compositing, no humanoid or anthropomorphic body, no human torso, no human shoulders, no human arms, no human hands, no human face or human eyes, no animal head on a human body, no mascot costume, no person in an animal suit, no costume seam or zipper at the neck, no extra limbs or distorted anatomy, no bent or broken hind legs, no floating or hovering paws, no stage, no dance floor, no spotlight, no seamless backdrop, no clothing, no collar unless stated, no captions, no subtitles, no on-screen text, no watermark, no logo
```

### 2.4 The two negatives that come OFF for Stage 1 — and nothing else

Stage 1 **is** a clean studio shot on a seamless white sweep, so two phrases would fight it. Drop exactly these two from the Stage 1 negatives and keep every other word:

- ~~`no clean studio lighting`~~
- ~~`no seamless backdrop`~~

Then append the Stage 1 extras:

```text
no floor line, no horizon line, no visible wall or corner, no gradient or vignette on the background, no grey or coloured backdrop, no props, no furniture, no shadow cast onto the backdrop, no cropping of the head, paws or tail, no shallow depth of field, no blur on any part of the animal
```

### 2.5 Why each phrase is in the Locked Look

| Phrase | The job it does |
| --- | --- |
| *real fur in individual strands with natural sheen* | Kills the plush / plastic render. Fur that has strands cannot be a toy. |
| *real moist eyes with true catchlights, a real wet nose, real paw pads* | The three wet surfaces a render always gets wrong. Naming them forces photographic detail. |
| *correct real animal anatomy under the coat* | The backstop under §1. It fires even if the stand clause gets truncated. |
| *ordinary available light only, never studio or stage lighting* | One available source is what a real room has. A rig reads as an advertisement. |
| *a true contact shadow where the hind paws press the surface* | The single strongest anti-float cue in the clause. |
| *phone main camera, mild wide-angle perspective* | The phone signature: the near surface edge bows and rushes out of frame. |
| *slight motion blur only on whichever limb is actually moving* | The format's #1 realism tell. Pose-agnostic on purpose — it holds for a neutral stand too, where nothing is moving. |
| *auto exposure, crushed blacks, slightly hot highlights, mild sharpening halos, subtle sensor grain* | Real phone dynamic range failing at both ends in the same frame. Perfect exposure reads as CGI. |
| *natural true-to-life colour with no grading* | Blocks the teal-and-orange LUT that "cinematic" pulls in. |
| *looks exactly like an unedited photo someone took of their own real pet* | The one-line summary the model weights heavily. Ends on "real". |

---

## 3. 🐶 THE CHARACTER LOCK

The pet is locked **once**, then reused **word-for-word** in the Stage 1 prompt, the Stage 2 prompt and the video prompt. This is what makes all three look like the same animal.

### 3.1 The block

```text
CHARACTER LOCK — [NAME]
A real [AGE / SIZE] [SPECIES AND BREED OR MIX] with [EXACT COAT COLOUR, TEXTURE AND PATTERN — markings named and placed], [EAR SHAPE AND CARRIAGE], [MUZZLE OR BEAK OR SNOUT], [EYE COLOUR, SHAPE AND EXPRESSION], [BODY BUILD AND LEG LENGTH], [TAIL LENGTH, SHAPE AND CARRIAGE], [BELLY AND UNDERSIDE — colour and hair coverage], [COLLAR OR NO COLLAR].
```

### 3.2 The three slots this build adds over a normal pet lock

Standing upright exposes parts of an animal a four-legged shot never shows. Fill these or the model invents them.

| Slot | Why it is mandatory here |
| --- | --- |
| **Belly and underside** | Upright = belly to camera. It is the strongest continuity anchor in the whole frame, and models default to a flat clean colour. Say the truth: *"a pale mottled grey-pink bare belly with sparse dark hairs and uneven pigment"*, or *"a white underside with a soft cream fringe"*. |
| **Tail length, shape and carriage** | Hidden in a front-on stand, obvious in three-quarter. Unlocked, it flips between curled, docked and long shot to shot. |
| **Leg length and build** | The stand is entirely a leg pose. A leggy terrier, a low Corgi and a rabbit balance completely differently, and the model needs to know which. |

### 3.3 Worked example

```text
CHARACTER LOCK — Biscuit
A real adult tricolour Beagle with a short dense white, black and tan coat, a black saddle across the back, tan over the shoulders, cheeks and eyebrows, a white blaze running up the muzzle between the eyes, white chest, white front legs and a white tail tip, long soft drop ears set low and hanging flat beside the cheeks, a square tan-and-black muzzle with a broad wet black nose, round warm-brown eyes with a permanently hopeful expression, a sturdy barrel-chested build on short straight legs, a moderately long tail carried up in a loose curve, a pale white-and-pink underside with sparse hair on the lower belly, no collar.
```

### 3.4 How the lock differs on each path

| | 📸 UPLOAD YOUR OWN PET | ✍️ CHOOSE A PET |
| --- | --- | --- |
| Where the lock comes from | **Read from the photo.** Only what is actually visible. | Written from the chosen species/breed + the user's own words. |
| Invention allowed | **None.** If the tail is out of shot, write *"tail not visible in the reference — kept as in the photo"*. Never guess a marking. | Full. Invent a plausible, specific animal and show the lock back for approval. |
| Prettifying | **Forbidden.** Never slim, never fatten, never tidy the coat, never brighten the eyes, never remove a scar or a grey muzzle. | N/A |
| Lead-in line on every prompt | **Required** — see §8.2 Mode A. | None if there is no reference image — see §8.3 Mode B. |
| Engine mode | Image-to-image, the owner's photo as reference image 1. | Text-to-image for Stage 1, then image-to-image for Stage 2. |
| Collar | If the animal wears one in the photo, **keep it and describe it**. It is part of the identity. | Default **no collar** unless the user asks. |

> **The lock is also the user's property.** On the no-reference path (Mode B) the written description *is* their character lock — tell them to keep it and paste it verbatim next time to get the same animal again.

---

## 4. 🐕 THE PET LIBRARY

**Any pet works.** Dogs are the default and the fast lane, never the limit. Never force the upload, and never deadlock a user who has no photo.

### 4.1 📸 The upload path — the user's own pet

The ask, verbatim, and then **stop**. No menus, no prompt yet.

```text
📸 Upload a photo of your pet — the star of the clip.

One clear photo is enough. Full body and good light is best, but a head shot works.

No photo? Type "no photo" and I'll build you one instead.
```

Then: read the photo → write the **Character Lock** from what is actually visible → show it back in one short block so the user can correct it → continue to the environment. `no photo` hands off to the menu path.

### 4.2 ✍️ The menu path — dogs first

| # | Breed | # | Breed |
| --- | --- | --- | --- |
| 1 | 🐶 Pug | 6 | 🐶 Chihuahua |
| 2 | 🐶 French Bulldog | 7 | 🐶 Shih Tzu |
| 3 | 🐶 Corgi | 8 | 🐶 Jack Russell Terrier |
| 4 | 🐶 Dachshund | 9 | 🐶 Golden Retriever |
| 5 | 🐶 Beagle | 10 | 🐶 Border Collie |

Close with: *"Pick a number, type any other pet — Shiba, tabby cat, house rabbit, cockatiel, anything — or type More."*

- On **More (dogs):** 🐕 Husky · Boston Terrier · Cocker Spaniel · Dalmatian · Poodle · Rottweiler · Shiba Inu · Pomeranian · Bulldog · Whippet · Basset Hound · Samoyed · Doberman · Maltese · a scruffy mixed-breed rescue.
- **Custom input is always open.** If the user types *"my aunt's fat old black lab with a grey muzzle"*, build exactly that — grey muzzle and all.
- Big and heavy breeds still work: a Rottweiler or a Great Dane balances upright with **hind legs wider apart, hocks more bent and the back leaning further back** as a real heavy animal does. Say so in the stand's species note, not inside the locked clause.

### 4.3 🐾 More (other pets) — the second page of the menu

| Group | Pets |
| --- | --- |
| 🐈 **Cats** | tabby · ginger · black domestic shorthair · Ragdoll · Maine Coon · Siamese · Sphynx · British Shorthair |
| 🐇 **Small pets** | house rabbit · guinea pig · ferret · rat · chinchilla · hamster · hedgehog |
| 🦜 **Birds** | cockatiel · budgie · African grey · macaw · chicken · duck · pigeon |
| 🦎 **Reptiles** | bearded dragon · leopard gecko · corn snake · tortoise · iguana |
| 🐐 **Farm** | goat kid · lamb · piglet · alpaca · miniature donkey |
| 🦝 **Exotic** | meerkat · raccoon · fennec fox · sugar glider · capybara |

**Species notes that matter for the stand**

| Species | Note |
| --- | --- |
| 🐈 Cat | Balances higher and narrower than a dog; the tail counterweights out behind. Say **"tail extended back and low as a counterweight"**. |
| 🐇 Rabbit | Already a natural sitter-up. Long hind feet lie **flat from heel to toe**, not up on the toes — name it or the model puts it on tiptoe. |
| 🦜 Bird / chicken | Naturally bipedal, so the leg guard is easy and the **humanoid torso** is the real risk. Keep every *no human* clause. |
| 🦎 Reptile | Upright is unnatural — keep the stance low, wide and braced, tail down on the surface as a third point of contact. |
| 🐐 Farm | Heavy and top-loaded: wider hind stance, more bend, back further back. |

---

## 5. 💃 POSE — NEUTRAL BY DEFAULT

**Default: the neutral stand from §1.2. Do not offer a pose menu unless the user asks for one or says they want a still with no video.**

### 5.1 Why the neutral stand is the default

| | 🧍 Neutral stand (default) | 💃 Dance pose (still-only) |
| --- | --- | --- |
| Feeds a video | ✅ Clean start frame; the reference clip owns the motion | ❌ The written pose fights the transferred motion, both degrade |
| Identity | ✅ Symmetrical and open — the best possible reference of the animal | ⚠️ Limbs cross the body and hide markings |
| Reuse | ✅ One reference works for every environment and every clip | ❌ Locked to one beat |
| Still on its own | ⚠️ Calm, less funny in isolation | ✅ The funnier single image |

**One line to the user, when it is relevant:** *"Neutral stand is the default because your dance clip supplies the movement. Want a still-only post? I'll pose it mid-dance instead."*

### 5.2 The dance pose library — still-only alternative

**One pose = one image.** Pick one, paste one line after §1.3. Never stack two poses into one still. Show 1–8 as the menu; 9–12 arrive on **More**.

| # | Pose | Paste this as the POSE line |
| --- | --- | --- |
| 1 | 🫳 **The Low Dangle** | Hind legs straight and close together, both forelegs hanging loose at belly height with the elbows bent and the wrists limp so the paws droop down and slightly inward, spine straight with the chest lifted, head level and squared to the lens with the chin slightly tucked. |
| 2 | 🙌 **The High Reach** | Hind legs straight and locked, one foreleg folded tight against the chest and the other extended nearly straight up and out to the side above the top of the skull with the paw open and flexed, spine leaning back about fifteen degrees, head level and turned slightly toward the raised paw. |
| 3 | 🤞 **The Cross** | Hind legs straight with the hind paws almost touching, both forelegs folded across the chest and overlapping at the wrists in front of the throat with the elbows tucked to the ribs, spine straight, head level and locked on the lens with a slight tilt. |
| 4 | 👉 **The Side Swing** | Hind legs straight, one foreleg tucked against the ribs and the other swung out sideways to shoulder height with the elbow half bent and the paw open, torso twisted about twenty degrees so one shoulder comes forward, head level and following the swinging paw. |
| 5 | 🎤 **The Head-Back Beat** | Hind legs straight and close together, both forelegs low and loose at chest height, spine leaning back about twenty degrees with the chest wide and open, head thrown back and the muzzle raised toward the ceiling with the mouth open and the tip of the tongue showing. |
| 6 | 🌀 **The Twist** | Hind paws planted flat and close together with the toes gripping, hips rotated one way and the shoulders counter-turned the other, one foreleg out at mid-chest height and one tucked in, spine straight with a shallow S curve, head level and square to the lens while the body turns under it. |
| 7 | ☝️ **The Paw Point** | Hind legs straight and locked, one foreleg tucked at the throat and the other extended straight forward at chest height toward the camera with the toes spread and the pads showing, spine leaning back slightly, head level with the eyes locked on the lens. |
| 8 | 🕺 **The Lean-Back** | Hind legs straight with the weight rocked back onto the rear pasterns, pelvis pushed forward and the belly presented to the lens, both forelegs raised to shoulder height with the elbows out, spine leaning back about twenty-five degrees, head level with the chin lifted. |
| 9 | 🐾 **The Marching Shuffle** | One hind paw planted flat and the other lifted a few centimetres and re-planting just ahead of it with the toes splayed, forelegs low and alternating at belly height, spine straight, head level and bobbing on the beat with the ears lifting. |
| 10 | ⬆️ **The Double Bounce** | Both hind legs bending and straightening together in a small bounce with both hind paws staying flat on the surface, both forelegs held tight against the chest with the wrists limp, spine straight, head level and dipping a few centimetres with the ears flapping. |
| 11 | 🙈 **The Peekaboo** | Hind legs straight and close together, one foreleg raised across the brow so the paw shades one eye and the other tucked at the chest, spine straight, head tilted about fifteen degrees with the free eye still locked on the lens. |
| 12 | 👞 **The Tap Step** | One hind leg straight and load-bearing, the other hind paw forward with only the toes touching the surface, one foreleg swung out at hip height and the other folded in at the chest, spine straight to leaning back slightly, head level with the chin up. |

**Pose rules that never bend**

- **Never symmetric.** Both forelegs mirrored and extended kills the motion instantly. Poses 3 and 10 are the only paired-arm beats, and both are tucked, not extended. *(The neutral stand is the deliberate exception — there, symmetry is the point.)*
- **Head never drops below the shoulder line.** A lowered head reads as an animal about to go back onto four legs.
- **Hind paws never leave the surface.** No jumping, no hovering, no spinning off axis.
- On **More**, offer fresh beats: the shoulder shimmy · the one-paw wave · the slow-motion lean · the belly-out strut · the chin-up freeze · the ear-flap shake.

---

## 6. 🌍 ENVIRONMENT LIBRARY

Any environment works. **💦 Water is the signature default** — if the user has no preference, put the pet in water.

Show this as a grouped numbered menu, always ending with **✍️ type your own**.

### 6.1 💦 Water — the signature default

| # | Place | Paste this as the ENVIRONMENT line |
| --- | --- | --- |
| 1 | 🛁 **Bathtub** | Standing in five centimetres of still, faintly cloudy water on the floor of a white enamel bathtub set into a corner, concentric ripple rings radiating outward from each hind paw, a tall black body-wash bottle, a red shower-gel bottle and a white shampoo bottle with a gold cap standing on the wide tub rim, water droplets and a chalky scum line on the enamel, a warm painted wall meeting the tiled corner in the space above the pet. |
| 2 | 🚰 **Bathroom sink** | Standing on the porcelain floor of a white oval bathroom sink with the hind paws flat on the wet basin and a few beads of water around them, a chrome mixer tap, a scuffed red plastic tumbler holding a used toothbrush and a squeezed toothpaste tube on the counter beside it, the bottom edge of the mirror and a lit glass shower cubicle in the space above the pet. |
| 3 | 🚿 **Running tap** | Standing in three centimetres of churning aerated white water in a bathroom sink with a thin clear stream falling from the mixer tap just behind the shoulder, the water turning in a slow vortex with ripple rings running out to a raised meniscus at the basin wall, a speckled bar of soap on a small dish and a glass holding a toothpaste tube beside the tap, a plain backsplash and the bottom edge of the mirror above. |
| 4 | 🏊 **Pool edge** | Standing on the wet tiled coping at the edge of an outdoor swimming pool with a film of water under the hind paws and dark wet paw prints trailing behind, a dropped foam pool noodle, a crumpled towel and a half-full plastic bottle left on the coping, moving caustic light rippling off the pool surface, sun loungers and a hedge line in the space above the pet. |
| 5 | 🚿 **Shower tray** | Standing on the wet white floor of a glass shower cubicle with water beading and running off the hind paws, a shampoo bottle and a razor on the corner shelf, a dropped loofah and a worn bar of soap on the tray, steamed glass and a large chrome rainfall head in the space above the pet. |

> **Water is worth the extra words.** It gives contact (ripples radiating from the paws), it gives sheen, it gives a ready-made ambient motion for the clip, and it gives an authentic reason for a phone to be filming. Three of the four reference clips are water for a reason.

### 6.2 🗼 Travel landmarks

| # | Place | Paste this as the ENVIRONMENT line |
| --- | --- | --- |
| 6 | 🗼 **Night balcony over a lit city** | Standing on the flat marble cap rail of a balcony balustrade high above a city at night, the veined and slightly gritty stone running as a bright diagonal across the near foreground, a phone charger cable, a glass and a folded newspaper left on the rail behind, a lit avenue with warm street lamps and rooftops far below, and a floodlit landmark tower filling the space above the pet against a deep navy sky. |

**More travel places:** a Venice canal step at dusk · a Times Square kerb under the screens · a Tokyo crossing at night in the rain · a whitewashed Santorini wall over the sea · a red London bus-stop bench · a Dubai marina rail at golden hour · a New York fire escape · an alpine chalet balcony · a Marrakech market table · a Greek ferry rail.

### 6.3 🏠 Home rooms

| # | Place | Paste this as the ENVIRONMENT line |
| --- | --- | --- |
| 7 | 🍳 **Kitchen counter** | Standing on a worn laminate kitchen counter with the near edge cutting bright and out of focus across the foreground, an open cereal box on its side with a few flakes spilled, a half-drunk mug of coffee and a coiled phone charger beside it, crumbs and a water ring on the surface, tiled splashback, a fridge door with magnets and a hanging tea towel in the space above the pet. |
| 8 | 🛋️ **Living-room rug** | Standing on a rucked-up worn rug on scuffed laminate flooring with the pile denting under the hind paws, a dropped sock, a chewed tennis ball and a shoved-aside coffee table with a remote on it around the pet, sofa cushions and a wall of framed photos in the space above. |

**More home places:** a hallway by the front door with shoes everywhere · a bedroom duvet · a laundry pile on top of the machine · the bottom stair · a dining chair · a windowsill · the boot of a car with the tailgate up.

### 6.4 🌿 Outdoors

| # | Place | Paste this as the ENVIRONMENT line |
| --- | --- | --- |
| 9 | ⛵ **Boat deck** | Standing on a wet fibreglass boat deck with a shallow slick of seawater under the hind paws and salt spots drying on the surface, a coiled mooring rope, a plastic cool box and a life jacket dropped nearby, the deck rail and a bright open sea horizon with a low sun in the space above the pet. |

**More outdoor places:** a back garden lawn with a hose running · a car bonnet in a driveway · a sandy beach at low tide · a park bench · a muddy forest path · a farmers-market table · a skate-park ledge · a petrol-station forecourt at night.

### 6.5 ❄️ Seasonal

| # | Place | Paste this as the ENVIRONMENT line |
| --- | --- | --- |
| 10 | ❄️ **Snowy front step** | Standing on a snow-dusted concrete front step with the hind paws compressing the snow into two clear prints, a scraped patch of grit, a dropped woollen glove and a leaning snow shovel beside the door, breath fogging in the cold air, a wreath on the front door and a grey winter sky in the space above the pet. |

**More seasonal places:** a Christmas living room by the lit tree · a Halloween porch with carved pumpkins · a pile of autumn leaves · a summer sprinkler on the lawn · a birthday kitchen with a half-eaten cake · a New Year balcony with fireworks behind.

### 6.6 ✍️ Type your own — always offered

Close every environment menu with: *"Pick a number, or just type any place you like — I'll build it."* Then run the recipe:

> **Environment recipe for any new place:** pick a real, lived-in, unstyled location → give the pet **one narrow or unlikely surface** to stand on that clearly exists in the scene → let the near edge of that surface cut the foreground as a big, bright, slightly out-of-focus wedge → name **three authentic everyday props** with real wear, drips or branding, left where someone actually left them → reserve the space above the pet for **one recognisable hero element** → and check that **at least one thing in the scene can move**, because §9 will need it.

**Banned environment words inside a prompt body:** stage, dance floor, studio, spotlight, seamless backdrop, stage lighting, showroom. *(The one exception is the Stage 1 white sweep, which is deliberately a studio shot and carries its own look and negatives — see §2.2 and §2.4.)*

---

## 7. 🖼️ STAGE 1 — THE WHITE REFERENCE IMAGE

The identity anchor for everything downstream. Produced by the **🐾 Choose pet** path, or replaced by the user's own photo on the **🐕 My own pet** path.

**What it must be**

- The pet standing **upright on its hind legs in the NEUTRAL RESTING POSE** — §1.2. **Never dancing.**
- A **pure solid white sweep** — flat white, no floor line, no gradient, no props, no backdrop shadow; only a small soft contact shadow directly under the paws.
- **Full body inside the frame with even margin, nothing cropped, the whole animal sharp.**

**Why it earns its own stage:** it is clean to cut out, it drops into any environment through image-to-image, it is the correct start frame for motion transfer, and it is a reusable identity anchor the user keeps forever. One reference, unlimited environments.

### 7.1 The Stage 1 template

```text
[CHARACTER LOCK, verbatim — Section 3]

[THE NEUTRAL STAND, verbatim — Section 1.2]

Background: a pure solid flat white sweep filling the entire background, completely even and featureless, with no floor line, no horizon, no corner, no wall, no gradient and no vignette. The only shadow anywhere in the frame is a small soft contact shadow directly beneath the hind paws where they press the surface.

Framing: the whole animal inside the frame from the tips of the ears to the hind paws with an even margin of white all around it, nothing cropped and nothing touching the edge, the animal centred and standing at full height, the whole animal sharp from nose to hind paws.

[THE WHITE-SWEEP LOOK, verbatim — Section 2.2]

[HARD NEGATIVES — Section 2.3, minus the two phrases listed in Section 2.4, plus the Stage 1 extras from Section 2.4]
```

### 7.2 The handoff to say out loud

> *"Here's your reference — your pet standing neutral on white. Save it. Next I'll drop this exact pet into the place you pick, and later the same shot becomes the start frame for the video."*

---

## 8. 🌍 STAGE 2 — THE PLACEMENT IMAGE

That exact pet, placed into the chosen environment. **Two modes. Pick automatically, based on whether a reference image actually exists.**

| | **MODE A — with a reference image** | **MODE B — no reference image** |
| --- | --- | --- |
| When | The user uploaded a photo, or Stage 1 has been generated | The user has no photo and does not want the two-step flow |
| Engine mode | Image-to-image, the reference as reference image 1 | Text-to-image, one self-contained prompt |
| Identity carried by | The reference image + the lead-in line | The written pet description alone |
| Lead-in line | **Required, verbatim** | **Must not appear.** Never reference an image that does not exist |

### 8.1 The template — both modes share everything after the opening

```text
[MODE A: THE PLACEMENT LEAD-IN, verbatim — Section 8.2]
[MODE B: THE WRITTEN PET DESCRIPTION — Section 8.3]

[THE NEUTRAL STAND, verbatim — Section 1.2]
[or, still-only posts: THE DANCE STAND, Section 1.3, plus exactly one pose line from Section 5.2]

[ENVIRONMENT — the real place, the surface the pet is standing on, three authentic props named and placed, one hero element in the space above the pet]

[CONTACT — what the hind paws are physically doing to that surface: pressing water into concentric ripples, gripping wet stone, denting the rug pile, compressing snow into two prints]

[THE LIGHTING MATCH, verbatim shape — Section 8.4]

[CAMERA — close on a phone main camera held upright, the lens at the standing pet's chest height and tilted down no more than ten degrees, roughly half a metre to one metre away, the standing surface cutting the near foreground as a bright partly out-of-focus edge, the pet centred and filling the middle band with the hero element above]

[THE LOCKED LOOK, verbatim — Section 2.1]

[HARD NEGATIVES, verbatim — Section 2.3]
```

### 8.2 MODE A — the placement lead-in, verbatim, first line of the prompt

⭐ **The prompt MUST state explicitly that the reference pet is being placed into the environment.** This is not optional wording — without it the model invents a new animal and the identity is lost.

```text
Using the uploaded reference image as reference image 1, place THAT EXACT pet into the scene below. Keep its exact breed, coat colour and markings, ear shape, eye colour, face and body proportions identical to the reference — do not restyle, re-age, resize or substitute the animal. Keep it standing upright on its hind legs in the same neutral balanced pose. Only the surroundings change.
```

### 8.3 MODE B — the written pet description, first line of the prompt

Drop the reference lead-in entirely and open with the description instead:

```text
A [SIZE] [SPECIES AND BREED] with [COAT COLOUR, TEXTURE AND SHEEN], [MARKINGS AND WHERE], [EAR SHAPE], [EYE COLOUR AND SIZE], [BUILD], standing balanced upright on its hind legs in a neutral resting pose: body held upright and still, weight even on both hind paws, front paws relaxed and symmetrical at its sides, spine straight, head level, facing the camera.
```

**Make it specific enough to be repeatable.** Then tell the user, in plain words: *"Keep this opening paragraph — paste it verbatim next time and you get the same pet. That's your character lock."*

### 8.4 THE LIGHTING MATCH — required in both modes

A cutout dropped into a scene reads as fake the moment its light does not match. Naming the light direction and forcing a real contact shadow is what makes the placement believable — the same principle as the scale-anchor rule in the Giant Cam and Tiny Dragon builds.

```text
Light the pet to match the scene: [LIGHT DIRECTION + QUALITY + COLOUR], with a true contact shadow where its hind paws meet [SURFACE], and matching reflections in any wet or glossy surface.
```

Worked: *"Light the pet to match the scene: one warm ceiling downlight above and slightly behind the camera, soft-edged and slightly yellow, laying a hot highlight strip along the top of the skull and the shoulders and a soft shadow under the chin and chest, with a true contact shadow where its hind paws meet the wet enamel, and matching reflections of its legs and belly in the shallow water and the glossy tub wall."*

**Fail states this kills:** a pet lit from the left in a room lit from the right · no shadow under the paws · a pet standing in water with no reflection · a crisp studio-lit animal inside a soft-lit room. All four read as a sticker.

### 8.5 The handoff to say out loud

> *"Upload your white reference as the image input, then paste this prompt. Same pet, new world."*

---

## 9. 🌊 AMBIENT MOTION — REQUIRED IN EVERY VIDEO PROMPT, BOTH ROUTES

⭐ **The reference clip animates the *pet*. Nothing animates the *world* unless the prompt says so** — so without this you get a dancing pet standing inside a frozen photograph, which reads instantly as fake.

Name **at least one continuous background motion**, and keep it running for the whole clip:

```text
Background motion, continuous throughout: [AMBIENT MOTION]. It runs for the entire clip and never freezes.
```

### 9.1 🔒 The hard constraint

**The ambient motion must animate something already visible in the still.** Never introduce a new object mid-clip — the model has to invent it, and continuity breaks. If the still has no tap, do not write a running tap. Pick something that **is** in frame.

### 9.2 Ambient motion library — by environment group

| Group | Ambient motions to pick from |
| --- | --- |
| 💦 **Water** | tap running and splashing into the basin · water rippling and sloshing around the paws · foam and bubbles drifting and popping · steam curling up · droplets running down tile · the surface rocking with the beat |
| 🗼 **Travel** | distant traffic crossing the street below · city lights twinkling and flickering · clouds drifting behind the skyline · a flag or awning fluttering · a boat crossing the water · headlights sweeping past |
| 🏠 **Home** | a curtain breathing in a draught · TV screen flickering and colour-shifting · dust motes turning in a sunbeam · a ceiling fan slowly rotating · a washing machine drum spinning behind the glass |
| 🌿 **Outdoors** | grass and leaves swaying in the wind · a car driving past in the background · birds crossing the sky · laundry moving on a line · sprinkler arcing across the lawn |
| ❄️ **Seasonal** | snow falling steadily past · fairy lights twinkling out of focus · a fireplace flickering · leaves blowing across the ground · rain streaking a window behind |

### 9.3 Where it sits, and the sound tie-in

Ambient motion gets **its own line, kept separate from the pet's motion**, so the two never get confused:

```text
[IDENTITY LOCK]
[MOTION SOURCE   — the pet]
[AMBIENT MOTION  — the world: continuous, from something already in frame]
[CAMERA]
[SOUND           — the ambient motion is audible too: running water, passing traffic, wind]
[NEGATIVES       — plus "no frozen background, no still photograph look, nothing in the scene is static"]
```

**Tie the sound to it.** Running water should be heard, a passing car should be heard. A visible motion with no matching sound is its own tell.

**Added to the negatives on every video prompt:** `no frozen background, no still photograph look, nothing in the scene is static`

---

## 10. 📱 THE HANDHELD PHONE-CAM CLAUSE

The clip must read as *a real person filming their pet on a phone* — not a tripod, not a gimbal, not a drone. Static reads as CGI; over-smooth reads as a commercial. **Paste verbatim in every video prompt, both routes.**

```text
Camera: handheld phone footage. Subtle continuous handheld sway and micro-drift the whole clip, tiny reframing corrections as the person keeps the pet centred, a slow gentle push-in, small natural bounce. Never perfectly still, never gimbal-smooth, never a locked-off tripod shot. Slight rolling-shutter wobble and a faint autofocus hunt as the pet moves.
```

**Paired negatives, always appended:**

```text
no tripod-static shot, no gimbal-smooth glide, no drone shot, no crane move, no cinematic dolly, no camera perfectly locked off
```

> This is the video-side twin of the Locked Look. The still sells realism through texture and light; the clip sells it through **camera imperfection**.

---

## 11. 🎬 THE TWO VIDEO ROUTES

### 11.1 ⚠️ Engine constraint — verified against the live OpenArt model list, 2026-08-09

Only the **Seedance** family accepts a reference **VIDEO** as an element on OpenArt.

| Model | `element2video` accepts | Reference-video motion transfer |
| --- | --- | --- |
| `byte-plus-seedance-2` / `-2-fast` / `-2-mini` / `-2-5` | image, **video**, audio | ✅ supported |
| `kling-3-omni` | image only | ❌ not supported |
| `wan2-7` | image only | ❌ not supported |
| `grok-imagine-1-5` | image2video only | ❌ not supported |
| `pixverseV6` | image only | ❌ not supported |

**Never name Google Veo — it is not available on OpenArt.** Engines are named in chat only, never inside a prompt body.

*(The Seedance moderation block recorded in `Memory/CHANGELOG.md` was specific to the Pimple ASMR **content category**, skin extraction — not to the model. Dancing pets are unaffected.)*

### 11.2 The two routes, as the user sees them

```text
🎬 A — WITH your dance clip  (recommended)  → Seedance 2.0, image + video elements
        prompt = identity lock + "follow the reference video exactly" + ambient motion
        + camera + sound + negatives.  NO written choreography.

🎬 B — WITHOUT a dance clip                  → Kling 3.0 or Wan 2.7, the still as the start frame
        prompt = identity lock + a written beat-by-beat dance with real timestamps
        + ambient motion + camera + sound + negatives.
```

**Say which route is running, every single time, and say exactly what the user uploads where.** Route B is the only case where the choreography gets written out.

### 11.3 🎬 ROUTE A — with a dance clip (the format as designed)

**Say this, verbatim in spirit, every time:**
> *"Upload your placement image as the subject reference AND your dance clip as the motion reference, then paste this prompt."*

```text
Keep the exact pet from the start frame — same species and breed, same coat colour and markings, same ear shape, same eye colour and face, same body proportions, same belly and tail. Do not restyle, re-age or change the animal in any way. The environment, the props, the surface and the lighting stay exactly as they are in the start frame. Only the motion is new.

Follow the motion of the reference video exactly — the pet performs that same dance, beat for beat, with the same timing and rhythm. Do not invent, add or vary the movement.

Background motion, continuous throughout: [AMBIENT MOTION — Section 9, something already visible in the start frame]. It runs for the entire clip and never freezes.

[THE ANATOMY GUARD, verbatim — Section 1.4]

[THE HANDHELD PHONE-CAM CLAUSE, verbatim — Section 10]

Dialogue: none - the pet does not speak in this clip.

Sound: diegetic only - [the real sounds of that surface and that ambient motion: wet hind paws slapping the enamel on the beat, the tap running and splashing, water sloshing against the tub wall, claws ticking on stone, a tag jingling, faint room tone]. no background music, no soundtrack, no score, no narrator.

[THE LOCKED LOOK, verbatim — Section 2.1]

[HARD NEGATIVES, verbatim — Section 2.3], no frozen background, no still photograph look, nothing in the scene is static, no tripod-static shot, no gimbal-smooth glide, no drone shot, no crane move, no cinematic dolly, no camera perfectly locked off, no slow motion, no speed ramp, no cuts
```

**ABSOLUTELY NO WRITTEN CHOREOGRAPHY IN ROUTE A.** No beats, no timestamps for movement, no "then it raises a paw". The reference video owns the timing. Describing the motion anyway is a real, reproducible failure: the model blends the written beats with the transferred motion and both degrade.

### 11.4 🎬 ROUTE B — no dance clip

**Say this every time:**
> *"Upload your placement image as the start frame, then paste this prompt. No dance clip needed — the beats are written in."*

```text
Keep the exact pet from the start frame — same species and breed, same coat colour and markings, same ear shape, same eye colour and face, same body proportions, same belly and tail. Do not restyle, re-age or change the animal in any way. The environment, the props, the surface and the lighting stay exactly as they are in the start frame. Only the motion is new.

00:00-00:02  The pet is already upright and settled on both hind paws; it takes the first beat with a small dip of the knees, the ears lift and one foreleg starts to swing out.
00:02-00:04  The swing commits: one forearm folds in against the chest while the other rises out to shoulder height, the hips turn one way and the shoulders counter-turn, one hind paw lifts a few centimetres and re-plants.
00:04-00:06  The peak beat: the outer foreleg reaches up past the head with the paw open, the spine leans back, the head tilts and the chin lifts, the tail whips across behind.
00:06-00:08  The pet drops back into the exact opening position of the start frame, both forelegs low and loose, hind paws flat and settled, head level and locked on the lens, ready to loop.

Background motion, continuous throughout: [AMBIENT MOTION — Section 9, something already visible in the start frame]. It runs for the entire clip and never freezes.

[THE ANATOMY GUARD, verbatim — Section 1.4]

[THE HANDHELD PHONE-CAM CLAUSE, verbatim — Section 10]

Dialogue: none - the pet does not speak in this clip.

Sound: diegetic only - [the real sounds of that surface and that ambient motion]. no background music, no soundtrack, no score, no narrator.

[THE LOCKED LOOK, verbatim — Section 2.1]

[HARD NEGATIVES, verbatim — Section 2.3], no frozen background, no still photograph look, nothing in the scene is static, no tripod-static shot, no gimbal-smooth glide, no drone shot, no crane move, no cinematic dolly, no camera perfectly locked off, no slow motion, no speed ramp, no cuts
```

### 11.5 Video rules that hold on both routes

- **Always include the Dialogue block.** Default `Dialogue: none - the pet does not speak in this clip.` Never silently drop the field. If the user wants a voice line, timestamp it: `[NAME] (00:03): "[one short line]"`, spoken only, never rendered on screen.
- **Always write the literal keyword `no background music`**, plus `no soundtrack, no score, no narrator`. A dance clip is the single strongest music-hallucination trigger there is, so this line does more work here than anywhere else.
- **The beat lives in the diegetic sound.** Wet paws slapping porcelain, claws ticking on stone, a bottle rattling on the rim, a tag jingling. That is what replaces the music, and it is what makes the rhythm read.
- **Ambient motion is never optional**, on either route.
- **Route B only: beat 4 returns to beat 1.** The clip is a loop. The still is the moment the loop passes through, not a separate pose.
- **Timestamps on Route B are real clock ranges** — `00:00-00:02` — never "then" or "next". For a longer clip, keep four beats and stretch the ranges.

### 11.6 ⚠️ Deliberate deviation — do not "fix" this back

`Memory/INSTRUCTION_PATTERNS.md` requires every video prompt to carry **real clock timestamps**, a **Dialogue block** and the literal **`no background music`**.

**On Route A the choreography timestamps are dropped on purpose.** The reference video owns the timing, so written beats would conflict with the transferred motion and degrade both. This is a considered exception, not an oversight.

**The Dialogue block and the `no background music` keyword still apply on Route A and are non-negotiable.** Route B carries all three as normal.

---

## 12. ✨ WORKED EXAMPLE

Path: 🐾 choose pet · Beagle · neutral stand · Environment 1 Bathtub · 🎬 Route A.

### 12.1 Stage 1 — the white reference

```text
CHARACTER LOCK — Biscuit
A real adult tricolour Beagle with a short dense white, black and tan coat, a black saddle across the back, tan over the shoulders, cheeks and eyebrows, a white blaze running up the muzzle between the eyes, white chest, white front legs and a white tail tip, long soft drop ears set low and hanging flat beside the cheeks, a square tan-and-black muzzle with a broad wet black nose, round warm-brown eyes with a permanently hopeful expression, a sturdy barrel-chested build on short straight legs, a moderately long tail carried up in a loose curve, a pale white-and-pink underside with sparse hair on the lower belly, no collar.

The dog stands upright on its own two hind legs in a neutral resting stance, held upright and completely still, balanced exactly the way a real dog balances when it sits up or stands at a table. Hind legs carrying the weight evenly between them, both hind paws flat on the surface about shoulder-width apart, pads pressing down with a true contact shadow, hock and stifle naturally bent the way a real dog's are, never straight human legs. Pelvis under the body, spine straight, chest lifted, belly turned toward the lens. Both front legs are real dog forelegs, relaxed and symmetrical, hanging loose and low at the sides of the chest with the elbows softly bent and the wrists limp so the paws droop naturally, real toes, real claws and real pads visible. Nothing is raised, nothing is reaching, nothing is mid-swing. The head is a completely real unmodified dog head of the exact species and breed in the character lock, carried level on an upright neck, facing the camera calmly, with real fur, real ears, real moist eyes and a real wet nose. This is a real dog's own body and anatomy simply balanced on two legs, not anthropomorphic: no human torso, no human shoulders, no human arms, no human hands, no humanoid proportions, exactly four real dog limbs and no more, every joint bending the way a real dog's joints bend.

Background: a pure solid flat white sweep filling the entire background, completely even and featureless, with no floor line, no horizon, no corner, no wall, no gradient and no vignette. The only shadow anywhere in the frame is a small soft contact shadow directly beneath the hind paws where they press the surface.

Framing: the whole animal inside the frame from the tips of the ears to the hind paws with an even margin of white all around it, nothing cropped and nothing touching the edge, the animal centred and standing at full height, the whole animal sharp from nose to hind paws.

Photoreal studio reference photograph: a real living animal, real fur in individual strands with natural sheen, real moist eyes with true catchlights, a real wet nose, real paw pads and real claws, correct real animal anatomy under the coat. Clean even soft studio light from the front with no harsh shadow on the animal, the whole animal sharp from nose to hind paws with no shallow-focus falloff, natural true-to-life colour, fine natural detail with no grading and no beautification. Looks exactly like a real photograph of a real animal, not a render and not an illustration.

not a cartoon, not anime, not an illustration, not a painting, not CGI, not a 3D render, not a game engine render, no plastic or waxy fur, no glossy render sheen, no toy or plush or figurine look, no HDR overcook, no teal-and-orange grade, no advertisement look, no pasted-on cutout compositing, no humanoid or anthropomorphic body, no human torso, no human shoulders, no human arms, no human hands, no human face or human eyes, no animal head on a human body, no mascot costume, no person in an animal suit, no costume seam or zipper at the neck, no extra limbs or distorted anatomy, no bent or broken hind legs, no floating or hovering paws, no stage, no dance floor, no spotlight, no clothing, no collar unless stated, no captions, no subtitles, no on-screen text, no watermark, no logo, no floor line, no horizon line, no visible wall or corner, no gradient or vignette on the background, no grey or coloured backdrop, no props, no furniture, no shadow cast onto the backdrop, no cropping of the head, paws or tail, no shallow depth of field, no blur on any part of the animal
```

### 12.2 Stage 2 — the placement, Mode A

```text
Using the uploaded reference image as reference image 1, place THAT EXACT pet into the scene below. Keep its exact breed, coat colour and markings, ear shape, eye colour, face and body proportions identical to the reference — do not restyle, re-age, resize or substitute the animal. Keep it standing upright on its hind legs in the same neutral balanced pose. Only the surroundings change.

[THE NEUTRAL STAND, verbatim — as pasted in 12.1]

Standing in five centimetres of still, faintly cloudy water on the floor of a white enamel bathtub set into a corner, concentric ripple rings radiating outward from each hind paw, a tall black body-wash bottle, a red shower-gel bottle and a white shampoo bottle with a gold cap standing on the wide tub rim, water droplets and a chalky scum line on the enamel, a warm painted wall meeting the tiled corner in the space above the pet.

Contact: both hind paws press flat into the shallow water with concentric ripple rings radiating outward from each one and a dark wet line up the fur of the lower legs.

Light the pet to match the scene: one warm ceiling downlight above and slightly behind the camera, soft-edged and slightly yellow, laying a hot highlight strip along the top of the skull and the shoulders and a soft shadow under the chin and chest, with a true contact shadow where its hind paws meet the wet enamel, and matching reflections of its legs and belly in the shallow water and the glossy tub wall.

Camera: close on a phone main camera held upright, the lens at the standing pet's chest height and tilted down about eight degrees, roughly seventy centimetres away, the near tub rim cutting the foreground as a bright partly out-of-focus edge, the pet centred and filling the middle band with the tiled corner above.

Photoreal handheld phone realism: a real living animal, real fur in individual strands with natural sheen, real moist eyes with true catchlights, a real wet nose, real paw pads and real claws, correct real animal anatomy under the coat. Ordinary available light only, never studio or stage lighting, soft realistic shadows and a true contact shadow where the hind paws press the surface. Phone main camera, mild wide-angle perspective, faint handheld shake, slight motion blur only on whichever limb is actually moving while the face and torso stay sharp. Straight-out-of-phone grade: auto exposure, crushed blacks, slightly hot highlights, mild sharpening halos, subtle sensor grain, natural true-to-life colour with no grading. Looks exactly like an unedited photo someone took of their own real pet.

[HARD NEGATIVES, verbatim — Section 2.3]
```

### 12.3 Stage 3 — the clip, Route A

> *"Upload the bathtub image as the subject reference AND your dance clip as the motion reference, then paste this prompt."*

```text
Keep the exact pet from the start frame — same tricolour Beagle, same black saddle and tan shoulders, same white blaze and white chest, same long low drop ears, same warm-brown eyes, same sturdy build on short legs, same tail and same pale underside. Do not restyle, re-age or change the animal in any way. The bathtub, the shallow water, the three bottles on the rim, the tiled corner and the ceiling light stay exactly as they are in the start frame. Only the motion is new.

Follow the motion of the reference video exactly — the pet performs that same dance, beat for beat, with the same timing and rhythm. Do not invent, add or vary the movement.

Background motion, continuous throughout: the water in the tub rippling and sloshing around the hind paws with the ripple rings running out and slapping back off the enamel wall, and a few small bubbles drifting and popping on the surface. It runs for the entire clip and never freezes.

[THE ANATOMY GUARD, verbatim — Section 1.4, with dog as the species]

Camera: handheld phone footage. Subtle continuous handheld sway and micro-drift the whole clip, tiny reframing corrections as the person keeps the pet centred, a slow gentle push-in, small natural bounce. Never perfectly still, never gimbal-smooth, never a locked-off tripod shot. Slight rolling-shutter wobble and a faint autofocus hunt as the pet moves.

Dialogue: none - the pet does not speak in this clip.

Sound: diegetic only - wet hind paws slapping the enamel on the beat, water sloshing and ripples slapping the tub wall, claws ticking on the tub floor, a plastic bottle rattling on the rim, a real snort and a wet shake of the ears, faint tiled-bathroom room tone. no background music, no soundtrack, no score, no narrator.

[HARD NEGATIVES, verbatim — Section 2.3], no frozen background, no still photograph look, nothing in the scene is static, no tripod-static shot, no gimbal-smooth glide, no drone shot, no crane move, no cinematic dolly, no camera perfectly locked off, no slow motion, no speed ramp, no cuts
```

---

## 13. 🚀 THE FOUR CONVERSATION STARTERS AND THEIR HANDLERS

Fixed at four — ChatGPT's maximum. `▶️ Start` was dropped because `🐾 Choose pet` already is the start.

```text
🐕 My own pet
🐾 Choose pet
🌍 Choose environment
📚 Get more skills
```

**Each MUST have an explicit handler branch in the controller, or tapping one produces a confused reply.**

| Starter | Handler | Output |
| --- | --- | --- |
| 🐕 **My own pet** | Ask **only** for the photo, then stop. No menus, no prompt yet. Read the image, write the Character Lock from what is actually visible, show it back, continue to environment. Escape route: `no photo` → hand off to 🐾 Choose pet. | A Character Lock, then Stage 2 Mode A |
| 🐾 **Choose pet** | Numbered pet menu (§4.2), **`more`** for a fresh set (§4.3), free text for anything not listed. | **The Stage 1 white reference image** (§7) |
| 🌍 **Choose environment** | Jump straight to the environment menu (§6) — 💦 Water default · 🗼 Travel · 🏠 Home · 🌿 Outdoors · ❄️ Seasonal — plus **`more`** and free text. Backfill the pet afterwards if it is not set yet. | Stage 2 placement (§8) |
| 📚 **Get more skills** | **CTA, not a build request.** Do NOT attempt an image. A few lines only: a short friendly pointer to the Agent Skills Library as embedded Markdown — `https://aicenturies.com/agent-skills-library/` — then offer to start a pet image. | A link and an offer |

> ⚠️ **If tapping 📚 Get more skills starts building an image, the controller is broken.** It is the one starter that is a link, not a workflow, and it needs its own branch. Everything else in this build routes into the pipeline; this one routes out of it.

**Every prompt-bearing reply also carries the §17 footer**, so the Agent Skills Library link appears there too. That is not a substitute for the handler — the starter needs a real answer of its own.

---

## 14. 🛠️ DRIFT GUARD TABLE

| Symptom | Cause | The counter |
| --- | --- | --- |
| 🧍 The pet has a human torso, shoulders or hands | "upright" and "dancing" retrieve mascots, cartoon characters and people in animal suits | Paste **THE STAND verbatim** and never say "front paws used as hands" — say **real forelegs with real toes, real claws and real pads visible** |
| 🦴 Hind legs bend backwards, double up, or a fifth leg appears | The model has almost no real photos of a load-bearing bipedal animal | Name the mechanics — **flat, shoulder-width apart, pads pressing down, hock and stifle naturally bent** — and keep **no extra limbs or distorted anatomy, no bent or broken hind legs** in the negatives |
| 🧸 The pet looks plush, plastic or like a figurine | Words like "cute", "adorable", "character" or "mascot" leaked into the prompt body | Delete them all; say the **real species and breed name plus a real fur description**, and keep *real fur in individual strands with natural sheen* in the Locked Look |
| 🏬 The place looks like a showroom, a studio or a stage | No clutter named, or a dance-coded word crept in | Name **three real messy props** in every environment line, and ban **stage, dance floor, studio, spotlight, seamless backdrop** *(Stage 1 excepted)* |
| 🐕🦺 The head gets restyled, stylised or slightly human | Dance prompts pull mascot and music-video training data hard, and the face creeps first | Keep the **completely real unmodified head** clause in every prompt and every clip; hard-negate **no human face, no human eyes, no animal head on a human body, no mascot costume, no costume seam or zipper at the neck** |
| 🩹 The pet looks pasted on / like a sticker | The lighting-match sentence was skipped in Stage 2 | Fill **§8.4** — name the light direction, quality and colour, force a **true contact shadow**, and add **matching reflections in wet or glossy surfaces** |
| 🐩 Stage 2 returns a *different* animal | The Mode A lead-in was missing, softened or paraphrased | Paste **§8.2 verbatim as the first line**. "Use the reference" is not enough — it must say *place THAT EXACT pet into the scene below* |
| 👻 A prompt references an image that does not exist | Mode A wording used on a no-reference build | Switch to **Mode B (§8.3)**. Never write "the uploaded reference image" when nothing was uploaded |
| 🕺 The transferred dance comes out mushy or blended | The still was already frozen mid-dance, or choreography was written into a Route A prompt | Use **the neutral stand (§1.2)** for anything that will be animated, and strip every written beat from Route A |
| 🧊 A dancing pet inside a frozen photograph | No ambient motion named | Add **§9** — one continuous background motion, from something **already visible** in the still, plus **no frozen background, no still photograph look, nothing in the scene is static** |
| 🫥 A new object appears mid-clip | Ambient motion named something that was not in the start frame | Pick a motion from what is **actually in the still**. No tap in frame, no running tap in the prompt |
| 💧 The water looks like glass, gel or CGI | Water described as "water" and nothing else | Say what it is doing: **concentric ripple rings radiating from each hind paw**, **opaque aerated white froth**, **a raised meniscus at the wall**, **a chalky scum line**, **a dark wet line up the leg fur** |
| 🎈 The pet floats an inch above the surface | Nothing connects the paws to the floor | Fill the **CONTACT** slot in every placement prompt, and keep *a true contact shadow where the hind paws press the surface* in the Locked Look |
| 😐 The whole frame is uniformly blurry, or nothing is | Blur asked for globally, or not at all | **Selective blur only** — the moving limb smears, the face, torso and background stay sharp. Stage 1 is sharp everywhere |
| 🎬 The clip is locked-off, gimbal-smooth, or cuts | "cinematic" energy, or the camera clause was paraphrased | Paste **§10 verbatim** and keep **no slow motion, no speed ramp, no cuts, no gimbal-smooth glide, no camera perfectly locked off** |
| 🎵 The clip hallucinates a soundtrack | A dance clip is the single strongest music trigger there is | Keep the literal **`no background music`** plus `no soundtrack, no score, no narrator`, and put the beat in the **diegetic paw-taps** instead |
| 🛑 The engine ignores the dance clip entirely | Route A was run on Kling or Wan, which take image elements only | Route A is **Seedance** only. On Kling 3.0 or Wan 2.7, switch to **Route B** and write the beats |
| ✏️ Text, a caption or a watermark appears | Reference clips carry platform overlays; "TikTok" or "viral" in the prompt | Never name a platform in a prompt body; keep **no captions, no subtitles, no on-screen text, no watermark, no logo** on image *and* video |
| 📐 The generator crops the shot oddly | A ratio or frame-shape word leaked in | Never write a ratio or a frame-shape word. Say **held upright**, **fills the frame**, **the space above the pet** |

---

## 15. ✅ QC CHECKLIST

**Pose and identity**
- [ ] The still uses **THE NEUTRAL STAND (§1.2)** unless the user explicitly asked for a still-only dance pose.
- [ ] If a dance pose was used, the still-only trade-off was said out loud in one line.
- [ ] **Exactly one** stand block per prompt — never the neutral stand and a dance pose together.
- [ ] The species token was substituted consistently, and nothing else in the block was changed.
- [ ] **CHARACTER LOCK** written once and reused word-for-word across all three stages.
- [ ] Upload path: nothing was prettified, invented or removed from the real animal.

**Stage 1**
- [ ] Pure solid white sweep, no floor line, no gradient, no props, no backdrop shadow.
- [ ] Only a small soft contact shadow under the paws.
- [ ] Full body inside the frame, even margin, nothing cropped, whole animal sharp.
- [ ] **THE WHITE-SWEEP LOOK (§2.2)** used, not the handheld Locked Look.
- [ ] Stage 1 negatives: the two phrases in §2.4 removed, the Stage 1 extras added.

**Stage 2**
- [ ] Correct mode chosen: **Mode A** only if a reference image genuinely exists.
- [ ] Mode A leads with **§8.2 verbatim**, as the first line.
- [ ] Mode B contains **no reference to any image**, and opens with a description specific enough to reuse verbatim.
- [ ] Mode B told the user the description is their character lock.
- [ ] The **LIGHTING MATCH sentence (§8.4)** is present: direction, quality, colour, true contact shadow, reflections.
- [ ] Environment names **three authentic props** and reserves the space above the pet for one hero element.
- [ ] The **CONTACT** slot is filled.
- [ ] Camera clause gives height, distance, tilt and the bright foreground surface edge.
- [ ] **THE LOCKED LOOK (§2.1)** closes the body, negatives follow as the final line.

**Video**
- [ ] The route was **named out loud**, and the user was told exactly what to upload where.
- [ ] Route A: **no written choreography, no movement timestamps.** Route B: real clock timestamps, four beats, loop-ready.
- [ ] **THE ANATOMY GUARD (§1.4)** pasted verbatim.
- [ ] **AMBIENT MOTION (§9)** named, continuous, and animating something **already visible** in the still.
- [ ] **THE HANDHELD PHONE-CAM CLAUSE (§10)** pasted verbatim, with its paired negatives.
- [ ] **Dialogue block** present — a timestamped spoken line, or `Dialogue: none`.
- [ ] Sound line contains the literal **`no background music`** plus `no soundtrack, no score, no narrator`, and ties a sound to the ambient motion.
- [ ] Negatives include **no frozen background, no still photograph look, nothing in the scene is static**.
- [ ] Seedance named for Route A; Kling 3.0 or Wan 2.7 for Route B; **Veo never named**.

**House rules**
- [ ] **No ratio, orientation or frame-shape word** anywhere in any prompt body — not even to negate one. Say *held upright*, *fills the frame*, *the space above the pet*.
- [ ] **No captions, subtitles or on-screen text** requested anywhere; all three stay in the negatives.
- [ ] **No engine, tool or model name** inside a prompt body.
- [ ] **No emoji** inside a prompt body.
- [ ] **No banned adjectives** inside a prompt body — cute, adorable, funny, character, mascot, meme, groovy, sassy, silly, quirky, busting a move, or any named dance trend.
- [ ] Every prompt sits in its own fenced text block under a clear heading.
- [ ] Every menu ends with *"Pick a number, type your own, or type More."*
- [ ] All four conversation starters have a working handler, and 📚 **Get more skills never starts a build**.
- [ ] The response ends with the three embedded footer links.

---

## 16. ⚖️ IP AND SAFETY

- **Real pets, owner's own photo only.** The upload path is for the user's own animal, or one they have permission to use. Never build a likeness from a description of someone else's account, and never claim to have seen a photo that was not attached.
- **Never invent the user's pet.** If no photo arrives, offer the menu path. Do not guess markings, do not "improve" a coat, do not remove a scar, a grey muzzle or a missing eye — those are the animal.
- **Never reproduce a source creator's watermark, handle, username or channel branding.** Overlays visible in any reference clip are platform artefacts, not part of the look. They stay in the negatives, permanently.
- **No real people.** No recognisable private individual's face. If a human is unavoidable, keep them anonymous at the extreme edge of frame — a hand, a leg, an out-of-focus body.
- **No named public figures, no brand mascots, no copyrighted characters, no logos designed into the shot.** A real everyday product sitting where someone left it is fine; a brand endorsement is not.
- **Kind comedy only.** The animal is standing up because it wants to, the way real pets beg. Never show a pet held up, propped, tied, strung, forced, distressed, injured or in danger. No deep or moving water above the hocks, no unsafe ledge with a real fall behind it framed as a hazard, no gore, nothing sexual.
- **Species welfare.** Do not stand up an animal that cannot physically do it comfortably in real life for more than a moment, and never put a reptile, bird or small pet in water it would not choose.
- **No costumes, no clothing, no accessories** unless the user explicitly asks — and never anything that would restrict a real animal.
- **Disclose the fiction.** This is a generated image of a real-looking animal. Never present output as documentary footage of a real event.

---

## 17. 🔗 FOOTER — the final section of EVERY response

The final section is the three links of the CRITICAL RULE at the end of the agent's instructions, word for word. Every response, no exceptions.

---

## 18. 📌 DELIBERATE DEVIATIONS REGISTER

Four things in this bible look like mistakes against the house standard and are not. Do not revert them.

| # | Deviation | House rule it bends | Why it is deliberate |
| --- | --- | --- | --- |
| 1 | **Route A carries no choreography timestamps** | `INSTRUCTION_PATTERNS.md` — every video prompt carries real clock timestamps | The reference video owns the timing. Written beats blend with transferred motion and degrade both. The Dialogue block and `no background music` still apply. |
| 2 | **The default still is a symmetrical, motionless pose** | §5.2 — "never symmetric" | That rule governs *dance* poses, where symmetry kills the motion. The neutral stand is a reference pose; symmetry is exactly what makes it a good identity anchor and a clean start frame. |
| 3 | **Stage 1 is a clean studio shot on a seamless backdrop** | §2.1 and §6.6 — never studio lighting, never a seamless backdrop, always real clutter | Stage 1 is not a post. It is a cut-out-ready identity reference. It carries its own look clause (§2.2) and its own negatives (§2.4), and two negatives come off for it. |
| 4 | **Two Locked Look clauses instead of one** | "one invariant text, appended unchanged to every prompt" | A studio white sweep and a lived-in room cannot share one grade clause without folding situational wording into an invariant block — which is the thing that rule exists to prevent. Each stage has exactly one, and neither ever changes. |