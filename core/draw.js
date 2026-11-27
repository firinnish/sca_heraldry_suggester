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
import { W, H, SHIELD_PATH, BORDURE_WIDTH, ORLE_GAP, ORLE_WIDTH, pathOf, divisionShapes, framePath, isLayered } from './geometry.js';
import { layoutShield } from './layout.js';
import { scatter } from './scatter.js';

const OUTLINE = '#3a3226';
const LINE = '#111111';

// Things not chosen yet are drawn in greys: three for parts of the field,
// and a near-white for a charge.
const UNKNOWN_FIELD = ['#e3ded2', '#cdc6b6', '#b6ae9d'];
const UNKNOWN_CHARGE = '#f6f3ec';

let nextId = 0;   // keeps ids unique when many shields are on one page
// `mode` is how the shield is to be drawn:
//   'colour'  the usual picture; anything not chosen yet is grey
//   'export'  the same, for saving as a picture: anything not chosen yet is
//             painted `unknown` instead of grey (export.js draws the shield
//             twice, with black and with white, to find those places and
//             make them see-through)
//   'lines'   for saving the outlines alone: everything is painted plain
//             white with black lines, and the lines of a divided field are
//             drawn in. (export.js then turns the white see-through.)
// `variant` is the way the field's pattern is drawn (layout.js: fieldVariant).
const newContext = (mode = 'colour', variant = null, unknown = 'none') =>
  ({ id: 's' + nextId++, defs: [], furs: new Set(), clips: 0, unknowns: 0, mode, variant, unknown });

// ---- Tinctures -------------------------------------------------------------

// An ermine spot: three dots above a tail. `outlined`: for the picture of
// outlines alone, the spot is white with a line round it.
function ermineSpot(x, y, fill, outlined = false) {
  return `<g ${outlined ? `fill="#fff" stroke="${LINE}" stroke-width="0.4"` : `fill="${fill}"`}>` +
    `<circle cx="${x}" cy="${y}" r="0.9"/><circle cx="${x - 1.7}" cy="${y + 1.5}" r="0.9"/>` +
    `<circle cx="${x + 1.7}" cy="${y + 1.5}" r="0.9"/>` +
    `<path d="M${x} ${y + 1} L${x + 2} ${y + 8} L${x} ${y + 6.8} L${x - 2} ${y + 8} Z"/></g>`;
}

// What to paint a tincture with: a colour, or (for a fur) a pattern.
function paintFor(tincture, ctx) {
  const t = TINCTURES[tincture];
  const lines = ctx.mode === 'lines';
  if (!t.fur && !t.pattern) return lines ? '#fff' : t.hex;
  const id = `${ctx.id}-${tincture.replace(/:/g, '_')}`;
  if (!t.fur) {
    if (!ctx.furs.has(tincture)) { ctx.furs.add(tincture); ctx.defs.push(patternOf(id, t, lines)); }
    return `url(#${id})`;
  }
  if (!ctx.furs.has(tincture)) {
    ctx.furs.add(tincture);
    const spots = TINCTURES[t.fur.spots].hex;
    ctx.defs.push(
      `<pattern id="${id}" width="18" height="22" patternUnits="userSpaceOnUse">` +
      `<rect width="18" height="22" fill="${lines ? '#fff' : TINCTURES[t.fur.field].hex}"/>` +
      ermineSpot(4.5, 2, spots, lines) + ermineSpot(13.5, 13, spots, lines) + `</pattern>`);
  }
  return `url(#${id})`;
}

