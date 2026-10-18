// Pure isometric transforms, independent of Canvas or DOM.
export const TILE_W = 64;
export const TILE_H = 32;
export function worldToIso(x, y, tileW = TILE_W, tileH = TILE_H) {
  return { x: (x - y) * tileW / 2, y: (x + y) * tileH / 2 };
}
export function isoToWorld(px, py, tileW = TILE_W, tileH = TILE_H) {
  const a = px / (tileW / 2), b = py / (tileH / 2);
  return { x: (a + b) / 2, y: (b - a) / 2 };
}
export function depthSort(items) {
  return [...items].sort((a, b) => (a.depth ?? a.y) - (b.depth ?? b.y) || (a.x ?? 0) - (b.x ?? 0) || (a.id ?? 0) - (b.id ?? 0));
}
