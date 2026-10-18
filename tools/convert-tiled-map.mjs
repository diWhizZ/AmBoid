// Konwerter map z Tiled JSON do binarnego formatu AMB2 dla silnika gry i Amigi.
import fs from 'node:fs';
import path from 'node:path';

export function convertTiledToAmb(tiledJson, outputFile = null) {
  const map = typeof tiledJson === 'string' ? JSON.parse(tiledJson) : tiledJson;

  const w = map.width;
  const h = map.height;
  const tileW = map.tilewidth || 64;
  const tileH = map.tileheight || 32;

  // Znajdź warstwy po nazwach
  const layerMap = {};
  for (const layer of map.layers) {
    layerMap[layer.name] = layer;
  }

  const floorLayer = layerMap.floor ? layerMap.floor.data : new Array(w * h).fill(0);
  const wallsLayer = layerMap.walls ? layerMap.walls.data : new Array(w * h).fill(0);
  const collisionLayer = layerMap.collision ? layerMap.collision.data : new Array(w * h).fill(0);

  const doorsObjects = layerMap.doors ? layerMap.doors.objects || [] : [];
  const propsObjects = layerMap.objects ? layerMap.objects.objects || [] : [];
  const spawnsObjects = layerMap.spawn ? layerMap.spawn.objects || [] : [];
  const triggersObjects = layerMap.triggers ? layerMap.triggers.objects || [] : [];

  const atlases = ['floors_64', 'walls_64', 'doors_64', 'props_64', 'items_32'];
  const palettes = ['amboid_aga', 'amboid_ocs'];

  const parts = [];
  function u8(v) { const b = Buffer.alloc(1); b.writeUInt8(v & 0xff, 0); parts.push(b); }
  function u16(v) { const b = Buffer.alloc(2); b.writeUInt16BE(v & 0xffff, 0); parts.push(b); }
  function u32(v) { const b = Buffer.alloc(4); b.writeUInt32BE(v >>> 0, 0); parts.push(b); }
  function i16(v) { const b = Buffer.alloc(2); b.writeInt16BE(v, 0); parts.push(b); }
  function str8(s) {
    const buf = Buffer.from(s || '', 'utf8');
    u8(buf.length);
    parts.push(buf);
  }
  function str16(s) {
    const buf = Buffer.from(s || '', 'utf8');
    u16(buf.length);
    parts.push(buf);
  }

  // 1. Nagłówek AMB2
  u32(0x414D4232); // Magic "AMB2"
  u16(0x0002);     // Wersja formatu
  u16(w);
  u16(h);
  u16(tileW);
  u16(tileH);
  u16(7);          // Liczba warstw (floor, walls, collision, doors, objects, spawns, triggers)

  // 2. Referencje do atlasów i palet
  u16(atlases.length);
  for (const a of atlases) str8(a);
  u16(palettes.length);
  for (const p of palettes) str8(p);

  // 3. Tablice kafli: podłoga i ściany
  for (let i = 0; i < w * h; i++) {
    u16(floorLayer[i] || 0);
  }
  for (let i = 0; i < w * h; i++) {
    u16(wallsLayer[i] || 0);
  }

  // 4. Dane kolizji
  for (let i = 0; i < w * h; i++) {
    u8(collisionLayer[i] ? 1 : 0);
  }

  // 5. Drzwi i ich stan
  u16(doorsObjects.length);
  for (const d of doorsObjects) {
    u16(Math.round(d.x));
    u16(Math.round(d.y));
    let state = 0; // 0=closed, 1=opening, 2=open, 3=locked
    let keyId = '';
    for (const prop of (d.properties || [])) {
      if (prop.name === 'state' && prop.value === 'open') state = 2;
      if (prop.name === 'state' && prop.value === 'locked') state = 3;
      if (prop.name === 'key_id') keyId = String(prop.value);
    }
    u8(state);
    u8(0); // orientacja
    str8(keyId);
  }

  // 6. Obiekty i kontenery
  u16(propsObjects.length);
  for (const obj of propsObjects) {
    u16(obj.id || 0);
    let type = 0; // 0=prop, 1=container, 2=item
    let kind = obj.name || '';
    let lootItems = [];

    for (const p of (obj.properties || [])) {
      if (p.name === 'container_type') {
        type = 1;
        kind = p.value;
      }
      if (p.name === 'item_id') {
        type = 2;
        kind = p.value;
      }
      if (p.name === 'loot') {
        try {
          lootItems = JSON.parse(p.value);
        } catch (e) {
          lootItems = [];
        }
      }
      if (p.name === 'kind') kind = p.value;
    }

    u8(type);
    u16(Math.round(obj.x));
    u16(Math.round(obj.y));
    u8(1); // w
    u8(1); // h
    str8(kind);

    if (type === 1) {
      // Kontener: zapisujemy listę itemów
      u8(lootItems.length);
      for (const it of lootItems) {
        str8(it.id);
        u16(it.count || 1);
        i16(it.dur || 0);
      }
    } else if (type === 2) {
      let count = 1;
      for (const p of (obj.properties || [])) {
        if (p.name === 'count') count = p.value;
      }
      u16(count);
    } else {
      u8(0);
    }
  }

  // 7. Spawny (gracz, wrogowie)
  u16(spawnsObjects.length);
  for (const sp of spawnsObjects) {
    const isPlayer = sp.type === 'spawn_player';
    u8(isPlayer ? 0 : 1);
    u16(Math.round(sp.x));
    u16(Math.round(sp.y));
    let variant = 0;
    for (const p of (sp.properties || [])) {
      if (p.name === 'variant') variant = p.value;
    }
    u8(variant);
  }

  // 8. Triggery
  u16(triggersObjects.length);
  for (const tr of triggersObjects) {
    u16(Math.round(tr.x));
    u16(Math.round(tr.y));
    u8(Math.max(1, Math.round(tr.width || 1)));
    u8(Math.max(1, Math.round(tr.height || 1)));

    let eventType = 0; // 0=on_enter, 1=on_door_open
    let actionType = 0; // 0=open_door, 1=change_terrain
    let targetParams = {};

    for (const p of (tr.properties || [])) {
      if (p.name === 'event' && p.value === 'on_enter') eventType = 0;
      if (p.name === 'action' && p.value === 'open_door') actionType = 0;
      if (p.name === 'action' && p.value === 'change_terrain') actionType = 1;
      targetParams[p.name] = p.value;
    }

    u8(eventType);
    u8(actionType);
    str16(JSON.stringify(targetParams));
  }

  const binaryBuffer = Buffer.concat(parts);

  if (outputFile) {
    fs.mkdirSync(path.dirname(outputFile), { recursive: true });
    fs.writeFileSync(outputFile, binaryBuffer);
    console.log(`[CONVERT-TILED-MAP] Zapisano mapę binarną AMB2: ${outputFile} (${binaryBuffer.length} bajtów)`);
  }

  return binaryBuffer;
}

// Uruchomienie jako skrypt CLI
if (process.argv[1] && process.argv[1].endsWith('convert-tiled-map.mjs')) {
  const inputFile = process.argv[2] || 'data/maps/sample_map.json';
  const outputFile = process.argv[3] || 'data/maps/sample_map.amb';

  if (!fs.existsSync(inputFile)) {
    console.error(`Plik wejściowy nie istnieje: ${inputFile}`);
    process.exit(1);
  }

  const jsonContent = fs.readFileSync(inputFile, 'utf8');
  convertTiledToAmb(jsonContent, outputFile);
}
