"""Bring pictures from the Book of Traceable Heraldic Art into charges/tha/.

For every charge the maintainer labelled in data/charges.csv (and that is in
charges/charges.csv, not excluded, and has no picture of our own in
charges/art.csv), this copies its chosen picture from the local SVG/ folder
into charges/tha/, and writes charges/tha.csv with one row per picture,
including who drew it. The credits come from the collection's own list,
https://heraldicart.org/entries.json (see https://heraldicart.org/json).

    python tools/import_tha.py path/to/entries.json

The collection is shared under the Creative Commons CC-BY-SA licence
(https://heraldicart.org/credits): the pictures may be passed on and changed
if the artists are credited and the result is shared the same way. What this
script changes in each picture is written in charges/tha/README.md.

charges/tha.csv and charges/tha/ are GENERATED: do not edit them by hand,
change the labels in data/charges.csv and run this again.
"""

import csv
import json
import os
import re
import sys
import unicodedata

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT_DIR = os.path.join(ROOT, 'charges', 'tha')
OUT_CSV = os.path.join(ROOT, 'charges', 'tha.csv')
COLUMNS = ['file', 'charge_id', 'default', 'artist', 'source', 'link', 'width', 'height', 'complexity']
EDITOR = 'Mathghamhain Ua Ruadháin'   # "Items not explicitly credited ... were created for this collection by the editor"
COMPLEXITY = ('Easy to Draw', 'Complex')

# The pictures paint their insides a very pale grey; ours must be white, so
# that a tincture painted through them comes out at full strength (draw.js).
PALE = re.compile(r'fill="#f[0-9a-f]f[0-9a-f]f[0-9a-f]"', re.I)
LONG_NUMBER = re.compile(r'\d+\.\d{3,}')


def slug(text):
    text = unicodedata.normalize('NFKD', text).encode('ascii', 'ignore').decode('ascii')
    return re.sub(r'[^a-z0-9]+', '-', text.lower()).strip('-')


def plain(text):
    return re.sub(r'[^a-z0-9]+', '', unicodedata.normalize('NFKD', text).encode('ascii', 'ignore').decode('ascii').lower())


def words(text):
    return ' '.join(sorted(w for w in slug(text).split('-') if w))


def slim(svg):
    """The same drawing in fewer bytes: numbers to two decimal places."""
    svg = LONG_NUMBER.sub(lambda m: ('%.2f' % float(m.group(0))).rstrip('0').rstrip('.'), svg)
    return PALE.sub('fill="#ffffff"', svg)


def size_of(svg):
    m = re.search(r'viewBox="\s*[-\d.]+[ ,]+[-\d.]+[ ,]+([\d.]+)[ ,]+([\d.]+)', svg)
    return (float(m.group(1)), float(m.group(2))) if m else (None, None)


def complexity_of(row):
    # (some rows of the old list have their columns shifted along by one)
    for value in row.values():
        if isinstance(value, str) and value.strip() in COMPLEXITY:
            return value.strip()
        if isinstance(value, list):
            for v in value:
                if v and v.strip() in COMPLEXITY:
                    return v.strip()
    return ''


