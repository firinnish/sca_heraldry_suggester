"""
check_charges.py: check the charge database for mistakes.

Run this after editing charges/charges.csv or charges/art.csv, or after adding
images to charges/art/:

    python tools/check_charges.py

It reads (and never changes):
    charges/charges.csv   one row per charge
    charges/art.csv       one row per image
    charges/art/          the images themselves
    data/mycat.txt        the official O&A category list
    data/taxonomy.csv     the allowed "type" and "themes" values

PROBLEMS must be fixed. WARNINGS are things worth a second look.
The image checks need the Pillow library (pip install pillow); without it the
spreadsheets are still checked and the image checks are skipped.

For testing, --dir points at a different charges folder.
"""
import argparse, csv, os, re, sys

ROOT = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))

CHARGE_COLUMNS = ['id', 'name', 'plural', 'plain_name', 'oanda_category', 'type',
                  'themes', 'region_culture', 'exclude', 'notes']
ART_COLUMNS = ['file', 'charge_id', 'posture', 'variant', 'default', 'artist',
               'source', 'permission', 'notes', 'complexity']
COMPLEXITY = ('', 'Easy to Draw', 'Complex')   # how hard the picture is to draw (the maintainer's label)

MIN_LONGEST_SIDE = 1000     # pixels: what we ask for (smaller gets a warning)
TOO_SMALL = 500             # pixels: below this the image is refused
MAX_MARGIN = 0.05           # empty space allowed around the charge, per side
MAX_COLOURED = 0.02         # share of pixels allowed to be neither black, white nor grey

ID_PATTERN = re.compile(r'^[a-z0-9]+(-[a-z0-9]+)*$')
FILE_PATTERN = re.compile(r'^[a-z0-9]+(-[a-z0-9]+)*\.png$')

# Which my.cat posture list normally applies to which type of charge.
POSTURE_SET_FOR_TYPE = {'Bird': 'bird_posture', 'Sea Creature': 'fish_posture'}
ANIMATE_TYPES = {'Mammal', 'Reptile', 'Insect', 'Fantastical or Mythical', 'Other (Animal)',
                 'Human', 'People', 'Bird', 'Sea Creature'}


def read_csv(path):
    with open(path, encoding='utf-8-sig', newline='') as f:
        reader = csv.DictReader(f)
        return reader.fieldnames or [], list(reader)


def load_mycat(path):
    """Returns (category codes, {feature set name: set of allowed words})."""
    codes, sets = set(), {}
    with open(path, encoding='latin-1') as f:
        for line in f:
            line = line.rstrip('\n')
            if line.startswith('|'):
                name, _, rest = line[1:].partition(':')
                for word in re.split(r'[<=]', rest):
                    sets.setdefault(name, set()).add(word.strip())
            elif '|' in line and ' - see ' not in line:
                codes.add(line.split('|')[1])
    return codes, sets


def load_taxonomy(path):
    values = {}
    _, rows = read_csv(path)
    for row in rows:
        values.setdefault(row['mode'].strip(), set()).add(row['value'].strip())
    return values


