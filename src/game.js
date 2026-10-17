// Logika gry AMBOID.

import { World, WORLD_W, WORLD_H } from './world.js';
import { Camera, VIEW_W, VIEW_H, TILE_W, TILE_H } from './render.js';
import { drawText, textWidth, wrapText, LINE_H } from './font.js';
import { C } from './palette.js';
import { ITEMS, CONTAINER_NAMES } from './items.js';
import { makeRng, hash2 } from './rng.js';
import { getProfile, nextProfile } from './profiles.js';
import { renderWorld, renderEffects } from './scene.js';
import {
  drawHUD,
  drawTitle,
  drawHelp,
  drawAbout,
  drawPause,
  drawMap,
  drawDead,
  drawWon,
  drawRain,
} from './ui.js';

const START_TIME = 8 * 60; // 08:00
const MIN_PER_DAY = 1440;
const GAME_MIN_PER_SEC = 5;
// Cel: przetrwać dwie pełne doby — od 08:00 dnia 1 do 08:00 dnia 3 (48 h).
const WIN_AT = START_TIME + 2 * MIN_PER_DAY;

const MOVE_CODES = {
  KeyW: 'up',
  ArrowUp: 'up',
  KeyS: 'down',
  ArrowDown: 'down',
  KeyA: 'left',
  ArrowLeft: 'left',
  KeyD: 'right',
  ArrowRight: 'right',
};
// W trybie izometrycznym ekranowe „lewo" to na mapie (−x, +y), a „prawo" (+x, −y).
// Wcześniej lewo i prawo były zamienione — A szło w prawo, D w lewo.
const MOVES = {
  up: { dx: -1, dy: -1, dir: 1 },
  down: { dx: 1, dy: 1, dir: 0 },
  left: { dx: -1, dy: 1, dir: 2 },
  right: { dx: 1, dy: -1, dir: 3 },
};

const ACTIONS = ['Space', 'KeyE', 'KeyQ', 'KeyF', 'KeyM', 'KeyH', 'Escape', 'Enter'];

export class Game {
  constructor(screen, art, audio) {
    this.screen = screen;
    this.art = art;
    this.audio = audio;
    this.mode = 'menu';
    this.t = 0;
    this.buttons = [];
    this.menuIndex = 0;
    this.helpBg = 'menu';
    this.helpReturn = 'menu';
    this.keys = new Set();
    this.moveStack = [];
    this.lastSeedLabel = '------';
    this.world = null;
    this.menuWorld = null;
    this.player = null;
    this.messages = [];
    this.effects = [];
    this.stats = { kills: 0, shots: 0, steps: 0, items: 0 };
    this.weather = 'clear';
    this.weatherTimer = 90;
    this.hordeNight = -1;
    this.victoryShown = false;
    this.menuCam = new Camera(WORLD_W, WORLD_H);
    let savedProfile = null;
    try {
      if (typeof localStorage !== 'undefined') savedProfile = localStorage.getItem('amboid.gfx');
    } catch (e) {
      /* brak dostępu do localStorage */
    }
    this.profileId = getProfile(savedProfile || 'aga').id;
    this.profile = getProfile(this.profileId);
    if (this.screen) this.screen.setProfile(this.profile);
    this.createMenuWorld();
  }

  // -------------------------------------------------------------------------
  createMenuWorld() {
    this.menuWorld = new World(0x5ea50);
    this.menuWorld.explored.fill(1);
    this.menuWorld.visible.fill(1);
  }

