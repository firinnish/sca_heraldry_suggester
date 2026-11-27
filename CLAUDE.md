# Notes for Claude (SCA heraldry tools)

One project that shares one core. `apps/search` is BOTH the search front end
for the O&A Complex Search Form AND the shield builder: the maintainer decided
(November 2026) they are the same page, since a builder exports to Complex
Search for conflict checking anyway. `apps/suggester` holds older prototypes.
Read README.md for the layout and ROADMAP.md for what is built and what is next.

## Architecture (decided with the maintainer, November 2026)
- **One shared description of a shield** (`core/shield.js`): a field is plain,
  or a division whose parts are themselves fields (so nesting is free), plus
  charge groups. Anything may be left "not chosen yet" (null): drawing shows
  it grey, the blazon says so, the search leaves it out, the rules skip it.
- **Everything else reads that description** and must not know about any
  particular app:
  - `core/catalog.js`: the vocabulary (tinctures, divisions, ordinaries, their
    O&A codes, SENA's division families). Apps never hard-code these.
  - `core/geometry.js`: shapes as numbers (division regions, ordinaries, the
    shield outline, sample points). Shared by drawing and the rules.
  - `core/layout.js`: where charges go and how big (centre first, then 95%).
    `layoutShield(field, groups)` places everything on a shield; drawing and
    the rules both use its answer, so they cannot disagree.
  - `core/space.js`: the arithmetic under `layout.js` for spaces that are
    not boxes (inside a bordure, beside a chevron, on a bend): spaces as
    grids of cells, "how big does this charge fit here?". Knows no heraldry.
  - `core/arrange.js`: the ways a few charges can go together (around, on,
    above, below), for pages to show as pictures and the generator to pick
    from. It lists what makes sense; `rules.js` says what is allowed.
  - `core/draw.js`: the SVG picture.
  - `core/export.js`: the same picture as a PNG to save (`shieldPNG`):
    coloured in, with anything whose colour is not chosen left see-through,
    or the outlines alone. Read its notes before changing how `draw.js`
    writes a charge's `<image>`: the two must stay in step.
  - `core/oanda.js`: Complex Search patterns and link.
  - `core/rules.js`: SENA's style rules. See below.
  - `core/generate.js`: random shields within constraints. It guesses and asks
    `rules.js`, so it can never disagree with the rules; add rules there, not here.
  - `core/art.js`, `core/csv.js`: the charge library and its pictures.
    `loadLibrary()` gives `pictures` (ready to draw: our own; the random
    generator picks from these) and `all` (every picture known, including
    the hundreds from Traceable Heraldic Art, which are fetched only when
    wanted: `loadPicture(row.file)` before drawing one).
- The shield is the SCA standard escutcheon (traced from Traceable Heraldic
  Art's "Plain" device form, with the maintainer's permission for this use).
  All shapes follow THA's device forms: fess point (50, 50), every diagonal
  45 degrees, stripes sized so ordinaries cover whole pieces. Read the notes
  at the top of `geometry.js` before changing any shape, and check
  `tests/alignment.html` afterwards: a division and an ordinary on it must
  never leave a sliver of field along the ordinary's edge (maintainer's rule).
- Adding a division = a catalog entry + a shape in `geometry.js`. Adding an
  ordinary = the same. Both then appear in the page, the rules and the generator.
- Plain HTML + JavaScript modules, no build step, no dependencies. Node is not
  installed on the maintainer's machine; tests run in the browser.

## The rules (`core/rules.js`) and SENA
- Source: SENA section A3, https://heraldry.sca.org/sena.html (read November
  2026). Every check quotes the sentence it implements. `tests/rules.html`
  holds SENA's own examples and must pass after any change to the rules.
- Problems have a level: `sena` (SENA says no) or `house` (SENA may allow it
  but the maintainer does not want the tools to offer it: too complex, or
  only registerable if drawn just so). The maintainer's rule of thumb: if
  unsure whether something is allowed, do not generate it, but let people who
  tick "I'm a herald and I know what I'm doing" choose it.
