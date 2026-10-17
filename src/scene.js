// Rysowanie świata izometrycznego: podłogi, ściany, meble, postacie, efekty.

import { C } from './palette.js';
import { WALL_H } from './art.js';
import { TILE_W, TILE_H } from './render.js';

function wallSprite(art, wall) {
  const set = art.walls[wall.mat] || art.walls.brick;
  if (wall.feature === 'door') {
    return wall.open || wall.destroyed ? set.doorOpen : set.door;
  }
  if (wall.feature === 'window' || wall.feature === 'windowBroken') {
    return wall.broken ? set.windowBroken : set.window;
  }
  return set.solid;
}

function propSprite(art, prop) {
  if (prop.kind === 'tree') return art.props.tree[prop.variant % art.props.tree.length];
  if (prop.kind === 'car') {
    return art.props[`car${prop.variant}`] || art.props.carWreck;
  }
  return art.props[prop.kind] || art.props.crate;
}

function propShadow(art, prop) {
  if (prop.kind === 'tree' || prop.kind === 'car' || prop.kind === 'dumpster') return art.shadows.large;
  if (prop.kind === 'corpse' || prop.kind === 'bush' || prop.kind === 'hydrant' || prop.kind === 'mailbox') return null;
  return art.shadows.medium;
}

// Czy ściana jest od strony kamery? Takie ściany "cinamy", żeby widzieć wnętrza.
export function isNearWall(world, x, y) {
  const wallAt = (xx, yy) => {
    const t = world.tile(xx, yy);
    return !!(t && t.wall);
  };
  const insideAt = (xx, yy) => {
    const t = world.tile(xx, yy);
    return !!(t && t.inside >= 0 && !t.wall);
  };
  const outRight = !wallAt(x + 1, y) && !insideAt(x + 1, y);
  const outDown = !wallAt(x, y + 1) && !insideAt(x, y + 1);
  const inLeft = wallAt(x - 1, y) || insideAt(x - 1, y);
  const inUp = wallAt(x, y - 1) || insideAt(x, y - 1);
  return (outRight && inLeft) || (outDown && inUp) || (outRight && outDown && (inLeft || inUp));
}

function drawNearWall(game, scr, art, world, t, sx, sy, dim) {
  const b = t.inside >= 0 ? world.buildings[t.inside] : null;
  const floorKind = b ? b.floor : 'concrete';
  scr.blit(art.tiles[floorKind][t.gv % 3], sx, sy, { dim });
  scr.line(sx, sy + 8, sx + 16, sy + 16, C.OUTLINE);
  scr.line(sx + 16, sy + 16, sx + 32, sy + 8, C.OUTLINE);
  scr.line(sx + 1, sy + 8, sx + 16, sy + 15, C.SLATE_DARK);
  if (dim >= 3) return;
  const w = t.wall;
  const base = dim;
  const shadow = base > 0;
  if (w.feature === 'door') {
    if (w.destroyed) {
      scr.line(sx + 8, sy + 12, sx + 16, sy + 16, C.WOOD_DARK);
      scr.line(sx + 16, sy + 16, sx + 24, sy + 12, C.WOOD_DARK);
      scr.set(sx + 12, sy + 14, C.WOOD);
      scr.set(sx + 20, sy + 14, C.WOOD);
    } else if (w.open) {
      scr.line(sx + 8, sy + 12, sx + 16, sy + 16, shadow ? C.OUTLINE : C.WOOD_LIGHT);
      scr.line(sx + 16, sy + 16, sx + 24, sy + 12, shadow ? C.OUTLINE : C.WOOD_LIGHT);
    } else {
      scr.line(sx + 8, sy + 12, sx + 16, sy + 16, shadow ? C.OUTLINE : C.WOOD);
      scr.line(sx + 16, sy + 16, sx + 24, sy + 12, shadow ? C.WOOD_DARK : C.WOOD_LIGHT);
      scr.line(sx + 8, sy + 13, sx + 16, sy + 17, C.WOOD_DARK);
      scr.line(sx + 16, sy + 17, sx + 24, sy + 13, C.WOOD_DARK);
      scr.set(sx + 22, sy + 14, C.YELLOW);
    }
  } else if (w.feature === 'window' || w.feature === 'windowBroken') {
    scr.line(sx + 8, sy + 12, sx + 16, sy + 16, shadow ? C.OUTLINE : C.STEEL);
    scr.line(sx + 16, sy + 16, sx + 24, sy + 12, shadow ? C.OUTLINE : C.STEEL);
    if (!shadow) scr.set(sx + 16, sy + 13, C.BONE);
    for (let b = 0; b < w.barricade; b++) {
      scr.line(sx + 7 + b * 2, sy + 13 - b, sx + 24 - b, sy + 13 - b, shadow ? C.OUTLINE : C.WOOD_LIGHT);
    }
  }
}

function facingDir(dx, dy) {
  const sx = dx - dy;
  const sy = dx + dy;
  if (Math.abs(sy) >= Math.abs(sx)) return sy > 0 ? 0 : 1;
  return sx > 0 ? 3 : 2;
}

