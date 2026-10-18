// Modularny renderer izometryczny 2:1 z sortowaniem głębi, cullingiem, zoomem i animacjami.
import { C } from '../palette.js';
import { assetManager } from '../core/assets.js';

export class IsometricRenderer {
  constructor(screen, options = {}) {
    this.screen = screen;
    this.tileW = options.tileW || 64;
    this.tileH = options.tileH || 32;
    this.zoom = options.zoom || 1.0; // 0.5, 1.0, 2.0
    this.showCollisions = !!options.showCollisions;
    this.showTriggers = !!options.showTriggers;
  }

  setZoom(zoomLevel) {
    // Zoom tylko w dozwolonych krokach: 0.5x, 1x, 2x
    if (zoomLevel === 0.5 || zoomLevel === 1.0 || zoomLevel === 2.0) {
      this.zoom = zoomLevel;
    }
  }

  // Konwersja współrzędnych siatki izometrycznej (x, y) na ekran (sx, sy)
  gridToScreen(gx, gy, camera) {
    const halfW = (this.tileW >> 1);
    const halfH = (this.tileH >> 1);

    const worldX = (gx - gy) * halfW;
    const worldY = (gx + gy) * halfH;

    const screenX = Math.round((worldX - camera.x) * this.zoom + (this.screen.w >> 1));
    const screenY = Math.round((worldY - camera.y) * this.zoom + (this.screen.h >> 1));

    return { sx: screenX, sy: screenY };
  }

  // Konwersja współrzędnych ekranu na kafel siatki izometrycznej
  screenToGrid(sx, sy, camera) {
    const halfW = (this.tileW >> 1) * this.zoom;
    const halfH = (this.tileH >> 1) * this.zoom;

    const wx = (sx - (this.screen.w >> 1)) + camera.x * this.zoom;
    const wy = (sy - (this.screen.h >> 1)) + camera.y * this.zoom;

    const gx = Math.floor((wx / halfW + wy / halfH) / 2);
    const gy = Math.floor((wy / halfH - wx / halfW) / 2);

    return { gx, gy };
  }

  // Główna metoda renderująca kompletną scenę mapy
  renderScene(map, camera, player = null, t = 0) {
    const scr = this.screen;

    // 1. Viewport Culling - wyznaczenie widocznych kafli
    const camGrid = this.screenToGrid(scr.w >> 1, scr.h >> 1, camera);
    const radX = Math.ceil((scr.w / (this.tileW * this.zoom))) + 2;
    const radY = Math.ceil((scr.h / (this.tileH * this.zoom))) + 3;

    const minX = Math.max(0, camGrid.gx - radX);
    const maxX = Math.min(map.w - 1, camGrid.gx + radX);
    const minY = Math.max(0, camGrid.gy - radY);
    const maxY = Math.min(map.h - 1, camGrid.gy + radY);

    // 2. Warstwa 1: Podłogi (rysowane wiersz po wierszu)
    for (let gy = minY; gy <= maxY; gy++) {
      for (let gx = minX; gx <= maxX; gx++) {
        const tileId = map.getFloor(gx, gy);
        if (tileId > 0) {
          const { sx, sy } = this.gridToScreen(gx, gy, camera);
          this.drawFloorDiamond(sx, sy, tileId, t);
        }
      }
    }

    // 3. Przygotowanie listy obiektów i sortowanie głębi (Depth Sorting)
    const drawList = [];

    // Ściany
    for (let gy = minY; gy <= maxY; gy++) {
      for (let gx = minX; gx <= maxX; gx++) {
        const wallId = map.getWall(gx, gy);
        if (wallId > 0) {
          drawList.push({
            type: 'wall',
            gx,
            gy,
            depth: (gx + gy) * 1000 + (gx - gy),
            id: wallId,
          });
        }
      }
    }

    // Drzwi
    for (const door of map.doors) {
      if (door.x >= minX && door.x <= maxX && door.y >= minY && door.y <= maxY) {
        drawList.push({
          type: 'door',
          gx: door.x,
          gy: door.y,
          depth: (door.x + door.y) * 1000 + (door.x - door.y) + 5,
          door,
        });
      }
    }

    // Kontenery i rekwizyty (w tym wielokaflowe)
    for (const prop of map.props) {
      const sx = prop.sizeX || 1;
      const sy = prop.sizeY || 1;
      const frontX = prop.x + sx - 1;
      const frontY = prop.y + sy - 1;
      drawList.push({
        type: 'prop',
        gx: prop.x,
        gy: prop.y,
        depth: (frontX + frontY) * 1000 + (frontX - frontY),
        prop,
      });
    }

    for (const c of map.containers) {
      drawList.push({
        type: 'container',
        gx: c.x,
        gy: c.y,
        depth: (c.x + c.y) * 1000 + (c.x - c.y) + 2,
        container: c,
      });
    }

    for (const it of map.groundItems) {
      drawList.push({
        type: 'item',
        gx: it.x,
        gy: it.y,
        depth: (it.x + it.y) * 1000 + (it.x - it.y) - 1,
        item: it,
      });
    }

    // Gracz
    if (player) {
      drawList.push({
        type: 'player',
        gx: player.x,
        gy: player.y,
        depth: (player.x + player.y) * 1000 + (player.x - player.y) + 10,
        player,
      });
    }

    // Sortowanie rosnące po głębi (od tyłu do przodu)
    drawList.sort((a, b) => a.depth - b.depth);

    // 4. Rysowanie posortowanych obiektów
    for (const item of drawList) {
      const { sx, sy } = this.gridToScreen(item.gx, item.gy, camera);
      switch (item.type) {
        case 'wall':
          this.drawWallBlock(sx, sy, item.id);
          break;
        case 'door':
          this.drawDoorEntity(sx, sy, item.door, t);
          break;
        case 'prop':
          this.drawPropEntity(sx, sy, item.prop);
          break;
        case 'container':
          this.drawContainerEntity(sx, sy, item.container);
          break;
        case 'item':
          this.drawGroundItem(sx, sy, item.item);
          break;
        case 'player':
          this.drawPlayer(sx, sy, item.player);
          break;
      }
    }
  }

