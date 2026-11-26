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
7. **Arrangements.** If the user says "in pale" (or in fess, in bend...),
   arrange them that way and put it in the Complex Search. The O&A indexes
   these as their own lines, e.g. `INPALE:3:or:g3pa`,
   `ARRANGEMENT-IN FESS:3:argent:g3pa`. Also more than three charges.

8. **Several ordinaries and their diminutives** (maintainer, November 2026):
   two or three chevronels, bendlets, pallets, bars; two orles = a double
   tressure. Needs the O&A numbers and names for each, and sits with
   secondary charges and arrangements (item 1).
9. **Fimbriation and cotising** where SENA allows it (voiding and fimbriation
   are in SENA A3; cotises are their own charge group in the O&A).
10. **A base, like a chief,** should probably make the field be drawn in the
   space left above it (a chief does this already).

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
  mode choices, "(arranged any way)", and seven new rule messages.

Raised by the work on several charges (November 2026). Each is a herald's
call; the code does the cautious thing until answered:

- **A group "in chief" plus a bordure or chief.** SENA Appendix J allows
  three groups on the field as "a primary charge group, a secondary charge
  group around [it] (semy or numbered charges), and a peripheral ordinary".
  Does a group only above or below the primary ("a fess and in chief three
  mullets, a bordure") count as "around" it? Held back for now: heralds can
  choose it, the tools do not suggest it (`groups-unsure` in `rules.js`).
  The maintainer is asking a more senior herald (November 2026).
- **A charge, a chief and a bordure** (and any other three groups not on
  Appendix J's list) are treated as needing documentation, so not allowed.
- **The middle charge of three on a chevron.** The Glossary's Table 7 says
  charges on a chevron follow it, "central charge fesswise". The ones on the
  arms are turned to follow them; the one at the point is drawn upright,
  because a cup or lion lying on its side there looked wrong.
  ANSWERED (maintainer, November 2026): upright is correct.
- **Should an ordinary be drawn narrower when charges go around it?**
  ANSWERED (maintainer, November 2026): yes, it should. NOT BUILT YET: every
  ordinary still keeps the one shape it has alone, so three charges around a
  chevron are on the small side, and one charge above a chevron has no room.
  Needs narrower shapes in `geometry.js` that still line up with the field
  divisions (check `tests/alignment.html`), chosen by `layout.js` when a
  secondary group is present.
- **An ordinary through the middle with an orle** is held back: the ordinary
  is drawn running under the orle to the shield's edge, which may be wrong.
- **Suggestions now add charges nobody picked** (a lion picked may be
  suggested inside a bordure). ANSWERED (maintainer, November 2026): wanted.
- **Up to three kinds of charge**, and "How many?" now goes to 4 (four
  around a cross or saltire is the default arrangement). Enough for now?
- **Sizes to judge by eye** on `tests/groups.html`: a charge with others
  around it is drawn at 72% of the size it has alone; charges around it are
  at most 60% of its size; a charge on another charge at most 55%; anything
  under 11 (on the shield's width of 100) counts as too small to offer.

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
- Two of a charge around another charge, and four of a primary charge, have
  no default arrangement in the Glossary's Table 7, so are not drawn until
  arrangements can be named (item 7).
- A base still leaves the field and any ordinary where they are (item 10);
  charges already keep to the space above it.
- The option pictures now fill in a moment after a click (so the click is
  not held up). If the page ever feels slow, `window.renderTimes` in the
  browser console says how long each part took.
- Move `apps/suggester/heraldry_mvp.html` onto `core/`.
