"""Trace the complex lines of division from the Book of Traceable Heraldic Art.

For each line (wavy, indented, embattled...) this opens the collection's
drawing of a shield divided "per fess" with that line, from the local SVG/
folder, follows the dividing line across the shield, and prints ONE REPEAT
of it in the form core/geometry.js wants (LINE_SHAPES): its length and
depth on a shield 100 wide, and its points [along, out], `along` in repeats
and `out` in depths, starting where the line crosses its own middle level.

    python tools/trace_lines.py

Paste what it prints into LINE_SHAPES by hand; nothing is written. The
collection is shared under CC-BY-SA (https://heraldicart.org/credits).
"""

import glob
import math
import os
import re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
# the line's id in core/catalog.js -> the drawing(s) to try, first found wins
SOURCES = {
    'wavy': ['Per Fess Wavy', 'Per Fess Wavy (1)'],
    'indented': ['Per Fess Indented (1)', 'Per Fess Indented'],
    'embattled': ['Per Fess Embattled', 'Per Fess Embattled (1)'],
    'engrailed': ['Per Fess Engrailed'],
    'invected': ['Per Fess Invected'],
    'nebuly': ['Per Fess Nebuly (1)', 'Per Fess Nebuly'],
    'dovetailed': ['Per Fess Dovetailed'],
    'raguly': ['Per Fess Raguly'],
    'rayonny': ['Per Fess Rayonny', 'Per Fess Rayonny (1)'],
    'urdy': ['Per Fess Urdy', 'Per Fess Urdy (1)'],
    'potenty': ['Per Fess Potenty'],
    'dancetty': ['Per Fess Dancetty', 'Per Fess Dancetty (1)'],
}
NUMBER = re.compile(r'[-+]?(?:\d+\.?\d*|\.\d+)(?:[eE][-+]?\d+)?')


def sample_path(d, steps=14):
    """The points along an SVG path (lines and curves; arcs are not handled)."""
    tokens = re.findall(r'[MmLlHhVvCcSsQqTtZzAa]|' + NUMBER.pattern, d)
    points, i, cmd = [], 0, None
    x = y = sx = sy = 0.0
    last_c = None

    def take(n):
        nonlocal i
        values = [float(t) for t in tokens[i:i + n]]
        i += n
        return values

    while i < len(tokens):
        if re.match(r'[A-Za-z]', tokens[i]):
            cmd = tokens[i]
            i += 1
            if cmd in 'Zz':
                x, y = sx, sy
                points.append((x, y))
                continue
        rel = cmd.islower()
        c = cmd.upper()
        if c == 'A':
            return None
        if c == 'M':
            px, py = take(2)
            x, y = (x + px, y + py) if rel else (px, py)
            sx, sy = x, y
            points.append((x, y))
            cmd = 'l' if rel else 'L'
        elif c == 'L':
            px, py = take(2)
            x, y = (x + px, y + py) if rel else (px, py)
            points.append((x, y))
        elif c == 'H':
            px, = take(1)
            x = x + px if rel else px
            points.append((x, y))
        elif c == 'V':
            py, = take(1)
            y = y + py if rel else py
            points.append((x, y))
        elif c in 'CS':
            if c == 'C':
                x1, y1, x2, y2, x3, y3 = take(6)
            else:
                x2, y2, x3, y3 = take(4)
                x1, y1 = (2 * x - last_c[0], 2 * y - last_c[1]) if last_c else (x, y)
                if rel:
                    x1, y1 = x1 - x, y1 - y
            if rel:
                x1, y1, x2, y2, x3, y3 = x + x1, y + y1, x + x2, y + y2, x + x3, y + y3
            for k in range(1, steps + 1):
                t = k / steps
                u = 1 - t
                points.append((u ** 3 * x + 3 * u * u * t * x1 + 3 * u * t * t * x2 + t ** 3 * x3,
                               u ** 3 * y + 3 * u * u * t * y1 + 3 * u * t * t * y2 + t ** 3 * y3))
            last_c = (x2, y2)
            x, y = x3, y3
            continue
        elif c in 'QT':
            x1, y1, x2, y2 = take(4)
            if rel:
                x1, y1, x2, y2 = x + x1, y + y1, x + x2, y + y2
            for k in range(1, steps + 1):
                t = k / steps
                u = 1 - t
                points.append((u * u * x + 2 * u * t * x1 + t * t * x2, u * u * y + 2 * u * t * y1 + t * t * y2))
            x, y = x2, y2
        last_c = None
    return points


