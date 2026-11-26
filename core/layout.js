// layout.js: where the charges of a group go, and how big they are.
//
// The maintainer's rules:
//   1. CENTRE FIRST. Each charge sits at the centre of the space it has.
//   2. THEN BIG. It is grown until its real outline (not its bounding box)
//      would touch the edge of that space, then shrunk to FILL (95%), so it
//      fills the space but never touches the edge.
//   3. Charges in one group are all the same size.
//
// A "space" is the part of the shield a charge has to itself.
//   * ONE GROUP ALONE (the first half of this file): the whole shield for one
//     charge, or a share of it for two or three. Each share is a box, also
//     limited to the inside of the shield.
//   * SEVERAL GROUPS, or charges lying on other charges (the second half,
//     layoutShield): the spaces are whatever the other things on the shield
//     leave. Inside a bordure; below a chief; beside a chevron; on a bend.
//     These are worked out as masks (space.js).
// Still to come: arrangements other than the defaults (in pale, in fess...).
//
// The same placements are used by draw.js (to draw) and rules.js (to see what
// part of the field each charge lies on), so the two can never disagree.

import { getPicture } from './art.js';
import { SAMPLES, insideShield, pointInPolygon, samplesInBox, ordinarySamples, ordinaryShapes, suitsDivision, partMap,
         frameCentre, CHIEF_BOTTOM, BASE_TOP, BORDURE_WIDTH, ORLE_GAP, ORLE_WIDTH, ARM_HALF } from './geometry.js';
import { TINCTURES, familyOf, baseTincture } from './catalog.js';
import { roles } from './shield.js';
import { maskFromPolygons, maskFromPicture, where, and, minus, shieldMask, insetMask, centroid, heights, cuts,
         probeOf, turned, largestFit, bestSpot } from './space.js';

export const FILL = 0.95;

// Default arrangements (confirmed by the maintainer as the heraldic defaults):
// one in the middle, two side by side, three "two and one".
// (Boxes on the standard escutcheon; the fess line is at 50.)
const SPACES = {
  1: [[1, 1, 99, 118.5]],
  2: [[1, 1, 50, 118.5], [50, 1, 99, 118.5]],
  3: [[1, 1, 50, 50], [50, 1, 99, 50], [1, 50, 99, 118.5]],
};
export const MAX_NUMBER = 3;
const WIDE = 1.25;                 // wider than tall by this much counts as wide
const TWO_WIDE = [[1, 1, 99, 50], [1, 50, 99, 118.5]];

// A charge with no picture is drawn as a blob: a slightly squashed circle.
export const BLOB_PICTURE = {
  href: null,
  aspect: 1,
  outline: Array.from({ length: 24 }, (_, i) => [0.5 * Math.cos(i * Math.PI / 12), 0.5 * Math.sin(i * Math.PI / 12)]),
};

// The centre of a space: the middle of the part of the shield inside the box.
const centreCache = new Map();
function centreOf(space) {
  const key = space.join();
  if (!centreCache.has(key)) {
    const inside = samplesInBox(space);
    const sum = inside.reduce((s, i) => [s[0] + SAMPLES[i][0], s[1] + SAMPLES[i][1]], [0, 0]);
    centreCache.set(key, [sum[0] / inside.length, sum[1] / inside.length]);
  }
  return centreCache.get(key);
}

// The largest size at which an outline, centred at (cx, cy), fits in a space.
function largestSize(points, [x0, y0, x1, y1], cx, cy) {
  const fits = size => points.every(([u, v]) => {
    const x = cx + u * size, y = cy + v * size;
    return x >= x0 && x <= x1 && y >= y0 && y <= y1 && insideShield(x, y);
  });
  let lo = 0, hi = Math.max(x1 - x0, y1 - y0) * 4;
  for (let step = 0; step < 14; step++) {
    const mid = (lo + hi) / 2;
    if (fits(mid)) lo = mid; else hi = mid;
  }
  return lo;
}

const placeCache = new Map();

// Which sample points an outline covers when drawn at (cx, cy) at `size`.
function covers(outline, cx, cy, size) {
  const polygon = outline.map(([u, v]) => [cx + u * size, cy + v * size]);
  const xs = polygon.map(p => p[0]), ys = polygon.map(p => p[1]);
  const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
  const covered = [];
  SAMPLES.forEach(([x, y], i) => {
    if (x >= x0 && x <= x1 && y >= y0 && y <= y1 && pointInPolygon(x, y, polygon)) covered.push(i);
  });
  return covered;
}

