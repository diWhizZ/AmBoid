import fs from 'node:fs';import path from 'node:path';import {PNG} from 'pngjs';
const input=process.argv[2]||'assets/tiles/cleaned',output=process.argv[3]||'assets/tiles/floor';
function walk(d){return fs.existsSync(d)?fs.readdirSync(d,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(d,e.name)):[path.join(d,e.name)]):[];}
// This destination is a generated tile directory: prune stale PNG outputs so re-running
// with a changed source pack cannot leave old tiles in the atlas. Non-PNG metadata stays.
for(const f of walk(output).filter(f=>f.toLowerCase().endsWith('.png')))fs.rmSync(f);
let n=0;for(const f of walk(input).filter(f=>f.toLowerCase().endsWith('.png'))){const src=PNG.sync.read(fs.readFileSync(f));if(src.width!==128||src.height!==64)continue;const dst=new PNG({width:64,height:32});for(let y=0;y<32;y++)for(let x=0;x<64;x++){const si=((y*2)*128+x*2)*4,di=(y*64+x)*4;dst.data.set(src.data.subarray(si,si+4),di);}const out=path.join(output,path.relative(input,f));fs.mkdirSync(path.dirname(out),{recursive:true});fs.writeFileSync(out,PNG.sync.write(dst));n++;}console.log(`Nearest-neighbour 128x64 -> 64x32: ${n} tile(s).`);
