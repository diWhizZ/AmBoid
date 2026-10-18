# AMBOID — biblia projektu

Dokument przenośny: ma wystarczyć do **wznowienia pracy w dowolnym środowisku**
(inny komputer, świeży klon, inna sesja agenta) bez dostępu do historii czatu.

Czytaj w tej kolejności:

1. **ten plik** — kontekst, reguły, decyzje, pułapki;
2. [`AGENTS.md`](../AGENTS.md) — krótka ściąga dla agenta (komendy, higiena repo);
3. [`docs/ROADMAP.md`](ROADMAP.md) — co dalej i jaki jest dług techniczny;
4. [`docs/PROMPT-KONTYNUACJA.md`](PROMPT-KONTYNUACJA.md) — specyfikacja ostatniej
   wydanej wersji (v0.2.5) i szczegóły mechaniki;
5. [`docs/AMIGA.md`](AMIGA.md) — plan sprzętowy Amigi (AGA/RTG/OCS);
6. [`docs/WHDLOAD.md`](WHDLOAD.md) — docelowa forma dystrybucji.

> Stan dokumentu: **2026-10-18**, gałąź `feat/amiga-port-i-pipeline`
> (po rebase na `main@361139f`).

---

## 1. Tożsamość projektu

Izometryczny survival zombie inspirowany **Project Zomboid** (70%) i **Cannon
Fodder** (30%), projektowany pod **Amigę 1200 z AGA (64 kolory)** lub **kartę
RTG** (64 kolory + światło RGB). Profil **OCS 32** jest wyłącznie zgodnościowy.

Gra istnieje w dwóch równoległych postaciach:

| Postać | Stan | Rola |
|---|---|---|
| **Prototyp HTML5** (`src/*.js`, Canvas) | grywalny, 215 testów | poligon mechaniki, referencja zachowania |
| **Port natywny** (`amiga/`, C + asm) | szkielet backendów | docelowa platforma |

Twarde fakty:

| | |
|---|---|
| Repo | <https://github.com/diWhizZ/AmBoid> (publiczne) |
| Gałąź główna | `main` |
| Wersja | **0.2.5** (`package.json`, `src/main.js`, `src/ui.js`) |
| Tagi / Release | `v0.2.4`, `v0.2.5` (Release `v0.2.5` = latest) |
| Plików w gicie | ~225 (rośnie; sprawdź `git ls-files \| wc -l`) |
| Języki | JS (ESM, bez frameworka), C (m68k), asm (vasm), Node (narzędzia) |
| Zależności runtime | **jedna**: `pngjs` (dev) |
| Node | v24+ wspierany, lokalnie testowane na v26.12 |

**Kanwa jest zawsze 320×200** — ekran, HUD, menu, kursor i `isOverHud` liczą się
w 320×200 niezależnie od trybu widoku (far 0,75× / close 1×).

---

## 2. Reguły nienaruszalne

Wywiedzione z historii projektu; łamanie ich kończyło się regresjami.

| # | Reguła |
|---|---|
| 1 | **Geometria kafla**: `TILE_W=32`, `TILE_H=16`, `WALL_H=20` — spójne w `src/render.js` i `src/art.js`. Nie zmieniaj w jednym pliku. |
| 2 | **`255` = przezroczystość** w sprite'ach i atlasach. Paleta eksportowa: dokładnie 32 kolory (warianty 64/32 dla podłóg). |
| 3 | **Bez `Math.random()` w klatce** i bez zużywania RNG rozgrywki do grafiki. Warianty deterministyczne (hasz `seed+x+y`), stabilne przy ruchu kamery. |
| 4 | **Kolejność `tileDim`**: RTG → dzień (`amb===0` → 0 także przy `!vis`) → pamięć mapy (`!vis` → 3) → nocne światła. Nie przywracaj winiety za dnia. |
| 5 | **Kamera**: `offX = floor(viewW/2) - round(cx) + round(lookX)` (analogicznie Y). Nieparzyste 427 nie może dawać półpikseli ani skoków kadru. |
| 6 | **`Screen.blitScaled`** skaluje **indeksy palety** filtrem MAJORITY 2×2 (bez uśredniania RGB, bez histogramu), czyści `uiMask`; światło `rgbaLit` dopiero po skalowaniu. |
| 7 | **`renderOrders`** rysuje **po** `blitScaled`: ostre kropki 3×3 i obrysy kafla w 320×200; `strokeTile` przyjmuje parametr skali. |
| 8 | **Odrzucone na zawsze**: viewporty 480×300 i 384×240. Widok daleki to `zoom=0.75` + bufor 427×267, bliski 1× / 320×200. |
| 9 | **`tools/export_amiga.mjs` nie jest uruchamiany mimochodem** — nadpisuje zapisane eksporty `docs/amiga/**`. Tylko w zadaniu „odświeżenie eksportu”, razem z regeneratami w commicie. |
| 10 | **Jedno źródło prawdy**: `main` + klon z GitHuba. Kopie ZIP (`AmBoid-0.2.x`, `v2/`, `v3/`) to archiwum, nie źródło. |