export function renderWorld(game, world, cam, opts = {}) {
  const scr = game.screen;
  const art = game.art;
  const reveal = !!opts.revealAll;
  const menu = !!opts.menu;
  const dimAll = opts.dimAll || 0;
  scr.clear(C.VOID);

  const bounds = cam.visibleBounds(2);
  const lights = world.lampLight;

  // --- podłogi i dekalacje ---
  for (let y = bounds.y0; y <= bounds.y1; y++) {
    for (let x = bounds.x0; x <= bounds.x1; x++) {
      const i = world.idx(x, y);
      const known = reveal || world.explored[i];
      const knownTile = world.tiles[i];
      if (!known) {
        // niezbadany teren: bardzo ciemny, ale nie czarna dziura
        const [ux, uy] = cam.toScreen(x, y);
        if (ux > -TILE_W && ux < scr.w + TILE_W && uy > -TILE_H * 2 && uy < scr.h + TILE_H) {
          scr.blit(art.tiles[knownTile.ground][knownTile.gv % 3], ux, uy, { dim: 4 });
        }
        continue;
      }
      const vis = reveal || world.visible[i];
      const t = world.tiles[i];
      const [sx, sy] = cam.toScreen(x, y);
      if (sx < -TILE_W || sx > scr.w + TILE_W || sy < -TILE_H * 2 || sy > scr.h + TILE_H) continue;
      const dim = reveal ? dimAll : game.tileDim(x, y, vis);
      if (t.wall && isNearWall(world, x, y)) {
        drawNearWall(game, scr, art, world, t, sx, sy, dim);
      } else {
        scr.blit(art.tiles[t.ground][t.gv % 3], sx, sy, { dim });
      }
      if (t.decal && !(t.wall && isNearWall(world, x, y))) {
        const sprite =
          t.decal.kind === 'blood'
            ? art.decals.blood[t.decal.v % art.decals.blood.length]
            : art.decals.rubble;
        scr.blit(sprite, sx, sy, { dim });
      }
    }
  }

  // --- lista obiektów do posortowania po głębokości ---
  const list = [];
  const push = (x, y, layer, fn) => list.push({ key: (x + y) * 100 + layer, fn });

  for (let y = bounds.y0; y <= bounds.y1; y++) {
    for (let x = bounds.x0; x <= bounds.x1; x++) {
      const i = world.idx(x, y);
      if (!reveal && !world.explored[i]) continue;
      const vis = reveal || world.visible[i];
      const t = world.tiles[i];
      const [sx, sy] = cam.toScreen(x, y);
      if (sx < -TILE_W * 2 || sx > scr.w + TILE_W * 2 || sy < -64 || sy > scr.h + 64) continue;
      const dim = reveal ? dimAll : game.tileDim(x, y, vis);

      if (t.wall && !isNearWall(world, x, y)) {
        push(x, y, 10, () => {
          const spr = wallSprite(art, t.wall);
          scr.blit(spr, sx, sy - WALL_H, { dim });
          if (t.wall.barricade > 0) {
            const top = sy - WALL_H;
            const col = dim >= 3 ? C.WOOD_DARK : C.WOOD;
            const hi = dim >= 3 ? C.OUTLINE : C.WOOD_LIGHT;
            for (let b = 0; b < t.wall.barricade; b++) {
              const yy = top + 13 + b * 4;
              scr.line(sx + 19, yy, sx + 31, yy - 4, col);
              scr.line(sx + 19, yy + 1, sx + 31, yy - 3, hi);
            }
          }
        });
      }

      if (t.prop) {
        const prop = t.prop;
        push(x, y, 20, () => {
          const spr = propSprite(art, prop);
          const dx = sx + TILE_W / 2 - (spr.w >> 1);
          const dy = sy + TILE_H / 2 - (spr.h - 1);
          const shadow = propShadow(art, prop);
          if (shadow) {
            scr.blit(shadow, sx + TILE_W / 2 - (shadow.w >> 1), sy + 3, { dim: Math.max(dim, 1) });
          }
          scr.blit(spr, dx, dy, { dim });
          if (prop.kind === 'streetlight' && game.ambientDim && game.ambientDim() >= 2 && !reveal) {
            const blink = Math.floor(game.t * 2) % 2 === 0;
            if (blink) {
              scr.set(dx + 10, dy + 7, C.YELLOW);
              scr.set(dx + 11, dy + 7, C.WHITE);
            }
          }
        });
      }
    }
  }

  // --- przedmioty na ziemi ---
  const itemCount = new Map();
  for (const rec of world.items) {
    const i = world.idx(rec.x, rec.y);
    if (!reveal && !world.explored[i]) continue;
    if (!reveal && !world.visible[i]) continue;
    const n = itemCount.get(i) || 0;
    itemCount.set(i, n + 1);
    const [sx, sy] = cam.toScreen(rec.x, rec.y);
    const dim = reveal ? dimAll : game.tileDim(rec.x, rec.y, true);
    push(rec.x, rec.y, 25 + n * 0.1, () => {
      const icon = art.icons[rec.item.id] || art.icons.scrap;
      const ox = ((n % 3) - 1) * 4;
      const oy = (Math.floor(n / 3) % 2) * 2;
      scr.blit(icon, sx + 9 + ox, sy - 4 + oy, { dim });
    });
  }

  // --- zombie ---
  for (const z of world.zombies) {
    if (!z.alive) continue;
    const i = world.idx(z.x, z.y);
    if (!reveal && !world.visible[i]) continue;
    const [sx, sy] = cam.toScreen(reveal ? z.vx : z.vx, z.vy);
    const dim = reveal ? dimAll : game.tileDim(z.x, z.y, true);
    push(z.vx, z.vy, 30, () => {
      const tAnim = Math.max(0, game.t);
      const frame = menu
        ? Math.floor(tAnim * 2 + z.variant) % 2
        : z.moving
          ? Math.floor((z.walkPhase || 0) / 1.4) % 2
          : Math.floor(tAnim * 1.5 + z.variant) % 2;
      const pal = art.chars.zombie[((z.variant % art.chars.zombie.length) + art.chars.zombie.length) % art.chars.zombie.length];
      const dirFrames = pal[((z.dir % 4) + 4) % 4];
      const spr = dirFrames[((frame % 2) + 2) % 2];
      scr.blit(art.shadows.player, sx + 8, sy + 3, { dim: 2 });
      const flash = !menu && z.flash > 0 ? C.WHITE : null;
      scr.blit(spr, sx + 6, sy - 23, { dim, flash });
      if (game.ambientDim() > 0 && !menu) {
        // w ciemności zombie mają słaby, czerwony błysk oczu — czytelność
        const eye = Math.floor(tAnim * 2 + z.variant) % 2 === 0 ? C.BLOOD_BRIGHT : C.BLOOD;
        const hy = sy - 18;
        if (z.dir === 0 || z.dir === 2 || z.dir === 3) {
          scr.set(sx + 8, hy, eye);
          scr.set(sx + 12, hy, eye);
        }
      }
    });
  }

  // --- gracz ---
  if (!opts.noPlayer && game.player) {
    const p = game.player;
    const [sx, sy] = cam.toScreen(p.vx, p.vy);
    const dim = reveal ? dimAll : game.tileDim(p.x, p.y, true);
    push(p.vx, p.vy, 40, () => {
      if (!p.alive) {
        scr.blit(art.decals.blood[1], sx, sy - TILE_H, { dim: Math.max(0, dim - 1) });
        scr.blit(art.decals.corpse[0], sx + 2, sy - 4, { dim });
        return;
      }
      const frame = p.moving ? Math.max(0, Math.floor(p.moveT / 0.12)) % 2 : 0;
      const spr = art.chars.player[((p.dir % 4) + 4) % 4][frame];
      scr.blit(art.shadows.player, sx + 8, sy + 3, { dim: 2 });
      scr.blit(spr, sx + 6, sy - 23, { dim });
    });
  }

  list.sort((a, b) => a.key - b.key);
  for (const item of list) item.fn();
}