- **SENA is the final authority** (maintainer, November 2026): no rule may be
  stricter than SENA about what is allowed. The only house rules left are
  about what the tools can draw and name: one level of nesting, and not the
  same division inside itself. The other "house" case is an ordinary sharing
  a tincture with a field of many pieces (SENA allows it only if drawn so the
  shared tinctures don't touch, which the drawing doesn't yet guarantee);
  a chief, bordure or base is let through, because the maintainer finds they
  read clearly as drawn (late November 2026).
- An ORDINARY may be counterchanged over a field of many pieces (the
  maintainer, late November 2026; SENA A3F4 wants it "attested", and the O&A
  shows the College registering such bends, saltires and bordures since).
  Any other single charge still may not. Both of these were to be checked
  with another herald: see ROADMAP.md before widening or narrowing them.
- A field of many pieces (barry, chevronelly, checky...) counts as neutral
  under a charge lying across its pieces (SENA A3B1; raised by Měryem,
  November 2026). The drawing still nudges such charges onto the tincture
  they contrast with (`nudge` in `layout.js`), and the rules use the same
  placement, so the two always agree.
- Contrast for a charge is judged against the part of the field it actually
  lies on (worked out from geometry + layout), which is how SENA treats a
  chief on a per pall field or two charges side by side on per pale.
- Rule violations never block the search link: people search for old armory
  that breaks today's rules. They grey out options and show a warning.
- Not covered yet: voiding/fimbriation, "sword and dagger" (A3D1b).

## Complex lines (built the end of November 2026)
- `line` on a divided field and on an ordinary group is 'plain' or an id
  from `LINES` in `catalog.js` (wavy, indented, dancetty, embattled,
  engrailed, invected, nebuly, dovetailed, raguly, rayonny): "per pale
  wavy", "a fess embattled", "a bordure engrailed". `canBeLined(division)`
  and `LINED_ORDINARIES` say what can have one so far (not orly, checky,
  lozengy, two divisions together; not the orle, canton, flaunches, gore).
- The shapes are `LINE_SHAPES` in `geometry.js`: ONE REPEAT of each line as
  points. `linedPolygon` redraws each long straight edge of a polygon with
  it. The line along an edge depends only on where the edge lies (it is laid
  out from where the edge's line crosses the pale line), so the two parts of
  a field that share a line get the same line and still fit together. For an
  ordinary (`outward`), a `mirrored` shape points away from the ordinary on
  every edge, and of a fess, bend or chevron embattled only the upper edge
  is (`upper`). A bordure's inner edge is `bordureInner` (`linedLoop`: along
  the outline, cut INTO the bordure so what is inside keeps its room).
- Only DRAWING uses the complex shape of a division (`divisionShapes(...,
  line)`); the rules and the layout work from the plain one (`partMap`),
  which differs by no more than the line's depth. An ordinary's complex
  shape IS what the layout fits things beside and on (`ordinaryParts`).
- O&A: the line's own word stands where "pl" would (`complexLine` in
  `oanda.js`); dancetty is indexed "indented". Checked against the records.
- SENA Appendix H (`checkField`): a complex line between two colours or two
  metals is `complex-line-ruled-out` (sena) for sable with azure or with
  purpure, the two pairings it names, and `complex-line-contrast` (house)
  otherwise ("registerable on a case-by-case basis").
- Build page: "line:" on an ordinary's card (and in its "expand" box), and a
  menu of lines under "How is the background divided?" (`state.fieldLine`),
  which every background picture is then drawn with. The generator only
  uses a complex line when asked (`line` in its constraints).

## Several charge groups (built November 2026)
- The model is in `core/shield.js`: `groups` lists the groups ON THE FIELD;
  each may have `role` ('primary' | 'secondary' | null), `place` for a
  secondary ('around' | 'chief' | 'base'), and `charged` (the group lying on
  it: its tertiary charges; `charged.number` is the number on EACH charge).
  `roles(groups)` works out what each group is and follows SENA Appendix I:
  a central ordinary is always primary, a chief/bordure/orle/base always
  peripheral, one group alone always primary. A `role` of null means "not
  chosen yet": it is drawn as a guess, the blazon says "(arranged any way)",
  the search leaves the group word out, and the rules do not judge it.
