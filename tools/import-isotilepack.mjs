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
  // "Stone" w tym packu to płyty kamienne (bruk) — nasze jezdnie.
  stone: 'asphalt', asphalt: 'asphalt',
  concrete: 'concrete', metal: 'concrete', steel: 'concrete',
  // "Grill" to kratki i ryfle metalowe — podłoga przemysłowa, nie droga.
  grill: 'concrete', grate: 'concrete',
  brick: 'sidewalk', sidewalk: 'sidewalk', pavement: 'sidewalk', paving: 'sidewalk',
  tile: 'tile', ceramic: 'tile', mosaic: 'tile',
  // "Pattern" w tym packu to wzorzyste wykładziny/dywany, nie kafle.
  carpet: 'carpet', rug: 'carpet', pattern: 'carpet',
  wood: 'wood', plank: 'wood', parquet: 'wood',
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

/** Wybór po numerach (1-based) z listy kandydatów danego rodzaju. */
function pickByNumbers(list, numbers, kind) {
  return numbers.map((n) => {
    const idx = Number(n) - 1;
    if (!Number.isInteger(idx) || idx < 0 || idx >= list.length) {
      throw new Error(`--pick ${kind}=${n}: poza zakresem, dostępne 1..${list.length}`);
    }
    return list[idx];
  });
}

/** "1,3,5-8" -> [1,3,5,6,7,8] (zakresy i pojedyncze numery). */
export function parsePickNumbers(spec) {
  const out = [];
  for (const part of String(spec).split(',')) {
    const m = part.trim().match(/^(\d+)\s*-\s*(\d+)$/);
    if (m) {
      for (let i = Number(m[1]); i <= Number(m[2]); i++) out.push(i);
    } else if (part.trim() !== '') {
      out.push(Number(part.trim()));
    }
  }
  return out;
}

/** [1,2,3,4,7,8] -> "1-4,7,8" (odwrotność parsePickNumbers, do NOTICE). */
export function formatPickNumbers(nums) {
  const out = [];
  let i = 0;
  while (i < nums.length) {
    let j = i;
    while (j + 1 < nums.length && nums[j + 1] === nums[j] + 1) j++;
    if (j - i >= 2) out.push(`${nums[i]}-${nums[j]}`);
    else for (let k = i; k <= j; k++) out.push(String(nums[k]));
    i = j + 1;
  }
  return out.join(',');
}

/**
 * Kontaktówka: wiersz = rodzaj, kolumny = wybrane kafle (skala 2x, tło szachownica).
 * Służy do oceny wyboru przed uruchomieniem pipeline'u.
 */
export function renderPreview(rows, outPath, scale = 2, maxCols = 0) {
  const tileW = 128 * scale, tileH = 64 * scale, pad = 4;
  let cols = Math.max(1, ...rows.map((r) => r.pngs.length));
  if (maxCols > 0) cols = Math.min(cols, maxCols);
  const sheet = new PNG({ width: pad + cols * (tileW + pad), height: pad + rows.length * (tileH + pad) });

  for (let y = 0; y < sheet.height; y++) {
    for (let x = 0; x < sheet.width; x++) {
      const i = (y * sheet.width + x) * 4;
      const c = ((x >> 3) + (y >> 3)) % 2 ? 90 : 140;
      sheet.data[i] = c; sheet.data[i + 1] = c; sheet.data[i + 2] = c; sheet.data[i + 3] = 255;
    }
  }

  rows.forEach((row, r) => {
    row.pngs.slice(0, cols).forEach((p, c) => {
      const ox = pad + c * (tileW + pad);
      const oy = pad + r * (tileH + pad);
      for (let y = 0; y < p.height; y++) {
        for (let x = 0; x < p.width; x++) {
          const s = (y * p.width + x) * 4;
          const a = p.data[s + 3] / 255;
          for (let dy = 0; dy < scale; dy++) {
            for (let dx = 0; dx < scale; dx++) {
              const d = ((oy + y * scale + dy) * sheet.width + ox + x * scale + dx) * 4;
              sheet.data[d] = Math.round(p.data[s] * a + sheet.data[d] * (1 - a));
              sheet.data[d + 1] = Math.round(p.data[s + 1] * a + sheet.data[d + 1] * (1 - a));
              sheet.data[d + 2] = Math.round(p.data[s + 2] * a + sheet.data[d + 2] * (1 - a));
              sheet.data[d + 3] = 255;
            }
          }
        }
      }
    });
  });

  fs.mkdirSync(path.dirname(path.resolve(outPath)), { recursive: true });
  fs.writeFileSync(path.resolve(outPath), PNG.sync.write(sheet));
  return { width: sheet.width, height: sheet.height, rows: rows.length, cols };
}