// Everything about how a (non-ordinary) charge group is placed:
//   picture:  its picture (or the blob)
//   flipY:    whether the picture must be turned over
//   places:   for each charge { cx, cy, size }  (size = its width)
//   coverage: for each charge, which sample points of the shield it covers
// `field` (optional) lets charges on a field of many pieces be nudged onto
// the tincture they contrast with; see nudge() below.
export function placeGroup(group, field = null) {
  const picture = (group.art && getPicture(group.art)) || BLOB_PICTURE;
  // Turn the picture over if it was drawn the other way up from what is wanted.
  const flipY = !!picture.href && !!group.inverted !== !!group.artInverted;
  const number = group.number || 1;
  const key = [picture.href || 'blob', group.mirror, flipY, number].join('|');
  if (!placeCache.has(key)) {
    // Two charges wider than they are tall (a lion passant, a sword fesswise)
    // are by default one above the other ("in pale"), not side by side.
    const spaces = number === 2 && picture.aspect >= WIDE ? TWO_WIDE : SPACES[number];
    if (!spaces) throw new Error(`No layout yet for ${number} charges`);
    const outline = picture.outline.map(([u, v]) => [group.mirror ? -u : u, flipY ? -v : v]);
    const step = Math.max(1, Math.floor(outline.length / 70));
    const thinned = outline.filter((_, i) => i % step === 0);
    const centres = spaces.map(centreOf);
    const size = FILL * Math.min(...spaces.map((space, i) => largestSize(thinned, space, centres[i][0], centres[i][1])));
    const places = centres.map(([cx, cy]) => ({ cx, cy, size }));
    const coverage = places.map(({ cx, cy }) => covers(outline, cx, cy, size));
    placeCache.set(key, { picture, flipY, places, coverage, outline, thinned, spaces });
  }
  const base = placeCache.get(key);
  return nudge(base, group, field, key);
}

// ---- Nudging charges onto the tincture they contrast with --------------------
// On a field of many pieces (barry, chevronelly, checky...) SENA counts the
// field as neutral, so a gules lion is allowed on chevronelly azure and Or.
// It still looks better with as much of the lion on the Or as possible. So
// the group is slid a little (up/down, or sideways for paly), shrinking only
// if it must, to put the most of it on the contrasting tincture. The same
// nudge is used by the drawing and the rules, so they always agree.
const NUDGE_RANGE = 12;            // furthest a charge is moved
const NUDGE_SIZES = [1, 0.95, 0.9];
const SIDEWAYS = new Set(['paly']);
const BOTH_WAYS = new Set(['checky', 'lozengy', 'gyronny']);
const nudgeCache = new Map();

// The sample point at (x, y), if there is one.
let sampleIndex = null;
function sampleAt(x, y) {
  if (!sampleIndex) {
    sampleIndex = new Map();
    SAMPLES.forEach(([sx, sy], i) => sampleIndex.set(`${sx},${sy}`, i));
  }
  return sampleIndex.get(`${x},${y}`);
}

