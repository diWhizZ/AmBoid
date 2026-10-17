// Renderer: bufor indeksów palety -> RGBA dla canvasu.
// Rozdzielczość logiczna 320x200 — klasyczny tryb lowres Amigi (PAL/NTSC).

import { PALETTE, C, TRANSPARENT, paletteToUint32 } from './palette.js';

export const VIEW_W = 320;
export const VIEW_H = 200;
export const TILE_W = 32;
export const TILE_H = 16;

export function isoX(x, y) {
  return Math.round((x - y) * (TILE_W / 2));
}
export function isoY(x, y) {
  return Math.round((x + y) * (TILE_H / 2));
}

// Matryca Bayera 4x4 — klasyczny dither z epoki do cieni i mgły.
const BAYER = [
  0, 8, 2, 10,
  12, 4, 14, 6,
  3, 11, 1, 9,
  15, 7, 13, 5,
];

export class Screen {
  constructor(w = VIEW_W, h = VIEW_H) {
    this.w = w;
    this.h = h;
    this.data = new Uint8Array(w * h);
    this.u32 = new Uint32Array(w * h);
    this.pal32 = paletteToUint32(PALETTE);
  }

  clear(color = C.VOID) {
    this.data.fill(color);
  }

  set(x, y, c) {
    x |= 0;
    y |= 0;
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return;
    this.data[y * this.w + x] = c;
  }

  get(x, y) {
    x |= 0;
    y |= 0;
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return C.VOID;
    return this.data[y * this.w + x];
  }

  rect(x, y, w, h, c) {
    const x0 = Math.max(0, x | 0);
    const y0 = Math.max(0, y | 0);
    const x1 = Math.min(this.w, (x + w) | 0);
    const y1 = Math.min(this.h, (y + h) | 0);
    for (let yy = y0; yy < y1; yy++) {
      const row = yy * this.w;
      for (let xx = x0; xx < x1; xx++) this.data[row + xx] = c;
    }
  }

  frame(x, y, w, h, c) {
    this.hline(x, x + w - 1, y, c);
    this.hline(x, x + w - 1, y + h - 1, c);
    this.vline(x, y, y + h - 1, c);
    this.vline(x + w - 1, y, y + h - 1, c);
  }

  hline(x0, x1, y, c) {
    if (y < 0 || y >= this.h) return;
    const a = Math.max(0, Math.min(x0, x1) | 0);
    const b = Math.min(this.w - 1, Math.max(x0, x1) | 0);
    const row = (y | 0) * this.w;
    for (let x = a; x <= b; x++) this.data[row + x] = c;
  }

  vline(x, y0, y1, c) {
    if (x < 0 || x >= this.w) return;
    const a = Math.max(0, Math.min(y0, y1) | 0);
    const b = Math.min(this.h - 1, Math.max(y0, y1) | 0);
    for (let y = a; y <= b; y++) this.data[y * this.w + (x | 0)] = c;
  }

  line(x0, y0, x1, y1, c) {
    x0 |= 0; y0 |= 0; x1 |= 0; y1 |= 0;
    const dx = Math.abs(x1 - x0);
    const sx = x0 < x1 ? 1 : -1;
    const dy = -Math.abs(y1 - y0);
    const sy = y0 < y1 ? 1 : -1;
    let err = dx + dy;
    for (;;) {
      this.set(x0, y0, c);
      if (x0 === x1 && y0 === y1) break;
      const e2 = 2 * err;
      if (e2 >= dy) { err += dy; x0 += sx; }
      if (e2 <= dx) { err += dx; y0 += sy; }
    }
  }

  // Siatka (checkerboard) — tanie "przezroczyste" przyciemnienie w palecie.
  shade(x, y, w, h, color = C.VOID, parity = 0) {
    const x0 = Math.max(0, x | 0);
    const y0 = Math.max(0, y | 0);
    const x1 = Math.min(this.w, (x + w) | 0);
    const y1 = Math.min(this.h, (y + h) | 0);
    for (let yy = y0; yy < y1; yy++) {
      for (let xx = x0; xx < x1; xx++) {
        if (((xx + yy) & 1) === parity) this.data[yy * this.w + xx] = color;
      }
    }
  }

