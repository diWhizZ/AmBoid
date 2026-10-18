// Prosty, bezbłędny enkoder i dekoder PNG oparty wyłącznie na standardowym module node:zlib.
// Zero zewnętrznych zależności npm!
import zlib from 'node:zlib';

// Tablica CRC32
const CRC_TABLE = new Uint32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) {
    c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
  }
  CRC_TABLE[n] = c;
}

function crc32(buf) {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc = CRC_TABLE[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function makeChunk(typeStr, dataBuf) {
  const typeBuf = Buffer.from(typeStr, 'ascii');
  const len = dataBuf ? dataBuf.length : 0;
  const chunk = Buffer.alloc(12 + len);
  chunk.writeUInt32BE(len, 0);
  typeBuf.copy(chunk, 4);
  if (dataBuf && len > 0) {
    dataBuf.copy(chunk, 8);
  }
  const toCrc = Buffer.concat([typeBuf, dataBuf || Buffer.alloc(0)]);
  chunk.writeUInt32BE(crc32(toCrc), 8 + len);
  return chunk;
}

export function encodePNG(pixels, width, height, options = {}) {
  const hasAlpha = options.hasAlpha !== false;
  const bpp = hasAlpha ? 4 : 3;
  const colorType = hasAlpha ? 6 : 2; // 6: RGBA, 2: RGB

  // IHDR: 13 bajtów
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr.writeUInt8(8, 8); // bit depth 8
  ihdr.writeUInt8(colorType, 9);
  ihdr.writeUInt8(0, 10); // compression deflate
  ihdr.writeUInt8(0, 11); // filter adaptive
  ihdr.writeUInt8(0, 12); // no interlace

  // Tworzenie surowych linii ze znacznikiem filtra 0 (None)
  const rowLen = width * bpp;
  const rawData = Buffer.alloc(height * (rowLen + 1));
  let srcOffset = 0;
  let dstOffset = 0;

  for (let y = 0; y < height; y++) {
    rawData[dstOffset++] = 0; // Filter: None
    if (pixels instanceof Buffer || pixels instanceof Uint8Array) {
      if (bpp === 4 && pixels.length === width * height * 4) {
        pixels.copy ? pixels.copy(rawData, dstOffset, srcOffset, srcOffset + rowLen) : rawData.set(pixels.subarray(srcOffset, srcOffset + rowLen), dstOffset);
        srcOffset += rowLen;
        dstOffset += rowLen;
      } else {
        for (let x = 0; x < width; x++) {
          rawData[dstOffset++] = pixels[srcOffset++];
          rawData[dstOffset++] = pixels[srcOffset++];
          rawData[dstOffset++] = pixels[srcOffset++];
          if (hasAlpha) rawData[dstOffset++] = pixels[srcOffset++];
        }
      }
    }
  }

  const compressed = zlib.deflateSync(rawData, { level: 9 });

  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const ihdrChunk = makeChunk('IHDR', ihdr);
  const idatChunk = makeChunk('IDAT', compressed);
  const iendChunk = makeChunk('IEND', null);

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

export function decodePNG(buffer) {
  // Sprawdzenie sygnatury
  if (buffer[0] !== 0x89 || buffer[1] !== 0x50 || buffer[2] !== 0x4e || buffer[3] !== 0x47) {
    throw new Error('Niepoprawny nagłówek PNG');
  }

  let offset = 8;
  let width = 0;
  let height = 0;
  let bitDepth = 8;
  let colorType = 6;
  const idatChunks = [];

  while (offset < buffer.length) {
    const len = buffer.readUInt32BE(offset);
    const type = buffer.toString('ascii', offset + 4, offset + 8);
    const data = buffer.subarray(offset + 8, offset + 8 + len);
    offset += 12 + len;

    if (type === 'IHDR') {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      bitDepth = data.readUInt8(8);
      colorType = data.readUInt8(9);
    } else if (type === 'IDAT') {
      idatChunks.push(data);
    } else if (type === 'IEND') {
      break;
    }
  }

  const compressed = Buffer.concat(idatChunks);
  const raw = zlib.inflateSync(compressed);

  const bpp = colorType === 6 ? 4 : colorType === 2 ? 3 : colorType === 0 ? 1 : 4;
  const out = Buffer.alloc(width * height * 4);

  let rawIdx = 0;
  let outIdx = 0;
  const rowBytes = width * bpp;
  const prevRow = Buffer.alloc(rowBytes);

  for (let y = 0; y < height; y++) {
    const filter = raw[rawIdx++];
    const currentRow = Buffer.alloc(rowBytes);

    for (let i = 0; i < rowBytes; i++) {
      const val = raw[rawIdx++];
      const a = i >= bpp ? currentRow[i - bpp] : 0;
      const b = prevRow[i];
      const c = i >= bpp ? prevRow[i - bpp] : 0;

      let unfiltered = val;
      if (filter === 1) unfiltered = (val + a) & 0xff; // Sub
      else if (filter === 2) unfiltered = (val + b) & 0xff; // Up
      else if (filter === 3) unfiltered = (val + Math.floor((a + b) / 2)) & 0xff; // Average
      else if (filter === 4) { // Paeth
        const p = a + b - c;
        const pa = Math.abs(p - a);
        const pb = Math.abs(p - b);
        const pc = Math.abs(p - c);
        const pr = (pa <= pb && pa <= pc) ? a : (pb <= pc ? b : c);
        unfiltered = (val + pr) & 0xff;
      }
      currentRow[i] = unfiltered;
    }

    currentRow.copy(prevRow);

    // Kopiowanie do RGBA wyjściowego
    for (let x = 0; x < width; x++) {
      if (bpp === 4) {
        out[outIdx++] = currentRow[x * 4];
        out[outIdx++] = currentRow[x * 4 + 1];
        out[outIdx++] = currentRow[x * 4 + 2];
        out[outIdx++] = currentRow[x * 4 + 3];
      } else if (bpp === 3) {
        out[outIdx++] = currentRow[x * 3];
        out[outIdx++] = currentRow[x * 3 + 1];
        out[outIdx++] = currentRow[x * 3 + 2];
        out[outIdx++] = 255;
      } else {
        const v = currentRow[x];
        out[outIdx++] = v;
        out[outIdx++] = v;
        out[outIdx++] = v;
        out[outIdx++] = 255;
      }
    }
  }

  return { width, height, data: out };
}

// Kompatybilny obiekt PNG dla kodu oczekującego new PNG({ width, height })
export class PNG {
  constructor({ width, height }) {
    this.width = width;
    this.height = height;
    this.data = Buffer.alloc(width * height * 4);
  }

  static sync = {
    read(buf) {
      return decodePNG(buf);
    },
    write(png) {
      return encodePNG(png.data, png.width, png.height, { hasAlpha: true });
    },
  };
}
