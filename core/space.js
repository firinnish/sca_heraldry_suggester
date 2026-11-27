// space.js: "how big can this charge be, here?" The arithmetic behind
// layout.js, for spaces that are not simple boxes: the space inside a
// bordure, beside a chevron, between a lion and the edge of the shield, or on
// a bend.
//
// A SPACE is kept as a MASK: the shield's 100 x 120 box cut into a grid of
// small cells (two to a unit each way), each marked 1 (in the space) or 0.
// Spaces are combined cell by cell (this space AND NOT that ordinary), and
// "does this charge fit here at this size?" becomes "are all of its points on
// cells marked 1?", which is fast enough to try hundreds of positions.
//
// Nothing here knows any heraldry; layout.js decides which spaces to make.

import { W, H, SHIELD_POLYGON, distanceToEdge, pointInPolygon } from './geometry.js';

const PER_UNIT = 2;                               // cells per unit, each way
const GW = W * PER_UNIT, GH = H * PER_UNIT;       // the grid: 200 x 240 cells
const CELLS = GW * GH;
const cellX = i => (i % GW + 0.5) / PER_UNIT;     // the middle of cell i
const cellY = i => (Math.floor(i / GW) + 0.5) / PER_UNIT;

// ---- Making masks ---------------------------------------------------------------

// The inside of some polygons. (Scan each row of cells across the polygon's
// edges; a cell is in if its middle is.)
export function maskFromPolygons(polygons) {
  const mask = new Uint8Array(CELLS);
  for (const p of polygons) {
    // only the rows the polygon reaches
    let low = Infinity, high = -Infinity;
    for (const q of p) { if (q[1] < low) low = q[1]; if (q[1] > high) high = q[1]; }
    const firstRow = Math.max(0, Math.floor(low * PER_UNIT) - 1), lastRow = Math.min(GH - 1, Math.ceil(high * PER_UNIT) + 1);
    for (let row = firstRow; row <= lastRow; row++) {
      const y = (row + 0.5) / PER_UNIT;
      const crossings = [];
      for (let i = 0, j = p.length - 1; i < p.length; j = i++) {
        const [xi, yi] = p[i], [xj, yj] = p[j];
        if ((yi > y) !== (yj > y)) crossings.push((xj - xi) * (y - yi) / (yj - yi) + xi);
      }
      crossings.sort((a, b) => a - b);
      for (let k = 0; k + 1 < crossings.length; k += 2) {
        const from = Math.max(0, Math.ceil(crossings[k] * PER_UNIT - 0.5));
        const to = Math.min(GW - 1, Math.ceil(crossings[k + 1] * PER_UNIT - 0.5) - 1);
        for (let col = from; col <= to; col++) mask[row * GW + col] = 1;
      }
    }
  }
  return mask;
}

// The cells of `mask` that also pass a test on their position.
export function where(mask, test) {
  const out = new Uint8Array(CELLS);
  for (let i = 0; i < CELLS; i++) if (mask[i] && test(cellX(i), cellY(i))) out[i] = 1;
  return out;
}

export const and = (a, b) => a.map((v, i) => v & b[i]);
export const or = (a, b) => a.map((v, i) => v | b[i]);
export const minus = (a, b) => a.map((v, i) => v & (b[i] ^ 1));

let shield = null;
// The whole inside of the shield.
export function shieldMask() {
  return shield || (shield = maskFromPolygons([SHIELD_POLYGON]));
}

// The inside of the shield at least `gap` away from its edge: the space
// inside a bordure or an orle. (The rough distances from clearance() pick out
// the cells near the line; only those are measured exactly.)
const insetCache = new Map();
export function insetMask(gap) {
  if (!insetCache.has(gap)) {
    const far = clearance(shieldMask());
    const out = new Uint8Array(CELLS);
    for (let i = 0; i < CELLS; i++) {
      const rough = far[i] / PER_UNIT;
      if (rough > gap + 2 || (rough > gap - 2 && distanceToEdge(cellX(i), cellY(i)) >= gap)) out[i] = 1;
    }
    insetCache.set(gap, out);
  }
  return insetCache.get(gap);
}

// ---- Measuring masks --------------------------------------------------------------