---

## 3. Architektura

```
index.html            gra w przeglądarce (canvas)
map-demo.html         osobny demonstrator izometrii z PR #5 (64×32, własne fixture)
src/                  gra JS
  main.js             start, wersja w konsoli
  game.js             pętla, stan
  world.js            mapa, obiekty, save/load
  render.js           izometria, TILE_W/H, blitScaled
  scene.js            dekoracje, krawężniki, sortowanie
  ui.js               HUD, menu, ekran tytułowy (napis V0.2.5)
  art.js              proceduralna grafika, palety, GROUND_SPEC
  items.js  audio.js  palette.js  pixel.js  rng.js  font.js  gamepad.js  profiles.js
  core/               assets.js, inventory.js, map.js   (wydzielone moduły)
  render/             iso_renderer.js
amiga/                port natywny (68020+, ~800 linii)
  src/render/         render_aga.c, render_ocs.c, render_rtg.c
  src/audio/          audio_paula.c
  src/input/          input_custom.c
  src/core/           map.c, inventory.c
  src/platform/       main_amigaos.c, startup_aga.s, startup_ocs.s
  include/            amboid.h, map.h, inventory.h, *_backend.h
  Makefile            cele: all / ocs / aga / amigaos / package / clean
tools/                serwer, testy, pipeline assetów, ADF/WHDLoad
assets/               źródła + produkty pipeline'u
data/                 items.json, tilesets.json, maps/
docs/                 dokumentacja + eksporty Amigi (generowane) + zrzuty
build/                NIE w gicie — artefakty Amigi i ADF-y
```

### Dwa backendy graficzne Amigi

- **AGA (bare metal)** — `render_aga.c` + `startup_aga.s`, 6 bitplanów, 64 kolory,
  własny copper/blitter. To jest ścieżka dla **WHDLoad**.
- **RTG / AmigaOS** — `main_amigaos.c` + `render_rtg.c`, Intuition +
  `graphics.library`, otwiera ekran i okno. Działa na karcie graficznej, ale
  **nie nadaje się pod WHDLoad** (WHDLoad przejmuje system).

Profil **OCS** (`render_ocs.c`) to tryb zgodności — nie priorytet.

---

## 4. Pipeline assetów

Jedno źródło: `assets/source_tiles/*.png` (128 px). Wszystko dalej jest produktem.

| Krok | Narzędzie | Wejście | Wyjście |
|---|---|---|---|
| 1 | `tools/clean-magenta.mjs` | `assets/source_tiles` | `assets/clean_128` (magenta → alfa) |
| 2 | `tools/resize-tiles.mjs` | `assets/clean_128` | `assets/tiles_64` **i** `assets/tiles_32` |
| 3 | `tools/quantize-palette.mjs` | `assets/tiles_64` | `assets/quantized_64` (profil `aga`/`ocs`) |
| 4 | `tools/build-atlas.mjs` | assety | `docs/amiga/atlases/*` (`atlas-floors-{32,64}`, `atlas_defs.h`) |
| 5 | `tools/convert-tiled-map.mjs` | `data/maps/sample_map.json` | `data/maps/sample_map.amb` + `docs/amiga/sample_map.amb` (**AMB2**) |
| 6 | `tools/export-items.mjs` | `data/items.json` | `docs/amiga/items_data.h` |
| 7 | `tools/export-amiga.mjs` | wszystko | `docs/amiga/**` (pełny eksport) |
| — | `tools/validate-assets.mjs` | `data/tilesets.json` | walidacja spójności |