- Where things go by default comes from Table 7 ("Default Arrangements") of
  the College of Arms' Glossary of Terms, https://heraldry.sca.org/coagloss.html.
  The tables are at the top of the second half of `layout.js`. Where Table 7
  says "None, must be specified", nothing is drawn and the rules report
  `arrangement-unsupported` (a `house` problem: what the tools cannot draw).
- Rules, in `checkArrangement` / `checkGroups` / `checkTertiary`: Appendix I1
  (a charge beside a central ordinary cannot be primary), Appendix J (three
  or more groups on the field must be a listed grouping; a group "in chief"
  counts as a group around the primary: maintainer), A3D1a (the same
  charge in two groups on the field), A3B4a (a charge on another charge must
  contrast with it), A3D1c (a chief on per fess is allowed with a charge over
  the line). `no-room` (house) = a charge would be drawn too small.
- A group's own charges can be set out in a NAMED ARRANGEMENT: `arranged` on
  the group ('pale', 'chevron', 'oneAndTwo'...; null = the usual way for
  their number). The vocabulary, with O&A categories, is `ARRANGEMENTS` in
  `catalog.js`. `placeArranged` in `layout.js` holds each as a pattern of
  steps across and down, then stretches and slides the pattern until the
  charges are as large as they can be. Only the primary group so far. Four
  charges are two and two by default (maintainer). In the page and the
  generator, 'usual' means "the usual way, chosen on purpose" and null "not
  chosen". A named arrangement with another charge above or below is a
  `house` problem (`arrangement-unity`, SENA A3D2e).
- SEMY: a group's `number` can be `SEMY` (catalog.js). `placeSemy` in
  `layout.js` strews whole charges in staggered rows over a space (the
  field, the space around other charges, an ordinary). Fewer than
  `SEMY_FEWEST` (7) is reported as `no-room`. Blazon: "Azure semy of X Or",
  named with the field. O&A: number `seme`; alone it is primary and the
  armory is also `PS`; around a primary charge the line is `...:seme on field`.
- Patterned fields: checky and lozengy are never squeezed under a chief
  (`KEEPS_ITS_SHAPE` in `geometry.js`). A fur on a field of small pieces
  gets a spot in every piece, even one cut by the edge (`scatter.js`).
  Charges are never nudged sideways on a patterned field, only up or down
  (`nudge` in `layout.js`); the better long-term answer is ROADMAP item 11.
- An ordinary with charges around it is drawn narrower (`SLIM` in
  `layout.js`, `width` in `geometry.js`), keeping its middle line. One alone
  keeps the full width, so `tests/alignment.html` is unaffected.
- FRAMES (`geometry.js`: `frameName`, `frameCentre`, `frameScale`): the
  space the field and the ordinaries are drawn in. Below a chief they are
  squeezed into the space under it; inside a bordure they are made smaller
  evenly about the fess point, so nothing touches the bordure (maintainer,
  November 2026, after a bordure cut the point off a chevron). Inside an
  orle the field is NOT made smaller (it runs under the orle to the edge),
  but an ordinary is, and is drawn through a mask so it stops just short of
  the orle. `layoutShield` returns `frame` (for the field), `within` and
  `edge` (for that mask). The maintainer has confirmed that an ordinary
  stopping where it meets an orle looks right, so it is offered.
- A PATTERN SUITS ITS CHARGES: `layoutShield` also returns `variant`, the
  way a patterned field is drawn (`fieldVariant` in `layout.js`, from
  `DIVISION_VARIANTS` in `geometry.js`: paly, barry, bendy, bendy sinister,
  chevronelly, checky and lozengy, each the usual way or with more or fewer
  pieces), chosen so each charge lies across a line or on the tincture it
  contrasts with. The usual way wins when it does well enough, and is
  always kept when an ordinary other than a chief, bordure or orle is on
  the field (it is the one the ordinary covers exactly). Drawing and the
  rules both use the variant. Stripes are never slid sideways instead: that
  leaves an odd number of pieces, which is not paly. The default drawing of
  every pattern must stay byte-identical (`tests/snapshot.html`). Still to
  do under ROADMAP item 11: Traceable Heraldic Art's own drawings.