export function inMask(mask, x, y) {
  const col = Math.floor(x * PER_UNIT), row = Math.floor(y * PER_UNIT);
  return col >= 0 && col < GW && row >= 0 && row < GH && mask[row * GW + col] === 1;
}

// The middle of a mask (the average position of its cells) and its size in
// cells: [x, y, cells]. An empty mask gives [50, 50, 0].
export function centroid(mask) {
  let sx = 0, sy = 0, n = 0;
  for (let i = 0; i < CELLS; i++) if (mask[i]) { sx += cellX(i); sy += cellY(i); n++; }
  return n ? [sx / n, sy / n, n] : [W / 2, H / 2 - 10, 0];
}

// The highest and lowest a mask reaches: [top, bottom].
export function heights(mask) {
  let first = -1, last = -1;
  for (let i = 0; i < CELLS; i++) if (mask[i]) { if (first < 0) first = i; last = i; }
  return first < 0 ? [0, H] : [Math.floor(first / GW) / PER_UNIT, (Math.floor(last / GW) + 1) / PER_UNIT];
}

// The furthest left and right a mask reaches: [left, right].
// Where a space begins and ends along one level line: [left, right], or null
// if it does not reach that height.
export function sidesAt(mask, y) {
  const row = Math.min(GH - 1, Math.max(0, Math.floor(y * PER_UNIT)));
  let first = -1, last = -1;
  for (let col = 0; col < GW; col++) if (mask[row * GW + col]) { if (first < 0) first = col; last = col; }
  return first < 0 ? null : [first / PER_UNIT, (last + 1) / PER_UNIT];
}

export function sides(mask) {
  let first = GW, last = -1;
  for (let i = 0; i < CELLS; i++) if (mask[i]) { const col = i % GW; if (col < first) first = col; if (col > last) last = col; }
  return last < 0 ? [0, W] : [first / PER_UNIT, (last + 1) / PER_UNIT];
}

// The values of `measure(x, y)` that cut a mask into `n` pieces of equal
// area, lowest first: n - 1 numbers. (Used to share an ordinary out between
// the charges lying along it.)
export function cuts(mask, measure, n) {
  const values = [];
  for (let i = 0; i < CELLS; i++) if (mask[i]) values.push(measure(cellX(i), cellY(i)));
  values.sort((a, b) => a - b);
  return Array.from({ length: n - 1 }, (_, k) => values[Math.floor(values.length * (k + 1) / n)]);
}

// For every cell in a mask, roughly how far it is (in cells) from the nearest
// cell outside it. Two sweeps over the grid, each cell taking the smallest of
// its neighbours' distances plus one step.
const clearanceCache = new WeakMap();
export function clearance(mask) {
  if (clearanceCache.has(mask)) return clearanceCache.get(mask);
  const d = new Float32Array(CELLS), DIAGONAL = Math.SQRT2;
  for (let i = 0; i < CELLS; i++) d[i] = mask[i] ? 1e6 : 0;
  const relax = (i, row, col, drow, dcol, cost) => {
    const r = row + drow, c = col + dcol;
    const other = r < 0 || r >= GH || c < 0 || c >= GW ? 0 : d[r * GW + c];
    if (other + cost < d[i]) d[i] = other + cost;
  };
  for (let row = 0; row < GH; row++) for (let col = 0; col < GW; col++) {
    const i = row * GW + col;
    if (!d[i]) continue;
    relax(i, row, col, 0, -1, 1); relax(i, row, col, -1, 0, 1);
    relax(i, row, col, -1, -1, DIAGONAL); relax(i, row, col, -1, 1, DIAGONAL);
  }
  for (let row = GH - 1; row >= 0; row--) for (let col = GW - 1; col >= 0; col--) {
    const i = row * GW + col;
    if (!d[i]) continue;
    relax(i, row, col, 0, 1, 1); relax(i, row, col, 1, 0, 1);
    relax(i, row, col, 1, 1, DIAGONAL); relax(i, row, col, 1, -1, DIAGONAL);
  }
  clearanceCache.set(mask, d);
  return d;
}

// ---- Fitting a charge into a mask ---------------------------------------------------

