// Punkt wejścia prototypu przeglądarkowego.

import { buildArt } from './art.js';
import { Screen, VIEW_W, VIEW_H } from './render.js';
import { GameAudio } from './audio.js';
import { Game } from './game.js';
import { GamepadInput } from './gamepad.js';

const canvas = document.getElementById('screen');
canvas.width = VIEW_W;
canvas.height = VIEW_H;
const ctx = canvas.getContext('2d');
ctx.imageSmoothingEnabled = false;

const screen = new Screen(VIEW_W, VIEW_H);
const art = buildArt();
const audio = new GameAudio();
const game = new Game(screen, art, audio);
const gamepad = new GamepadInput();

// opcjonalny seed z adresu: ?seed=ABC123
try {
  const params = new URLSearchParams(window.location.search);
  const gfxParam = params.get('gfx');
  if (gfxParam && ['ocs', 'aga', 'rtg'].includes(gfxParam)) game.setProfile(gfxParam, true);
  const viewParam = params.get('view');
  if (viewParam === 'far' || viewParam === 'close') game.setViewMode(viewParam, true);
  const seedParam = params.get('seed');
  if (seedParam) {
    const parsed = parseInt(seedParam, 36);
    if (!Number.isNaN(parsed)) game.pendingSeed = parsed >>> 0;
  }
} catch (e) {
  /* ignore */
}

window.AMBOID = game;
console.log('AMBOID v0.2.4 — widok: V (far 0,75× / close 1×), mysz: LPM idź / PPM atak, grafika: G, sterowanie: K, pad: Gamepad API');

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

window.addEventListener('gamepadconnected', (e) => {
  const name = (e.gamepad && e.gamepad.id ? e.gamepad.id : 'PAD').slice(0, 34);
  game.msg(`KONTROLER: ${name}`);
});
window.addEventListener('blur', () => {
  game.clearKeys();
  game.releaseMouse();
});

// Pozycja kursora w pikselach logicznych — przez aktualny rozmiar ekranu,
// żeby działała też po zmianie rozdzielczości (etap 3).
function pointerPos(e) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: ((e.clientX - rect.left) / rect.width) * screen.w,
    y: ((e.clientY - rect.top) / rect.height) * screen.h,
  };
}

canvas.addEventListener('pointermove', (e) => {
  const p = pointerPos(e);
  game.pointerMove(p.x, p.y);
});

canvas.addEventListener('pointerdown', (e) => {
  e.preventDefault();
  const p = pointerPos(e);
  // przechwycenie wskaźnika: upuszczenie przycisku poza płótnem też dotrze
  try {
    canvas.setPointerCapture(e.pointerId);
  } catch (err) {
    /* starsze przeglądarki */
  }
  game.pointerDown(p.x, p.y, e.button);
});

window.addEventListener('pointerup', (e) => {
  const p = pointerPos(e);
  game.pointerUp(p.x, p.y, e.button);
});

canvas.addEventListener('pointercancel', () => game.releaseMouse());
canvas.addEventListener('contextmenu', (e) => e.preventDefault());

let last = performance.now();
function frame(now) {
  const dt = Math.max(0, Math.min(0.05, (now - last) / 1000));
  last = now;
  if (typeof navigator.getGamepads === 'function') gamepad.poll(game, navigator.getGamepads());
  game.update(dt);
  game.render();
  game.present();
  // W grze rysujemy własny celownik, ale dopiero gdy mysz była już użyta —
  // przy starcie z klawiatury kursor systemowy musi pozostać widoczny.
  const wantCursor = game.mode === 'playing' && game.mouse.active ? 'none' : 'default';
  if (canvas.style.cursor !== wantCursor) canvas.style.cursor = wantCursor;
  out32.set(screen.u32);
  ctx.putImageData(image, 0, 0);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

document.addEventListener('visibilitychange', () => {
  last = performance.now();
});
