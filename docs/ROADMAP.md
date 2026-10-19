# AMBOID — roadmapa i dług techniczny

Stan na **2026-10-19**:

- `main` = `6e04e82` (**PR #6 i #7 scalone**: port Amigi + pipeline + moduły +
  import packa CC0),
- tagi i Release: `v0.2.4`, `v0.2.5`,
- gałąź bieżąca: `feat/asphalt-floors` (własne kafle podłóg — wypalanie z gry),
- bramka: `npm test` = **215 OK / 0 FAIL**, modular **65/65**, iso **passed**,
  pack **27/27**, bake **5/5**,
- kontekst projektu: [`docs/BIBLIA-PROJEKTU.md`](BIBLIA-PROJEKTU.md),
- dystrybucja: [`docs/WHDLOAD.md`](WHDLOAD.md).

Kolejność etapów pochodzi z `docs/PROMPT-KONTYNUACJA.md`.

## Zrobione (na `main`)

- [x] Port natywny w C/asm: `amiga/` — render AGA/OCS/RTG, Paula, custom input,
      AmigaOS, Makefile. **Uwaga: szkielet, nie działająca gra.**
- [x] Pipeline assetów (kanoniczny): źródła → magenta → skala → paleta 64/32 →
      atlas → `items_data.h`, `sample_map.amb` (AMB2)
- [x] Refaktor modułowy JS: `src/core/{assets,inventory,map}.js`, `src/render/iso_renderer.js`
- [x] `npm run test:modular` (65/65), `npm test` = 215 OK / 0 FAIL
- [x] **Rebase na `main` po PR #5** — 8 konfliktów rozstrzygnięte na korzyść
      naszego pipeline'u; demo z #5 zostaje jako osobny byt (64×32)
