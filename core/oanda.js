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
// SEARCHING uses only ONE line for the field (see fieldPatterns below): AZ
// for a plain azure field, or the division line. The fuller description
// (fieldDescription) is kept so the tests can check all of it.
//
//  * A plain field is            FIELD:<tincture>:solid, and also AZ, OR...
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

import { TINCTURES, DIVISIONS, ORDINARIES, ARRANGEMENTS, ORIENTATIONS, LINES, SEMY, COTISABLE, postureCode, partedOf } from './catalog.js';
import { COUNTERCHANGED, tincturesIn, isComplete, roles, isPeripheral } from './shield.js';

const FORM_URL = 'https://oanda.sca.org/oanda_complex.cgi';
export const MAX_PATTERNS = 10;

const isFurTincture = t => TINCTURES[t].kind === 'fur';
// Vair, potent, and the furs and treatments made from two tinctures
// (catalog.js: PATTERNS): what the O&A's records say about them is set out
// at madeFieldLine and chargeTincture below.
const made = t => (TINCTURES[t].pair ? TINCTURES[t] : null);

// How a part is named on a division line (furs keep their own name). A fur
// made from two tinctures is "fur" ("Per pale azure and gules ermined Or");
// vair and its kin, and treated tinctures, are recorded now one way and now
// another, so they are left out (null) and the search matches any.
function divisionLineName(field) {
  if (field.type !== 'plain') return 'multicolor';
  const t = made(field.tincture);
  return !t ? field.tincture : t.pattern === 'ermined' ? 'fur' : null;
}
const known = field => field.type !== 'plain' || (field.tincture !== null && divisionLineName(field) !== null);

// A PLAIN FIELD of vair, of a fur made from two tinctures, or with a field
// treatment has no two-letter category: all are under FIELD TREATMENT
// headings. From the records (November 2026):
//   "Vair, a hare salient sable"          FIELD TREATMENT-VAIRY:argent:~and azure
//   "Vairy Or and gules, ..."             FIELD TREATMENT-VAIRY:gules:~and or     (alphabetical; counter-vair the same)
//   "Potent, a crescent inverted Or"      FIELD TREATMENT-POTENTY:argent:~and azure
//   "Gules ermined argent, an escallop"   FIELD TREATMENT-SEME (ERMINED):gules:~and argent  (background first)
//   "Azure masoned argent, ..."           FIELD TREATMENT-MASONED:argent          (only the masoning)
//   "Gules scaly Or, ..."                 FIELD TREATMENT-SCALY:gules:~and or     (background first)
//   "Gules papellony Or, ..."             FIELD TREATMENT-PAPELONNY:gules:~and or
function madeFieldLine(tincture) {
  const t = made(tincture), [a, b] = t.pair, [x, y] = [a, b].sort();
  switch (t.pattern) {
    case 'vairy': case 'countervairy': return `FIELD TREATMENT-VAIRY:${x}:~and ${y}`;
    case 'potenty': return `FIELD TREATMENT-POTENTY:${x}:~and ${y}`;
    case 'ermined': return `FIELD TREATMENT-SEME (ERMINED):${a}:~and ${b}`;
    case 'masoned': return `FIELD TREATMENT-MASONED:${b}`;
    case 'scaly': return `FIELD TREATMENT-SCALY:${a}:~and ${b}`;
    // "Purpure estencely Or, ..." has FIELD TREATMENT-SEME (ESTENCELY):or (only the sparks)
    case 'estencely': return `FIELD TREATMENT-SEME (ESTENCELY):${b}`;
    default: return `FIELD TREATMENT-PAPELONNY:${a}:~and ${b}`;
  }
}

