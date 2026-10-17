# AMBOID — plan poprawy strony graficznej

Stan na **v0.2.5** (widok daleki; grunt i podłogi przebudowane w 0.2.5, reszta tilesetu z 0.2.3). Punkt wyjścia: 320×200,
izometria 2:1, kafle 32×16, ściany 20 px, wszystko proceduralne, palety 32 (OCS) / 64 (AGA, RTG).
Sekcja **9** opisuje, co faktycznie zrobiono w v0.2.5 i jak to zweryfikowano.

Dokument odpowiada na pytanie „co możemy zrobić, żeby gra wyglądała lepiej” —
w kolejności od rzeczy o największym efekcie do najbardziej kosztownych.

---

## 1. Co już jest (stan v0.2.4)

- **widok daleki 0,75×** (świat 427×267 → 320×200, MAJORITY 2×2) i bliski 1×,
- **V / `?view=far|close`**, HUD i kursor bez pomniejszania, ostre trasy po skalowaniu,
- trzy profile grafiki: OCS 32, AGA 64 i RTG z prawdziwym światłem RGB,
- pięć tonów na materiał (AGA/RTG) i mapowanie półtonów do bazy w OCS,
- trzy warianty każdej podłogi, pięć wariantów ściany, dither Bayera,
- cutaway ścian od strony kamery, cienie pod postaciami i rekwizytami,
- **stożek latarki i halo latarni** w RTG (nowe w 0.2.2),
- **portret ocalałego** w HUD (nowe w 0.2.2),
- komunikaty przeniesione pod panel statusu, żeby nie zasłaniały HUD (0.2.2),
- deszcz z rozbryzgami na ziemi (0.2.2),
- krew i gruz jako dekalacje podłogi, animacja chodu 2-klatkowa,
- CRT: scanlines, winieta, lekki blur poświaty (tylko warstwa prezentacji).

To jest solidna baza. Poniższe punkty nie zmieniają stylu — zwiększają
różnorodność, głębię i czytelność.

---

## 2. Priorytet A — tanie, widoczne od razu

| # | Zmiana | Efekt | Koszt | Status |
| --- | --- | --- | --- | --- |
| A1 | stożek latarki + poświata latarni | noc przestaje być płaskim kołem | 1 h | **zrobione** |
| A2 | portret w HUD (reaguje na HP i zakażenie) | HUD przestaje być tabelką | 1 h | **zrobione** |
| A3 | komunikaty pod panelem statusu | koniec zasłaniania pasków HP | 0,5 h | **zrobione** |
| A4 | rozbryzgi deszczu | deszcz „dotyka” ziemi | 0,5 h | **zrobione** |
| A5 | ciemniejsza, niebieska noc w RTG | kontrast światła i mroku | 0,5 h | **zrobione** |
| A6 | więcej krwi przy trafieniach (2–3 plamy na cios) | walka zostawia ślad | 0,5 h | do zrobienia |
| A7 | kurz/spusty pod stopami podczas biegu | ruch ma masę | 1 h | do zrobienia |

---

## 3. Priorytet B — największy zwrot (3–5 dni)

### B1. Więcej wariantów kafli

Dziś są 3 warianty na materiał i oko łapie powtarzalny wzór (zwłaszcza asfalt
i chodnik). Cel: **6–8 wariantów** na materiał, plus przy rysowaniu losowy
wybór wariantu zależny od `(x*7+y*13) % n` — bez dodatkowego losowania w klatce.

- 4 warianty asfaltu (pęknięcia, łatki, ślady opon, czysty),
- 4 chodnika (płyty całe, pęknięte, z trawą w szczelinie, z krwią),
- 6 trawy (dwie wysokości, kwiaty, wydeptana ścieżka),
- 4 wnętrz (deski, kafel, wykładzina, beton).

Koszt pamięci: ~6 KB atlasu w AGA (mniej niż jedna klatka animacji).

### B2. Autotile krawędzi

Zamiast losowych kafli — zestaw masek 16-kierunkowych dla przejść
trawa↔asfalt, chodnik↔jezdnia, trawa↔brud. Krawędzie przestają być poszarpane,
miasto wygląda „narysowane”, a nie „wysypane z worka”. To zwykle najbardziej
widoczna pojedyncza poprawa w grach izometrycznych.

### B3. Cienie i ambient occlusion

- 2-pikselowy, ditheringowy cień u podstawy każdej ściany (na sąsiednim kaflu),
- ciemniejszy narożnik tam, gdzie stykają się dwie ściany,
- cień pod każdym autem i drzewem (dziś jest tylko pod dużymi rekwizytami).

Efekt: budynki „siedzą” w ziemi zamiast na niej leżeć.

### B4. Animacje

- chód 4-klatkowy zamiast 2 (koszt: 2 dodatkowe klatki × 4 kierunki × 2 postacie),
- bezczynność: 2 klatki oddechu,
- atak: 3 klatki zamachu (dziś jest tylko efekcie `swing`),
- zombie: 4 klatki chodu i 1 klatka „szarpnięcia” drzwi.

### B5. Wnętrza

