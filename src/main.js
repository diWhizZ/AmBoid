// Punkt wejścia prototypu przeglądarkowego.

import { buildArt } from './art.js';
import { Screen, VIEW_W, VIEW_H } from './render.js';
import { GameAudio } from './audio.js';
import { Game } from './game.js';

const canvas = document.getElementById('screen');
canvas.width = VIEW_W;
canvas.height = VIEW_H;
const ctx = canvas.getContext('2d');
ctx.imageSmoothingEnabled = false;

const screen = new Screen(VIEW_W, VIEW_H);
const art = buildArt();
const audio = new GameAudio();
const game = new Game(screen, art, audio);

// opcjonalny seed z adresu: ?seed=ABC123
try {
  const params = new URLSearchParams(window.location.search);
  const gfxParam = params.get('gfx');
  if (gfxParam && ['ocs', 'aga', 'rtg'].includes(gfxParam)) game.setProfile(gfxParam, true);
  const seedParam = params.get('seed');
  if (seedParam) {
    const parsed = parseInt(seedParam, 36);
    if (!Number.isNaN(parsed)) game.pendingSeed = parsed >>> 0;
  }
} catch (e) {
  /* ignore */
}

window.AMBOID = game;

const image = ctx.createImageData(VIEW_W, VIEW_H);
const out32 = new Uint32Array(image.data.buffer);

function resize() {
  const w = window.innerWidth;
  const h = window.innerHeight;
  let scale = Math.min(w / VIEW_W, h / VIEW_H);
  scale = scale >= 2 ? Math.floor(scale) : Math.max(0.5, scale);
  canvas.style.width = `${Math.floor(VIEW_W * scale)}px`;
  canvas.style.height = `${Math.floor(VIEW_H * scale)}px`;
}
window.addEventListener('resize', resize);
resize();

const SCROLL_KEYS = new Set([
  'Space',
  'ArrowUp',
  'ArrowDown',
  'ArrowLeft',
  'ArrowRight',
  'Tab',
  'PageUp',
  'PageDown',
]);

window.addEventListener('keydown', (e) => {
  const handled = game.keyDown(e.code, e.repeat);
  if (handled || SCROLL_KEYS.has(e.code)) e.preventDefault();
});
window.addEventListener('keyup', (e) => {
  game.keyUp(e.code);
});
window.addEventListener('blur', () => game.clearKeys());

canvas.addEventListener('pointerdown', (e) => {
  e.preventDefault();
  const rect = canvas.getBoundingClientRect();
  const x = ((e.clientX - rect.left) / rect.width) * VIEW_W;
  const y = ((e.clientY - rect.top) / rect.height) * VIEW_H;
  game.click(x, y);
});
canvas.addEventListener('contextmenu', (e) => e.preventDefault());

let last = performance.now();
function frame(now) {
  const dt = Math.max(0, Math.min(0.05, (now - last) / 1000));
  last = now;
  game.update(dt);
  game.render();
  game.present();
  out32.set(screen.u32);
  ctx.putImageData(image, 0, 0);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

document.addEventListener('visibilitychange', () => {
  last = performance.now();
});
