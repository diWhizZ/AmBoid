export class CollisionGrid {
  constructor(width, height, data = []) { this.width = width; this.height = height; this.data = Uint8Array.from(data); }
  blocked(x, y, doors = []) {
    if (x < 0 || y < 0 || x >= this.width || y >= this.height) return true;
    if (this.data[y * this.width + x]) return true;
    return doors.some(d => d.x === x && d.y === y && d.blocks);
  }
}
