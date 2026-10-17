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
  screen.syncRGBA();
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

// 2. Miasteczko za dnia + zombie
game.startGame(0x5eed1);
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

// 3. Walka
game.inventory.push({ id: 'bat', count: 1, dur: 60 });
game.selected = game.inventory.length - 1;
game.player.x = 26; game.player.y = 8; game.player.vx = 26; game.player.vy = 8;
game.updateFOV(true);
game.tryAttack();
game.render();
save('03-walka.png');

// 4. Noc z latarką
game.time = 23 * 60;
game.weather = 'clear';
game.player.flashlightOn = true;
game.updateFOV(true);
game.update(0.05);
game.render();
save('04-noc.png');

// 5. Deszcz
game.time = 12 * 60 + 40;
game.player.flashlightOn = false;
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
