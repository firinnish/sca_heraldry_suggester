// shield.js: the shared description of a shield, and turning it into a blazon.
//
// A FIELD (the background) is one of:
//
//   { type: 'plain',   tincture: 'azure' }
//   { type: 'divided', division: 'perChevron', line: 'plain', parts: [FIELD, FIELD] }
//
// Each part of a divided field is itself a field, so
// "per chevron vert and lozengy Or and purpure" is simply:
//
//   divided('perChevron', [ plain('vert'),
//                           divided('lozengy', [plain('or'), plain('purpure')]) ])
//
// Every tool (drawing, blazon, O&A search, the rules, the generator) reads
// this same description. Tincture and division ids come from catalog.js.
//
// NOT CHOSEN YET. A shield can be described before everything is decided:
//   * a tincture of null means "no colour chosen yet";
//   * a field of null means "nothing chosen about the background yet";
//   * a charge group's number of null means "any number".
// Drawing shows these in grey, the blazon says so in words, the search leaves
// them out, and the rules skip whatever they cannot judge yet.

import { TINCTURES, DIVISIONS, ORDINARIES, ARRANGEMENTS, AROUND_NAMED, SEMY } from './catalog.js';

const checkTincture = t => {
  if (t !== null && !TINCTURES[t]) throw new Error('Unknown tincture: ' + t);
};

export function plain(tincture) {
  checkTincture(tincture);
  return { type: 'plain', tincture };
}

export function divided(division, parts, line = 'plain') {
  const def = DIVISIONS[division];
  if (!def) throw new Error('Unknown division: ' + division);
  if (parts.length !== def.parts) {
    throw new Error(`${def.name} needs ${def.parts} parts, got ${parts.length}`);
  }
  return { type: 'divided', division, line, parts };
}

// A CHARGE GROUP is a set of identical charges. Two kinds:
//
//   { kind: 'ordinary', ordinary: 'chevron', number: 1, tincture: 'or' }
//
//   { kind: 'charge', charge: 'lion', name: 'lion', plural: 'lions',
//     category: 'CAT', posture: 'rampant', inverted: false, mirror: false,
//     art: 'lion-rampant-1.png', artInverted: false,
//     number: 1, tincture: 'or' }
//
// charge / name / plural / category come from charges/charges.csv
//   (category is the O&A category code).
// posture:     the O&A's word for it ('rampant'), or '' if none.
// inverted:    true if the charge is upside down on the shield.
// mirror:      true if it faces sinister.
// art:         a picture from charges/art/, or null to draw a blob.
// artInverted: true if that picture was drawn upside down; the drawing code
//              turns it over as needed, so one picture serves both ways up.
// number:      how many (1, 2 or 3 so far), or null for "any number".
// tincture:    a tincture id, COUNTERCHANGED, or null for "not chosen yet".
//
// COUNTERCHANGED: on a field of two tinctures the charge takes the opposite
// tincture to whatever is behind it. On "per pale azure and argent" a charge
// in the middle becomes per pale argent and azure; a charge sitting wholly on
// the azure half is simply argent.
//
//
// SEVERAL CHARGE GROUPS (SENA Appendix I, "Charge Group Theory").
// A shield's `groups` lists the charge groups that lie ON THE FIELD. Any of
// them may also carry:
//
//   role:    'primary'    the charge(s) in the middle of the shield
//            'secondary'  charges around the primary ones
//            null         not chosen yet (see roles() below, which works out
//                         what it can and guesses the rest so it can be drawn)
//   place:   for a secondary group, where it is:
//            'around'  "a chevron between three lions"
//            'chief'   "a fess and in chief a lion"      (above the primary)
//            'base'    "a chevron and in base a lion"    (below it)
//   charged: a charge group lying ON this one instead of on the field: its
//            TERTIARY charges ("on a chevron three lions"), or null. When the
//            group has several charges, `charged.number` is how many lie on
//            EACH ("three roundels each charged with a mullet" is number 1).
//   arranged: how the group's own charges are set out, when it is not the
//            usual way for their number: 'pale' ("in pale three roundels"),
//            'chevron', 'oneAndTwo'... (catalog.js: ARRANGEMENTS), or null
//            for the usual way (two side by side, three two and one, four
//            two and two, five two, two and one, six three, two and one).
//            For now only the primary group can be set out differently.
//   number:  may also be SEMY (catalog.js): strewn over the field, or over
//            the ordinary the group lies on, as many as fit.
//
// A chief, bordure, orle or base is always a secondary group of its own kind
// ("peripheral"), whatever `role` says, and a central ordinary is always the
// primary group: SENA leaves no choice there.
// Still to come: overall charges, semy, cotises, two kinds of charge in one
// group, and arrangements other than the defaults.
export const COUNTERCHANGED = 'counterchanged';

