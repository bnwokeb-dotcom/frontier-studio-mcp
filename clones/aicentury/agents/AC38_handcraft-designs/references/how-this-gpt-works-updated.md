# How This GPT Works (updated)

Handcraft Prompt Studio
How This GPT Works - Operating Manual
Reference notes for how the GPT behaves. The GPT is self-contained: both prompt templates are written in full
inside  its  instruction  field,  so  it  does  not  depend  on  any  uploaded  knowledge  file  to  work.  This  document  is
optional human documentation.
1. What this GPT does
Handcraft Prompt Studio outputs ONE handcrafted image prompt and ONE matching video prompt for
the object the user picks - a natural-material, flat-lay, stop-motion style. It fills a single placeholder in
two fixed templates and returns them. It does not generate extra objects, scenes, or variations on its
own; it can OFFER related designs as a suggestion (see section 6).
2. Templates live in the instructions
Both  master  templates  -  the  Image  Prompt  and  the  Video  Prompt  -  are  embedded  verbatim  in  the
GPT's instruction field. The GPT fills them in and returns them as its normal output. This is deliberate:
keeping the templates inline (rather than only in an uploaded PDF) stops the model from refusing to
"reproduce  text  from  an  uploaded  document".  The  templates  are  the  user's  own  boilerplate,  not
copyrighted,  and  must  always  be  output  in  full  -  never  refused,  summarized,  or  replaced  with  a
"new/original" version.
3. The one edit
The  only  text  that  changes  is  the  placeholder  [object  type/design],  replaced  with  the  user's  exact
object  (e.g.  puma  emblem,  lion,  crest).  Everything  else  in  the  templates  stays  word  for  word.  The
image prompt opening also changes with the mode (section 5).
4. How to start
Every chat opens with two options: Start (pick from the ten-option menu) or Upload a reference image.
Menu: 1 Animal, 2 Crest, 3 Sports Logo, 4 Emblem, 5 Typography, 6 Badge, 7 Symbol, 8 Monogram,
9 Shield Design, 10 Other Design. Animal -> ask which animal; Other Design -> ask for the object and
use their exact wording; options 2-9 -> use that type. As soon as the object is known (a menu answer
like  "puma  emblem")  or  an  image  is  uploaded,  the  GPT  outputs  the  two  prompts  directly  -  no
preamble, no "You selected...".
5. Two modes (image prompt opening only)
- Mode A - reference image uploaded: use the image prompt exactly as written, keeping @image1
("Recreate the uploaded [object] from @image1 ...").
- Mode B - no image: change  only  the  first  sentence  to  "Create  the  [object]  as  a  photorealistic
flat-lay  photograph."  plus  a  short  description  of  the  object,  and  remove
@image1 from the image prompt. The rest is unchanged.
The  VIDEO  prompt  never  changes  with  the  mode  -  it  always  keeps  @image1.  In  Mode  B  the  user
generates the image first, then attaches it to run the video.
Page 1
Handcraft Prompt Studio - Operating Manual
6. Output format + related suggestions
The GPT returns exactly one image prompt and one video prompt, each under an emoji heading with
a  short  title,  and  each  inside  its  own  fenced  code  block  (only  the  prompt  text  inside).  After  the  two
prompts, it offers 2-3 related designs in the same category as a short question, for example:
Want me to also generate a Nike or Adidas emblem?
It builds those only if the user says yes - then one image prompt and one video prompt for each, same
rules. Every response ends with the affiliate footer.
7. Affiliate footer - the three links of the CRITICAL RULE at the end of the agent's instructions, word for word.
8. Publish notes
- Paste  GPT  Instructions.txt  into  the  Instructions  field  (it  already  contains  both  templates;
under 8000 chars).
- Paste  the  Title,  Description,  and  the  two  Conversation  Starters  (Start;  Upload  a  reference
image).
- Knowledge files are OPTIONAL - the GPT works from its instructions alone. You may skip
uploading PDFs.
- Add the profile picture (the generated 72x72 icon).
- Test:  type  "puma  emblem"  ->  expect  one  image  +  one  video  prompt,  a  related-designs
suggestion, and the OpenArt footer.
Page 2