def check_image(path, problems, warnings, name):
    try:
        from PIL import Image
    except ImportError:
        return False
    try:
        img = Image.open(path)
        img.load()
    except Exception as e:
        problems.append(f'{name}: cannot be opened as an image ({e})')
        return True
    if img.format != 'PNG':
        problems.append(f'{name}: is a {img.format} file, not a PNG')
        return True
    w, h = img.size
    if max(w, h) < TOO_SMALL:
        problems.append(f'{name}: is {w}x{h} pixels; the longest side must be at least {TOO_SMALL}')
    elif max(w, h) < MIN_LONGEST_SIDE:
        warnings.append(f'{name}: is {w}x{h} pixels; fine on screen, but {MIN_LONGEST_SIDE}+ on the '
                        f'longest side is better for anything printed')
    rgba = img.convert('RGBA')
    alpha = rgba.getchannel('A')
    lo, hi = alpha.getextrema()
    if lo > 10:
        problems.append(f'{name}: has no transparent background')
        return True
    box = alpha.point(lambda a: 255 if a > 10 else 0).getbbox()
    if not box:
        problems.append(f'{name}: is completely transparent')
        return True
    margins = (box[0] / w, box[1] / h, (w - box[2]) / w, (h - box[3]) / h)
    if max(margins) > MAX_MARGIN:
        warnings.append(f'{name}: has empty space around the charge; crop it closer')
    # Colour check on a reduced copy (fast): visible pixels should be black, white or grey.
    small = rgba.resize((min(w, 200), min(h, 200)))
    visible = coloured = 0
    raw = small.tobytes()
    for i in range(0, len(raw), 4):
        r, g, b, a = raw[i:i + 4]
        if a > 128:
            visible += 1
            if max(r, g, b) - min(r, g, b) > 40:
                coloured += 1
    if visible and coloured / visible > MAX_COLOURED:
        warnings.append(f'{name}: contains colour; images should be black lines on a white fill')
    return True


