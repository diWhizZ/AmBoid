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

> Stan dokumentu: **2026-10-19**, `main@38d013a` (PR #6 scalony).
> Praca nad assetami: gałąź `feat/import-isotilepack`.

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
Kafle mogą powstawać dwiema drogami: `tools/bake-ground-tiles.mjs` wypala je
z `src/art.js` (§4b), a `tools/import-isotilepack.mjs` tnie zewnętrzny pack CC0
do `assets/source_pack/` (§4a).

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

Kroki 1–3 **sprzątają osierocone pliki** w katalogach wynikowych
(`tools/tile-dir-utils.mjs`): gdy zmieni się źródło (np. z proceduralnego
`assets/source_tiles` na `assets/source_pack`), stary kafel nie zostaje
w `tiles_*` ani w atlasie. Bez tego atlas puchł o szczątki poprzedniego źródła.
Sprzątanie jest pomijane przy pracy w miejscu (`in == out`).

### 4a. Zewnętrzny pack CC0 (opcjonalne źródło)

Zamiast ręcznie robionych `assets/source_tiles/*.png` można użyć packa
**Isometric Tiles — Floor Pack** (Screaming Brain Studios, **CC0 1.0**,
<https://screamingbrainstudios.itch.io/isotilepack>). Wariant **Small 128×64**
jest jedynym dozwolonym; Large 256×128 nie wchodzi do tego pipeline'u.

**Uwaga na zawartość archiwum:** to jedno pobranie zawiera **trzy** packi —
*Floor Tiles*, *Overworld* i *Wall Pack*. Ściany mają inne proporcje (64×96,
72×100) i są bezużyteczne w tym pipeline'ie; overworld to nie podłogi. Dlatego
importer ma filtry ścieżek i twardą bramkę geometrii 2:1.

```bash
# 1. rozpakuj pack do assets/source/isotilepack/ (katalog jest w .gitignore,
#    poza zacommitowanymi fixture'ami demo/)
npm run import-pack -- --only "Floor Tiles" --dry-run              # raport
npm run import-pack -- --only "Floor Tiles" --per-material 8 \
    --preview shots/pack-preview.png --list shots/pack-candidates.txt
npm run import-pack -- --only "Floor Tiles" --per-material 8        # -> assets/source_pack/
npm run pipeline:pack                # clean-magenta -> resize -> quantize (nadpisuje assets/clean_128 itd.)
npm run pipeline:pack:full           # + atlas/mapa/items/eksport (NADPISUJE docs/amiga/**)
```

- Importer (`tools/import-isotilepack.mjs`) sam tnie arkusze, wykrywa rozmiar
  kafla z nazwy pliku (`128x64`), składa płaski katalog i deduplikuje piksele.
- **Bramka 2:1**: każde `tileW !== 2 × tileH` jest pomijane z raportem. To chroni
  przed ścianami i „thick” overworldem, których `resize-tiles` nie umie przeskalować.
- **Filtry**: `--only <fragment>` / `--include`, `--exclude <fragment>` (powtarzalne,
  dopasowanie po fragmencie ścieżki). Bez nich packi mieszają się w jeden stos.
- **Uzupełnienia `--also <dir>`**: rodzaje, których pack nie ma (np. `asphalt`),
  importer dokłada z podanego katalogu po nazwie `<rodzaj>_<nn>.png` — i **tylko**
  wtedy, gdy pack nie dał dla tego rodzaju nic (dwa style nigdy się nie mieszają
  w jednym rodzaju). Dla tego archiwum: `--also assets/source_tiles` uzupełnia
  asfalt wypalony z gry (patrz „Wypalanie podłóg” niżej).
- **Mapowanie** materiałów packa na `GROUND_SPEC` (`DEFAULT_MATERIAL_MAP`):

  | pack | rodzaj | uwaga |
  |---|---|---|
  | Grass, Flora | `grass` | |
  | Dry | `dirt` | |
  | Rocky, Stones | `gravel` | |
  | Stone, Metal, Grill, Grate | `concrete` | płyty kamienne i kratki metalowe |
  | Wood | `wood` | |
  | Tile | `tile` | ceramika |
  | Pattern | `carpet` | w tym packu to wzorzyste wykładziny |
  | Brick | `sidewalk` | bruk/płytki, kilka kolorów |
  | Elements | `water` | tylko woda: `--pick water=1-18` (`Elements_01`) |
  | Ice | — | pomijane (brak rodzaju w `GROUND_SPEC`) |
  | *asfalt* | — | **brak w packu**: uzupełniamy przez `--also assets/source_tiles` |

  Nadpisanie: `--map grill=concrete,ice=skip`.
- **Kuracja**: domyślnie **4 kafle na rodzaj** równomiernie z całego zbioru;
  `--per-material N`, `--all` (wszystko). Ręczny wybór: `--pick grass=1,5,9`
  albo zakres `--pick water=1-18` (numery 1-based z `--list`), a
  `--preview <plik.png>` rysuje kontaktówkę wybranych kafli (także z
  `--dry-run`), `--preview-cols N` ją zawęża.
- `assets/source_pack/NOTICE.md` dokumentuje CC0, źródło i **komendę odtworzenia**
  (z filtrami i `--pick`). **Surowy pack nie jest commitowany** (`.gitignore`);
  do repo wchodzi skuratorowany `assets/source_pack/` (mały, czyni pipeline
  odtwarzalnym) oraz pochodne atlasy.
- Sprawdzona komenda dla tego archiwum (daje 88 kafli, **10/10** rodzajów —
  asfalt dokładany przez `--also`):

  ```bash
  npm run bake-tiles             # asphalt_01..06 z src/art.js -> assets/source_tiles
  node tools/import-isotilepack.mjs --only "Floor Tiles" --per-material 8 \
      --pick water=1-18 --also assets/source_tiles \
      --preview shots/pack-final.png --list shots/pack-candidates.txt
  npm run pipeline:pack:full     # NADPISUJE docs/amiga/**
  ```

  Kolejność kafli w atlasie to porządek alfabetyczny nazw rodzajów; konkretne
  numery są w `docs/amiga/atlases/atlas_defs.h` (`TILE_ID_*`).
- Test importera: `npm run test:pack` (27/27, nie wymaga packa — buduje
  syntetyczne arkusze z fixture'ów `assets/source/isotilepack/demo/`).
- `png_mini.js` obsługuje też PNG indeksowane (colorType 3, 1/2/4/8 bitów,
  `PLTE` + `tRNS`), bo packi na itch.io często takie są. 16-bit i interlace
  są jawnie odrzucane.

### 4b. Wypalanie podłóg proceduralnych do PNG (`bake-ground-tiles.mjs`)

Gra rysuje podłogi proceduralnie w `src/art.js` (32×16, indeksy palety), ale
pipeline Amigi potrzebuje plików 128×64. `tools/bake-ground-tiles.mjs` bierze
kafle z `buildArt()` i wypala je do PNG z tłem magenta:

```bash
npm run bake-tiles                          # asphalt_01..06 -> assets/source_tiles
node tools/bake-ground-tiles.mjs --all      # wszystkie rodzaje z GROUND_SPEC
```

- Skalowanie to **×4** (32×16 → 128×64). `resize-tiles` skaluje potem ÷2 i ÷2
  (nearest), co wraca **dokładnie** do 32×16 — kafel w atlasie OCS jest
  identyczny z tym, co rysuje przeglądarka (pilnuje tego test wypalania).
- Liczba wariantów wynika z `GROUND_SPEC` (dla `asphalt` — 6), a wynik jest
  deterministyczny: `art.js` nie używa `Math.random()` w klatce.
- Wypalone PNG są **źródłami** (commituje się je razem z `assets/source_tiles`).
  Wypełniają rodzaje, których pack CC0 nie ma; trafiają do `assets/source_pack`
  przez `--also` (albo osobno, zwykłym `npm run pipeline`).
- To docelowa droga dla własnych kafli: `generate-source-tiles.mjs` tworzy
  stare, zaślepkowe źródła i w razie potrzeby jego rodzaje też można wypalać.

**Do wykorzystania później:** `Wall Pack` (Flat 64×96, Thick 72×100) to gotowe
ściany i okna — materiał na osobny etap (geometria `WALL_H`, inne skalowanie niż
podłogi), nie na ten importer. Nie mieszać z podłogami przy okazji.

Dodatkowy, **niezależny** demonstrator z PR #5 (`map-demo.html`) ma własne,
zacommitowane fixture 64×32: `maps/tiled/demo.json`, `assets/atlases/floor-64.png`,
`assets/source/isotilepack/demo/`, `src/engine/`. **Nie jest częścią pipeline'u** i nie
należy go z nim mieszać. Jego narzędzia (`tools/isometric/*`) są testowane przez
`tools/isometric/test.mjs`. Sam katalog `assets/source/isotilepack/` (poza `demo/`)
służy jako miejsce rozpakowania packa CC0 dla importera z §4a.

---

## 5. Build i testy

```bash
npm install          # jedyna zależność: pngjs
npm test             # pełna bramka jakości
npm run test:modular # tylko moduły + zgodność z eksportem Amigi
npm run test:iso     # tylko silnik izometryczny z PR #5
npm run test:pack    # tylko import packa CC0 + clean/resize/quantize
npm run test:bake    # tylko wypalanie podłóg proceduralnych do PNG
npm start            # podgląd: http://localhost:8080 (PORT nadpisuje)
```

**Oczekiwany wynik `npm test`** (stan 2026-10-19):

| element | wynik |
|---|---|
| `tools/gametest.mjs` | **215 OK, 0 FAIL** |
| `tools/browsertest.mjs` ×2 (far/close) | `BROWSER-STUB TEST OK` — oczekiwane (brak DOM) |
| `tools/stress.mjs` | 6000 klatek bez błędu |
| `tools/test-modular-system.mjs` | **65/65 OK** |
| `tools/isometric/test.mjs` | `isometric pipeline tests passed` |
| `tools/test-isotilepack-import.mjs` | **27/27 OK** (import packa, filtry, geometria 2:1, `--pick`, `--also`, kontaktówka, łańcuch skalowania) |
| `tools/test-bake-ground-tiles.mjs` | **5/5 OK** (geometria wypalania, determinizm, powrót do 32×16) |

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
- Emulacja Amigi: **Amiberry 8.3.0** (`/usr/bin/amiberry`, konfiguracja
  `~/.config/amiberry/amiberry.ini`), ROM-y w `~/Amiberry/ROMs` (m.in. KS 3.1
  A1200/A600), WHDLoad + `whdboot` w `/usr/share/amiberry/whdboot/`. Środowisko
  gotowe do ręcznych testów WHDLoad (`docs/WHDLOAD.md`); nie jest częścią
  `npm test` i nie ma jeszcze automatyzacji uruchamiania gier.

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
npm test                     # oczekiwane: 215 OK / 0 FAIL, 65/65, iso passed, pack 27/27, bake 5/5
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
| 2026-10-19 | PR #6 scalony (`main@38d013a`); dalsza praca na `feat/import-isotilepack` | domknięcie portu/pipeline'u przed grafiką |
| 2026-10-19 | Źródło grafiki podłóg: pack CC0 SBS, wariant **Small 128×64**, kuratorowany podzbiór | darmowy, komercyjny, 2:1 izometria zgodna z 32×16 po skalowaniu |
| 2026-10-19 | Importer zapisuje do `assets/source_pack`, nie nadpisuje `assets/source_tiles` | oba źródła (proceduralne i pack) pozostają odtwarzalne |
| 2026-10-19 | Surowy pack **nie jest commitowany**; w repo skuratorowany `assets/source_pack` + `NOTICE.md` i pochodne atlasy | rozmiar + polityka repo (CC0 pozwala na więcej, ale nie ma potrzeby) |
| 2026-10-19 | Amiberry 8.3.0 + WHDLoad w systemie = środowisko testów Amigi | użytkownik potwierdził konfigurację; używać przy `docs/WHDLOAD.md` |
| 2026-10-19 | Importer ma **filtry ścieżek** (`--only`/`--exclude`) i **bramkę 2:1** | jedno archiwum SBS zawiera 3 packi (podłogi, overworld, ściany 64×96); bez tego ściany trafiały na podłogi |
| 2026-10-19 | `Pattern → carpet`, `Grill/Grate → concrete`, `Stone → concrete` | pack daje 9/10 rodzajów (bez asfaltu); kratki metalowe i płyty kamienne to podłoga, nie droga |
| 2026-10-19 | **Asfalt rysujemy sami** — `tools/bake-ground-tiles.mjs` wypala kafle z `src/art.js` | pack SBS nie ma nic drogowego; `Stone → asphalt` po kwantyzacji wyglądał jak piaskowiec. Wypalanie z gry daje kafel identyczny z przeglądarką (×4 → ÷2 ÷2 wraca do 32×16) |
| 2026-10-19 | Importer ma `--also <dir>`: uzupełnia rodzaje, których pack nie ma | jedno źródło prawdy dla `assets/source_pack`; pack i własne kafle nie mieszają się w jednym rodzaju |
| 2026-10-19 | Integracja pack → gra to **osobne zadanie** | PR #7 kończy narzędzia; `data/tilesets.json` i decyzja proceduralne vs `?art=pack` dopiero przy scalaniu z grą |
| 2026-10-19 | Kroki 1–3 pipeline'u **sprzątają osierocone kafle** (`tools/tile-dir-utils.mjs`) | przy zmianie źródła stary `path_01`/`stone_01` zostawał w `tiles_*` i atlasie (92 zamiast 90 kafli) |
| 2026-10-19 | `--pick` przyjmuje zakresy (`water=1-18`) | wybór wody bez wypisywania 18 numerów |

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
| **pack CC0** | zewnętrzny zestaw kafli SBS 128×64; wejście importera (§4a) |
| **kuracja** | wybór kafli na rodzaj: `--per-material N` (domyślnie 4) albo ręcznie `--pick` |
| **bramka 2:1** | odrzucanie kafli, gdzie `tileW ≠ 2 × tileH` (ściany 64×96, „thick” 128×72) |
| **osierocony kafel** | plik w `clean_128`/`tiles_*`/`quantized_64`, którego nie ma już w źródle; kroki 1–3 go usuwają |
| **wypalanie (bake)** | zamiana proceduralnych kafli z `src/art.js` na PNG 128×64 (`bake-ground-tiles.mjs`), gotowe dla pipeline'u i dla `--also` |
| **`--also`** | uzupełnienie `assets/source_pack` kaflami spoza packa (tylko dla rodzajów, których pack nie ma) |
| **WHDLoad** | loader gier z HDD/CF; docelowa forma dystrybucji (patrz `docs/WHDLOAD.md`) |
