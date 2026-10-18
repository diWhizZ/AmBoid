// Hand-authored CC0 pipeline fixture (not a substitute for the optional upstream pack).
import fs from 'node:fs'; import path from 'node:path'; import { PNG } from 'pngjs';
const dir='assets/source/isotilepack/demo'; fs.mkdirSync(dir,{recursive:true});
const colors=[['#4f803c','#659747','#3a692f'],['#855e3b','#a4784a','#68462e'],['#cfad58','#e4c777','#b68c3c'],['#667a80','#84999a','#4d626c'],['#286c83','#3988a0','#1c586f'],['#927046','#b58c55','#745535'],['#466f3c','#78934c','#365b32'],['#a98c69','#c8aa7e','#897052']];
function hex(h){return h.slice(1).match(/../g).map(v=>parseInt(v,16));}
for(let k=0;k<colors.length;k++) { const p=new PNG({width:128,height:64}); for(let i=0;i<p.data.length;i+=4){p.data[i]=255;p.data[i+1]=0;p.data[i+2]=255;p.data[i+3]=255;}
 const [base,light,dark]=colors[k].map(hex); for(let y=0;y<64;y++)for(let x=0;x<128;x++){let dx=Math.abs(x-63.5)/64+Math.abs(y-31.5)/32;if(dx>1)continue; let n=(x*13+y*7+k*19)%31; let c=n<3?light:n>27?dark:base; const i=(y*128+x)*4;p.data[i]=c[0];p.data[i+1]=c[1];p.data[i+2]=c[2];p.data[i+3]=255; if(k===4 && ((x+y*3)%17<2)){p.data[i]=68;p.data[i+1]=150;p.data[i+2]=171;}}
 fs.writeFileSync(path.join(dir,`demo-${String(k+1).padStart(2,'0')}.png`),PNG.sync.write(p)); }
console.log('Generated 8 original 128x64 CC0 fixture tiles.');
