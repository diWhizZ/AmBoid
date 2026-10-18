import fs from 'node:fs';import path from 'node:path';import {PNG} from 'pngjs';
const input=process.argv[2]||'assets/tiles/floor',out=process.argv[3]||'assets/atlases/floor-64.png';
function walk(d){return fs.existsSync(d)?fs.readdirSync(d,{withFileTypes:true}).sort((a,b)=>a.name.localeCompare(b.name)).flatMap(e=>e.isDirectory()?walk(path.join(d,e.name)):[path.join(d,e.name)]):[];}
const files=walk(input).filter(f=>f.toLowerCase().endsWith('.png'));if(!files.length)throw Error(`No tiles in ${input}`);
const cols=8,rows=Math.ceil(files.length/cols),atlas=new PNG({width:cols*64,height:rows*32});const tiles=[];
files.forEach((f,i)=>{const p=PNG.sync.read(fs.readFileSync(f));if(p.width!==64||p.height!==32)throw Error(`${f} is not 64x32`);const x=(i%cols)*64,y=Math.floor(i/cols)*32;PNG.bitblt(p,atlas,0,0,64,32,x,y);tiles.push({id:i+1,name:path.relative(input,f).replaceAll(path.sep,'/').replace(/\.png$/i,''),x,y,width:64,height:32});});
fs.mkdirSync(path.dirname(out),{recursive:true});fs.writeFileSync(out,PNG.sync.write(atlas));fs.writeFileSync(out+'.json',JSON.stringify({tilewidth:64,tileheight:32,columns:cols,count:files.length,tiles},null,2));
// Tiled TSX is rebuilt to match the atlas/catalog and carries stable names for authored maps.
const tsxPath=path.join(input,'floor-tiles.tsx'),imageRel=path.relative(path.dirname(tsxPath),path.resolve(out)).replaceAll(path.sep,'/');
const xml=s=>s.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('"','&quot;');
let tsx=`<?xml version="1.0" encoding="UTF-8"?>\n<tileset version="1.10" tiledversion="1.10.2" name="amboid-floor-64" tilewidth="64" tileheight="32" tilecount="${files.length}" columns="${cols}">\n <image source="${xml(imageRel)}" width="${cols*64}" height="${rows*32}"/>\n`;
for(let i=0;i<tiles.length;i++)tsx+=` <tile id="${i}"><properties><property name="source" value="${xml(tiles[i].name)}"/></properties></tile>\n`;
fs.writeFileSync(tsxPath,tsx+'</tileset>\n');console.log(`Atlas ${out}: ${files.length} tiles, ${cols} columns; Tiled TSX ${tsxPath}.`);
