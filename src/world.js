// Generacja miasteczka: ulice, budynki, meble, łupy, zombie.
// Wszystko deterministyczne na podstawie seeda.

import { makeRng } from './rng.js';
import { rollLoot, spawnItem, ITEMS } from './items.js';

export const WORLD_W = 48;
export const WORLD_H = 40;

const ROADS_X = [
  [8, 9],
  [25, 26],
  [40, 41],
];
const ROADS_Y = [
  [7, 8],
  [20, 21],
  [33, 34],
];

const BUILDINGS = [
  { key: 'start', x: 12, y: 1, w: 7, h: 5, mat: 'wood', floor: 'wood', type: 'house', door: { side: 'south', at: 3 }, start: true },
  { key: 'shop', x: 28, y: 1, w: 9, h: 6, mat: 'brick', floor: 'tile', type: 'shop', door: { side: 'south', at: 4 } },
  { key: 'houseB', x: 2, y: 10, w: 6, h: 6, mat: 'brick', floor: 'wood', type: 'house', door: { side: 'east', at: 2 } },
  { key: 'houseC', x: 11, y: 10, w: 7, h: 6, mat: 'wood', floor: 'wood', type: 'house', door: { side: 'south', at: 3 } },
  { key: 'houseD', x: 19, y: 12, w: 6, h: 7, mat: 'brick', floor: 'wood', type: 'house', door: { side: 'south', at: 2 } },
  { key: 'warehouse', x: 28, y: 10, w: 9, h: 8, mat: 'concrete', floor: 'concrete', type: 'warehouse', door: { side: 'south', at: 4 } },
  { key: 'houseF', x: 43, y: 12, w: 5, h: 6, mat: 'wood', floor: 'wood', type: 'house', door: { side: 'west', at: 2 } },
  { key: 'clinic', x: 2, y: 23, w: 6, h: 7, mat: 'concrete', floor: 'tile', type: 'clinic', door: { side: 'east', at: 3 } },
  { key: 'houseH', x: 11, y: 23, w: 6, h: 6, mat: 'wood', floor: 'wood', type: 'house', door: { side: 'south', at: 2 } },
  { key: 'houseI', x: 18, y: 24, w: 6, h: 7, mat: 'brick', floor: 'carpet', type: 'house', door: { side: 'south', at: 2 } },
  { key: 'gas', x: 28, y: 23, w: 8, h: 6, mat: 'concrete', floor: 'tile', type: 'gas', door: { side: 'south', at: 3 } },
  { key: 'houseK', x: 42, y: 25, w: 5, h: 6, mat: 'wood', floor: 'wood', type: 'house', door: { side: 'west', at: 2 } },
];

const PROP_DEF = {
  tree: { blocking: true, sight: true, shadow: 'medium', name: 'DRZEWO' },
  bush: { blocking: false, sight: false, shadow: 'small', name: 'KRZAK' },
  fence: { blocking: true, sight: false, shadow: 'small', name: 'PŁOT' },
  car: { blocking: true, sight: true, shadow: 'large', name: 'SAMOCHÓD', container: 'car' },
  crate: { blocking: true, container: 'crate', name: 'SKRZYNIA' },
  shelf: { blocking: true, sight: true, container: 'shelf', name: 'PÓŁKA' },
  fridge: { blocking: true, sight: true, container: 'fridge', name: 'LODÓWKA' },
  counter: { blocking: true, container: 'counter', name: 'SZAFKA' },
  table: { blocking: true, container: 'table', name: 'STÓŁ' },
  couch: { blocking: true, name: 'KANAPA' },
  bed: { blocking: false, name: 'ŁÓŻKO', sleep: true },
  chair: { blocking: false, name: 'KRZESŁO' },
  dumpster: { blocking: true, sight: true, container: 'dumpster', name: 'KONTENER' },
  trashcan: { blocking: true, container: 'trash', name: 'ŚMIETNIK' },
  barrel: { blocking: true, name: 'BECZKA' },
  streetlight: { blocking: false, name: 'LATARNIA', lamp: true },
  hydrant: { blocking: false, name: 'HYDRANT' },
  bench: { blocking: false, name: 'ŁAWKA' },
  mailbox: { blocking: false, name: 'SKRZYNKA' },
  corpse: { blocking: false, container: 'corpse', name: 'CIAŁO', corpse: true },
};

const CAR_COLORS = ['Blue', 'Red', 'Metal', 'Yellow'];