/**
 * Katalog kandydatów (indeksy do --pick) — pełna lista per rodzaj.
 */
export function writeCatalogue(outPath, catalog) {
  const lines = [
    '# Kandydaci do --pick (1-based, kolejność = sortowanie po ścieżce)',
    '# Kolumny w kontaktówce (--preview) mają tę samą kolejność.',
    '',
  ];
  for (const { kind, items } of catalog) {
    lines.push(`${kind} (${items.length})`);
    items.forEach((it, i) => lines.push(`  ${String(i + 1).padStart(3)}  ${it.source}`));
    lines.push('');
  }
  fs.mkdirSync(path.dirname(path.resolve(outPath)), { recursive: true });
  fs.writeFileSync(path.resolve(outPath), lines.join('\n'));
}

/**
 * @param {object} opts
 * @param {string} [opts.inputDir]   katalog z packiem
 * @param {string} [opts.outputDir]  katalog wynikowy
 * @param {number} [opts.perMaterial] ile kafli na rodzaj (0 = wszystkie)
 * @param {object} [opts.materialMap] nadpisania mapowania
 * @param {string[]} [opts.only]     tylko ścieżki zawierające fragment
 * @param {string[]} [opts.exclude]  pomiń ścieżki zawierające fragment
 * @param {object} [opts.picks]      ręczny wybór: { grass: [1, 5, 9] } (1-based)
 * @param {string} [opts.preview]    ścieżka kontaktówki PNG (ocena wyboru)
 * @param {string} [opts.list]       ścieżka katalogu kandydatów (numery do --pick)
 * @param {boolean} [opts.dryRun]
 * @param {boolean} [opts.verbose]
 */
