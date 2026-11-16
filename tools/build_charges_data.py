"""
build_charges_data.py

Rerun this after editing charges.csv or taxonomy.csv to regenerate the data
file the picker app (charge_picker.html) reads.

Usage:
    python tools/build_charges_data.py

Expects, in the data/ folder:
    charges.csv             - one row per distinct charge, editable
    taxonomy.csv            - defines the three sort-mode hierarchies
    charge_group_files.json - (optional) full file lists per charge, for "other depictions"

Produces:
    charges_data.json       - paste/inject this into charge_picker.html

--- charges.csv columns ---
key           : internal identity, don't change unless merging/splitting charges
label         : display name shown to users - edit freely
codes         : semicolon-separated my.cat code(s), used for herald-check links
categories    : legacy practical-category tags (Tools & Instruments, etc.), semicolon-separated.
                Kept as reference only; not shown directly in the UI anymore since the 3 new
                sort modes replace it.
exclude       : set to TRUE to hide this charge entirely (e.g. SFCP items)
image_count   : informational only
default_file  : which image shows as the main thumbnail

type          : single value - Human / Plant / Artificial Object / Natural Object / Abstract,
                or an Animal subtype (Reptile / Mammal / Insect / Bird / Sea Creature /
                Fantastical or Mythical / Other (Animal))
themes        : semicolon-separated list, e.g. "War;Household" - a charge can be in >1 theme
complexity    : Easy to Draw / Complex (rough auto-guess from SVG file size - fix freely)
shape         : semicolon-separated from Compact / Long / Tall / Thin (rough auto-guess from
                SVG aspect ratio - a charge can be e.g. "Tall;Thin")

--- taxonomy.csv columns ---
mode          : type / theme / artistic
value         : a category name used in the 'type' / 'themes' / 'complexity'+'shape' columns
parent        : the supercategory this nests under in the sidebar, blank if top-level.
                Add a new row here to introduce a new category/supercategory in any mode.
"""
import csv, json, os

# All the data files live in ../data (next to this tools folder).
HERE = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'data'))

SHAPE_DESCRIPTIONS = {
    'Long': "Long charges take up lots of horizontal space, so you might want to include them on designs with a fess or chief or horizontal stripes.",
    'Compact': "Compact charges are more round or square, so you might want one for designs with tiled charges or a big central charge.",
    'Tall': "Tall charges take up lots of vertical space, so you might want to include them on designs with a pale or flaunches or vertical stripes.",
    'Thin': "Thin charges can be either long or tall, or be rotated so that they work well on bends or in diagonal spaces.",
}

def load_charges(path):
    rows = []
    with open(path, encoding='utf-8') as f:
        for row in csv.DictReader(f):
            if row.get('exclude', '').strip().upper() == 'TRUE':
                continue
            rows.append(row)
    return rows

def load_taxonomy(path):
    modes = {}
    with open(path, encoding='utf-8') as f:
        for row in csv.DictReader(f):
            mode = row['mode'].strip()
            modes.setdefault(mode, {'hierarchy': {}, 'order': []})
            modes[mode]['hierarchy'][row['value'].strip()] = row['parent'].strip()
            modes[mode]['order'].append(row['value'].strip())
    return modes

def load_manifest_files(path):
    if not os.path.exists(path):
        return {}
    with open(path, encoding='utf-8') as f:
        return json.load(f)

def make_entry(row, group_files):
    key = row['key']
    other_files = []
    if key in group_files:
        other_files = [f for f in group_files[key] if f != row['default_file']]
    return {
        'code': row['codes'].split(';')[0] if row['codes'] else '',
        'codes': row['codes'].split(';') if row['codes'] else [],
        'label': row['label'],
        'default_file': row['default_file'],
        'other_files': other_files[:30],
        'count': int(row['image_count']) if row['image_count'] else 1 + len(other_files),
    }

def main():
    charges = load_charges(os.path.join(HERE, 'charges.csv'))
    taxonomy = load_taxonomy(os.path.join(HERE, 'taxonomy.csv'))
    group_files = load_manifest_files(os.path.join(HERE, 'charge_group_files.json'))

    modes_out = {}
    for mode_name, mode_field in [('type', 'type'), ('theme', 'themes'), ('artistic', None)]:
        by_cat = {}
        if mode_name == 'artistic':
            for row in charges:
                entry = make_entry(row, group_files)
                vals = [row.get('complexity', '').strip()] + row.get('shape', '').split(';')
                for val in vals:
                    val = val.strip()
                    if val:
                        by_cat.setdefault(val, []).append(entry)
        else:
            for row in charges:
                entry = make_entry(row, group_files)
                vals = [row.get(mode_field, '').strip()] if mode_name == 'type' else \
                       [v.strip() for v in row.get(mode_field, '').split(';') if v.strip()]
                for val in vals:
                    if val:
                        by_cat.setdefault(val, []).append(entry)

        for cat in by_cat:
            by_cat[cat].sort(key=lambda c: c['label'].lower())

        modes_out[mode_name] = {
            'categories': by_cat,
            'hierarchy': taxonomy.get(mode_name, {}).get('hierarchy', {}),
        }

    output = {
        'modes': modes_out,
        'shape_descriptions': SHAPE_DESCRIPTIONS,
    }

    out_path = os.path.join(HERE, 'charges_data.json')
    with open(out_path, 'w', encoding='utf-8') as f:
        json.dump(output, f, separators=(',', ':'))

    print(f"Wrote {out_path}")
    for mode_name, data in modes_out.items():
        print(f"  {mode_name}: {len(data['categories'])} categories")

if __name__ == '__main__':
    main()
