// Test importera packa (tools/import-isotilepack.mjs) + łańcucha skalowania.
// Nie wymaga pobrania packa: buduje syntetyczne arkusze z fixture'ów w repo.
// Uruchomienie: node tools/test-isotilepack-import.mjs

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import zlib from 'node:zlib';
import { PNG } from './png_mini.js';
import { importIsotilePack } from './import-isotilepack.mjs';
import { cleanMagentaDirectory } from './clean-magenta.mjs';
import { resizeTilesBatch } from './resize-tiles.mjs';
import { quantizeDirectory } from './quantize-palette.mjs';

const ROOT = path.resolve('.');
const DEMO_DIR = path.join(ROOT, 'assets/source/isotilepack/demo');
const TILE = { w: 128, h: 64 };

let passed = 0;
const failures = [];

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

// --- pomocnicze --------------------------------------------------------

function readDemo(name) {
  return PNG.sync.read(fs.readFileSync(path.join(DEMO_DIR, name)));
}

function composeSheet(tiles, cols) {
  const rows = Math.ceil(tiles.length / cols);
  const sheet = new PNG({ width: cols * TILE.w, height: rows * TILE.h });
  tiles.forEach((t, i) => {
    const ox = (i % cols) * TILE.w;
    const oy = Math.floor(i / cols) * TILE.h;
    for (let y = 0; y < TILE.h; y++) {
      const s = y * TILE.w * 4;
      const d = ((oy + y) * sheet.width + ox) * 4;
      t.data.copy(sheet.data, d, s, s + TILE.w * 4);
    }
  });
  return sheet;
}

function writePng(file, png) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, PNG.sync.write(png));
}

// Syntetyczny kafel w jednym kolorze (z delikatną szachownicą, żeby nie był płaski).
function makeTile(r, g, b) {
  const p = new PNG({ width: TILE.w, height: TILE.h });
  for (let y = 0; y < TILE.h; y++) {
    for (let x = 0; x < TILE.w; x++) {
      const k = ((x >> 3) + (y >> 3)) % 2 ? 1 : 0.82;
      const i = (y * TILE.w + x) * 4;
      p.data[i] = Math.round(r * k);
      p.data[i + 1] = Math.round(g * k);
      p.data[i + 2] = Math.round(b * k);
      p.data[i + 3] = 255;
    }
  }
  return p;
}

// Minimalny enkoder PNG indeksowanego (colorType 3) — do testu obsługi palety.
const CRC_TABLE = new Uint32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
  CRC_TABLE[n] = c;
}
function crc32(buf) {
  let crc = 0xffffffff;
  for (const b of buf) crc = CRC_TABLE[(crc ^ b) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const typeBuf = Buffer.from(type, 'ascii');
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crcBuf]);
}
function encodeIndexedPng(width, height, indices, palette, alphas = null) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr.writeUInt8(8, 8);   // bit depth
  ihdr.writeUInt8(3, 9);   // color type: indexed
  ihdr.writeUInt8(0, 10);
  ihdr.writeUInt8(0, 11);
  ihdr.writeUInt8(0, 12);
  const plte = Buffer.from(palette.flatMap((c) => [c[0], c[1], c[2]]));
  const rows = [];
  for (let y = 0; y < height; y++) {
    rows.push(Buffer.from([0, ...indices.slice(y * width, (y + 1) * width)]));
  }
  const parts = [
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('PLTE', plte),
  ];
  if (alphas) parts.push(chunk('tRNS', Buffer.from(alphas)));
  parts.push(chunk('IDAT', zlib.deflateSync(Buffer.concat(rows))), chunk('IEND', Buffer.alloc(0)));
  return Buffer.concat(parts);
}

// --- przygotowanie syntetycznego "packa" -------------------------------

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'amboid-pack-'));
const packDir = path.join(tmp, 'pack');
const outDir = path.join(tmp, 'out');

const demos = fs.readdirSync(DEMO_DIR).filter((f) => f.endsWith('.png')).sort();
assert(demos.length >= 8, `Potrzeba min. 8 fixture'ów, jest ${demos.length}`);
const demoPngs = demos.map(readDemo);

