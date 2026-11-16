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
export const SHIELD_PATH = 'M2 2 H98 V60 C98 95 70 112 50 118 C30 112 2 95 2 60 Z';

// ---- Helpers ---------------------------------------------------------------
const rect = (x, y, w, h) => [[x, y], [x + w, y], [x + w, y + h], [x, y + h]];

// A straight band of half-width `hw` along the line from (x1, y1) to (x2, y2).
function band(x1, y1, x2, y2, hw) {
  const len = Math.hypot(x2 - x1, y2 - y1);
  const nx = -(y2 - y1) / len * hw, ny = (x2 - x1) / len * hw;
  return [[x1 + nx, y1 + ny], [x2 + nx, y2 + ny], [x2 - nx, y2 - ny], [x1 - nx, y1 - ny]];
}

// Polygons -> the text of an SVG path.
export function pathOf(polygons) {
  return polygons.map(p => 'M' + p.map(q => q.map(n => +n.toFixed(2)).join(' ')).join(' L') + ' Z').join(' ');
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

// ---- The shield's outline --------------------------------------------------
function curve(p0, p1, p2, p3, steps = 14) {
  return Array.from({ length: steps }, (_, i) => {
    const t = (i + 1) / steps, u = 1 - t;
    return [0, 1].map(k => u * u * u * p0[k] + 3 * u * u * t * p1[k] + 3 * u * t * t * p2[k] + t * t * t * p3[k]);
  });
}
export const SHIELD_POLYGON = [[2, 2], [98, 2], [98, 60],
  ...curve([98, 60], [98, 95], [70, 112], [50, 118]),
  ...curve([50, 118], [30, 112], [2, 95], [2, 60])];
export const insideShield = (x, y) => pointInPolygon(x, y, SHIELD_POLYGON);

// ---- Field divisions -------------------------------------------------------
// A diagonal runs from the top corner down to this height on the far side.
const DIAG = 110;

// Alternating stripes: stripe 0 to part 0, stripe 1 to part 1, and so on.
function alternate(shapes) {
  const parts = [[], []];
  shapes.forEach((polygon, i) => parts[i % 2].push(polygon));
  return parts;
}

function bendStripes(mirror) {
  const w = 27.5, shapes = [];
  const x = v => (mirror ? W - v : v);
  for (let c = -DIAG; c < H; c += w) {
    shapes.push([[x(0), c], [x(W), c + DIAG], [x(W), c + DIAG + w], [x(0), c + w]]);
  }
  return alternate(shapes.reverse());
}

// Each entry returns one list of polygons per part, in blazon order.
const DIVISION_SHAPES = {
  perPale: () => [[rect(0, 0, 50, H)], [rect(50, 0, 50, H)]],
  perFess: () => [[rect(0, 0, W, 54)], [rect(0, 54, W, H - 54)]],
  perBend: () => [
    [[[0, 0], [W, 0], [W, DIAG]]],
    [[[0, 0], [W, DIAG], [W, H], [0, H]]],
  ],
  perBendSinister: () => [
    [[[0, 0], [W, 0], [0, DIAG]]],
    [[[W, 0], [W, H], [0, H], [0, DIAG]]],
  ],
  perChevron: () => [
    [[[0, 0], [W, 0], [W, 88], [50, 42], [0, 88]]],
    [[[0, 88], [50, 42], [W, 88], [W, H], [0, H]]],
  ],
  perChevronInverted: () => [
    [[[0, 0], [W, 0], [W, 28], [50, 74], [0, 28]]],
    [[[0, 28], [50, 74], [W, 28], [W, H], [0, H]]],
  ],
  perSaltire: () => [
    [[[0, 0], [W, 0], [50, 55]], [[0, DIAG], [50, 55], [W, DIAG], [W, H], [0, H]]],
    [[[0, 0], [50, 55], [0, DIAG]], [[W, 0], [W, DIAG], [50, 55]]],
  ],
  quarterly: () => [
    [rect(0, 0, 50, 54), rect(50, 54, 50, H - 54)],
    [rect(50, 0, 50, 54), rect(0, 54, 50, H - 54)],
  ],
  gyronny: () => {
    const c = [50, 55];
    const rim = [[0, 0], [50, 0], [W, 0], [W, 55], [W, DIAG], [50, H], [0, DIAG], [0, 55]];
    return alternate(rim.map((p, i) => [c, p, rim[(i + 1) % rim.length]]));
  },
  checky: () => {
    const n = 6, s = W / n, parts = [[], []];
    for (let row = 0; row * s < H; row++) {
      for (let col = 0; col < n; col++) parts[(row + col) % 2].push(rect(col * s, row * s, s, s));
    }
    return parts;
  },
  lozengy: () => {
    const a = 10, b = 15, parts = [[], []];   // half-width and half-height of a lozenge
    for (let m = 0; m * a <= W; m++) {
      for (let n = m % 2; n * b <= H; n += 2) {
        const x = m * a, y = n * b;
        parts[m % 2].push([[x, y - b], [x + a, y], [x, y + b], [x - a, y]]);
      }
    }
    return parts;
  },
  paly: () => {
    const n = 6, s = W / n;
    return alternate(Array.from({ length: n }, (_, i) => rect(i * s, 0, s, H)));
  },
  barry: () => {
    const n = 6, s = 118 / n;
    return alternate(Array.from({ length: n + 1 }, (_, i) => rect(0, i * s, W, s)));
  },
  bendy: () => bendStripes(false),
  bendySinister: () => bendStripes(true),
  chevronelly: () => {
    const w = 17, rise = 45, shapes = [];
    for (let c = -rise - w; c < H; c += w) {
      shapes.push([[0, c + rise], [50, c], [W, c + rise], [W, c + rise + w], [50, c + w], [0, c + rise + w]]);
    }
    return alternate(shapes);
  },
  perPall: () => [
    [[[0, 0], [W, 0], [50, 50]]],
    [[[0, 0], [50, 50], [50, H], [0, H]]],
    [[[W, 0], [W, H], [50, H], [50, 50]]],
  ],
  perPallInverted: () => [
    [[[0, 0], [50, 0], [50, 58], [0, 108]]],
    [[[50, 0], [W, 0], [W, 108], [50, 58]]],
    [[[0, 108], [50, 58], [W, 108], [W, H], [0, H]]],
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

const ORDINARY_SHAPES = {
  pale: () => [rect(35, -5, 30, 130)],
  fess: () => [rect(-5, 38, 110, 32)],
  bend: () => [band(-20, -22, 120, 132, 14)],
  bendSinister: () => [band(120, -22, -20, 132, 14)],
  chevron: () => [[[50, 34], [106, 90], [106, 116], [50, 60], [-6, 116], [-6, 90]]],
  chevronInverted: () => [[[50, 84], [106, 28], [106, 2], [50, 58], [-6, 2], [-6, 28]]],
  cross: () => [[[38, -5], [62, -5], [62, 40], [105, 40], [105, 64], [62, 64], [62, 125],
                 [38, 125], [38, 64], [-5, 64], [-5, 40], [38, 40]]],
  saltire: () => [band(-20, -22, 120, 132, 11), band(120, -22, -20, 132, 11)],
  pall: () => [band(-10, -10.4, 50, 52, 10), band(110, -10.4, 50, 52, 10), band(50, 52, 50, 130, 10)],
  pile: () => [[[20, -2], [80, -2], [50, 104]]],
  chief: () => [rect(-5, -5, 110, 35)],
  base: () => [rect(-5, 92, 110, 40)],
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
