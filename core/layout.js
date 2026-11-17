// layout.js: where the charges of a group go, and how big they are.
//
// The maintainer's rules:
//   1. CENTRE FIRST. Each charge sits at the centre of the space it has.
//   2. THEN BIG. It is grown until its real outline (not its bounding box)
//      would touch the edge of that space, then shrunk to FILL (95%), so it
//      fills the space but never touches the edge.
//   3. Charges in one group are all the same size.
//
// A "space" is a box that is also limited to the inside of the shield: the
// whole shield for one charge, or a share of it for two or three.
// Still to come: spaces left over by other charges (inside a bordure, around
// an ordinary) and arrangements other than the defaults (in pale, in fess...).
//
// The same placements are used by draw.js (to draw) and rules.js (to see what
// part of the field each charge lies on), so the two can never disagree.

import { getPicture } from './art.js';
import { SAMPLES, insideShield, pointInPolygon, samplesInBox, ordinarySamples } from './geometry.js';

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

// Everything about how a (non-ordinary) charge group is placed:
//   picture:  its picture (or the blob)
//   flipY:    whether the picture must be turned over
//   places:   for each charge { cx, cy, size }  (size = its width)
//   coverage: for each charge, which sample points of the shield it covers
export function placeGroup(group) {
  const picture = (group.art && getPicture(group.art)) || BLOB_PICTURE;
  // Turn the picture over if it was drawn the other way up from what is wanted.
  const flipY = !!picture.href && !!group.inverted !== !!group.artInverted;
  const number = group.number || 1;
  const key = [picture.href || 'blob', group.mirror, flipY, number].join('|');
  if (!placeCache.has(key)) {
    const spaces = SPACES[number];
    if (!spaces) throw new Error(`No layout yet for ${number} charges`);
    const outline = picture.outline.map(([u, v]) => [group.mirror ? -u : u, flipY ? -v : v]);
    const step = Math.max(1, Math.floor(outline.length / 70));
    const thinned = outline.filter((_, i) => i % step === 0);
    const centres = spaces.map(centreOf);
    const size = FILL * Math.min(...spaces.map((space, i) => largestSize(thinned, space, centres[i][0], centres[i][1])));
    const places = centres.map(([cx, cy]) => ({ cx, cy, size }));
    const coverage = places.map(({ cx, cy }) => {
      const polygon = outline.map(([u, v]) => [cx + u * size, cy + v * size]);
      const covered = [];
      SAMPLES.forEach(([x, y], i) => { if (pointInPolygon(x, y, polygon)) covered.push(i); });
      return covered;
    });
    placeCache.set(key, { picture, flipY, places, coverage });
  }
  return placeCache.get(key);
}

// For any group, ordinary or not: the sample points each of its charges covers.
export function groupCoverage(group) {
  if (group.kind === 'ordinary') return [ordinarySamples(group.ordinary)];
  return placeGroup(group).coverage;
}
