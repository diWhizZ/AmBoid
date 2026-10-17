// Cała grafika jest generowana proceduralnie w indeksach 32-kolorowej palety.
// Zero zewnętrznych assetów — tak jakbyśmy rysowali tilesety w Deluxe Paint.

import { C, X, TRANSPARENT } from './palette.js';
import { PixelBuffer } from './pixel.js';
import { makeRng, hash2 } from './rng.js';

const TILE_W = 32;
const TILE_H = 16;
const DIAMOND = [
  [16, 0],
  [32, 8],
  [16, 16],
  [0, 8],
];

export const WALL_H = 20;

// Ramy tonalne materiałów (od światła do cienia). W trybie OCS półtony AGA
// wracają do kolorów bazowych, więc obraz jest identyczny; w AGA dają płynne
// przejścia. Gradient na kaflu liczymy raz i wybieramy ton z rampy.
const RAMPS = {
  grass: [X.GRASS_LIT, C.GRASS_LIGHT, X.GRASS_MID, C.GRASS, C.GRASS_DARK],
  dirt: [C.WOOD_LIGHT, X.DIRT_LIT, C.GOLD, X.DIRT_MID, C.WOOD],
  asphalt: [X.ASPHALT_HI, C.ASPHALT_LIGHT, X.ASPHALT_MID, C.ASPHALT, C.ASPHALT_DARK],
  sidewalk: [X.CONCRETE_HI, C.CONCRETE, X.CONCRETE_MID, C.CONCRETE_DARK, C.ASPHALT],
  wood: [X.WOOD_WARM, C.WOOD_LIGHT, X.WOOD_MID, C.WOOD, C.WOOD_DARK],
  tile: [X.CONCRETE_HI, C.CONCRETE, X.CONCRETE_MID, C.CONCRETE_DARK, C.STEEL],
  carpet: [X.BLOOD_FRESH, C.BLOOD, X.BLOOD_DRY, C.BLOOD_DARK, C.WOOD_DARK],
  water: [X.WATER_HI, C.STEEL, X.WATER_MID, C.BLUE, X.WATER_DEEP],
  concrete: [X.CONCRETE_HI, C.CONCRETE, X.CONCRETE_MID, C.CONCRETE_DARK, C.ASPHALT_DARK],
  gravel: [X.ASPHALT_HI, C.CONCRETE, X.CONCRETE_MID, C.CONCRETE_DARK, C.ASPHALT_DARK],
};


function diamondMask() {
  const pb = new PixelBuffer(TILE_W, TILE_H);
  pb.fillPoly(DIAMOND, 1);
  return pb;
}

