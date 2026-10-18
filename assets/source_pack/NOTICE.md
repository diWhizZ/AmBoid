# NOTICE — źródło assetów

Ten katalog zawiera **pochodne** kafli z packa:

- **Isometric Tiles — Floor Pack** — Screaming Brain Studios
- <https://screamingbrainstudios.itch.io/isotilepack>
- Licencja: **Creative Commons Zero v1.0 Universal (CC0 1.0)**
- Autor zezwala na użycie komercyjne i niekomercyjne bez obowiązku atribucji.

Pack źródłowy **nie jest** commitowany do repozytorium. Zawartość tego katalogu
powstała przez wycięcie arkuszy i wybór podzbioru (`tools/import-isotilepack.mjs`).

Wygenerowano: 2026-10-18T23:38:36.503Z
Pozycje: 90

## Odtworzenie

```bash
node tools/import-isotilepack.mjs --per-material 8 --only "Floor Tiles" --pick water=1-18
npm run pipeline:pack
```

Materiały 2:1 mapowane na `GROUND_SPEC` z `src/art.js`; kafle o innej
geometrii (ściany) są pomijane.

## Wybrane rodzaje

| rodzaj | znalezione | wybrane |
| --- | ---: | ---: |
| grass | 72 | 8 |
| dirt | 36 | 8 |
| asphalt | 36 | 8 |
| sidewalk | 36 | 8 |
| wood | 36 | 8 |
| tile | 36 | 8 |
| carpet | 36 | 8 |
| water | 36 | 18 |
| concrete | 72 | 8 |
| gravel | 72 | 8 |

## Pominięte materiały (brak odpowiednika w GROUND_SPEC)

- ice: 36
