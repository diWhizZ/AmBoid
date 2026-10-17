# AMBOID na Amidze — plan przeniesienia

Dokument opisuje, jak przenieść ten prototyp na **Amigę 500** (OCS, 68000,
512 KB + 512 KB slow) i **Amigę 1200** (ECS/AGA, 68EC020, 2 MB). Nie jest to
obietnica gotowego portu — to inżynierski budżet i kolejność pracy, oparty na
twardych liczbach sprzętu.

---

## 1. Założenia sprzętowe

| | Amiga 500 | Amiga 1200 |
| --- | --- | --- |
| CPU | 68000 @ 7,09 MHz | 68EC020 @ 14,19 MHz |
| Chipset | OCS (Fat Agnus, Denise) | ECS/AGA |
| Chip RAM | 512 KB (+512 KB slow) | 2 MB |
| Tryb gry | 320×200, 32 kolory (5 bitplanów) | 320×200, 32 kolory |
| Blitter | tak | tak |
| Paula | 4 kanały 8-bit | 4 kanały 8-bit |
| Nośnik | 1 dyskietka 880 KB | dyskietka / HDD |

**Wybór trybu:** lowres 320×200, 5 bitplanów = 32 kolory z 4096 (12-bitowa paleta).
To klasyczny „DPaint mode" i najlepszy stosunek jakości do kosztu:
- 1 bitplan = 8000 bajtów (320×200/8), 5 bitplanów = 40 000 B na klatkę,
- ekran podwójnie buforowany: 80 000 B,
- dual playfield lub sprite'y do HUD — opcjonalnie.

**Dlaczego nie 640×256/16 kolorów?** Izometria 32×16 czyta się lepiej w poziomie,
a 32 kolory są potrzebne na czytelne rozróżnienie krwi, metalu, trawy i UI.
Alternatywa awaryjna dla A500 bez rozszerzenia: 320×200 / 16 kolorów (4 bitplany,
32 000 B) — patrz §7 „Cięcia".

---

## 2. Budżet cykli 68000

Amiga 500 ma 7,09 MHz i architekturę, w której pamięć chip dzielona jest
z DMA — CPU dostaje ~3,58 M cykli/s na dostęp do chip RAM.

Szacunek klatki (320×200, 32 kolory, bez przewijania całego ekranu):

| Operacja | Metoda | Koszt (cykle 68000) |
| --- | --- | --- |
| Kopiowanie tła (podłogi) | blitter, 40 000 B | ~30 000 (blitter, równolegle) |
| Kafle podłogi ~120 szt. | blitter, 32×16 maskowane | 120 × ~400 = 48 000 |
| Ściany i obiekty ~80 szt. | blitter + sort | 80 × ~900 = 72 000 |
| Sortowanie izometryczne | insertion sort listy ~200 | ~20 000 |
| Postacie i zombie ~12 | pre-shiftowane sprite'y | 12 × 600 = 7 200 |
| Dither ciemności | prekompilowane warianty kafli | 0 (koszt pamięci) |
| HUD, tekst | blitter/bufor | ~15 000 |
| Logika (AI, ruch, walka) | C, 40 zombie | ~150 000 |
| **Razem** | | **~342 000 cykli** |

342 000 z 3 580 000 cykli na klatkę = **~9,5% budżetu** przy 1 klatce.
Nawet gdy dojdzie dźwięk, przerwania i narzut systemu, 25 fps jest realne
na A500, a 50 fps na A1200 (68020 ma dodatkowo cache i szybszy dostęp).

**Wniosek:** wąskim gardłem nie jest CPU, a **przepustowość blittera i pamięć**.
Dlatego:
- kafle podłogi rysujemy **bez maski** (prostokątne blity 16×16 połówki diamentu,
  prefiltrowane do wariantu ciemności),
- obiekty rysujemy z maską tylko tam, gdzie trzeba (drzewa, postacie),
- ekran trzymamy w **dual playfield**? Nie — za drogo w 32 kolorach.
  Zamiast tego statyczne tło miasta jest wstępnie renderowane do bufora
  i kopiowane blitterem, a dynamiczne obiekty rysowane na wierzchu.

---

## 3. Struktura pamięci (A500, 1 MB)

| Blok | Rozmiar | Uwagi |
| --- | --- | --- |
| Ekran A | 40 000 B | 5 bitplanów |
| Ekran B | 40 000 B | podwójne buforowanie |
| Tło statyczne | 40 000 B | prefiltrowane miasto |
| Tileset podłóg (10×3 warianty) | ~15 000 B | 32×16, 5 bitplanów, bez maski |
| Ściany (3 mat. × 5 wariantów) | ~19 000 B | 32×36 |
| Sprite'y postaci (48 klatek) | ~30 000 B | 20×32, z maską |
| Rekwizyty (26) | ~25 000 B | 48×56, z maską |
| Ikony (21) | ~3 000 B | 16×16 |
| Dane miasta `.amb` | 21 000 B | patrz §5 |
| Kod (C + asm) | ~60 000 B | Kickstart zajmuje resztę |
| Stos, bufor dźwięku | ~20 000 B | |
| **Razem** | **~313 000 B** | mieści się w 512 KB chip + slow |

