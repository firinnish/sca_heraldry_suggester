// scatter.js: where to put small repeated things (ermine spots now, semy of
// charges later) so that each one sits wholly inside one piece of the field.
//
// A fur drawn as a repeating wallpaper gets its spots cut in half by the lines
// of the field ("barry vert and ermine": spots half hidden under the green).
// Instead, spots are placed one by one:
//   1. Every candidate point in the region gets a "clearance": how far it is
//      from the nearest edge (a line of the field or the shield's outline).
//      Points too close to an edge for a whole spot are dropped.
//   2. Points with plenty of room are preferred, and among those, points on
//      an even staggered grid, so open areas get the usual regular pattern
//      while a narrow stripe gets a row of spots down its middle.
//   3. Spots are accepted one at a time, never closer than `spacing` to a
//      spot already placed.
//
// `regions` is a list of polygon lists (from geometry.js): the point must be
// inside one polygon of each (a part of a division, a part of that part...).

import { W, H, insideShield, pointInPolygon, distanceToEdge } from './geometry.js';

function distanceToPolygon(x, y, p) {
  let best = Infinity;
  for (let i = 0, j = p.length - 1; i < p.length; j = i++) {
    const [ax, ay] = p[j], [bx, by] = p[i];
    const dx = bx - ax, dy = by - ay;
    const t = Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / (dx * dx + dy * dy)));
    best = Math.min(best, Math.hypot(x - ax - t * dx, y - ay - t * dy));
  }
  return best;
}

// Only the polygons that reach the shield matter; each gets its bounding box
// so most can be skipped without the slower point-in-polygon test.
function prepare(polygons) {
  return polygons.map(p => {
    const xs = p.map(q => q[0]), ys = p.map(q => q[1]);
    return { p, x0: Math.min(...xs), x1: Math.max(...xs), y0: Math.min(...ys), y1: Math.max(...ys) };
  }).filter(b => b.x1 > 0 && b.x0 < W && b.y1 > 0 && b.y0 < H);
}

// How far (x, y) is from the edge of its region, or -1 if it is outside.
function clearance(x, y, prepared) {
  if (!insideShield(x, y)) return -1;
  let best = distanceToEdge(x, y);
  for (const boxes of prepared) {
    const home = boxes.find(b => x >= b.x0 && x <= b.x1 && y >= b.y0 && y <= b.y1 && pointInPolygon(x, y, b.p));
    if (!home) return -1;
    best = Math.min(best, distanceToPolygon(x, y, home.p));
  }
  return best;
}

const cache = new Map();

// Centres for the spots in a region. `key` names the region (the same key
// must always mean the same region), so the work is done once per region.
//   room:    how far a spot's centre must be from any edge
//   spacing: [across, down]: no two spots closer than this ellipse
//   grid:    [across, down]: the staggered grid preferred in open areas
export function scatter(key, regions, { room = 4.8, spacing = [12.7, 15.5], grid = [18, 11], step = 2 } = {}) {
  const cacheKey = `${key}|${room}|${spacing}|${grid}|${step}`;
  if (cache.has(cacheKey)) return cache.get(cacheKey);

  const enough = room * 1.5;                 // more room than this is "plenty"
  const [gx, gy] = grid;
  // Distance to the nearest point of the staggered grid (rows gy apart, every
  // other row shifted by half), lined up on the fess point.
  const offGrid = (x, y) => {
    const row = Math.round((y - 50) / gy);
    const shift = (row & 1) ? gx / 2 : 0;
    const dx = x - 50 - shift, nearX = Math.round(dx / gx) * gx;
    return Math.hypot(dx - nearX, y - 50 - row * gy);
  };

  const prepared = regions.map(prepare);
  const candidates = [];
  for (let y = step; y < H; y += step) {
    for (let x = step; x < W; x += step) {
      const c = clearance(x, y, prepared);
      if (c >= room) candidates.push({ x, y, score: Math.min(c, enough), off: offGrid(x, y) });
    }
  }
  candidates.sort((a, b) => b.score - a.score || a.off - b.off);

  const [sx, sy] = spacing;
  const placed = [];
  for (const c of candidates) {
    if (placed.every(([px, py]) => ((c.x - px) / sx) ** 2 + ((c.y - py) / sy) ** 2 >= 1)) placed.push([c.x, c.y]);
  }

  // EVERY PIECE GETS ONE (the maintainer, November 2026). Where the region is
  // made of many small pieces (the lozenges of lozengy, the squares of
  // checky), a piece cut by the shield's edge may have had no room for a
  // whole spot. A spot half cut off by the edge is much better than a piece
  // with none, so each such piece gets one at its own middle.
  const pieces = prepared.length ? prepared[prepared.length - 1] : [];
  const outer = prepared.slice(0, -1);
  if (pieces.length > 4) {
    for (const b of pieces) {
      if (placed.some(([px, py]) => px >= b.x0 && px <= b.x1 && py >= b.y0 && py <= b.y1 && pointInPolygon(px, py, b.p))) continue;
      const cx = b.p.reduce((s, q) => s + q[0], 0) / b.p.length, cy = b.p.reduce((s, q) => s + q[1], 0) / b.p.length;
      // only pieces that show: some corner (or the middle) inside the shield, and inside the parts this one is a part of
      const shows = [[cx, cy], ...b.p].some(([x, y]) => insideShield(x, y) &&
        outer.every(boxes => boxes.some(o => pointInPolygon(x, y, o.p))));
      if (shows) placed.push([cx, cy]);
    }
  }
  cache.set(cacheKey, placed);
  return placed;
}
