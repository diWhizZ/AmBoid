import { worldToIso } from '../map/iso.js';
export class Camera {
  constructor() { this.x = 0; this.y = 0; this.zoom = 1; }
  follow(x, y, viewportW, viewportH, tileW = 64, tileH = 32) {
    const p = worldToIso(x, y, tileW, tileH); this.x = p.x - viewportW / (2 * this.zoom); this.y = p.y - viewportH / (2 * this.zoom);
  }
  setZoom(z) { if ([0.5, 1, 2].includes(z)) this.zoom = z; }
}
