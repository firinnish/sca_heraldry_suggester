// geometry.js: the shapes of things, as plain numbers.
//
// The shield is a box 100 wide and 120 tall. Every field division is a list of
// regions (one list of polygons per part), and every ordinary is a list of
// polygons. Keeping these as numbers (not SVG text) lets two different jobs
// share them:
//   * draw.js turns them into SVG to make the picture;
//   * rules.js asks "which part of the field is under this charge?" so it can
//     apply the contrast rules to the right bit of background.
//
// To add a division: add it to catalog.js, then add its shapes to
// DIVISION_SHAPES here. To add an ordinary: catalog.js and ORDINARY_SHAPES.

export const W = 100, H = 120;

// ---- The shield's outline --------------------------------------------------
// The SCA's standard escutcheon, traced from the "Plain" device form in
// Traceable Heraldic Art (Vol. 2) and scaled to this box: straight sides for
// the top third, then two curves meeting at the point.
export const SHIELD_PATH = 'M1 1 H99 V40.2 C99 68 76 100.3 50 118.5 C24 100.3 1 68 1 40.2 Z';

// ---- How everything lines up ---------------------------------------------------
// All of these follow Traceable Heraldic Art's device forms, so that a field
// division and an ordinary on it share their lines and never leave slivers:
//  * The FESS POINT, the centre of the shield, is (50, 50). Per pale, per
//    fess, quarterly, per saltire, gyronny, per pall, the pale, fess, cross,
//    bend, saltire and pall are all centred on it.
//  * Every diagonal is at 45 degrees. Per bend runs corner to corner through
//    the fess point; a bend and a saltire lie along the same lines.
//  * A chevron's arms are parallel to those diagonals and close enough that
//    a per bend or per saltire line under a chevron is hidden by its arm.
//    Per chevron runs along the middle of the chevron.
//  * Straight stripes (paly, barry, checky) are a sixth of the shield's width,
//    so a pale, fess, cross, chief or base covers whole stripes. Diagonal
//    patterns (bendy, chevronelly, lozengy) are likewise spaced so that the
//    matching ordinary covers whole pieces.
export const FESS_POINT = [50, 50];
const C = 50;                       // the fess point, both ways
const UNIT = 98 / 6;                // a pallet, bar or square of checky: 16.33
const STRAIGHT_HALF = UNIT;         // half the width of a pale, fess or cross
const DIAGONAL_HALF = 1.5 * UNIT;   // half a bend, saltire or pall, measured straight up: 24.5
// Per chevron's point touches the top of a fess and the bottom of a chief.
const CHEVRON_APEX = C - UNIT;      // per chevron, and the middle of a chevron: 33.67
const CHEVRON_HALF = 22.75;         // half a chevron, measured straight up
// Per chevron inverted's point is at the inner point of a chevron (and per
// chevron's at the inner point of a chevron inverted), so a chevron on per
// chevron inverted makes one clean diamond with the lower part.
const CHEVRON_INV_APEX = CHEVRON_APEX + CHEVRON_HALF; // per chevron inverted, and a chevron inverted: 56.42
export const CHIEF_BOTTOM = C - UNIT;      // 33.67
export const BASE_TOP = C + 2 * UNIT;      // 82.67
// Half the width of a pale, fess or cross, for anything that needs to know
// where their arms end (layout.js: charges placed on a cross).
export const ARM_HALF = UNIT;

// ---- Helpers ---------------------------------------------------------------
const rect = (x, y, w, h) => [[x, y], [x + w, y], [x + w, y + h], [x, y + h]];

// A straight band of half-width `hw` along the line from (x1, y1) to (x2, y2).
function band(x1, y1, x2, y2, hw) {
  const len = Math.hypot(x2 - x1, y2 - y1);
  const nx = -(y2 - y1) / len * hw, ny = (x2 - x1) / len * hw;
  return [[x1 + nx, y1 + ny], [x2 + nx, y2 + ny], [x2 - nx, y2 - ny], [x1 - nx, y1 - ny]];
}

// The strip between two lines parallel to the bend (y - x = a and y - x = b),
// or to the bend sinister (y + x - 100 = a and = b). Far bigger than the
// shield; the outline trims it.
const FAR = 200;
const bendStrip = (a, b) => [[-FAR, -FAR + a], [FAR, FAR + a], [FAR, FAR + b], [-FAR, -FAR + b]];
const sinisterStrip = (a, b) => bendStrip(a, b).map(([x, y]) => [W - x, y]);

// The strip between two chevron-shaped lines (y - |x - 50| = a and = b), and
// the same for chevrons inverted (y + |x - 50| = a and = b).
const chevronStrip = (a, b) => [[C - FAR, a + FAR], [C, a], [C + FAR, a + FAR], [C + FAR, b + FAR], [C, b], [C - FAR, b + FAR]];
const chevronInvStrip = (a, b) => [[C - FAR, a - FAR], [C, a], [C + FAR, a - FAR], [C + FAR, b - FAR], [C, b], [C - FAR, b - FAR]];

// Make every polygon run the same way round, so that overlapping polygons in
// one path (a saltire's two bands) add together instead of cancelling out.
function clockwise(p) {
  let area = 0;
  for (let i = 0, j = p.length - 1; i < p.length; j = i++) area += (p[j][0] - p[i][0]) * (p[j][1] + p[i][1]);
  return area < 0 ? [...p].reverse() : p;
}

// Polygons -> the text of an SVG path.
export function pathOf(polygons) {
  return polygons.map(p => 'M' + clockwise(p).map(q => q.map(n => +n.toFixed(2)).join(' ')).join(' L') + ' Z').join(' ');
}

export function pointInPolygon(x, y, pts) {
  let inside = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const [xi, yi] = pts[i], [xj, yj] = pts[j];
    if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}
