"""One-off (28 November 2026): give charges/charges.csv a `synonyms` column.

The maintainer asked that every kind of boat (rowboat, trireme, drakkar...)
be found by typing "boat" or "ship", and be under the topic "Maritime". This
adds the column after `plain_name`, fills it for the boats, and adds
"Maritime" to their themes. Every other row is left exactly as it was, with
an empty cell in the new column.

    python tools/add_synonyms_column.py

It does nothing if the column is already there. Close the file in
LibreOffice first (it refuses while a lock file is present).
"""
import csv
import glob
import io
import os
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PATH = os.path.join(ROOT, 'charges', 'charges.csv')
BOATS = {'canoe', 'caravel', 'drakkar', 'gondola', 'hulk', 'lymphad', 'rowboat', 'trireme'}
WORDS = 'boat; ship'


def main():
    if glob.glob(os.path.join(ROOT, 'charges', '.~lock.*')):
        sys.exit('charges.csv is open in LibreOffice: close it first.')
    with open(PATH, encoding='utf-8', newline='') as f:
        text = f.read()
    eol = '\r\n' if '\r\n' in text else '\n'
    lines = text.split(eol)
    header = next(csv.reader([lines[0]]))
    if 'synonyms' in header:
        sys.exit('charges.csv already has a synonyms column: nothing done.')
    at = header.index('plain_name') + 1
    themes = header.index('themes') + 1          # (its place once the new column is in)
    out, boats = [], 0
    for n, line in enumerate(lines):
        if not line:
            out.append(line)
            continue
        row = next(csv.reader([line]))
        if len(row) != len(header):
            sys.exit(f'line {n + 1} has {len(row)} cells, not {len(header)}: nothing done.')
        row.insert(at, 'synonyms' if n == 0 else '')
        if n and row[0] in BOATS:
            boats += 1
            row[at] = WORDS
            have = [t.strip() for t in row[themes].split(';') if t.strip()]
            if 'Maritime' not in have:
                row[themes] = '; '.join(have + ['Maritime'])
        cell = io.StringIO()
        csv.writer(cell, lineterminator='').writerow(row)
        out.append(cell.getvalue())
    with open(PATH, 'w', encoding='utf-8', newline='') as f:
        f.write(eol.join(out))
    print(f'added the synonyms column; {boats} boats now answer to "{WORDS}" and are under Maritime')


if __name__ == '__main__':
    main()
