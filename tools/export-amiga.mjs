// Eksport assetów i danych dla OCS/ECS, AGA oraz AmigaOS/RTG
import fs from 'node:fs';
import path from 'node:path';
import { PNG } from './png_mini.js';
import { buildArt } from '../src/art.js';
import { PALETTE, PALETTE_EXT, TRANSPARENT, hexToRgb } from '../src/palette.js';
import { writeILBM, writePalette } from './iff.js';
import { buildAllAtlases } from './build-atlas.mjs';
import { validateAndExportItems } from './export-items.mjs';
import { convertTiledToAmb } from './convert-tiled-map.mjs';

export function runFullAmigaExport() {
  console.log('=== Rozpoczynam pełny eksport dla Amigi (OCS/ECS, AGA, AmigaOS) ===');

  const art = buildArt();
  const outDir = path.resolve('docs/amiga');
  const agaDir = path.join(outDir, 'aga');
  const rtgDir = path.join(outDir, 'rtg');
  fs.mkdirSync(outDir, { recursive: true });
  fs.mkdirSync(agaDir, { recursive: true });
  fs.mkdirSync(rtgDir, { recursive: true });

  // 1. Eksport nagłówka przedmiotów C
  validateAndExportItems();

  // 2. Eksport mapy Tiled do AMB2
  const mapJsonPath = path.resolve('data/maps/sample_map.json');
  if (fs.existsSync(mapJsonPath)) {
    convertTiledToAmb(fs.readFileSync(mapJsonPath, 'utf8'), path.join(outDir, 'sample_map.amb'));
  }

  // 3. Eksport atlasów z pipeline'u (64x32 i 32x16)
  buildAllAtlases();

  // 4. Eksport IFF ILBM oraz RAW
  function pngFrom(pixels, w, h, palette) {
    const png = new PNG({ width: w, height: h });
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const c = pixels[y * w + x];
        const di = (y * w + x) * 4;
        if (c === TRANSPARENT) {
          png.data[di] = 0;
          png.data[di + 1] = 0;
          png.data[di + 2] = 0;
          png.data[di + 3] = 0;
        } else {
          const [r, g, b] = hexToRgb(palette[c] || '#000000');
          png.data[di] = r;
          png.data[di + 1] = g;
          png.data[di + 2] = b;
          png.data[di + 3] = 255;
        }
      }
    }
    return png;
  }

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
      // Zapis surowego bufora chunky (dla RTG/AmigaOS)
      fs.writeFileSync(path.join(dir, `${name}.raw`), Buffer.from(pixels));
      console.log(`[${tag}] ${name}: ${w}x${h}, ${sprites.length} klatek, ${bits} bitplanów, ${(iff / 1024).toFixed(0)} KB`);
    };

    // Podłogi
    const floors = [];
    for (const kind of ['grass', 'dirt', 'asphalt', 'sidewalk', 'wood', 'tile', 'carpet', 'water', 'concrete', 'gravel']) {
      for (const spr of art.tiles[kind]) floors.push(spr);
    }
    exportAtlas('amboid-floors', floors, 32, 16, 6);

    // Ściany
    const walls = [];
    for (const mat of ['brick', 'concrete', 'wood']) {
      const set = art.walls[mat];
      walls.push(set.solid, set.window, set.windowBroken, set.door, set.doorOpen);
    }
    exportAtlas('amboid-walls', walls, 32, 36, 5);

    // Postacie
    const chars = [];
    for (let dir = 0; dir < 4; dir++) for (const f of art.chars.player[dir]) chars.push(f);
    for (const pal of art.chars.zombie) for (let dir = 0; dir < 4; dir++) for (const f of pal[dir]) chars.push(f);
    exportAtlas('amboid-chars', chars, 20, 32, 8);

    // Rekwizyty
    const props = [
      ...art.props.tree,
      art.props.bush,
      art.props.trashcan,
      art.props.dumpster,
      art.props.crate,
      art.props.barrel,
      art.props.streetlight,
      art.props.hydrant,
      art.props.bench,
      art.props.mailbox,
      art.props.fence,
      art.props.carBlue,
      art.props.carRed,
      art.props.carMetal,
      art.props.carYellow,
      art.props.carWreck,
      art.props.shelf,
      art.props.fridge,
      art.props.counter,
      art.props.table,
      art.props.couch,
      art.props.bed,
      art.props.chair,
      art.props.corpse,
    ];
    exportAtlas('amboid-props', props, 32, 32, 6);

    // Przedmioty
    const items = Object.values(art.icons);
    exportAtlas('amboid-items', items, 16, 16, 6);
  }

  // OCS/ECS (32 kolory, 5 bitplanów)
  exportSet('OCS', outDir, PALETTE, 5);
  writePalette(path.join(outDir, 'amboid.pal'), PALETTE);

  // AGA (64 kolory, 6 bitplanów)
  const agaPalette = [...PALETTE, ...PALETTE_EXT];
  exportSet('AGA', agaDir, agaPalette, 6);
  writePalette(path.join(agaDir, 'amboid-aga.pal'), agaPalette);

  console.log('=== Eksport dla Amigi zakończony pomyślnie! ===');
}

// Uruchomienie jako CLI
if (process.argv[1] && (process.argv[1].endsWith('export-amiga.mjs') || process.argv[1].endsWith('export_amiga.mjs'))) {
  runFullAmigaExport();
}
