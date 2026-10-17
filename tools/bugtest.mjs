import { buildArt } from '../src/art.js';
import { Screen } from '../src/render.js';
import { Game } from '../src/game.js';
const stub = { muted:false, init(){}, play(){}, setRain(){}, setMuted(){}, toggleMute(){return true;} };
// 1. title squares glyph
const g = new Game(new Screen(), buildArt(), stub);
g.render();
// check row near y=14..36 x=70..250 for VOID-colored pixels inside logo bounding box (should be only bg)
let bgInside = 0;
for (let y=16;y<34;y++) for (let x=84;x<236;x++) if (g.screen.get(x,y)===0) bgInside++;
console.log('VOID pixels inside logo box (bg is shaded so should be 0):', bgInside);
// 2. render world at start, check non-void over walls in screen region
g.startGame(12345);
// 3. simulate long session
const keys = ['KeyS','KeyD','KeyW','KeyA'];
let frames=0;
for (let round=0; round<400; round++) {
  const k = keys[round % 4];
  g.keyDown(k);
  for (let i=0;i<6;i++) g.update(0.05);
  g.keyUp(k);
  if (round%37===0) g.tryAttack();
  if (round%11===0) g.interact();
  if (round%13===0) g.useSelected();
  if (round%53===0) { g.mode='map'; g.render(); g.mode='playing'; }
  g.render(); frames++;
}
console.log('after sim: pos', g.player.x, g.player.y, 'hp', g.player.hp.toFixed(1), 'mode', g.mode, 'kills', g.stats.kills, 'zombies', g.world.zombies.length, 'inv', g.inventory.map(i=>i.id));
// run until night
g.time = 20*60+50;
for (let i=0;i<400;i++) { g.update(0.05); }
console.log('time', g.clockString(), 'day', g.dayNumber(), 'zombies', g.world.zombies.length, 'mode', g.mode, 'messages', g.messages.map(m=>m.text));
// force horde
g.triggerHorde(2);
console.log('zombies after horde', g.world.zombies.length);
// sleep test
g.sleep();
console.log('after sleep', g.clockString(), 'mode', g.mode);
// win
g.time = 2870;
g.update(0.05);
console.log('mode at win', g.mode);
g.render();
// dead screen
g.mode='dead'; g.deathCause='UGRYZIENIE'; g.render();
console.log('frames rendered', frames);
console.log('OK');