- [x] `test:iso` (silnik z #5) dopisany do bramki `npm test`
- [x] **`docs/BIBLIA-PROJEKTU.md`** — kontekst przenośny między środowiskami
- [x] **`docs/WHDLOAD.md`** — plan docelowej dystrybucji
- [x] Instrukcje w README: dodanie tekstury, przedmiotu i mapy (Tiled → AMB2)
- [x] **PR #6 scalony** do `main` (`38d013a`)

## Zrobione na `feat/import-isotilepack` (PR #7, scalone w `main`)

- [x] `tools/import-isotilepack.mjs` — cięcie arkuszy 128×64, detekcja materiału
      z nazw plików/folderów, mapa na `GROUND_SPEC`, deduplikacja, kuracja
      (`--per-material`, domyślnie 4), filtry ścieżek (`--only`/`--exclude`),
      twarda bramka geometrii 2:1, ręczny wybór (`--pick`, także zakresy),
      kontaktówka (`--preview`), katalog kandydatów (`--list`), `NOTICE.md` (CC0)
- [x] `tools/test-isotilepack-import.mjs` — m.in. PNG indeksowany, determinizm,
      filtry, bramka 2:1, `--pick` + zakresy, kontaktówka, katalog kandydatów,
      sprzątanie osieroconych plików, łańcuch clean→resize→quantize;
      wpięty w `npm test`
- [x] `png_mini.js`: obsługa PNG indeksowanych (PLTE + tRNS, 1/2/4/8 bitów)
- [x] Skrypty `import-pack`, `pipeline:pack`, `pipeline:pack:full`, `test:pack`
- [x] `.gitignore`: surowy pack poza repo
- [x] `tools/tile-dir-utils.mjs`: kroki 1–3 usuwają osierocone kafle z
      `clean_128`/`tiles_*`/`quantized_64` (bez tego atlas puchł o szczątki
      poprzedniego źródła — realnie `path_01`, `stone_01` → 92 zamiast 90 kafli)
- [x] Weryfikacja na realnym packu: Floor Pack = 28 arkuszy / 504 kafle;
      `Pattern → carpet`, `Stone/Metal/Grill/Grate → concrete`; ściany
      i overworld odsiane bramką 2:1 (47 plików)
- [x] `assets/source_pack/` = skuratorowany podzbiór + `NOTICE.md` z komendą
      odtworzenia (pack źródłowy zostaje poza repo)

## Zrobione na `feat/asphalt-floors` (własne kafle podłóg)

- [x] `tools/bake-ground-tiles.mjs` — wypala kafle z `buildArt()` do PNG 128×64
      z tłem magenta; liczba wariantów z `GROUND_SPEC`, wynik deterministyczny
- [x] `assets/source_tiles/asphalt_01..06.png` — asfalt, którego pack nie ma
      (×4 z 32×16; `resize-tiles` wraca dokładnie do kafla z przeglądarki)
- [x] `tools/test-bake-ground-tiles.mjs` — 5/5 (geometria, tło, determinizm,
      powrót przez clean-magenta + resize ÷2 ÷2 do 32×16); wpięty w `npm test`
- [x] Importer: `--also <dir>` dokłada rodzaje, których pack nie ma — i tylko
      wtedy, gdy pack nie dał dla nich nic (dwa style nie mieszają się)
- [x] Atlas Amigi z packa + asfaltu: **88 kafli, 10/10 rodzajów**
      (asphalt 0–5, carpet 6–13, …, water 62–79, wood 80–87); zbudowany i oceniony:
      `shots/atlas-vs-source.png`, `shots/pack-final.png`, `shots/asphalt-baked.png`.
      Same produkty (`clean_128`, `tiles_*`, `quantized_64`, `docs/amiga/**`)
      świadomie **nie** wchodzą do repo — czekają na zadanie „pack → gra”, żeby
      nie zostawiać atlasu rozjechanego z `data/tilesets.json`

## Etap 4 — następna wersja (grafika rozgrywki)

Cel z `PROMPT-KONTYNUACJA.md`: małe, rozpoznawalne ikony ekwipunku i łupów
z jednej 16-kolorowej podpalety, bez gradientów. Oszczędne animacje 2–4 klatkowe
i mirroring boków. Efekty limitowane (krew, łuski, dym, błysk wystrzału, ślady
stóp) — nigdy nie rosnące bez końca. Portret i pasek stanu dopracowane w 320×200.

- [ ] Ikony ekwipunku i łupów z jednej podpalety 16 kolorów (`docs/amiga/`, `src/art.js`)
- [ ] **Podłogi z packa CC0** (ścieżka „D + A”): pack pocięty i przemapowany,
      atlas 88 kafli / 10 rodzajów gotowy do oceny; zostaje decyzja o scaleniu
      z grą (patrz niżej)
- [x] Wypalanie własnych kafli podłóg z gry (`bake-ground-tiles.mjs`) — asfalt,
      którego nie ma w packu
- [ ] Animacje 2–4 klatkowe + mirroring boków dla postaci i rekwizytów
- [ ] Efekty z twardym limitem instancji (krew, łuski, dym, błysk, ślady stóp)
- [ ] Portret gracza + pasek stanu w 320×200
- [ ] Spójna perspektywa diagonal-down postaci i rekwizytów (jak Cannon Fodder) —
      **bez** zmiany siatki podłogi na ścisłą perspektywę
- [ ] Odświeżone zrzuty `docs/screens` + `npm test` zielone

Uwaga: geometria kafla (`TILE_W/TILE_H/WALL_H`, dziś 32/16/20) pozostaje spójna
między `src/render.js` a `src/art.js`. `255` = przezroczystość.

### Grafika podłóg z packa CC0 — otwarta decyzja

Importer i łańcuch do atlasów działają (`docs/BIBLIA-PROJEKTU.md` §4a). Do
rozstrzygnięcia zostaje **jak pack trafia do gry**:

- **wariant proceduralny (dziś):** `makeGroundTiles` w `src/art.js` rysuje 10
  rodzajów podłóg z `GROUND_SPEC`; zero plików, warianty liczone deterministycznie;
- **wariant „pack”:** atlasy z packa zastępują proceduralne podłogi — wymaga
  przeładowania `data/tilesets.json` (współrzędne atlasów!) i decyzji, czy
  trzymać flagę `?art=pack`, czy przełączyć na stałe.

Rezultat weryfikacji na realnym packu (2026-10-19):

- Floor Pack daje **9 z 10 rodzajów** `GROUND_SPEC`; `Pattern` przemapowane na
  `carpet`, więc `carpet` ma wreszcie źródło plikowe.
- **`Grill/Grate → concrete`**, **`Stone → concrete`** (decyzja): kratki metalowe
  i płyty kamienne to podłoga, nie droga.
- **`asphalt` nie ma źródła w packu** — zrobione: `tools/bake-ground-tiles.mjs`
  wypala `asphalt_01..06` z `src/art.js` do `assets/source_tiles/` (gra rysuje
  ten sam kafel, więc atlas Amigi zgadza się z przeglądarką), a importer dokłada
  je przez `--also`. Sprawdzone wcześniej: `Stone → asphalt` po kwantyzacji
  czyta się jak piaskowiec, nie jezdnia.
- **`water` ← `Elements`**: arkusz `Elements_01` to woda, `Elements_02` to
  bagno/mul — wybrane ręcznie: `--pick water=1-18`.
- **`ice`** pomijane (brak rodzaju); `Wall Pack` (64×96, 72×100) to materiał na
  osobny etap ścian, nie na ten importer.
- Atlas Amigi odtworzony z packa + asfaltu: **88 kafli, 10/10 rodzajów**. Ocena
  wizualna: `shots/pack-final.png` (źródła), `shots/atlas-vs-source.png` (źródło
  vs komórka atlasu), `shots/asphalt-baked.png` (sześć wypalonych asfaltów),
  `shots/compare-kinds.png` (materiały packa), `shots/pack-candidates.txt`
  (numery do `--pick`).

Zadanie „pack → gra” (osobne, otwarte po PR #7):

1. ~~dorysować kafle `asphalt_01..0N`~~ — **zrobione** na `feat/asphalt-floors`
   (`bake-ground-tiles.mjs`, `asphalt_01..06`, `--also`);
2. zamrozić `--pick` dla `water` i liczbę wariantów na rodzaj;
3. przeliczyć `data/tilesets.json`: po przejściu na pack wiszą odwołania
   `tile/stone_01` i `tile/path_01` (zniknęły), a `tile/lava_01` i
   `tile/panel_blinking` nigdy nie miały plików — nazwy podłóg w packu to
   `<rodzaj>_<nn>` (asfalt daje wypalanie, więc `tile/asphalt_01` wreszcie istnieje);
4. zdecydować o przeglądarce: `makeGroundTiles` proceduralnie vs `?art=pack`;
5. świadomie zacommitować produkty (`assets/clean_128|tiles_*|quantized_64`,
   `docs/amiga/**`) razem ze zmianą źródła;
6. ewentualnie wypalić pozostałe rodzaje i wycofać zaślepkowe
   `generate-source-tiles.mjs` (dziś `path_01`, `stone_01`, `concrete_01`… to
   placeholdery, nie grafika gry).

Rekomendacja: ocenić atlasy (Amiberry 8.3.0 jest w systemie), dopiero potem
decydować o przeglądarce. Nie zmieniać `tilesets.json`, dopóki atlasy nie są
zamrożone.

## Etap 5 — NPC (osobny etap, po 4)

- [ ] NPC (nie-zombie): zachowania, ścieżki, dialog/barak
- [ ] Zombie: przyciąganie hałasem w spójnym modelu z NPC
- [ ] Zapis stanu NPC w save

## Dystrybucja — WHDLoad (ścieżka równoległa do etapów 4–5)

Szczegóły i wymagania techniczne: [`docs/WHDLOAD.md`](WHDLOAD.md).

- [ ] `WHDLoad.i` w toolchainie (poza repo), wpis w `.gitignore`
- [ ] `amiga/whdload/slave.s` — nagłówek, ładowanie przez `resload_*`, start, wyjście `*`
- [ ] `make whdload` — hunk-exe 68020 ze ścieżki AGA (`render_aga.c`)
- [ ] `tools/build_whdload.mjs` — realne pakowanie (zastępuje placeholder ADF)
- [ ] `Install`, `ReadMe`, `AmBoid.inf`
- [ ] Test w emulatorze (A1200/68030/8 MB fast, KS 3.1 + WHDLoad) — **Amiberry
      8.3.0 z WHDLoad jest już skonfigurowany w systemie deweloperskim**
      (`docs/BIBLIA-PROJEKTU.md` §8.1)
- [ ] Release z assetem `AmBoid-<wersja>-whd.zip`

ADF przestaje być domyślnym artefaktem — zostaje trybem zgodności/deweloperski.

## Dług techniczny (do posprzątania niezależnie od etapów)

- [x] ~~Dwa źródła prawdy narzędzi pipeline'u~~ — konflikt z PR #5 rozstrzygnięty:
      kanoniczne są nasze `tools/*.mjs` (sygnatury i domyślne ścieżki opisane
      w `docs/BIBLIA-PROJEKTU.md` §4).
- [ ] **Dwa eksportery Amigi**: `tools/export_amiga.mjs` (stary, z `main`) i
      `tools/export-amiga.mjs` (nowy). Zostawić jedno, drugie usunąć, zaktualizować
      `npm run pipeline` i `docs/amiga/**`.
- [ ] **ADF-y to placeholdery**: `build_adf.mjs` wpisuje tekst do bootblocku,
      a `AmBoid` w paczce AmigaOS jest plikiem tekstowym. Albo realny build,
      albo wyraźne oznaczenie „dev only” w README/Release.
- [ ] **Słaby test ADF**: `test-modular-system.mjs` sprawdza istnienie plików,
      nie zawartość. Dodać kontrolę rozmiaru/nagłówka (hunk, nie tekst).
- [ ] CI: workflow uruchamiający `npm test` na każdy PR (dziś 215 testów nie jest
      sprawdzanych automatycznie). Push plików z `.github/workflows/` wymaga
      uprawnienia `workflows` — patrz `docs/PUBLIKACJA.md`.
- [ ] `tools/bump-version.mjs`: jedno miejsce podbicia wersji w 11 plikach
      (`package.json`, `package-lock.json`, `src/main.js`, `src/ui.js`, `src/art.js`,
      `src/world.js`, `README.md`, `docs/{GDD,GRAFIKA,WINDOWS,PUBLIKACJA}.md`).
- [ ] `docs/PUBLIKACJA.md`: przywrócić skróconą listę pułapek Release (upload assetu
      przez `uploads.github.com` bywa odrzucany; ZIP tagu/gałęzi działa zawsze).
- [ ] ZIP/asset Release: domknąć nazwany asset `AmBoid-<wersja>.zip` (etap 3 z
      `PROMPT-KONTYNUACJA.md` był zablokowany).
- [ ] Sprzątanie: usunąć scalone gałęzie `arena/*` na GitHubie
      (`arena/895fa390`, `arena/b923a220`, `arena/cb222f77`, `arena/fef3ef12`).
- [ ] Archiwum: katalogi `AmBoid-0.2.x`, `v2/`, `v3/` i `pobrane/zomboid/` na dysku
      zewnętrznym to stare kopie — zostawić jako archiwum ZIP-ów, nie jako źródło prawdy.
- [ ] Dokumentacja: `docs/PROMPT-KONTYNUACJA.md` odświeżyć po scaleniu tej gałęzi
      (bazuje na stanie v0.2.5 i nie zna podziału 32×16 vs demo 64×32).

## Proces (obowiązuje w każdym zadaniu)

1. Gałąź zadania (`arena/<id>-amboid` albo `feat/<temat>`), nigdy praca wprost na `main`.
2. Zmiana + `npm test` (215 OK / 0 FAIL, modular 65/65, iso passed, pack 27/27, bake 5/5).
3. PR do `main`, opis przez `gh api --method PATCH ... -f body=...`.
4. Jawny merge: `gh pr merge <nr> --merge`.
5. Tag + Release z tego samego commitu; ZIP źródeł jako asset Release.
6. Po etapie: odśwież `docs/screens`, changelog w README i **`docs/BIBLIA-PROJEKTU.md`**.