def main():
    parser = argparse.ArgumentParser(description='Check the charge database.')
    parser.add_argument('--dir', default=os.path.join(ROOT, 'charges'), help='charges folder to check')
    args = parser.parse_args()
    folder = args.dir
    art_folder = os.path.join(folder, 'art')

    problems, warnings = [], []
    codes, feature_sets = load_mycat(os.path.join(ROOT, 'data', 'mycat.txt'))
    taxonomy = load_taxonomy(os.path.join(ROOT, 'data', 'taxonomy.csv'))
    all_postures = set().union(*(v for k, v in feature_sets.items()
                                 if k.endswith('posture') or k == 'orientation'))

    # ---- charges.csv ----
    columns, charges = read_csv(os.path.join(folder, 'charges.csv'))
    if columns != CHARGE_COLUMNS:
        problems.append(f'charges.csv: the column headings should be exactly: {", ".join(CHARGE_COLUMNS)}')
    by_id, unknown = {}, {}
    for n, row in enumerate(charges, start=2):
        cid = (row.get('id') or '').strip()
        where = f'charges.csv line {n} ({cid or "no id"})'
        if not ID_PATTERN.match(cid):
            problems.append(f'{where}: id must be lower-case letters, numbers and hyphens only')
        if cid in by_id:
            problems.append(f'{where}: this id is used more than once')
        by_id[cid] = row
        if not (row.get('name') or '').strip():
            problems.append(f'{where}: name is empty')
        code = (row.get('oanda_category') or '').strip()
        if code not in codes:
            problems.append(f'{where}: "{code}" is not an O&A category code (see charges/oanda_categories.csv)')
        # type and themes may hold several values separated by semicolons
        types = [t.strip() for t in (row.get('type') or '').split(';') if t.strip()]
        if not types:
            problems.append(f'{where}: type is empty')
        for mode, values in (('type', types),
                             ('theme', [t.strip() for t in (row.get('themes') or '').split(';') if t.strip()])):
            for value in values:
                if value not in taxonomy.get(mode, set()):
                    unknown.setdefault((mode, value), []).append(cid)
        if (row.get('exclude') or '').strip() not in ('', 'TRUE'):
            problems.append(f'{where}: exclude must be TRUE or empty')

    for (mode, value), ids in sorted(unknown.items()):
        shown = ', '.join(ids[:5]) + (f' and {len(ids) - 5} more' if len(ids) > 5 else '')
        warnings.append(f'charges.csv: {mode} "{value}" is not listed in data/taxonomy.csv '
                        f'(used by {shown}). Add it there, or correct the charge.')

    # ---- art.csv ----
    columns, art = read_csv(os.path.join(folder, 'art.csv'))
    if columns != ART_COLUMNS:
        problems.append(f'art.csv: the column headings should be exactly: {", ".join(ART_COLUMNS)}')
    listed, defaults, images_checked = set(), {}, True
    for n, row in enumerate(art, start=2):
        name = (row.get('file') or '').strip()
        where = f'art.csv line {n} ({name or "no file"})'
        cid = (row.get('charge_id') or '').strip()
        if not FILE_PATTERN.match(name):
            problems.append(f'{where}: file name must be lower-case letters, numbers and hyphens, ending .png')
        if name in listed:
            problems.append(f'{where}: this file is listed more than once')
        listed.add(name)
        charge = by_id.get(cid)
        if not charge:
            problems.append(f'{where}: charge_id "{cid}" is not in charges.csv')
        elif not name.startswith(cid + '-') and name != cid + '.png':
            problems.append(f'{where}: file name should start with the charge id "{cid}-"')
        posture = (row.get('posture') or '').strip()
        if posture and posture not in all_postures:
            problems.append(f'{where}: "{posture}" is not a posture or orientation the O&A uses')
        elif posture and charge:
            ctype = charge.get('type', '').strip()
            expected = set()
            for t in (t.strip() for t in ctype.split(';')):
                if t in ANIMATE_TYPES:
                    expected |= feature_sets.get(POSTURE_SET_FOR_TYPE.get(t, 'posture'), set())
                else:
                    expected |= feature_sets.get('orientation', set())
            if posture not in expected:
                warnings.append(f'{where}: "{posture}" is unusual for a charge of type {ctype}; please double-check')
        flag = (row.get('default') or '').strip()
        if flag not in ('', 'TRUE'):
            problems.append(f'{where}: default must be TRUE or empty')
        if flag == 'TRUE':
            defaults[cid] = defaults.get(cid, 0) + 1
        if (row.get('complexity') or '').strip() not in COMPLEXITY:
            problems.append(f'{where}: complexity must be "Easy to Draw", "Complex" or empty')
        for needed in ('artist', 'permission'):
            if not (row.get(needed) or '').strip():
                problems.append(f'{where}: {needed} is empty')
        path = os.path.join(art_folder, name)
        if not os.path.isfile(path):
            problems.append(f'{where}: there is no such file in charges/art/')
        elif not check_image(path, problems, warnings, name):
            images_checked = False

    # A charge whose usual picture comes from Traceable Heraldic Art
    # (charges/tha.csv, made by tools/import_tha.py) needs none marked here.
    tha_path = os.path.join(folder, 'tha.csv')
    tha_default = set()
    if os.path.isfile(tha_path):
        _, tha = read_csv(tha_path)
        tha_default = {(r.get('charge_id') or '').strip() for r in tha if (r.get('default') or '').strip() == 'TRUE'}
    for cid in sorted({(r.get('charge_id') or '').strip() for r in art}):
        if cid in tha_default and defaults.get(cid, 0) == 0:
            continue
        if cid in by_id and defaults.get(cid, 0) != 1:
            warnings.append(f'art.csv: "{cid}" should have exactly one image marked default (it has {defaults.get(cid, 0)})')

    on_disk = sorted(f for f in os.listdir(art_folder) if not f.startswith('.')) if os.path.isdir(art_folder) else []
    for f in on_disk:
        if f not in listed:
            problems.append(f'charges/art/{f}: this file has no line in art.csv')

    # ---- report ----
    with_art = len({(r.get('charge_id') or '').strip() for r in art})
    print(f'{len(charges)} charges, {len(art)} images, {with_art} charges have art.')
    if not images_checked:
        print('NOTE: Pillow is not installed, so the images themselves were not checked (pip install pillow).')
    for title, items in (('PROBLEMS (must be fixed)', problems), ('WARNINGS (worth a look)', warnings)):
        if items:
            print(f'\n{title}: {len(items)}')
            for item in items:
                print('  - ' + item)
    if not problems and not warnings:
        print('Everything looks right.')
    elif not problems:
        print('\nNo problems that must be fixed.')
    sys.exit(1 if problems else 0)


if __name__ == '__main__':
    main()