- A bordure or orle follows `framePath`: beside a chief it runs along under
  the chief. The maintainer sketched this and three placements (four around
  a bend, two around a cross, four around a chevron inverted) in November
  2026; they are in the `AROUND` table with a note.
- `tests/groups.html` draws every combination: LOOK at it after changing
  `layout.js` or `space.js` (pick a real charge from its menu too).
  `tests/snapshot.html` proves a change to `core/` left existing shields
  exactly as they were: press "Save the current results" BEFORE the change,
  reload after. A byte-identical result is the bar for a refactor.
- Speed: placings are remembered (`layoutShield`'s cache, and `placings` for
  the parts of one). The generator asks `checkArrangement` before trying an
  arrangement, and `whichWork` tests every colour (or number) for a charge
  against the same guesses instead of guessing afresh for each.
- Open questions for the maintainer about all this are in ROADMAP.md.

## Postures, furs and backgrounds laid over each other (built late November 2026)
- **A charge can be turned.** `chargeGroup` has `turned` (an id from
  `ORIENTATIONS` in `catalog.js`: palewise, fesswise, bendwise, bendSinister)
  beside `inverted` and `mirror`, and `artPosture` (what the picture shows,
  which tells an upright picture from one lying down: `isLying`). `art.js`
  makes a TURNED PICTURE (`turnedPicture`): the same picture with its outline
  worked out again as it will be drawn, so `layout.js` fits it like any
  other, and `draw.js` (`drawTurned`) draws the real picture rotated. Flips
  happen first, in the picture's own frame, then the turn.
- **Postures for the search** are `POSTURES` in `catalog.js`: blazon words to
  the O&A's word, each checked against real records (the notes there say
  which). Do not add one without checking. `stanceOf` in `generate.js` reads
  how a chosen charge is turned from its choice (`turned`, `inverted`,
  `mirror`, `noPosture`), for pages and the generator alike.