Całość: **`npm run pipeline`**. Uwaga z reguły 9: krok 7 nadpisuje eksporty.

Dodatkowy, **niezależny** demonstrator z PR #5 (`map-demo.html`) ma własne,
zacommitowane fixture 64×32: `maps/tiled/demo.json`, `assets/atlases/floor-64.png`,
`assets/source/isotilepack/`, `src/engine/`. **Nie jest częścią pipeline'u** i nie
należy go z nim mieszać. Jego narzędzia (`tools/isometric/*`) są testowane przez
`tools/isometric/test.mjs`.

---

## 5. Build i testy

```bash
npm install          # jedyna zależność: pngjs
npm test             # pełna bramka jakości
npm run test:modular # tylko moduły + zgodność z eksportem Amigi
npm run test:iso     # tylko silnik izometryczny z PR #5
npm start            # podgląd: http://localhost:8080 (PORT nadpisuje)
```

**Oczekiwany wynik `npm test`** (stan 2026-10-18):

| element | wynik |
|---|---|
| `tools/gametest.mjs` | **215 OK, 0 FAIL** |
| `tools/browsertest.mjs` ×2 (far/close) | `BROWSER-STUB TEST OK` — oczekiwane (brak DOM) |
| `tools/stress.mjs` | 6000 klatek bez błędu |
| `tools/test-modular-system.mjs` | **65/65 OK** |
| `tools/isometric/test.mjs` | `isometric pipeline tests passed` |

### Pułapka: `build/` nie jest w gicie

`tools/test-modular-system.mjs` sprawdza **istnienie** `build/amiga/AmBoid_OCS.adf`,
`AmBoid_AGA.adf` i katalogu `build/amiga/AmBoid_AmigaOS`. W świeżym klonie test
wywali się na `[FAIL] Istnieje dyskietka OCS ...` — to nie błąd kodu. Rozwiązanie:

```bash
node tools/build_adf.mjs     # tworzy build/amiga/* (placeholdery, patrz §6)
# albo skopiuj build/ z maszyny, na której już był
```

### Kompilacja natywna

```bash
cd amiga && make            # ocs + aga + amigaos
make package                # + node ../tools/build_adf.mjs
```

Wymagane narzędzia (wg `amiga/Makefile`): `m68k-amigaos-gcc`, `vasmm68k_mot`,
`vlink`; flagi C: `-O2 -fomit-frame-pointer -noixemul`.

---

## 6. Dystrybucja Amigi — stan faktyczny i cel

| Artefakt | Stan | Uwaga |
|---|---|---|
| `build/amboid_ocs.bin`, `amboid_aga.bin` | buduje się z asm | realny kod startowy bare metal |
| `build/AmBoid` (AmigaOS) | buduje się z C | Intuition/RTG |
| `build/amiga/*.adf` | **placeholder** | `build_adf.mjs` wpisuje do bootblocku tekst `AMBOID OCS/AGA BARE METAL BOOTLOADER V0.2.5` — to nie jest działający boot |
| `build/amiga/AmBoid_AmigaOS/AmBoid` | **placeholder** | plik tekstowy `AMBOID_M68K_EXEC_PLACEHOLDER`, nie hunk-exe |
| Pakiet WHDLoad | **nie istnieje** | cel docelowy — patrz [`docs/WHDLOAD.md`](WHDLOAD.md) |

**Decyzja kierunkowa (2026-10-18): docelowym nośnikiem jest HDD/CF + WHDLoad.**
ADF zostaje wyłącznie jako wygodny artefakt deweloperski / tryb zgodności.
Wynika to wprost z `docs/AMIGA.md` §3 (dyskietka 880 KB przestaje być ograniczeniem).
Test `test-modular-system.mjs` sprawdza dziś tylko **istnienie** ADF-ów — nie
traktuj tego jako dowodu, że build amigowy działa.

