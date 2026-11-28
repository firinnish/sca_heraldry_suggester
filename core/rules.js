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

import { TINCTURES, SEMY, BORDUREWISE, SIMPLE_CHARGES, familyOf, sharesGround, groundsOf, tincturesWithin, partedOf } from './catalog.js';
import { COUNTERCHANGED, isComplete, isNested, leafTinctures, tincturesIn, shieldTinctures,
         roles, allGroups, typeOf, isCentralOrdinary, partedField } from './shield.js';
import { partMap } from './geometry.js';
import { layoutShield, extentOf, fieldShowing, lineShowing, SEMY_FEWEST } from './layout.js';

const MAX_COMPLEXITY = 8;          // SENA A3E2
// A charge drawn smaller than this (its greater measure, on a shield 100
// wide) is too small to make out: the tools do not offer designs that need it.
const MIN_EXTENT = 11;
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
// The ordinaries that may share a tincture with a field of many pieces
// (SENA A3B4b, case 2): see checkGroup.
const READS_CLEARLY = new Set(['chief', 'bordure', 'base']);
// Checky or lozengy needs at least this share of the shield left showing to
// be made out (see checkShield).
const PATTERN_SHOWS = 0.25;
// A complex line of division needs at least this share of its length left
// showing, not under a charge, to be made out (the maintainer, 28 November
// 2026: "at least 1/3 of the total line length must be visible to use a
// complex line. If it is hidden by charges it'll be hard to identify"). See
// checkShield. (For a day before that, low-contrast pairings were let
// through by how often the College registers them with a complex line:
// since 2015, gules and sable 55 times, sable and vert 37, azure and gules
// 34, azure and vert 33, argent and Or 12, purpure and vert 6, azure and
// purpure 4, gules and vert 2, gules and purpure 1. The maintainer: "it's
// less about the specific colour combination and more about
// identifiability".)
const LINE_SHOWS = 1 / 3;
// Ordinaries that run side by side and so may not be used together (the
// maintainer, 27 November 2026: "There should be a ban on parallel
// ordinaries; no fess used with a chief, no base used with a fess ... and no
// orle used with a bordure").
const PARALLEL = [['fess', 'chief'], ['fess', 'base'], ['orle', 'bordure']];

