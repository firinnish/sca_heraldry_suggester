// catalog.js: the vocabulary of heraldry this project knows about.
//
// Everything here is plain data. To teach the project a new tincture or field
// division, add an entry here (and, for a division, a shape in draw.js).
// The O&A codes and conventions were checked against data/mycat.txt and the
// real records in data/oanda.db (see tests/).

// ---- Tinctures -------------------------------------------------------------
// kind:  'metal' | 'colour' | 'fur'
// tone:  'light' | 'dark'   (how the O&A classes it: metals and ermine/erminois
//                            are light, colours and counter-ermine/pean dark)
// plain: the everyday word.   hex: the colour used when drawing.
// fur:   for furs, the background tincture and the tincture of the spots.
export const TINCTURES = {
  gules:   { name: 'gules',   plain: 'red',    kind: 'colour', tone: 'dark',  hex: '#C8102E' },
  vert:    { name: 'vert',    plain: 'green',  kind: 'colour', tone: 'dark',  hex: '#157F3B' },
  azure:   { name: 'azure',   plain: 'blue',   kind: 'colour', tone: 'dark',  hex: '#0056A8' },
  sable:   { name: 'sable',   plain: 'black',  kind: 'colour', tone: 'dark',  hex: '#1A1A1A' },
  purpure: { name: 'purpure', plain: 'purple', kind: 'colour', tone: 'dark',  hex: '#7B2D8B' },
  or:      { name: 'Or',      plain: 'yellow', kind: 'metal',  tone: 'light', hex: '#F2C029' },
  argent:  { name: 'argent',  plain: 'white',  kind: 'metal',  tone: 'light', hex: '#F5F5F0' },

  ermine:        { name: 'ermine',         plain: 'white with black ermine spots',  kind: 'fur', tone: 'light', fur: { field: 'argent', spots: 'sable' } },
  counterermine: { name: 'counter-ermine', plain: 'black with white ermine spots',  kind: 'fur', tone: 'dark',  fur: { field: 'sable',  spots: 'argent' } },
  erminois:      { name: 'erminois',       plain: 'yellow with black ermine spots', kind: 'fur', tone: 'light', fur: { field: 'or',     spots: 'sable' } },
  pean:          { name: 'pean',           plain: 'black with yellow ermine spots', kind: 'fur', tone: 'dark',  fur: { field: 'sable',  spots: 'or' } },
};

// The order swatches are shown in.
export const COLOUR_ORDER = ['gules', 'vert', 'azure', 'sable', 'purpure'];
export const METAL_ORDER = ['or', 'argent'];
export const FUR_ORDER = ['ermine', 'counterermine', 'erminois', 'pean'];

