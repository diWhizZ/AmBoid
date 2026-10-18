// Narzędzie developerskie (nie jest częścią `npm test`).
//
// Generuje POWTARZALNE kadry do oceny tekstur terenu i podłóg:
//   - duża jednolita płaszczyzna każdego materiału (ten sam wariant wszędzie),
//   - ten sam materiał z wymieszanymi wariantami (realny dobór),
//   - skrzyżowanie jezdnia/chodnik/trawa,
//   - wnętrza: deski i płytki ceramiczne,
//   - właściwy kadr gry (nie tylko atlas) w far 0,75× i close 1×,
//   - fazy przesunięcia kamery o pojedyncze piksele (migotanie/mora),
//   - AGA dzień, OCS 32, RTG noc, plus bufor świata PRZED blitScaled.
//
// Zrzuty trafiają do katalogu ignorowanego przez Git (domyślnie shots/).
// Ten sam seed, te same pozycje kamery i to samo oświetlenie przy każdym
// uruchomieniu — dzięki temu można porównywać bazę i wersję poprawioną 1:1.
//
//   node tools/texshots.mjs --out=shots/base
//   node tools/texshots.mjs --out=shots/v025 --report

import fs from 'fs';
import path from 'path';
import { PNG } from 'pngjs';
import { buildArt } from '../src/art.js';
import { Screen, VIEW_W, VIEW_H } from '../src/render.js';
import { Game } from '../src/game.js';
import { World, WORLD_W, WORLD_H } from '../src/world.js';
import { renderWorld } from '../src/scene.js';
import { PALETTE_EXT, hexToRgb } from '../src/palette.js';
import { hash2 } from '../src/rng.js';

// Dobór wariantu: od v0.2.5 eksportowany z art.js. W starszej bazie (v0.2.4)
// warianty pochodziły z RNG generacji świata — na potrzeby płaskich kadrów
// testowych zastępujemy je deterministycznym haszem współrzędnych.
const ARTMOD = await import('../src/art.js');
function groundVariantIndex(kind, x, y, seed) {
  const n = art.tiles[kind] ? art.tiles[kind].length : 3;
  if (ARTMOD.groundVariantIndex) return ARTMOD.groundVariantIndex(kind, x, y, seed) % n;
  return Math.floor(hash2(x, y, (seed ^ (kind.length * 7919)) >>> 0) * n) % n;
}

const argv = process.argv.slice(2);
const arg = (name, def) => {
  const hit = argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : def;
};
const OUT = arg('out', 'shots/tex');
const WANT_REPORT = argv.includes('--report');
const MATERIALS = ['asphalt', 'grass', 'sidewalk', 'dirt', 'concrete', 'wood', 'tile', 'carpet', 'gravel', 'water'];
const PLANE_SEED = 20250;

const stub = { muted: false, init() {}, play() {}, setRain() {}, setMuted() {}, toggleMute() { return true; } };
const art = buildArt();
const screen = new Screen(VIEW_W, VIEW_H);
const game = new Game(screen, art, stub);
game.setProfile('aga', true);
game.setViewMode('far', true);
game.startGame(PLANE_SEED);
game.mode = 'playing';

fs.mkdirSync(OUT, { recursive: true });

// ---------------------------------------------------------------------------
// zapis PNG: skala 1 (faktyczne 320×200) i nearest ×4 do oglądania detalu
function savePNG(name, src, w, h, scale = 4) {
  for (const [suffix, k] of [['', 1], ['-x4', scale]]) {
    if (k !== 1 && scale === 1) continue;
    const png = new PNG({ width: w * k, height: h * k });
    for (let y = 0; y < h * k; y++) {
      for (let x = 0; x < w * k; x++) {
        const si = (((y / k) | 0) * w + ((x / k) | 0)) * 4;
        const di = (y * w * k + x) * 4;
        png.data[di] = src[si];
        png.data[di + 1] = src[si + 1];
        png.data[di + 2] = src[si + 2];
        png.data[di + 3] = 255;
      }
    }
    fs.writeFileSync(path.join(OUT, name.replace('.png', `${suffix}.png`)), PNG.sync.write(png));
  }
}

function grab(name, scale = 4) {
  const u32 = game.screen.rgba();
  const bytes = new Uint8ClampedArray(u32.buffer.slice(0));
  savePNG(name, bytes, game.screen.w, game.screen.h, scale);
}

function grabWorld(name, scale = 4) {
  const ws = game.worldScreen;
  const u32 = ws.rgba();
  const bytes = new Uint8ClampedArray(u32.buffer.slice(0));
  savePNG(name, bytes, ws.w, ws.h, scale);
}

// ---------------------------------------------------------------------------
// płaski świat testowy: jeden materiał, bez rekwizytów, bez zombie, bez łupów
function flatWorld(kind, seed, uniform) {
  const w = new World(seed);
  for (const t of w.tiles) {
    t.ground = kind;
    t.wall = null;
    t.prop = null;
    t.decal = null;
    t.inside = -1;
    t.lamp = false;
    t.gv = uniform ? 0 : groundVariantIndex(kind, t.x, t.y, seed);
  }
  w.zombies.length = 0;
  w.items.length = 0;
  w.lamps.length = 0;
  w.lampLight.fill(0);
  return w;
}