---

## 7. GitHub — workflow

- **Repo**: `diWhizZ/AmBoid`, publiczne, default `main`.
- **Gałęzie**: `main` + historyczne `arena/*` (scalone PR-y #1–#5). Nowa praca:
  `feat/<temat>` albo `arena/<id>-amboid`. Jedno zadanie = jedna gałąź = jeden PR.
- **PR**: opis przez `gh api --method PATCH repos/diWhizZ/AmBoid/pulls/<nr> -f body=...`
  (`gh pr edit` bywa zawodne). Merge jawny: `gh pr merge <nr> --merge`.
- **Wymóg merge**: zielone `npm test` (215/0 + 65/65 + iso).
- **Release**: tag + Release z tego samego commitu; ZIP źródeł jako asset Release
  (`AmBoid-<wersja>.zip`), nigdy w historii repo.
- **`.github/workflows/`**: push wymaga scope `workflow`. Obecny token `gh` ma
  tylko `gist`, `read:org`, `repo` → **push workflow się odbije**. Gotowy plik
  czeka jako `docs/RELEASE-ZIP.workflow.yml`; instrukcja w `docs/PUBLIKACJA.md`.
- **Uwierzytelnianie**: `gh auth login -h github.com` (device flow), protokół HTTPS,
  credential helper `!gh auth git-credential`. Bez tokenu `git push` też nie działa
  (choć publiczny `clone`/`fetch` działa anonimowo).

Historia scalonych PR-ów:

| PR | gałąź | zakres |
|---|---|---|
| #1 | `arena/cb222f77-amboid` | v0.2.3 — prototyp, sterowanie myszą, AGA/RTG |
| #2 | `arena/fef3ef12-amboid` | v0.2.4 — widok daleki, ZIP Release |
| #3 | `arena/fef3ef12-amboid` | v0.2.4 — poprawka ZIP/Release |
| #4 | `arena/b923a220-amboid` | v0.2.5 — grunt i podłogi |
| #5 | `arena/895fa390-amboid` | pipeline izometryczny 64×32 + demo Canvas |
| #6 | `feat/amiga-port-i-pipeline` | port Amigi + pipeline + moduły (ten dokument) |

---

## 8. Środowiska

### 8.1 Maszyna deweloperska (Linux, CachyOS)

- Node v26.12, `gh` 2.102, git 2.56.
- Klon roboczy: `~/git/projekty/AmBoid`.
- Archiwum źródłowe (tylko do odczytu): `/mnt/magazyn/pobrane/Amiga/Zamboid/AmBoid-0.2.5`
  — stamtąd zaimportowano pracę, której nie było w gicie. **Nie jest źródłem prawdy.**
- OpenCode V2: sesje w `~/.local/share/opencode/opencode.db`; sesja nie przenosi
  się między maszynami — dlatego istnieje ten dokument.

### 8.2 Maszyna z Windows

- Node v24.22, **brak gita w PATH**, PowerShell blokuje `npm.ps1`.
- Projekt pobierany ZIP-em z Release/archiwum, nie klonem.
- Uruchomienie: `node tools/serve.mjs` → <http://localhost:8080> (gra nie wymaga
  `npm install`; testy tak: `npm.cmd install`, `npm.cmd test`).

### 8.3 Start w zupełnie nowym środowisku

```bash
git clone https://github.com/diWhizZ/AmBoid.git
cd AmBoid
git checkout main            # albo gałąź zadania
npm install
node tools/build_adf.mjs     # obejście braku build/ (placeholdery)
npm test                     # oczekiwane: 215 OK / 0 FAIL, 65/65, iso passed
```

Potem przeczytaj ten plik i `docs/ROADMAP.md`. Dopiero potem kod.

---

## 9. Dziennik decyzji

