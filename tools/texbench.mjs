// Pomiar kosztu atlasów i renderowania tego samego kadru (narzędzie dev).
//   node tools/texbench.mjs
// Porównywalne między wersjami: ten sam seed, ta sama kamera, ta sama liczba
// klatek. Używane do raportu „koszt v0.2.4 → v0.2.5".
import { buildArt } from '../src/art.js';
import { Screen } from '../src/render.js';
import { Game } from '../src/game.js';

const stub = { muted: false, init() {}, play() {}, setRain() {}, setMuted() {}, toggleMute() { return true; } };

const t0 = process.hrtime.bigint();
const art = buildArt();
const tBuild = Number(process.hrtime.bigint() - t0) / 1e6;

// pamięć atlasu podłóg: chunky 8 bit oraz 6 bitplanów + wspólna maska rombu
let chunky = 0;
let tiles = 0;
const KINDS = ['grass', 'dirt', 'asphalt', 'sidewalk', 'wood', 'tile', 'carpet', 'water', 'concrete', 'gravel'];
for (const k of KINDS) {
  for (const t of art.tiles[k]) {
    chunky += t.w * t.h;
    tiles++;
  }
}
const planar = tiles * (32 / 8) * 16 * 6;
const mask = 64; // jedna wspólna maska rombu dla wszystkich kafli terenu

const game = new Game(new Screen(), art, stub);
game.setViewMode('far', true);
game.startGame(0x5eed1);
game.mode = 'playing';
game.time = 10 * 60 + 20;
game.player.x = 25; game.player.y = 8;
game.player.vx = 25; game.player.vy = 8;
game.camera.follow(25, 8);
game.updateFOV(true);

// rozgrzewka
for (let i = 0; i < 20; i++) game.renderGameScene();
const N = 300;
const t1 = process.hrtime.bigint();
for (let i = 0; i < N; i++) game.renderGameScene();
const tRender = Number(process.hrtime.bigint() - t1) / 1e6 / N;

// ten sam kadr w close 1×
game.setViewMode('close', true);
for (let i = 0; i < 20; i++) game.renderGameScene();
const t2 = process.hrtime.bigint();
for (let i = 0; i < N; i++) game.renderGameScene();
const tRenderClose = Number(process.hrtime.bigint() - t2) / 1e6 / N;

console.log(JSON.stringify({
  buildArtMs: +tBuild.toFixed(1),
  groundTiles: tiles,
  groundChunkyBytes: chunky,
  groundPlanar6bpBytes: planar,
  groundMaskBytes: mask,
  farMsPerFrame: +tRender.toFixed(3),
  closeMsPerFrame: +tRenderClose.toFixed(3),
}, null, 2));
