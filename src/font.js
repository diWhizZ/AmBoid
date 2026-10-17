// Font 5x7 px w stylu bitmapowych fontów z epoki, z polskimi znakami.
// Wszystko jest rysowane ręcznie z indeksów palety — zero czcionek systemowych.

import { C } from './palette.js';

const G = (s) => s.trim().split(/\s+/);

const BASE = {
  ' ': G('00000 00000 00000 00000 00000 00000 00000'),
  A: G('01110 10001 10001 11111 10001 10001 10001'),
  B: G('11110 10001 10001 11110 10001 10001 11110'),
  C: G('01111 10000 10000 10000 10000 10000 01111'),
  D: G('11110 10001 10001 10001 10001 10001 11110'),
  E: G('11111 10000 10000 11110 10000 10000 11111'),
  F: G('11111 10000 10000 11110 10000 10000 10000'),
  G: G('01111 10000 10000 10111 10001 10001 01110'),
  H: G('10001 10001 10001 11111 10001 10001 10001'),
  I: G('11111 00100 00100 00100 00100 00100 11111'),
  J: G('00111 00010 00010 00010 00010 10010 01100'),
  K: G('10001 10010 10100 11000 10100 10010 10001'),
  L: G('10000 10000 10000 10000 10000 10000 11111'),
  M: G('10001 11011 10101 10101 10001 10001 10001'),
  N: G('10001 11001 10101 10011 10001 10001 10001'),
  O: G('01110 10001 10001 10001 10001 10001 01110'),
  P: G('11110 10001 10001 11110 10000 10000 10000'),
  Q: G('01110 10001 10001 10001 10101 10010 01101'),
  R: G('11110 10001 10001 11110 10100 10010 10001'),
  S: G('01111 10000 10000 01110 00001 00001 11110'),
  T: G('11111 00100 00100 00100 00100 00100 00100'),
  U: G('10001 10001 10001 10001 10001 10001 01110'),
  V: G('10001 10001 10001 10001 10001 01010 00100'),
  W: G('10001 10001 10001 10101 10101 11011 10001'),
  X: G('10001 10001 01010 00100 01010 10001 10001'),
  Y: G('10001 10001 01010 00100 00100 00100 00100'),
  Z: G('11111 00001 00010 00100 01000 10000 11111'),
  0: G('01110 10011 10101 10101 10101 11001 01110'),
  1: G('00100 01100 00100 00100 00100 00100 01110'),
  2: G('01110 10001 00001 00110 01000 10000 11111'),
  3: G('11110 00001 00001 01110 00001 00001 11110'),
  4: G('00010 00110 01010 10010 11111 00010 00010'),
  5: G('11111 10000 11110 00001 00001 10001 01110'),
  6: G('01110 10000 10000 11110 10001 10001 01110'),
  7: G('11111 00001 00010 00100 01000 01000 01000'),
  8: G('01110 10001 10001 01110 10001 10001 01110'),
  9: G('01110 10001 10001 01111 00001 00001 01110'),
  '.': G('00000 00000 00000 00000 00000 00000 00100'),
  ',': G('00000 00000 00000 00000 00000 00100 01000'),
  ':': G('00000 00000 00100 00000 00000 00100 00000'),
  ';': G('00000 00000 00100 00000 00000 00100 01000'),
  '!': G('00100 00100 00100 00100 00100 00000 00100'),
  '?': G('01110 10001 00001 00010 00100 00000 00100'),
  '-': G('00000 00000 00000 01110 00000 00000 00000'),
  '+': G('00000 00100 00100 11111 00100 00100 00000'),
  '/': G('00001 00010 00010 00100 01000 01000 10000'),
  '\\': G('10000 01000 01000 00100 00010 00010 00001'),
  '(': G('00010 00100 01000 01000 01000 00100 00010'),
  ')': G('01000 00100 00010 00010 00010 00100 01000'),
  '[': G('00110 00100 00100 00100 00100 00100 00110'),
  ']': G('01100 00100 00100 00100 00100 00100 01100'),
  '<': G('00010 00100 01000 10000 01000 00100 00010'),
  '>': G('01000 00100 00010 00001 00010 00100 01000'),
  '=': G('00000 00000 11111 00000 11111 00000 00000'),
  '<>': G('01010 01010 00100 00100 00100 01010 01010'),
  "'": G('00100 00100 00000 00000 00000 00000 00000'),
  '"': G('01010 01010 00000 00000 00000 00000 00000'),
  '*': G('00000 10101 01110 11111 01110 10101 00000'),
  '%': G('11001 11010 00010 00100 01000 01011 10011'),
  '#': G('00000 01010 11111 01010 11111 01010 00000'),
  '&': G('01100 10010 10100 01000 10101 10010 01101'),
  '@': G('01110 10001 10111 10101 10111 10000 01110'),
  '^': G('00100 01010 10001 00000 00000 00000 00000'),
  '_': G('00000 00000 00000 00000 00000 00000 11111'),
  '|': G('00100 00100 00100 00100 00100 00100 00100'),
  '~': G('00000 00000 01001 10110 00000 00000 00000'),
  '·': G('00000 00000 00000 00100 00000 00000 00000'),
  '•': G('00000 00000 01110 01110 01110 00000 00000'),
  '←': G('00000 00100 00010 11111 00010 00100 00000'),
  '→': G('00000 00100 01000 11111 01000 00100 00000'),
  '↑': G('00100 01110 10101 00100 00100 00100 00000'),
  '↓': G('00100 00100 00100 10101 01110 00100 00000'),
};

