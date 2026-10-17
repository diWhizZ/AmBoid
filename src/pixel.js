// Mały, niezależny od przeglądarki bufor pikseli w indeksach palety.
// 255 = przezroczystość. Wszystkie sprite'y gry powstają proceduralnie tutaj.
import { TRANSPARENT } from './palette.js';

export class PixelBuffer {
  constructor(w, h, fill = TRANSPARENT) {
    this.w = w;
    this.h = h;
    this.data = new Uint8Array(w * h);
    this.data.fill(fill);
  }

  set(x, y, c) {
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return;
    this.data[(y | 0) * this.w + (x | 0)] = c;
  }

  get(x, y) {
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return TRANSPARENT;
    return this.data[(y | 0) * this.w + (x | 0)];
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
    x0 |= 0;
    y0 |= 0;
    x1 |= 0;
    y1 |= 0;
    const dx = Math.abs(x1 - x0);
    const sx = x0 < x1 ? 1 : -1;
    const dy = -Math.abs(y1 - y0);
    const sy = y0 < y1 ? 1 : -1;
    let err = dx + dy;
    for (;;) {
      this.set(x0, y0, c);
      if (x0 === x1 && y0 === y1) break;
      const e2 = 2 * err;
      if (e2 >= dy) {
        err += dy;
        x0 += sx;
      }
      if (e2 <= dx) {
        err += dx;
        y0 += sy;
      }
    }
  }

  fillPoly(pts, c) {
    if (pts.length < 3) return;
    let minY = Infinity;
    let maxY = -Infinity;
    for (const [, y] of pts) {
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
    minY = Math.max(0, Math.floor(minY));
    maxY = Math.min(this.h - 1, Math.ceil(maxY));
    for (let y = minY; y <= maxY; y++) {
      const xs = [];
      const yc = y + 0.5;
      for (let i = 0; i < pts.length; i++) {
        const [x1, y1] = pts[i];
        const [x2, y2] = pts[(i + 1) % pts.length];
        if ((y1 <= yc && y2 > yc) || (y2 <= yc && y1 > yc)) {
          xs.push(x1 + ((yc - y1) / (y2 - y1)) * (x2 - x1));
        }
      }
      xs.sort((a, b) => a - b);
      for (let i = 0; i + 1 < xs.length; i += 2) {
        const a = Math.max(0, Math.ceil(xs[i]));
        const b = Math.min(this.w - 1, Math.floor(xs[i + 1]));
        for (let x = a; x <= b; x++) this.data[y * this.w + x] = c;
      }
    }
  }

  diamond(cx, cy, hw, hh, c) {
    for (let dy = -hh; dy <= hh; dy++) {
      const t = 1 - Math.abs(dy) / (hh + 1);
      const half = Math.round(hw * t);
      this.hline(cx - half, cx + half, cy + dy, c);
    }
  }

  ellipse(cx, cy, rx, ry, c) {
    for (let y = -ry; y <= ry; y++) {
      const t = 1 - (y * y) / (ry * ry + ry);
      if (t < 0) continue;
      const half = Math.round(rx * Math.sqrt(t));
      this.hline(cx - half, cx + half, cy + y, c);
    }
  }

  noise(rng, colors, density = 0.2, x = 0, y = 0, w = this.w, h = this.h) {
    const a = Math.max(0, x | 0);
    const b = Math.max(0, y | 0);
    const e = Math.min(this.w, (x + w) | 0);
    const f = Math.min(this.h, (y + h) | 0);
    for (let yy = b; yy < f; yy++) {
      for (let xx = a; xx < e; xx++) {
        if (rng() < density) {
          this.data[yy * this.w + xx] = colors[(rng() * colors.length) | 0];
        }
      }
    }
  }

  checker(x, y, w, h, c1, c2, size = 1) {
    for (let yy = y; yy < y + h; yy++) {
      for (let xx = x; xx < x + w; xx++) {
        if (xx < 0 || yy < 0 || xx >= this.w || yy >= this.h) continue;
        const bit = ((xx / size) | 0) + ((yy / size) | 0);
        this.data[yy * this.w + xx] = bit & 1 ? c2 : c1;
      }
    }
  }

  ditherRect(x, y, w, h, c, parity = 0) {
    for (let yy = y; yy < y + h; yy++) {
      for (let xx = x; xx < x + w; xx++) {
        if (xx < 0 || yy < 0 || xx >= this.w || yy >= this.h) continue;
        if (((xx + yy) & 1) === parity) this.data[yy * this.w + xx] = c;
      }
    }
  }

  // Odbicie lustrzane (przydaje się do sprite'ów postaci).
  mirrored() {
    const out = new PixelBuffer(this.w, this.h);
    for (let y = 0; y < this.h; y++) {
      for (let x = 0; x < this.w; x++) {
        out.data[y * this.w + (this.w - 1 - x)] = this.data[y * this.w + x];
      }
    }
    return out;
  }

  // Wersja "sylwetka" — używana do cienia.
  silhouette(color) {
    const out = new PixelBuffer(this.w, this.h);
    for (let i = 0; i < this.data.length; i++) {
      if (this.data[i] !== TRANSPARENT) out.data[i] = color;
    }
    return out;
  }

  // Obrót o 180° nie jest potrzebny w izometrii 2:1.

  blit(src, dx, dy, skip = TRANSPARENT) {
    for (let y = 0; y < src.h; y++) {
      for (let x = 0; x < src.w; x++) {
        const c = src.data[y * src.w + x];
        if (c !== skip) this.set(dx + x, dy + y, c);
      }
    }
  }

  clone() {
    const out = new PixelBuffer(this.w, this.h);
    out.data.set(this.data);
    return out;
  }
}
