# Roadmap

What is built, and what the maintainer has asked for next. Decisions recorded
here were made with the maintainer; add to it as things are decided.

## Built

- **One page for searching and building** (`apps/search`): questions top left,
  the shield being built top right, random suggestions along the bottom.
  Every question is always shown; anything not answered is "not chosen yet".
- **Colours:** "What colours are used in the shield?" (colours and metals shown
  as separate sets, then furs). *(At first followed by "What colours are used
  in the background?": since 28 November 2026 that is "must contain all of:"
  in the background picker, see below.)*
- **Background:** 16 two-tincture divisions, per pall and per pall inverted,
  plain, and a part divided again (at first through a "more complex
  background" form, now "More complex options" on a part). Furs: ermine,
  counter-ermine, erminois, pean.
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
- **Nothing touches a bordure or orle** (the maintainer, November 2026, after
  a bordure cut the point off a chevron). Inside a bordure the field and any
  ordinary are drawn smaller, to fit the space the bordure leaves, the same
  way they are drawn in the space below a chief. Inside an orle the field
  still runs to the shield's edge, and an ordinary stops just short of the
  orle.
- **Paly suits its charges** (the maintainer, November 2026; a first step of
  item 11). A paly field is drawn with six, eight or four pieces, whichever
  puts each charge across a line or on the tincture it contrasts with. The
  rules judge the shield as it is drawn. (The maintainer asked for the
  stripes to be moved sideways; see the questions below for why the number
  of pieces is changed instead.)
- **Every colour menu is the slim one,** and a greyed colour says why in one
  line under the menu: "Azure is not available because the charge cannot be
  the same colour as the background" (the maintainer's example).
- **"clear all"** beside the title takes back every answer (it leaves the
  palette, the herald tick, pinned suggestions and collapsed sections alone).
- **"save as png"** and **"save as png (outlines only)"** under the search
  button (`core/export.js`). Coloured in: see-through outside the shield and
  wherever a colour has not been chosen. Outlines only: black lines on
  nothing. 1000 dots across; the file is named after the blazon.

- **Charges from the Book of Traceable Heraldic Art** (the maintainer,
  November 2026). `tools/import_tha.py` copies the picture the maintainer
  chose for each labelled charge (`data/charges.csv`) into `charges/tha/` and
  lists it, with its artist, in `charges/tha.csv`: 533 pictures so far. They
  are recoloured, sized and saved as PNG like our own pictures, and are
  fetched only when needed. Left out, and listed when the script is run:
  charges whose chosen picture is drawn filling a badge or shield (31:
  ordinaries, cantons, flaunches, gores...), ones with no entry in the
  collection's credits list (14), one with no white inside to paint, and the
  five charges that already have a picture of our own.
  `tests/tha.html` draws every one of them to look over.
- **The list of charges** (the maintainer's sketch, November 2026): a menu
  on its left ("default view", "see all", then by topic, type and artistic
  need), a box to search by name, and the pictures in a box that scrolls.
  The default view shows what can still be chosen: ordinaries, then charges
  that are easy to draw, then the rest, alphabetically. Under it, the row
  of suggestion modes (see "Suggestion modes" below; at first a switch
  between two), and a card for each charge chosen ("you selected:
  lion") with its number on a line of stops and its colour as a menu and a
  strip of squares. Under the shield: "Artist credits" for the pictures in
  it, and the licence.
- **The other patterns suit their charges too** (item 11): barry, bendy,
  bendy sinister, chevronelly, checky and lozengy are each drawn the usual
  way, or with more or fewer pieces, whichever leaves every charge across a
  line or on the tincture it contrasts with. With an ordinary on the field
  the usual drawing is kept, since that is the one the ordinary covers
  exactly.
- **Smaller things, late November 2026:** "How is the background divided?"
  now comes before "What colours are used in the background?"; ermine spots
  are drawn (as outlines) in "save as png (outlines only)"; an ordinary
  through the middle with an orle is offered, drawn stopping where it meets
  the orle.
- **Posture, orientation and art for each charge** (the maintainer, late
  November 2026): a chosen charge's card has menus for its posture, for
  another artist's drawing of it, and for the way it is turned (fesswise,
  bendwise, bendwise sinister, inverted, facing sinister); "expand" opens a
  bigger box under the cards showing all of them as pictures. The importer
  now brings in up to ten pictures of each labelled charge from Traceable
  Heraldic Art (2,055 pictures of 576 charges, 86 MB), one of each posture
  first, with the posture read from the picture's name. The list of charges
  shows each charge once, as its usual picture. A chosen picture with no
  credit in the collection's list is kept, linked to its page at
  heraldicart.org. The Traceable Heraldic Art crescent is the usual one now.
- **The search says what the picture shows:** a charge whose number has not
  been chosen is searched as the number drawn ("don't specify" keeps it
  open); postures go in the O&A's own words, worked out from its records
  ("sejant erect" is indexed as rampant, "contourny" as "to sinister"); and
  a line under the search button says when number or posture is missing.
- **Canton, flaunches and gore** are drawn by code, their curves copied
  from Traceable Heraldic Art's device forms. Other charges keep clear of
  them; a charge can lie on a canton or gore, one on each flaunch.
- **Furs and field treatments** (items 4 and 5): vair is offered with the
  ermines; "More complex options" makes "X ermined Y", "vairy X and Y",
  "counter-vairy", "potenty" (so potent), "X masoned Y", "X scaly Y" and "X
  papellony Y" from one colour and one metal. Vair and its kin are neutral
  and may not share a tincture with what lies on them (SENA A3B1); a field
  with a treatment may stand alone, a fur may not (A3E3). The search lines
  were worked out from the records (`core/oanda.js`). NOT built: vair en
  pointe, counter-potent, papellony as a fur ("papellony gules and Or"),
  plumetty, and jaguar (registerable since the July 2026 Cover Letter, in
  Or and sable or argent and sable only; nobody has yet said how it counts
  for contrast, and there is no drawing to copy). Kürsch is not an SCA
  tincture: it is in none of SENA, the Glossary or the O&A.
- **Orly, and two divisions counterchanged over each other** (item 12):
  "more complex background" has "and counterchanged with", so "orly and
  chevronelly", "barry and per pale", "per pale and per chevron" can be
  made, in two tinctures. Drawn by laying the divisions over each other
  (`isLayered` in `core/geometry.js`); the rules treat the result as a field
  of many pieces. The generator does not make them at random.
- **Rules relaxed, late November 2026** (the maintainer; to be checked with
  another herald): a chief, bordure or base may share a tincture with a
  field of many pieces (SENA A3B4b allows it "if drawn so that the shared
  tinctures are not against each other"). (An ordinary counterchanged over
  a field of many pieces was also let through for a few days; the
  maintainer took that back at the end of November 2026, see below.)
- **Smaller things:** the background's colours are chosen automatically
  when the shield's colours leave only one set (azure and Or ticked, then
  per pale); an "AI disclosure" link beside the herald tick.
- **"Forannán's Shieldpainter 1.0"** (the end of November 2026): the page's
  new name. It is the "build mode"; a second, compact page for heralds, the
  "search mode", is at `apps/searchonly/`, each linked from under the
  other's title.
- **Arrangements that read clearly** (the maintainer's pictures): charges
  side by side are set out evenly first (equal gaps between them and to the
  edge of the shield at their height) and then made as large as that
  allows, instead of as large as possible and wherever that left them;
  charges in rows keep to their own end of the shield (the top row out of
  the bottom third, the bottom row out of the top third); a line in bend is
  centred. A charge that only just pokes over a line of the field (less
  than about a seventh of it) makes its whole group a little smaller, each
  charge about its own centre, until every one is clearly on one side or
  clearly across.
- **Checky and lozengy stay readable:** when less than half the shield
  shows them (a pale and a bordure), they are drawn with pieces half the
  size; when less than a quarter does (a cross, a bordure and charges in
  the corners) the design is held back ("So little of the background
  shows...").
- **"make suggestion"** under every option's picture puts that whole design
  among the suggestions, pinned.
- **The background menu keeps everything reachable:** with two or three
  colours chosen, "Show one-part backgrounds" and "Show two-part
  backgrounds" bring out the backgrounds that use fewer of them, and with
  three or four there are a few that use all of them by dividing one part
  again. "more complex background" with two colours starts as two
  divisions counterchanged ("bendy and per fess argent and sable"), and
  taking a colour off no longer brings another back.
- **A charge's colour is chosen for it** when the shield's colours and the
  background leave only one (Or on per pale sable and purpure, with
  purpure, sable and Or ticked), as the background's colours are.
- **Search:** two, three or four of a charge are searched as "that many or
  fewer" (Měryem: two of the charge with one of another would be indexed as
  two, and still conflict). Five and six are searched exactly: the O&A has
  no "5 or fewer".
- **Rules:** strewn charges may not share a tincture with ANY tincture of
  what they lie on (not argent on ermine, nor on "purpure masoned argent");
  a charge on a canton is allowed with the maintainer's warning about
  augmentations, and is never made up at random.
- **Small ones:** "all semy of" in the blazon of a divided field; estencely
  ("azure estencely Or") under "More complex options"; a fur or treatment
  shows as one large spot, bell or scale in the colour menus.
- **Complex lines** (item 6, the end of November 2026): wavy, indented,
  dancetty, embattled, engrailed, invected, nebuly, dovetailed, raguly and
  rayonny, for the lines a background is divided with ("per pale wavy",
  "quarterly wavy", "barry wavy", "paly dancetty") and for the edges of an
  ordinary ("a fess embattled", "a chief indented", "a cross engrailed", "a
  bordure embattled"). On the build page: "line:" on an ordinary's card
  and in its "expand" box, and a menu of lines under "How is the background
  divided?". In search mode: a "line:" menu for the background and for each
  ordinary. The search sends the line's word in place of "pl" (dancetty as
  "indented", which is how the O&A indexes it). SENA Appendix H: a complex
  line between sable and azure, or sable and purpure, is refused; between
  any other two colours or two metals it is held back for heralds.
- **Search mode's background fills itself in:** it starts as "any"; with
  "What colours are used in the shield?" ticked, it goes to the one plain
  background the rules allow as soon as the charges leave only one (azure
  and Or ticked, an Or charge: azure), unless "don't specify background" is
  ticked or the herald sets the background by hand.
- **Suggestion modes** (the maintainer's sketch, the end of November 2026):
  under the list of charges, "Mode: Suggestions include [any of] [all of]
  [only] my selections, or [default mode]". "only" suggests nothing but the
  charges picked; "default mode" may add an ordinary or a simple geometric
  charge (roundel, annulet, billet, delf, lozenge, mascle, rustre, mullet,
  estoile, crescent, heart, triangle, goutte) but no other charge: a cat
  may get a bend or three mullets, never a bear.
- **Semy on one part of the field:** "over:" on a strewn charge's card
  chooses the whole background or one part of it ("Per chevron sable and
  purpure semy of lions Or": lions on the purpure only). Drawn, blazoned
  and judged by the rules on that part alone. The search sends it like any
  strewn charge, which is how the O&A indexes it ("Per chevron vert
  crusilly Or and Or" has `CRAC:crosslet:gpa:or:seme` and `PS:or`; "Per
  chevron azure mullety argent and Or, a laurel wreath azure" has
  `STAR:argent:...:seme:seme on field`): the index does not say which part.
- **Line shapes traced from Traceable Heraldic Art** (the maintainer's
  suggestion): wavy, indented, embattled, engrailed, invected, nebuly,
  dovetailed, raguly and rayonny are now the collection's own shapes, and
  urdy and potenty are new. `tools/trace_lines.py` reads them from the
  "Per Fess ..." device forms. Dancetty has no drawing there and stays as
  it was. Deep lines (nebuly, rayonny, urdy) are drawn smaller on an
  ordinary, and smaller again along a bordure. Orly can have a line too.
- **Rules, the end of November 2026** (the maintainer): ordinaries are once
  more held to SENA A3F4 on counterchanging over a field of many pieces;
  no fess with a chief, no fess with a base, no orle with a bordure
  ("parallel ordinaries", held back for heralds to override); a complex
  line between two colours or two metals is offered to everybody when the
  College registers that pairing often (since 2015: gules and sable 55,
  sable and vert 37, azure and gules 34, azure and vert 33, argent and Or
  12) and held back for heralds otherwise (purpure and vert 6, azure and
  purpure 4, gules and vert 2, gules and purpure 1), with the maintainer's
  sentence. *(The pairings were replaced a day later by "a third of the
  line must show": see the next entries.)*
- **The background picker** (item 14; the maintainer's sketch, built 28
  November 2026). "How is the background divided?" is now made like the
  list of charges: a menu on the left (default, show all, plain, 2-part,
  3-part, 4-part, 5+ parts, patterns, furs, field treatments, and each
  complex line), "must contain all of:" as colour squares, "Type to find a
  field description", and a picture for every way a background can be
  made, including the furs, the field treatments and "semy of charges".
  The default view leaves out what the charges chosen rule out. Under it:
  "you selected: per pale wavy", "Swap the parts", "divided with a line
  that is", "and counterchanged with", and a box for each part with its
  colour. "More complex options" on a part opens a second copy of the
  picker for that part alone ("per fess, and the second part barry"). The
  separate question "What colours are used in the background?", "more
  complex background" and "Show one-part backgrounds" are gone.
- **"Semy of charges" as a background:** picking it strews blobs over the
  shield top right ("Azure semy of charges Or") and makes an empty charge
  card set to semy; the next charge picked in the charges question fills it.
- **Charge cards show the charge alone** (the maintainer: "it's impossible
  to really see what a 'bycocket' looks like"): one of it, as the only
  charge on the shield. Whether it can still be added to what is chosen
  still greys or hides the card. Whole designs are for the suggestions.
- **One ordinary for each complex line** in the list of charges ("fess
  wavy", "fess embattled"...), under "ordinaries" and by typing the line.
- **A "?" in a circle** beside "default mode" says what it does (the
  maintainer's sentence) when the pointer rests on it or it is pressed.
- **The maintainer's fixes list of 28 November 2026:**
  - *Per chevron inverted* (and the chevron inverted) come to their point
    lower, at 74.5, as Traceable Heraldic Art draws them: the line now parts
    the shield 54/46 instead of 34/66.
  - *The usual palette* is Forannán's "alternative" one, with the pinker
    purpure (#E98CC0, read from their picture); a palette is only
    remembered in the browser when somebody chooses one.
  - *A canton beside a chief* hangs from the chief's lower edge.
  - *Synonyms:* `synonyms` in `charges/charges.csv`; the eight boats answer
    to "boat" and "ship" and are under the topic Maritime.
  - *A charge greyed by the colour already chosen for it* says "A sable
    charge cannot be placed on this background - please change the colour
    of the charge, below" (their sentence).
  - *A slimmer page:* the shield top right in a column just wide enough for
    it, suggestions without their blazons, less padding everywhere, and
    pickers as tall as the window allows.
  - *"Randomise"* in place of "Show different suggestions".
  - *Charges in bend with a canton* are held back for heralds; when chosen,
    the line runs from the canton's edge.
  - *The AI disclosure* has the maintainer's fourth paragraph, on both pages.

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
4. *(Built, see "Furs and field treatments" above; vair en pointe,
   counter-potent, papellony as a fur, plumetty and jaguar still to do.)*
   **More furs:** vair and the other SCA furs. (The maintainer also mentioned
   "jaguar" from memory: to confirm what was meant.) SENA treats vair and
   potent as neutral; the O&A indexes vair differently
   (`FIELD TREATMENT-VAIRY`, `FIELD:solid:vair`), so check real records first.
5. *(Built: masoned, scaly, papellony. Mailly, honeycombed and the rest of
   my.cat's list still to do.)* **Field treatments,** e.g. masoned. The O&A has `FIELD TREATMENT-...`
   categories in my.cat.
6. *(Built, see "Complex lines" above. Still to do: bevilled and the rarer
   lines; dancetty traced from a real drawing; a line on only one of two lines ("Quarterly per fess
   indented"); lines for the orle, canton, flaunches and gore, and for two
   divisions together; counter-embattled / bretessed.)*
   **Complex lines,** e.g. per bend wavy. The shield description already has
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
11. *(Built for the patterns the code draws; see above. Still to do: the
   same choice among Traceable Heraldic Art's own drawings of each, and
   moving a pattern so that a lozenge or a line is under the middle.)*
   **Choose the pattern to suit the charges** (the maintainer's idea,
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

12. **Backgrounds still to come** (the maintainer, November 2026: "multiple
   background divisions that counterchange over each other", and
   counterchanging into different or more colours). The Field-Only Armory
   Project's poster of 277 registered fields
   (http://blog.wirelizard.ca/files/Field-Only-Armory-Project-Everything-11x17-Poster-2025-2.pdf)
   was read through in November 2026: the tools can describe about 85 of
   them. What the rest need, most common first:
   - **Complex lines** (about 95): indented 20, wavy 18, embattled 14,
     rayonny 8, dancetty 6, engrailed 5 and a dozen rarer ones, on every
     division; "Quarterly per fess indented" (only the fess line); points
     ending in fleurs-de-lys or mullets. This is item 6.
   - *(Built, late November 2026, without complex lines or "throughout";
     see above.)* **Two divisions, counterchanged** (23, every one in two tinctures):
     barry and per pale, barry and per chevron throughout, bendy and per
     pale, bendy and per bend sinister, bendy sinister and per bend, paly
     and chevronelly inverted, paly counterchanged per saltire, per pale and
     chevronelly (and inverted), per pale and per chevron (and throughout),
     pily and per bend, checky of nine and bendy; five with a complex line.
     *How to build it:* a field gets a second division laid over the first
     (`over` in `shield.js`); a place on the shield takes the first tincture
     if it is in the first part of both divisions or the second part of
     both, otherwise the second. Drawing can reuse what draws a
     counterchanged charge today: the first division, then the same with
     its tinctures swapped, shown through the second division's far side.
     The rules treat it as a field of many pieces. The O&A indexes one such
     record under both divisions plus "FIELD:divided gridlike not checky";
     check more records before coding the search.
   - **Counterchanged into other colours:** none on the poster. The nearest
     are fields whose halves are each divided ("Per chevron barry azure and
     argent and barry argent and gules"), which nesting already describes.
     If wanted, the second division's far side would name its own two
     tinctures instead of swapping the first two.
   - **Field treatments and other furs** (about 35): masoned 10, scaly 8,
     mailly 5, papellony 1; "azure ermined Or" (9); vair, potent, vairy.
     Items 4 and 5.
   - **Other divisions:** pily and its kin (8), chapé, chaussé and vêtu (7,
     mostly ployé), arrondi lines (14), party of six (4), chevronelly
     inverted (3), barry bendy and lozengy barry (3), orly (1: shield shapes
     one inside another), stepped and "wolves-cut" lines (10), gyronny of
     three, six, ten.
   - **A stated number of pieces** is rare ("Barry of six", "Bendy sinister
     of four vert, argent, purpure and argent").
   The roll of arms at https://op.atlantia.sca.org/roll_of_arms.php is the
   next thing to go through, to flag shields the tools cannot draw.

13. **Three things asked about, not built** (the maintainer, late November
   2026), with what each would take:
   - **Charges "proper"** (a tree with a brown trunk and green leaves).
     *One colour is easy:* SENA A3B1 lets any animal that can be brown be "a
     brown X proper" ("completely brown"), and wooden things "a wooden X
     proper", brown being a colour. That needs a brown in each palette and
     a "proper" entry in the colour menu for the charges it applies to (a
     label in `charges/charges.csv`); the O&A has the tincture words
     `brown` and `proper`. *Several colours is real work:* the pictures are
     black lines over one white inside, so nothing says which white area is
     trunk and which is leaves. Each such charge would need its areas
     marked by hand once (the rose proper is "gules barbed vert seeded
     Or"); the Glossary of Terms lists which charges have a defined proper.
     Suggested order: brown first, then the dozen commonest from the
     Glossary's list. Iago's palette pictures give the browns as codes
     (https://caerlaverockroll.com/armorial-palettes-ii/, read November
     2026): Insignia Anglica brown 79412b (grey beast 6c7266, grey iron
     959787, dark skin 4c3c2c, brown skin bb4e37, light skin d2ad8f);
     Libro II della Natione Normanda brown 785642 (grey 8e8e7f, light skin
     ca9e80); Nobiliario brown 928266. The other palettes need a brown
     chosen for them.
   - **A "Custom" palette:** small. A palette is just ten or so colour
     codes (`core/palettes.js`), and the choice is already kept in the
     browser. It needs a row of boxes to type codes into (the browser's own
     colour picker can do the typing), with anything left empty taken from
     the palette last used. About a day; no risk to anything else.
   - **"Manually tweak this image":** moderate. The layout already hands
     back a list of places `{ cx, cy, size }` for every charge, so a nudge
     up, down, left, right or a shrink per charge is a small adjustment
     applied after it, for the shield top right and the saved PNG only.
     Decisions needed: whether the rules should judge the tweaked picture
     (probably not: it is the same blazon), and that a tweak is forgotten
     when the charge or its number changes. Ordinaries would not move.
14. *(Built 28 November 2026, see "The background picker" above. Still to
    do: picking SEVERAL things at once and seeing every way they combine,
    which the maintainer set aside for "a single picker ... if the user
    picks 'more complex options' ... it shows a second time"; a part of a
    part; "semy of charges" on one part from the picker itself; the one
    merged "element selector" as a separate page.)*
    **The background picker, made like the charge picker** (the
    maintainer's sketch, the end of November 2026). Their words: "I don't think I
    currently like the way background picking works - it gets complex when
    you add complex lines. Let's make the background picker work like the
    charge picker." And: they no longer like "Show one-part backgrounds".
    - *The sketch:* a menu on the left (default, show all, plain, 2-part,
      3-part, 4-part, 5+ parts, patterns, furs, field treatments), "must
      contain all of:" with the colours as chips, "Type to find a field
      description", and the pictures in a box that scrolls. Several
      elements can be picked and are combined (per pale + checky), with the
      suggestions showing every way they combine. Under it: "you selected:
      per pale and checky", "Swap the parts", "divided with a line that is
      [plain]", and a box per part (part 1, part 2). Lines appear as
      pictures in the grid ("show 1 ordinary for each line type" for
      ordinaries). The default view hides what the charges chosen rule out
      and runs plain, then 2-part, 3-part, 4-part.
    - *The plan suggested to them:* build it as ONE field picker that the
      page uses three times: for the background, for one part of a divided
      background (their own "most plausible alternative": asking for a
      subdivision brings up a second copy of the same picker), and for the
      inside of a parted charge (item 15). The alternatives they raised:
      colour first, then "add a second colour?" (good for beginners, but a
      long walk to "barry wavy", and it hides the pictures, which is what
      the page teaches with); one merged "element selector" for backgrounds
      and charges (worth trying as a separate page later, as they said: it
      changes every question on the page at once).
15. *(Built 28 November 2026, see "Parted charges" above.)*
    **Parted charges** (the maintainer, the end of November 2026): "Please allow charges to be parted the same way backgrounds
    are. I should be allowed 'argent, a lion barry gules and or', or
    'sable, a bordure checky argent and gules', etc. Bordures should
    additionally be allowed to be parted bordurewise." Needs: a charge's
    tincture to be a FIELD (plain or divided) in `core/shield.js`; the
    division drawn inside the charge's own outline (a lion's box, a
    bordure's ring) in `draw.js` and `export.js`; contrast judged per piece
    (SENA A3B3 on divided charges); the O&A's lines, from real records;
    and the picker of item 14 to choose it with. "Parted bordurewise" is a
    line running round the middle of the bordure (an inner and an outer
    ring), which no background has: it is a shape of the bordure's own.
    Best built together with item 14.
16. **A point pointed**, and with it "no point pointed with a chevron" (the
    maintainer's parallel-ordinaries rule; the other three pairs are built).

## Questions waiting for the maintainer

From the background-picker round (28 November 2026):

- **"A third of a complex line must show"** is applied to EVERY complex
  line of division, not only between two colours or two metals: "Per fess
  wavy argent and azure" under a fess is held back too (with a sentence of
  its own, DRAFT). Say if it was meant for the low-contrast pairings only.
  With nothing over the line, every pairing but SENA's two (sable with
  azure, sable with purpure) is now offered to everybody.
- **"patterns" and "5+ parts"** in the picker's menu: checky and lozengy
  are under "patterns"; gyronny, paly, barry, bendy, bendy sinister,
  chevronelly and orly under "5+ parts". A guess at the sketch's meaning.
- **The heading** is still "How is the background divided?", though the
  list now has furs, treatments and "semy of charges" as well.
- **"What colours are used in the background?"** is gone as a question,
  and with it its line of help ("If you're not sure what counts as
  background (field) in heraldry, use the question at the top..."). Say if
  that help should live somewhere else.
- **Picking several backgrounds at once** and seeing every way they combine
  (the first sketch) was not built: the second picker for one part does
  that job, as the later message asked.
- **A parted charge's example colours** in "More complex options" are a
  colour and a metal the background does not use; change them on the card.
- **Parallel ordinaries:** still the maintainer's rule; they think it was a
  recent ruling. With the precedent's wording it can cite it.
- **Wording to check** (DRAFT in the page's `TEXT`): "line" (the heading
  over the lines in the picker's menu), "No background matches that.", "It
  has no room for all the colours chosen", "colour 1:" / "colour 2:" (the
  colours of a part that is itself divided, and of a parted charge),
  "plain colour" (takes a part's own division away), "More complex options
  for part 1", "More complex options for the lion", "made of ... and ..."
  (the two colours of a fur or treatment), "Pick which charge under 'What
  charges are on the field?' below." (after "semy of charges"), "So little
  of the complex line shows that it cannot be made out"; and from before:
  "over:", "the whole background", "part 1 only (purpure)".

From the pickers-and-rules round (the end of November 2026):

- *(Answered: "I like that default mode with nothing picked still suggests
  any charge, that's correct".)* **Default mode with nothing picked**
  suggests any charge at all. "default mode" and "only" both use ALL the
  charges picked, like "all of".
- *(Answered: "Parallel ordinaries may be confused for field divisions" is
  the sentence for now.)* **Parallel ordinaries** is recorded as the
  maintainer's rule: no sentence of SENA was found that says it.
- *(Answered: "it's less about the specific colour combination and more
  about identifiability": see "a third of a complex line must show".)*
  **Purpure and vert** with a complex line was held back for heralds.
- **The traced lines:** look at nebuly and rayonny on a bordure and on a
  bend, where they are drawn smallest.

From the complex lines round (the end of November 2026):

- *(Answered: "you can trace from Traceable Heraldic Art"; done, see
  above.)* **How each line is drawn** was a first attempt, sized by eye.
  Still worth a look: any zigzag on a slanting line ("per bend indented"
  comes out like a flight of steps, as right-angled teeth on a diagonal do).
- **Embattled on one edge:** of a fess, bend or chevron only the upper edge
  is embattled; of a pale, cross, saltire, pall, chief, base and bordure
  every edge is. Say if any of those should be otherwise.
- **Engrailed and invected:** engrailed has its points standing out from
  the ordinary and its arcs biting in; invected the reverse. On a division
  ("per fess engrailed") the points are toward the chief (toward sinister
  on an upright line).
- *(Answered: yes, "if it's common and often allowed, like gules and
  azure, with recent registrations, then no need to grey it out"; done.)*
  **Low-contrast complex lines** other than the two SENA names were offered
  only to heralds.
- **Search mode's background** is only ever filled in with a PLAIN colour,
  and only when no two-colour division of the colours ticked would also be
  allowed. The colours ticked do not narrow the colour menus.
- **Wording to check** (DRAFT): "line:", "plain" / "plain line",
  "divided with a line that is", the two sentences about complex lines and
  contrast, and in search mode "Tick the ones you know. When they leave only
  one possible background, it is filled in for you." and "Filled in for
  you: the only background the colours ticked allow."

From the Shieldpainter round (the end of November 2026):

- *(Built, see "Semy on one part of the field" above.)* **Semy on one part
  of a divided field** ("Per chevron sable and purpure semy of lions":
  lions on the purpure only) could not be described.
- **"or fewer" for every group:** it is applied to secondary and tertiary
  groups as well as the primary one. Say if Měryem meant the primary only.
- **Checky under a lone cross** now also gets the smaller pieces (a cross
  hides more than half the shield). Easy to limit to "an ordinary AND a
  bordure" if that looks wrong.
- **Search mode** is a first version built to the description; its wording
  is all DRAFT except the two mode links and the title.
- **Wording to check** (DRAFT in the page's `TEXT`): "Hide one-part
  backgrounds", "Hide two-part backgrounds", "With all of these colours",
  and "So little of the background shows that its pattern cannot be made
  out".

From the round of late November 2026 (postures, furs, combined backgrounds):

- **Answered, then taken back** (the end of November 2026: "I was wrong
  about counterchanging; let's go back to the old rule where ordinaries
  have to obey the rules against excessive counterchanging"): ordinaries
  are held to SENA A3F4 like any other charge.
- **Answered:** Sword orientations are right as they are; charges that should go
  the other way will be listed if found (Traceable Heraldic Art's pages
  often give a "default orientation"). Three charges and a canton: right
  as it is.
- **Orientation is a rule of thumb:** a picture drawn upright (a sword) goes
  point to dexter for "fesswise" and point to dexter chief for "bendwise";
  one drawn lying down (a fish, a lion passant) goes head upward for
  "palewise" and head to dexter chief for "bendwise"; "bendwise sinister"
  for a lying picture puts the head to dexter base. Say where a charge
  should go the other way. "Inverted" is not sent to the search (the O&A's
  records had no consistent word for it).
- **Postures the search leaves out** because the records were too few to be
  sure: lodged, tergiant, embowed, urinant, in annulo, and guardant /
  regardant (not indexed at all). A lion drawn in Traceable Heraldic Art's
  "Lion (1)" has no posture word in its name, so none is sent for it; our
  own lion is "rampant".
- **Number assumed:** with no number chosen, the shield top right, its
  blazon and the search all say the number drawn (one; three around a
  chevron), and the suggestions still vary it. Is that right, or should
  picking a charge tick "1" in its card?
- **"furs" is the heading over field treatments too** ("azure masoned Or")
  in the colour menus. A second heading needs your word for it.
- **Jaguar fur and kürsch:** see "Furs and field treatments" under Built.
  Jaguar needs a ruling on its contrast and a picture to copy; kürsch is
  not registerable, so it has been left out unless you say otherwise.
- **Three charges and a canton** do not fit their usual places (the canton
  sits where the first would go), so that is reported as "not enough room".
- **Wording to check** (all marked DRAFT in the page's `TEXT`): "as drawn",
  "facing sinister", the names in the art menu ("Crescent (3), by Roana
  d'Evreux"), "More ways to draw the lion", "and counterchanged with" /
  "nothing else", "add vert ermined Or", "Choose one colour and one metal",
  and "pineapple (see its page)" in the artist credits.

From the Traceable Heraldic Art work (November 2026):

- **Sketch, read as:** the number line has stops 1 to 6 and semy, and
  clicking the chosen stop again un-chooses it; an ordinary has no number
  yet (item 8). The colour menu and the strip of squares under it do the
  same thing. "Mode" changes only the suggestions; the shield top right
  still shows everything chosen. The menu's types are the top level of
  `data/taxonomy.csv` (human, animal, plant, artificial object, natural
  object, abstract) rather than the sketch's person / animal / object /
  celestial; "compact" is a picture no more than 1.35 times as long as it
  is wide, "long and thin" at least 2.4 times. Say where any of this is not
  what was meant.
- **Labels not in `data/taxonomy.csv`:** the topics Maritime and Sciences
  and the type Symbolic are used by a few charges, so they show in the menu.
- **Fleur-de-lys** has no "easy to draw" label (it is not in the old list
  under that name), so it sorts with the rest.
- **Credits:** our own tracings are not credited under the shield (they are
  public domain). Pictures the collection credits to nobody are credited to
  its editor, as its terms page says. Is "lion by Miss Helard" enough, or
  should the collection be named too?
- **Which picture of a charge:** up to ten of each are in now (one of each
  posture first). Traceable Heraldic Art has 92 lions; raising the limit
  (`MOST` in `tools/import_tha.py`) costs about 40 KB a picture.

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
  rule messages. Newest: the line under a colour menu. Its shape and the
  ending "the charge cannot be the same colour as the background" are the
  maintainer's example; the other endings are drafts ("of low contrast -
  please choose a metal", "it needs a background divided into two colours",
  "counterchanging over this many pieces needs period evidence", "that would
  be too many colours and charges", "no shield with the other choices can
  have it"), as is "Sorry, the picture could not be saved in this browser."
  With the new list of charges: "no charge selected yet", and "No other
  charge can be added with the choices made so far. "see all" shows them
  with the reason."

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
- **A pattern drawn with more or fewer pieces** ("paly of eight", larger
  lozenges) is not said in the blazon or the search. Should it be?
- **What "clear all" leaves alone:** the palette, the herald tick, pinned
  suggestions and which sections are collapsed. Should it clear any of them?
- **Semy:** always blazoned "semy of ..." (never "mullety", "crusilly",
  "bezanty", "semy-de-lys"). Strewn charges are 12 across on the shield's
  100 (long thin ones a little longer). With three charges around a fess as
  well, fewer than seven strewn charges fit, so that combination (which
  SENA Appendix J lists) is not offered.
- **Stripes under a chief** (barry, bendy, chevronelly) are still squeezed
  into the space below it; only checky and lozengy keep their shape. Inside
  a bordure nothing is squeezed: everything is made smaller evenly.
- **Six charges on a divided field** are set out three, two and one, which
  Table 7 gives only for an undivided field.
- **"In chevron"** is offered although SENA Appendix K's list of standard
  arrangements does not have it (the O&A has a category for it).
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

- Patterned backgrounds choose among several drawings of themselves to suit
  the charges, rather than having their stripes moved along (maintainer,
  late November 2026: "pick between multiple versions of those backgrounds,
  and automatically pick the one that gives the charges the best contrast").
- Ermine spots are drawn in the outlines-only picture; an ordinary stopping
  where it meets an orle looks correct; saving as PNG works in Firefox
  (maintainer, late November 2026).

- Unity of arrangement (SENA A3D2e): the reading built is right, namely that
  charges in a named arrangement with another charge above or below them
  ("in bend three swords and in chief a mullet") are held back, since the
  two can be taken for one group needing two arrangement phrases; with a
  bordure or chief, or charges lying on them, they are offered as usual
  (maintainer, November 2026: "I'll update later if it turns out I got it
  wrong").
- All the colour menus are slim, with one line under the menu saying why
  colours are greyed (maintainer, November 2026; built).

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
