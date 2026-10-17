# AMBOID na Amidze — plan przeniesienia (A1200 AGA / RTG)

Dokument opisuje przeniesienie prototypu na **rozbudowaną Amigę 1200** —
68030 + fast RAM, chipset AGA, 64 kolory — albo na **system z kartą RTG**
(Picasso96 / CyberGraphX, tryb chunky 8-bit). To nie jest obietnica gotowego
portu: to inżynierski budżet oparty na twardych liczbach sprzętu i na tym, co
prototyp już mierzy.

Tryb OCS (32 kolory, 5 bitplanów) zostaje jako **tryb zgodności** — działa
na A500, CD32 i każdej Amidze bez AGA. Nie jest już jednak celem samym w sobie.

---

## 1. Założenia sprzętowe

| | OCS — zgodność | **AGA — cel** | **RTG — cel** |
| --- | --- | --- | --- |
| Maszyna | A500 / A1200 | **A1200 + 68030** | A1200/A4000 + karta |
| CPU | 68000 @ 7,09 MHz | **68030 @ 40–50 MHz** | 68030+ (68060 mile widziany) |
| Chipset | OCS/ECS | **AGA (Alice + Lisa)** | AGA + karta graficzna |
| Pamięć | 1 MB | **2 MB chip + 8 MB fast** | 2 MB chip + 16 MB fast + VRAM |
| Tryb gry | 320×200, 5 bitplanów | **320×200, 6 bitplanów** | **320×200 chunky, wyjście 640×400** |
| Kolory | 32 z 4096 | **64 z 16,7 mln** | 256 z 16,7 mln (używamy 64) |
| Bufor klatki | 40 000 B | **48 000 B** | **64 000 B** (640×400: 256 000 B) |
| Nośnik | dyskietka | **HDD / CF (WHDLoad)** | HDD / CF |

**Dlaczego A1200 z akceleratorem, a nie „goła" A1200?** Samo AGA daje 64 kolory
i 2 MB chip RAM, ale 68EC020 @ 14 MHz nie uciągnie jednocześnie FOV, 40 zombie
i świateł. 68030 @ 40 MHz z fast RAM to najmniejszy sensowny cel: daje cache,
32-bitową szynę i ~10–20 MIPS. Karta RTG dokłada drugi argument: 8-bitowy chunky
zamiast planarnego blittera, czyli prostszy i szybszy render.

**Dlaczego nie 640×480 w AGA?** W 6 bitplanach 640×480 to już 230 KB na klatkę
i 4× więcej pikseli do wypełnienia. Izometria 32×16 czyta się dobrze w 320×200,
a 64 kolory dają więcej niż podwojenie rozdzielczości. RTG może *prezentować*
obraz 320×200 jako 640×400 — karta skaluje to sprzętowo, bez kosztu CPU.

---

## 2. Budżet: AGA (planar) vs RTG (chunky)

### 2.1 AGA — 6 bitplanów

| Operacja | Metoda | Koszt |
| --- | --- | --- |
| Wypełnienie tła ~120 kafli | blitter, 32×16 | ~40 000 cykli blittera |
| Ściany i obiekty ~80 | blitter + sort | ~72 000 |
| Postacie ~12 | pre-shiftowane, 5 bitplanów + 1 dodatkowy | ~10 000 |
| HUD i tekst | blitter, tylko przy zmianie | ~8 000 |
| Logika (AI, FOV, walka) | C, 40 zombie | ~150 000 |
| **Razem** | | **~280 000 cykli** |

68030 @ 40 MHz ma ok. 40 mln cykli/s, a blitter AGA pracuje równolegle.
Nawet z narzutem systemu i dźwiękiem **50 fps jest realne**, a 25 fps to
bezpieczny cel. Wąskim gardłem pozostaje przepustowość chip RAM (DMA + blitter),
dlatego statyczne tło miasta liczymy raz i kopiujemy blitterem.