// A CHARGE of one of those tinctures, from the records: "a lion passant
// regardant vair" has the word vair; "a chief vairy Or and gules" and "a
// chief potent" have multicolor neutral with both tinctures, alphabetical;
// "a wolf rampant gules ermined Or" has just fur; "a fess embattled argent,
// masoned sable" has just argent; "a chief sable scaly Or" has multicolor
// dark with both tinctures.
//
// A PARTED CHARGE ("a lion barry gules and Or": catalog.js) is indexed by its
// tinctures alone: multicolor neutral, dark or light, then the two of them
// in alphabetical order. HOW it is divided is not indexed at all, nor is a
// complex line inside it. From the records (November 2026):
//   "Gules, a wolf rampant bendy argent and sable"       DOG:1:multicolor neutral:rampant to dexter:spa:~ argent:~and sable
//   "Argent, a horse passant per pale gules and azure"   BEAST-HORSE:1:multicolor dark:passant to dexter:spa:~ azure:~and gules
//   "Gules, a cross crescenty quarterly Or and argent"   CRAC:1:multicolor light:other cross:spa:~ argent:~and or
//   "... a fess checky Or and gules between ..."         FESS:1:multicolor neutral:pl:spna:unc:~ gules:~and or
//   "... a bordure parted bordurewise indented Or and azure"   BORDURE:multicolor neutral:pl:surrounding 1 only:unc:~ azure:~and or
//     (the "pl" is the bordure's own edge)
// A part that is a fur is "fur": "a bordure per saltire counter-ermine and
// azure" has multicolor dark:~ azure:~and fur. As for a field, the class is
// then left at plain "multicolor", which finds all three. The one record of
// three parts ("a bordure tierced per pall gules, Or and argent") has
// multicolor light and no tinctures, so three parts are just "multicolor";
// so is anything with a part of vair or a made tincture, which has too few
// records to be sure of.
function partedChargeTincture(parted) {
  const parts = parted.parts.map(t => ({ type: 'plain', tincture: t }));
  if (parts.length !== 2 || parted.parts.some(made)) return ['multicolor'];
  const names = parts.map(fieldLineName).sort();
  return [multicolorClass(parts), '~ ' + names[0], '~and ' + names[1]];
}
function chargeTincture(tincture) {
  const parted = partedOf(tincture);
  if (parted) return partedChargeTincture(parted);
  const t = made(tincture);
  if (!t) return [tincture];
  const [x, y] = [...t.pair].sort();
  if (tincture === 'vair') return ['vair'];
  if (t.pattern === 'ermined') return ['fur'];
  if (t.pattern === 'masoned') return [t.pair[0]];
  return [`multicolor ${t.tone}`, '~ ' + x, '~and ' + y];
}

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
  // The line: "pl" for a plain one (where the records reliably say so), or
  // the complex line's own word in its place: "Per fess wavy vert and ..."
  // has PFESS:vert:wavy, "Per chevron embattled gules and argent"
  // PC:embattled:gules:~and argent (catalog.js: LINES).
  const line = complexLine(field) || (def.plainLine ? 'pl' : null);
  if (def.tincturesIndexed === false) {
    if (line) bits.push(line);
  } else if (field.parts.every(known)) {
    let names = field.parts.map(divisionLineName);
    if (!def.ordered) names = [...names].sort();
    bits.push(names[0]);
    if (line) bits.push(line);
    bits.push('~and ' + names[1]);
  } else {
    // Some tinctures not chosen. Where the O&A records the first-named
    // tincture as the main one, a known first tincture can still be used.
    if (def.ordered && known(field.parts[0])) bits.push(divisionLineName(field.parts[0]));
    if (line) bits.push(line);
  }
  return bits.join(':');
}
// The O&A's word for the complex line of a divided field or of an ordinary
// group, or null if its line is plain.
const complexLine = thing => (thing.line && thing.line !== 'plain' && LINES[thing.line] ? LINES[thing.line].code : null);

// Division lines for any parts that are themselves divided (and their parts).
function nestedDivisionLines(field) {
  return field.parts
    .filter(p => p.type === 'divided')
    .flatMap(p => [divisionLine(p), ...nestedDivisionLines(p)]);
}

// The category for a plain field of each tincture (my.cat: "azure field|AZ").
// The O&A gives plain fields both this and FIELD:<tincture>:solid.
const PLAIN_FIELD_CODES = {
  argent: 'AR', azure: 'AZ', counterermine: 'CE', ermine: 'ER', erminois: 'ES',
  gules: 'GU', or: 'OR', pean: 'PE', purpure: 'PU', sable: 'SA', vert: 'VT',
};

// The search pattern for the field: ONE line (the maintainer, November 2026).
// The Complex Search scores one point per matching line, and the field is
// worth one point of difference, so it must not get more lines than that.
//   plain:   the tincture's own category, e.g. AZ
//   divided: the division line, e.g. PPALE:azure:pl:~and argent
// (A part that is itself divided shows as "multicolor" on that line.)
export function fieldPatterns(field) {
  if (!field) return [];
  if (field.type === 'plain') return field.tincture === null ? ['FIELD:solid'] : [PLAIN_FIELD_CODES[field.tincture] || madeFieldLine(field.tincture)];
  return [divisionLine(field)];
}

