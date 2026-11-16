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
  base:            { name: 'base',             code: 'BASE',      numbered: false, peripheral: true },
};

export function divisionsWithParts(n) {
  return Object.keys(DIVISIONS).filter(id => DIVISIONS[id].parts === n);
}
