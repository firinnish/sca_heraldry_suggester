# SCA heraldry tools

Tools for SCA heraldry that share one core.

## Trying it

In this folder run

    python -m http.server 8767

then open:

- http://localhost:8767/apps/search/ : Forannán's Shieldpainter (build mode), with the Complex Search link
- http://localhost:8767/apps/searchonly/ : the compact search mode for heralds
- http://localhost:8767/apps/suggester/charge_picker.html : the charge picker
- http://localhost:8767/apps/suggester/heraldry_mvp.html : the first suggester prototype
- http://localhost:8767/tests/ : checks the search patterns against the real armorial
- http://localhost:8767/tests/rules.html : checks the rules against SENA's own examples, and the random generator
- http://localhost:8767/tests/charges.html : draws every charge picture in every tincture
- http://localhost:8767/tests/alignment.html : draws every ordinary on every field division, to check their lines meet cleanly
- http://localhost:8767/tests/groups.html : draws every way charges go together (around, above, below and on each ordinary; inside a chief or bordure), to check nothing touches or is too small
- http://localhost:8767/tests/snapshot.html : a before / after check, for changes to `core/` that are meant to leave existing shields exactly as they were

## What is where

| Folder | What it holds |
| --- | --- |
| `core/` | The shared engine. `catalog.js` (tinctures and field divisions, with their O&A codes), `shield.js` (the description of a shield, and its blazon), `draw.js` (the picture), `export.js` (the picture as a PNG to save), `oanda.js` (Complex Search Form patterns and link), `rules.js` (SENA's style rules), `generate.js` (random shields), `geometry.js`, `layout.js` and `space.js` (shapes, and where charges go around and on each other), `arrange.js` (the ways several charges can go together), `scatter.js` (ermine spots), `palettes.js` (colour schemes). |
| `apps/search/` | "Forannán's Shieldpainter 1.0", the build mode: pick the background and the charges from pictures, see the shield, get suggestions, save it as a PNG, and get a filled-in Complex Search Form link. |
| `apps/searchonly/` | The search mode, for heralds: the same description made from compact menus, with no suggestions and pictures only on request. |
| `apps/suggester/` | The earlier suggester prototype and the charge picker. |
| `charges/` | The project's own charge library: `charges.csv` (one row per charge), `art.csv` (one row per picture), `art/` (the pictures), `tha.csv` and `tha/` (pictures from the Book of Traceable Heraldic Art, with their artists, shared under its Creative Commons CC-BY-SA licence: see `charges/tha/README.md`), plus two generated lists, `priority.csv` and `oanda_categories.csv`. See [CONTRIBUTING.md](CONTRIBUTING.md). |
| `data/` | `charges.csv` and `taxonomy.csv` (edited by hand), `mycat.txt` (the O&A category list), and generated charge lists. |
| `tools/` | `check_charges.py` (checks the charge library for mistakes), `rank_charges.py` (rebuilds the two generated lists), `build_charges_data.py` (feeds the old charge picker from `data/charges.csv`). |
| `tests/` | A page that checks `core/oanda.js` against every matching record in the O&A database. |

What is planned next is in [ROADMAP.md](ROADMAP.md).

## Not in this repository

Two things are deliberately kept off GitHub:

- `data/oanda.db`, the O&A database (SCA copyright). The checks in `tests/` need a copy at that path; nothing else does.
- `SVG/`, the charge images used by the charge picker. Without them the picker lists charges but shows no pictures.

## Adding a field division

1. Add an entry to `DIVISIONS` in `core/catalog.js` (name, number of parts, O&A code) and to its family there.
2. Add its shape to `DIVISION_SHAPES` in `core/geometry.js`.
3. Open http://localhost:8767/tests/ and check it passes.

It then appears in the search page automatically.