const checkChargeTincture = t => { if (t !== COUNTERCHANGED) checkTincture(t); };

export function ordinaryGroup(ordinary, tincture, { role = null, place = null, charged = null } = {}) {
  if (!ORDINARIES[ordinary]) throw new Error('Unknown ordinary: ' + ordinary);
  checkChargeTincture(tincture);
  return { kind: 'ordinary', ordinary, number: 1, tincture, role, place, charged };
}

export function chargeGroup({ charge, name = charge, plural = '', category = '', posture = '',
                              inverted = false, mirror = false, art = null, artInverted = false,
                              number = 1, tincture, role = null, place = null, charged = null, arranged = null }) {
  checkChargeTincture(tincture);
  if (arranged !== null && !ARRANGEMENTS[arranged]) throw new Error('Unknown arrangement: ' + arranged);
  return { kind: 'charge', charge, name, plural, category, posture, inverted, mirror,
           art, artInverted, number, tincture, role, place, charged, arranged };
}

// ---- What each group on the field is ---------------------------------------------

export const isPeripheral = g => g.kind === 'ordinary' && !!ORDINARIES[g.ordinary].peripheral;
export const isCentralOrdinary = g => g.kind === 'ordinary' && !ORDINARIES[g.ordinary].peripheral;

// Two groups are the same type of charge if they are the same ordinary or
// the same charge from charges.csv (whatever their posture, number or colour).
export const typeOf = g => (g.kind === 'ordinary' ? 'ordinary:' + g.ordinary : 'charge:' + g.charge);

// Every charge group of a shield, those lying on other charges included.
export const allGroups = groups => groups.flatMap(g => (g.charged ? [g, g.charged] : [g]));

// For each group on the field, in turn, what it is:
//   { role: 'primary' | 'secondary' | 'peripheral', place, chosen, clash }
// chosen: false = nobody has said; this is a guess, so that the shield can
//                 still be drawn. The blazon then says the arrangement is
//                 open, and the search leaves it out.
// clash:  true  = what was asked for cannot be (two primary groups, or a
//                 charge called primary beside a central ordinary); rules.js
//                 reports it.
// The rules it follows are SENA's (Appendix I1 and I2):
//   "A peripheral ordinary ... can never be a primary charge."
//   "If the armory has at least one central ordinary, they are the primary
//    charge group. This is true even if there are other charges around it".
//   A charge with nothing else in the middle of the field is the primary
//   charge wherever it sits, so one group alone is always primary.
export function roles(groups) {
  const out = groups.map(g => (isPeripheral(g) ? { role: 'peripheral', place: null, chosen: true, clash: false } : null));
  const rest = groups.map((g, i) => i).filter(i => !out[i]);
  if (!rest.length) return out;
  if (rest.length === 1) {
    out[rest[0]] = { role: 'primary', place: null, chosen: true, clash: false };
    return out;
  }
  const ordinary = rest.find(i => isCentralOrdinary(groups[i]));
  const named = rest.find(i => groups[i].role === 'primary');
  const open = rest.find(i => groups[i].role === null || groups[i].role === undefined);
  const primary = ordinary ?? named ?? open ?? rest[0];
  const sure = ordinary !== undefined || named !== undefined;
  out[primary] = { role: 'primary', place: null, chosen: sure, clash: false };
  for (const i of rest) {
    if (i === primary) continue;
    const g = groups[i];
    const place = g.place || (g.number === 1 ? 'chief' : 'around');
    const clash = isCentralOrdinary(g) || g.role === 'primary';
    out[i] = { role: 'secondary', place, chosen: (clash || g.role === 'secondary') && sure, clash };
  }
  return out;
}

// True when every group's place in the design has been chosen (or follows
// from SENA), so nothing about the arrangement is a guess.
export const isArranged = groups => roles(groups).every(r => r.chosen);

// A charge group made from a row of charges.csv and (optionally) a picture
// row from art.csv, as returned by loadLibrary() in art.js.
export function chargeGroupFromLibrary(charge, picture, options) {
  return chargeGroup({
    charge: charge.id, name: charge.name, plural: charge.plural, category: charge.oanda_category,
    posture: picture ? picture.posture : '',
    art: picture ? picture.file : null,
    artInverted: picture ? picture.inverted : false,
    ...options,
  });
}

