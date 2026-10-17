// Interfejs w stylu Amigi: panele, paski, mapa, ekrany tytułowe i menu.

import { drawText, textWidth, wrapText } from './font.js';
import { C } from './palette.js';
import { WORLD_W, WORLD_H } from './world.js';
import { ITEMS } from './items.js';

const ICONS = {
  heart: ['0110110', '1111111', '1111111', '0111110', '0011100', '0001000', '0000000'],
  bolt: ['0001100', '0011000', '0111110', '0000110', '0001100', '0011000', '0000000'],
  fork: ['1010100', '1010100', '1111100', '0010000', '0010000', '0010000', '0000000'],
  drop: ['0001000', '0011100', '0111110', '1111111', '1111111', '0111110', '0011100'],
  sun: ['0010000', '1010100', '0111000', '1111100', '0111000', '1010100', '0010000'],
  cloud: ['0000000', '0011000', '0111100', '1111110', '1111111', '0111100', '0000000'],
  rain: ['0011000', '0111100', '1111110', '0111100', '0000000', '0100010', '1000100'],
  skull: ['0111110', '1111111', '1101011', '1111111', '0111110', '0010100', '0000000'],
};

function drawIcon(scr, name, x, y, color) {
  const rows = ICONS[name];
  if (!rows) return;
  for (let ry = 0; ry < rows.length; ry++) {
    for (let rx = 0; rx < rows[ry].length; rx++) {
      if (rows[ry][rx] === '1') scr.set(x + rx, y + ry, color);
    }
  }
}

function txt(scr, text, x, y, color = C.WHITE, opts = {}) {
  drawText(scr, text, x, y, color, { shadow: C.OUTLINE, ...opts });
}

function fit(text, maxW, opts = {}) {
  let s = String(text);
  if (textWidth(s, opts) <= maxW) return s;
  while (s.length > 1 && textWidth(s + '..', opts) > maxW) s = s.slice(0, -1);
  return s + '..';
}

function bar(scr, x, y, w, h, pct, color) {
  scr.rect(x, y, w, h, C.OUTLINE);
  scr.rect(x + 1, y + 1, w - 2, h - 2, C.SHADOW);
  const fill = Math.max(0, Math.min(w - 2, Math.round((w - 2) * Math.max(0, Math.min(1, pct)))));
  if (fill > 0) scr.rect(x + 1, y + 1, fill, h - 2, color);
}

function button(game, x, y, w, h, label, action, selected) {
  const scr = game.screen;
  scr.rect(x, y, w, h, selected ? C.SLATE_DARK : C.SHADOW);
  scr.frame(x, y, w, h, selected ? C.YELLOW : C.SLATE_DARK);
  if (selected) {
    scr.rect(x + 1, y + 1, w - 2, 1, C.SLATE);
    drawIcon(scr, 'bolt', x + 2, y + 3, C.YELLOW);
  }
  txt(scr, label, x + w / 2 + (selected ? 2 : 0), y + 3, selected ? C.YELLOW : C.BONE, {
    align: 'center',
  });
  game.buttons.push({ x, y, w, h, action });
}

function menuList(game, x, y, w, h, gap) {
  const items = game.menuItems();
  items.forEach((item, i) => {
    button(game, x, y + i * (h + gap), w, h, item.label, item.action, game.menuIndex === i);
  });
  return y + items.length * (h + gap);
}

