// draw.js: turn a shield description into an SVG picture.
//
// The shapes come from geometry.js and the positions of charges from
// layout.js; this file only turns them into SVG.
//
// A divided field is drawn part by part: each part is its own field (which may
// itself be divided), clipped to that part's region, so nesting works to any
// depth.

import { TINCTURES } from './catalog.js';
import { COUNTERCHANGED, counterchangedField } from './shield.js';
import { W, H, SHIELD_PATH, BORDURE_WIDTH, pathOf, divisionShapes, ordinaryShapes } from './geometry.js';
import { placeGroup } from './layout.js';
import { scatter } from './scatter.js';

const OUTLINE = '#3a3226';
const LINE = '#111111';

// Things not chosen yet are drawn in greys: three for parts of the field,
// and a near-white for a charge.
const UNKNOWN_FIELD = ['#e3ded2', '#cdc6b6', '#b6ae9d'];
const UNKNOWN_CHARGE = '#f6f3ec';

let nextId = 0;   // keeps ids unique when many shields are on one page
const newContext = () => ({ id: 's' + nextId++, defs: [], furs: new Set(), clips: 0, unknowns: 0 });

// ---- Tinctures -------------------------------------------------------------

// An ermine spot: three dots above a tail.
function ermineSpot(x, y, fill) {
  return `<g fill="${fill}">` +
    `<circle cx="${x}" cy="${y}" r="0.9"/><circle cx="${x - 1.7}" cy="${y + 1.5}" r="0.9"/>` +
    `<circle cx="${x + 1.7}" cy="${y + 1.5}" r="0.9"/>` +
    `<path d="M${x} ${y + 1} L${x + 2} ${y + 8} L${x} ${y + 6.8} L${x - 2} ${y + 8} Z"/></g>`;
}

