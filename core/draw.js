// draw.js: turn a shield description into an SVG picture.
//
// The shield is drawn in a box 100 wide and 120 tall. Each field division is
// a small function that cuts that box into regions, one list of shapes per
// part. A part is then drawn by drawing its own field (which may itself be
// divided) and clipping it to its regions, so nesting works to any depth.
//
// To add a division: add it to catalog.js, then add its shapes to SHAPES here.

import { TINCTURES } from './catalog.js';

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

// The whole shield as an SVG string. `title` is read out by screen readers.
export function shieldSVG(field, { title = '' } = {}) {
  const ctx = { id: 's' + nextId++, defs: [], furs: new Set(), clips: 0 };
  const body = drawField(field, ctx);
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