const inAny = (x, y, polygons) => polygons.some(p => pointInPolygon(x, y, p));

function curve(p0, p1, p2, p3, steps = 16) {
  return Array.from({ length: steps }, (_, i) => {
    const t = (i + 1) / steps, u = 1 - t;
    return [0, 1].map(k => u * u * u * p0[k] + 3 * u * u * t * p1[k] + 3 * u * t * t * p2[k] + t * t * t * p3[k]);
  });
}
export const SHIELD_POLYGON = [[1, 1], [99, 1], [99, 40.2],
  ...curve([99, 40.2], [99, 68], [76, 100.3], [50, 118.5]),
  ...curve([50, 118.5], [24, 100.3], [1, 68], [1, 40.2])];
export const insideShield = (x, y) => pointInPolygon(x, y, SHIELD_POLYGON);

// ---- Field divisions -------------------------------------------------------

// Stripes between boundaries start, start + step, ...: stripe 0 to part 0,
// stripe 1 to part 1, and so on, from `first` (the first stripe of part 0)
// to `last`.
function stripes(make, first, last, step) {
  const parts = [[], []];
  for (let a = first, i = 0; a < last; a += step, i++) parts[i % 2].push(make(a, a + step));
  return parts;
}

// How far apart the lines of bendy are, measured straight up, when `pieces`
// of them fit between the fess point and the corner (four: half a bend).
const slant = pieces => (pieces === 4 ? DIAGONAL_HALF : 98 / pieces);

// The ways each patterned division can be drawn, the usual one first (see
// DIVISION_SHAPES below for what the numbers mean). They follow the Book of
// Traceable Heraldic Art, which draws paly of 6, 8, 10, 12 and 16, barry of
// 4 to 12, bendy of 4 to 10 and chevronelly of 6 to 10.
export const DIVISION_VARIANTS = {
  paly: [6, 8, 4, 10], barry: [6, 8, 4, 10], checky: [6, 8, 4], lozengy: [6, 4, 8],
  bendy: [4, 5, 3, 6], bendySinister: [4, 5, 3, 6], chevronelly: [4, 5, 3, 6],
};

// Each entry returns one list of polygons per part, in blazon order.
const DIVISION_SHAPES = {
  perPale: () => [[rect(-FAR, -FAR, FAR + C, 3 * FAR)], [rect(C, -FAR, FAR, 3 * FAR)]],
  perFess: () => [[rect(-FAR, -FAR, 3 * FAR, FAR + C)], [rect(-FAR, C, 3 * FAR, FAR)]],
  perBend: () => [[bendStrip(-3 * FAR, 0)], [bendStrip(0, 3 * FAR)]],
  perBendSinister: () => [[sinisterStrip(-3 * FAR, 0)], [sinisterStrip(0, 3 * FAR)]],
  perChevron: () => [[chevronStrip(-3 * FAR, CHEVRON_APEX)], [chevronStrip(CHEVRON_APEX, 3 * FAR)]],
  perChevronInverted: () => [[chevronInvStrip(-3 * FAR, CHEVRON_INV_APEX)], [chevronInvStrip(CHEVRON_INV_APEX, 3 * FAR)]],
  perSaltire: () => [
    [[[-FAR, -FAR], [W + FAR, -FAR], [C, C]], [[-FAR, W + FAR], [C, C], [W + FAR, W + FAR]]],
    [[[-FAR, -FAR], [C, C], [-FAR, W + FAR]], [[W + FAR, -FAR], [W + FAR, W + FAR], [C, C]]],
  ],
  quarterly: () => [
    [rect(-FAR, -FAR, FAR + C, FAR + C), rect(C, C, FAR, FAR)],
    [rect(C, -FAR, FAR, FAR + C), rect(-FAR, C, FAR + C, FAR)],
  ],
  // Gyronny of eight: the lines of quarterly and per saltire together.
  gyronny: () => {
    const f = FAR;
    const rim = [[-f, -f], [C, -f], [W + f, -f], [W + f, C], [W + f, W + f], [C, W + f], [-f, W + f], [-f, C]];
    const parts = [[], []];
    rim.forEach((p, i) => parts[i % 2].push([[C, C], p, rim[(i + 1) % rim.length]]));
    return parts;
  },
  // The patterns below can each be drawn several ways (DIVISION_VARIANTS):
  // layout.js picks whichever suits the charges on the shield (the
  // maintainer, November 2026). The number each takes is how many pieces go
  // across the shield (paly, barry, checky, lozengy: six unless said), or
  // how many go from the fess point to the corner (the slanting ones: four).
  checky: (pieces = 6) => {
    const cell = 98 / pieces, parts = [[], []];
    for (let row = -1; row < Math.ceil(9 * pieces / 6); row++) {
      for (let col = -1; col < pieces + 2; col++) parts[(row + col + 2) % 2].push(rect(1 + col * cell, 1 + row * cell, cell, cell));
    }
    return parts;
  },
  // Lozenges are squares turned 45 degrees, a sixth of the shield wide, with
  // one in the middle of the shield, so their sides line up with a bend.
  lozengy: (pieces = 6) => {
    const cell = 98 / pieces, reach = Math.ceil(9 * pieces / 6), parts = [[], []];
    const at = (u, v) => [C + (u - v) / 2, C + (u + v) / 2];
    for (let i = -reach; i <= reach; i++) {
      for (let j = -reach; j <= reach; j++) {
        const u0 = (i - 0.5) * cell, v0 = (j - 0.5) * cell, u1 = u0 + cell, v1 = v0 + cell;
        parts[Math.abs(i + j) % 2].push([at(u0, v0), at(u1, v0), at(u1, v1), at(u0, v1)]);
      }
    }
    return parts;
  },
  // Paly and barry always have an even number of pieces across the shield's
  // width, so paly has its first tincture at the dexter edge and its last at
  // the sinister, as it must. (Moving the stripes half a stripe along
  // instead would leave an odd number, which is not paly.)
  paly: (pieces = 6) => stripes((a, b) => rect(a, -FAR, b - a, 3 * FAR), 1 - 2 * (98 / pieces), W + FAR, 98 / pieces),
  barry: (pieces = 6) => stripes((a, b) => rect(-FAR, a, 3 * FAR, b - a), 1 - 2 * (98 / pieces), H + FAR, 98 / pieces),
  // Bendy: a bend covers exactly two pieces (of the usual four to the
  // corner). The first piece is in the sinister chief corner, and a line
  // always runs through the fess point.
  bendy: (pieces = 4) => stripes(bendStrip, -98 - 4 * slant(pieces), 3 * FAR, slant(pieces)),
  bendySinister: (pieces = 4) => stripes(sinisterStrip, -98 - 4 * slant(pieces), 3 * FAR, slant(pieces)),
  // Chevronelly: a chevron covers exactly two pieces (of the usual four).
  chevronelly: (pieces = 4) => stripes(chevronStrip, CHEVRON_APEX - 4 * (CHEVRON_HALF * 4 / pieces), 3 * FAR, CHEVRON_HALF * 4 / pieces),
  // Orly: shield shapes one inside another, like an orle repeated all the
  // way to the middle, every band the same width (eight pieces from the edge
  // to the middle unless said; the first tincture is at the edge). These
  // are LAYERED shapes: see isLayered below.
  orly: (pieces = 8) => {
    const step = 49 / (pieces - 0.5);
    const inner = Array.from({ length: pieces - 1 }, (_, k) => insetShield((k + 1) * step));
    return [[EVERYWHERE, ...inner], inner];
  },
  perPall: () => [
    [[[-FAR, -FAR], [W + FAR, -FAR], [C, C]]],
    [[[-FAR, -FAR], [C, C], [C, H + FAR], [-FAR, H + FAR]]],
    [[[W + FAR, -FAR], [W + FAR, H + FAR], [C, H + FAR], [C, C]]],
  ],
  perPallInverted: () => [
    [[[-FAR, -FAR], [C, -FAR], [C, C], [-FAR, W + FAR]]],
    [[[C, -FAR], [W + FAR, -FAR], [W + FAR, W + FAR], [C, C]]],
    [[[-FAR, W + FAR], [C, C], [W + FAR, W + FAR], [W + FAR, H + FAR], [-FAR, H + FAR]]],
  ],
};

