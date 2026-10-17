// Uruchamia prawdziwy main.js na atrapie DOM, żeby sprawdzić integrację z canvasem.
const requestedView = process.argv.includes('--view=close') ? 'close' : 'far';
// URL musi mieć pierwszeństwo przed zapisanym ustawieniem.
const stored = new Map([['amboid.view', requestedView === 'far' ? 'close' : 'far']]);
globalThis.localStorage = { getItem: (key) => stored.get(key) ?? null, setItem: (key, value) => stored.set(key, String(value)) };
const listeners = {};
let rafCb = null;
let putCount = 0;
let lastImage = null;

const canvas = {
  width: 320,
  height: 200,
  style: {},
  getContext() {
    return {
      imageSmoothingEnabled: true,
      createImageData(w, h) {
        return { width: w, height: h, data: new Uint8ClampedArray(w * h * 4) };
      },
      putImageData(img) {
        putCount++;
        lastImage = img;
      },
    };
  },
  addEventListener(type, cb) {
    (listeners['canvas:' + type] ||= []).push(cb);
  },
  getBoundingClientRect() {
    return { left: 0, top: 0, width: 320, height: 200 };
  },
};

globalThis.document = {
  getElementById: () => canvas,
  documentElement: { requestFullscreen: async () => {} },
  addEventListener(type, cb) {
    (listeners['doc:' + type] ||= []).push(cb);
  },
  fullscreenElement: null,
  exitFullscreen: async () => {},
};

globalThis.window = {
  location: { search: `?seed=115&view=${requestedView}` },
  innerWidth: 1280,
  innerHeight: 800,
  addEventListener(type, cb) {
    (listeners['win:' + type] ||= []).push(cb);
  },
};
Object.defineProperty(globalThis, 'navigator', {
  value: { getGamepads: () => (globalThis.__pad ? [globalThis.__pad] : []) },
  configurable: true,
});
globalThis.requestAnimationFrame = (cb) => {
  rafCb = cb;
  return 1;
};
globalThis.performance = globalThis.performance || { now: () => Date.now() };
globalThis.URLSearchParams = globalThis.URLSearchParams;

await import('../src/main.js');

if (window.AMBOID.viewMode !== requestedView || stored.get('amboid.view') !== requestedView || canvas.width !== 320 || canvas.height !== 200) {
  throw new Error('BROWSER-STUB FAIL: ?view / localStorage / rozmiar canvas');
}
console.log('view from URL + localStorage:', requestedView);
// start gry przez menu: Enter
const keydown = (code, repeat = false) => {
  for (const cb of listeners['win:keydown'] || []) cb({ code, repeat, preventDefault() {} });
};
const keyup = (code) => {
  for (const cb of listeners['win:keyup'] || []) cb({ code });
};

let t = 0;
function frames(n, step = 16.7) {
  for (let i = 0; i < n; i++) {
    t += step;
    const cb = rafCb;
    rafCb = null;
    if (cb) cb(t);
  }
}
frames(5);
console.log('putImageData calls after 5 frames:', putCount);
console.log('image has pixels:', lastImage && lastImage.data.some((v) => v !== 0));

// menu -> nowa gra
keydown('Enter');
frames(3);
console.log('mode after Enter:', window.AMBOID.mode);
const originalView = window.AMBOID.viewMode;
keydown('KeyV');
keydown('KeyV', true);
if (window.AMBOID.viewMode === originalView) throw new Error('BROWSER-STUB FAIL: V');
keydown('KeyV');
if (window.AMBOID.viewMode !== originalView) throw new Error('BROWSER-STUB FAIL: powrót V');

// chodzenie
keydown('KeyS');
frames(60);
keyup('KeyS');
frames(5);
console.log('player after walking:', window.AMBOID.player.x, window.AMBOID.player.y);

// atak, akcja, mapa, pomoc
keydown('Space');
frames(2);
keyup('Space');
keydown('KeyE');
frames(5);
keyup('KeyE');
keydown('KeyM');
frames(2);
keyup('KeyM');
console.log('mode after M:', window.AMBOID.mode);
keydown('Escape');
frames(2);
console.log('mode after Esc from map:', window.AMBOID.mode);
keydown('KeyH');
frames(2);
console.log('mode after H:', window.AMBOID.mode);
keydown('Escape');
frames(2);
console.log('mode after Esc from help:', window.AMBOID.mode);

