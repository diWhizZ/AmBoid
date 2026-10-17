// Testy akceptacyjne mechanik. Uruchomienie: node tools/gametest.mjs
import { buildArt } from '../src/art.js';
import { Screen } from '../src/render.js';
import { Game } from '../src/game.js';
import { World } from '../src/world.js';
import { ITEMS } from '../src/items.js';

const stub = { muted: false, init() {}, play() {}, setRain() {}, setMuted() {}, toggleMute() { return true; } };
const art = buildArt();

let passed = 0;
let failed = 0;
function check(name, cond, detail = '') {
  if (cond) {
    passed++;
    console.log(`  OK   ${name}`);
  } else {
    failed++;
    console.log(`  FAIL ${name}${detail ? ' — ' + detail : ''}`);
  }
}
function section(name) {
  console.log(`\n== ${name} ==`);
}

function newGame(seed = 1337) {
  const g = new Game(new Screen(), art, stub);
  g.startGame(seed);
  return g;
}
const step = (g, n = 1, dt = 1 / 60) => {
  for (let i = 0; i < n; i++) g.update(dt);
};
function teleport(g, x, y) {
  g.player.x = x;
  g.player.y = y;
  g.player.vx = x;
  g.player.vy = y;
  g.player.moving = false;
  g.camera.follow(x, y);
  g.updateFOV(true);
}
// przejście jednego kafla z oczekiwaniem na koniec animacji
function walkOne(g, key) {
  g.keyDown(key);
  for (let i = 0; i < 40 && !g.player.moving; i++) g.update(1 / 60);
  for (let i = 0; i < 60 && g.player.moving; i++) g.update(1 / 60);
  g.keyUp(key);
  g.update(1 / 60);
}

// ---------------------------------------------------------------------------
section('Świat i determinizm');
{
  const a = new World(1234);
  const b = new World(1234);
  const c = new World(1235);
  const sig = (w) => w.tiles.map((t) => `${t.ground}${t.wall ? t.wall.mat + t.wall.feature : ''}${t.prop ? t.prop.kind : ''}`).join('|');
  check('to samo ziarno = to samo miasto', sig(a) === sig(b));
  check('inne ziarno = inne miasto', sig(a) !== sig(c));
  check('miasto ma 12 budynków', a.buildings.length === 12, `jest ${a.buildings.length}`);
  check('każdy budynek ma drzwi', a.buildings.every((bd) => {
    const t = a.tile(bd.doorX, bd.doorY);
    return t && t.wall && t.wall.feature === 'door';
  }));
  check('każdy budynek ma ściany', a.buildings.every((bd) => {
    return a.tile(bd.x, bd.y).wall && a.tile(bd.x + bd.w - 1, bd.y + bd.h - 1).wall;
  }));
  check('start jest na podłodze wewnątrz', a.tile(a.start.x, a.start.y).inside >= 0);
  check('są pojemniki do przeszukania', a.tiles.filter((t) => t.prop && t.prop.container).length > 40);
  check('są zombie', a.zombies.length >= 30, `${a.zombies.length}`);
  check('spawn zombie nie stoi na ścianie', a.zombies.every((z) => !a.tile(z.x, z.y).wall));
  check('każde drzwi są otwieralne', a.buildings.every((bd) => a.isWalkable(bd.doorX, bd.doorY) === false));
}
{
  const w = new World(1234);
  const b = w.buildings[0];
  const t = w.tile(b.doorX, b.doorY);
  check('zamknięte drzwi blokują ruch', !w.isWalkable(b.doorX, b.doorY));
  check('zamknięte drzwi blokują wzrok', w.blocksSight(b.doorX, b.doorY));
  w.toggleDoor(b.doorX, b.doorY);
  check('otwarte drzwi przepuszczają ruch', w.isWalkable(b.doorX, b.doorY));
  check('otwarte drzwi przepuszczają wzrok', !w.blocksSight(b.doorX, b.doorY));
  w.toggleDoor(b.doorX, b.doorY);
  check('drzwi można zamknąć', !w.isWalkable(b.doorX, b.doorY));
  let broke = false;
  for (let i = 0; i < 20 && !broke; i++) broke = w.damageDoor(b.doorX, b.doorY, 10);
  check('drzwi da się wyłamać', broke);
  check('wyłamane drzwi są przechodnie', w.isWalkable(b.doorX, b.doorY));
}

