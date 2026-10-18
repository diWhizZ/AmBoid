# AMBOID — roadmapa i dług techniczny

Stan wyjściowy: `main` = `fc8a4ae` (v0.2.5 scalone, PR #4), tagi `v0.2.4`, `v0.2.5`.
Poniżej: co jest zrobione, co czeka, i co trzeba naprawić w samym warsztacie pracy.
Kolejność etapów pochodzi z `docs/PROMPT-KONTYNUACJA.md`.

## Zrobione (poza `main`, w tej gałęzi)

- [x] Port natywny w C: `amiga/` — render AGA/OCS/RTG, Paula, custom input, AmigaOS, Makefile, `tools/build_adf.mjs`
- [x] Pipeline assetów: źródła → magenta → skala → paleta 64/32 → atlas → `items_data.h`, `sample_map.amb`
- [x] Refaktor modułowy JS: `src/core/{assets,inventory,map}.js`, `src/render/iso_renderer.js`
- [x] `npm run test:modular` (65/65), `npm test` = 215 OK / 0 FAIL
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

## Dług techniczny (do posprzątania niezależnie od etapów)

- [ ] **Dwa źródła prawdy dla eksportu Amigi**: `tools/export_amiga.mjs` (z `main`)
      i nowe `tools/export-amiga.mjs`. Zostawić jedno, drugie usunąć, zaktualizować
      `npm run pipeline` i `docs/amiga/**`.
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
      (`arena/b923a220-amboid`, `arena/cb222f77-amboid`, `arena/fef3ef12-amboid`).
- [ ] Archiwum: katalogi `AmBoid-0.2.x`, `v2/`, `v3/` i `pobrane/zomboid/` na dysku
      zewnętrznym to stare kopie — zostawić jako archiwum ZIP-ów, nie jako źródło prawdy.
- [ ] Dokumentacja: `docs/PROMPT-KONTYNUACJA.md` odświeżyć po scaleniu tej gałęzi
      (bazuje na stanie v0.2.5).

## Proces (obowiązuje w każdym zadaniu)

1. Gałąź zadania (`arena/<id>-amboid` albo `feat/<temat>`), nigdy praca wprost na `main`.
2. Zmiana + `npm test` (215 OK / 0 FAIL, modular 65/65).
3. PR do `main`, opis przez `gh api --method PATCH ... -f body=...`.
4. Jawny merge: `gh pr merge <nr> --merge`.
5. Tag + Release z tego samego commitu; ZIP źródeł jako asset Release.
6. Po etapie: odśwież `docs/screens` i changelog w README.
