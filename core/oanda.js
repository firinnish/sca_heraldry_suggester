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

import { TINCTURES, DIVISIONS, ORDINARIES } from './catalog.js';

const FORM_URL = 'https://oanda.sca.org/oanda_complex.cgi';
export const MAX_PATTERNS = 10;

const isFur = field => field.type === 'plain' && TINCTURES[field.tincture].kind === 'fur';

// How a part is named on a division line (furs keep their own name).
const divisionLineName = field => (field.type === 'plain' ? field.tincture : 'multicolor');

// How a part is named on the general FIELD line (all furs are just "fur").
const fieldLineName = field =>
  field.type !== 'plain' ? 'multicolor' : isFur(field) ? 'fur' : field.tincture;

// "multicolor dark" (two colours), "multicolor light" (two metals),
// "multicolor neutral" (one of each). With furs or nested divisions the
// records are less consistent, so use plain "multicolor", which matches all.
function multicolorClass(parts) {
  if (parts.some(p => p.type !== 'plain' || isFur(p))) return 'multicolor';
  const tones = new Set(parts.map(p => TINCTURES[p.tincture].tone));
  if (tones.size === 2) return 'multicolor neutral';
  return tones.has('dark') ? 'multicolor dark' : 'multicolor light';
}

// The line for the division itself, e.g. "PPALE:azure:pl:~and argent".
function divisionLine(field) {
  const def = DIVISIONS[field.division];
  const bits = [def.code];
  if (def.tincturesIndexed !== false) {
    let names = field.parts.map(divisionLineName);
    if (!def.ordered) names = [...names].sort();
    bits.push(names[0]);
    if (def.plainLine && field.line === 'plain') bits.push('pl');
    bits.push('~and ' + names[1]);
  } else if (def.plainLine && field.line === 'plain') {
    bits.push('pl');
  }
  return bits.join(':');
}

// Division lines for any parts that are themselves divided (and their parts).
function nestedDivisionLines(field) {
  return field.parts
    .filter(p => p.type === 'divided')
    .flatMap(p => [divisionLine(p), ...nestedDivisionLines(p)]);
}

// All the search patterns describing a field.
export function fieldPatterns(field) {
  if (field.type === 'plain') return [`FIELD:${field.tincture}:solid`];

  const def = DIVISIONS[field.division];
  const fieldBits = ['FIELD', def.fieldWord, multicolorClass(field.parts)];
  if (def.tincturesIndexed !== false) {
    const names = field.parts.map(fieldLineName).sort();
    fieldBits.push('~ ' + names[0], '~and ' + names[1]);
  } else {
    fieldBits[2] = 'multicolor';
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

function groupPattern(group) {
  if (group.kind === 'ordinary') {
    const def = ORDINARIES[group.ordinary];
    const bits = [def.code];
    if (def.numbered) bits.push(String(group.number));
    bits.push(group.tincture, 'pl');
    if (!def.peripheral) bits.push('primary');
    return bits.join(':');
  }
  const bits = [group.category, String(group.number), group.tincture, 'primary'];
  if (group.posture) bits.push(group.posture);
  return bits.join(':');
}

const isPeripheral = g => g.kind === 'ordinary' && ORDINARIES[g.ordinary].peripheral;

// All the search patterns for a whole shield: the field, then each charge group.
export function shieldPatterns(field, groups = []) {
  const patterns = [...fieldPatterns(field), ...groups.map(groupPattern)];
  if (groups.length && groups.every(isPeripheral)) patterns.push('PO');
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
