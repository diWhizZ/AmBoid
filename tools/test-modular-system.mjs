// Kompleksowy pakiet testów modułowego systemu mapy, ekwipunku, pipeline'u assetów i portu na Amigę.
import fs from 'node:fs';
import path from 'node:path';
import { PNG } from './png_mini.js';
import { cleanMagentaFromBuffer } from './clean-magenta.mjs';
import { scaleNearestNeighbor } from './resize-tiles.mjs';
import { quantizePng, findClosestPaletteIndex } from './quantize-palette.mjs';
import { packGridAtlas } from './build-atlas.mjs';
import { convertTiledToAmb } from './convert-tiled-map.mjs';
import { validateAndExportItems } from './export-items.mjs';
import { validateAssetFile } from './validate-assets.mjs';
import { createAdfImage } from './build_adf.mjs';

import { Inventory, Container } from '../src/core/inventory.js';
import { IsometricMap, DoorEntity, TriggerEntity } from '../src/core/map.js';
import { IsometricRenderer } from '../src/render/iso_renderer.js';
import { Screen } from '../src/render.js';
import { PALETTE, PALETTE_EXT, hexToRgb } from '../src/palette.js';
import { ITEMS } from '../src/items.js';

let totalTests = 0;
let passedTests = 0;

function assert(description, condition) {
  totalTests++;
  if (condition) {
    console.log(`  [PASS] ${description}`);
    passedTests++;
  } else {
    console.error(`  [FAIL] ${description}`);
    throw new Error(`Test failed: ${description}`);
  }
}

console.log('================================================================');
console.log('      AMBOID - TESTY MODUŁOWEGO SYSTEMU I PIPELINE\'U ASSETÓW   ');
console.log('================================================================');

// --- Test 1: Usuwanie magenty ---
console.log('\n[TEST 1] Usuwanie magenty (#FF00FF -> alpha 0)');
{
  const testPng = new PNG({ width: 2, height: 2 });
  // (0,0) - Magenta
  testPng.data[0] = 255; testPng.data[1] = 0; testPng.data[2] = 255; testPng.data[3] = 255;
  // (1,0) - Zielony
  testPng.data[4] = 40; testPng.data[5] = 180; testPng.data[6] = 40; testPng.data[7] = 255;
  // (0,1) - Magenta
  testPng.data[8] = 255; testPng.data[9] = 0; testPng.data[10] = 255; testPng.data[11] = 255;
  // (1,1) - Biały
  testPng.data[12] = 255; testPng.data[13] = 255; testPng.data[14] = 255; testPng.data[15] = 255;

  const buf = PNG.sync.write(testPng);
  const res = cleanMagentaFromBuffer(buf);
  const outPng = PNG.sync.read(res.buffer);

  assert('Wykryto i oczyszczono dokładnie 2 piksele magenty', res.cleanedPixels === 2);
  assert('Piksel (0,0) ma alpha = 0 (przezroczysty)', outPng.data[3] === 0);
  assert('Piksel (1,0) zachował kolor zielony i alpha = 255', outPng.data[5] === 180 && outPng.data[7] === 255);
  assert('Piksel (0,1) ma alpha = 0', outPng.data[11] === 0);
  assert('Piksel (1,1) zachował kolor biały', outPng.data[12] === 255 && outPng.data[15] === 255);
}

// --- Test 2: Skalowanie Nearest-Neighbor 128x64 -> 64x32 -> 32x16 ---
console.log('\n[TEST 2] Skalowanie Nearest-Neighbor 128x64 -> 64x32 -> 32x16 (izometria 2:1)');
{
  const src128 = new PNG({ width: 128, height: 64 });
  src128.data.fill(100);
  // Środek rombu
  src128.data[(32 * 128 + 64) * 4] = 240;

  const dst64 = scaleNearestNeighbor(src128, 64, 32);
  assert('Docelowy rozmiar pierwszego etapu to dokładnie 64x32', dst64.width === 64 && dst64.height === 32);
  assert('Proporcja 2:1 zachowana w 64x32', dst64.width / dst64.height === 2.0);

  const dst32 = scaleNearestNeighbor(dst64, 32, 16);
  assert('Docelowy rozmiar drugiego etapu to dokładnie 32x16', dst32.width === 32 && dst32.height === 16);
  assert('Proporcja 2:1 zachowana w 32x16', dst32.width / dst32.height === 2.0);
}

