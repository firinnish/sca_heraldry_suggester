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
// Every tool (drawing, blazon, O&A search, later the generator) reads this
// same description. Tincture and division ids come from catalog.js.
//
// Still to come: charge groups (which charge, how many, tincture, and whether
// it is primary / secondary / tertiary / overall / peripheral).

import { TINCTURES, DIVISIONS, ORDINARIES } from './catalog.js';

export function plain(tincture) {
  if (!TINCTURES[tincture]) throw new Error('Unknown tincture: ' + tincture);
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
// number:      how many (1, 2 or 3 so far).
//
// For now every group is treated as the primary charge group.
// Still to come: secondary / tertiary / overall groups, and arrangements.
export function ordinaryGroup(ordinary, tincture) {
  if (!ORDINARIES[ordinary]) throw new Error('Unknown ordinary: ' + ordinary);
  if (!TINCTURES[tincture]) throw new Error('Unknown tincture: ' + tincture);
  return { kind: 'ordinary', ordinary, number: 1, tincture };
}

export function chargeGroup({ charge, name = charge, plural = '', category = '', posture = '',
                              inverted = false, mirror = false, art = null, artInverted = false,
                              number = 1, tincture }) {
  if (!TINCTURES[tincture]) throw new Error('Unknown tincture: ' + tincture);
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

// Every tincture used anywhere in a field, without repeats.
export function tincturesIn(field) {
  if (field.type === 'plain') return [field.tincture];
  return [...new Set(field.parts.flatMap(tincturesIn))];
}

// ---- Blazon ----------------------------------------------------------------

function fieldWords(field) {
  if (field.type === 'plain') return TINCTURES[field.tincture].name;
  const parts = field.parts.map(fieldWords);
  const list = parts.length === 2
    ? parts.join(' and ')
    : parts.slice(0, -1).join(', ') + ', and ' + parts[parts.length - 1];
  return DIVISIONS[field.division].name + ' ' + list;
}

// "Per chevron vert and lozengy Or and purpure"
export function blazonField(field) {
  const words = fieldWords(field);
  return words.charAt(0).toUpperCase() + words.slice(1);
}

const NUMBER_WORDS = { 2: 'two', 3: 'three' };

// "a lion rampant Or", "three fleurs-de-lys azure", "a chevron ermine"
export function blazonGroup(group) {
  const one = (group.kind === 'ordinary' ? ORDINARIES[group.ordinary].name : group.name).toLowerCase();
  let words;
  if (group.number === 1) {
    words = (/^[aeiou]/.test(one) ? 'an ' : 'a ') + one;
  } else {
    words = NUMBER_WORDS[group.number] + ' ' + (group.plural ? group.plural.toLowerCase() : one + 's');
  }
  if (group.posture) words += ' ' + group.posture;
  if (group.inverted) words += ' inverted';
  if (group.mirror) words += ' contourny';
  return words + ' ' + TINCTURES[group.tincture].name;
}

// The whole blazon: "Gules, a lion rampant Or"
export function blazon(field, groups = []) {
  return [blazonField(field), ...groups.map(blazonGroup)].join(', ');
}