### 2.2 RTG — chunky 8-bit

Karta RTG likwiduje planarność: piksel to bajt, więc rysowanie to zwykłe `move.b`
lub `move.l` do bufora. Nie ma blittera Amigi (jest blit karty), ale nie ma też
konwersji planar→chunky (c2p). To najprostszy i najszybszy wariant.

| Operacja | Koszt |
| --- | --- |
| Kopiowanie tła (miasto) | 64 000 B = 16 000 `move.l` |
| Kafle i obiekty | prosty blit bajtowy, maska przez indeks 255 |
| Światło per piksel | **osobny problem — patrz §4.3** |
| Skalowanie do 640×400 | robi karta (P96 `WritePixelArray8`), CPU = 0 |

**Światło to jedyny koszt, którego AGA nie ma.** Prototyp liczy je w JS
(~380 klatek/s dla 8 świateł, pomiar w `tools/stress`), ale na 68030 trzeba je
ograniczyć: lightmapa kafli + interpolacja, a nie pełne per-pixel.

---

## 3. Pamięć

| Blok | AGA | RTG |
| --- | --- | --- |
| Ekran A | 48 000 B | 64 000 B (VRAM) |
| Ekran B (double buffer) | 48 000 B | 64 000 B (VRAM) |
| Tło statyczne | 48 000 B | 64 000 B |
| Atlasy (IFF z `docs/amiga/aga/`) | ~111 KB | ~111 KB + konwersja do chunky ~75 KB |
| Miasto `.amb` | 21 KB | 21 KB |
| Kod + font + dźwięk | ~80 KB | ~80 KB |
| **Razem** | **~360 KB RAM** | **~290 KB RAM + 192 KB VRAM** |

To mieści się z ogromnym zapasem: 2 MB chip RAM wystarcza na ekrany i dźwięk,
8 MB fast na dane i cache. **Dyskietka 880 KB przestaje być ograniczeniem** —
dlatego celujemy w HDD/CF i WHDLoad. Wersja na dyskietkę to nadal możliwy
„tryb zgodności" (32 kolory, mniej wariantów), ale nie jest priorytetem.

---

## 4. Grafika: 64 kolory i prawdziwe światło

### 4.1 Paleta: 32 kolory bazowe + 32 półtony

Paleta jest **jednym źródłem prawdy** (`src/palette.js`):

- indeksy **0–31** — kolory bazowe, znane z OCS: ziemia, krew, metal, skóra, UI;
- indeksy **32–63** — półtony AGA: ciemniejsze i jaśniejsze warianty tych samych
  materiałów (`GRASS_MID`, `GRASS_LIT`, `CONCRETE_HI`, `WOOD_WARM`, `BLOOD_FRESH`…);
- `EXT_TO_BASE` — tablica 64 bajtów mapująca półtony z powrotem na bazę.

Dzięki temu **ten sam tileset i ten sam generator** obsługują trzy profile:
w OCS półtony są mapowane na kolory bazowe (obraz wygląda jak dotychczas),
w AGA dają pięć tonów na materiał zamiast trzech.

Kafle podłóg nie są już losowym szumem: ton wynika z **gradientu po przekątnej
kafla** plus szumu. W OCS gradient składa się z trzech kolorów bazowych, w AGA
z pięciu — bez zmiany układu plam i bez ditheringu, który psuł czytelność.

> W prototypie **10,1% pikseli atlasów** i **~19% pikseli dziennej klatki** używa
> indeksów 32–63. To dokładnie ta „gęstość" cieniowania, której nie da się pokazać
> na OCS.

### 4.2 Ciemność w AGA: tablice przygaszenia (nie dither!)

Doświadczenie z pierwszej wersji: dithering Bayera na jasnych kaflach (chodnik,
beton) daje brudną szachownicę i wygląda jak plamy. Dlatego ciemność jest
**paletowa**: cztery tablice przemapowania indeksów (`DIM_TABLES`), rozszerzone
na 64 wpisy przez `EXT_TO_BASE`:

