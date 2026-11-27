// art.js: the charge library (charges/charges.csv and charges/art.csv) and
// the charge pictures themselves.
//
// Before a picture can be drawn on a shield we need to know its shape, so it
// can be made as large as its space allows. loadPicture() opens the picture,
// measures its outline, and remembers it; draw.js then looks it up.
// The same function works for a picture a visitor picks from their own
// computer (give it any unique key and an object URL).

import { fetchCSV } from './csv.js';

const LIBRARY_URL = new URL('../charges/', import.meta.url).href;
const pictures = new Map();   // key (file name) -> { href, aspect, outline, solid }

// The outline is a list of [x, y] points around the charge, in a box that is
// 1 wide and (1 / aspect) tall, measured from the box's centre.
function measure(img) {
  const scale = Math.min(1, 96 / Math.max(img.naturalWidth, img.naturalHeight));
  const w = Math.max(1, Math.round(img.naturalWidth * scale));
  const h = Math.max(1, Math.round(img.naturalHeight * scale));
  const canvas = document.createElement('canvas');
  canvas.width = w; canvas.height = h;
  const g = canvas.getContext('2d');
  g.drawImage(img, 0, 0, w, h);
  const alpha = g.getImageData(0, 0, w, h).data;
  const aspect = img.naturalWidth / img.naturalHeight;
  const left = [], right = [];
  for (let y = 0; y < h; y++) {
    let first = -1, last = -1;
    for (let x = 0; x < w; x++) {
      if (alpha[(y * w + x) * 4 + 3] > 40) { if (first < 0) first = x; last = x; }
    }
    if (first < 0) continue;
    for (const edge of [y, y + 1]) {          // top and bottom edge of this row of pixels
      const v = (edge / h - 0.5) / aspect;
      left.push([first / w - 0.5, v]);
      right.push([(last + 1) / w - 0.5, v]);
    }
  }
  const outline = left.length ? [...left, ...right.reverse()]
    : [[-0.5, -0.5 / aspect], [0.5, -0.5 / aspect], [0.5, 0.5 / aspect], [-0.5, 0.5 / aspect]];
  // Which pixels of the (shrunken) picture are part of the charge. Used to
  // place a charge ON this one, where the outline alone is not enough: the
  // gap between a lion's tail and its back is inside the outline.
  const data = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) data[i] = alpha[i * 4 + 3] > 40 ? 1 : 0;
  return { aspect, outline, solid: { w, h, data } };
}

// Where a picture's file is. Our own pictures are PNGs in charges/art/; the
// ones from the Book of Traceable Heraldic Art are SVGs in charges/tha/
// (put there, with their credits in charges/tha.csv, by tools/import_tha.py).
const hrefOf = key => LIBRARY_URL + (/\.svg$/i.test(key) ? 'tha/' : 'art/') + encodeURIComponent(key);

// Load one picture and remember its shape. Safe to call more than once.
const loading = new Map();    // key -> the promise of a picture being loaded
export function loadPicture(key, href = hrefOf(key)) {
  if (pictures.has(key)) return Promise.resolve(pictures.get(key));
  if (!loading.has(key)) {
    loading.set(key, new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const info = { href, ...measure(img) };
        pictures.set(key, info);
        loading.delete(key);
        resolve(info);
      };
      img.onerror = () => { loading.delete(key); reject(new Error('Could not load the picture ' + key)); };
      img.src = href;
    }));
  }
  return loading.get(key);
}

export const getPicture = key => pictures.get(key) || null;

// Load several of the library's pictures (rows of `all`, below); gives back
// the rows whose pictures loaded.
export async function loadPictures(rows) {
  await Promise.all(rows.map(row => loadPicture(row.file).catch(() => null)));
  return rows.filter(row => getPicture(row.file));
}

// Load the library: every charge, and what is known about every picture.
// Returns { charges, pictures, all }:
//   pictures  the pictures that are READY TO DRAW, each a row of art.csv
//             with `charge` (its row from charges.csv) and `inverted` (drawn
//             upside down). To begin with these are our own pictures. The
//             random generator picks from this list.
//   all       every picture known, ready or not: ours, then the ones from
//             Traceable Heraldic Art (rows of tha.csv; `from` is 'tha').
//             There are hundreds of those, so they are loaded only when
//             wanted: call loadPicture(row.file) before drawing one (a
//             picture not loaded is drawn as a blob).
// Every row has `shape` (its width divided by its height) when that is known
// without opening the picture.
export async function loadLibrary() {
  const [charges, art, tha] = await Promise.all([
    fetchCSV(LIBRARY_URL + 'charges.csv'),
    fetchCSV(LIBRARY_URL + 'art.csv'),
    fetchCSV(LIBRARY_URL + 'tha.csv').catch(() => []),
  ]);
  const byId = new Map(charges.map(c => [c.id, c]));
  const usable = a => byId.has(a.charge_id) && byId.get(a.charge_id).exclude !== 'TRUE';
  const row = (a, from) => ({
    posture: '', variant: '', ...a, from,
    charge: byId.get(a.charge_id),
    inverted: /\binverted\b/i.test(a.variant || ''),
    shape: Number(a.width) > 0 && Number(a.height) > 0 ? Number(a.width) / Number(a.height) : null,
  });
  const own = art.filter(a => byId.has(a.charge_id)).map(a => row(a, 'own'));
  await Promise.all(own.map(a => loadPicture(a.file).catch(() => null)));
  const ready = own.filter(a => getPicture(a.file));
  for (const a of ready) a.shape = getPicture(a.file).aspect;
  return {
    charges: charges.filter(c => c.exclude !== 'TRUE'),
    pictures: ready,
    all: [...ready, ...tha.filter(usable).map(a => row(a, 'tha'))],
  };
}