// LAYERED SHAPES. Orly, and two divisions counterchanged over each other
// ("orly and chevronelly", "barry and per pale": catalog.js gives those the
// id "orly+chevronelly"), are not written as separate pieces but as shapes
// laid one over another, where a place belongs to a part if an ODD number of
// that part's shapes cover it. For orly that turns shield shapes one inside
// another into bands; for two divisions together it means a place takes the
// second tincture if it is in the second part of one division but not of
// both, which is what counterchanging them is. Drawing uses the same rule
// (SVG's "evenodd"), and so does partMap below.
const EVERYWHERE = rect(-FAR, -FAR, 3 * FAR, 3 * FAR);
export const isLayered = division => division === 'orly' || division.includes('+');
// With two divisions together, patterns are drawn finer than alone, so that
// both can be made out (the maintainer's picture of orly and chevronelly,
// November 2026).
const TOGETHER = { chevronelly: 5, bendy: 6, bendySinister: 6, paly: 8, barry: 8 };
function shapesOf(division, variant = null) {
  if (!division.includes('+')) return variant === null ? DIVISION_SHAPES[division]() : DIVISION_SHAPES[division](variant);
  const second = division.split('+').flatMap(d => shapesOf(d, TOGETHER[d] ?? null)[1]);
  return [[EVERYWHERE, ...second], second];
}