function key(x, y) {
  return y * WORLD_W + x;
}

export class World {
  constructor(seed) {
    this.seed = seed >>> 0;
    this.rng = makeRng(this.seed);
    this.w = WORLD_W;
    this.h = WORLD_H;
    this.tiles = new Array(WORLD_W * WORLD_H);
    this.buildings = [];
    this.zombies = [];
    this.items = [];
    this.lamps = [];
    this.effects = [];
    this.lampLight = new Uint8Array(WORLD_W * WORLD_H);
    this.visible = new Uint8Array(WORLD_W * WORLD_H);
    this.explored = new Uint8Array(WORLD_W * WORLD_H);
    this.reserved = new Set();
    this.doorFronts = new Set();
    this.start = { x: 15, y: 3 };
    this.seedLabel = this.seed.toString(36).toUpperCase().padStart(6, '0').slice(-6);
    this._generate();
  }

  idx(x, y) {
    return y * WORLD_W + x;
  }

  inBounds(x, y) {
    return x >= 0 && y >= 0 && x < WORLD_W && y < WORLD_H;
  }

  tile(x, y) {
    if (!this.inBounds(x, y)) return null;
    return this.tiles[this.idx(x, y)];
  }

  isRoad(x, y) {
    return ROADS_X.some(([a, b]) => x >= a && x <= b) || ROADS_Y.some(([a, b]) => y >= a && y <= b);
  }

  // -------------------------------------------------------------------------
  _generate() {
    const rng = this.rng;

    // 1. Baza: trawa
    for (let y = 0; y < WORLD_H; y++) {
      for (let x = 0; x < WORLD_W; x++) {
        this.tiles[this.idx(x, y)] = {
          x,
          y,
          ground: 'grass',
          gv: rng.int(0, 2),
          wall: null,
          prop: null,
          decal: null,
          inside: -1,
          lamp: false,
        };
      }
    }

    // 2. Ulice
    for (let y = 0; y < WORLD_H; y++) {
      for (let x = 0; x < WORLD_W; x++) {
        if (this.isRoad(x, y)) {
          const t = this.tile(x, y);
          t.ground = 'asphalt';
          t.gv = rng.int(0, 2);
        }
      }
    }
    // 3. Chodniki przy ulicach
    for (let y = 0; y < WORLD_H; y++) {
      for (let x = 0; x < WORLD_W; x++) {
        if (this.isRoad(x, y)) continue;
        const adjacent = [
          [1, 0],
          [-1, 0],
          [0, 1],
          [0, -1],
        ].some(([dx, dy]) => this.inBounds(x + dx, y + dy) && this.isRoad(x + dx, y + dy));
        if (adjacent) {
          const t = this.tile(x, y);
          t.ground = 'sidewalk';
          t.gv = rng.int(0, 2);
        }
      }
    }

    // 4. Budynki
    for (const cfg of BUILDINGS) this.buildBuilding(cfg);

    // 5. Reszta dekoracji
    this.placeStreets();
    this.placeCars();
    this.placeCorpses();
    this.scatterNature();
    this.scatterGroundItems();
    this.spawnZombies(40);

    // 6. Światło latarni
    for (const lamp of this.lamps) {
      for (let dy = -4; dy <= 4; dy++) {
        for (let dx = -4; dx <= 4; dx++) {
          const x = lamp.x + dx;
          const y = lamp.y + dy;
          if (!this.inBounds(x, y)) continue;
          const d = Math.sqrt(dx * dx + dy * dy);
          const boost = d <= 1.5 ? 3 : d <= 2.6 ? 2 : d <= 3.8 ? 1 : 0;
          const i = this.idx(x, y);
          if (boost > this.lampLight[i]) this.lampLight[i] = boost;
        }
      }
    }

    // 7. Startowa widoczność
    this.computeFOV(this.start.x, this.start.y, 9);
  }

