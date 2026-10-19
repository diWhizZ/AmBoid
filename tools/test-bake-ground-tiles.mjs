// Test wypalania proceduralnych podłóg do źródłowych PNG 128×64.
// Nie wymaga packa ani zapisanych assetów: buduje grafę z `src/art.js`.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { PNG } from './png_mini.js';
import { buildArt } from '../src/art.js';
import { PALETTE_EXT, hexToRgb, TRANSPARENT } from '../src/palette.js';
import { bakeGroundTiles, bakeTileToPng } from './bake-ground-tiles.mjs';
import { cleanMagentaFromBuffer } from './clean-magenta.mjs';
import { scaleNearestNeighbor } from './resize-tiles.mjs';

const RGB = PALETTE_EXT.map(hexToRgb);
const failures = [];
let passed = 0;

function check(name, fn) {
  try {
    fn();
    passed++;
    console.log(`  [OK ] ${name}`);
  } catch (e) {
    failures.push({ name, error: e });
    console.log(`  [FAIL] ${name}\n         ${e.message}`);
  }
}

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'amboid-bake-'));
const art = buildArt();

console.log('='.repeat(64));
console.log(' TEST: wypalanie podłóg proceduralnych do PNG 128x64');
console.log('='.repeat(64));

console.log('== 1. Geometria i tło ==');

check('asphalt wypala się w 6 wariantach', () => {
  const files = bakeGroundTiles(['asphalt'], path.join(tmp, 'out'));
  assert(files.length === art.tiles.asphalt.length, `wypalono ${files.length}`);
  assert(files.length === 6, `oczekiwano 6 wariantów, jest ${files.length}`);
  assert(files.every((f) => f.width === 128 && f.height === 64), 'zły rozmiar pliku');
});

check('romb otoczony magenta, środek pomalowany', () => {
  const png = PNG.sync.read(fs.readFileSync(path.join(tmp, 'out', 'asphalt_01.png')));
  const at = (x, y) => {
    const i = (y * png.width + x) * 4;
    return [png.data[i], png.data[i + 1], png.data[i + 2], png.data[i + 3]];
  };
  for (const [x, y] of [[0, 0], [127, 0], [0, 63], [127, 63]]) {
    assert(at(x, y).join(',') === '255,0,255,255', `róg ${x},${y}: ${at(x, y)}`);
  }
  assert(at(64, 32).join(',') !== '255,0,255,255', 'środek nie może być magenta');
  assert(at(64, 32)[3] === 255, 'źródło jest nieprzezroczyste (alfa dopiero w clean-magenta)');
});

check('nieznany rodzaj to czytelny błąd', () => {
  let err = null;
  try {
    bakeGroundTiles(['lawa'], path.join(tmp, 'out'));
  } catch (e) { err = e; }
  assert(err && /lawa/.test(err.message), `błąd: ${err && err.message}`);
});

console.log('== 2. Determinizm ==');

check('dwa wypalenia dają identyczne bajty', () => {
  bakeGroundTiles(['asphalt'], path.join(tmp, 'det-a'));
  bakeGroundTiles(['asphalt'], path.join(tmp, 'det-b'));
  for (const f of fs.readdirSync(path.join(tmp, 'det-a'))) {
    const a = fs.readFileSync(path.join(tmp, 'det-a', f));
    const b = fs.readFileSync(path.join(tmp, 'det-b', f));
    assert(a.equals(b), `${f} różni się między przebiegami`);
  }
});

console.log('== 3. Powrót do 32x16 przez pipeline ==');

check('clean-magenta + resize ÷2 ÷2 wraca piksel w piksel do gry', () => {
  art.tiles.asphalt.forEach((pb, i) => {
    const png = bakeTileToPng(pb);
    const cleaned = PNG.sync.read(cleanMagentaFromBuffer(PNG.sync.write(png)).buffer);
    const t32 = scaleNearestNeighbor(scaleNearestNeighbor(cleaned, 64, 32), 32, 16);

    for (let y = 0; y < 16; y++) {
      for (let x = 0; x < 32; x++) {
        const src = pb.data[y * 32 + x];
        const d = (y * 32 + x) * 4;
        if (src === TRANSPARENT) {
          assert(t32.data[d + 3] === 0, `wariant ${i} (${x},${y}): przezroczystość zgubiona`);
          continue;
        }
        const want = RGB[src];
        assert(t32.data[d + 3] === 255, `wariant ${i} (${x},${y}): brak krycia`);
        assert(t32.data[d] === want[0] && t32.data[d + 1] === want[1] && t32.data[d + 2] === want[2],
          `wariant ${i} (${x},${y}): ${[t32.data[d], t32.data[d + 1], t32.data[d + 2]]} != ${want}`);
      }
    }
  });
});

console.log('='.repeat(64));
fs.rmSync(tmp, { recursive: true, force: true });
if (failures.length) {
  console.log(` NIEPOWODZENIE: ${failures.length} / ${passed + failures.length}`);
  for (const f of failures) console.log(`  - ${f.name}: ${f.error.message}`);
  process.exit(1);
}
console.log(` Wszystkie testy wypalania podłóg zaliczone: ${passed} / ${passed} OK!`);
console.log('='.repeat(64));
