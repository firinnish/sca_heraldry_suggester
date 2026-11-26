// rules.js: is this shield allowed? The SCA's armory style rules, as code.
//
// Source: SENA (The Standards for Evaluation of Names and Armory),
// https://heraldry.sca.org/sena.html, section A3 "Armory Style", read in
// November 2026. Each check below quotes the rule it comes from. If SENA
// changes, this is the file to update, and tests/rules.html (which holds
// SENA's own examples) says whether the code still agrees with it.
//
// checkShield() returns a list of problems. Each has:
//   id:    which check found it (the page turns this into words)
//   sena:  the SENA section, or null for a house rule
//   level: 'sena'  = SENA says no (barring documentation of a period pattern)
//          'house' = SENA may allow it, but the maintainer has decided the
//                    tools should not offer it. Either the result is too
//                    complicated, or it is only registerable if drawn just
//                    so. People who tick "I'm a herald" may still choose it.
//   hint:  for contrast problems, 'metal' or 'colour': what would fix it.
//
// WHAT IS A "CLASS"? (SENA A3B1) Every tincture is a metal (argent, Or,
// ermine, erminois) or a colour (the rest; counter-ermine and pean count as
// colours). Something divided evenly between metal and colour is "neutral".
// In the code a class is a number: +1 metal, -1 colour, 0 neutral, and a
// divided field's class is the average of its parts, so anything above zero
// is "over half metal", anything below is "over half colour".
//
// GOOD CONTRAST (SENA A3B2) is metal against colour, or neutral against either.

import { TINCTURES, familyOf, baseTincture } from './catalog.js';
import { COUNTERCHANGED, isComplete, isNested, leafTinctures, tincturesIn, shieldTinctures } from './shield.js';
import { partMap } from './geometry.js';
import { groupCoverage } from './layout.js';

const MAX_COMPLEXITY = 8;          // SENA A3E2
// A charge counts as lying on a part of the field if at least this share of
// it is there. (SENA treats a chief on a per pall field as lying on the top
// part only, although its corners overlap the other two a little.)
const TOUCHING = 0.2;
const TOUCHING_SMALL = 0.08;       // ...or this share of it, if that covers...
const COVERING = 0.3;              // ...at least this share of the part.
// ...but to share a tincture with the field it must stay off that tincture
// almost completely (SENA A3B4b: "appear only on a section of the field with
// a different tincture").
const BARELY = 0.03;

const classOf = tincture => (TINCTURES[tincture].tone === 'light' ? 1 : -1);
const sign = v => (v > 1e-9 ? 1 : v < -1e-9 ? -1 : 0);

// SENA A3B2: good contrast unless both are metals or both are colours.
export function goodContrast(a, b) {
  return !(sign(a) === sign(b) && sign(a) !== 0);
}

// What would fix poor contrast with something of class `v`.
const hintAgainst = v => (sign(v) < 0 ? 'metal' : 'colour');

// SENA A3B1: "Divided fields and charges are considered metals or colors
// based on the tincture class that dominates across the entire field".
export function fieldClass(field) {
  if (field.type === 'plain') return classOf(field.tincture);
  return field.parts.reduce((sum, p) => sum + fieldClass(p), 0) / field.parts.length;
}

// ---- The field -------------------------------------------------------------