// ---- Complex lines ---------------------------------------------------------------
// "Per pale wavy", "a chief indented", "a bordure embattled" (catalog.js:
// LINES). Each line is ONE REPEAT of its shape, as points [along, out]:
// `along` in repeats (0 to 1; a little outside that where the shape
// overhangs, as dovetailed and nebuly do) and `out` in depths. `period` is
// the length of a repeat and `depth` how far it stands out, on a shield 100
// wide: five waves across a shield, ten points of indented, three of
// dancetty, six merlons.
//   mirrored: on an ordinary, the shape points away from the ordinary on
//             every edge (indented, engrailed, embattled...); otherwise both
//             edges run alike, so the ordinary keeps its width (wavy,
//             dancetty, nebuly).
//   centre:   on an ordinary, how far the repeat is shifted so that it sits
//             evenly about the middle of the shield (a merlon, a point or an
//             arc in the middle).
//   upper:    on a fess, bend or chevron, only the upper edge is drawn this
//             way ("a fess embattled").
//
// THE SHAPES ARE TRACED from the Book of Traceable Heraldic Art's drawings
// of a shield divided "per fess" with each line (the maintainer, 27
// November 2026), by tools/trace_lines.py, which prints them in this form:
// run it again rather than editing the numbers. Each starts where the line
// crosses its own middle level, and `out` runs from -1 to 1 about that
// level, so an edge drawn with one stands half in front of the plain edge
// and half behind it. Nearly all have five repeats across a shield.
// Dancetty is ours (the collection draws none per fess): three large points.
export const LINE_SHAPES = {
  wavy:       { period: 19.34, depth: 3.38, mirrored: false, centre: -0.25,
                points: [[0, 0], [0.101, 0.76], [0.189, 0.97], [0.25, 1], [0.311, 0.97], [0.399, 0.76], [0.569, -0.6], [0.689, -0.97], [0.75, -1], [0.86, -0.89], [0.98, -0.21]] },
  indented:   { period: 19.31, depth: 4.83, mirrored: true,  centre: -0.25, points: [[0, 0], [0.25, 1], [0.75, -1]] },
  dancetty:   { period: 32.67, depth: 7,    mirrored: false, centre: -0.25, points: [[0, 0], [0.25, 1], [0.75, -1]] },
  embattled:  { period: 19.37, depth: 4.24, mirrored: true,  centre: -0.25, upper: true, points: [[0, 0], [0, 1], [0.5, 1], [0.5, -1], [1, -1]] },
  // (engrailed: the points stand out and the arcs bite in; invected the other way)
  engrailed:  { period: 19.31, depth: 4.72, mirrored: true,  centre: -0.56,
                points: [[0, 0], [0.069, 1], [0.177, -0.23], [0.306, -0.7], [0.46, -0.95], [0.624, -0.99], [0.783, -0.81], [0.993, -0.05]] },
  invected:   { period: 19.37, depth: 4.24, mirrored: true,  centre: -0.41,
                points: [[0, 0], [0.2, 0.78], [0.304, 0.95], [0.413, 1], [0.576, 0.88], [0.723, 0.51], [0.853, -0.2], [0.91, -1], [0.998, -0.01]] },
  nebuly:     { period: 18.89, depth: 7.26, mirrored: false, centre: -0.23,
                points: [[0, 0], [-0.083, 0.5], [-0.017, 0.82], [0.083, 0.94], [0.232, 1], [0.381, 0.96], [0.486, 0.87], [0.565, 0.69], [0.581, 0.4], [0.436, -0.24],
                         [0.422, -0.6], [0.514, -0.87], [0.619, -0.96], [0.75, -1], [0.952, -0.91], [1.065, -0.69], [1.074, -0.31]] },
  dovetailed: { period: 19.37, depth: 4.84, mirrored: true,  centre: -0.25, points: [[0, 0], [-0.125, 1], [0.625, 1], [0.375, -1], [1.125, -1]] },
  raguly:     { period: 19.1,  depth: 4.78, mirrored: true,  centre: -0.15, points: [[0, 0], [-0.104, 1], [0.396, 1], [0.604, -1], [1.104, -1]] },
  rayonny:    { period: 7.83,  depth: 8.48, mirrored: true,  centre: -0.375,
                points: [[0, 0], [0.052, 0.16], [0.315, 0.41], [0.398, 0.55], [0.43, 0.76], [0.375, 1], [0.552, 0.76], [0.621, 0.55], [0.61, 0.37], [0.507, 0.09],
                         [0.514, -0.09], [0.815, -0.41], [0.914, -0.61], [0.927, -0.8], [0.875, -1], [1.052, -0.76], [1.121, -0.55], [1.11, -0.37], [1.002, -0.05]] },
  urdy:       { period: 15.34, depth: 7.67, mirrored: false, centre: -0.25, points: [[0, 0], [0, 0.5], [0.25, 1], [0.5, 0.5], [0.5, -0.5], [0.75, -1], [1, -0.5]] },
  potenty:    { period: 19.49, depth: 4.84, mirrored: true,  centre: -0.125,
                points: [[0, 0], [-0.25, 0], [-0.25, 1], [0.5, 1], [0.5, 0], [0.25, 0], [0.25, -1], [1, -1]] },
};
const UPPER_ONLY = new Set(['fess', 'bend', 'bendSinister', 'chevron', 'chevronInverted']);
// The edge of an ordinary, and the inner edge of a bordure, are drawn with a
// smaller version of a deep line (both its length and its depth), so that a
// fess rayonny keeps some fess between its flames.
const ORDINARY_DEPTH = 4.3, LOOP_DEPTH = 2.6;
const LINE_REACH = 95;        // how far from the middle of the shield a line is drawn complex (beyond the edge)

// A polygon with each long straight edge redrawn as a complex line. The line
// along an edge depends only on where the edge lies, never on the polygon it
// belongs to: it is laid out from where the edge's line crosses the pale line
// (the fess line, for an upright edge), always standing out to the same
// side. So two parts of a field that share a line get exactly the same line,
// and the pieces still fit together.
// `outward` is for an ordinary: a mirrored shape then points away from the
// ordinary on every edge, and the repeat is centred. `pick` (optional)
// chooses which edges, from the way each faces.
function linedPolygon(polygon, id, { outward = false, pick = null } = {}) {
  const shape = LINE_SHAPES[id];
  // (on an ordinary, a deep line is drawn smaller: see ORDINARY_DEPTH)
  const smaller = outward ? Math.min(1, ORDINARY_DEPTH / shape.depth) : 1;
  const period = shape.period * smaller, depth = shape.depth * smaller;
  let area = 0;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) area += (polygon[j][0] - polygon[i][0]) * (polygon[j][1] + polygon[i][1]);
  const turn = area < 0 ? -1 : 1;
  const out = [];
  polygon.forEach((a, i) => {
    const b = polygon[(i + 1) % polygon.length];
    out.push(a);
    const dx = b[0] - a[0], dy = b[1] - a[1], length = Math.hypot(dx, dy);
    if (length < 12) return;
    // (an edge nowhere near the shield is left alone)
    if (Math.abs((C - a[0]) * dy - (60 - a[1]) * dx) / length > 80) return;
    // along the line: left to right, or downward if it is upright; out: to the upper side (sinister, if upright)
    let ux = dx / length, uy = dy / length;
    if (ux < -1e-9 || (Math.abs(ux) <= 1e-9 && uy < 0)) { ux = -ux; uy = -uy; }
    const nx = uy, ny = -ux;
    const awayX = dy / length * turn, awayY = -dx / length * turn;        // pointing out of the polygon
    if (pick && !pick(awayX, awayY)) return;
    const side = outward && shape.mirrored && nx * awayX + ny * awayY < 0 ? -1 : 1;
    const origin = Math.abs(ux) > 1e-9 ? [C, a[1] + (C - a[0]) * uy / ux] : [a[0], C];
    const along = p => (p[0] - origin[0]) * ux + (p[1] - origin[1]) * uy;
    const ta = along(a), tb = along(b);
    const from = Math.max(Math.min(ta, tb), -LINE_REACH), to = Math.min(Math.max(ta, tb), LINE_REACH);
    const shift = outward ? shape.centre : 0;
    const points = [];
    for (let k = Math.floor(from / period) - 1; k <= Math.ceil(to / period) + 1; k++) {
      for (const [s, v] of shape.points) {
        // (a point belongs to the edge if its place in the repeat does, wherever an overhang puts it)
        const place = (k + shift + Math.min(1, Math.max(0, s))) * period;
        if (place <= from + 1e-6 || place >= to - 1e-6) continue;
        const t = (k + shift + s) * period, d = v * depth * side;
        points.push([origin[0] + ux * t + nx * d, origin[1] + uy * t + ny * d]);
      }
    }
    if (ta > tb) points.reverse();
    out.push(...points);
  });
  return out;
}
const linedShapes = (polygons, line, options) => polygons.map(p => linedPolygon(p, line, options));