  // -------------------------------------------------------------------------
  buildBuilding(cfg) {
    const rng = this.rng;
    const b = { ...cfg, id: this.buildings.length };
    const door = this.doorCoordinates(b);
    b.doorX = door.x;
    b.doorY = door.y;
    this.buildings.push(b);

    // podłoga
    for (let y = b.y; y < b.y + b.h; y++) {
      for (let x = b.x; x < b.x + b.w; x++) {
        const t = this.tile(x, y);
        t.ground = b.floor;
        t.gv = rng.int(0, 2);
        t.inside = b.id;
      }
    }

    // ściany
    for (let y = b.y; y < b.y + b.h; y++) {
      for (let x = b.x; x < b.x + b.w; x++) {
        if (x !== b.x && x !== b.x + b.w - 1 && y !== b.y && y !== b.y + b.h - 1) continue;
        const t = this.tile(x, y);
        t.wall = {
          mat: b.mat,
          feature: null,
          open: false,
          broken: false,
          barricade: 0,
          hp: 0,
          maxHp: 0,
        };
      }
    }

    // drzwi
    const doorTile = this.tile(door.x, door.y);
    doorTile.wall.feature = 'door';
    doorTile.wall.open = false;
    doorTile.wall.hp = 70;
    doorTile.wall.maxHp = 70;

    // okna na obwodzie
    const perimeter = [];
    for (let x = b.x + 1; x < b.x + b.w - 1; x++) {
      perimeter.push([x, b.y], [x, b.y + b.h - 1]);
    }
    for (let y = b.y + 1; y < b.y + b.h - 1; y++) {
      perimeter.push([b.x, y], [b.x + b.w - 1, y]);
    }
    let sideCounter = 0;
    for (const [x, y] of perimeter) {
      sideCounter++;
      if (x === door.x && y === door.y) continue;
      if (sideCounter % 4 !== 2) continue;
      const t = this.tile(x, y);
      if (!t.wall) continue;
      t.wall.feature = 'window';
      t.wall.broken = rng.chance(0.18);
      t.wall.hp = 0;
      t.wall.maxHp = 0;
    }

    // strefa przed drzwiami wolna od przeszkód
    const outside = this.outsideDoor(b);
    this.doorFronts.add(key(outside.x, outside.y));
    this.doorFronts.add(key(door.x, door.y));
    this.doorFronts.add(key(Math.round((outside.x + door.x) / 2), Math.round((outside.y + door.y) / 2)));

    // wnętrze: rezerwacje
    const interior = [];
    for (let y = b.y + 1; y < b.y + b.h - 1; y++) {
      for (let x = b.x + 1; x < b.x + b.w - 1; x++) {
        interior.push([x, y]);
      }
    }
    const reserved = new Set();
    // ścieżka od drzwi w głąb
    const inX = door.x + (door.x === b.x ? 1 : door.x === b.x + b.w - 1 ? -1 : 0);
    const inY = door.y + (door.y === b.y ? 1 : door.y === b.y + b.h - 1 ? -1 : 0);
    reserved.add(key(inX, inY));
    reserved.add(key(door.x, door.y));
    for (let i = 1; i <= 2; i++) {
      const px = inX + (door.x === b.x ? i : door.x === b.x + b.w - 1 ? -i : 0);
      const py = inY + (door.y === b.y ? i : door.y === b.y + b.h - 1 ? -i : 0);
      if (inX >= b.x + 1 && inX <= b.x + b.w - 2 && inY >= b.y + 1 && inY <= b.y + b.h - 2) {
        reserved.add(key(px, py));
      }
    }
    if (b.start) reserved.add(key(this.start.x, this.start.y));

    // meble
    const furnitureByType = {
      house: ['bed', 'shelf', 'fridge', 'table', 'chair', 'couch', 'crate', 'counter', 'chair'],
      shop: ['shelf', 'shelf', 'counter', 'crate', 'fridge', 'shelf'],
      clinic: ['shelf', 'counter', 'bed', 'crate', 'chair', 'shelf'],
      warehouse: ['crate', 'crate', 'shelf', 'barrel', 'crate', 'crate'],
      gas: ['counter', 'shelf', 'crate', 'barrel', 'fridge', 'crate'],
    };
    const list = (furnitureByType[b.type] || furnitureByType.house).slice();
    const wanted = b.start ? 4 : b.type === 'warehouse' || b.type === 'shop' ? 7 : 5;
    const candidates = interior
      .filter(([x, y]) => !reserved.has(key(x, y)))
      .sort(() => rng.next() - 0.5);
    let placed = 0;
    for (const [x, y] of candidates) {
      if (placed >= wanted) break;
      if (this.tile(x, y).prop) continue;
      // meble przy ścianach
      const nearWall = x === b.x + 1 || x === b.x + b.w - 2 || y === b.y + 1 || y === b.y + b.h - 2;
      if (!nearWall && b.type !== 'warehouse' && rng.chance(0.6)) continue;
      const kind = list[(rng.next() * list.length) | 0];
      if (kind === 'bed' && placed > wanted - 3) continue;
      this.addProp(x, y, kind, null, { silent: true });
      placed++;
    }

    // gwarantowane łupy w wybranych budynkach
    if (b.type === 'clinic') {
      const c = this.findContainer(b, 'shelf') || this.findContainer(b);
      if (c) c.container.loot.push(spawnItem('medkit', rng), spawnItem('bandage', rng), spawnItem('pills', rng));
    } else if (b.type === 'warehouse') {
      const c = this.findContainer(b, 'crate') || this.findContainer(b);
      if (c) c.container.loot.push(spawnItem('axe', rng), spawnItem('plank', rng), spawnItem('nails', rng), spawnItem('hammer', rng));
    } else if (b.type === 'gas') {
      const c = this.findContainer(b, 'counter') || this.findContainer(b);
      if (c) c.container.loot.push(spawnItem('pistol', rng), spawnItem('ammo', rng), spawnItem('ammo', rng));
    } else if (b.type === 'shop') {
      const c = this.findContainer(b);
      if (c) c.container.loot.push(spawnItem('chips', rng), spawnItem('water', rng), spawnItem('backpack', rng));
    }

    // startowy dom: ręczne wyposażenie i pewny kij
    if (b.start) {
      this.addProp(b.x + 1, b.y + 1, 'fridge', null, { silent: true });
      this.addProp(b.x + b.w - 2, b.y + 1, 'shelf', null, { silent: true });
      this.addProp(b.x + b.w - 2, b.y + b.h - 2, 'bed', null, { silent: true });
      this.addProp(b.x + 1, b.y + b.h - 2, 'chair', null, { silent: true });
      const fridge = this.tile(b.x + 1, b.y + 1).prop;
      if (fridge && fridge.container) {
        fridge.container.loot.push(spawnItem('water', rng), spawnItem('can', rng), spawnItem('bandage', rng));
      }
      this.dropGuaranteedItem(b, 'bat');
      this.dropGuaranteedItem(b, 'bandage');
      this.dropGuaranteedItem(b, 'water');
    } else {
      // trochę przedmiotów na podłodze
      if (rng.chance(0.7)) {
        const free = this.freeInteriorTiles(b);
        if (free.length) {
          const [x, y] = free[(rng.next() * free.length) | 0];
          const id = rng.pick(['bandage', 'water', 'can', 'magazine', 'ammo', 'scrap', 'chips']);
          this.dropItem(x, y, id);
        }
      }
    }

    // śmieci przy wejściu
    if (!b.start && rng.chance(0.5)) {
      const sx = outside.x + (rng.chance(0.5) ? 1 : -1);
      const sy = outside.y;
      if (this.canPlaceProp(sx, sy) && this.tile(sx, sy).ground !== 'asphalt') {
        this.addProp(sx, sy, 'trashcan', null, { silent: true });
      }
    }
  }