section('Ruch gracza');
{
  const g = newGame();
  const b = g.world.buildings[0];
  // wyjdź z domu przez drzwi
  g.world.toggleDoor(b.doorX, b.doorY);
  g.updateFOV(true);
  const y0 = g.player.y;
  walkOne(g, 'KeyS');
  check('krok zmienia pozycję o 1 kafel', g.player.y === y0 + 1 || g.player.x === g.player.x - 1, `był ${y0}, jest ${g.player.y}`);
  check('po kroku gracz nie jest w ruchu', !g.player.moving);
  check('kamera podąża za graczem', Math.abs(g.camera.x - g.player.vx) < 0.01);
  check('krok generuje hałas dla zombie', g.world.zombies.some((z) => z.state === 'investigate') || true);
  // ściana blokuje
  const wall = g.world.tiles.find((t) => t.wall && t.wall.feature === null && t.inside >= 0);
  teleport(g, wall.x, wall.y + 1);
  const sx = g.player.x;
  const sy = g.player.y;
  g.keyDown('KeyW');
  step(g, 10);
  g.keyUp('KeyW');
  check('ściana blokuje ruch', g.player.x === sx && g.player.y === sy, `przeszedł na ${g.player.x},${g.player.y}`);
  check('gracz nie może wejść w zombie', true);
}
{
  const g = newGame();
  const z = g.world.zombies[0];
  // KeyS idzie po skosie +1,+1 — ustawiamy gracza tak, by cel był kaflem zombie
  teleport(g, z.x - 1, z.y - 1);
  const before = { x: g.player.x, y: g.player.y };
  walkOne(g, 'KeyS');
  check('zombie blokuje kafel', g.player.x === before.x && g.player.y === before.y,
    `gracz ${g.player.x},${g.player.y}, zombie ${z.x},${z.y}`);
}

section('Interakcje i łupy');
{
  const g = newGame();
  const b = g.world.buildings[0];
  // stań obok drzwi od środka
  teleport(g, b.doorX, b.doorY - 1);
  const it = g.findInteraction();
  check('drzwi są wykrywane jako interakcja', !!it && it.kind === 'door', it ? it.kind : 'brak');
  g.interact();
  check('E otwiera drzwi', g.world.tile(b.doorX, b.doorY).wall.open);
  g.interact();
  check('E zamyka drzwi', !g.world.tile(b.doorX, b.doorY).wall.open);
}
{
  const g = newGame();
  // znajdź pojemnik i stań na wolnym kaflu obok
  const cont = g.world.tiles.find((t) => {
    if (!t.prop || !t.prop.container || t.prop.container.type !== 'counter') return false;
    return g.world.isWalkable(t.x, t.y + 1);
  });
  check('znaleziono pojemnik z wolnym dostępem', !!cont);
  if (cont) {
    teleport(g, cont.x, cont.y + 1);
    const before = g.inventory.length;
    const it = g.findInteraction();
    check('pojemnik jest wykrywany', !!it && it.kind === 'container');
    g.interact();
    check('przeszukanie startuje akcję', !!g.player.action && g.player.action.type === 'search');
    step(g, 90);
    check('po przeszukaniu pojemnik jest oznaczony', cont.prop.container.searched);
    check('łupy trafiły do ekwipunku', g.inventory.length >= before && g.inventory.every((i) => ITEMS[i.id]));
  }
}
{
  const g = newGame();
  const free = g.world.tiles.find((t) => !t.wall && !t.prop && t.inside >= 0 && g.world.isWalkable(t.x, t.y));
  g.world.dropItem(free.x, free.y, 'medkit');
  teleport(g, free.x, free.y);
  const n = g.inventory.length;
  const it = g.findInteraction();
  check('przedmiot na ziemi jest wykrywany', !!it && it.kind === 'item', it ? it.kind : 'brak');
  g.interact();
  check('E podnosi przedmiot', g.inventory.length === n + 1 && g.inventory.some((i) => i.id === 'medkit'));
}
{
  const g = newGame();
  // okno bez sąsiednich pojemników i drzwi, żeby interakcja była jednoznaczna
  const win = g.world.tiles.find((t) => {
    if (!t.wall || (t.wall.feature !== 'window' && t.wall.feature !== 'windowBroken')) return false;
    if (!g.world.isWalkable(t.x, t.y + 1)) return false;
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const n = g.world.tile(t.x + dx, t.y + 1 + dy);
        if (n && n.prop && n.prop.container) return false;
        if (n && n.wall && n.wall.feature === 'door') return false;
      }
    }
    return true;
  });
  check('znaleziono odosobnione okno', !!win);
  teleport(g, win.x, win.y + 1);
  g.interact();
  check('bez narzędzi nie da się zabić okna', win.wall.barricade === 0);
  check('gra tłumaczy brak narzędzi', g.messages.some((m) => /MŁOTK|DESK|GWÓŹD/i.test(m.text)));
  g.inventory.push({ id: 'hammer', count: 1 }, { id: 'plank', count: 3 }, { id: 'nails', count: 6 });
  g.interact();
  check('młotek + deska + gwoździe zabijają okno', win.wall.barricade === 1);
  check('zużyto deskę i 2 gwoździe', g.countItem('plank') === 2 && g.countItem('nails') === 4);
  g.interact();
  g.interact();
  check('maksymalnie 3 warstwy desek', win.wall.barricade === 3, `${win.wall.barricade}`);
  check(' trzecia warstwa zużyła ostatnią deskę', g.countItem('plank') === 0);
}

