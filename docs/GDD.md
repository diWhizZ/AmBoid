# AMBOID — dokument projektowy (GDD)

Wersja 0.2.2 · prototyp HTML5 · cel docelowy: A1200 AGA / RTG

---

## 1. Wizja

**Jedno zdanie:** Project Zomboid w izometrii, na Amidze, w 64 kolorach AGA
(albo z prawdziwym światłem na karcie RTG), w mieście tak małym, żeby można je
było objąć wzrokiem — i tak niebezpiecznym, że to nie pomaga.

**Filary:**

1. **Każda decyzja kosztuje.** Wyjść po jedzenie w nocy? Otworzyć drzwi (hałas)
   czy okno (trzeba desek)? Strzelić czy walczyć kijem?
2. **Świat nie czeka.** Czas płynie, głód i pragnienie spadają, zombie wędrują.
   Nie ma „pauzy taktycznej" — pauza to tylko ekran.
3. **Czytelność zamiast realizmu.** Ograniczona paleta wymusza skróty: kontur,
   dither, ikony. Gracz ma wiedzieć, co widzi, w jednej klatce.
4. **Amiga to nie ograniczenie, to styl.** Ograniczenia sprzętowe są częścią
   doświadczenia: bieg zamiast animacji 24 fps, paleta zamiast milionów kolorów.

**Non-goals (świadomie poza zakresem):** wielopiętrowe budynki, pojazdy którymi się
jeździ, crafting drzewek technologicznych, NPC, multiplayer, otwarty świat większy
niż 48×40 kafli.

---

## 2. Pętla rozgrywki

```
    ┌──────────────────────────────────────────────────────────┐
    │  ROZPOZNANIE  →  PLAN  →  WYPRAWA  →  RYZYKO  →  NAGRODA │
    └──────────────────────────────────────────────────────────┘
```

1. **Rozpoznanie** — mapa (M) pokazuje tylko to, co już zobaczyłeś. Nieznane
   budynki mają zarysy, ale nie wiadomo, co w nich jest.
2. **Plan** — decyzja: dom (bezpieczny, mało łupów), sklep (jedzenie), magazyn
   (narzędzia), przychodnia (lekarstwa), stacja (pistolet).
3. **Wyprawa** — ruch po izometrycznej siatce, omijanie lub zabijanie zombie,
   otwieranie drzwi (ryzyko hałasu).
4. **Ryzyko** — hałas ściąga zombie; walka rani; ugryzienie może zakazić.
5. **Nagroda** — łupy, XP walki, lepszy sprzęt, zabite okna = bezpieczniejsza noc.

**Sesja:** 10–25 minut do pierwszego zgonu, 25–40 minut do pełnego przetrwania.
**Cel:** przetrwać dwie pełne doby — od 08:00 dnia 1 do 08:00 dnia 3 (2880 minut gry = 48 godzin).
Po wygranej można grać dalej — tryb nieskończony.

---

## 3. Świat

- **Rozmiar:** 48×40 kafli = 1920 kafli. Jeden kafel 32×16 px w izometrii 2:1.
- **Struktura:** siatka 3×3 kwartałów rozdzielonych ulicami (2 kafle szerokości),
  chodniki po bokach.
- **Budynki:** 12, każdy z podłogą, ścianami, drzwiami i oknami, wyposażony
  w meble-pojemniki i dekoracje.

