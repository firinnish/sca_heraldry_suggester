# SCA heraldry tools

Tools for SCA heraldry that share one core.

## Trying it

In this folder run

    python -m http.server 8767

then open:

- http://localhost:8767/apps/search/ : the simple front end for the O&A Complex Search Form
- http://localhost:8767/apps/suggester/charge_picker.html : the charge picker
- http://localhost:8767/apps/suggester/heraldry_mvp.html : the first suggester prototype
- http://localhost:8767/tests/ : checks the search patterns against the real armorial
- http://localhost:8767/tests/rules.html : checks the rules against SENA's own examples, and the random generator
- http://localhost:8767/tests/charges.html : draws every charge picture in every tincture

## What is where

| Folder | What it holds |
| --- | --- |
| `core/` | The shared engine. `catalog.js` (tinctures and field divisions, with their O&A codes), `shield.js` (the description of a shield, and its blazon), `draw.js` (the picture), `oanda.js` (Complex Search Form patterns and link). |
| `apps/search/` | "What are you searching for?": pick the background, get a filled-in Complex Search Form link. |
| `apps/suggester/` | The earlier suggester prototype and the charge picker. |
| `charges/` | The project's own charge library: `charges.csv` (one row per charge), `art.csv` (one row per picture), `art/` (the pictures), plus two generated lists, `priority.csv` and `oanda_categories.csv`. See [CONTRIBUTING.md](CONTRIBUTING.md). |
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