// The fuller description of a field, as two or more lines: the division line,
// the general FIELD line and a line for each divided part. Not used for
// searching; kept because tests/index.html checks it against the records.
export function fieldDescription(field) {
  if (!field || field.type === 'plain') {
    if (field && field.tincture !== null && made(field.tincture)) return [madeFieldLine(field.tincture), 'FIELD:solid'];
    return !field ? [] : field.tincture === null ? ['FIELD:solid'] : [`FIELD:${field.tincture}:solid`];
  }
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
  if (group.tincture !== COUNTERCHANGED) return chargeTincture(group.tincture);
  const pair = isComplete(field) ? tincturesIn(field) : [];
  if (pair.length !== 2 || pair.some(made)) return ['multicolor'];
  const names = pair.map(t => (isFurTincture(t) ? 'fur' : t)).sort();
  return ['multicolor neutral', '~ ' + names[0], '~and ' + names[1]];
}

// THE PRIMARY CHARGE GROUP gets one line per thing about it (the maintainer,
// November 2026), so that the search scores each one separately:
// "Azure, a lion rampant argent" is
//   CAT:1:primary   CAT:rampant:primary   CAT:argent:primary
// (an ordinary also gets a line for its plain line of division, e.g.
// PALE:pl:primary). Anything not chosen yet gets no line; if nothing about it
// is chosen, it is just CAT:primary.
// EVERY OTHER GROUP gets a single line with everything on it:
//   a chief, bordure, orle or base       CHIEF:or:pl
//   a secondary group                    STAR:3:argent:secondary
//   a tertiary group (on another charge) ROSE:3:gules:tertiary
// Checked against real records: "Vert, a chevron between three peacocks
// argent" has BIRD:peacock:3:argent:close to dexter:second ("second" and
// "secondary" are the same word to the O&A: my.cat has group:second=secondary)
// and "Gules, on a bend Or three martlets gules" has BIRD:3:...:gules:tertiary.
// A tertiary group's number is the number on the whole shield: "three flames
// argent each charged with a heart azure" has HEART:3:azure:tertiary.
// A group whose place in the design has not been chosen (shield.js: roles)
// gets a line without "primary" or "secondary", so the search finds it
// wherever it is.
// SEMY (checked against real records): the number is "seme". Strewn charges
// alone on the field are the primary group, and the armory is also marked PS
// ("seme as primary"): "Azure semy of lyres argent" has HARP:argent:gpa:seme
// and PS:argent. Strewn around a primary charge they are "seme on field" (a
// kind of secondary), and not always given the number: "Sable semy of
// trefoils, a garb Or" has FOIL-3:or:seme on field. So that line leaves the
// number out.
// Charges strewn over ONE PART of a divided field (`part` on the group) are
// indexed no differently: "Per chevron vert crusilly Or and Or" has
// CRAC:crosslet:gpa:or:seme and PS:or; "Per chevron azure mullety argent and
// Or, a laurel wreath azure" has STAR:argent:...:seme:seme on field. The
// index does not say which part, so neither do these lines.
// The number of charges in a group. For two, three or four the search asks
// for "that many OR FEWER" (Měryem, November 2026): armory with two of the
// charge and one of something else in the same arrangement is indexed as
// two, and would still conflict with three. (Such mixed groups are not
// registered now, but were.) The O&A's number words are in my.cat: "3" is
// counted as "3 or fewer", and so are 2 and 1. There is no "5 or fewer", so
// five and six are asked for exactly.
const numberWord = n => (n === SEMY ? 'seme' : n >= 2 && n <= 4 ? `${n} or fewer` : String(n));

// A charge's posture and the way it is turned, in the O&A's own words
// (catalog.js: POSTURES and ORIENTATIONS, both checked against real records):
// "a lion passant guardant contourny" is "passant to sinister", "a sword
// bendwise" is "bendwise". A swimming bird has a word of its own ("Azure, a
// swan naiant argent" has "bird naiant to dexter"). Anything the O&A has no
// sure word for is left out.
function stanceFeatures(group) {
  if (group.kind !== 'charge') return [];
  let posture = postureCode(group.posture, !!group.mirror);
  if (posture && posture.startsWith('naiant') && /^BIRD/.test(group.category || '')) posture = 'bird ' + posture;
  return [posture, group.turned ? ORIENTATIONS[group.turned].code : null].filter(Boolean);
}

