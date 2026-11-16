// generate.js: make up shields at random, within whatever has been decided so
// far and within the rules (rules.js).
//
// A set of CONSTRAINTS says what is fixed; everything left open is chosen at
// random:
//
//   palette:        tinctures the shield may use (null = any). A shield need
//                   not use all of them.
//   mustInclude:    a tincture that must appear somewhere (or null).
//   fieldTinctures: exactly the tinctures of the background (or null).
//   fieldOrdered:   true = use fieldTinctures in the order given.
//   division:       null (any) | 'plain' | a division id.
//   field:          a complete background, if one has been fully chosen.
//   charge:         null (any, or none) | 'none' | { kind: 'ordinary', id }
//                   | { kind: 'charge', id, file }   (file null = no picture)
//   number:         null (any) | 1 | 2 | 3
//   chargeTincture: null (any) | a tincture id | COUNTERCHANGED
//   allowBare:      true = a plain background with nothing on it is acceptable
//                   (used when showing background options on their own).
//
// The method is simple on purpose: guess, test against the rules, and try
// again. That way the generator can never disagree with the rules, and a new
// rule needs no change here.
//
// RANDOM BUT REPEATABLE: every random choice comes from a numbered seed, so
// the same seed and constraints always give the same shield. Pages use this
// to keep pictures from changing every time the screen is redrawn.

import { DIVISIONS, ORDINARIES, COLOUR_ORDER, METAL_ORDER, familyOf } from './catalog.js';
import { plain, divided, ordinaryGroup, chargeGroupFromLibrary, shieldTinctures, blazon, COUNTERCHANGED } from './shield.js';
import { checkShield } from './rules.js';

const PLAIN_TINCTURES = [...COLOUR_ORDER, ...METAL_ORDER];
const TRIES = 120;

const idsInFamily = family => Object.keys(DIVISIONS).filter(d => familyOf(d) === family);
const TWO_TINCTURE = Object.keys(DIVISIONS).filter(d => DIVISIONS[d].parts === 2);

// ---- Repeatable random numbers ----------------------------------------------