  panel(x, y, w, h, opts = {}) {
    const fill = opts.fill == null ? C.SHADOW : opts.fill;
    const border = opts.border == null ? C.SLATE : opts.border;
    const inner = opts.inner == null ? C.VOID : opts.inner;
    this.rect(x, y, w, h, fill);
    this.frame(x, y, w, h, border);
    if (inner != null) this.frame(x + 2, y + 2, w - 4, h - 4, inner);
  }

  /**
   * Rysuje sprite (PixelBuffer) w indeksach palety.
   * opts.dim: 0..4 — dither przyciemniający (0 = brak, 4 = pełna czerń)
   * opts.flash: indeks koloru — rysuje sylwetkę (np. błysk trafienia)
   */
  blit(sprite, x, y, opts = {}) {
    const dim = opts.dim || 0;
    const flash = opts.flash == null ? null : opts.flash;
    const src = sprite.data;
    const sw = sprite.w;
    const sh = sprite.h;
    const ox = Math.round(x);
    const oy = Math.round(y);
    const threshold = dim * 4;
    for (let sy = 0; sy < sh; sy++) {
      const py = oy + sy;
      if (py < 0 || py >= this.h) continue;
      const row = py * this.w;
      for (let sx = 0; sx < sw; sx++) {
        const px = ox + sx;
        if (px < 0 || px >= this.w) continue;
        let c = src[sy * sw + sx];
        if (c === TRANSPARENT) continue;
        if (dim > 0 && BAYER[(py & 3) * 4 + (px & 3)] < threshold) {
          c = dim >= 3 ? C.OUTLINE : C.SHADOW;
        }
        if (flash != null) c = flash;
        this.data[row + px] = c;
      }
    }
  }

  // Sprite rysowany jako cień (wszystkie piksele jednym kolorem).
  blitShadow(sprite, x, y, color = C.OUTLINE) {
    this.blit(sprite, x, y, { flash: color });
  }

  // Aktualizacja bufora RGBA na podstawie indeksów palety.
  syncRGBA() {
    const d = this.data;
    const u = this.u32;
    const p = this.pal32;
    for (let i = 0; i < d.length; i++) u[i] = p[d[i]];
    return u;
  }

  rgba() {
    return new Uint8ClampedArray(this.syncRGBA().buffer);
  }
}

// Kamera izometryczna.
export class Camera {
  constructor(worldW, worldH) {
    this.worldW = worldW;
    this.worldH = worldH;
    this.x = 0;
    this.y = 0;
    this.offX = 0;
    this.offY = 0;
    this.viewW = VIEW_W;
    this.viewH = VIEW_H;
  }

  follow(x, y) {
    this.x = x;
    this.y = y;
    const cx = isoX(x, y) + TILE_W / 2;
    const cy = isoY(x, y) + TILE_H / 2;
    this.offX = Math.round(this.viewW / 2 - cx);
    this.offY = Math.round(this.viewH / 2 - cy);
  }

  toScreen(x, y) {
    return [isoX(x, y) + this.offX, isoY(x, y) + this.offY];
  }

  tileAtScreen(sx, sy) {
    const rx = sx - this.offX - TILE_W / 2;
    const ry = sy - this.offY - TILE_H / 2;
    const gx = (rx / (TILE_W / 2) + ry / (TILE_H / 2)) / 2;
    const gy = (ry / (TILE_H / 2) - rx / (TILE_W / 2)) / 2;
    return [Math.floor(gx), Math.floor(gy)];
  }

  visibleBounds(margin = 2) {
    const corners = [
      [0, 0],
      [this.viewW, 0],
      [0, this.viewH],
      [this.viewW, this.viewH],
    ];
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (const [sx, sy] of corners) {
      const [gx, gy] = this.tileAtScreen(sx, sy);
      minX = Math.min(minX, gx);
      maxX = Math.max(maxX, gx);
      minY = Math.min(minY, gy);
      maxY = Math.max(maxY, gy);
    }
    return {
      x0: Math.max(0, minX - margin),
      y0: Math.max(0, minY - margin),
      x1: Math.min(this.worldW - 1, maxX + margin),
      y1: Math.min(this.worldH - 1, maxY + margin),
    };
  }
}