def main():
    if len(sys.argv) != 2:
        sys.exit(__doc__)
    with open(sys.argv[1], encoding='utf-8') as f:
        entries = json.load(f)

    # The collection's entries, by the name of each picture file and by name + number.
    # (and by its words in any order: our "Anvil, Armorer's" is their "Armorer's Anvil")
    by_file, by_name, by_words = {}, {}, {}
    for e in entries:
        for url in (e.get('svgs') or {}).values():
            by_file.setdefault(os.path.basename(url)[:-4].lower(), e)
        by_name.setdefault((plain(e.get('name') or ''), str(e.get('variation') or 1)), e)
        by_words.setdefault((words(e.get('name') or ''), str(e.get('variation') or 1)), e)

    with open(os.path.join(ROOT, 'charges', 'charges.csv'), encoding='utf-8-sig', newline='') as f:
        ours = {r['id']: r for r in csv.DictReader(f)}
    with open(os.path.join(ROOT, 'charges', 'art.csv'), encoding='utf-8-sig', newline='') as f:
        have_own = {r['charge_id'] for r in csv.DictReader(f)}
    with open(os.path.join(ROOT, 'data', 'charges.csv'), encoding='utf-8-sig', newline='') as f:
        labelled = list(csv.DictReader(f))

    os.makedirs(OUT_DIR, exist_ok=True)
    rows, skipped, uncredited, on_a_shape, fills = [], [], [], [], {}
    wanted = set()
    for row in labelled:
        key, source = row.get('key', ''), row.get('default_file', '')
        charge = ours.get(key)
        if not charge or charge.get('exclude') == 'TRUE' or (row.get('exclude') or '').strip():
            continue
        if key in have_own:
            continue
        path = os.path.join(ROOT, *source.split('/'))
        if not source or not os.path.isfile(path):
            skipped.append(f'{key}: no such file {source}')
            continue
        base = os.path.basename(source)[:-4]
        # "Chief 1 Badge", "Bendlets 4 Device": an ordinary or the like drawn
        # filling a badge or shield shape, which is no use as a charge to place.
        if re.search(r'\b(Badge|Device)$', base):
            on_a_shape.append(f'{key}: {base}')
            continue
        name = slug(base) + '.svg'
        if name in wanted:
            skipped.append(f'{key}: {name} is already used by another charge')
            continue
        m = re.match(r'^(.*?)(?: \((\d+)\))?$', base)
        entry = (by_file.get(slug(base)) or by_file.get(slug(base) + '-1')
                 or by_name.get((plain(m.group(1)), m.group(2) or '1'))
                 or by_words.get((words(m.group(1)), m.group(2) or '1')))
        with open(path, encoding='utf-8') as f:
            svg = f.read()
        for fill in re.findall(r'fill="([^"]+)"', svg):
            fills[fill.lower()] = fills.get(fill.lower(), 0) + 1
        width, height = size_of(svg)
        if not width or not height:
            skipped.append(f'{key}: {source} has no size')
            continue
        if not re.search(r'fill="(#f[0-9a-f]f[0-9a-f]f[0-9a-f]|white|#fff)"', svg, re.I):
            skipped.append(f'{key}: {source} has no white inside to paint through')
            continue
        wanted.add(name)
        with open(os.path.join(OUT_DIR, name), 'w', encoding='utf-8', newline='\n') as f:
            f.write(slim(svg))
        if not entry:
            uncredited.append(f'{key}: {base}')
        artists = (entry or {}).get('artists') or []
        rows.append({
            'file': name, 'charge_id': key, 'default': 'TRUE',
            'artist': ', '.join(artists) if artists else (EDITOR if entry else ''),
            'source': '; '.join((entry or {}).get('sources') or []),
            'link': (entry or {}).get('href') or '',
            'width': ('%g' % width), 'height': ('%g' % height),
            'complexity': complexity_of(row),
        })

    # Take away pictures that are no longer wanted.
    for f in os.listdir(OUT_DIR):
        if f.endswith('.svg') and f not in wanted:
            os.remove(os.path.join(OUT_DIR, f))

    rows = [r for r in rows if r['artist']]          # never publish a picture we cannot credit
    kept = {r['file'] for r in rows}
    for f in os.listdir(OUT_DIR):
        if f.endswith('.svg') and f not in kept:
            os.remove(os.path.join(OUT_DIR, f))
    rows.sort(key=lambda r: r['file'])
    with open(OUT_CSV, 'w', encoding='utf-8', newline='') as f:
        w = csv.DictWriter(f, COLUMNS, lineterminator='\n')
        w.writeheader()
        w.writerows(rows)

    total = sum(os.path.getsize(os.path.join(OUT_DIR, r['file'])) for r in rows)
    print(f'{len(rows)} pictures written to charges/tha/ ({total / 1e6:.1f} MB), listed in charges/tha.csv')
    print(f'{sum(1 for r in rows if r["complexity"] == "Easy to Draw")} are labelled easy to draw')
    print('fills seen:', ', '.join(f'{k} x{v}' for k, v in sorted(fills.items(), key=lambda kv: -kv[1])[:12]))
    for title, items in (('LEFT OUT', skipped), ('LEFT OUT: not found in entries.json, so no credit', uncredited),
                         ('LEFT OUT: drawn filling a badge or shield, not a charge to place', on_a_shape)):
        if items:
            print(f'\n{title} ({len(items)}):')
            for item in items:
                print('  ' + item)


if __name__ == '__main__':
    main()