// Znaki z diakrytykami: bazowy glif + dodatkowe piksele.
const MARKS = {
  ACUTE: [[3, -1], [2, -2]],
  DOT: [[2, -2]],
  OGONEK: [[3, 7], [2, 8]],
};

const SPECIAL = {
  'Ą': { base: 'A', marks: [MARKS.OGONEK], width: 6 },
  'Ć': { base: 'C', marks: [MARKS.ACUTE], width: 6 },
  'Ę': { base: 'E', marks: [MARKS.OGONEK], width: 6 },
  'Ł': { base: 'L', custom: G('10000 10000 10100 11000 10000 10000 11111'), width: 5 },
  'Ń': { base: 'N', marks: [MARKS.ACUTE], width: 6 },
  'Ó': { base: 'O', marks: [MARKS.DOT], width: 5 },
  'Ś': { base: 'S', marks: [MARKS.ACUTE], width: 6 },
  'Ź': { base: 'Z', marks: [MARKS.ACUTE], width: 6 },
  'Ż': { base: 'Z', marks: [MARKS.DOT], width: 5 },
  '–': { base: '-', width: 5 },
  '—': { base: '-', width: 5 },
  '„': { base: '"', width: 4 },
  '”': { base: '"', width: 4 },
  '…': { base: '.', width: 5 },
  '°': { base: 'O', width: 3, custom: G('01100 10010 10010 01100 00000 00000 00000') },
};

export const FONT_H = 9; // 7 px glif + 2 px na znaki diakrytyczne
export const GLYPH_W = 5;
export const LINE_H = 9;

function glyphFor(ch) {
  if (SPECIAL[ch]) {
    const s = SPECIAL[ch];
    return { rows: s.custom || BASE[s.base] || BASE['?'], marks: s.marks || [], width: s.width || 5 };
  }
  return { rows: BASE[ch] || BASE['?'], marks: [], width: 5 };
}

export function textWidth(str, opts = {}) {
  const scale = opts.scale || 1;
  const spacing = opts.spacing == null ? 1 : opts.spacing;
  const lines = String(str).split('\n');
  let max = 0;
  for (const line of lines) {
    let w = 0;
    for (const ch of line.toUpperCase()) {
      w += glyphFor(ch).width * scale + spacing * scale;
    }
    if (w > 0) w -= spacing * scale;
    if (w > max) max = w;
  }
  return max;
}

/**
 * Rysuje tekst pikselowy.
 * @param screen obiekt z metodą set(x,y,color)
 */
export function drawText(screen, str, x, y, color = C.WHITE, opts = {}) {
  const scale = opts.scale || 1;
  const spacing = opts.spacing == null ? 1 : opts.spacing;
  const shadow = opts.shadow == null ? null : opts.shadow;
  const lines = String(str).toUpperCase().split('\n');
  const lh = (opts.lineHeight || LINE_H) * scale;
  let startY = y;
  if (opts.align === 'center' || opts.align === 'right') {
    const w = textWidth(str, opts);
    if (opts.align === 'center') x -= Math.floor(w / 2);
    else x -= w;
  }
  for (let li = 0; li < lines.length; li++) {
    const line = lines[li];
    let cx = Math.round(x);
    const cy = Math.round(startY + li * lh);
    for (const ch of line) {
      const g = glyphFor(ch);
      const drawGlyph = (ox, oy, col) => {
        for (let row = 0; row < 7; row++) {
          const bits = g.rows[row];
          for (let colBit = 0; colBit < bits.length; colBit++) {
            if (bits[colBit] === '1') {
              for (let sy = 0; sy < scale; sy++) {
                for (let sx = 0; sx < scale; sx++) {
                  screen.set(ox + colBit * scale + sx, oy + row * scale + sy, col);
                }
              }
            }
          }
        }
        for (const mark of g.marks) {
          for (const [mx, my] of mark) {
            for (let sy = 0; sy < scale; sy++) {
              for (let sx = 0; sx < scale; sx++) {
                screen.set(ox + mx * scale + sx, oy + my * scale + sy, col);
              }
            }
          }
        }
      };
      if (shadow != null) drawGlyph(cx + scale, cy + scale, shadow);
      drawGlyph(cx, cy, color);
      cx += g.width * scale + spacing * scale;
    }
  }
  return textWidth(str, opts);
}

// Zawijanie tekstu do podanej szerokości w pikselach. Zwraca tablicę linii.
export function wrapText(str, maxWidthPx, opts = {}) {
  const paragraphs = String(str).split('\n');
  const out = [];
  for (const para of paragraphs) {
    const words = para.split(/\s+/).filter(Boolean);
    if (!words.length) {
      out.push('');
      continue;
    }
    let line = '';
    for (const word of words) {
      const test = line ? line + ' ' + word : word;
      if (textWidth(test, opts) <= maxWidthPx || !line) {
        line = test;
      } else {
        out.push(line);
        line = word;
      }
    }
    if (line) out.push(line);
  }
  return out;
}

export function drawWrapped(screen, str, x, y, maxWidth, color, opts = {}) {
  const lines = wrapText(str, maxWidth, opts);
  const lh = (opts.lineHeight || LINE_H);
  lines.forEach((line, i) => {
    drawText(screen, line, x, y + i * lh, color, opts);
  });
  return lines.length;
}
