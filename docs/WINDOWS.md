# AMBOID pod Windows — krok po kroku

**Najważniejsze:** AGA i RTG to **nie dwa osobne programy**. To jeden prototyp
z trzema trybami grafiki (OCS 32 / AGA 64 / RTG RGB), przełączanymi w grze
klawiszem **G**. Nie ma tu instalatora `.exe` ani builda na Amigę — pod Windows
uruchamiasz wersję przeglądarkową, a gotowe assety dla Amigi leżą w `docs/amiga/`.

Całość zajmuje ~5 minut. Potrzebujesz Node.js i przeglądarki (Chrome, Edge,
Firefox — dowolna aktualna).

---

## 1. Zainstaluj Node.js

1. Wejdź na **https://nodejs.org**.
2. Wybierz wersję **LTS** (22.x lub nowszą) i pobierz **Windows Installer (.msi) — 64-bit**.
3. Uruchom instalator:
   - zaakceptuj licencję,
   - zostaw domyślny katalog,
   - **zaznacz „Add to PATH"** (zwykle zaznaczone),
   - kliknij Install, potem Finish.
4. **Otwórz nowe okno PowerShell** (Start → wpisz `PowerShell` → Enter).
   Stare okna terminala nie widzą nowego PATH.
5. Sprawdź instalację:

```powershell
node -v
npm -v
```

Powinny pojawić się numery wersji, np. `v22.22.0` i `10.9.0`. Jeśli jest
„nie rozpoznano nazwy polecenia" — zrestartuj komputer i spróbuj ponownie.

---

## 2. Pobierz grę

### Wariant A — Git (wygodniejszy, jeśli masz Git for Windows)

```powershell
git clone https://github.com/diWhizZ/AmBoid.git
cd AmBoid
```

Brak Gita? Pobierz go z **https://git-scm.com/download/win** (instalator
z domyślnymi opcjami wystarczy).

### Wariant B — ZIP (bez Gita)

1. Otwórz **https://github.com/diWhizZ/AmBoid**.
2. Zielony przycisk **Code** → **Download ZIP**.
3. Kliknij prawym na pobrany plik → **Properties** → zaznacz **Unblock** → OK
   (opcjonalnie, ale ułatwia uruchamianie skryptów).
4. **Extract All…** — rozpakuj do np. `C:\Gry\AmBoid`.
   Nie uruchamiaj gry z podglądu archiwum.
5. W PowerShell wejdź do katalogu (cudzysłowy, jeśli ścieżka ma spacje):

```powershell
cd "C:\Gry\AmBoid"
```

Sprawdź, że widzisz pliki:

```powershell
dir
```

Powinny być m.in. `index.html`, `package.json`, `src`, `tools`, `docs`.

### Masz starszy ZIP? Aktualizacja bez Gita

Wersję poznasz po pliku `src\profiles.js` i panelu **„GRAFIKA: AGA 64 KOLORY"**
na ekranie tytułowym. Jeśli ich nie ma, to stary build bez trybu AGA/RTG
i klawisz **G** nie zadziała.

1. Wejdź na **https://github.com/diWhizZ/AmBoid/tree/arena/cb222f77-amboid**.
2. **Code → Download ZIP**.
3. Rozpakuj do **nowego** folderu, np. `D:\Gry\AmBoid-021`.
4. Uruchom tam `node tools/serve.mjs` (albo `npm.cmd start`).
5. Sprawdź w konsoli przeglądarki (F12) komunikat `AMBOID v0.2.1…`.

---

## 3. Uruchom grę

W katalogu projektu:

```powershell
npm start
```

- **Nie musisz robić `npm install`**, żeby zagrać — serwer używa tylko modułów
  wbudowanych w Node.
- W konsoli pojawi się adres, zwykle `http://localhost:8080`.
- Otwórz go w przeglądarce (Ctrl+klik w link albo wklej do paska).
- Windows Defender Firewall może zapytać o dostęp dla Node.js — zaznacz
  **Private networks** i kliknij **Allow access**. Dla `localhost` gra działa
  nawet bez tego, ale zezwolenie usuwa problemy z podglądem z telefonu.
- Zatrzymanie serwera: **Ctrl + C** w oknie PowerShell.

### Wariant bez npm (gdy PowerShell blokuje `npm.ps1`)

Serwer to zwykły skrypt Node — możesz pominąć npm całkowicie:

```powershell
node tools/serve.mjs
```

Efekt jest identyczny: `http://localhost:8080`. Bez npm nie uruchomisz tylko
`npm test` i `npm run shots` (te potrzebują `pngjs`), ale **do grania npm nie jest
potrzebny**.

> **Nie otwieraj `index.html` przez dwuklik.** Gra używa ES modules i przy
> `file:///C:/...` przeglądarka zablokuje ładowanie plików (CORS). Zawsze przez
> `npm start` i `http://localhost:8080`.

### Inny port (gdy 8080 jest zajęty)

PowerShell:

```powershell
$env:PORT = 8081
npm start
```

Potem otwórz `http://localhost:8081`. W `cmd.exe` byłoby
`set PORT=8081 && npm start`.

---

## 4. Wybierz wersję: AGA albo RTG

Po starcie gry:

| Sposób | Jak |
| --- | --- |
| Klawisz **G** | przełącza po kolei: **OCS 32 → AGA 64 → RTG RGB** |
| Menu | **GRAFIKA: …** (w menu głównym i w pauzie `Esc`) |
| Adres URL | `?gfx=aga`, `?gfx=rtg`, `?gfx=ocs` |
| Pełny ekran | menu główne → **PEŁNY EKRAN** |

Przykłady:

```
http://localhost:8080/?gfx=aga
http://localhost:8080/?gfx=rtg
http://localhost:8080/?gfx=rtg&seed=ABC123
```

