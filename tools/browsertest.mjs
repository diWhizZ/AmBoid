// Uruchamia prawdziwy main.js na atrapie DOM, żeby sprawdzić integrację z canvasem.
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
  innerWidth: 1280,
  innerHeight: 800,
  addEventListener(type, cb) {
    (listeners['win:' + type] ||= []).push(cb);
  },
};
globalThis.requestAnimationFrame = (cb) => {
  rafCb = cb;
  return 1;
};
globalThis.performance = globalThis.performance || { now: () => Date.now() };
globalThis.URLSearchParams = globalThis.URLSearchParams;

await import('../src/main.js');

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

// kliknięcie w ekran (atak)
for (const cb of listeners['canvas:pointerdown'] || []) {
  cb({ preventDefault() {}, clientX: 160, clientY: 100 });
}
frames(2);

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
