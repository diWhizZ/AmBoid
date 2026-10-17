// AMBOID — palety sprzętowe.
//
//   PALETTE      — 32 kolory bazowe (5 bitplanów, OCS/ECS, A500 i tryb zgodności)
//   PALETTE_EXT  — 64 kolory (6 bitplanów AGA, A1200); pierwsze 32 to baza,
//                  kolejne 32 to dodatkowe odcienie cieni i świateł
//   EXT_TO_BASE  — mapowanie kolorów rozszerzonych na bazowe dla trybu 32 kolorów
//
// Cała grafika jest rysowana indeksami; profil graficzny decyduje tylko o tym,
// jak indeksy są prezentowane. Dzięki temu ten sam tileset działa na OCS, AGA
// i na karcie RTG.

export const PALETTE = [
  '#07090d', //  0 VOID        — czerń ekranu / poza mapą
  '#10141c', //  1 OUTLINE     — kontur, cień, dither
  '#1b2330', //  2 SHADOW      — panele UI, głęboki cień
  '#29384a', //  3 SLATE_DARK  — stal / spodnie
  '#3f5570', //  4 SLATE       — stal jaśniejsza
  '#5f7a8c', //  5 STEEL       — szkło, metal
  '#cfc7ae', //  6 BONE        — kość, tekst pomocniczy
  '#f2ead2', //  7 WHITE       — biały tekst
  '#e7c65a', //  8 YELLOW      — UI, światło
  '#c78f3f', //  9 GOLD        — piasek, złoto
  '#8d5a2b', // 10 WOOD        — drewno
  '#5b381d', // 11 WOOD_DARK   — ciemne drewno / włosy
  '#b9865a', // 12 WOOD_LIGHT  — jasne drewno
  '#6e4631', // 13 SKIN_DARK   — skóra ciemna
  '#b9805f', // 14 SKIN        — skóra
  '#d9a67c', // 15 SKIN_LIGHT  — skóra jasna
  '#7c1a22', // 16 BLOOD_DARK  — zaschnięta krew
  '#b3272c', // 17 BLOOD       — krew
  '#e0503a', // 18 BLOOD_BRIGHT— świeża krew / cegła
  '#16281a', // 19 GREEN_DARK  — cień zieleni
  '#2b4a2b', // 20 GRASS_DARK  — trawa ciemna
  '#456b34', // 21 GRASS       — trawa
  '#6b8f42', // 22 GRASS_LIGHT — trawa jasna
  '#77786b', // 23 CONCRETE_DARK— beton
  '#a3a18d', // 24 CONCRETE    — beton jasny
  '#2f3136', // 25 ASPHALT_DARK— asfalt
  '#45474d', // 26 ASPHALT     — asfalt jaśniejszy
  '#666862', // 27 ASPHALT_LIGHT— przetarcia
  '#7e8e5f', // 28 ZOMBIE_SKIN — skóra zombie
  '#55653f', // 29 ZOMBIE_SHADE— cień zombie
  '#8b9199', // 30 METAL       — metal / broń
  '#3d6e9e', // 31 BLUE        — woda, kurtka, UI
];

// Dodatkowe 32 kolory AGA — półtony i światła, które zagęszczają rampę
// istniejących materiałów. Dzięki nim 64-kolorowy tryb ma płynniejsze
// cieniowanie bez zmiany indeksów bazowych (OCS mapuje je z powrotem).
export const PALETTE_EXT = [
  ...PALETTE,
  '#3a5c33', // 32 GRASS_MID
  '#a8cf6a', // 33 GRASS_LIT
  '#1d3320', // 34 GRASS_DEEP
  '#a5824c', // 35 DIRT_MID
  '#d8b273', // 36 DIRT_LIT
  '#7a4c26', // 37 WOOD_MID
  '#b98756', // 38 WOOD_WARM
  '#35200c', // 39 WOOD_DEEP
  '#c99a7b', // 40 SKIN_MID
  '#eac09a', // 41 SKIN_HI
  '#7a1a1f', // 42 BLOOD_DRY
  '#ff7a5c', // 43 BLOOD_FRESH
  '#8b8a79', // 44 CONCRETE_MID
  '#cfcdb4', // 45 CONCRETE_HI
  '#565961', // 46 ASPHALT_MID
  '#858782', // 47 ASPHALT_HI
  '#bcc4cc', // 48 METAL_HI
  '#d6e4ee', // 49 STEEL_HI
  '#b4dcf2', // 50 GLASS_HI
  '#6b7c4e', // 51 ZOMBIE_MID
  '#9db07a', // 52 ZOMBIE_HI
  '#2f3d24', // 53 ZOMBIE_DEEP
  '#ffe07a', // 54 GOLD_HI
  '#ffe98f', // 55 YELLOW_HI
  '#3f7fb0', // 56 WATER_MID
  '#7fc0e0', // 57 WATER_HI
  '#0d2f47', // 58 WATER_DEEP
  '#1d2430', // 59 SHADOW_WARM
  '#11324f', // 60 NIGHT_BLUE
  '#ffb45c', // 61 LAMP_WARM
  '#ffe6a8', // 62 LAMP_CORE
  '#e8e4d8', // 63 CHALK
];

