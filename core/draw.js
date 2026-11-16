// draw.js: turn a shield description into an SVG picture.
//
// The shield is drawn in a box 100 wide and 120 tall. Each field division is
// a small function that cuts that box into regions, one list of shapes per
// part. A part is then drawn by drawing its own field (which may itself be
// divided) and clipping it to its regions, so nesting works to any depth.
//
// To add a division: add it to catalog.js, then add its shapes to SHAPES here.

import { TINCTURES } from './catalog.js';
import { getPicture } from './art.js';

const W = 100, H = 120;
const SHIELD_PATH = 'M2 2 H98 V60 C98 95 70 112 50 118 C30 112 2 95 2 60 Z';
const OUTLINE = '#3a3226';

// Points -> a closed SVG path.
const poly = (...pts) => 'M' + pts.map(p => p.join(' ')).join(' L') + ' Z';
const rect = (x, y, w, h) => poly([x, y], [x + w, y], [x + w, y + h], [x, y + h]);

// A diagonal runs from the top corner down to this height on the far side.
const DIAG = 110;

// Alternating stripes: give each stripe (a list of points) to part 0, 1, 0, ...
function alternate(shapes) {
  const parts = ['', ''];
  shapes.forEach((d, i) => { parts[i % 2] += d + ' '; });
  return parts;
}

// Diagonal stripes from dexter chief to sinister base (mirror = the other way).
function bendStripes(mirror) {
  const w = 27.5, shapes = [];
  const x = v => (mirror ? W - v : v);
  for (let c = -DIAG; c < H; c += w) {
    shapes.push(poly([x(0), c], [x(W), c + DIAG], [x(W), c + DIAG + w], [x(0), c + w]));
  }
  return alternate(shapes.reverse());
}