  doorCoordinates(b) {
    const { side, at } = b.door;
    if (side === 'south') return { x: b.x + at, y: b.y + b.h - 1 };
    if (side === 'north') return { x: b.x + at, y: b.y };
    if (side === 'west') return { x: b.x, y: b.y + at };
    return { x: b.x + b.w - 1, y: b.y + at };
  }

  outsideDoor(b) {
    if (b.door.side === 'south') return { x: b.doorX, y: b.doorY + 1 };
    if (b.door.side === 'north') return { x: b.doorX, y: b.doorY - 1 };
    if (b.door.side === 'west') return { x: b.doorX - 1, y: b.doorY };
    return { x: b.doorX + 1, y: b.doorY };
  }

  findContainer(b, type) {
    for (let y = b.y; y < b.y + b.h; y++) {
      for (let x = b.x; x < b.x + b.w; x++) {
        const p = this.tile(x, y).prop;
        if (p && p.container && (!type || p.container.type === type)) return p;
      }
    }
    return null;
  }

  freeInteriorTiles(b) {
    const out = [];
    for (let y = b.y + 1; y < b.y + b.h - 1; y++) {
      for (let x = b.x + 1; x < b.x + b.w - 1; x++) {
        const t = this.tile(x, y);
        if (!t.prop && !t.wall && !this.itemAt(x, y)) out.push([x, y]);
      }
    }
    return out;
  }

