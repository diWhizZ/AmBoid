// Obsługa pada w standardzie Gamepad API.
//
// Pad jest tłumaczony na te same kody klawiszy, których używa gra, więc
// działa wszędzie: w grze, w pauzie, w menu, na mapie i w pomocy.
//
//   lewa gałka / D-pad  — ruch i nawigacja w menu
//   A / krzyżyk         — atak, zatwierdzenie
//   B / kółko           — interakcja (E)
//   X / kwadrat         — użyj przedmiotu (Q)
//   Y / trójkąt         — latarka (F)
//   LB / RB             — poprzedni / następny slot
//   LT / RT             — skradanie / bieg
//   Back / Select       — mapa (M)
//   Start               — pauza / powrót (Escape)

const BUTTON_CODES = {
  0: 'Space', // A — atak / zatwierdź
  1: 'KeyE', // B — interakcja
  2: 'KeyQ', // X — użyj
  3: 'KeyF', // Y — latarka
  8: 'KeyM', // Back — mapa
  9: 'Escape', // Start — pauza / powrót
};

const DPAD_CODES = {
  12: 'ArrowUp',
  13: 'ArrowDown',
  14: 'ArrowLeft',
  15: 'ArrowRight',
};

export const STICK_DEADZONE = 0.35;

export class GamepadInput {
  constructor() {
    this.pressed = new Set();
    this.lb = false;
    this.rb = false;
    this.connectedId = null;
  }

  // Zwraca true, jeśli w tej klatce znaleziono podłączony pad.
  poll(game, pads = []) {
    const pad = Array.from(pads || []).find((p) => p && p.connected);
    if (!pad) {
      this.releaseAll(game);
      this.connectedId = null;
      return false;
    }
    this.connectedId = pad.id || 'gamepad';
    const down = (i) => {
      const b = pad.buttons && pad.buttons[i];
      return !!b && (b.pressed || (b.value || 0) > 0.5);
    };

    const codes = new Set();
    // Kierunek w przestrzeni EKRANU: D-pad ma pierwszeństwo, potem gałka.
    let sx = (down(15) ? 1 : 0) - (down(14) ? 1 : 0);
    let sy = (down(13) ? 1 : 0) - (down(12) ? 1 : 0);
    const ax = (pad.axes && pad.axes[0]) || 0;
    const ay = (pad.axes && pad.axes[1]) || 0;
    if (!sx) sx = ax < -STICK_DEADZONE ? -1 : ax > STICK_DEADZONE ? 1 : 0;
    if (!sy) sy = ay < -STICK_DEADZONE ? -1 : ay > STICK_DEADZONE ? 1 : 0;

    if (game.mode === 'playing') {
      // W grze pad nie udaje klawiszy: omija schemat EKRAN/IZO i zawsze
      // porusza w stronę, w którą wskazuje gałka na ekranie.
      game.setPadVector(sx + sy, sy - sx);
    } else {
      game.setPadVector(0, 0);
      if (sy < 0) codes.add('ArrowUp');
      else if (sy > 0) codes.add('ArrowDown');
      if (sx < 0) codes.add('ArrowLeft');
      else if (sx > 0) codes.add('ArrowRight');
    }

    for (const i of Object.keys(BUTTON_CODES)) {
      if (down(Number(i))) codes.add(BUTTON_CODES[i]);
    }

    // LB/RB — wybór slotu (tylko gdy gramy; w menu nie ma to sensu)
    const lb = down(4);
    const rb = down(5);
    if (game.mode === 'playing' || game.mode === 'paused') {
      if (lb && !this.lb) game.cycleSlot(-1);
      if (rb && !this.rb) game.cycleSlot(1);
    }
    this.lb = lb;
    this.rb = rb;

    // LT/RT — trzymane modyfikatory ruchu
    if (down(6)) codes.add('ControlLeft');
    if (down(7)) codes.add('ShiftLeft');

    for (const code of codes) {
      if (!this.pressed.has(code)) game.keyDown(code);
    }
    for (const code of this.pressed) {
      if (!codes.has(code)) game.keyUp(code);
    }
    this.pressed = codes;
    return true;
  }

  releaseAll(game) {
    game.setPadVector(0, 0);
    if (!this.pressed.size) return;
    for (const code of this.pressed) game.keyUp(code);
    this.pressed.clear();
    this.lb = false;
    this.rb = false;
  }
}