  drawFloorDiamond(sx, sy, tileId, t) {
    const scr = this.screen;
    const w = Math.round(this.tileW * this.zoom);
    const h = Math.round(this.tileH * this.zoom);
    const halfW = w >> 1;
    const halfH = h >> 1;

    // Romb podłogi
    const col = tileId === 4 ? (Math.floor(t * 3) % 2 === 0 ? C.BLUE : C.BLUE_DARK) : 
                tileId === 2 ? C.DIRT : 
                tileId === 3 ? C.CONCRETE : C.GRASS;

    // Prosty romb izometryczny 2:1
    for (let dy = -halfH; dy <= halfH; dy++) {
      const rowSpan = Math.round(halfW * (1.0 - Math.abs(dy) / halfH));
      scr.hline(sx - rowSpan, sx + rowSpan, sy + dy, col);
    }
  }

  drawWallBlock(sx, sy, wallId) {
    const scr = this.screen;
    const w = Math.round(this.tileW * this.zoom);
    const wallH = Math.round(96 * this.zoom);

    // Górny romb ściany + pionowe ściany frontowe
    scr.rect(sx - (w >> 1), sy - wallH, w, wallH, C.SLATE_DARK);
    scr.frame(sx - (w >> 1), sy - wallH, w, wallH, C.OUTLINE);
  }

  drawDoorEntity(sx, sy, door, t) {
    const scr = this.screen;
    const h = Math.round(80 * this.zoom);
    const w = Math.round(32 * this.zoom);

    if (door.isOpen()) {
      // Drzwi otwarte (cienka linia odsunięta)
      scr.line(sx, sy - h, sx + w, sy - h + 16, C.WOOD_LIGHT);
    } else {
      // Drzwi zamknięte
      scr.rect(sx - 16, sy - h, 32, h, C.WOOD);
      scr.frame(sx - 16, sy - h, 32, h, C.OUTLINE);
    }
  }

  drawPropEntity(sx, sy, prop) {
    const scr = this.screen;
    const w = Math.round((prop.sizeX || 1) * 32 * this.zoom);
    const h = Math.round((prop.sizeY || 1) * 32 * this.zoom);
    scr.rect(sx - (w >> 1), sy - h, w, h, C.WOOD_DARK);
  }

  drawContainerEntity(sx, sy, container) {
    const scr = this.screen;
    scr.rect(sx - 10, sy - 20, 20, 20, C.GOLD);
    scr.frame(sx - 10, sy - 20, 20, 20, C.OUTLINE);
  }

  drawGroundItem(sx, sy, item) {
    const scr = this.screen;
    scr.rect(sx - 4, sy - 6, 8, 8, C.WHITE);
  }

  drawPlayer(sx, sy, player) {
    const scr = this.screen;
    scr.rect(sx - 8, sy - 36, 16, 36, C.SKIN);
    scr.rect(sx - 6, sy - 24, 12, 16, C.BLUE);
  }
}