// ---- Field divisions -------------------------------------------------------
// name:      how it is blazoned ("per pale").
// parts:     how many tinctures it takes.
// code:      the O&A category code (from my.cat).
// fieldWord: the feature the O&A puts on the general FIELD line.
// ordered:   true  = the O&A records the first-named tincture as the main one
//                    ("Per pale azure and argent" -> PPALE:azure:~and argent).
//            false = the O&A records the two tinctures alphabetically
//                    ("Checky Or and azure" -> ...CHECKY:azure:~and or).
// plainLine: true = records reliably carry "pl" (plain line) for this division.
// tincturesIndexed: false = the O&A does not record which tinctures are used
//                    (true of the three-part divisions).
export const DIVISIONS = {
  perPale:            { name: 'per pale',             parts: 2, code: 'PPALE',  fieldWord: 'divided palewise',             ordered: true,  plainLine: true },
  perFess:            { name: 'per fess',             parts: 2, code: 'PFESS',  fieldWord: 'divided fesswise',             ordered: true,  plainLine: true },
  perBend:            { name: 'per bend',             parts: 2, code: 'PB',     fieldWord: 'divided bendwise',             ordered: true,  plainLine: true },
  perBendSinister:    { name: 'per bend sinister',    parts: 2, code: 'PBS',    fieldWord: 'divided bendwise sinister',    ordered: true,  plainLine: true },
  perChevron:         { name: 'per chevron',          parts: 2, code: 'PC',     fieldWord: 'divided chevronwise',          ordered: true,  plainLine: true },
  perChevronInverted: { name: 'per chevron inverted', parts: 2, code: 'PCI',    fieldWord: 'divided chevronwise inverted', ordered: true,  plainLine: true },
  perSaltire:         { name: 'per saltire',          parts: 2, code: 'PSALT',  fieldWord: 'divided saltirewise',          ordered: true,  plainLine: false },
  quarterly:          { name: 'quarterly',            parts: 2, code: 'QLY',    fieldWord: 'divided quarterly',            ordered: true,  plainLine: true },
  gyronny:            { name: 'gyronny',              parts: 2, code: 'GYRONNY', fieldWord: 'divided gyronny',             ordered: false, plainLine: true },
  checky:             { name: 'checky',               parts: 2, code: 'FIELD DIV.-CHECKY',            fieldWord: 'divided checky',               ordered: false, plainLine: false },
  lozengy:            { name: 'lozengy',              parts: 2, code: 'FIELD DIV.-LOZENGY OR FUSILY', fieldWord: 'divided gridlike not checky', ordered: false, plainLine: false },
  paly:               { name: 'paly',                 parts: 2, code: 'FIELD DIV.-PALY',        fieldWord: 'divided palewise',          ordered: false, plainLine: true },
  barry:              { name: 'barry',                parts: 2, code: 'FIELD DIV.-BARRY',       fieldWord: 'divided fesswise',          ordered: false, plainLine: true },
  bendy:              { name: 'bendy',                parts: 2, code: 'FIELD DIV.-BENDY',       fieldWord: 'divided bendwise',          ordered: false, plainLine: true },
  bendySinister:      { name: 'bendy sinister',       parts: 2, code: 'FIELD DIV.-BENDY*3',     fieldWord: 'divided bendwise sinister', ordered: false, plainLine: true },
  chevronelly:        { name: 'chevronelly',          parts: 2, code: 'FIELD DIV.-CHEVRONELLY', fieldWord: 'divided chevronwise',       ordered: false, plainLine: true },

  perPall:            { name: 'per pall',             parts: 3, code: 'FIELD DIV.-PER PALL',   fieldWord: 'divided pallwise',          ordered: true, plainLine: true, tincturesIndexed: false },
  perPallInverted:    { name: 'per pall inverted',    parts: 3, code: 'FIELD DIV.-PER PALL*7', fieldWord: 'divided pallwise inverted', ordered: true, plainLine: true, tincturesIndexed: false },
};

// How SENA sorts divisions for its contrast rules (SENA A3B3):
//   two:   "divided in two parts"            (any two tinctures)
//   four:  quarterly and per saltire          (any two tinctures)
//   three: per pall and per pall inverted     (one part must contrast with both others)
//   many:  everything else                    (the two tinctures must have good contrast)
const FAMILIES = {
  two: ['perPale', 'perFess', 'perBend', 'perBendSinister', 'perChevron', 'perChevronInverted'],
  four: ['quarterly', 'perSaltire'],
  three: ['perPall', 'perPallInverted'],
  many: ['gyronny', 'checky', 'lozengy', 'paly', 'barry', 'bendy', 'bendySinister', 'chevronelly'],
};
export function familyOf(division) {
  return Object.keys(FAMILIES).find(f => FAMILIES[f].includes(division));
}

// The plain tincture a tincture counts as underneath: a fur's background.
// (SENA: "No two parts may share a background tincture".)
export function baseTincture(tincture) {
  const t = TINCTURES[tincture];
  return t.fur ? t.fur.field : tincture;
}

// ---- Ordinaries ------------------------------------------------------------
// Simple geometric charges that draw.js draws itself (no picture needed).
// code:       the O&A category code (checked against real records).
// numbered:   false = the O&A does not record a number for it (cross, saltire).
// peripheral: true  = sits at the edge of the shield and is never the primary
//                     charge; armory with nothing else is "peripheral only" (PO).
export const ORDINARIES = {
  pale:            { name: 'pale',             code: 'PALE',      numbered: true },
  fess:            { name: 'fess',             code: 'FESS',      numbered: true },
  bend:            { name: 'bend',             code: 'BEND',      numbered: true },
  bendSinister:    { name: 'bend sinister',    code: 'BS',        numbered: true },
  chevron:         { name: 'chevron',          code: 'CHEVRON',   numbered: true },
  chevronInverted: { name: 'chevron inverted', code: 'CHEVRON*7', numbered: true },
  cross:           { name: 'cross',            code: 'CROSS',     numbered: false },
  saltire:         { name: 'saltire',          code: 'SALTIRE',   numbered: false },
  pall:            { name: 'pall',             code: 'PALL',      numbered: true },
  pile:            { name: 'pile',             code: 'PILE',      numbered: true },
  chief:           { name: 'chief',            code: 'CHIEF',     numbered: false, peripheral: true },
  bordure:         { name: 'bordure',          code: 'BORDURE',   numbered: false, peripheral: true },
  orle:            { name: 'orle',             code: 'ORLE AND TRESSURE', numbered: true, peripheral: true },
  base:            { name: 'base',             code: 'BASE',      numbered: false, peripheral: true },
  // Three more along the edge (the maintainer, November 2026), shaped as in
  // Traceable Heraldic Art's device forms. How the O&A's records carry them:
  // "Gules, a standing balance and a canton Or" has CANTON:or; "Or,
  // flaunches azure" has FLAUNCH:2:azure:pl (and PO); "Or, a threaded needle
  // and a gore sinister azure" has GORE AND GUSSET:1:azure.
  // count:     how many the O&A's line says (flaunches come as a pair).
  // plainLine: false = its records carry no "pl".
  // plural:    how the blazon names it when it is a pair ("flaunches").
  canton:          { name: 'canton',           code: 'CANTON',    numbered: false, peripheral: true, plainLine: false },
  flaunches:       { name: 'flaunch', plural: 'flaunches', code: 'FLAUNCH', numbered: true, peripheral: true, count: 2 },
  gore:            { name: 'gore',             code: 'GORE AND GUSSET', numbered: true, peripheral: true, count: 1, plainLine: false },
};
// What to call an ordinary on a button or in a list: "flaunches", "chevron".
export const ordinaryLabel = id => (ORDINARIES[id].count === 2 ? ORDINARIES[id].plural : ORDINARIES[id].name);