// --- Test 3: Spójność palety ---
console.log('\n[TEST 3] Spójność palety (OCS 32 kolory, AGA 64/256 kolorów)');
{
  assert('Paleta bazowa OCS zawiera dokładnie 32 kolory', PALETTE.length === 32);
  assert('Paleta AGA (PALETTE_EXT) zawiera 64 kolory (32 baza + 32 półtony)', PALETTE_EXT.length === 64);

  const ocsRgb = PALETTE.map((hex) => hexToRgb(hex));
  const idx = findClosestPaletteIndex(255, 255, 255, ocsRgb);
  assert('Biały kolor RGB poprawnie mapuje się do indeksu w palecie', idx >= 0 && idx < 32);
}

// --- Test 4: Poprawność atlasów ---
console.log('\n[TEST 4] Poprawność budowania atlasów');
{
  const img1 = new PNG({ width: 32, height: 16 });
  const img2 = new PNG({ width: 32, height: 16 });
  img1.data.fill(50);
  img2.data.fill(80);

  const atlas = packGridAtlas([{ png: img1 }, { png: img2 }], 32, 16, 2, 'ocs');
  assert('Atlas w siatce 2 kolumn ma szerokość 64 px', atlas.atlasW === 64);
  assert('Atlas ma wysokość 16 px (1 rząd)', atlas.atlasH === 16);
  assert('Bufor RAW chunky ma rozmiar 64*16 bajtów', atlas.rawChunky.length === 1024);
}

// --- Test 5: Ładowanie mapy Tiled ---
console.log('\n[TEST 5] Ładowanie mapy Tiled JSON');
{
  const mapJsonPath = path.resolve('data/maps/sample_map.json');
  assert('Plik data/maps/sample_map.json istnieje', fs.existsSync(mapJsonPath));

  const json = JSON.parse(fs.readFileSync(mapJsonPath, 'utf8'));
  assert('Mapa ma orientację izometryczną', json.orientation === 'isometric');
  assert('Wymiary mapy to 16x16 kafli', json.width === 16 && json.height === 16);

  const layerNames = json.layers.map((l) => l.name);
  assert('Mapa zawiera warstwę floor', layerNames.includes('floor'));
  assert('Mapa zawiera warstwę walls', layerNames.includes('walls'));
  assert('Mapa zawiera warstwę doors', layerNames.includes('doors'));
  assert('Mapa zawiera warstwę objects', layerNames.includes('objects'));
  assert('Mapa zawiera warstwę collision', layerNames.includes('collision'));
  assert('Mapa zawiera warstwę spawn', layerNames.includes('spawn'));
  assert('Mapa zawiera warstwę triggers', layerNames.includes('triggers'));
}

// --- Test 6: Kolizje ---
console.log('\n[TEST 6] System kolizji');
{
  const map = new IsometricMap(10, 10);
  assert('Pusta podłoga nie blokuje ruchu', !map.isBlocked(2, 2));

  map.setWall(3, 3, 10);
  assert('Ściana na (3, 3) blokuje ruch', map.isBlocked(3, 3));

  map.collision[map.idx(4, 4)] = 1;
  assert('Kafel kolizyjny na (4, 4) blokuje ruch', map.isBlocked(4, 4));

  const door = new DoorEntity({ x: 5, y: 5, state: 'closed' });
  map.doors.push(door);
  assert('Zamknięte drzwi na (5, 5) blokują ruch', map.isBlocked(5, 5));

  door.open();
  assert('Otwarte drzwi na (5, 5) nie blokują ruchu', !map.isBlocked(5, 5));

  assert('Pozycje poza mapą są blokowane', map.isBlocked(-1, 0) && map.isBlocked(10, 5));
}