// A random-number function made from any text (the "seed").
export function randomFrom(seedText) {
  let h = 1779033703 ^ seedText.length;
  for (let i = 0; i < seedText.length; i++) {
    h = Math.imul(h ^ seedText.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  let a = h >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const pick = (rng, list) => list[Math.floor(rng() * list.length)];

// Pick by weight: weighted(rng, [['plain', 3], ['two', 4]])
function weighted(rng, options) {
  const total = options.reduce((s, o) => s + o[1], 0);
  let r = rng() * total;
  for (const [value, weight] of options) { if ((r -= weight) < 0) return value; }
  return options[options.length - 1][0];
}

export function shuffled(rng, list) {
  const out = [...list];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

// ---- Guessing a background ---------------------------------------------------

const paletteOf = c => (c.palette && c.palette.length ? c.palette : PLAIN_TINCTURES);

// A background where one part is itself divided, using exactly `tinctures`
// (three or four of them). Top level: a two-part division or per pall.
function nestedField(rng, tinctures) {
  const t = shuffled(rng, tinctures);
  const sub = (a, b) => divided(pick(rng, TWO_TINCTURE), [plain(a), plain(b)]);
  if (t.length === 3) {
    const parts = [plain(t[0]), sub(t[1], t[2])];
    return divided(pick(rng, idsInFamily('two')), rng() < 0.5 ? parts : parts.reverse());
  }
  if (t.length === 4) {
    if (rng() < 0.5) return divided(pick(rng, idsInFamily('two')), [sub(t[0], t[1]), sub(t[2], t[3])]);
    return divided(pick(rng, idsInFamily('three')), shuffled(rng, [plain(t[0]), plain(t[1]), sub(t[2], t[3])]));
  }
  return null;
}

function guessField(c, rng) {
  if (c.field) return c.field;
  const fixed = c.fieldTinctures && c.fieldTinctures.length ? c.fieldTinctures : null;
  let division = c.division;

  if (!division) {
    if (fixed) {
      if (fixed.length === 1) division = 'plain';
      else if (fixed.length === 2) division = pick(rng, idsInFamily(weighted(rng, [['two', 5], ['four', 2], ['many', 3]])));
      else if (fixed.length === 3 && rng() < 0.5) division = pick(rng, idsInFamily('three'));
      else return nestedField(rng, fixed);
    } else {
      const family = weighted(rng, [['plain', 6], ['two', 7], ['four', 2], ['many', 4], ['three', 1]]);
      division = family === 'plain' ? 'plain' : pick(rng, idsInFamily(family));
    }
  }

  const parts = division === 'plain' ? 1 : DIVISIONS[division].parts;
  let tinctures;
  if (fixed && fixed.length < parts && c.division) {
    // Some of the background's tinctures are chosen, and the division: keep
    // those, in order, and fill the rest from the palette.
    const others = shuffled(rng, paletteOf(c).filter(t => !fixed.includes(t)));
    if (fixed.length + others.length < parts) return null;
    tinctures = [...fixed, ...others].slice(0, parts);
  } else if (fixed) {
    if (fixed.length !== parts) return null;
    tinctures = c.fieldOrdered ? fixed : shuffled(rng, fixed);
  } else {
    const palette = paletteOf(c);
    if (palette.length < parts) return null;
    tinctures = shuffled(rng, palette).slice(0, parts);
    // Lean towards including the tincture that must appear.
    if (c.mustInclude && !tinctures.includes(c.mustInclude) && rng() < 0.6) {
      tinctures[Math.floor(rng() * parts)] = c.mustInclude;
    }
  }
  return division === 'plain' ? plain(tinctures[0]) : divided(division, tinctures.map(plain));
}

// ---- Guessing what is on it --------------------------------------------------

function guessGroups(c, field, rng, library) {
  let choice = c.charge;
  if (choice === 'none') return [];
  if (!choice) {
    const pictures = library.pictures;
    const wantsSeveral = c.number && c.number > 1;
    const kind = weighted(rng, [
      ['none', wantsSeveral || c.chargeTincture ? 0 : 3],
      ['ordinary', wantsSeveral ? 0 : 4],
      ['picture', pictures.length ? 6 : 0],
      ['blob', pictures.length ? 0 : 1],
    ]);
    if (kind === 'none') return [];
    if (kind === 'ordinary') choice = { kind: 'ordinary', id: pick(rng, Object.keys(ORDINARIES)) };
    else if (kind === 'picture') { const p = pick(rng, pictures); choice = { kind: 'charge', id: p.charge_id, file: p.file }; }
    else if (library.charges.length) choice = { kind: 'charge', id: pick(rng, library.charges).id, file: null };
    else return [];
  }

  const palette = paletteOf(c);
  const tincture = c.chargeTincture || (rng() < 0.12 ? COUNTERCHANGED : pick(rng, palette));
  if (choice.kind === 'ordinary') return [ordinaryGroup(choice.id, tincture)];

  const charge = library.charges.find(x => x.id === choice.id);
  if (!charge) return null;
  const picture = choice.file ? library.pictures.find(p => p.file === choice.file) : null;
  const number = c.number || weighted(rng, [[1, 11], [2, 3], [3, 6]]);
  return [chargeGroupFromLibrary(charge, picture || null, { tincture, number })];
}

// ---- Putting it together -----------------------------------------------------

function guess(c, rng, library) {
  const field = guessField(c, rng);
  if (!field) return null;
  const groups = guessGroups(c, field, rng, library);
  if (!groups) return null;
  const shield = { field, groups, noCharge: !groups.length };
  const used = shieldTinctures(field, groups);
  if (c.palette && c.palette.length && used.some(t => !c.palette.includes(t))) return null;
  if (c.mustInclude && !used.includes(c.mustInclude)) return null;
  return shield;
}

// Problems that matter for a guess. A bare plain background is fine when it
// is only being shown as a background option.
function problemsOf(shield, c) {
  return checkShield(shield).filter(p => !(c.allowBare && p.id === 'single-tincture'));
}

// A random shield that fits the constraints and breaks no rule, or null if
// none was found (which nearly always means none exists).
export function randomShield(c, seedText, library) {
  const rng = randomFrom(seedText);
  // If everything is already decided there is only one shield to test.
  const decided = c.field && c.charge && (c.charge === 'none' ||
    (c.chargeTincture && (c.number || c.charge.kind === 'ordinary')));
  for (let i = 0; i < (decided ? 1 : TRIES); i++) {
    const shield = guess(c, rng, library);
    if (shield && problemsOf(shield, c).length === 0) return shield;
  }
  return null;
}

// When randomShield finds nothing: a shield that fits the constraints but
// breaks rules, together with the problems, so a page can show it greyed out
// and say why. Returns { shield, problems }, or null if the constraints cannot
// be met even ignoring the rules (for example, too few colours).
export function whyNot(c, seedText, library) {
  const rng = randomFrom(seedText + '|why');
  const counts = new Map();
  let example = null;
  for (let i = 0; i < 30; i++) {
    const shield = guess(c, rng, library);
    if (!shield) continue;
    const problems = problemsOf(shield, c);
    if (!problems.length) continue;
    example = example || { shield, problems };
    for (const p of problems) counts.set(p.id, (counts.get(p.id) || 0) + 1);
  }
  if (!example) return null;
  // Put the commonest problem first: it is the most useful one to explain.
  const commonest = [...counts.entries()].sort((a, b) => b[1] - a[1])[0][0];
  const withIt = example.problems.find(p => p.id === commonest);
  if (withIt) example.problems = [withIt, ...example.problems.filter(p => p !== withIt)];
  return example;
}

// Several different random shields (fewer if not that many exist).
export function randomShields(c, seedText, library, count) {
  const found = [], seen = new Set();
  for (let i = 0; i < count * 4 && found.length < count; i++) {
    const shield = randomShield(c, `${seedText}|${i}`, library);
    if (!shield) continue;
    const key = blazon(shield.field, shield.groups);
    if (!seen.has(key)) { seen.add(key); found.push(shield); }
  }
  return found;
}
