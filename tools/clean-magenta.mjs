// Narzędzie usuwające tło magentowe (#FF00FF) i zamieniające je na pełną przezroczystość (alpha 0).
import fs from 'node:fs';
import path from 'node:path';
import { PNG } from './png_mini.js';
import { pruneStaleTiles, logPruned } from './tile-dir-utils.mjs';

export function cleanMagentaFromBuffer(buf) {
  const png = PNG.sync.read(buf);
  let cleanedCount = 0;

  for (let i = 0; i < png.data.length; i += 4) {
    const r = png.data[i];
    const g = png.data[i + 1];
    const b = png.data[i + 2];

    // Sprawdzenie koloru magenty (#FF00FF) z tolerancją na drobne różnice kwantyzacji
    if (r >= 250 && g <= 5 && b >= 250) {
      png.data[i] = 0;
      png.data[i + 1] = 0;
      png.data[i + 2] = 0;
      png.data[i + 3] = 0; // pełna przezroczystość
      cleanedCount++;
    }
  }

  return {
    buffer: PNG.sync.write(png),
    cleanedPixels: cleanedCount,
    width: png.width,
    height: png.height,
  };
}

export function cleanMagentaDirectory(inputDir, outputDir) {
  fs.mkdirSync(outputDir, { recursive: true });
  const files = fs.readdirSync(inputDir).filter((f) => f.toLowerCase().endsWith('.png'));
  console.log(`[CLEAN-MAGENTA] Przetwarzanie ${files.length} plików z ${inputDir} -> ${outputDir}`);

  // Ten sam katalog = praca w miejscu; nie wolno wtedy sprzątać.
  if (path.resolve(inputDir) !== path.resolve(outputDir)) {
    logPruned('CLEAN-MAGENTA', pruneStaleTiles(outputDir, files));
  }

  let totalCleaned = 0;
  for (const f of files) {
    const inPath = path.join(inputDir, f);
    const outPath = path.join(outputDir, f);
    const inBuf = fs.readFileSync(inPath);
    const res = cleanMagentaFromBuffer(inBuf);
    fs.writeFileSync(outPath, res.buffer);
    console.log(`  ${f}: oczyszczono ${res.cleanedPixels} pikseli magenty (${res.width}x${res.height})`);
    totalCleaned += res.cleanedPixels;
  }
  console.log(`[CLEAN-MAGENTA] Zakończono! Łącznie oczyszczono ${totalCleaned} pikseli.`);
}

// Uruchomienie jako CLI
if (process.argv[1] && process.argv[1].endsWith('clean-magenta.mjs')) {
  const inDir = process.argv[2] || 'assets/source_tiles';
  const outDir = process.argv[3] || 'assets/clean_128';
  cleanMagentaDirectory(inDir, outDir);
}