function nudge(base, group, field, key) {
  const t = group.tincture;
  if (!field || field.type !== 'divided' || familyOf(field.division) !== 'many' || !t || !TINCTURES[t] ||
      field.parts.some(p => p.type !== 'plain' || p.tincture === null)) return base;
  // The part the charge contrasts with; give up if that is not just one part.
  const contrasting = field.parts.map(p =>
    TINCTURES[p.tincture].tone !== TINCTURES[t].tone && baseTincture(p.tincture) !== baseTincture(t));
  if (contrasting.filter(Boolean).length !== 1) return base;
  const target = contrasting.indexOf(true);
  const cacheKey = `${key}|${field.division}|${target}`;
  if (nudgeCache.has(cacheKey)) return nudgeCache.get(cacheKey);

  const map = partMap(field.division);
  const share = coverage => {
    const all = coverage.flat();
    return all.length ? all.filter(i => map[i] === target).length / all.length : 0;
  };
  const fits = (places, scale) => places.every(({ cx, cy }, i) => {
    const [x0, y0, x1, y1] = base.spaces[i];
    return base.thinned.every(([u, v]) => {
      const x = cx + u * base.places[i].size * scale, y = cy + v * base.places[i].size * scale;
      return x >= x0 && x <= x1 && y >= y0 && y <= y1 && insideShield(x, y);
    });
  });

  // Moves are in steps of 2, the spacing of the sample grid, so a charge's
  // coverage after a move is just its coverage before, shifted along the grid:
  // worked out once per size, not once per move.
  const moves = [];
  for (let d = -NUDGE_RANGE; d <= NUDGE_RANGE; d += 2) {
    if (!SIDEWAYS.has(field.division)) moves.push([0, d]);
    if (SIDEWAYS.has(field.division) || BOTH_WAYS.has(field.division)) moves.push([d, 0]);
  }
  const shift = (coverage, dx, dy) => coverage.map(points => points.map(i => {
    const [x, y] = SAMPLES[i];
    return sampleAt(x + dx, y + dy);
  }).filter(i => i !== undefined));
  let best = { result: base, score: share(base.coverage) };
  const needed = best.score + 0.05;          // only move for a real gain
  for (const scale of NUDGE_SIZES) {
    const sized = scale === 1 ? base.coverage
      : base.places.map(p => covers(base.thinned, p.cx, p.cy, p.size * scale));
    for (const [dx, dy] of moves) {
      const places = base.places.map(p => ({ cx: p.cx + dx, cy: p.cy + dy, size: p.size * scale }));
      if (!fits(places, scale)) continue;
      const coverage = shift(sized, dx, dy);
      const got = share(coverage);
      const score = got - (1 - scale) - Math.hypot(dx, dy) * 0.002;
      if (score > best.score && got >= needed) best = { result: { ...base, places, coverage }, score };
    }
    if (best.result !== base) break;         // no need to shrink if moving was enough
  }
  nudgeCache.set(cacheKey, best.result);
  return best.result;
}

// For any group, ordinary or not: the sample points each of its charges covers.
// (For a group alone on the shield; layoutShield below handles the rest.)
export function groupCoverage(group, field = null) {
  if (group.kind === 'ordinary') return [ordinarySamples(group.ordinary, field && field.type === 'divided' ? field.division : null)];
  return placeGroup(group, field).coverage;
}

// =============================================================================
// SEVERAL CHARGE GROUPS: who gets which space
// =============================================================================
//
// The order things are settled in:
//   1. A chief, base, bordure or orle takes its strip of the shield. What is
//      left is the FRAME: everything else is arranged inside it.
//   2. The primary group. An ordinary has its fixed shape. Charges are
//      placed as they would be alone, but inside the frame; they give up a
//      band at the top or bottom to a secondary group placed "in chief" or
//      "in base", and shrink to let one sit around them.
//   3. Secondary groups take the spaces the primary group leaves.
//   4. Tertiary charges are placed on the charge they lie on.
//
// WHICH SPACES? The default arrangements come from Table 7 ("Default
// Arrangements") of the College of Arms' Glossary of Terms,
// https://heraldry.sca.org/coagloss.html (read November 2026). For example:
// two charges around a fess are "in pale" (one above, one below), three are
// "two and one", two around a bend are "in bend sinister", four around a
// cross or saltire are "one in each section". Where the table says "None,
// must be specified" there is no default, and nothing is placed (rules.js
// then says the tools cannot draw it yet).

// The parts of the shield a group around something can be told to use, as
// tests on a position measured from the middle of the frame.
const ZONES = {
  U: (dx, dy) => dy < 0,
  D: (dx, dy) => dy > 0,
  L: (dx, dy) => dx < 0,
  R: (dx, dy) => dx > 0,
  UL: (dx, dy) => dx < 0 && dy < 0,
  UR: (dx, dy) => dx > 0 && dy < 0,
  DL: (dx, dy) => dx < 0 && dy > 0,
  DR: (dx, dy) => dx > 0 && dy > 0,
  NE: (dx, dy) => dy < dx,                 // the sinister chief side of a bend
  SW: (dx, dy) => dy > dx,
  NW: (dx, dy) => dy < -dx,                // the dexter chief side of a bend sinister
  SE: (dx, dy) => dy > -dx,
  N: (dx, dy) => dy < -Math.abs(dx),       // the four sections of a saltire
  S: (dx, dy) => dy > Math.abs(dx),
  W: (dx, dy) => dx < -Math.abs(dy),
  E: (dx, dy) => dx > Math.abs(dy),
  PL: (dx, dy) => dx < 0 && dy >= -Math.abs(dx),   // beside the stem of a pall
  PR: (dx, dy) => dx > 0 && dy >= -Math.abs(dx),
};
// A single charge in one of these zones is kept on the shield's centre line.
const ON_AXIS = new Set(['U', 'D', 'N', 'S']);

