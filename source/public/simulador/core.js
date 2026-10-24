import {COLORS,UNIFORM_FONTS,DEFAULT_BASE,DEFAULT_INK} from './catalog.js';
export const PALETTE=COLORS.map(c=>c.hex);
export const FONTS=UNIFORM_FONTS;
export const PANELS = [
 {id:'front',label:'Camiseta · frente',piece:'shirt',cm:{w:52,h:70}},
 {id:'back',label:'Camiseta · costas',piece:'shirt',cm:{w:52,h:70}},
 {id:'sleeve-right',label:'Manga direita',piece:'shirt',cm:{w:38,h:27}},
 {id:'sleeve-left',label:'Manga esquerda',piece:'shirt',cm:{w:38,h:27}},
 {id:'short-front',label:'Calção · frente',piece:'shorts',cm:{w:58,h:44}},
 {id:'short-back',label:'Calção · costas',piece:'shorts',cm:{w:58,h:44}},
];
export const clone = value => structuredClone(value);
export const uid = () => globalThis.crypto?.randomUUID?.() ?? `layer-${Date.now()}-${Math.random().toString(36).slice(2)}`;
export const clamp = (n,a,b) => Math.max(a,Math.min(b,Number.isFinite(Number(n))?Number(n):a));
export const hex = v => /^#[0-9a-f]{6}$/i.test(v) ? v.toLowerCase() : '#164b43';
export function layer(type, extras={}) {
 return {id:uid(),type,name:type==='text'?'Texto':type==='image'?'Logo':'Grafismo',x:.5,y:.5,w:.48,h:.18,rotation:0,opacity:1,color:DEFAULT_INK.hex,colorId:DEFAULT_INK.id,locked:false,...extras};
}
export function makeState(panels=PANELS) {
 return {schema:1,platformBrand:'atlas',title:'Meu uniforme',product:'kit',active:panels[0].id,trim:DEFAULT_BASE.hex,panels:panels.map(p=>({...clone(p),color:DEFAULT_BASE.hex,colorId:DEFAULT_BASE.id,layers:[]})),selected:null,order:null};
}
export function demoState() {
 const s=makeState();
 const f=s.panels[0];
 f.layers.push(layer('pattern',{name:'Faixas diagonais',pattern:'diagonal',color:'#c5ef65',x:.82,y:.76,w:.72,h:.8}));
 f.layers.push(layer('badge',{name:'Escudo de exemplo',x:.68,y:.25,w:.145,h:.15,color:'#f6f5ed'}));
 f.layers.push(layer('text',{name:'Nome do time',text:'SEU TIME',font:'sport',x:.5,y:.48,w:.63,h:.085}));
 f.layers.push(layer('text',{name:'Número da frente',text:'00',personalization:'player-number',font:'sport',x:.5,y:.67,w:.2,h:.14}));
 s.panels[1].layers.push(layer('text',{name:'Nome do atleta',text:'JOGADOR',personalization:'player-name',font:'sport',x:.5,y:.24,w:.62,h:.085}),layer('text',{name:'Número das costas',text:'00',personalization:'player-number',font:'sport',x:.5,y:.56,w:.52,h:.38}));
 s.panels[2].color=s.panels[3].color='#c5ef65';
 s.panels[4].layers.push(layer('pattern',{name:'Recorte do calção',pattern:'diagonal',x:.87,y:.8,w:.42,h:.72,color:'#c5ef65'}),layer('text',{name:'Número do calção',text:'00',personalization:'player-number',font:'sport',x:.25,y:.53,w:.17,h:.2}),layer('badge',{name:'Escudo do calção',x:.73,y:.43,w:.15,h:.21}));
 s.selected=f.layers[1].id;
 return s;
}
export const activePanel=s=>s.panels.find(p=>p.id===s.active)??s.panels[0];
export const selectedLayer=s=>activePanel(s)?.layers.find(l=>l.id===s.selected)??null;
export function visiblePanels(s) {return s.panels.filter(p=>s.product==='kit'||s.product==='custom'||p.piece===s.product);}
export function localPoint(l,x,y) {
 const a=-l.rotation*Math.PI/180,dx=x-l.x,dy=y-l.y;
 return {x:dx*Math.cos(a)-dy*Math.sin(a),y:dx*Math.sin(a)+dy*Math.cos(a)};
}
export function contains(l,x,y) { const p=localPoint(l,x,y);return Math.abs(p.x)<=l.w/2&&Math.abs(p.y)<=l.h/2; }
export function move(l,x,y) { l.x=clamp(x,0,1);l.y=clamp(y,0,1); }
export function resize(l,w) {
 const ratio=l.h/l.w;
 const next=clamp(w,Math.max(.035,.015/ratio),Math.min(1.8,2/ratio));
 l.w=next;l.h=next*ratio;
}
export function personalizationRole(l) {
 if(l.type!=='text')return null;
 if(['player-name','player-number'].includes(l.personalization))return l.personalization;
 if(/^n[uú]mero(?:\b|\s)/i.test(l.name)||/^\d+$/.test(String(l.text).trim()))return 'player-number';
 if(/^nome do (?:atleta|jogador)(?:\b|\s)/i.test(l.name)||/^(?:ATLETA|JOGADOR)$/i.test(String(l.text).trim()))return 'player-name';
 return null;
}
export function normalizeText(l) {
 if(l.type!=='text')return l;
 l.rotation=0;
 const role=personalizationRole(l);
 if(role){l.personalization=role;l.text=role==='player-number'?'00':'JOGADOR';}
 return l;
}
export function normalizeTextState(state) {
 let changed=false;
 for(const p of state.panels)for(const l of p.layers){const before=JSON.stringify(l);normalizeText(l);if(before!==JSON.stringify(l))changed=true;}
 return changed;
}
export function quality(l,panel) {
 if(l.type!=='image')return null;
 if(l.vector)return {level:'ok',message:'Logo vetorial',ppi:null};
 const widthCm=l.w*panel.cm.w,heightCm=l.h*panel.cm.h;
 const ppi=Math.min(l.pixels.w/(widthCm/2.54),l.pixels.h/(heightCm/2.54));
 const value=Math.round(ppi);
 return {ppi:value,level:ppi<100?'bad':ppi<180?'warn':'ok',message:ppi<100?`Baixa resolução: ${value} ppi neste tamanho`:ppi<180?`Confira a nitidez: ${value} ppi neste tamanho`:`Resolução adequada ao teste: ${value} ppi`};
}
export function warnings(s) {
 const result=[];
 for(const p of visiblePanels(s))for(const l of p.layers){
  if(l.type==='text'){const font=FONTS.find(f=>f.id===l.font);if(font){const missing=[...new Set([...l.text].filter(c=>!font.characters.includes(c.codePointAt(0))))];if(missing.length)result.push({panel:p.id,layer:l.id,level:'warn',message:`${p.label}: a fonte ${font.label} não possui ${missing.slice(0,6).map(c=>'“'+c+'”').join(', ')}. Escolha outra fonte ou ajuste o texto.`});}}
  const q=quality(l,p);if(q&&q.level!=='ok')result.push({panel:p.id,layer:l.id,level:q.level,message:`${p.label}: ${q.message}`});
  const r=Math.abs(l.rotation*Math.PI/180),ex=(Math.abs(Math.cos(r))*l.w+Math.abs(Math.sin(r))*l.h)/2,ey=(Math.abs(Math.sin(r))*l.w+Math.abs(Math.cos(r))*l.h)/2;
  if(l.type!=='pattern'&&(l.x-ex<.025||l.x+ex>.975||l.y-ey<.025||l.y+ey>.975))result.push({panel:p.id,layer:l.id,level:'warn',message:`${p.label}: ${l.name} perto da borda ou fora do painel.`});
 }
 return result;
}
export class History {
 constructor(state,limit=40){this.items=[clone(state)];this.index=0;this.limit=limit;}
 push(state){const next=clone(state);if(JSON.stringify(next)===JSON.stringify(this.items[this.index]))return;this.items=this.items.slice(0,this.index+1);this.items.push(next);if(this.items.length>this.limit)this.items.shift();this.index=this.items.length-1;}
 undo(){if(this.index>0)this.index--;return clone(this.items[this.index]);}
 redo(){if(this.index<this.items.length-1)this.index++;return clone(this.items[this.index]);}
}
export function sanitizeSVG(source,Parser=DOMParser,Serializer=XMLSerializer) {
 if(source.length>2_000_000||/<!DOCTYPE|<!ENTITY/i.test(source))throw Error('SVG inválido ou muito complexo.');
 const doc=new Parser().parseFromString(source,'image/svg+xml');
 const root=doc.documentElement;
 if(root?.localName!=='svg'||doc.querySelector('parsererror'))throw Error('O arquivo não é um SVG válido.');
 const allowed=new Set(['svg','g','path','rect','circle','ellipse','line','polyline','polygon','defs','linearGradient','radialGradient','stop','clipPath','mask','title','desc','use','symbol']);
 const attrs=new Set(['xmlns','viewBox','width','height','x','y','x1','y1','x2','y2','cx','cy','r','rx','ry','d','points','fill','fill-rule','fill-opacity','stroke','stroke-width','stroke-linecap','stroke-linejoin','stroke-miterlimit','stroke-opacity','opacity','transform','id','offset','stop-color','stop-opacity','gradientUnits','gradientTransform','spreadMethod','fx','fy','clip-path','clipPathUnits','mask','maskUnits','maskContentUnits','preserveAspectRatio','href','xlink:href','xmlns:xlink']);
 const styleAttrs=new Set(['fill','fill-rule','fill-opacity','stroke','stroke-width','stroke-linecap','stroke-linejoin','stroke-miterlimit','stroke-opacity','opacity','stop-color','stop-opacity','clip-path','mask']);
 function applyStyle(n,style){for(const part of style.split(';')){if(!part.trim())continue;const colon=part.indexOf(':'),key=part.slice(0,colon).trim(),val=part.slice(colon+1).trim();if(colon<1||!styleAttrs.has(key))throw Error('O SVG usa estilos não suportados. Exporte uma versão SVG simples ou envie PNG.');n.setAttribute(key,val);}}
 for(const sheet of [...root.querySelectorAll('style')]){
  const css=sheet.textContent.replace(/\/\*[\s\S]*?\*\//g,'');const rules=[...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)];if(!rules.length&&css.trim())throw Error('Estilos SVG inválidos.');
  for(const rule of rules){const selector=rule[1].trim();if(!/^[a-zA-Z0-9_.# ,:-]+$/.test(selector)||selector.includes(':'))throw Error('O SVG usa estilos complexos. Exporte uma versão SVG simples.');let matches;try{matches=root.querySelectorAll(selector);}catch{throw Error('Estilos SVG inválidos.');}for(const n of matches)applyStyle(n,rule[2]);}sheet.remove();
 }
 for(const n of [root,...root.querySelectorAll('[style]')])if(n.hasAttribute('style')){applyStyle(n,n.getAttribute('style'));n.removeAttribute('style');}
 const nodes=[root,...root.querySelectorAll('*')];if(nodes.length>12000)throw Error('SVG muito complexo para este teste.');
 if(nodes.some(n=>n.localName==='image'))throw Error('Este SVG contém uma imagem incorporada. Envie essa logo em PNG ou use um SVG com vetores.');
 if(nodes.some(n=>n.localName==='text'))throw Error('Converta os textos da logo SVG em curvas antes de enviar. Os textos do uniforme podem ser criados no editor.');
 if(nodes.some(n=>['script','foreignObject','iframe','filter','animate','animateTransform','set'].includes(n.localName)))throw Error('O SVG contém conteúdo ativo ou efeitos não suportados. Use uma versão simples com vetores.');
 for(const n of nodes){
  if(n!==root&&!allowed.has(n.localName)){n.remove();continue;}
  for(const a of [...n.attributes]){
   if(a.name.startsWith('xmlns'))continue;
   if(!attrs.has(a.name)||/[<>]|javascript:|data:|https?:|\/\//i.test(a.value)||(/url\s*\(/i.test(a.value)&&!/^url\(\s*['"]?#[a-zA-Z0-9_.:-]+['"]?\s*\)$/.test(a.value))||(['href','xlink:href'].includes(a.name)&&!/^#[a-zA-Z0-9_.:-]+$/.test(a.value)))n.removeAttribute(a.name);
  }
 }
 const vb=(root.getAttribute('viewBox')??'').trim().split(/[ ,]+/).map(Number);
 const w=parseFloat(root.getAttribute('width')),h=parseFloat(root.getAttribute('height'));
 const dims=vb.length===4&&vb.every(Number.isFinite)&&vb[2]>0&&vb[3]>0?{w:vb[2],h:vb[3]}:{w,h};
 if(!(dims.w>0&&dims.h>0))throw Error('O SVG precisa de largura e altura ou viewBox válidos.');
 if(vb.length!==4)root.setAttribute('viewBox',`0 0 ${dims.w} ${dims.h}`);
 root.setAttribute('xmlns','http://www.w3.org/2000/svg');const scale=Math.min(1,2048/Math.max(dims.w,dims.h));root.setAttribute('width',String(Math.max(1,dims.w*scale)));root.setAttribute('height',String(Math.max(1,dims.h*scale)));
 return {source:new Serializer().serializeToString(root),...dims};
}
export function inspectGLB(buffer) {
 if(buffer.byteLength>60*1024*1024)throw Error('O modelo deve ter até 60 MB.');
 const v=new DataView(buffer);
 if(buffer.byteLength<20||v.getUint32(0,true)!==0x46546c67||v.getUint32(4,true)!==2||v.getUint32(8,true)!==buffer.byteLength)throw Error('Envie um GLB válido, versão 2.');
 const n=v.getUint32(12,true);if(v.getUint32(16,true)!==0x4e4f534a||20+n>buffer.byteLength)throw Error('Estrutura GLB inválida.');
 let json;try{json=JSON.parse(new TextDecoder().decode(new Uint8Array(buffer,20,n)).trim());}catch{throw Error('Estrutura GLB inválida.');}
 if([...(json.buffers??[]),...(json.images??[])].some(v=>v.uri))throw Error('Use um GLB com todas as imagens e dados incorporados, sem links externos.');
 if(Object.keys(json.extensions??{}).length||json.extensionsRequired?.length)throw Error('Use um GLB sem extensões obrigatórias, Draco ou texturas comprimidas.');
 const count=(json.accessors??[]).filter(a=>a.type==='VEC3').reduce((n,a)=>n+(a.count||0),0);if(count>2_000_000)throw Error('Modelo muito pesado para este protótipo.');
 return json;
}
export function orderDraft(s,input={}) {
 const name=String(input.customer??'').trim();const quantity=Math.round(Number(input.quantity));
 if(!name)throw Error('Informe o nome do cliente ou equipe.');
 if(!Number.isFinite(quantity)||quantity<1||quantity>9999)throw Error('Informe uma quantidade entre 1 e 9999.');
 return {id:uid(),number:`TESTE-${Date.now().toString().slice(-6)}`,customer:name,quantity,notes:String(input.notes??'').trim().slice(0,2000),title:s.title,product:s.product,createdAt:new Date().toISOString(),status:'Rascunho de teste',design:clone({...s,order:null})};
}
