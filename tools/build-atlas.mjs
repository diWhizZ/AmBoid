// Narzędzie do budowania atlasów tekstur (PNG, RAW 8-bit chunky oraz nagłówki C dla Amigi).
import fs from 'node:fs';
import path from 'node:path';
import { PNG } from './png_mini.js';
import { PALETTE, PALETTE_EXT, TRANSPARENT } from '../src/palette.js';
import { quantizePng } from './quantize-palette.mjs';

export function packGridAtlas(images, cellW, cellH, cols, targetProfile = 'aga') {
  const count = images.length;
  const rows = Math.ceil(count / cols);
  const atlasW = cols * cellW;
  const atlasH = rows * cellH;

  const atlasPng = new PNG({ width: atlasW, height: atlasH });
  const rawChunky = new Uint8Array(atlasW * atlasH).fill(TRANSPARENT);

  images.forEach((img, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const ox = col * cellW;
    const oy = row * cellH;

    const { png, indexedData } = quantizePng(img.png, targetProfile);

    for (let y = 0; y < img.png.height; y++) {
      for (let x = 0; x < img.png.width; x++) {
        const srcIdx = (y * img.png.width + x) * 4;
        const dstIdx = ((oy + y) * atlasW + (ox + x)) * 4;

        atlasPng.data[dstIdx] = png.data[srcIdx];
        atlasPng.data[dstIdx + 1] = png.data[srcIdx + 1];
        atlasPng.data[dstIdx + 2] = png.data[srcIdx + 2];
        atlasPng.data[dstIdx + 3] = png.data[srcIdx + 3];

        rawChunky[(oy + y) * atlasW + (ox + x)] = indexedData[y * img.png.width + x];
      }
    }
  });

  return { png: atlasPng, rawChunky, atlasW, atlasH, cols, rows };
}

export function buildAllAtlases() {
  const tilesDir64 = path.resolve('assets/quantized_64');
  const tilesDir32 = path.resolve('assets/tiles_32');
  const outDir = path.resolve('docs/amiga/atlases');
  fs.mkdirSync(outDir, { recursive: true });

  const files = fs.readdirSync(tilesDir64).filter((f) => f.endsWith('.png'));
  const images64 = files.map((f) => ({
    name: path.basename(f, '.png'),
    png: PNG.sync.read(fs.readFileSync(path.join(tilesDir64, f))),
  }));

  // 1. Atlas 64x32 (AGA / AmigaOS / HTML5)
  const atlas64 = packGridAtlas(images64, 64, 32, 4, 'aga');
  fs.writeFileSync(path.join(outDir, 'atlas-floors-64.png'), PNG.sync.write(atlas64.png));
  fs.writeFileSync(path.join(outDir, 'atlas-floors-64.raw'), Buffer.from(atlas64.rawChunky));
  console.log(`[BUILD-ATLAS] Zbudowano atlas 64x32: ${atlas64.atlasW}x${atlas64.atlasH} (${files.length} kafli)`);

  // 2. Atlas 32x16 (OCS/ECS)
  const images32 = files.map((f) => ({
    name: path.basename(f, '.png'),
    png: PNG.sync.read(fs.readFileSync(path.join(tilesDir32, f))),
  }));
  const atlas32 = packGridAtlas(images32, 32, 16, 4, 'ocs');
  fs.writeFileSync(path.join(outDir, 'atlas-floors-32.png'), PNG.sync.write(atlas32.png));
  fs.writeFileSync(path.join(outDir, 'atlas-floors-32.raw'), Buffer.from(atlas32.rawChunky));
  console.log(`[BUILD-ATLAS] Zbudowano atlas 32x16: ${atlas32.atlasW}x${atlas32.atlasH} (${files.length} kafli)`);

  // 3. Generowanie nagłówka C dla Amigi
  const cHeader = `/* AMBOID - Wygenerowane definicje atlasow kafli */
#ifndef AMBOID_ATLAS_H
#define AMBOID_ATLAS_H

#define ATLAS_FLOORS_64_W  ${atlas64.atlasW}
#define ATLAS_FLOORS_64_H  ${atlas64.atlasH}
#define ATLAS_FLOORS_64_COLS ${atlas64.cols}

#define ATLAS_FLOORS_32_W  ${atlas32.atlasW}
#define ATLAS_FLOORS_32_H  ${atlas32.atlasH}
#define ATLAS_FLOORS_32_COLS ${atlas32.cols}

#define TILE_COUNT ${files.length}

${files.map((f, i) => `#define TILE_ID_${path.basename(f, '.png').toUpperCase()} ${i}`).join('\n')}

#endif /* AMBOID_ATLAS_H */
`;
  fs.writeFileSync(path.join(outDir, 'atlas_defs.h'), cHeader);
  console.log(`[BUILD-ATLAS] Zapisano nagłówek C: ${path.join(outDir, 'atlas_defs.h')}`);
}

// Uruchomienie jako CLI
if (process.argv[1] && process.argv[1].endsWith('build-atlas.mjs')) {
  buildAllAtlases();
}
