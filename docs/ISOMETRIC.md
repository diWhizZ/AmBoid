# Izometryczny pipeline AMBOID

## Stan i zakres

`src/engine/` dodaje niezależne od aktualnej gry moduły matematyki izometrycznej, mapy, kolizji, drzwi, kamery i Canvas2D. Podstawowy prototyp gry zachowuje dotychczasowy renderer low-res 32×16; nowy demonstrator działa pod `/map-demo.html` i korzysta z mapy Tiled 64×32. W repo umieszczono osiem autorskich kafli testowych CC0, żeby pipeline był uruchamialny bez zewnętrznego pobierania.

Oryginalny pakiet nie jest w repo, gdyż trzeba go pobrać od twórcy. Włóż wyłącznie wydanie Small 128×64 do `assets/source/isotilepack/`, potem uruchom komendy poniżej. PNG są czyszczone według dokładnego RGB `FF 00 FF`, następnie zmniejszane przez kopiowanie każdego drugiego piksela (nearest-neighbour, bez filtrów), a następnie składane do atlasu. Nazwy wejściowe pozostają nazwami kafli. Konwerter aktualnie przetwarza kafle 128×64.

## Pipeline

```sh
npm ci
npm run assets:demo       # opcjonalny zestaw fixture, nie nadpisuje pakietu autora
npm run assets:clean      # -> assets/tiles/cleaned
npm run assets:resize     # -> assets/tiles/floor, 64×32
npm run assets:atlas      # -> assets/atlases/floor-64.png (+ JSON indeksu)
npm run assets:quantize   # paleta indeksowana do 256 kolorów
npm run map:convert       # maps/tiled/demo.json -> maps/converted/demo.ambmap
npm run amiga:export      # atlas RAW indeksowany, RGB palette, mapa i nagłówek C
npm test
npm start                # http://localhost:8080/map-demo.html
```

Nazwy wejść/wyjść można podać jako argumenty skryptom, np. `node tools/clean-magenta.mjs INPUT OUTPUT`, `node tools/resize-tiles.mjs INPUT OUTPUT`, `node tools/build-atlas.mjs DIR atlas.png`, `node tools/quantize-palette.mjs atlas.png out.png 32`, `node tools/convert-tiled-map.mjs map.json out.ambmap`.

## Tiled / format AMI2

`maps/tiled/demo.json` to mapa isometryczna z warstwami floor, walls, doors, objects, collision, spawn i triggers. Wczytaj ją w Tiled; do map własnych używaj kafli 64×32 i obiektów z `tileX`/`tileY` (współrzędne kratki). Eksport mapy pozostaje JSON. `AMI2` zapisuje big-endian: magic/version, wymiary mapy i kafla, liczbę warstw, nazwy i tablice GID uint16, obiekty jako długościowane UTF-8 JSON oraz metadane. Kolizje są warstwą niezależną od grafiki. Drzwi zachowują ID, kratkę i stan.

Renderer przycina pętlę kafli do widocznego obszaru, ma nearest-neighbour, kamerę i skoki zoomu 0.5×/1×/2×. Ściany i drzwi są osobnymi drawable sortowanymi według `x+y`, razem z graczem; wysokie sprite'y wystają ponad kratkę, a sortowanie punktu kotwiczenia zapewnia częściowe zasłanianie. W demo: WASD/strzałki, E otwiera/zamyka drzwi, +/- zoom. Zapis drzwi trafia do localStorage. Logikę można serializować z `IsoMap.saveState()`.

## Amiga-ready

`npm run amiga:export -- atlas.png map.ambmap 32 out/ocs` tworzy indeksowy RAW 8-bit (0–255), oddzielną maskę alfa 0/1, wspólną paletę RGB do 256 kolorów oraz nagłówek C. 32 kolorów przeznaczone dla OCS/ECS, do 256 dla AGA; dane kafli i mapy nie zależą od Canvas. Eksport nie implementuje jeszcze renderera Amigi. `quantize-palette.mjs` robi deterministyczny wybór najczęstszych kolorów i nearest-colour mapping (bez ditheringu).

## Darmowe ściany izometryczne

Floor Pack to przede wszystkim kafle podłóg, więc osobną warstwę ścian należy traktować jako osobny atlas. Konkretne pasujące darmowe źródła: **Screaming Brain Studios Isometric Wall Pack** (CC0, prawdziwa izometria 2:1; [itch.io](https://screamingbrainstudios.itch.io/isowallpack), [OpenGameArt — 1,872 kafli](https://opengameart.org/content/1800-isometric-wall-tiles)) oraz **Kenney Isometric Dungeon Tiles** (CC0, ściany, podłogi i obiekty, [itch.io](https://kenney-assets.itch.io/isometric-dungeon-tiles)). Przed konwersją sprawdź rozmiar sprite'a w pobranym wydaniu; jeśli źródło to 128×64, zastosuj ten sam nearest-neighbour. Renderer udostępnia `setWallAtlas(image, catalog)` z cropem i offsetem na sprite, więc ściany mogą być wyższe niż 32 px.
