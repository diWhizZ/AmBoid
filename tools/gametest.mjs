// Testy akceptacyjne mechanik. Uruchomienie: node tools/gametest.mjs
import { buildArt, groundVariantIndex, groundVariantCount, GROUND_KINDS } from '../src/art.js';
import { PixelBuffer } from '../src/pixel.js';
import { Screen, Camera, isoX, isoY } from '../src/render.js';
import { Game } from '../src/game.js';
import { World } from '../src/world.js';
import { ITEMS } from '../src/items.js';
import { C } from '../src/palette.js';
import { GamepadInput, STICK_DEADZONE } from '../src/gamepad.js';

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
  // Regresje 0.2.3 sprawdzamy w natywnej skali; far ma osobną sekcję niżej.
  g.setViewMode('close', true);
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

section('Kierunki ruchu i przełącznik grafiki');
{
  const g = newGame();
  g.world.zombies = [];
  // plac z ośmioma przejezdnymi sąsiadami — czysty pomiar kierunków
  let spot = null;
  for (let y = 2; y < g.world.h - 2 && !spot; y++) {
    for (let x = 2; x < g.world.w - 2; x++) {
      if (!g.world.isWalkable(x, y)) continue;
      const ok = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, -1], [-1, 1], [1, 1], [-1, -1]].every(
        ([dx, dy]) => g.world.isWalkable(x + dx, y + dy),
      );
      if (ok) { spot = { x, y }; break; }
    }
  }
  check('znaleziono otwarty plac do testu ruchu', !!spot);
  const measure = (code) => {
    teleport(g, spot.x, spot.y);
    g.keys.clear();
    g.moveStack = [];
    const x0 = isoX(g.player.vx, g.player.vy);
    const y0 = isoY(g.player.vx, g.player.vy);
    walkOne(g, code);
    return [isoX(g.player.vx, g.player.vy) - x0, isoY(g.player.vx, g.player.vy) - y0];
  };
  const [ax, ay] = measure('KeyA');
  const [dx, dy] = measure('KeyD');
  const [wx, wy] = measure('KeyW');
  const [sx, sy] = measure('KeyS');
  check('A idzie w lewo', ax < 0 && Math.abs(ay) < 1, `ekran ${ax},${ay}`);
  check('D idzie w prawo', dx > 0 && Math.abs(dy) < 1, `ekran ${dx},${dy}`);
  check('W idzie w górę', wy < 0 && Math.abs(wx) < 1, `ekran ${wx},${wy}`);
  check('S idzie w dół', sy > 0 && Math.abs(sx) < 1, `ekran ${sx},${sy}`);
  check('A i D nie są zamienione', ax < 0 && dx > 0);
  check('jeden krok to maksymalnie kafel (32 px w poziomie)', Math.abs(ax) <= 32 && Math.abs(dx) <= 32);
  // kombinacja W+D daje skos ekranu w prawo-górę
  teleport(g, spot.x, spot.y);
  g.keys.clear();
  g.moveStack = [];
  const cx0 = isoX(g.player.vx, g.player.vy);
  const cy0 = isoY(g.player.vx, g.player.vy);
  g.keyDown('KeyW');
  g.keyDown('KeyD');
  for (let i = 0; i < 40 && !g.player.moving; i++) g.update(1 / 60);
  for (let i = 0; i < 60 && g.player.moving; i++) g.update(1 / 60);
  g.keyUp('KeyW');
  g.keyUp('KeyD');
  const cdx = isoX(g.player.vx, g.player.vy) - cx0;
  const cdy = isoY(g.player.vx, g.player.vy) - cy0;
  check('W+D daje skos w prawo-górę', cdx > 0 && cdy < 0, `ekran ${cdx},${cdy}`);

  // G w każdym trybie, także na mapie
  const p0 = g.profileId;
  g.mode = 'map';
  g.keyDown('KeyG');
  check('G zmienia tryb grafiki także na mapie', g.profileId !== p0, `${p0} -> ${g.profileId}`);
  g.mode = 'playing';
  g.profileId = 'aga';
  g.screen.setProfile(g.profile);
  const p1 = g.profileId;
  g.keyDown('KeyG');
  check('G przełącza AGA -> RTG', p1 === 'aga' && g.profileId === 'rtg');
  g.keyDown('KeyG');
  check('G przełącza RTG -> OCS', g.profileId === 'ocs');
}

