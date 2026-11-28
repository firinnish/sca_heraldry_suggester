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
//   template:       a background partly chosen: a field (shield.js) in which
//                   any tincture may still be null, to be filled in.
//   fieldHas:       tinctures the background must contain (with a template,
//                   or on their own: then any division with room for them).
//   line:           the complex line the background is divided with
//                   (catalog.js: LINES), if one has been chosen.
//   items:          what is on the shield: null (anything, or nothing) |
//                   'none' | a list of { charge, number, tincture }, where
//                     charge:   null (any) | { kind: 'ordinary', id }
//                               | { kind: 'charge', id, file }  (file null = no picture;
//                                 it may also say how the charge is turned: see stanceOf)
//                     number:   null (any) | 1, 2, 3...
//                     tincture: null (any) | a tincture id | COUNTERCHANGED
//                     arranged: null (any) | 'usual' | an arrangement id
//                               (catalog.js: ARRANGEMENTS), how its own
//                               charges are set out
//                   Every charge listed appears on the shield.
//   arrangement:    how the listed charges go together (arrange.js), or null
//                   for any way that makes sense.
//   extras:         true = the shield may also have charges that are not
//                   listed (used for suggestions, not for option pictures);
//                   'simple' = it may, but only ordinaries and the simple
//                   geometric charges (catalog.js: SIMPLE_CHARGES).
//   charge, number, chargeTincture: the older way of asking for one charge;
//                   the same as a list of one.
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

import { TINCTURES, DIVISIONS, ORDINARIES, ARRANGEMENTS, SEMY, COLOUR_ORDER, METAL_ORDER, SIMPLE_CHARGES, VOIDABLE, COTISABLE,
         familyOf, arrangementsFor, partedOf } from './catalog.js';
import { plain, divided, ordinaryGroup, chargeGroupFromLibrary, shieldTinctures, blazon, typeOf, COUNTERCHANGED } from './shield.js';
import { checkShield, checkArrangement } from './rules.js';
import { arrangements, arrange } from './arrange.js';
import { aroundNumbers, onNumbers, PLACE_NUMBERS } from './layout.js';

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

// A background that is partly chosen (`template`: a field in which any
// tincture may still be null): each null is filled from the palette. The
// tinctures the background must contain (`c.fieldHas`) go in first, wherever
// there is room; null if there is not room for them all.
function fillTemplate(template, c, rng) {
  const leaves = [];
  const walk = f => { if (f.type === 'plain') leaves.push(f); else f.parts.forEach(walk); };
  walk(template);
  // (a tincture made of two others, "purpure masoned argent", contains both)
  const has = new Set(leaves.filter(f => f.tincture).flatMap(f => [f.tincture, ...((TINCTURES[f.tincture] || {}).pair || [])]));
  const must = shuffled(rng, (c.fieldHas || []).filter(t => !has.has(t)));
  const open = shuffled(rng, leaves.filter(f => f.tincture === null));
  if (must.length > open.length) return null;
  const palette = paletteOf(c);
  const chosen = new Map();
  open.forEach((leaf, i) => {
    if (i < must.length) { chosen.set(leaf, must[i]); return; }
    // Lean towards the tincture that must appear somewhere, then towards one
    // the background does not have yet (two parts alike are seldom allowed).
    const used = new Set([...has, ...chosen.values()]);
    const fresh = palette.filter(t => !used.has(t));
    const t = c.mustInclude && !used.has(c.mustInclude) && palette.includes(c.mustInclude) && rng() < 0.5 ? c.mustInclude
      : pick(rng, fresh.length && rng() < 0.9 ? fresh : palette);
    chosen.set(leaf, t);
  });
  const fill = f => (f.type === 'plain' ? (chosen.has(f) ? plain(chosen.get(f)) : f) : { ...f, parts: f.parts.map(fill) });
  return fill(template);
}

