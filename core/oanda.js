// oanda.js: turn a shield description into what the SCA Ordinary & Armorial
// Complex Search Form needs (https://oanda.sca.org/oanda_complex.cgi).
//
// The form takes up to ten "armory description" patterns. Each pattern is a
// category code followed by features, separated by colons, for example
//
//   PPALE:azure:pl:~and argent
//   FIELD:divided palewise:multicolor neutral:~ argent:~and azure
//
// The rules below were worked out from the real records in data/oanda.db and
// are checked against them by tests/index.html:
//
//  * A plain field is            FIELD:<tincture>:solid
//  * A two-part division gets two lines:
//      <division code>:<main tincture>:pl:~and <other tincture>
//      FIELD:<divided ...>:<multicolor class>:~ <tincture>:~and <tincture>
//    On the division line the main tincture is the first-named one for
//    "per ..." divisions and quarterly, but alphabetical for gyronny, checky,
//    lozengy, paly, barry, bendy and chevronelly (catalog.js: `ordered`).
//    On the FIELD line the two tinctures are always alphabetical.
//  * A part that is a fur is "fur" on the FIELD line; a part that is itself
//    divided is "multicolor" on both lines, and gets its own division line.
//  * Three-part divisions (per pall) do not record their tinctures at all.
//  * Armory with nothing on the field is also marked FO (field only).
//
// NOT CHOSEN YET: anything the shield description leaves open (see shield.js)
// is simply left out of the pattern, so the search matches any value for it.

import { TINCTURES, DIVISIONS, ORDINARIES } from './catalog.js';
import { COUNTERCHANGED, tincturesIn, isComplete } from './shield.js';

const FORM_URL = 'https://oanda.sca.org/oanda_complex.cgi';
export const MAX_PATTERNS = 10;

const isFurTincture = t => TINCTURES[t].kind === 'fur';
const known = field => field.type !== 'plain' || field.tincture !== null;

// How a part is named on a division line (furs keep their own name).
const divisionLineName = field => (field.type === 'plain' ? field.tincture : 'multicolor');

// How a part is named on the general FIELD line (all furs are just "fur").
const fieldLineName = field =>
  field.type !== 'plain' ? 'multicolor' : isFurTincture(field.tincture) ? 'fur' : field.tincture;

// "multicolor dark" (two colours), "multicolor light" (two metals),
// "multicolor neutral" (one of each). With furs or nested divisions the
// records are less consistent, so use plain "multicolor", which matches all.
function multicolorClass(parts) {
  if (parts.some(p => p.type !== 'plain' || isFurTincture(p.tincture))) return 'multicolor';
  const tones = new Set(parts.map(p => TINCTURES[p.tincture].tone));
  if (tones.size === 2) return 'multicolor neutral';
  return tones.has('dark') ? 'multicolor dark' : 'multicolor light';
}

// The line for the division itself, e.g. "PPALE:azure:pl:~and argent".
function divisionLine(field) {
  const def = DIVISIONS[field.division];
  const bits = [def.code];
  const plainLine = def.plainLine && field.line === 'plain';
  if (def.tincturesIndexed === false) {
    if (plainLine) bits.push('pl');
  } else if (field.parts.every(known)) {
    let names = field.parts.map(divisionLineName);
    if (!def.ordered) names = [...names].sort();
    bits.push(names[0]);
    if (plainLine) bits.push('pl');
    bits.push('~and ' + names[1]);
  } else {
    // Some tinctures not chosen. Where the O&A records the first-named
    // tincture as the main one, a known first tincture can still be used.
    if (def.ordered && known(field.parts[0])) bits.push(divisionLineName(field.parts[0]));
    if (plainLine) bits.push('pl');
  }
  return bits.join(':');
}

// Division lines for any parts that are themselves divided (and their parts).
function nestedDivisionLines(field) {
  return field.parts
    .filter(p => p.type === 'divided')
    .flatMap(p => [divisionLine(p), ...nestedDivisionLines(p)]);
}