- **Three more ordinaries along the edge:** canton, flaunches, gore
  (`ORDINARIES`: `count` is the number the O&A's line carries, `plainLine:
  false` means no "pl"; flaunches are a pair, named without "two"). Their
  curves are copied from Traceable Heraldic Art's device forms. They take
  up space without re-framing the field (`TAKES_SPACE` in `layout.js`).
- **Furs and field treatments made from two tinctures.** `TINCTURES` also
  answers for `vair`, `potent` and ids like `ermined:vert:or`,
  `vairy:or:gules`, `masoned:azure:or` (`PATTERNS` and `tinctureFrom` in
  `catalog.js`). `Object.keys(TINCTURES)` still lists only the eleven named
  ones, which `tests/index.html` relies on. `tone` may be `neutral` (vair
  and its kin: SENA A3B1); `groundsOf` / `sharesGround` say what a tincture
  can be mistaken for (use these, not `baseTincture`, for "share a
  tincture"). The tiles are `TILES` in `draw.js`; the O&A lines, each from
  real records, are at `madeFieldLine` and `chargeTincture` in `oanda.js`.
  Jaguar and kürsch are deliberately absent (ROADMAP.md says why).
- **Orly, and two divisions counterchanged over each other.** A division id
  may be two ids joined by "+" (`orly+chevronelly`; `divisionsTogether` in
  `catalog.js`), and `DIVISIONS` answers for it; `Object.keys(DIVISIONS)`
  lists only the single ones, so the generator and the division pictures
  never offer them. They, and orly, are LAYERED shapes (`isLayered` in
  `geometry.js`): a place belongs to a part if an odd number of that part's
  shapes cover it, which drawing does with "evenodd" and `partMap` does by
  counting. The rules treat them as fields of many pieces.

## Clear arrangements, readable patterns, search numbers (the end of November 2026)
- `placeArranged` (`layout.js`) no longer simply makes charges as large as
  possible. Charges side by side are set out EVENLY first: the step between
  them is such that the gap between two equals the gap from the outermost to
  the shield's edge at that height (`sidesAt` in `space.js`), and only then
  are they made as large as that allows. Charges in rows keep the top row
  out of the bottom third and the bottom row out of the top third. A line
  in bend is centred sideways. These were all the maintainer's, from
  pictures of needles "in fess" huddled into "some sort of stripy pale".
- `clearOfLines` (`layout.js`, run by `layoutShield`): on a field of a few
  big parts, a charge with only a sliver of itself beyond a line (under
  `SLIVER`) makes its whole group a little smaller, each about its own
  centre, until every charge is clearly one side or clearly across. Drawing
  and the rules both get this layout, as always.
- Checky and lozengy: `fieldVariant` draws them twice as fine (`FINER`) when
  less than half the shield shows the field (`fieldShowing`); `rules.js`
  reports `pattern-hidden` (house) when less than a quarter does.
- Strewn charges may share no tincture at all with what they lie on, spots
  and masoning included (`tincturesWithin` in `catalog.js`; in `checkGroup`).
- Search numbers: 2, 3 and 4 go as "N or fewer" (`numberWord` in
  `oanda.js`, Měryem's advice; my.cat's number words make "3" a kind of "3
  or fewer"). `tests/index.html` knows this.
- A divided field with charges strewn over it is blazoned "all semy of".
  Semy on one part only cannot be described yet.

## The two pages
- `apps/search/` is "Forannán's Shieldpainter 1.0", the BUILD MODE (the
  maintainer's name for it, the end of November 2026). `apps/searchonly/` is
  the SEARCH MODE: compact menus for heralds, no suggestions, pictures only
  behind "show images", and then static ones ("Sable, N blobs Or"). Each
  links to the other under its title ("Build mode - click for search mode"
  / "Search mode - click for build mode": the maintainer's words). They
  share `core/` and nothing else, so a change to how the build page behaves
  does not reach the search page by itself.
- In search mode the background starts as "any" and FILLS ITSELF IN
  (`settleBackground`): when the colours ticked under "What colours are used
  in the shield?" and the charges described leave only one background the
  rules allow, it is put into the menus (azure and Or ticked, an Or charge:
  plain azure). It is worked out afresh on every other change until the
  herald touches the background's own menus, and never while "don't specify
  background" (the maintainer's words) is ticked.

## How the page behaves (decided with the maintainer)
- (The end of November 2026.) "make suggestion" under an option's picture
  (`card`, `pins`) puts that whole design among the suggestions, pinned.
  With two or more background colours chosen, "Show one-part backgrounds" /
  "Show two-part backgrounds" (`state.showParts`) bring out the backgrounds
  that use fewer of them; nothing is hidden for good. A charge's colour is
  chosen for it when only one is possible (`assumeChargeColours`), on the
  same footing as the background's. A charge on a canton shows the
  maintainer's augmentation warning and is otherwise allowed.
- (Late November 2026.) The list of charges shows each charge ONCE, as its
  usual picture (`picturesOf`: the default in art.csv, else in tha.csv). Its
  card, once picked, has "posture:", "art:" and "orientation:" as well as
  number and colour, and "expand", which opens a box the full width of the
  question with all of them as pictures (`explorerBox`). A posture or
  another drawing is another picture: fetch it before drawing
  (`setPicture`).
- The shield top right says the number it DRAWS when none is chosen
  (`assumeNumbers`), and so do its blazon and search; "don't specify" under
  the number keeps it open. When the search lacks a number or a posture, a
  line under the button says so (the maintainer's sentence, `searchNeeds`).
- When the shield's colours leave the background only one set of colours,
  they are ticked in the background question as soon as a division is
  picked or the shield's colours change (`assumeFieldColours`): not
  continuously, so a colour can still be un-ticked by hand.
- "More complex options" (the maintainer's words) under the shield's
  colours makes a fur or field treatment from two colours and adds it to
  the furs in every colour menu (`state.extraTinctures`).
- "more complex background" has "and counterchanged with" for a second
  division over the first, when both parts are plain colours.
- "AI disclosure" beside the herald tick opens a box with the maintainer's
  own text (`TEXT.aiText`): do not reword it.
- Three areas: questions (top left, scrolls on its own, always shows every
  question), the shield being built (top right), suggestions (bottom).
- Nothing waits for an earlier answer. Unanswered things are filled at random
  in option pictures and suggestions, within the rules. Random pictures are
  seeded from what they depend on, so they only change when that changes.
- Question 1 "colours used in the shield" is a palette (a subset may be used;
  with only one ticked it must appear but others may too). "Colours used in
  the background" means exactly those; it now comes AFTER "How is the
  background divided?" (the maintainer, November 2026: picking the colours
  afterwards feels more natural).
- An option the rules forbid is shown greyed with the reason, never hidden
  ("misses a chance for education"). Option groups are limited to about 18.
- The shield top right assumes a colour when the shield's colours leave only
  one legal possibility (a background part, the charge's colour). "don't
  specify" (the maintainer's words) keeps it open for searching.
- With a chief, the field is drawn in the space below it (divisions through
  the middle of that space), and inside a bordure in the space inside it;
  the rules judge contrast on the shapes as drawn.
- Each question card sets one thing. "select this shield" on a suggestion
  copies everything into the questions; "pin suggestion" keeps it.
- "What charges are on the field?" (the maintainer's words) takes up to
  three kinds of charge; picking one again takes it off. It follows the
  maintainer's sketch of November 2026 (all its words are theirs):
  - a menu on the left ("default view", "see all", then "topic", "type" and
    "artistic need", from the labels in charges.csv and data/taxonomy.csv),
    a box to search by name (which looks through everything), and the
    pictures in a box that scrolls. The DEFAULT VIEW shows only what can
    still be chosen: ordinaries, then charges whose picture is labelled
    easy to draw, then the rest, each alphabetically. Other views show
    greyed options with the reason, as everywhere else.
  - There are hundreds of charges, so a card is only worked out when it
    scrolls into view (`gridJobs` and an IntersectionObserver in
    `renderChargePanel`), and its picture is fetched first. Never draw a
    shield with a Traceable Heraldic Art picture before `loadPicture` has
    finished: it would come out as a blob and be remembered that way.
  - a switch: "Suggestions include any of my selections" / "Must include
    ALL of my selections" (`state.any`; it changes only the suggestions).
  - a card per charge chosen: "you selected: lion", its picture, "number:"
    as stops on a line from 1 to semy, "colour:" as a menu with a strip of
    small squares under it, and the one line saying why any are greyed.
  - under the shield top right, "Artist credits:" for every Traceable
    Heraldic Art picture on it, and a link to the licence. Required by the
    licence: do not remove it.
  People must not need the words primary, secondary
  or tertiary: "How are they arranged?" shows every way the chosen charges
  can go together as a picture, forbidden ways greyed with the reason. "I'm
  a herald" adds a menu per charge to say which is which directly.
- As with colours, if only one arrangement is legal the shield top right
  assumes it; "don't specify" keeps it open.
- Suggestions may add a charge that was not picked; option pictures never do.
- A picture that has not been worked out before is shown as an empty shield
  and filled in a moment later (`lazyCard`, `fillLater` in the page), so a
  click is never held up by it. The greying of "How many?" and the colours
  is worked out the same way (`slotBlock`); until it is ready the block
  shows what was greyed before.
- "How many?" goes to six, then "semy" (the maintainer's word). "How are
  they arranged?" (their wording) shows each way a charge's own charges can
  be arranged as a picture, labelled with its heraldic name from
  `catalog.js`: with one kind of charge, and even before any is picked. With
  two or more kinds it also shows how they go together. Choosing another
  number drops an arrangement that no longer fits.
- Every colour menu is the slim one (the maintainer's sketch; `slimSets` in
  the page): small squares, the heraldic name in bold, the everyday word in
  brackets, each set in its own outline. A greyed colour does not carry its
  reason; ONE line under the menu does, colours with the same reason
  sharing a sentence: "Azure is not available because the charge cannot be
  the same colour as the background" (the maintainer's example; the
  sentence ends are in `TEXT.because`).
- "clear all" (beside the title) takes back every answer but leaves the
  palette, the herald tick, pinned suggestions and collapsed sections.
  "save as png" and "save as png (outlines only)" (under the search button)
  save the shield shown top right through `core/export.js`. All three
  labels are the maintainer's words.
- The maintainer cannot easily run a local server (python is not on their
  terminal's PATH). To let them try unmerged work, commit it to a branch and
  put a copy in a `preview/` folder on `main` (core, apps/search, charges,
  tests, and data/taxonomy.csv), which GitHub Pages serves at
  `.../preview/apps/search/`. Delete
  the folder when the branch is merged.

## How the O&A indexes things (verified, do not guess)
- `data/mycat.txt` is the official category list; `data/oanda.db` is the whole
  armorial as text: `name|date|type|blazon|notes|description|description...`.
  Always derive or check an encoding against real records before using it.
- `tests/index.html` checks `core/oanda.js` against every matching record.
  Run it after any change to `core/` (needs the local server, see below).
- Field rules are written at the top of `core/oanda.js`. Both category codes
  (`PPALE`) and category names (`field division, per pale`) work in patterns.
- Charge groups (checked on hundreds of records and on the live form): the
  primary group is `...:primary` (records say spa, spna, g3pa...), a
  secondary group `STAR:3:argent:second` ("secondary" finds the same), a
  tertiary group `ROSE:3:gules:tertiary`, with the number on the whole shield
  ("three flames each charged with a heart" is `HEART:3`). A chief, bordure
  or base is just `CHIEF:or:pl`. The page sends the primary group as one line
  per feature and every other group as a single line.
- The live form is https://oanda.sca.org/oanda_complex.cgi (GET; parameters
  `w1..w10`, `m1..m10`, `p1..p10`, plus `l`, `s`, `d`, `g`, `a`, `raw`, `rs`).

## Working with the maintainer
- **The maintainer writes all text shown to users.** Use their wording
  verbatim. If new UI needs words, put a draft in the page's `TEXT` block
  marked `// DRAFT` and tell them; point out (don't silently fix) issues in
  their text.
- **UI changes: test locally first, push only after the maintainer has tried
  them.** They run `python -m http.server 8767` in this folder and open
  http://localhost:8767/apps/search/ (pages must be served, not opened as
  files, because they use JavaScript modules).