// ---------------------------------------------------------------------------
export function drawTitle(game) {
  const scr = game.screen;
  const tx = scr.w / 2;

  // --- logo ---
  scr.rect(36, 6, 248, 44, C.VOID);
  scr.frame(35, 5, 250, 46, C.SLATE_DARK);
  scr.frame(34, 4, 252, 48, C.OUTLINE);
  drawText(scr, 'AMBOID', tx + 2, 14, C.OUTLINE, { scale: 5, align: 'center' });
  drawText(scr, 'AMBOID', tx + 1, 12, C.BLOOD_DARK, { scale: 5, align: 'center' });
  drawText(scr, 'AMBOID', tx, 10, C.WHITE, { scale: 5, align: 'center' });
  for (const [x, len] of [[92, 3], [148, 6], [206, 2], [228, 4]]) {
    scr.vline(x, 52, 52 + len, C.BLOOD_DARK);
    scr.set(x, 53 + len, C.BLOOD);
  }

  // --- podtytuł ---
  scr.rect(84, 56, 152, 14, C.SHADOW);
  scr.frame(83, 55, 154, 16, C.SLATE_DARK);
  txt(scr, 'PROJEKT Z', tx, 58, C.YELLOW, { scale: 2, align: 'center' });

  // --- warianty sprzętowe ---
  scr.rect(40, 74, 240, 22, C.SHADOW);
  scr.frame(39, 73, 242, 24, C.SLATE_DARK);
  txt(scr, `GRAFIKA: ${game.profile.longLabel}`, tx, 77, C.YELLOW, { align: 'center' });
  txt(scr, 'A1200  ·  RTG  ·  TRYB ZGODNOŚCI OCS', tx, 87, C.STEEL, { align: 'center' });

  // --- menu ---
  scr.rect(90, 100, 140, 77, C.SHADOW);
  scr.frame(89, 99, 142, 79, C.SLATE);
  scr.frame(91, 101, 138, 75, C.OUTLINE);
  menuList(game, 97, 106, 126, 12, 2);

  // --- stopka ---
  scr.rect(46, 177, 228, 11, C.SHADOW);
  scr.frame(45, 176, 230, 13, C.SLATE_DARK);
  txt(scr, 'STRZAŁKI + ENTER  ·  G ZMIENIA TRYB', tx, 179, C.BONE, { align: 'center' });
  scr.rect(287, 190, 30, 8, C.SHADOW);
  txt(scr, 'V0.2', 315, 191, C.SLATE, { align: 'right' });
}

