# AMBOID — dystrybucja Amigi: WHDLoad

**Decyzja (2026-10-18): docelowym nośnikiem gry jest HDD/CF + WHDLoad.**
ADF pozostaje wyłącznie artefaktem deweloperskim / trybem zgodności.

Podstawa: [`docs/AMIGA.md`](AMIGA.md) §1 i §3 — przy ~360 KB danych dyskietka
880 KB przestaje być ograniczeniem, a WHDLoad daje ładowanie z dysku, wyjście do
systemu i standardową instalację.

---

## 1. Stan faktyczny (2026-10-18)

| Element | Stan |
|---|---|
| Kod bare metal AGA | `amiga/src/render/render_aga.c` + `startup_aga.s` — szkielet |
| Kod AmigaOS/RTG | `main_amigaos.c` + `render_rtg.c` + Intuition — szkielet |
| `amiga/Makefile` | buduje `build/amboid_{ocs,aga}.bin` i `build/AmBoid` |
| `tools/build_adf.mjs` | **placeholdery**: tekst w bootblocku, `AmBoid` = plik tekstowy |
| Slave WHDLoad | **nie istnieje** |
| Pakiet HDD | **nie istnieje** |
| Test na emulatorze | brak |

Czyli: dziś **nie ma żadnej działającej formy uruchomieniowej na Amidze**.
Zielony `npm test` tego nie zmienia — sprawdza tylko istnienie ADF-ów.

---

## 2. Dlaczego WHDLoad wymusza architekturę

WHDLoad przejmuje system: wyłącza OS, zostawia „czystą” maszynę i ładuje dane
przez `resload_*`. Konsekwencje dla nas:

- **Ścieżka WHDLoad = bare metal AGA** (`render_aga.c`, `audio_paula.c`,
  `input_custom.c`). Nie wolno używać Intuition, DOS-owych ścieżek ani
  `graphics.library`.
- **Wariant RTG/AmigaOS zostaje poza WHDLoad** — użytkownik z kartą graficzną
  uruchamia `build/AmBoid` z Workbencha. To nie jest strata: RTG i tak potrzebuje
  OS-owych bibliotek.
- **Zero wywołań OS w kodzie gry** — każdy `OpenLibrary`/`dos.library` w ścieżce
  AGA to błąd projektowy, nie „do naprawy później”.
- **Dane tylko przez slave** (`resload_LoadFile` / własny loader), nie przez
  `PROGDIR:`.

---

## 3. Artefakty pakietu

Docelowa struktura (nazwa robocza):

```
build/whdload/AmBoid_v0.2.5/
  AmBoid.slave          ; nagłówek WHDLoad + loader + start gry (vasm, hunk)
  AmBoid                ; gra: hunk-exe 68020 (z amiga/, ścieżka AGA)
  AmBoid.inf            ; ikona dla Workbencha
  Install               ; skrypt instalacyjny (AmigaDOS)
  ReadMe                ; wymagania, sterowanie, uwagi
  data/
    items.json          ; źródło dla export-items / wskaźniki
    maps/sample_map.amb
  assets/
    atlases/*.raw|*.png|*.json
```

Zasady:

- **Nie dołączamy WHDLoad** ani Kickstartów. `Install` ma wymagać zainstalowanego
  WHDLoad i sprawdzać jego obecność.
- Wersja w nazwie katalogu i w `ReadMe` musi zgadzać się z `package.json`.
- Pakiet trafia jako asset Release (`AmBoid-<wersja>-whd.zip`), nie do historii repo.

---

## 4. Slave — wymagania techniczne

- Źródło: `amiga/whdload/slave.s`, asemblacja `vasmm68k_mot -Fhunkexe`.
- Wymagany `WHDLoad.i` z archiwum deweloperskiego WHDLoad (nie commitujemy go —
  dodać do `.gitignore` albo pobierać w CI).