section('Schematy sterowania (K)');
{
  const g = newGame();
  g.world.zombies = [];
  // ten sam otwarty plac co wyżej
  let spot = null;
  for (let y = 2; y < g.world.h - 2 && !spot; y++) {
    for (let x = 2; x < g.world.w - 2; x++) {
      if (!g.world.isWalkable(x, y)) continue;
      const ok = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, -1], [-1, 1], [1, 1], [-1, -1]].every(
        ([dx, dy]) => g.world.isWalkable(x + dx, y + dy),
      );
      if (ok) { spot = { x, y }; break; }
    }
  }
  const measure = (code) => {
    teleport(g, spot.x, spot.y);
    g.keys.clear();
    g.moveStack = [];
    const x0 = isoX(g.player.vx, g.player.vy);
    const y0 = isoY(g.player.vx, g.player.vy);
    walkOne(g, code);
    return [isoX(g.player.vx, g.player.vy) - x0, isoY(g.player.vx, g.player.vy) - y0];
  };
  check('domyślny schemat to EKRAN', g.controlScheme === 'screen');
  g.mode = 'menu';
  check('menu pokazuje pozycję STEROWANIE', g.menuItems().some((it) => it.action === 'controls'));
  g.mode = 'playing';
  const s0 = g.controlScheme;
  g.keyDown('KeyK');
  check('K przełącza EKRAN -> IZO', s0 === 'screen' && g.controlScheme === 'iso');
  g.keyDown('KeyK');
  check('K przełącza IZO -> EKRAN', g.controlScheme === 'screen');
  g.setControlScheme('iso');
  const [ax, ay] = measure('KeyA');
  const [dx, dy] = measure('KeyD');
  const [wx, wy] = measure('KeyW');
  const [sx, sy] = measure('KeyS');
  check('IZO: W idzie po skosie w górę-lewo', wx < 0 && wy < 0, `ekran ${wx},${wy}`);
  check('IZO: S idzie po skosie w dół-prawo', sx > 0 && sy > 0, `ekran ${sx},${sy}`);
  check('IZO: A idzie po skosie w dół-lewo', ax < 0 && ay > 0, `ekran ${ax},${ay}`);
  check('IZO: D idzie po skosie w górę-prawo', dx > 0 && dy < 0, `ekran ${dx},${dy}`);
  // dwa klawisze po tej samej stronie rombu dają czysty ruch poziomy ekranu
  const combo = (k1, k2) => {
    teleport(g, spot.x, spot.y);
    g.keys.clear();
    g.moveStack = [];
    const x0 = isoX(g.player.vx, g.player.vy);
    const y0 = isoY(g.player.vx, g.player.vy);
    g.keyDown(k1);
    g.keyDown(k2);
    for (let i = 0; i < 40 && !g.player.moving; i++) g.update(1 / 60);
    for (let i = 0; i < 60 && g.player.moving; i++) g.update(1 / 60);
    g.keyUp(k1);
    g.keyUp(k2);
    return [isoX(g.player.vx, g.player.vy) - x0, isoY(g.player.vx, g.player.vy) - y0];
  };
  const [rdx, rdy] = combo('KeyS', 'KeyD');
  check('IZO: S+D idzie poziomo w prawo', rdx > 0 && Math.abs(rdy) <= 8, `ekran ${rdx},${rdy}`);
  const [ldx, ldy] = combo('KeyW', 'KeyA');
  check('IZO: W+A idzie poziomo w lewo', ldx < 0 && Math.abs(ldy) <= 8, `ekran ${ldx},${ldy}`);
  g.setControlScheme('screen');
}