// ---------------------------------------------------------------------------
export function drawHUD(game) {
  const scr = game.screen;
  const p = game.player;

  // --- status ---
  scr.panel(3, 3, 104, 44, { fill: C.SHADOW, border: C.SLATE, inner: C.OUTLINE });
  const stats = [
    ['heart', p.hp / p.maxHp, C.BLOOD],
    ['bolt', p.energy / 100, C.YELLOW],
    ['fork', p.hunger / 100, C.GRASS_LIGHT],
    ['drop', p.thirst / 100, C.BLUE],
  ];
  stats.forEach(([icon, pct, color], i) => {
    const y = 8 + i * 9;
    drawIcon(scr, icon, 7, y, i === 0 ? C.BLOOD : color);
    bar(scr, 16, y + 1, 87, 5, pct, color);
  });

  let sy = 50;
  if (p.bleeding) {
    const blink = Math.floor(game.t * 3) % 2 === 0;
    txt(scr, 'KRWAWIENIE', 4, sy, blink ? C.BLOOD : C.BLOOD_DARK);
    sy += 9;
  }
  if (p.infected) {
    txt(scr, `ZAKAŻENIE ${Math.floor(p.infection)}%`, 4, sy, C.BLOOD_BRIGHT);
    sy += 9;
  }
  if (p.hp < 30) txt(scr, 'CIĘŻKO RANNY', 4, sy, C.BLOOD);

  // --- zegar / pogoda / cel ---
  scr.panel(211, 3, 106, 34, { fill: C.SHADOW, border: C.SLATE, inner: C.OUTLINE });
  txt(scr, `DZIEŃ ${game.dayNumber()}`, 215, 7, C.BONE);
  txt(scr, game.clockString(), 313, 7, C.WHITE, { align: 'right' });
  const weatherIcon = game.weather === 'rain' ? 'rain' : game.weather === 'overcast' ? 'cloud' : 'sun';
  drawIcon(scr, weatherIcon, 215, 17, game.weather === 'rain' ? C.STEEL : game.weather === 'overcast' ? C.CONCRETE : C.YELLOW);
  txt(scr, game.weatherLabel(), 226, 17, game.weather === 'rain' ? C.STEEL : C.BONE);
  txt(scr, game.goalText(), 215, 26, C.YELLOW);

  // --- komunikaty (na ciemnym tle, u góry) ---
  const msgs = game.messages.filter((m) => m.t > 0).slice(-2);
  if (msgs.length) {
    let maxW = 0;
    for (const m of msgs) maxW = Math.max(maxW, textWidth(m.text));
    maxW = Math.min(maxW, 250);
    scr.rect(3, 40, maxW + 9, msgs.length * 9 + 3, C.SHADOW);
    scr.frame(3, 40, maxW + 9, msgs.length * 9 + 3, C.OUTLINE);
    msgs.forEach((m, i) => txt(scr, fit(m.text, maxW), 7, 42 + i * 9, m.color));
  }

  // --- pasek akcji ---
  if (p.action) {
    scr.panel(112, 56, 96, 16, { fill: C.SHADOW, border: C.SLATE, inner: C.OUTLINE });
    txt(scr, 'PRZESZUKUJĘ...', 160, 58, C.YELLOW, { align: 'center' });
    const pct = Math.min(1, p.action.t / p.action.dur);
    bar(scr, 116, 67, 88, 3, pct, C.GOLD);
  }

  // --- podpowiedź akcji ---
  if (!p.action) {
    const it = game.findInteraction();
    if (it && it.text) {
      const text = fit(it.text, 260);
      const w = Math.min(300, textWidth(text) + 12);
      const x = Math.floor((scr.w - w) / 2);
      scr.panel(x, 138, w, 13, { fill: C.SHADOW, border: C.SLATE_DARK, inner: C.OUTLINE });
      txt(scr, text, x + 6, 141, it.text.startsWith('E ') ? C.YELLOW : C.BONE);
    }
  }

  // --- wybrany przedmiot ---
  const item = game.selectedItem();
  const def = game.selectedDef();
  let label = 'PIĘŚCI';
  let right = '';
  let color = C.BONE;
  if (item && def) {
    label = def.name;
    color = def.type === 'weapon' ? C.YELLOW : C.BONE;
    if (def.type === 'weapon') {
      if (def.ranged) right = `AMMO ${game.countItem('ammo')}`;
      else right = `${item.dur == null ? def.durability : item.dur}/${def.durability}`;
    } else if (item.count > 1) {
      right = `x${item.count}`;
    }
  }
  scr.rect(3, 154, 314, 9, C.SHADOW);
  txt(scr, fit(label, 170), 5, 155, color);
  if (right) txt(scr, right, 312, 155, C.STEEL, { align: 'right' });
  if (item && def && (def.type === 'food' || def.type === 'drink' || def.type === 'heal' || item.id === 'flashlight' || def.type === 'book' || def.type === 'map' || def.type === 'gear')) {
    txt(scr, 'Q UŻYJ', 186, 155, C.GOLD, { align: 'right' });
  }

  // --- pasek ekwipunku ---
  const cap = game.capacity();
  const hx = 10;
  const hy = 166;
  for (let i = 0; i < cap; i++) {
    const x = hx + i * 20;
    const selected = i === game.selected;
    scr.rect(x, hy, 19, 19, selected ? C.SLATE_DARK : C.SHADOW);
    scr.frame(x, hy, 19, 19, selected ? C.YELLOW : i >= 10 ? C.WOOD_DARK : C.SLATE_DARK);
    const it = game.inventory[i];
    if (it) {
      const icon = game.art.icons[it.id] || game.art.icons.scrap;
      scr.blit(icon, x + 2, hy + 2, {});
      if (it.count > 1) txt(scr, String(it.count), x + 17, hy + 11, C.WHITE, { align: 'right' });
      const idata = ITEMS[it.id];
      if (idata && idata.type === 'weapon' && !idata.ranged) {
        const dur = it.dur == null ? idata.durability : it.dur;
        const pct = dur / idata.durability;
        const col = pct > 0.5 ? C.GRASS_LIGHT : pct > 0.2 ? C.YELLOW : C.BLOOD;
        scr.rect(x + 2, hy + 17, 15, 1, C.OUTLINE);
        scr.rect(x + 2, hy + 17, Math.max(1, Math.round(15 * pct)), 1, col);
      }
    }
  }
  txt(scr, 'H POMOC', 5, 191, C.SLATE);
  txt(scr, 'M MAPA', 66, 191, C.SLATE);
  txt(scr, 'E AKCJA', 126, 191, C.SLATE);
  txt(scr, game.profile.label, 196, 191, C.GOLD);
  txt(scr, 'SPACJA ATAK', 314, 191, C.SLATE, { align: 'right' });

  // --- uszkodzenia / niskie HP (czerwona ramka bez szumu) ---
  if (p.hurtT > 0 || p.hp < 30) {
    const strong = p.hurtT > 0;
    const t = strong ? 5 : 3;
    scr.rect(0, 0, scr.w, t, C.BLOOD_DARK);
    scr.rect(0, scr.h - t, scr.w, t, C.BLOOD_DARK);
    scr.rect(0, 0, t, scr.h, C.BLOOD_DARK);
    scr.rect(scr.w - t, 0, t, scr.h, C.BLOOD_DARK);
    if (strong) {
      scr.rect(0, 0, scr.w, 1, C.BLOOD);
      scr.rect(0, scr.h - 1, scr.w, 1, C.BLOOD);
      scr.rect(0, 0, 1, scr.h, C.BLOOD);
      scr.rect(scr.w - 1, 0, 1, scr.h, C.BLOOD);
    }
  }
}

