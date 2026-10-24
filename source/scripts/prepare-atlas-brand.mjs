import fs from 'node:fs/promises';
import {createRequire} from 'node:module';
import path from 'node:path';
const require=createRequire(import.meta.url),sharp=createRequire(require.resolve('next/package.json'))('sharp');
const input=process.argv[2];if(!input)throw Error('Provide the supplied Atlas SVG.');
const source=(await fs.readFile(input,'utf8')).replace(/\r\n?/g,'\n');
if(/<(?:script|foreignObject|image)\b|(?:href|onload)\s*=|<!ENTITY/i.test(source))throw Error('Use the supplied vector-only logo.');
const out=path.resolve('public/assets/atlas');await fs.mkdir(out,{recursive:true});await fs.copyFile(input,path.join(out,'atlas-original.svg'));
const defs=source.match(/<defs>[\s\S]*?<\/defs>/)[0],groups=[...source.matchAll(/<g>\s*(<path[\s\S]*?<\/g>)/g)].map(m=>m[1].replace(/<\/g>$/,''));
if(groups.length!==2)throw Error('Expected the two supplied Atlas logo variants.');
for(const [i,name] of ['dark','light'].entries()){
 const base=(viewBox)=>`<svg xmlns="http://www.w3.org/2000/svg" width="1800" height="${1800*Number(viewBox.split(' ')[3])/Number(viewBox.split(' ')[2])}" viewBox="${viewBox}" fill-rule="evenodd" clip-rule="evenodd">${defs}<g>${groups[i]}</g></svg>`;
 const raw=await sharp(Buffer.from(base('0 0 29975 18570.86'))).resize({width:1800}).png().toBuffer();
 const {info}=await sharp(raw).trim({background:'#00000000',threshold:0}).png().toBuffer({resolveWithObject:true});
 const unit=29975/1800,pad=24,vb=[-info.trimOffsetLeft*unit-pad,-info.trimOffsetTop*unit-pad,info.width*unit+pad*2,info.height*unit+pad*2];
 const svg=base(vb.map(v=>v.toFixed(3)).join(' '));await fs.writeFile(path.join(out,`atlas-logo-${name}.svg`),svg);await sharp(Buffer.from(svg)).resize({width:1200}).png().toFile(path.join(out,`atlas-logo-${name}.png`));console.log(name,vb,info.width/info.height);
}
await fs.copyFile(path.join(out,'atlas-logo-light.png'),path.join(out,'atlas-logo-print.png'));
const iconDefs=defs.replace('#201E1E','#FEFEFE'),icon=`<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="-800 -800 10800 10800"><rect x="-800" y="-800" width="10800" height="10800" rx="1400" fill="#171c1d"/><defs><clipPath id="atlasSymbol"><path d="M-30 6500 4200 -10H5400L9400 6500Z"/></clipPath></defs>${iconDefs}<g transform="translate(0 1000)" clip-path="url(#atlasSymbol)">${groups[0]}</g></svg>`;
await fs.writeFile('public/favicon.svg',icon);await sharp(Buffer.from(icon)).resize(256,256).png().toFile(path.join(out,'atlas-symbol.png'));
const mark=icon.replace(/<rect[^>]+\/>/,'');await fs.writeFile(path.join(out,'atlas-mark.svg'),mark);await sharp(Buffer.from(mark)).resize(512,512).png().toFile(path.join(out,'atlas-mark.png'));
const paths=[...groups[0].matchAll(/<path class="fil([01])" d="([^"]+)"/g)];
const module=`// Original vector geometry from the supplied ATLAS logo, clipped to its A symbol.\nconst INK=${JSON.stringify(paths.find(p=>p[1]==='0')[2])};\nconst ACCENT=${JSON.stringify(paths.find(p=>p[1]==='1')[2])};\nexport function drawAtlasMark(ctx,w,h,color,aspect=1){ctx.save();const s=Math.min(w/9400,h/(6500*aspect));ctx.scale(s,s*aspect);ctx.translate(-4700,-3250);ctx.beginPath();ctx.moveTo(-30,6500);ctx.lineTo(4200,-10);ctx.lineTo(5400,-10);ctx.lineTo(9400,6500);ctx.closePath();ctx.clip();ctx.fillStyle=color;ctx.fill(new Path2D(INK));const g=ctx.createLinearGradient(600,0,6843,0);g.addColorStop(0,'#8b9063');g.addColorStop(1,'#bcbc88');ctx.fillStyle=g;ctx.fill(new Path2D(ACCENT));ctx.restore();}\n`;
await fs.writeFile('public/atlas-logo-mark.js',module);