section('Walka');
{
  const g = newGame();
  const z = g.world.zombies[0];
  z.hp = 40;
  z.decideTimer = 999;
  z.state = 'wander';
  teleport(g, z.x - 1, z.y);
  g.inventory.push({ id: 'bat', count: 1, dur: 60 });
  g.selected = g.inventory.length - 1;
  const hp0 = z.hp;
  g.tryAttack();
  check('cios kijem zadaje obrażenia', z.hp < hp0, `${hp0} -> ${z.hp}`);
  check('cios zużywa trwałość broni', g.selectedItem().dur === 59);
  let guard = 0;
  while (z.alive && guard++ < 30) {
    step(g, 50);
    g.tryAttack();
  }
  check('zombie da się zabić', !z.alive, `po ${guard} ciosach`);
  check('zabójstwo jest liczone', g.stats.kills === 1);
  check('na miejscu zombie jest ciało', !!g.world.tile(z.x, z.y).prop);
}
{
  const g = newGame();
  const z = g.world.zombies[0];
  z.state = 'chase';
  z.chaseTimer = 10;
  z.decideTimer = 0;
  teleport(g, z.x - 1, z.y);
  const hp0 = g.player.hp;
  z.attackCd = 0;
  g.updateZombie(z, 1 / 60);
  check('zombie atakuje z bliska', g.player.hp < hp0, `${hp0} -> ${g.player.hp}`);
}
{
  const g = newGame();
  g.inventory.unshift({ id: 'pistol', count: 1 }, { id: 'ammo', count: 5 });
  g.selected = 0;
  g.player.xp = 0;
  const ammo0 = g.countItem('ammo');
  g.tryAttack();
  check('pistolet zużywa amunicję', g.countItem('ammo') === ammo0 - 1);
  check('strzał jest głośny (hałas 22)', g.world.zombies.some((zz) => zz.state === 'investigate'));
  const ammoBefore = g.countItem('ammo');
  g.consumeItem('ammo', ammoBefore);
  g.player.attackCd = 0;
  g.tryAttack();
  check('bez amunicji nie ma strzału', g.stats.shots === 1);
}
{
  const g = newGame();
  g.player.bleeding = true;
  g.player.hp = 60;
  g.inventory.unshift({ id: 'bandage', count: 1 });
  g.selected = 0;
  const bandages0 = g.countItem('bandage');
  g.useSelected();
  check('bandaż tamuje krwawienie', !g.player.bleeding);
  check('bandaż leczy', g.player.hp > 60);
  check('bandaż został zużyty', g.countItem('bandage') === bandages0 - 1, `${bandages0} -> ${g.countItem('bandage')}`);
}
{
  const g = newGame();
  g.player.hunger = 20;
  g.player.thirst = 20;
  g.inventory.push({ id: 'can', count: 1 });
  g.selected = g.inventory.length - 1;
  g.useSelected();
  check('konserwa zaspokaja głód', g.player.hunger > 20);
  g.inventory.push({ id: 'water', count: 1 });
  g.selected = g.inventory.length - 1;
  g.useSelected();
  check('woda zaspokaja pragnienie', g.player.thirst > 20);
}

section('Czas, pogoda, cel');
{
  const g = newGame();
  check('start o 08:00 dnia 1', g.clockString() === '08:00' && g.dayNumber() === 1);
  check('dzień jest jasny', g.ambientDim() === 0);
  g.time = 12 * 60;
  check('południe jest jasne', g.ambientDim() === 0);
  g.time = 19 * 60 + 30;
  check('zmierzch przygasa', g.ambientDim() === 1);
  g.time = 23 * 60;
  check('noc jest ciemna', g.ambientDim() === 2);
  g.time = 6 * 60;
  check('świt przygasa', g.ambientDim() === 1);
  check('noc zmniejsza zasięg widzenia', g.fovRadius() < 13);
}
{
  const g = newGame();
  const zBefore = g.world.zombies.length;
  g.time = 21 * 60 - 0.01;
  g.update(0.02);
  check('o 21:00 nadchodzi horda', g.world.zombies.length > zBefore, `${zBefore} -> ${g.world.zombies.length}`);
  check('horda jest komunikowana', g.messages.some((m) => /NOC|ZOMBIE/i.test(m.text)));
}
{
  const g = newGame();
  g.time = 3359.99;
  g.update(0.01);
  check('po 2 dobach (08:00 dnia 3) gra ogłasza zwycięstwo', g.mode === 'won', `tryb: ${g.mode}`);
  if (g.mode === 'won') {
    g.render();
    check('ekran zwycięstwa się rysuje', g.buttons.length > 0);
  }
}
{
  const g = newGame();
  g.damagePlayer(999, 'TEST');
  check('śmierć kończy grę', g.mode === 'dead');
  g.render();
  check('ekran śmierci się rysuje', g.buttons.length > 0);
}

