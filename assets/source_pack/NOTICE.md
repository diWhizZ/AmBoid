# NOTICE — źródło assetów

Ten katalog zawiera **pochodne** kafli z packa:

- **Isometric Tiles — Floor Pack** — Screaming Brain Studios
- <https://screamingbrainstudios.itch.io/isotilepack>
- Licencja: **Creative Commons Zero v1.0 Universal (CC0 1.0)**
- Autor zezwala na użycie komercyjne i niekomercyjne bez obowiązku atribucji.

Pack źródłowy **nie jest** commitowany do repozytorium. Zawartość tego katalogu
powstała przez wycięcie arkuszy i wybór podzbioru (`tools/import-isotilepack.mjs`).

Wygenerowano: 2026-10-18T23:55:24.463Z
Pozycje: 88

## Odtworzenie

```bash
node tools/import-isotilepack.mjs --per-material 8 --only "Floor Tiles" --also "assets/source_tiles" --pick water=1-18
npm run pipeline:pack
```

Materiały 2:1 mapowane na `GROUND_SPEC` z `src/art.js`; kafle o innej
geometrii (ściany) są pomijane.

## Wybrane rodzaje

| rodzaj | znalezione | wybrane | źródło |
| --- | ---: | ---: | --- |
| grass | 72 | 8 | pack |
| dirt | 36 | 8 | pack |
| asphalt | 6 | 6 | własne (`--also`) |
| sidewalk | 36 | 8 | pack |
| wood | 36 | 8 | pack |
| tile | 36 | 8 | pack |
| carpet | 36 | 8 | pack |
| water | 36 | 18 | pack |
| concrete | 108 | 8 | pack |
| gravel | 72 | 8 | pack |

## Rodzaje spoza packa

Pack nie ma kafli tych rodzajów — pochodzą z katalogu podanego w `--also`
(wypalone z `src/art.js`, `tools/bake-ground-tiles.mjs`):

- asphalt: 6

## Pominięte materiały (brak odpowiednika w GROUND_SPEC)

- ice: 36
