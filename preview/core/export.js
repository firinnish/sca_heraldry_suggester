// export.js: a shield as a PNG picture, for saving.
//
// Two kinds (asked for by the maintainer, November 2026):
//   * coloured in: see-through outside the shield, and see-through wherever a
//     colour has not been chosen yet (a part of the field, a charge);
//   * outlines only: just the black lines, with nothing at all behind them.
//
// The picture is the same SVG the pages show (draw.js), turned into dots by
// the browser. Three things have to be done by hand:
//   * An SVG used as a picture may not fetch other pictures, so each charge's
//     PNG is written into the SVG itself (once, however often it is drawn).
//   * "See-through where no colour is chosen" cannot be said in SVG when a
//     charge lies over the field. So the shield is drawn twice, with the
//     unchosen things black one time and white the other. Wherever the two
//     differ, that much of the dot is something unchosen, and is taken out.
//   * For the outlines, everything is drawn white with black lines (draw.js:
//     'lines'), and then every dot keeps only as much as it is dark.
//
// Works in the browser only (it needs a canvas). Pictures must have been
// loaded first, as for drawing (art.js).

import { shieldSVG } from './draw.js';

export const PNG_WIDTH = 1000;   // dots across; the height follows the shield's shape
const LINE_DARKEST = 17;         // draw.js draws lines in #111: that counts as full black

// A picture's address -> (a promise of) the picture as a "data:" address.
const written = new Map();
function dataURL(href) {
  if (!written.has(href)) {
    const made = fetch(href)
      .then(answer => { if (!answer.ok) throw new Error(`could not load ${href}`); return answer.blob(); })
      .then(blob => new Promise((done, fail) => {
        const reader = new FileReader();
        reader.onload = () => done(reader.result);
        reader.onerror = () => fail(reader.error);
        reader.readAsDataURL(blob);
      }));
    made.catch(() => written.delete(href));     // (so that it is tried again next time)
    written.set(href, made);
  }
  return written.get(href);
}

// How draw.js writes a charge's picture (drawCharge): keep the two in step.
const IMAGE = /<image href="([^"]+)" x="([^"]+)" y="([^"]+)" width="([^"]+)" height="([^"]+)" preserveAspectRatio="none"(?: transform="([^"]*)")?/g;

// The SVG made able to stand on its own: given a size in dots, and with each
// picture written into it once and used from there wherever it is drawn.
async function standalone(svg, width) {
  const hrefs = [...new Set([...svg.matchAll(IMAGE)].map(found => found[1]))];
  const data = await Promise.all(hrefs.map(dataURL));
  const pictures = hrefs.map((href, i) => `<image id="xp${i}" href="${data[i]}" width="1" height="1" preserveAspectRatio="none"/>`).join('');
  const [, across, down] = svg.match(/viewBox="0 0 ([\d.]+) ([\d.]+)"/);
  const height = Math.round(width * down / across);
  const whole = svg
    .replace(IMAGE, (all, href, x, y, w, h, turned = '') =>
      `<use href="#xp${hrefs.indexOf(href)}" transform="${turned} translate(${x} ${y}) scale(${w} ${h})"`)
    .replace('<svg ', `<svg width="${width}" height="${height}" `)
    .replace('<defs>', `<defs>${pictures}`);
  return { svg: whole, height };
}

// The SVG as dots: { canvas, pen, image } (image.data is red, green, blue,
// opacity for each dot in turn).
async function dots(svg, width) {
  const made = await standalone(svg, width);
  const url = URL.createObjectURL(new Blob([made.svg], { type: 'image/svg+xml' }));
  try {
    const img = new Image();
    await new Promise((done, fail) => {
      img.onload = done;
      img.onerror = () => fail(new Error('the browser could not draw the shield'));
      img.src = url;
    });
    if (img.decode) await img.decode().catch(() => {});
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = made.height;
    const pen = canvas.getContext('2d', { willReadFrequently: true });
    pen.drawImage(img, 0, 0, width, made.height);
    return { canvas, pen, image: pen.getImageData(0, 0, width, made.height) };
  } finally {
    URL.revokeObjectURL(url);
  }
}

const asPNG = canvas => new Promise((done, fail) =>
  canvas.toBlob(blob => (blob ? done(blob) : fail(new Error('the browser could not make the PNG'))), 'image/png'));

// The shield as a PNG: a promise of a Blob.
//   outlines: true for the lines alone; otherwise coloured in.
export async function shieldPNG(field, groups = [], { outlines = false, width = PNG_WIDTH } = {}) {
  if (outlines) {
    const { canvas, pen, image } = await dots(shieldSVG(field, { charges: groups, mode: 'lines' }), width);
    const d = image.data;
    for (let i = 0; i < d.length; i += 4) {
      const light = (d[i] * 299 + d[i + 1] * 587 + d[i + 2] * 114) / 1000;
      const ink = Math.min(1, (255 - light) / (255 - LINE_DARKEST));
      d[i] = d[i + 1] = d[i + 2] = 0;
      d[i + 3] = Math.round(d[i + 3] * ink);
    }
    pen.putImageData(image, 0, 0);
    return asPNG(canvas);
  }
  const draw = unknown => dots(shieldSVG(field, { charges: groups, mode: 'export', unknown }), width);
  const [black, white] = await Promise.all([draw('#000'), draw('#fff')]);
  const b = black.image.data, w = white.image.data;
  for (let i = 0; i < b.length; i += 4) {
    // How much of this dot (0 to 255) is something with no colour chosen.
    const gone = Math.max(w[i] - b[i], w[i + 1] - b[i + 1], w[i + 2] - b[i + 2]);
    if (gone < 3) continue;
    const kept = 255 - gone;
    for (let k = 0; k < 3; k++) b[i + k] = kept > 0 ? Math.min(255, Math.round(b[i + k] * 255 / kept)) : 0;
    b[i + 3] = Math.round(b[i + 3] * kept / 255);
  }
  black.pen.putImageData(black.image, 0, 0);
  return asPNG(black.canvas);
}
