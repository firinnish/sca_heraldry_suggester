"""
rank_charges.py: work out which charges are used most in registered SCA armory,
so that art gets drawn for the most-used charges first.

    python tools/rank_charges.py

Reads charges/charges.csv, charges/art.csv and data/oanda.db (the O&A database,
which is kept on the maintainer's machine only), and writes:

    charges/priority.csv          charges, most-used first
    charges/oanda_categories.csv  every O&A category name and code, with how
                                  many registered items use it (for looking up
                                  the right oanda_category for a new charge)

"blazons_naming_it" counts registered devices and badges whose blazon contains
the charge's name (or its plural). It is a rough guide: "cross" also counts
"crosses crosslet", and a charge blazoned under another name is missed.
"""
import csv, os, re, sys, collections

ROOT = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
DB = os.path.join(ROOT, 'data', 'oanda.db')

# Ordinaries and other simple geometric charges that the code draws itself,
# so nobody needs to supply a picture (charge ids from charges.csv).
DRAWN_BY_CODE = {'chief', 'pale', 'bordure', 'bend', 'bend-sinister', 'chevron', 'fess', 'saltire',
                 'chevron-inverted', 'pall-inverted', 'pile-inverted', 'base', 'cross', 'orle', 'pall', 'pile', 'canton', 'quarter', 'flaunch', 'gore',
                 'gusset', 'tierce', 'gyron', 'tressure', 'bar', 'pallet', 'chevronel', 'bendlet',
                 'roundel', 'annulet', 'billet', 'lozenge', 'mascle', 'rustre', 'delf', 'fusil'}


def main():
    if not os.path.isfile(DB):
        sys.exit('data/oanda.db was not found. It is not stored on GitHub; this script only runs '
                 'on a machine with a copy of the O&A database in the data folder.')

    blazons, category_counts = [], collections.Counter()
    with open(DB, encoding='latin-1') as f:
        for line in f:
            parts = line.rstrip('\n').split('|')
            if len(parts) < 6 or parts[2] not in ('d', 'b'):
                continue
            blazons.append(parts[3].lower())
            for code in {d.split(':')[0] for d in parts[5:] if d}:
                category_counts[code] += 1
    words = collections.Counter()
    for b in blazons:
        words.update(set(re.findall(r"[a-z'-]+", b)))
    text = '\n'.join(blazons)

    with open(os.path.join(ROOT, 'charges', 'charges.csv'), encoding='utf-8-sig', newline='') as f:
        charges = list(csv.DictReader(f))
    with open(os.path.join(ROOT, 'charges', 'art.csv'), encoding='utf-8-sig', newline='') as f:
        art = collections.Counter(r['charge_id'].strip() for r in csv.DictReader(f))

    def naming(row):
        name = row['name'].strip().lower()
        plural = row['plural'].strip().lower() or name + 's'
        if ' ' not in name:
            return words[name] + (words[plural] if plural != name else 0)
        return len(re.findall(r'\b' + re.escape(name) + r's?\b', text))

    ranked = sorted(((naming(r), r) for r in charges if r['exclude'].strip() != 'TRUE'),
                    key=lambda x: (-x[0], x[1]['name'].lower()))
    with open(os.path.join(ROOT, 'charges', 'priority.csv'), 'w', encoding='utf-8', newline='') as f:
        w = csv.writer(f)
        w.writerow(['rank', 'id', 'name', 'blazons_naming_it', 'art_needed', 'oanda_category',
                    'items_in_category', 'images_so_far'])
        for rank, (count, r) in enumerate(ranked, start=1):
            needed = 'no (drawn by the code)' if r['id'] in DRAWN_BY_CODE else 'yes'
            w.writerow([rank, r['id'], r['name'], count, needed, r['oanda_category'],
                        category_counts[r['oanda_category']], art[r['id']]])

    categories = []
    with open(os.path.join(ROOT, 'data', 'mycat.txt'), encoding='latin-1') as f:
        for line in f:
            line = line.rstrip('\n')
            if not line.startswith('|') and '|' in line and ' - see ' not in line:
                name, code = line.split('|')[:2]
                categories.append((name, code, category_counts[code]))
    with open(os.path.join(ROOT, 'charges', 'oanda_categories.csv'), 'w', encoding='utf-8', newline='') as f:
        w = csv.writer(f)
        w.writerow(['category_name', 'oanda_category', 'registered_items'])
        w.writerows(sorted(categories, key=lambda c: c[0].lower()))

    print(f'Ranked {len(ranked)} charges from {len(blazons)} registered devices and badges.')
    print('Top 15:', ', '.join(f"{r['name']} ({c})" for c, r in ranked[:15]))


if __name__ == '__main__':
    main()
