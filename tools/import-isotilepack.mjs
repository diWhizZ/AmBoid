// Import kuratorowanego podzbioru kafli z packa "Isometric Floor Tiles"
// (Screaming Brain Studios, CC0 1.0, https://screamingbrainstudios.itch.io/isotilepack).
//
// Wejście: katalog z rozpakowanym wariantem Small 128x64 (arkusze i/lub pojedyncze kafle,
// dowolne podkatalogi). Wyjście: płaski katalog assets/source_pack z kaflami 128x64
// nazwanymi <rodzaj>_<nn>.png, gotowymi dla clean-magenta -> resize-tiles -> quantize.
//
// Pack nie jest commitowany: do repo wchodzą tylko pochodne atlasy (patrz NOTICE.md).

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { PNG } from './png_mini.js';

// Rodzaje podłóg z src/art.js (GROUND_SPEC). Nazwy plików wynikowych muszą się w nich mieścić.
export const GROUND_KINDS = [
  'grass', 'dirt', 'asphalt', 'sidewalk', 'wood',
  'tile', 'carpet', 'water', 'concrete', 'gravel',
];

// Materiały w packu -> nasze rodzaje. null = świadomie pomijane.
export const DEFAULT_MATERIAL_MAP = {
  grass: 'grass', flora: 'grass', bush: 'grass', plant: 'grass',
  dry: 'dirt', dirt: 'dirt', mud: 'dirt', soil: 'dirt',
  rocky: 'gravel', stones: 'gravel', gravel: 'gravel', rubble: 'gravel',
  stone: 'concrete', concrete: 'concrete', metal: 'concrete', steel: 'concrete',
  brick: 'sidewalk', sidewalk: 'sidewalk', pavement: 'sidewalk', paving: 'sidewalk',
  asphalt: 'asphalt', grill: 'asphalt', grate: 'asphalt',
  tile: 'tile', pattern: 'tile', ceramic: 'tile', mosaic: 'tile',
  wood: 'wood', plank: 'wood', parquet: 'wood',
  carpet: 'carpet', rug: 'carpet',
  water: 'water', elements: 'water',
  ice: null, snow: null,
};

const DEFAULT_TILE = { w: 128, h: 64 };
const MAGENTA = [255, 0, 255];

function normalizeToken(s) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '');
}

function tokensOf(s) {
  return s
    .split(/[^A-Za-z0-9]+/)
    .map(normalizeToken)
    .filter(Boolean);
}

/** Wykrywa materiał po ścieżce: najpierw foldery (od najgłębszego), potem nazwa pliku. */
export function detectMaterial(relPath, materialMap = DEFAULT_MATERIAL_MAP) {
  const parts = relPath.split(path.sep);
  const file = parts.pop() || '';
  const dirs = parts.reverse(); // od najgłębszego
  const fileBase = file.replace(/\.png$/i, '');

  const candidates = [
    ...dirs.flatMap((d) => tokensOf(d)),
    ...tokensOf(fileBase),
  ];

  for (const token of candidates) {
    if (Object.prototype.hasOwnProperty.call(materialMap, token)) {
      return { material: token, kind: materialMap[token] };
    }
  }
  return { material: null, kind: null };
}

/** Rozmiar kafla z nazwy pliku ("... 128x64.png"); brak -> domyślny. */
export function detectTileSize(fileName, fallback = DEFAULT_TILE) {
  const m = fileName.match(/(\d{2,4})\s*[x×]\s*(\d{2,4})/i);
  if (!m) return { ...fallback, detected: false };
  return { w: Number(m[1]), h: Number(m[2]), detected: true };
}

function walkPng(dir, root = dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name);
    const rel = path.relative(root, full);
    if (e.isDirectory()) {
      // `demo/` to fixture'y repo, nie pack
      if (e.name.toLowerCase() === 'demo') continue;
      walkPng(full, root, out);
    } else if (e.name.toLowerCase().endsWith('.png')) {
      out.push({ full, rel });
    }
  }
  return out;
}

function isBlankTile(data) {
  let anyVisible = false;
  let allMagenta = true;
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i], g = data[i + 1], b = data[i + 2], a = data[i + 3];
    if (a !== 0) anyVisible = true;
    if (!(r === MAGENTA[0] && g === MAGENTA[1] && b === MAGENTA[2])) allMagenta = false;
    if (anyVisible && !allMagenta) return false;
  }
  return !anyVisible || allMagenta;
}

function cropTile(src, sx, sy, w, h) {
  const dst = new PNG({ width: w, height: h });
  for (let y = 0; y < h; y++) {
    const s = ((sy + y) * src.width + sx) * 4;
    const d = y * w * 4;
    src.data.copy(dst.data, d, s, s + w * 4);
  }
  return dst;
}