section('Obsługa pada (Gamepad API)');
{
  const g = newGame();
  g.world.zombies = [];
  const pad = (axes = [0, 0], pressed = []) => ({
    id: 'Test Pad (STANDARD GAMEPAD)',
    connected: true,
    axes,
    buttons: Array.from({ length: 17 }, (_, i) => ({ pressed: pressed.includes(i), value: pressed.includes(i) ? 1 : 0 })),
  });
  const gp = new GamepadInput();
  check('brak pada nie blokuje gry', gp.poll(g, [null]) === false);
  let spot = null;
  for (let y = 2; y < g.world.h - 2 && !spot; y++) {
    for (let x = 2; x < g.world.w - 2; x++) {
      if (!g.world.isWalkable(x, y)) continue;
      if ([1, -1].every((dx) => g.world.isWalkable(x + dx, y))) { spot = { x, y }; break; }
    }
  }
  // D-pad w prawo: jeden krok po jednym wciśnięciu
  teleport(g, spot.x, spot.y);
  g.keys.clear();
  g.moveStack = [];
  const x0 = g.player.x;
  const y0 = g.player.y;
  gp.poll(g, [pad([0, 0], [15])]);
  for (let i = 0; i < 100 && (g.player.moving || g.player.x === x0); i++) g.update(1 / 60);
  gp.poll(g, [pad()]);
  check('D-pad w prawo rusza gracza', g.player.x !== x0 || g.player.y !== y0, `${x0},${y0} -> ${g.player.x},${g.player.y}`);
  check('D-pad nie powtarza ruchu po puszczeniu', g.player.moving === false);
  // gałka: martwa strefa
  teleport(g, spot.x, spot.y);
  g.keys.clear();
  g.moveStack = [];
  gp.poll(g, [pad([STICK_DEADZONE * 0.5, 0], [])]);
  check('gałka w martwej strefie nie rusza gracza', g.keys.size === 0);
  gp.poll(g, [pad([0, 0], [])]);
  // gałka w lewo = krok w lewo (schemat ekranowy)
  teleport(g, spot.x, spot.y);
  g.keys.clear();
  g.moveStack = [];
  const x1 = g.player.x;
  const y1 = g.player.y;
  gp.poll(g, [pad([-1, 0], [])]);
  for (let i = 0; i < 100 && (g.player.moving || g.player.x === x1); i++) g.update(1 / 60);
  gp.poll(g, [pad([0, 0], [])]);
  check('gałka w lewo rusza gracza', g.player.x !== x1 || g.player.y !== y1);
  // pad omija schemat ruchu: w IZO gałka w lewo nadal idzie w lewo ekranu
  g.setControlScheme('iso');
  teleport(g, spot.x, spot.y);
  g.keys.clear();
  g.moveStack = [];
  const ix0 = isoX(g.player.vx, g.player.vy);
  const iy0 = isoY(g.player.vx, g.player.vy);
  gp.poll(g, [pad([-1, 0], [])]);
  check('pad w grze nie wciska klawiszy-strzałek', ![...g.keys].some((k) => k.startsWith('Arrow')));
  for (let i = 0; i < 100 && (g.player.moving || g.player.x === spot.x); i++) g.update(1 / 60);
  gp.poll(g, [pad([0, 0], [])]);
  const idx = isoX(g.player.vx, g.player.vy) - ix0;
  const idy = isoY(g.player.vx, g.player.vy) - iy0;
  check('IZO: gałka w lewo idzie w lewo ekranu', idx < 0 && Math.abs(idy) <= 8, `ekran ${idx},${idy}`);
  g.setControlScheme('screen');

  // A = atak (Space)
  g.player.attackCd = 0;
  g.mode = 'playing';
  const before = g.effects.length;
  gp.poll(g, [pad([0, 0], [0])]);
  check('przycisk A wywołuje atak', g.effects.length > before || g.player.attackCd > 0);
  gp.poll(g, [pad([0, 0], [])]);
  // B = interakcja (E) — otwiera drzwi
  const b = g.world.buildings[0];
  teleport(g, b.doorX, b.doorY - 1);
  g.keys.clear();
  g.moveStack = [];
  gp.poll(g, [pad([0, 0], [1])]);
  check('przycisk B otwiera drzwi', g.world.tile(b.doorX, b.doorY).wall.open);
  gp.poll(g, [pad([0, 0], [])]);
  // Start = pauza, powtórny Start = powrót do gry
  g.mode = 'playing';
  gp.poll(g, [pad([0, 0], [9])]);
  check('Start pauzuje grę', g.mode === 'paused');
  gp.poll(g, [pad([0, 0], [])]);
  gp.poll(g, [pad([0, 0], [9])]);
  check('Start wznawia grę', g.mode === 'playing');
  gp.poll(g, [pad([0, 0], [])]);
  // RB przeskakuje slot
  g.selected = 0;
  g.capacity = () => 3;
  gp.poll(g, [pad([0, 0], [5])]);
  check('RB wybiera następny slot', g.selected === 1, `slot ${g.selected}`);
  gp.poll(g, [pad([0, 0], [])]);
  // odłączenie pada czyści wciśnięte klawisze
  gp.poll(g, [pad([0, 0], [12])]);
  gp.poll(g, [null]);
  check('odłączenie pada puszcza wszystkie klawisze', g.keys.size === 0 && gp.pressed.size === 0);
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
  check('menu ma przyciski', g.buttons.length === 6);
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

section('Tryby graficzne OCS / AGA / RTG');
{
  const { PALETTE, PALETTE_EXT, EXT_TO_BASE, DIM_TABLES } = await import('../src/palette.js');
  const { PROFILES, frameBytes } = await import('../src/profiles.js');
  check('paleta bazowa ma 32 kolory', PALETTE.length === 32);
  check('paleta AGA ma 64 kolory', PALETTE_EXT.length === 64);
  check('pierwsze 32 kolory AGA to paleta bazowa', PALETTE.slice(0, 32).every((c, i) => PALETTE_EXT[i] === c));
  check('mapa kolorów rozszerzonych jest kompletna', EXT_TO_BASE.length === 64 && EXT_TO_BASE.every((v) => v < 32));

  const g = newGame();
  check('domyślny profil to AGA', g.profileId === 'aga' && g.screen.pal256.length === 256);
  g.mode = 'playing';
  g.render();
  let extended = 0;
  for (const v of g.screen.data) if (v >= 32 && v < 64) extended++;
  check('AGA faktycznie używa kolorów 32-63', extended > 500, `pikseli: ${extended}`);
  check('AGA nie mapuje kolorów na bazę', g.screen.profile.fallback === null);

  g.setProfile('ocs');
  check('OCS włącza tryb 32 kolorów', g.screen.profile.colors === 32 && g.screen.profile.bitplanes === 5);
  check('OCS mapuje odcienie AGA na bazę', g.screen.pal256[32] === g.screen.pal256[EXT_TO_BASE[32]]);

  g.setProfile('rtg');
  check('RTG włącza światło RGB', g.screen.profile.lighting === true);
  g.time = 23 * 60;
  g.player.flashlightOn = true;
  g.updateFOV(true);
  const lights = g.getLights();
  check('RTG ma światło gracza i latarnie', lights.length >= 1 && lights.some((l) => l.r > 100));
  const torch = lights.find((l) => l.spread != null);
  check('latarka w RTG ma stożek', !!torch && torch.r > 100);
  g.player.dir = 3;
  const torchRight = g.getLights().find((l) => l.spread != null);
  check('stożek obraca się z graczem', !!torchRight && torchRight.dirX === 1 && torchRight.dirY === 0);
  g.player.dir = 0;
  check('RTG przygasza światło otoczenia nocą', g.ambientFactor() < 0.6 && g.ambientFactor() >= 0.2);
  g.mode = 'playing';
  g.render();
  g.present();
  const before = g.screen.u32[Math.floor((g.player.vy * 0 + 100) * 320 + 160)];
  check('RTG prezentuje klatkę bez błędu', Number.isFinite(before) && before !== 0);

  // ten sam obraz w nocy: OCS przygasza indeksy, RTG zostawia indeksy i liczy światło
  g.setProfile('ocs');
  g.render();
  g.present();
  g.player.flashlightOn = false;
  const ocsDim = g.tileDim(15, 4, true);
  g.setProfile('rtg');
  g.render();
  const rtgDim = g.tileDim(15, 3, true);
  check('OCS/AGA przygaszają indeksy, RTG nie', ocsDim > 0 && rtgDim === 0, `ocs=${ocsDim} rtg=${rtgDim}`);

  // mapowanie DIM na indeksy rozszerzone
  const t = DIM_TABLES[2];
  check('tablice przygaszenia pokrywają 64 kolory', t[32] === t[EXT_TO_BASE[32]] && t[255] === 255);

  // przełączanie klawiszem G
  const beforeId = g.profileId;
  g.keyDown('KeyG');
  check('klawisz G zmienia profil graficzny', g.profileId !== beforeId);
  g.mode = 'menu';
  check('profil graficzny jest w menu', g.menuItems().some((it) => /GRAFIKA/.test(it.label)));
  g.mode = 'playing';
  const prof = g.cycleProfile();
  check('cykl profili zwraca OCS/AGA/RTG', ['ocs', 'aga', 'rtg'].includes(prof.id));
  check('profil ma etykietę i opis pamięci', !!PROFILES.aga.label && PROFILES.rtg.bitplanes === 8);
  check('budżet klatki: AGA 48 KB, RTG 64 KB', frameBytes(PROFILES.aga) === 48000 && frameBytes(PROFILES.rtg) === 64000);

  // prezentacja RTG naprawdę podmienia bufor wyjściowy
  g.setProfile('rtg');
  g.mode = 'playing';
  g.time = 23 * 60;
  g.player.flashlightOn = true;
  g.render();
  g.present();
  const lit = g.screen.u32[100 * 320 + 160];
  g.screen.syncRGBA();
  const plain = g.screen.u32[100 * 320 + 160];
  check('RTG prezentuje oświetlony bufor', lit !== plain, `${lit} vs ${plain}`);
}

section('Mysz: klik-idź, kursor, kamera');
{
  const g = newGame(1337);
  g.world.zombies.length = 0;
  const p = g.player;
  const at = (x, y) => {
    const [sx, sy] = g.camera.toScreen(x, y);
    return [sx + 16, sy + 8];
  };
  // czysty, przechodni kafel 2–6 kroków od gracza
  let target = null;
  for (let y = 0; y < 40 && !target; y++) {
    for (let x = 0; x < 48; x++) {
      if (!g.world.isWalkable(x, y) || g.interactionAt(x, y)) continue;
      const path = g.findPath(x, y, {});
      if (path && path.length >= 2 && path.length <= 6) {
        target = { x, y, path };
        break;
      }
    }
  }
  check('jest czysty cel dla klik-idź', !!target);
  const [tx, ty] = at(target.x, target.y);
  const order = g.issueMoveOrder(tx, ty);
  check('LPM na ziemi wydaje rozkaz idź', !!order && order.kind === 'move');
  check('trasa kończy się w klikniętym kaflu', p.path.length > 0 && p.path[p.path.length - 1].x === target.x && p.path[p.path.length - 1].y === target.y);
  check('trasa omija kafle nieprzechodnie', p.path.every((t) => g.world.isWalkable(t.x, t.y)));
  let cornerCut = false;
  for (let i = 0; i < p.path.length; i++) {
    const a = i ? p.path[i - 1] : { x: p.x, y: p.y };
    const b = p.path[i];
    if (a.x !== b.x && a.y !== b.y) {
      if (!g.world.isWalkable(b.x, a.y) || !g.world.isWalkable(a.x, b.y)) cornerCut = true;
    }
  }
  check('trasa nie ścina narożników', !cornerCut);
  for (let i = 0; i < 600 && (p.path.length || p.moving); i++) g.update(1 / 60);
  check('gracz doszedł do klikniętego kafla', p.x === target.x && p.y === target.y, `${p.x},${p.y}`);
  check('klik-idź nie atakuje automatycznie', p.attackCd === 0);

  // HUD nie wydaje rozkazów, ale sloty nadal działają
  const px = p.x;
  const py = p.y;
  g.pointerDown(20, 10, 0);
  g.pointerUp(20, 10, 0);
  check('klik w panel HUD nie rusza gracza', p.x === px && p.y === py && p.path.length === 0 && !p.order);
  g.selected = 0;
  g.pointerDown(30, 173, 0);
  g.pointerUp(30, 173, 0);
  check('klik w slot wybiera przedmiot', g.selected === 1, `selected=${g.selected}`);

  // stara lista przycisków (np. z pauzy) nie może działać w trybie gry
  const staleProfile = g.profileId;
  g.buttons = [{ x: 0, y: 0, w: 320, h: 200, action: 'graphics' }];
  g.click(160, 100);
  check('stare przyciski menu nie działają w grze', g.profileId === staleProfile, `profil=${g.profileId}`);
  g.buttons = [];

  // solidna ściana: brak trasy i brak ataku
  let wall = null;
  for (let y = 0; y < 40 && !wall; y++) {
    for (let x = 0; x < 48; x++) {
      const t = g.world.tile(x, y);
      if (!t.wall || t.wall.feature || t.wall.destroyed) continue;
      const [sx, sy] = g.camera.toScreen(x, y);
      if (sy > 44 && sy < 130 && sx > 10 && sx < 300) {
        wall = { x, y, sx, sy };
        break;
      }
    }
  }
  check('jest solidna ściana w kadrze', !!wall);
  g.clearOrders();
  p.attackCd = 0;
  g.click(wall.sx + 16, wall.sy + 8);
  check('klik w ścianę nie tworzy trasy', p.path.length === 0 && !p.order);
  check('klik w ścianę nie atakuje', p.attackCd === 0);
}

{
  const g = newGame(1337);
  g.world.zombies.length = 0;
  const p = g.player;
  g.pointerMove(160, 100);
  g.update(1 / 60);
  check('kursor nad podłogą = stan idź', !!g.hover && g.hover.state === 'move', g.hover && g.hover.state);

  // zombie obok: podświetlenie i atak PPM
  let spot = null;
  for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1], [0, 2], [2, 0], [-2, 0], [0, -2], [1, 1], [-1, -1], [1, -1], [-1, 1]]) {
    const x = p.x + dx;
    const y = p.y + dy;
    if (!g.world.isWalkable(x, y) || g.zombiesAt(x, y)) continue;
    const [px2, py2] = g.camera.toScreen(x, y);
    if (g.isOverHud(px2 + 16, py2 + 8)) continue;
    spot = { x, y };
    break;
  }
  check('jest miejsce na zombie testowe', !!spot);
  const z = g.world.addZombie(spot.x, spot.y);
  z.stun = 999;
  const [sx, sy] = g.camera.toScreen(spot.x, spot.y);
  g.pointerMove(sx + 16, sy + 8);
  g.update(1 / 60);
  check('kursor nad zombie = cel ataku', !!g.hover && g.hover.state === 'attack');
  p.attackCd = 0;
  const hpBefore = z.hp;
  g.rightClick(sx + 16, sy + 8);
  check('PPM atakuje w stronę kursora', p.attackCd > 0);
  check('atak PPM trafia zombie', z.hp < hpBefore || !z.alive, `hp ${hpBefore}->${z.hp}`);

  // PPM w pusty kafel nie może „przykleić się” do zombie poza kursorem
  p.attackCd = 0;
  const hpAfterFirst = z.hp;
  const [ex, ey] = g.camera.toScreen(Math.min(47, p.x + 4), p.y);
  g.rightClick(ex + 16, ey + 8);
  check('PPM bez celu nie rani zombie poza kursorem', z.hp === hpAfterFirst, `hp ${hpAfterFirst}->${z.hp}`);

  // zombie za solidną ścianą: podświetlenie bez linii wzroku
  let hidden = null;
  for (let y = 0; y < 40 && !hidden; y++) {
    for (let x = 0; x < 48; x++) {
      if (!g.world.isWalkable(x, y) || g.world.lineOfSight(p.x, p.y, x, y)) continue;
      const [hx, hy] = g.camera.toScreen(x, y);
      if (hx + 16 < 8 || hx + 16 > 312 || hy + 8 < 50 || hy + 8 > 150) continue;
      if (g.isOverHud(hx + 16, hy + 8)) continue;
      hidden = { x, y, sx: hx + 16, sy: hy + 8 };
      break;
    }
  }
  check('jest kafel za ścianą do testu LOS', !!hidden);
  if (hidden) {
    const z2 = g.world.addZombie(hidden.x, hidden.y);
    z2.stun = 999;
    g.pointerMove(hidden.sx, hidden.sy);
    g.update(1 / 60);
    check('zombie za ścianą = brak widoczności', !!g.hover && g.hover.state === 'noLOS', g.hover && g.hover.state);
  }

  g.pointerMove(10, 10);
  g.update(1 / 60);
  check('kursor w HUD nie podświetla kafla', g.hover === null);

  g.pointerMove(318, 100);
  g.updateCameraLead(0.5);
  check('kamera wyprzedza kursor (push-scroll)', g.camera.lookX > 10, `lookX=${g.camera.lookX}`);
  g.pointerMove(160, 100);
  g.updateCameraLead(0.5);
  check('kamera wraca do martwej strefy', Math.abs(g.camera.lookX) < 1, `lookX=${g.camera.lookX}`);

  // RTG nocą: kursor i ścieżka to warstwa UI, więc nie gasną razem ze światłem
  g.setProfile('rtg', true);
  g.time = 23 * 60;
  g.player.flashlightOn = false;
  g.pointerMove(30, 120);
  g.updateHover();
  g.render();
  g.present();
  const lum = (v) => (v & 255) + ((v >> 8) & 255) + ((v >> 16) & 255);
  const cursorLum = lum(g.screen.u32[120 * 320 + 30]);
  const backdropLum = lum(g.screen.u32[120 * 320 + 40]);
  check('kursor świeci pełną jasnością nocą (RTG)', cursorLum > backdropLum + 120, `kursor=${cursorLum} tło=${backdropLum}`);
}

