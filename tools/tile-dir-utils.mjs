// Wspólne pomocniki katalogów wynikowych pipeline'u kafli.
//
// Pipeline tylko dopisuje pliki do katalogów produktów (clean_128, tiles_64,
// tiles_32, quantized_64). Gdy zmieni się źródło — np. z proceduralnego
// `assets/source_tiles` na `assets/source_pack` — stare pliki zostają i wchodzą
// do atlasu (osierocone `path_01`, `stone_01`). Dlatego każdy etap sprząta
// pliki, których nie ma na liście wejściowej.
import fs from 'node:fs';
import path from 'node:path';

/**
 * Usuwa z katalogu wynikowego pliki PNG, których nie ma wśród produkowanych nazw.
 * @returns {string[]} lista usuniętych plików
 */
export function pruneStaleTiles(outDir, keepNames) {
  if (!keepNames.length) return []; // bezpiecznik: puste wejście nie czyści katalogu
  if (!fs.existsSync(outDir)) return [];

  const keep = new Set(keepNames);
  const removed = [];
  for (const f of fs.readdirSync(outDir)) {
    if (!f.toLowerCase().endsWith('.png') || keep.has(f)) continue;
    fs.unlinkSync(path.join(outDir, f));
    removed.push(f);
  }
  return removed;
}

/** Loguje wynik sprzątania w jednolitym formacie. */
export function logPruned(tag, removed, where = '') {
  if (!removed.length) return;
  console.log(`[${tag}] Usunięto ${removed.length} osieroconych plików${where ? ` w ${where}` : ''}: ${removed.join(', ')}`);
}