// A closed outline (the inner edge of a bordure) redrawn as a complex line,
// measured along the outline itself so that it runs round the curves. A
// whole number of repeats goes round, begun at the middle of the top. The
// line never comes further in than the plain one would: it is cut into the
// bordure instead, so whatever is inside keeps its room.
function linedLoop(loop, id, fitted = false) {
  const shape = LINE_SHAPES[id], n = loop.length;
  const lengths = loop.map((p, i) => Math.hypot(loop[(i + 1) % n][0] - p[0], loop[(i + 1) % n][1] - p[1]));
  const total = lengths.reduce((s, x) => s + x, 0);
  // A deep line is drawn smaller round an outline (see LOOP_DEPTH), and with
  // `fitted` smaller still round a short one, or it would be all line.
  const smaller = Math.min(1, LOOP_DEPTH / shape.depth) * (fitted ? Math.min(1, total / (10 * shape.period)) : 1);
  const count = Math.max(4, Math.round(total / (shape.period * smaller))), period = total / count;
  const depth = shape.depth * smaller;
  const middle = [loop.reduce((s, p) => s + p[0], 0) / n, loop.reduce((s, p) => s + p[1], 0) / n];
  const highest = Math.max(...shape.points.map(p => p[1]));
  // where the outline is `s` along from its first point, and the way inward there
  const at = s => {
    let left = ((s % total) + total) % total;
    for (let i = 0; i < n; i++) {
      if (left <= lengths[i] || i === n - 1) {
        const a = loop[i], b = loop[(i + 1) % n], f = lengths[i] ? left / lengths[i] : 0;
        const x = a[0] + (b[0] - a[0]) * f, y = a[1] + (b[1] - a[1]) * f;
        let nx = -(b[1] - a[1]) / (lengths[i] || 1), ny = (b[0] - a[0]) / (lengths[i] || 1);
        if ((middle[0] - x) * nx + (middle[1] - y) * ny < 0) { nx = -nx; ny = -ny; }
        return [x, y, nx, ny];
      }
      left -= lengths[i];
    }
    return [loop[0][0], loop[0][1], 0, 0];
  };
  // begin where the outline crosses the pale line at the top
  let start = 0, walked = 0, best = Infinity;
  loop.forEach((p, i) => {
    const q = loop[(i + 1) % n];
    if ((p[0] - C) * (q[0] - C) <= 0 && Math.min(p[1], q[1]) < best && p[0] !== q[0]) {
      best = Math.min(p[1], q[1]);
      start = walked + lengths[i] * (C - p[0]) / (q[0] - p[0]);
    }
    walked += lengths[i];
  });
  const out = [];
  for (let k = 0; k < count; k++) {
    for (const [s, v] of shape.points) {
      const [x, y, nx, ny] = at(start + (k + shape.centre + s) * period);
      const d = (highest - v) * depth;
      out.push([x - nx * d, y - ny * d]);
    }
  }
  return out;
}

// The shield's outline moved inward by `d` all the way round (the shield has
// no dents, so this is simply what is left after cutting `d` off along
// every edge).
function insetShield(d) {
  return insetOutline(SHIELD_POLYGON, d);
}
function insetOutline(outline, d) {
  const centre = [C, 60];
  let shape = outline;
  for (let i = 0, j = outline.length - 1; i < outline.length; j = i++) {
    const [ax, ay] = outline[j], [bx, by] = outline[i];
    const len = Math.hypot(bx - ax, by - ay);
    if (len < 1e-9) continue;
    let nx = -(by - ay) / len, ny = (bx - ax) / len;                   // the edge's normal, pointing inward
    if ((centre[0] - ax) * nx + (centre[1] - ay) * ny < 0) { nx = -nx; ny = -ny; }
    const depth = ([x, y]) => (x - ax) * nx + (y - ay) * ny - d;       // how far inside the cut a point is
    const kept = [];
    for (let k = 0, m = shape.length - 1; k < shape.length; m = k++) {
      const p = shape[m], q = shape[k], dp = depth(p), dq = depth(q);
      if ((dp >= 0) !== (dq >= 0)) { const t = dp / (dp - dq); kept.push([p[0] + t * (q[0] - p[0]), p[1] + t * (q[1] - p[1])]); }
      if (dq >= 0) kept.push(q);
    }
    shape = kept;
    if (!shape.length) break;
  }
  return shape;
}