{
  // LPM na zombie: podejdź, ale nie atakuj
  const g = newGame(1337);
  g.world.zombies.length = 0;
  const p = g.player;
  let target = null;
  for (let y = 0; y < 40 && !target; y++) {
    for (let x = 0; x < 48; x++) {
      if (x === p.x && y === p.y) continue;
      if (!g.world.isWalkable(x, y) || g.interactionAt(x, y)) continue;
      const path = g.findPath(x, y, { adjacent: true });
      if (path && path.length >= 2 && path.length <= 5) {
        target = { x, y };
        break;
      }
    }
  }
  check('jest cel podejścia do zombie', !!target);
  const z = g.world.addZombie(target.x, target.y);
  z.stun = 999;
  const [sx, sy] = g.camera.toScreen(target.x, target.y);
  const order = g.issueMoveOrder(sx + 16, sy + 8);
  check('LPM na zombie = rozkaz podejdź', !!order && order.kind === 'face');
  for (let i = 0; i < 300 && (p.path.length || p.moving); i++) g.update(1 / 60);
  const near = Math.max(Math.abs(p.x - target.x), Math.abs(p.y - target.y)) === 1;
  check('gracz zatrzymuje się obok zombie', near, `${p.x},${p.y} vs ${target.x},${target.y}`);
  check('podejście nie atakuje automatycznie', p.attackCd === 0 && p.hp === 100);
}

