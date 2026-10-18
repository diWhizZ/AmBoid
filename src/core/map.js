// Modularny system mapy izometrycznej, warstw, kolizji, triggerów i sortowania głębi.
import { Container } from './inventory.js';

export class DoorEntity {
  constructor(data) {
    this.id = data.id || `door_${data.x}_${data.y}`;
    this.name = data.name || this.id;
    this.x = data.x;
    this.y = data.y;
    this.state = data.state || 'closed'; // 'closed', 'opening', 'open', 'locked'
    this.material = data.material || 'wood';
    this.keyId = data.keyId || null;
    this.animT = 0;
    this.animated = data.animated !== false;
  }

  isOpen() {
    return this.state === 'open';
  }

  isClosed() {
    return this.state === 'closed';
  }

  isLocked() {
    return this.state === 'locked';
  }

  open(hasKey = false) {
    if (this.state === 'locked' && !hasKey) return false;
    this.state = 'open';
    this.animT = 0;
    return true;
  }

  close() {
    this.state = 'closed';
    this.animT = 0;
    return true;
  }

  toggle(hasKey = false) {
    if (this.isOpen()) return this.close();
    return this.open(hasKey);
  }
}

export class TriggerEntity {
  constructor(data) {
    this.id = data.id;
    this.name = data.name;
    this.x = data.x;
    this.y = data.y;
    this.w = data.w || 1;
    this.h = data.h || 1;
    this.event = data.event || 'on_enter'; // 'on_enter', 'on_leave', 'on_interact'
    this.action = data.action || 'open_door';
    this.params = data.params || {};
    this.active = true;
    this.triggered = false;
  }

  contains(px, py) {
    return px >= this.x && px < this.x + this.w && py >= this.y && py < this.y + this.h;
  }

  execute(map, player, gameContext) {
    if (!this.active) return false;
    this.triggered = true;

    if (this.action === 'open_door') {
      const doorName = this.params.target_door;
      const door = map.doors.find((d) => d.name === doorName || d.id === doorName);
      if (door) door.open(true);
    } else if (this.action === 'change_terrain') {
      const tx = this.params.target_x != null ? this.params.target_x : this.x;
      const ty = this.params.target_y != null ? this.params.target_y : this.y;
      const newTile = this.params.new_tile || 1;
      map.setFloor(tx, ty, newTile);
    }

    if (gameContext && this.params.message) {
      if (typeof gameContext.msg === 'function') {
        gameContext.msg(this.params.message);
      }
    }

    return true;
  }
}

export class IsometricMap {
  constructor(w = 16, h = 16, tileW = 64, tileH = 32) {
    this.w = w;
    this.h = h;
    this.tileW = tileW;
    this.tileH = tileH;

    this.floor = new Uint16Array(w * h);
    this.walls = new Uint16Array(w * h);
    this.collision = new Uint8Array(w * h);

    this.doors = [];
    this.containers = [];
    this.props = [];
    this.groundItems = [];
    this.spawns = [];
    this.triggers = [];
  }

  idx(x, y) {
    return y * this.w + x;
  }

  inBounds(x, y) {
    return x >= 0 && y >= 0 && x < this.w && y < this.h;
  }

  setFloor(x, y, tileId) {
    if (this.inBounds(x, y)) this.floor[this.idx(x, y)] = tileId;
  }

  getFloor(x, y) {
    return this.inBounds(x, y) ? this.floor[this.idx(x, y)] : 0;
  }

  setWall(x, y, wallId) {
    if (this.inBounds(x, y)) this.walls[this.idx(x, y)] = wallId;
  }

  getWall(x, y) {
    return this.inBounds(x, y) ? this.walls[this.idx(x, y)] : 0;
  }