// Glossary Table 7, "Secondary": where 2, 3 or 4 charges go around each
// central ordinary. (No entry = no default arrangement.)
const AROUND = {
  fess:            { 2: ['U', 'D'], 3: ['UL', 'UR', 'D'], 4: ['UL', 'UR', 'DL', 'DR'] },
  pale:            { 2: ['L', 'R'], 4: ['UL', 'UR', 'DL', 'DR'] },
  bend:            { 2: ['NE', 'SW'] },
  bendSinister:    { 2: ['NW', 'SE'] },
  chevron:         { 2: ['U', 'D'], 3: ['UL', 'UR', 'D'] },
  chevronInverted: { 2: ['U', 'D'], 3: ['U', 'DL', 'DR'] },
  cross:           { 4: ['UL', 'UR', 'DL', 'DR'] },
  saltire:         { 4: ['N', 'W', 'E', 'S'] },
  pall:            { 2: ['PL', 'PR'], 3: ['N', 'PL', 'PR'] },
  pile:            { 2: ['L', 'R'] },
};
// "Around any other charge(s)": three are two and one; two have no default.
const AROUND_CHARGE = { 3: ['UL', 'UR', 'D'] };

// Glossary Table 7, "Tertiary": how many charges the tools can lay along
// each ordinary (see cellsOn below for where they go).
const ON_ORDINARY = {
  fess: [1, 2, 3, 4], chief: [1, 2, 3, 4], base: [1, 2, 3], pale: [1, 2, 3, 4],
  bend: [1, 2, 3, 4], bendSinister: [1, 2, 3, 4], chevron: [1, 2, 3], chevronInverted: [1, 2, 3],
  cross: [1, 4, 5], saltire: [1, 4, 5], pall: [1, 3], pile: [1],
};

// How many charges can go around this primary group in a default arrangement.
export function aroundNumbers(primary) {
  const table = primary.kind === 'ordinary' ? AROUND[primary.ordinary]
    : (primary.number === 1 || primary.number === null ? AROUND_CHARGE : null);
  return table ? Object.keys(table).map(Number) : [];
}
// How many charges the tools can place on this group (on each charge of it).
export function onNumbers(host) {
  return host.kind === 'ordinary' ? (ON_ORDINARY[host.ordinary] || []) : [1];
}
// How many charges the tools place side by side above or below a primary group.
export const PLACE_NUMBERS = { chief: [1, 2, 3], base: [1] };

// How much of the frame's height a primary charge gives up to a group in
// chief or in base (the same shares a chief and a base take of the shield).
const CHIEF_BAND = (CHIEF_BOTTOM - 1) / 117.5, BASE_BAND = (118.5 - BASE_TOP) / 117.5;
// A primary charge with a group around it is drawn at this share of the size
// it would have alone; the charges around it may be at most this share of
// its size, so that the two groups cannot be mistaken for one (SENA A3D1).
const AROUND_SHRINK = 0.72, SECONDARY_SHARE = 0.6;
// A charge lying on another charge is at most this share of its size.
const ON_CHARGE_SHARE = 0.55;

// A group's picture, the way round it is to be drawn.
function pictureOf(group) {
  const picture = (group.art && getPicture(group.art)) || BLOB_PICTURE;
  const flipY = !!picture.href && !!group.inverted !== !!group.artInverted;
  const outline = picture.outline.map(([u, v]) => [group.mirror ? -u : u, flipY ? -v : v]);
  return { picture, flipY, outline, key: [picture.href || 'blob', !!group.mirror, flipY].join('|') };
}
const probeCache = new Map();
function probeFor(shape, turn = 0) {
  const key = `${shape.key}|${turn}`;
  if (!probeCache.has(key)) probeCache.set(key, probeOf(shape.outline, turn));
  return probeCache.get(key);
}

// The greatest of a placed charge's width and height.
export const extentOf = (picture, size) => size * Math.max(1, 1 / picture.aspect);

// ---- 1. The frame -------------------------------------------------------------------
const frameCache = new Map();
function frameOf(groups) {
  const has = id => groups.some(g => g.kind === 'ordinary' && g.ordinary === id);
  const chief = has('chief'), base = has('base');
  const inset = has('orle') ? ORLE_GAP + ORLE_WIDTH : has('bordure') ? BORDURE_WIDTH : 0;
  const key = [chief, base, inset].join('|');
  if (!frameCache.has(key)) {
    let mask = inset ? insetMask(inset) : shieldMask();
    if (chief || base) mask = where(mask, (x, y) => (!chief || y > CHIEF_BOTTOM) && (!base || y < BASE_TOP));
    frameCache.set(key, mask);
  }
  return { chief, base, inset, mask: frameCache.get(key) };
}

