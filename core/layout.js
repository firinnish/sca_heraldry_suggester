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

import { getPicture, turnedPicture } from './art.js';
import { SAMPLES, insideShield, pointInPolygon, samplesInBox, ordinarySamples, ordinaryShapes, suitsDivision, partMap,
         frameCentre, frameName, frameScale, CHIEF_BOTTOM, BASE_TOP, BORDURE_WIDTH, ORLE_GAP, ORLE_WIDTH, ARM_HALF,
         DIVISION_VARIANTS, divisionShapes, isLayered } from './geometry.js';
import { TINCTURES, ARRANGEMENTS, SEMY, familyOf, baseTincture, turnFor } from './catalog.js';
import { roles } from './shield.js';
import { maskFromPolygons, maskFromPicture, where, and, minus, shieldMask, insetMask, inMask, centroid, heights, sides, sidesAt, cuts,
         probeOf, turned, largestFit, fitsAt, bestSpot, clearDistance } from './space.js';

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
  // (Its picture, turned over or turned to lie another way as wanted.)
  const { picture, flipY, outline, key: pictureKey } = pictureOf(group);
  const number = group.number || 1;
  const key = [pictureKey, number].join('|');
  if (!placeCache.has(key)) {
    // Two charges wider than they are tall (a lion passant, a sword fesswise)
    // are by default one above the other ("in pale"), not side by side.
    const spaces = number === 2 && picture.aspect >= WIDE ? TWO_WIDE : SPACES[number];
    if (!spaces) throw new Error(`No layout yet for ${number} charges`);
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
// the group is slid a little up or down, shrinking only if it must, to put
// the most of it on the contrasting tincture. The same nudge is used by the
// drawing and the rules, so they always agree.
// NEVER SIDEWAYS (the maintainer, November 2026): charges off the centre
// line look wrong, so a group keeps its place left to right whatever the
// field. (A better answer, for later, is to choose the field's pattern to
// suit the charges instead of moving the charges: see ROADMAP.md.)
const NUDGE_RANGE = 12;            // furthest a charge is moved
const NUDGE_SIZES = [1, 0.95, 0.9];
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
  for (let d = -NUDGE_RANGE; d <= NUDGE_RANGE; d += 2) moves.push([0, d]);
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
  // Below a chevron inverted: the space straight below its point, and the
  // spaces to either side of that. (TIP is how far the point is taken to be
  // below the middle of the frame.)
  TS: (dx, dy) => dy - TIP > Math.abs(dx),
  TSL: (dx, dy) => dx < 0 && dy > 0 && dy - TIP <= -dx,
  TSR: (dx, dy) => dx > 0 && dy > 0 && dy - TIP <= dx,
};
const TIP = 24;
// A single charge in one of these zones is kept on the shield's centre line.
const ON_AXIS = new Set(['U', 'D', 'N', 'S', 'TS']);