// ---------------------------------------------------------------------------
export function drawPause(game) {
  const scr = game.screen;
  scr.shade(0, 0, scr.w, scr.h, C.OUTLINE, 0);
  scr.panel(80, 8, 160, 182, { fill: C.SHADOW, border: C.SLATE, inner: C.OUTLINE });
  drawText(scr, 'PAUZA', 160, 15, C.YELLOW, { scale: 2, align: 'center', shadow: C.OUTLINE });
  txt(scr, `DZIEŃ ${game.dayNumber()}  ${game.clockString()}`, 160, 34, C.BONE, { align: 'center' });
  txt(scr, game.profile.longLabel, 160, 44, C.STEEL, { align: 'center' });
  menuList(game, 92, 57, 136, 12, 2);
  txt(scr, `ZABÓJ: ${game.stats.kills}`, 88, 152, C.BONE);
  txt(scr, `ZIARNO: ${game.lastSeedLabel}`, 232, 152, C.SLATE, { align: 'right' });
  txt(scr, 'ESC WRÓĆ DO GRY  ·  G GRAFIKA', 160, 172, C.STEEL, { align: 'center' });
}

// ---------------------------------------------------------------------------
export function drawHelp(game) {
  const scr = game.screen;
  scr.shade(0, 0, scr.w, scr.h, C.OUTLINE, 0);
  scr.panel(6, 4, 308, 192, { fill: C.SHADOW, border: C.SLATE, inner: C.OUTLINE });
  txt(scr, 'STEROWANIE', 160, 10, C.YELLOW, { scale: 2, align: 'center' });
  scr.hline(14, 306, 30, C.SLATE_DARK);

  const left = [
    ['RUCH', 'W A S D / STRZAŁKI'],
    ['BIEG', 'SHIFT'],
    ['SKRADANIE', 'CTRL'],
    ['ATAK', 'SPACJA / LPM'],
    ['AKCJA / WEŹ', 'E'],
  ];
  const right = [
    ['UŻYJ', 'Q'],
    ['SLOTY', '1 - 0'],
    ['LATARKA', 'F'],
    ['MAPA', 'M'],
    ['PAUZA', 'ESC'],
    ['GRAFIKA', 'G'],
  ];
  left.forEach(([a, b], i) => {
    const y = 34 + i * 10;
    txt(scr, a, 14, y, C.BONE);
    txt(scr, b, 14 + 66, y, C.YELLOW);
  });
  right.forEach(([a, b], i) => {
    const y = 34 + i * 10;
    txt(scr, a, 164, y, C.BONE);
    txt(scr, b, 164 + 52, y, C.YELLOW);
  });
  scr.hline(14, 306, 96, C.SLATE_DARK);

  txt(scr, 'PRZETRWANIE', 14, 98, C.YELLOW);
  const tl = [
    'E OTWIERA DRZWI, MEBLE I PODNOSI ŁUPY.',
    'OKNO ZABIJESZ: MŁOTEK, DESKA, 2 GWOŹDZIE.',
    'HAŁAS ŚCIĄGA ZOMBIE. PISTOLET NAJGŁOŚNIEJSZY.',
    'ŚPIJ W ŁÓŻKU, GDY NIE MA ZOMBIE W POBLIŻU.',
    'JEDZ, PIJ, NOŚ BANDAŻE. TABLETKI LECZĄ.',
  ];
  tl.forEach((line, i) => txt(scr, fit(line, 292), 14, 106 + i * 9, C.BONE));

  scr.hline(14, 306, 152, C.SLATE_DARK);
  txt(scr, 'CEL: PRZETRWAJ DWIE DOBY (DO 08:00 DNIA 3)', 14, 156, C.YELLOW);
  txt(scr, `ZIARNO: ${game.lastSeedLabel} · TO SAMO ZIARNO = TO SAMO MIASTO`, 14, 166, C.SLATE);
  button(game, 128, 179, 64, 11, 'POWRÓT', 'back', false);
}

