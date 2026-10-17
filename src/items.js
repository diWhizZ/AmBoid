// Przedmioty, łupy i ich statystyki.

export const ITEMS = {
  bandage: {
    name: 'BANDAŻ',
    icon: 'bandage',
    type: 'heal',
    heal: 18,
    stopBleed: true,
    desc: 'Zatrzymuje krwawienie, leczy 18 HP.',
  },
  medkit: {
    name: 'APTECZKA',
    icon: 'medkit',
    type: 'heal',
    heal: 55,
    stopBleed: true,
    desc: 'Pierwsza pomoc: +55 HP, tamuje krew.',
  },
  pills: {
    name: 'TABLETKI',
    icon: 'pills',
    type: 'heal',
    heal: 6,
    infection: -6,
    desc: 'Tłumi gorączkę. Spowalnia zakażenie.',
  },
  water: {
    name: 'WODA',
    icon: 'water',
    type: 'drink',
    thirst: 42,
    desc: 'Butelka wody. +42 pragnienia.',
  },
  whiskey: {
    name: 'WHISKY',
    icon: 'whiskey',
    type: 'drink',
    thirst: 8,
    energy: 6,
    heal: 3,
    desc: 'Rozgrzewa. +8 pragnienia, +6 energii.',
  },
  can: {
    name: 'KONSERWA',
    icon: 'can',
    type: 'food',
    hunger: 34,
    desc: 'Puszka z mięsem. +34 głodu.',
  },
  chips: {
    name: 'CHIPSY',
    icon: 'chips',
    type: 'food',
    hunger: 15,
    thirst: -4,
    desc: 'Słone. +15 głodu, -4 pragnienia.',
  },
  bat: {
    name: 'KIJ BEJSBOLOWY',
    icon: 'bat',
    type: 'weapon',
    damage: 26,
    cooldown: 0.72,
    range: 1.55,
    noise: 2,
    durability: 60,
    desc: 'Solidny kij. 26 obrażeń, hałasuje.',
  },
  axe: {
    name: 'SIEKIERA',
    icon: 'axe',
    type: 'weapon',
    damage: 44,
    cooldown: 1.0,
    range: 1.6,
    noise: 3,
    durability: 40,
    desc: 'Ciężka i skuteczna. 44 obrażeń.',
  },
  knife: {
    name: 'NÓŻ',
    icon: 'knife',
    type: 'weapon',
    damage: 17,
    cooldown: 0.42,
    range: 1.25,
    noise: 0.5,
    durability: 100,
    desc: 'Szybki i cichy. 17 obrażeń.',
  },
  hammer: {
    name: 'MŁOTEK',
    icon: 'hammer',
    type: 'weapon',
    damage: 13,
    cooldown: 0.6,
    range: 1.35,
    noise: 2,
    durability: 50,
    barricadeTool: true,
    desc: 'Narzędzie do zabijania deskami. 13 obr.',
  },
  pistol: {
    name: 'PISTOLET',
    icon: 'pistol',
    type: 'weapon',
    damage: 34,
    cooldown: 0.9,
    range: 10,
    noise: 22,
    durability: 999,
    ranged: true,
    ammo: 'ammo',
    desc: 'Broń palna. Głośna — ściąga hordy.',
  },
  ammo: {
    name: 'AMUNICJA',
    icon: 'ammo',
    type: 'ammo',
    stack: 20,
    desc: 'Naboje 9 mm.',
  },
  plank: {
    name: 'DESKA',
    icon: 'plank',
    type: 'material',
    stack: 5,
    desc: 'Do zabijania okien i drzwi.',
  },
  nails: {
    name: 'GWÓŹDZIE',
    icon: 'nails',
    type: 'material',
    stack: 30,
    desc: 'Do zabijania okien i drzwi.',
  },
  backpack: {
    name: 'PLECAK',
    icon: 'backpack',
    type: 'gear',
    slots: 5,
    desc: 'Zakładasz go: +5 miejsca w ekwipunku.',
  },
  flashlight: {
    name: 'LATARKA',
    icon: 'flashlight',
    type: 'gear',
    toggle: true,
    desc: 'Użyj, aby włączyć/wyłączyć światło.',
  },
  scrap: {
    name: 'ZŁOM',
    icon: 'scrap',
    type: 'junk',
    desc: 'Metalowe śmieci. Może się przydać.',
  },
  magazine: {
    name: 'CZASOPISMO',
    icon: 'magazine',
    type: 'book',
    xp: 6,
    desc: 'Czytasz: +6 doświadczenia walki.',
  },
  map: {
    name: 'MAPA',
    icon: 'map',
    type: 'map',
    desc: 'Użyj, aby otworzyć mapę okolicy (M).',
  },
  key: {
    name: 'KLUCZ',
    icon: 'key',
    type: 'junk',
    desc: 'Klucz do drzwi, których już nie ma.',
  },
};

