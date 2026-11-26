// arrange.js: the ways a few charges can go together on one shield.
//
// People choose WHAT is on a shield ("a chevron and some lions") before they
// choose how it is arranged, and may not know the words for the choices. This
// file lists the possibilities, so a page can show each one as a picture and
// the generator can pick one at random.
//
// An ARRANGEMENT says, for each charge group in a list, where it goes:
//   { as: 'primary' }           in the middle of the shield
//   { as: 'around' }            around the primary group   ("between three lions")
//   { as: 'chief' }             above it                   ("in chief a lion")
//   { as: 'base' }              below it                   ("in base a lion")
//   { as: 'on', on: 2 }         lying on group number 2 of the list (counting from 0)
//   { as: 'edge' }              a chief, bordure, orle or base: always where it is
//
// This file only knows which arrangements make sense at all. Whether one is
// ALLOWED is for rules.js, so that a page can show a forbidden arrangement
// greyed out with the reason instead of hiding it.

import { isPeripheral, isCentralOrdinary, roles } from './shield.js';

const ON_FIELD = new Set(['primary', 'around', 'chief', 'base']);
// The commonest first: that is the order pages show them in.
const RANK = { primary: 0, edge: 0, around: 1, on: 2, chief: 3, base: 4 };

// Every arrangement of these groups that makes sense, the commonest first.
// What makes sense (SENA Appendix I):
//   * a chief, bordure, orle or base stays where it is;
//   * a central ordinary is the primary group ("If the armory has at least
//     one central ordinary, they are the primary charge group"), and the
//     tools cannot yet draw two different ones together;
//   * if anything is in the middle of the field, exactly one group is primary;
//   * a charge lies on a group that is itself on the field, and only one
//     group of charges lies on any one group ("A single charge group may
//     only have one tertiary charge group on it").
export function arrangements(groups) {
  const edge = groups.map(isPeripheral), central = groups.map(isCentralOrdinary);
  if (central.filter(Boolean).length > 1) return [];
  const choices = groups.map((g, i) => {
    if (edge[i]) return [{ as: 'edge' }];
    if (central[i]) return [{ as: 'primary' }];
    return [{ as: 'primary' }, { as: 'around' }, { as: 'chief' }, { as: 'base' },
            ...groups.map((h, j) => j).filter(j => j !== i).map(j => ({ as: 'on', on: j }))];
  });
  const all = choices.reduce((sets, list) => sets.flatMap(set => list.map(x => [...set, x])), [[]]);
  const sensible = all.filter(a => {
    const onField = a.filter(x => ON_FIELD.has(x.as));
    if (onField.length && onField.filter(x => x.as === 'primary').length !== 1) return false;
    const hosts = a.filter(x => x.as === 'on').map(x => x.on);
    return hosts.every(j => a[j].as === 'primary' || a[j].as === 'edge') && new Set(hosts).size === hosts.length;
  });
  const rank = a => a.reduce((sum, x) => sum + RANK[x.as], 0);
  return sensible.map((a, i) => ({ a, i })).sort((x, y) => rank(x.a) - rank(y.a) || x.i - y.i).map(x => x.a);
}

// The same list of groups, put together as an arrangement says: the groups
// that go on the field (see shield.js), with the others lying on them.
export function arrange(groups, arrangement) {
  const placed = groups.map((g, i) => {
    const as = arrangement[i].as;
    return { ...g, charged: null, role: as === 'primary' ? 'primary' : ON_FIELD.has(as) ? 'secondary' : null,
             place: as === 'around' || as === 'chief' || as === 'base' ? as : null };
  });
  arrangement.forEach((x, i) => { if (x.as === 'on') placed[x.on].charged = placed[i]; });
  return placed.filter((g, i) => arrangement[i].as !== 'on');
}

// The other way: a shield's groups as one flat list and the arrangement that
// makes them. `drawn` is the arrangement the shield is drawn in;
// `arrangement` is the same, or null if it has not been chosen and is only a
// guess (shield.js: roles).
export function unarrange(shieldGroups) {
  const r = roles(shieldGroups);
  const groups = [], drawn = [];
  shieldGroups.forEach((g, i) => {
    const at = groups.length;
    groups.push({ ...g, charged: null });
    drawn.push({ as: r[i].role === 'peripheral' ? 'edge' : r[i].role === 'primary' ? 'primary' : r[i].place });
    if (g.charged) {
      groups.push({ ...g.charged, charged: null });
      drawn.push({ as: 'on', on: at });
    }
  });
  return { groups, drawn, arrangement: r.every(x => x.chosen) ? drawn : null };
}

export const sameArrangement = (a, b) =>
  !!a && !!b && a.length === b.length && a.every((x, i) => x.as === b[i].as && (x.on ?? null) === (b[i].on ?? null));