| Kolor | Dzień | Zmierzch (1) | Noc (2) | Pamięć (3) |
| --- | --- | --- | --- | --- |
| trawa `21` | 21 | 20 | 19 | 19 |
| chodnik `23` | 23 | 23 | 25 | 1 |
| beton `24` | 24 | 23 | 26 | 1 |
| cegła `17` | 17 | 17 | 16 | 1 |
| półton `GRASS_LIT 33` | 33 | 22 | 20 | 20 |
| półton `CONCRETE_HI 45` | 45 | 24 | 26 | 1 |

Koszt na Amidze: **jeden `move.b (a0,d0),d1` na piksel**, zero mnożenia.
Wersja AGA ma tablice 64-bajtowe; OCS nadal 32-bajtowe. Dither (12–30% pikseli)
zostaje tylko na dwóch najciemniejszych poziomach, nigdy na jasnych kaflach.

### 4.3 RTG: światło RGB zamiast tablic

Na karcie RTG mamy 8 bitów na kanał, więc zamiast podmieniać indeksy liczymy
**prawdziwe światło**:

```
kolor_piksela = paleta[indeks] · ambient · tint
              + Σ  światło[k].kolor · (1 − d²/r²)³ · światło[k].siła
```

- `ambient` — 1,0 dzień / ~0,78 zmierzch / ~0,46 noc (min. 0,30 w deszczu);
- `tint` — noc chłodzi obraz w stronę granatu `[0,74, 0,82, 1,12]`;
- latarnie — ciepłe `[255,168,82]`, migotanie `0,94 + 0,06·sin`;
- latarka — `[255,240,198]`, promień zależny od FOV;
- błysk wystrzału — jedna klatka, promień 160 px;
- tło nocne — słabe, zimne światło wokół gracza.

To daje efekt, którego planar nie potrafi: **plamy ciepłego światła na zimnym
tle**, miękkie przejścia bez ditheringu i błysk latarki w deszczu.

**Koszt na 68030.** Pełne per-pixel dla 64 000 pikseli × 8 świateł to kilka
milionów operacji na klatkę — za dużo. Warianty w kolejności od najdroższego:

1. **68060 / Vampire:** pełne per-pixel, 3–4 światła, 50 fps.
2. **68030 @ 40 MHz:** lightmapa 48×40 kafli (1920 komórek × 8 świateł = 15 tys.
   operacji) + interpolacja przy blitowaniu kafla; światło „miękkie", ale płynne.
3. **68030 + wolna karta:** światło liczone co 2. piksel i rozciągane ×2.
4. **Awaryjnie:** tablice przygaszenia jak w AGA (brak świateł RGB).

Prototyp implementuje wariant 1 w JS (`Screen.rgbaLit`) i mierzy ~380 klatek/s
przy 8 światłach — na 68030 wybieramy wariant 2.

### 4.4 Cięcie ścian, HUD, font

- **Cięcie ścian** — flaga `near` liczona raz przy generowaniu miasta; renderer
  nie traci cykli.
- **HUD** — w AGA blitter do bufora (8 000 cykli), w RTG zwykłe kopiowanie bajtów.
  Aktualizacja tylko przy zmianie wartości, nie co klatkę.
- **Font 5×7** — ~100 glifów; w AGA 6 bitplanów = 3 000 B, w RTG 1 bajt/piksel.

### 4.5 Eksport: IFF ILBM 5 i 6 bitplanów

`node tools/export_amiga.mjs` generuje dwa komplety:

| Katalog | Bitplany | CMAP | Zastosowanie |
| --- | --- | --- | --- |
| `docs/amiga/` | 5 | 32 kolory (4 bity/kanał) | OCS/ECS, Deluxe Paint |
| `docs/amiga/aga/` | 6 | 64 kolory (8 bitów/kanał) | AGA, Personal Paint |

