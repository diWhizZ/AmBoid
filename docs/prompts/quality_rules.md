# Reguły Jakości Pixel Artu dla AmBoid

Podczas tworzenia i generowania tekstur, assetów oraz animacji dla projektu AmBoid należy bezwzględnie stosować poniższe zasady jakościowe:

## 1. Test czytelności w docelowym rozmiarze (Readability First)
- **Zawsze testuj czytelność bezpośrednio w rozmiarze 32x16 lub 64x32.**
- Detal, który w małej rozdzielczości zlewa się w nieczytelną plamę lub „kaszkę”, musi zostać **usunięty lub uproszczony**, a nie maskowany dodawaniem kolejnych kolorów.
- Kształt obiektu (sylwetka) musi być natychmiast rozpoznawalny w ułamku sekundy podczas rozgrywki.

## 2. Generowanie bezpośrednio w docelowej rozdzielczości
- **Nie generuj tekstur w wysokiej rozdzielczości (HD) w celu późniejszego skalowania.**
  - Skalowanie HD w dół powoduje niepożądany blurring, dithering, utratę ostrego konturu i powstawanie setek niekontrolowanych barw pośrednich.
  - Assety muszą powstawać piksel po pikselu w docelowym rozmiarze (64x32 dla kafli AGA, 32x16 dla OCS).

## 3. Kontury i cieniowanie
- Używaj jasnych lub ciemnych konturów wyłącznie tam, gdzie realnie poprawiają separację obiektu od tła i rozpoznawalność.
- Unikaj "pillow shadingu" (cieniowania dookoła konturu). Źródło światła ma być stałe: z lewego górnego rogu (`upper-left lighting`).
- Ostre odcięcia barwne i skupiska pikseli (pixel clusters) zamiast pojedynczych rozproszonych pikseli (brak "noise pixel soup").

## 4. Ograniczenie palety i kompatybilność z Amigą
- Wersja OCS/ECS: maksymalnie **32 kolory** na cały ekran.
- Wersja AGA: maksymalnie **64–128 kolorów** (z limitu 256).
- Przezroczystość:
  - W wersji roboczej HTML5: kanał alpha = 0 (przezroczystość 1-bitowa).
  - Wersja Amiga: kolor kluczowy (indeks 0 lub maska bitplanowa dla blittera).
  - Zakaz stosowania antyaliasingu alpha (wartości alpha między 1 a 254).