// --- Test 7: Stackowanie przedmiotów ---
console.log('\n[TEST 7] Stackowanie przedmiotów (Inventory)');
{
  const inv = new Inventory(5);

  // Dodanie konserw (canned_food / can ma max_stack 20)
  const res1 = inv.addItem({ id: 'canned_food', count: 5 });
  assert('Dodano 5 sztuk konserw', res1.success && res1.added === 5 && res1.remaining === 0);
  assert('Konserwy zajmują dokładnie 1 slot', inv.slots.length === 1 && inv.slots[0].count === 5);

  // Dodanie kolejnych 7 konserw - powinno uzupełnić istniejący stack do 12
  const res2 = inv.addItem({ id: 'canned_food', count: 7 });
  assert('Uzupełniono istniejący stack do 12 bez tworzenia nowego slotu', res2.added === 7 && inv.slots.length === 1 && inv.slots[0].count === 12);

  // Dodanie kolejnych 15 konserw - 8 wejdzie do pierwszego stacku (do 20), a 7 utworzy nowy stack
  const res3 = inv.addItem({ id: 'canned_food', count: 15 });
  assert('Uzupełniono pierwszy stack do 20 i utworzono drugi', inv.slots.length === 2 && inv.slots[0].count === 20 && inv.slots[1].count === 7);

  // Dodanie niestackowalnego przedmiotu (broń - kij)
  const res4 = inv.addItem({ id: 'bat', count: 1, dur: 60 });
  assert('Kij został dodany do osobnego slotu', inv.slots.length === 3 && inv.slots[2].id === 'bat');

  // Próba przepełnienia ekwipunku
  inv.addItem({ id: 'axe', count: 1 });
  inv.addItem({ id: 'knife', count: 1 });
  assert('Ekwipunek osiągnął pełną pojemność (5 slotów)', inv.isFull());

  const overflowRes = inv.addItem({ id: 'pistol', count: 1 });
  assert('Brak miejsca: przedmiot nie wszedł, zwrócono nadwyżkę remaining = 1', !overflowRes.success && overflowRes.remaining === 1);
}

// --- Test 8: Dzielenie stacków ---
console.log('\n[TEST 8] Dzielenie stacków (splitStack)');
{
  const inv = new Inventory(4);
  inv.addItem({ id: 'canned_food', count: 5 });

  // Wyciągnięcie 2 konserw ze stacku x5
  const splitRes = inv.splitStack(0, 2);
  assert('Podział powiódł się', splitRes.success);
  assert('Oryginalny stack ma teraz 3 sztuki', inv.slots[0].count === 3);
  assert('Nowy stack ma 2 sztuki', inv.slots[splitRes.newSlotIndex].count === 2);
  assert('Łączna liczba konserw w ekwipunku to nadal 5', inv.count('canned_food') === 5);
}

// --- Test 9: Przenoszenie przedmiotów (Ekwipunek <-> Kontener <-> Podłoga) ---
console.log('\n[TEST 9] Przenoszenie przedmiotów (Transfer)');
{
  const playerInv = new Inventory(4);
  const container = new Container('crate', 10, 10, { capacity: 6 });

  playerInv.addItem({ id: 'bandage', count: 8 });
  assert('Gracz ma 8 bandaży', playerInv.count('bandage') === 8);

  // Przeniesienie 3 bandaży do skrzyni
  const transferRes = playerInv.transferTo(container.inventory, 0, 3);
  assert('Przeniesiono 3 bandaże do skrzyni', transferRes.success && transferRes.transferred === 3);
  assert('Graczowi zostało 5 bandaży', playerInv.slots[0].count === 5);
  assert('W skrzyni znajdują się 3 bandaże', container.inventory.count('bandage') === 3);

  // Przeniesienie z powrotem ze skrzyni do gracza
  container.transferToPlayer(0, playerInv, 2);
  assert('Gracz odzyskał 2 bandaże (ma 7)', playerInv.count('bandage') === 7);
  assert('W skrzyni pozostał 1 bandaż', container.inventory.count('bandage') === 1);
}

