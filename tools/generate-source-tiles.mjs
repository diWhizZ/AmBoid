import fs from 'node:fs';
import path from 'node:path';
import { PNG } from './png_mini.js';

const outDir = path.resolve('assets/source_tiles');
fs.mkdirSync(outDir, { recursive: true });

const TILE_W = 128;
const TILE_H = 64;

function createTile128x64(name, fillFn) {
  const png = new PNG({ width: TILE_W, height: TILE_H });
  const midX = 64;
  const midY = 32;

  for (let y = 0; y < TILE_H; y++) {
    for (let x = 0; x < TILE_W; x++) {
      const idx = (y * TILE_W + x) * 4;

      // Sprawdzenie czy piksel leży wewnątrz izometrycznego rombu 2:1
      // |x - 64| / 64 + |y - 32| / 32 <= 1.0
      const dx = Math.abs(x + 0.5 - midX) / 64;
      const dy = Math.abs(y + 0.5 - midY) / 32;

      if (dx + dy <= 1.0) {
        // Wewnątrz rombu - wywołaj generator koloru
        const [r, g, b] = fillFn(x, y);
        png.data[idx] = r;
        png.data[idx + 1] = g;
        png.data[idx + 2] = b;
        png.data[idx + 3] = 255;
      } else {
        // Tło magentowe (#FF00FF)
        png.data[idx] = 255;
        png.data[idx + 1] = 0;
        png.data[idx + 2] = 255;
        png.data[idx + 3] = 255;
      }
    }
  }

  const file = path.join(outDir, `${name}.png`);
  fs.writeFileSync(file, PNG.sync.write(png));
  console.log(`Wygenerowano surowy kafel 128x64: ${file}`);
}

// 1. Trawa
createTile128x64('grass_01', (x, y) => {
  const n = (Math.sin(x * 0.4) * Math.cos(y * 0.4) * 20) | 0;
  return [45 + n, 120 + n, 40 + n];
});

// 2. Ziemia
createTile128x64('dirt_01', (x, y) => {
  const n = (Math.sin(x * 0.3) * Math.cos(y * 0.5) * 15) | 0;
  return [110 + n, 80 + n, 50 + n];
});

// 3. Kamień
createTile128x64('stone_01', (x, y) => {
  const n = ((x % 16 < 2 || y % 8 < 2) ? -20 : 0) + ((x * y) % 15);
  return [100 + n, 105 + n, 110 + n];
});

// 4. Woda
createTile128x64('water_01', (x, y) => {
  const wave = Math.sin(x * 0.2 + y * 0.4) * 25;
  return [30, 80 + wave, 180 + wave];
});

// 5. Ścieżka
createTile128x64('path_01', (x, y) => {
  const n = ((x + y) % 7) * 4;
  return [150 + n, 130 + n, 95 + n];
});

// 6. Beton
createTile128x64('concrete_01', (x, y) => {
  const n = ((x ^ y) % 9) * 3;
  return [140 + n, 140 + n, 145 + n];
});

// 7. Drewno
createTile128x64('wood_01', (x, y) => {
  const plank = (y % 8 === 0) ? -30 : 0;
  const n = (x % 12) * 2;
  return [140 + plank + n, 90 + plank + n, 50 + plank + n];
});
