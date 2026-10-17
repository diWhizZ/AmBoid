<p align="center">
  <img src="docs/screens/01-tytul.png" alt="AMBOID — ekran tytułowy" width="640">
</p>

<h1 align="center">AMBOID — PROJEKT Z</h1>

<p align="center">
  Izometryczny survival zombie inspirowany <b>Project Zomboid</b>,<br>
  zaprojektowany tak, jakby miał powstać na <b>Amigę 500/1200</b>.<br>
  <b>32 kolory. 320×200. 68000. Jedna dyskietka.</b>
</p>

<p align="center">
  <a href="#uruchomienie"><b>▶ Zagraj w przeglądarce</b></a> ·
  <a href="docs/AMIGA.md"><b>Dokumentacja techniczna</b></a> ·
  <a href="docs/GDD.md"><b>Projekt gry</b></a>
</p>

---

## O co chodzi

AMBOID to fanowski hołd dla Project Zomboid przeniesiony w realia Amigi. Nie jest to
port — to wariacja na temat: małe miasteczko widziane w izometrii, głód, pragnienie,
ciemność, zombie przyciągane hałasem i deski na oknach. Wszystko ciasno upakowane
w limitach sprzętu z 1987 roku.

Gra jest w pełni grywalna: eksplorujesz, przeszukujesz meble, walczysz, zabijasz okna
deskami, śpisz w łóżkach i próbujesz przetrwać **dwie doby**.

<p align="center">
  <img src="docs/screens/02-miasteczko.png" width="49%" alt="Miasteczko w dzień">
  <img src="docs/screens/04-noc.png" width="49%" alt="Noc z latarką">
</p>
<p align="center">
  <img src="docs/screens/03-walka.png" width="49%" alt="Walka kijem bejsbolowym">
  <img src="docs/screens/06-mapa.png" width="49%" alt="Mapa okolicy">
</p>

## Uruchomienie

Potrzebujesz tylko Node.js (bez żadnych zależności produkcyjnych):

```bash
npm start
# otwórz http://localhost:8080
```

Możesz też otworzyć `index.html` przez dowolny serwer statyczny. Gra nie wymaga
budowania ani instalacji pakietów — to czysty HTML5 + ES modules.

Opcjonalnie własne miasteczko: `http://localhost:8080/?seed=ABC123`.

### Sterowanie

| Klawisz | Akcja |
| --- | --- |
| `W A S D` / strzałki | ruch w 8 kierunkach |
| `Shift` / `Ctrl` | bieg / skradanie |
| `Spacja` / LPM | atak |
| `E` | drzwi, przeszukanie, podniesienie łupu, zabicie okna |
| `Q` | użyj wybranego przedmiotu |
| `1`–`0` | wybór slotu |
| `F` / `M` / `H` | latarka / mapa / pomoc |
| `Esc` | pauza |

## Co jest w grze

- **Proceduralne miasteczko** — siatka ulic, 12 budynków z wnętrzami (dom, sklep,
  magazyn, przychodnia, stacja paliw), meble, samochody, płoty, trupy.
  To samo ziarno = to samo miasto.
- **Cykl dnia i nocy** — zmierzch, noc, latarnie uliczne, latarka, deszcz i chmury.
  Zasięg widzenia zależy od pory dnia i pogody (FOV z raycastingiem po kaflach).
- **Zombie** — 40+ na start, horda co noc o 21:00. Reagują na hałas, gonią po
  linii wzroku, wyłamują drzwi i rwą deski z okien.
- **Survival** — HP, energia, głód, pragnienie, krwawienie, zakażenie od ugryzień.
  Sen, jedzenie, picie, bandaże, tabletki.
- **Walka i łupy** — pięści, kij, siekiera, nóż, młotek, pistolet (głośny!),
  21 typów przedmiotów, przeszukiwanie pojemników, trwałość broni.
- **Zabijanie okien** — młotek + deski + gwoździe, do 3 warstw na okno.
- **Cel** — przetrwać do początku trzeciego dnia (licznik w HUD), a potem graj dalej.

Cała grafika i dźwięk powstają **proceduralnie** — w repozytorium nie ma ani jednego
pliku PNG używanego przez grę ani pliku audio. Paleta jest zamknięta na 32 kolory.