// Where 2, 3 or 4 charges go around each central ordinary. From the
// Glossary's Table 7 ("Secondary"), which gives, among others: around a fess
// two "in pale" and three "two and one"; around a bend two "in bend
// sinister" and four "two on either side of the bend"; around a cross or
// saltire four "one in each section". The rest are the maintainer's
// (November 2026), for numbers the table leaves open: two around a cross go
// in bend (first and fourth quarters); four around a chevron inverted go one
// above and three below. (Four around a chevron the right way up are not
// drawn: there is no room for one above its point.)
// (No entry = no arrangement to draw.)
const AROUND = {
  fess:            { 2: ['U', 'D'], 3: ['UL', 'UR', 'D'], 4: ['UL', 'UR', 'DL', 'DR'] },
  pale:            { 2: ['L', 'R'], 4: ['UL', 'UR', 'DL', 'DR'] },
  bend:            { 2: ['NE', 'SW'], 4: ['N', 'E', 'W', 'S'] },
  bendSinister:    { 2: ['NW', 'SE'], 4: ['N', 'W', 'E', 'S'] },
  chevron:         { 2: ['U', 'D'], 3: ['UL', 'UR', 'D'] },
  chevronInverted: { 2: ['U', 'D'], 3: ['U', 'DL', 'DR'], 4: ['U', 'TSL', 'TSR', 'TS'] },
  cross:           { 2: ['UL', 'DR'], 4: ['UL', 'UR', 'DL', 'DR'] },
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
  canton: [1], gore: [1], flaunches: [2],      // (one on each flaunch)
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
// An ordinary with charges around it is drawn narrower, to leave them room
// (the maintainer, November 2026): at this share of its full width, or the
// second if it also has charges lying on it, which need room of their own.
const SLIM = 0.6, SLIM_CHARGED = 0.8;

// A group's picture, the way round it is to be drawn.
function pictureOf(group) {
  const picture = (group.art && getPicture(group.art)) || BLOB_PICTURE;
  const flipY = !!picture.href && !!group.inverted !== !!group.artInverted;
  // Turned to lie another way ("a sword bendwise"): the turned picture knows
  // its own shape, mirrored and turned over as needed (art.js).
  const angle = picture.href && group.turned ? turnFor(group.turned, picture.aspect, group.artPosture || '') : 0;
  if (angle) {
    const turned = turnedPicture(picture, angle, !!group.mirror, flipY);
    return { picture: turned, flipY, outline: turned.outline, flipped: true, key: [picture.href, !!group.mirror, flipY, angle].join('|') };
  }
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
  // A canton, flaunches or a gore simply take up part of the space: the
  // field runs on under them, and whatever else is on it keeps clear.
  const taken = TAKES_SPACE.filter(has).join();
  const key = [chief, base, inset, taken].join('|');
  if (!frameCache.has(key)) {
    let mask = inset ? insetMask(inset) : shieldMask();
    // (A bordure or orle runs along under a chief, so the space inside it
    // starts that much lower.)
    if (chief || base) mask = where(mask, (x, y) => (!chief || y > CHIEF_BOTTOM + inset) && (!base || y < BASE_TOP));
    for (const id of taken ? taken.split(',') : []) mask = minus(mask, maskFromPolygons(ordinaryShapes(id, null, frameName(chief))));
    frameCache.set(key, mask);
  }
  // `lopsided`: the space left is not centred on the shield (beside a gore),
  // so what goes in it is centred on the space itself.
  return { chief, base, inset, taken, lopsided: taken.includes('gore'), bordure: has('bordure'), orle: has('orle'), mask: frameCache.get(key) };
}
const TAKES_SPACE = ['canton', 'flaunches', 'gore'];

function ordinaryParts(group, division, frame, width = 1) {
  // (with its complex line, if it has one: "a fess wavy". What goes beside
  // it or on it is then fitted to the shape as drawn.)
  const line = lineOf(group);
  return {
    shapes: ordinaryShapes(group.ordinary, division, frame, width, line),
    coverage: [ordinarySamples(group.ordinary, division, frame, width, line)],
  };
}
const lineOf = group => (group.line && group.line !== 'plain' ? group.line : null);

// ---- 2. Primary charges, inside a space ------------------------------------------------
// As for a group alone: one in the middle, two side by side (one above the
// other if they are wide), three "two and one"; each at the centre of its
// share, all as large as the tightest share allows.
// `corner`: true = something stands in the dexter chief corner of the space
// (a canton), which a line of charges in bend must start clear of.
function placeIn(group, region, splitAt = null, corner = false) {
  const shape = pictureOf(group);
  if (group.number === SEMY) return placeSemy(shape, region);
  // (How many has not been chosen, but how they are set out has: drawn as
  // three, or as many as that arrangement takes.)
  const number = group.number || (group.arranged && ARRANGEMENTS[group.arranged]
    ? [3, 5, 4, 2].find(n => ARRANGEMENTS[group.arranged].numbers.includes(n)) : 1);
  if (group.arranged || number > MAX_NUMBER) return placeArranged(group, shape, number, region, corner);
  const [cx, cy] = splitAt || centroid(region);
  let shares;
  if (number === 1) shares = [region];
  else if (number === 2 && shape.picture.aspect >= WIDE) shares = [where(region, (x, y) => y < cy), where(region, (x, y) => y >= cy)];
  else if (number === 2) shares = [where(region, x => x < cx), where(region, x => x >= cx)];
  else shares = [where(region, (x, y) => x < cx && y < cy), where(region, (x, y) => x >= cx && y < cy), where(region, (x, y) => y >= cy)];
  const probe = probeFor(shape);
  const centres = shares.map(centroid);
  const size = FILL * Math.min(...shares.map((share, k) => largestFit(probe, share, centres[k][0], centres[k][1])));
  return { shape, places: centres.map(([x, y]) => ({ cx: x, cy: y, size, turn: 0 })) };
}

// ---- 2b. Charges set out in a named arrangement -----------------------------------------
// "In pale three roundels", "in chevron five swords", "four mullets two and
// two" (catalog.js: ARRANGEMENTS), and the usual arrangements of five and
// six charges. Each arrangement is a PATTERN: where the charges stand
// relative to one another, in steps across and steps down. The pattern is
// then stretched, squeezed and slid about inside the space until the charges
// are as large as they can be without touching each other or the edge:
//   across, down: the length of one step each way
//   slide:        how far the whole pattern is moved from the middle
// (so the charges of a line are always evenly spaced, and all one size).
const rowOf = (count, down = 0) => Array.from({ length: count }, (_, j) => [j - (count - 1) / 2, down]);
const rowsOf = (...counts) => counts.flatMap((count, k) => rowOf(count, k - (counts.length - 1) / 2));
const PATTERNS = {
  pale: n => rowOf(n).map(([u]) => [0, u]),
  fess: n => rowOf(n),
  bend: n => rowOf(n).map(([u]) => [u, u]),
  bendSinister: n => rowOf(n).map(([u]) => [-u, u]),
  chevron: n => rowOf(n).map(([u]) => [u, Math.abs(u)]),
  chevronInverted: n => rowOf(n).map(([u]) => [u, -Math.abs(u)]),
  cross: n => [[0, -1], [-1, 0], [1, 0], [0, 1], ...(n === 5 ? [[0, 0]] : [])],
  saltire: n => [[-1, -1], [1, -1], [-1, 1], [1, 1], ...(n === 5 ? [[0, 0]] : [])],
  oneAndTwo: () => rowsOf(1, 2),
};
// The usual arrangements of more than three (Glossary Table 7: five are
// "two, two, and one", six "three, two, and one"). The table gives four
// none; the maintainer's default for four is two and two.
const USUAL = { 4: () => rowsOf(2, 2), 5: () => rowsOf(2, 2, 1), 6: () => rowsOf(3, 2, 1) };
// Patterns whose steps across and down are kept the same length, so that
// their lines run at 45 degrees like every other diagonal on the shield.
const SQUARE = new Set(['bend', 'bendSinister', 'chevron', 'chevronInverted', 'saltire']);
// Patterns that are not the same left to right may also slide sideways.
const SIDEWAYS_TOO = new Set(['bend', 'bendSinister']);
const APART = 1.12;                // charges keep this much of their own size between centres
const SPREAD = 0.45;               // a slanting line reaches across at least this share of the space

function placeArranged(group, shape, number, region, corner = false) {
  const id = group.arranged || null;
  if (id && !(ARRANGEMENTS[id] && ARRANGEMENTS[id].numbers.includes(number))) return null;
  const make = id ? PATTERNS[id] : USUAL[number];
  if (!make) return null;
  // The pattern, measured from its own middle.
  let pattern = make(number);
  const mean = k => pattern.reduce((s, p) => s + p[k], 0) / pattern.length;
  const mu = mean(0), mv = mean(1);
  pattern = pattern.map(([u, v]) => [u - mu, v - mv]);
  const span = k => Math.max(...pattern.map(p => p[k])) - Math.min(...pattern.map(p => p[k]));

  const probe = probeFor(shape);
  const [cx, cy] = centroid(region), [top, bottom] = heights(region);
  const square = SQUARE.has(id);
  // How far apart two of these charges must be in a given direction
  // (worked out for every five degrees, and remembered).
  const clears = remembered(`clear|${shape.key}`, () => []);
  const clear = (dx, dy) => {
    const angle = (Math.round(Math.atan2(dy, dx) * 36 / Math.PI) * 5 + 360) % 180;
    return clears[angle] || (clears[angle] = clearDistance(shape.outline, angle));
  };
  // Every different step from one charge of the pattern to another (many
  // pairs are the same step apart).
  const steps = [...new Map(pattern.flatMap((p, i) => pattern.slice(i + 1).map(q => {
    const du = p[0] - q[0], dv = p[1] - q[1], flip = du < 0 || (du === 0 && dv < 0) ? -1 : 1;
    return [`${(du * flip).toFixed(3)},${(dv * flip).toFixed(3)}`, [du * flip, dv * flip]];
  }))).values()];

  // A slanting line of tall charges (swords in bend) could be made of large
  // charges barely stepped past one another; to read as a line it must
  // stretch across a fair share of the space.
  const [leftEdge, rightEdge] = sides(region);
  // A line in bend beside a canton: the canton stands where the line would
  // start, and two wings in bend came out tiny, squeezed against it. The
  // line is laid along the part of the diagonal that is LEFT, from the edge
  // of the canton to the far edge of the shield, and centred on that (the
  // maintainer, 28 November 2026: "re-center them on a diagonal line that
  // starts at the edge of the canton rather than starting at the edge of
  // the shield"). `share` is how much of the diagonal is left.
  let fromX = 0, fromY = 0, share = 1;
  if (corner && id === 'bend') {
    const run = (way, inside) => { let d = 0; while (d < 150 && inside(cx + way * (d + 1), cy + way * (d + 1))) d++; return d; };
    const up = run(-1, (x, y) => inMask(region, x, y)), down = run(1, (x, y) => inMask(region, x, y));
    const whole = run(-1, insideShield) + down;
    fromX = fromY = (down - up) / 2;
    share = whole > 0 ? (up + down) / whole : 1;
  }
  const reach = square ? SPREAD * share * (rightEdge - leftEdge) / span(0) : 0;
  // Charges in ROWS (one and two, two and two...) must read as rows: the top
  // row keeps out of the bottom third of the space and the bottom row out
  // of the top third (the maintainer, November 2026, after three tall
  // swords "one and two" grew until they looked like three in fess).
  const rows = !square && span(0) > 0 && span(1) > 0;
  const upper = Math.min(...pattern.map(p => p[1])), lower = Math.max(...pattern.map(p => p[1]));
  const above = -Math.min(...shape.outline.map(p => p[1])), below = Math.max(...shape.outline.map(p => p[1]));   // how far a charge reaches up and down, for a size of 1
  const third = (bottom - top) / 3;

  // How large the charges can be for one way of laying the pattern out; or 0
  // as soon as it is clear they cannot be larger than `toBeat`.
  const sizeFor = ([across, down, slideX, slideY], toBeat = 0) => {
    if (across <= 0 || down <= 0 || across < reach) return 0;
    let size = Infinity;
    for (const [du, dv] of steps) {
      const dx = du * across, dy = dv * down;
      size = Math.min(size, Math.hypot(dx, dy) / (clear(dx, dy) * APART));
    }
    if (size <= toBeat) return 0;
    const at = pattern.map(([u, v]) => [cx + slideX + u * across, cy + slideY + v * down]);
    if (rows) {
      pattern.forEach(([, v], k) => {
        if (v === upper) size = Math.min(size, (top + 2 * third - at[k][1]) / below);
        if (v === lower) size = Math.min(size, (at[k][1] - top - third) / above);
      });
      if (size <= toBeat) return 0;
    }
    if (toBeat > 0 && at.some(([x, y]) => !fitsAt(probe, region, x, y, toBeat))) return 0;
    for (const [x, y] of at) {
      // (Only if a charge does not fit at the size the others allow does its own largest size need finding.)
      if (!fitsAt(probe, region, x, y, size)) size = Math.min(size, largestFit(probe, region, x, y));
      if (size <= toBeat) return 0;
    }
    return size;
  };

  // Start with the pattern small and in the middle, then keep making
  // whichever one change helps most, in smaller and smaller steps.
  const start = Math.max(reach + 0.5, Math.min(60 / (span(0) + 2), (bottom - top) / (span(1) + 2.5)));
  // (Growing both steps together is a change of its own: charges in rows
  // are held apart both ways at once, and neither step helps alone.)
  const moves = [[1, 1, 0, 0]];
  if (!square) {
    if (span(0) > 0) moves.push([1, 0, 0, 0]);
    if (span(1) > 0) moves.push([0, 1, 0, 0]);
  }
  moves.push([0, 0, 0, 1]);
  if (SIDEWAYS_TOO.has(id)) moves.push([0, 0, 1, 0]);
  const climb = (from, allowed) => {
    let at = from, atSize = sizeFor(from);
    for (const step of [8, 4, 2, 1, 0.5]) {
      for (let round = 0; round < 16; round++) {
        let better = null, betterSize = atSize;
        for (const move of allowed) for (const way of [1, -1]) {
          const tried = at.map((value, k) => value + move[k] * way * step);
          const size = sizeFor(tried, betterSize + 1e-6);
          if (size > betterSize + 1e-6) { better = tried; betterSize = size; }
        }
        if (!better) break;
        at = better; atSize = betterSize;
      }
    }
    return [at, atSize];
  };
  let [best, bestSize] = climb([Math.max(reach + 0.5, start * share), Math.max(reach + 0.5, start * share), fromX, fromY], moves);
  if (!(bestSize > 0)) return null;

  // That is the layout with the LARGEST charges, which is not always the
  // clearest (the maintainer, November 2026): three thin needles "in fess"
  // came out as tall as the shield and huddled in the middle, "like some
  // sort of stripy pale". So:
  // 1. Charges side by side are set out EVENLY first, and made as large as
  //    that allows: the gap between two of them is the gap from the
  //    outermost to the edge of the shield at their height (three in fess
  //    have four equal gaps, the two of "one and two" three). The row with
  //    the most charges decides, the lowest if there are two such.
  if (!square && span(0) > 0) {
    const across = v => { const us = pattern.filter(p => p[1] === v).map(p => p[0]); return Math.max(...us) - Math.min(...us); };
    const row = [...new Set(pattern.map(p => p[1]))].sort((a, b) => across(b) - across(a) || b - a)[0];
    const upAndDown = [...(span(1) > 0 ? [[0, 1, 0, 0]] : []), [0, 0, 0, 1]];
    let even = best, evenSize = bestSize;
    for (let pass = 0; pass < 4; pass++) {
      const ends = sidesAt(region, cy + even[3] + row * even[1]);
      if (!ends) break;
      const step = (ends[1] - ends[0] + clear(1, 0) * evenSize) / (span(0) + 2);
      const [next, nextSize] = climb([step, even[1], even[2], even[3]], upAndDown);
      if (!(nextSize > 0)) { evenSize = 0; break; }
      const settled = Math.abs(nextSize - evenSize) < 0.005 * evenSize && Math.abs(next[0] - even[0]) < 0.1;
      even = next; evenSize = nextSize;
      if (settled) break;
    }
    // (unless that would more than halve them: then large and close it is)
    if (evenSize >= bestSize * 0.5) { best = even; bestSize = evenSize; }
  }
  // 2. A slanting line is moved sideways to the middle of where it fits, so
  //    that it is as far from one side of the shield as from the other.
  if (SIDEWAYS_TOO.has(id)) {
    const still = v => sizeFor(v) >= bestSize * 0.999;
    const furthest = way => {                      // how far it can go that way and keep its size
      let lo = 0, hi = 40;
      const at = d => best.map((value, k) => (k === 2 ? value + way * d : value));
      if (still(at(hi))) return hi;
      while (hi - lo > 0.25) { const mid = (lo + hi) / 2; if (still(at(mid))) lo = mid; else hi = mid; }
      return lo;
    };
    const centred = best.map((value, k) => (k === 2 ? value + (furthest(1) - furthest(-1)) / 2 : value));
    if (still(centred)) best = centred;
  }
  const size = FILL * bestSize;
  return { shape, places: pattern.map(([u, v]) => ({ cx: cx + best[2] + u * best[0], cy: cy + best[3] + v * best[1], size, turn: 0 })) };
}

// ---- 2c. Semy: charges strewn over a space ----------------------------------------------
// As many small charges as fit, in staggered rows like ermine spots (the
// maintainer, November 2026). Only whole charges are placed: one that would
// be cut by the edge of the space, or by another charge, is left out. Of a
// few ways of lining the rows up with the space, the one that fits most
// charges is used. Returns { shape, places } (places may be empty).
const SEMY_EXTENT = 12;            // how large a strewn charge is, in its greater measure
const SEMY_GAP = [0.6, 0.45];      // the gap between charges across, and between rows, as a share of that
const SEMY_ROOM = 1.15;            // each keeps this much of its own size clear
export const SEMY_FEWEST = 7;      // fewer than this is not semy (the maintainer's rule)

function placeSemy(shape, region, base = SEMY_EXTENT) {
  const probe = probeFor(shape);
  // A long thin charge (a sword) is drawn rather longer than a round one, or
  // it would be lost; and the rows are spaced to suit its own shape.
  const aspect = shape.picture.aspect, slender = Math.max(aspect, 1 / aspect);
  const extent = base * Math.min(1.6, slender ** 0.35);
  const size = extent / Math.max(1, 1 / aspect);
  const gx = size + base * SEMY_GAP[0], gy = size / aspect + base * SEMY_GAP[1];
  const [mx, my] = centroid(region);
  let best = [];
  for (const lift of [0, gy / 3, 2 * gy / 3]) {
    for (const odd of [0, 1]) {
      const places = [];
      for (let row = -10; row <= 10; row++) {
        const y = my + lift + row * gy, shift = ((row & 1) === odd) ? gx / 2 : 0;
        for (let col = -8; col <= 8; col++) {
          const x = mx + shift + col * gx;
          if (fitsAt(probe, region, x, y, size * SEMY_ROOM)) places.push({ cx: x, cy: y, size, turn: 0 });
        }
      }
      if (places.length > best.length) best = places;
    }
  }
  return { shape, places: best };
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
function cellsOn(ordinary, number, host, [cx, cy], [sx, sy], width = 1) {
  if (!(ON_ORDINARY[ordinary] || []).includes(number)) return null;
  const along = (measure, turns) => {
    const at = cuts(host, measure, number);
    return Array.from({ length: number }, (_, k) => ({
      mask: number === 1 ? host : where(host, (x, y) => { const m = measure(x, y); return (k === 0 || m >= at[k - 1]) && (k === number - 1 || m < at[k]); }),
      turn: Array.isArray(turns) ? turns[k] : turns,
    }));
  };
  // (measured as on the whole shield: the frame may have made the ordinary smaller)
  const zone = test => where(host, (x, y) => test((x - cx) / sx, (y - cy) / sy));
  switch (ordinary) {
    case 'fess': case 'chief': case 'base': case 'flaunches': return along(x => x, 0);
    case 'canton': return [{ mask: host, turn: 0 }];
    case 'gore': return [{ mask: host, turn: 0, best: true }];
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
      const middle = (dx, dy) => Math.abs(dx) < ARM_HALF * width && Math.abs(dy) < ARM_HALF * width;
      if (number === 1) return [{ mask: host, turn: 0, at: [cx, cy] }];
      const arms = ['N', 'W', 'E', 'S'].map(z => ({ mask: zone((dx, dy) => ZONES[z](dx, dy) && (number === 4 || !middle(dx, dy))), turn: 0 }));
      return number === 4 ? arms : [...arms, { mask: zone(middle), turn: 0, at: [cx, cy] }];
    }
    case 'saltire': {
      const middle = (dx, dy) => Math.abs(dx) + Math.abs(dy) < 22 * width;
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

function placeTertiary(host, hostEntry, group, frame, centre, scale, width) {
  const none = { ok: false, picture: BLOB_PICTURE, flipY: false, places: [], coverage: [] };
  const shape = pictureOf(group);
  const number = group.number || 1;
  let places;
  if (host.kind === 'ordinary') {
    if (!hostEntry.shapes) return none;                 // on a bordure or orle: not yet
    // The part of the ordinary that shows: a chief lies over a bordure, a
    // bordure over everything else.
    const seen = host.ordinary === 'chief' ? shieldMask()
      : host.ordinary === 'base' || TAKES_SPACE.includes(host.ordinary) ? (frame.inset ? insetMask(frame.inset) : shieldMask()) : frame.mask;
    if (number === SEMY) {                              // strewn over the ordinary, a little smaller than on the field
      const strewn = placeSemy(shape, and(maskFromPolygons(hostEntry.shapes), seen), SEMY_EXTENT * 0.8);
      return strewn.places.length ? { ok: true, ...chargeParts(shape, strewn.places) } : none;
    }
    const cells = cellsOn(host.ordinary, number, and(maskFromPolygons(hostEntry.shapes), seen), centre, scale, width);
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
        ? maskFromPicture(hostShape.picture.solid, hostShape.picture.aspect, p, !hostShape.flipped && !!host.mirror, !hostShape.flipped && hostShape.flipY)
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
  // The frames shapes are drawn in (geometry.js): the field below a chief and
  // inside a bordure; the primary ordinary there too, and also inside an orle
  // (the field itself runs on under an orle); a bordure or orle beside a
  // chief follows the chief's lower edge.
  const fieldFrame = frameName(frame.chief, frame.bordure ? BORDURE_WIDTH : 0);
  const innerFrame = frameName(frame.chief, frame.inset);
  const edgeFrame = frameName(frame.chief);
  const centre = frameCentre(innerFrame);
  const scale = frameScale(innerFrame);      // how much smaller the frame draws things, across and down
  const entries = groups.map((g, i) => ({ ...r[i], kind: g.kind, ok: true, tertiary: null }));
  r.forEach((x, i) => { if (x.role === 'peripheral') Object.assign(entries[i], ordinaryParts(groups[i], division, edgeFrame)); });

  const pi = r.findIndex(x => x.role === 'primary');
  const primary = pi >= 0 ? groups[pi] : null;
  const secondary = r.map((x, i) => i).filter(i => r[i].role === 'secondary');
  const wanted = secondary.map(i => r[i].place);
  const context = { open: frame.mask, centre, upright: true, band: null };
  const bands = {};
  let largest = null;                                   // the most a secondary charge may measure
  // Everything a placing beside or on a group depends on, as text: the frame,
  // and the group as it is drawn here.
  const frameKey = [frame.chief, frame.base, frame.inset, frame.taken].join();
  // An ordinary with charges around it is drawn narrower.
  const width = primary && primary.kind === 'ordinary' && secondary.length ? (primary.charged ? SLIM_CHARGED : SLIM) : 1;
  const drawnAs = g => [frameKey, signature({ ...g, charged: null }), g.kind === 'ordinary' && suitsDivision(g.ordinary, division),
    g === primary ? (g.kind === 'ordinary' ? width : [...wanted].sort().join()) : ''].join('|');
  // Charges strewn over ONE part of a divided field keep to that part ("Per
  // chevron sable and purpure semy of lions Or": shield.js, `part`).
  const strewnOn = g => (g.number === SEMY && Number.isInteger(g.part) && !!division && !isLayered(division));
  const partOf = (g, region) => {
    const shapes = strewnOn(g) ? divisionShapes(division, fieldFrame)[g.part] : null;
    return shapes ? and(region, maskFromPolygons(shapes)) : region;
  };
  const partKey = g => (strewnOn(g) ? `${division}:${g.part}` : '');

  if (primary && primary.kind === 'ordinary') {
    Object.assign(entries[pi], ordinaryParts(primary, division, innerFrame, width));
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
    const whole = region === frame.mask && !frame.chief && !frame.base && !frame.lopsided;
    const found = remembered(['primary', drawnAs(primary), partKey(primary)].join('|'), () => placeIn(primary, partOf(primary, region), whole ? centre : null, frame.taken.includes('canton')));
    // (a copy: the remembered placing must not be changed by what follows)
    const placed = found && found.places.length ? { shape: found.shape, places: found.places.map(p => ({ ...p })) } : null;
    if (!placed) Object.assign(entries[pi], { ok: false, picture: BLOB_PICTURE, flipY: false, places: [], coverage: [] });
    else {
      if (wanted.includes('around')) placed.places.forEach(p => { p.size *= AROUND_SHRINK; });
      Object.assign(entries[pi], chargeParts(placed.shape, placed.places));
      if (secondary.length) context.open = minus(frame.mask, hullMask(placed.shape, placed.places));
      if (placed.places.length === 1) context.centre = [placed.places[0].cx, placed.places[0].cy];
      largest = SECONDARY_SHARE * extentOf(placed.shape.picture, placed.places[0].size);
    }
  }

  // (Strewn charges last: they fill whatever the others leave.)
  const strewn = i => groups[i].number === SEMY;
  for (const i of [...secondary.filter(i => !strewn(i)), ...secondary.filter(strewn)]) {
    const g = groups[i];
    const fine = g.kind !== 'ordinary' && !r[i].clash && entries[pi].ok;
    let parts = null;
    if (fine && strewn(i)) {
      // Semy around the primary group: over all the space left.
      const others = secondary.filter(j => j !== i).map(j => JSON.stringify(signature(groups[j]))).join();
      // (Not around charges that are themselves strewn: two lots of semy cannot be told apart.)
      if (r[i].place === 'around' && primary.number !== SEMY) {
        parts = remembered(['strewn', drawnAs(primary), others, pictureOf(g).key, partKey(g)].join('|'), () => {
          const placed = placeSemy(pictureOf(g), partOf(g, context.open));
          return placed.places.length ? chargeParts(placed.shape, placed.places) : null;
        });
      }
    } else if (fine) {
      const number = g.number || (r[i].place === 'around' ? [3, 2, 4].find(n => aroundNumbers(primary).includes(n)) : 1);
      parts = remembered(['beside', drawnAs(primary), r[i].place, number, pictureOf(g).key].join('|'), () => {
        const slots = secondarySlots(primary, r[i].place, number, { ...context, band: primary.kind === 'ordinary' ? null : bands[r[i].place] });
        const placed = slots && placeSecondary(g, slots, centre[0], largest, context.upright);
        return placed && chargeParts(placed.shape, placed.places);
      });
      // (anything strewn afterwards keeps clear of these)
      if (parts && secondary.some(strewn)) context.open = minus(context.open, hullMask(pictureOf(g), parts.places));
    }
    Object.assign(entries[i], parts || { ok: false, picture: BLOB_PICTURE, flipY: false, places: [], coverage: [] });
  }

  groups.forEach((g, i) => {
    if (!g.charged) return;
    const place = () => placeTertiary(g, entries[i], g.charged, frame, centre, g === primary ? scale : [1, 1], g === primary ? width : 1);
    // (A secondary group's own place depends on the primary group, so a
    // placing on one is not remembered.)
    entries[i].tertiary = r[i].role === 'secondary' ? place()
      : remembered(['on', drawnAs(g), g.charged.number || 1, pictureOf(g.charged).key].join('|'), place);
  });
  // `within`: how far in from the edge a primary ordinary must stop (inside an orle), or 0.
  return { frame: fieldFrame, within: frame.orle ? frame.inset : 0, edge: edgeFrame, entries };
}

// How one charge group shows in the layout, for a signature of the shield.
const signature = g => [g.kind, g.ordinary || (g.art && getPicture(g.art) ? g.art : 'blob'), g.number, !!g.mirror, !!g.inverted,
  !!g.artInverted, g.role || null, g.place || null, g.arranged || null, g.charged ? signature(g.charged) : null, g.turned || null,
  lineOf(g), Number.isInteger(g.part) ? g.part : null];
const layoutCache = new Map();

// Where everything on a shield goes. Returns { frame, entries } with one
// entry per group in `groups`, in the same order:
//   role, place, chosen, clash   as worked out by roles() in shield.js
//   ok        false = there is no arrangement for it yet (it is not drawn)
//   for an ordinary:  shapes (null for a bordure or orle), coverage
//   for charges:      picture, flipY, places [{ cx, cy, size, turn }], coverage
//   tertiary  null, or the same again for the charges lying on this group
// `frame` names the space the field is drawn in (geometry.js: FRAMES): below
// a chief, inside a bordure. `variant` (if any) is the way the field's
// pattern is drawn to suit the charges (see fieldVariant below).
// Coverage is, for each charge, the sample points of the shield it covers.
export function layoutShield(field, groups) {
  const base = clearOfLines(field, groups, placeAll(field, groups));
  const variant = fieldVariant(field, groups, base);
  return variant === null ? base : { ...base, variant };
}

// ---- Charges clear of the field's lines ---------------------------------------------
// A charge lying across a line of the field is well and good, and so is one
// wholly to one side of it. One that only just pokes over the line, with a
// few hundredths of itself on the far side, looks like a mistake (the
// maintainer, November 2026: three lozenges in pale on a per chevron field,
// the top one all but clear of the line). Where that happens the whole group
// is drawn a little smaller, each charge about its own centre, so that they
// stay where they were, all one size, until every one of them is clearly one
// thing or the other. If a little smaller is not enough, they are left alone.
// (Fields of many small pieces are not treated this way: see nudge, above,
// and fieldVariant, below.)
const SLIVER = 0.15;                   // less than this share of a charge beyond a line is a sliver
const CLEAR_SIZES = [0.96, 0.92, 0.88, 0.84, 0.8];
const clearCache = new Map();
function clearOfLines(field, groups, layout) {
  if (!field || field.type !== 'divided' || familyOf(field.division) === 'many') return layout;
  const map = partMap(field.division, layout.frame);
  const slivered = coverage => coverage.some(points => {
    const counts = [];
    for (const i of points) counts[map[i]] = (counts[map[i]] || 0) + 1;
    return counts.some(n => n > 0 && n < SLIVER * points.length);
  });
  const which = groups.map((g, i) => i).filter(i => {
    const g = groups[i], e = layout.entries[i];
    return g.kind === 'charge' && g.number !== SEMY && !g.charged && e.ok && e.places && e.places.length &&
      e.places.every(p => !p.turn) && slivered(e.coverage);
  });
  if (!which.length) return layout;
  const key = `${field.division}|${layout.frame}|${JSON.stringify(groups.map(signature))}`;
  if (!clearCache.has(key)) {
    if (clearCache.size > 3000) clearCache.clear();
    const entries = [...layout.entries];
    for (const i of which) {
      const shape = pictureOf(groups[i]), e = layout.entries[i];
      for (const smaller of CLEAR_SIZES) {
        const places = e.places.map(p => ({ ...p, size: p.size * smaller }));
        const coverage = places.map(p => covers(shape.outline, p.cx, p.cy, p.size));
        if (!slivered(coverage)) { entries[i] = { ...e, places, coverage }; break; }
      }
    }
    clearCache.set(key, { ...layout, entries });
  }
  return clearCache.get(key);
}

// How much of the shield shows the field: not covered by any ordinary or
// charge on it (1 = all of it).
export function fieldShowing(layout) {
  const covered = new Set();
  for (const e of layout.entries) for (const points of e.coverage || []) for (const i of points) covered.add(i);
  return 1 - covered.size / SAMPLES.length;
}
// How much of the lines a field is divided by shows: is not under any
// ordinary or charge on it (1 = all of it; 1 for a plain field). The lines
// are found from the plain shape of the division: a sample point is on a
// line when the point beside it or below it belongs to another part.
let whichSample = null;
const linePoints = new Map();
export function lineShowing(field, layout) {
  if (!field || field.type !== 'divided') return 1;
  const key = `${field.division}|${layout.frame}|${layout.variant || ''}`;
  if (!linePoints.has(key)) {
    if (!whichSample) { whichSample = new Map(); SAMPLES.forEach(([x, y], i) => whichSample.set(`${x},${y}`, i)); }
    const map = partMap(field.division, layout.frame, layout.variant || null);
    const on = new Set();
    SAMPLES.forEach(([x, y], i) => {
      for (const j of [whichSample.get(`${x + 2},${y}`), whichSample.get(`${x},${y + 2}`)]) {
        if (j !== undefined && map[i] !== map[j]) { on.add(i); on.add(j); }
      }
    });
    if (linePoints.size > 200) linePoints.clear();
    linePoints.set(key, on);
  }
  const on = linePoints.get(key);
  if (!on.size) return 1;
  let hidden = 0;
  const covered = new Set();
  for (const e of layout.entries) for (const points of e.coverage || []) for (const i of points) covered.add(i);
  for (const i of on) if (covered.has(i)) hidden++;
  return 1 - hidden / on.size;
}
// Checky or lozengy mostly hidden (under a pale and a bordure, say) is drawn
// with pieces half the size, so that enough of them show to be made out (the
// maintainer, November 2026). Twice as many pieces line up with every
// ordinary just as the usual six do.
const FINER = { checky: 12, lozengy: 12 };
const MOSTLY_HIDDEN = 0.5;

// ---- The field's pattern, chosen to suit the charges ---------------------------------
// Charges are never moved sideways to find a part of a patterned field they
// contrast with (see nudge above). Instead the PATTERN is chosen to suit the
// charges (the maintainer, November 2026): three swords on paly of six each
// stand in the middle of a stripe, but on paly of eight each stands on a
// line between two stripes, as it should. So paly, barry, bendy, bendy
// sinister, chevronelly, checky and lozengy are each drawn the usual way,
// or with more pieces, or fewer (DIVISION_VARIANTS in geometry.js), whichever
// leaves every charge either across a line or on the tincture it contrasts
// with. The usual way wins whenever it does well enough.
// With an ordinary on the field the usual way is kept, because that is the
// one whose pieces the ordinary covers exactly (tests/alignment.html); a
// chief, bordure or orle is no trouble, since the field is fitted to them.
const FITTED_TO = new Set(['chief', 'bordure', 'orle']);
function fieldVariant(field, groups, layout) {
  const options = field && field.type === 'divided' ? DIVISION_VARIANTS[field.division] : null;
  if (!options || field.parts.some(p => p.type !== 'plain' || p.tincture === null)) return null;
  if (FINER[field.division] && groups.length && fieldShowing(layout) < MOSTLY_HIDDEN) return FINER[field.division];
  if (groups.some(g => g.kind === 'ordinary' && !FITTED_TO.has(g.ordinary))) return null;
  const tone = t => TINCTURES[t].tone;
  const charges = groups.map((g, i) => ({ g, e: layout.entries[i] }))
    .filter(x => x.g.kind === 'charge' && x.e.ok && x.g.number !== SEMY && x.g.tincture && TINCTURES[x.g.tincture]);
  if (!charges.length) return null;
  const usual = options[0];
  // How well the worst-placed charge sits: 1 = wholly on the tincture it
  // contrasts with, or evenly across a line; 0 = wholly on the wrong one.
  const worst = pieces => {
    const map = partMap(field.division, layout.frame, pieces === usual ? null : pieces);
    let least = 1;
    for (const { g, e } of charges) {
      const right = field.parts.findIndex(p => tone(p.tincture) !== tone(g.tincture) && baseTincture(p.tincture) !== baseTincture(g.tincture));
      if (right < 0) continue;
      for (const points of e.coverage) {
        if (!points.length) continue;
        const on = points.filter(i => map[i] === right).length / points.length;
        least = Math.min(least, Math.max(on, 2 * Math.min(on, 1 - on)));
      }
    }
    return least;
  };
  // The first that does well enough, in that order of preference; failing
  // that, whichever does best.
  let best = usual, bestScore = -1;
  for (const pieces of options) {
    const score = worst(pieces);
    if (score >= 0.6) return pieces === usual ? null : pieces;
    if (score > bestScore + 0.1) { best = pieces; bestScore = score; }
  }
  return best === usual ? null : best;
}

function placeAll(field, groups) {
  const division = field && field.type === 'divided' ? field.division : null;
  const r = roles(groups);
  // One group and nothing on it, in the usual arrangement for one, two or
  // three charges: placed as it always has been.
  const alone = groups.length === 1 && !groups[0].charged ? groups[0] : null;
  if (alone && (alone.kind === 'ordinary' || (!alone.arranged && (alone.number || 1) <= MAX_NUMBER))) {
    // (the field is drawn in the space below a chief, or inside a bordure)
    const g = alone, frame = g.kind !== 'ordinary' ? null : g.ordinary === 'chief' ? 'chief' : g.ordinary === 'bordure' ? frameName(false, BORDURE_WIDTH) : null;
    if (g.kind === 'ordinary') {
      return { frame, entries: [{ ...r[0], kind: g.kind, ok: true, tertiary: null,
                                  shapes: ordinaryShapes(g.ordinary, division, null, 1, lineOf(g)),
                                  coverage: [ordinarySamples(g.ordinary, division, null, 1, lineOf(g))] }] };
    }
    const placed = placeGroup(g, field);
    return { frame, entries: [{ ...r[0], kind: g.kind, ok: true, tertiary: null, picture: placed.picture, flipY: placed.flipY,
                                places: placed.places, coverage: placed.coverage }] };
  }
  // (The field only matters where an ordinary is drawn to suit its division.)
  const suited = groups.some(g => g.kind === 'ordinary' && suitsDivision(g.ordinary, division));
  // (...and where charges are strewn over one part of it)
  const parted = groups.some(g => g.number === SEMY && Number.isInteger(g.part)) ? division : null;
  const key = JSON.stringify([suited, parted, groups.map(signature)]);
  if (!layoutCache.has(key)) {
    if (layoutCache.size > 3000) layoutCache.clear();
    layoutCache.set(key, compose(groups, r, division));
  }
  return layoutCache.get(key);
}
