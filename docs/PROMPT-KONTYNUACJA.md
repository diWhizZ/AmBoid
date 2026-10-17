# AMBOID — kontynuacja po v0.2.4

Cel: A1200 AGA (64 kolory, domyślnie) albo RTG (64 + światło RGB).
OCS 32 pozostaje tylko profilem zgodności. 70% Project Zomboid / 30% Cannon Fodder.
Bez RTS-izacji walki, grupowego autoataku ani zmiany podstawowego survivalu.

## Stan i publikacja

v0.2.4 odtworzono z przekazanej specyfikacji na bazie main `4d301fb` (v0.2.3),
ponieważ commit `4690d2b`, jego ZIP i wcześniejsza wersja tego dokumentu nie były
dostępne w nowym checkoutcie. Nie jest to odzysk oryginalnego commitu.

Przed pracą sprawdź `git log --oneline -3`, wersję w `package.json` i napis
`V0.2.4` w `src/ui.js` (albo numer nowszej wersji).
Pracuj wyłącznie na gałęzi przypisanej bieżącej sesji. Nie używaj starej
`arena/cb222f77-amboid` — jej PR #1 jest scalony.

Zapis dla użytkownika jest na GitHubie, nie w sandboxowym podglądzie:
1. `npm test`: v0.2.4 = 204 OK, 0 FAIL; BROWSER-STUB dla far/close; stress 6000 klatek.
2. Commit i push bieżącej gałęzi, NOWY PR do main, jawne `gh pr merge <nr> --merge`.
3. Release v0.2.4 z assetem `AmBoid-0.2.4.zip` (ignorowany przez Git).
4. Zweryfikuj wersję na main i asset Release przed etapem 4.

Opis PR edytuj przez `gh api --method PATCH repos/diWhizZ/AmBoid/pulls/<nr> -f body=...`,
nie przez problematyczne `gh pr edit`. Linki do pobrania:
- https://github.com/diWhizZ/AmBoid/releases/tag/v0.2.4
- https://github.com/diWhizZ/AmBoid/releases/download/v0.2.4/AmBoid-0.2.4.zip
- https://github.com/diWhizZ/AmBoid/archive/refs/heads/main.zip

## SPEC v0.2.4

- Ekran, HUD, menu, kursor i `isOverHud` zawsze **320×200**.
- `viewMode: 'far'|'close'`; domyślnie far, `zoom = 0.75`, bufor świata
  `worldScreen` 427×267 (`ceil(320/zoom) × ceil(200/zoom)`). Bliski: 1×, 320×200.
- V przełącza widok (bez auto-repeat), również poza rozgrywką.
  `?view=far|close` ma pierwszeństwo przed `localStorage['amboid.view']`.
- `Screen.blitScaled` skaluje **indeksy palety** filtrem MAJORITY 2×2,
  bez uśredniania RGB i bez histogramu całego obszaru. Remis: pierwsza próbka.
  Czyści `uiMask`. Światło `rgbaLit` jest dopiero po skalowaniu.
- Kamera pracuje w pikselach bufora świata. Wymagany wzór:
  `offX = floor(viewW/2) - round(cx) + round(lookX)` (analogicznie Y).
  Nieparzyste 427 nie może dawać półpikseli ani skoków kadru.
- Wszystkie ścieżki wejścia myszy przeliczają współrzędne przez `worldPoint`.
  `hover.sx/sy` są w pikselach bufora świata, nie HUD. Zachować LPM podejście
  bez autoataku, PPM celowany, przytrzymanie, sloty i dotychczasowe schematy K/pad.
- `renderOrders(game, {scale})` rysuje **po** `blitScaled`: ostre kropki 3×3
  i obrysy kafla w 320×200. `strokeTile` ma parametr skali `k`.
- `fovRadius` dzielony przez zoom, zaokrąglony w górę (pętle FOV potrzebują
  całkowitego promienia). `getLights` skaluje pozycje i promienie przez zoom;
  `updateCameraLead` dzieli ekranowy lead przez zoom.
- Kolejność `tileDim`: **RTG → dzień (`amb===0` → 0 także przy `!vis`) → pamięć
  mapy (`!vis` → 3) → nocne światła**. Nie przywracaj winiety za dnia.
- Pomoc: 7 wierszy od y=33 co 9 px (w tym WIDOK V), MYSZ y=99,
  PRZETRWANIE y=110, 4 porady od y=120.
- Wersja 0.2.4: package + lock, main.js, UI, README, GDD, GRAFIKA, WINDOWS.
  Zrzuty 01–12; nowe 11-widok-daleki.png i 12-widok-bliski.png.
- W `Game` jedna implementacja `updateHover` (usunięto pustą atrapę z v0.2.3).

## Etap 4 — następna wersja (po publikacji v0.2.4)

Małe rozpoznawalne ikony ekwipunku i łupów z jednej 16-kolorowej podpalety,
bez gradientów. Oszczędne animacje 2–4-klatkowe i mirroring boków.
Efekty: krew, łuski, dym, błysk wystrzału, ślady stóp — limitowane, nie
rosnące bez końca. Portret i pasek stanu dopracowane w 320×200.
Spójna perspektywa postaci i rekwizytów diagonal-down jak w CF; nie zmieniaj
siatki podłogi w ścisłą perspektywę CF. Potem etap 5 — NPC, osobno.

Nie zmieniaj geometrii kafla tylko w render.js: odpowiedniki TILE_W/TILE_H/WALL_H
w art.js muszą być spójne (obecnie 32/16/20). 255 = przezroczystość sprite'ów.
Nie uruchamiaj `tools/export_amiga.mjs` — nadpisuje zapisane eksporty docs/amiga/**.
Odrzucono szerokie viewporty 480×300 i 384×240; nie wracaj do nich.

## Windows użytkownika

Node v24.22.0, brak Gita w PATH, PowerShell blokuje npm.ps1; projekt pobierany ZIP-em.
Instrukcje:

```powershell
cd D:\pobrane\zomboid\AmBoid-0.2.4
node tools/serve.mjs
```

http://localhost:8080 — do gry nie trzeba npm install.
Do testów: `npm.cmd install`, `npm.cmd test`. Bez zmiany ExecutionPolicy.
Zawsze podawaj link Release / archive ZIP, nigdy ścieżkę sandboxa.