function guessField(c, rng) {
  if (c.field) return c.field;
  if (c.template) return fillTemplate(c.template, c, rng);
  // The background must contain certain tinctures, and nothing else about it
  // is chosen: a division with room for them, filled as above.
  if (c.fieldHas && c.fieldHas.length && !c.division && !(c.fieldTinctures && c.fieldTinctures.length)) {
    const k = c.fieldHas.length;
    if (k > 4) return null;
    if (k === 4 || (k === 3 && rng() < 0.5)) return nestedField(rng, c.fieldHas);
    const family = k === 3 ? 'three' : weighted(rng, k === 1
      ? [['plain', 5], ['two', 6], ['four', 2], ['many', 4], ['three', 1]] : [['two', 5], ['four', 2], ['many', 3], ['three', 1]]);
    const division = family === 'plain' ? 'plain' : pick(rng, idsInFamily(family));
    const empty = division === 'plain' ? plain(null)
      : divided(division, Array.from({ length: DIVISIONS[division].parts }, () => plain(null)), c.line || 'plain');
    return fillTemplate(empty, c, rng);
  }
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
  // (`line`: the complex line the background is to be divided with, if one has been chosen)
  return division === 'plain' ? plain(tinctures[0]) : divided(division, tinctures.map(plain), c.line || 'plain');
}

// ---- Guessing what is on it --------------------------------------------------

// What must be on the shield: `c.items`, or the older way of asking for one
// charge (c.charge, c.number, c.chargeTincture). Returns null (anything),
// 'none', or a list of { charge, number, tincture }, any of them null.
function wanted(c) {
  if (c.items) return c.items;
  if (c.charge === 'none') return 'none';
  if (c.charge || c.number || c.chargeTincture) {
    return [{ charge: c.charge || null, number: c.number || null, tincture: c.chargeTincture || null }];
  }
  return null;
}

const SIMPLE = new Set(SIMPLE_CHARGES);
const CENTRAL = Object.keys(ORDINARIES).filter(id => !ORDINARIES[id].peripheral);
const PERIPHERAL = Object.keys(ORDINARIES).filter(id => ORDINARIES[id].peripheral);
const sameChoice = (a, b) => a.kind === b.kind && a.id === b.id;

// A charge picked at random. `kinds` weights the possibilities.
// `among` (optional): the only charges that may be picked (a Set of ids).
function randomChoice(rng, library, { ordinary = 4, peripheral = 0, charge = 6, among = null } = {}) {
  const pictures = among ? library.pictures.filter(p => among.has(p.charge_id)) : library.pictures;
  if (among && !pictures.length) charge = 0;
  const kinds = [
    ['ordinary', ordinary], ['peripheral', peripheral],
    ['picture', pictures.length ? charge : 0],
    ['blob', pictures.length || !library.charges.length ? 0 : charge / 6],
  ].filter(k => k[1] > 0);
  if (!kinds.length) return null;
  const kind = weighted(rng, kinds);
  if (kind === 'ordinary') return { kind: 'ordinary', id: pick(rng, Object.keys(ORDINARIES)) };
  if (kind === 'peripheral') return { kind: 'ordinary', id: pick(rng, PERIPHERAL) };
  if (kind === 'picture') { const p = pick(rng, pictures); return { kind: 'charge', id: p.charge_id, file: p.file }; }
  if (kind === 'blob') return { kind: 'charge', id: pick(rng, library.charges).id, file: null };
  return null;
}

// A library's charges by id and pictures by file name (looked up constantly).
// (`all` includes the pictures that are only loaded when wanted, art.js: a
// charge somebody chose may have one of those. Random picks use `pictures`.)
const indexes = new WeakMap();
function indexOf(library) {
  if (!indexes.has(library)) {
    indexes.set(library, { charges: new Map(library.charges.map(x => [x.id, x])),
                           pictures: new Map((library.all || library.pictures).map(p => [p.file, p])) });
  }
  return indexes.get(library);
}

function groupFromChoice(choice, library) {
  // (an ordinary's choice may say which complex line it is drawn with: "a fess wavy")
  // (...and whether it is voided or cotised: "a cross voided", "a bend cotised")
  if (choice.kind === 'ordinary') {
    return ORDINARIES[choice.id] ? ordinaryGroup(choice.id, null, { line: choice.line || 'plain', voided: !!choice.voided, cotised: !!choice.cotised }) : null;
  }
  const index = indexOf(library);
  const charge = index.charges.get(choice.id);
  if (!charge) return null;
  const picture = choice.file ? index.pictures.get(choice.file) : null;
  return chargeGroupFromLibrary(charge, picture || null, { tincture: null, number: null, ...stanceOf(choice) });
}