  isBlocked(x, y) {
    if (!this.inBounds(x, y)) return true;
    if (this.collision[this.idx(x, y)]) return true;
    if (this.walls[this.idx(x, y)] > 0) return true;

    // Drzwi zamknięte blokują
    const door = this.doors.find((d) => d.x === x && d.y === y);
    if (door && !door.isOpen()) return true;

    // Przeszkadzające rekwizyty (np. samochód, skrzynia)
    const blockingProp = this.props.find((p) => {
      const sx = p.sizeX || 1;
      const sy = p.sizeY || 1;
      return x >= p.x && x < p.x + sx && y >= p.y && y < p.y + sy;
    });
    if (blockingProp) return true;

    return false;
  }

  checkTriggers(x, y, eventType = 'on_enter', player = null, game = null) {
    const executed = [];
    for (const tr of this.triggers) {
      if (tr.event === eventType && tr.contains(x, y)) {
        if (tr.execute(this, player, game)) {
          executed.push(tr);
        }
      }
    }
    return executed;
  }

  // Obliczenie widocznych kafli w oknie kamery (Viewport Culling)
  cullVisible(cameraTileX, cameraTileY, radiusX = 10, radiusY = 8) {
    const minX = Math.max(0, Math.floor(cameraTileX - radiusX));
    const maxX = Math.min(this.w - 1, Math.ceil(cameraTileX + radiusX));
    const minY = Math.max(0, Math.floor(cameraTileY - radiusY));
    const maxY = Math.min(this.h - 1, Math.ceil(cameraTileY + radiusY));

    const visibleTiles = [];
    for (let y = minY; y <= maxY; y++) {
      for (let x = minX; x <= maxX; x++) {
        visibleTiles.push({ x, y, idx: this.idx(x, y) });
      }
    }
    return visibleTiles;
  }

  // Sortowanie głębi obiektów izometrycznych (Depth Sorting)
  // Klucz sortowania: (x + y + front_offset) gwarantuje poprawne zachowanie wielokaflowych obiektów
  getDepthSortedEntities() {
    const list = [];

    // Ściany
    for (let y = 0; y < this.h; y++) {
      for (let x = 0; x < this.w; x++) {
        const wId = this.walls[this.idx(x, y)];
        if (wId > 0) {
          list.push({
            type: 'wall',
            x,
            y,
            depth: (x + y) * 1000 + (x - y),
            id: wId,
          });
        }
      }
    }

    // Drzwi
    for (const d of this.doors) {
      list.push({
        type: 'door',
        x: d.x,
        y: d.y,
        depth: (d.x + d.y) * 1000 + (d.x - d.y) + 5,
        door: d,
      });
    }

    // Rekwizyty (w tym obiekty większe niż 1 kafel)
    for (const p of this.props) {
      const sx = p.sizeX || 1;
      const sy = p.sizeY || 1;
      // Obiekt wielokaflowy jest sortowany wg swojego najbardziej wysuniętego punktu frontowego
      const frontX = p.x + sx - 1;
      const frontY = p.y + sy - 1;
      list.push({
        type: 'prop',
        x: p.x,
        y: p.y,
        sizeX: sx,
        sizeY: sy,
        depth: (frontX + frontY) * 1000 + (frontX - frontY),
        prop: p,
      });
    }

    // Kontenery
    for (const c of this.containers) {
      list.push({
        type: 'container',
        x: c.x,
        y: c.y,
        depth: (c.x + c.y) * 1000 + (c.x - c.y) + 1,
        container: c,
      });
    }

    // Przedmioty na podłodze
    for (const it of this.groundItems) {
      list.push({
        type: 'ground_item',
        x: it.x,
        y: it.y,
        depth: (it.x + it.y) * 1000 + (it.x - it.y) - 2,
        item: it,
      });
    }

    // Sortowanie rosnąco po głębi
    list.sort((a, b) => a.depth - b.depth);
    return list;
  }