// ---------------------------------------------------------------------------
export function drawAbout(game) {
  const scr = game.screen;
  const prof = game.profile;
  scr.shade(0, 0, scr.w, scr.h, C.OUTLINE, 0);
  scr.panel(8, 6, 304, 188, { fill: C.SHADOW, border: C.SLATE, inner: C.OUTLINE });
  txt(scr, 'O PROJEKCIE', 160, 12, C.YELLOW, { scale: 2, align: 'center' });
  const paragraphs = [
    'AMBOID to fanowski hołd dla PROJECT ZOMBOID w realiach AMIGI: izometryczne miasteczko, zombie, głód i deski na oknach.',
    'Cel sprzętowy: rozbudowana A1200 (68030 + fast RAM, AGA 64 kolory) albo system z kartą RTG (chunky 8-bit, światło RGB).',
    'Jeden tileset, trzy profile: OCS 32, AGA 64, RTG. Grafika i dźwięk są proceduralne. Projekt nieoficjalny.',
  ];
  let y = 30;
  for (const para of paragraphs) {
    const lines = wrapText(para, 284);
    for (const line of lines) {
      txt(scr, line, 18, y, C.BONE);
      y += 9;
    }
    y += 3;
  }
  txt(scr, `PALETA ${prof.colors} KOLORÓW · ${prof.bitplanes} BITPLANÓW · ${prof.id.toUpperCase()}`, 160, 126, C.SLATE, { align: 'center' });
  const sw = prof.colors > 32 ? 4 : 6;
  const total = prof.colors * sw;
  for (let i = 0; i < prof.colors; i++) {
    scr.rect(160 - total / 2 + i * sw, 135, sw - 1, 9, i);
    scr.frame(160 - total / 2 + i * sw, 135, sw - 1, 9, C.OUTLINE);
  }
  txt(scr, prof.lighting ? 'RTG: ŚWIATŁO RGB LICZONE PER PIKSEL' : 'BEZ ŚWIATŁA RGB — TABELE PRZYGASZENIA', 160, 149, C.STEEL, { align: 'center' });
  txt(scr, 'G PRZEŁĄCZA TRYB GRAFIKI', 160, 157, C.SLATE, { align: 'center' });
  button(game, 130, 168, 60, 13, 'POWRÓT', 'back', false);
}

// ---------------------------------------------------------------------------
export function drawMap(game) {
  const scr = game.screen;
  scr.shade(0, 0, scr.w, scr.h, C.OUTLINE, 0);
  scr.panel(4, 4, 312, 192, { fill: C.SHADOW, border: C.SLATE, inner: C.OUTLINE });
  txt(scr, 'MAPA OKOLICY', 10, 9, C.YELLOW);
  txt(scr, `DZIEŃ ${game.dayNumber()}   ${game.clockString()}`, 200, 9, C.BONE, { align: 'center' });
  txt(scr, 'M / ESC', 312, 9, C.STEEL, { align: 'right' });

  const scale = 4;
  const ox = 64;
  const oy = 22;
  scr.rect(ox, oy, WORLD_W * scale, WORLD_H * scale, C.VOID);
  scr.frame(ox - 1, oy - 1, WORLD_W * scale + 2, WORLD_H * scale + 2, C.SLATE_DARK);

  const groundColors = {
    grass: C.GRASS_DARK,
    dirt: C.WOOD,
    asphalt: C.ASPHALT_DARK,
    sidewalk: C.CONCRETE_DARK,
    wood: C.WOOD_DARK,
    tile: C.CONCRETE_DARK,
    carpet: C.BLOOD_DARK,
    concrete: C.ASPHALT,
    gravel: C.ASPHALT_DARK,
    water: C.BLUE,
  };

  for (let y = 0; y < WORLD_H; y++) {
    for (let x = 0; x < WORLD_W; x++) {
      const i = game.world.idx(x, y);
      const t = game.world.tiles[i];
      const px = ox + x * scale;
      const py = oy + y * scale;
      const known = game.world.explored[i];
      if (!known) {
        // niezbadany teren: tylko zarys dróg i budynków
        const faintRoad = t.ground === 'asphalt' || t.ground === 'sidewalk';
        if (faintRoad) scr.rect(px, py, scale, scale, C.OUTLINE);
        else if (t.wall) scr.rect(px + 1, py + 1, 2, 2, C.SHADOW);
        continue;
      }
      scr.rect(px, py, scale, scale, groundColors[t.ground] || C.ASPHALT_DARK);
      if (t.wall) {
        scr.rect(px, py, scale, scale, t.wall.feature === 'window' ? C.STEEL : t.wall.feature === 'door' ? C.WOOD : C.SLATE);
      }
    }
  }
  // obiekty
  for (let y = 0; y < WORLD_H; y++) {
    for (let x = 0; x < WORLD_W; x++) {
      const i = game.world.idx(x, y);
      if (!game.world.explored[i]) continue;
      const t = game.world.tiles[i];
      if (!t.prop) continue;
      const px = ox + x * scale;
      const py = oy + y * scale;
      if (t.prop.kind === 'car') scr.rect(px + 1, py + 1, 2, 2, C.BLOOD);
      else if (t.prop.kind === 'tree') scr.set(px + 1, py + 1, C.GREEN_DARK);
    }
  }
  // gracz
  const blink = Math.floor(game.t * 2) % 2 === 0;
  if (blink) {
    const px = ox + game.player.x * scale;
    const py = oy + game.player.y * scale;
    scr.rect(px - 1, py - 1, scale + 2, scale + 2, C.OUTLINE);
    scr.rect(px, py, scale, scale, C.YELLOW);
  }
  txt(scr, `ZIARNO ${game.lastSeedLabel}`, 10, 185, C.SLATE);
  txt(scr, 'ŻÓŁTY = TY   CZERWONY = AUTO', 312, 185, C.SLATE, { align: 'right' });
}