export function renderEffects(game) {
  const scr = game.screen;
  const cam = game.camera;
  if (!game.player) return;
  const [pxs, pys] = cam.toScreen(game.player.vx, game.player.vy);
  const cx = pxs + 16;
  const cy = pys - 4;

  for (const e of game.effects) {
    const k = e.t / e.dur;
    if (e.type === 'swing') {
      const angles = { 0: Math.PI / 2, 1: -Math.PI / 2, 2: Math.PI, 3: 0 };
      const a0 = angles[e.dir] || 0;
      for (let i = -2; i <= 2; i++) {
        const a = a0 + i * 0.28;
        const r = 15 + i * 1.5;
        const x = Math.round(cx + Math.cos(a) * r);
        const y = Math.round(cy + Math.sin(a) * r);
        if (k > 0.7 && i % 2 === 0) continue;
        scr.set(x, y, i === 0 ? C.WHITE : C.YELLOW);
      }
    } else if (e.type === 'shot') {
      const [fx, fy] = cam.toScreen(e.x, e.y);
      const [tx, ty] = cam.toScreen(e.toX, e.toY);
      const x1 = fx + 16;
      const y1 = fy - 8;
      const x2 = tx + 16;
      const y2 = ty - 8;
      if (k < 0.8) {
        scr.line(x1, y1, x2, y2, C.YELLOW);
        scr.line(x1, y1 + 1, x2, y2 + 1, C.BONE);
      }
      // błysk wylotu
      if (k < 0.5) {
        scr.line(x1 - 3, y1, x1 + 3, y1, C.WHITE);
        scr.line(x1, y1 - 3, x1, y1 + 3, C.WHITE);
        scr.set(x1 - 2, y1 - 2, C.YELLOW);
        scr.set(x1 + 2, y1 + 2, C.YELLOW);
      }
    } else if (e.type === 'blood') {
      if (k < 0.55) {
        const [sx, sy] = cam.toScreen(e.x, e.y);
        scr.blit(game.art.decals.bloodSmall, sx + 9, sy - 2, {});
      }
    }
  }
}

export { facingDir };
