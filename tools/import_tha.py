"""Bring pictures from the Book of Traceable Heraldic Art into charges/tha/.

For every charge the maintainer labelled in data/charges.csv (and that is in
charges/charges.csv and not excluded), this copies pictures of it from the
local SVG/ folder into charges/tha/, and writes charges/tha.csv with one row
per picture, including who drew it. The credits come from the collection's
own list, https://heraldicart.org/entries.json (see https://heraldicart.org/json).

    python tools/import_tha.py path/to/entries.json

WHICH PICTURES. The picture the maintainer chose for the charge
(`default_file`) always comes first. After it come other pictures of the
same charge, so that people can choose a posture or another artist's drawing
of it: one of each posture ("Lion Passant", "Lion Sejant Erect"), simplest
first, then further drawings of each, up to MOST pictures for a charge.
Which files belong to a charge is in data/charge_group_files.json. A file is
only taken if its name is the charge's name plus words from VARIANT_WORDS
below ("Bear Statant" yes; "Bear Statant, Polar", "Lion Maintaining a Ball"
and "Stag Beetle" no), and those words become the picture's `posture`, which
the blazon and the search use.

The collection is shared under the Creative Commons CC-BY-SA licence
(https://heraldicart.org/credits): the pictures may be passed on and changed
if the artists are credited and the result is shared the same way. What this
script changes in each picture is written in charges/tha/README.md.
A chosen picture the credits list does not name is still brought in, with a
link to the charge's page at heraldicart.org in place of an artist (the
maintainer, November 2026); any other picture without a credit is left out.

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
COLUMNS = ['file', 'charge_id', 'default', 'posture', 'artist', 'source', 'link', 'width', 'height', 'complexity', 'name']
EDITOR = 'Mathghamhain Ua Ruadháin'   # "Items not explicitly credited ... were created for this collection by the editor"
COMPLEXITY = ('Easy to Draw', 'Complex')
MOST = 10                              # pictures of one charge
SITE = 'https://heraldicart.org/'
# Where a charge's page is not simply its name (each opened and checked,
# November 2026): used only for pictures with no credit in entries.json.
PAGE_FOR = {'coronet': 'crown', 'maiden': 'woman', 'pickaxe': 'pick', 'psaltry': 'psaltery'}

# The words in a picture's name that say how the charge is posed or drawn,
# not what it is. (Anything else in the name makes it a different charge.)
VARIANT_WORDS = set('''rampant passant statant couchant courant dormant salient sejant segreant trippant lodged springing
    displayed close rising volant striking stooping migrant naiant haurient hauriant urinant tergiant embowed erect
    guardant regardant reguardant affronty at gaze addorsed wings elevated inverted fesswise bendwise palewise sinister
    in annulo slipped leaved fructed eradicated and contourny reversed'''.split())

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


def default_file_of(row):
    # (the same shifted rows: the file is whichever value names one)
    for value in row.values():
        for v in (value if isinstance(value, list) else [value]):
            if isinstance(v, str) and v.strip().startswith('SVG/') and v.strip().lower().endswith('.svg'):
                return v.strip()
    return ''


def parts_of(base, label):
    """A picture's name taken apart: (what it is beyond the charge's own name,
    how it is posed, its number among drawings of the same thing)."""
    m = re.match(r'^(.*?)(?: \((\d+)\))?$', base)
    name, number = m.group(1), int(m.group(2) or 0)
    if name.lower().startswith(label.lower()):
        name = name[len(label):]
    tokens = [t for t in re.sub(r'&', ' and ', name.lower()).replace(',', ' ').split() if t]
    pose = [t for t in tokens if t in VARIANT_WORDS]
    core = [t for t in tokens if t not in VARIANT_WORDS]
    while pose and pose[0] == 'and':
        pose.pop(0)
    while pose and pose[-1] == 'and':
        pose.pop()
    return ' '.join(core), ' '.join(pose), number


def main():
    if len(sys.argv) != 2:
        sys.exit(__doc__)
    with open(sys.argv[1], encoding='utf-8') as f:
        entries = json.load(f)

    # The collection's entries, by the name of each picture file and by name + number.
    # (and by its words in any order: our "Anvil, Armorer's" is their "Armorer's Anvil")
    by_file, by_name, by_words, pages = {}, {}, {}, set()
    for e in entries:
        for url in (e.get('svgs') or {}).values():
            by_file.setdefault(os.path.basename(url)[:-4].lower(), e)
        by_name.setdefault((plain(e.get('name') or ''), str(e.get('variation') or 1)), e)
        by_words.setdefault((words(e.get('name') or ''), str(e.get('variation') or 1)), e)
        if (e.get('href') or '').startswith(SITE):
            pages.add(e['href'][len(SITE):].split('/')[0])

    def entry_for(base):
        m = re.match(r'^(.*?)(?: \((\d+)\))?$', base)
        return (by_file.get(slug(base)) or by_file.get(slug(base) + '-1')
                or by_name.get((plain(m.group(1)), m.group(2) or '1'))
                or by_words.get((words(m.group(1)), m.group(2) or '1')))

    with open(os.path.join(ROOT, 'charges', 'charges.csv'), encoding='utf-8-sig', newline='') as f:
        ours = {r['id']: r for r in csv.DictReader(f)}
    with open(os.path.join(ROOT, 'charges', 'art.csv'), encoding='utf-8-sig', newline='') as f:
        own_default = {r['charge_id'] for r in csv.DictReader(f) if (r.get('default') or '').strip() == 'TRUE'}
    with open(os.path.join(ROOT, 'data', 'charges.csv'), encoding='utf-8-sig', newline='') as f:
        labelled = list(csv.DictReader(f))
    with open(os.path.join(ROOT, 'data', 'charge_group_files.json'), encoding='utf-8') as f:
        group_files = json.load(f)

    os.makedirs(OUT_DIR, exist_ok=True)
    rows, skipped, linked, on_a_shape, fills = [], [], [], [], {}
    wanted = set()

    def take(key, source, label, is_default, complexity):
        """Copy one picture in; gives back its row for tha.csv, or None."""
        path = os.path.join(ROOT, *source.split('/'))
        base = os.path.basename(source)[:-4]
        name = slug(base) + '.svg'
        if name in wanted:
            if is_default:
                skipped.append(f'{key}: {name} is already used by another charge')
            return None
        entry = entry_for(base)
        if not entry and not is_default:
            return None                                   # no credit: only a chosen picture may go in without one
        with open(path, encoding='utf-8') as f:
            svg = f.read()
        if is_default:
            for fill in re.findall(r'fill="([^"]+)"', svg):
                fills[fill.lower()] = fills.get(fill.lower(), 0) + 1
        width, height = size_of(svg)
        if not width or not height:
            if is_default:
                skipped.append(f'{key}: {source} has no size')
            return None
        if not re.search(r'fill="(#f[0-9a-f]f[0-9a-f]f[0-9a-f]|white|#fff)"', svg, re.I):
            if is_default:
                skipped.append(f'{key}: {source} has no white inside to paint through')
            return None
        artists = (entry or {}).get('artists') or []
        link = (entry or {}).get('href') or ''
        if not entry:
            # No credit to be found: link the charge's page instead.
            page = PAGE_FOR.get(key, slug(label))
            link = SITE + page + '/'
            linked.append(f'{key}: {base} -> {link}' + ('' if page in pages or key in PAGE_FOR or key in ('pineapple', 'raspberry') else '   (CHECK that this page exists)'))
        wanted.add(name)
        with open(os.path.join(OUT_DIR, name), 'w', encoding='utf-8', newline='\n') as f:
            f.write(slim(svg))
        return {
            'file': name, 'charge_id': key,
            'default': 'TRUE' if is_default and key not in own_default else '',
            'posture': parts_of(base, label)[1],
            'artist': ', '.join(artists) if artists else (EDITOR if entry else ''),
            'source': '; '.join((entry or {}).get('sources') or []),
            'link': link,
            'width': ('%g' % width), 'height': ('%g' % height),
            'complexity': complexity, 'name': base,
        }

    for row in labelled:
        key, source = row.get('key', ''), default_file_of(row)
        label = row.get('label') or key
        charge = ours.get(key)
        if not charge or charge.get('exclude') == 'TRUE' or (row.get('exclude') or '').strip() == 'TRUE':
            continue
        if not source or not os.path.isfile(os.path.join(ROOT, *source.split('/'))):
            skipped.append(f'{key}: no such file {source}')
            continue
        base = os.path.basename(source)[:-4]
        # "Chief 1 Badge", "Bendlets 4 Device": an ordinary or the like drawn
        # filling a badge or shield shape, which is no use as a charge to place.
        if re.search(r'\b(Badge|Device)$', base):
            on_a_shape.append(f'{key}: {base}')
            continue
        first = take(key, source, label, True, complexity_of(row))
        if not first:
            continue
        rows.append(first)

        # Other pictures of the same charge: the same thing (`core`), posed
        # or drawn another way.
        core, pose, _ = parts_of(base, label)
        others = {}
        for other in group_files.get(key, []):
            name = os.path.basename(other)[:-4]
            if other == source or re.search(r'\b(Badge|Device)$', name) or not os.path.isfile(os.path.join(ROOT, *other.split('/'))):
                continue
            c, p, n = parts_of(name, label)
            if c == core:
                others.setdefault(p, []).append((n, other))
        for p in others:
            others[p].sort()
        # One of each posture first (fewest words first: "passant" before
        # "passant guardant"), then turn and turn about until MOST is reached.
        order = sorted(others, key=lambda p: (p == pose, len(p.split()), p))
        count, round_ = 1, 0
        while count < MOST and any(len(others[p]) > round_ for p in order):
            for p in order:
                if count >= MOST:
                    break
                if len(others[p]) > round_:
                    made = take(key, others[p][round_][1], label, False, '')
                    if made:
                        rows.append(made)
                        count += 1
            round_ += 1

    # Take away pictures that are no longer wanted.
    kept = {r['file'] for r in rows}
    for f in os.listdir(OUT_DIR):
        if f.endswith('.svg') and f not in kept:
            os.remove(os.path.join(OUT_DIR, f))
    rows.sort(key=lambda r: (r['charge_id'], r['default'] != 'TRUE', r['file']))
    with open(OUT_CSV, 'w', encoding='utf-8', newline='') as f:
        w = csv.DictWriter(f, COLUMNS, lineterminator='\n')
        w.writeheader()
        w.writerows(rows)

    total = sum(os.path.getsize(os.path.join(OUT_DIR, r['file'])) for r in rows)
    print(f'{len(rows)} pictures of {len({r["charge_id"] for r in rows})} charges written to charges/tha/ ({total / 1e6:.1f} MB), listed in charges/tha.csv')
    print(f'{sum(1 for r in rows if r["complexity"] == "Easy to Draw")} are labelled easy to draw')
    print('fills seen:', ', '.join(f'{k} x{v}' for k, v in sorted(fills.items(), key=lambda kv: -kv[1])[:12]))
    for title, items in (('LEFT OUT', skipped),
                         ('NO CREDIT FOUND, so linked to the page at heraldicart.org instead', linked),
                         ('LEFT OUT: drawn filling a badge or shield, not a charge to place', on_a_shape)):
        if items:
            print(f'\n{title} ({len(items)}):')
            for item in items:
                print('  ' + item)


if __name__ == '__main__':
    main()
