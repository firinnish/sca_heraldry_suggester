# Contributing charge art

> **DRAFT.** This page was drafted while setting up the project and is waiting
> for the maintainer to rewrite it in their own words. The sections marked
> **TO DECIDE** need the maintainer's decision before contributors are invited.

This project keeps its own library of heraldic charges: one picture per
charge and posture, each labelled so the tools know exactly what it is. The
tools recolour, resize, flip and place these pictures on shields
automatically, which only works if every picture follows the same rules.

## The short version

1. Draw the charge as **black lines on a pure white fill**, on a **transparent background**.
2. Save it as a **PNG**, at least **1000 pixels** on its longest side, cropped close.
3. Name it `charge-posture-number.png`, for example `lion-rampant-1.png`.
4. Add one line for it to `charges/art.csv`.
5. Run the checker and fix anything it reports.

## Rules for the picture

**Format and size**
- PNG, with a transparent background (not white, not a checkerboard pattern).
- At least 1000 pixels on the longest side. Bigger is fine.
- Crop close to the charge: no more than a sliver of empty space on any side.

**Colour**
- Outlines and internal detail lines: solid black.
- Everything that should take the charge's tincture: pure white.
- No other colours, no shading, no gradients, no grey tones. The tools turn the
  white into whatever tincture is needed and keep the black lines (or lighten
  them, on a sable charge).
- Draw the whole charge in one tincture for now. Parts that are usually a
  second tincture (claws, tongues, hilts, stems) are simply white like the rest.

**Drawing**
- One charge per picture, on its own: no shield, no field, no other charges.
- Upright, in its default heraldic position, facing dexter (the viewer's left)
  where that applies. The tools make the mirrored and rotated versions.
- Keep lines bold enough to survive being shrunk to the size of a small charge
  on a shield. Fine hatching and tiny details disappear.
- Every enclosed area should be closed, so that the white fill does not leak
  into the transparent background.
- Aim for a clear, recognisable period heraldic style: the charge should be
  identifiable from its outline alone.

**Where the picture comes from**
- Only contribute pictures you drew yourself, or that you have clear
  permission to contribute. Say which in the `permission` column.
- Do not contribute pictures traced or copied from someone else's collection
  (for example published heraldic art books or websites) unless their creator
  has agreed.

**TO DECIDE (maintainer):** the terms contributors agree to when they give a
picture to the project (for example, that it may be used and adapted by the
project and by SCA members for SCA purposes, with credit to the artist).

## Naming the file

`<charge id>-<posture>-<number>.png`, all lower case, words joined by hyphens.

- The charge id comes from the `id` column of `charges/charges.csv`.
- Leave out the posture for charges that do not have one.
- The number tells apart different drawings of the same thing.

Examples: `lion-rampant-1.png`, `lion-rampant-2.png`, `sword-1.png`,
`laurel-wreath-1.png`.

If the charge is not in `charges/charges.csv` yet, it needs adding there first
(see below).

## Adding the line to `charges/art.csv`

One line per picture:

| Column | What goes in it | Example |
| --- | --- | --- |
| `file` | The file name, exactly | `lion-rampant-1.png` |
| `charge_id` | The charge's `id` from `charges.csv` | `lion` |
| `posture` | The posture or orientation, using the O&A's own words; empty if none | `rampant` |
| `variant` | Anything else that distinguishes this drawing; usually empty | `queue-forchy` |
| `default` | `TRUE` for the one picture that best represents the charge; otherwise empty | `TRUE` |
| `artist` | Who drew it (SCA name or legal name, as the artist prefers) | |
| `source` | Where it came from, if not drawn fresh for this project; otherwise empty | |
| `permission` | `own work`, or who gave permission and how | `own work` |
| `notes` | Anything else worth knowing | |

Postures must be ones the O&A uses, such as `rampant`, `passant`, `statant`,
`sejant`, `couchant` for beasts; `displayed`, `close`, `volant` or `rising` for
birds; `naiant` or `haurient` for fish; and `palewise`, `fesswise`, `bendwise`
for objects. The checker tells you if a word is not recognised.

## Adding a new charge to `charges/charges.csv`

One line per charge (not per picture):

| Column | What goes in it | Example |
| --- | --- | --- |
| `id` | Short lower-case name with hyphens; never changes once used | `laurel-wreath` |
| `name` | The name as blazoned | `Laurel Wreath` |
| `plural` | Only if it is not just the name plus "s" | `fleurs-de-lys` |
| `plain_name` | An everyday name, if the heraldic one is obscure | |
| `oanda_category` | The O&A category code. Look it up in `charges/oanda_categories.csv`; do not guess | `LW` |
| `type` | From `data/taxonomy.csv` | `Plant` |
| `themes` | From `data/taxonomy.csv`; several separated by `;` | `War; Household` |
| `region_culture` | Optional | `Classical` |
| `exclude` | `TRUE` to hide a charge; otherwise empty | |
| `notes` | Anything a herald should know | |

## Checking your work

    python tools/check_charges.py

It lists PROBLEMS (which must be fixed) and WARNINGS (worth a second look), in
plain language, and changes nothing itself. The image checks need the Pillow
library (`pip install pillow`).

## What to draw first

`charges/priority.csv` lists every charge by how often it is named in
registered SCA armory, most-used first, with how many pictures it has so far.
Charges marked "no (drawn by the code)" are ordinaries and simple shapes that
need no picture.

## Sending your contribution

**TO DECIDE (maintainer):** how contributors send pictures in (for example a
GitHub pull request, or sending files to the maintainer directly).
