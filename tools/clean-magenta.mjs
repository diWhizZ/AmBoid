import fs from 'node:fs'; import path from 'node:path'; import { PNG } from 'pngjs';
const input=process.argv[2]||'assets/source/isotilepack'; const output=process.argv[3]||'assets/tiles/cleaned';
function walk(d){return fs.existsSync(d)?fs.readdirSync(d,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(d,e.name)):[path.join(d,e.name)]):[];}
let n=0; for(const f of walk(input).filter(f=>f.toLowerCase().endsWith('.png'))){const rel=path.relative(input,f), out=path.join(output,rel);fs.mkdirSync(path.dirname(out),{recursive:true});const p=PNG.sync.read(fs.readFileSync(f));for(let i=0;i<p.data.length;i+=4)if(p.data[i]===255&&p.data[i+1]===0&&p.data[i+2]===255)p.data[i+3]=0;fs.writeFileSync(out,PNG.sync.write(p));n++;} console.log(`Cleaned ${n} PNG(s): ${input} -> ${output}`);