  randomSeed() {
    if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
      const a = new Uint32Array(1);
      crypto.getRandomValues(a);
      return a[0] >>> 0;
    }
    return (Math.random() * 0xffffffff) >>> 0;
  }

  setProfile(id, silent = false) {
    const profile = getProfile(id);
    this.profileId = profile.id;
    this.profile = profile;
    if (this.screen) this.screen.setProfile(profile);
    this.updateFOV(true);
    try {
      if (typeof localStorage !== 'undefined') localStorage.setItem('amboid.gfx', profile.id);
    } catch (e) {
      /* brak dostępu do localStorage */
    }
    if (!silent && (this.mode === 'playing' || this.mode === 'paused')) {
      this.msg(`GRAFIKA: ${profile.longLabel}`, C.YELLOW);
    }
    return profile;
  }

  cycleProfile() {
    const profile = this.setProfile(nextProfile(this.profileId));
    this.audio.play('click');
    return profile;
  }

  // Mnożnik jasności dla trybu RTG (prawdziwe światło zamiast tablic palety).
  ambientFactor() {
    const amb = this.ambientDim();
    let f = amb === 0 ? 1 : amb === 1 ? 0.78 : 0.46;
    if (this.weather === 'overcast') f -= 0.05;
    if (this.weather === 'rain') f -= 0.09;
    return Math.max(0.3, Math.min(1, f));
  }

  // Barwa światła otoczenia: noc chłodzi obraz w stronę granatu.
  ambientTint() {
    const amb = this.ambientDim();
    if (amb === 0) return [1, 1, 1];
    if (amb === 1) return [0.92, 0.94, 1.04];
    return [0.74, 0.82, 1.12];
  }

  // Lista świateł RTG w pikselach ekranu (0..320 / 0..200).
  getLights() {
    if (!this.profile || !this.profile.lighting || !this.world || !this.player) return [];
    const lights = [];
    const amb = this.ambientDim();
    const cam = this.camera;
    const bounds = cam.visibleBounds(1);
    for (const lamp of this.world.lamps) {
      if (lamp.x < bounds.x0 - 5 || lamp.x > bounds.x1 + 5) continue;
      if (lamp.y < bounds.y0 - 5 || lamp.y > bounds.y1 + 5) continue;
      const [sx, sy] = cam.toScreen(lamp.x, lamp.y);
      const flicker = 0.94 + Math.sin(this.t * 5.1 + lamp.x * 1.7) * 0.06;
      const strength = amb > 0 ? 0.48 : 0.14;
      lights.push({
        sx: sx + 16,
        sy: sy - 4,
        r: 3.2 * 32,
        i: strength * flicker,
        color: [255, 168, 82],
      });
    }
    const p = this.player;
    const [px, py] = cam.toScreen(p.vx, p.vy);
    if (p.flashlightOn) {
      const radius = (this.currentFovRadius || 9) * 20;
      lights.push({
        sx: px + 16,
        sy: py - 4,
        r: radius,
        i: 0.5,
        color: [255, 240, 198],
      });
    } else if (amb > 0) {
      lights.push({ sx: px + 16, sy: py - 4, r: 2.2 * 32, i: 0.22, color: [170, 190, 255] });
    }
    for (const e of this.effects) {
      if (e.type === 'shot' && e.t < 0.1) {
        lights.push({ sx: px + 16, sy: py + 8, r: 5 * 32, i: 0.7, color: [255, 230, 170] });
      }
    }
    return lights;
  }

  startGame(seed) {
    this.audio.init();
    let s = seed;
    if (s == null) s = this.pendingSeed != null ? this.pendingSeed : this.randomSeed();
    this.pendingSeed = null;
    this.newGame(s);
  }

  newGame(seed) {
    this.seed = seed >>> 0;
    this.world = new World(this.seed);
    this.rng = makeRng(this.seed ^ 0x9e3779b9);
    this.lastSeedLabel = this.world.seedLabel;
    this.camera = new Camera(WORLD_W, WORLD_H);
    this.player = {
      x: this.world.start.x,
      y: this.world.start.y,
      vx: this.world.start.x,
      vy: this.world.start.y,
      fromX: 0,
      fromY: 0,
      toX: 0,
      toY: 0,
      moving: false,
      moveT: 0,
      moveDur: 0.24,
      dir: 0,
      frame: 0,
      hp: 100,
      maxHp: 100,
      energy: 100,
      hunger: 88,
      thirst: 82,
      infected: false,
      infection: 0,
      bleeding: false,
      backpack: false,
      flashlightOn: false,
      alive: true,
      attackCd: 0,
      action: null,
      hurtT: 0,
      xp: 0,
      sprinting: false,
      sneaking: false,
    };
    this.camera.follow(this.player.vx, this.player.vy);
    this.inventory = [
      { id: 'bandage', count: 1 },
      { id: 'water', count: 1 },
      { id: 'can', count: 1 },
    ];
    this.selected = 0;
    this.time = START_TIME;
    this.weather = 'clear';
    this.weatherTimer = 90;
    this.lastWeather = 'clear';
    this.hordeNight = -1;
    this.lastDay = 1;
    this.victoryShown = false;
    this.infectionStage = 0;
    this.messages = [];
    this.effects = [];
    this.stats = { kills: 0, shots: 0, steps: 0, items: 0 };
    this._fovSig = '';
    this.groanCd = 3;
    this.warn = { hunger: 0, thirst: 0, energy: 0, bleeding: 0, hp: 0 };
    this.bashMsgCd = 0;
    this.sleepFx = 0;
    this.keys.clear();
    this.moveStack = [];
    this.menuIndex = 0;
    this.facing = this.player.dir;
    this.updateFOV(true);
    this.mode = 'playing';
    this.audio.setRain(false);
    this.msg('CEL: PRZETRWAJ 2 DOBY', C.YELLOW);
    this.msg('E OTWIERA DRZWI / Q UŻYWA', C.BONE);
    this.msg('ZNALEŹ COŚ DO OBRONY', C.BONE);
  }

  toMenu() {
    this.mode = 'menu';
    this.menuIndex = 0;
    this.keys.clear();
    this.moveStack = [];
    this.audio.setRain(false);
  }

  // -------------------------------------------------------------------------
  update(dt) {
    dt = Math.max(0, Math.min(dt, 0.05));
    this.t += dt;
    if (this.mode === 'playing') this.updatePlaying(dt);
  }

  updatePlaying(dt) {
    const before = this.time;
    this.time += dt * GAME_MIN_PER_SEC;

    this.checkTimeEvents(before, this.time);
    this.updateWeather(dt);
    this.updateFOV();
    this.updatePlayer(dt);
    this.updateZombies(dt);
    this.updateStatus(dt);
    this.updateEffects(dt);
    this.updateMessages(dt);
    this.updateGroans(dt);
    this.bashMsgCd = Math.max(0, this.bashMsgCd - dt);
    this.player.hurtT = Math.max(0, this.player.hurtT - dt);
    this.syncRainAudio();

    if (this.player.hp <= 0 && this.player.alive) {
      this.die(this.lastDamageCause || 'RANY');
    }
    if (!this.victoryShown && this.time >= WIN_AT) this.triggerWin();
  }

  ambientDim() {
    const hour = (this.time % MIN_PER_DAY) / 60;
    if (hour < 5 || hour >= 22) return 2; // noc
    if (hour < 8 || hour >= 18) return 1; // świt / zmierzch
    return 0; // dzień
  }

  fovRadius() {
    const amb = this.ambientDim();
    let r = amb === 0 ? 13 : amb === 1 ? 11 : 9;
    if (this.player.flashlightOn && amb > 0) r += 3;
    if (this.weather === 'rain') r -= 1;
    return Math.max(5, r);
  }

  updateFOV(force = false) {
    if (!this.world || !this.player) return;
    const radius = this.fovRadius();
    const sig = `${this.ambientDim()}:${radius}`;
    if (!force && sig === this._fovSig) return;
    this._fovSig = sig;
    this.currentFovRadius = radius;
    this.world.computeFOV(this.player.x, this.player.y, radius);
  }

  // Poziom przyciemnienia kafla: 0 = jasno, 4 = czerń. Pamięć mapy = 3.
  tileDim(x, y, vis) {
    if (!vis) return 3; // pamięć mapy
    if (this.profile && this.profile.lighting) return 0; // RTG: światło liczone w RGB
    const amb = this.ambientDim();
    if (amb === 0) {
      // miękka winieta na skraju zasięgu wzroku
      const r = this.currentFovRadius || 13;
      const d = Math.hypot(x - this.player.x, y - this.player.y);
      if (d > r - 2.5) {
        const edge = (d - (r - 2.5)) / 2.5;
        const h = hash2(x, y, 7);
        if (h < edge) return h < edge * 0.5 ? 2 : 1;
      }
      return 0;
    }
    let boost = 0;
    const lamp = this.world.lampLight[this.world.idx(x, y)];
    if (lamp) boost = Math.max(boost, lamp);
    if (this.player && this.player.flashlightOn) {
      const d = Math.hypot(x - this.player.x, y - this.player.y);
      boost = Math.max(boost, d <= 2.5 ? 3 : d <= 4.5 ? 2 : d <= 6.5 ? 1 : 0);
    }
    return Math.max(0, Math.min(4, amb - boost));
  }

  playerInside() {
    const t = this.world && this.world.tile(this.player.x, this.player.y);
    return !!(t && t.inside >= 0);
  }

  syncRainAudio() {
    if (!this.audio || !this.world) return;
    const should = this.weather === 'rain' && !this.playerInside();
    if (should !== this._rainAudio) {
      this._rainAudio = should;
      this.audio.setRain(should);
    }
  }

  // -------------------------------------------------------------------------
  updatePlayer(dt) {
    const p = this.player;
    p.attackCd = Math.max(0, p.attackCd - dt);

    if (p.action) {
      p.action.t += dt;
      if (this.getMoveVector()) {
        p.action = null;
      } else if (p.action.t >= p.action.dur) {
        const act = p.action;
        p.action = null;
        this.finishSearch(act);
      }
    }

    if (p.moving) {
      p.moveT += dt;
      const k = Math.min(1, p.moveT / p.moveDur);
      // złagodzenie startu i stopu kroku — pojedyncze naciśnięcie nie wygląda
      // jak teleport o cały kafel
      const e = k * k * (3 - 2 * k);
      p.vx = p.fromX + (p.toX - p.fromX) * e;
      p.vy = p.fromY + (p.toY - p.fromY) * e;
      if (k >= 1) {
        p.x = p.toX;
        p.y = p.toY;
        p.vx = p.x;
        p.vy = p.y;
        p.moving = false;
        this.stats.steps++;
        this.updateFOV(true);
        this.onPlayerArrive();
      }
      this.camera.follow(p.vx, p.vy);
      return;
    }

    this.camera.follow(p.vx, p.vy);

    if (p.action) return;
    const dir = this.getMoveVector();
    if (!dir) return;
    const nx = p.x + dir.dx;
    const ny = p.y + dir.dy;
    if (!this.world.isWalkable(nx, ny)) {
      this.bump();
      return;
    }
    if (this.zombiesAt(nx, ny)) {
      return;
    }
    p.fromX = p.x;
    p.fromY = p.y;
    p.toX = nx;
    p.toY = ny;
    p.dir = dir.dir;
    p.moving = true;
    p.moveT = 0;
    const cost = this.world.moveCost(nx, ny);
    const sneak = this.keys.has('ControlLeft') || this.keys.has('ControlRight');
    const sprint = (this.keys.has('ShiftLeft') || this.keys.has('ShiftRight')) && p.energy > 4 && !sneak;
    p.sneaking = sneak;
    p.sprinting = sprint && !sneak;
    const base = sprint ? 0.15 : sneak ? 0.4 : 0.22;
    p.moveDur = base * cost;
  }

  onPlayerArrive() {
    const p = this.player;
    const t = this.world.tile(p.x, p.y);
    // wejście do budynku / na zewnątrz
    this.syncRainAudio();
    // dźwięk kroku
    if (p.sneaking) this.audio.play('sneak');
    else this.audio.play('step');
    if (t && t.wall && (t.wall.feature === 'window' || t.wall.feature === 'windowBroken')) {
      this.audio.play('bump');
    }
    // hałas
    const radius = p.sprinting ? 6 : p.sneaking ? 1.2 : 3.2;
    this.emitNoise(p.x, p.y, radius);
    // wejście do wody? (nie ma wody na mapie)
  }

  bump() {
    if (this._bumpCd && this._bumpCd > this.t) return;
    this._bumpCd = this.t + 0.6;
    this.audio.play('bump');
  }

  // 8 kierunków: pojedynczy klawisz idzie po skosie ekranu,
  // dwa sąsiednie klawisze dają ruch po osi mapy.
  getMoveVector() {
    const dirs = new Set();
    for (const code of this.moveStack) {
      if (this.keys.has(code) && MOVE_CODES[code]) dirs.add(MOVE_CODES[code]);
    }
    if (!dirs.size) return null;
    let dx = 0;
    let dy = 0;
    for (const d of dirs) {
      dx += MOVES[d].dx;
      dy += MOVES[d].dy;
    }
    dx = Math.sign(dx);
    dy = Math.sign(dy);
    if (dx === 0 && dy === 0) return null;
    return { dx, dy, dir: this.facingFromDelta(dx, dy) };
  }

  zombiesAt(x, y) {
    return this.world.zombies.some((z) => z.alive && z.x === x && z.y === y);
  }

  // -------------------------------------------------------------------------
  updateZombies(dt) {
    const zombies = this.world.zombies;
    for (const z of zombies) {
      if (!z.alive) continue;
      this.updateZombie(z, dt);
    }
    if (zombies.some((z) => !z.alive)) {
      this.world.zombies = zombies.filter((z) => z.alive);
    }
  }

  zombieSightRange() {
    const amb = this.ambientDim();
    let range = amb >= 2 ? 5 : amb === 1 ? 7 : 8;
    if (this.player.flashlightOn && amb > 0) range += 3;
    if (this.weather === 'rain') range -= 2;
    if (this.player.sprinting) range += 1;
    if (this.player.sneaking) range -= 1;
    return Math.max(2, range);
  }

  updateZombie(z, dt) {
    z.flash = Math.max(0, (z.flash || 0) - dt);
    z.stun = Math.max(0, (z.stun || 0) - dt);
    z.attackCd = Math.max(0, (z.attackCd || 0) - dt);
    z.bashCd = Math.max(0, (z.bashCd || 0) - dt);
    if (z.stun > 0) return;

    if (z.moving) {
      z.moveT += dt;
      const k = Math.min(1, z.moveT / z.moveDur);
      z.vx = z.fromX + (z.toX - z.fromX) * k;
      z.vy = z.fromY + (z.toY - z.fromY) * k;
      z.walkPhase = (z.walkPhase || 0) + dt * 6;
      if (k >= 1) {
        z.x = z.toX;
        z.y = z.toY;
        z.vx = z.x;
        z.vy = z.y;
        z.moving = false;
        z.decideTimer = z.state === 'chase' ? 0.08 : this.rng.float(0.3, 1.4);
      }
      return;
    }

    if (z.investigateTimer > 0) z.investigateTimer -= dt;
    if (z.state === 'investigate' && z.investigateTimer <= 0) {
      z.state = 'wander';
      z.target = null;
    }
    if (z.state === 'chase' && z.chaseTimer > 0) z.chaseTimer -= dt;
    if (z.state === 'chase' && z.chaseTimer <= 0) {
      z.state = 'investigate';
      z.investigateTimer = 7;
      z.target = z.lastSeen ? { x: z.lastSeen.x, y: z.lastSeen.y } : null;
    }

    z.decideTimer = (z.decideTimer || 0) - dt;
    if (z.decideTimer > 0) return;
    z.decideTimer = 0.25 + this.rng.next() * 0.25;

    const p = this.player;
    const dist = Math.hypot(p.x - z.x, p.y - z.y);
    const canSee =
      dist <= this.zombieSightRange() && this.world.lineOfSight(z.x, z.y, p.x, p.y);
    if (canSee) {
      z.state = 'chase';
      z.chaseTimer = 4;
      z.lastSeen = { x: p.x, y: p.y };
      z.target = { x: p.x, y: p.y };
    }

    // atak na gracza, jeśli blisko
    if (dist <= 1.55 && z.attackCd <= 0) {
      this.zombieAttack(z);
      return;
    }

    let target = null;
    if (z.state === 'chase') {
      target = { x: p.x, y: p.y };
    } else if (z.state === 'investigate' && z.target) {
      target = z.target;
      if (Math.hypot(z.x - target.x, z.y - target.y) < 0.8) {
        z.state = 'wander';
        target = null;
      }
    }

    if (!target) {
      // włóczęga — czasem losowy krok
      if (this.rng.chance(0.55)) {
        const dirs = [
          [1, 0], [-1, 0], [0, 1], [0, -1],
          [1, 1], [1, -1], [-1, 1], [-1, -1],
        ];
        const d = dirs[this.rng.int(0, dirs.length - 1)];
        const nx = z.x + d[0];
        const ny = z.y + d[1];
        if (this.canZombieStep(z, nx, ny, d)) this.startZombieMove(z, nx, ny, false);
      }
      return;
    }

    this.zombieStepToward(z, target);
  }

  canZombieStep(z, nx, ny, dir = null) {
    if (!this.world.inBounds(nx, ny)) return false;
    if (nx === this.player.x && ny === this.player.y) return false;
    if (!this.world.isWalkable(nx, ny)) return false;
    if (dir && dir[0] !== 0 && dir[1] !== 0) {
      if (!this.world.isWalkable(z.x + dir[0], z.y) || !this.world.isWalkable(z.x, z.y + dir[1])) {
        return false;
      }
    }
    return true;
  }

  zombieStepToward(z, target) {
    const dirs = [
      [1, 0], [-1, 0], [0, 1], [0, -1],
      [1, 1], [1, -1], [-1, 1], [-1, -1],
    ];
    const scored = dirs
      .map((d) => {
        const nx = z.x + d[0];
        const ny = z.y + d[1];
        const dx = nx - target.x;
        const dy = ny - target.y;
        return { d, nx, ny, score: dx * dx + dy * dy + this.rng.next() * 0.4 };
      })
      .sort((a, b) => a.score - b.score);

    for (const s of scored) {
      if (s.nx === this.player.x && s.ny === this.player.y) continue;
      if (!this.world.inBounds(s.nx, s.ny)) continue;
      const t = this.world.tile(s.nx, s.ny);
      if (t.wall) {
        const closeToPlayer = Math.hypot(this.player.x - s.nx, this.player.y - s.ny) < 7;
        const closedDoor = t.wall.feature === 'door' && !t.wall.open && !t.wall.destroyed;
        const barricadedWindow =
          (t.wall.feature === 'window' || t.wall.feature === 'windowBroken') && t.wall.barricade > 0;
        if (closeToPlayer && z.bashCd <= 0 && (closedDoor || barricadedWindow)) {
          this.zombieBash(z, s.nx, s.ny);
          return;
        }
        continue;
      }
      if (!this.canZombieStep(z, s.nx, s.ny, s.d)) continue;
      this.startZombieMove(z, s.nx, s.ny, z.state === 'chase');
      return;
    }
    z.decideTimer = this.rng.float(0.5, 1.5);
  }

  zombieBash(z, x, y) {
    z.bashCd = 1.15;
    const t = this.world.tile(x, y);
    if (!t || !t.wall) return;
    if (t.wall.feature === 'door') {
      const broke = this.world.damageDoor(x, y, 11 + this.rng.int(0, 4));
      this.audio.play('bump');
      this.emitNoise(x, y, 6);
      if (broke) {
        this.msg('DRZWI ZOSTAŁY WYŁAMANE!', C.BLOOD);
        this.updateFOV(true);
      } else if (this.bashMsgCd <= 0) {
        this.msg('COŚ UDERZA W DRZWI...', C.BLOOD_DARK);
        this.bashMsgCd = 3;
      }
    } else {
      const res = this.world.damageBarricade(x, y, 9 + this.rng.int(0, 4));
      if (res) {
        this.audio.play('barricade');
        this.emitNoise(x, y, 7);
        if (res === 'broken') {
          this.msg('DESKI PUSZCZAJĄ — OKNO OTWARTE!', C.BLOOD);
          this.updateFOV(true);
        } else if (res === 'level' || (this.bashMsgCd <= 0 && res === 'hit')) {
          this.msg('ZOMBIE RYWALUJE DESKI...', C.BLOOD_DARK);
          this.bashMsgCd = 3;
        }
      }
    }
  }

  startZombieMove(z, nx, ny, chase) {
    z.fromX = z.x;
    z.fromY = z.y;
    z.toX = nx;
    z.toY = ny;
    z.moving = true;
    z.moveT = 0;
    z.moveDur = chase ? 0.52 : 1.05;
    z.dir = this.facingFromDelta(nx - z.x, ny - z.y);
  }

  facingFromDelta(dx, dy) {
    const sx = dx - dy;
    const sy = dx + dy;
    if (Math.abs(sy) >= Math.abs(sx)) return sy > 0 ? 0 : 1;
    return sx > 0 ? 3 : 2;
  }

  zombieAttack(z) {
    z.attackCd = 1.15 + this.rng.next() * 0.35;
    const roll = this.rng.next();
    if (roll < 0.12) {
      return;
    }
    let dmg = 0;
    let kind = '';
    let infection = 0;
    let bleeding = 0;
    if (roll < 0.52) {
      dmg = 5 + this.rng.int(0, 4);
      kind = 'DRAPNIĘCIE';
      infection = 0.05;
      bleeding = 0.12;
    } else if (roll < 0.82) {
      dmg = 9 + this.rng.int(0, 6);
      kind = 'UGRYZIENIE';
      infection = 0.3;
      bleeding = 0.4;
    } else {
      dmg = 2 + this.rng.int(0, 2);
      kind = 'POPCHNIĘCIE';
      this.player.energy = Math.max(0, this.player.energy - 3);
    }
    this.damagePlayer(dmg, kind, { infection, bleeding });
    this.msg(`ZOMBIE: ${kind} (-${dmg})`, C.BLOOD);
    if (this.player.action) this.player.action = null;
  }

  damagePlayer(dmg, cause, opts = {}) {
    const p = this.player;
    if (!p.alive) return;
    p.hp = Math.max(0, p.hp - dmg);
    p.hurtT = 0.28;
    this.lastDamageCause = cause;
    this.audio.play('hurtplayer');
    if (opts.bleeding && this.rng.chance(opts.bleeding) && !p.bleeding) {
      p.bleeding = true;
      this.msg('KRWAWISZ! UŻYJ BANDAŻU (Q)', C.BLOOD);
    }
    if (opts.infection && !p.infected && this.rng.chance(opts.infection)) {
      p.infected = true;
      p.infection = 1;
      this.msg('PIEKĄCY BÓL... MOŻLIWE ZAKAŻENIE', C.BLOOD);
    }
    if (p.hp <= 0) this.die(cause);
  }

  die(cause) {
    if (this.mode === 'dead' || this.mode === 'won') return;
    const p = this.player;
    p.alive = false;
    p.hp = 0;
    this.deathCause = cause;
    this.mode = 'dead';
    this.menuIndex = 0;
    this.keys.clear();
    this.moveStack = [];
    this.audio.play('death');
    this.audio.setRain(false);
  }

  triggerWin() {
    this.victoryShown = true;
    this.mode = 'won';
    this.menuIndex = 0;
    this.keys.clear();
    this.moveStack = [];
    this.audio.play('win');
    this.audio.setRain(false);
  }

  // -------------------------------------------------------------------------
  emitNoise(x, y, radius) {
    if (!this.world || radius <= 0) return;
    for (const z of this.world.zombies) {
      if (!z.alive) continue;
      if (z.state === 'chase') continue;
      const d = Math.hypot(z.x - x, z.y - y);
      if (d <= radius) {
        z.state = 'investigate';
        z.target = { x, y };
        z.investigateTimer = 8;
        z.decideTimer = Math.min(z.decideTimer || 0.2, 0.3);
      }
    }
  }

  updateGroans(dt) {
    this.groanCd -= dt;
    if (this.groanCd > 0) return;
    this.groanCd = 2.2 + this.rng.next() * 3.5;
    let nearest = null;
    let best = Infinity;
    for (const z of this.world.zombies) {
      if (!z.alive) continue;
      const d = Math.hypot(z.x - this.player.x, z.y - this.player.y);
      if (d < best) {
        best = d;
        nearest = z;
      }
    }
    if (nearest && best < 11 && this.rng.chance(0.65)) {
      this.audio.play('groan', { vol: Math.max(0.03, 0.17 * (1 - best / 11)) });
    }
  }

  // -------------------------------------------------------------------------
  updateStatus(dt) {
    const p = this.player;
    const dayFrac = dt / (MIN_PER_DAY / GAME_MIN_PER_SEC);
    p.hunger = Math.max(0, p.hunger - dayFrac * 24);
    p.thirst = Math.max(0, p.thirst - dayFrac * 36);

    let energyDrain = 0.015;
    if (p.moving) {
      if (p.sprinting) energyDrain = 2.4;
      else if (p.sneaking) energyDrain = 0.02;
      else energyDrain = 0.09;
    } else {
      energyDrain = -0.06;
    }
    p.energy = Math.max(0, Math.min(100, p.energy - energyDrain * dt));

    if (p.infected) {
      p.infection = Math.min(100, p.infection + dt * (100 / 432));
      const stages = [
        [20, 'CZUJESZ SIĘ GORĄCO...'],
        [45, 'GORĄCZKA NARASTA. RĘCE DRŻĄ.'],
        [70, 'ZAKAŻENIE JEST SILNE...'],
        [92, 'NIE MASZ WIELE CZASU...'],
      ];
      while (this.infectionStage < stages.length && p.infection >= stages[this.infectionStage][0]) {
        this.msg(stages[this.infectionStage][1], C.BLOOD);
        this.infectionStage++;
      }
    }

    let cause = this.lastDamageCause;
    p.hp = Math.max(0, p.hp);
    if (p.bleeding) {
      p.hp -= 0.35 * dt;
      cause = 'WYKRWAWIENIE';
      this.warn.bleeding -= dt;
      if (this.warn.bleeding <= 0) {
        this.msg('KRWAWISZ — ZAŁÓŻ BANDAŻ (Q)', C.BLOOD);
        this.warn.bleeding = 22;
      }
    }
    if (p.hunger <= 0) {
      p.hp -= 0.12 * dt;
      cause = 'GŁÓD';
    }
    if (p.thirst <= 0) {
      p.hp -= 0.18 * dt;
      cause = 'PRAGNIENIE';
    }
    if (p.infected && p.infection >= 100) {
      p.hp = 0;
      cause = 'ZAKAŻENIE';
    }
    if (p.hunger > 55 && p.thirst > 55 && !p.bleeding && !p.infected && p.hp < p.maxHp) {
      p.hp = Math.min(p.maxHp, p.hp + 0.035 * dt);
    }
    p.hp = Math.max(0, p.hp);
    this.lastDamageCause = cause;

    const pct = p.hp / p.maxHp;
    this.warn.hp -= dt;
    if (pct < 0.28 && this.warn.hp <= 0) {
      this.msg('JESTEŚ CIĘŻKO RANNY!', C.BLOOD);
      this.warn.hp = 20;
    }

    for (const [key, cond, text] of [
      ['hunger', p.hunger < 20, 'JESTEŚ GŁODNY. ZNAJDŹ JEDZENIE.'],
      ['thirst', p.thirst < 20, 'CHCE CI SIĘ PIĆ.'],
      ['energy', p.energy < 15, 'JESTEŚ WYCZERPANY. PRZEŚPIJ SIĘ.'],
    ]) {
      this.warn[key] -= dt;
      if (cond && this.warn[key] <= 0) {
        this.msg(text, C.YELLOW);
        this.warn[key] = 30;
      }
    }

    if (p.hp <= 0 && p.alive) this.die(cause || 'RANY');
  }

  // -------------------------------------------------------------------------
  updateWeather(dt) {
    this.weatherTimer -= dt;
    if (this.weatherTimer > 0) return;
    this.weatherTimer = 55 + this.rng.next() * 90;
    const roll = this.rng.next();
    let next;
    if (this.weather === 'rain') next = roll < 0.6 ? 'overcast' : 'clear';
    else if (roll < 0.55) next = 'clear';
    else if (roll < 0.82) next = 'overcast';
    else next = 'rain';
    if (next !== this.weather) {
      this.weather = next;
      if (next === 'rain') this.msg('ZACZYNA PADAĆ...', C.STEEL);
      else if (next === 'clear') this.msg('PRZEJAŚNIA SIĘ.', C.BONE);
      else this.msg('NIEBO SIĘ ZACHMURZA.', C.STEEL);
      this.updateFOV(true);
    }
  }

  checkTimeEvents(before, after) {
    // nowy dzień
    const dayBefore = Math.floor(before / MIN_PER_DAY);
    const dayAfter = Math.floor(after / MIN_PER_DAY);
    if (dayAfter > dayBefore) {
      this.lastDay = dayAfter + 1;
      this.msg(`DZIEŃ ${this.lastDay}`, C.YELLOW);
    }
    // nocna horda o 21:00
    const n0 = Math.floor(before / MIN_PER_DAY) - 1;
    const n1 = Math.floor(after / MIN_PER_DAY) + 1;
    for (let n = n0; n <= n1; n++) {
      const hordeTime = n * MIN_PER_DAY + 21 * 60;
      if (before < hordeTime && after >= hordeTime && this.hordeNight !== n) {
        this.hordeNight = n;
        this.triggerHorde(n + 1);
      }
    }
    if (!this.victoryShown && after >= WIN_AT) this.triggerWin();
  }

  triggerHorde(dayNumber) {
    const count = 8 + dayNumber * 3;
    let spawned = 0;
    let attempts = 0;
    while (spawned < count && attempts < 500) {
      attempts++;
      const x = this.rng.int(0, WORLD_W - 1);
      const y = this.rng.int(0, WORLD_H - 1);
      if (!this.world.isWalkable(x, y)) continue;
      if (Math.hypot(x - this.player.x, y - this.player.y) < 14) continue;
      const edge = x < 3 || y < 3 || x > WORLD_W - 4 || y > WORLD_H - 4;
      if (!edge) continue;
      const z = this.world.addZombie(x, y, this.rng);
      z.state = 'investigate';
      z.target = { x: this.player.x + this.rng.int(-3, 3), y: this.player.y + this.rng.int(-3, 3) };
      z.investigateTimer = 40;
      z.decideTimer = this.rng.float(0, 1.5);
      spawned++;
    }
    this.msg('NOC. W MROKU SŁYCHAĆ JĘKI...', C.BLOOD);
    this.msg('ZOMBIE ZBLIŻAJĄ SIĘ DO MIASTA', C.BLOOD_DARK);
    this.audio.play('groan', { vol: 0.18 });
  }

  // -------------------------------------------------------------------------
  updateEffects(dt) {
    for (const e of this.effects) e.t += dt;
    this.effects = this.effects.filter((e) => e.t < e.dur);
  }

  updateMessages(dt) {
    for (const m of this.messages) m.t -= dt;
    this.messages = this.messages.filter((m) => m.t > 0).slice(-6);
  }

  msg(text, color = C.WHITE) {
    const last = this.messages[this.messages.length - 1];
    if (last && last.text === text) {
      last.t = 6;
      return;
    }
    this.messages.push({ text, color, t: 6 });
    if (this.messages.length > 6) this.messages.shift();
  }

  // -------------------------------------------------------------------------
  updateHover() {}

  findAttackTarget(range, requireLOS = true) {
    const p = this.player;
    let best = null;
    let bestD = Infinity;
    for (const z of this.world.zombies) {
      if (!z.alive) continue;
      const d = Math.hypot(z.x - p.x, z.y - p.y);
      if (d > range || d >= bestD) continue;
      if (requireLOS && !this.world.lineOfSight(p.x, p.y, z.x, z.y)) continue;
      best = z;
      bestD = d;
    }
    return best;
  }

  selectedItem() {
    return this.inventory[this.selected] || null;
  }

  selectedDef() {
    const it = this.selectedItem();
    return it ? ITEMS[it.id] : null;
  }

  hasItem(id) {
    return this.inventory.some((it) => it.id === id && it.count > 0);
  }

  countItem(id) {
    return this.inventory.filter((it) => it.id === id).reduce((a, it) => a + it.count, 0);
  }

  consumeItem(id, n = 1) {
    let left = n;
    for (let i = this.inventory.length - 1; i >= 0 && left > 0; i--) {
      const it = this.inventory[i];
      if (it.id !== id) continue;
      const take = Math.min(it.count, left);
      it.count -= take;
      left -= take;
      if (it.count <= 0) {
        this.inventory.splice(i, 1);
        if (i < this.selected) this.selected--;
        else if (i === this.selected) this.selected = Math.max(0, Math.min(this.selected, this.capacity() - 1));
      }
    }
    return left === 0;
  }

  capacity() {
    return 10 + (this.player && this.player.backpack ? 5 : 0);
  }

  addItem(item) {
    const def = ITEMS[item.id];
    if (!def) return false;
    if (def.stack) {
      let absorb = 0;
      for (const it of this.inventory) {
        if (it.id === item.id) absorb += Math.max(0, def.stack - it.count);
      }
      const needNew = item.count - absorb > 0;
      if (needNew && this.inventory.length >= this.capacity()) return false;
      let remaining = item.count;
      for (const it of this.inventory) {
        if (it.id !== item.id || remaining <= 0) continue;
        const space = def.stack - it.count;
        const move = Math.min(space, remaining);
        it.count += move;
        remaining -= move;
      }
      if (remaining > 0) this.inventory.push({ ...item, count: remaining });
      return true;
    }
    if (this.inventory.length >= this.capacity()) return false;
    this.inventory.push({ ...item });
    return true;
  }

  itemLabel(item) {
    if (!item) return '';
    const def = ITEMS[item.id];
    let out = def ? def.name : item.id;
    if (item.count > 1) out += ` x${item.count}`;
    return out;
  }

  // -------------------------------------------------------------------------
  tryAttack() {
    if (this.mode !== 'playing' || !this.player.alive) return;
    const p = this.player;
    if (p.attackCd > 0) return;
    if (p.action) p.action = null;
    const item = this.selectedItem();
    const def = item ? ITEMS[item.id] : null;
    if (def && def.type === 'weapon' && def.ranged) {
      this.fireGun(item);
      return;
    }
    const weapon = def && def.type === 'weapon' ? item : null;
    const wdef = weapon ? ITEMS[weapon.id] : null;
    const dmgBase = wdef ? wdef.damage : 6;
    const range = wdef ? wdef.range : 1.4;
    const cd = wdef ? wdef.cooldown : 0.5;
    p.attackCd = cd;
    const target = this.findAttackTarget(range, true);
    if (target) p.dir = this.facingFromDelta(target.x - p.x, target.y - p.y);
    this.effects.push({ type: 'swing', dir: p.dir, t: 0, dur: 0.18 });
    this.audio.play('swing');
    this.emitNoise(p.x, p.y, wdef ? wdef.noise : 0.8);
    if (target) {
      this.hitZombie(target, dmgBase, weapon);
    }
    if (weapon) {
      weapon.dur = (weapon.dur == null ? ITEMS[weapon.id].durability : weapon.dur) - 1;
      if (weapon.dur <= 0) {
        this.msg('BROŃ SIĘ ZEPSUŁA!', C.BLOOD);
        this.audio.play('error');
        this.inventory.splice(this.selected, 1);
        this.selected = Math.max(0, Math.min(this.selected, this.capacity() - 1));
      }
    }
  }

  fireGun(item) {
    const p = this.player;
    const def = ITEMS[item.id];
    if (!this.hasItem('ammo')) {
      this.msg('BRAK AMUNICJI!', C.BLOOD);
      this.audio.play('error');
      return;
    }
    this.consumeItem('ammo', 1);
    p.attackCd = def.cooldown;
    this.stats.shots++;
    this.audio.play('gun');
    this.emitNoise(p.x, p.y, def.noise);
    const target = this.findAttackTarget(def.range, true);
    let toX = p.x;
    let toY = p.y;
    if (target) {
      toX = target.x;
      toY = target.y;
      p.dir = this.facingFromDelta(target.x - p.x, target.y - p.y);
    } else {
      const dirs = [
        [0, 1], [-1, 0], [1, 0], [0, -1],
        [1, 1], [1, -1], [-1, 1], [-1, -1],
      ];
      const byDir = { 0: [1, 1], 1: [-1, -1], 2: [1, -1], 3: [-1, 1] };
      const d = byDir[p.dir] || [1, 1];
      toX = p.x + d[0] * 5;
      toY = p.y + d[1] * 5;
    }
    this.effects.push({
      type: 'shot',
      x: p.x,
      y: p.y,
      toX,
      toY,
      t: 0,
      dur: 0.13,
    });
    if (target) this.hitZombie(target, def.damage, null, true);
  }

  hitZombie(z, base, weapon, ranged = false) {
    const crit = this.rng.chance(0.12);
    const levelBonus = Math.floor(this.player.xp || 0) / 12;
    let damage = base + Math.floor(levelBonus) * 2;
    if (crit) damage = Math.round(damage * 1.9);
    z.hp -= damage;
    z.flash = 0.12;
    z.stun = 0.35;
    this.player.xp = (this.player.xp || 0) + 2;
    this.audio.play('hit');
    this.effects.push({ type: 'blood', x: z.x, y: z.y, t: 0, dur: 0.45 });
    const t = this.world.tile(z.x, z.y);
    if (t && !t.decal && this.rng.chance(0.5)) {
      t.decal = { kind: 'blood', v: this.rng.int(0, 3) };
    }
    if (z.hp <= 0) this.killZombie(z);
  }

  killZombie(z) {
    z.alive = false;
    this.stats.kills++;
    this.player.xp = (this.player.xp || 0) + 4;
    this.audio.play('hit');
    const t = this.world.tile(z.x, z.y);
    if (t) t.decal = { kind: 'blood', v: this.rng.int(0, 3) };
    const existing = this.world.tile(z.x, z.y).prop;
    if (!existing) {
      const corpse = this.world.addProp(z.x, z.y, 'corpse', null, { silent: true });
      if (corpse) {
        corpse.variant = z.variant % 3;
        corpse.container.loot.push({ id: 'ammo', count: this.rng.int(1, 4) });
      }
    } else {
      this.world.dropItem(z.x, z.y, this.rng.pick(['bandage', 'ammo', 'scrap', 'can']));
    }
    if (this.stats.kills % 10 === 0) {
      this.msg(`${this.stats.kills} ZOMBIE — NIEŹLE!`, C.YELLOW);
    }
  }

  // -------------------------------------------------------------------------
  findInteraction() {
    const p = this.player;
    const w = this.world;

    // Priorytety: przedmiot pod stopami > drzwi > pojemnik > okno > łóżko > przedmiot obok.
    // Dzięki temu łupy nie przesłaniają drzwi, mebli ani okien do zabijania.
    const sameTileItem = w.itemAt(p.x, p.y);
    if (sameTileItem) {
      const best = { kind: 'item', rec: sameTileItem, x: p.x, y: p.y };
      best.text = `E PODNIEŚ ${this.itemLabel(sameTileItem.item)}`;
      return best;
    }

    const offsets = [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
      [1, 1],
      [1, -1],
      [-1, 1],
      [-1, -1],
    ];
    const buckets = { door: [], container: [], window: [], bed: [], item: [] };

    for (const [dx, dy] of offsets) {
      const x = p.x + dx;
      const y = p.y + dy;
      if (!w.inBounds(x, y)) continue;
      const dist = Math.max(Math.abs(dx), Math.abs(dy));
      const t = w.tile(x, y);

      if (t.wall && t.wall.feature === 'door' && !t.wall.destroyed) {
        buckets.door.push({ dist, data: { kind: 'door', wall: t.wall, x, y } });
      }
      if (t.prop && t.prop.container) {
        buckets.container.push({
          dist,
          data: { kind: 'container', prop: t.prop, x, y, searched: t.prop.container.searched },
        });
      }
      if (t.wall && (t.wall.feature === 'window' || t.wall.feature === 'windowBroken')) {
        buckets.window.push({ dist, data: { kind: 'window', wall: t.wall, x, y } });
      }
      if (t.prop && t.prop.sleep) {
        buckets.bed.push({ dist, data: { kind: 'bed', prop: t.prop, x, y } });
      }
      const rec = w.itemAt(x, y);
      if (rec) buckets.item.push({ dist, data: { kind: 'item', rec, x, y } });
    }

    // przeszukane pojemniki są tylko informacją — nie mogą przesłaniać okien ani łóżek
    const openContainers = buckets.container.filter((c) => !c.data.searched);
    const searchedContainers = buckets.container.filter((c) => c.data.searched);
    const order = [
      ['door', buckets.door],
      ['container', openContainers],
      ['window', buckets.window],
      ['bed', buckets.bed],
      ['item', buckets.item],
      ['container', searchedContainers],
    ];
    for (const [, list] of order) list.sort((a, b) => a.dist - b.dist);

    let best = null;
    for (const [, list] of order) {
      if (list.length) {
        best = list[0].data;
        break;
      }
    }
    if (!best) return null;

    if (best.kind === 'item') {
      best.text = `E PODNIEŚ ${this.itemLabel(best.rec.item)}`;
    } else if (best.kind === 'container') {
      const name = CONTAINER_NAMES[best.prop.container.type] || best.prop.name;
      best.text = best.prop.container.searched ? `${name}: PRZESZUKANE` : `E PRZESZUKAJ ${name}`;
    } else if (best.kind === 'door') {
      best.text = best.wall.open ? 'E ZAMKNIJ DRZWI' : 'E OTWÓRZ DRZWI';
    } else if (best.kind === 'window') {
      if (best.wall.barricade > 0) {
        best.text = best.wall.barricade >= 3 ? 'OKNO ZABITE DESKAMI (3/3)' : `E DOBUDUJ DESKI (${best.wall.barricade}/3)`;
      } else {
        best.text = 'E ZABIJ OKNO DESKAMI';
      }
    } else if (best.kind === 'bed') {
      best.text = 'E ŚPIJ W ŁÓŻKU';
    }
    return best;
  }

  interact() {
    if (this.mode !== 'playing') return;
    const it = this.findInteraction();
    if (!it) {
      this.msg('NIC TU NIE MA', C.BONE);
      return;
    }
    if (it.kind === 'item') {
      this.pickUp(it.rec);
    } else if (it.kind === 'container') {
      if (it.prop.container.searched) {
        this.msg('JUŻ PRZESZUKANE', C.BONE);
        return;
      }
      const name = CONTAINER_NAMES[it.prop.container.type] || it.prop.name;
      this.player.action = { type: 'search', prop: it.prop, t: 0, dur: 0.9, name };
      this.audio.play('click');
    } else if (it.kind === 'door') {
      this.world.toggleDoor(it.x, it.y);
      this.audio.play('door');
      this.updateFOV(true);
      this.emitNoise(it.x, it.y, 2);
    } else if (it.kind === 'window') {
      this.tryBarricade(it);
    } else if (it.kind === 'bed') {
      this.sleep();
    }
  }

  finishSearch(act) {
    const prop = act.prop;
    if (!prop || !prop.container) return;
    if (prop.container.searched) {
      this.msg('JUŻ PRZESZUKANE', C.BONE);
      return;
    }
    const loot = prop.container.loot;
    const taken = [];
    for (let i = loot.length - 1; i >= 0; i--) {
      const item = loot[i];
      if (item.id === 'backpack') {
        if (!this.player.backpack) {
          this.player.backpack = true;
          taken.push(ITEMS.backpack.name);
          loot.splice(i, 1);
          this.msg('ZNALAZŁEŚ PLECAK (+5 SLOTÓW)', C.YELLOW);
        }
        continue;
      }
      if (this.addItem(item)) {
        taken.push(this.itemLabel(item));
        loot.splice(i, 1);
        this.stats.items++;
      }
    }
    if (taken.length) {
      this.msg(`ZNALEZIONO: ${taken.join(', ')}`, C.YELLOW);
      this.audio.play('pickup');
    }
    if (loot.length) {
      this.msg('BRAK MIEJSCA W PLECAKU', C.BLOOD);
    } else {
      prop.container.searched = true;
      if (!taken.length) this.msg('PUSTE', C.BONE);
    }
  }

  pickUp(rec) {
    const item = rec.item;
    if (item.id === 'backpack') {
      if (this.player.backpack) {
        this.msg('MASZ JUŻ PLECAK', C.BONE);
        return;
      }
      this.player.backpack = true;
      this.world.removeItem(rec);
      this.msg('ZNALAZŁEŚ PLECAK (+5 SLOTÓW)', C.YELLOW);
      this.audio.play('pickup');
      return;
    }
    if (!this.addItem(item)) {
      this.msg('BRAK MIEJSCA W PLECAKU', C.BLOOD);
      return;
    }
    this.world.removeItem(rec);
    this.msg(`ZABRANO: ${this.itemLabel(item)}`, C.WHITE);
    this.audio.play('pickup');
    this.stats.items++;
  }

  tryBarricade(it) {
    const w = it.wall;
    if (w.barricade >= 3) {
      this.msg('OKNO JEST JUŻ PORZĄDNIE ZABITE', C.BONE);
      return;
    }
    if (!this.hasItem('hammer')) {
      this.msg('POTRZEBUJESZ MŁOTKA', C.BLOOD);
      this.audio.play('error');
      return;
    }
    if (this.countItem('plank') < 1 || this.countItem('nails') < 2) {
      this.msg('POTRZEBUJESZ 1 DESKI I 2 GWÓŹDZI', C.BLOOD);
      this.audio.play('error');
      return;
    }
    this.consumeItem('plank', 1);
    this.consumeItem('nails', 2);
    this.world.addBarricade(it.x, it.y);
    this.audio.play('barricade');
    this.msg(`OKNO ZABITE DESKAMI (${this.world.tile(it.x, it.y).wall.barricade}/3)`, C.YELLOW);
    this.updateFOV(true);
    this.emitNoise(it.x, it.y, 4);
  }

  sleep() {
    const p = this.player;
    const nearZombie = this.world.zombies.some(
      (z) => z.alive && Math.hypot(z.x - p.x, z.y - p.y) < 7,
    );
    if (nearZombie) {
      this.msg('ZOMBIE JEST ZA BLISKO — NIE ZAŚNIESZ', C.BLOOD);
      this.audio.play('error');
      return;
    }
    const hour = (this.time % MIN_PER_DAY) / 60;
    let hours;
    if (hour >= 19 || hour < 5) {
      hours = hour < 5 ? 7 - hour : 31 - hour;
    } else {
      hours = 3;
    }
    hours = Math.max(2, Math.round(hours));
    const before = this.time;
    this.time += hours * 60;
    const daysFrac = hours / 24;
    p.hunger = Math.max(0, p.hunger - 24 * daysFrac);
    p.thirst = Math.max(0, p.thirst - 36 * daysFrac);
    p.energy = 100;
    p.hp = Math.max(0, Math.min(p.maxHp, p.hp + 8));
    if (p.bleeding) p.hp = Math.max(0, p.hp - hours * 4.2);
    if (p.infected) p.infection = Math.min(100, p.infection + (hours / 36) * 100);
    this.checkTimeEvents(before, this.time);
    this.weatherTimer = 40;
    this.audio.play('sleep');
    this.msg(`PRZESPAŁEŚ ${hours} GODZIN`, C.BONE);
    this.sleepFx = 1;
    this.updateFOV(true);
    if (p.infected && p.infection >= 100) this.die('ZAKAŻENIE');
    else if (p.hp <= 0) this.die('WYKRWAWIENIE');
    if (!this.victoryShown && this.time >= WIN_AT) this.triggerWin();
  }

  useSelected() {
    if (this.mode !== 'playing') return;
    const item = this.selectedItem();
    if (!item) {
      this.msg('PIĘŚCI. WYBIERZ PRZEDMIOT (1-0)', C.BONE);
      return;
    }
    const def = ITEMS[item.id];
    if (!def) return;
    const p = this.player;

    if (def.type === 'weapon') {
      this.msg(`${def.name} — SPACJA ATAK`, C.YELLOW);
      return;
    }
    if (def.type === 'ammo' || def.type === 'material' || def.type === 'junk') {
      this.msg('TEGO NIE UŻYWA SIĘ BEZPOŚREDNIO', C.BONE);
      return;
    }
    if (item.id === 'backpack') {
      p.backpack = true;
      this.inventory.splice(this.selected, 1);
      this.msg('PLECAK ZAŁOŻONY (+5 SLOTÓW)', C.YELLOW);
      this.audio.play('pickup');
      return;
    }
    if (item.id === 'flashlight') {
      p.flashlightOn = !p.flashlightOn;
      this.msg(p.flashlightOn ? 'LATARKA WŁĄCZONA' : 'LATARKA WYŁĄCZONA', C.YELLOW);
      this.audio.play('click');
      this.updateFOV(true);
      return;
    }
    if (def.type === 'map') {
      this.mode = 'map';
      this.audio.play('click');
      return;
    }
    if (def.type === 'book') {
      p.xp = (p.xp || 0) + def.xp;
      this.inventory.splice(this.selected, 1);
      this.msg(`PRZECZYTANO: +${def.xp} DOŚWIADCZENIA`, C.YELLOW);
      this.audio.play('pickup');
      return;
    }
    if (def.type === 'gear') {
      this.msg('TEGO PRZEDMIOTU NIE MOŻNA UŻYĆ', C.BONE);
      return;
    }

    // jedzenie / picie / leczenie
    if (def.type === 'food' && p.hunger >= 98) {
      this.msg('NIE JESTEŚ GŁODNY', C.BONE);
      return;
    }
    if (def.type === 'drink' && p.thirst >= 98) {
      this.msg('NIE CHCE CI SIĘ PIĆ', C.BONE);
      return;
    }
    if (def.type === 'heal' && p.hp >= p.maxHp && !p.bleeding && !(def.infection && p.infected)) {
      this.msg('NIE POTRZEBUJESZ TEGO TERAZ', C.BONE);
      return;
    }

    let used = false;
    const parts = [];
    if (def.hunger) {
      p.hunger = Math.max(0, Math.min(100, p.hunger + def.hunger));
      parts.push(`+${def.hunger} GŁÓD`);
      used = true;
    }
    if (def.thirst) {
      p.thirst = Math.max(0, Math.min(100, p.thirst + def.thirst));
      parts.push(`${def.thirst > 0 ? '+' : ''}${def.thirst} PRAGNIENIE`);
      used = true;
    }
    if (def.energy) {
      p.energy = Math.max(0, Math.min(100, p.energy + def.energy));
      used = true;
    }
    if (def.heal) {
      p.hp = Math.max(0, Math.min(p.maxHp, p.hp + def.heal));
      parts.push(`+${def.heal} HP`);
      used = true;
    }
    if (def.stopBleed && p.bleeding) {
      p.bleeding = false;
      parts.push('KRWAWIENIE ZATRZYMANE');
      used = true;
    }
    if (def.infection && p.infected) {
      p.infection = Math.max(0, p.infection + def.infection);
      parts.push('GORĄCZKA TŁUMIONA');
      used = true;
    }
    if (!used) return;
    this.consumeItem(item.id, 1);
    this.msg(`${def.name}: ${parts.join(', ') || 'UŻYTO'}`, C.GRASS_LIGHT);
    this.audio.play(def.type === 'drink' ? 'drink' : def.type === 'heal' ? 'pickup' : 'eat');
    if (p.hp <= 0) this.die(this.lastDamageCause || 'RANY');
  }

  toggleFlashlight() {
    if (this.mode !== 'playing') return;
    if (!this.hasItem('flashlight')) {
      this.msg('NIE MASZ LATARKI', C.BONE);
      return;
    }
    this.player.flashlightOn = !this.player.flashlightOn;
    this.msg(this.player.flashlightOn ? 'LATARKA WŁĄCZONA' : 'LATARKA WYŁĄCZONA', C.YELLOW);
    this.audio.play('click');
    this.updateFOV(true);
  }

  // -------------------------------------------------------------------------
  selectSlot(i) {
    if (i < 0 || i >= this.capacity()) return;
    this.selected = i;
    this.audio.play('click');
  }

  clockString() {
    const total = Math.floor(this.time);
    const h = Math.floor((total % MIN_PER_DAY) / 60);
    const m = Math.floor(total % 60);
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  }

  dayNumber() {
    return Math.floor(this.time / MIN_PER_DAY) + 1;
  }

  goalText() {
    if (this.victoryShown) return 'SURVIVAL';
    const rem = Math.max(0, WIN_AT - this.time);
    const d = Math.floor(rem / MIN_PER_DAY);
    const h = Math.floor((rem % MIN_PER_DAY) / 60);
    return `CEL ${d}D ${h}H`;
  }

  weatherLabel() {
    return this.weather === 'rain' ? 'DESZCZ' : this.weather === 'overcast' ? 'CHMURY' : 'SŁOŃCE';
  }

  combatLevel() {
    return 1 + Math.floor((this.player.xp || 0) / 12);
  }

  survivalText() {
    const elapsed = Math.max(0, this.time - START_TIME);
    const h = Math.floor(elapsed / 60);
    const d = Math.floor(h / 24);
    const hh = h % 24;
    const mm = Math.floor(elapsed % 60);
    return `${d}D ${hh}H ${mm}M`;
  }

  distanceKm() {
    return (this.stats.steps * 0.7) / 1000;
  }

  // -------------------------------------------------------------------------
  menuItems() {
    switch (this.mode) {
      case 'menu':
        return [
          { label: 'NOWA GRA', action: 'new' },
          { label: 'JAK GRAĆ', action: 'help' },
          { label: 'O PROJEKCIE', action: 'about' },
          { label: `GRAFIKA: ${this.profile.label}`, action: 'graphics' },
          { label: 'PEŁNY EKRAN', action: 'fullscreen' },
        ];
      case 'paused':
        return [
          { label: 'WRÓĆ DO GRY', action: 'resume' },
          { label: 'STEROWANIE', action: 'pausedHelp' },
          { label: `GRAFIKA: ${this.profile.label}`, action: 'graphics' },
          { label: 'NOWA GRA', action: 'restart' },
          { label: 'MENU GŁÓWNE', action: 'menu' },
          { label: `DŹWIĘK: ${this.audio.muted ? 'WYŁ' : 'WŁ'}`, action: 'mute' },
        ];
      case 'dead':
        return [
          { label: 'NOWA GRA', action: 'restart' },
          { label: 'MENU GŁÓWNE', action: 'menu' },
        ];
      case 'won':
        return [
          { label: 'GRAJ DALEJ', action: 'continue' },
          { label: 'NOWA GRA', action: 'restart' },
          { label: 'MENU GŁÓWNE', action: 'menu' },
        ];
      default:
        return [];
    }
  }

  menuAction(action) {
    this.audio.init();
    this.audio.play('click');
    switch (action) {
      case 'new':
      case 'restart':
        this.startGame();
        break;
      case 'resume':
        this.mode = 'playing';
        this.menuIndex = 0;
        break;
      case 'menu':
        this.toMenu();
        break;
      case 'help':
        this.helpBg = 'menu';
        this.helpReturn = 'menu';
        this.mode = 'help';
        this.menuIndex = 0;
        break;
      case 'pausedHelp':
        this.helpBg = 'game';
        this.helpReturn = 'paused';
        this.mode = 'help';
        break;
      case 'about':
        this.helpBg = 'menu';
        this.mode = 'about';
        break;
      case 'back':
        this.mode = this.helpReturn === 'paused' ? 'paused' : this.helpBg === 'menu' ? 'menu' : 'playing';
        this.menuIndex = 0;
        break;
      case 'continue':
        this.mode = 'playing';
        this.victoryShown = true;
        this.menuIndex = 0;
        break;
      case 'mute': {
        const muted = this.audio.toggleMute();
        this.msg(muted ? 'DŹWIĘK WYŁĄCZONY' : 'DŹWIĘK WŁĄCZONY', C.BONE);
        break;
      }
      case 'graphics':
        this.cycleProfile();
        break;
      case 'fullscreen':
        this.toggleFullscreen();
        break;
      default:
        break;
    }
  }

  toggleFullscreen() {
    try {
      if (!document.fullscreenElement) document.documentElement.requestFullscreen();
      else document.exitFullscreen();
    } catch (e) {
      /* przeglądarka może blokować */
    }
  }

  // -------------------------------------------------------------------------
  keyDown(code, repeat = false) {
    this.audio.init();
    // G działa w każdym trybie (gra, pauza, mapa, pomoc, menu) — jeden punkt
    // wejścia zamiast kopii w kilku gałęziach.
    if (code === 'KeyG' && !repeat) {
      this.cycleProfile();
      return true;
    }
    if (repeat && !MOVE_CODES[code]) return true;
    if (MOVE_CODES[code]) {
      if (!this.keys.has(code)) this.moveStack.push(code);
      this.keys.add(code);
    }
    if (code === 'ShiftLeft' || code === 'ShiftRight' || code === 'ControlLeft' || code === 'ControlRight') {
      this.keys.add(code);
    }

    if (this.mode === 'playing') {
      if (MOVE_CODES[code]) return true;
      if (repeat) return true;
      switch (code) {
        case 'Space':
          this.tryAttack();
          return true;
        case 'KeyE':
          this.interact();
          return true;
        case 'KeyQ':
          this.useSelected();
          return true;
        case 'KeyF':
          this.toggleFlashlight();
          return true;
        case 'KeyM':
          this.mode = 'map';
          this.audio.play('click');
          return true;
        case 'KeyH':
          this.helpBg = 'game';
          this.helpReturn = 'paused';
          this.mode = 'help';
          return true;
        case 'Escape':
          this.mode = 'paused';
          this.menuIndex = 0;
          this.keys.clear();
          this.moveStack = [];
          this.audio.play('click');
          return true;
        case 'Digit1': case 'Digit2': case 'Digit3': case 'Digit4': case 'Digit5':
        case 'Digit6': case 'Digit7': case 'Digit8': case 'Digit9': case 'Digit0': {
          const n = code === 'Digit0' ? 9 : Number(code.slice(-1)) - 1;
          this.selectSlot(n);
          return true;
        }
        default:
          return false;
      }
    }

    if (this.mode === 'map') {
      if (code === 'KeyM' || code === 'Escape') {
        this.mode = 'playing';
        this.audio.play('click');
        return true;
      }
      return false;
    }

    if (this.mode === 'help' || this.mode === 'about') {
      if (code === 'Escape' || code === 'Enter' || code === 'Space') {
        this.menuAction('back');
        return true;
      }
      return false;
    }

    if (this.mode === 'menu' || this.mode === 'paused' || this.mode === 'dead' || this.mode === 'won') {
      if (code === 'Escape') {
        if (this.mode === 'paused') {
          this.mode = 'playing';
          this.menuIndex = 0;
        } else if (this.mode === 'menu') {
          return false;
        }
        return true;
      }
      if (code === 'ArrowUp' || code === 'KeyW') {
        this.menuIndex = (this.menuIndex - 1 + this.menuItems().length) % Math.max(1, this.menuItems().length);
        this.audio.play('click');
        return true;
      }
      if (code === 'ArrowDown' || code === 'KeyS') {
        this.menuIndex = (this.menuIndex + 1) % Math.max(1, this.menuItems().length);
        this.audio.play('click');
        return true;
      }
      if (code === 'Enter' || code === 'Space') {
        const items = this.menuItems();
        if (items[this.menuIndex]) this.menuAction(items[this.menuIndex].action);
        return true;
      }
      return false;
    }
    return false;
  }

  keyUp(code) {
    this.keys.delete(code);
    const idx = this.moveStack.indexOf(code);
    if (idx >= 0) this.moveStack.splice(idx, 1);
  }

  clearKeys() {
    this.keys.clear();
    this.moveStack = [];
  }

  click(x, y) {
    this.audio.init();
    if (this.buttons.length) {
      for (const b of this.buttons) {
        if (x >= b.x && y >= b.y && x < b.x + b.w && y < b.y + b.h) {
          this.menuAction(b.action);
          return;
        }
      }
    }
    if (this.mode === 'playing') {
      // pasek ekwipunku
      const slots = this.capacity();
      const hx = 10;
      const hy = 169;
      if (y >= hy && y < hy + 20 && x >= hx && x < hx + slots * 20) {
        const i = Math.floor((x - hx) / 20);
        if (i < slots) this.selectSlot(i);
        return;
      }
      this.tryAttack();
    } else if (this.mode === 'map') {
      // klik zamyka mapę
      this.mode = 'playing';
      this.audio.play('click');
    }
  }

  // -------------------------------------------------------------------------
  // Prezentacja klatki: w RTG liczymy prawdziwe światło RGB, w OCS/AGA
  // wystarczy podmiana indeksów na paletę.
  present() {
    const scr = this.screen;
    const litMode = this.mode === 'playing' || this.mode === 'paused' || this.mode === 'dead';
    if (scr.profile && scr.profile.lighting && litMode && this.world) {
      scr.rgbaLit(this.getLights(), this.ambientFactor(), this.ambientTint());
    } else {
      scr.syncRGBA();
    }
    return scr;
  }

  render() {
    this.buttons = [];
    if (this.mode === 'menu' || this.mode === 'about' || (this.mode === 'help' && this.helpBg === 'menu')) {
      this.renderMenuScene();
      if (this.mode === 'menu') drawTitle(this);
      else if (this.mode === 'about') drawAbout(this);
      else drawHelp(this);
      return;
    }

    if (this.world) {
      this.renderGameScene();
      if (this.mode === 'playing') {
        drawHUD(this);
      } else if (this.mode === 'paused') {
        drawHUD(this);
        drawPause(this);
      } else if (this.mode === 'help') {
        drawHUD(this);
        drawHelp(this);
      } else if (this.mode === 'map') {
        drawMap(this);
      } else if (this.mode === 'dead') {
        drawDead(this);
      } else if (this.mode === 'won') {
        drawWon(this);
      }
    }
  }

  renderMenuScene() {
    this.menuCam.follow(
      17 + Math.sin(this.t * 0.06) * 4,
      12 + Math.cos(this.t * 0.045) * 2.5,
    );
    renderWorld(this, this.menuWorld, this.menuCam, {
      revealAll: true,
      menu: true,
      noPlayer: true,
      dimAll: 1,
    });
    drawRain(this, true);
  }

  renderGameScene() {
    this.camera.follow(this.player.vx, this.player.vy);
    renderWorld(this, this.world, this.camera, {});
    renderEffects(this);
    if (this.weather === 'rain' && !this.playerInside()) drawRain(this);
  }
}