- **AGA 64** — domyślny. Różnica względem OCS jest celowo subtelna: więcej
  półtonów w trawie, betonie, cegle i drewnie.
- **RTG RGB** — najlepiej widać go **nocą**: ciepłe latarnie, zimne niebo,
  latarka i błysk wystrzału. Gra startuje o 08:00; do 22:00 przewija się
  ~3 minuty (1 sekunda = 5 minut gry). Możesz też spać w łóżku, żeby przeskoczyć
  do rana — ale wtedy noc zobaczysz dopiero następnego dnia.
- Wybór trybu zapisuje się w przeglądarce (`localStorage`). Aby wrócić do
  domyślnego, dopisz `?gfx=aga` albo wyczyść dane witryny.

**Sterowanie:** `WASD`/strzałki — ruch, `Shift` — bieg, `Ctrl` — skradanie,
`Spacja`/LPM — atak, `E` — akcja, `Q` — użyj, `1–0` — sloty, `F` — latarka,
`M` — mapa, `H` — pomoc, `Esc` — pauza, `G` — tryb grafiki.

Dźwięk startuje po pierwszym kliknięciu w planszę (taka polityka przeglądarek).

---

## 5. Testy i narzędzia (opcjonalnie)

Do testów i generowania zrzutów potrzebny jest `pngjs`:

```powershell
npm install
npm test
```

Oczekiwany wynik: **114 OK, 0 FAIL**, potem `BROWSER-STUB TEST OK` i stress
z komunikatem `~2000+ ticks/s`.

Inne przydatne komendy:

```powershell
npm run shots                 # odświeża docs/screens/*.png
node tools/export_amiga.mjs   # IFF ILBM 32 i 64 kolory + palety .pal
node tools/export_map.mjs     # miasto w formacie .amb
```

### Gdy `npm` nie działa: `npm.ps1 cannot be loaded…`

To nie jest błąd Node.js, tylko polityka wykonywania skryptów PowerShell.
Masz trzy wyjścia — od najprostszego:

1. **Używaj `npm.cmd`** zamiast `npm` (ten plik nie jest skryptem PowerShell):

```powershell
npm.cmd -v
npm.cmd start
npm.cmd test
```

2. **Zmień politykę tylko dla siebie** (jednorazowo, bez uprawnień administratora):

```powershell
Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned
```

Potwierdź `Y`. Potem `npm -v` działa w tym i kolejnych oknach. Sprawdzenie:

```powershell
Get-ExecutionPolicy -List
```

3. **Obejdź npm całkowicie** — do samego grania wystarczy:

```powershell
node tools/serve.mjs
```

Jeśli polityka jest narzucona przez administratora (`MachinePolicy`/`UserPolicy`),
punkt 1 lub 3 zadziała zawsze.

> Uruchamiaj grę **w katalogu projektu** (np. `C:\Gry\AmBoid`), a nie w
> `C:\WINDOWS\system32`. W system32 nie ma plików gry i zapis może wymagać
> uprawnień administratora.

---

## 6. Podgląd assetów Amigi (opcjonalnie)

- Szybki podgląd: otwórz w Przeglądarce zdjęć Windows pliki
  `docs/amiga/*.png` oraz **`docs/amiga/aga/*.png`** — to eksporty atlasów.
- Pliki `.iff` (ILBM) otworzysz w **Personal Paint** lub **Deluxe Paint** pod
  emulatorem **FS-UAE / WinUAE**. Wersja w `docs/amiga/` ma 5 bitplanów
  (OCS/ECS), a `docs/amiga/aga/` — 6 bitplanów i paletę 64 kolorów (AGA).
- Plik `.amb` to własny format miasta (big-endian) — opisany w
  [`docs/AMIGA.md`](AMIGA.md), nie otworzy go żaden standardowy program.

---

## 7. Typowe problemy

| Objaw | Przyczyna / rozwiązanie |
| --- | --- |
| `git` nie jest rozpoznawane | Git **nie jest potrzebny** — użyj pobranego ZIP i wejdź do jego folderu, np. `cd "D:\pobrane\zomboid\AmBoid-arena-cb222f77-amboid"`. Albo doinstaluj Git for Windows i otwórz nowe okno PowerShell |
| `npm` nie jest rozpoznawane | Node bez PATH — przeinstaluj z opcją „Add to PATH", otwórz **nowe** okno PowerShell |
| `npm.ps1 cannot be loaded…` | polityka PowerShell — użyj `npm.cmd start` albo `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned` (sekcja 5) |
| `npm` działa, ale nie ma gry | jesteś w `C:\WINDOWS\system32` — wejdź do katalogu projektu (`cd C:\Gry\AmBoid`) |
| Pusta/biała strona | otwarto `file://` zamiast `http://localhost:8080`; odśwież Ctrl+F5 |
| `EADDRINUSE` / port zajęty | zmień port: `$env:PORT=8081; npm start` |
| Brak dźwięku | kliknij najpierw w planszę gry |
| `G` nie zmienia grafiki | stary ZIP bez `src\profiles.js` — pobierz wersję 0.2.1 (sekcja 2) |
| Gra pamięta tryb RTG i wygląda ciemno | to noc w RTG — wciśnij **G**, aby wrócić do AGA, albo zagraj do rana |
| Obraz rozmyty | ustaw zoom przeglądarki na 100% (Ctrl+0); gra skaluje piksele całkowitą wielokrotnością |
| Firewall blokuje podgląd z innego urządzenia | zezwól Node.js w zaporze dla sieci prywatnej |

---

Gotowe. Miłego przetrwania — i pamiętaj: w RTG noc naprawdę jest ciemna.