// ---- Looking inside a field -------------------------------------------------

// Every tincture in a field, in blazon order, repeats included (null = not chosen).
export function leafTinctures(field) {
  if (!field) return [];
  if (field.type === 'plain') return [field.tincture];
  return field.parts.flatMap(leafTinctures);
}

// Every tincture used anywhere in a field, without repeats or unknowns.
export function tincturesIn(field) {
  return [...new Set(leafTinctures(field))].filter(t => t !== null);
}

// True when the whole background has been decided.
export function isComplete(field) {
  return !!field && leafTinctures(field).every(t => t !== null);
}

export const isNested = field =>
  !!field && field.type === 'divided' && field.parts.some(p => p.type === 'divided');

// The same field with its two tinctures swapped: what a counterchanged charge
// is painted with. Null if the field is not made of exactly two tinctures.
export function counterchangedField(field) {
  if (!isComplete(field)) return null;
  const pair = tincturesIn(field);
  if (pair.length !== 2) return null;
  const swap = f => (f.type === 'plain'
    ? plain(f.tincture === pair[0] ? pair[1] : pair[0])
    : { ...f, parts: f.parts.map(swap) });
  return swap(field);
}

// Every tincture a whole shield uses (a counterchanged charge adds none).
export function shieldTinctures(field, groups = []) {
  const used = new Set(tincturesIn(field));
  for (const g of allGroups(groups)) if (g.tincture && g.tincture !== COUNTERCHANGED) used.add(g.tincture);
  return [...used];
}

// ---- Blazon ----------------------------------------------------------------

// The words used where something has not been chosen yet. A page can pass its
// own (the maintainer writes all text shown to users).
export const PLACEHOLDER_WORDS = {
  tincture: '(any colour)',
  field: '(any background)',
  number: '(any number of)',
  arrangement: '(arranged any way)',
};

const tinctureWord = (t, words) => (t === null ? words.tincture : TINCTURES[t].name);

function fieldWords(field, words) {
  if (field.type === 'plain') return tinctureWord(field.tincture, words);
  const parts = field.parts.map(p => fieldWords(p, words));
  const list = parts.length === 2
    ? parts.join(' and ')
    : parts.slice(0, -1).join(', ') + ', and ' + parts[parts.length - 1];
  return DIVISIONS[field.division].name + ' ' + list;
}

// "Per chevron vert and lozengy Or and purpure"
export function blazonField(field, words = PLACEHOLDER_WORDS) {
  const text = field ? fieldWords(field, words) : words.field;
  return text.charAt(0).toUpperCase() + text.slice(1);
}

const NUMBER_WORDS = { 2: 'two', 3: 'three', 4: 'four', 5: 'five', 6: 'six' };

// A group without its tincture: "a lion rampant", "three fleurs-de-lys".
function groupWords(group, words) {
  const one = (group.kind === 'ordinary' ? ORDINARIES[group.ordinary].name : group.name).toLowerCase();
  const many = group.plural ? group.plural.toLowerCase() : one + 's';
  let text;
  if (group.number === 1) text = (/^[aeiou]/.test(one) ? 'an ' : 'a ') + one;
  else if (group.number === SEMY) text = 'semy of ' + many;
  else if (group.number === null) text = words.number + ' ' + many;
  else text = (NUMBER_WORDS[group.number] || group.number) + ' ' + many;
  if (group.posture) text += ' ' + group.posture;
  if (group.inverted) text += ' inverted';
  if (group.mirror) text += ' contourny';
  // How they are set out, if not the usual way: "in pale three roundels",
  // "four mullets two and two".
  const arranged = group.arranged ? ARRANGEMENTS[group.arranged] : null;
  if (arranged) text = arranged.after ? `${text} ${arranged.name}` : `${arranged.name} ${text}`;
  return text;
}

const groupTincture = (group, words) =>
  (group.tincture === COUNTERCHANGED ? COUNTERCHANGED : tinctureWord(group.tincture, words));

// "a lion rampant Or", "three fleurs-de-lys azure", "a chevron counterchanged"
export function blazonGroup(group, words = PLACEHOLDER_WORDS) {
  return groupWords(group, words) + ' ' + groupTincture(group, words);
}