const sheet = composeSheet(demoPngs.slice(0, 8), 4); // 512x128, 8 kafli
writePng(path.join(packDir, 'Exterior/Grass Terrain/SBS - Grass Terrain - Small 128x64.png'), sheet);
// Ten sam arkusz drugi raz — test deduplikacji.
writePng(path.join(packDir, 'Exterior/Grass Terrain Copy/SBS - Grass Terrain Copy - Small 128x64.png'), sheet);
// Pojedyncze kafle w innych materiałach (syntetyczne, żeby nie kolidowały
// z kaflami z arkusza przy deduplikacji).
writePng(path.join(packDir, 'Exterior/Dry Terrain/dry-01.png'), makeTile(140, 100, 60));
writePng(path.join(packDir, 'Interior/Wood Floor/wood-01.png'), makeTile(120, 70, 30));
writePng(path.join(packDir, 'Exterior/Ice Terrain/ice-01.png'), makeTile(120, 200, 230));
// Musi być zignorowane: katalog demo/ i plik o złym rozmiarze.
writePng(path.join(packDir, 'demo/demo-09.png'), demoPngs[3]);
fs.mkdirSync(path.join(packDir, 'Exterior/Grass Terrain'), { recursive: true });
fs.writeFileSync(path.join(packDir, 'Exterior/Grass Terrain/broken.png'), PNG.sync.write(new PNG({ width: 100, height: 50 })));

console.log('== 1. Dekoder PNG indeksowanego (png_mini) ==');
check('odczyt palety 8-bit + tRNS', () => {
  const buf = encodeIndexedPng(
    2, 2,
    [0, 1, 2, 3],
    [[255, 0, 0], [0, 255, 0], [0, 0, 255], [255, 0, 255]],
    [255, 255, 255, 0],
  );
  const png = PNG.sync.read(buf);
  assert(png.width === 2 && png.height === 2, 'złe wymiary');
  const px = (i) => [...png.data.subarray(i * 4, i * 4 + 4)];
  assert(JSON.stringify(px(0)) === JSON.stringify([255, 0, 0, 255]), `piksel 0: ${px(0)}`);
  assert(JSON.stringify(px(1)) === JSON.stringify([0, 255, 0, 255]), `piksel 1: ${px(1)}`);
  assert(JSON.stringify(px(2)) === JSON.stringify([0, 0, 255, 255]), `piksel 2: ${px(2)}`);
  assert(JSON.stringify(px(3)) === JSON.stringify([255, 0, 255, 0]), `piksel 3 (tRNS): ${px(3)}`);
});

console.log('== 2. Import: cięcie arkuszy, mapowanie, dedupe, kuracja ==');
const res = importIsotilePack({ inputDir: packDir, outputDir: outDir, perMaterial: 3 });

check('arkusz pocięty na 8 kafli, duplikat wykryty', () => {
  assert(res.sheets === 2, `arkuszy: ${res.sheets} (oczekiwano 2)`);
  assert(res.totalTiles === 19, `kafli razem: ${res.totalTiles} (16 z arkuszy + 3 pojedyncze)`);
  assert(res.skipped.duplicate === 8, `duplikatów: ${res.skipped.duplicate} (oczekiwano 8)`);
  assert(res.skipped.badSize === 1, `złego rozmiaru: ${res.skipped.badSize} (oczekiwano 1)`);
});

check('katalog demo/ zignorowany', () => {
  const names = fs.readdirSync(outDir).filter((f) => f.endsWith('.png'));
  assert(names.length === 5, `plików wyjściowych: ${names.length} (3 grass + 1 dirt + 1 wood)`);
});

check('mapowanie materiałów i kuracja do 3 na rodzaj', () => {
  const grass = res.report.find((r) => r.kind === 'grass');
  const dirt = res.report.find((r) => r.kind === 'dirt');
  const wood = res.report.find((r) => r.kind === 'wood');
  assert(grass && grass.found === 8 && grass.picked === 3, `grass: ${JSON.stringify(grass)}`);
  assert(dirt && dirt.found === 1 && dirt.picked === 1, `dirt: ${JSON.stringify(dirt)}`);
  assert(wood && wood.found === 1 && wood.picked === 1, `wood: ${JSON.stringify(wood)}`);
});

check('materiał bez odpowiednika (ice) zaraportowany', () => {
  assert(res.unmappedMaterials.has('ice'), `pominięte: ${[...res.unmappedMaterials.keys()]}`);
});

check('nazwy plików <rodzaj>_<nn>.png i rozmiar 128x64', () => {
  const names = fs.readdirSync(outDir).filter((f) => f.endsWith('.png')).sort();
  for (const n of names) {
    assert(/^(grass|dirt|asphalt|sidewalk|wood|tile|carpet|water|concrete|gravel)_\d{2}\.png$/.test(n), `zła nazwa: ${n}`);
    const p = PNG.sync.read(fs.readFileSync(path.join(outDir, n)));
    assert(p.width === TILE.w && p.height === TILE.h, `${n}: ${p.width}x${p.height}`);
  }
});