function ordinaryParts(group, division, frame) {
  return {
    shapes: ordinaryShapes(group.ordinary, division, frame),
    coverage: [ordinarySamples(group.ordinary, division, frame)],
  };
}

// ---- 2. Primary charges, inside a space ------------------------------------------------
// As for a group alone: one in the middle, two side by side (one above the
// other if they are wide), three "two and one"; each at the centre of its
// share, all as large as the tightest share allows.
function placeIn(group, region, splitAt = null) {
  const shape = pictureOf(group);
  const number = group.number || 1;
  const [cx, cy] = splitAt || centroid(region);
  let shares;
  if (number === 1) shares = [region];
  else if (number === 2 && shape.picture.aspect >= WIDE) shares = [where(region, (x, y) => y < cy), where(region, (x, y) => y >= cy)];
  else if (number === 2) shares = [where(region, x => x < cx), where(region, x => x >= cx)];
  else if (number === 3) shares = [where(region, (x, y) => x < cx && y < cy), where(region, (x, y) => x >= cx && y < cy), where(region, (x, y) => y >= cy)];
  else return null;                                     // no default arrangement for more
  const probe = probeFor(shape);
  const centres = shares.map(centroid);
  const size = FILL * Math.min(...shares.map((share, k) => largestFit(probe, share, centres[k][0], centres[k][1])));
  return { shape, places: centres.map(([x, y]) => ({ cx: x, cy: y, size, turn: 0 })) };
}

// What a placed group covers: a mask (for the groups that must keep clear of
// it) and its entry in the layout.
const placedOutline = (shape, p) => turned(shape.outline, p.turn).map(([u, v]) => [p.cx + u * p.size, p.cy + v * p.size]);
const hullMask = (shape, places) => maskFromPolygons(places.map(p => placedOutline(shape, p)));
function chargeParts(shape, places) {
  return {
    picture: shape.picture, flipY: shape.flipY, places,
    coverage: places.map(p => covers(turned(shape.outline, p.turn), p.cx, p.cy, p.size)),
  };
}

// ---- 3. Secondary charges ------------------------------------------------------------
// The spaces for `number` charges placed `place` ('around' | 'chief' |
// 'base') the primary group: a list of { mask, axis, row } or null.
//   open:    the frame, less the primary group
//   centre:  what the zones are measured from
//   band:    for a primary CHARGE, the test for the band it gave up
function secondarySlots(primary, place, number, { open, centre, upright, band }) {
  const [cx, cy] = centre;
  if (place === 'around') {
    const table = primary.kind === 'ordinary' ? AROUND[primary.ordinary] : (primary.number === 1 || primary.number === null ? AROUND_CHARGE : null);
    const zones = table && table[number];
    if (!zones) return null;
    return zones.map(z => ({ mask: where(open, (x, y) => ZONES[z](x - cx, y - cy)), axis: upright && ON_AXIS.has(z) }));
  }
  if (!(number >= 1 && number <= 3)) return null;
  // In chief or in base: side by side, sharing that space out equally.
  const space = where(open, band || ((x, y) => (place === 'chief' ? y < cy : y > cy)));
  if (number === 1) return [{ mask: space, axis: upright }];
  const at = cuts(space, x => x, number);
  return Array.from({ length: number }, (_, k) => ({
    mask: where(space, x => (k === 0 || x >= at[k - 1]) && (k === number - 1 || x < at[k])), row: true,
  }));
}

function placeSecondary(group, slots, axisX, largest, upright) {
  const shape = pictureOf(group), probe = probeFor(shape);
  const spots = slots.map(s => bestSpot(probe, s.mask, { axisX: s.axis ? axisX : null }));
  if (spots.some(s => !s)) return null;
  if (slots[0].row) {
    // Charges side by side must come out evenly spread about the centre
    // line. If the primary charge is in the way (a row of three above a
    // pale) they do not, and there is no arrangement to offer.
    const last = spots.length - 1;
    if (upright && spots.some((s, k) => Math.abs(s.cx + spots[last - k].cx - 2 * axisX) > 8)) return null;
    // They sit on one level.
    const level = spots.reduce((sum, s) => sum + s.cy, 0) / spots.length;
    spots.forEach((s, k) => { s.cy = level; s.size = largestFit(probe, slots[k].mask, s.cx, level); });
  }
  let size = FILL * Math.min(...spots.map(s => s.size));
  if (largest) size = Math.min(size, largest / Math.max(1, 1 / shape.picture.aspect));
  return { shape, places: spots.map(s => ({ cx: s.cx, cy: s.cy, size, turn: 0 })) };
}