Oba komplety mają podglądy PNG i pliki `.pal`. Pliki AGA są o ~15–20% większe
(6 bitplanów), ale nadal ważą łącznie ~111 KB. Nagłówek BMHD ma poprawne
`nPlanes`, a CMAP — 192 bajty (64 × 3).

---

## 5. Format danych miasta `.amb`

Bez zmian: prototyp eksportuje `docs/amiga/miasto-*.amb` (21 KB dla 48×40 kafli).
Format binarny, big-endian, niezależny od palety — indeksy kafli i przedmiotów
są te same w OCS, AGA i RTG.

```
offset  typ      pole
0       u32      magic "AMB1"
4       u16      szerokość = 48
6       u16      wysokość = 40
8       u32      seed
12      u16      liczba nazw przedmiotów N
14      ...      N × (u8 len + ASCII)
        u16      liczba stringów S
        ...      S × (u16 len + UTF-8)
        u16      liczba kafli (48×40)
        ...      kafel: u8 ground, u8 gv, u8 inside,
                      u8 wallMat, u8 wallFeature, u8 flags, u8 barricade,
                      u8 prop, u8 variant, u8 decal
        u16      liczba budynków
        ...      8 × u16 (x,y,w,h,type,floor,doorX,doorY) + u8 start
        u16      liczba pojemników
        ...      u16 x, u16 y, u16 type, u8 searched, u8 n,
                      n × (u8 itemId, u8 count, i16 dur)
        u16      liczba przedmiotów na ziemi
        ...      u16 x, u16 y, u8 itemId, u8 count, i16 dur
        u16      liczba spawnów zombie
        ...      u16 x, u16 y, u8 variant
        u16      liczba latarni
        ...      u16 x, u16 y
```

Generator na Amidze (ten sam mulberry32 + hash2) zajmuje ~600 linii C i daje
identyczne miasto z tego samego seeda. Wtedy na dysku trzymamy tylko seed.

---

## 6. Kod: co przepisać, co porzucić

| Moduł prototypu | Port | Uwagi |
| --- | --- | --- |
| `palette.js` | 1:1 | 64 wpisy; OCS obcina do 32 + `EXT_TO_BASE` |
| `profiles.js` | 1:1 | trzy profile, wybór trybu, budżet pamięci |
| `font.js` | 1:1 | dane glifów do C/asm |
| `pixel.js` | offline | generator atlasów |
| `art.js` | offline | generuje IFF; na Amidze gotowe assety |
| `render.js` | przepisać | blitter (AGA) / chunky (RTG) + `rgbaLit` |
| `world.js` | C | logika bez zmian, struktury jak w `.amb` |
| `game.js` | C | pętla, stany, walka — logika przenośna |
| `ui.js` | C | HUD jako bufory/atlas |
| `scene.js` | C | sortowanie + blitter/chunky |
| `audio.js` | C | Paula lub AHI (RTG) |

**Strategia:** najpierw silnik referencyjny w C (`m68k-amigaos-gcc`) z dwoma
backendami: planar (AGA) i chunky (RTG). Prototyp JS zostaje specyfikacją
zachowania i generatorem danych. Testy z `tools/gametest.mjs` przenosimy do C
jako testy logiki bez grafiki.

---

## 7. Tryb zgodności OCS i cięcia

Tryb OCS jest tani, bo cała grafika jest indeksowana, a półtony AGA mapują się
na kolory bazowe. Na A500 (1 MB) trzeba jednak ciąć:

1. **32 kolory** zamiast 64 — automatycznie, przez `EXT_TO_BASE`.
2. **Mniej wariantów kafli** — 1 zamiast 3 na typ (oszczędność ~10 KB).
3. **Statyczne tło** dzielnicy zamiast pełnego re-renderu.
4. **24 zombie** zamiast 40 (AI ~150 tys. cykli).
5. **Deszcz jako sprite'y**, nie linie.