function hashTile(png) {
  return crypto.createHash('sha1')
    .update(`${png.width}x${png.height}:`)
    .update(png.data)
    .digest('hex');
}

/** Równomierny wybór k elementów z listy (deterministyczny). */
function pickEvenly(list, k) {
  if (k <= 0 || k >= list.length) return list.slice();
  if (k === 1) return [list[0]];
  const out = [];
  for (let i = 0; i < k; i++) {
    out.push(list[Math.round((i * (list.length - 1)) / (k - 1))]);
  }
  return [...new Set(out)];
}

/**
 * @param {object} opts
 * @param {string} [opts.inputDir]   katalog z packiem
 * @param {string} [opts.outputDir]  katalog wynikowy
 * @param {number} [opts.perMaterial] ile kafli na rodzaj (0 = wszystkie)
 * @param {object} [opts.materialMap] nadpisania mapowania
 * @param {boolean} [opts.dryRun]
 * @param {boolean} [opts.verbose]
 */
export function importIsotilePack(opts = {}) {
  const inputDir = path.resolve(opts.inputDir || 'assets/source/isotilepack');
  const outputDir = path.resolve(opts.outputDir || 'assets/source_pack');
  const perMaterial = opts.perMaterial === undefined ? 4 : Number(opts.perMaterial);
  const materialMap = { ...DEFAULT_MATERIAL_MAP, ...(opts.materialMap || {}) };
  const dryRun = Boolean(opts.dryRun);

  if (!fs.existsSync(inputDir)) {
    throw new Error(`Brak katalogu wejściowego: ${inputDir}\nPobierz pack z itch.io i rozpakuj tu wariant Small 128x64.`);
  }

  const files = walkPng(inputDir);
  if (!files.length) {
    throw new Error(`Brak plików PNG w ${inputDir}`);
  }
  // Kolejność deterministyczna: bez tego deduplikacja i wybór kafli zależą
  // od kolejności wpisów w systemie plików.
  files.sort((a, b) => a.rel.localeCompare(b.rel));

  const seen = new Set();
  const byKind = new Map(GROUND_KINDS.map((k) => [k, []]));
  const skipped = { blank: 0, duplicate: 0, unmapped: 0, badSize: 0 };
  const unmappedMaterials = new Map();
  let sheets = 0;
  let singleTiles = 0;
  let totalTiles = 0;

  for (const { full, rel } of files) {
    const { material, kind } = detectMaterial(rel, materialMap);
    const png = PNG.sync.read(fs.readFileSync(full));
    const tile = detectTileSize(path.basename(full));

    if (png.width % tile.w !== 0 || png.height % tile.h !== 0) {
      skipped.badSize++;
      if (opts.verbose) {
        console.warn(`  ! pominięto ${rel}: ${png.width}x${png.height} nie dzieli się przez ${tile.w}x${tile.h}`);
      }
      continue;
    }

    const cols = png.width / tile.w;
    const rows = png.height / tile.h;
    if (cols * rows > 1) sheets++; else singleTiles++;

    for (let ty = 0; ty < rows; ty++) {
      for (let tx = 0; tx < cols; tx++) {
        const t = cropTile(png, tx * tile.w, ty * tile.h, tile.w, tile.h);
        totalTiles++;

        if (isBlankTile(t.data)) { skipped.blank++; continue; }

        const h = hashTile(t);
        if (seen.has(h)) { skipped.duplicate++; continue; }
        seen.add(h);

        if (!kind) {
          skipped.unmapped++;
          const key = material || '(nierozpoznany)';
          unmappedMaterials.set(key, (unmappedMaterials.get(key) || 0) + 1);
          continue;
        }

        byKind.get(kind).push({ png: t, source: `${rel}#${ty * cols + tx}` });
      }
    }
  }

  // Kuracja: równomiernie z każdego rodzaju, deterministycznie po źródle.
  const selected = [];
  const report = [];
  for (const kind of GROUND_KINDS) {
    const list = byKind.get(kind).slice().sort((a, b) => a.source.localeCompare(b.source));
    if (!list.length) continue;
    const picked = perMaterial > 0 ? pickEvenly(list, perMaterial) : list;
    picked.forEach((t, i) => {
      selected.push({ kind, index: i + 1, png: t.png, source: t.source });
    });
    report.push({ kind, found: list.length, picked: picked.length });
  }

  if (!dryRun) {
    fs.mkdirSync(outputDir, { recursive: true });
    // Usuń stare <kind>_*.png, żeby nie zostawały osierocone warianty.
    for (const f of fs.readdirSync(outputDir)) {
      if (/^[a-z]+_\d{2}\.png$/.test(f)) fs.unlinkSync(path.join(outputDir, f));
    }
    for (const s of selected) {
      const name = `${s.kind}_${String(s.index).padStart(2, '0')}.png`;
      fs.writeFileSync(path.join(outputDir, name), PNG.sync.write(s.png));
    }
    writeNotice(outputDir, { inputDir, perMaterial, selected: selected.length, report, unmappedMaterials, totalTiles, skipped });
  }

  return {
    files: files.length, sheets, singleTiles, totalTiles,
    selected: selected.length, report, skipped, unmappedMaterials,
    outputDir, dryRun,
  };
}