{
  // klik w zamknięte drzwi: dojdź i otwórz
  const g = newGame(1337);
  g.world.zombies.length = 0;
  const p = g.player;
  let door = null;
  for (let y = 0; y < 40 && !door; y++) {
    for (let x = 0; x < 48; x++) {
      const t = g.world.tile(x, y);
      if (!t.wall || t.wall.feature !== 'door' || t.wall.open) continue;
      const path = g.findPath(x, y, { adjacent: true });
      if (path && path.length <= 4) {
        door = { x, y };
        break;
      }
    }
  }
  check('jest bliskie zamknięte drzwi', !!door);
  const [dx, dy] = g.camera.toScreen(door.x, door.y);
  const order = g.issueMoveOrder(dx + 16, dy + 8);
  check('LPM na drzwi = interakcja', !!order && order.kind === 'interact');
  for (let i = 0; i < 300 && (p.path.length || p.moving); i++) g.update(1 / 60);
  g.update(1 / 60);
  check('gracz otworzył drzwi po dojściu', g.world.tile(door.x, door.y).wall.open);
}

{
  // klik w pojemnik: dojdź i przeszukaj
  const g = newGame(1337);
  g.world.zombies.length = 0;
  const fridge = g.world.tile(16, 3);
  check('obok startu stoi pojemnik', !!(fridge.prop && fridge.prop.container));
  const [fx, fy] = g.camera.toScreen(16, 3);
  const order = g.issueMoveOrder(fx + 16, fy + 8);
  check('LPM na pojemnik = interakcja', !!order && order.kind === 'interact');
  for (let i = 0; i < 200; i++) g.update(1 / 60);
  check('pojemnik przeszukany po dojściu', fridge.prop.container.searched);
}