def simplify(points, tolerance):
    """Fewer points for the same line (Ramer-Douglas-Peucker)."""
    if len(points) < 3:
        return points
    (x0, y0), (x1, y1) = points[0], points[-1]
    length = math.hypot(x1 - x0, y1 - y0) or 1e-9
    far, at = 0, 0
    for k in range(1, len(points) - 1):
        px, py = points[k]
        d = abs((x1 - x0) * (y0 - py) - (x0 - px) * (y1 - y0)) / length
        if d > far:
            far, at = d, k
    if far <= tolerance:
        return [points[0], points[-1]]
    return simplify(points[:at + 1], tolerance)[:-1] + simplify(points[at:], tolerance)


def trace(path):
    with open(path, encoding='utf-8') as f:
        svg = f.read()
    paths = [p for p in (sample_path(d) for d in re.findall(r'\bd="([^"]+)"', svg)) if p]
    if not paths:
        return None
    # The shield's own outline is the widest path. The drawings then paint one
    # half of the shield as a path of its own: the dividing line is the part
    # of that path that does not run along the outline.
    width = lambda p: max(q[0] for q in p) - min(q[0] for q in p)
    height = lambda p: max(q[1] for q in p) - min(q[1] for q in p)
    outline = max(paths, key=lambda p: width(p) * height(p))
    left, right = min(q[0] for q in outline), max(q[0] for q in outline)

    def off_outline(p):
        nearest = float('inf')
        for (ax, ay), (bx, by) in zip(outline, outline[1:] + outline[:1]):
            dx, dy = bx - ax, by - ay
            t = max(0, min(1, ((p[0] - ax) * dx + (p[1] - ay) * dy) / (dx * dx + dy * dy or 1e-9)))
            nearest = min(nearest, math.hypot(p[0] - ax - t * dx, p[1] - ay - t * dy))
        return nearest > 2.5

    best = None
    for pts in paths:
        if width(pts) * height(pts) > 0.9 * width(outline) * height(outline):
            continue
        runs, run = [], []
        for p in pts:
            if off_outline(p):
                run.append(p)
            else:
                if run:
                    runs.append(run)
                run = []
        if run:
            runs.append(run)
        runs = [r for r in runs if width(r) > 0.8 * width(pts) and height(r) < 90]
        if runs and (best is None or len(max(runs, key=len)) > len(best)):
            best = max(runs, key=len)
    if not best:
        return None
    line = best
    if line[0][0] > line[-1][0]:
        line = line[::-1]
    scale = 98 / (right - left)                    # their shield's width to ours
    ys = [p[1] for p in line]
    middle = (max(ys) + min(ys)) / 2
    depth = (max(ys) - min(ys)) / 2
    # where the line climbs through its middle level, left to right
    ups = []
    for (xa, ya), (xb, yb) in zip(line, line[1:]):
        if ya > middle >= yb:                      # (y grows downward: climbing = y falling)
            t = (ya - middle) / (ya - yb) if ya != yb else 0
            ups.append((xa + (xb - xa) * t, line.index((xb, yb))))
    if len(ups) < 3:
        return None
    gaps = sorted(b[0] - a[0] for a, b in zip(ups, ups[1:]))
    period = gaps[len(gaps) // 2]
    # one repeat near the middle of the shield
    centre = (left + right) / 2
    k = min(range(len(ups) - 1), key=lambda j: abs((ups[j][0] + ups[j + 1][0]) / 2 - centre))
    (x0, i0), (x1, i1) = ups[k], ups[k + 1]
    one = [(x0, middle)] + line[i0:i1]
    pts = [((x - x0) / (x1 - x0), -(y - middle) / depth) for x, y in one]
    pts = simplify(pts, 0.03)
    return {'period': period * scale, 'depth': depth * scale, 'repeats': (right - left) / period, 'points': pts}


def main():
    for name, tries in SOURCES.items():
        found = None
        for title in tries:
            hits = glob.glob(os.path.join(ROOT, 'SVG', '*', title + ' Device.svg'))
            if hits:
                found = (title, hits[0])
                break
        if not found:
            print(f'// {name}: no drawing found')
            continue
        result = trace(found[1])
        if not result:
            print(f'// {name}: could not follow the line in "{found[0]} Device"')
            continue
        pts = ', '.join(f'[{s:.3f}, {v:.2f}]'.replace('0.', '.').replace('-.', '-.') for s, v in result['points'])
        print(f"  // traced from \"{found[0]} Device\": {result['repeats']:.1f} repeats across")
        print(f"  {name}: {{ period: {result['period']:.2f}, depth: {result['depth']:.2f}, points: [{pts}] }},")


if __name__ == '__main__':
    main()
