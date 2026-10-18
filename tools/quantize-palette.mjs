// Kwantyzacja kolorów do wspólnej palety AmBoid (32 kolory OCS, 64/128/256 AGA).
import fs from 'node:fs';
import path from 'node:path';
import { PNG } from './png_mini.js';
import { PALETTE, PALETTE_EXT, hexToRgb, TRANSPARENT } from '../src/palette.js';

// Przygotowanie tablic kolorów RGB dla bazowej palety 32 i AGA 64
const OCS_PALETTE_RGB = PALETTE.map((hex) => hexToRgb(hex));
const AGA_PALETTE_RGB = [...PALETTE, ...PALETTE_EXT].map((hex) => hexToRgb(hex));

// Odległość euklidesowa w przestrzeni RGB z wagami percepcyjnymi (Redmean)
function colorDist(r1, g1, b1, r2, g2, b2) {
  const rmean = (r1 + r2) / 2;
  const dr = r1 - r2;
  const dg = g1 - g2;
  const db = b1 - b2;
  return (2 + rmean / 256) * dr * dr + 4 * dg * dg + (2 + (255 - rmean) / 256) * db * db;
}

export function findClosestPaletteIndex(r, g, b, paletteRgb) {
  let bestIdx = 0;
  let bestDist = Infinity;
  for (let i = 0; i < paletteRgb.length; i++) {
    const [pr, pg, pb] = paletteRgb[i];
    const d = colorDist(r, g, b, pr, pg, pb);
    if (d < bestDist) {
      bestDist = d;
      bestIdx = i;
    }
  }
  return bestIdx;
}

export function quantizePng(png, targetProfile = 'aga') {
  const paletteRgb = targetProfile === 'ocs' ? OCS_PALETTE_RGB : AGA_PALETTE_RGB;
  const { width, height, data } = png;
  const outPng = new PNG({ width, height });
  const indexedData = new Uint8Array(width * height);

  for (let i = 0; i < data.length; i += 4) {
    const pixIdx = i / 4;
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const a = data[i + 3];

    if (a < 128) {
      // Przezroczystość
      indexedData[pixIdx] = TRANSPARENT;
      outPng.data[i] = 0;
      outPng.data[i + 1] = 0;
      outPng.data[i + 2] = 0;
      outPng.data[i + 3] = 0;
    } else {
      const palIdx = findClosestPaletteIndex(r, g, b, paletteRgb);
      indexedData[pixIdx] = palIdx;
      const [pr, pg, pb] = paletteRgb[palIdx];
      outPng.data[i] = pr;
      outPng.data[i + 1] = pg;
      outPng.data[i + 2] = pb;
      outPng.data[i + 3] = 255;
    }
  }

  return { png: outPng, indexedData };
}

export function quantizeDirectory(inDir, outDir, profile = 'aga') {
  fs.mkdirSync(outDir, { recursive: true });
  const files = fs.readdirSync(inDir).filter((f) => f.toLowerCase().endsWith('.png'));
  console.log(`[QUANTIZE-PALETTE] Kwantyzacja ${files.length} plików do profilu ${profile.toUpperCase()}...`);

  for (const f of files) {
    const inPath = path.join(inDir, f);
    const srcPng = PNG.sync.read(fs.readFileSync(inPath));
    const { png } = quantizePng(srcPng, profile);
    const outPath = path.join(outDir, f);
    fs.writeFileSync(outPath, PNG.sync.write(png));
    console.log(`  ${f}: skwantyzowano do palety ${profile.toUpperCase()}`);
  }
}

// Uruchomienie jako CLI
if (process.argv[1] && process.argv[1].endsWith('quantize-palette.mjs')) {
  const inDir = process.argv[2] || 'assets/tiles_64';
  const outDir = process.argv[3] || 'assets/quantized_64';
  const profile = process.argv[4] || 'aga';
  quantizeDirectory(inDir, outDir, profile);
}