// A charge's PROBE: the points that must all be inside a space for the charge
// to fit there. They are the points of its outline (thinned out) plus a
// scattering of points inside it, so that the charge cannot swallow something
// thin (the point of a chevron) between two outline points. Positions are as
// in an outline: the charge is 1 wide, measured from its centre.
// `turn` is in degrees, clockwise: a charge on a bend is turned to follow it.
export function probeOf(outline, turn = 0) {
  const a = turn * Math.PI / 180, cos = Math.cos(a), sin = Math.sin(a);
  const step = Math.max(1, Math.floor(outline.length / 90));
  const points = outline.filter((_, i) => i % step === 0);
  const xs = outline.map(p => p[0]), ys = outline.map(p => p[1]);
  const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
  const ACROSS = 11;
  for (let i = 0; i < ACROSS; i++) for (let j = 0; j < ACROSS; j++) {
    const x = x0 + (i + 0.5) / ACROSS * (x1 - x0), y = y0 + (j + 0.5) / ACROSS * (y1 - y0);
    if (pointInPolygon(x, y, outline)) points.push([x, y]);
  }
  const probe = new Float32Array(points.length * 2);
  let reach = 0;
  points.forEach(([x, y], k) => {
    probe[2 * k] = x * cos - y * sin;
    probe[2 * k + 1] = x * sin + y * cos;
    reach = Math.max(reach, Math.hypot(x, y));
  });
  probe.reach = reach;            // how far the charge reaches from its centre
  return probe;
}

// An outline turned by `turn` degrees (for drawing and for coverage).
export function turned(outline, turn) {
  if (!turn) return outline;
  const a = turn * Math.PI / 180, cos = Math.cos(a), sin = Math.sin(a);
  return outline.map(([x, y]) => [x * cos - y * sin, x * sin + y * cos]);
}

// How far apart the centres of two copies of a charge must be, in the
// direction `angle` (degrees), for the copies not to overlap; in the
// outline's own measure (the charge is 1 wide). Roundels can sit closer
// together on a slant than their boxes would suggest; swords side by side
// closer than swords end to end.
// (It is the longest line that can be drawn across the charge in that
// direction: slide a copy that far along it and the two just part. Found by
// turning the outline so the direction lies flat, then measuring it across
// at many heights.)
export function clearDistance(outline, angle) {
  const a = -angle * Math.PI / 180, cos = Math.cos(a), sin = Math.sin(a);
  const step = Math.max(1, Math.floor(outline.length / 120));
  const turnedFlat = outline.filter((_, i) => i % step === 0).map(([x, y]) => [x * cos - y * sin, x * sin + y * cos]);
  const ys = turnedFlat.map(p => p[1]), low = Math.min(...ys), high = Math.max(...ys);
  let longest = 0;
  const LINES = 48;
  for (let k = 0; k < LINES; k++) {
    const y = low + (k + 0.5) / LINES * (high - low);
    let from = Infinity, to = -Infinity;
    for (let i = 0, j = turnedFlat.length - 1; i < turnedFlat.length; j = i++) {
      const [xi, yi] = turnedFlat[i], [xj, yj] = turnedFlat[j];
      if ((yi > y) !== (yj > y)) {
        const x = (xj - xi) * (y - yi) / (yj - yi) + xi;
        if (x < from) from = x;
        if (x > to) to = x;
      }
    }
    if (to - from > longest) longest = to - from;
  }
  return longest;
}

// The largest size (width) at which a charge centred at (cx, cy) fits in a
// mask. Sizes are tried from small to large up to the first that does not
// fit, so a charge never "jumps over" something in its way; then the last
// step is narrowed down.
// Does a charge of this size, centred at (cx, cy), fit in a mask?
export function fitsAt(probe, mask, cx, cy, size) {
  for (let k = 0; k < probe.length; k += 2) {
    const col = Math.floor((cx + probe[k] * size) * PER_UNIT), row = Math.floor((cy + probe[k + 1] * size) * PER_UNIT);
    if (col < 0 || col >= GW || row < 0 || row >= GH || !mask[row * GW + col]) return false;
  }
  return true;
}