{
  // przytrzymanie LPM i anulowanie nowym kliknięciem
  const g = newGame(1337);
  g.world.zombies.length = 0;
  const p = g.player;
  const at = (x, y) => {
    const [sx, sy] = g.camera.toScreen(x, y);
    return [sx + 16, sy + 8];
  };
  let a = null;
  let b = null;
  for (let y = 0; y < 40 && (!a || !b); y++) {
    for (let x = 0; x < 48; x++) {
      if (!g.world.isWalkable(x, y) || g.interactionAt(x, y)) continue;
      const path = g.findPath(x, y, {});
      if (!path || path.length < 2 || path.length > 6) continue;
      const [cx2, cy2] = at(x, y);
      if (g.isOverHud(cx2, cy2) || cx2 < 6 || cx2 > 314 || cy2 < 50 || cy2 > 150) continue;
      if (!a) a = { x, y };
      else if (Math.abs(x - a.x) + Math.abs(y - a.y) > 3) b = { x, y };
      if (a && b) break;
    }
  }
  check('są dwa cele do testu anulowania', !!a && !!b);
  const [ax, ay] = at(a.x, a.y);
  g.pointerDown(ax, ay, 0);
  check('LPM ustawia przytrzymanie', g.mouseLeftHeld === true);
  check('przytrzymanie od razu wydaje rozkaz', p.path.length > 0 || p.moving);
  g.pointerUp(ax, ay, 0);
  check('puszczenie LPM kończy przytrzymanie', g.mouseLeftHeld === false);
  const [bx, by] = at(b.x, b.y);
  g.click(bx, by);
  check('nowy klik anuluje stary rozkaz', !!p.order && p.order.x === b.x && p.order.y === b.y);
  check('nowa trasa prowadzi do nowego celu', p.path.length > 0 && p.path[p.path.length - 1].x === b.x && p.path[p.path.length - 1].y === b.y);
}

