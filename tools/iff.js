// Minimalny zapis IFF ILBM (5 bitplanów, 32 kolory) + paleta.
// Dzięki temu grafika z prototypu jest gotowa do otwarcia w Deluxe Paint
// i do wczytania przez silnik na Amidze.

import fs from 'node:fs';
import { PALETTE, hexToRgb, TRANSPARENT } from '../src/palette.js';

function chunk(id, data) {
  const head = Buffer.alloc(8);
  head.write(id, 0, 4, 'ascii');
  head.writeUInt32BE(data.length, 4);
  const padded = data.length % 2 ? Buffer.concat([data, Buffer.alloc(1)]) : data;
  return Buffer.concat([head, padded]);
}

function makeCMAP() {
  const buf = Buffer.alloc(32 * 3);
  for (let i = 0; i < 32; i++) {
    const [r, g, b] = hexToRgb(PALETTE[i]);
    // 4 bity na kanał, jak w rejestrach COLORxx Amigi
    buf[i * 3 + 0] = (r >> 4) * 17;
    buf[i * 3 + 1] = (g >> 4) * 17;
    buf[i * 3 + 2] = (b >> 4) * 17;
  }
  return buf;
}

function packBitplanes(pixels, width, height, bits = 5, transparentIndex = TRANSPARENT) {
  const rowBytes = ((width + 15) >> 4) << 1; // zaokrąglenie do 16 px, jak w ILBM
  const planeSize = rowBytes * height;
  const body = Buffer.alloc(planeSize * bits);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let idx = pixels[y * width + x];
      if (idx === transparentIndex) idx = 0;
      for (let p = 0; p < bits; p++) {
        if ((idx >> p) & 1) {
          const byteIndex = p * planeSize + y * rowBytes + (x >> 3);
          body[byteIndex] |= 0x80 >> (x & 7);
        }
      }
    }
  }
  return body;
}

export function writeILBM(path, pixels, width, height, opts = {}) {
  const bits = opts.bits || 5;
  const bmhd = Buffer.alloc(20);
  bmhd.writeUInt16BE(width, 0);
  bmhd.writeUInt16BE(height, 2);
  bmhd.writeInt16BE(0, 4); // x
  bmhd.writeInt16BE(0, 6); // y
  bmhd.writeUInt8(bits, 8);
  bmhd.writeUInt8(opts.masking || 0, 9); // 0 = bez maski, 1 = maska
  bmhd.writeUInt8(0, 10); // compression: 0 = none
  bmhd.writeUInt8(0, 11); // pad
  bmhd.writeUInt16BE(1, 12); // transparent color
  bmhd.writeUInt8(1, 14); // aspect x
  bmhd.writeUInt8(1, 15); // aspect y
  bmhd.writeInt16BE(width, 16); // pageWidth
  bmhd.writeInt16BE(height, 18); // pageHeight

  const body = packBitplanes(pixels, width, height, bits, opts.transparentIndex);
  const content = Buffer.concat([
    Buffer.from('ILBM', 'ascii'),
    chunk('BMHD', bmhd),
    chunk('CMAP', makeCMAP()),
    chunk('BODY', body),
  ]);
  const head = Buffer.alloc(8);
  head.write('FORM', 0, 4, 'ascii');
  head.writeUInt32BE(content.length, 4);
  const file = Buffer.concat([head, content]);
  fs.writeFileSync(path, file);
  return file.length;
}

// Zapis surowej palety (96 bajtów, 8 bitów na kanał) — do importu w edytorach.
export function writePalette(path) {
  const buf = Buffer.alloc(32 * 3);
  for (let i = 0; i < 32; i++) {
    const [r, g, b] = hexToRgb(PALETTE[i]);
    buf[i * 3] = r;
    buf[i * 3 + 1] = g;
    buf[i * 3 + 2] = b;
  }
  fs.writeFileSync(path, buf);
}
