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

import { TINCTURES, DIVISIONS, ORDINARIES } from './catalog.js';

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
// For now every group is treated as the primary charge group.
// Still to come: secondary / tertiary / overall groups, and arrangements.
export const COUNTERCHANGED = 'counterchanged';

const checkChargeTincture = t => { if (t !== COUNTERCHANGED) checkTincture(t); };

export function ordinaryGroup(ordinary, tincture) {
  if (!ORDINARIES[ordinary]) throw new Error('Unknown ordinary: ' + ordinary);
  checkChargeTincture(tincture);
  return { kind: 'ordinary', ordinary, number: 1, tincture };
}

export function chargeGroup({ charge, name = charge, plural = '', category = '', posture = '',
                              inverted = false, mirror = false, art = null, artInverted = false,
                              number = 1, tincture }) {
  checkChargeTincture(tincture);
  return { kind: 'charge', charge, name, plural, category, posture, inverted, mirror,
           art, artInverted, number, tincture };
}

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
  for (const g of groups) if (g.tincture && g.tincture !== COUNTERCHANGED) used.add(g.tincture);
  return [...used];
}

// ---- Blazon ----------------------------------------------------------------

// The words used where something has not been chosen yet. A page can pass its
// own (the maintainer writes all text shown to users).
export const PLACEHOLDER_WORDS = {
  tincture: '(any colour)',
  field: '(any background)',
  number: '(any number of)',
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

const NUMBER_WORDS = { 2: 'two', 3: 'three' };

// "a lion rampant Or", "three fleurs-de-lys azure", "a chevron counterchanged"
export function blazonGroup(group, words = PLACEHOLDER_WORDS) {
  const one = (group.kind === 'ordinary' ? ORDINARIES[group.ordinary].name : group.name).toLowerCase();
  const many = group.plural ? group.plural.toLowerCase() : one + 's';
  let text;
  if (group.number === 1) text = (/^[aeiou]/.test(one) ? 'an ' : 'a ') + one;
  else if (group.number === null) text = words.number + ' ' + many;
  else text = NUMBER_WORDS[group.number] + ' ' + many;
  if (group.posture) text += ' ' + group.posture;
  if (group.inverted) text += ' inverted';
  if (group.mirror) text += ' contourny';
  const tincture = group.tincture === COUNTERCHANGED ? COUNTERCHANGED : tinctureWord(group.tincture, words);
  return text + ' ' + tincture;
}

// The whole blazon: "Gules, a lion rampant Or"
export function blazon(field, groups = [], words = PLACEHOLDER_WORDS) {
  return [blazonField(field, words), ...groups.map(g => blazonGroup(g, words))].join(', ');
}
