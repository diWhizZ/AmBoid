# AGENTS.md — AMBOID

Ten plik czyta każdy agent (opencode i inne) przed pierwszą zmianą w repo.
Trzymaj go krótko i aktualizuj razem z kodem.

**Pełny kontekst** (środowiska, decyzje, pułapki, wznowienie pracy gdzie indziej):
[`docs/BIBLIA-PROJEKTU.md`](docs/BIBLIA-PROJEKTU.md). Docelowa dystrybucja
Amigi: [`docs/WHDLOAD.md`](docs/WHDLOAD.md).

## Czym jest projekt

Izometryczny survival zombie inspirowany Project Zomboid, zaprojektowany pod
rozbudowaną **Amigę 1200 (AGA, 64 kolory)** lub system z **kartą RTG** (64 kolory
+ światło RGB). Profil **OCS 32** jest tylko zgodnościowy. Mix: 70% Project
Zomboid / 30% Cannon Fodder. Bez RTS-izacji walki i grupowego autoataku.

**Kanwa jest zawsze 320×200.** Ekran, HUD, menu, kursor i `isOverHud` liczą się
w 320×200 niezależnie od trybu widoku. Gra jest dziś prototypem HTML5 (JS/Canvas),
a `amiga/` to natywny port w C/assemblerze (render, Paula, custom input, Makefile).

## Komendy

```bash
npm start              # serwer podglądu, tools/serve.mjs, http://localhost:8080 (PORT nadpisuje)
npm test               # PEŁNY zestaw: gametest + browsertest + browsertest --view=close + stress + test-modular-system + isometric/test
npm run test:modular   # tylko testy modułów i zgodności z eksportem Amigi (65/65)
npm run test:iso       # tylko silnik izometryczny z PR #5 (map-demo.html)
npm run pipeline       # clean-magenta -> resize-tiles -> quantize-palette -> build-atlas -> convert-tiled-map -> export-items -> export-amiga
npm run validate-assets
npm run shots          # zrzuty do docs/screens (w repo, x2 nearest neighbour) — odświeżaj przy zmianach grafiki
npm run texshots       # zrzuty/raport tekstur, domyślnie do shots/ (ignorowane)
npm run texbench       # benchmark tekstur
npm run build-atlas / export-items / export-amiga / convert-tiled-map / validate-assets   # pojedyncze etapy pipeline'u
```

Do testów wystarczy `npm install` (jedyna zależność: `pngjs`). Node v24+ jest
wspierany; lokalnie testowane na v26.

## Zasady, których nie łamie się przypadkiem

Wywiedzione z `docs/PROMPT-KONTYNUACJA.md` i z historii projektu — powtarzają się
w każdym zadaniu graficznym:

- **Geometria kafla:** `TILE_W=32`, `TILE_H=16` (`src/render.js`) i odpowiadające
  wartości w `src/art.js` muszą być spójne. `WALL_H=20`. Nie zmieniaj geometrii
  tylko w jednym pliku.
- **255 = przezroczystość** w sprite'ach/atlasach. Paleta eksportowa ma dokładnie
  32 kolory; warianty podłóg 4–8 na materiał, ściany 5 wariantów.
- **Bez `Math.random()` w klatce** i bez zużywania RNG rozgrywki do celów
  wizualnych — dobór wariantów musi być deterministyczny (hasz seed+x+y),
  stabilny przy przesuwaniu kamery.
- **Kolejność `tileDim`:** RTG → dzień (`amb===0` → 0 także przy `!vis`) →
  pamięć mapy (`!vis` → 3) → nocne światła. Nie przywracaj winiety za dnia.
- **Kamera:** `offX = floor(viewW/2) - round(cx) + round(lookX)` (analogicznie Y).
  Nieparzyste 427 nie może dawać półpikseli ani skoków kadru.
- **`Screen.blitScaled`** skaluje indeksy palety filtrem MAJORITY 2×2 (bez
  uśredniania RGB, bez histogramu), czyści `uiMask`; oświetlenie `rgbaLit`
  nakładane jest dopiero po skalowaniu.
- **`renderOrders`** rysuje po `blitScaled`: ostre kropki 3×3 i obrysy kafla
  w 320×200; `strokeTile` przyjmuje parametr skali.
- Odrzucone i nie wracamy: szerokie viewporty 480×300, 384×240. Widok daleki to
  `zoom=0.75` i bufor świata 427×267, bliski to 1× / 320×200.
- **`tools/export_amiga.mjs` nie jest uruchamiany mimochodem** — nadpisuje
  zapisane eksporty `docs/amiga/**`. Uruchamiaj tylko świadomie, w zadaniu
  „odświeżenie eksportu”, i wtedy commit razem z regeneratami.
