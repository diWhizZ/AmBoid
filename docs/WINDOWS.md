# AMBOID v0.2.4 pod Windows — ZIP, bez Gita

Cel: **rozbudowana A1200 AGA (64 kolory) albo karta RTG (światło RGB)**.
To jeden prototyp przeglądarkowy, nie dwa programy i nie natywny plik `.exe`.
Tryb OCS 32 jest wyłącznie zgodnością; domyślny profil to AGA.

## 1. Pobierz i rozpakuj

- [Release v0.2.4](https://github.com/diWhizZ/AmBoid/releases/tag/v0.2.4)
- **[ZIP źródeł v0.2.4](https://github.com/diWhizZ/AmBoid/archive/refs/tags/v0.2.4.zip)** — stała wersja, dostępny teraz
- [main.zip](https://github.com/diWhizZ/AmBoid/archive/refs/heads/main.zip) — najnowszy stan po scaleniu PR

Nie potrzebujesz Gita. ZIP tagu ma podfolder `AmBoid-0.2.4`; rozpakuj go do
`D:\pobrane\zomboid`, żeby otrzymać:
`D:\pobrane\zomboid\AmBoid-0.2.4`.
W tym folderze mają być od razu `index.html`, `package.json`, `src`, `tools`, `docs`.
Nie uruchamiaj projektu wewnątrz archiwum ani w `C:\WINDOWS\system32`.
Archiwum `main.zip` ma własny podfolder `AmBoid-main` — wejdź do niego.

Na stronie Release można też pobrać **Source code (zip)** — to ten sam tag.
Osobny asset o nazwie `AmBoid-0.2.4.zip` nie został jeszcze dołączony z powodu
blokady `uploads.github.com` i braku uprawnienia `workflows` połączenia Arena.
Nie potrzebujesz tego assetu, aby uruchomić grę z ZIP-a tagu.
[Szczegóły publikacji](PUBLIKACJA.md).

## 2. Uruchom — bez npm i bez zmiany ExecutionPolicy

Wystarczy zainstalowany Node.js (np. **v24.22.0**) i aktualny Chrome/Edge/Firefox.
Sprawdzenie: `node -v`.

```powershell
cd D:\pobrane\zomboid\AmBoid-0.2.4
node tools/serve.mjs
```

Otwórz **http://localhost:8080**. Nie zamykaj okna serwera podczas gry.
Zatrzymanie: **Ctrl+C**. **Do grania nie trzeba `npm install`.**

Nie otwieraj `index.html` dwuklikiem (`file://`) — moduły JS wymagają serwera HTTP.
Serwer działa lokalnie; nie potrzebuje internetu ani konta.

Inny port, jeżeli 8080 jest zajęty:

```powershell
$env:PORT = 8081
node tools/serve.mjs
```

Adres wtedy: `http://localhost:8081`.

## 3. Sprawdź wersję i widok

Na ekranie tytułowym musi być **V0.2.4**, a w konsoli F12 `AMBOID v0.2.4`.
Jeżeli nadal jest stara wersja: zatrzymaj poprzedni serwer, sprawdź folder,
uruchom ponownie i odśwież **Ctrl+F5**.

- Domyślny widok: **DALEKI, 0,75×** (bufor świata 427×267 → ekran 320×200).
- **V** przełącza DALEKI / BLISKI (1×); działa też na pauzie i w menu.
- HUD, kursor i kropki trasy pozostają ostre w 320×200.
- Wybór zapisuje się w `localStorage['amboid.view']`.
- URL ma pierwszeństwo przed zapisanym ustawieniem:

```text
http://localhost:8080/?view=far
http://localhost:8080/?view=close
http://localhost:8080/?gfx=rtg&view=far&seed=ABC123
```

## 4. Grafika i sterowanie

**G**: OCS 32 → AGA 64 → RTG RGB. To ten sam świat i ta sama gra.
AGA jest domyślne; RTG najlepiej widać nocą (ciepłe latarnie i stożek latarki).
Profil można ustawić też przez `?gfx=aga`, `?gfx=rtg`, `?gfx=ocs` lub menu GRAFIKA.

| Sterowanie | Akcja |
| --- | --- |
| WASD / strzałki | ruch |
| K | EKRAN (A lewo, D prawo) ↔ IZO (ruch po skosach kafli) |
| Shift / Ctrl | bieg / skradanie |
| LPM na ziemi | idź; przytrzymanie = podążanie |
| LPM na obiekcie | podejdź i wykonaj jedną akcję |
| LPM na zombie | podejdź i stań obok, **bez automatycznego ataku** |
| PPM / Spacja | atak; PPM w stronę kursora |
| E / Q | interakcja / użycie przedmiotu |
| 1–0 | sloty ekwipunku |
| F / M / H | latarka / mapa / pomoc |
| V / G / Esc | widok / grafika / pauza |

Nowe kliknięcie zastępuje stary rozkaz. HUD nie wydaje rozkazów ruchu.
Kursor ma białe ramiona i kolorowy środek: biały — idź, złoty — interakcja,
żółty — zombie, czerwony — blokada, szary — brak linii wzroku.

Pad XInput: gałka/D-pad — względem ekranu, A — atak, B — akcja, X — użyj,
Y — latarka, LB/RB — sloty, LT/RT — skradanie/bieg, Back — mapa, Start — pauza.
Dźwięk uruchomi się po pierwszej interakcji (polityka przeglądarki).

## 5. Testy i zrzuty — opcjonalnie

PowerShell może blokować `npm.ps1`. Używaj **`npm.cmd`**, bez zmiany polityki:

```powershell
cd D:\pobrane\zomboid\AmBoid-0.2.4
npm.cmd install
npm.cmd test
```

Oczekiwane dla v0.2.4: **204 OK, 0 FAIL**, `BROWSER-STUB TEST OK` dla far i close,
`pixels outside palette: 0 / 64000`, potem stress 6000 klatek bez wyjątków.
Wydajność stress zależy od komputera — nie porównuj jej do sztywnej wartości.

```powershell
npm.cmd run shots
```

Zrzuty trafiają do `docs/screens/` (01–12, w tym porównanie daleki/bliski).
`tools/export_amiga.mjs` **nadpisuje** `docs/amiga/**`; nie jest potrzebny do gry
ani do testów. Pliki IFF/PNG w tych katalogach to zapisane eksporty, nie assety
wczytywane przez grę. Gra generuje grafikę proceduralnie.

## 6. Typowe problemy

| Objaw | Rozwiązanie |
| --- | --- |
| `git` nie jest rozpoznawane | Git niepotrzebny: pobierz ZIP z Release |
| `npm.ps1 cannot be loaded` | do gry `node tools/serve.mjs`, do testów `npm.cmd install` i `npm.cmd test` |
| `node` nie jest rozpoznawane | zainstaluj Node z Add to PATH, otwórz nowe okno PowerShell |
| brak `tools/serve.mjs` | wejdź do rozpakowanego folderu z `index.html`, nie do katalogu nadrzędnego |
| `EADDRINUSE` | zatrzymaj poprzedni serwer Ctrl+C albo zmień PORT jak wyżej |
| pusta strona | użyj HTTP zamiast `file://`, odśwież Ctrl+F5 |
| stary numer wersji | zatrzymaj serwer starego ZIP-a i uruchom z folderu 0.2.4 |
| A/D idą po skosie | K zmienia IZO/EKRAN; nie jest to zamiana klawiszy |
| zapisany RTG wygląda ciemno | jest noc; G wraca do AGA lub użyj `?gfx=aga` |
| chcesz większe postacie | V albo `?view=close`; wyświetlacz i HUD nadal 320×200 |
| brak dźwięku/pada | kliknij planszę, sprawdź tryb XInput |
| rozmyty obraz | zoom przeglądarki 100% (Ctrl+0); skalowanie canvas jest nearest |

Eksporty Amigi: `docs/amiga/aga/*.iff` (AGA, 6 bitplanów), `docs/amiga/*.iff`
(zgodność OCS/ECS, 5 bitplanów). Otwieraj w Personal Paint / Deluxe Paint pod
WinUAE lub FS-UAE. Plan natywnego portu: [AMIGA.md](AMIGA.md).