// ---- 4. Tertiary charges ---------------------------------------------------------------
// The cells of an ordinary that `number` charges lying on it are placed in:
// a list of { mask, turn, at, best }.
//   turn: degrees clockwise. Glossary Table 7: charges on a bend are "in
//         bend, oriented to follow the bend"; on a chevron "oriented to
//         follow the chevron"; on a pall "oriented to follow the pall".
//         (The table adds "central charge fesswise" for a chevron; the one at
//         the point is drawn upright here: a question for the maintainer.)
//   at:   where to put the charge (default: the middle of the cell)
//   best: look for the roomiest place on the centre line instead
function cellsOn(ordinary, number, host, [cx, cy], ky) {
  if (!(ON_ORDINARY[ordinary] || []).includes(number)) return null;
  const along = (measure, turns) => {
    const at = cuts(host, measure, number);
    return Array.from({ length: number }, (_, k) => ({
      mask: number === 1 ? host : where(host, (x, y) => { const m = measure(x, y); return (k === 0 || m >= at[k - 1]) && (k === number - 1 || m < at[k]); }),
      turn: Array.isArray(turns) ? turns[k] : turns,
    }));
  };
  const zone = test => where(host, (x, y) => test(x - cx, (y - cy) / ky));
  switch (ordinary) {
    case 'fess': case 'chief': case 'base': return along(x => x, 0);
    case 'pale': return along((x, y) => y, 0);
    case 'bend': return along((x, y) => x + y, -45);
    case 'bendSinister': return along((x, y) => y - x, 45);
    case 'pile': return [{ mask: host, turn: 0, best: true }];
    case 'chevron': case 'chevronInverted': {
      const arm = ordinary === 'chevron' ? 45 : -45;       // the dexter arm; the sinister one mirrors it
      if (number === 1) return [{ mask: host, turn: 0, best: true }];
      const cells = along(x => x, number === 2 ? [arm, -arm] : [arm, 0, -arm]);
      if (number === 3) cells[1].best = true;
      return cells;
    }
    case 'cross': {
      const middle = (dx, dy) => Math.abs(dx) < ARM_HALF && Math.abs(dy) < ARM_HALF;
      if (number === 1) return [{ mask: host, turn: 0, at: [cx, cy] }];
      const arms = ['N', 'W', 'E', 'S'].map(z => ({ mask: zone((dx, dy) => ZONES[z](dx, dy) && (number === 4 || !middle(dx, dy))), turn: 0 }));
      return number === 4 ? arms : [...arms, { mask: zone(middle), turn: 0, at: [cx, cy] }];
    }
    case 'saltire': {
      const middle = (dx, dy) => Math.abs(dx) + Math.abs(dy) < 22;
      if (number === 1) return [{ mask: host, turn: 0, at: [cx, cy] }];
      const arms = ['UL', 'UR', 'DL', 'DR'].map(z => ({ mask: zone((dx, dy) => ZONES[z](dx, dy) && (number === 4 || !middle(dx, dy))), turn: 0 }));
      return number === 4 ? arms : [...arms, { mask: zone(middle), turn: 0, at: [cx, cy] }];
    }
    case 'pall': {
      if (number === 1) return [{ mask: host, turn: 0, at: [cx, cy] }];
      // each cell of the pall belongs to the arm it points along most nearly
      const arm = (dx, dy) => { const a = (-dx - dy) * Math.SQRT1_2, b = (dx - dy) * Math.SQRT1_2; return a >= b && a >= dy ? 0 : b >= dy ? 1 : 2; };
      return [-45, 45, 0].map((turn, k) => ({ mask: zone((dx, dy) => arm(dx, dy) === k), turn }));
    }
    default: return null;
  }
}