// The furs and field treatments that repeat like a tiling (catalog.js:
// PATTERNS), each as one tile: its size on a shield 100 wide, and its shapes
// in the second tincture over a background of the first. The shapes were
// measured from Traceable Heraldic Art's drawings: five vair bells or four
// and a half bricks across a shield, every slope of a bell at 45 degrees.
// In vair the colour makes the bells, points upward.
const poly = (points, dx = 0, dy = 0) => `<path d="M${points.map(([x, y]) => `${x + dx} ${y + dy}`).join(' L')} Z"/>`;
const BELL = [[0, 20], [5, 15], [5, 5], [10, 0], [15, 5], [15, 15], [20, 20]];
const BELL_DOWN = BELL.map(([x, y]) => [x, 40 - y]);
const CRUTCH = [[0, 14], [0, 7], [7, 7], [7, 0], [14, 0], [14, 7], [21, 7], [21, 14]];
// (a scale hangs downward from the line it is sewn to; a "papellony" one is its edge alone)
const scale = (x, y, inner) => `<path d="M${x} ${y} a12.5 12.5 0 0 0 25 0 ${inner}Z"/>`;
const TILES = {
  vairy:        { w: 20, h: 40, shapes: () => poly(BELL) + poly(BELL, 10, 20) + poly(BELL, -10, 20) },
  countervairy: { w: 20, h: 40, shapes: () => poly(BELL) + poly(BELL_DOWN) },
  potenty:      { w: 28, h: 28, shapes: () => poly(CRUTCH) + poly(CRUTCH, 14, 14) + poly(CRUTCH, -14, 14) },
  masoned:      { w: 22, h: 28, thin: true, shapes: () => `<path d="M0 0 H22 M0 14 H22 M0 28 H22 M11 0 V14 M0 14 V28 M22 14 V28"/>` },
  scaly:        { w: 25, h: 25, shapes: () => [[0, 0], [-12.5, 12.5], [12.5, 12.5], [0, 25]].map(([x, y]) => scale(x, y, 'a12.5 8 0 0 1 -25 0')).join('') },
  papellony:    { w: 25, h: 25, shapes: () => [[0, 0], [-12.5, 12.5], [12.5, 12.5], [0, 25]].map(([x, y]) => scale(x, y, 'h-2.5 a10 10 0 0 1 -20 0')).join('') },
  // (a spark is three dots, one and two; they are strewn like ermine spots)
  estencely:    { w: 18, h: 22, shapes: () => [[4.5, 4.5], [13.5, 15.5]].map(([x, y]) =>
    `<circle cx="${x}" cy="${y - 1.6}" r="1.2"/><circle cx="${x - 1.9}" cy="${y + 1.5}" r="1.2"/><circle cx="${x + 1.9}" cy="${y + 1.5}" r="1.2"/>`).join('') },
};
function patternOf(id, t, lines) {
  const tile = TILES[t.pattern], [ground, over] = t.pair.map(p => TINCTURES[p].hex);
  // (masoning is drawn as lines; everything else as filled shapes, which in
  // the picture of outlines alone are white with a line round them)
  const paint = tile.thin ? `fill="none" stroke="${lines ? LINE : over}" stroke-width="${lines ? 0.6 : 1.3}"`
    : lines ? `fill="#fff" stroke="${LINE}" stroke-width="0.5"` : `fill="${over}"`;
  return `<pattern id="${id}" width="${tile.w}" height="${tile.h}" patternUnits="userSpaceOnUse">` +
    `<rect width="${tile.w}" height="${tile.h}" fill="${lines ? '#fff' : ground}"/><g ${paint}>${tile.shapes()}</g></pattern>`;
}

// ---- The field -------------------------------------------------------------

// `regions` and `key` say which piece of the shield this field fills (a part
// of a division, a part of that part...), so that a fur's spots can be placed
// whole inside it rather than cut by its edges.
function drawField(field, ctx, regions = [], key = 'whole', frame = null) {
  const lines = ctx.mode === 'lines';
  if (field && field.type === 'plain' && field.tincture !== null && TINCTURES[field.tincture].fur) {
    const t = TINCTURES[field.tincture];
    const spots = TINCTURES[t.fur.spots].hex;
    return `<rect width="${W}" height="${H}" fill="${lines ? '#fff' : TINCTURES[t.fur.field].hex}"/>` +
      scatter(key, regions).map(([x, y]) => ermineSpot(x, y - 4, spots, lines)).join('');
  }
  if (!field || field.type === 'plain') {
    const paint = field && field.tincture !== null ? paintFor(field.tincture, ctx)
      : lines ? '#fff' : ctx.mode === 'export' ? ctx.unknown
      : UNKNOWN_FIELD[ctx.unknowns++ % UNKNOWN_FIELD.length];
    return `<rect width="${W}" height="${H}" fill="${paint}"/>`;
  }
  // (Only the whole field's own division has a variant, not a part's.)
  const variant = regions.length ? null : ctx.variant;
  return divisionShapes(field.division, frame, variant).map((polygons, i) => {
    const clipId = `${ctx.id}-c${ctx.clips++}`, d = pathOf(polygons);
    // (layered shapes, such as orly's, make their pieces by "evenodd": geometry.js)
    ctx.defs.push(`<clipPath id="${clipId}"><path d="${d}"${isLayered(field.division) ? ' clip-rule="evenodd"' : ''}/></clipPath>`);
    const part = drawField(field.parts[i], ctx, [...regions, polygons], `${key}/${frame || ''}${field.division}${variant || ''}${i}`, frame);
    // Outlines only: each part draws the line round itself, inside its own
    // edge, so the two halves of every line meet and nothing spills over.
    // (Half of 0.8 from each side: as thick as the line round an ordinary.)
    return `<g clip-path="url(#${clipId})">${part}${lines ? `<path d="${d}" fill="none" stroke="${LINE}" stroke-width="0.8"/>` : ''}</g>`;
  }).join('');
}