function checkField(field, problems, depth = 0) {
  if (field.type === 'plain') return;
  const family = familyOf(field.division);
  const parts = field.parts;
  const classes = parts.map(fieldClass);
  const nested = parts.filter(p => p.type === 'divided');
  const plainParts = parts.filter(p => p.type === 'plain');

  // SENA A3B3a-c: "as long as the two sections do not have the same base
  // tincture" / "No two parts may share a background tincture". Argent and
  // ermine side by side cannot be told apart.
  for (let i = 0; i < plainParts.length; i++) {
    for (let j = i + 1; j < plainParts.length; j++) {
      if (baseTincture(plainParts[i].tincture) === baseTincture(plainParts[j].tincture)) {
        problems.push({ id: 'same-base', sena: 'A3B3', level: 'sena' });
      }
    }
  }

  // The same, between a plain part and the big pieces of a divided part next
  // to it. SENA's example: "Per fess argent and per pale azure and ermine
  // would not" be acceptable (ermine has an argent background). When the
  // divided part is a pattern of many small pieces this depends on the
  // drawing instead, and falls under the house rule further down.
  for (const p of nested) {
    if (familyOf(p.division) === 'many') continue;
    const bases = leafTinctures(p).map(baseTincture);
    if (plainParts.some(q => bases.includes(baseTincture(q.tincture)))) {
      problems.push({ id: 'same-base', sena: 'A3B3', level: 'sena' });
    }
  }

  if (family === 'many') {
    // SENA A3B3d: "Elements not already mentioned must have good contrast
    // between their parts." Checky azure and gules is out; checky argent and
    // gules is fine.
    if (!goodContrast(classes[0], classes[1])) {
      problems.push({ id: 'many-low-contrast', sena: 'A3B3d', level: 'sena', hint: hintAgainst(classes[0]) });
    }
  } else if (family === 'three') {
    // SENA A3B3b: "must have one part that has good contrast with the other
    // two parts." Per pall azure, vert, and argent is fine; azure, vert, and
    // sable is not.
    const ok = classes.some((c, i) => classes.every((d, j) => i === j || goodContrast(c, d)));
    if (!ok) problems.push({ id: 'three-part-contrast', sena: 'A3B3b', level: 'sena', hint: hintAgainst(classes[0]) });
  } else if (nested.length) {
    // SENA A3B3a: "Elements that further divide one of those two parts must
    // have good contrast between its sections." Per pale sable and per fess
    // gules and azure is out; per fess azure and lozengy argent and azure is in.
    if (!goodContrast(classes[0], classes[1])) {
      problems.push({ id: 'sections-low-contrast', sena: 'A3B3a', level: 'sena', hint: hintAgainst(classes[0]) });
    }
    // SENA A3B3c: a quarter of a quarterly or per saltire field "may
    // generally not be further divided except in a pattern of multiple
    // divisions" (checky and the like).
    if (family === 'four' && nested.some(p => familyOf(p.division) !== 'many')) {
      problems.push({ id: 'four-part-nested', sena: 'A3B3c', level: 'sena' });
    }
  }
  // (Two parts, or quarterly / per saltire, with both parts plain: SENA allows
  //  "any two tinctures or furs", so there is nothing more to check.)

  // The maintainer decided (November 2026) that SENA is the final authority:
  // the tools follow SENA and add no stricter rules of their own about
  // colours. So "per fess azure and lozengy argent and azure" (a tincture
  // used twice), "Barry azure and checky gules and argent" (a pattern with a
  // divided part) and "per pale Or and per fess gules and azure" (a divided
  // part of two colours) are all allowed, as SENA's own examples say.
  //
  // Two limits remain, about what the tools can draw and name, not about
  // colours:
  if (nested.length) {
    // Only one level of dividing (the builder and blazon handle one).
    if (depth > 0 || nested.some(isNested)) problems.push({ id: 'house-too-deep', sena: null, level: 'house' });
    // A part divided the same way as the whole ("per pale azure and per pale
    // Or and gules") is really a different division (tierced in pale).
    if (nested.some(p => p.division === field.division)) problems.push({ id: 'house-same-division', sena: null, level: 'house' });
  }
  for (const p of nested) checkField(p, problems, depth + 1);
}

// ---- Charges against the field ----------------------------------------------

// The class of the background actually behind one charge (SENA A3B4a:
// "Charges must have good contrast with the area of background on which they
// are placed"). `points` are the sample points the charge covers.
// Each part of the field the charge really lies on counts equally, because
// SENA judges by how a division was thought of, not by measured area: "in Per
// pall inverted argent, gules, and azure, a mullet sable the mullet lies
// equally on all three portions of the field".
function classBehind(field, points) {
  if (field.type === 'plain') return classOf(field.tincture);
  const map = partMap(field.division);
  const sizes = partSizes(field.division);
  const groups = field.parts.map(() => []);
  for (const i of points) groups[map[i]].push(i);
  // A field of many pieces (barry, chevronelly, checky...) is judged as a
  // whole: a charge lying across its pieces is on a neutral field (SENA
  // A3B1), however much of the charge happens to fall on one tincture. (The
  // drawing still nudges the charge onto the contrasting tincture: layout.js.)
  if (familyOf(field.division) === 'many' && groups.every(g => g.length > BARELY * points.length)) {
    return fieldClass(field);
  }
  // A charge lies on a part if a good share of the charge is there, or if a
  // smaller share of the charge nevertheless covers a good share of the part.
  const touched = groups.map((g, i) => i).filter(i =>
    groups[i].length >= TOUCHING * points.length ||
    (groups[i].length >= TOUCHING_SMALL * points.length && groups[i].length >= COVERING * sizes[i]));
  if (!touched.length) return fieldClass(field);
  return touched.reduce((sum, i) => sum + classBehind(field.parts[i], groups[i]), 0) / touched.length;
}

// How many sample points each part of a division has.
const sizeCache = new Map();
function partSizes(division) {
  if (!sizeCache.has(division)) {
    const sizes = [];
    for (const part of partMap(division)) sizes[part] = (sizes[part] || 0) + 1;
    sizeCache.set(division, sizes);
  }
  return sizeCache.get(division);
}

// How much of a charge lies on each tincture of the field: { azure: 0.5, ... }
function tincturesBehind(field, points, out = {}, total = points.length) {
  if (field.type === 'plain') {
    out[field.tincture] = (out[field.tincture] || 0) + points.length / total;
    return out;
  }
  const map = partMap(field.division);
  const groups = field.parts.map(() => []);
  for (const i of points) groups[map[i]].push(i);
  field.parts.forEach((p, i) => { if (groups[i].length) tincturesBehind(p, groups[i], out, total); });
  return out;
}