const divisionCache = new Map();
// FRAMES: with a chief, the field is drawn in the space below it, as if that
// space were the whole shield (the maintainer's rule): its divisions cut
// through the middle of that space, not the middle of the whole shield.
// Every shape is squeezed downwards so that the top edge moves to the chief's
// lower edge and the fess point to the middle of the space left.
// (The rules still judge contrast on the unsqueezed shapes: a chief lies on
// the parts of the field it borders, as SENA treats it.)
//
// The same goes for the space INSIDE A BORDURE (the maintainer, November
// 2026, on a chevron whose point was hidden under a bordure): the field and
// any ordinary are drawn smaller, to fit inside it. That is the same shrink
// both ways about the middle, so nothing changes shape.
//
// A frame has a name, used wherever shapes are asked for:
//   null          the whole shield
//   'chief'       the space below a chief
//   'in11'        the space 11 in from the shield's edge (inside a bordure)
//   'chief+in11'  both
export const frameName = (chief, inset = 0) => ((chief ? 'chief' : '') + (inset ? (chief ? '+' : '') + 'in' + inset : '')) || null;
const frameParts = frame => ({
  chief: !!frame && frame.startsWith('chief'),
  inset: frame && frame.includes('in') ? Number(frame.slice(frame.indexOf('in') + 2)) : 0,
});

let chiefFessY = null;
function squeezeBelowChief(polygons) {
  const k = (frameCentre('chief')[1] - CHIEF_BOTTOM) / (C - 1);
  return polygons.map(p => p.map(([x, y]) => [x, CHIEF_BOTTOM + (y - 1) * k]));
}

// The middle of the space a frame leaves: the fess point for the whole
// shield (and for the space inside a bordure), or the middle of the space
// below a chief.
export function frameCentre(frame = null) {
  if (!frameParts(frame).chief) return FESS_POINT;
  if (chiefFessY === null) {
    const below = SAMPLES.filter(([, y]) => y > CHIEF_BOTTOM);
    chiefFessY = below.reduce((s, [, y]) => s + y, 0) / below.length;
  }
  return [C, chiefFessY];
}

// How much smaller a frame draws things, across and down: [1, 1] for the
// whole shield.
export function frameScale(frame = null) {
  const { chief, inset } = frameParts(frame);
  const cy = frameCentre(frame)[1];
  const across = (98 - 2 * inset) / 98;
  const below = chief ? (cy - CHIEF_BOTTOM) / (C - 1) : 1;
  const down = !inset ? 1 : chief ? (cy - CHIEF_BOTTOM - inset) / (cy - CHIEF_BOTTOM) : across;
  return [across, below * down];
}

// Shapes drawn for the whole shield, moved into a frame. `square` = a
// pattern of squares, which is never squeezed (see KEEPS_ITS_SHAPE): it is
// only made smaller, the same both ways, with its top edge on the frame's.
function intoFrame(polygons, frame, square = false) {
  const { chief, inset } = frameParts(frame);
  if (!chief && !inset) return polygons;
  if (square) {
    if (!inset) return polygons;                       // below a chief: as it is
    const s = (98 - 2 * inset) / 98, top = (chief ? CHIEF_BOTTOM : 1) + inset;
    return polygons.map(p => p.map(([x, y]) => [C + (x - C) * s, top + (y - 1) * s]));
  }
  let out = chief ? squeezeBelowChief(polygons) : polygons;
  if (inset) {
    const cy = frameCentre(frame)[1], s = (98 - 2 * inset) / 98;
    const down = chief ? (cy - CHIEF_BOTTOM - inset) / (cy - CHIEF_BOTTOM) : s;
    out = out.map(p => p.map(([x, y]) => [C + (x - C) * s, cy + (y - cy) * down]));
  }
  return out;
}

// Patterns of squares are never squeezed (the maintainer, November 2026:
// "it's never correct to squish checky"). Below a chief they stay as they
// are, which already lines them up with it: its lower edge is the edge of a
// row.
const KEEPS_ITS_SHAPE = new Set(['checky', 'lozengy']);

// `frame`: the space the field is drawn in (see FRAMES above).
// `variant`: for a division that can be drawn more than one way (paly: how
// many pieces), which way; null for the usual.
// `line` (optional): a complex line to draw the division with (LINE_SHAPES).
// Only drawing asks for it; the rules and the layout work from the plain
// shapes, which differ by no more than the depth of the line.
export function divisionShapes(division, frame = null, variant = null, line = null) {
  if (line === 'plain' || !LINE_SHAPES[line] || division.includes('+') || KEEPS_ITS_SHAPE.has(division)) line = null;
  const key = `${division}|${frame}|${variant}` + (line ? `|${line}` : '');
  if (!divisionCache.has(key)) {
    if (!division.split('+').every(d => DIVISION_SHAPES[d])) throw new Error('No shape for division: ' + division);
    const plainParts = shapesOf(division, variant);
    // (Orly's shapes are whole outlines one inside another, so each is
    // redrawn along its own length, as a bordure's inner edge is; a small
    // one near the middle gets a shallower line, or it would be all line.)
    const redraw = division === 'orly'
      ? polygons => polygons.map(p => (p === EVERYWHERE ? p : linedLoop(p, line, true)))
      : polygons => linedShapes(polygons, line);
    const parts = line ? plainParts.map(redraw) : plainParts;
    divisionCache.set(key, parts.map(polygons => intoFrame(polygons, frame, KEEPS_ITS_SHAPE.has(division))));
  }
  return divisionCache.get(key);
}

// ---- Ordinaries ------------------------------------------------------------
// Each is a list of polygons (they run past the edge and are trimmed by the
// shield's outline). The bordure is special: a strip along the shield's edge.
export const BORDURE_WIDTH = 11;
// An orle: a band following the edge, set in from it.
export const ORLE_GAP = 8, ORLE_WIDTH = 6.5;