// ---- Arrangements ----------------------------------------------------------
// How the charges of one group are set out, when it is not simply the usual
// way for their number: "in pale three roundels", "in chevron five swords".
// name:    how it is blazoned.
// code:    the O&A category (my.cat: "arrangement, in pale|INPALE"). Real
//          records carry it as a line of its own beside the charge's:
//          "Argent, in pale three suns sable" has INPALE:3:g3pa:sable.
//          null = the O&A has no category for it (checked: "three
//          escallops one and two vert" has only the escallops' own line).
// numbers: how many charges the tools can set out this way.
// after:   true = blazoned after the charge ("four mullets two and two"),
//          not before it ("in pale three suns"), as in the O&A's records.
// The standard arrangements are listed in SENA Appendix K; "in chevron" is
// not among them but is a category of the O&A.
const LINE = [2, 3, 4, 5, 6];
export const ARRANGEMENTS = {
  pale:            { name: 'in pale',             code: 'INPALE',                   numbers: LINE },
  fess:            { name: 'in fess',             code: 'ARRANGEMENT-IN FESS',      numbers: LINE },
  bend:            { name: 'in bend',             code: 'ARRANGEMENT-IN BEND',      numbers: LINE },
  bendSinister:    { name: 'in bend sinister',    code: 'ARRANGEMENT-IN BEND*3',    numbers: LINE },
  chevron:         { name: 'in chevron',          code: 'ARRANGEMENT-IN CHEVRON',   numbers: [3, 5] },
  chevronInverted: { name: 'in chevron inverted', code: 'ARRANGEMENT-IN CHEVRON*7', numbers: [3, 5] },
  cross:           { name: 'in cross',            code: 'ARRANGEMENT-IN CROSS',     numbers: [4, 5] },
  saltire:         { name: 'in saltire',          code: 'INSA',                     numbers: [4, 5] },
  oneAndTwo:       { name: 'one and two',         code: null,                       numbers: [3], after: true },
};
// The arrangements a group of `number` charges can be given.
export const arrangementsFor = number => Object.keys(ARRANGEMENTS).filter(id => ARRANGEMENTS[id].numbers.includes(number));
// The usual arrangement for each number, which a blazon does not mention
// (the Glossary's Table 7; two side by side, and four two and two, are the
// maintainer's: the table gives four no default).
export const USUAL_ARRANGEMENT = { 2: 'side by side', 3: 'two and one', 4: 'two and two', 5: 'two, two and one', 6: 'three, two and one' };

// Charges around an ordinary where the blazon has to say how they are set
// out, because there is no default: "a cross between in bend two roundels"
// (the maintainer, November 2026; the O&A has some fifty blazons like it).
export const AROUND_NAMED = { cross: { 2: 'in bend' } };

