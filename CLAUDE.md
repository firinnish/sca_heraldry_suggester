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
  - `core/draw.js`: the SVG picture.
  - `core/oanda.js`: Complex Search patterns and link.
  - `core/rules.js`: SENA's style rules. See below.
  - `core/generate.js`: random shields within constraints. It guesses and asks
    `rules.js`, so it can never disagree with the rules; add rules there, not here.
  - `core/art.js`, `core/csv.js`: the charge library and its pictures.
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
- House rules so far (all about a background where a part is itself divided):
  no pattern of many pieces at the top level; no tincture twice; the divided
  part must be a metal and a colour; one level of nesting; not the same
  division inside itself. SENA is more generous on the first three: tell the
  maintainer if a request needs them relaxed, don't relax them silently.
- Contrast for a charge is judged against the part of the field it actually
  lies on (worked out from geometry + layout), which is how SENA treats a
  chief on a per pall field or two charges side by side on per pale.
- Rule violations never block the search link: people search for old armory
  that breaks today's rules. They grey out options and show a warning.
- Not covered yet: complex lines (SENA Appendix H), arrangements of several
  charge groups (Appendix J), voiding/fimbriation, "sword and dagger".

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
- Each question card sets one thing. "select this shield" on a suggestion
  copies everything into the questions; "pin suggestion" keeps it.

## How the O&A indexes things (verified, do not guess)
- `data/mycat.txt` is the official category list; `data/oanda.db` is the whole
  armorial as text: `name|date|type|blazon|notes|description|description...`.
  Always derive or check an encoding against real records before using it.
- `tests/index.html` checks `core/oanda.js` against every matching record.
  Run it after any change to `core/` (needs the local server, see below).
- Field rules are written at the top of `core/oanda.js`. Both category codes
  (`PPALE`) and category names (`field division, per pale`) work in patterns.
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
  never touches the edge. `fit()` in `draw.js` works from the picture's real
  outline and "a space"; spaces left by other charges are not worked out yet.
- One picture serves several orientations: `inverted` in art.csv's `variant`
  means drawn upside down, and the code flips it as needed. Extend this idea
  (not more art) for other orientations.
- Charge groups are `ordinaryGroup` / `chargeGroup` in `core/shield.js`; for
  now every group is treated as primary. Ordinaries are in `catalog.js`
  (`ORDINARIES`) and drawn by code. See ROADMAP.md for what comes next.
- Never commit a picture whose `artist` and `permission` are empty. The
  maintainer's own tracings of medieval sources are recorded as
  "public domain".

## Open questions
- `apps/suggester/heraldry_mvp.html` still has its own older, guessed link
  builder; it should be moved onto `core/` when the suggester is next worked on.
