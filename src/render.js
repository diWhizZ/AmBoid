// Renderer: bufor indeksów palety -> RGBA dla canvasu.
// Rozdzielczość logiczna 320x200 — klasyczny tryb lowres Amigi (PAL/NTSC).

import { PALETTE, C, TRANSPARENT, DIM_TABLES, DIM_DITHER, hexToRgb } from './palette.js';

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
    // Piksele interfejsu (kursor) nie są przygaszane przez światło w RTG.
    this.uiMask = new Uint8Array(w * h);
    this.uiLayer = false;
    this.profileId = 'ocs';
    this.setProfile({
      id: 'ocs',
      palette: PALETTE,
      fallback: null,
      lighting: false,
    });
  }

  // Ustawia aktywną paletę. fallback mapuje indeksy spoza palety (np. 64-kolorowe
  // odcienie AGA w trybie 32 kolorów) na najbliższy kolor bazowy.
  setProfile(profile) {
    this.profileId = profile.id;
    this.profile = profile;
    const palette = profile.palette || PALETTE;
    const fallback = profile.fallback || null;
    const n = palette.length;
    const pal256 = new Uint32Array(256);
    const rgb = new Uint8Array(256 * 3);
    for (let i = 0; i < 256; i++) {
      let source = i;
      if (i >= n) source = fallback && fallback[i] != null ? fallback[i] : 0;
      if (source === TRANSPARENT) source = 0;
      const hex = palette[source] || '#000000';
      const [r, g, b] = hexToRgb(hex);
      pal256[i] = (255 << 24) | (b << 16) | (g << 8) | r;
      rgb[i * 3] = r;
      rgb[i * 3 + 1] = g;
      rgb[i * 3 + 2] = b;
    }
    this.pal256 = pal256;
    this.rgbPal = rgb;
  }

  clear(color = C.VOID) {
    this.data.fill(color);
    this.uiMask.fill(0);
  }

  clearUiMask() {
    this.uiMask.fill(0);
  }

  set(x, y, c) {
    x |= 0;
    y |= 0;
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return;
    const i = y * this.w + x;
    this.data[i] = c;
    // każdy późniejszy rysunek świata zdejmuje oznaczenie UI z tego piksela
    this.uiMask[i] = this.uiLayer ? 1 : 0;
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
    const dim = Math.max(0, Math.min(4, opts.dim || 0));
    const flash = opts.flash == null ? null : opts.flash;
    const src = sprite.data;
    const sw = sprite.w;
    const sh = sprite.h;
    const ox = Math.round(x);
    const oy = Math.round(y);
    const table = dim > 0 ? DIM_TABLES[dim] : null;
    // dodatkowy dither rozbijający pasy na poziomie 2 i 3
    const dither = dim > 0 ? (DIM_DITHER[dim] * 16) | 0 : 0;
    for (let sy = 0; sy < sh; sy++) {
      const py = oy + sy;
      if (py < 0 || py >= this.h) continue;
      const row = py * this.w;
      for (let sx = 0; sx < sw; sx++) {
        const px = ox + sx;
        if (px < 0 || px >= this.w) continue;
        let c = src[sy * sw + sx];
        if (c === TRANSPARENT) continue;
        if (table) c = table[c];
        if (dither > 0 && BAYER[(py & 3) * 4 + (px & 3)] < dither) c = C.OUTLINE;
        if (flash != null) c = flash;
        this.data[row + px] = c;
        this.uiMask[row + px] = this.uiLayer ? 1 : 0;
      }
    }
  }

  // Zoom-out w przestrzeni INDEKSÓW, przed rgbaLit/syncRGBA. Cztery próbki
  // 2×2 wybierają większość (MAJORITY), nigdy średnią RGB ani dominantę całego
  // obszaru. Remis rozstrzyga pierwsza próbka — stabilnie i bez alokacji w pętli.
  blitScaled(source, scale = this.w / source.w) {
    const src = source.data;
    const sw = source.w;
    const sh = source.h;
    const inv = 1 / scale;
    this.clearUiMask();
    for (let y = 0; y < this.h; y++) {
      const sy = Math.min(sh - 1, Math.floor(y * inv));
      const row = sy * sw;
      const next = Math.min(sh - 1, sy + 1) * sw;
      const dst = y * this.w;
      for (let x = 0; x < this.w; x++) {
        const sx = Math.min(sw - 1, Math.floor(x * inv));
        const a = src[row + sx];
        if (scale >= 1) {
          this.data[dst + x] = a;
          continue;
        }
        const sx1 = Math.min(sw - 1, sx + 1);
        const b = src[row + sx1];
        const c = src[next + sx];
        const d = src[next + sx1];
        this.data[dst + x] = a === b || a === c || a === d ? a
          : b === c || b === d ? b : c === d ? c : a;
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
    const p = this.pal256;
    for (let i = 0; i < d.length; i++) u[i] = p[d[i]];
    return u;
  }

  /**
   * Tryb RTG: zamiast tablic przygaszenia liczymy prawdziwe światło RGB.
   * lights: [{sx, sy, r, i, color:[r,g,b]}] w pikselach ekranu.
   * ambient: 0..1 (mnożnik barwy bazowej).
   * Na Amidze z kartą RTG (8-bit chunky) to pętla po pikselach; na 68030
   * liczymy to kaflami z gotowych tablic, na 68060/Vampire — per piksel.
   */
  rgbaLit(lights, ambient = 1, tint = null) {
    const d = this.data;
    const p = this.rgbPal;
    const u = this.u32;
    const w = this.w;
    const h = this.h;
    const L = [];
    for (const l of lights) {
      const spread = l.spread != null ? l.spread : null;
      L.push({
        x: l.sx,
        y: l.sy,
        r: l.r,
        r2: l.r * l.r,
        i: l.i,
        cr: l.color[0],
        cg: l.color[1],
        cb: l.color[2],
        // światło kierunkowe (latarka): stożek z miękką krawędzią
        dx: l.dirX != null ? l.dirX : 0,
        dy: l.dirY != null ? l.dirY : 0,
        coned: spread != null,
        cosEdge: spread != null ? Math.cos(spread) : -1,
      });
    }
    for (let y = 0; y < h; y++) {
      const dy2base = y * 2;
      for (let x = 0; x < w; x++) {
        const idx = d[y * w + x];
        // kursor/HUD rysowane jako warstwa UI: pełna jasność, bez tintu nocy
        if (this.uiMask[y * w + x]) {
          u[y * w + x] = this.pal256[idx];
          continue;
        }
        const bi = idx * 3;
        let r = p[bi] * ambient;
        let g = p[bi + 1] * ambient;
        let b = p[bi + 2] * ambient;
        if (tint) {
          r *= tint[0];
          g *= tint[1];
          b *= tint[2];
        }
        for (let k = 0; k < L.length; k++) {
          const l = L[k];
          const dx = x - l.x;
          const dy = (y - l.y) * 2;
          const d2 = dx * dx + dy * dy;
          if (d2 >= l.r2) continue;
          let f = 1 - d2 / l.r2;
          f = f * f * f * l.i;
          if (l.coned) {
            const inv = 1 / Math.sqrt(d2);
            const dot = (dx * l.dx + dy * l.dy) * inv;
            if (dot <= l.cosEdge) continue;
            let edge = (dot - l.cosEdge) / (1 - l.cosEdge);
            edge = edge * edge * (3 - 2 * edge);
            f *= edge;
          }
          r += l.cr * f;
          g += l.cg * f;
          b += l.cb * f;
        }
        if (r > 255) r = 255;
        if (g > 255) g = 255;
        if (b > 255) b = 255;
        u[y * w + x] = (255 << 24) | ((b | 0) << 16) | ((g | 0) << 8) | (r | 0);
      }
    }
    return u;
  }

  rgba() {
    // Zwracamy aktualny bufor prezentacji (po syncRGBA albo po rgbaLit).
    return new Uint8ClampedArray(this.u32.buffer);
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
    // Wyprzedzenie kamery za kursorem (CF) — w pikselach ekranu.
    this.lookX = 0;
    this.lookY = 0;
  }

  follow(x, y) {
    this.x = x;
    this.y = y;
    const cx = isoX(x, y) + TILE_W / 2;
    const cy = isoY(x, y) + TILE_H / 2;
    this.offX = Math.floor(this.viewW / 2) - Math.round(cx) + Math.round(this.lookX || 0);
    this.offY = Math.floor(this.viewH / 2) - Math.round(cy) + Math.round(this.lookY || 0);
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
