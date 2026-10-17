// Eksport wygenerowanego miasteczka do zwięzłego formatu binarnego AMB1.
// Format jest opisany w docs/AMIGA.md i nadaje się do bezpośredniego
// wczytania przez silnik 68000 (mapa kafli + obiekty + pojemniki + spawny).
import fs from 'node:fs';
import path from 'node:path';
import { World, WORLD_W, WORLD_H } from '../src/world.js';
import { ITEMS } from '../src/items.js';

const seed = Number(process.argv[2] || 0x5eed1) >>> 0;
const world = new World(seed);
const outDir = path.resolve('docs/amiga');
fs.mkdirSync(outDir, { recursive: true });

const GROUND = ['grass', 'dirt', 'asphalt', 'sidewalk', 'wood', 'tile', 'carpet', 'water', 'concrete', 'gravel'];
const PROPS = [
  'tree', 'bush', 'fence', 'car', 'crate', 'shelf', 'fridge', 'counter', 'table',
  'couch', 'bed', 'chair', 'dumpster', 'trashcan', 'barrel', 'streetlight', 'hydrant',
  'bench', 'mailbox', 'corpse',
];
const WALL_MAT = ['brick', 'concrete', 'wood'];
const WALL_FEATURE = [null, 'door', 'window', 'windowBroken'];

const itemIndex = new Map();
Object.keys(ITEMS).forEach((id, i) => itemIndex.set(id, i + 1));
const itemIds = ['', ...Object.keys(ITEMS)];

// --- sekcje ---
const strings = [];
function strIdx(s) {
  if (!s) return 0;
  let i = strings.indexOf(s);
  if (i < 0) {
    strings.push(s);
    i = strings.length - 1;
  }
  return i + 1;
}

// kafle
const tiles = [];
for (const t of world.tiles) {
  tiles.push({
    ground: GROUND.indexOf(t.ground),
    gv: t.gv,
    inside: t.inside,
    wallMat: t.wall ? WALL_MAT.indexOf(t.wall.mat) : 255,
    wallFeature: t.wall ? Math.max(0, WALL_FEATURE.indexOf(t.wall.feature)) : 255,
    open: t.wall && t.wall.open ? 1 : 0,
    broken: t.wall && t.wall.broken ? 1 : 0,
    barricade: t.wall ? t.wall.barricade : 0,
    prop: t.prop ? PROPS.indexOf(t.prop.kind) : 255,
    variant: t.prop && t.prop.variant != null ? (typeof t.prop.variant === 'number' ? t.prop.variant : 0) : 0,
    decal: t.decal ? (t.decal.kind === 'blood' ? 1 + (t.decal.v % 4) : 6) : 0,
  });
}

// pojemniki
const containers = [];
for (const t of world.tiles) {
  if (!t.prop || !t.prop.container) continue;
  containers.push({
    x: t.x,
    y: t.y,
    type: strIdx(t.prop.container.type),
    searched: t.prop.container.searched ? 1 : 0,
    loot: t.prop.container.loot.map((it) => [itemIndex.get(it.id) || 0, it.count, it.dur || 0]),
  });
}

// luźne przedmioty
const groundItems = world.items.map((rec) => [rec.x, rec.y, itemIndex.get(rec.item.id) || 0, rec.item.count, rec.item.dur || 0]);
// zombie spawny
const zombieSpawns = world.zombies.map((z) => [z.x, z.y, z.variant]);
// budynki
const buildings = world.buildings.map((b) => [b.x, b.y, b.w, b.h, strIdx(b.type), strIdx(b.floor), b.doorX, b.doorY, b.start ? 1 : 0]);

// --- zapis binarny ---
const parts = [];
function u8(v) { const b = Buffer.alloc(1); b.writeUInt8(v & 0xff, 0); parts.push(b); }
function u16(v) { const b = Buffer.alloc(2); b.writeUInt16BE(v & 0xffff, 0); parts.push(b); }
function u32(v) { const b = Buffer.alloc(4); b.writeUInt32BE(v >>> 0, 0); parts.push(b); }
function i16(v) { const b = Buffer.alloc(2); b.writeInt16BE(v, 0); parts.push(b); }
function bytes(arr) { parts.push(Buffer.from(arr)); }

u32(0x414d4231); // "AMB1"
u16(WORLD_W);
u16(WORLD_H);
u32(seed);
u16(itemIds.length);
for (const id of itemIds) { const s = Buffer.from(id, 'ascii'); u8(s.length); bytes(s); }
u16(strings.length);
for (const s of strings) { const b = Buffer.from(s, 'utf8'); u16(b.length); bytes(b); }

u16(tiles.length);
for (const t of tiles) {
  u8(t.ground); u8(t.gv); u8(t.inside === 255 ? 255 : t.inside);
  u8(t.wallMat); u8(t.wallFeature); u8((t.open ? 1 : 0) | (t.broken ? 2 : 0)); u8(t.barricade);
  u8(t.prop); u8(t.variant); u8(t.decal);
}

u16(buildings.length);
for (const b of buildings) { u16(b[0]); u16(b[1]); u16(b[2]); u16(b[3]); u16(b[4]); u16(b[5]); u16(b[6]); u16(b[7]); u8(b[8]); }

u16(containers.length);
for (const c of containers) {
  u16(c.x); u16(c.y); u16(c.type); u8(c.searched); u8(c.loot.length);
  for (const l of c.loot) { u8(l[0]); u8(Math.min(255, l[1])); i16(l[2]); }
}

u16(groundItems.length);
for (const g of groundItems) { u16(g[0]); u16(g[1]); u8(g[2]); u8(Math.min(255, g[3])); i16(g[4]); }

u16(zombieSpawns.length);
for (const z of zombieSpawns) { u16(z[0]); u16(z[1]); u8(z[2]); }

u16(world.lamps.length);
for (const l of world.lamps) { u16(l.x); u16(l.y); }

const data = Buffer.concat(parts);
const file = path.join(outDir, `miasto-${world.seedLabel}.amb`);
fs.writeFileSync(file, data);

console.log(`zapisano ${file}`);
console.log(`rozmiar: ${(data.length / 1024).toFixed(1)} KB`);
console.log(`kafle: ${tiles.length}, budynki: ${buildings.length}, pojemniki: ${containers.length}, przedmioty: ${groundItems.length}, zombie: ${zombieSpawns.length}`);
console.log('legenda kafli:', GROUND.join(', '));
console.log('legenda rekwizytów:', PROPS.join(', '));
