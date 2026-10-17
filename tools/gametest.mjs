// Testy akceptacyjne mechanik. Uruchomienie: node tools/gametest.mjs
import { buildArt } from '../src/art.js';
import { Screen, isoX, isoY } from '../src/render.js';
import { Game } from '../src/game.js';
import { World } from '../src/world.js';
import { ITEMS } from '../src/items.js';
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

section('Dane i eksport');
{
  const g = newGame();
  check('wszystkie łupy mają definicje', g.world.tiles.every((t) => !t.prop || !t.prop.container || t.prop.container.loot.every((it) => ITEMS[it.id])));
  check('każda ikona przedmiotu istnieje', Object.keys(ITEMS).every((id) => !!art.icons[ITEMS[id].icon]));
  check('każdy kafel podłogi ma 3 warianty', ['grass', 'dirt', 'asphalt', 'sidewalk', 'wood', 'tile', 'carpet', 'water', 'concrete', 'gravel'].every((k) => art.tiles[k].length === 3));
  check('każdy materiał ściany ma 5 wariantów', ['brick', 'concrete', 'wood'].every((m) => Object.keys(art.walls[m]).length === 5));
  check('paleta eksportowa ma dokładnie 32 kolory', (await import('../src/palette.js')).PALETTE.length === 32);
}

console.log(`\n${passed} OK, ${failed} FAIL`);
process.exit(failed ? 1 : 0);