function groupLine(group, field, word, count = group.number) {
  const def = group.kind === 'ordinary' ? ORDINARIES[group.ordinary] : null;
  const bits = [def ? def.code : group.category];
  const strewnOnField = count === SEMY && word === 'secondary';
  if (strewnOnField) word = 'seme on field';
  else if ((!def || def.numbered) && count !== null) bits.push(numberWord(count));
  bits.push(...tinctureFeatures(group, field));
  if (def) bits.push(complexLine(group) || 'pl');       // "a fess wavy" has FESS:1:...:wavy where a plain one has pl
  bits.push(...stanceFeatures(group));
  if (word) bits.push(word);
  return bits.join(':');
}

function primaryLines(group, field) {
  const tincture = tinctureFeatures(group, field);
  const def = group.kind === 'ordinary' ? ORDINARIES[group.ordinary] : null;
  const code = def ? def.code : group.category;
  const number = (!def || def.numbered) && group.number !== null ? numberWord(group.number) : null;
  const lines = [];
  if (number) lines.push([code, number, 'primary']);
  if (tincture.length) lines.push([code, ...tincture, 'primary']);
  if (def) lines.push([code, complexLine(group) || 'pl', 'primary']);
  for (const feature of stanceFeatures(group)) lines.push([code, feature, 'primary']);
  if (!lines.length) lines.push([code, 'primary']);
  // A named arrangement is one more thing about the group, with a category
  // of its own: "Argent, in pale three suns sable" has INPALE:3:g3pa:sable
  // beside STAR:3:g3pa:...:sable. ("One and two" and "two and two" have none.)
  const arranged = group.arranged ? ARRANGEMENTS[group.arranged] : null;
  if (arranged && arranged.code) lines.push([arranged.code, 'primary']);
  return lines.map(bits => bits.join(':'));
}

// A chief, bordure, orle or base is <code>:<tincture>:pl. Checked against
// real records for the others: flaunches carry their number ("Or, flaunches
// azure" has FLAUNCH:2:azure:pl), a gore too but no "pl" ("... and a gore
// sinister azure" has GORE AND GUSSET:1:azure), and a canton neither
// ("... and a canton Or" has CANTON:or). See ORDINARIES in catalog.js.
function peripheralLine(group, field) {
  const def = ORDINARIES[group.ordinary];
  // ("a bordure wavy argent" has BORDURE:argent:wavy; "a chief indented Or" CHIEF:indented:or)
  const line = complexLine(group) || (def.plainLine === false ? null : 'pl');
  return [def.code, ...(def.count ? [String(def.count)] : []), ...tinctureFeatures(group, field), ...(line ? [line] : [])].join(':');
}

// All the search patterns for a whole shield: the field, then each charge
// group. `noCharge` true means the user has said nothing is on the field.
// The form takes ten lines; if a shield would need more, the tertiary
// charges' lines (which come last) are the ones left off.
export function shieldPatterns(field, groups = [], { noCharge = false } = {}) {
  const r = roles(groups);
  const patterns = [...fieldPatterns(field)], tertiary = [];
  groups.forEach((g, i) => {
    if (r[i].role === 'peripheral') patterns.push(peripheralLine(g, field));
    else if (!r[i].chosen) patterns.push(groupLine(g, field, null));
    else if (r[i].role === 'primary') patterns.push(...primaryLines(g, field));
    else patterns.push(groupLine(g, field, 'secondary'));
    // Cotises are indexed as a group of their own beside the ordinary,
    // naming it: "Pean, a bend cotised Or" has COTISES:1:bend:or:pl:second;
    // "Ermine, a pale endorsed azure" COTISES:1:azure:pale:pl:second
    // (checked on the 750 records with cotises). Voiding is not indexed at
    // all: "Argent, a pall voided sable" has only PALL:1:pl:sable:spa:unc.
    if (g.kind === 'ordinary' && g.cotised && COTISABLE[g.ordinary]) {
      patterns.push(['COTISES', '1', ...tinctureFeatures(g, field), COTISABLE[g.ordinary].word, 'pl', 'second'].join(':'));
    }
    if (g.charged) {
      const each = g.kind === 'ordinary' ? 1 : g.number;
      const count = g.charged.number === SEMY || each === SEMY ? SEMY
        : g.charged.number === null || each === null ? null : g.charged.number * each;
      tertiary.push(groupLine(g.charged, field, 'tertiary', count));
    }
  });
  const flags = [];
  if (groups.some((g, i) => r[i].role === 'primary' && r[i].chosen && g.number === SEMY)) flags.push('PS');
  if (groups.length && groups.every(isPeripheral)) flags.push('PO');
  if (!groups.length && noCharge) flags.push('FO');
  return [...patterns, ...tertiary].slice(0, MAX_PATTERNS - flags.length).concat(flags);
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