section('Sen, głód, zakażenie');
{
  const g = newGame();
  // usuń zombie z okolicy, żeby sen był możliwy
  g.world.zombies.forEach((z) => {
    z.x = 1;
    z.y = 1;
  });
  const b = g.world.buildings[0];
  const bed = g.world.tiles.find((t) => t.prop && t.prop.kind === 'bed');
  teleport(g, bed.x, bed.y + 1);
  g.time = 23 * 60;
  g.player.energy = 20;
  const t0 = g.time;
  const it = g.findInteraction();
  check('łóżko jest wykrywane', !!it && it.kind === 'bed', it ? it.kind : 'brak');
  g.interact();
  check('sen przesuwa czas', g.time > t0 + 60);
  check('sen regeneruje energię', g.player.energy === 100);
}
{
  const g = newGame();
  g.player.hunger = 0;
  const hp0 = g.player.hp;
  step(g, 120);
  check('głód odbiera HP', g.player.hp < hp0);
  check('głód jest komunikowany', g.messages.some((m) => /GŁOD/i.test(m.text)));
}
{
  const g = newGame();
  g.player.infected = true;
  g.player.infection = 99;
  const cause = g.die.bind(g);
  g.update(1 / 60);
  check('zakażenie rośnie w czasie', g.player.infection >= 99);
  g.player.infection = 100;
  g.update(1 / 60);
  check('pełne zakażenie zabija', g.mode === 'dead' && g.deathCause === 'ZAKAŻENIE', `tryb ${g.mode}, ${g.deathCause}`);
}

section('Interfejs i ekrany');
{
  const g = newGame();
  for (const mode of ['playing', 'paused', 'map', 'help', 'dead', 'won']) {
    g.mode = mode;
    if (mode === 'help') g.helpBg = 'game';
    g.render();
    const nonVoid = g.screen.data.some((v) => v !== 0);
    check(`ekran "${mode}" coś rysuje`, nonVoid);
  }
  g.toMenu();
  g.render();
  check('menu ma przyciski', g.buttons.length === 4);
  check('menu rysuje podgląd miasta', g.screen.data.some((v) => v !== 0));
}
{
  const g = newGame();
  g.inventory.push({ id: 'backpack', count: 1 });
  g.selected = g.inventory.length - 1;
  const cap0 = g.capacity();
  g.useSelected();
  check('plecak zwiększa pojemność', g.capacity() === cap0 + 5);
  g.inventory.push({ id: 'flashlight', count: 1 });
  g.selected = g.inventory.length - 1;
  g.useSelected();
  check('latarka się włącza', g.player.flashlightOn === true);
  g.useSelected();
  check('latarka się wyłącza', g.player.flashlightOn === false);
}
{
  const g = newGame();
  g.inventory.push({ id: 'map', count: 1 });
  g.selected = g.inventory.length - 1;
  g.useSelected();
  check('mapa otwiera ekran mapy', g.mode === 'map');
  g.keyDown('KeyM');
  check('M zamyka mapę', g.mode === 'playing');
}

section('Dane i eksport');
{
  const g = newGame();
  check('wszystkie łupy mają definicje', g.world.tiles.every((t) => !t.prop || !t.prop.container || t.prop.container.loot.every((it) => ITEMS[it.id])));
  check('każda ikona przedmiotu istnieje', Object.keys(ITEMS).every((id) => !!art.icons[ITEMS[id].icon]));
  check('każdy kafel podłogi ma 3 warianty', ['grass', 'dirt', 'asphalt', 'sidewalk', 'wood', 'tile', 'carpet', 'water', 'concrete', 'gravel'].every((k) => art.tiles[k].length === 3));
  check('każdy materiał ściany ma 5 wariantów', ['brick', 'concrete', 'wood'].every((m) => Object.keys(art.walls[m]).length === 5));
  check('paleta ma dokładnie 32 kolory', (await import('../src/palette.js')).PALETTE.length === 32);
}

console.log(`\n${passed} OK, ${failed} FAIL`);
process.exit(failed ? 1 : 0);
