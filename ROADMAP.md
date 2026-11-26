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
- **Several charges on one shield** (November 2026; roadmap items 1 and 2 as
  the maintainer wrote them, kept below for reference). "What charges are on
  the field?" takes up to three kinds of charge, each with its own number and
  colour. "How are they arranged?" then shows every way they can go together
  as a picture: lions around the chevron, lions on the chevron, a lion above
  it, a lion below it. Forbidden ways are greyed with the reason. "I'm a
  herald" adds a line per charge to say directly whether it is primary,
  secondary or tertiary.
  - Charges fill the space they are really in: inside a bordure or orle,
    below a chief, above a base, beside or on any ordinary, around or on
    another charge. An ordinary beside a chief is drawn in the space below
    it, like the field.
  - Default arrangements follow Table 7 of the College of Arms' Glossary of
    Terms (two around a fess in pale, three two and one, four around a cross
    one in each quarter, charges on a bend turned to follow it...).
  - SENA's rules for charge groups: Appendix I (what is primary), Appendix J
    (which combinations of groups are allowed), A3D1a (the same charge in two
    groups), A3B4a (a charge on another charge must contrast with it).
  - The O&A search gets a line for each secondary and tertiary group,
    checked against real records and on the live form.
  - Suggestions may add a charge that was not picked (a bordure, charges
    around an ordinary).
- **Charges set out in a named arrangement** (November 2026; the start of
  item 7). "How many?" goes up to six, then "semy". "How are they arranged?"
  shows, even for one kind of charge (and before any is picked), a picture
  of each way its charges can be arranged: the usual way for that number,
  or in pale, in fess, in bend, in bend sinister (two to six charges), in
  chevron and in chevron inverted (three or five), in cross and in saltire
  (four or five), one and two. Four are usually two and two (the
  maintainer), five two, two and one, and six three, two and one (Glossary
  Table 7). An arrangement can be chosen before the number. The charges of a
  line are evenly spaced, all one size, and packed by their real shapes.
  With another charge above or below them, a line of charges is held back
  (SENA A3D2e, unity of arrangement: see the questions below).
- **Semy** (the maintainer, November 2026): as many small charges as fit,
  in staggered rows like ermine spots, whole ones only; over the field, in
  the space around other charges, or over an ordinary. Fewer than seven is
  not offered. Blazoned as the O&A does ("Azure semy of lyres argent",
  "Argent semy of violets purpure, a crescent sable") and searched with the
  O&A's `seme`, `seme on field` and `PS`, checked against real records.
- **Smaller things from the maintainer, November 2026:** the first colour
  question is a slim menu (their sketch); checky and lozengy are never
  squeezed under a chief; a fur on checky or lozengy has a spot in every
  piece, even one cut by the shield's edge; charges are never moved sideways
  to find a contrasting part of a patterned field (up or down only); "a
  cross between in bend two roundels" says "in bend"; long blazons under the
  suggestions are no longer cut off. The blazon puts it as the O&A's
  records do ("in pale three roundels Or", "four mullets two and two"), and
  the search gets the arrangement's own O&A category (INPALE and the like),
  checked against real records.
- **Ordinaries are drawn narrower when charges go around them** (the
  maintainer, November 2026): 60% of their full width, or 80% if charges
  also lie on them. They keep the same middle line.