// A group together with whatever lies on it:
//   "a lion Or"      "on a fess Or three mullets sable"
//   "three roundels Or each charged with a mullet sable"
// `bare` leaves out the group's own tincture, for when the next thing in the
// blazon is the same tincture and names it for both ("a chevron between three
// mullets Or"). `between` is a secondary group to work in after the group.
function groupPhrase(group, words, { bare = false, between = null } = {}) {
  const own = groupWords(group, words) + (bare ? '' : ' ' + groupTincture(group, words));
  // "a cross between in bend two roundels": where there is no default, the
  // blazon says how the charges around an ordinary are set out.
  const named = between && group.kind === 'ordinary' ? (AROUND_NAMED[group.ordinary] || {})[between.number] : null;
  const around = between ? ` between ${named ? named + ' ' : ''}${blazonGroup(between, words)}` : '';
  if (!group.charged) return own + around;
  const on = blazonGroup(group.charged, words);
  // "a fess Or semy of mullets gules": strewn charges are not "on" it
  if (group.charged.number === SEMY) return `${own} ${on}${around}`;
  const several = group.kind !== 'ordinary' && group.number !== 1;
  return several ? `${own} each charged with ${on}${around}` : `on ${own}${around} ${on}`;
}

// A tincture named once can serve two neighbouring groups.
const sameTincture = (a, b) => a.tincture !== null && a.tincture === b.tincture;

// Everything on the field, in the order a blazon gives it: the primary
// group, the groups around it, then chief, bordure and the like.
//   "a chevron between three lions Or"
//   "on a fess Or three mullets sable and in chief a lion argent"
//   "a chevron between three cushions argent, a bordure Or"
//   "a tower and on a chief argent three trees vert"
function groupsWords(groups, words) {
  const r = roles(groups);
  // Not arranged yet: just list what is on the shield, and say so.
  if (!r.every(x => x.chosen)) {
    return groups.map(g => groupPhrase(g, words)).join(', ') + ' ' + (words.arrangement || PLACEHOLDER_WORDS.arrangement);
  }
  const primary = groups.find((g, i) => r[i].role === 'primary');
  const secondaries = groups.map((g, i) => ({ g, place: r[i].place })).filter((x, i) => r[i].role === 'secondary');
  const peripherals = groups.filter((g, i) => r[i].role === 'peripheral');
  const pieces = [];
  if (primary) {
    const first = secondaries[0];
    const charged = !!primary.charged;
    const several = primary.kind !== 'ordinary' && primary.number !== 1;
    let text;
    if (!first) {
      // "a lion and a bordure Or": one tincture for the charge and the one thing with it
      const only = peripherals.length === 1 && !charged && sameTincture(primary, peripherals[0]);
      text = groupPhrase(primary, words, { bare: only });
    } else if (first.place === 'around') {
      const bare = sameTincture(primary, first.g) && !(charged && several);
      text = groupPhrase(primary, words, { bare, between: first.g });
    } else {
      const where = first.place === 'chief' ? 'in chief' : 'in base';
      const bare = sameTincture(primary, first.g) && !charged;
      text = `${groupPhrase(primary, words, { bare })} and ${where} ${blazonGroup(first.g, words)}`;
    }
    for (const s of secondaries.slice(1)) {
      text += `, ${s.place === 'chief' ? 'in chief ' : s.place === 'base' ? 'in base ' : ''}${groupPhrase(s.g, words)}`;
    }
    pieces.push(text);
  }
  for (const g of peripherals) pieces.push(groupPhrase(g, words));
  // Two things read best joined by "and"; more, or anything after a
  // "between", are set off with commas.
  return pieces.length === 2 && !secondaries.length ? pieces.join(' and ') : pieces.join(', ');
}

// The whole blazon: "Gules, a lion rampant Or"
export function blazon(field, groups = [], words = PLACEHOLDER_WORDS) {
  // Charges strewn over the field are named with the field, before anything
  // else: "Azure semy of lyres argent", "Argent semy of violets purpure, a
  // crescent sable", "Sable semy of trefoils, a garb Or" (the O&A's wording).
  const r = roles(groups);
  const strewn = r.every(x => x.chosen)
    ? groups.filter((g, i) => g.number === SEMY && (r[i].role === 'primary' || (r[i].role === 'secondary' && r[i].place === 'around')))
    : [];
  const rest = groups.filter(g => !strewn.includes(g));
  const next = rest.find((g, i) => roles(rest)[i].role === 'primary') || rest[0];
  const fieldText = blazonField(field, words) + strewn.map(g =>
    ' ' + groupWords(g, words) + (next && sameTincture(g, next) ? '' : ' ' + groupTincture(g, words))).join('');
  return [fieldText, ...(rest.length ? [groupsWords(rest, words)] : [])].join(', ');
}
