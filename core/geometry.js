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
const CHEVRON_INV_APEX = C + UNIT;  // per chevron inverted, and a chevron inverted: 66.33
const CHEVRON_HALF = 22.75;         // half a chevron, measured straight up
const CHIEF_BOTTOM = C - UNIT;      // 33.67
const BASE_TOP = C + 2 * UNIT;      // 82.67

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
  checky: () => {
    const parts = [[], []];
    for (let row = -1; row < 9; row++) {
      for (let col = -1; col < 8; col++) parts[(row + col + 2) % 2].push(rect(1 + col * UNIT, 1 + row * UNIT, UNIT, UNIT));
    }
    return parts;
  },
  // Lozenges are squares turned 45 degrees, a sixth of the shield wide, with
  // one in the middle of the shield, so their sides line up with a bend.
  lozengy: () => {
    const parts = [[], []];
    const at = (u, v) => [C + (u - v) / 2, C + (u + v) / 2];
    for (let i = -9; i <= 9; i++) {
      for (let j = -9; j <= 9; j++) {
        const u0 = (i - 0.5) * UNIT, v0 = (j - 0.5) * UNIT, u1 = u0 + UNIT, v1 = v0 + UNIT;
        parts[Math.abs(i + j) % 2].push([at(u0, v0), at(u1, v0), at(u1, v1), at(u0, v1)]);
      }
    }
    return parts;
  },
  paly: () => stripes((a, b) => rect(a, -FAR, b - a, 3 * FAR), 1 - 2 * UNIT, W + FAR, UNIT),
  barry: () => stripes((a, b) => rect(-FAR, a, 3 * FAR, b - a), 1 - 2 * UNIT, H + FAR, UNIT),
  // Bendy: a bend covers exactly two pieces. The first piece is in the
  // sinister chief corner.
  bendy: () => stripes(bendStrip, -98 - 4 * DIAGONAL_HALF, 3 * FAR, DIAGONAL_HALF),
  bendySinister: () => stripes(sinisterStrip, -98 - 4 * DIAGONAL_HALF, 3 * FAR, DIAGONAL_HALF),
  // Chevronelly: a chevron covers exactly two pieces.
  chevronelly: () => stripes(chevronStrip, CHEVRON_APEX - 4 * CHEVRON_HALF, 3 * FAR, CHEVRON_HALF),
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

const divisionCache = new Map();
export function divisionShapes(division) {
  if (!divisionCache.has(division)) {
    if (!DIVISION_SHAPES[division]) throw new Error('No shape for division: ' + division);
    divisionCache.set(division, DIVISION_SHAPES[division]());
  }
  return divisionCache.get(division);
}

// ---- Ordinaries ------------------------------------------------------------
// Each is a list of polygons (they run past the edge and are trimmed by the
// shield's outline). The bordure is special: a strip along the shield's edge.
export const BORDURE_WIDTH = 11;

const DIAGONAL_PERP = DIAGONAL_HALF / Math.SQRT2;   // half a bend measured across it
const ORDINARY_SHAPES = {
  pale: () => [rect(C - STRAIGHT_HALF, -10, 2 * STRAIGHT_HALF, H + 20)],
  fess: () => [rect(-10, C - STRAIGHT_HALF, W + 20, 2 * STRAIGHT_HALF)],
  bend: () => [bendStrip(-DIAGONAL_HALF, DIAGONAL_HALF)],
  bendSinister: () => [sinisterStrip(-DIAGONAL_HALF, DIAGONAL_HALF)],
  chevron: () => [chevronStrip(CHEVRON_APEX - CHEVRON_HALF, CHEVRON_APEX + CHEVRON_HALF)],
  chevronInverted: () => [chevronInvStrip(CHEVRON_INV_APEX - CHEVRON_HALF, CHEVRON_INV_APEX + CHEVRON_HALF)],
  cross: () => {
    const a = C - STRAIGHT_HALF, b = C + STRAIGHT_HALF;
    return [[[a, -10], [b, -10], [b, a], [W + 10, a], [W + 10, b], [b, b], [b, H + 10],
             [a, H + 10], [a, b], [-10, b], [-10, a], [a, a]]];
  },
  saltire: () => [bendStrip(-DIAGONAL_HALF, DIAGONAL_HALF), sinisterStrip(-DIAGONAL_HALF, DIAGONAL_HALF)],
  // Three arms along the lines of per pall, meeting at the fess point. The
  // upper arms run a little past it so the join has no notch.
  pall: () => [band(-20, -20, C + 12, C + 12, DIAGONAL_PERP), band(W + 20, -20, C - 12, C + 12, DIAGONAL_PERP),
               rect(C - DIAGONAL_PERP, C - 5, 2 * DIAGONAL_PERP, H)],
  pile: () => [[[C - 1.5 * UNIT, -2], [C + 1.5 * UNIT, -2], [C, 115.6]]],
  chief: () => [rect(-10, -10, W + 20, CHIEF_BOTTOM + 10)],
  base: () => [rect(-10, BASE_TOP, W + 20, H)],
};

export function ordinaryShapes(ordinary) {
  if (ordinary === 'bordure') return null;
  if (!ORDINARY_SHAPES[ordinary]) throw new Error('No shape for ordinary: ' + ordinary);
  return ORDINARY_SHAPES[ordinary]();
}

// ---- Sample points ---------------------------------------------------------
// A grid of points covering the inside of the shield. "How much of this charge
// lies on that part of the field?" is answered by counting these points.
export const SAMPLES = [];
for (let y = 3; y < H; y += 2) {
  for (let x = 3; x < W; x += 2) if (insideShield(x, y)) SAMPLES.push([x, y]);
}

// For a division: which part each sample point is in.
const partMapCache = new Map();
export function partMap(division) {
  if (!partMapCache.has(division)) {
    const shapes = divisionShapes(division);
    partMapCache.set(division, SAMPLES.map(([x, y]) => {
      const i = shapes.findIndex(polygons => inAny(x, y, polygons));
      return i < 0 ? 0 : i;
    }));
  }
  return partMapCache.get(division);
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

function distanceToEdge(x, y) {
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
export function ordinarySamples(ordinary) {
  if (!ordinarySampleCache.has(ordinary)) {
    const shapes = ordinaryShapes(ordinary);
    const covered = shapes ? samplesInside(shapes)
      : SAMPLES.map((p, i) => (distanceToEdge(p[0], p[1]) < BORDURE_WIDTH ? i : -1)).filter(i => i >= 0);
    ordinarySampleCache.set(ordinary, covered);
  }
  return ordinarySampleCache.get(ordinary);
}