Uwaga: Kickstart 1.3 na A500 zajmuje 256 KB. Zostaje ~768 KB na grę — wyżej
wymienione 313 KB to ~40% dostępnej pamięci. Zapas na rozbudowę jest.

---

## 4. Grafika: jak to zrobić dobrze

### 4.1 Pre-shiftowane sprite'y
68000 nie umie tanio przesuwać bitów. Każdy sprite obiektu ma **16 kopii
przesunięcia poziomego** (0–15 px) albo rysujemy tylko na siatce 16 px
i przesuwamy o pełne kafle. Rekomendacja: 8 kopii co 2 px dla postaci
(koszt pamięci ×8, ale postacie są małe).

### 4.2 Ciemność i dither
Nie obliczamy ciemności w czasie rzeczywistym. Każdy kafel podłogi ma
**3 warianty przygaszenia** (0, 1, 2) prefiltrowane w DPaint: oryginał,
wersja z dither 25% i wersja z dither 50% ciemnym kolorem. Koszt pamięci
×3, koszt CPU zerowy. To dokładnie to, co robi prototyp w `Screen.blit({dim})`.

### 4.3 Cięcie ścian
Prototyp wykrywa ściany „od strony kamery" i rysuje je jako płaskie posadzki
z obrysem krawędzi. Na Amidze to samo: flaga `near` liczona raz przy generowaniu
miasta (statyczna), więc renderer nie traci cykli.

### 4.4 HUD
Dwie opcje:
- **Blitter do bufora ekranu** — prosty, kosztuje ~15 000 cykli.
- **Sprite'y sprzętowe** — 8 sprite'ów 16 px na A500; wystarczy na ikony HP
  i pasek, ale nie na pełny HUD. Rekomendacja: HUD rysowany blitterem tylko
  przy zmianie wartości, a nie co klatkę.

### 4.5 Font
Font 5×7 z polskimi znakami to ~100 glifów × 5 B = 500 B na bitplan,
2 500 B dla 5 bitplanów. Rysowanie tekstu: blitter lub pętla po bajtach.

---

## 5. Format danych miasta `.amb`

Prototyp eksportuje `docs/amiga/miasto-*.amb` (20,9 KB dla 48×40 kafli).
Format jest binarny, big-endian (naturalny dla 68000):

```
offset  typ      pole
0       u32      magic "AMB1" (0x414D4231)
4       u16      szerokość = 48
6       u16      wysokość = 40
8       u32      seed
12      u16      liczba nazw przedmiotów N
14      ...      N × (u8 len + ASCII)  — nazwy przedmiotów
        u16      liczba stringów S
        ...      S × (u16 len + UTF-8) — nazwy typów/pojemników
        u16      liczba kafli (48×40)
        ...      kafel: u8 ground, u8 gv, u8 inside,
                      u8 wallMat, u8 wallFeature, u8 flags(open|broken), u8 barricade,
                      u8 prop, u8 variant, u8 decal
        u16      liczba budynków
        ...      budynek: 8 × u16 (x,y,w,h,type,floor,doorX,doorY) + u8 start
        u16      liczba pojemników
        ...      pojemnik: u16 x, u16 y, u16 type, u8 searched, u8 n,
                      n × (u8 itemId, u8 count, i16 dur)
        u16      liczba przedmiotów na ziemi
        ...      u16 x, u16 y, u8 itemId, u8 count, i16 dur
        u16      liczba spawnów zombie
        ...      u16 x, u16 y, u8 variant
        u16      liczba latarni
        ...      u16 x, u16 y
```

Rozmiar kafla: 10 B × 1920 = 19 200 B — to dominujący koszt pliku.
Na dyskietce 880 KB zostaje miejsce na 40 miast; w praktyce wystarczy jedno
lub generator na Amidze (ten sam algorytm w C daje identyczne miasto z seeda).

**Alternatywa: generator na Amidze.** Algorytm z `src/world.js` jest deterministyczny
(mulberry32 + hash2) i nie wymaga pływaków w krytycznych miejscach. Port w C
zajmuje ~600 linii. Wtedy na dyskietce trzymamy tylko seed (4 B) i stałe tabele
budynków — miasto powstaje w 1–2 s przy starcie.

---

## 6. Kod: co przepisać, co porzucić

| Moduł prototypu | Port na Amigę | Uwagi |
| --- | --- | --- |
| `palette.js` | 1:1 | 32 wpisy, konwersja RGB→12 bit |
| `font.js` | 1:1 | dane glifów do C/asm |
| `pixel.js` | tylko offline | narzędzie do generowania atlasów |
| `art.js` | tylko offline | generuje IFF; na Amidze gotowe assety |
| `render.js` | przepisać | zamiast `set()` → blitter i bufor bitplanów |
| `world.js` | przepisać w C | logika bez zmian, struktury danych jak w `.amb` |
| `game.js` | przepisać w C | pętla, stany, walka — logika przenośna |
| `ui.js` | przepisać | HUD i ekrany jako bufory/atlas |
| `audio.js` | przepisać | 4 kanały Pauli, moduły prostych sampli |
| `scene.js` | przepisać | sortowanie listy + blitter |