// What a charge group is painted with, as a function that fills a shape:
// `fill(shapeAttributes)` returns SVG. For a plain tincture that is just a
// coloured rectangle; for a counterchanged charge it is the field with its
// two tinctures swapped, showing through the charge's shape.
// `frame`: as for the field itself, so that the swapped field lines up with
// the real one when both are drawn in the space below a chief.
function painter(group, field, ctx, frame = null) {
  if (group.tincture === COUNTERCHANGED) {
    const swapped = counterchangedField(field);
    if (swapped) return cut => `<g ${cut}>${drawField(swapped, ctx, [], 'whole', frame)}</g>`;
  }
  const paint = group.tincture && group.tincture !== COUNTERCHANGED ? paintFor(group.tincture, ctx)
    : ctx.mode === 'lines' ? '#fff' : ctx.mode === 'export' ? ctx.unknown : UNKNOWN_CHARGE;
  return cut => `<rect width="${W}" height="${H}" fill="${paint}" ${cut}/>`;
}

// ---- Ordinaries ------------------------------------------------------------

// `shapes` come from the layout (layout.js): an ordinary beside a chief is
// drawn in the space below it.
function drawOrdinary(group, shapes, field, ctx, frame) {
  const paint = painter(group, field, ctx, frame);
  const id = `${ctx.id}-o${ctx.clips++}`;
  // A bordure or orle follows the edge of the space it is in: the shield's
  // edge, or beside a chief the edge of the space below it, so that it runs
  // along under the chief (which is drawn afterwards, over the half of the
  // line that falls above).
  const edge = framePath(frame);
  if (group.ordinary === 'orle') {
    // A band set in from the edge: a wide stroke along the outline, minus a
    // narrower one. The lines are the same band made a little wider.
    const band = (maskId, grow) => `<mask id="${maskId}">` +
      `<path d="${edge}" fill="none" stroke="#fff" stroke-width="${2 * (ORLE_GAP + ORLE_WIDTH) + grow}"/>` +
      `<path d="${edge}" fill="none" stroke="#000" stroke-width="${2 * ORLE_GAP - grow}"/></mask>`;
    ctx.defs.push(band(id, 0), band(id + 'l', 1.6));
    return `<rect width="${W}" height="${H}" fill="${LINE}" mask="url(#${id}l)"/>` + paint(`mask="url(#${id})"`);
  }
  if (group.ordinary === 'bordure') {
    // A wide line along the edge; the half outside the shield is trimmed off
    // by the shield's own outline.
    const width = BORDURE_WIDTH * 2;
    ctx.defs.push(`<mask id="${id}"><path d="${edge}" fill="none" stroke="#fff" stroke-width="${width}"/></mask>`);
    return `<path d="${edge}" fill="none" stroke="${LINE}" stroke-width="${width + 1.6}"/>` + paint(`mask="url(#${id})"`);
  }
  const d = pathOf(shapes);
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

function drawCharge(group, paint, picture, flipY, { cx, cy, size, turn }, ctx) {
  // A charge lying along a bend or a chevron's arm is turned to follow it.
  const turning = turn ? `rotate(${turn} ${cx} ${cy}) ` : '';
  if (picture.base) return drawTurned(group, paint, picture, { cx, cy, size }, turning, ctx);
  const w = size, h = size / picture.aspect, x = cx - w / 2, y = cy - h / 2;
  const n = ctx.clips++;
  if (!picture.href) {
    const id = `${ctx.id}-b${n}`;
    const blob = `<path d="${BLOB}" transform="${turning}translate(${x} ${y}) scale(${w / 100} ${h / 100})"`;
    ctx.defs.push(`<clipPath id="${id}">${blob}/></clipPath>`);
    // (the line is drawn in the blob's own, scaled, measure: thinner on a small charge)
    return paint(`clip-path="url(#${id})"`) + `${blob} fill="none" stroke="${LINE}" stroke-width="3"/>`;
  }
  // Facing sinister = flipped left to right; upside down = flipped top to
  // bottom; both about the charge's own centre. Only the picture is flipped,
  // never the paint behind it (which matters for counterchanged charges).
  const flip = group.mirror || flipY || turn
    ? ` transform="${turning}translate(${cx} ${cy}) scale(${group.mirror ? -1 : 1} ${flipY ? -1 : 1}) translate(${-cx} ${-cy})"`
    : '';
  const image = `<image href="${picture.href}" x="${x}" y="${y}" width="${w}" height="${h}" preserveAspectRatio="none"${flip}`;
  return paintedImage(group, paint, image, n, ctx);
}

// The picture painted in the group's tincture, with its lines on top.
// `image` is the <image ...> element, left open so that more can be added.
function paintedImage(group, paint, image, n, ctx) {
  const maskId = `${ctx.id}-m${n}`, linesId = `${ctx.id}-l${n}`;
  const made = TINCTURES[group.tincture];           // (a fur or treatment on a sable background is dark too)
  const dark = DARK_CHARGES.has(group.tincture) || (!!made && !!made.pair && made.tone !== 'neutral' && made.pair[0] === 'sable');
  const [r, g, b] = (ctx.mode !== 'lines' && dark ? LINE_ON_DARK : LINE_ON_LIGHT).map(v => (v / 255).toFixed(3));
  ctx.defs.push(
    `<mask id="${maskId}">${image}/></mask>` +
    // keeps the picture's dark lines only: colour = line colour, opacity = opacity - brightness
    `<filter id="${linesId}" color-interpolation-filters="sRGB"><feColorMatrix type="matrix" ` +
    `values="0 0 0 0 ${r}  0 0 0 0 ${g}  0 0 0 0 ${b}  -1 0 0 1 0"/></filter>`);
  return paint(`mask="url(#${maskId})"`) + `${image} filter="url(#${linesId})"/>`;
}

// A charge TURNED to lie another way ("a sword bendwise"). `picture` is the
// turned picture from art.js: the layout fitted its turned shape, `size`
// wide, about (cx, cy); what is drawn is the picture itself (`base`), first
// mirrored or turned over as wanted, then turned about its own centre.
function drawTurned(group, paint, picture, { cx, cy, size }, turning, ctx) {
  const base = picture.base, n = ctx.clips++;
  const w = size * picture.k, h = w / base.aspect;
  const px = cx + picture.ox * size, py = cy + picture.oy * size;     // the picture's own centre
  const round = v => Math.round(v * 1000) / 1000;
  const flip = picture.mirror || picture.flipY ? ` translate(${round(px)} ${round(py)}) scale(${picture.mirror ? -1 : 1} ${picture.flipY ? -1 : 1}) translate(${round(-px)} ${round(-py)})` : '';
  const image = `<image href="${base.href}" x="${round(px - w / 2)}" y="${round(py - h / 2)}" width="${round(w)}" height="${round(h)}" preserveAspectRatio="none"` +
    ` transform="${turning}rotate(${picture.turn} ${round(px)} ${round(py)})${flip}"`;
  return paintedImage(group, paint, image, n, ctx);
}

// One group as the layout (layout.js) has placed it, then whatever lies on it.
function drawGroup(group, entry, field, ctx, frame) {
  if (!entry.ok) return '';                         // no arrangement for it yet
  // A counterchanged chief shows the field as it would be without the chief.
  const own = group.kind === 'ordinary' && group.ordinary === 'chief' ? null : frame;
  let out;
  if (group.kind === 'ordinary') out = drawOrdinary(group, entry.shapes, field, ctx, own);
  else {
    const paint = painter(group, field, ctx, own);
    out = entry.places.map(place => drawCharge(group, paint, entry.picture, entry.flipY, place, ctx)).join('');
  }
  const on = entry.tertiary;
  if (group.charged && on && on.ok) {
    const paint = painter(group.charged, field, ctx, frame);
    out += on.places.map(place => drawCharge(group.charged, paint, on.picture, on.flipY, place, ctx)).join('');
  }
  // An ordinary inside an orle stops short of it (see shieldSVG).
  if (ctx.inside && entry.role === 'primary' && group.kind === 'ordinary') out = `<g mask="url(#${ctx.inside})">${out}</g>`;
  return out;
}

// What is drawn over what: the primary group, the groups around it, then the
// ordinaries along the edge (a bordure lies over the ends of a fess, and a
// chief over the top of a bordure).
const PERIPHERAL_ORDER = ['base', 'flaunches', 'gore', 'bordure', 'orle', 'chief', 'canton'];
const layer = (group, entry) =>
  (entry.role === 'primary' ? 0 : entry.role === 'secondary' ? 1 : 2 + PERIPHERAL_ORDER.indexOf(group.ordinary));

// ---- The whole shield --------------------------------------------------------

// The whole shield as an SVG string. `title` is read out by screen readers.
// `charges` is a list of charge groups (see shield.js). Pictures must have
// been loaded first (loadLibrary or loadPicture in art.js); a charge whose
// picture is not loaded is drawn as a blob. `field` may be null (not chosen).
// `mode`: 'colour' (the usual picture), or 'export' / 'lines' for saving as a
// picture (see newContext above, and export.js, which is what to call).
export function shieldSVG(field, { title = '', charges = [], mode = 'colour', unknown = 'none' } = {}) {
  // With a chief, the field is drawn in the space below it; inside a
  // bordure, in the space inside that (geometry.js: FRAMES).
  const { frame, entries, variant = null, within = 0, edge = null } = layoutShield(field, charges);
  const ctx = newContext(mode, variant, unknown);
  // Inside an orle an ordinary stops just short of it (the field runs on
  // under the orle to the edge, but nothing else does): it is drawn through
  // a mask of the space inside the orle.
  if (within) {
    ctx.inside = `${ctx.id}-in`;
    ctx.defs.push(`<mask id="${ctx.inside}"><path d="${framePath(edge)}" fill="#fff"/>` +
      `<path d="${framePath(edge)}" fill="none" stroke="#000" stroke-width="${2 * within + 2}"/></mask>`);
  }
  const order = charges.map((g, i) => i).sort((a, b) => layer(charges[a], entries[a]) - layer(charges[b], entries[b]) || a - b);
  const body = drawField(field, ctx, [], 'whole', frame) + order.map(i => drawGroup(charges[i], entries[i], field, ctx, frame)).join('');
  const safeTitle = title.replace(/&/g, '&amp;').replace(/</g, '&lt;');
  return `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" role="img">` +
    (title ? `<title>${safeTitle}</title>` : '') +
    `<defs><clipPath id="${ctx.id}-shield"><path d="${SHIELD_PATH}"/></clipPath>${ctx.defs.join('')}</defs>` +
    `<g clip-path="url(#${ctx.id}-shield)">${body}</g>` +
    `<path d="${SHIELD_PATH}" fill="none" stroke="${mode === 'lines' ? '#000' : OUTLINE}" stroke-width="2"/></svg>`;
}

// A small square of one tincture, for colour pickers.
// A fur or field treatment is shown by ONE of whatever it is made of, large
// (one ermine spot, one vair bell, one scale), not the pattern in miniature,
// which is too small to make out (the maintainer, November 2026).
export function swatchSVG(tincture) {
  const t = TINCTURES[tincture];
  const frame = `<rect x="1" y="1" width="38" height="38" rx="5" fill="none" stroke="${OUTLINE}" stroke-width="1.5"/>`;
  const open = `<svg viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">`;
  if (t.fur) {
    return open + `<rect x="1" y="1" width="38" height="38" rx="5" fill="${TINCTURES[t.fur.field].hex}"/>` +
      `<g transform="translate(20 6) scale(3.1)">${ermineSpot(0, 0, TINCTURES[t.fur.spots].hex)}</g>${frame}</svg>`;
  }
  if (t.pattern) {
    const tile = TILES[t.pattern], [ground, over] = t.pair.map(p => TINCTURES[p].hex), id = `sw${nextId++}`;
    const grow = 38 / tile.w;
    const paint = tile.thin ? `fill="none" stroke="${over}" stroke-width="1.3"` : `fill="${over}"`;
    return open + `<defs><clipPath id="${id}"><rect x="1" y="1" width="38" height="38" rx="5"/></clipPath></defs>` +
      `<g clip-path="url(#${id})"><rect width="40" height="40" fill="${ground}"/>` +
      `<g transform="translate(1 1) scale(${+grow.toFixed(3)})" ${paint}>${tile.shapes()}</g></g>${frame}</svg>`;
  }
  return open + `<rect x="1" y="1" width="38" height="38" rx="5" fill="${t.hex}"/>${frame}</svg>`;
}

// A swatch for "counterchanged": a square split in two, each half holding a
// dot of the other half's colour.
export function counterchangedSwatchSVG() {
  return `<svg viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">` +
    `<rect x="1" y="1" width="19" height="38" fill="#555"/><rect x="20" y="1" width="19" height="38" fill="#f5f5f0"/>` +
    `<path d="M20 11 A9 9 0 0 0 20 29 Z" fill="#f5f5f0"/><path d="M20 11 A9 9 0 0 1 20 29 Z" fill="#555"/>` +
    `<rect x="1" y="1" width="38" height="38" rx="5" fill="none" stroke="${OUTLINE}" stroke-width="1.5"/></svg>`;
}