// All the search patterns describing a field (none if nothing is chosen).
export function fieldPatterns(field) {
  if (!field) return [];
  if (field.type === 'plain') return field.tincture === null ? ['FIELD:solid'] : [`FIELD:${field.tincture}:solid`];

  const def = DIVISIONS[field.division];
  const fieldBits = ['FIELD', def.fieldWord];
  if (def.tincturesIndexed === false) {
    fieldBits.push('multicolor');
  } else if (field.parts.every(known)) {
    const names = field.parts.map(fieldLineName).sort();
    fieldBits.push(multicolorClass(field.parts), '~ ' + names[0], '~and ' + names[1]);
  }
  return [divisionLine(field), fieldBits.join(':'), ...nestedDivisionLines(field)];
}

// ---- Charges ---------------------------------------------------------------
// Checked against real records (tests/index.html):
//  * A charge is   <category>:<number>:<tincture>:primary[:<posture>]
//    e.g. "Gules, a lion rampant Or" is indexed CAT:1:or:rampant to dexter:spa,
//    and "primary" and "rampant" match those more specific words.
//  * An ordinary is the same plus "pl" (plain line). Crosses and saltires
//    carry no number.
//  * A chief, bordure or base is never primary: it is just <code>:<tincture>:pl,
//    and armory with nothing else on it is also marked PO (peripheral only).
//  * A counterchanged charge is indexed as "multicolor neutral" with both of
//    the field's tinctures, alphabetically: "Per pale azure and Or, a lion
//    counterchanged" is CAT:1:multicolor neutral:rampant to dexter:spa:~ azure:~and or
//    (and the same for two or three charges).

function tinctureFeatures(group, field) {
  if (group.tincture === null) return [];
  if (group.tincture !== COUNTERCHANGED) return [group.tincture];
  const pair = isComplete(field) ? tincturesIn(field) : [];
  if (pair.length !== 2) return ['multicolor'];
  const names = pair.map(t => (isFurTincture(t) ? 'fur' : t)).sort();
  return ['multicolor neutral', '~ ' + names[0], '~and ' + names[1]];
}

function groupPattern(group, field) {
  const tincture = tinctureFeatures(group, field);
  if (group.kind === 'ordinary') {
    const def = ORDINARIES[group.ordinary];
    const bits = [def.code];
    if (def.numbered) bits.push(String(group.number));
    bits.push(...tincture, 'pl');
    if (!def.peripheral) bits.push('primary');
    return bits.join(':');
  }
  const bits = [group.category];
  if (group.number !== null) bits.push(String(group.number));
  bits.push(...tincture, 'primary');
  if (group.posture) bits.push(group.posture);
  return bits.join(':');
}

const isPeripheral = g => g.kind === 'ordinary' && ORDINARIES[g.ordinary].peripheral;

// All the search patterns for a whole shield: the field, then each charge
// group. `noCharge` true means the user has said nothing is on the field.
export function shieldPatterns(field, groups = [], { noCharge = false } = {}) {
  const patterns = [...fieldPatterns(field), ...groups.map(g => groupPattern(g, field))];
  if (groups.length && groups.every(isPeripheral)) patterns.push('PO');
  if (!groups.length && noCharge) patterns.push('FO');
  return patterns;
}

// A ready-to-click Complex Search Form link for a list of patterns.
export function complexSearchURL(patterns, { limit = 500 } = {}) {
  if (patterns.length > MAX_PATTERNS) {
    throw new Error(`The Complex Search Form only takes ${MAX_PATTERNS} patterns`);
  }
  const params = new URLSearchParams();
  for (let i = 1; i <= MAX_PATTERNS; i++) {
    params.set(`w${i}`, '1');
    params.set(`m${i}`, 'armory description');
    params.set(`p${i}`, patterns[i - 1] || '');
  }
  params.set('l', String(limit));
  params.set('s', 'score and blazon');
  params.set('d', 'modern');
  params.set('g', 'disabled');
  params.set('a', 'disabled');
  params.set('raw', 'disabled');
  params.set('rs', 'all items');
  return FORM_URL + '?' + params.toString();
}
