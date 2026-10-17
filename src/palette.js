// AMBOID — stała paleta 32 kolorów (5 bitplanów, jak na Amiga OCS/ECS).
// Każdy kolor ma swoje przeznaczenie; gra NIGDY nie używa kolorów spoza tej listy.

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
  '#5b381d', // 11 WOOD_DARK   -- ciemne drewno / włosy
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

export const TRANSPARENT = 255;

// Konwersja HEX -> [r,g,b]
export function hexToRgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

// Paleta w formacie używanym przez ImageData (little endian ABGR).
export function paletteToUint32(palette = PALETTE) {
  const out = new Uint32Array(32);
  for (let i = 0; i < 32; i++) {
    const [r, g, b] = hexToRgb(palette[i]);
    out[i] = (255 << 24) | (b << 16) | (g << 8) | r;
  }
  return out;
}