check('NOTICE.md istnieje i podaje CC0', () => {
  const notice = fs.readFileSync(path.join(outDir, 'NOTICE.md'), 'utf8');
  assert(/CC0/.test(notice), 'brak wzmianki o CC0');
  assert(/screamingbrainstudios\.itch\.io/.test(notice), 'brak źródła');
});

check('import jest deterministyczny (te same nazwy i bajty)', () => {
  const out2 = path.join(tmp, 'out2');
  importIsotilePack({ inputDir: packDir, outputDir: out2, perMaterial: 3 });
  const a = fs.readdirSync(outDir).filter((f) => f.endsWith('.png')).sort();
  const b = fs.readdirSync(out2).filter((f) => f.endsWith('.png')).sort();
  assert(JSON.stringify(a) === JSON.stringify(b), 'różne nazwy plików');
  for (const n of a) {
    const x = fs.readFileSync(path.join(outDir, n));
    const y = fs.readFileSync(path.join(out2, n));
    assert(x.equals(y), `różna zawartość: ${n}`);
  }
});

check('--all bierze wszystkie unikalne kafle (8, nie 16)', () => {
  const outAll = path.join(tmp, 'out-all');
  const r = importIsotilePack({ inputDir: packDir, outputDir: outAll, perMaterial: 0 });
  const grass = r.report.find((x) => x.kind === 'grass');
  assert(grass.found === 8, `grass found: ${grass.found}`);
  assert(grass.picked === 8, `grass picked: ${grass.picked}`);
});

console.log('== 3. Łańcuch: clean-magenta -> resize -> quantize ==');
const cleanDir = path.join(tmp, 'clean');
const t64 = path.join(tmp, 't64');
const t32 = path.join(tmp, 't32');
const q64 = path.join(tmp, 'q64');

cleanMagentaDirectory(outDir, cleanDir);
resizeTilesBatch(cleanDir, t64, t32);
quantizeDirectory(t64, q64, 'aga');

check('clean-magenta: 128x64', () => {
  for (const n of fs.readdirSync(cleanDir)) {
    const p = PNG.sync.read(fs.readFileSync(path.join(cleanDir, n)));
    assert(p.width === 128 && p.height === 64, `${n}: ${p.width}x${p.height}`);
  }
});

check('resize: 64x32 i 32x16, ta sama liczba plików', () => {
  const src = fs.readdirSync(cleanDir).filter((f) => f.endsWith('.png')).length;
  const a = fs.readdirSync(t64).filter((f) => f.endsWith('.png'));
  const b = fs.readdirSync(t32).filter((f) => f.endsWith('.png'));
  assert(a.length === src && b.length === src, `źródło ${src}, 64: ${a.length}, 32: ${b.length}`);
  for (const n of a) {
    const p = PNG.sync.read(fs.readFileSync(path.join(t64, n)));
    assert(p.width === 64 && p.height === 32, `${n}: ${p.width}x${p.height}`);
  }
  for (const n of b) {
    const p = PNG.sync.read(fs.readFileSync(path.join(t32, n)));
    assert(p.width === 32 && p.height === 16, `${n}: ${p.width}x${p.height}`);
  }
});

check('quantize aga: 64 kolory, wymiary bez zmian', () => {
  const a = fs.readdirSync(t64).filter((f) => f.endsWith('.png'));
  const q = fs.readdirSync(q64).filter((f) => f.endsWith('.png'));
  assert(a.length === q.length, `64: ${a.length}, q: ${q.length}`);
  for (const n of q) {
    const p = PNG.sync.read(fs.readFileSync(path.join(q64, n)));
    assert(p.width === 64 && p.height === 32, `${n}: ${p.width}x${p.height}`);
    const colors = new Set();
    for (let i = 0; i < p.data.length; i += 4) {
      if (p.data[i + 3] === 0) continue;
      colors.add((p.data[i] << 16) | (p.data[i + 1] << 8) | p.data[i + 2]);
    }
    assert(colors.size <= 64, `${n}: ${colors.size} kolorów`);
  }
});

// --- podsumowanie ------------------------------------------------------

fs.rmSync(tmp, { recursive: true, force: true });

console.log('='.repeat(64));
if (failures.length) {
  console.log(` NIEPOWODZENIE: ${failures.length} / ${passed + failures.length}`);
  for (const f of failures) console.log(`  - ${f.name}: ${f.error.message}`);
  process.exit(1);
}
console.log(` Wszystkie testy importu packa zaliczone: ${passed} / ${passed} OK!`);
console.log('='.repeat(64));