- **Dwa niezależne światy graficzne.** Gra używa kafli 32×16 (320×200). Demonstrator
  z PR #5 (`map-demo.html`, `src/engine/`, `assets/atlases/floor-64.png`,
  `maps/tiled/demo.json`, `tools/isometric/*`) ma własne fixture 64×32 i własny
  test. Nie mieszaj ich i nie „ujednolicaj” przy okazji — to świadoma separacja.

## Struktura

| Ścieżka | Rola |
|---|---|
| `src/*.js` | gra w przeglądarce: `game.js`, `world.js`, `render.js`, `scene.js`, `ui.js`, `art.js`, `items.js`, `audio.js`, `palette.js`, `pixel.js`, `rng.js`, `font.js`, `gamepad.js`, `profiles.js`, `main.js` |
| `src/core/` | `assets.js`, `inventory.js`, `map.js` — wydzielone moduły |
| `src/render/` | `iso_renderer.js` |
| `amiga/` | port natywny: `src/render/render_{aga,ocs,rtg}.c`, `src/audio/audio_paula.c`, `src/input/input_custom.c`, `src/platform/`, `src/core/`, `include/`, `Makefile` |
| `tools/` | serwer, testy, pipeline assetów, eksport IFF/AMB, ADF |
| `assets/` | `source_tiles` (źródła) → `clean_128` → `tiles_64`/`tiles_32` → `quantized_64`; wszystko poza źródłami jest produktem pipeline'u |
| `data/` | `items.json`, `tilesets.json`, `maps/*` (Tiled → `sample_map.amb`) |
| `docs/` | `BIBLIA-PROJEKTU.md`, `ROADMAP.md`, `WHDLOAD.md`, `AMIGA.md`, `GDD.md`, `GRAFIKA.md`, `WINDOWS.md`, `PUBLIKACJA.md`, `ISOMETRIC.md`, `PROMPT-KONTYNUACJA.md`, `prompts/`, `screens/`, `amiga/**` (eksporty — generowane) |
| `build/` | **nie w repo** (`.gitignore`) — `build/amiga/*.adf` i paczka AmigaOS są assetem Release |

## Testy i jakość

- Przed każdym PR: `npm test`, wymagane **215 OK / 0 FAIL** oraz modular **65/65**.
  `BROWSER-STUB` dla widoków far/close jest oczekiwany (brak prawdziwego DOM).
- Nową regułę mechaniczną dodawaj do `tools/gametest.mjs`, a regułę dotyczącą
  modułów/eksportu do `tools/test-modular-system.mjs`.
- Test na ADF-y czyta `build/amiga/`; jeśli katalogu nie ma, uruchom
  `node tools/build_adf.mjs`, nie commituj ADF-ów. **To placeholdery** — zielony
  test nie znaczy, że build Amigi działa. Docelowa dystrybucja to HDD/WHDLoad
  (`docs/WHDLOAD.md`), ADF zostaje deweloperski.

## Git, PR, Release — workflow projektu

- Pracuj **na gałęzi zadania** (`arena/<id>-amboid` albo `feat/<temat>`), nie na
  `main`. Jedno zadanie = jedna gałąź = jeden PR.
- `main` scalany jawnie: `gh pr merge <nr> --merge`. Nie scalaj bez zielonych
  testów.
- Opis PR edytuj przez `gh api --method PATCH repos/diWhizZ/AmBoid/pulls/<nr> -f body=...`
  (`gh pr edit` bywa zawodne).
- Release: tag + Release z tego samego commitu co PR; ZIP źródeł
  (`AmBoid-<wersja>.zip`) jako asset Release, nie w historii repo.
- Push plików z `.github/workflows/` wymaga uprawnienia `workflows` w tokenie/
  GitHub App — bez niego odbija się. Gotowy workflow czeka jako
  `docs/RELEASE-ZIP.workflow.yml` (instrukcja w `docs/PUBLIKACJA.md`).
- Bez tokenów i haseł w kodzie, dokumentach i czacie.
- Wersja żyje w kilku miejscach: `package.json`, `package-lock.json`,
  `src/main.js`, `src/ui.js` (napis na ekranie tytułowym), `src/art.js`,
  `src/world.js`, `README.md`, `docs/GDD.md`, `docs/GRAFIKA.md`,
  `docs/WINDOWS.md`, `docs/PUBLIKACJA.md`. Podbijaj je razem — albo dodaj
  skrypt `tools/bump-version.mjs` (patrz `docs/ROADMAP.md`).

## Higiena repo

- **Nie commituj**: `node_modules/`, `build/`, `shots/`, `AmBoid-*.zip`,
  plików tymczasowych.
- `docs/amiga/**`, `assets/clean_128|tiles_32|tiles_64|quantized_64` są
  produktami pipeline'u — commituj je tylko razem ze zmianą narzędzi/źródeł,
  żeby historia była odtwarzalna.
- Nie zmieniaj katalogu roboczego poza repo; nie przenoś historii gita z kopii
  ZIP-owych (`AmBoid-0.2.x` na dysku zewnętrznym to archiwum, nie źródło prawdy).