// How a chosen charge is to be turned, from the choice itself: `turned` (an
// id from ORIENTATIONS in catalog.js), `inverted`, `mirror` (facing
// sinister), and `noPosture` (leave its posture out of the blazon and the
// search). Pages use this too, so a charge is drawn the same everywhere.
export function stanceOf(choice) {
  return {
    turned: choice.turned || null, inverted: !!choice.inverted, mirror: !!choice.mirror,
    ...(choice.noPosture ? { posture: '' } : {}),
  };
}

// How likely each place for a charge is to be picked, when nobody has chosen.
const PLACE_WEIGHT = { primary: 1, edge: 1, around: 5, on: 3, chief: 2, base: 1 };

// The arrangements worth trying for a list of groups: those that make sense
// (arrange.js), agree with whatever arrangement was chosen for the first of
// them, and that the rules cannot already see are wrong. If the rules fault
// every one, all are tried, so that the rules' reason can be shown.
const waysCache = new Map();
function waysFor(flat, chosen) {
  const key = flat.map(typeOf).join() + '|' + JSON.stringify(chosen || null);
  if (!waysCache.has(key)) {
    const fits = a => !chosen || chosen.every((x, i) => x.as === a[i].as && (x.on ?? null) === (a[i].on ?? null));
    const all = arrangements(flat).filter(fits);
    let sound = all.filter(a => !checkArrangement(arrange(flat, a)).length);
    // A charge on a canton "usually represents an augmentation of honour"
    // (the maintainer, November 2026): never made up at random, only when
    // that arrangement was asked for.
    const onCanton = a => a.some(x => x.as === 'on' && flat[x.on].kind === 'ordinary' && flat[x.on].ordinary === 'canton');
    if (!chosen && sound.some(a => !onCanton(a))) sound = sound.filter(a => !onCanton(a));
    if (waysCache.size > 2000) waysCache.clear();
    waysCache.set(key, (sound.length ? sound : all).map(a => [a, a.reduce((w, x) => w * PLACE_WEIGHT[x.as], 1)]));
  }
  return waysCache.get(key);
}