function writeNotice(outputDir, info) {
  const lines = [
    '# NOTICE — źródło assetów',
    '',
    'Ten katalog zawiera **pochodne** kafli z packa:',
    '',
    '- **Isometric Tiles — Floor Pack** — Screaming Brain Studios',
    '- <https://screamingbrainstudios.itch.io/isotilepack>',
    '- Licencja: **Creative Commons Zero v1.0 Universal (CC0 1.0)**',
    '- Autor zezwala na użycie komercyjne i niekomercyjne bez obowiązku atribucji.',
    '',
    'Pack źródłowy **nie jest** commitowany do repozytorium. Zawartość tego katalogu',
    'powstała przez wycięcie arkuszy i wybór podzbioru (`tools/import-isotilepack.mjs`).',
    '',
    'Wygenerowano: ' + new Date().toISOString(),
    `Pozycje: ${info.selected ?? ''}`,
    '',
    '## Wybrane rodzaje',
    '',
    '| rodzaj | znalezione | wybrane |',
    '| --- | ---: | ---: |',
    ...info.report.map((r) => `| ${r.kind} | ${r.found} | ${r.picked} |`),
    '',
  ];
  if (info.unmappedMaterials.size) {
    lines.push('## Pominięte materiały (brak odpowiednika w GROUND_SPEC)', '');
    for (const [name, count] of [...info.unmappedMaterials].sort()) {
      lines.push(`- ${name}: ${count}`);
    }
    lines.push('');
  }
  fs.writeFileSync(path.join(outputDir, 'NOTICE.md'), lines.join('\n'));
}

// --- CLI ---------------------------------------------------------------

function parseArgs(argv) {
  const opts = { perMaterial: 4, dryRun: false, verbose: false, materialMap: {} };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--dry-run') opts.dryRun = true;
    else if (a === '--verbose') opts.verbose = true;
    else if (a === '--all') opts.perMaterial = 0;
    else if (a === '--in') opts.inputDir = argv[++i];
    else if (a === '--out') opts.outputDir = argv[++i];
    else if (a === '--per-material') opts.perMaterial = Number(argv[++i]);
    else if (a === '--map') {
      for (const pair of String(argv[++i]).split(',')) {
        const [k, v] = pair.split('=');
        if (k) opts.materialMap[normalizeToken(k)] = v === 'skip' ? null : v;
      }
    } else if (a === '--help' || a === '-h') {
      console.log(`Użycie: node tools/import-isotilepack.mjs [opcje]
  --in <dir>            katalog z packiem (domyślnie assets/source/isotilepack)
  --out <dir>           katalog wynikowy (domyślnie assets/source_pack)
  --per-material <n>    ile kafli na rodzaj (domyślnie 4, 0 = wszystkie)
  --all                 skrót na --per-material 0
  --map k=v,...         nadpisz mapowanie, np. --map brick=tile,ice=skip
  --dry-run             tylko raport, bez zapisu
  --verbose             ostrzeżenia o pominiętych plikach`);
      process.exit(0);
    }
  }
  return opts;
}

if (process.argv[1] && process.argv[1].endsWith('import-isotilepack.mjs')) {
  try {
    const res = importIsotilePack(parseArgs(process.argv.slice(2)));
    console.log(`[IMPORT] Pliki: ${res.files}, arkusze: ${res.sheets}, pojedyncze: ${res.singleTiles}, kafli: ${res.totalTiles}`);
    for (const r of res.report) {
      console.log(`  ${r.kind.padEnd(10)} znaleziono ${String(r.found).padStart(3)} -> wybrano ${r.picked}`);
    }
    const s = res.skipped;
    console.log(`[IMPORT] Pominięto: puste ${s.blank}, duplikaty ${s.duplicate}, bez mapowania ${s.unmapped}, zły rozmiar ${s.badSize}`);
    if (res.unmappedMaterials.size) {
      console.log('[IMPORT] Materiały bez odpowiednika: ' + [...res.unmappedMaterials].map(([k, v]) => `${k} (${v})`).join(', '));
    }
    console.log(res.dryRun
      ? `[IMPORT] Dry-run: nic nie zapisano (byłoby ${res.selected} plików).`
      : `[IMPORT] Zapisano ${res.selected} plików do ${res.outputDir}`);
    if (!res.dryRun) {
      console.log('[IMPORT] Dalej: npm run pipeline:pack');
    }
  } catch (e) {
    console.error(`[IMPORT] BŁĄD: ${e.message}`);
    process.exit(1);
  }
}
