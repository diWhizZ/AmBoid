import { CollisionGrid } from '../collision/grid.js';
import { Door } from '../doors/door.js';
export class IsoMap {
  constructor(data) {
    this.width = data.width; this.height = data.height;
    this.tileWidth = data.tilewidth || 64; this.tileHeight = data.tileheight || 32;
    this.layers = Object.fromEntries((data.layers || []).filter(l => l.type === 'tilelayer').map(l => [l.name, l.data]));
    this.objects = (data.layers || []).filter(l => l.type === 'objectgroup').flatMap(l => l.objects || []);
    const spawnLayer = this.layers.spawn || [];
    const spawnIndex = spawnLayer.findIndex(v => v > 0);
    this.spawn = spawnIndex >= 0 ? { x: spawnIndex % this.width, y: Math.floor(spawnIndex / this.width) } : { x: 0, y: 0 };
    const coll = this.layers.collision || new Array(this.width * this.height).fill(0);
    this.collision = new CollisionGrid(this.width, this.height, coll);
    this.doors = this.objects.filter(o => o.type === 'door').map(o => { const prop = name => o.properties?.find(p => p.name === name)?.value; return new Door({ id: o.id, x: prop('tileX') ?? Math.floor(o.x / this.tileWidth), y: prop('tileY') ?? Math.floor(o.y / this.tileHeight), state: prop('state') ?? 0 }); });
  }
  tile(layer, x, y) { const a = this.layers[layer]; return a && x >= 0 && y >= 0 && x < this.width && y < this.height ? a[y * this.width + x] : 0; }
  canMove(x, y) {
    if (this.collision.blocked(x, y, this.doors)) return false;
    return !this.objects.some(o => (o.type === 'obstacle' || o.properties?.find(p => p.name === 'blocking')?.value === true) && (o.properties?.find(p => p.name === 'tileX')?.value ?? Math.floor(o.x / this.tileWidth)) === x && (o.properties?.find(p => p.name === 'tileY')?.value ?? Math.floor(o.y / this.tileHeight)) === y);
  }
  saveState() { return this.doors.map(d => d.serialize()); }
  restoreState(states = []) { for (const s of states) { const d = this.doors.find(q => q.id === s.id); if (d) d.state = d.target = s.state; } }
}
