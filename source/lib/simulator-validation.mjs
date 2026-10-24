import {AppError} from './project-service.mjs';
import {COLORS,UNIFORM_FONTS,paletteColor,DEFAULT_INK} from '../public/simulador/catalog.js';
import {ELITE_PANELS,ELITE_MODEL} from '../public/simulador/elite.js';
import {GRAPHIC_IDS} from '../public/simulador/graphics.js';
import {normalizeText} from '../public/simulador/core.js';
const fail=message=>{throw new AppError(400,message);};
const text=(v,max,empty=true)=>{if(typeof v!=='string'||v.length>max||/[\u0000-\u001f\u007f]/.test(v)||(!empty&&!v.trim()))fail('Confira os nomes e textos do uniforme.');return v;};
const number=(v,a,b)=>{if(typeof v!=='number'||!Number.isFinite(v)||v<a||v>b)fail('Confira o tamanho, a posição e a rotação dos elementos.');return v;};
const id=v=>{text(v,80,false);if(!/^[A-Za-z0-9_-]+$/.test(v))fail('Identificador de elemento inválido.');return v;};
const CRC_TABLE=Uint32Array.from({length:256},(_,n)=>{let c=n;for(let i=0;i<8;i++)c=c&1?0xedb88320^(c>>>1):c>>>1;return c>>>0;});
function pngCRC(bytes){let c=0xffffffff;for(const b of bytes)c=CRC_TABLE[(c^b)&255]^(c>>>8);return (c^0xffffffff)>>>0;}
function color(value,colorId){const c=paletteColor(colorId||value);if(!c||c.hex!==String(value).toLowerCase())fail('Use somente cores da PALETA SUBLIMAÇÃO 2026.');return {color:c.hex,colorId:c.id};}
export function simulatorPNG(value,{maxChars=3*1024*1024,maxPixels=24_000_000}={}){
 if(typeof value!=='string'||value.length>maxChars||!/^data:image\/png;base64,[A-Za-z0-9+/]+={0,2}$/.test(value))fail('Use uma imagem PNG válida e reduza o tamanho do arquivo.');
 const bytes=Buffer.from(value.slice(value.indexOf(',')+1),'base64');if(bytes.length<57||!bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])))fail('Imagem PNG inválida.');
 let offset=8,chunks=0,data=false,ended=false;while(offset+12<=bytes.length){if(++chunks>4096)fail('PNG muito complexo.');const length=bytes.readUInt32BE(offset),end=offset+12+length;if(end>bytes.length)fail('Imagem PNG incompleta.');const type=bytes.toString('ascii',offset+4,offset+8);if((chunks===1&&(type!=='IHDR'||length!==13))||pngCRC(bytes.subarray(offset+4,end-4))!==bytes.readUInt32BE(end-4))fail('Imagem PNG corrompida.');if(type==='IDAT')data=true;offset=end;if(type==='IEND'){if(length!==0||offset!==bytes.length)fail('Imagem PNG inválida.');ended=true;break;}}if(!data||!ended)fail('Imagem PNG incompleta.');
 const w=bytes.readUInt32BE(16),h=bytes.readUInt32BE(20);if(!w||!h||w>10000||h>10000||w*h>maxPixels)fail('A imagem excede as dimensões permitidas.');return {src:value,pixels:{w,h},vector:false,bytes};
}
function logo(value){
 if(typeof value!=='string'||value.length>7*1024*1024)fail('Reduza o tamanho da logo.');
 if(value.startsWith('data:image/png;')){const p=simulatorPNG(value,{maxChars:7*1024*1024});return {src:p.src,pixels:p.pixels,vector:false};}
 if(!value.startsWith('data:image/svg+xml;charset=utf-8,'))fail('Envie logos PNG ou SVG.');let svg;try{svg=decodeURIComponent(value.slice(value.indexOf(',')+1));}catch{fail('Logo SVG inválida.');}
 const content=svg.replace(/\sxmlns(?::[A-Za-z0-9_-]+)?=["'][^"']*["']/g,'');
 if(svg.length>2_000_000||/<!|<\?|<\/?(?:script|foreignObject|iframe|image|text|style|filter|animate\w*|set)\b|\s(?:on\w+|style)\s*=|javascript:|https?:|data:|&#/i.test(content))fail('Use uma logo SVG simples, com vetores e textos em curvas.');
 for(const m of svg.matchAll(/<\/?([A-Za-z][\w:-]*)\b/g))if(!['svg','g','path','rect','circle','ellipse','line','polyline','polygon','defs','linearGradient','radialGradient','stop','clipPath','mask','title','desc','use','symbol'].includes(m[1]))fail('Este SVG usa elementos não suportados.');
 if([...svg.matchAll(/(?:href|xlink:href)\s*=\s*["']([^"']*)["']/gi)].some(m=>!/^#[A-Za-z0-9_.:-]+$/.test(m[1])))fail('O SVG não pode carregar arquivos externos.');
 for(const m of svg.matchAll(/url\s*\(([^)]*)\)/gi))if(!/^\s*['"]?#[A-Za-z0-9_.:-]+['"]?\s*$/.test(m[1]))fail('O SVG não pode carregar arquivos externos.');
 const root=svg.match(/^<svg\b([^>]*)>/);if(!root)fail('Logo SVG inválida.');const dimension=key=>Number(root[1].match(new RegExp('\\b'+key+'="([0-9.]+)"'))?.[1]);const w=dimension('width'),h=dimension('height');if(!w||!h||w>2048||h>2048)fail('Dimensões SVG inválidas.');return {src:value,pixels:{w,h},vector:true};
}
export function validateSimulatorState(input){
 if(!input||input.schema!==1||input.model!==ELITE_MODEL||!['kit','shirt','shorts'].includes(input.product)||!Array.isArray(input.panels)||input.panels.length!==19)fail('Escolha uma modelagem disponibilizada pelo administrador.');
 const title=text(input.title,80,false),trim=color(input.trim,input.trimColorId);const out={schema:1,platformBrand:'atlas',model:ELITE_MODEL,title,product:input.product,trim:trim.color,trimColorId:trim.colorId,active:'front',selected:null,order:null,panels:[]};const seen=new Set(),layers=new Set();let count=0;
 for(const p of input.panels){const original=ELITE_PANELS.find(q=>q.id===p?.id);if(!original||seen.has(p.id)||!Array.isArray(p.layers)||p.layers.length>60)fail('Confira os painéis do uniforme.');seen.add(p.id);const next={...original,cm:{w:number(p.cm?.w,1,300),h:number(p.cm?.h,1,300)},...color(p.color,p.colorId),layers:[]};
  for(const l of p.layers){if(++count>200||!l||!['text','pattern','image','badge'].includes(l.type))fail('Use até 200 elementos por uniforme.');const layerId=id(l.id);if(layers.has(layerId))fail('Há elementos repetidos no desenho.');layers.add(layerId);
   const clean={id:layerId,type:l.type,name:text(l.name,80,false),x:number(l.x,0,1),y:number(l.y,0,1),w:number(l.w,.035,1.8),h:number(l.h,.015,2),rotation:number(l.rotation,-180,180),opacity:number(l.opacity,.1,1),locked:Boolean(l.locked),...(l.type==='image'?{color:DEFAULT_INK.hex,colorId:DEFAULT_INK.id}:color(l.color,l.colorId))};
   if(l.type==='text'){if(!UNIFORM_FONTS.some(f=>f.id===l.font))fail('Escolha uma das fontes de uniforme disponíveis.');clean.text=text(l.text,80);clean.font=l.font;if(['player-name','player-number'].includes(l.personalization))clean.personalization=l.personalization;normalizeText(clean);}
   if(l.type==='pattern'){if(!GRAPHIC_IDS.has(l.pattern))fail('Escolha um grafismo da biblioteca.');clean.pattern=l.pattern;}
   if(l.type==='image')Object.assign(clean,logo(l.src));next.layers.push(clean);
  }out.panels.push(next);
 }
 if(seen.has(input.active))out.active=input.active;if(out.panels.find(p=>p.id===out.active)?.layers.some(l=>l.id===input.selected))out.selected=input.selected;
 if(JSON.stringify(out).length>10*1024*1024)throw new AppError(413,'O desenho excede 10 MB. Reduza as logos.');return out;
}
export function simulatorSnapshot(value){if(!value||value.schema!==1||!Number.isSafeInteger(value.version)||value.version<1)fail('Confira a versão do uniforme vinculado.');return {schema:1,id:id(value.id),version:value.version,confirmedAt:text(value.confirmedAt,40),state:validateSimulatorState(value.state)};}
export function describeSimulatorColors(state,piece){return [...new Set(state.panels.filter(p=>p.piece===piece).flatMap(p=>[p.colorId,...p.layers.filter(l=>l.type!=='image').map(l=>l.colorId)]))].map(id=>COLORS.find(c=>c.id===id)?.name).filter(Boolean);}
