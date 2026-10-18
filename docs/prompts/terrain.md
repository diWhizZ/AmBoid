# Prompt Szablon: Teren / Kafelki Podłóg (Terrain Floor Tiles)

## Wymiary i parametry techniczne
- **Rozdzielczość:** 64x32 px (lub 32x16 dla OCS/ECS, 128x64 dla źródła Small).
- **Proporcja izometryczna:** 2:1 (romb / diamond o szerokości 64 px i wysokości 32 px).
- **Tło:** Przezroczyste (alpha=0), bez magenty ani artefaktów.
- **Paleta:** Maksymalnie 16–24 kolory, zgodne z paletą retro Amigi (indeksy 0–31 OCS lub 0–63 AGA).
- **Format:** Pixel art, ostre piksele, brak antyaliasingu (brak rozmytych półprzezroczystych krawędzi), brak gradientów bilinearnych.

---

## Szablon promptu

```text
Create a 64x32 pixel art isometric floor tile, top-down 2:1 diamond perspective, seamless with neighboring tiles, clean readable silhouette, limited palette of 16 colors, no anti-aliasing, no gradients, no text, no watermark, transparent background, style: retro Amiga game, subject: {SUBJECT}.
```

### Przykłady wartości {SUBJECT}:
- `cracked concrete floor with subtle expansion joints`
- `dark aged asphalt with small tar patch`
- `lush grass with small tufts of darker weeds`
- `worn interior wooden planks with staggered seams`
- `stone cobblestone paving with defined grout lines`
- `shallow murky water with subtle reflective highlights`