// Each entry returns one SVG path per part, in blazon order.
const SHAPES = {
  perPale: () => [rect(0, 0, 50, H), rect(50, 0, 50, H)],
  perFess: () => [rect(0, 0, W, 54), rect(0, 54, W, H - 54)],
  perBend: () => [
    poly([0, 0], [W, 0], [W, DIAG]),
    poly([0, 0], [W, DIAG], [W, H], [0, H]),
  ],
  perBendSinister: () => [
    poly([0, 0], [W, 0], [0, DIAG]),
    poly([W, 0], [W, H], [0, H], [0, DIAG]),
  ],
  perChevron: () => [
    poly([0, 0], [W, 0], [W, 88], [50, 42], [0, 88]),
    poly([0, 88], [50, 42], [W, 88], [W, H], [0, H]),
  ],
  perChevronInverted: () => [
    poly([0, 0], [W, 0], [W, 28], [50, 74], [0, 28]),
    poly([0, 28], [50, 74], [W, 28], [W, H], [0, H]),
  ],
  perSaltire: () => [
    poly([0, 0], [W, 0], [50, 55]) + ' ' + poly([0, DIAG], [50, 55], [W, DIAG], [W, H], [0, H]),
    poly([0, 0], [50, 55], [0, DIAG]) + ' ' + poly([W, 0], [W, DIAG], [50, 55]),
  ],
  quarterly: () => [
    rect(0, 0, 50, 54) + ' ' + rect(50, 54, 50, H - 54),
    rect(50, 0, 50, 54) + ' ' + rect(0, 54, 50, H - 54),
  ],
  gyronny: () => {
    const c = [50, 55];
    const rim = [[0, 0], [50, 0], [W, 0], [W, 55], [W, DIAG], [50, H], [0, DIAG], [0, 55]];
    return alternate(rim.map((p, i) => poly(c, p, rim[(i + 1) % rim.length])));
  },
  checky: () => {
    const n = 6, s = W / n, parts = ['', ''];
    for (let row = 0; row * s < H; row++) {
      for (let col = 0; col < n; col++) parts[(row + col) % 2] += rect(col * s, row * s, s, s) + ' ';
    }
    return parts;
  },
  lozengy: () => {
    const a = 10, b = 15, parts = ['', ''];   // half-width and half-height of a lozenge
    for (let m = 0; m * a <= W; m++) {
      for (let n = m % 2; n * b <= H; n += 2) {
        const x = m * a, y = n * b;
        parts[m % 2] += poly([x, y - b], [x + a, y], [x, y + b], [x - a, y]) + ' ';
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
      shapes.push(poly([0, c + rise], [50, c], [W, c + rise], [W, c + rise + w], [50, c + w], [0, c + rise + w]));
    }
    return alternate(shapes);
  },
  perPall: () => [
    poly([0, 0], [W, 0], [50, 50]),
    poly([0, 0], [50, 50], [50, H], [0, H]),
    poly([W, 0], [W, H], [50, H], [50, 50]),
  ],
  perPallInverted: () => [
    poly([0, 0], [50, 0], [50, 58], [0, 108]),
    poly([50, 0], [W, 0], [W, 108], [50, 58]),
    poly([0, 108], [50, 58], [W, 108], [W, H], [0, H]),
  ],
};

// ---- Drawing ---------------------------------------------------------------

let nextId = 0;   // keeps ids unique when many shields are on one page

// An ermine spot: three dots above a tail.
function ermineSpot(x, y, fill) {
  return `<g fill="${fill}">` +
    `<circle cx="${x}" cy="${y}" r="0.9"/><circle cx="${x - 1.7}" cy="${y + 1.5}" r="0.9"/>` +
    `<circle cx="${x + 1.7}" cy="${y + 1.5}" r="0.9"/>` +
    `<path d="M${x} ${y + 1} L${x + 2} ${y + 8} L${x} ${y + 6.8} L${x - 2} ${y + 8} Z"/></g>`;
}

function fill(tincture, ctx) {
  const t = TINCTURES[tincture];
  if (!t.fur) return t.hex;
  const id = `${ctx.id}-${tincture}`;
  if (!ctx.furs.has(tincture)) {
    ctx.furs.add(tincture);
    const spots = TINCTURES[t.fur.spots].hex;
    ctx.defs.push(
      `<pattern id="${id}" width="18" height="22" patternUnits="userSpaceOnUse">` +
      `<rect width="18" height="22" fill="${TINCTURES[t.fur.field].hex}"/>` +
      ermineSpot(4.5, 2, spots) + ermineSpot(13.5, 13, spots) + `</pattern>`);
  }
  return `url(#${id})`;
}

function drawField(field, ctx) {
  if (field.type === 'plain') {
    return `<rect width="${W}" height="${H}" fill="${fill(field.tincture, ctx)}"/>`;
  }
  const shapes = SHAPES[field.division];
  if (!shapes) throw new Error('No drawing for division: ' + field.division);
  return shapes().map((d, i) => {
    const clipId = `${ctx.id}-c${ctx.clips++}`;
    ctx.defs.push(`<clipPath id="${clipId}"><path d="${d}"/></clipPath>`);
    return `<g clip-path="url(#${clipId})">${drawField(field.parts[i], ctx)}</g>`;
  }).join('');
}

// ---- Ordinaries ------------------------------------------------------------
// Drawn by the code: each is one or more shapes in the 100 x 120 box (they
// run past the edge and are trimmed by the shield's outline).

// A straight band of half-width `hw` along the line from (x1, y1) to (x2, y2).
function band(x1, y1, x2, y2, hw) {
  const len = Math.hypot(x2 - x1, y2 - y1);
  const nx = -(y2 - y1) / len * hw, ny = (x2 - x1) / len * hw;
  return poly([x1 + nx, y1 + ny], [x2 + nx, y2 + ny], [x2 - nx, y2 - ny], [x1 - nx, y1 - ny]);
}

const ORDINARY_SHAPES = {
  pale: () => [rect(35, -5, 30, 130)],
  fess: () => [rect(-5, 38, 110, 32)],
  bend: () => [band(-20, -22, 120, 132, 14)],
  bendSinister: () => [band(120, -22, -20, 132, 14)],
  chevron: () => [poly([50, 34], [106, 90], [106, 116], [50, 60], [-6, 116], [-6, 90])],
  chevronInverted: () => [poly([50, 84], [106, 28], [106, 2], [50, 58], [-6, 2], [-6, 28])],
  cross: () => [poly([38, -5], [62, -5], [62, 40], [105, 40], [105, 64], [62, 64], [62, 125],
                     [38, 125], [38, 64], [-5, 64], [-5, 40], [38, 40])],
  saltire: () => [band(-20, -22, 120, 132, 11), band(120, -22, -20, 132, 11)],
  pall: () => [band(-10, -10.4, 50, 52, 10), band(110, -10.4, 50, 52, 10), band(50, 52, 50, 130, 10)],
  pile: () => [poly([20, -2], [80, -2], [50, 104])],
  chief: () => [rect(-5, -5, 110, 35)],
  base: () => [rect(-5, 92, 110, 40)],
};

function drawOrdinary(group, ctx) {
  const paint = fill(group.tincture, ctx);
  if (group.ordinary === 'bordure') {
    // A wide line along the shield's edge; the half outside the shield is trimmed off.
    return `<path d="${SHIELD_PATH}" fill="none" stroke="${LINE}" stroke-width="23.6"/>` +
           `<path d="${SHIELD_PATH}" fill="none" stroke="${paint}" stroke-width="22"/>`;
  }
  const shapes = ORDINARY_SHAPES[group.ordinary];
  if (!shapes) throw new Error('No drawing for ordinary: ' + group.ordinary);
  const d = shapes().join(' ');
  // Outline first, then the fill over it, so that where two bands cross
  // (saltire, pall) there are no lines through the middle.
  return `<path d="${d}" fill="none" stroke="${LINE}" stroke-width="1.6"/><path d="${d}" fill="${paint}"/>`;
}

// ---- Charges ---------------------------------------------------------------
//
// Charge pictures are PNGs in charges/art/: black lines on a white fill, with
// a transparent background (see CONTRIBUTING.md). To draw one in a tincture:
//   1. paint the tincture (or fur pattern) through a mask made from the
//      picture, so it only shows where the picture is white;
//   2. draw the picture's lines on top, using a filter that keeps only the
//      dark parts. On a black charge the lines are drawn in grey instead.
// A charge with no picture is drawn as a blob of the right tincture.
//
// SIZE: each charge is made as big as its space allows and then shrunk to
// FILL (95%), so it fills the space without ever touching its edge. The space
// is the shield itself, or a share of it when there are two or three charges.
// The picture's real outline (measured in art.js) is used, not its bounding
// box, so a charge can tuck into the curve of the shield.

const LINE = '#111111';
const LINE_ON_DARK = [165, 165, 165];
const LINE_ON_LIGHT = [17, 17, 17];
const DARK_CHARGES = new Set(['sable', 'counterermine', 'pean']);
const FILL = 0.95;
const BLOB = 'M50 4 C78 2 98 22 94 50 C99 78 74 98 48 95 C22 99 2 76 6 50 C1 24 22 3 50 4 Z';
const BLOB_PICTURE = {
  aspect: 1,
  outline: Array.from({ length: 24 }, (_, i) => [0.5 * Math.cos(i * Math.PI / 12), 0.5 * Math.sin(i * Math.PI / 12)]),
};

// The shield's outline as a many-sided shape, for "is this point inside?".
function curve(p0, p1, p2, p3, steps = 14) {
  return Array.from({ length: steps }, (_, i) => {
    const t = (i + 1) / steps, u = 1 - t;
    return [0, 1].map(k => u * u * u * p0[k] + 3 * u * u * t * p1[k] + 3 * u * t * t * p2[k] + t * t * t * p3[k]);
  });
}
const SHIELD_POLYGON = [[2, 2], [98, 2], [98, 60],
  ...curve([98, 60], [98, 95], [70, 112], [50, 118]),
  ...curve([50, 118], [30, 112], [2, 95], [2, 60])];

function insideShield(x, y) {
  let inside = false;
  for (let i = 0, j = SHIELD_POLYGON.length - 1; i < SHIELD_POLYGON.length; j = i++) {
    const [xi, yi] = SHIELD_POLYGON[i], [xj, yj] = SHIELD_POLYGON[j];
    if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

// The space each charge of a group gets, by how many there are: [x0, y0, x1, y1]
// (always also limited to the inside of the shield). One: the whole shield.
// Two: side by side. Three: two and one.
const SPACES = {
  1: [[2, 2, 98, 118]],
  2: [[2, 2, 50, 118], [50, 2, 98, 118]],
  3: [[2, 2, 50, 55], [50, 2, 98, 55], [12, 55, 88, 118]],
};

// The largest size (and where) at which an outline fits inside a space.
function fit(points, [x0, y0, x1, y1]) {
  const xs = points.map(p => p[0]), ys = points.map(p => p[1]);
  const width = Math.max(...xs) - Math.min(...xs), height = Math.max(...ys) - Math.min(...ys);
  const limit = Math.min((x1 - x0) / width, (y1 - y0) / height);
  const fits = (cx, cy, size) => points.every(([u, v]) => {
    const x = cx + u * size, y = cy + v * size;
    return x >= x0 && x <= x1 && y >= y0 && y <= y1 && insideShield(x, y);
  });
  const midX = (x0 + x1) / 2;
  let best = { cx: midX, cy: (y0 + y1) / 2, size: 0 };
  const columns = Array.from({ length: 13 }, (_, i) => x0 + (x1 - x0) * i / 12)
    .sort((a, b) => Math.abs(a - midX) - Math.abs(b - midX));     // prefer the middle
  for (const cx of columns) {
    // Only try centres in the middle band of the space, so that a wide, flat
    // charge sits in the middle of the shield and not up against the top edge.
    for (let i = 0; i <= 16; i++) {
      const cy = y0 + (y1 - y0) * (0.3 + 0.32 * i / 16);
      if (!fits(cx, cy, best.size + 0.05)) continue;              // cannot beat the best so far
      let lo = best.size, hi = limit;
      for (let step = 0; step < 9; step++) {
        const mid = (lo + hi) / 2;
        if (fits(cx, cy, mid)) lo = mid; else hi = mid;
      }
      best = { cx, cy, size: lo };
    }
  }
  return best;
}

const fitCache = new Map();

// Where and how big each charge of a group is drawn.
function placeGroup(group, picture, flipY) {
  const key = [group.art, picture.aspect.toFixed(4), group.mirror, flipY, group.number].join('|');
  if (!fitCache.has(key)) {
    const spaces = SPACES[group.number];
    if (!spaces) throw new Error(`No layout yet for ${group.number} charges`);
    const step = Math.max(1, Math.floor(picture.outline.length / 60));
    const points = picture.outline.filter((_, i) => i % step === 0)
      .map(([u, v]) => [group.mirror ? -u : u, flipY ? -v : v]);
    const places = spaces.map(space => fit(points, space));
    const size = Math.min(...places.map(p => p.size)) * FILL;    // all the same size
    fitCache.set(key, places.map(p => ({ cx: p.cx, cy: p.cy, size })));
  }
  return fitCache.get(key);
}

function drawCharge(group, picture, flipY, { cx, cy, size }, ctx) {
  const paint = fill(group.tincture, ctx);
  const w = size, h = size / picture.aspect, x = cx - w / 2, y = cy - h / 2;
  let out;
  if (!picture.href) {
    out = `<path d="${BLOB}" transform="translate(${x} ${y}) scale(${w / 100} ${h / 100})" ` +
          `fill="${paint}" stroke="${LINE}" stroke-width="3"/>`;
  } else {
    const n = ctx.clips++;
    const maskId = `${ctx.id}-m${n}`, linesId = `${ctx.id}-l${n}`;
    const [r, g, b] = (DARK_CHARGES.has(group.tincture) ? LINE_ON_DARK : LINE_ON_LIGHT).map(v => (v / 255).toFixed(3));
    const image = `<image href="${picture.href}" x="${x}" y="${y}" width="${w}" height="${h}" preserveAspectRatio="none"`;
    ctx.defs.push(
      `<mask id="${maskId}">${image}/></mask>` +
      // keeps the picture's dark lines only: colour = line colour, opacity = opacity - brightness
      `<filter id="${linesId}" color-interpolation-filters="sRGB"><feColorMatrix type="matrix" ` +
      `values="0 0 0 0 ${r}  0 0 0 0 ${g}  0 0 0 0 ${b}  -1 0 0 1 0"/></filter>`);
    out = `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${paint}" mask="url(#${maskId})"/>` +
          `${image} filter="url(#${linesId})"/>`;
  }
  // Facing sinister = flipped left to right; upside down = flipped top to
  // bottom; both about the charge's own centre.
  if (!group.mirror && !flipY) return out;
  return `<g transform="translate(${cx} ${cy}) scale(${group.mirror ? -1 : 1} ${flipY ? -1 : 1}) translate(${-cx} ${-cy})">${out}</g>`;
}

function drawChargeGroup(group, ctx) {
  if (group.kind === 'ordinary') return drawOrdinary(group, ctx);
  const picture = (group.art && getPicture(group.art)) || BLOB_PICTURE;
  // Turn the picture over if it was drawn the other way up from what is wanted.
  const flipY = !!picture.href && !!group.inverted !== !!group.artInverted;
  return placeGroup(group, picture, flipY)
    .map(place => drawCharge(group, picture, flipY, place, ctx)).join('');
}

// The whole shield as an SVG string. `title` is read out by screen readers.
// `charges` is a list of charge groups (see shield.js). Pictures must have
// been loaded first (loadLibrary or loadPicture in art.js); a charge whose
// picture is not loaded is drawn as a blob.
export function shieldSVG(field, { title = '', charges = [] } = {}) {
  const ctx = { id: 's' + nextId++, defs: [], furs: new Set(), clips: 0 };
  const body = drawField(field, ctx) + charges.map(g => drawChargeGroup(g, ctx)).join('');
  const safeTitle = title.replace(/&/g, '&amp;').replace(/</g, '&lt;');
  return `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" role="img">` +
    (title ? `<title>${safeTitle}</title>` : '') +
    `<defs><clipPath id="${ctx.id}-shield"><path d="${SHIELD_PATH}"/></clipPath>${ctx.defs.join('')}</defs>` +
    `<g clip-path="url(#${ctx.id}-shield)">${body}</g>` +
    `<path d="${SHIELD_PATH}" fill="none" stroke="${OUTLINE}" stroke-width="2"/></svg>`;
}

// A small square of one tincture, for colour pickers.
export function swatchSVG(tincture) {
  const ctx = { id: 's' + nextId++, defs: [], furs: new Set(), clips: 0 };
  const f = fill(tincture, ctx);
  return `<svg viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">` +
    `<defs>${ctx.defs.join('')}</defs>` +
    `<rect x="1" y="1" width="38" height="38" rx="5" fill="${f}" stroke="${OUTLINE}" stroke-width="1.5"/></svg>`;
}