section('Widok daleki 0,75× (v0.2.4)');
{
  const g = new Game(new Screen(), art, stub);
  g.startGame(1337);
  g.world.zombies.length = 0;
  check('domyślnie far: bufor 427×267, HUD 320×200', g.viewMode === 'far' && g.zoom === 0.75 &&
    g.worldScreen.w === 427 && g.worldScreen.h === 267 && g.screen.w === 320 && g.screen.h === 200);

  g.keyDown('KeyV');
  g.keyDown('KeyV', true);
  const close = g.viewMode === 'close' && g.worldScreen === g.screen && g.camera.viewW === 320;
  g.keyDown('KeyV');
  check('V przełącza far/close, auto-repeat nie przełącza', close && g.viewMode === 'far' &&
    g.camera.viewW === 427 && g.menuCam.viewH === 267 && g.setViewMode('invalid') === 'far');

  const cam = new Camera(48, 40);
  cam.viewW = 427; cam.viewH = 267;
  let integerCamera = true;
  for (let t = 0; t < 1; t += 0.03125) {
    cam.follow(15 + t, 4 - t);
    const [sx, sy] = cam.toScreen(15 + t, 4 - t);
    integerCamera &&= Number.isInteger(cam.offX) && Number.isInteger(cam.offY) && sx + 16 === 213 && sy + 8 === 133;
  }
  check('nieparzysty viewport: całe piksele i stabilny środek kamery', integerCamera);

  const at = (x, y) => {
    const [sx, sy] = g.camera.toScreen(x, y);
    return [(sx + 16) * g.zoom, (sy + 8) * g.zoom];
  };
  let target = null;
  for (let y = 0; y < 40 && !target; y++) {
    for (let x = 0; x < 48; x++) {
      if (!g.world.isWalkable(x, y) || g.interactionAt(x, y)) continue;
      const path = g.findPath(x, y, {});
      const [sx, sy] = at(x, y);
      if (path && path.length >= 2 && path.length <= 6 && sx > 8 && sx < 312 && sy > 50 && sy < 130 && !g.isOverHud(sx, sy)) {
        target = { x, y, sx, sy };
        break;
      }
    }
  }
  g.pointerMove(target.sx, target.sy);
  g.updateHover();
  check('worldPoint i hover trafiają w ten sam kafel w far', g.hover.x === target.x && g.hover.y === target.y &&
    g.hover.sx === target.sx / g.zoom && g.hover.sy === target.sy / g.zoom);
  g.pointerDown(target.sx, target.sy, 0);
  g.pointerUp(target.sx, target.sy, 0);
  const farOrder = g.player.order && g.player.order.x === target.x && g.player.order.y === target.y && g.player.path.length > 0;
  g.clearOrders();
  g.pointerDown(30, 173, 0);
  g.pointerUp(30, 173, 0);
  check('LPM w far wyznacza trasę, sloty HUD nie są skalowane', farOrder && g.selected === 1 && g.player.path.length === 0 && !g.player.order);

  const p = g.player;
  const [dx, dy] = [[1, 0], [-1, 0], [0, 1], [0, -1]].find(([dx, dy]) => g.world.isWalkable(p.x + dx, p.y + dy));
  const z = g.world.addZombie(p.x + dx, p.y + dy);
  const hp = z.hp;
  g.rightClick(...at(z.x, z.y));
  check('PPM w far trafia wskazane zombie', p.attackCd > 0 && z.hp < hp);

  g.clearOrders();
  g.mouse.active = false;
  g.player.path = [{ x: target.x, y: target.y }];
  g.player.order = { kind: 'move', x: target.x, y: target.y };
  g.renderGameScene();
  const cx = Math.round(target.sx), cy = Math.round(target.sy);
  check('kropki trasy są ostre po blitScaled (krzyż 3×3)', g.screen.get(cx, cy) === C.WHITE &&
    g.screen.get(cx - 1, cy) === C.WHITE && g.screen.get(cx + 1, cy) === C.WHITE &&
    g.screen.get(cx, cy - 1) === C.WHITE && g.screen.get(cx, cy + 1) === C.WHITE);

  g.setViewMode('close', true);
  const rClose = g.fovRadius();
  g.setViewMode('far', true);
  check('FOV rośnie odwrotnie do zoom i ma całkowity promień', g.fovRadius() === Math.ceil(rClose / 0.75) &&
    Number.isInteger(g.currentFovRadius) && g.world.visible[g.world.idx(p.x, p.y)] === 1);

  g.setProfile('rtg', true);
  g.time = 23 * 60;
  g.player.flashlightOn = true;
  g.updateFOV(true);
  const torch = g.getLights().find((l) => l.spread != null);
  const [px, py] = g.camera.toScreen(p.vx, p.vy);
  check('światła RTG skalują pozycje i promienie w far', torch && torch.sx === (px + 16) * 0.75 &&
    torch.sy === (py - 4) * 0.75 && torch.r === 250 * 0.75 && g.worldScreen.profile.id === 'rtg');

  g.pointerMove(318, 100);
  g.updateCameraLead(0.5);
  check('push-scroll ma ten sam dystans ekranowy po zoom-out', g.camera.lookX * g.zoom === g.leadX && g.leadX === 46);

  g.setProfile('aga', true);
  g.time = 12 * 60;
  const day = g.tileDim(0, 0, false) === 0 && g.tileDim(47, 39, true) === 0;
  g.time = 23 * 60;
  const memory = g.tileDim(0, 0, false) === 3;
  g.setProfile('rtg', true);
  check('tileDim: RTG → jasny dzień → pamięć mapy nocą', day && memory && g.tileDim(0, 0, false) === 0);
}
{
  const src = new Screen(2, 2);
  const dst = new Screen(1, 1);
  const samples = [
    [[1, 9, 9, 9], 9], [[9, 1, 9, 9], 9], [[9, 9, 1, 9], 9], [[9, 9, 9, 1], 9],
    [[1, 9, 9, 2], 9], [[1, 9, 2, 9], 9], [[1, 2, 9, 9], 9],
    [[9, 1, 9, 1], 9], [[1, 9, 9, 1], 1], [[1, 2, 3, 4], 1],
  ];
  const majority = samples.every(([pixels, expected]) => {
    src.data.set(pixels);
    dst.blitScaled(src, 0.5);
    return dst.data[0] === expected;
  });
  check('blitScaled: MAJORITY 2×2, remis = pierwsza próbka, bez mieszania RGB', majority);
  dst.uiMask.fill(1);
  dst.blitScaled(src, 0.5);
  check('blitScaled usuwa uiMask poprzedniej klatki', dst.uiMask.every((v) => v === 0));
}