Czego **nie** ciąć: FOV, hałasu i desek na oknach — to rdzeń doświadczenia.

---

## 8. Dźwięk

- **AGA:** Paula, 4 kanały 8-bit, do 28 kHz. Ten sam budżet co dotychczas.
- **RTG:** Paula przez AHI (miksowanie w 16 bitach) — karta nie wymusza zmian,
  ale 68030 ma zapas na 8 kanałów i filtr.
- Sample generujemy z prototypu (te same przebiegi co `audio.js`) i eksportujemy
  jako surowe dane 8-bit. Muzyki nie ma — patrz GDD §11.

---

## 9. Plan pracy

| Etap | Zakres | Czas |
| --- | --- | --- |
| 1 | Szkielet: ekran 320×200/6 bitplanów, double buffer, paleta 64 | 1 tydzień |
| 2 | Wczytywanie `.amb`, podłogi i ściany z sortowaniem | 1–2 tygodnie |
| 3 | Postacie, ruch, kamera, cięcie ścian | 1 tydzień |
| 4 | AI zombie, walka, hałas, FOV | 2 tygodnie |
| 5 | Pojemniki, ekwipunek, HUD, ekrany | 2 tygodnie |
| 6 | **Lightmapa RTG i backend chunky** | 2 tygodnie |
| 7 | Noc, deszcz, dźwięk, horda | 1 tydzień |
| 8 | Optymalizacja 68030, testy na A1200 i karcie RTG | 2 tygodnie |
| 9 | DPaint: ręczne dopieszczenie atlasów, intro, WHDLoad | 2 tygodnie |

Razem: **~14 tygodni** pracy jednoosobowej. Dwa tygodnie więcej niż plan OCS —
tyle kosztuje drugi backend i światło.

---

## 10. Ryzyka

| Ryzyko | Prawdopodobieństwo | Mitygacja |
| --- | --- | --- |
| 68030 nie wyrabia światła per-pixel | wysokie | lightmapa kafli + interpolacja (§4.3) |
| Karta RTG bez sterownika P96 dla danego modelu | średnie | backend AGA jako fallback, testy na kilku kartach |
| Paleta 64 kolorów „rozjeżdża" się między atlasami | niskie | jedna paleta w `palette.js`, eksport z tego samego źródła |
| Blitter AGA nie wyrabia przy 40 obiektach | średnie | statyczne tło + rysowanie tylko widocznych kafli |
| Zbyt duży zakres jak na 14 tygodni | wysokie | etapy 1–5 dają grywalne demo; 6–9 to polish |

---

## 11. Co ten prototyp już udowadnia

1. **64 kolory mają sens** — 10,1% pikseli atlasów używa półtonów AGA, a układ
   plam jest identyczny jak w OCS. Ten sam tileset, trzy profile.
2. **Światło RGB działa** — `Screen.rgbaLit` liczy je w czasie rzeczywistym:
   ~380 klatek/s przy 8 światłach (JS). Na 68030 planujemy lightmapę kafli.
3. **Tryb zgodności nic nie kosztuje** — OCS mapuje półtony przez tablicę 64 B;
   test `tools/browsertest.mjs` wykrywa **0 pikseli poza paletą**.
4. **Eksport jest poprawny** — ILBM z 6 bitplanami i CMAP 64×3 (24-bit) otwiera
   się w narzędziach AGA; OCS dostaje wersję 5-bitplanową.
5. **Pamięć przestaje być problemem** — cały zestaw to ~360 KB; 2 MB chip + 8 MB
   fast zostawia miejsce na większe miasto i więcej animacji.
6. **Logika jest tania** — 40 zombie + FOV + walka to ~150 tys. cykli, czyli
   ułamek budżetu 68030.

Reszta to praca inżynierska, nie ryzyko technologiczne.
