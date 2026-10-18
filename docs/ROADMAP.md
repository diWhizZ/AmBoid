# AMBOID — roadmapa i dług techniczny

Stan na **2026-10-18**:

- `main` = `361139f` (PR #5 scalony: pipeline izometryczny 64×32 + demo Canvas),
- tagi i Release: `v0.2.4`, `v0.2.5`,
- gałąź `feat/amiga-port-i-pipeline` (PR #6) — **po rebase na `main`**,
  0 konfliktów, `npm test` zielony,
- kontekst projektu: [`docs/BIBLIA-PROJEKTU.md`](BIBLIA-PROJEKTU.md),
- dystrybucja: [`docs/WHDLOAD.md`](WHDLOAD.md).

Kolejność etapów pochodzi z `docs/PROMPT-KONTYNUACJA.md`.

## Zrobione (w tej gałęzi, poza `main`)

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

## Etap 4 — następna wersja (grafika rozgrywki)

Cel z `PROMPT-KONTYNUACJA.md`: małe, rozpoznawalne ikony ekwipunku i łupów
z jednej 16-kolorowej podpalety, bez gradientów. Oszczędne animacje 2–4 klatkowe
i mirroring boków. Efekty limitowane (krew, łuski, dym, błysk wystrzału, ślady
stóp) — nigdy nie rosnące bez końca. Portret i pasek stanu dopracowane w 320×200.

- [ ] Ikony ekwipunku i łupów z jednej podpalety 16 kolorów (`docs/amiga/`, `src/art.js`)
- [ ] Animacje 2–4 klatkowe + mirroring boków dla postaci i rekwizytów
- [ ] Efekty z twardym limitem instancji (krew, łuski, dym, błysk, ślady stóp)
- [ ] Portret gracza + pasek stanu w 320×200
- [ ] Spójna perspektywa diagonal-down postaci i rekwizytów (jak Cannon Fodder) —
      **bez** zmiany siatki podłogi na ścisłą perspektywę
- [ ] Odświeżone zrzuty `docs/screens` + `npm test` zielone

Uwaga: geometria kafla (`TILE_W/TILE_H/WALL_H`, dziś 32/16/20) pozostaje spójna
między `src/render.js` a `src/art.js`. `255` = przezroczystość.

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
- [ ] Test w emulatorze (A1200/68030/8 MB fast, KS 3.1 + WHDLoad)
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
2. Zmiana + `npm test` (215 OK / 0 FAIL, modular 65/65, iso passed).
3. PR do `main`, opis przez `gh api --method PATCH ... -f body=...`.
4. Jawny merge: `gh pr merge <nr> --merge`.
5. Tag + Release z tego samego commitu; ZIP źródeł jako asset Release.
6. Po etapie: odśwież `docs/screens`, changelog w README i **`docs/BIBLIA-PROJEKTU.md`**.