// ---------------------------------------------------------------------------
function statsBlock(game, y, color = C.BONE) {
  const scr = game.screen;
  const p = game.player;
  const lines = [
    `CZAS PRZETRWANIA: ${game.survivalText()}`,
    `ZABITE ZOMBIE: ${game.stats.kills}`,
    `POZIOM WALKI: ${game.combatLevel()}`,
    `PRZECHODZONE: ${game.distanceKm().toFixed(2)} KM`,
    `ZNALEZIONE: ${game.stats.items}`,
    `ZIARNO: ${game.lastSeedLabel}`,
  ];
  lines.forEach((line, i) => txt(scr, line, 160, y + i * 10, color, { align: 'center' }));
}

export function drawDead(game) {
  const scr = game.screen;
  scr.shade(0, 0, scr.w, scr.h, C.OUTLINE, 0);
  scr.panel(64, 14, 192, 172, { fill: C.SHADOW, border: C.BLOOD_DARK, inner: C.OUTLINE });
  drawText(scr, 'NIE ŻYJESZ', 160, 26, C.BLOOD, { scale: 2, align: 'center', shadow: C.OUTLINE });
  txt(scr, 'PRZYCZYNA', 160, 48, C.SLATE, { align: 'center' });
  txt(scr, game.deathCause || 'RANY', 160, 57, C.BLOOD_BRIGHT, { align: 'center' });
  statsBlock(game, 72, C.BONE);
  menuList(game, 92, 136, 136, 13, 3);
}

export function drawWon(game) {
  const scr = game.screen;
  scr.shade(0, 0, scr.w, scr.h, C.OUTLINE, 0);
  scr.panel(64, 14, 192, 172, { fill: C.SHADOW, border: C.GOLD, inner: C.OUTLINE });
  drawText(scr, 'PRZETRWAŁEŚ!', 160, 24, C.YELLOW, { scale: 2, align: 'center', shadow: C.OUTLINE });
  txt(scr, 'DWIE DOBY W MIEŚCIE', 160, 45, C.BONE, { align: 'center' });
  txt(scr, 'RATUNEK NIE NADCHODZI... ALE TY TAK.', 160, 56, C.SLATE, { align: 'center' });
  statsBlock(game, 70, C.BONE);
  menuList(game, 92, 136, 136, 13, 3);
}

// ---------------------------------------------------------------------------
export function drawRain(game, force = false) {
  if (!force && game.weather !== 'rain') return;
  const scr = game.screen;
  const t = game.t;
  const n = force ? 55 : 60;
  for (let i = 0; i < n; i++) {
    const x = ((i * 53 + Math.floor(t * 60)) % 340) - 10;
    const y = ((i * 97 + Math.floor(t * 240)) % 240) - 20;
    const color = i % 5 === 0 ? C.BONE : i % 3 === 0 ? C.STEEL : C.SLATE;
    scr.line(x, y, x - 1, y + 3, color);
    if (i % 7 === 0) scr.line(x - 2, y + 5, x - 3, y + 7, color);
  }
}