// mysz: LPM na ziemi tworzy trasę, HUD nie wydaje rozkazu
const gm = window.AMBOID;
gm.mode = 'playing';
gm.world.zombies.length = 0;
const pointer = (type, x, y, button = 0) => {
  const key = type.startsWith('win:') ? type : 'canvas:' + type;
  for (const cb of listeners[key] || []) {
    cb({ preventDefault() {}, clientX: x, clientY: y, button, buttons: button === 0 ? 1 : 2, pointerId: 1 });
  }
};
let mouseTarget = null;
for (let y = 0; y < 40 && !mouseTarget; y++) {
  for (let x = 0; x < 48; x++) {
    if (!gm.world.isWalkable(x, y) || gm.interactionAt(x, y)) continue;
    const path = gm.findPath(x, y, {});
    if (!path || path.length < 2 || path.length > 5) continue;
    const [sx, sy] = gm.camera.toScreen(x, y);
    const mx = (sx + 16) * gm.zoom, my = (sy + 8) * gm.zoom;
    if (mx < 0 || mx >= 320 || my < 0 || my >= 200 || gm.isOverHud(mx, my)) continue;
    mouseTarget = { x, y, sx: mx, sy: my };
    break;
  }
}
if (!mouseTarget) throw new Error('BROWSER-STUB FAIL: brak celu myszy');
if (mouseTarget) {
  pointer('pointerdown', mouseTarget.sx, mouseTarget.sy, 0);
  console.log('mouse target:', mouseTarget.x, mouseTarget.y, 'path:', gm.player.path.length);
  if (!gm.mouseLeftHeld || gm.player.path.length === 0) {
    console.error('BROWSER-STUB FAIL: LPM nie utworzył trasy');
    process.exitCode = 1;
  }
  pointer('win:pointerup', mouseTarget.sx, mouseTarget.sy, 0);
  if (gm.mouseLeftHeld) {
    console.error('BROWSER-STUB FAIL: pointerup nie zwolnił LPM');
    process.exitCode = 1;
  }
}
gm.clearOrders();
const beforeHudX = gm.player.x;
const beforeHudY = gm.player.y;
pointer('pointerdown', 20, 190, 0);
pointer('win:pointerup', 20, 190, 0);
console.log('HUD click path:', gm.player.path.length);
if (gm.player.path.length !== 0 || gm.player.x !== beforeHudX || gm.player.y !== beforeHudY) {
  console.error('BROWSER-STUB FAIL: klik w HUD ruszył gracza');
  process.exitCode = 1;
}
frames(2);

// pad: D-pad w lewo przesuwa gracza, puszczenie zatrzymuje
window.AMBOID.mode = 'playing';
const pad = (pressedIndex) => ({
  id: 'Stub Pad', connected: true, axes: [0, 0],
  buttons: Array.from({ length: 17 }, (_, i) => ({ pressed: i === pressedIndex, value: i === pressedIndex ? 1 : 0 })),
});
const px0 = window.AMBOID.player.x;
const py0 = window.AMBOID.player.y;
// wybierz kierunek, w którym nie ma ściany (schemat ekranowy)
const dirs = [[14, -1, 1], [15, 1, -1], [12, -1, -1], [13, 1, 1]];
const [btn] = dirs.find(([, dx, dy]) => window.AMBOID.world.isWalkable(px0 + dx, py0 + dy)) || [14];
console.log('pad test start:', px0, py0, 'button', btn);
globalThis.__pad = pad(btn);
frames(40);
globalThis.__pad = pad(-1);
frames(5);
console.log('mode after pad:', window.AMBOID.mode);
console.log('player after pad:', window.AMBOID.player.x, window.AMBOID.player.y);
console.log('pad moved player:', window.AMBOID.player.x !== px0 || window.AMBOID.player.y !== py0);
if (window.AMBOID.player.x === px0 && window.AMBOID.player.y === py0) {
  console.error('BROWSER-STUB FAIL: pad nie ruszył gracza');
  process.exitCode = 1;
}

// resize
for (const cb of listeners['win:resize'] || []) cb();
console.log('canvas css size:', canvas.style.width, canvas.style.height);

// sprawdź, czy obraz zawiera tylko kolory z palety
import { PALETTE, PALETTE_EXT, hexToRgb } from '../src/palette.js';
const allowed = new Set([...PALETTE, ...PALETTE_EXT].map((h) => hexToRgb(h).join(',')));
let bad = 0;
const data = lastImage.data;
for (let i = 0; i < data.length; i += 4) {
  const key = `${data[i]},${data[i + 1]},${data[i + 2]}`;
  if (!allowed.has(key)) bad++;
}

console.log('pixels outside palette:', bad, '/', data.length / 4);
if (bad > 0) { console.error('BROWSER-STUB FAIL: kolory spoza palety 64'); process.exitCode = 1; }
console.log('total putImageData:', putCount);
console.log('BROWSER-STUB TEST OK');