**Strategia:** najpierw „silnik referencyjny" w C (gcc `m68k-amigaos`), z buforami
bitplanów i własnym blitterem. Prototyp JS zostaje jako **specyfikacja zachowania**
i generator danych. Testy z `tools/gametest.mjs` przenosimy do C jako testy
jednostkowe logiki (bez grafiki).

---

## 7. Cięcia na A500 (jeśli zabraknie pamięci lub cykli)

W kolejności od najmniej bolesnych:

1. **16 kolorów zamiast 32** (4 bitplany) — 32 000 B zamiast 40 000 B; paletę
   trzeba przebudować: UI, krew i skóra mają pierwszeństwo.
2. **Statyczne tło** — miasto renderowane raz przy wejściu do dzielnicy;
   przenoszenie tylko przy przejściu między kwartałami.
3. **Mniej wariantów kafli** — 1 zamiast 3 na typ (oszczędność 10 000 B).
4. **Mniej zombie na ekranie** — 24 zamiast 40 (AI to ~150 000 cykli).
5. **Deszcz jako sprite'y** — 16 sprite'ów zamiast rysowania linii.
6. **HUD w sprite'ach sprzętowych** — oszczędza bufor i cykle.

Czego **nie** ciąć: FOV, hałasu i desek na oknach. To rdzeń doświadczenia.

---

## 8. Dźwięk

Paula: 4 kanały, 8-bit, do 28 kHz. Budżet:

| Dźwięk | Kanał | Długość |
| --- | --- | --- |
| kroki (4 warianty) | 1 | 0,05 s |
| uderzenia (3) | 1 | 0,1 s |
| jęki zombie (4) | 2 | 0,4 s |
| wystrzał | 3 | 0,2 s |
| tło: wiatr | 4 | pętla 2 s |

Sample generujemy z prototypu (te same przebiegi co w `audio.js`) i eksportujemy
jako surowe dane 8-bit. Muzyki nie ma — patrz GDD §11.

---

## 9. Plan pracy

| Etap | Zakres | Szacowany czas |
| --- | --- | --- |
| 1 | Szkielet: ekran 320×200/32, podwójny bufor, paleta, font | 1 tydzień |
| 2 | Wczytywanie `.amb`, rysowanie podłóg i ścian z sortowaniem | 1–2 tygodnie |
| 3 | Postacie, ruch, kamera, cięcie ścian | 1 tydzień |
| 4 | AI zombie, walka, hałas, FOV | 2 tygodnie |
| 5 | Pojemniki, ekwipunek, HUD, ekrany | 2 tygodnie |
| 6 | Noc, deszcz, dźwięk, horda | 1 tydzień |
| 7 | Optymalizacja 68000, testy na A500 i A1200 | 2 tygodnie |
| 8 | DPaint: ręczne dopieszczenie atlasów, intro, dyskietka | 2 tygodnie |

Razem: ~12 tygodni pracy jednoosobowej. To realistyczny plan dla hobbysty
znającego C i podstawy Amigi — nie weekendowy projekt.

---

## 10. Ryzyka

| Ryzyko | Prawdopodobieństwo | Mitygacja |
| --- | --- | --- |
| Blitter nie wyrabia przy 40 obiektach | średnie | statyczne tło + rysowanie tylko widocznych kafli |
| Brak pamięci na A500 bez rozszerzenia | wysokie | wariant 16 kolorów, mniej wariantów kafli |
| Kompilator C generuje za wolny kod | średnie | krytyczne pętle w asm (blit, sortowanie, Bresenham) |
| Paleta 32 kolorów nie wystarcza | niskie | już przetestowana w prototypie na 1920 kaflach |
| Zbyt duży zakres jak na 12 tygodni | wysokie | etap 1–5 daje grywalne demo; 6–8 to polish |

---

## 11. Co ten prototyp już udowadnia

1. **Paleta 32 kolorów wystarcza** — całe miasto, postacie, UI i efekty mieszczą się
   w palecie; test `tools/browsertest.mjs` wykrywa 0 pikseli poza nią.
2. **Izometria 32×16 jest czytelna** przy 320×200 — widać ~10 kafli w poziomie,
   czyli cały budynek i ulicę.
3. **Cięcie ścian działa** — algorytm „ściana od strony kamery" sprawdzony na
   12 budynkach.
4. **Dither wystarcza do ciemności** — trzy poziomy przygaszenia + latarka dają
   czytelną noc bez gradientów.
5. **Dane są przenośne** — miasto to 21 KB binarnych danych, atlasy to IFF ILBM
   z 5 bitplanami; oba formaty są rodzime dla Amigi.
6. **Logika jest tania** — 40 zombie + FOV + walka mieszczą się w ~150 000 cykli,
   co zostawia zapas na 25 fps.

Reszta to praca inżynierska, nie ryzyko technologiczne.