function outlined(pb, color = C.OUTLINE) {
  const out = pb.clone();
  for (let y = 0; y < pb.h; y++) {
    for (let x = 0; x < pb.w; x++) {
      if (pb.data[y * pb.w + x] !== TRANSPARENT) continue;
      const n =
        pb.get(x - 1, y) !== TRANSPARENT ||
        pb.get(x + 1, y) !== TRANSPARENT ||
        pb.get(x, y - 1) !== TRANSPARENT ||
        pb.get(x, y + 1) !== TRANSPARENT;
      if (n) out.data[y * pb.w + x] = color;
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// PODŁOGI / TEREN
// ---------------------------------------------------------------------------
function makeGround(kind, variant) {
  const rng = makeRng(0xbeef + variant * 977 + kind.length * 331 + kind.charCodeAt(0) * 17);
  const pb = new PixelBuffer(TILE_W, TILE_H);
  const mask = diamondMask();

  const ramp = RAMPS[kind] || RAMPS.grass;

  // gradient + szum: 64-kolorowa AGA dostaje pięć tonów na materiał,
  // OCS widzi z tego trzy kolory bazowe (identyczny układ plam).
  for (let y = 0; y < TILE_H; y++) {
    for (let x = 0; x < TILE_W; x++) {
      if (mask.get(x, y) === TRANSPARENT) continue;
      const n = hash2(x + variant * 37, y + variant * 91, kind.length);
      const gx = (x - y * 2 + TILE_H) / (TILE_W + TILE_H);
      let tone = Math.floor(gx * 2.4 + (n - 0.5) * 2.0 + 0.4);
      if (tone < 0) tone = 0;
      else if (tone > 4) tone = 4;
      pb.set(x, y, ramp[tone]);
    }
  }

  // charakterystyczne detale
  if (kind === 'grass') {
    for (let i = 0; i < 4 + variant; i++) {
      const x = rng.int(6, 25);
      const y = rng.int(3, 12);
      if (mask.get(x, y) === TRANSPARENT) continue;
      pb.set(x, y, rng.chance(0.3) ? X.GRASS_LIT : C.GRASS_LIGHT);
      pb.set(x, y - 1, C.GRASS_LIGHT);
      if (rng.chance(0.5)) pb.set(x + 1, y, rng.chance(0.25) ? X.GRASS_DEEP : C.GRASS_DARK);
    }
    if (variant === 2) {
      const x = rng.int(8, 22);
      const y = rng.int(5, 11);
      pb.set(x, y, C.YELLOW);
      pb.set(x + 1, y, C.BONE);
    }
  } else if (kind === 'dirt') {
    for (let i = 0; i < 7; i++) {
      const x = rng.int(3, 28);
      const y = rng.int(2, 13);
      if (mask.get(x, y) === TRANSPARENT) continue;
      pb.set(x, y, rng.chance(0.5) ? C.WOOD_DARK : C.CONCRETE_DARK);
    }
  } else if (kind === 'asphalt' || kind === 'concrete') {
    for (let i = 0; i < 4; i++) {
      const x = rng.int(2, 29);
      const y = rng.int(1, 14);
      if (mask.get(x, y) === TRANSPARENT) continue;
      pb.set(x, y, rng.chance(0.5) ? C.ASPHALT : C.ASPHALT_DARK);
    }
    if (kind === 'asphalt') {
      // ślady opon na jezdni
      for (let x = 3; x < 29; x += 2) {
        if (mask.get(x, 5) !== TRANSPARENT) pb.set(x, 5, C.ASPHALT_DARK);
        if (mask.get(x, 11) !== TRANSPARENT) pb.set(x, 11, C.ASPHALT_DARK);
      }
    }
    if (kind === 'concrete') {
      // szczeliny dylatacyjne
      for (let x = 3; x < 29; x++) {
        if (mask.get(x, 8) !== TRANSPARENT && x % 7 !== 0) pb.set(x, 8, C.ASPHALT_DARK);
      }
    }
  } else if (kind === 'sidewalk') {
    for (let i = 0; i < 8; i++) {
      const x = rng.int(3, 28);
      const y = rng.int(2, 13);
      if (mask.get(x, y) === TRANSPARENT) continue;
      pb.set(x, y, rng.chance(0.33) ? X.CONCRETE_HI : rng.chance(0.5) ? C.ASPHALT : C.CONCRETE);
    }
    // krawężnik po jednej stronie (delikatnie)
    for (let x = 2; x < 30; x++) {
      const yTop = 8 + Math.round((x - 16) * 0.5);
      if (pb.get(x, yTop + 1) !== TRANSPARENT) pb.set(x, yTop + 1, C.ASPHALT);
    }
  } else if (kind === 'wood') {
    // deski wzdłuż osi X mapy
    for (let y = 1; y < TILE_H; y += 3) {
      for (let x = 0; x < TILE_W; x++) {
        if (mask.get(x, y) !== TRANSPARENT) pb.set(x, y, C.WOOD_DARK);
        if (mask.get(x, y + 1) !== TRANSPARENT && hash2(x, y, 7) > 0.4) pb.set(x, y + 1, hash2(x, y, 9) > 0.7 ? X.WOOD_WARM : C.WOOD_LIGHT);
      }
    }
    for (let i = 0; i < 3; i++) {
      const x = rng.int(4, 27);
      pb.set(x, rng.int(4, 11), C.WOOD_DARK);
    }
  } else if (kind === 'tile') {
    for (let y = 0; y < TILE_H; y++) {
      for (let x = 0; x < TILE_W; x++) {
        if (mask.get(x, y) === TRANSPARENT) continue;
        const u = Math.floor((x + 16) / 8);
        const v = Math.floor((y + 8) / 4);
        pb.set(x, y, (u + v) & 1 ? C.CONCRETE : C.BONE);
        if (((x + 16) % 8 === 0) || ((y + 8) % 4 === 0)) pb.set(x, y, C.CONCRETE_DARK);
      }
    }
  } else if (kind === 'carpet') {
    for (let y = 0; y < TILE_H; y++) {
      for (let x = 0; x < TILE_W; x++) {
        if (mask.get(x, y) === TRANSPARENT) continue;
        const n = hash2(x, y, 42);
        pb.set(x, y, n > 0.75 ? C.BLOOD : n > 0.4 ? C.BLOOD_DARK : C.WOOD_DARK);
      }
    }
  } else if (kind === 'water') {
    for (let y = 0; y < TILE_H; y++) {
      for (let x = 0; x < TILE_W; x++) {
        if (mask.get(x, y) === TRANSPARENT) continue;
        const w = Math.sin((x + variant * 6) * 0.5 + y * 1.2) + Math.sin(y * 0.9 + variant);
        pb.set(x, y, w > 1.25 ? X.WATER_HI : w > 1.1 ? C.STEEL : w > 0.2 ? C.BLUE : w > -0.6 ? C.SLATE_DARK : X.WATER_DEEP);
      }
    }
  } else if (kind === 'gravel') {
    for (let i = 0; i < 14; i++) {
      const x = rng.int(1, 30);
      const y = rng.int(1, 14);
      if (mask.get(x, y) === TRANSPARENT) continue;
      pb.set(x, y, rng.chance(0.5) ? C.ASPHALT_LIGHT : C.CONCRETE);
    }
  }

  return pb;
}

// ---------------------------------------------------------------------------
// ŚCIANY
// ---------------------------------------------------------------------------
function pointInMask(pb, x, y) {
  return x >= 0 && y >= 0 && x < pb.w && y < pb.h && pb.data[y * pb.w + x] !== TRANSPARENT;
}

function drawBrickTexture(pb, x0, y0, w, h, cA, cB, mortar, vertical = false) {
  for (let y = y0; y < y0 + h; y++) {
    for (let x = x0; x < x0 + w; x++) {
      if (!pointInMask(pb, x, y)) continue;
      if (vertical) {
        if ((x - x0) % 5 === 0) pb.set(x, y, mortar);
        else if (hash2(x, y, 3) > 0.82) pb.set(x, y, cB);
      } else {
        const row = Math.floor((y - y0) / 4);
        const off = row % 2 === 0 ? 0 : 3;
        if ((y - y0) % 4 === 0) pb.set(x, y, mortar);
        else if ((x + off - x0) % 6 === 0) pb.set(x, y, mortar);
        else if (hash2(x, y, 11) > 0.85) pb.set(x, y, cB);
        else pb.set(x, y, cA);
      }
    }
  }
}

function makeWall(material, feature = null) {
  const H = WALL_H;
  const pb = new PixelBuffer(32, H + 16);
  const style = {
    brick: { left: C.BLOOD_DARK, right: C.BLOOD, light: C.BLOOD_BRIGHT, cap: C.BLOOD_DARK, capHi: C.BLOOD, mortar: C.OUTLINE },
    concrete: { left: C.ASPHALT, right: C.CONCRETE, light: C.BONE, cap: C.ASPHALT_DARK, capHi: C.ASPHALT, mortar: C.ASPHALT_DARK },
    wood: { left: C.WOOD_DARK, right: C.WOOD, light: C.WOOD_LIGHT, cap: C.WOOD_DARK, capHi: C.WOOD, mortar: C.OUTLINE },
  }[material] || { left: C.SLATE_DARK, right: C.SLATE, light: C.STEEL, cap: C.SHADOW, capHi: C.SLATE_DARK, mortar: C.OUTLINE };

  // górna płaszczyzna (cienki "dach" muru)
  pb.fillPoly(DIAMOND, style.cap);
  for (let y = 0; y < 16; y++) {
    for (let x = 0; x < 32; x++) {
      if (pb.get(x, y) === TRANSPARENT) continue;
      if (hash2(x, y, 5) > 0.9) pb.set(x, y, style.capHi);
    }
  }

  // dwie widoczne płaszczyzny ściany
  pb.fillPoly(
    [
      [0, 8],
      [16, 16],
      [16, 16 + H],
      [0, 8 + H],
    ],
    style.left,
  );
  pb.fillPoly(
    [
      [16, 16],
      [32, 8],
      [32, 8 + H],
      [16, 16 + H],
    ],
    style.right,
  );

  // tekstura cegieł / desek / betonu
  if (material === 'brick') {
    const brick = (x0, x1, base, light, hi) => {
      for (let y = 9; y < 8 + H; y++) {
        for (let x = x0; x < x1; x++) {
          if (pb.get(x, y) === TRANSPARENT) continue;
          const row = Math.floor((y - 9) / 5);
          const off = row % 2 === 0 ? 0 : 4;
          const by = (y - 9) % 5;
          if (by === 0) pb.set(x, y, style.mortar);
          else if ((x + off - x0) % 8 === 0) pb.set(x, y, style.mortar);
          else if (by === 1 && hash2(x, y, 19) > 0.55) pb.set(x, y, hi);
          else if (by === 4 && hash2(x, y, 23) > 0.6) pb.set(x, y, C.BLOOD_DARK);
          else if (hash2(x, y, 11) > 0.9) pb.set(x, y, light);
          else pb.set(x, y, base);
        }
      }
    };
    brick(1, 16, C.BLOOD_DARK, C.BLOOD, C.BLOOD);
    brick(17, 31, C.BLOOD, C.BLOOD_BRIGHT, X.BLOOD_FRESH);
  } else if (material === 'wood') {
    for (let y = 10; y < 8 + H; y += 6) {
      for (let x = 0; x < 32; x++) {
        if (pb.get(x, y) !== TRANSPARENT) pb.set(x, y, C.OUTLINE);
        if (pb.get(x, y + 1) !== TRANSPARENT && hash2(x, y, 4) > 0.55) pb.set(x, y + 1, hash2(x, y, 6) > 0.65 ? X.WOOD_WARM : style.light);
      }
    }
    for (let i = 0; i < 4; i++) {
      const x = 3 + ((i * 7 + 3) % 26);
      const y = 13 + ((i * 5) % 12);
      if (pb.get(x, y) !== TRANSPARENT) pb.set(x, y, C.OUTLINE);
    }
  } else {
    for (let y = 9; y < 8 + H; y++) {
      for (let x = 0; x < 32; x++) {
        if (pb.get(x, y) === TRANSPARENT) continue;
        if (hash2(x, y, 21) > 0.93) pb.set(x, y, x > 16 ? X.CONCRETE_HI : X.CONCRETE_MID);
        if (y === 15 || y === 25) pb.set(x, y, C.ASPHALT_DARK);
      }
    }
  }

  // okno / drzwi na prawej ścianie
  if (feature === 'window' || feature === 'windowBroken') {
    const glass = [
      [21, 12],
      [29, 8],
      [29, 17],
      [21, 21],
    ];
    pb.fillPoly(glass, C.STEEL);
    pb.fillPoly(
      [
        [22, 13],
        [28, 9],
        [28, 16],
        [22, 20],
      ],
      C.SLATE_DARK,
    );
    pb.line(21, 12, 29, 8, C.BONE);
    pb.line(21, 21, 29, 17, C.BONE);
    pb.line(21, 12, 21, 21, C.BONE);
    pb.line(29, 8, 29, 17, C.BONE);
    if (feature === 'windowBroken') {
      pb.fillPoly(
        [
          [23, 14],
          [27, 12],
          [26, 16],
          [24, 17],
        ],
        C.OUTLINE,
      );
      pb.line(24, 12, 26, 18, C.STEEL);
      pb.set(23, 15, C.OUTLINE);
    }
    pb.line(23, 18, 26, 10, C.BLUE);
  } else if (feature === 'door' || feature === 'doorOpen') {
    const door = [
      [20, 13],
      [29, 9],
      [29, 25],
      [20, 29],
    ];
    if (feature === 'doorOpen') {
      pb.fillPoly(door, C.OUTLINE);
      pb.fillPoly(
        [
          [21, 14],
          [27, 11],
          [27, 24],
          [21, 27],
        ],
        C.VOID,
      );
      pb.fillPoly(
        [
          [27, 11],
          [31, 14],
          [31, 25],
          [27, 24],
        ],
        C.WOOD_DARK,
      );
      pb.line(28, 13, 28, 23, C.GOLD);
    } else {
      pb.fillPoly(door, C.OUTLINE);
      pb.fillPoly(
        [
          [21, 14],
          [28, 10],
          [28, 24],
          [21, 28],
        ],
        C.WOOD,
      );
      for (let y = 13; y < 27; y += 4) pb.line(22, y, 27, y - 3, C.WOOD_DARK);
      pb.set(27, 20, C.YELLOW);
      pb.set(27, 21, C.YELLOW);
    }
  }

  // krawędzie
  pb.line(0, 8, 16, 0, C.OUTLINE);
  pb.line(16, 0, 32, 8, C.OUTLINE);
  pb.line(0, 8, 0, 8 + H, C.OUTLINE);
  pb.line(32, 8, 32, 8 + H, C.OUTLINE);
  pb.line(0, 8 + H, 16, 16 + H, C.OUTLINE);
  pb.line(16, 16 + H, 32, 8 + H, C.OUTLINE);
  pb.line(16, 16, 16, 16 + H, C.OUTLINE);
  return pb;
}

// ---------------------------------------------------------------------------
// PROSTE OBIEKTY
// ---------------------------------------------------------------------------
function makeShadow(w = 26, h = 8, color = C.OUTLINE) {
  const pb = new PixelBuffer(w, h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const dx = (x - w / 2) / (w / 2);
      const dy = (y - h / 2) / (h / 2);
      if (dx * dx + dy * dy <= 1 && ((x + y) & 1) === 0) pb.set(x, y, color);
    }
  }
  return pb;
}

function makeTree(variant = 0, dead = false) {
  const pb = new PixelBuffer(38, 52);
  const rng = makeRng(500 + variant * 77);
  const baseX = 19;
  const baseY = 50;
  // pień
  pb.rect(baseX - 2, 30, 4, 20, C.WOOD_DARK);
  pb.rect(baseX - 1, 30, 2, 20, C.WOOD);
  pb.set(baseX - 3, 50, C.WOOD_DARK);
  pb.set(baseX + 3, 50, C.WOOD_DARK);
  if (dead) {
    pb.line(baseX, 34, baseX - 9, 22, C.WOOD_DARK);
    pb.line(baseX, 30, baseX + 10, 16, C.WOOD_DARK);
    pb.line(baseX + 3, 32, baseX + 12, 28, C.WOOD_DARK);
    pb.line(baseX - 2, 27, baseX - 12, 30, C.WOOD_DARK);
    return outlined(pb, C.OUTLINE);
  }
  if (variant === 1) {
    // iglak
    for (let layer = 0; layer < 4; layer++) {
      const cy = 12 + layer * 8;
      const w = 9 - layer * 1.5;
      pb.fillPoly(
        [
          [baseX, cy - 10],
          [baseX + w, cy + 4],
          [baseX - w, cy + 4],
        ],
        layer % 2 ? C.GREEN_DARK : C.GRASS_DARK,
      );
      for (let i = 0; i < 8; i++) {
        const x = baseX + rng.int(-6, 6);
        const y = cy + rng.int(-2, 3);
        pb.set(x, y, C.GRASS);
      }
    }
  } else {
    // liściaste: kilka kęp
    const blobs = [
      [baseX, 22, 15, 12],
      [baseX - 9, 27, 10, 8],
      [baseX + 9, 25, 10, 9],
      [baseX, 14, 10, 8],
    ];
    for (const [cx, cy, rx, ry] of blobs) {
      pb.ellipse(cx, cy, rx, ry, C.GREEN_DARK);
    }
    for (const [cx, cy, rx, ry] of blobs) {
      pb.ellipse(cx - 1, cy - 2, rx - 2, ry - 2, C.GRASS_DARK);
    }
    for (const [cx, cy, rx, ry] of blobs) {
      pb.ellipse(cx - 2, cy - 3, Math.max(2, rx - 5), Math.max(2, ry - 4), C.GRASS);
    }
    // światło
    for (let i = 0; i < 20; i++) {
      const [cx, cy, rx, ry] = blobs[rng.int(0, blobs.length - 1)];
      const x = cx + rng.int(-rx + 2, rx - 2);
      const y = cy + rng.int(-ry + 2, ry - 2);
      if (pb.get(x, y) !== TRANSPARENT) {
        const dx = x - cx;
        const dy = y - cy;
        if (dx * dx + dy * dy < rx * rx * 0.7) {
          const r = rng.next();
          pb.set(x, y, r > 0.78 ? X.GRASS_LIT : r > 0.4 ? C.GRASS_LIGHT : C.GRASS);
        }
      }
    }
    for (let i = 0; i < 7; i++) {
      const [cx, cy, rx, ry] = blobs[rng.int(0, blobs.length - 1)];
      const x = cx + rng.int(-rx + 2, rx - 2);
      const y = cy + rng.int(-ry + 2, ry - 2);
      if (pb.get(x, y) !== TRANSPARENT) pb.set(x, y, rng.chance(0.5) ? X.DIRT_LIT : C.GOLD);
    }
    // owoce / kwiaty
    if (variant === 2) {
      pb.set(baseX + 4, 20, C.BLOOD);
      pb.set(baseX - 6, 25, C.BLOOD);
      pb.set(baseX + 8, 28, C.YELLOW);
    }
  }
  return outlined(pb, C.OUTLINE);
}

function makeBush() {
  const pb = new PixelBuffer(26, 20);
  pb.ellipse(13, 12, 11, 7, C.GREEN_DARK);
  pb.ellipse(12, 10, 8, 5, C.GRASS_DARK);
  pb.ellipse(11, 9, 5, 3, C.GRASS);
  pb.set(7, 7, C.GRASS_LIGHT);
  pb.set(16, 9, C.GRASS_LIGHT);
  return outlined(pb);
}

function makeCar(bodyColor, wreck = false) {
  const pb = new PixelBuffer(46, 30);
  const dark = bodyColor === C.BLUE ? C.SLATE_DARK : C.WOOD_DARK;
  const light = bodyColor === C.BONE ? C.WHITE : C.ASPHALT_LIGHT;
  if (wreck) {
    pb.fillPoly(
      [
        [6, 21],
        [38, 15],
        [46, 21],
        [14, 29],
      ],
      C.ASPHALT_DARK,
    );
    pb.fillPoly(
      [
        [12, 17],
        [32, 13],
        [38, 17],
        [18, 22],
      ],
      C.OUTLINE,
    );
    pb.rect(18, 18, 8, 4, C.BLOOD_DARK);
    return outlined(pb);
  }
  // cień pod autem
  pb.ellipse(24, 24, 20, 5, C.OUTLINE);
  // koła
  for (const [x, y] of [
    [9, 22],
    [35, 16],
    [13, 26],
    [39, 20],
  ]) {
    pb.rect(x - 2, y - 3, 5, 6, C.OUTLINE);
  }
  // nadwozie (górna płaszczyzna)
  pb.fillPoly(
    [
      [3, 16],
      [37, 9],
      [44, 15],
      [10, 25],
    ],
    dark,
  );
  pb.fillPoly(
    [
      [5, 16],
      [36, 10],
      [42, 15],
      [11, 23],
    ],
    bodyColor,
  );
  // maska / dach
  pb.fillPoly(
    [
      [17, 13],
      [30, 10],
      [34, 13],
      [21, 17],
    ],
    C.STEEL,
  );
  pb.fillPoly(
    [
      [19, 13],
      [29, 11],
      [31, 13],
      [21, 15],
    ],
    C.SLATE_DARK,
  );
  // szyba przednia
  pb.fillPoly(
    [
      [31, 10],
      [36, 9],
      [39, 12],
      [34, 13],
    ],
    C.STEEL,
  );
  pb.fillPoly(
    [
      [32, 10],
      [35, 10],
      [37, 12],
      [34, 13],
    ],
    C.SLATE,
  );
  pb.set(33, 11, X.GLASS_HI);
  pb.set(34, 11, X.GLASS_HI);
  // reflektor
  pb.set(5, 16, C.YELLOW);
  pb.set(6, 17, C.YELLOW);
  if (bodyColor === C.METAL) {
    pb.set(20, 14, X.METAL_HI);
    pb.set(21, 14, X.STEEL_HI);
    pb.set(31, 12, X.METAL_HI);
  }
  // rdza / brud
  if (bodyColor !== C.METAL) {
    pb.set(12, 20, C.WOOD_DARK);
    pb.set(28, 12, light);
  }
  return outlined(pb);
}

function makeTrashcan() {
  const pb = new PixelBuffer(16, 22);
  pb.rect(3, 6, 10, 14, C.ASPHALT);
  pb.rect(4, 7, 8, 12, C.ASPHALT_LIGHT);
  pb.rect(2, 4, 12, 3, C.ASPHALT);
  pb.hline(3, 12, 5, C.METAL);
  pb.vline(6, 8, 18, C.CONCRETE_DARK);
  pb.vline(10, 8, 18, C.CONCRETE_DARK);
  pb.set(11, 13, C.BLOOD);
  return outlined(pb);
}

function makeDumpster() {
  const pb = new PixelBuffer(30, 24);
  pb.fillPoly(
    [
      [2, 10],
      [26, 6],
      [29, 10],
      [5, 21],
    ],
    C.GREEN_DARK,
  );
  pb.fillPoly(
    [
      [4, 10],
      [25, 7],
      [27, 10],
      [6, 19],
    ],
    C.GRASS_DARK,
  );
  pb.fillPoly(
    [
      [3, 6],
      [25, 2],
      [27, 5],
      [5, 9],
    ],
    C.GRASS_DARK,
  );
  pb.line(5, 9, 26, 5, C.OUTLINE);
  pb.rect(8, 13, 4, 3, C.BLOOD_DARK);
  pb.set(20, 11, C.BONE);
  return outlined(pb);
}

function makeCrate() {
  const pb = new PixelBuffer(20, 20);
  pb.fillPoly(
    [
      [3, 7],
      [15, 4],
      [18, 8],
      [6, 17],
    ],
    C.WOOD_DARK,
  );
  pb.fillPoly(
    [
      [4, 7],
      [15, 5],
      [17, 8],
      [6, 15],
    ],
    C.WOOD,
  );
  pb.line(4, 8, 16, 6, C.WOOD_DARK);
  pb.line(6, 15, 7, 6, C.WOOD_DARK);
  pb.line(15, 5, 16, 13, C.WOOD_DARK);
  pb.set(10, 10, C.WOOD_LIGHT);
  return outlined(pb);
}

function makeBarrel() {
  const pb = new PixelBuffer(16, 22);
  pb.ellipse(8, 7, 6, 3, C.BLOOD_DARK);
  pb.rect(2, 7, 12, 12, C.BLOOD_DARK);
  pb.rect(3, 7, 10, 12, C.WOOD_DARK);
  pb.hline(3, 12, 10, C.ASPHALT);
  pb.hline(3, 12, 15, C.ASPHALT);
  pb.set(6, 12, C.BLOOD);
  return outlined(pb);
}

function makeTable() {
  const pb = new PixelBuffer(32, 22);
  pb.fillPoly(
    [
      [2, 7],
      [22, 3],
      [30, 7],
      [9, 14],
    ],
    C.WOOD,
  );
  pb.line(2, 7, 22, 3, C.WOOD_LIGHT);
  pb.vline(5, 9, 19, C.WOOD_DARK);
  pb.vline(26, 8, 17, C.WOOD_DARK);
  pb.vline(10, 12, 21, C.WOOD_DARK);
  // kubek
  pb.rect(14, 5, 3, 3, C.BONE);
  return outlined(pb);
}

function makeChair() {
  const pb = new PixelBuffer(16, 22);
  pb.rect(4, 8, 8, 3, C.WOOD);
  pb.rect(4, 11, 2, 9, C.WOOD_DARK);
  pb.rect(10, 11, 2, 9, C.WOOD_DARK);
  pb.rect(3, 4, 3, 8, C.WOOD_DARK);
  pb.rect(4, 4, 8, 2, C.WOOD);
  return outlined(pb);
}

function makeCouch() {
  const pb = new PixelBuffer(36, 22);
  pb.fillPoly(
    [
      [3, 9],
      [29, 5],
      [34, 9],
      [8, 19],
    ],
    C.BLUE,
  );
  pb.fillPoly(
    [
      [4, 9],
      [28, 6],
      [31, 9],
      [8, 16],
    ],
    C.SLATE,
  );
  pb.fillPoly(
    [
      [4, 5],
      [27, 2],
      [30, 5],
      [7, 10],
    ],
    C.SLATE_DARK,
  );
  pb.line(8, 9, 9, 15, C.SLATE_DARK);
  pb.line(19, 7, 20, 13, C.SLATE_DARK);
  pb.rect(23, 12, 3, 3, C.WOOD_DARK);
  return outlined(pb);
}

function makeBed() {
  const pb = new PixelBuffer(42, 24);
  pb.fillPoly(
    [
      [2, 10],
      [30, 4],
      [40, 9],
      [12, 20],
    ],
    C.WOOD_DARK,
  );
  pb.fillPoly(
    [
      [4, 9],
      [30, 5],
      [37, 9],
      [12, 18],
    ],
    C.BONE,
  );
  pb.fillPoly(
    [
      [8, 8],
      [16, 6],
      [20, 8],
      [12, 12],
    ],
    C.WHITE,
  );
  pb.fillPoly(
    [
      [17, 12],
      [35, 8],
      [30, 11],
      [20, 16],
    ],
    C.BLOOD_DARK,
  );
  pb.line(2, 10, 12, 20, C.OUTLINE);
  pb.line(30, 4, 40, 9, C.OUTLINE);
  return outlined(pb);
}

function makeShelf() {
  const pb = new PixelBuffer(28, 34);
  pb.rect(2, 4, 24, 28, C.WOOD_DARK);
  pb.rect(3, 5, 22, 26, C.WOOD);
  for (const y of [11, 18, 25]) {
    pb.hline(3, 24, y, C.WOOD_DARK);
    pb.hline(3, 24, y - 1, C.WOOD_LIGHT);
  }
  // puszki i słoiki
  const cols = [C.METAL, C.BLOOD, C.GRASS_LIGHT, C.BONE, C.YELLOW];
  for (let i = 0; i < 8; i++) {
    const x = 5 + (i % 4) * 5;
    const y = 6 + Math.floor(i / 4) * 7;
    pb.rect(x, y, 3, 4, cols[i % cols.length]);
  }
  return outlined(pb);
}

function makeFridge() {
  const pb = new PixelBuffer(20, 32);
  pb.rect(3, 5, 14, 25, C.BONE);
  pb.rect(4, 6, 12, 23, C.WHITE);
  pb.line(4, 14, 15, 14, C.CONCRETE_DARK);
  pb.rect(14, 8, 2, 4, C.CONCRETE_DARK);
  pb.rect(14, 17, 2, 4, C.CONCRETE_DARK);
  pb.set(7, 20, C.BLOOD_DARK);
  return outlined(pb);
}

function makeCounter() {
  const pb = new PixelBuffer(36, 20);
  pb.fillPoly(
    [
      [2, 8],
      [26, 4],
      [34, 8],
      [10, 17],
    ],
    C.WOOD_DARK,
  );
  pb.fillPoly(
    [
      [3, 8],
      [26, 5],
      [32, 8],
      [10, 15],
    ],
    C.CONCRETE,
  );
  pb.fillPoly(
    [
      [3, 8],
      [26, 5],
      [30, 7],
      [8, 11],
    ],
    C.BONE,
  );
  // zlew
  pb.fillPoly(
    [
      [12, 9],
      [20, 7],
      [23, 9],
      [15, 11],
    ],
    C.STEEL,
  );
  return outlined(pb);
}

function makeFence() {
  const pb = new PixelBuffer(32, 22);
  pb.rect(3, 6, 2, 15, C.WOOD_DARK);
  pb.rect(26, 4, 2, 15, C.WOOD_DARK);
  pb.line(4, 9, 27, 5, C.WOOD);
  pb.line(4, 9, 27, 5, C.WOOD);
  pb.line(4, 15, 27, 11, C.WOOD);
  pb.line(4, 15, 27, 11, C.WOOD_DARK);
  pb.line(4, 9, 4, 15, C.WOOD_DARK);
  pb.line(27, 5, 27, 11, C.WOOD_DARK);
  pb.set(5, 8, C.WOOD_LIGHT);
  return outlined(pb);
}

function makeStreetlight() {
  const pb = new PixelBuffer(14, 56);
  pb.rect(6, 14, 2, 40, C.METAL);
  pb.rect(7, 14, 1, 40, C.STEEL);
  pb.rect(5, 52, 5, 2, C.ASPHALT);
  pb.line(7, 14, 11, 8, C.METAL);
  pb.rect(9, 6, 4, 3, C.ASPHALT);
  pb.set(10, 7, C.YELLOW);
  pb.set(11, 7, C.YELLOW);
  return outlined(pb);
}

function makeHydrant() {
  const pb = new PixelBuffer(10, 16);
  pb.rect(3, 5, 4, 9, C.BLOOD);
  pb.rect(2, 8, 6, 3, C.BLOOD_DARK);
  pb.rect(4, 3, 2, 3, C.BLOOD);
  pb.rect(2, 14, 6, 2, C.ASPHALT);
  pb.set(4, 6, C.BLOOD_BRIGHT);
  return outlined(pb);
}

function makeBench() {
  const pb = new PixelBuffer(28, 18);
  pb.fillPoly(
    [
      [2, 7],
      [20, 3],
      [26, 6],
      [8, 11],
    ],
    C.WOOD,
  );
  pb.hline(3, 24, 10, C.WOOD_DARK);
  pb.rect(4, 11, 2, 6, C.ASPHALT);
  pb.rect(21, 8, 2, 6, C.ASPHALT);
  return outlined(pb);
}

function makeMailbox() {
  const pb = new PixelBuffer(12, 22);
  pb.rect(5, 10, 2, 10, C.ASPHALT);
  pb.rect(2, 4, 8, 7, C.BLUE);
  pb.hline(2, 9, 4, C.SLATE);
  pb.set(8, 8, C.YELLOW);
  return outlined(pb);
}

// ---------------------------------------------------------------------------
// POSTACIE
// ---------------------------------------------------------------------------
function makeCharacter(opts) {
  const {
    dir = 0, // 0 dół, 1 góra, 2 lewo, 3 prawo
    frame = 0,
    skin = C.SKIN,
    skinShade = C.SKIN_DARK,
    hair = C.WOOD_DARK,
    shirt = C.BLUE,
    shirtShade = C.SLATE_DARK,
    pants = C.SLATE_DARK,
    shoes = C.OUTLINE,
    zombie = false,
    backpack = false,
  } = opts;
  const pb = new PixelBuffer(20, 32);
  const cx = 10;
  const bob = frame ? 1 : 0;
  const headY = 3 + bob;

  const side = dir === 2 || dir === 3;
  const back = dir === 1;

  // nogi
  if (!side) {
    const lOff = frame ? 0 : 1;
    const rOff = frame ? 1 : 0;
    pb.rect(cx - 4, 20, 3, 8 - lOff, pants);
    pb.rect(cx - 4, 27 - lOff, 4, 3, shoes);
    pb.rect(cx + 1, 20, 3, 8 - rOff, pants);
    pb.rect(cx + 1, 27 - rOff, 4, 3, shoes);
  } else {
    const lOff = frame ? 1 : 0;
    pb.rect(cx - 3 + lOff, 20, 3, 8, pants);
    pb.rect(cx - 2 + lOff, 27, 5, 3, shoes);
    pb.rect(cx, 20, 3, 7 - lOff, pants);
    pb.rect(cx + 1, 26 - lOff, 4, 3, shoes);
  }

  // tors
  pb.rect(cx - 4, 10 + bob, 9, 11 - bob, shirt);
  pb.rect(cx - 4, 10 + bob, 2, 10, shirtShade);
  pb.rect(cx + 3, 11 + bob, 2, 9, shirtShade);
  // pas / kieszenie
  pb.hline(cx - 4, cx + 4, 17, C.WOOD_DARK);
  pb.set(cx, 13 + bob, shirtShade);

  // ręce
  if (zombie) {
    if (back) {
      pb.rect(cx - 7, 12 + bob, 3, 6, shirtShade);
      pb.rect(cx + 5, 12 + bob, 3, 6, shirtShade);
      pb.rect(cx - 7, 18 + bob, 3, 2, skin);
      pb.rect(cx + 5, 18 + bob, 3, 2, skin);
    } else if (side) {
      const f = dir === 3 ? 1 : -1;
      pb.rect(cx + f * 2, 11 + bob, 6, 3, shirtShade);
      pb.rect(cx + f * 7, 11 + bob, 3, 3, skin);
      pb.rect(cx - 4, 13 + bob, 2, 5, shirtShade);
    } else {
      // wyciągnięte do przodu (w stronę gracza)
      pb.rect(cx - 3, 12 + bob, 7, 3, shirtShade);
      pb.rect(cx - 2, 15 + bob, 5, 2, skin);
      pb.rect(cx - 2, 11 + bob, 8, 2, shirt);
      pb.rect(cx - 1, 17 + bob, 3, 1, skinShade);
    }
  } else {
    if (side) {
      pb.rect(cx + 2, 11, 3, 6, shirt);
      pb.rect(cx + 2, 17, 3, 2, skin);
      pb.rect(cx - 2, 11, 3, 6, shirtShade);
      pb.rect(cx - 2, 17, 2, 2, skinShade);
    } else {
      const swing = frame ? 1 : 0;
      pb.rect(cx - 6, 11 + bob + swing, 2, 6, shirt);
      pb.rect(cx - 6, 17 + bob + swing, 2, 2, skin);
      pb.rect(cx + 5, 11 + bob - swing, 2, 6, shirtShade);
      pb.rect(cx + 5, 17 + bob - swing, 2, 2, skinShade);
    }
  }

  // plecak
  if (backpack && back) {
    pb.rect(cx - 4, 12 + bob, 9, 8, C.WOOD_DARK);
    pb.rect(cx - 3, 13 + bob, 7, 6, C.WOOD);
    pb.rect(cx - 1, 14 + bob, 3, 2, C.WOOD_DARK);
    pb.hline(cx - 3, cx + 3, 18 + bob, C.WOOD_DARK);
  }

  // głowa
  pb.ellipse(cx, headY + 2, 4, 4, skin);
  if (back || side) {
    // włosy / tył głowy
    pb.ellipse(cx - (side ? 1 : 0), headY + 1, 4, 3, hair);
    pb.rect(cx - 4, headY, 9, 4, hair);
    if (side) {
      // profil twarzy
      const f = dir === 3 ? 1 : -1;
      pb.rect(cx + (f > 0 ? 2 : -5), headY + 3, 3, 3, skin);
      pb.set(cx + (f > 0 ? 4 : -4), headY + 4, C.OUTLINE); // oko
      pb.set(cx + (f > 0 ? 4 : -4), headY + 5, skinShade);
    } else {
      pb.set(cx - 4, headY + 5, hair);
      pb.set(cx + 4, headY + 5, hair);
    }
  } else {
    // twarz
    pb.rect(cx - 4, headY, 9, 3, hair);
    pb.set(cx - 3, headY + 4, C.OUTLINE);
    pb.set(cx + 3, headY + 4, C.OUTLINE);
    pb.set(cx - 2, headY + 6, skinShade);
    if (zombie) {
      pb.set(cx - 3, headY + 3, C.BLOOD_DARK);
      pb.set(cx + 2, headY + 5, C.BLOOD);
    }
  }

  if (zombie) {
    // fałdy materiału i brud
    for (let y = 12; y <= 19; y += 3) {
      pb.hline(cx - 3, cx + 3, y + bob, shirtShade);
    }
    pb.vline(cx + 1, 12 + bob, 18 + bob, shirtShade);
    // rozdarć ubrania i krwi
    pb.set(cx - 2, 13 + bob, skinShade);
    pb.set(cx + 2, 15 + bob, skin);
    pb.set(cx + 1, 19 + bob, C.BLOOD_DARK);
    pb.set(cx - 3, 19 + bob, C.BLOOD);
    pb.set(cx + 3, 12 + bob, C.BLOOD_DARK);
    pb.set(cx - 5, 20, C.BLOOD_DARK);
  }

  return outlined(pb, C.OUTLINE);
}

function makeCorpse(variant = 0) {
  const pb = new PixelBuffer(28, 14);
  const shirt = [C.BLUE, C.WOOD, C.SLATE, C.BONE][variant % 4];
  const skin = C.ZOMBIE_SKIN;
  // krew
  pb.ellipse(14, 10, 12, 4, C.BLOOD_DARK);
  pb.ellipse(13, 10, 8, 2, X.BLOOD_DRY);
  pb.fillPoly(
    [
      [2, 9],
      [24, 6],
      [27, 9],
      [6, 12],
    ],
    C.WOOD_DARK,
  );
  // tors
  pb.rect(9, 5, 9, 5, shirt);
  // głowa
  pb.ellipse(6, 7, 4, 3, skin);
  pb.set(5, 7, C.OUTLINE);
  pb.set(7, 7, C.BLOOD_DARK);
  // nogi
  pb.rect(18, 5, 7, 2, C.SLATE_DARK);
  pb.rect(18, 8, 6, 2, C.SLATE_DARK);
  pb.set(25, 5, C.OUTLINE);
  pb.set(24, 8, C.OUTLINE);
  return outlined(pb);
}

// ---------------------------------------------------------------------------
// IKONY PRZEDMIOTÓW (14x14)
// ---------------------------------------------------------------------------
function makeIcon(kind) {
  const pb = new PixelBuffer(14, 14);
  const box = (x, y, w, h, c) => pb.rect(x, y, w, h, c);
  switch (kind) {
    case 'bandage':
      box(3, 4, 8, 7, C.BONE);
      box(4, 5, 6, 4, C.WHITE);
      box(3, 6, 8, 2, C.BLOOD);
      pb.set(2, 7, C.BONE);
      break;
    case 'medkit':
      box(2, 4, 10, 8, C.WHITE);
      box(2, 4, 10, 1, C.BONE);
      box(6, 5, 2, 6, C.BLOOD);
      box(4, 7, 6, 2, C.BLOOD);
      pb.set(5, 3, C.CONCRETE_DARK);
      pb.set(9, 3, C.CONCRETE_DARK);
      break;
    case 'pills':
      box(4, 2, 6, 3, C.STEEL);
      box(3, 5, 8, 8, C.BONE);
      box(4, 6, 6, 6, C.WHITE);
      box(5, 8, 4, 2, C.BLOOD);
      break;
    case 'water':
    case 'whiskey': {
      const liquid = kind === 'water' ? C.BLUE : C.GOLD;
      box(5, 1, 4, 3, C.CONCRETE_DARK);
      box(4, 4, 6, 9, C.STEEL);
      box(5, 6, 4, 6, liquid);
      pb.set(5, 5, C.WHITE);
      break;
    }
    case 'can':
    case 'chips':
      if (kind === 'can') {
        box(4, 3, 6, 9, C.METAL);
        box(4, 5, 6, 5, C.BLOOD);
        pb.set(5, 4, C.WHITE);
        pb.set(8, 10, C.WHITE);
      } else {
        box(3, 2, 8, 11, C.YELLOW);
        box(4, 4, 6, 4, C.BLOOD);
        pb.set(4, 2, C.GOLD);
        pb.set(10, 3, C.GOLD);
      }
      break;
    case 'bat':
      pb.line(3, 11, 10, 3, C.WOOD_DARK);
      pb.line(4, 11, 11, 3, C.WOOD);
      pb.line(5, 11, 11, 3, C.WOOD_LIGHT);
      box(2, 10, 3, 2, C.WOOD_DARK);
      break;
    case 'axe':
      pb.line(4, 12, 10, 3, C.WOOD);
      pb.line(5, 12, 11, 3, C.WOOD_DARK);
      pb.fillPoly(
        [
          [9, 2],
          [13, 4],
          [11, 8],
          [7, 5],
        ],
        C.METAL,
      );
      pb.set(9, 3, C.WHITE);
      break;
    case 'knife':
      box(3, 10, 4, 2, C.WOOD_DARK);
      pb.fillPoly(
        [
          [6, 9],
          [12, 2],
          [13, 3],
          [7, 11],
        ],
        C.STEEL,
      );
      pb.set(11, 3, C.WHITE);
      break;
    case 'hammer':
      box(5, 5, 2, 8, C.WOOD);
      box(3, 3, 8, 4, C.METAL);
      pb.set(4, 3, C.STEEL);
      pb.set(9, 4, C.ASPHALT);
      break;
    case 'plank':
      pb.fillPoly(
        [
          [2, 10],
          [4, 12],
          [12, 4],
          [10, 2],
        ],
        C.WOOD,
      );
      pb.line(3, 10, 11, 3, C.WOOD_LIGHT);
      pb.set(8, 6, C.WOOD_DARK);
      break;
    case 'nails':
      for (let i = 0; i < 3; i++) {
        pb.line(4 + i * 3, 11, 6 + i * 3, 3, C.STEEL);
        pb.set(6 + i * 3, 3, C.METAL);
      }
      break;
    case 'pistol':
      box(2, 4, 10, 4, C.ASPHALT);
      box(3, 5, 8, 2, C.SLATE);
      box(6, 8, 4, 5, C.ASPHALT_DARK);
      box(9, 8, 2, 2, C.METAL);
      pb.set(10, 5, C.STEEL);
      break;
    case 'ammo':
      for (let i = 0; i < 3; i++) {
        pb.rect(3 + i * 3, 6, 2, 5, C.GOLD);
        pb.set(3 + i * 3, 5, C.METAL);
      }
      break;
    case 'backpack':
      box(3, 4, 8, 9, C.WOOD_DARK);
      box(4, 5, 6, 7, C.WOOD);
      box(5, 2, 4, 3, C.WOOD_DARK);
      box(5, 7, 4, 3, C.WOOD_LIGHT);
      break;
    case 'flashlight':
      box(2, 5, 9, 4, C.ASPHALT);
      box(10, 4, 3, 6, C.STEEL);
      box(4, 6, 4, 1, C.YELLOW);
      pb.set(12, 5, C.YELLOW);
      pb.set(12, 8, C.YELLOW);
      break;
    case 'scrap':
      pb.fillPoly(
        [
          [3, 8],
          [6, 3],
          [9, 7],
          [12, 5],
          [11, 11],
          [5, 11],
        ],
        C.METAL,
      );
      pb.set(6, 6, C.STEEL);
      pb.set(9, 9, C.ASPHALT);
      break;
    case 'magazine':
      box(3, 2, 8, 11, C.BONE);
      box(4, 3, 6, 4, C.SLATE);
      box(4, 8, 4, 1, C.ASPHALT);
      box(4, 10, 5, 1, C.ASPHALT);
      break;
    case 'map':
      box(2, 3, 10, 9, C.BONE);
      pb.line(3, 5, 10, 8, C.ASPHALT);
      pb.line(4, 9, 8, 5, C.BLOOD_DARK);
      pb.set(7, 6, C.BLOOD);
      break;
    case 'key':
      box(2, 6, 3, 3, C.GOLD);
      box(5, 7, 7, 1, C.GOLD);
      box(9, 8, 1, 2, C.GOLD);
      box(11, 8, 1, 2, C.GOLD);
      break;
    default:
      box(4, 4, 6, 6, C.METAL);
      pb.set(5, 5, C.STEEL);
  }
  return outlined(pb, C.OUTLINE);
}

// ---------------------------------------------------------------------------
// EKSPORT
// ---------------------------------------------------------------------------
export function buildArt() {
  const art = { tiles: {}, walls: {}, props: {}, chars: {}, icons: {}, decals: {}, shadows: {} };

  for (const kind of ['grass', 'dirt', 'asphalt', 'sidewalk', 'wood', 'tile', 'carpet', 'water', 'concrete', 'gravel']) {
    art.tiles[kind] = [0, 1, 2].map((v) => makeGround(kind, v));
  }

  for (const mat of ['brick', 'concrete', 'wood']) {
    art.walls[mat] = {
      solid: makeWall(mat, null),
      window: makeWall(mat, 'window'),
      windowBroken: makeWall(mat, 'windowBroken'),
      door: makeWall(mat, 'door'),
      doorOpen: makeWall(mat, 'doorOpen'),
    };
  }

  art.props.tree = [makeTree(0), makeTree(1), makeTree(2), makeTree(0, true)];
  art.props.bush = makeBush();
  art.props.trashcan = makeTrashcan();
  art.props.dumpster = makeDumpster();
  art.props.crate = makeCrate();
  art.props.barrel = makeBarrel();
  art.props.table = makeTable();
  art.props.chair = makeChair();
  art.props.couch = makeCouch();
  art.props.bed = makeBed();
  art.props.shelf = makeShelf();
  art.props.fridge = makeFridge();
  art.props.counter = makeCounter();
  art.props.fence = makeFence();
  art.props.streetlight = makeStreetlight();
  art.props.hydrant = makeHydrant();
  art.props.bench = makeBench();
  art.props.mailbox = makeMailbox();
  art.props.carBlue = makeCar(C.BLUE);
  art.props.carRed = makeCar(C.BLOOD);
  art.props.carMetal = makeCar(C.METAL);
  art.props.carYellow = makeCar(C.GOLD);
  art.props.carWreck = makeCar(C.ASPHALT, true);

  // podstawa ściany dla "cięcia" izometrycznego
  art.tiles.wallBase = (() => {
    const pb = new PixelBuffer(TILE_W, TILE_H);
    pb.fillPoly(DIAMOND, C.SLATE_DARK);
    for (let y = 0; y < TILE_H; y++) {
      for (let x = 0; x < TILE_W; x++) {
        if (pb.get(x, y) === TRANSPARENT) continue;
        if (hash2(x, y, 9) > 0.86) pb.set(x, y, C.ASPHALT_DARK);
      }
    }
    pb.line(0, 8, 16, 16, C.OUTLINE);
    pb.line(16, 16, 32, 8, C.OUTLINE);
    return pb;
  })();

  art.shadows.small = makeShadow(18, 6);
  art.shadows.medium = makeShadow(26, 8);
  art.shadows.large = makeShadow(36, 10);
  art.shadows.player = makeShadow(16, 6);

  art.chars.player = [];
  for (let dir = 0; dir < 4; dir++) {
    art.chars.player[dir] = [0, 1].map((frame) =>
      makeCharacter({ dir, frame, shirt: C.GOLD, shirtShade: C.WOOD_DARK, pants: C.SLATE_DARK, backpack: true }),
    );
  }

  const zombiePalettes = [
    { shirt: C.BLUE, shirtShade: C.SLATE_DARK, pants: C.SLATE_DARK },
    { shirt: C.WOOD, shirtShade: C.WOOD_DARK, pants: C.ASPHALT_DARK },
    { shirt: C.CONCRETE, shirtShade: C.CONCRETE_DARK, pants: C.SLATE },
    { shirt: C.GRASS_DARK, shirtShade: C.GREEN_DARK, pants: C.WOOD_DARK },
    { shirt: C.BLOOD, shirtShade: C.BLOOD_DARK, pants: C.ASPHALT },
  ];
  art.chars.zombie = zombiePalettes.map((pal) => {
    const frames = [];
    for (let dir = 0; dir < 4; dir++) {
      frames[dir] = [0, 1].map((frame, fi) =>
        makeCharacter({
          ...pal,
          dir,
          frame,
          skin: frame ? C.ZOMBIE_SKIN : C.ZOMBIE_SHADE,
          skinShade: C.ZOMBIE_SHADE,
          hair: C.OUTLINE,
          zombie: true,
        }),
      );
    }
    return frames;
  });

  art.decals.blood = [0, 1, 2, 3].map((variant) => {
    const pb = new PixelBuffer(32, 16);
    const rng = makeRng(9000 + variant * 131);
    const mask = diamondMask();
    for (let i = 0; i < 10 + variant * 2; i++) {
      const x = rng.int(6, 26);
      const y = rng.int(4, 12);
      if (mask.get(x, y) === TRANSPARENT) continue;
      const r = rng.int(1, 3);
      for (let yy = -r; yy <= r; yy++) {
        for (let xx = -r; xx <= r; xx++) {
          if (xx * xx + yy * yy > r * r) continue;
          if (rng.chance(0.25)) continue;
          pb.set(x + xx, y + yy, rng.chance(0.22) ? X.BLOOD_FRESH : rng.chance(0.35) ? C.BLOOD : rng.chance(0.3) ? X.BLOOD_DRY : C.BLOOD_DARK);
        }
      }
    }
    return pb;
  });
  art.decals.bloodSmall = (() => {
    const pb = new PixelBuffer(14, 8);
    const rng = makeRng(4242);
    for (let i = 0; i < 12; i++) {
      pb.set(rng.int(2, 11), rng.int(2, 6), rng.chance(0.5) ? C.BLOOD : C.BLOOD_DARK);
    }
    return pb;
  })();
  art.decals.rubble = (() => {
    const pb = new PixelBuffer(32, 16);
    const rng = makeRng(777);
    for (let i = 0; i < 18; i++) {
      const x = rng.int(4, 27);
      const y = rng.int(4, 12);
      const c = rng.chance(0.5) ? C.CONCRETE_DARK : C.CONCRETE;
      pb.rect(x, y, rng.int(1, 3), rng.int(1, 2), c);
    }
    return pb;
  })();
  art.decals.corpse = [0, 1, 2].map(makeCorpse);

  for (const kind of [
    'bandage',
    'medkit',
    'pills',
    'water',
    'can',
    'chips',
    'bat',
    'axe',
    'knife',
    'hammer',
    'plank',
    'nails',
    'pistol',
    'ammo',
    'backpack',
    'flashlight',
    'scrap',
    'magazine',
    'map',
    'key',
    'whiskey',
  ]) {
    art.icons[kind] = makeIcon(kind);
  }

  return art;
}