function planeShot(kind, uniform, view) {
  game.setViewMode(view, true);
  game.world = flatWorld(kind, PLANE_SEED, uniform);
  game.player.x = 20; game.player.y = 18;
  game.player.vx = 20; game.player.vy = 18;
  game.camera.follow(20, 18);
  game.camera.lookX = 0; game.camera.lookY = 0;
  game.leadX = 0; game.leadY = 0;
  game.weather = 'clear';
  game.time = 10 * 60;
  renderWorld(game, game.world, game.camera, {
    screen: game.worldScreen, revealAll: true, noPlayer: true,
  });
  if (game.zoom !== 1) game.screen.blitScaled(game.worldScreen, game.zoom);
  game.screen.syncRGBA();
  grab(`plane-${kind}${uniform ? '-uniform' : '-mixed'}-${view}.png`);
}

// ---------------------------------------------------------------------------
// prawdziwy kadr gry
function gameShot(name, opts = {}) {
  const seed = opts.seed == null ? 0x5eed1 : opts.seed;
  game.setProfile(opts.profile || 'aga', true);
  game.setViewMode(opts.view || 'far', true);
  if (opts.fresh !== false) game.startGame(seed);
  game.mode = 'playing';
  game.weather = opts.weather || 'clear';
  game.time = opts.time == null ? 10 * 60 + 20 : opts.time;
  const px = opts.x, py = opts.y;
  game.player.x = px; game.player.y = py;
  game.player.vx = px; game.player.vy = py;
  game.player.dir = opts.dir == null ? 0 : opts.dir;
  game.player.flashlightOn = !!opts.torch;
  game.leadX = 0; game.leadY = 0;
  game.camera.lookX = opts.shiftX || 0;
  game.camera.lookY = opts.shiftY || 0;
  game.camera.follow(px, py);
  game.updateFOV(true);
  if (opts.reveal) {
    renderWorld(game, game.world, game.camera, {
      screen: game.worldScreen, revealAll: true, noPlayer: !!opts.noPlayer, dimAll: 0,
    });
    if (game.zoom !== 1) game.screen.blitScaled(game.worldScreen, game.zoom);
  } else {
    game.render();
  }
  game.present();
  grab(`${name}.png`, opts.scale == null ? 4 : opts.scale);
  if (opts.worldBuffer) grabWorld(`${name}-worldbuf.png`, opts.scale == null ? 4 : opts.scale);
  return game;
}

// ---------------------------------------------------------------------------
// arkusz kontaktowy atlasu: wszystkie warianty wszystkich materiałów
function contactSheet() {
  const cellW = 32, cellH = 16, gap = 2;
  const maxV = Math.max(...MATERIALS.map((k) => art.tiles[k].length));
  const w = maxV * (cellW + gap) + gap;
  const h = MATERIALS.length * (cellH + gap) + gap;
  const pb = new Screen(w, h);
  pb.setProfile({ id: 'aga', palette: PALETTE_EXT, fallback: null, lighting: false });
  pb.clear(0);
  MATERIALS.forEach((kind, row) => {
    const list = art.tiles[kind];
    for (let v = 0; v < list.length; v++) {
      pb.blit(list[v], gap + v * (cellW + gap), gap + row * (cellH + gap), {});
    }
    for (let v = list.length; v < maxV; v++) {
      const x0 = gap + v * (cellW + gap), y0 = gap + row * (cellH + gap);
      pb.rect(x0, y0, cellW, cellH, 1);
    }
  });
  pb.syncRGBA();
  const bytes = new Uint8ClampedArray(pb.u32.buffer.slice(0));
  savePNG('atlas-kontaktowy.png', bytes, w, h, 6);
  console.log(`atlas: ${MATERIALS.map((k) => `${k}=${art.tiles[k].length}`).join(' ')}`);
}

// ---------------------------------------------------------------------------
// raport liczbowy: jasność, liczba kolorów, udział pojedynczych pikseli
const LUM = (() => {
  const out = new Float64Array(256);
  PALETTE_EXT.forEach((hex, i) => {
    const [r, g, b] = hexToRgb(hex);
    out[i] = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  });
  return out;
})();