- Explain in plain language; the maintainer is a herald, not a confident git
  user. Say clearly when something is waiting for their OK.
- Citations for heraldic rules must come from official SCA sources (SENA, the
  O&A itself, Laurel precedents), not third-party summaries.

## Environment (maintainer's Windows machine)
- PowerShell 5.1. `git` is not on PATH: use GitHub Desktop's bundled git,
  `%LOCALAPPDATA%\GitHubDesktop\app-<version>\resources\app\git\cmd\git.exe`.
- This repo belongs to the GitHub account `firinnish` (the maintainer's other
  repo, scamap, is under `khs`): pushing needs that login.
- `python -c "..."` with nested quotes gets mangled by PowerShell: write a
  script file to the scratchpad instead.
- The maintainer edits CSVs (`data/charges.csv`, `data/taxonomy.csv`) in
  LibreOffice. Check for `.~lock.*#` files before writing to them and never
  overwrite their edits.

## Never commit (kept on the maintainer's machine only, see .gitignore)
- `SVG/` (the whole Book of Traceable Heraldic Art as downloaded: 9,000
  files, 466 MB). Never commit the folder itself. What IS published, since
  the maintainer asked for it in November 2026, is `charges/tha/`: a slimmed
  copy of the one picture chosen for each labelled charge, with every
  artist credited in `charges/tha.csv` and under any shield that uses one.
  The collection is shared under Creative Commons CC-BY-SA
  (https://heraldicart.org/credits), which allows this as long as the
  credits stay and the copies are shared the same way
  (`charges/tha/README.md`). Never add a picture there by hand: run
  `tools/import_tha.py`. A picture the collection's list gives no credit
  for goes in only if it is the one the maintainer chose for a charge, and
  then with a link to that charge's page at heraldicart.org in place of an
  artist (the maintainer, late November 2026); the script does this.
- `data/oanda.db` (SCA copyright). Only `tests/` needs it; nothing users see
  may depend on it being present.
- The repository is public (GitHub Pages on a free account needs that) and
  other contributors are joining: keep it limited to what belongs there.

## Palettes (`core/palettes.js`)
- People choose the colour scheme shields are drawn in, under question 1;
  the choice is kept in the browser. Each palette links to where it was
  published. Names are the maintainer's wording. Forannán's "alternative"
  palette (purpure as in the post's "5b" picture) has APPROXIMATE codes for azure, gules, purpure and vert (read from
  a picture): replace them when the exact codes are known.

## The charge library (`charges/`)
- This is the project's own database, replacing the Traceable Art one:
  `charges/charges.csv` (one row per charge), `charges/art.csv` (one row per
  picture), `charges/art/*.png`. Rules for pictures are in CONTRIBUTING.md:
  black lines, white fill, transparent background, 1000px+, facing dexter.
- Beside our own pictures there are the ones from Traceable Heraldic Art:
  `charges/tha.csv` and `charges/tha/*.svg`, both GENERATED by
  `python tools/import_tha.py <entries.json>` (entries.json is the
  collection's list of credits, from https://heraldicart.org/json) out of
  the labels in `data/charges.csv` and the local `SVG/` folder. Their
  insides are a pale grey in the original, made white on the way in. Each
  charge gets up to ten pictures (`MOST`): the one the maintainer chose,
  then one of each posture, then other drawings; `posture` is read from the
  picture's name (`VARIANT_WORDS`), and a name with any other word in it is
  a different charge and is left out. A charge with a picture of our own
  keeps it as its usual one unless art.csv leaves `default` empty (the
  crescent). The script says what it left out and why. `tests/tha.html` draws every one: look at
  it after importing. `art.csv` has a `complexity` column ("Easy to Draw" /
  "Complex", the maintainer's label), which the default view sorts by.
- Run `python tools/check_charges.py` after any change to it; it must report
  no PROBLEMS before committing. `oanda_category` is always looked up in
  my.cat (`charges/oanda_categories.csv`), never guessed.
- `charges/priority.csv` and `charges/oanda_categories.csv` are generated by
  `tools/rank_charges.py` (needs the local oanda.db); don't hand-edit them.
- Shape (tall / long / compact) is to be measured from the image, not typed.
- `data/charges.csv` is the OLD list (it only feeds the old charge picker and
  has some rows with shifted columns). `charges/charges.csv` was seeded from
  it in November 2026 and is the one to use and edit from now on.
- Recolouring is built in `core/draw.js` (tincture painted through a mask of
  the picture's white areas, lines drawn on top, grey lines on black charges).
  `tests/charges.html` draws every picture in every tincture and every
  ordinary: look at it after changing charge drawing.
- Pictures are measured in the browser (`core/art.js`), so pages must
  `await loadLibrary()` (or `loadPicture`) before drawing charges; anything
  not loaded is drawn as a blob. No build step is needed when art is added.
- Sizing rule (maintainer's): a charge fills 95% of the space it is in and
  never touches the edge. `layout.js` works from the picture's real outline
  and the space the other things on the shield leave it.
- One picture serves several orientations: `inverted` in art.csv's `variant`
  means drawn upside down, and the code flips it as needed. Extend this idea
  (not more art) for other orientations.
- Charge groups are `ordinaryGroup` / `chargeGroup` in `core/shield.js` (see
  "Several charge groups" above). Ordinaries are in `catalog.js`
  (`ORDINARIES`) and drawn by code. See ROADMAP.md for what comes next.
- Never commit a picture of our own (`charges/art/`) whose `artist` and
  `permission` are empty. The
  maintainer's own tracings of medieval sources are recorded as
  "public domain".

## Open questions
- `apps/suggester/heraldry_mvp.html` still has its own older, guessed link
  builder; it should be moved onto `core/` when the suggester is next worked on.