// What to paint a tincture with: a colour, or (for a fur) a pattern.
function paintFor(tincture, ctx) {
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

// ---- The field -------------------------------------------------------------

// `regions` and `key` say which piece of the shield this field fills (a part
// of a division, a part of that part...), so that a fur's spots can be placed
// whole inside it rather than cut by its edges.
function drawField(field, ctx, regions = [], key = 'whole') {
  if (field && field.type === 'plain' && field.tincture !== null && TINCTURES[field.tincture].fur) {
    const t = TINCTURES[field.tincture];
    const spots = TINCTURES[t.fur.spots].hex;
    return `<rect width="${W}" height="${H}" fill="${TINCTURES[t.fur.field].hex}"/>` +
      scatter(key, regions).map(([x, y]) => ermineSpot(x, y - 4, spots)).join('');
  }
  if (!field || field.type === 'plain') {
    const paint = field && field.tincture !== null
      ? paintFor(field.tincture, ctx)
      : UNKNOWN_FIELD[ctx.unknowns++ % UNKNOWN_FIELD.length];
    return `<rect width="${W}" height="${H}" fill="${paint}"/>`;
  }
  return divisionShapes(field.division).map((polygons, i) => {
    const clipId = `${ctx.id}-c${ctx.clips++}`;
    ctx.defs.push(`<clipPath id="${clipId}"><path d="${pathOf(polygons)}"/></clipPath>`);
    return `<g clip-path="url(#${clipId})">${drawField(field.parts[i], ctx, [...regions, polygons], `${key}/${field.division}${i}`)}</g>`;
  }).join('');
}

// What a charge group is painted with, as a function that fills a shape:
// `fill(shapeAttributes)` returns SVG. For a plain tincture that is just a
// coloured rectangle; for a counterchanged charge it is the field with its
// two tinctures swapped, showing through the charge's shape.
function painter(group, field, ctx) {
  if (group.tincture === COUNTERCHANGED) {
    const swapped = counterchangedField(field);
    if (swapped) return cut => `<g ${cut}>${drawField(swapped, ctx)}</g>`;
  }
  const paint = group.tincture && group.tincture !== COUNTERCHANGED ? paintFor(group.tincture, ctx) : UNKNOWN_CHARGE;
  return cut => `<rect width="${W}" height="${H}" fill="${paint}" ${cut}/>`;
}

// ---- Ordinaries ------------------------------------------------------------

function drawOrdinary(group, field, ctx) {
  const paint = painter(group, field, ctx);
  const id = `${ctx.id}-o${ctx.clips++}`;
  if (group.ordinary === 'bordure') {
    // A wide line along the shield's edge; the half outside the shield is
    // trimmed off by the shield's own outline.
    const width = BORDURE_WIDTH * 2;
    ctx.defs.push(`<mask id="${id}"><path d="${SHIELD_PATH}" fill="none" stroke="#fff" stroke-width="${width}"/></mask>`);
    return `<path d="${SHIELD_PATH}" fill="none" stroke="${LINE}" stroke-width="${width + 1.6}"/>` + paint(`mask="url(#${id})"`);
  }
  const d = pathOf(ordinaryShapes(group.ordinary));
  ctx.defs.push(`<clipPath id="${id}"><path d="${d}"/></clipPath>`);
  // Outline first, then the paint over it, so that where two bands cross
  // (saltire, pall) there are no lines through the middle.
  return `<path d="${d}" fill="none" stroke="${LINE}" stroke-width="1.6"/>` + paint(`clip-path="url(#${id})"`);
}

// ---- Charges with pictures -------------------------------------------------
//
// Charge pictures are PNGs in charges/art/: black lines on a white fill, with
// a transparent background (see CONTRIBUTING.md). To draw one in a tincture:
//   1. paint the tincture through a mask made from the picture, so it only
//      shows where the picture is white;
//   2. draw the picture's lines on top, using a filter that keeps only the
//      dark parts. On a black charge the lines are drawn in grey instead.
// A charge with no picture is drawn as a blob of the right tincture.

const LINE_ON_DARK = [165, 165, 165];
const LINE_ON_LIGHT = [17, 17, 17];
const DARK_CHARGES = new Set(['sable', 'counterermine', 'pean']);
const BLOB = 'M50 4 C78 2 98 22 94 50 C99 78 74 98 48 95 C22 99 2 76 6 50 C1 24 22 3 50 4 Z';

function drawCharge(group, paint, picture, flipY, { cx, cy, size }, ctx) {
  const w = size, h = size / picture.aspect, x = cx - w / 2, y = cy - h / 2;
  const n = ctx.clips++;
  if (!picture.href) {
    const id = `${ctx.id}-b${n}`;
    const blob = `<path d="${BLOB}" transform="translate(${x} ${y}) scale(${w / 100} ${h / 100})"`;
    ctx.defs.push(`<clipPath id="${id}">${blob}/></clipPath>`);
    return paint(`clip-path="url(#${id})"`) + `${blob} fill="none" stroke="${LINE}" stroke-width="3"/>`;
  }
  // Facing sinister = flipped left to right; upside down = flipped top to
  // bottom; both about the charge's own centre. Only the picture is flipped,
  // never the paint behind it (which matters for counterchanged charges).
  const flip = group.mirror || flipY
    ? ` transform="translate(${cx} ${cy}) scale(${group.mirror ? -1 : 1} ${flipY ? -1 : 1}) translate(${-cx} ${-cy})"`
    : '';
  const image = `<image href="${picture.href}" x="${x}" y="${y}" width="${w}" height="${h}" preserveAspectRatio="none"${flip}`;
  const maskId = `${ctx.id}-m${n}`, linesId = `${ctx.id}-l${n}`;
  const [r, g, b] = (DARK_CHARGES.has(group.tincture) ? LINE_ON_DARK : LINE_ON_LIGHT).map(v => (v / 255).toFixed(3));
  ctx.defs.push(
    `<mask id="${maskId}">${image}/></mask>` +
    // keeps the picture's dark lines only: colour = line colour, opacity = opacity - brightness
    `<filter id="${linesId}" color-interpolation-filters="sRGB"><feColorMatrix type="matrix" ` +
    `values="0 0 0 0 ${r}  0 0 0 0 ${g}  0 0 0 0 ${b}  -1 0 0 1 0"/></filter>`);
  return paint(`mask="url(#${maskId})"`) + `${image} filter="url(#${linesId})"/>`;
}

function drawGroup(group, field, ctx) {
  if (group.kind === 'ordinary') return drawOrdinary(group, field, ctx);
  const paint = painter(group, field, ctx);
  const { picture, flipY, places } = placeGroup(group, field);
  return places.map(place => drawCharge(group, paint, picture, flipY, place, ctx)).join('');
}

// ---- The whole shield --------------------------------------------------------

// The whole shield as an SVG string. `title` is read out by screen readers.
// `charges` is a list of charge groups (see shield.js). Pictures must have
// been loaded first (loadLibrary or loadPicture in art.js); a charge whose
// picture is not loaded is drawn as a blob. `field` may be null (not chosen).
export function shieldSVG(field, { title = '', charges = [] } = {}) {
  const ctx = newContext();
  const body = drawField(field, ctx) + charges.map(g => drawGroup(g, field, ctx)).join('');
  const safeTitle = title.replace(/&/g, '&amp;').replace(/</g, '&lt;');
  return `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" role="img">` +
    (title ? `<title>${safeTitle}</title>` : '') +
    `<defs><clipPath id="${ctx.id}-shield"><path d="${SHIELD_PATH}"/></clipPath>${ctx.defs.join('')}</defs>` +
    `<g clip-path="url(#${ctx.id}-shield)">${body}</g>` +
    `<path d="${SHIELD_PATH}" fill="none" stroke="${OUTLINE}" stroke-width="2"/></svg>`;
}

// A small square of one tincture, for colour pickers.
export function swatchSVG(tincture) {
  const ctx = newContext();
  const f = paintFor(tincture, ctx);
  return `<svg viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">` +
    `<defs>${ctx.defs.join('')}</defs>` +
    `<rect x="1" y="1" width="38" height="38" rx="5" fill="${f}" stroke="${OUTLINE}" stroke-width="1.5"/></svg>`;
}

// A swatch for "counterchanged": a square split in two, each half holding a
// dot of the other half's colour.
export function counterchangedSwatchSVG() {
  return `<svg viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">` +
    `<rect x="1" y="1" width="19" height="38" fill="#555"/><rect x="20" y="1" width="19" height="38" fill="#f5f5f0"/>` +
    `<path d="M20 11 A9 9 0 0 0 20 29 Z" fill="#f5f5f0"/><path d="M20 11 A9 9 0 0 1 20 29 Z" fill="#555"/>` +
    `<rect x="1" y="1" width="38" height="38" rx="5" fill="none" stroke="${OUTLINE}" stroke-width="1.5"/></svg>`;
}
