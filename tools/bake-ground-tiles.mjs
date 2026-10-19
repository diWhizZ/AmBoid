// Wypala proceduralne kafle podłóg z `src/art.js` do źródłowych PNG 128×64
// (izometryczny romb na tle magenta) — czyli do formatu, który przyjmuje
// pipeline assetów: `assets/source_tiles` → clean-magenta → resize → quantize.
//
// Po co: gra rysuje podłogi proceduralnie (32×16, paleta indeksowana), a ścieżka
// Amigi potrzebuje plików. Kafel jest skalowany ×4 do 128×64, a `resize-tiles`
// skaluje potem ÷2 i ÷2 (nearest) — co wraca DOKŁADNIE do 32×16. Dzięki temu
// kafel w atlasie OCS (32×16) jest identyczny z tym, co rysuje przeglądarka,
// a atlas AGA (64×32) to jego dwukrotność.
//
//   node tools/bake-ground-tiles.mjs --kind asphalt          # asphalt_01..06
//   node tools/bake-ground-tiles.mjs --all                   # wszystkie rodzaje
//   node tools/bake-ground-tiles.mjs --kind gravel --out /tmp/x
//
// Wynik jest deterministyczny: `src/art.js` nie używa `Math.random()` w klatce,
// a liczba wariantów wynika z `GROUND_SPEC` (siatka × zestawy detalu).

import fs from 'node:fs';
import path from 'node:path';
import { PNG } from './png_mini.js';
import { buildArt, GROUND_KINDS } from '../src/art.js';
import { PALETTE_EXT, hexToRgb, TRANSPARENT } from '../src/palette.js';

const SCALE = 4; // 32×16 -> 128×64
const MAGENTA = [255, 0, 255];
const RGB = PALETTE_EXT.map(hexToRgb);

/** PixelBuffer (indeksy palety) -> PNG 128×64 z tłem magenta poza rombem. */
export function bakeTileToPng(pb, scale = SCALE) {
  if (pb.w * scale !== 128 || pb.h * scale !== 64) {
    throw new Error(`Zły rozmiar po skalowaniu: ${pb.w}x${pb.h} x${scale} (oczekiwano 128x64)`);
  }
  const png = new PNG({ width: pb.w * scale, height: pb.h * scale });

  for (let y = 0; y < pb.h; y++) {
    for (let x = 0; x < pb.w; x++) {
      const idx = pb.data[y * pb.w + x];
      const [r, g, b] = idx === TRANSPARENT || !RGB[idx] ? MAGENTA : RGB[idx];
      for (let dy = 0; dy < scale; dy++) {
        for (let dx = 0; dx < scale; dx++) {
          const d = ((y * scale + dy) * png.width + (x * scale + dx)) * 4;
          png.data[d] = r;
          png.data[d + 1] = g;
          png.data[d + 2] = b;
          png.data[d + 3] = 255;
        }
      }
    }
  }
  return png;
}

/**
 * Wypala kafle wybranych rodzajów do katalogu.
 * @returns {{kind:string,index:number,name:string,width:number,height:number}[]}
 */
export function bakeGroundTiles(kinds, outDir, scale = SCALE) {
  const art = buildArt();
  fs.mkdirSync(outDir, { recursive: true });
  const written = [];

  for (const kind of kinds) {
    const tiles = art.tiles[kind];
    if (!tiles || !tiles.length) {
      throw new Error(`Nie ma kafli podłogi dla rodzaju "${kind}" (dostępne: ${GROUND_KINDS.join(', ')})`);
    }
    tiles.forEach((pb, i) => {
      const name = `${kind}_${String(i + 1).padStart(2, '0')}.png`;
      const png = bakeTileToPng(pb, scale);
      fs.writeFileSync(path.join(outDir, name), PNG.sync.write(png));
      written.push({ kind, index: i + 1, name, width: png.width, height: png.height });
    });
  }
  return written;
}

// --- CLI ------------------------------------------------------------------

function parseArgs(argv) {
  const opts = { kinds: [], out: 'assets/source_tiles', all: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--kind') opts.kinds.push(argv[++i]);
    else if (a === '--all') opts.all = true;
    else if (a === '--out') opts.out = argv[++i];
    else if (a === '--help' || a === '-h') {
      console.log(`Użycie: node tools/bake-ground-tiles.mjs [opcje]
  --kind <rodzaj>  rodzaj podłogi do wypalenia (np. asphalt); powtarzalne
  --all            wszystkie rodzaje z GROUND_SPEC
  --out <dir>      katalog docelowy (domyślnie assets/source_tiles)

Bez --kind i --all wypala "asphalt" — rodzaj, którego brakuje w packu CC0.
Wypalone kafle są źródłami pipeline'u (128x64, tło magenta), więc commituje się
je razem z resztą assets/source_tiles.`);
      process.exit(0);
    }
  }
  if (!opts.kinds.length && !opts.all) opts.kinds = ['asphalt'];
  return opts;
}

// Uwaga: porównujemy dokładną nazwę pliku, nie `endsWith` — inaczej import
// narzędzia z pliku `test-bake-ground-tiles.mjs` uruchamiałby CLI.
if (process.argv[1] && path.basename(process.argv[1]) === 'bake-ground-tiles.mjs') {
  try {
    const opts = parseArgs(process.argv.slice(2));
    const kinds = opts.all ? GROUND_KINDS : opts.kinds;
    const outDir = path.resolve(opts.out);
    const written = bakeGroundTiles(kinds, outDir);
    for (const w of written) {
      console.log(`[BAKE] ${w.name} ${w.width}x${w.height} (${w.kind} wariant ${w.index})`);
    }
    const byKind = new Map();
    for (const w of written) byKind.set(w.kind, (byKind.get(w.kind) || 0) + 1);
    console.log(`[BAKE] Zapisano ${written.length} kafli do ${outDir}: `
      + [...byKind].map(([k, n]) => `${k}=${n}`).join(' '));
  } catch (e) {
    console.error(`[BAKE] BŁĄD: ${e.message}`);
    process.exit(1);
  }
}
