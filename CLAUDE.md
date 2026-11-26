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
  - `core/oanda.js`: Complex Search patterns and link.
  - `core/rules.js`: SENA's style rules. See below.
  - `core/generate.js`: random shields within constraints. It guesses and asks
    `rules.js`, so it can never disagree with the rules; add rules there, not here.
  - `core/art.js`, `core/csv.js`: the charge library and its pictures.
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
  shared tinctures don't touch, which the drawing doesn't yet guarantee).
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
- Not covered yet: complex lines (SENA Appendix H), voiding/fimbriation,
  "sword and dagger" (A3D1b).

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
  the group ('pale', 'chevron', 'twoAndTwo'...; null = the usual way for
  their number). The vocabulary, with O&A categories, is `ARRANGEMENTS` in
  `catalog.js`. `placeArranged` in `layout.js` holds each as a pattern of
  steps across and down, then stretches and slides the pattern until the
  charges are as large as they can be. Only the primary group so far. Four
  charges have no usual arrangement (`needs-arrangement`). In the page and
  the generator, 'usual' means "the usual way, chosen on purpose" and null
  "not chosen".
- An ordinary with charges around it is drawn narrower (`SLIM` in
  `layout.js`, `width` in `geometry.js`), keeping its middle line. One alone
  keeps the full width, so `tests/alignment.html` is unaffected.
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

## How the page behaves (decided with the maintainer)
- Three areas: questions (top left, scrolls on its own, always shows every
  question), the shield being built (top right), suggestions (bottom).
- Nothing waits for an earlier answer. Unanswered things are filled at random
  in option pictures and suggestions, within the rules. Random pictures are
  seeded from what they depend on, so they only change when that changes.
- Question 1 "colours used in the shield" is a palette (a subset may be used;
  with only one ticked it must appear but others may too). Question 2
  "colours used in the background" means exactly those.
- An option the rules forbid is shown greyed with the reason, never hidden
  ("misses a chance for education"). Option groups are limited to about 18.
- The shield top right assumes a colour when the shield's colours leave only
  one legal possibility (a background part, the charge's colour). "don't
  specify" (the maintainer's words) keeps it open for searching.
- With a chief, the field is drawn in the space below it (divisions through
  the middle of that space); the rules still judge contrast on the whole-
  shield shapes.
- Each question card sets one thing. "select this shield" on a suggestion
  copies everything into the questions; "pin suggestion" keeps it.
- "What charges are on the field?" (the maintainer's words) takes up to
  three kinds of charge; picking one again takes it off. Each has its own
  "How many?" and colour. People must not need the words primary, secondary
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
- "How many?" goes to six. For two or more, "How are they set out?" shows
  each arrangement as a picture, labelled with its heraldic name from
  `catalog.js`. Choosing another number drops an arrangement that no longer
  fits.
- The maintainer cannot easily run a local server (python is not on their
  terminal's PATH). To let them try unmerged work, commit it to a branch and
  put a copy in a `preview/` folder on `main` (core, apps/search, charges,
  tests), which GitHub Pages serves at `.../preview/apps/search/`. Delete
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
- `SVG/` (Traceable Heraldic Art). Not to be published or used in anything
  public until the maintainer has talked to its creator and labelled it
  properly. Until then charges are drawn as blobs; the maintainer will supply
  charge art gradually. The charge picker only shows pictures locally.
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
- Never commit a picture whose `artist` and `permission` are empty. The
  maintainer's own tracings of medieval sources are recorded as
  "public domain".

## Open questions
- `apps/suggester/heraldry_mvp.html` still has its own older, guessed link
  builder; it should be moved onto `core/` when the suggester is next worked on.