// The charges for one guess: { flat, arrangement } (a list of groups and how
// they go together, see arrange.js), with `flat` empty for nothing on the
// shield; or null if this guess came to nothing.
function guessGroups(c, rng, library) {
  let items = wanted(c);
  if (items === 'none') return { flat: [], arrangement: [] };
  if (!items) {
    // Nothing chosen: about one shield in four has nothing on it.
    if (rng() < 3 / 13) return { flat: [], arrangement: [] };
    items = [{ charge: null, number: null, tincture: null }];
  }
  // (More than one of something, or a way of setting them out, means a charge and not an ordinary.)
  items = items.map(it => ({ ...it, charge: it.charge ||
    randomChoice(rng, library, { ordinary: (it.number && it.number !== 1) || (it.arranged && it.arranged !== 'usual') ? 0 : 4 }) }));
  if (items.some(it => !it.charge)) return null;

  // Suggestions may add a charge or two that was not asked for: something
  // along the edge, an ordinary, or another charge.
  for (let chance = 0.35; c.extras && items.length < 3 && rng() < chance; chance = 0.2) {
    const has = test => items.some(it => it.charge.kind === 'ordinary' && test(it.charge.id));
    // (`extras: 'simple'`: an added charge is a simple geometric shape, or an ordinary)
    const extra = randomChoice(rng, library, {
      ordinary: 0, charge: 5,
      peripheral: has(id => PERIPHERAL.includes(id)) ? 0 : 4,
      among: c.extras === 'simple' ? SIMPLE : null,
    }) || null;
    const central = !has(id => CENTRAL.includes(id)) && rng() < 0.3 ? { kind: 'ordinary', id: pick(rng, CENTRAL) } : null;
    const choice = central || extra;
    if (!choice || items.some(it => sameChoice(it.charge, choice))) break;
    items.push({ charge: choice, number: null, tincture: null });
  }

  const flat = items.map(it => groupFromChoice(it.charge, library));
  if (flat.some(g => !g)) return null;

  // How they go together: as chosen, or one of the ways that make sense.
  // (A chosen arrangement covers the charges that were asked for; any added
  // charge takes whatever place still makes sense.)
  let arrangement = c.arrangement;
  if (!arrangement || arrangement.length !== flat.length) {
    const ways = waysFor(flat, arrangement);
    if (!ways.length) return null;
    arrangement = weighted(rng, ways);
  }

  // How many of each. Only some numbers have a default arrangement in each
  // place (layout.js); a number the user chose is kept whatever it is, so
  // that the rules can say what is wrong with it.
  const primary = arrangement.findIndex(x => x.as === 'primary');
  const circled = arrangement.some(x => x.as === 'around');
  // Now and then a suggestion's ordinary is voided or cotised (the
  // maintainer, 28 November 2026: "should show up in suggestions
  // sometimes"): only where nothing has been said about that for it, and
  // only where the rules have a chance of allowing it (catalog.js).
  const main = primary >= 0 ? flat[primary] : null, said = main ? items[primary].charge : null;
  if (c.extras && main && main.kind === 'ordinary' && said.voided === undefined && said.cotised === undefined && main.line === 'plain') {
    const charged = arrangement.some(x => x.as === 'on' && x.on === primary), beside = arrangement.some(x => x.as !== 'primary' && x.as !== 'on' && x.as !== 'edge');
    const chance = rng();
    if (VOIDABLE.has(main.ordinary) && !charged && chance < 0.07) main.voided = true;
    else if (COTISABLE[main.ordinary] && !beside && chance < 0.09) main.cotised = true;
  }
  const order = [primary, ...flat.map((g, i) => i).filter(i => i !== primary)].filter(i => i >= 0);
  for (const i of order) {
    const g = flat[i], as = arrangement[i].as, fixed = items[i].number;
    if (g.kind === 'ordinary') continue;
    let choices;
    const named = items[i].arranged && items[i].arranged !== 'usual' ? ARRANGEMENTS[items[i].arranged] : null;
    if (as === 'primary' && named) choices = named.numbers.map(n => [n, n === 3 ? 3 : 1]);     // as many as that arrangement takes
    else if (as === 'primary') choices = circled ? [[1, 1]] : [[1, 44], [2, 12], [3, 24], [4, 3], [5, 2], [6, 2], [SEMY, 3]];
    else if (as === 'around') choices = [...aroundNumbers(flat[primary]).map(n => [n, n === 3 ? 6 : 2]), [SEMY, 1]];
    else if (as === 'on') choices = onNumbers(flat[arrangement[i].on]).filter(n => n <= 4).map(n => [n, n === 1 || n === 3 ? 3 : 1]);
    else choices = PLACE_NUMBERS[as].map(n => [n, n === 2 ? 1 : 3]);
    // (Where no number has a default arrangement, one is still guessed, so
    // that the rules can say the arrangement cannot be drawn.)
    g.number = fixed || (choices.length ? weighted(rng, choices) : 1);
    // (strewn over one part of a divided background, if that was asked for)
    if (g.number === SEMY && Number.isInteger(items[i].part)) g.part = items[i].part;
  }

  // How each group's own charges are set out (catalog.js: ARRANGEMENTS): as
  // chosen ('usual' = the usual way for their number), or, for the primary
  // group, now and then something other than the usual way.
  for (const i of order) {
    const g = flat[i], fixed = items[i].arranged;
    if (g.kind === 'ordinary') continue;
    if (fixed) g.arranged = fixed === 'usual' ? null : fixed;
    else if (arrangement[i].as === 'primary' && g.number > 1) {
      const named = arrangementsFor(g.number);
      if (named.length && rng() < 0.25) g.arranged = pick(rng, named);
    }
  }

  // What colour each is. Charges around the main one are often its colour.
  const palette = paletteOf(c);
  for (const i of order) {
    const as = arrangement[i].as, fixed = items[i].tincture;
    if (fixed) flat[i].tincture = fixed;
    else if (as === 'on') flat[i].tincture = pick(rng, palette);
    else if (ON_FIELD_AROUND.has(as) && rng() < 0.5 && flat[primary].tincture !== COUNTERCHANGED) flat[i].tincture = flat[primary].tincture;
    else flat[i].tincture = rng() < 0.12 ? COUNTERCHANGED : pick(rng, palette);
  }
  return { flat, arrangement };
}
const ON_FIELD_AROUND = new Set(['around', 'chief', 'base']);

