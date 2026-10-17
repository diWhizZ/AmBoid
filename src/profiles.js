// Profile graficzne AMBOID.
//
// Decyzja projektowa: celujemy w rozbudowaną A1200 (68030 + fast RAM, AGA)
// albo w system z kartą RTG (Picasso96 / CyberGraphX, tryb chunky 8-bit).
// Ten sam kod i ten sam tileset obsługują trzy profile:
//
//   ocs  — 320x200, 32 kolory, 5 bitplanów. Tryb zgodności (A500, CD32, demo).
//   aga  — 320x200, 64 kolory, 6 bitplanów. A1200 z AGA; dodatkowe odcienie
//          cieni i świateł z palety rozszerzonej.
//   rtg  — 320x200 logicznie (karta RTG skaluje do 640x400), 8-bit chunky
//          i prawdziwe, płynne oświetlenie RGB w nocy.

import { PALETTE, PALETTE_EXT, EXT_TO_BASE } from './palette.js';

export const PROFILES = {
  ocs: {
    id: 'ocs',
    label: 'OCS 32',
    longLabel: 'OCS/ECS — 32 KOLORY',
    palette: PALETTE,
    fallback: EXT_TO_BASE,
    colors: 32,
    bitplanes: 5,
    lighting: false,
    note: 'A500 / A1200 w trybie zgodności',
  },
  aga: {
    id: 'aga',
    label: 'AGA 64',
    longLabel: 'AGA 64 KOLORY',
    palette: PALETTE_EXT,
    fallback: null,
    colors: 64,
    bitplanes: 6,
    lighting: false,
    note: 'A1200 030+ / AGA',
  },
  rtg: {
    id: 'rtg',
    label: 'RTG RGB',
    longLabel: 'RTG — CHUNKY + ŚWIATŁO RGB',
    palette: PALETTE_EXT,
    fallback: null,
    colors: 64,
    bitplanes: 8,
    lighting: true,
    note: 'karta RTG, chunky 8-bit',
  },
};

export const PROFILE_ORDER = ['ocs', 'aga', 'rtg'];

export function getProfile(id) {
  return PROFILES[id] || PROFILES.aga;
}

export function nextProfile(id) {
  const i = PROFILE_ORDER.indexOf(id);
  return PROFILE_ORDER[(i + 1) % PROFILE_ORDER.length];
}

// Ile pamięci na klatkę zajmuje dany tryb (bajty, bez podwójnego buforowania).
export function frameBytes(profile, w = 320, h = 200) {
  if (profile.lighting) return w * h; // chunky 8-bit
  return Math.ceil(w / 8) * h * profile.bitplanes;
}