function tileStats(pb) {
  let n = 0, sum = 0;
  const hist = new Map();
  for (let y = 0; y < pb.h; y++) {
    for (let x = 0; x < pb.w; x++) {
      const c = pb.data[y * pb.w + x];
      if (c === 255) continue;
      n++;
      sum += LUM[c];
      hist.set(c, (hist.get(c) || 0) + 1);
    }
  }
  // pojedynczy piksel = inny niż wszyscy 4 sąsiedzi (miara "kaszy")
  let lone = 0;
  for (let y = 0; y < pb.h; y++) {
    for (let x = 0; x < pb.w; x++) {
      const c = pb.get(x, y);
      if (c === 255) continue;
      const a = pb.get(x - 1, y), b = pb.get(x + 1, y), d = pb.get(x, y - 1), e = pb.get(x, y + 1);
      if (a !== c && b !== c && d !== c && e !== c) lone++;
    }
  }
  const top = [...hist.entries()].sort((p, q) => q[1] - p[1])[0];
  return { n, mean: sum / Math.max(1, n), colors: hist.size, base: top ? top[0] : -1, basePct: top ? (100 * top[1]) / n : 0, lonePct: (100 * lone) / Math.max(1, n) };
}

function report() {
  console.log('\n== RAPORT TEKSTUR (AGA, kafel 32×16) ==');
  console.log('materiał   war  piksele  średniaLum  kolory  bazowy%  samotne%  min..max lum wariantów');
  for (const kind of MATERIALS) {
    const list = art.tiles[kind];
    const st = list.map(tileStats);
    const means = st.map((s) => s.mean);
    const spread = `${Math.min(...means).toFixed(1)}..${Math.max(...means).toFixed(1)}`;
    console.log(
      `${kind.padEnd(10)} ${String(list.length).padStart(3)}  ${String(st[0].n).padStart(6)}` +
      `  ${means[0].toFixed(1).padStart(9)}  ${String(st[0].colors).padStart(6)}` +
      `  ${st[0].basePct.toFixed(0).padStart(6)}%  ${st[0].lonePct.toFixed(1).padStart(7)}%  ${spread}`,
    );
  }
  // rzeczywista różnorodność bitmap
  let identical = 0, pairs = 0;
  const dupes = [];
  for (const kind of MATERIALS) {
    const list = art.tiles[kind];
    for (let i = 0; i < list.length; i++) {
      for (let j = i + 1; j < list.length; j++) {
        pairs++;
        if (list[i].data.every((v, k) => v === list[j].data[k])) { identical++; dupes.push(`${kind}:${i}=${j}`); }
      }
    }
  }
  console.log(`identyczne pary wariantów: ${identical}/${pairs}${dupes.length ? ' → ' + dupes.join(', ') : ''}`);
}

// ---------------------------------------------------------------------------
console.log(`zrzuty → ${OUT}/`);
contactSheet();

for (const kind of MATERIALS) {
  planeShot(kind, true, 'far');
  planeShot(kind, false, 'far');
}
planeShot('asphalt', false, 'close');
planeShot('grass', false, 'close');
planeShot('sidewalk', false, 'close');

game.setViewMode('far', true);
game.setProfile('aga', true);

// skrzyżowanie: jezdnia + chodnik + trawa (realna mapa, pełne odsłonięcie)
gameShot('krzyzowanie-aga-dzien', { x: 9, y: 8, reveal: true, noPlayer: true, worldBuffer: true });
gameShot('krzyzowanie-aga-gra', { x: 9, y: 8 });
// ulica wzdłuż (pasy jezdni i chodnika)
gameShot('ulica-aga-dzien', { x: 8, y: 14, reveal: true, noPlayer: true });
// wnętrze: deski
gameShot('wnetrze-deski-aga', { x: 15, y: 3, reveal: true });
// wnętrze: płytki
gameShot('wnetrze-plytki-aga', { x: 32, y: 3, reveal: true });
// wnętrze: wykładzina + beton (magazyn)
gameShot('wnetrze-wykladzina-aga', { x: 21, y: 27, reveal: true });
gameShot('wnetrze-beton-aga', { x: 32, y: 13, reveal: true });
// teren naturalny: trawa/ziemia/żwir/woda
gameShot('teren-trawa-aga', { x: 5, y: 16, reveal: true, noPlayer: true });

// właściwy kadr gry — ten sam co w dokumentacji
gameShot('gra-far-aga-dzien', { x: 25, y: 8, worldBuffer: true });
gameShot('gra-close-aga-dzien', { x: 25, y: 8, view: 'close' });
gameShot('gra-far-ocs-dzien', { x: 25, y: 8, profile: 'ocs' });
gameShot('gra-far-rtg-noc', { x: 25, y: 8, profile: 'rtg', time: 23 * 60, torch: true, dir: 0 });
gameShot('gra-close-rtg-noc', { x: 25, y: 8, profile: 'rtg', time: 23 * 60, torch: true, view: 'close' });
gameShot('gra-far-aga-deszcz', { x: 25, y: 8, weather: 'rain', time: 12 * 60 + 40 });

// fazy przesunięcia kamery o pojedyncze piksele (migotanie / mora)
game.setProfile('aga', true);
for (let k = 0; k < 4; k++) {
  gameShot(`faza-${k}`, { x: 25, y: 8, shiftX: k, shiftY: k & 1, scale: 4 });
}

if (WANT_REPORT) report();
console.log('gotowe');
