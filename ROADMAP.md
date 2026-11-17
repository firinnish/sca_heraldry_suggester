# Roadmap

What is built, and what the maintainer has asked for next. Decisions recorded
here were made with the maintainer; add to it as things are decided.

## Built

- **One page for searching and building** (`apps/search`): questions top left,
  the shield being built top right, random suggestions along the bottom.
  Every question is always shown; anything not answered is "not chosen yet".
- **Colours:** "What colours are used in the shield?" (colours and metals shown
  as separate sets, then furs), then "What colours are used in the background?".
- **Background:** 16 two-tincture divisions, per pall and per pall inverted,
  plain, and the "more complex background" form. Furs: ermine, counter-ermine,
  erminois, pean.
- **Primary charge:** ordinaries (drawn by the code), charges with pictures,
  every other charge by name (drawn as a blob); how many (1 to 3); its colour,
  including counterchanged.
- **Rules from SENA** (`core/rules.js`): contrast for divided fields, charges
  against the part of the field they lie on, counterchanging, chief/base with
  per fess, too-simple designs, complexity count. Forbidden options are greyed
  with the reason. "I'm a herald and I know what I'm doing" unlocks them.
- **Suggestions:** random legal shields within whatever has been chosen;
  re-randomised when a choice changes; "pin suggestion" and "select this shield".
- **Charge pictures:** recoloured into any tincture or fur; centred in their
  space, then drawn as large as fits and shrunk to 95%; turned over or mirrored
  as needed (one picture serves both ways up).
- **Arrangement defaults** (confirmed by the maintainer): one in the middle,
  two side by side, three "two and one".
- **Search coding** checked against real O&A records, including counterchanged
  charges and field-only armory.

## Next, in the maintainer's words

1. **Secondary and tertiary charges, kept friendly.** Don't make people know
   what "primary", "secondary" or "tertiary" mean. Ask "what charges are on
   the field?" and, if they pick for example a lion and a chevron, show the
   possibilities as pictures to choose from: the lion secondary (three lions
   around a chevron) and the lion tertiary (a lion ON the chevron). "Herald
   mode" lets people say directly which is which. SENA Appendix J lists which
   combinations of charge groups are allowed.
2. **Charges fill the space they are actually in.** Inside a bordure or orle:
   95% of the space inside it, never touching it. The same for any other space
   (beside or on an ordinary). `layout.js` already works from "a space"; what
   is missing is working out the space left by the other things on the shield.
3. **Use your own picture.** Let people pick a charge picture from their own
   computer to see how it fits (it stays on their machine). Warn them it must
   be a PNG with a transparent background, cropped close, white with black
   outlines, or it won't work. (`loadPicture` in `core/art.js` already accepts
   any picture; the page needs the file picker and the warning.)
4. **More furs:** vair and the other SCA furs. (The maintainer also mentioned
   "jaguar" from memory: to confirm what was meant.) SENA treats vair and
   potent as neutral; the O&A indexes vair differently
   (`FIELD TREATMENT-VAIRY`, `FIELD:solid:vair`), so check real records first.
5. **Field treatments,** e.g. masoned. The O&A has `FIELD TREATMENT-...`
   categories in my.cat.
6. **Complex lines,** e.g. per bend wavy. The shield description already has
   a `line` on every division; the O&A's line words are in my.cat. Needs the
   drawing, the picker, the search coding, and SENA Appendix H (low-contrast
   complex lines: sable/purpure and sable/azure are ruled out).
7. **Arrangements.** If the user says "in pale" (or in fess, in bend...),
   arrange them that way and put it in the Complex Search. The O&A indexes
   these as their own lines, e.g. `INPALE:3:or:g3pa`,
   `ARRANGEMENT-IN FESS:3:argent:g3pa`. Also more than three charges.

## Questions waiting for the maintainer

- **Suggestions: how many, and how laid out?** Built as one row of 12 along
  the bottom that scrolls sideways (`SUGGESTION_COUNT`). The "3 rows of 6"
  limit was applied to the option pictures inside each question.
- **Page title.** Still "What are you searching for?", though the page now
  builds as well as searches.
- **Draft wording** throughout the `TEXT` block of `apps/search/index.html`,
  including every rule message except "Low contrast - please choose a metal".

## Smaller things noted along the way

- Diminutives of ordinaries (two bars, three pallets) with their O&A numbers.
- Posture choices beyond what a picture shows; "inverted" and "facing
  sinister" switches (the drawing and blazon already support them).
- The plain chevron and bend sinister search codes come from my.cat but could
  not be confirmed against a real record.
- SENA rules not yet covered: voiding and fimbriation, "sword and dagger",
  identifiability case (2) of A3B4b beyond ordinaries.
- Move `apps/suggester/heraldry_mvp.html` onto `core/`.
