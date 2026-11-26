// palettes.js: the colour schemes people can choose to draw shields in.
//
// Each palette gives a colour for the seven tinctures; furs are drawn from
// these too (ermine = the argent colour with sable spots, and so on).
// `name` and `credit` are shown to users: the maintainer chooses the wording.
// `source` is where the palette was published; the page links to it.
// Codes marked APPROXIMATE were read from a picture, not published as text.

import { TINCTURES } from './catalog.js';

const FORANNAN = 'https://forannanglorach.wordpress.com/2026/10/09/a-colourblind-friendly-heraldic-palette/';
const IAGO = 'https://caerlaverockroll.com/armorial-palettes-ii/';
const DIGITAL_HERALD = 'https://digitalherald.org/2021/01/hexcodes-for-heraldic-tinctures/';

export const PALETTES = [
  { id: 'forannan', name: "Forannán's colourblind-friendly", source: FORANNAN,
    colours: { argent: '#FFFFFF', or: '#FFE122', azure: '#00BDE9', gules: '#FF513C', purpure: '#963A83', vert: '#155127', sable: '#000000' } },
  // Argent, Or and sable as in the main palette (identical in the published
  // pictures); the other four are APPROXIMATE, read from the post's picture
  // (its pixels are in a wider colour space, converted back to ordinary sRGB).
  { id: 'forannan-alt', name: "Forannán's colourblind-friendly - alternative", source: FORANNAN,
    colours: { argent: '#FFFFFF', or: '#FFE122', azure: '#2D6B92', gules: '#94110D', purpure: '#C995CB', vert: '#469A49', sable: '#000000' } },
  { id: 'insignia-anglica', name: 'Insignia Anglica (credit Iago ab Adam)', source: IAGO,
    colours: { argent: '#D0C2A5', or: '#E0B32F', azure: '#0E5979', gules: '#B93A29', purpure: '#743934', vert: '#27744A', sable: '#2D261E' } },
  { id: 'libro-normanda', name: 'Libro II della Natione Normanda (credit Iago ab Adam)', source: IAGO,
    colours: { argent: '#D7CFBF', or: '#D5AD72', azure: '#58788C', gules: '#A52F2D', purpure: '#6D2C34', vert: '#758B6A', sable: '#392F2D' } },
  { id: 'nobiliario', name: 'Nobiliario de armas de Valencia, Aragón y Cataluña (credit Iago ab Adam)', source: IAGO,
    colours: { argent: '#CAC7B5', or: '#DBCA98', azure: '#3A4B69', gules: '#A34329', purpure: '#5B5152', vert: '#5F6E4F', sable: '#0A0A07' } },
  { id: 'oscar', name: 'OSCAR reference', source: DIGITAL_HERALD,
    colours: { argent: '#FFFFFF', or: '#FFFF00', azure: '#0000D6', gules: '#D60000', purpure: '#8811DD', vert: '#00A400', sable: '#000000' } },
  { id: 'crayola', name: 'Crayola markers', source: DIGITAL_HERALD,
    colours: { argent: '#FFFFFF', or: '#FCE883', azure: '#1F75FE', gules: '#EE204D', purpure: '#926EAE', vert: '#1CAC78', sable: '#000000' } },
  { id: 'wappen-wiki', name: 'Wappen-Wiki', source: DIGITAL_HERALD,
    colours: { argent: '#F6F6F6', or: '#F2BC51', azure: '#0F6792', gules: '#BC2E2E', purpure: '#913A6A', vert: '#3E933E', sable: '#333333' } },
  { id: 'mathghamhain-bright', name: "Mathghamhain's bright", source: DIGITAL_HERALD,
    colours: { argent: '#F2F2F2', or: '#FFE500', azure: '#0433FF', gules: '#E82100', purpure: '#8F17E5', vert: '#009900', sable: '#383838' } },
  { id: 'mathghamhain-bold', name: "Mathghamhain's bold", source: DIGITAL_HERALD,
    colours: { argent: '#F2F2F2', or: '#FFD700', azure: '#0300CC', gules: '#CB0100', purpure: '#8C0099', vert: '#006600', sable: '#000000' } },
  { id: 'mathghamhain-soft', name: "Mathghamhain's soft", source: DIGITAL_HERALD,
    colours: { argent: '#F2F2F2', or: '#F1DD00', azure: '#1D6EBF', gules: '#BB2E2D', purpure: '#8C33CC', vert: '#3E9340', sable: '#383838' } },
];

export const DEFAULT_PALETTE = 'forannan';
export const paletteById = id => PALETTES.find(p => p.id === id) || PALETTES.find(p => p.id === DEFAULT_PALETTE);

// Draw everything from now on in this palette. (Drawing reads TINCTURES[t].hex
// each time, so shields drawn after this call use the new colours.)
export function usePalette(id) {
  const palette = paletteById(id);
  for (const [t, hex] of Object.entries(palette.colours)) TINCTURES[t].hex = hex;
  return palette;
}