export function importIsotilePack(opts = {}) {
  const inputDir = path.resolve(opts.inputDir || 'assets/source/isotilepack');
  const outputDir = path.resolve(opts.outputDir || 'assets/source_pack');
  const perMaterial = opts.perMaterial === undefined ? 4 : Number(opts.perMaterial);
  const picks = opts.picks || {};
  const materialMap = { ...DEFAULT_MATERIAL_MAP, ...(opts.materialMap || {}) };
  const dryRun = Boolean(opts.dryRun);
  // Do NOTICE zapisujemy oryginalne fragmenty (z wielkością liter), a do
  // dopasowania — wersje małymi literami.
  const onlyRaw = (opts.only || []).map(String);
  const excludeRaw = (opts.exclude || []).map(String);
  const only = onlyRaw.map((s) => s.toLowerCase());
  const exclude = excludeRaw.map((s) => s.toLowerCase());

  if (!fs.existsSync(inputDir)) {
    throw new Error(`Brak katalogu wejściowego: ${inputDir}\nPobierz pack z itch.io i rozpakuj tu wariant Small 128x64.`);
  }

  // Kolejność deterministyczna: bez tego deduplikacja i wybór kafli zależą
  // od kolejności wpisów w systemie plików.
  const files = walkPng(inputDir).sort((a, b) => a.rel.localeCompare(b.rel));
  if (!files.length) {
    throw new Error(`Brak plików PNG w ${inputDir}`);
  }

  // Filtry ścieżek: pack potrafi zawierać kilka zestawów naraz (podłogi, ściany,
  // overworld), a my chcemy tylko wybrane.
  const selectedFiles = files.filter(({ rel }) => {
    const lower = rel.toLowerCase();
    if (only.length && !only.some((s) => lower.includes(s))) return false;
    if (exclude.some((s) => lower.includes(s))) return false;
    return true;
  });
  if (!selectedFiles.length) {
    throw new Error(`Filtry --only/--exclude odrzuciły wszystkie pliki (z ${files.length}).`);
  }

  const seen = new Set();
  const byKind = new Map(GROUND_KINDS.map((k) => [k, []]));
  const skipped = { blank: 0, duplicate: 0, unmapped: 0, badSize: 0, wrongAspect: 0 };
  const unmappedMaterials = new Map();
  const wrongAspectDirs = new Map();
  let sheets = 0;
  let singleTiles = 0;
  let totalTiles = 0;

  for (const { full, rel } of selectedFiles) {
    const { material, kind } = detectMaterial(rel, materialMap);
    const png = PNG.sync.read(fs.readFileSync(full));
    const tile = detectTileSize(path.basename(full));

    // Pipeline jest ściśle 2:1 (128x64 -> 64x32 -> 32x16). Ściany (64x96,
    // 72x100) i "thick" overworld (128x72) przewracają geometrię — odrzucamy.
    if (tile.w !== tile.h * 2) {
      skipped.wrongAspect++;
      const dir = rel.split(path.sep).slice(0, -1).join('/') || '.';
      wrongAspectDirs.set(dir, (wrongAspectDirs.get(dir) || 0) + 1);
      if (opts.verbose) {
        console.warn(`  ! pominięto ${rel}: kafel ${tile.w}x${tile.h} nie jest 2:1`);
      }
      continue;
    }

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

        byKind.get(kind).push({ png: t, rel, pos: ty * cols + tx, source: `${rel}#${ty * cols + tx}` });
      }
    }
  }

  // Kuracja: ręcznie (--pick) albo równomiernie, deterministycznie po źródle.
  const selected = [];
  const report = [];
  const previewRows = [];
  const catalog = [];
  for (const kind of GROUND_KINDS) {
    // Kolejność: najpierw ścieżka, potem numer kafla w arkuszu (liczbowo, nie
    // leksykograficznie — inaczej #10 wypada przed #2).
    const list = byKind.get(kind).slice().sort((a, b) => a.rel.localeCompare(b.rel) || a.pos - b.pos);
    if (!list.length) continue;
    const picked = picks[kind] && picks[kind].length
      ? pickByNumbers(list, picks[kind], kind)
      : (perMaterial > 0 ? pickEvenly(list, perMaterial) : list);
    picked.forEach((t, i) => {
      selected.push({ kind, index: i + 1, png: t.png, source: t.source });
    });
    previewRows.push({ kind, pngs: picked.map((t) => t.png) });
    catalog.push({ kind, items: list });
    report.push({ kind, found: list.length, picked: picked.length });
  }

  const preview = opts.preview ? renderPreview(previewRows, opts.preview, 2, opts.previewCols || 0) : null;
  if (opts.list) writeCatalogue(opts.list, catalog);

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
    writeNotice(outputDir, { inputDir, perMaterial, picks, only: onlyRaw, exclude: excludeRaw, selected: selected.length, report, unmappedMaterials, totalTiles, skipped });
  }

  return {
    files: files.length, usedFiles: selectedFiles.length, sheets, singleTiles, totalTiles,
    selected: selected.length, report, skipped, unmappedMaterials, wrongAspectDirs,
    outputDir, dryRun, preview, catalogPath: opts.list ? path.resolve(opts.list) : null,
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
    '## Odtworzenie',
    '',
    '```bash',
    ('node tools/import-isotilepack.mjs --per-material ' + (info.perMaterial ?? 4)
      + (info.only && info.only.length ? info.only.map((s) => ` --only "${s}"`).join('') : '')
      + (info.exclude && info.exclude.length ? info.exclude.map((s) => ` --exclude "${s}"`).join('') : '')
      + Object.entries(info.picks || {}).map(([k, v]) => ` --pick ${k}=${formatPickNumbers(v)}`).join('')),
    'npm run pipeline:pack',
    '```',
    '',
    'Materiały 2:1 mapowane na `GROUND_SPEC` z `src/art.js`; kafle o innej',
    'geometrii (ściany) są pomijane.',
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
  const opts = { perMaterial: 4, dryRun: false, verbose: false, materialMap: {}, only: [], exclude: [], picks: {} };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--dry-run') opts.dryRun = true;
    else if (a === '--verbose') opts.verbose = true;
    else if (a === '--all') opts.perMaterial = 0;
    else if (a === '--in') opts.inputDir = argv[++i];
    else if (a === '--out') opts.outputDir = argv[++i];
    else if (a === '--per-material') opts.perMaterial = Number(argv[++i]);
    else if (a === '--only' || a === '--include') opts.only.push(argv[++i]);
    else if (a === '--exclude') opts.exclude.push(argv[++i]);
    else if (a === '--preview') opts.preview = argv[++i];
    else if (a === '--preview-cols') opts.previewCols = Number(argv[++i]);
    else if (a === '--list') opts.list = argv[++i];
    else if (a === '--pick') {
      const [kind, nums] = String(argv[++i]).split('=');
      if (!kind || !nums) {
        console.error('[IMPORT] --pick wymaga formatu rodzaj=1,2,3, np. --pick grass=1,5,9');
        process.exit(1);
      }
      opts.picks[kind.trim()] = parsePickNumbers(nums);
    } else if (a === '--map') {
      for (const pair of String(argv[++i]).split(',')) {
        const [k, v] = pair.split('=');
        if (k) opts.materialMap[normalizeToken(k)] = v === 'skip' ? null : v;
      }
    } else if (a === '--help' || a === '-h') {
      console.log(`Użycie: node tools/import-isotilepack.mjs [opcje]
  --in <dir>            katalog z packiem (domyślnie assets/source/isotilepack)
  --out <dir>           katalog wynikowy (domyślnie assets/source_pack)
  --only <fragment>     tylko ścieżki zawierające fragment (można powtarzać)
  --exclude <fragment>  pomiń ścieżki zawierające fragment (można powtarzać)
  --per-material <n>    ile kafli na rodzaj (domyślnie 4, 0 = wszystkie)
  --all                 skrót na --per-material 0
  --pick <rodzaj=i,j-l> ręczny wybór kafli po numerach (1-based, zakresy); powtarzalne
  --preview <plik.png>  kontaktówka wybranych kafli (ocena przed pipeline'em)
  --preview-cols <n>    ogranicz liczbę kolumn kontaktówki (eksploracja)
  --list <plik.txt>     katalog kandydatów z numerami (do --pick)
  --map k=v,...         nadpisz mapowanie, np. --map brick=tile,ice=skip
  --dry-run             tylko raport, bez zapisu
  --verbose             ostrzeżenia o pominiętych plikach

Kafle inne niż 2:1 (ściany 64x96, 72x100, "thick" 128x72) są zawsze pomijane:
pipeline graficzny jest ściśle 2:1 (128x64 -> 64x32 -> 32x16).`);
      process.exit(0);
    }
  }
  return opts;
}