  dropGuaranteedItem(b, id) {
    const free = this.freeInteriorTiles(b).filter(
      ([x, y]) => !(x === this.start.x && y === this.start.y) && !(x === this.start.x && y === this.start.y + 1),
    );
    if (!free.length) return;
    const [x, y] = free[(this.rng.next() * free.length) | 0];
    this.dropItem(x, y, id);
  }

  // -------------------------------------------------------------------------
  canPlaceProp(x, y) {
    if (!this.inBounds(x, y)) return false;
    if (this.doorFronts.has(key(x, y))) return false;
    if (this.reserved.has(key(x, y))) return false;
    const t = this.tile(x, y);
    if (!t || t.wall || t.prop) return false;
    if (t.ground === 'water') return false;
    return true;
  }

  addProp(x, y, kind, variant = null, opts = {}) {
    if (!this.inBounds(x, y)) return null;
    const t = this.tile(x, y);
    if (t.wall || t.prop) return null;
    const def = PROP_DEF[kind];
    if (!def) return null;
    const prop = {
      kind,
      x,
      y,
      variant,
      blocking: def.blocking,
      sight: def.sight || false,
      name: def.name,
      sleep: def.sleep || false,
      lamp: def.lamp || false,
      corpse: def.corpse || false,
      container: null,
    };
    if (kind === 'tree' && variant == null) prop.variant = this.rng.int(0, 3);
    if (kind === 'car') {
      prop.variant = variant || this.rng.pick(CAR_COLORS);
      prop.container = { type: 'car', loot: rollLoot(this.rng, 'car', 1), searched: false };
      prop.name = prop.variant === 'Wreck' ? 'WRAK' : 'SAMOCHÓD';
    } else if (def.container) {
      prop.container = {
        type: def.container,
        loot: rollLoot(this.rng, def.container, opts.bonus || 0),
        searched: false,
      };
      if (opts.extraLoot) prop.container.loot.push(...opts.extraLoot);
    }
    if (kind === 'streetlight') {
      this.lamps.push({ x, y });
      t.lamp = true;
    }
    t.prop = prop;
    return prop;
  }

  placeStreets() {
    const rng = this.rng;
    // latarnie na narożnikach chodników
    const lampSpots = [
      [7, 6], [24, 6], [39, 6],
      [7, 19], [24, 19], [39, 19],
      [7, 32], [24, 32], [39, 32],
      [18, 22], [43, 9], [10, 35],
    ];
    for (const [x, y] of lampSpots) {
      if (this.canPlaceProp(x, y) && !this.tile(x, y).wall) {
        this.addProp(x, y, 'streetlight', null, { silent: true });
      }
    }
    // hydranty
    for (const [x, y] of [[6, 7], [27, 20], [38, 33]]) {
      if (this.canPlaceProp(x, y)) this.addProp(x, y, 'hydrant', null, { silent: true });
    }
    // ławki, skrzynki
    for (const [x, y] of [[17, 6], [9, 24], [42, 22]]) {
      if (this.canPlaceProp(x, y)) this.addProp(x, y, 'bench', null, { silent: true });
    }
    if (this.canPlaceProp(17, 7)) this.addProp(17, 7, 'mailbox', null, { silent: true });
    // śmietniki i kontenery przy budynkach
    for (const [x, y] of [[10, 6], [26, 9], [27, 19], [37, 18], [27, 29], [41, 31], [9, 22]]) {
      if (this.canPlaceProp(x, y) && this.tile(x, y).ground !== 'asphalt') {
        this.addProp(x, y, rng.chance(0.5) ? 'dumpster' : 'trashcan', null, { silent: true });
      }
    }
    // płoty z przerwami
    for (const x of [2, 3, 5, 6]) {
      if (this.canPlaceProp(x, 17)) this.addProp(x, 17, 'fence', null, { silent: true });
    }
    for (const y of [11, 12, 14, 15]) {
      if (this.canPlaceProp(37, y)) this.addProp(37, y, 'fence', null, { silent: true });
    }
    // skrzynie przy magazynie
    for (const [x, y] of [[37, 16], [27, 15]]) {
      if (this.canPlaceProp(x, y)) this.addProp(x, y, 'crate', null, { silent: true });
    }
    // beczki przy stacji
    for (const [x, y] of [[30, 30], [34, 30], [29, 21]]) {
      if (this.canPlaceProp(x, y)) this.addProp(x, y, 'barrel', null, { silent: true });
    }
  }