const DIAGONAL_PERP = DIAGONAL_HALF / Math.SQRT2;   // half a bend measured across it
// `k` is how wide to draw the ordinary: 1 for the full width above (an
// ordinary alone), less for an ordinary with charges around it, which is
// drawn narrower to leave them room (the maintainer, November 2026). A
// narrower ordinary keeps the same middle line, so the lines of a field
// divided the same way (per pale under a pale, per chevron under a chevron)
// still run down its middle.
const ORDINARY_SHAPES = {
  pale: (division, k) => [rect(C - STRAIGHT_HALF * k, -10, 2 * STRAIGHT_HALF * k, H + 20)],
  fess: (division, k) => [rect(-10, C - STRAIGHT_HALF * k, W + 20, 2 * STRAIGHT_HALF * k)],
  bend: (division, k) => [bendStrip(-DIAGONAL_HALF * k, DIAGONAL_HALF * k)],
  bendSinister: (division, k) => [sinisterStrip(-DIAGONAL_HALF * k, DIAGONAL_HALF * k)],
  chevron: (division, k) => {
    const apex = DIAGONAL_LINES.has(division) ? C : CHEVRON_APEX;
    return [chevronStrip(apex - CHEVRON_HALF * k, apex + CHEVRON_HALF * k)];
  },
  chevronInverted: (division, k) => {
    const apex = DIAGONAL_LINES.has(division) ? C : CHEVRON_INV_APEX;
    return [chevronInvStrip(apex - CHEVRON_HALF * k, apex + CHEVRON_HALF * k)];
  },
  cross: (division, k) => {
    const a = C - STRAIGHT_HALF * k, b = C + STRAIGHT_HALF * k;
    return [[[a, -10], [b, -10], [b, a], [W + 10, a], [W + 10, b], [b, b], [b, H + 10],
             [a, H + 10], [a, b], [-10, b], [-10, a], [a, a]]];
  },
  saltire: (division, k) => [bendStrip(-DIAGONAL_HALF * k, DIAGONAL_HALF * k), sinisterStrip(-DIAGONAL_HALF * k, DIAGONAL_HALF * k)],
  // Three arms along the lines of per pall, meeting at the fess point. The
  // upper arms run a little past it so the join has no notch.
  pall: (division, k) => [band(-20, -20, C + 12 * k, C + 12 * k, DIAGONAL_PERP * k), band(W + 20, -20, C - 12 * k, C + 12 * k, DIAGONAL_PERP * k),
                          rect(C - DIAGONAL_PERP * k, C - 5, 2 * DIAGONAL_PERP * k, H)],
  pile: (division, k) => [[[C - 1.5 * UNIT * k, -2], [C + 1.5 * UNIT * k, -2], [C, 115.6]]],
  chief: () => [rect(-10, -10, W + 20, CHIEF_BOTTOM + 10)],
  base: () => [rect(-10, BASE_TOP, W + 20, H)],
  // The next three follow Traceable Heraldic Art's device forms ("Canton",
  // "Flaunches" and "Gore"), whose curves are copied here point for point.
  // A canton: a square in the dexter chief corner, as deep as a chief.
  canton: () => [rect(-10, -10, CHIEF_BOTTOM + 10, CHIEF_BOTTOM + 10)],
  // Flaunches: a curve in from each side, from the corner of the chief to
  // low on the flank, reaching about a quarter of the way across.
  flaunches: () => {
    const curve = curvePoints([1.89, 1.93], [25.46, 25.51], [31.5, 59.97], [20.02, 89.13]);
    const dexter = [[-10, -10], [1.2, -10], ...curve, [-10, 95]];
    return [dexter, dexter.map(([x, y]) => [W - x, y])];
  },
  // A gore: two curves, from the dexter chief corner and from the point of
  // the shield, meeting just short of the fess point.
  gore: () => [[[-10, -10], [1.31, -10],
    ...curvePoints([1.31, 1.27], [1.31, 1.27], [4.96, 42.67], [44.51, 49.93]),
    ...curvePoints([44.51, 49.93], [25.66, 90.16], [50.02, 118.17], [50.02, 118.17]).slice(1),
    [50.02, H + 10], [-10, H + 10]]],
};

// Points along a curve from `a` to `d` that leaves towards `b` and arrives
// from `c` (a cubic Bezier curve, as in a drawing program).
function curvePoints(a, b, c, d, steps = 24) {
  return Array.from({ length: steps + 1 }, (_, i) => {
    const t = i / steps, u = 1 - t;
    return [0, 1].map(k => +(u * u * u * a[k] + 3 * u * u * t * b[k] + 3 * u * t * t * c[k] + t * t * t * d[k]).toFixed(2));
  });
}

// Fields whose lines run corner to corner through the fess point. On these a
// chevron (or chevron inverted) is drawn with its point at the fess point, so
// its arms lie exactly along those lines: a line under an arm runs down its
// middle, and a counterchanged arm is split evenly (not into a thin sliver).
const DIAGONAL_LINES = new Set(['perBend', 'perBendSinister', 'perSaltire', 'gyronny', 'perPall', 'perPallInverted']);

// True if this ordinary is drawn differently on this field division (so that
// anything worked out from its shape must be worked out again).
export const suitsDivision = (ordinary, division) =>
  (ordinary === 'chevron' || ordinary === 'chevronInverted') && DIAGONAL_LINES.has(division);

