// Generuje zrzuty ekranu do dokumentacji (docs/screens, skala x2, nearest neighbour).
import fs from 'fs';
import path from 'path';
import { PNG } from 'pngjs';
import { buildArt } from '../src/art.js';
import { Screen, VIEW_W, VIEW_H } from '../src/render.js';
import { Game } from '../src/game.js';

const stub = { muted: false, init() {}, play() {}, setRain() {}, setMuted() {}, toggleMute() { return true; } };
const art = buildArt();
const screen = new Screen(VIEW_W, VIEW_H);
const game = new Game(screen, art, stub);

const outDir = path.resolve('docs/screens');
fs.mkdirSync(outDir, { recursive: true });

function save(name, scale = 2) {
  game.present();
  const src = screen.rgba();
  const w = VIEW_W * scale;
  const h = VIEW_H * scale;
  const png = new PNG({ width: w, height: h });
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const si = (((y / scale) | 0) * VIEW_W + ((x / scale) | 0)) * 4;
      const di = (y * w + x) * 4;
      png.data[di] = src[si];
      png.data[di + 1] = src[si + 1];
      png.data[di + 2] = src[si + 2];
      png.data[di + 3] = 255;
    }
  }
  fs.writeFileSync(path.join(outDir, name), PNG.sync.write(png));
  console.log('zapisano docs/screens/' + name);
}

// 1. Ekran tytułowy
game.update(0.1);
game.render();
save('01-tytul.png');

// 1b. O projekcie
game.setProfile('aga', true);
game.mode = 'about';
game.render();
save('08-o-projekcie.png');
game.mode = 'menu';

// 2. Miasteczko za dnia + zombie (cel: AGA 64)
game.startGame(0x5eed1);
game.setProfile('aga', true);
game.player.x = 25; game.player.y = 8;
game.player.vx = 25; game.player.vy = 8;
game.camera.follow(25, 8);
game.updateFOV(true);
for (const [x, y, v] of [[27, 7, 0], [23, 9, 1], [26, 11, 2], [28, 8, 3]]) {
  const z = game.world.addZombie(x, y, game.rng);
  z.variant = v; z.state = 'wander'; z.decideTimer = 99;
}
game.time = 10 * 60 + 20;
game.render();
save('02-miasteczko.png');

// 2b. Ten sam kadr w trybie zgodności OCS (32 kolory)
game.setProfile('ocs', true);
game.render();
save('09-ocs-dzien.png');
game.setProfile('aga', true);

// 3. Walka
game.inventory.push({ id: 'bat', count: 1, dur: 42 });
game.selected = game.inventory.length - 1;
game.player.x = 26; game.player.y = 8; game.player.vx = 26; game.player.vy = 8;
game.updateFOV(true);
game.tryAttack();
for (const z of game.world.zombies) z.flash = 0; // bez białej klatki trafienia na zrzucie
game.render();
save('03-walka.png');

// 3b. Mysz: kursor, podgląd trasy i etykieta interakcji
game.setProfile('aga', true);
game.time = 10 * 60 + 20;
game.mode = 'playing';
for (const z of game.world.zombies) z.stun = 99;
const player = game.player;
game.camera.follow(player.vx, player.vy);
let mouseTarget = null;
// najpierw spróbuj drzwi: trasa + złota etykieta akcji
for (let y = 0; y < 40 && !mouseTarget; y++) {
  for (let x = 0; x < 48; x++) {
    const t = game.world.tile(x, y);
    if (!t.wall || t.wall.feature !== 'door' || t.wall.open) continue;
    const path = game.findPath(x, y, { adjacent: true });
    if (!path || path.length < 2 || path.length > 7) continue;
    const [sx, sy] = game.camera.toScreen(x, y);
    if (sx < 20 || sx > 280 || sy < 50 || sy > 135) continue;
    mouseTarget = { x, y, int: true };
    break;
  }
}
if (!mouseTarget) {
  for (let y = 0; y < 40 && !mouseTarget; y++) {
    for (let x = 0; x < 48; x++) {
      if (!game.world.isWalkable(x, y) || game.interactionAt(x, y)) continue;
      const path = game.findPath(x, y, {});
      if (!path || path.length < 3 || path.length > 7) continue;
      const [sx, sy] = game.camera.toScreen(x, y);
      if (sx < 20 || sx > 280 || sy < 50 || sy > 135) continue;
      mouseTarget = { x, y, int: false };
      break;
    }
  }
}
if (mouseTarget) {
  const [mx, my] = game.camera.toScreen(mouseTarget.x, mouseTarget.y);
  game.pointerMove(mx + 16, my + 8);
  game.updateHover();
  game.issueMoveOrder(mx + 16, my + 8);
  game.render();
  save('10-mysz.png');
}

// kursor nie powinien trafiać na zrzuty atmosferyczne
game.releaseMouse();
game.mouse.active = false;
game.hover = null;
game.leadX = 0;
game.leadY = 0;
game.camera.lookX = 0;
game.camera.lookY = 0;

// 4. Noc z latarką — tryb RTG, prawdziwe światło RGB
game.setProfile('rtg', true);
game.time = 23 * 60;
game.weather = 'clear';
game.player.flashlightOn = true;
game.player.dir = 0; // stożek latarki w stronę kamery — najlepiej widoczny na zrzucie
game.updateFOV(true);
game.update(0.05);
game.render();
save('04-noc.png');

// 5. Deszcz (AGA)
game.setProfile('aga', true);
game.time = 12 * 60 + 40;
game.player.flashlightOn = false;
for (const z of game.world.zombies) z.flash = 0;
game.weather = 'rain';
game.updateFOV(true);
game.render();
save('05-deszcz.png');

// 6. Mapa
game.mode = 'map';
game.render();
save('06-mapa.png');

// 7. Pomoc
game.mode = 'help';
game.helpBg = 'game';
game.helpReturn = 'paused';
game.render();
save('07-pomoc.png');

console.log('gotowe');