  placeCars() {
    const cars = [
      [12, 7, 'Blue'],
      [18, 8, 'Metal'],
      [9, 13, 'Red'],
      [25, 26, 'Wreck'],
      [33, 20, 'Yellow'],
      [40, 15, 'Metal'],
      [37, 34, 'Blue'],
      [9, 31, 'Wreck'],
      [44, 7, 'Red'],
    ];
    let firstReal = true;
    for (const [x, y, variant] of cars) {
      const t = this.tile(x, y);
      if (!t || t.prop || t.wall || !this.isRoad(x, y)) continue;
      const prop = this.addProp(x, y, 'car', variant, { silent: true });
      if (prop && prop.container && firstReal && variant !== 'Wreck') {
        prop.container.loot.push(spawnItem('pistol', this.rng), spawnItem('ammo', this.rng), spawnItem('medkit', this.rng));
        firstReal = false;
      }
    }
    // auto na podjeździe przy starcie — gwarantowany plecak
    const prop = this.addProp(17, 7, 'car', 'Wreck', { silent: true });
    if (prop && prop.container) prop.container.loot.push(spawnItem('backpack', this.rng), spawnItem('plank', this.rng));
  }

  placeCorpses() {
    const rng = this.rng;
    const spots = [
      [16, 9], [22, 13], [31, 18], [12, 19], [30, 31], [6, 20], [44, 20], [20, 34],
    ];
    let count = 0;
    for (const [x, y] of spots) {
      if (count >= 6) break;
      if (!this.inBounds(x, y)) continue;
      const t = this.tile(x, y);
      if (t.wall || t.prop || t.ground === 'water') continue;
      const p = this.addProp(x, y, 'corpse', null, { silent: true });
      if (!p) continue;
      p.variant = rng.int(0, 2);
      p.container.loot.push(spawnItem('ammo', rng), spawnItem('bandage', rng));
      t.decal = { kind: 'blood', v: rng.int(0, 3) };
      const nx = x + (rng.chance(0.5) ? 1 : -1);
      if (this.inBounds(nx, y)) {
        const n = this.tile(nx, y);
        if (!n.wall && !n.prop) n.decal = { kind: 'blood', v: rng.int(0, 3) };
      }
      count++;
    }
  }