if (process.argv[1] && process.argv[1].endsWith('import-isotilepack.mjs')) {
  try {
    const res = importIsotilePack(parseArgs(process.argv.slice(2)));
    console.log(`[IMPORT] Pliki: ${res.files}${res.usedFiles !== res.files ? ` (po filtrach: ${res.usedFiles})` : ''}, arkusze: ${res.sheets}, pojedyncze: ${res.singleTiles}, kafli: ${res.totalTiles}`);
    for (const r of res.report) {
      console.log(`  ${r.kind.padEnd(10)} znaleziono ${String(r.found).padStart(3)} -> wybrano ${r.picked}`);
    }
    const s = res.skipped;
    console.log(`[IMPORT] Pominięto: puste ${s.blank}, duplikaty ${s.duplicate}, bez mapowania ${s.unmapped}, zły rozmiar ${s.badSize}, nie 2:1 ${s.wrongAspect}`);
    if (res.wrongAspectDirs.size) {
      const top = [...res.wrongAspectDirs].sort((a, b) => b[1] - a[1]).slice(0, 5);
      console.log('[IMPORT] Poza geometrią 2:1 (pominięte):');
      for (const [dir, n] of top) console.log(`   ${dir} (${n})`);
      if (res.wrongAspectDirs.size > top.length) console.log(`   ...i ${res.wrongAspectDirs.size - top.length} dalszych katalogów`);
    }
    if (res.unmappedMaterials.size) {
      console.log('[IMPORT] Materiały bez odpowiednika: ' + [...res.unmappedMaterials].map(([k, v]) => `${k} (${v})`).join(', '));
    }
    const missing = res.report.length;
    console.log(`[IMPORT] Rodzaje pokryte: ${missing}/${GROUND_KINDS.length}`);
    if (res.preview) console.log(`[IMPORT] Kontaktówka: ${res.preview.width}x${res.preview.height} (${res.preview.rows} rodzajów x ${res.preview.cols})`);
    if (res.catalogPath) console.log(`[IMPORT] Katalog kandydatów: ${res.catalogPath}`);
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