export function largestFit(probe, mask, cx, cy) {
  const fits = size => fitsAt(probe, mask, cx, cy, size);
  const limit = 70 / (probe.reach || 0.5), STEPS = 24;   // nothing reaches further than the shield is big
  let lo = 0, hi = limit;
  for (let s = 1; s <= STEPS; s++) {
    const size = limit * s / STEPS;
    if (fits(size)) lo = size; else { hi = size; break; }
  }
  if (lo === limit) return limit;
  for (let s = 0; s < 8; s++) {
    const mid = (lo + hi) / 2;
    if (fits(mid)) lo = mid; else hi = mid;
  }
  return lo;
}

// The best place for a charge in a mask: where it can be largest. Among
// places that are nearly as good, the one nearest `near` wins (by default the
// middle of the mask), so a charge stays in the middle of a tidy space and
// only moves off it when the middle is a poor place to be.
//   axisX: a number to keep the charge on that upright line (a single charge
//          above a fess stays on the shield's centre line).
//   pull:  how much size a charge will give up to be one unit nearer `near`.
// Returns { cx, cy, size } or null if the mask is empty.
export function bestSpot(probe, mask, { near = null, axisX = null, pull = 0.12 } = {}) {
  const middle = centroid(mask);
  if (!middle[2]) return null;
  const target = near || middle;
  const far = clearance(mask);
  let best = null;
  const consider = (x, y) => {
    if (!inMask(mask, x, y)) return false;
    const size = largestFit(probe, mask, x, y);
    const score = size - pull * Math.hypot(x - target[0], y - target[1]);
    if (size > 0 && (!best || score > best.score + 1e-9)) { best = { cx: x, cy: y, size, score }; return true; }
    return false;
  };
  if (axisX !== null) {
    for (let y = 0.75; y < H; y += 1) consider(axisX, y);
  } else {
    consider(target[0], target[1]);
    const STEP = 4;
    for (let y = STEP / 2; y < H; y += STEP) for (let x = STEP / 2; x < W; x += STEP) {
      // skip cells hard against the edge of the space: nothing fits there
      if (far[Math.floor(y * PER_UNIT) * GW + Math.floor(x * PER_UNIT)] >= 3) consider(x, y);
    }
  }
  if (!best) return null;
  // Then try small moves from the best place found, while they help.
  for (const step of [2, 1, 0.5]) {
    for (let round = 0; round < 12; round++) {
      const { cx, cy } = best;
      let moved = false;
      for (const [dx, dy] of [[0, -1], [0, 1], [-1, 0], [1, 0], [-1, -1], [1, -1], [-1, 1], [1, 1]]) {
        if (axisX !== null && dx !== 0) continue;
        if (consider(cx + dx * step, cy + dy * step)) moved = true;
      }
      if (!moved) break;
    }
  }
  return { cx: best.cx, cy: best.cy, size: best.size };
}

// The cells a picture really covers when drawn at a place (not just the
// inside of its outline): `solid` is the grid of filled pixels from art.js.
// `place` is { cx, cy, size, turn }; mirror / flipY as when drawing.
export function maskFromPicture(solid, aspect, place, mirror, flipY) {
  const mask = new Uint8Array(CELLS);
  const { cx, cy, size } = place;
  const a = -(place.turn || 0) * Math.PI / 180, cos = Math.cos(a), sin = Math.sin(a);
  const reach = size * Math.hypot(0.5, 0.5 / aspect);
  const c0 = Math.max(0, Math.floor((cx - reach) * PER_UNIT)), c1 = Math.min(GW - 1, Math.ceil((cx + reach) * PER_UNIT));
  const r0 = Math.max(0, Math.floor((cy - reach) * PER_UNIT)), r1 = Math.min(GH - 1, Math.ceil((cy + reach) * PER_UNIT));
  for (let row = r0; row <= r1; row++) for (let col = c0; col <= c1; col++) {
    // back from the shield to the picture: undo the move, the turn, the flips
    const dx = ((col + 0.5) / PER_UNIT - cx) / size, dy = ((row + 0.5) / PER_UNIT - cy) / size;
    let u = dx * cos - dy * sin, v = dx * sin + dy * cos;
    if (mirror) u = -u;
    if (flipY) v = -v;
    const px = Math.floor((u + 0.5) * solid.w), py = Math.floor((v * aspect + 0.5) * solid.h);
    if (px >= 0 && px < solid.w && py >= 0 && py < solid.h && solid.data[py * solid.w + px]) mask[row * GW + col] = 1;
  }
  return mask;
}