- Nagłówek: `SLAVE_HEADER` z `ws_Start`, wersją, flagami (m.in. brak dzielenia
  przez zero, brak błędów) oraz tagami `WHDLTAG_*`:
  - `BaseMemSize` — 2 MB chip,
  - `ExpMem` — 8 MB fast,
  - `StackSize` — co najmniej 8 KB,
  - `Custom1/2` — jeśli będą potrzebne warianty (AGA/OCS),
  - `ExecuteStartup` / `ExecuteCleanup` — jeśli gra potrzebuje własnego startu.
- Ładowanie: `resload_LoadFile` dla `AmBoid` i danych; `resload_Relocate` jeśli
  exe wymaga relokacji.
- **Klawisz wyjścia** (domyślnie `*`): slave musi przechwycić przerwanie
  klawiatury i wrócić do systemu. To trzeba zaprojektować, nie „samo wyjdzie”.
- Save gry: nie wolno pisać do katalogu pakietu; ustalić ścieżkę (np. `S:`/`DH0:`)
  i udokumentować w `ReadMe`.

Wymagania sprzętowe pakietu: **68020+, 2 MB chip + 8 MB fast, Kickstart 3.1**
(WHDLoad wymaga 2.0+, my celujemy w 3.1 — zgodnie z `docs/AMIGA.md`).

---

## 5. Integracja z buildem

Do dodania:

```bash
make whdload          # amiga/: slave.s + gra -> build/whdload/...
node tools/build_whdload.mjs   # pakowanie katalogu + zip (poza gitem)
```

- `tools/build_whdload.mjs` — odpowiednik dzisiejszego `build_adf.mjs`, ale
  składający **realny** pakiet (nie placeholdery). Docelowo `build_adf.mjs`
  zostaje tylko dla trybu zgodności ADF.
- Nowy test w `tools/test-modular-system.mjs`: pakiet istnieje, zawiera
  `AmBoid.slave`, `AmBoid` (hunk-exe, nie tekst), `Install`, `ReadMe`, oraz
  sprawdzenie, że `AmBoid` **nie** jest placeholderem.

---

## 6. Testowanie

- Emulator: FS-UAE lub WinUAE, profil **A1200 + 68030 + 8 MB fast**,
  Kickstart 3.1, zainstalowany WHDLoad.
- Minimalna bramka: gra startuje z HDD, działa sterowanie, `*` wychodzi do
  Workbencha, save/load nie psuje katalogu pakietu.
- Test na prawdziwym sprzęcie dopiero po zielonym emulatorze — i po tym, jak
  port przestanie być szkieletem.

---

## 7. Kolejność prac (niezależna od etapów 4–5)

1. [ ] `WHDLoad.i` w toolchainie (poza repo) + `.gitignore`.
2. [ ] `amiga/whdload/slave.s` — nagłówek, ładowanie, start, wyjście.
3. [ ] `make whdload` — hunk-exe 68020 z kodu AGA.
4. [ ] `tools/build_whdload.mjs` — pakowanie + zip.
5. [ ] `Install`, `ReadMe`, `AmBoid.inf`.
6. [ ] Test w emulatorze; wpis w `docs/ROADMAP.md` i `BIBLIA-PROJEKTU.md` §6.
7. [ ] Release z assetem `AmBoid-<wersja>-whd.zip`.

**Uwaga o kolejności:** punkt 2 ma sens dopiero, gdy ścieżka AGA faktycznie
rysuje klatkę. Dziś `render_aga.c` to szkielet — slave można przygotować jako
rusztowanie, ale „działający WHDLoad” ogłaszać dopiero po pierwszym realnym
buildzie gry.

---

## 8. Otwarte pytania

- Czy `render_aga.c` zakłada pełne zawłaszczenie chipsetu (DMA, copper, blitter)?
  Jeśli tak — slave musi wyłączyć OS przed startem (standardowo tak robi).
- Czy gra potrzebuje własnego `ExecuteStartup` (np. ustawienie `DMACON` przed
  pierwszym VBLANK)?
- Gdzie trzymać save: `S:` (RAM dysk, znika) vs `DH0:` (trwałe)? Do decyzji
  przed pierwszym testem.
- Czy pakiet ma obsługiwać też OCS 32 jako `Custom1`? (tryb zgodności — raczej
  osobny slave/ikona, nie domyślny).