  scatterNature() {
    const rng = this.rng;
    let trees = 0;
    let attempts = 0;
    while (trees < 44 && attempts < 900) {
      attempts++;
      const x = rng.int(0, WORLD_W - 1);
      const y = rng.int(0, WORLD_H - 1);
      const t = this.tile(x, y);
      if (!t || t.ground !== 'grass' || t.wall || t.prop) continue;
      if (this.doorFronts.has(key(x, y))) continue;
      if (Math.abs(x - this.start.x) < 4 && Math.abs(y - this.start.y) < 4) continue;
      const nearRoad = this.isRoad(x, y);
      if (nearRoad) continue;
      // nie blokuj przejść — zostaw oddech przy chodnikach
      let nearSidewalk = false;
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const n = this.tile(x + dx, y + dy);
          if (n && (n.ground === 'sidewalk' || n.prop || n.wall)) nearSidewalk = true;
        }
      }
      if (nearSidewalk && rng.chance(0.7)) continue;
      this.addProp(x, y, 'tree', rng.int(0, 3), { silent: true });
      trees++;
    }
    let bushes = 0;
    attempts = 0;
    while (bushes < 18 && attempts < 300) {
      attempts++;
      const x = rng.int(0, WORLD_W - 1);
      const y = rng.int(0, WORLD_H - 1);
      const t = this.tile(x, y);
      if (!t || t.ground !== 'grass' || t.wall || t.prop) continue;
      if (this.doorFronts.has(key(x, y))) continue;
      if (Math.abs(x - this.start.x) < 3 && Math.abs(y - this.start.y) < 3) continue;
      this.addProp(x, y, 'bush', null, { silent: true });
      bushes++;
    }
    // trochę dzikiej ziemi i gruzu
    for (let i = 0; i < 30; i++) {
      const x = rng.int(0, WORLD_W - 1);
      const y = rng.int(0, WORLD_H - 1);
      const t = this.tile(x, y);
      if (!t || t.wall || t.prop) continue;
      if (t.ground !== 'grass') continue;
      t.ground = 'dirt';
      t.gv = rng.int(0, 2);
    }
    for (let i = 0; i < 14; i++) {
      const x = rng.int(0, WORLD_W - 1);
      const y = rng.int(0, WORLD_H - 1);
      const t = this.tile(x, y);
      if (!t || t.wall || t.prop || t.decal) continue;
      if (t.ground === 'water') continue;
      t.decal = rng.chance(0.5) ? { kind: 'rubble', v: 0 } : { kind: 'blood', v: rng.int(0, 3) };
    }
  }

  scatterGroundItems() {
    const rng = this.rng;
    const goodies = ['bandage', 'water', 'can', 'chips', 'magazine', 'ammo', 'scrap', 'plank', 'nails', 'map', 'flashlight', 'whiskey', 'medkit', 'knife'];
    let placed = 0;
    let attempts = 0;
    while (placed < 16 && attempts < 500) {
      attempts++;
      const x = rng.int(0, WORLD_W - 1);
      const y = rng.int(0, WORLD_H - 1);
      const t = this.tile(x, y);
      if (!t || t.wall || t.prop || t.ground === 'water') continue;
      if (this.doorFronts.has(key(x, y))) continue;
      if (this.items.some((it) => it.x === x && it.y === y)) continue;
      this.dropItem(x, y, rng.pick(goodies));
      placed++;
    }
  }

  spawnZombies(count) {
    const rng = this.rng;
    let placed = 0;
    let attempts = 0;
    while (placed < count && attempts < 2000) {
      attempts++;
      const x = rng.int(0, WORLD_W - 1);
      const y = rng.int(0, WORLD_H - 1);
      const d = Math.max(Math.abs(x - this.start.x), Math.abs(y - this.start.y));
      if (d < 8) continue;
      if (!this.isWalkable(x, y)) continue;
      const spawnTile = this.tile(x, y);
      if (spawnTile.wall) continue;
      // czasem w budynkach
      const t = this.tile(x, y);
      if (t.inside >= 0 && rng.chance(0.3)) {
        this.addZombie(x, y, rng);
        placed++;
        continue;
      }
      if (t.inside < 0 && rng.chance(0.45)) {
        this.addZombie(x, y, rng);
        placed++;
      }
    }
  }

  addZombie(x, y, rng = this.rng) {
    const z = {
      x,
      y,
      vx: x,
      vy: y,
      tx: x,
      ty: y,
      moving: false,
      moveT: 0,
      moveDur: 0.5,
      dir: rng.int(0, 3),
      frame: 0,
      variant: rng.int(0, 4),
      hp: rng.int(28, 46),
      maxHp: 46,
      state: 'wander',
      timer: rng.float(0.5, 4),
      wander: null,
      target: null,
      investigateTimer: 0,
      chaseTimer: 0,
      lastSeen: null,
      walkPhase: 0,
      flash: 0,
      attackCd: 0,
      bashCd: 0,
      stun: 0,
      decideTimer: 0.3,
      alive: true,
    };
    z.maxHp = z.hp;
    this.zombies.push(z);
    return z;
  }

  // -------------------------------------------------------------------------
  dropItem(x, y, id, count) {
    const item = typeof id === 'string' ? spawnItem(id, this.rng) : id;
    if (!item) return null;
    if (count) item.count = count;
    const rec = { x, y, item };
    this.items.push(rec);
    return rec;
  }

  itemAt(x, y) {
    return this.items.find((it) => it.x === x && it.y === y) || null;
  }

  removeItem(rec) {
    const i = this.items.indexOf(rec);
    if (i >= 0) this.items.splice(i, 1);
  }

  containerAt(x, y) {
    const t = this.tile(x, y);
    return t && t.prop && t.prop.container ? t.prop : null;
  }

  // -------------------------------------------------------------------------
  isWalkable(x, y) {
    if (!this.inBounds(x, y)) return false;
    const t = this.tile(x, y);
    if (!t) return false;
    if (t.ground === 'water') return false;
    if (t.wall) {
      if (t.wall.feature === 'door') return !!t.wall.open;
      if (t.wall.feature === 'window' || t.wall.feature === 'windowBroken') {
        return !t.wall.barricade;
      }
      return false;
    }
    if (t.prop && t.prop.blocking) return false;
    return true;
  }

  moveCost(x, y) {
    const t = this.tile(x, y);
    if (t && t.wall && (t.wall.feature === 'window' || t.wall.feature === 'windowBroken')) return 2;
    return 1;
  }

  blocksSight(x, y) {
    if (!this.inBounds(x, y)) return true;
    const t = this.tile(x, y);
    if (!t) return true;
    if (t.wall) {
      if (t.wall.feature === 'door') return !t.wall.open;
      if (t.wall.feature === 'window') return t.wall.barricade > 0;
      if (t.wall.feature === 'windowBroken') return t.wall.barricade > 0;
      return true;
    }
    if (t.prop && t.prop.sight) return true;
    return false;
  }

  lineOfSight(x0, y0, x1, y1) {
    let x = x0;
    let y = y0;
    const dx = Math.abs(x1 - x0);
    const dy = Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1;
    const sy = y0 < y1 ? 1 : -1;
    let err = dx - dy;
    let guard = 0;
    while ((x !== x1 || y !== y1) && guard++ < 100) {
      const e2 = 2 * err;
      if (e2 > -dy) {
        err -= dy;
        x += sx;
      }
      if (e2 < dx) {
        err += dx;
        y += sy;
      }
      if (x === x1 && y === y1) break;
      if (this.blocksSight(x, y)) return false;
    }
    return true;
  }

  computeFOV(px, py, radius) {
    this.visible.fill(0);
    const r2 = radius * radius;
    for (let dy = -radius; dy <= radius; dy++) {
      for (let dx = -radius; dx <= radius; dx++) {
        if (dx * dx + dy * dy > r2) continue;
        const x = px + dx;
        const y = py + dy;
        if (!this.inBounds(x, y)) continue;
        if (this.lineOfSight(px, py, x, y)) {
          const i = this.idx(x, y);
          this.visible[i] = 1;
          this.explored[i] = 1;
        }
      }
    }
    this.visible[this.idx(px, py)] = 1;
    this.explored[this.idx(px, py)] = 1;
  }

  toggleDoor(x, y) {
    const t = this.tile(x, y);
    if (!t || !t.wall || t.wall.feature !== 'door' || t.wall.destroyed) return false;
    t.wall.open = !t.wall.open;
    return true;
  }

  damageDoor(x, y, amount) {
    const t = this.tile(x, y);
    if (!t || !t.wall || t.wall.feature !== 'door' || t.wall.open) return false;
    t.wall.hp -= amount;
    if (t.wall.hp <= 0) {
      t.wall.open = true;
      t.wall.hp = 0;
      t.wall.destroyed = true;
      return true;
    }
    return false;
  }

  damageBarricade(x, y, amount) {
    const t = this.tile(x, y);
    if (!t || !t.wall) return null;
    const w = t.wall;
    if (w.feature !== 'window' && w.feature !== 'windowBroken') return null;
    if (!w.barricade) return null;
    w.hp -= amount;
    if (w.hp <= 0) {
      w.barricade--;
      if (w.barricade === 0) {
        w.broken = true;
        w.hp = 0;
        return 'broken';
      }
      w.hp = 30;
      return 'level';
    }
    return 'hit';
  }

  canBarricade(x, y) {
    const t = this.tile(x, y);
    if (!t || !t.wall) return false;
    const w = t.wall;
    const isWindow = w.feature === 'window' || w.feature === 'windowBroken';
    return isWindow && w.barricade < 3;
  }

  addBarricade(x, y) {
    const t = this.tile(x, y);
    if (!t || !t.wall) return false;
    const w = t.wall;
    if (!this.canBarricade(x, y)) return false;
    w.barricade++;
    w.hp = 30;
    w.broken = w.broken || false;
    return true;
  }

  // -------------------------------------------------------------------------
  findNearest(predicate, x, y, maxDist = 2) {
    let best = null;
    let bestD = Infinity;
    for (let dy = -Math.ceil(maxDist); dy <= Math.ceil(maxDist); dy++) {
      for (let dx = -Math.ceil(maxDist); dx <= Math.ceil(maxDist); dx++) {
        const nx = x + dx;
        const ny = y + dy;
        if (!this.inBounds(nx, ny)) continue;
        const d = Math.max(Math.abs(dx), Math.abs(dy));
        if (d > maxDist) continue;
        const value = predicate(this.tile(nx, ny), nx, ny);
        if (value && d < bestD) {
          bestD = d;
          best = { tile: this.tile(nx, ny), x: nx, y: ny, dist: d, value };
        }
      }
    }
    return best;
  }

  zombiesInView(px, py, radius) {
    const r2 = radius * radius;
    return this.zombies.filter((z) => z.alive && (z.x - px) ** 2 + (z.y - py) ** 2 <= r2);
  }
}