function checkGroup(field, group, problems) {
  // SENA A3D1c: "Combining a two-part field division with a parallel ...
  // peripheral ordinary - such as ... per fess and a chief or base - creates
  // ambiguity between a peripheral ordinary and a central ordinary."
  if (group.kind === 'ordinary' && field.type === 'divided' && field.division === 'perFess' &&
      (group.ordinary === 'chief' || group.ordinary === 'base')) {
    problems.push({ id: 'parallel-peripheral', sena: 'A3D1c', level: 'sena' });
  }
  if (group.tincture === null || !isComplete(field)) return;

  if (group.tincture === COUNTERCHANGED) {
    // Counterchanging swaps the field's two tinctures, so the field must be
    // one division of two tinctures.
    const family = field.type === 'divided' ? familyOf(field.division) : null;
    if (!family || isNested(field) || family === 'three') {
      problems.push({ id: 'counterchange-field', sena: 'A3F4', level: 'sena' });
      return;
    }
    // SENA A3F4: "it was used mainly with two or four part divisions of the
    // field ... The counterchanging of a single charge over a field division
    // with more than four sections must be attested to be allowed."
    if (family === 'many') problems.push({ id: 'counterchange-many', sena: 'A3F4', level: 'sena' });
    // Each piece of the charge sits on the other tincture, so the two must
    // themselves have good contrast (SENA A3B4a).
    const [a, b] = field.parts.map(fieldClass);
    if (!goodContrast(a, b)) {
      problems.push({ id: 'counterchange-low-contrast', sena: 'A3B4a', level: 'sena', hint: hintAgainst(a) });
    }
    return;
  }

  const chargeClass = classOf(group.tincture);
  let lowContrast = null, shares = false;
  for (const points of groupCoverage(group, field)) {
    if (!points.length) continue;
    // SENA A3B4a, applied to the part of the field behind this one charge.
    const behind = classBehind(field, points);
    if (!goodContrast(chargeClass, behind)) lowContrast = hintAgainst(behind);
    // SENA A3B4b: "the field and charges on it may share a tincture only if
    // (1) the charges appear only on a section of the field with a different
    // tincture or (2) only one of the two is multiply divided ... and the
    // charge(s) is an ordinary or simple geometric shape arranged in a way
    // that both ... are clearly identifiable." (2) depends on the drawing,
    // so it is not offered.
    const under = tincturesBehind(field, points);
    for (const t of Object.keys(under)) {
      if (under[t] > BARELY && baseTincture(t) === baseTincture(group.tincture)) shares = true;
    }
  }
  if (shares) {
    // Case (2) above: an ordinary on a field of many pieces "can be
    // acceptable, if drawn so that the shared tinctures are not against each
    // other" (SENA's example: Lozengy vert and Or, a chief Or).
    const caseTwo = group.kind === 'ordinary' && field.type === 'divided' &&
      familyOf(field.division) === 'many' && !isNested(field);
    problems.push({ id: 'charge-shares-tincture', sena: 'A3B4b', level: caseTwo ? 'house' : 'sena' });
  } else if (lowContrast) problems.push({ id: 'charge-low-contrast', sena: 'A3B4a', level: 'sena', hint: lowContrast });
}

// ---- The whole shield --------------------------------------------------------

// shield = { field, groups, noCharge }. `noCharge` true means the user has
// said there is nothing on the field (as opposed to not having chosen yet).
// Anything not chosen yet is simply not judged.
export function checkShield({ field, groups = [], noCharge = false }) {
  const problems = [];
  if (!field) return problems;
  if (isComplete(field)) checkField(field, problems);

  // SENA A3E3: "Designs that consist only of a single tincture will not be
  // registered. Designs must consist at least of a divided field or a plain
  // field with at least one charge."
  if (field.type === 'plain' && field.tincture !== null && noCharge && !groups.length) {
    problems.push({ id: 'single-tincture', sena: 'A3E3', level: 'sena' });
  }

  for (const group of groups) checkGroup(field, group, problems);

  // SENA A3E2: "measured by adding the number of types of charges to the
  // number of tinctures. Items with a complexity count of eight or less
  // receive no penalty".
  if (shieldTinctures(field, groups).length + groups.length > MAX_COMPLEXITY) {
    problems.push({ id: 'complexity', sena: 'A3E2', level: 'sena' });
  }

  // The same problem found twice (say, for two charges) is reported once.
  const seen = new Set();
  return problems.filter(p => !seen.has(p.id) && seen.add(p.id));
}

export const isAllowed = shield => checkShield(shield).length === 0;

// Would this tincture, somewhere in the palette, cure poor contrast?
// Used by pages to say "please choose a metal" only when none is ticked.
export function paletteLacks(palette) {
  const classes = new Set(palette.map(classOf));
  if (!classes.has(1)) return 'metal';
  if (!classes.has(-1)) return 'colour';
  return null;
}

export { tincturesIn };