// --- Test 10: Otwieranie, zamykanie i animacja drzwi ---
console.log('\n[TEST 10] Otwieranie i zamykanie drzwi');
{
  const door = new DoorEntity({ x: 4, y: 8, state: 'closed' });
  assert('Drzwi są początkowo zamknięte', door.isClosed() && !door.isOpen());

  door.open();
  assert('Drzwi zostały otwarte', door.isOpen());

  door.close();
  assert('Drzwi zostały zamknięte', door.isClosed());

  door.toggle();
  assert('Toggle otworzył drzwi', door.isOpen());
}

// --- Test 11: Sortowanie głębi (Isometric Depth Sorting) ---
console.log('\n[TEST 11] Sortowanie głębi obiektów izometrycznych');
{
  const map = new IsometricMap(10, 10);
  map.setWall(1, 1, 10); // głębia ~ 2000
  map.setWall(4, 4, 10); // głębia ~ 8000
  map.doors.push(new DoorEntity({ x: 2, y: 2, state: 'open' })); // głębia ~ 4005

  const sorted = map.getDepthSortedEntities();
  assert('Lista zawiera 3 obiekty', sorted.length === 3);
  assert('Obiekt o najmniejszej współrzędnej (1,1) jest rysowany jako pierwszy', sorted[0].x === 1 && sorted[0].y === 1);
  assert('Drzwi na (2,2) są w środku kolejki', sorted[1].x === 2 && sorted[1].y === 2);
  assert('Ściana na (4,4) jest rysowana na wierzchu jako ostatnia', sorted[2].x === 4 && sorted[2].y === 4);
}

// --- Test 12: Rendering widocznego fragmentu mapy (Culling) ---
console.log('\n[TEST 12] Rendering widocznego fragmentu mapy i Culling');
{
  const scr = new Screen(320, 200);
  const renderer = new IsometricRenderer(scr, { tileW: 64, tileH: 32 });
  const map = new IsometricMap(20, 20);
  map.setFloor(5, 5, 1);
  map.setWall(5, 5, 1);

  const camera = { x: 0, y: 0 };
  renderer.renderScene(map, camera, { x: 5, y: 5 }, 0.5);

  assert('Renderer narysował klatkę na ekranie bez błędów', scr.data.some((p) => p !== 0));

  const visible = map.cullVisible(5, 5, 3, 3);
  assert('Culling ograniczył liczbę kafli do widocznego wycinka', visible.length < map.w * map.h);
}

// --- Test 13: Weryfikacja eksportu OCS, AGA, AmigaOS ---
console.log('\n[TEST 13] Weryfikacja wyeksportowanych plików Amiga');
{
  assert('Istnieje nagłówek C definicji przedmiotów docs/amiga/items_data.h', fs.existsSync('docs/amiga/items_data.h'));
  assert('Istnieje binarna mapa AMB2 docs/amiga/sample_map.amb', fs.existsSync('docs/amiga/sample_map.amb'));
  assert('Istnieje atlas 64x32 docs/amiga/atlases/atlas-floors-64.png', fs.existsSync('docs/amiga/atlases/atlas-floors-64.png'));
  assert('Istnieje atlas 32x16 docs/amiga/atlases/atlas-floors-32.png', fs.existsSync('docs/amiga/atlases/atlas-floors-32.png'));
  assert('Istnieje dyskietka OCS build/amiga/AmBoid_OCS.adf', fs.existsSync('build/amiga/AmBoid_OCS.adf'));
  assert('Istnieje dyskietka AGA build/amiga/AmBoid_AGA.adf', fs.existsSync('build/amiga/AmBoid_AGA.adf'));
  assert('Istnieje struktura paczki build/amiga/AmBoid_AmigaOS', fs.existsSync('build/amiga/AmBoid_AmigaOS'));
}

console.log('================================================================');
console.log(` Wszystkie testy zaliczone: ${passedTests} / ${totalTests} OK!`);
console.log('================================================================');
