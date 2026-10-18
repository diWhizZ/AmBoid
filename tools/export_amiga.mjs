// Eksport grafiki proceduralnej do plików gotowych dla Amigi.
//   docs/amiga/*.iff          — IFF ILBM, 32 kolory, 5 bitplanów (OCS/ECS)
//   docs/amiga/amboid.pal     — paleta 32 kolorów (RGB)
//   docs/amiga/aga/*.iff      — IFF ILBM, 64 kolory, 6 bitplanów (AGA)
//   docs/amiga/aga/amboid-aga.pal — paleta 64 kolorów (RGB)
//   docs/amiga/**/*.png       — podgląd atlasów i palet
import fs from 'node:fs';
import path from 'node:path';
import { PNG } from './png_mini.js';
import { buildArt } from '../src/art.js';
import { PALETTE, PALETTE_EXT, TRANSPARENT, hexToRgb } from '../src/palette.js';
import { writeILBM, writePalette } from './iff.js';

const art = buildArt();
const outDir = path.resolve('docs/amiga');
const agaDir = path.join(outDir, 'aga');
fs.mkdirSync(outDir, { recursive: true });
fs.mkdirSync(agaDir, { recursive: true });

function pngFrom(pixels, w, h, palette, withAlpha = true) {
  const png = new PNG({ width: w, height: h });
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const c = pixels[y * w + x];
      const di = (y * w + x) * 4;
      if (c === TRANSPARENT) {
        png.data[di] = 0;
        png.data[di + 1] = 0;
        png.data[di + 2] = 0;
        png.data[di + 3] = withAlpha ? 0 : 255;
        continue;
      }
      const [r, g, b] = hexToRgb(palette[c] || '#000000');
      png.data[di] = r;
      png.data[di + 1] = g;
      png.data[di + 2] = b;
      png.data[di + 3] = 255;
    }
  }
  return png;
}

// Prosty atlas: siatka sprite'ów o stałej wielkości komórki.
function buildAtlas(sprites, cellW, cellH, cols) {
  const rows = Math.ceil(sprites.length / cols);
  const w = cellW * cols;
  const h = cellH * rows;
  const px = new Uint8Array(w * h).fill(TRANSPARENT);
  sprites.forEach((spr, i) => {
    if (!spr) return;
    const ox = (i % cols) * cellW;
    const oy = Math.floor(i / cols) * cellH;
    for (let y = 0; y < spr.h; y++) {
      for (let x = 0; x < spr.w; x++) {
        const c = spr.data[y * spr.w + x];
        if (c !== TRANSPARENT) px[(oy + y) * w + ox + x] = c;
      }
    }
  });
  return { pixels: px, w, h };
}

function exportSet(tag, dir, palette, bits) {
  const exportAtlas = (name, sprites, cellW, cellH, cols) => {
    const { pixels, w, h } = buildAtlas(sprites, cellW, cellH, cols);
    const iff = writeILBM(path.join(dir, `${name}.iff`), pixels, w, h, { bits, palette });
    const png = pngFrom(pixels, w, h, palette);
    fs.writeFileSync(path.join(dir, `${name}.png`), PNG.sync.write(png));
    console.log(`[${tag}] ${name}: ${w}x${h}, ${sprites.length} klatek, ${bits} bitplanów, ${(iff / 1024).toFixed(0)} KB`);
  };

  // 1. Podłogi: 10 rodzajów x 3 warianty
  const floors = [];
  for (const kind of ['grass', 'dirt', 'asphalt', 'sidewalk', 'wood', 'tile', 'carpet', 'water', 'concrete', 'gravel']) {
    for (const spr of art.tiles[kind]) floors.push(spr);
  }
  exportAtlas('amboid-floors', floors, 32, 16, 6);

  // 2. Ściany: 3 materiały x 5 wariantów
  const walls = [];
  for (const mat of ['brick', 'concrete', 'wood']) {
    const set = art.walls[mat];
    walls.push(set.solid, set.window, set.windowBroken, set.door, set.doorOpen);
  }
  exportAtlas('amboid-walls', walls, 32, 36, 5);

  // 3. Postacie: gracz (4 kierunki x 2 klatki) + 5 wariantów zombie (4 x 2)
  const chars = [];
  for (let dir = 0; dir < 4; dir++) for (const f of art.chars.player[dir]) chars.push(f);
  for (const pal of art.chars.zombie) for (let dir = 0; dir < 4; dir++) for (const f of pal[dir]) chars.push(f);
  exportAtlas('amboid-chars', chars, 20, 32, 8);

  // 4. Rekwizyty
  const props = [
    ...art.props.tree,
    art.props.bush,
    art.props.trashcan,
    art.props.dumpster,
    art.props.crate,
    art.props.barrel,
    art.props.table,
    art.props.chair,
    art.props.couch,
    art.props.bed,
    art.props.shelf,
    art.props.fridge,
    art.props.counter,
    art.props.fence,
    art.props.streetlight,
    art.props.hydrant,
    art.props.bench,
    art.props.mailbox,
    art.props.carBlue,
    art.props.carRed,
    art.props.carMetal,
    art.props.carYellow,
    art.props.carWreck,
  ];
  exportAtlas('amboid-props', props, 48, 56, 6);

  // 5. Ikony przedmiotów (14x14)
  const icons = Object.keys(art.icons).map((k) => art.icons[k]);
  exportAtlas('amboid-items', icons, 16, 16, 8);
}

// --- OCS/ECS: 32 kolory, 5 bitplanów ---
exportSet('OCS', outDir, PALETTE, 5);
writePalette(path.join(outDir, 'amboid.pal'), PALETTE);

function paletteSwatch(palette, name, dir) {
  const cols = 16;
  const rows = Math.ceil(palette.length / cols);
  const sw = 32;
  const cell = 40;
  const png = new PNG({ width: sw * cols, height: cell * rows });
  for (let i = 0; i < palette.length; i++) {
    const [r, g, b] = hexToRgb(palette[i]);
    const x0 = (i % cols) * sw;
    const y0 = Math.floor(i / cols) * cell;
    for (let y = 0; y < cell; y++) {
      for (let x = 0; x < sw; x++) {
        const di = ((y0 + y) * sw * cols + x0 + x) * 4;
        png.data[di] = r;
        png.data[di + 1] = g;
        png.data[di + 2] = b;
        png.data[di + 3] = 255;
      }
    }
  }
  fs.writeFileSync(path.join(dir, name), PNG.sync.write(png));
}
paletteSwatch(PALETTE, 'amboid-palette.png', outDir);

// --- AGA: 64 kolory, 6 bitplanów ---
exportSet('AGA', agaDir, PALETTE_EXT, 6);
writePalette(path.join(agaDir, 'amboid-aga.pal'), PALETTE_EXT);
paletteSwatch(PALETTE_EXT, 'amboid-aga-palette.png', agaDir);

console.log('\nOCS: 32 kolory / 5 bitplanów — docs/amiga/');
console.log('AGA: 64 kolory / 6 bitplanów — docs/amiga/aga/');
