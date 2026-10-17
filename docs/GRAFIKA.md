# AMBOID — plan poprawy strony graficznej

Stan na **v0.2.2**. Punkt wyjścia: 320×200, izometria 2:1, kafle 32×16, ściany
20 px, wszystko proceduralne, palety 32 (OCS) / 64 (AGA, RTG).

Dokument odpowiada na pytanie „co możemy zrobić, żeby gra wyglądała lepiej” —
w kolejności od rzeczy o największym efekcie do najbardziej kosztownych.

---

## 1. Co już jest (v0.2.2)

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