// `division` (optional): the field's division, for ordinaries that are
// placed to suit it.
// `frame` (optional): 'chief' when the shield also has a chief. Like the
// field, an ordinary is then drawn in the space below the chief, as if that
// space were the whole shield (the chief and base themselves stay put).
// `width` (optional): 1 for the ordinary's full width, less for a narrower
// one (see ORDINARY_SHAPES).
// `line` (optional): a complex line for its edges (LINE_SHAPES): "a fess
// wavy", "a chief indented". Of a fess, bend or chevron embattled only the
// upper edge is.
export function ordinaryShapes(ordinary, division = null, frame = null, width = 1, line = null) {
  if (ordinary === 'bordure' || ordinary === 'orle') return null;
  if (!ORDINARY_SHAPES[ordinary]) throw new Error('No shape for ordinary: ' + ordinary);
  let shapes = ORDINARY_SHAPES[ordinary](division, width);
  if (line && LINE_SHAPES[line] && !CURVED.has(ordinary)) {
    const upper = LINE_SHAPES[line].upper && UPPER_ONLY.has(ordinary);
    shapes = linedShapes(shapes, line, { outward: true, pick: upper ? (x, y) => y < -0.3 : null });
  }
  return ordinary !== 'chief' && ordinary !== 'base' ? intoFrame(shapes, frame) : shapes;
}
const CURVED = new Set(['canton', 'flaunches', 'gore']);     // (no complex lines for these yet)

// The inner edge of a bordure drawn with a complex line: the outline of the
// space the bordure is in (the shield, or the part of it below a chief),
// moved in by the bordure's width, then redrawn (linedLoop).
const bordureCache = new Map();
export function bordureInner(frame = null, line) {
  const key = `${frameParts(frame).chief}|${line}`;
  if (!bordureCache.has(key)) {
    let outline = SHIELD_POLYGON;
    if (frameParts(frame).chief) {
      // the shield cut off along the chief's lower edge
      outline = [[1, CHIEF_BOTTOM], [99, CHIEF_BOTTOM], ...SHIELD_POLYGON.filter(([, y]) => y > CHIEF_BOTTOM)];
    }
    bordureCache.set(key, linedLoop(insetOutline(outline, BORDURE_WIDTH), line));
  }
  return bordureCache.get(key);
}

// The outline of the space a frame leaves, as the text of an SVG path: the
// whole shield, or the part of it below a chief. A bordure or orle follows
// this line, so beside a chief it runs along under the chief instead of
// being cut off by it (the maintainer, November 2026).
export const framePath = (frame = null) => (frameParts(frame).chief
  ? `M1 ${+CHIEF_BOTTOM.toFixed(2)} H99 V40.2 C99 68 76 100.3 50 118.5 C24 100.3 1 68 1 40.2 Z` : SHIELD_PATH);
// How far a point is from that outline (only asked of points inside it).
export const distanceToFrame = (x, y, frame = null) =>
  (frameParts(frame).chief ? Math.min(distanceToEdge(x, y), y - CHIEF_BOTTOM) : distanceToEdge(x, y));

// ---- Sample points ---------------------------------------------------------
// A grid of points covering the inside of the shield. "How much of this charge
// lies on that part of the field?" is answered by counting these points.
export const SAMPLES = [];
for (let y = 3; y < H; y += 2) {
  for (let x = 3; x < W; x += 2) if (insideShield(x, y)) SAMPLES.push([x, y]);
}

// For a division: which part each sample point is in. `frame` as for
// divisionShapes: 'chief' gives the division as drawn below a chief.
const partMapCache = new Map();
export function partMap(division, frame = null, variant = null) {
  const key = `${division}|${frame}|${variant}`;
  if (!partMapCache.has(key)) {
    const shapes = divisionShapes(division, frame, variant);
    // (layered shapes: in a part if an odd number of its shapes cover the point)
    const within = isLayered(division)
      ? (x, y, polygons) => polygons.filter(p => pointInPolygon(x, y, p)).length % 2 === 1 : inAny;
    partMapCache.set(key, SAMPLES.map(([x, y]) => {
      const i = shapes.findIndex(polygons => within(x, y, polygons));
      return i < 0 ? 0 : i;
    }));
  }
  return partMapCache.get(key);
}

// Which sample points a set of polygons covers (as positions in SAMPLES).
export function samplesInside(polygons) {
  const out = [];
  SAMPLES.forEach(([x, y], i) => { if (inAny(x, y, polygons)) out.push(i); });
  return out;
}

// Which sample points a given box covers.
export function samplesInBox([x0, y0, x1, y1]) {
  const out = [];
  SAMPLES.forEach(([x, y], i) => { if (x >= x0 && x <= x1 && y >= y0 && y <= y1) out.push(i); });
  return out;
}

// How far a point is from the shield's outline.
export function distanceToEdge(x, y) {
  let best = Infinity;
  for (let i = 0, j = SHIELD_POLYGON.length - 1; i < SHIELD_POLYGON.length; j = i++) {
    const [ax, ay] = SHIELD_POLYGON[j], [bx, by] = SHIELD_POLYGON[i];
    const dx = bx - ax, dy = by - ay;
    const t = Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / (dx * dx + dy * dy)));
    best = Math.min(best, Math.hypot(x - ax - t * dx, y - ay - t * dy));
  }
  return best;
}

const ordinarySampleCache = new Map();
export function ordinarySamples(ordinary, division = null, frame = null, width = 1, line = null) {
  const key = `${ordinary}|${division}|${frame}|${width}` + (line ? `|${line}` : '');
  if (!ordinarySampleCache.has(key)) {
    const shapes = ordinaryShapes(ordinary, division, frame, width, line);
    // A bordure or orle follows the frame's outline (see framePath).
    const inFrame = ([, y]) => !frameParts(frame).chief || y > CHIEF_BOTTOM;
    const covered = shapes ? samplesInside(shapes)
      : ordinary === 'orle'
        ? SAMPLES.map((p, i) => { const d = distanceToFrame(p[0], p[1], frame); return inFrame(p) && d >= ORLE_GAP && d < ORLE_GAP + ORLE_WIDTH ? i : -1; }).filter(i => i >= 0)
        : SAMPLES.map((p, i) => (inFrame(p) && distanceToFrame(p[0], p[1], frame) < BORDURE_WIDTH ? i : -1)).filter(i => i >= 0);
    ordinarySampleCache.set(key, covered);
  }
  return ordinarySampleCache.get(key);
}
