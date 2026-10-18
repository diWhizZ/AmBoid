import { worldToIso, depthSort } from '../map/iso.js';
export class CanvasRenderer {
  constructor(ctx, atlas, tileIndex = {}, options = {}) { this.ctx = ctx; this.atlas = atlas; this.tileIndex = tileIndex; this.wallAtlas = options.wallAtlas || null; this.wallCatalog = options.wallCatalog || {}; }
  setWallAtlas(image, catalog) { this.wallAtlas = image; this.wallCatalog = catalog || {}; }
  draw(map, actors, camera) {
    const c = this.ctx, { width: vw, height: vh } = c.canvas, tw = map.tileWidth, th = map.tileHeight;
    c.imageSmoothingEnabled = false; c.clearRect(0, 0, vw, vh); c.fillStyle = '#17221c'; c.fillRect(0, 0, vw, vh);
    c.save(); c.scale(camera.zoom, camera.zoom);
    // Conservative visible range: iso inverse of viewport corners plus margin.
    const corners = [[camera.x, camera.y], [camera.x + vw/camera.zoom, camera.y], [camera.x, camera.y + vh/camera.zoom], [camera.x + vw/camera.zoom, camera.y + vh/camera.zoom]];
    const xs = [], ys = [];
    for (const [x,y] of corners) { const a = x/(tw/2), b = y/(th/2); xs.push((a+b)/2); ys.push((b-a)/2); }
    const minX = Math.max(0, Math.floor(Math.min(...xs))-2), maxX = Math.min(map.width-1, Math.ceil(Math.max(...xs))+2);
    const minY = Math.max(0, Math.floor(Math.min(...ys))-2), maxY = Math.min(map.height-1, Math.ceil(Math.max(...ys))+2);
    for(let y=minY;y<=maxY;y++) for(let x=minX;x<=maxX;x++) {
      const p=worldToIso(x,y,tw,th), id=map.tile('floor',x,y); if(!id) continue;
      const src=this.tileIndex[id] ?? Math.max(0, id - 1);
      c.drawImage(this.atlas,(src%8)*tw,Math.floor(src/8)*th,tw,th,p.x-camera.x,p.y-camera.y,tw,th);
    }
    const drawables=[];
    for(let y=minY;y<=maxY;y++) for(let x=minX;x<=maxX;x++) {
      const wall=map.tile('walls',x,y); if(wall) drawables.push({kind:'wall',x,y,depth:x+y,id:y*map.width+x,tileId:wall});
    }
    for(const d of map.doors) if(d.x>=minX&&d.x<=maxX&&d.y>=minY&&d.y<=maxY) drawables.push({kind:'door',x:d.x,y:d.y,depth:d.x+d.y,id:d.id,door:d});
    for(const o of map.objects) if(o.type==='obstacle'||o.type==='decoration') { const tx=o.properties?.find(p=>p.name==='tileX')?.value ?? Math.floor(o.x/tw), ty=o.properties?.find(p=>p.name==='tileY')?.value ?? Math.floor(o.y/th); if(tx>=minX&&tx<=maxX&&ty>=minY&&ty<=maxY) drawables.push({kind:o.type,x:tx,y:ty,depth:tx+ty,id:o.id}); }
    for(const a of actors) drawables.push({...a,kind:a.kind||'actor',depth:a.x+a.y+0.001});
    for(const o of depthSort(drawables)) {
      const p=worldToIso(o.x,o.y,tw,th), sx=p.x-camera.x, sy=p.y-camera.y;
      if(o.kind==='wall') this.wall(sx,sy,tw,th,o.tileId);
      else if(o.kind==='door') this.door(sx,sy,tw,th,o.door);
      else if(o.kind==='obstacle'||o.kind==='decoration') { const c=this.ctx;c.fillStyle=o.kind==='obstacle'?'#8b6339':'#4d7846';c.fillRect(sx+tw/2-8,sy+th/2-13,16,13);c.strokeStyle='#392d24';c.strokeRect(sx+tw/2-8,sy+th/2-13,16,13); }
      else this.actor(sx,sy,tw,th,o);
    }
    c.restore();
  }
  wall(x,y,w,h,tileId=null) { const c=this.ctx,entry=this.wallCatalog?.[tileId]; if(this.wallAtlas&&entry){const sw=entry.width||64,sh=entry.height||64,dx=x+(entry.offsetX||0),dy=y+h-sh+(entry.offsetY||0);c.drawImage(this.wallAtlas,entry.x,entry.y,sw,sh,dx,dy,sw,sh);return;} c.fillStyle='#685342'; c.beginPath(); c.moveTo(x,y+h/2);c.lineTo(x+w/2,y);c.lineTo(x+w,y+h/2);c.lineTo(x+w/2,y+h);c.closePath();c.fill(); c.fillStyle='#94785b';c.fillRect(x+w/2-5,y-26,10,29); c.fillStyle='#51402f';c.fillRect(x+w/2+5,y-26,8,29); }
  door(x,y,w,h,d) { const c=this.ctx; this.wall(x,y,w,h); const opening=d.state===2?(d.target===1?Math.min(1,d.elapsed/d.duration):1-Math.min(1,d.elapsed/d.duration)):(d.state===1?1:0); const leafW=Math.max(2,14*(1-opening*.82)), left=x+w/2-leafW/2; c.fillStyle='#76502e';c.fillRect(left,y-25,leafW,26); c.fillStyle='#f4d27a';c.fillRect(left+leafW-3,y-13,2,2); }
  actor(x,y,w,h,a) { const c=this.ctx; c.fillStyle='rgba(0,0,0,.28)'; c.beginPath();c.ellipse(x+w/2,y+h/2,8,4,0,0,Math.PI*2);c.fill(); c.fillStyle=a.color||'#d9e6de'; c.fillRect(x+w/2-4,y-13,8,13); c.fillStyle='#e0bd92'; c.fillRect(x+w/2-3,y-18,6,6); }
}
