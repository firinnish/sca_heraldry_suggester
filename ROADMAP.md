# Roadmap

What is built, and what the maintainer has asked for next. Decisions recorded
here were made with the maintainer; add to it as things are decided.

## Built

- **Background (field):** tick the colours, pick how it is divided (16
  two-part divisions, per pall and per pall inverted, or the "more complex
  background" builder for a part that is itself divided). Furs: ermine,
  counter-ermine, erminois, pean.
- **Primary charge:** "What is the primary charge?" with a picker: ordinaries
  (drawn by the code), charges we have pictures of, and every other charge by
  name (drawn as a blob). Choose how many (1 to 3) and the colour.
- **Current shield** shown in a column on the right (one third of the page)
  with its blazon and the filled-in Complex Search Form link; questions and
  options on the left. The same layout is meant to serve creation as well as
  search.
- **Charge pictures:** recoloured into any tincture or fur; drawn as large as
  their space allows, then shrunk to 95% so they never touch its edge;
  mirrored or turned over as needed (one picture serves both ways up).
- **Arrangement defaults** (confirmed by the maintainer as the correct
  heraldic defaults): one in the middle, two side by side, three "two and one".
- **Checks:** every search pattern is compared with real O&A records
  (`tests/`), and every picture is drawn in every tincture (`tests/charges.html`).

## Next, in the maintainer's words (November 2026)

1. **Secondary and tertiary charges, kept friendly.** Don't make people know
   what "primary", "secondary" or "tertiary" mean. Ask "what charges are on
   the field?" and, if they pick for example a lion and a chevron, show the
   possibilities as pictures to choose from: the lion secondary (three lions
   around a chevron) and the lion tertiary (a lion ON the chevron). Also a
   "herald mode" switch for people who do know, to say directly which charge
   is primary / secondary.
2. **Charges fill the space they are actually in.** Alone on the field: 95%
   of the shield (done). Inside a bordure or orle: 95% of the space inside
   it, never touching it. The same idea for any other space (beside or on an
   ordinary). The fitting code already works from "a space"; what is missing
   is working out the space left by the other things on the shield.
3. **Use your own picture.** Let people pick a charge picture from their own
   computer to see how it fits on the shield (it stays on their machine).
   Warn them it must be a PNG with a transparent background, cropped close,
   white with black outlines, or it won't work. (`loadPicture` in
   `core/art.js` already accepts any picture; the page needs the file picker
   and the warning.)
4. **More furs:** vair and the other SCA furs. (The maintainer also mentioned
   "jaguar" from memory: to confirm what was meant.) Vair is indexed
   differently by the O&A (`FIELD TREATMENT-VAIRY`, `FIELD:solid:vair`), so
   check real records first.
5. **Field treatments,** e.g. masoned. (Barry and chevronelly are already
   there as divisions.) The O&A has `FIELD TREATMENT-...` categories in
   my.cat.
6. **Complex lines,** e.g. per bend wavy. The shield description already has
   a `line` on every division; the O&A's line words are in my.cat (`wavy`,
   `embattled`, `indented`, ...). Needs the drawing, the picker, and the
   search coding.
7. **Arrangements.** The default for three charges is two and one; if the
   user says "in pale" (or in fess, in bend...), arrange them that way and
   put it in the Complex Search. The O&A indexes these as their own lines,
   e.g. `INPALE:3:or:g3pa`, `ARRANGEMENT-IN FESS:3:argent:g3pa`.

## Smaller things noted along the way

- More than three charges in a group; diminutives of ordinaries (two bars,
  three pallets) with their O&A numbers.
- Posture choices beyond what a picture shows, "inverted" and "facing
  sinister" switches in the picker (the drawing and blazon already support
  them).
- The plain chevron and bend sinister search codes come from my.cat but could
  not be confirmed against a real record (there is no registered armory that
  is only that on a plain field).
- Move `apps/suggester/heraldry_mvp.html` onto `core/`.