- meble z dwoma poziomami cieniowania (blat jaśniejszy, bok ciemniejszy),
- „kurz w snopie światła” w RTG (kilka wolnych pikseli w stożku latarki),
- ciemniejsze podłogi w głębi budynków (głębia bez dodatkowych kolorów).

---

## 4. Priorytet C — klimat (ok. tygodnia)

| # | Zmiana | Uwagi |
| --- | --- | --- |
| C1 | kałuże z odbiciem w RTG | tylko po deszczu, 4 warianty kafla; w OCS/AGA wersja bez odbicia |
| C2 | mgła jako dither na krawędzi FOV | tanie, działa we wszystkich trybach |
| C3 | ślady stóp i smugi krwi na ścianach | dekalacje z limitem (np. 64 na mapę) |
| C4 | HUD: mimika portretu, animowane ikony pogody | 3–4 klatki, mały atlas |
| C5 | mapa jako odręczny szkic | zarysy budynków, ikony, „?” na nieznanym terenie |
| C6 | ekran tytułowy: miasto w tle, animowane logo | parallax w 2 warstwach |

---

## 5. Priorytet D — rzeczy specyficzne dla Amigi

| # | Zmiana | Dlaczego |
| --- | --- | --- |
| D1 | copper list do gradientu nieba/HUD | darmowe kolory w natywnej wersji AGA |
| D2 | OCS: 3 tony + dither zamiast 5 | oszczędza bitplany i pamięć |
| D3 | RTG: lightmapa 160×100 skalowana ×2 | 4× mniej pracy niż per-pikselowe światło |
| D4 | atlas 320×256, 48 KB / 64 KB | mieści się w budżecie klatki AGA/RTG |
| D5 | osobny zestaw kafli „nocnych” zamiast tablic | mniej przemapowań w blitach |

---

## 6. Budżet pamięci (stan obecny + plan)

| Element | AGA dziś | Po B1–B4 | Uwagi |
| --- | --- | --- | --- |
| kafle podłóg (10×3) | ~19 KB | ~38 KB | 6–8 wariantów |
| ściany (3 materiały × 5) | ~12 KB | ~12 KB | bez zmian |
| postacie (2×4×4) | ~10 KB | ~18 KB | 4 klatki chodu |
| rekwizyty + ikony | ~7 KB | ~9 KB | drobne dodatki |
| **razem** | **~48 KB** | **~77 KB** | poza budżetem jednej klatki — trzeba dzielić na banki |

Wniosek: przed B1 trzeba wprowadzić **banki kafli ładowane z HDD/CF** (albo
kompresję RLE atlasu), inaczej 64 KB na klatkę pęknie. To i tak jest potrzebne
w wersji natywnej.

---

## 7. Kolejność wdrożenia

**Bieżący priorytet — etap 4 (Cannon Fodder):** czytelne ikony ekwipunku i łupów
z jednej 16-kolorowej podpalety, bez gradientów; animacje 2–4-klatkowe,
mirror zamiast niezależnego rysowania obu boków; krew, łuski, dym, błysk,
ślady stóp z limitem pamięci. Portret i pasek stanu zaprojektowane w 320×200.
Postacie/rekwizyty mają spójną perspektywę diagonal-down, ale grunt pozostaje
32×16 i ściana 20 px. CF nie wymusza zmiany siatki świata ani walki na RTS.
Filozofia: **70% Project Zomboid / 30% Cannon Fodder**.

Najpierw publikacja v0.2.4 na main i Release; następnie etap 4, potem etap 5 — NPC.
Poniższy starszy backlog pozostaje propozycją, nie powodem do zwiększania
animacji ponad 4 klatki lub przebudowywania kafli.


1. **A6–A7** — domknięcie tanich efektów (1 dzień).
2. **B2 + B3** — autotile i cienie; największa zmiana w odbiorze miasta (2 dni).
3. **B1** — więcej wariantów kafli, po wprowadzeniu banków (2 dni).
4. **B4** — animacje (2–3 dni).
5. **C1–C2** — pogoda (2 dni).
6. **D2–D3** — optymalizacje pod Amigę (przy przenoszeniu silnika).

---

## 8. Kryteria akceptacji

- w kadrze 320×200 nie widać dwóch identycznych kafli tego samego materiału
  w odległości mniejszej niż 2 kafle,
- krawędzie trawa/asfalt i chodnik/jezdnia mają spójny, 16-maskowy autotile,
- każda ściana ma cień u podstawy, a budynek nie „unosi się” nad ziemią,
- chód i atak mają minimum 4 i 3 klatki, zombie — 4,
- wszystkie kolory nadal mieszczą się w palecie (test `0 px poza paletą`),
- budżet klatki: AGA ≤ 48 KB, RTG ≤ 64 KB (po podziale na banki),
- `npm test` zielony po każdej zmianie.


---

## 9. v0.2.5 — grunt i podłogi od nowa (ZROBIONE)

Powód: kafle v0.2.4 były wizualnie słabe i wyraźnie pasmowały. Potwierdzone
źródła problemu i ich rozwiązanie:

