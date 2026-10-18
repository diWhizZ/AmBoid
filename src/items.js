// Przedmioty, łupy i ich statystyki wczytywane z konfiguracji JSON.

function loadItemsData() {
  // W Node.js odczytujemy z data/items.json jeśli dostępne
  if (typeof process !== 'undefined' && process.versions && process.versions.node) {
    try {
      // Dynamiczny import lub require w Node
      const fs = globalThis.__node_fs || null;
      if (fs) {
        const raw = fs.readFileSync('data/items.json', 'utf8');
        return JSON.parse(raw);
      }
    } catch (e) {
      // Fallback do DEFAULT_ITEMS
    }
  }
  return null;
}

const DEFAULT_ITEMS = {
  bandage: {
    id: 'bandage',
    name: 'BANDAŻ',
    icon: 'bandage',
    type: 'heal',
    category: 'medical',
    stackable: true,
    max_stack: 10,
    stack: 10,
    weight: 0.1,
    heal: 18,
    stopBleed: true,
    use: 'heal_small',
    desc: 'Zatrzymuje krwawienie, leczy 18 HP.',
    value: 15,
  },
  canned_food: {
    id: 'canned_food',
    name: 'KONSERWA',
    icon: 'can',
    type: 'food',
    category: 'food',
    stackable: true,
    max_stack: 20,
    stack: 20,
    weight: 0.4,
    hunger: 34,
    use: 'restore_hunger',
    desc: 'Puszka z mięsem. +34 głodu.',
    value: 10,
  },
  can: {
    id: 'can',
    name: 'KONSERWA',
    icon: 'can',
    type: 'food',
    category: 'food',
    stackable: true,
    max_stack: 20,
    stack: 20,
    weight: 0.4,
    hunger: 34,
    use: 'restore_hunger',
    desc: 'Puszka z mięsem. +34 głodu.',
    value: 10,
  },
  medkit: {
    id: 'medkit',
    name: 'APTECZKA',
    icon: 'medkit',
    type: 'heal',
    category: 'medical',
    stackable: false,
    max_stack: 1,
    stack: 1,
    weight: 1.2,
    heal: 55,
    stopBleed: true,
    use: 'heal_large',
    desc: 'Pierwsza pomoc: +55 HP, tamuje krew.',
    value: 50,
  },
  pills: {
    id: 'pills',
    name: 'TABLETKI',
    icon: 'pills',
    type: 'heal',
    category: 'medical',
    stackable: true,
    max_stack: 20,
    stack: 20,
    weight: 0.05,
    heal: 6,
    infection: -6,
    use: 'heal_infection',
    desc: 'Tłumi gorączkę. Spowalnia zakażenie.',
    value: 25,
  },
  water: {
    id: 'water',
    name: 'WODA',
    icon: 'water',
    type: 'drink',
    category: 'drink',
    stackable: true,
    max_stack: 6,
    stack: 6,
    weight: 0.5,
    thirst: 42,
    use: 'restore_thirst',
    desc: 'Butelka wody. +42 pragnienia.',
    value: 8,
  },
  whiskey: {
    id: 'whiskey',
    name: 'WHISKY',
    icon: 'whiskey',
    type: 'drink',
    category: 'drink',
    stackable: false,
    max_stack: 1,
    stack: 1,
    weight: 0.7,
    thirst: 8,
    energy: 6,
    heal: 3,
    use: 'drink_alcohol',
    desc: 'Rozgrzewa. +8 pragnienia, +6 energii.',
    value: 30,
  },
  chips: {
    id: 'chips',
    name: 'CHIPSY',
    icon: 'chips',
    type: 'food',
    category: 'food',
    stackable: true,
    max_stack: 10,
    stack: 10,
    weight: 0.2,
    hunger: 15,
    thirst: -4,
    use: 'restore_hunger',
    desc: 'Słone. +15 głodu, -4 pragnienia.',
    value: 6,
  },
  bat: {
    id: 'bat',
    name: 'KIJ BEJSBOLOWY',
    icon: 'bat',
    type: 'weapon',
    category: 'weapon',
    stackable: false,
    max_stack: 1,
    stack: 1,
    weight: 1.5,
    damage: 26,
    cooldown: 0.72,
    range: 1.55,
    noise: 2,
    durability: 60,
    use: 'melee_attack',
    desc: 'Solidny kij. 26 obrażeń, hałasuje.',
    value: 35,
  },
  axe: {
    id: 'axe',
    name: 'SIEKIERA',
    icon: 'axe',
    type: 'weapon',
    category: 'weapon',
    stackable: false,
    max_stack: 1,
    stack: 1,
    weight: 2.2,
    damage: 44,
    cooldown: 1.0,
    range: 1.6,
    noise: 3,
    durability: 40,
    use: 'melee_attack',
    desc: 'Ciężka i skuteczna. 44 obrażeń.',
    value: 55,
  },
  knife: {
    id: 'knife',
    name: 'NÓŻ',
    icon: 'knife',
    type: 'weapon',
    category: 'weapon',
    stackable: false,
    max_stack: 1,
    stack: 1,
    weight: 0.4,
    damage: 17,
    cooldown: 0.42,
    range: 1.25,
    noise: 0.5,
    durability: 100,
    use: 'melee_attack',
    desc: 'Szybki i cichy. 17 obrażeń.',
    value: 20,
  },
  hammer: {
    id: 'hammer',
    name: 'MŁOTEK',
    icon: 'hammer',
    type: 'weapon',
    category: 'tool',
    stackable: false,
    max_stack: 1,
    stack: 1,
    weight: 1.1,
    damage: 13,
    cooldown: 0.6,
    range: 1.35,
    noise: 2,
    durability: 50,
    barricadeTool: true,
    use: 'barricade_tool',
    desc: 'Narzędzie do zabijania deskami. 13 obr.',
    value: 25,
  },
  pistol: {
    id: 'pistol',
    name: 'PISTOLET',
    icon: 'pistol',
    type: 'weapon',
    category: 'weapon',
    stackable: false,
    max_stack: 1,
    stack: 1,
    weight: 1.0,
    damage: 34,
    cooldown: 0.9,
    range: 10,
    noise: 22,
    durability: 999,
    ranged: true,
    ammo: 'ammo',
    use: 'ranged_attack',
    desc: 'Broń palna. Głośna — ściąga hordy.',
    value: 120,
  },
  ammo: {
    id: 'ammo',
    name: 'AMUNICJA',
    icon: 'ammo',
    type: 'ammo',
    category: 'ammo',
    stackable: true,
    max_stack: 100,
    stack: 100,
    weight: 0.02,
    use: 'load_weapon',
    desc: 'Naboje 9 mm.',
    value: 5,
  },
  plank: {
    id: 'plank',
    name: 'DESKA',
    icon: 'plank',
    type: 'material',
    category: 'material',
    stackable: true,
    max_stack: 10,
    stack: 10,
    weight: 1.0,
    use: 'barricade_material',
    desc: 'Do zabijania okien i drzwi.',
    value: 4,
  },
  nails: {
    id: 'nails',
    name: 'GWÓŹDZIE',
    icon: 'nails',
    type: 'material',
    category: 'material',
    stackable: true,
    max_stack: 100,
    stack: 100,
    weight: 0.01,
    use: 'barricade_material',
    desc: 'Do zabijania okien i drzwi.',
    value: 1,
  },
  backpack: {
    id: 'backpack',
    name: 'PLECAK',
    icon: 'backpack',
    type: 'gear',
    category: 'gear',
    stackable: false,
    max_stack: 1,
    stack: 1,
    weight: 0.5,
    slots: 5,
    use: 'equip_backpack',
    desc: 'Zakładasz go: +5 miejsca w ekwipunku.',
    value: 70,
  },
  flashlight: {
    id: 'flashlight',
    name: 'LATARKA',
    icon: 'flashlight',
    type: 'gear',
    category: 'gear',
    stackable: false,
    max_stack: 1,
    stack: 1,
    weight: 0.3,
    toggle: true,
    use: 'toggle_light',
    desc: 'Użyj, aby włączyć/wyłączyć światło.',
    value: 40,
  },
  scrap: {
    id: 'scrap',
    name: 'ZŁOM',
    icon: 'scrap',
    type: 'junk',
    category: 'material',
    stackable: true,
    max_stack: 20,
    stack: 20,
    weight: 0.3,
    use: 'crafting',
    desc: 'Metalowe śmieci. Może się przydać.',
    value: 2,
  },
  magazine: {
    id: 'magazine',
    name: 'CZASOPISMO',
    icon: 'magazine',
    type: 'book',
    category: 'book',
    stackable: false,
    max_stack: 1,
    stack: 1,
    weight: 0.2,
    xp: 6,
    use: 'read_xp',
    desc: 'Czytasz: +6 doświadczenia walki.',
    value: 15,
  },
  map: {
    id: 'map',
    name: 'MAPA',
    icon: 'map',
    type: 'map',
    category: 'map',
    stackable: false,
    max_stack: 1,
    stack: 1,
    weight: 0.1,
    use: 'open_map',
    desc: 'Użyj, aby otworzyć mapę okolicy (M).',
    value: 10,
  },
  key: {
    id: 'key',
    name: 'KLUCZ',
    icon: 'key',
    type: 'junk',
    category: 'keys',
    stackable: true,
    max_stack: 1,
    stack: 1,
    weight: 0.05,
    use: 'unlock_door',
    desc: 'Klucz do drzwi.',
    value: 20,
  },
};

const loaded = loadItemsData();
export const ITEMS = loaded ? { ...DEFAULT_ITEMS, ...loaded } : DEFAULT_ITEMS;

// Synchronizujemy właściwości: jeśli w JSON zdefiniowano max_stack, ustawiamy też alias stack
for (const key of Object.keys(ITEMS)) {
  const item = ITEMS[key];
  if (item.max_stack && !item.stack) item.stack = item.max_stack;
  if (item.stack && !item.max_stack) item.max_stack = item.stack;
  if (!item.category && item.type) item.category = item.type;
  if (!item.type && item.category) item.type = item.category;
}

export const LOOT = {
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
  backpack: 'PLECAK',
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