| Budynek | Typ | Gwarantowany łup |
| --- | --- | --- |
| Dom startowy | house | kij bejsbolowy, bandaże, woda |
| Sklep | shop | jedzenie, woda, plecak |
| Magazyn | warehouse | siekiera, deski, gwoździe, młotek |
| Przychodnia | clinic | apteczka, bandaże, tabletki |
| Stacja paliw | gas | pistolet + amunicja |
| 6 domów | house | losowe meble i drobne łupy |
| 1 dom | house | (pusty, „na dokładkę") |

- **Pora dnia:** start 08:00 dnia 1. Dzień trwa 288 sekund (5 minut gry na sekundę).
  - 05:00–07:00 świt (przygaszenie 2)
  - 08:00–18:00 dzień (pełne światło)
  - 19:00–21:00 zmierzch (przygaszenie 2)
  - 22:00–05:00 noc (przygaszenie 2 + latarnie + latarka)
- **Pogoda:** słońce / chmury / deszcz, zmiany co 55–145 s. Deszcz zmniejsza
  zasięg widzenia o 1 i wycisza część dźwięków tła (wizualnie: animowane smugi).
- **Horda:** o 21:00 każdej nocy przy krawędzi mapy pojawia się 8 + 3×dzień zombie
  i idzie w stronę gracza. To główne „wydarzenie" nocy.

---

## 4. Gracz

| Statystyka | Start | Spadek | Uwagi |
| --- | --- | --- | --- |
| HP | 100 | walka, głód, pragnienie, krwawienie, zakażenie | brak regeneracji bez jedzenia i picia |
| Energia | 100 | bieg (−2,4/s), chodzenie (−0,09/s) | odpoczynek +0,06/s, sen = 100 |
| Głód | 88 | 24 / dobę | 0 = −0,12 HP/s |
| Pragnienie | 82 | 36 / dobę | 0 = −0,18 HP/s |
| Krwawienie | — | −0,35 HP/s | bandaże tamują |
| Zakażenie | — | od ugryzienia | 100% po ~7,2 min = śmierć |

**Regeneracja:** jeśli głód > 55, pragnienie > 55, brak krwawienia i zakażenia —
+0,035 HP/s (powolne dochodzenie do zdrowia).

**Ruch:** 8 kierunków, krok co 0,22 s (bieg 0,15 s, skradanie 0,40 s, okno ×2).
Każdy krok generuje hałas: bieg 6 kafli, chód 3,2, skradanie 1,2.

**Dwa schematy sterowania (klawisz K).** Izometria 2:1 nie ma jednego
oczywistego mapowania WASD, więc gra daje wybór: **EKRAN** (W góra, S dół,
A lewo, D prawo) i **IZO** (W ↖, D ↗, S ↘, A ↙). Dwa sąsiednie klawisze dają
ruch po osi ekranu. Wybór jest pamiętany w `localStorage['amboid.controls']`.

**Pad:** Gamepad API mapuje lewą gałkę i D-pad na ruch, A na atak, B na akcję,
X na użycie, Y na latarkę, LB/RB na sloty, LT/RT na skradanie/bieg,
Back na mapę, Start na pauzę.

**Doświadczenie:** +2 XP za trafienie, +4 za zabicie; co 12 XP poziom walki
(+2 obrażeń bazowych). Czasopisma dają +6 XP.

---

## 5. Walka

| Broń | Obrażenia | Czas | Zasięg | Hałas | Trwałość |
| --- | --- | --- | --- | --- | --- |
| Pięści | 6 | 0,50 s | 1,4 | 0,8 | — |
| Nóż | 17 | 0,42 s | 1,25 | 0,5 | 100 |
| Młotek | 13 | 0,60 s | 1,35 | 2 | 50 |
| Kij bejsbolowy | 26 | 0,72 s | 1,55 | 2 | 60 |
| Siekiera | 44 | 1,00 s | 1,6 | 3 | 40 |
| Pistolet | 34 | 0,90 s | 10 | 22 | — |

- **Kryt:** 12% szans na ×1,9 obrażeń.
- **Trafienie:** zombie dostaje stun 0,35 s i błysk; krew losowo zostawia dekalkę.
- **Broń palna:** wymaga amunicji, każdy strzał zużywa 1 nabój i generuje hałas
  o promieniu 22 kafli — praktycznie gwarantuje hordę.
- **Zombie:** 28–46 HP, atak co ~1,15 s:
  - 40% drapnięcie (5–9 dmg, 5% zakażenie, 12% krwawienie)
  - 30% ugryzienie (9–15 dmg, 30% zakażenie, 40% krwawienie)
  - 18% popchnięcie (2–4 dmg, −3 energii)
  - 12% chybienie

**Wytrzymałość broni** spada o 1 za każde użycie; przy 0 broń znika z ekwipunku.
Pasek zużycia widać pod ikoną na pasku slotów.

---

## 6. Zombie i AI

Maszyna stanów:

```
WANDER ──(hałas)──▶ INVESTIGATE ──(widzi gracza)──▶ CHASE ──(straci z oczu 4 s)──▶ INVESTIGATE
   ▲                     │                              │
   └────(dotarł/timer)───┘                              └──(blisko gracza)──▶ ATAK / WYŁAMYWANIE
```

- **Zasięg wzroku:** dzień 8, zmierzch 7, noc 5; +3 przy włączonej latarce;
  −2 w deszczu; +1 gdy gracz biegnie; −1 gdy się skrada.
- **Linia wzroku:** Bresenham po kaflach; zatrzymują ją ściany, zamknięte drzwi
  i zabite deski (nie zatrzymują: otwarte drzwi, szyby bez desek).
- **Ruch:** jeden kafel co 0,52 s w pościgu, 1,05 s wędrując. Zombie nie mogą
  wejść na kafel gracza ani na innego zombie.
- **Wyłamywanie:** jeśli gracz jest w promieniu 7 kafli, zombie przy zamkniętych
  drzwiach lub zabitym oknie atakuje przeszkodę (drzwi 70 HP, deski 30 HP/warstwa,
  max 3 warstwy). Każde uderzenie robi hałas.
- **Zbieranie się:** hałas ustawia cel INVESTIGATE na źródło na 8 s; horda z nocy
  ma z góry wyznaczony cel w okolicy gracza.
- **Animacja:** 2 klatki (zombie chwiejny krok), 5 wariantów kolorystycznych.

---

## 7. Przedmioty i łupy

21 przedmiotów w 5 kategoriach:

- **Jedzenie:** konserwa (+34 głodu), chipsy (+15 głodu, −4 pragnienia)
- **Picie:** woda (+42 pragnienia), whisky (+8 pragnienia, +6 energii)
- **Leczenie:** bandaż (+18 HP, tamuje), apteczka (+55 HP, tamuje),
  tabletki (+6 HP, −6% zakażenia)
- **Broń:** nóż, młotek, kij, siekiera, pistolet (+ amunicja)
- **Materiały i sprzęt:** deska, gwoździe, plecak (+5 slotów), latarka,
  złom, czasopismo, mapa, klucz

**Pojemniki:** lodówka, półka, szafka, skrzynia, śmietnik, kontener, bagażnik
samochodu, ciało, stół. Generowane z tabel wagowych zależnych od typu pojemnika;
przeszukanie trwa 0,9 s, pojedyncze pojemniki można przeszukać raz (chyba że
coś zostało z powodu braku miejsca).

**Ekwipunek:** 10 slotów + 5 za plecak. Amunicja i gwoździe się stackują.
Brak miejsca = łup zostaje w pojemniku (można wrócić).

---

## 8. Ekonomia przetrwania

Doba ma 288 sekund. W tym czasie gracz potrzebuje:

- ~2 porcje jedzenia (głód spada o 24)
- ~2 porcje picia (pragnienie spada o 36)
- 1 łóżko (sen 7–8 h)

Miasto zawiera ~70 pojemników i ~25 przedmiotów na ziemi — wystarczy na ~3 doby
bez wychodzenia z miasta. To celowe: **gracz nie umiera z braku zasobów, tylko
z głupich decyzji**. Presja pochodzi z nocy i hordy, nie z pustych sklepów.

---

## 9. Interfejs

- **Lewy górny:** portret ocalałego (reaguje na HP, krwawienie i zakażenie),
  HP (czerwony), energia (żółty), głód (zielony), pragnienie (niebieski) —
  ikony 7×7 i paski.
- **Prawy górny:** dzień, zegar, pogoda (ikona), cel (pozostały czas).
- **Środek dołu:** pasek akcji (przeszukiwanie), podpowiedź interakcji („E ..."),
  nazwa wybranego przedmiotu + stan broni.
- **Dół:** 10–15 slotów ekwipunku z ikonami i licznikami.
- **Komunikaty:** maks. 2 linie tuż pod panelem statusu, po 6 s każdy;
  nie zasłaniają już pasków HP.
- **Mapa (M):** siatka 4 px/kafel, tylko zbadany teren; żółty = gracz.
- **Ekrany:** tytuł, pomoc, o projekcie, pauza, mapa, śmierć (statystyki), wygrana.

---

## 10. Balans — założenia

| Parametr | Wartość | Uzasadnienie |
| --- | --- | --- |
| Zombie na start | 40 | ~1 na 48 kafli; tłoczno, ale da się przejść |
| Zasięg wzroku gracza | 13 / 11 / 9 | 320×200 obejmuje ~10 kafli w poziomie |
| Promień FOV nocą | 9 + 3 latarka | ciemność ma znaczenie, ale nie oślepia |
| Horda | 8 + 3/dzień | noc 1: 11, noc 2: 14 — do ogarnięcia w domu |
| Cel | 48 h (2 doby) | pełna pętla: dzień 1 nauka, noc 1 test, dzień 2 decyzje, ranek 3 finał |
| HP zombie | 28–46 | 2 uderzenia kijem, 1 siekierą, 4 nożem |

**Śmierć jest informacyjna:** ekran końcowy pokazuje przyczynę zgonu, czas
przetrwania, zabójstwa, poziom walki, przebytą odległość i ziarno świata.
Ziarno pozwala powtórzyć dokładnie to samo miasteczko.

---

## 11. Oprawa

- **Paleta:** 32 kolory bazowe + 32 półtony AGA (64 w trybie AGA/RTG) — 9 odcieni
  „ziemi" (zieleń, brąz), 5 metali, 4 kolory krwi, 4 skóry, 4 neutralne,
  żółty UI, niebieski woda. OCS mapuje półtony na bazę.
- **Tryby grafiki:** OCS 32, AGA 64 (tablice przygaszenia) i RTG (chunky 8-bit,
  światło RGB: ciepłe latarnie, zimna noc, stożek latarki i poświata żarówki).
  Noc w RTG ma niebieski ambient i lokalne źródła światła, a nie globalne koło.
- **Font:** 5×7 px, ręcznie rysowany, z polskimi diakrytykami (glif bazowy +
  kropka/kreska/ogonek). Skala 1× i 2×.
- **Ciemność:** 4 tablice przemapowania indeksów (dzień / zmierzch / noc / pamięć) +
  lekki dither Bayera 4×4 na najciemniejszych poziomach, żeby rozbić pasy.
- **Dźwięk:** WebAudio, fale square/sawtooth/triangle + szum:
  kroki, ciosy, strzał, jęki zombie, drzwi, deski, jedzenie, śmierć, fanfara.
  Tło: wiatr (filtrowany szum) i deszcz (highpass).
- **Brak muzyki** — cisza i jęki są częścią klimatu; fanfara tylko na wygraną.

---

## 12. Czego świadomie nie ma

- Wielu pięter i piwnic (wymagałoby osobnych map i wind).
- Craftingu (poza banalnym „deski na okno").
- Animacji 8-klatkowych (2 klatki wystarczą, by czytać ruch).
- Zapisu stanu — sesja to jedna próba (do rozważenia w wersji 1.0:
  zapis 2 KB w formacie `.amb` + stan gracza).
- Muzyki i przerywników.

---

## 13. Roadmapa

**v0.1 (ten prototyp)** — grywalna pętla, 12 budynków, walka, łupy, noc, horda,
deski, mapa, ekrany końca, eksport IFF/AMB.

**v0.2.2** — schematy ruchu EKRAN/IZO (K), obsługa pada (Gamepad API),
stożek latarki i halo latarni w RTG, portret w HUD, rozbryzgi deszczu,
komunikaty pod panelem statusu. Plan grafiki: `docs/GRAFIKA.md`.

**v0.2.x** — więcej typów budynków (kościół, szkoła, bar), pojazd jako schronienie,
alarm samochodowy, więcej broni, autotile krawędzi i więcej wariantów kafli.

**v1.0 (Amiga)** — patrz `docs/AMIGA.md`: silnik 68030 w C, dwa backendy
(planar AGA i chunky RTG), dane `.amb` na HDD/CF, 25–50 fps w 320×200/64 kolory
na rozbudowanej A1200 oraz tryb zgodności OCS 32 dla A500.
