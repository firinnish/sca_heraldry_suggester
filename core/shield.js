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

import { TINCTURES, DIVISIONS } from './catalog.js';

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

// A CHARGE GROUP is a set of identical charges:
//
//   { charge: 'lion', art: 'lion-rampant-1.png', number: 1, tincture: 'or', mirror: false }
//
// charge:  the id from charges/charges.csv.
// art:     a file from charges/art/, or null to draw a blob.
// number:  how many (1, 2 or 3 so far).
// mirror:  true to face sinister.
// Still to come: role (primary / secondary / tertiary / overall), posture,
// arrangement, and the blazon and O&A search patterns for charges.
export function chargeGroup({ charge, art = null, number = 1, tincture, mirror = false }) {
  if (!TINCTURES[tincture]) throw new Error('Unknown tincture: ' + tincture);
  return { charge, art, number, tincture, mirror };
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