function placeTertiary(host, hostEntry, group, frame, centre, ky) {
  const none = { ok: false, picture: BLOB_PICTURE, flipY: false, places: [], coverage: [] };
  const shape = pictureOf(group);
  const number = group.number || 1;
  let places;
  if (host.kind === 'ordinary') {
    if (!hostEntry.shapes) return none;                 // on a bordure or orle: not yet
    // The part of the ordinary that shows: a chief lies over a bordure, a
    // bordure over everything else.
    const seen = host.ordinary === 'chief' ? shieldMask() : host.ordinary === 'base' ? (frame.inset ? insetMask(frame.inset) : shieldMask()) : frame.mask;
    const cells = cellsOn(host.ordinary, number, and(maskFromPolygons(hostEntry.shapes), seen), centre, ky);
    if (!cells) return none;
    places = cells.map(cell => {
      const probe = probeFor(shape, cell.turn);
      if (cell.best) { const spot = bestSpot(probe, cell.mask, { axisX: centre[0] }); return spot && { ...spot, turn: cell.turn }; }
      const [x, y] = cell.at || centroid(cell.mask);
      return { cx: x, cy: y, size: largestFit(probe, cell.mask, x, y), turn: cell.turn };
    });
  } else {
    // On each charge of the group: the roomiest place on its picture.
    if (number !== 1 || !hostEntry.ok) return none;
    const hostShape = pictureOf(host), probe = probeFor(shape);
    places = hostEntry.places.map(p => {
      const mask = hostShape.picture.solid
        ? maskFromPicture(hostShape.picture.solid, hostShape.picture.aspect, p, !!host.mirror, hostShape.flipY)
        : hullMask(hostShape, [p]);
      const spot = bestSpot(probe, mask, { pull: 0.05 });
      return spot && { ...spot, turn: 0 };
    });
  }
  if (places.some(p => !p)) return none;
  let size = FILL * Math.min(...places.map(p => p.size));
  // A charge on another charge stays clearly the smaller of the two.
  if (host.kind !== 'ordinary') {
    size = Math.min(size, ON_CHARGE_SHARE * extentOf(hostEntry.picture, hostEntry.places[0].size) / Math.max(1, 1 / shape.picture.aspect));
  }
  places.forEach(p => { p.size = size; });
  return { ok: true, ...chargeParts(shape, places) };
}

// ---- Putting a shield together ---------------------------------------------------------
// The same placing comes up again and again (the lions around a chevron are
// where they are whatever lies on the chevron), so each is remembered.
const placings = new Map();
function remembered(key, make) {
  if (!placings.has(key)) {
    if (placings.size > 6000) placings.clear();
    placings.set(key, make());
  }
  return placings.get(key);
}

function compose(groups, r, division) {
  const frame = frameOf(groups);
  const frameName = frame.chief ? 'chief' : null;
  const centre = frameCentre(frameName);
  // How much the space below a chief is squeezed, top to bottom (geometry.js).
  const ky = frame.chief ? (centre[1] - CHIEF_BOTTOM) / 49 : 1;
  const entries = groups.map((g, i) => ({ ...r[i], kind: g.kind, ok: true, tertiary: null }));
  r.forEach((x, i) => { if (x.role === 'peripheral') Object.assign(entries[i], ordinaryParts(groups[i], division, frameName)); });

  const pi = r.findIndex(x => x.role === 'primary');
  const primary = pi >= 0 ? groups[pi] : null;
  const secondary = r.map((x, i) => i).filter(i => r[i].role === 'secondary');
  const wanted = secondary.map(i => r[i].place);
  const context = { open: frame.mask, centre, upright: true, band: null };
  const bands = {};
  let largest = null;                                   // the most a secondary charge may measure
  // Everything a placing beside or on a group depends on, as text: the frame,
  // and the group as it is drawn here.
  const frameKey = [frame.chief, frame.base, frame.inset].join();
  const drawnAs = g => [frameKey, signature({ ...g, charged: null }), g.kind === 'ordinary' && suitsDivision(g.ordinary, division),
    g === primary && g.kind !== 'ordinary' ? [...wanted].sort().join() : ''].join('|');

  if (primary && primary.kind === 'ordinary') {
    Object.assign(entries[pi], ordinaryParts(primary, division, frameName));
    context.open = minus(frame.mask, maskFromPolygons(entries[pi].shapes));
    context.upright = primary.ordinary !== 'bend' && primary.ordinary !== 'bendSinister';
  } else if (primary) {
    const [top, bottom] = heights(frame.mask);
    const chiefLine = top + CHIEF_BAND * (bottom - top), baseLine = bottom - BASE_BAND * (bottom - top);
    bands.chief = (x, y) => y < chiefLine;
    bands.base = (x, y) => y > baseLine;
    let region = frame.mask;
    if (wanted.includes('chief')) region = where(region, (x, y) => y >= chiefLine);
    if (wanted.includes('base')) region = where(region, (x, y) => y <= baseLine);
    const whole = region === frame.mask && !frame.chief && !frame.base;
    const placed = placeIn(primary, region, whole ? centre : null);
    if (!placed) entries[pi].ok = false;
    else {
      if (wanted.includes('around')) placed.places.forEach(p => { p.size *= AROUND_SHRINK; });
      Object.assign(entries[pi], chargeParts(placed.shape, placed.places));
      context.open = minus(frame.mask, hullMask(placed.shape, placed.places));
      if (placed.places.length === 1) context.centre = [placed.places[0].cx, placed.places[0].cy];
      largest = SECONDARY_SHARE * extentOf(placed.shape.picture, placed.places[0].size);
    }
  }

  for (const i of secondary) {
    const g = groups[i];
    const number = g.number || (r[i].place === 'around' ? [3, 2, 4].find(n => aroundNumbers(primary).includes(n)) : 1);
    const parts = g.kind === 'ordinary' || r[i].clash || !entries[pi].ok ? null
      : remembered(['beside', drawnAs(primary), r[i].place, number, pictureOf(g).key].join('|'), () => {
        const slots = secondarySlots(primary, r[i].place, number, { ...context, band: primary.kind === 'ordinary' ? null : bands[r[i].place] });
        const placed = slots && placeSecondary(g, slots, centre[0], largest, context.upright);
        return placed && chargeParts(placed.shape, placed.places);
      });
    Object.assign(entries[i], parts || { ok: false, picture: BLOB_PICTURE, flipY: false, places: [], coverage: [] });
  }

  groups.forEach((g, i) => {
    if (!g.charged) return;
    const place = () => placeTertiary(g, entries[i], g.charged, frame, centre, ky);
    // (A secondary group's own place depends on the primary group, so a
    // placing on one is not remembered.)
    entries[i].tertiary = r[i].role === 'secondary' ? place()
      : remembered(['on', drawnAs(g), g.charged.number || 1, pictureOf(g.charged).key].join('|'), place);
  });
  return { frame: frameName, entries };
}

