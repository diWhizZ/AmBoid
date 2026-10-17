import { buildArt } from '../src/art.js';
import { Screen } from '../src/render.js';
import { Game } from '../src/game.js';
const stub = { muted:false, init(){}, play(){}, setRain(){}, setMuted(){}, toggleMute(){return true;} };
const g = new Game(new Screen(), buildArt(), stub);
g.startGame(424242);
const dirs = ['KeyW','KeyS','KeyA','KeyD','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'];
let errors = 0;
const t0 = Date.now();
for (let i=0;i<6000;i++) {
  // random input
  const r = Math.random();
  if (r < 0.06) g.keyDown(dirs[(Math.random()*8)|0]);
  else if (r < 0.10) g.keyUp(dirs[(Math.random()*8)|0]);
  else if (r < 0.12) g.tryAttack();
  else if (r < 0.13) g.interact();
  else if (r < 0.135) g.useSelected();
  else if (r < 0.14) g.toggleFlashlight();
  else if (r < 0.142) g.selectSlot((Math.random()*15)|0);
  if (i % 500 === 0) {
    // cycle screens (bez psucia aktualnego trybu gry)
    const prev = g.mode;
    for (const mode of ['map','help','about','paused','dead','won','menu']) {
      g.mode = mode;
      if (mode === 'help') g.helpBg = Math.random()<0.5?'menu':'game';
      g.render();
    }
    g.mode = prev;
  }
  g.update(1/60);
  if (i % 3 === 0) g.render();
}
const dt = Date.now()-t0;
console.log('stress done in', dt, 'ms; ~', (6000/(dt/1000)).toFixed(0), 'ticks/s');
console.log('mode', g.mode, 'pos', g.player.x, g.player.y, 'hp', g.player.hp.toFixed(1), 'time', g.clockString(), 'day', g.dayNumber());
console.log('zombies', g.world.zombies.length, 'kills', g.stats.kills, 'items', g.world.items.length, 'messages', g.messages.length);
console.log('inventory', g.inventory.length, 'selected', g.selected, 'capacity', g.capacity());