| Data | Decyzja | Uzasadnienie |
|---|---|---|
| 2026-10-17 | v0.2.5 = przebudowa `makeGround`/`GROUND_SPEC` | spójne podłogi, warianty bez zużywania RNG |
| 2026-10-18 | Praca z NTFS zaimportowana do gita na `feat/amiga-port-i-pipeline` | katalog źródłowy nie miał `.git`; ryzyko utraty |
| 2026-10-18 | **Nasz pipeline wygrywa** z pipeline'em z PR #5 (konflikt 8 plików) | spójny z `AGENTS.md` i portem Amigi (32×16, 320×200, `AMB2`) |
| 2026-10-18 | Demo z #5 zostaje jako **osobny** byt (64×32, własne fixture) | nie da się go sensownie przestawić na 32×16 bez przepisania silnika; działa z zacommitowanych plików |
| 2026-10-18 | `package.json`: nasze skrypty + `test:iso`; `test` uruchamia **oba** testy | naiwne „weź nasze” wyłączyłoby test silnika z #5 |
| 2026-10-18 | Aliasy `assets:*`, `map:convert`, `amiga:export` z #5 usunięte | nasze narzędzia mają inne sygnatury — aliasy kłamałyby |
| 2026-10-18 | **WHDLoad = docelowy nośnik**, ADF = artefakt deweloperski | `docs/AMIGA.md` §3; dyskietka nie jest ograniczeniem |

---

## 10. Znany dług i pułapki

- **Dwa eksportery Amigi**: `tools/export_amiga.mjs` (stary, z `main`) i
  `tools/export-amiga.mjs` (nowy). Zostawić jeden, drugi usunąć.
- **ADF-y to placeholdery** — `build_adf.mjs` nie pakuje realnego bootblocku,
  a `AmBoid` w paczce AmigaOS to plik tekstowy. Nie ogłaszaj „działa na Amidze”
  na podstawie zielonego testu.
- **Brak CI** — 215 testów nie jest sprawdzanych automatycznie; push workflow
  wymaga scope `workflow`.
- **Wersja w 11 plikach** — brak `tools/bump-version.mjs`.
- **`docs/PROMPT-KONTYNUACJA.md`** opisuje stan v0.2.5 i nie zna obecnej gałęzi.
- **Scalone gałęzie `arena/*`** czekają na sprzątanie na GitHubie.
- **Test ADF jest słaby** — sprawdza istnienie pliku, nie jego zawartość.

---

## 11. Wznowienie pracy — checklista

1. `git log --oneline -5` — czy jesteś na oczekiwanym commicie?
2. `git status -sb` — czysto? jeśli nie, **nie nadpisuj** cudzej pracy.
3. `grep '"version"' package.json` i `grep V0\. src/ui.js` — wersja spójna?
4. `npm test` — czy bramka jest zielona **przed** Twoją zmianą?
5. Przeczytaj `docs/ROADMAP.md` — co jest następne i jaki dług dotykasz.
6. Sprawdź, czy zadanie nie łamie reguł z §2.
7. Pracuj na gałęzi zadania; po zmianie: `npm test` → commit → PR → merge.
8. Zmieniłeś coś w regułach, decyzjach lub pipeline? **Zaktualizuj ten plik.**

---

## 12. Słowniczek

| Termin | Znaczenie |
|---|---|
| **AMB2** | binarny format mapy (`data/maps/sample_map.amb`), konwerter z Tiled |
| **AGA 64** | 6 bitplanów, 64 kolory z 16,7 mln — cel na A1200 |
| **OCS 32** | 5 bitplanów, 32 kolory — tryb zgodności (A500) |
| **RTG** | karta graficzna, chunky 8-bit, światło RGB |
| **far / close** | tryby widoku: 0,75× (bufor 427×267) / 1× (320×200) |
| **`tileDim`** | funkcja przygaszania kafla (kolejność: RTG → dzień → pamięć → światła) |
| **blitScaled** | skalowanie indeksów palety filtrem MAJORITY 2×2 |
| **fixture** | zacommitowane dane demo z PR #5 (64×32), niezależne od pipeline'u |
| **WHDLoad** | loader gier z HDD/CF; docelowa forma dystrybucji (patrz `docs/WHDLOAD.md`) |