## Jak to jest zrobione po amigowemu

| Element | Amiga | Ten prototyp |
| --- | --- | --- |
| Rozdzielczość | 320×200 lowres | 320×200, skalowanie nearest |
| Paleta | 5 bitplanów = 32 kolory | stała tablica 32 kolorów |
| Izometria | 32×16 kafli | te same proporcje 2:1 |
| Cień / mgła | dither Bayera 4×4 | matryca Bayera w rendererze |
| Światło | pre-shaded paleta | 4 tablice przemapowania indeksów + dither |
| Dźwięk | Paula, 4 kanały | WebAudio, fale kwadratowe i szum |
| Grafika | DPaint | atlas IFF ILBM (5 bitplanów) w `docs/amiga/` |

Najważniejsza decyzja: **wszystko rysowane jest w indeksach palety**, a nie w RGB.
Bufor `Uint8Array` 320×200 → konwersja na RGBA dopiero przy wystawieniu na canvas.
Dzięki temu gra nie może „wyjść" poza paletę — test w `tools/browsertest.mjs`
sprawdza, że na ekranie jest dokładnie 0 pikseli spoza palety.

## Dokumentacja

- **[docs/AMIGA.md](docs/AMIGA.md)** — pełny plan przeniesienia na A500/A1200:
  tryby graficzne, budżet cykli 68000, DMA, blitter, struktura pamięci,
  format plików, plan pracy i lista cięć.
- **[docs/GDD.md](docs/GDD.md)** — projekt gry: pętla rozgrywki, ekonomia,
  AI zombie, tabela przedmiotów, balans, UI.
- **[docs/amiga/](docs/amiga/)** — wyeksportowane assety: atlasy IFF ILBM
  (do otwarcia w Deluxe Paint), paleta `.pal`, wygenerowane miasto `.amb`.

## Narzędzia

```bash
npm run shots   # zrzuty ekranu do docs/screens
npm test        # testy logiki: ruch, walka, łupy, zabijanie okien, sen, śmierć
node tools/export_amiga.mjs   # atlasy IFF ILBM + paleta
node tools/export_map.mjs     # miasto w formacie binarnym .amb
node tools/stress.mjs         # 6000 losowych klatek bez wyjątków
node tools/browsertest.mjs    # integracja main.js z atrapą DOM
```

Testy w Node nie potrzebują przeglądarki — `tools/shots.mjs` renderuje prawdziwe
klatki gry do PNG przez `pngjs`.

## Struktura

```
index.html            ekran + delikatny CRT
src/palette.js        paleta 32 kolorów (jedyne źródło prawdy)
src/render.js         bufor indeksów, kamera izometryczna, dither, sprite'y
src/art.js            proceduralna grafika: kafle, ściany, postacie, ikony
src/pixel.js          mały PixelBuffer do rysowania sprite'ów
src/font.js           font 5×7 z polskimi znakami
src/world.js          generator miasteczka, FOV, drzwi, deski, loot
src/game.js           pętla gry, movement, walka, statusy, ekrany
src/scene.js          sortowanie izometryczne, cięcie ścian, efekty
src/ui.js             HUD, menu, mapa, pomoc, ekrany końca
src/audio.js          proceduralne SFX (WebAudio)
tools/                serwer, testy, eksport IFF/AMB, zrzuty ekranu
```

## Ograniczenia i uczciwe zastrzeżenia

- To **prototyp przeglądarkowy**, nie build na Amigę. Prawdziwy port wymaga
  implementacji w C/assemblerze 68000 — plan i budżet są w `docs/AMIGA.md`.
- Grafika jest celowo surowa i ograniczona paletą; to nie jest pixel art z DPaint,
  tylko generatory pikseli. Atlasy IFF można dopieścić ręcznie.
- Projekt nie zawiera żadnych assetów Project Zomboid — inspiracja dotyczy
  mechanik, nie zawartości.

## Licencja i pochodzenie

Projekt fanowski, niekomercyjny, hobbystyczny. Kod na licencji MIT.
Project Zomboid należy do The Indie Stone; Amiga to znak Commodore.
