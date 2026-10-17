<p align="center">
  <img src="docs/screens/01-tytul.png" alt="AMBOID — ekran tytułowy" width="640">
</p>

<h1 align="center">AMBOID — PROJEKT Z</h1>

<p align="center">
  Izometryczny survival zombie inspirowany <b>Project Zomboid</b>,<br>
  zaprojektowany tak, jakby miał powstać na <b>rozbudowaną Amigę 1200 (AGA)</b><br>
  albo system z <b>kartą RTG</b>.<br>
  <b>64 kolory. Światło RGB. 320×200. 68030.</b>
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
ciemność, zombie przyciągane hałasem i deski na oknach. Wszystko upakowane
w limitach Amigi — ale bez ascezy A500: 64 kolory AGA i prawdziwe światło RGB
na karcie RTG, z trybem zgodności OCS jako opcją.

Gra jest w pełni grywalna: eksplorujesz, przeszukujesz meble, walczysz, zabijasz okna
deskami, śpisz w łóżkach i próbujesz przetrwać **dwie doby**.

<p align="center">
  <img src="docs/screens/02-miasteczko.png" width="49%" alt="Miasteczko w dzień — AGA 64">
  <img src="docs/screens/04-noc.png" width="49%" alt="Noc z latarką — RTG, światło RGB">
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

Opcjonalnie własne miasteczko i tryb grafiki:
`http://localhost:8080/?seed=ABC123&gfx=rtg` (`ocs`, `aga` lub `rtg`).

**Windows — pełna instrukcja krok po kroku:** [docs/WINDOWS.md](docs/WINDOWS.md)
(Node.js, PowerShell, porty, testy, typowe problemy).

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
| `G` | przełącz tryb grafiki: OCS 32 → AGA 64 → RTG |
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
pliku PNG używanego przez grę ani pliku audio. Paleta bazowa ma 32 kolory, a AGA
dokłada 32 półtony; OCS mapuje je z powrotem na bazę.

## Trzy tryby grafiki

Ten sam tileset i ta sama logika działają w trzech profilach. Przełączasz je
klawiszem **G** (albo w menu: `GRAFIKA`) — wybór zapisuje się w przeglądarce.

| Profil | Kolory | Bitplany | Światło | Zastosowanie |
| --- | --- | --- | --- | --- |
| **OCS 32** | 32 | 5 | tablice przygaszenia | A500, CD32, tryb zgodności |
| **AGA 64** | 64 | 6 | tablice przygaszenia | A1200 030+, domyślny |
| **RTG RGB** | 64 | chunky 8-bit | **prawdziwe światło RGB** | karta RTG (P96/CGX) |

<p align="center">
  <img src="docs/screens/02-miasteczko.png" width="32%" alt="AGA 64 — dzień">
  <img src="docs/screens/09-ocs-dzien.png" width="32%" alt="OCS 32 — ten sam kadr">
  <img src="docs/screens/04-noc.png" width="32%" alt="RTG — noc, światło RGB">
</p>
<p align="center"><i>AGA 64 · OCS 32 (ten sam kadr) · RTG w nocy</i></p>

## Jak to jest zrobione po amigowemu

| Element | Amiga | Ten prototyp |
| --- | --- | --- |
| Rozdzielczość | 320×200 lowres | 320×200, skalowanie nearest |
| Paleta | 6 bitplanów = 64 kolory (AGA) | 32 kolory bazowe + 32 półtony |
| Izometria | 32×16 kafli | te same proporcje 2:1 |
| Cień / mgła | pre-shaded paleta | 4 tablice przemapowania (64 wpisy) |
| Światło | lightmapa / blitter | RTG: `rgbaLit` — ambient + 8 świateł RGB |
| Dźwięk | Paula, 4 kanały | WebAudio, fale kwadratowe i szum |
| Grafika | DPaint / Personal Paint | IFF ILBM 5 i 6 bitplanów w `docs/amiga/` |

Najważniejsza decyzja: **wszystko rysowane jest w indeksach palety**, a nie w RGB.
Bufor `Uint8Array` 320×200 → konwersja na RGBA dopiero przy wystawieniu na canvas.
Dzięki temu gra nie może „wyjść" poza paletę — test w `tools/browsertest.mjs`
sprawdza, że na ekranie jest dokładnie 0 pikseli spoza palety.

## Dokumentacja

- **[docs/AMIGA.md](docs/AMIGA.md)** — plan przeniesienia na A1200 AGA / RTG:
  trzy profile, budżet 68030, blitter vs chunky, paleta 64 kolorów,
  światło RGB, struktura pamięci, format plików i lista cięć.
- **[docs/GDD.md](docs/GDD.md)** — projekt gry: pętla rozgrywki, ekonomia,
  AI zombie, tabela przedmiotów, balans, UI.
- **[docs/WINDOWS.md](docs/WINDOWS.md)** — uruchomienie prototypu pod Windows
  krok po kroku: instalacja Node.js, `npm start`, wybór trybu, testy.
- **[docs/amiga/](docs/amiga/)** — atlasy IFF ILBM do Deluxe Paint / Personal
  Paint: `docs/amiga/` (32 kolory, 5 bitplanów) i `docs/amiga/aga/`
  (64 kolory, 6 bitplanów), palety `.pal`, miasto `.amb`.

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
src/palette.js        paleta 32 + 32 półtony AGA (jedyne źródło prawdy)
src/profiles.js       profile OCS / AGA / RTG
src/render.js         bufor indeksów, kamera, światło RGB, sprite'y
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
  implementacji w C/assemblerze 68030 — plan i budżet są w `docs/AMIGA.md`.
- Grafika jest celowo surowa i ograniczona paletą; to nie jest pixel art z DPaint,
  tylko generatory pikseli. Atlasy IFF można dopieścić ręcznie.
- Projekt nie zawiera żadnych assetów Project Zomboid — inspiracja dotyczy
  mechanik, nie zawartości.

## Licencja i pochodzenie

Projekt fanowski, niekomercyjny, hobbystyczny. Kod na licencji MIT.
Project Zomboid należy do The Indie Stone; Amiga to znak Commodore.