// Indeksy rozszerzone w trybie 32 kolorów pokazują najbliższy kolor bazowy.
export const EXT_TO_BASE = Uint8Array.from([
  0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15,
  16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31,
  21, 22, 19, 9, 9, 10, 12, 11, 14, 15, 16, 18, 24, 24, 26, 27,
  30, 5, 5, 28, 28, 29, 8, 8, 31, 5, 3, 2, 2, 9, 7, 7,
]);


export const C = {
  VOID: 0,
  OUTLINE: 1,
  SHADOW: 2,
  SLATE_DARK: 3,
  SLATE: 4,
  STEEL: 5,
  BONE: 6,
  WHITE: 7,
  YELLOW: 8,
  GOLD: 9,
  WOOD: 10,
  WOOD_DARK: 11,
  WOOD_LIGHT: 12,
  SKIN_DARK: 13,
  SKIN: 14,
  SKIN_LIGHT: 15,
  BLOOD_DARK: 16,
  BLOOD: 17,
  BLOOD_BRIGHT: 18,
  GREEN_DARK: 19,
  GRASS_DARK: 20,
  GRASS: 21,
  GRASS_LIGHT: 22,
  CONCRETE_DARK: 23,
  CONCRETE: 24,
  ASPHALT_DARK: 25,
  ASPHALT: 26,
  ASPHALT_LIGHT: 27,
  ZOMBIE_SKIN: 28,
  ZOMBIE_SHADE: 29,
  METAL: 30,
  BLUE: 31,
};

// Kolory rozszerzone (tylko profile AGA/RTG).
export const X = {
  GRASS_MID: 32,
  GRASS_LIT: 33,
  GRASS_DEEP: 34,
  DIRT_MID: 35,
  DIRT_LIT: 36,
  WOOD_MID: 37,
  WOOD_WARM: 38,
  WOOD_DEEP: 39,
  SKIN_MID: 40,
  SKIN_HI: 41,
  BLOOD_DRY: 42,
  BLOOD_FRESH: 43,
  CONCRETE_MID: 44,
  CONCRETE_HI: 45,
  ASPHALT_MID: 46,
  ASPHALT_HI: 47,
  METAL_HI: 48,
  STEEL_HI: 49,
  GLASS_HI: 50,
  ZOMBIE_MID: 51,
  ZOMBIE_HI: 52,
  ZOMBIE_DEEP: 53,
  GOLD_HI: 54,
  YELLOW_HI: 55,
  WATER_MID: 56,
  WATER_HI: 57,
  WATER_DEEP: 58,
  SHADOW_WARM: 59,
  NIGHT_BLUE: 60,
  LAMP_WARM: 61,
  LAMP_CORE: 62,
  CHALK: 63,
};

export const TRANSPARENT = 255;

// ---------------------------------------------------------------------------
// Tablice przygaszenia (O(1) na piksel, zero mnożenia).
// Poziomy 1..4; indeksy rozszerzone najpierw sprowadzamy do bazy.
const DIM1 = [
  0, 1, 2, 3, 3, 4, 24, 6, 9, 10, 11, 2, 10, 11, 13, 14,
  1, 16, 17, 19, 19, 20, 21, 23, 23, 25, 25, 26, 29, 19, 5, 3,
];
const DIM2 = [
  0, 1, 1, 2, 2, 3, 23, 24, 10, 11, 1, 1, 11, 2, 11, 13,
  1, 16, 16, 19, 19, 19, 20, 25, 26, 1, 25, 25, 29, 19, 4, 2,
];
const DIM3 = DIM2.map((c) => DIM2[c]);
const DIM4 = DIM3.map(() => 1);

function expandTable(base) {
  const out = new Uint8Array(256);
  for (let i = 0; i < 32; i++) out[i] = base[i];
  for (let i = 32; i < 64; i++) out[i] = base[EXT_TO_BASE[i]];
  out[TRANSPARENT] = TRANSPARENT;
  return out;
}

export const DIM_TABLES = [null, expandTable(DIM1), expandTable(DIM2), expandTable(DIM3), expandTable(DIM4)];
export const DIM_DITHER = [0, 0, 0.1, 0.18, 0.3];

// Konwersja HEX -> [r,g,b]
export function hexToRgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

// Paleta w formacie ImageData (little endian ABGR) + tabela RGB do świateł.
export function paletteToUint32(palette = PALETTE) {
  const out = new Uint32Array(palette.length);
  for (let i = 0; i < palette.length; i++) {
    const [r, g, b] = hexToRgb(palette[i]);
    out[i] = (255 << 24) | (b << 16) | (g << 8) | r;
  }
  return out;
}