- **A bordure or orle beside a chief runs along under the chief** instead of
  being cut off by it (the maintainer's sketch, November 2026).
- **From the maintainer's sketches** (November 2026): four charges around a
  bend go two on each side; two around a cross go in bend; four around a
  chevron inverted go one above and three below.

## Next, in the maintainer's words

1. *(Built, see above.)* **Secondary and tertiary charges, kept friendly.**
   Don't make people know what "primary", "secondary" or "tertiary" mean. Ask
   "what charges are on the field?" and, if they pick for example a lion and
   a chevron, show the possibilities as pictures to choose from: the lion
   secondary (three lions around a chevron) and the lion tertiary (a lion ON
   the chevron). "Herald mode" lets people say directly which is which. SENA
   Appendix J lists which combinations of charge groups are allowed.
   **Still to do here:** charges strewn over the field (semy), overall
   charges, cotises, two kinds of charge in one group, an ordinary as a
   secondary charge (item 8), charges on a bordure, more than four of a
   charge, and arrangements that have to be named (item 7).
2. *(Built, see above.)* **Charges fill the space they are actually in.**
   Inside a bordure or orle: 95% of the space inside it, never touching it.
   The same for any other space (beside or on an ordinary).
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
7. *(Started, see "Charges set out in a named arrangement" above.)*
   **Arrangements.** If the user says "in pale" (or in fess, in bend...),
   arrange them that way and put it in the Complex Search. The O&A indexes
   these as their own lines, e.g. `INPALE:3:or:g3pa`,
   `ARRANGEMENT-IN FESS:3:argent:g3pa`. Also more than three charges.
   **Still to do here:** named arrangements for the charges around, above
   or on something (so far only the charges in the middle of the shield can
   be set out differently); in annulo, in orle and in pall; more than six
   charges; charges turned to follow their line ("three swords bendwise in
   bend"); two charges "crossed in saltire".

8. **Several ordinaries and their diminutives** (maintainer, November 2026):
   two or three chevronels, bendlets, pallets, bars; two orles = a double
   tressure. Needs the O&A numbers and names for each, and sits with
   secondary charges and arrangements (item 1).
9. **Fimbriation and cotising** where SENA allows it (voiding and fimbriation
   are in SENA A3; cotises are their own charge group in the O&A).
10. **A base, like a chief,** should probably make the field be drawn in the
   space left above it (a chief does this already).
11. **Choose the pattern to suit the charges** (the maintainer's idea,
   November 2026, after three swords on lozengy looked wrong moved off
   centre; Makejoye's drawing has them centred on larger lozenges). Instead
   of moving charges to find contrast, keep the charges where they belong
   and pick the field: of the lozengy, checky, paly... drawings available
   (several sizes and offsets of each, and later every such background in
   the Traceable Heraldic Art library), use the one on which the chosen
   charges and ordinaries sit best. A way to do it with what is built: draw
   the charges first (`layoutShield` already does), then score each
   candidate background by how evenly each charge lies across the two
   tinctures and how little of its outline runs along a line of the field,
   and take the best. The backgrounds would need to be described as data
   (cell size, offset) rather than the one fixed shape each has now in
   `geometry.js`.

## Questions waiting for the maintainer

- **Suggestions: how many, and how laid out?** Built as one row of 12 along
  the bottom that scrolls sideways (`SUGGESTION_COUNT`). The "3 rows of 6"
  limit was applied to the option pictures inside each question.
- **Page title.** Still "What are you searching for?", though the page now
  builds as well as searches.
- **Draft wording** throughout the `TEXT` block of `apps/search/index.html`,
  including every rule message except "Low contrast - please choose a metal".
  New in November 2026 (all marked DRAFT): the line under "What charges are
  on the field?", "remove", "How are they arranged?" and the words under its
  pictures ("lions around the chevron", "lion on the chevron", "lion above
  the chevron", "lion below the chevron", "lion with a bordure"), the herald
  mode choices, "(arranged any way)", "the usual way", "How the different
  charges go together", the two notes shown when there is nothing to
  arrange (one charge; semy), and eight new
  rule messages.

Raised by the work on several charges and arrangements (November 2026).
Each is a herald's call; the code does the cautious thing until answered:

- **A charge, a chief and a bordure** (and any other three groups not on
  SENA Appendix J's list) are treated as needing documentation, so the tools
  do not offer them, though they are now drawn properly.
- **Four charges around a chevron the right way up** are not drawn: with
  one above the point there is no room. (Four around a chevron inverted
  follow the maintainer's sketch.) How should they go?
- **Three around a cross, two or three around a saltire, three around a
  pale or bend:** not drawn; the Glossary's Table 7 gives no arrangement.
- **Unity of arrangement (SENA A3D2e).** The maintainer asked for "in bend",
  "in fess", "in chevron" to be discouraged in some cases with several
  charges. What is built: charges in a named arrangement, with another
  charge above or below them ("in bend three swords and in chief a mullet"),
  are not suggested, because the two can be taken for one group that needs
  two arrangement phrases; a herald can still choose it. With a bordure or
  chief, or charges lying on them, they are suggested as usual. Is that the
  case that was meant, and are there others?
- **Semy:** always blazoned "semy of ..." (never "mullety", "crusilly",
  "bezanty", "semy-de-lys"). Strewn charges are 12 across on the shield's
  100 (long thin ones a little longer). With three charges around a fess as
  well, fewer than seven strewn charges fit, so that combination (which
  SENA Appendix J lists) is not offered.
- **The other colour menus** (background colours, a charge's colour) still
  use the larger squares, because they show why a colour is greyed. Slim
  them the same way?
- **Stripes under a chief** (barry, bendy, chevronelly) are still squeezed
  into the space below it; only checky and lozengy keep their shape.
- **Narrow charges on paly** (three swords) now each sit wholly on one
  stripe, since they are no longer moved sideways, and are reported as low
  contrast when that stripe is their own kind of tincture.
- **Six charges on a divided field** are set out three, two and one, which
  Table 7 gives only for an undivided field.
- **"In chevron"** is offered although SENA Appendix K's list of standard
  arrangements does not have it (the O&A has a category for it).
- **An ordinary through the middle with an orle** is held back: the ordinary
  is drawn running under the orle to the shield's edge, which may be wrong.
- **A narrower chevron on a per chevron inverted field** leaves a small
  diamond of the upper colour under the chevron's point.
- **Sizes to judge by eye** on `tests/groups.html`: an ordinary with charges
  around it is 60% of its full width (80% if charges also lie on it); a
  charge with others around it is drawn at 72% of the size it has alone;
  charges around it are at most 60% of its size; a charge on another charge
  at most 55%; a slanting line of charges reaches across at least 45% of the
  shield; anything under 11 (on the shield's width of 100) counts as too
  small to offer.

Answered (kept for the record):

- "A cross between two roundels" says "in bend" in the blazon; four charges
  are two and two by default, with no special message; "How are they
  arranged?" is the wording, not "How are they set out?" (maintainer,
  November 2026).
- A group "in chief" plus a bordure counts as a group around the primary
  under Appendix J (maintainer, November 2026).
- The middle charge of three on a chevron is drawn upright, not "fesswise"
  as the Glossary's Table 7 has it (maintainer, November 2026).
- An ordinary is drawn narrower when charges go around it (maintainer,
  November 2026; built).
- Suggestions may add charges nobody picked (maintainer, November 2026).

## Smaller things noted along the way

- Diminutives of ordinaries (two bars, three pallets) with their O&A numbers.
- Posture choices beyond what a picture shows; "inverted" and "facing
  sinister" switches (the drawing and blazon already support them).
- The plain chevron and bend sinister search codes come from my.cat but could
  not be confirmed against a real record.
- SENA rules not yet covered: voiding and fimbriation, "sword and dagger"
  (A3D1b: two charges too alike, such as a lion and a catamount; needs a list
  of which charges count as the same), identifiability case (2) of A3B4b
  beyond ordinaries.
- Two of a charge around another charge have no default arrangement in the
  Glossary's Table 7, so are not drawn until the charges around something
  can be given a named arrangement (item 7).
- A base still leaves the field and any ordinary where they are (item 10);
  charges already keep to the space above it.
- The option pictures now fill in a moment after a click (so the click is
  not held up). If the page ever feels slow, `window.renderTimes` in the
  browser console says how long each part took.
- Move `apps/suggester/heraldry_mvp.html` onto `core/`.
