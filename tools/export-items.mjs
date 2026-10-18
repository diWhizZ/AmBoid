// Narzędzie walidujące definicje przedmiotów oraz generujące struktury C dla Amigi.
import fs from 'node:fs';
import path from 'node:path';

export function validateAndExportItems(jsonPath = 'data/items.json', outHeaderPath = 'docs/amiga/items_data.h') {
  if (!fs.existsSync(jsonPath)) {
    throw new Error(`Brak pliku definicji przedmiotów: ${jsonPath}`);
  }

  const items = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
  const itemKeys = Object.keys(items);
  console.log(`[EXPORT-ITEMS] Walidacja ${itemKeys.length} przedmiotów z ${jsonPath}...`);

  const errors = [];
  const validatedItems = [];

  for (const [key, it] of Object.entries(items)) {
    if (!it.id) errors.push(`Przedmiot ${key} nie posiada pola id`);
    if (!it.name) errors.push(`Przedmiot ${key} nie posiada pola name`);
    if (it.stackable == null) errors.push(`Przedmiot ${key} nie posiada flagi stackable (true/false)`);
    if (!it.max_stack || it.max_stack < 1) errors.push(`Przedmiot ${key} ma niepoprawny max_stack: ${it.max_stack}`);
    if (it.weight == null || it.weight < 0) errors.push(`Przedmiot ${key} ma niepoprawną wagę: ${it.weight}`);

    // Reguły specyfikacji
    if (it.stackable && it.max_stack === 1 && it.id !== 'key') {
      console.warn(`[WARN] Przedmiot ${key} jest oznaczony jako stackable, ale max_stack = 1`);
    }
    if (!it.stackable && it.max_stack > 1) {
      errors.push(`Przedmiot ${key} jest niestackowalny, ale ma max_stack > 1 (${it.max_stack})`);
    }

    validatedItems.push({
      key,
      id: it.id,
      name: it.name,
      stackable: !!it.stackable,
      max_stack: it.max_stack || 1,
      weight: it.weight || 0.1,
      category: it.category || it.type || 'general',
      use: it.use || 'none',
      value: it.value || 0,
      durability: it.durability || 0,
    });
  }

  if (errors.length > 0) {
    console.error(`[EXPORT-ITEMS] Wykryto ${errors.length} błędów w definicjach:`);
    errors.forEach((e) => console.error(`  - ${e}`));
    throw new Error('Błędy walidacji przedmiotów!');
  }

  console.log(`[EXPORT-ITEMS] Wszystkie przedmioty poprawne.`);

  // Generowanie nagłówka C dla Amigi
  fs.mkdirSync(path.dirname(outHeaderPath), { recursive: true });
  const cHeader = `/* AMBOID - Wygenerowane definicje przedmiotow dla AmigaOS i Bare Metal */
#ifndef AMBOID_ITEMS_DATA_H
#define AMBOID_ITEMS_DATA_H

#include <exec/types.h>

#define TOTAL_ITEM_TYPES ${validatedItems.length}

typedef struct {
    UWORD id;
    const char *name;
    BOOL  stackable;
    UWORD max_stack;
    UWORD weight_grams; /* waga w gramach (stały przecinek) */
    UWORD value;
    UWORD max_durability;
} ItemDefC;

/* ID przedmiotow */
${validatedItems.map((it, idx) => `#define ITEM_ID_${it.id.toUpperCase()} ${idx + 1}`).join('\n')}

/* Tabela definicji */
static const ItemDefC ITEM_DEFS[TOTAL_ITEM_TYPES] = {
${validatedItems.map((it, idx) => `    { ${idx + 1}, "${it.name}", ${it.stackable ? 'TRUE' : 'FALSE'}, ${it.max_stack}, ${Math.round(it.weight * 1000)}, ${it.value}, ${it.durability} }`).join(',\n')}
};

#endif /* AMBOID_ITEMS_DATA_H */
`;

  fs.writeFileSync(outHeaderPath, cHeader);
  console.log(`[EXPORT-ITEMS] Zapisano nagłówek C: ${outHeaderPath}`);
  return validatedItems;
}

// Uruchomienie jako CLI
if (process.argv[1] && process.argv[1].endsWith('export-items.mjs')) {
  validateAndExportItems();
}