  // Wczytanie z binarnego formatu AMB2
  static loadFromAmbBuffer(buf) {
    let offset = 0;
    const magic = buf.readUInt32BE(offset); offset += 4;
    if (magic !== 0x414D4232) throw new Error('Niepoprawny format binarnego pliku (wymagany AMB2)');
    const version = buf.readUInt16BE(offset); offset += 2;
    const w = buf.readUInt16BE(offset); offset += 2;
    const h = buf.readUInt16BE(offset); offset += 2;
    const tileW = buf.readUInt16BE(offset); offset += 2;
    const tileH = buf.readUInt16BE(offset); offset += 2;
    const numLayers = buf.readUInt16BE(offset); offset += 2;

    const map = new IsometricMap(w, h, tileW, tileH);

    // Atlasy
    const numAtlases = buf.readUInt16BE(offset); offset += 2;
    for (let i = 0; i < numAtlases; i++) {
      const len = buf.readUInt8(offset); offset += 1;
      offset += len; // string
    }
    // Palety
    const numPalettes = buf.readUInt16BE(offset); offset += 2;
    for (let i = 0; i < numPalettes; i++) {
      const len = buf.readUInt8(offset); offset += 1;
      offset += len;
    }

    // Podłoga
    for (let i = 0; i < w * h; i++) {
      map.floor[i] = buf.readUInt16BE(offset); offset += 2;
    }
    // Ściany
    for (let i = 0; i < w * h; i++) {
      map.walls[i] = buf.readUInt16BE(offset); offset += 2;
    }
    // Kolizje
    for (let i = 0; i < w * h; i++) {
      map.collision[i] = buf.readUInt8(offset); offset += 1;
    }

    // Drzwi
    const numDoors = buf.readUInt16BE(offset); offset += 2;
    for (let i = 0; i < numDoors; i++) {
      const dx = buf.readUInt16BE(offset); offset += 2;
      const dy = buf.readUInt16BE(offset); offset += 2;
      const st = buf.readUInt8(offset); offset += 1;
      const ori = buf.readUInt8(offset); offset += 1;
      const keyLen = buf.readUInt8(offset); offset += 1;
      const keyId = buf.toString('utf8', offset, offset + keyLen); offset += keyLen;
      const stateStr = st === 2 ? 'open' : st === 3 ? 'locked' : 'closed';
      map.doors.push(new DoorEntity({ x: dx, y: dy, state: stateStr, keyId }));
    }

    // Obiekty
    const numProps = buf.readUInt16BE(offset); offset += 2;
    for (let i = 0; i < numProps; i++) {
      const id = buf.readUInt16BE(offset); offset += 2;
      const type = buf.readUInt8(offset); offset += 1;
      const ox = buf.readUInt16BE(offset); offset += 2;
      const oy = buf.readUInt16BE(offset); offset += 2;
      const ow = buf.readUInt8(offset); offset += 1;
      const oh = buf.readUInt8(offset); offset += 1;
      const nameLen = buf.readUInt8(offset); offset += 1;
      const name = buf.toString('utf8', offset, offset + nameLen); offset += nameLen;

      if (type === 1) {
        // Kontener
        const lootCount = buf.readUInt8(offset); offset += 1;
        const loot = [];
        for (let j = 0; j < lootCount; j++) {
          const itIdLen = buf.readUInt8(offset); offset += 1;
          const itId = buf.toString('utf8', offset, offset + itIdLen); offset += itIdLen;
          const count = buf.readUInt16BE(offset); offset += 2;
          const dur = buf.readInt16BE(offset); offset += 2;
          loot.push({ id: itId, count, dur });
        }
        const container = new Container(name, ox, oy, { loot });
        map.containers.push(container);
      } else if (type === 2) {
        // Przedmiot
        const count = buf.readUInt16BE(offset); offset += 2;
        map.groundItems.push({ id: name, x: ox, y: oy, count });
      } else {
        offset += 1;
        map.props.push({ id, name, x: ox, y: oy, sizeX: ow, sizeY: oh });
      }
    }

    return map;
  }
}