// ---- Putting it together -----------------------------------------------------

// A guess as its parts: { field, flat, arrangement }.
function guessParts(c, rng, library) {
  const field = guessField(c, rng);
  if (!field) return null;
  const charges = guessGroups(c, rng, library);
  return charges && { field, ...charges };
}

// The shield those parts make, or null if it uses a colour it may not (or
// lacks one it must have).
function shieldFrom({ field, flat, arrangement }, c) {
  const groups = flat.length ? arrange(flat, arrangement) : [];
  // (a charge parted like a field, "barry gules and Or", uses the tinctures it is parted of)
  const used = shieldTinctures(field, groups).flatMap(t => (partedOf(t) ? partedOf(t).parts : [t]));
  if (c.palette && c.palette.length && used.some(t => !c.palette.includes(t))) return null;
  if (c.mustInclude && !used.includes(c.mustInclude)) return null;
  return { field, groups, noCharge: !groups.length };
}

function guess(c, rng, library) {
  const parts = guessParts(c, rng, library);
  return parts && shieldFrom(parts, c);
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
  const items = wanted(c);
  const decided = c.field && items && (items === 'none' || (!c.extras &&
    items.every(it => it.charge && it.tincture && (it.charge.kind === 'ordinary' || it.number === 1 || (it.number && it.arranged))) &&
    (items.length === 1 || c.arrangement)));
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

// For ONE of the charges asked for, which values of one thing about it are
// possible? `slot` is its place in c.items, `key` is 'tincture' or 'number',
// `values` the values to try. Returns a Map from each value to
//   null            some shield within the constraints has it and breaks no rule
//   [problems...]   none was found; these are the commonest reasons why not
//                   (an empty list: no shield could even be made to test)
// Each guess is made once and then tried with every value in turn, so twelve
// colours cost little more than one, and all are judged on the same shields.
export function whichWork(c, slot, key, values, seedText, library) {
  const rng = randomFrom(seedText);
  const open = new Set(values);
  const faults = new Map(values.map(v => [v, new Map()]));    // value -> problem id -> { problem, count }
  const items = wanted(c).map((it, k) => (k === slot ? { ...it, [key]: null } : it));
  for (let i = 0; i < 60 && open.size; i++) {
    const parts = guessParts({ ...c, items, extras: false }, rng, library);
    if (!parts || !parts.flat.length) continue;
    // (An ordinary guessed for a charge not yet picked says nothing about numbers.)
    if (key === 'number' && parts.flat[slot].kind === 'ordinary') continue;
    for (const value of [...open]) {
      // A different number may need the charges set out differently (unless
      // how they are set out was asked for): the usual way for that number,
      // or failing that one of the named ways.
      const was = parts.flat[slot];
      const ways = key !== 'number' || items[slot].arranged || was.kind === 'ordinary' ? [was.arranged]
        : [...new Set([arrangementsFor(value).includes(was.arranged) ? was.arranged : null, null, ...arrangementsFor(value)])].slice(0, 4);
      let problems = null;
      for (const arranged of ways) {
        const shield = shieldFrom({ ...parts, flat: parts.flat.map((g, k) => (k === slot ? { ...g, [key]: value, arranged } : g)) }, c);
        if (!shield) continue;
        const found = problemsOf(shield, c);
        if (!problems || !found.length) problems = found;
        if (!found.length) break;
      }
      if (!problems) continue;
      if (!problems.length) { open.delete(value); continue; }
      for (const p of problems) {
        const seen = faults.get(value).get(p.id) || { problem: p, count: 0 };
        seen.count++;
        faults.get(value).set(p.id, seen);
      }
    }
  }
  return new Map(values.map(v => [v, open.has(v)
    ? [...faults.get(v).values()].sort((a, b) => b.count - a.count).map(x => x.problem) : null]));
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