// ---- Postures and orientations ------------------------------------------------
// POSTURES: what the O&A calls each posture a blazon may name. Each entry is
// [the words in the blazon, the O&A's word, its word when the charge faces
// sinister ("contourny")]. The longest entry found in a blazon's posture
// words wins, so "sejant erect" is found before "sejant". Worked out from
// the records of armory with one charge (November 2026): "a bear sejant
// erect" and "a bear statant erect" are indexed "rampant to dexter", "a stag
// springing" likewise, "a stag trippant" is "passant to dexter", "a stag at
// gaze" is "statant to dexter", "a winged lion sejant affronty" is
// "affronte", "a dolphin haurient" is "hauriant". The O&A has both "rampant
// to dexter" and plain "rampant", which finds either way round; birds
// rising, volant, striking or stooping have no plain word, only "to dexter"
// and "to sinister". Guardant and regardant are not indexed. Words not
// listed (lodged, tergiant, embowed...) had too few records to be sure of,
// so they are left out of the search.
export const POSTURES = [
  ['sejant affronty', 'affronte', 'affronte'],
  ['sejant erect', 'rampant', 'rampant to sinister'],
  ['statant erect', 'rampant', 'rampant to sinister'],
  ['at gaze', 'statant', 'statant to sinister'],
  ['rampant', 'rampant', 'rampant to sinister'],
  ['segreant', 'rampant', 'rampant to sinister'],
  ['springing', 'rampant', 'rampant to sinister'],
  ['salient', 'salient', 'salient to sinister'],
  ['passant', 'passant', 'passant to sinister'],
  ['trippant', 'passant', 'passant to sinister'],
  ['statant', 'statant', 'statant to sinister'],
  ['couchant', 'couchant', 'couchant to sinister'],
  ['dormant', 'dormant', 'dormant to sinister'],
  ['courant', 'courant', 'courant to sinister'],
  ['sejant', 'sejant', 'sejant to sinister'],
  ['affronty', 'affronte', 'affronte'],
  ['displayed', 'displayed', 'displayed'],
  ['close', 'close', 'close to sinister'],
  ['rising', 'rising to dexter', 'rising to sinister'],
  ['volant', 'volant to dexter', 'volant to sinister'],
  ['striking', 'striking to dexter', 'striking to sinister'],
  ['stooping', 'stooping to dexter', 'stooping to sinister'],
  ['haurient', 'hauriant', 'hauriant'],
  ['naiant', 'naiant to dexter', 'naiant to sinister'],
];
// The O&A's word for a posture as blazoned ("passant guardant" -> "passant"),
// or null if it has none we are sure of.
export function postureCode(words, toSinister = false) {
  const text = ` ${String(words || '').toLowerCase()} `;
  const found = POSTURES.filter(p => text.includes(` ${p[0]} `)).sort((a, b) => b[0].length - a[0].length)[0];
  return found ? found[toSinister ? 2 : 1] : null;
}

// ORIENTATIONS: the ways a charge can be turned to lie along a line of the
// shield. `name` is the blazon's word and `code` the O&A's (my.cat's
// "orientation" words). `tall` and `wide` are how far the picture is turned,
// in degrees clockwise, for a picture that is drawn upright (a sword, point
// up) and one drawn lying down (a fish, head to dexter): a sword fesswise
// has its point to dexter, a sword bendwise its point to dexter chief.
export const ORIENTATIONS = {
  palewise:     { name: 'palewise',          code: 'palewise',          tall: 0,   wide: 90 },
  fesswise:     { name: 'fesswise',          code: 'fesswise',          tall: -90, wide: 0 },
  bendwise:     { name: 'bendwise',          code: 'bendwise',          tall: -45, wide: 45 },
  bendSinister: { name: 'bendwise sinister', code: 'bendwise sinister', tall: 45,  wide: -45 },
};
// Is a picture drawn lying down (a fish, a lion passant: head to dexter)
// rather than upright (a sword, a lion rampant)? Its posture says, if it has
// one; otherwise a picture this much wider than it is tall is lying down.
export const LYING = 1.25;
const UPRIGHT_POSTURES = /\b(rampant|salient|segreant|springing|sejant|displayed|haurient|hauriant|erect|rising|affronty)\b/;
const LYING_POSTURES = /\b(statant|passant|courant|couchant|dormant|naiant|trippant|lodged|at gaze)\b/;
export function isLying(shape, posture = '') {
  if (UPRIGHT_POSTURES.test(posture)) return false;      // ("statant erect" is upright)
  if (LYING_POSTURES.test(posture)) return true;
  return shape >= LYING;
}
// How far a picture of this shape (width / height) and posture is turned for an orientation.
export const turnFor = (orientation, shape, posture = '') =>
  (ORIENTATIONS[orientation] ? ORIENTATIONS[orientation][isLying(shape, posture) ? 'wide' : 'tall'] : 0);

// SEMY: instead of a number, a group's `number` can be SEMY: the charges are
// strewn over the whole field (or over the ordinary they lie on), as many as
// fit. "Azure semy of mullets Or."
export const SEMY = 'semy';

export function divisionsWithParts(n) {
  return Object.keys(DIVISIONS).filter(id => DIVISIONS[id].parts === n);
}