const LOOT = {
  fridge: [
    ['water', 3],
    ['can', 2.2],
    ['chips', 1.8],
    ['whiskey', 1],
    ['pills', 0.5],
  ],
  shelf: [
    ['bandage', 2],
    ['pills', 1.5],
    ['magazine', 1.6],
    ['chips', 1],
    ['water', 1],
    ['flashlight', 0.8],
    ['ammo', 0.8],
    ['key', 0.6],
    ['map', 0.5],
    ['hammer', 0.5],
  ],
  counter: [
    ['chips', 2],
    ['can', 1.5],
    ['water', 1.4],
    ['knife', 1],
    ['hammer', 0.8],
    ['bandage', 0.8],
    ['scrap', 0.6],
  ],
  crate: [
    ['plank', 2.2],
    ['nails', 2.2],
    ['hammer', 1],
    ['scrap', 1.5],
    ['ammo', 0.9],
    ['axe', 0.5],
    ['backpack', 0.6],
    ['bat', 0.6],
  ],
  trash: [
    ['scrap', 2],
    ['can', 1],
    ['chips', 0.8],
    ['magazine', 1],
    ['bandage', 0.5],
    ['pills', 0.3],
  ],
  dumpster: [
    ['scrap', 2],
    ['plank', 1.5],
    ['backpack', 0.8],
    ['magazine', 1.1],
    ['can', 0.8],
    ['water', 0.6],
  ],
  car: [
    ['ammo', 1.5],
    ['pistol', 0.7],
    ['water', 1.4],
    ['medkit', 0.7],
    ['magazine', 1],
    ['scrap', 1.5],
    ['map', 0.6],
    ['flashlight', 0.7],
  ],
  corpse: [
    ['bandage', 1.5],
    ['pills', 1],
    ['ammo', 1],
    ['magazine', 1],
    ['key', 0.7],
    ['can', 0.7],
    ['scrap', 0.8],
  ],
  table: [
    ['chips', 1.2],
    ['can', 1],
    ['water', 1],
    ['magazine', 1],
    ['pills', 0.5],
    ['whiskey', 0.4],
  ],
};

const COUNT_RANGE = {
  fridge: [1, 3],
  shelf: [1, 3],
  counter: [1, 2],
  crate: [2, 3],
  trash: [1, 2],
  dumpster: [1, 2],
  car: [2, 3],
  corpse: [1, 2],
  table: [1, 1],
};

export const CONTAINER_NAMES = {
  fridge: 'LODÓWKA',
  shelf: 'PÓŁKA',
  counter: 'SZAFKA',
  crate: 'SKRZYNIA',
  trash: 'ŚMIETNIK',
  dumpster: 'KONTENER',
  car: 'BAGAŻNIK',
  corpse: 'CIAŁO',
  table: 'STÓŁ',
};

export function spawnItem(id, rng) {
  const def = ITEMS[id];
  if (!def) return null;
  const item = { id, count: 1 };
  if (def.stack && def.type === 'ammo') item.count = rng ? rng.int(3, 8) : 5;
  if (def.stack && id === 'nails') item.count = rng ? rng.int(2, 6) : 4;
  if (def.durability) item.dur = Math.max(8, Math.round(def.durability * (rng ? rng.float(0.45, 1) : 1)));
  return item;
}

export function rollLoot(rng, type, bonus = 0) {
  const table = LOOT[type] || LOOT.trash;
  const valid = table.filter(([id]) => ITEMS[id]);
  const [min, max] = COUNT_RANGE[type] || [1, 2];
  const count = Math.min(valid.length, rng.int(min, max) + bonus);
  const picked = [];
  const pool = valid.slice();
  for (let i = 0; i < count && pool.length; i++) {
    const id = rng.weighted(pool);
    const idx = pool.findIndex(([p]) => p === id);
    if (idx >= 0) pool.splice(idx, 1);
    const it = spawnItem(id, rng);
    if (it) picked.push(it);
  }
  return picked;
}

export function itemDef(item) {
  return ITEMS[item.id];
}

export function itemName(item) {
  const d = ITEMS[item.id];
  if (!d) return '?';
  return d.name;
}