// (Vair and the furs like it are neutral: SENA A3B1, "As they are made up of
// multiple pieces, divided evenly between a color and a metal, they are
// treated as neutral".)
// (A parted charge, "a lion barry gules and Or", has its class from its
// parts, which catalog.js works out as the tincture's tone: SENA A3B1,
// "Divided fields and charges are considered metals or colors based on the
// tincture class that dominates across the entire field or charge. If
// fields or charges are evenly divided into color and metal, they are
// treated as neutral and have good contrast with both colors and metals. If
// they are over half color, they are treated as colors".)
const classOf = tincture => ({ light: 1, dark: -1, neutral: 0 }[TINCTURES[tincture].tone]);
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
      if (sharesGround(plainParts[i].tincture, plainParts[j].tincture)) {
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
    if (plainParts.some(q => leafTinctures(p).some(t => sharesGround(t, q.tincture)))) {
      problems.push({ id: 'same-base', sena: 'A3B3', level: 'sena' });
    }
  }

  // SENA Appendix H, "Low-Contrast Complex Lines of Division": "The primary
  // standard for low-contrast complex lines of division is that they be
  // readily identifiable." Two pairings "have been ruled unregisterable,
  // even when there is no overlying charge": "sable and purpure" and "sable
  // and azure". "Other combinations are registerable on a case-by-case
  // basis": those depend on how much of the line can be seen, which is
  // judged with the charges in place (checkShield, LINE_SHOWS).
  if (field.line && field.line !== 'plain') {
    for (let i = 0; i < parts.length; i++) {
      for (let j = i + 1; j < parts.length; j++) {
        if (goodContrast(classes[i], classes[j])) continue;
        const pair = [parts[i], parts[j]].map(p => (p.type === 'plain' ? groundsOf(p.tincture)[0] : null)).sort().join();
        if (pair === 'purpure,sable' || pair === 'azure,sable') problems.push({ id: 'complex-line-ruled-out', sena: 'Appendix H', level: 'sena' });
      }
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
// `frame`: 'chief' when the field is drawn in the space below a chief, and
// this charge with it (geometry.js); the parts are then where they are drawn.
// `variant`: the way the whole field's pattern is drawn (layout.js:
// fieldVariant); a part's own division has none.
function classBehind(field, points, frame = null, variant = null) {
  if (field.type === 'plain') return classOf(field.tincture);
  const map = partMap(field.division, frame, variant);
  const sizes = partSizes(field.division, frame, variant);
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
  return touched.reduce((sum, i) => sum + classBehind(field.parts[i], groups[i], frame), 0) / touched.length;
}

// How many sample points each part of a division has.
const sizeCache = new Map();
function partSizes(division, frame = null, variant = null) {
  const key = `${division}|${frame}|${variant}`;
  if (!sizeCache.has(key)) {
    const sizes = [];
    for (const part of partMap(division, frame, variant)) sizes[part] = (sizes[part] || 0) + 1;
    sizeCache.set(key, sizes);
  }
  return sizeCache.get(key);
}

// How much of a charge lies on each tincture of the field: { azure: 0.5, ... }
function tincturesBehind(field, points, frame = null, out = {}, total = points.length, variant = null) {
  if (field.type === 'plain') {
    out[field.tincture] = (out[field.tincture] || 0) + points.length / total;
    return out;
  }
  const map = partMap(field.division, frame, variant);
  const groups = field.parts.map(() => []);
  for (const i of points) groups[map[i]].push(i);
  field.parts.forEach((p, i) => { if (groups[i].length) tincturesBehind(p, groups[i], frame, out, total); });
  return out;
}

// One group on the field, against the field. `coverage` is, for each of its
// charges, the sample points it covers (from the layout); `crossed` is true
// when a charge in the middle of the shield lies over the field's lines.
function checkGroup(field, group, coverage, frame, crossed, problems, variant = null) {
  // SENA A3D1c: "Combining a two-part field division with a parallel ...
  // peripheral ordinary - such as ... per fess and a chief or base - creates
  // ambiguity between a peripheral ordinary and a central ordinary.
  // Therefore, such arrangements may only be registerable if there is a
  // charge overlying the line of division". SENA's example of that: "Per
  // fess argent and sable, a sun Or and a chief gules is registerable".
  if (group.kind === 'ordinary' && field.type === 'divided' && field.division === 'perFess' &&
      (group.ordinary === 'chief' || group.ordinary === 'base') && !crossed) {
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
    // This goes for ordinaries too (the maintainer, 27 November 2026, taking
    // back an exception tried for a few days: "ordinaries have to obey the
    // rules against excessive counterchanging"). The O&A does have some
    // registered under SENA ("Paly azure and argent, a bend counterchanged",
    // September 2018), each presumably with its own evidence.
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
  // (a parted charge: "a lion barry gules and Or", catalog.js)
  const parted = partedOf(group.tincture);
  let lowContrast = null, shares = false, bothNeutral = false;
  for (const points of coverage) {
    if (!points.length) continue;
    // SENA A3B4a, applied to the part of the field behind this one charge.
    const behind = classBehind(field, points, frame, variant);
    if (!goodContrast(chargeClass, behind)) lowContrast = hintAgainst(behind);
    if (parted && sign(chargeClass) === 0 && sign(behind) === 0) bothNeutral = true;
    // SENA A3B4b: "the field and charges on it may share a tincture only if
    // (1) the charges appear only on a section of the field with a different
    // tincture or (2) only one of the two is multiply divided ... and the
    // charge(s) is an ordinary or simple geometric shape arranged in a way
    // that both ... are clearly identifiable." (2) depends on the drawing,
    // so it is not offered.
    const under = tincturesBehind(field, points, frame, {}, points.length, variant);
    for (const t of Object.keys(under)) {
      if (under[t] > BARELY && sharesGround(t, group.tincture)) shares = true;
      // Strewn charges are small, and lost among anything else of their own
      // tincture: the spots of a fur, the lines of a field treatment. So
      // "semy of mullets argent" may not go on "purpure masoned argent", nor
      // semy of anything sable on ermine (the maintainer, November 2026,
      // reading A3B4b's "the field and charges on it may share a tincture
      // only if ...").
      if (under[t] > BARELY && group.number === SEMY && tincturesWithin(t).some(x => groundsOf(group.tincture).includes(x))) shares = true;
    }
  }
  if (shares && parted) {
    // A PARTED charge that shares a tincture with the field under it. SENA
    // A3B4b again: the two "may share a tincture only if (1) the charges
    // appear only on a section of the field with a different tincture or
    // (2) only one of the two is multiply divided (that is, has more than
    // one division) and the charge(s) is an ordinary or simple geometric
    // shape arranged in a way that both the type of field division and
    // charge are clearly identifiable." Its examples: "Pily gules and
    // argent, a bordure per fess argent and gules is acceptable if drawn so
    // that both the type of field division and the bordure are clearly
    // identifiable, because only the field is multiply divided. However,
    // Checky gules and argent, a bordure quarterly gules and argent is not
    // acceptable, as both the field and the bordure are multiply divided."
    // So: an ordinary, with exactly one of the two multiply divided, depends
    // on the drawing (house); anything else SENA does not allow. (Per pale
    // and its kin are one division; quarterly, per pall and the patterns
    // are more. Which part of the charge lies on which part of the field is
    // not worked out, so a parted charge that amounts to counterchanging is
    // reported too: say "counterchanged" for that.)
    const chargeMany = familyOf(parted.division) !== 'two';
    const fieldMany = field.type === 'divided' && (familyOf(field.division) !== 'two' || isNested(field));
    const caseTwo = group.kind === 'ordinary' && chargeMany !== fieldMany;
    problems.push({ id: 'charge-shares-tincture', sena: 'A3B4b', level: caseTwo ? 'house' : 'sena' });
  } else if (shares) {
    // Case (2) above: an ordinary on a field of many pieces "can be
    // acceptable, if drawn so that the shared tinctures are not against each
    // other" (SENA's example: Lozengy vert and Or, a chief Or).
    const caseTwo = group.kind === 'ordinary' && field.type === 'divided' &&
      familyOf(field.division) === 'many' && !isNested(field);
    // A chief, bordure or base along the edge of such a field reads clearly
    // as drawn, shared tincture and all, so those are offered (the
    // maintainer, November 2026: "they still read perfectly clearly"). An
    // ordinary through the middle can vanish into the pieces beside it (a
    // pale azure on paly Or and azure), so those are still held back.
    if (!(caseTwo && READS_CLEARLY.has(group.ordinary))) {
      problems.push({ id: 'charge-shares-tincture', sena: 'A3B4b', level: caseTwo ? 'house' : 'sena' });
    }
  } else if (lowContrast) problems.push({ id: 'charge-low-contrast', sena: 'A3B4a', level: 'sena', hint: lowContrast });
  // A parted charge of a colour and a metal, on a part of the field that is
  // itself of a colour and a metal (across the line of per pale, on checky,
  // on vair). SENA A3B2: "In some cases, two neutral tinctures may have good
  // contrast with each other, but identifiability must be maintained. This
  // occurs most often when a charge is counterchanged over a line of
  // division. In such a case ... all edges that touch have good contrast
  // with each other." Whether they do depends on the drawing, which is not
  // worked out piece by piece, so it is held back (house).
  else if (bothNeutral) problems.push({ id: 'neutral-on-neutral', sena: 'A3B2', level: 'house' });
}

// A PARTED CHARGE's own division ("a lion barry gules and Or", "a bordure
// parted bordurewise argent and sable": catalog.js), whatever field it is on.
// SENA A3B3 is headed "Contrast Requirements for Divided Fields and
// Charges", and each of its rules speaks of "elements" or of "fields or
// charges", so the charge's division must obey exactly what a field's does:
// it is checked as the field it would be (shield.js: partedField). What is
// found is reported under the field's own id with "parted-" before it:
//   parted-same-base            A3B3a-c  argent and ermine side by side
//   parted-many-low-contrast    A3B3d    barry gules and azure
//   parted-three-part-contrast  A3B3b    per pall of three colours
//   parted-complex-line-ruled-out  Appendix H  sable with azure or purpure, with a complex line
function checkParted(group, problems) {
  const parted = group.tincture ? partedOf(group.tincture) : null;
  if (!parted) return;
  // What the tools cannot draw: only a bordure has an outer ring and an
  // inner one (the maintainer, 27 November 2026: "Bordures should
  // additionally be allowed to be parted bordurewise").
  if (parted.division === BORDUREWISE && !(group.kind === 'ordinary' && group.ordinary === 'bordure')) {
    problems.push({ id: 'bordurewise-not-bordure', sena: null, level: 'house' });
  }
  const found = [];
  checkField(partedField(group.tincture), found);
  for (const p of found) problems.push({ ...p, id: 'parted-' + p.id });
}

// ---- The whole shield --------------------------------------------------------

// shield = { field, groups, noCharge }. `noCharge` true means the user has
// said there is nothing on the field (as opposed to not having chosen yet).
// Anything not chosen yet is simply not judged.
export function checkShield({ field, groups = [], noCharge = false }) {
  const problems = [];
  // How the charge groups go together does not depend on the field.
  const layout = groups.length ? checkGroups(field, groups, problems) : null;
  // Nor does how a parted charge is itself divided.
  for (const group of allGroups(groups)) checkParted(group, problems);
  if (!field) return dedupe(problems);
  if (isComplete(field)) checkField(field, problems);

  // SENA A3E3: "Designs that consist only of a single tincture will not be
  // registered. Designs must consist at least of a divided field or a plain
  // field with at least one charge."
  // "A field with a field treatment, such as scaly, is not considered a
  // single tincture for the purposes of this rule and may be registered."
  // (A fur is: SENA's examples are "neither Gules nor Pean".)
  if (field.type === 'plain' && field.tincture !== null && noCharge && !groups.length && TINCTURES[field.tincture].kind !== 'treatment') {
    problems.push({ id: 'single-tincture', sena: 'A3E3', level: 'sena' });
  }

  // What the tools cannot show clearly: checky or lozengy with so little of
  // it left showing (under a cross and a bordure, with charges in the
  // corners) that nobody could tell what it is (the maintainer, November
  // 2026: "it should likely just not be shown as an option").
  if (layout && field.type === 'divided' && (field.division === 'checky' || field.division === 'lozengy') &&
      fieldShowing(layout) < PATTERN_SHOWS) {
    problems.push({ id: 'pattern-hidden', sena: null, level: 'house' });
  }

  // A complex line of division must be identifiable (SENA Appendix H: "The
  // primary standard for low-contrast complex lines of division is that
  // they be readily identifiable"; "Other combinations are registerable on
  // a case-by-case basis"). The maintainer's measure, 28 November 2026: "at
  // least 1/3 of the total line length must be visible to use a complex
  // line. If it is hidden by charges it'll be hard to identify." Held back
  // (house) when less shows: between two colours or two metals as the
  // Appendix H case, otherwise as a line that cannot be made out.
  if (layout && isComplete(field) && field.type === 'divided' && field.line && field.line !== 'plain' &&
      lineShowing(field, layout) < LINE_SHOWS) {
    const classes = field.parts.map(fieldClass);
    const lowContrast = classes.some((a, i) => classes.some((b, j) => j > i && !goodContrast(a, b)));
    problems.push(lowContrast ? { id: 'complex-line-contrast', sena: 'Appendix H', level: 'house' }
      : { id: 'complex-line-hidden', sena: null, level: 'house' });
  }

  // A single charge in the middle of the shield lies over the lines of a
  // divided field (see SENA A3D1c, in checkGroup).
  const crossed = groups.some((g, i) => layout.entries[i].role === 'primary' && g.kind === 'charge' && g.number === 1);
  groups.forEach((group, i) => {
    const entry = layout.entries[i];
    // Where a group goes is only a guess until its place has been chosen
    // (shield.js: roles), so it cannot be judged against the field yet.
    if (!entry.chosen) return;
    // A chief is judged on the field as it would be without it (SENA treats
    // a chief on a per pall field as lying on the top part); everything else
    // on the field as it is drawn.
    const frame = group.kind === 'ordinary' && group.ordinary === 'chief' ? null : layout.frame;
    checkGroup(field, group, entry.coverage || [], frame, crossed, problems, layout.variant || null);
    if (group.charged) checkTertiary(field, group, group.charged, problems);
  });

  // SENA A3E2: "measured by adding the number of types of charges to the
  // number of tinctures. Items with a complexity count of eight or less
  // receive no penalty".
  if (shieldTinctures(field, groups).length + new Set(allGroups(groups).map(typeOf)).size > MAX_COMPLEXITY) {
    problems.push({ id: 'complexity', sena: 'A3E2', level: 'sena' });
  }
  return dedupe(problems);
}

// ---- Several charge groups ------------------------------------------------------
// SENA Appendix I ("Charge Group Theory") says what the groups are; Appendix
// J says which combinations of them are allowed. Returns the layout, which
// the checks against the field then use.
function checkGroups(field, groups, problems) {
  const r = roles(groups);
  const layout = layoutShield(field, groups);
  const primary = groups.find((g, i) => r[i].role === 'primary');
  problems.push(...checkArrangement(groups));
  // The rest depends on the arrangement, so waits until it has been chosen.
  if (!r.every(x => x.chosen)) return layout;

  // (An ordinary through the middle of the shield together with an orle is
  // offered: it is drawn stopping where it meets the orle, which the
  // maintainer has confirmed is how it should look, November 2026.)

  // What the tools cannot draw (yet): an arrangement with no default (the
  // Glossary's Table 7 says "None, must be specified"), or one that leaves a
  // charge too small to make out.
  // Strewn charges (semy) are small on purpose; what they need is company:
  // fewer than seven is not semy (the maintainer's rule).
  const small = e => e.places.some(p => extentOf(e.picture, p.size) < MIN_EXTENT);
  layout.entries.forEach((e, i) => {
    for (const [part, group] of [[e, groups[i]], [groups[i].charged ? e.tertiary : null, groups[i].charged]]) {
      if (!part) continue;
      const strewn = group.number === SEMY;
      if (strewn && part.places && part.places.length < SEMY_FEWEST) problems.push({ id: 'no-room', sena: null, level: 'house' });
      else if (!part.ok) problems.push({ id: 'arrangement-unsupported', sena: null, level: 'house' });
      else if (!strewn && part.places && small(part)) problems.push({ id: 'no-room', sena: null, level: 'house' });
    }
  });
  return layout;
}

// What can be said about how the charge groups go together without drawing
// anything: quick enough for the generator to ask of every arrangement it
// might try. Returns a list of problems.
export function checkArrangement(groups) {
  const problems = [];
  const r = roles(groups);
  const primary = groups.find((g, i) => r[i].role === 'primary');

  groups.forEach((g, i) => {
    if (!r[i].clash) return;
    // SENA Appendix I1: "If the armory has at least one central ordinary,
    // they are the primary charge group. This is true even if there are
    // other charges around it". So a charge beside one cannot be primary.
    if (!isCentralOrdinary(g) && primary && isCentralOrdinary(primary)) {
      problems.push({ id: 'ordinary-is-primary', sena: 'Appendix I1', level: 'sena' });
    } else {
      // Two ordinaries, or two kinds of charge sharing the middle of the
      // shield: SENA can allow these, but the tools cannot draw them yet.
      problems.push({ id: 'arrangement-unsupported', sena: null, level: 'house' });
    }
  });

  // SENA A3D1a: "Having identical types of charges in multiple charge groups
  // on the field blurs the distinction between charge groups. Thus, it is not
  // allowed ... Charge types with identical blazons are allowed to be both on
  // the field and in a tertiary charge group".
  const types = groups.map(typeOf);
  if (new Set(types).size < types.length) problems.push({ id: 'same-charge-twice', sena: 'A3D1a', level: 'sena' });

  // Parallel ordinaries (the maintainer's rule; see PARALLEL).
  const has = id => groups.some(g => g.kind === 'ordinary' && g.ordinary === id);
  if (PARALLEL.some(([a, b]) => has(a) && has(b))) problems.push({ id: 'parallel-ordinaries', sena: null, level: 'house' });

  // SENA Appendix I3: "Charges on tertiary charges are known as quaternary
  // charges and are not allowed".
  if (groups.some(g => g.charged && g.charged.charged)) problems.push({ id: 'quaternary', sena: 'Appendix I3', level: 'sena' });

  // The rest depends on the arrangement, so waits until it has been chosen.
  if (!r.every(x => x.chosen)) return problems;

  // Only the primary group can be set out in a named arrangement so far.
  if (allGroups(groups).some(g => g.arranged && g !== primary)) {
    problems.push({ id: 'arrangement-unsupported', sena: null, level: 'house' });
  }
  // SENA A3D2e, Unity of Arrangement: "Charges within a charge group should
  // be in an arrangement that can be blazoned with a single arrangement
  // phrase." Charges set out in a line with another charge above or below
  // them can be taken for ONE group (Appendix I1: charges each "entirely in
  // a single section of the field ... are collectively the primary charge
  // group"; and on an undivided field a charge well below the centre "would
  // give the impression of a single primary charge group, no matter how it
  // was blazoned"), and that group would then need two arrangement phrases:
  // SENA's own example of what is not unified is "in pale a tower and in
  // cross four gouttes". It depends on the drawing, so the tools hold it
  // back (the maintainer, November 2026); a herald may choose it.
  if (primary && primary.arranged && groups.some((g, i) => r[i].role === 'secondary' && g.number !== SEMY)) {
    problems.push({ id: 'arrangement-unity', sena: 'A3D2e', level: 'house' });
  }

  // SENA Appendix J: "All designs with two charge groups on the field are
  // presumed to be registerable ... All designs with three or more charge
  // groups on the field must be documented to be registerable." Of the
  // groupings it lists as documented, the tools can make these:
  //   "A central ordinary, a secondary charge group around the ordinary
  //    (semy or numbered charges), and a peripheral ordinary" and
  //   "A primary charge group, a secondary charge group around the primary
  //    charge group (semy, in orle, or numbered charges), and a peripheral
  //    ordinary", each with tertiary charges on the primary group, on the
  //    ordinaries, or both.
  // and, with charges strewn over the field:
  //   "A central ordinary, a secondary charge group around the ordinary
  //    (numbered charges), and another secondary charge group (semy)".
  if (groups.length >= 3) {
    const secondary = groups.filter((g, i) => r[i].role === 'secondary');
    const edges = r.filter(x => x.role === 'peripheral').length;
    const listed = groups.length === 3 && primary && secondary.every(g => !g.charged) && (
      (secondary.length === 1 && edges === 1) ||
      (secondary.length === 2 && edges === 0 && isCentralOrdinary(primary) && secondary.filter(g => g.number === SEMY).length === 1));
    // (A group only above or below the primary one, "in chief three
    // mullets", counts as a group around it: the maintainer, November 2026.)
    if (!listed) problems.push({ id: 'too-many-groups', sena: 'Appendix J', level: 'sena' });
  }
  return problems;
}

// A charge lying on another charge, against that charge.
function checkTertiary(field, host, group, problems) {
  if (group.tincture === null || host.tincture === null) return;
  // Counterchanging is over a division of the field (SENA A3F4); a charge on
  // another charge has no divided field behind it.
  if (group.tincture === COUNTERCHANGED) {
    problems.push({ id: 'counterchange-field', sena: 'A3F4', level: 'sena' });
    return;
  }
  if (host.tincture === COUNTERCHANGED) {
    // The charge underneath is made of the field's two tinctures. A charge
    // on it that shares one of them has nothing to stand out against there
    // (SENA A3B4b, as for a charge on a divided field).
    if (isComplete(field) && tincturesIn(field).some(t => sharesGround(t, group.tincture))) {
      problems.push({ id: 'charge-shares-tincture', sena: 'A3B4b', level: 'sena' });
    }
    return;
  }
  // A parted charge, or a charge on a parted one, that shares a tincture
  // with the other: "on a fess checky argent and gules three mullets gules".
  // The charge underneath is the background here (SENA A3B4a, quoted
  // below), so A3B4b applies as it does on the field: the two "may share a
  // tincture only if ... (2) only one of the two is multiply divided ...
  // and the charge(s) is an ordinary or simple geometric shape arranged in
  // a way that both ... are clearly identifiable." A simple shape
  // (catalog.js: SIMPLE_CHARGES) with exactly one of the two multiply
  // divided depends on the drawing (house); otherwise it is not allowed.
  const hostParted = partedOf(host.tincture), parted = partedOf(group.tincture);
  if ((hostParted || parted) && sharesGround(host.tincture, group.tincture)) {
    const hostMany = !!hostParted && familyOf(hostParted.division) !== 'two';
    const chargeMany = !!parted && familyOf(parted.division) !== 'two';
    const caseTwo = hostMany !== chargeMany && group.kind === 'charge' && SIMPLE_CHARGES.includes(group.charge);
    problems.push({ id: 'charge-shares-tincture', sena: 'A3B4b', level: caseTwo ? 'house' : 'sena' });
    return;
  }
  // SENA A3B4a: "Tertiary charge groups are considered to be placed on the
  // underlying charge group and must have good contrast with that charge
  // group."
  const under = classOf(host.tincture), over = classOf(group.tincture);
  if (!goodContrast(over, under)) {
    problems.push({ id: 'charge-low-contrast', sena: 'A3B4a', level: 'sena', hint: hintAgainst(under) });
  } else if ((hostParted || parted) && sign(over) === 0 && sign(under) === 0) {
    // (two neutrals, one of them parted: SENA A3B2, as in checkGroup)
    problems.push({ id: 'neutral-on-neutral', sena: 'A3B2', level: 'house' });
  }
}

// The same problem found twice (say, for two charges) is reported once.
function dedupe(problems) {
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