// How one charge group shows in the layout, for a signature of the shield.
const signature = g => [g.kind, g.ordinary || (g.art && getPicture(g.art) ? g.art : 'blob'), g.number, !!g.mirror, !!g.inverted,
  !!g.artInverted, g.role || null, g.place || null, g.charged ? signature(g.charged) : null];
const layoutCache = new Map();

// Where everything on a shield goes. Returns { frame, entries } with one
// entry per group in `groups`, in the same order:
//   role, place, chosen, clash   as worked out by roles() in shield.js
//   ok        false = there is no arrangement for it yet (it is not drawn)
//   for an ordinary:  shapes (null for a bordure or orle), coverage
//   for charges:      picture, flipY, places [{ cx, cy, size, turn }], coverage
//   tertiary  null, or the same again for the charges lying on this group
// `frame` is 'chief' when the field is drawn in the space below a chief.
// Coverage is, for each charge, the sample points of the shield it covers.
export function layoutShield(field, groups) {
  const division = field && field.type === 'divided' ? field.division : null;
  const r = roles(groups);
  // One group and nothing on it: placed as it always has been.
  if (groups.length === 1 && !groups[0].charged) {
    const g = groups[0], frame = g.kind === 'ordinary' && g.ordinary === 'chief' ? 'chief' : null;
    if (g.kind === 'ordinary') {
      return { frame, entries: [{ ...r[0], kind: g.kind, ok: true, tertiary: null,
                                  shapes: ordinaryShapes(g.ordinary, division), coverage: [ordinarySamples(g.ordinary, division)] }] };
    }
    if ((g.number || 1) > MAX_NUMBER) {                 // no default arrangement for so many
      return { frame, entries: [{ ...r[0], kind: g.kind, ok: false, tertiary: null, picture: BLOB_PICTURE, flipY: false, places: [], coverage: [] }] };
    }
    const placed = placeGroup(g, field);
    return { frame, entries: [{ ...r[0], kind: g.kind, ok: true, tertiary: null, picture: placed.picture, flipY: placed.flipY,
                                places: placed.places, coverage: placed.coverage }] };
  }
  // (The field only matters where an ordinary is drawn to suit its division.)
  const suited = groups.some(g => g.kind === 'ordinary' && suitsDivision(g.ordinary, division));
  const key = JSON.stringify([suited, groups.map(signature)]);
  if (!layoutCache.has(key)) {
    if (layoutCache.size > 3000) layoutCache.clear();
    layoutCache.set(key, compose(groups, r, division));
  }
  return layoutCache.get(key);
}
