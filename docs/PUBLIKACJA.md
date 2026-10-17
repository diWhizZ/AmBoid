# v0.2.4 — zapis na GitHubie i blokada assetu Release

## Co już jest gotowe

- [PR #2](https://github.com/diWhizZ/AmBoid/pull/2) scalony do `main`.
- Commit scalający: `20f7bff7c0e72227b1b864f76f64966e99bfc32b`.
- `package.json` i lock = **0.2.4**, ekran tytułowy = **V0.2.4**.
- `npm test`: **204 OK, 0 FAIL**, BROWSER-STUB far/close, 0 pikseli poza paletą,
  stress 6000 klatek bez wyjątków. Zrzuty 01–12 odświeżone; docs/amiga nietknięte.
- [Release v0.2.4](https://github.com/diWhizZ/AmBoid/releases/tag/v0.2.4) i tag istnieją.
- **[ZIP źródeł tagu v0.2.4](https://github.com/diWhizZ/AmBoid/archive/refs/tags/v0.2.4.zip)**
  działa: pobrano go z GitHuba, sprawdzono integralność, wersję, UI i zrzut 12.
- [main.zip](https://github.com/diWhizZ/AmBoid/archive/refs/heads/main.zip) zawiera
  najnowszy scalony stan. Do uruchomienia nie potrzeba Gita ani npm install.

## Czego jeszcze brakuje

Osobny plik **AmBoid-0.2.4.zip** nie został dołączony jako asset Release.
Nie należy przedstawiać linku `/releases/download/v0.2.4/AmBoid-0.2.4.zip` jako
sprawnego, dopóki API Release nie pokaże tego assetu w stanie `uploaded`.

Dwie niezależne blokady środowiska:
1. `gh release create v0.2.4 AmBoid-0.2.4.zip ...` nie może wysłać pliku do
   `uploads.github.com` (EOF). Sandbox dopuszcza github.com/api.github.com/codeload,
   ale nie host wysyłki assetów. Release utworzono osobno, bez pliku.
2. Próba dodania workflow publikującego ZIP została odrzucona przez GitHuba:
   `refusing to allow a GitHub App to create or update workflow ... without workflows permission`.
   Odmówiony commit nie został wypchnięty; nieaktywny szablon jest zapisany tutaj:
   [RELEASE-ZIP.workflow.yml](RELEASE-ZIP.workflow.yml).

Etap 4 (styl Cannon Fodder) i etap 5 (NPC) **nie są rozpoczęte**, zgodnie z
warunkiem dokończenia publikacji v0.2.4.

## Jak odblokować wysyłkę

### A. Dla dalszej automatyzacji przez agenta

Administrator połączenia GitHub w Arena musi dopuścić `uploads.github.com`
albo nadać GitHub App uprawnienie zapisu **Workflows** dla tego repozytorium
(i zatwierdzić zmianę uprawnień instalacji / ponownie połączyć GitHub).
Nie podawaj haseł, tokenów, kodów 2FA ani innych danych logowania w czacie.

Po nadaniu uprawnienia workflow można przenieść do
`.github/workflows/release-zip.yml`, wypchnąć na bieżącą gałąź sesji i scalić
nowy PR do main. Następnie:

```bash
gh workflow run release-zip.yml --repo diWhizZ/AmBoid --ref main -f tag=v0.2.4
```

Workflow pobierze dokładnie tag, uruchomi testy, sprawdzi zgodność wersji,
utworzy ZIP i wykona `gh release upload` po stronie GitHuba.
Szablon nie został uruchomiony — blokada dotyczy uprawnień przed jego publikacją.

### B. Bez Gita i bez zmiany połączenia — właściciel repo przez przeglądarkę

1. Pobierz [ZIP tagu v0.2.4](https://github.com/diWhizZ/AmBoid/archive/refs/tags/v0.2.4.zip).
2. Zmień nazwę pobranego pliku na **AmBoid-0.2.4.zip** (upewnij się, że Windows
   nie dopisał drugiego `.zip`). To te same źródła; archiwum GitHuba dodaje
   katalog nadrzędny `AmBoid-0.2.4`.
3. Na [Release](https://github.com/diWhizZ/AmBoid/releases/tag/v0.2.4) wybierz
   **Edit**, przeciągnij ZIP do pola załączników i zapisz **Update release**.
4. Sprawdź działanie:
   https://github.com/diWhizZ/AmBoid/releases/download/v0.2.4/AmBoid-0.2.4.zip

Pobranie i granie nie wymaga powyższej ręcznej operacji — ZIP tagu już działa.
Jest ona potrzebna jedynie do domknięcia publikacji pod żądaną nazwą assetu.
