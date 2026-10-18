// Narzędzie do skalowania kafelków metodą Nearest-Neighbor (128x64 -> 64x32 -> 32x16)
// z zachowaniem ścisłej geometrii izometrii 2:1, bez interpolacji dwuliniowej ani Lanczos.
import fs from 'node:fs';
import path from 'node:path';
import { PNG } from './png_mini.js';
import { pruneStaleTiles, logPruned } from './tile-dir-utils.mjs';

export function scaleNearestNeighbor(srcPng, targetW, targetH) {
  const dstPng = new PNG({ width: targetW, height: targetH });
  const srcW = srcPng.width;
  const srcH = srcPng.height;

  const scaleX = srcW / targetW;
  const scaleY = srcH / targetH;

  for (let dy = 0; dy < targetH; dy++) {
    const sy = Math.min(srcH - 1, Math.floor(dy * scaleY));
    for (let dx = 0; dx < targetW; dx++) {
      const sx = Math.min(srcW - 1, Math.floor(dx * scaleX));

      const srcIdx = (sy * srcW + sx) * 4;
      const dstIdx = (dy * targetW + dx) * 4;

      dstPng.data[dstIdx] = srcPng.data[srcIdx];
      dstPng.data[dstIdx + 1] = srcPng.data[srcIdx + 1];
      dstPng.data[dstIdx + 2] = srcPng.data[srcIdx + 2];
      dstPng.data[dstIdx + 3] = srcPng.data[srcIdx + 3];
    }
  }

  return dstPng;
}

export function resizeTilesBatch(inputDir, outputDir64, outputDir32) {
  fs.mkdirSync(outputDir64, { recursive: true });
  fs.mkdirSync(outputDir32, { recursive: true });

  const files = fs.readdirSync(inputDir).filter((f) => f.toLowerCase().endsWith('.png'));
  console.log(`[RESIZE-TILES] Przetwarzanie ${files.length} plików...`);

  // Kafle usunięte ze źródła nie mogą zostać w tiles_64/tiles_32.
  for (const dir of [outputDir64, outputDir32]) {
    if (path.resolve(dir) !== path.resolve(inputDir)) {
      logPruned('RESIZE-TILES', pruneStaleTiles(dir, files), dir);
    }
  }

  for (const f of files) {
    const inPath = path.join(inputDir, f);
    const srcPng = PNG.sync.read(fs.readFileSync(inPath));

    // 128x64 -> 64x32
    const tile64 = scaleNearestNeighbor(srcPng, 64, 32);
    const outPath64 = path.join(outputDir64, f);
    fs.writeFileSync(outPath64, PNG.sync.write(tile64));

    // 64x32 -> 32x16
    const tile32 = scaleNearestNeighbor(tile64, 32, 16);
    const outPath32 = path.join(outputDir32, f);
    fs.writeFileSync(outPath32, PNG.sync.write(tile32));

    console.log(`  ${f}: 128x64 -> 64x32 (AGA/OS) oraz 32x16 (OCS) [Nearest-Neighbor 2:1 OK]`);
  }

  console.log(`[RESIZE-TILES] Zakończono pomyślnie! Wygenerowano wersje 64x32 i 32x16.`);
}

// Uruchomienie jako CLI
if (process.argv[1] && process.argv[1].endsWith('resize-tiles.mjs')) {
  const inDir = process.argv[2] || 'assets/clean_128';
  const out64 = process.argv[3] || 'assets/tiles_64';
  const out32 = process.argv[4] || 'assets/tiles_32';
  resizeTilesBatch(inDir, out64, out32);
}