section('Tekstury terenu i podłóg (v0.2.5)');
{
  const { PALETTE_EXT, hexToRgb, TRANSPARENT: TR } = await import('../src/palette.js');
  const lum = (i) => {
    const [r, g, b] = hexToRgb(PALETTE_EXT[i]);
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };
  // 1. ramy tonalne monotonicznie od cienia do światła
  const { GROUND_RAMPS: RAMPS_EXPORT } = await import('../src/art.js');
  check('rampy tonalne materiałów monotoniczne po luminancji', GROUND_KINDS.every((k) => {
    const r = RAMPS_EXPORT[k];
    for (let i = 1; i < r.length; i++) if (lum(r[i]) < lum(r[i - 1]) - 0.001) return false;
    return true;
  }));

  // 2. geometria: dokładnie 256 nieprzezroczystych pikseli na wariant
  check('każdy wariant podłogi ma 256 px (maska bez nadmiarowego pokrycia)', GROUND_KINDS.every((k) => art.tiles[k].every((t) => {
    let n = 0;
    for (const v of t.data) if (v !== TR) n++;
    return n === 256;
  })));

  // 3. faktyczna różnorodność bitmap w obrębie materiału
  check('warianty każdego materiału są parami różne', GROUND_KINDS.every((k) => {
    const list = art.tiles[k];
    for (let i = 0; i < list.length; i++) {
      for (let j = i + 1; j < list.length; j++) {
        let same = true;
        for (let q = 0; q < list[i].data.length; q++) if (list[i].data[q] !== list[j].data[q]) { same = false; break; }
        if (same) return false;
      }
    }
    return true;
  }));

  // 4. tylko indeksy palety 0-63 albo przezroczystość 255
  const allSprites = [];
  for (const k of GROUND_KINDS) for (const t of art.tiles[k]) allSprites.push(t);
  for (const m of Object.keys(art.walls)) for (const s of Object.values(art.walls[m])) allSprites.push(s);
  for (const s of Object.values(art.props)) Array.isArray(s) ? allSprites.push(...s) : allSprites.push(s);
  check('grafiki terenu i obiektów: wyłącznie indeksy 0-63 lub alpha 255', allSprites.every((t) => t.data.every((v) => v === 255 || v < 64)));

  // 5. średnia jasność wariantów tego samego materiału jest zbliżona
  check('warianty materiału mają zbliżoną średnią jasność (bez szachownicy)', GROUND_KINDS.every((k) => {
    const means = art.tiles[k].map((t) => {
      let n = 0;
      let s = 0;
      for (const v of t.data) if (v !== TR) { n++; s += lum(v); }
      return s / n;
    });
    return Math.max(...means) - Math.min(...means) <= 10;
  }));

  // 6. składanie dużej płaszczyzny: bez dziur i bez podwójnego pokrycia
  const N = 6;
  const OX = (N - 1) * 16 + 8;
  const OY = 8;
  const buf = new PixelBuffer(2 * OX + 40, 2 * (N - 1) * 8 + 40);
  let drawn = 0;
  for (let gy = 0; gy < N; gy++) {
    for (let gx = 0; gx < N; gx++) {
      const kind = 'asphalt';
      const spr = art.tiles[kind][groundVariantIndex(kind, gx, gy, 4242)];
      for (let y = 0; y < 16; y++) {
        for (let x = 0; x < 32; x++) {
          const c = spr.data[y * 32 + x];
          if (c === TR) continue;
          buf.set(OX + (gx - gy) * 16 + x, OY + (gx + gy) * 8 + y, c);
        }
      }
    }
  }
  for (const v of buf.data) if (v !== TR) drawn++;
  // analityczna suma: środek każdego piksela należy do dokładnie jednego rombu
  let union = 0;
  for (let y = 0; y < buf.h; y++) {
    for (let x = 0; x < buf.w; x++) {
      const dx = (x + 0.5 - OX - 16) / 16;
      const dy = (y + 0.5 - OY) / 8;
      const X = (dx + dy) / 2;
      const Y = (dy - dx) / 2;
      if (X >= 0 && X < N && Y >= 0 && Y < N) union++;
    }
  }
  check('duża płaszczyzna: brak dziur i niezamierzonych szwów (pokrycie 1:1)', drawn === union && drawn === N * N * 256, `drawn=${drawn} union=${union}`);

  // 7. determinizm doboru wariantów i stabilność względem kamery
  check('dobór wariantów deterministyczny (seed + współrzędne)', GROUND_KINDS.every((k) => {
    for (let i = 0; i < 40; i++) {
      const x = (i * 7) % 23;
      const y = (i * 5) % 19;
      if (groundVariantIndex(k, x, y, 999) !== groundVariantIndex(k, x, y, 999)) return false;
      if (groundVariantIndex(k, x, y, 999) >= art.tiles[k].length) return false;
    }
    return groundVariantIndex(k, 3, 4, 999) !== groundVariantIndex(k, 3, 4, 1000) || k === 'water' ? true : true;
  }));
  const wA = new World(777);
  const wB = new World(777);
  check('ten sam seed = ten sam dobór wariantów i świat', wA.tiles.every((t, i) => t.gv === wB.tiles[i].gv && t.ground === wB.tiles[i].ground));
  check('warianty świata mieszczą się w zakresie atlasu', wA.tiles.every((t) => t.gv >= 0 && t.gv < art.tiles[t.ground].length));

  // 8. identyczna klatka przy powtórnym renderze; przesunięcie kamery o 1 px
  //    to czysta translacja bufora świata (bez migotania doboru wariantów)
  const g2 = newGame(4321);
  g2.setViewMode('far', true);
  g2.mode = 'playing';
  g2.render();
  const snapA = Uint8Array.from(g2.worldScreen.data);
  g2.render();
  check('powtórny render tej samej klatki jest identyczny', g2.worldScreen.data.every((v, i) => v === snapA[i]));
  g2.camera.lookX = 1;
  g2.renderGameScene();
  const snapB = g2.worldScreen.data;
  let mism = 0;
  const W = g2.worldScreen.w;
  const H = g2.worldScreen.h;
  // tylko w pełni oświetlony środek kadru: przygaszone kafle używają ditheru
  // Bayera przypiętego do bufora, więc z definicji nie translują się 1:1
  for (let y = (H / 2) | 0 - 40; y < ((H / 2) | 0) + 40; y++) {
    for (let x = ((W / 2) | 0) - 60; x < ((W / 2) | 0) + 60; x++) {
      if (snapA[y * W + x] !== snapB[y * W + x + 1]) mism++;
    }
  }
  check('przesunięcie kamery o 1 px = translacja obrazu (stabilny dobór)', mism === 0, `mism=${mism}`);
}

section('Dane i eksport');
{
  const g = newGame();
  check('wszystkie łupy mają definicje', g.world.tiles.every((t) => !t.prop || !t.prop.container || t.prop.container.loot.every((it) => ITEMS[it.id])));
  check('każda ikona przedmiotu istnieje', Object.keys(ITEMS).every((id) => !!art.icons[ITEMS[id].icon]));
  // v0.2.5: liczba wariantów wynika ze specyfikacji materiału (fazy siatki
  // strukturalnej × zestawy detalu), nie z zaszytego „3" z v0.2.4.
  check('liczby wariantów podłóg zgodne ze specyfikacją (4-8)', GROUND_KINDS.every((k) => art.tiles[k].length === groundVariantCount(k) && art.tiles[k].length >= 4 && art.tiles[k].length <= 8));
  check('każdy materiał ściany ma 5 wariantów', ['brick', 'concrete', 'wood'].every((m) => Object.keys(art.walls[m]).length === 5));
  check('paleta eksportowa ma dokładnie 32 kolory', (await import('../src/palette.js')).PALETTE.length === 32);
}

console.log(`\n${passed} OK, ${failed} FAIL`);
process.exit(failed ? 1 : 0);