| Problem v0.2.4 | Rozwiązanie v0.2.5 |
| --- | --- |
| gradient `gx=(x-2y+16)/48` oświetlał każdy romb osobno → ukośne pasy na płaskiej powierzchni | gradient usunięty; ton = materiał + zabrudzenie, bez fałszywej bryły |
| asfalt: ciemne wzory na y=5 i y=11 w każdym wariancie; beton: szczelina na y=8; drewno: linie co 3 px | prążki usunięte; pęknięcia i łatki jako nieliczne, nieregularne skupiska |
| drewno i ceramika wzorowane w osiach obrazka | wzory w UV płaszczyzny podłogi: `u=(px-16)/32+py/16`, `v=py/16-(px-16)/32`, ze środkami pikseli; wzór ciągły przez `tileX+u`, `tileY+v` |
| dużo kontrastowego szumu jednopikselowego | celowe skupiska 2–5 px na spokojnym tle; raport `tools/texshots.mjs --report` mierzy udział „samotnych” pikseli (asfalt 23% → 3%) |
| warianty `tile` i `carpet` identyczne | wszystkie warianty parami różne (test) |
| rampy nieuporządkowane jasnością (grass 54→23→9→12→6) | rampy monotoniczne po luminancji (test); średnia jasność wariantów materiału zbliżona (test, ±10) |
| maska rombu 272 px → ~6% pikseli płaszczyzny nadpisywanych | maska testem środka piksela = 256 px; pokrycie płaszczyzny 1:1 bez dziur (test); `PixelBuffer.fillPoly` nietknięty |
| krawężnik na każdym kaflu chodnika | krawężnik rysuje `scene.js` wyłącznie tam, gdzie `world.isRoad()` sąsiaduje z chodnikiem |
| dobór wariantów `rng.int(0,2)` z RNG świata i `% 3` w scenie | `groundVariantIndex(kind,x,y,seed)`: dokładna faza siatki strukturalnej + detal z `hashInt`; `% 3` usunięte; zużycie RNG świata 1:1 z 0.2.4 (ten sam seed = ten sam świat) |

### Struktura generatora (`src/art.js`)

- `GROUND_SPEC`: `lattice` = okres wzoru strukturalnego w kaflach (fazy X×Y),
  `details` = liczba zestawów detalu na fazę, `salt` = ziarno hasza.
  Liczba wariantów = `lx*ly*details` (4–8 na materiał).
- Faza musi być **dokładna** (parzystość współrzędnych świata), bo tylko wtedy
  fugi płyt, spoiny desek i dylatacje schodzą się między kaflami.
  Detal dobiera `hashInt(x, y, seed^salt, details)` — nie liniowe modulo
  i nie `Math.random()` w klatce.
- Detale rysowane ≥1 px od krawędzi rombu (`MASK_INNER`), więc sąsiedni kafel
  nigdy nie ucina kształtu w połowie.
- Generowanie odbywa się wyłącznie w `buildArt()` (atlas), zero pracy per piksel
  klatki; dobór wariantu w klatce to jeden hasz na kafel.

### Budżet — pomiar, nie założenie (`tools/texbench.mjs`)

| | v0.2.4 | v0.2.5 |
| --- | --- | --- |
| kafle terenu | 30 | 54 |
| chunky 8 bit | 15 360 B | 27 648 B (+12 288 B) |
| 6 bitplanów AGA | 11 520 B | 20 736 B (+9 216 B) |
| maska rombu | 30 × 64 B | 1 × 64 B (wspólna dla wszystkich kafli) |
| render kadru far 0,75× | 2,208 ms/klatkę | 1,941 ms/klatkę |
| `buildArt()` | 41,1 ms | 31,6 ms |

Uwaga o „48 000 B”: to rozmiar framebufferu AGA 320×200 (6 bitplanów), a nie
limit wszystkich assetów. Atlas podłóg jest osobną pamięcią chip/blade i mieści
się w jednej stronie atlasu 320×256 w 6 bitplanach (61 440 B). Render tego
samego kadru jest w v0.2.5 **szybszy** niż w bazie, więc nie ma potrzeby
przebudowy silnika ani banków kafli z powodu tej zmiany.

### Weryfikacja wizualna

`npm run texshots` (`tools/texshots.mjs`) zapisuje do ignorowanego `shots/`
powtarzalne kadry: płaska płaszczyzna każdego materiału (jednolity wariant
i wymieszane warianty), skrzyżowanie jezdnia/chodnik/trawa, wnętrza z deskami,
ceramiką, wykładziną i betonem, właściwy kadr gry w far 0,75× i close 1×,
AGA dzień / OCS 32 / RTG noc, bufor świata przed `blitScaled` oraz cztery fazy
przesunięcia kamery o pojedyncze piksele. Zrzuty PNG nie zawierają warstwy CRT
(to wyłącznie CSS w `index.html`), więc kontrola „bez CRT” jest wbudowana.

Mierzone migotanie przy przesuwaniu kamery o 1 px (udział pikseli kadru
zmienionych między fazami, obszar świata): v0.2.4 ≈ 24–28%, v0.2.5 ≈ 17%.
