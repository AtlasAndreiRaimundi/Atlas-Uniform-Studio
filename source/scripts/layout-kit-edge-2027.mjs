import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {readGlb,readAccessor} from '../lib/template-generator.mjs';

const root=fileURLToPath(new URL('../',import.meta.url));
const original=path.join(root,'public/assets/molds/kit-edge-2027');
const target=path.join(root,'public/assets/molds/kit-edge-2027-mapa-v2');
const previous=JSON.parse(await readFile(path.join(original,'descriptor.json'),'utf8'));
const sourceSvg=await readFile(path.join(original,'template.svg'),'utf8');
const names={1:'Cós do calção',2:'Cós do calção',3:'Cós do calção',4:'Cós do calção',5:'Calção',6:'Calção',7:'Filete de manga',8:'Filete de manga',9:'Gola',10:'Gola',11:'Gola',12:'Gola',13:'Gola',14:'Manga esquerda',15:'Manga direita',16:'Recorte direito',17:'Recorte esquerdo',18:'Frente',19:'Costas'};
const groups=[
  {id:'CORPO_E_RECORTES',title:'CORPO E RECORTES',panels:[18,19,17,16]},
  {id:'GOLAS',title:'GOLAS',panels:[11,10,9,12,13]},
  {id:'MANGAS_E_FILETES',title:'MANGAS + FILETES',panels:[15,14,8,7]},
  {id:'CALCAO_E_COS',title:'CALÇÃO + CÓS',panels:[5,6,4,1,2,3]},
];
const scale=1900,margin=120,page=4096;
const panels=new Map(previous.panels.map(p=>[p.number,{...structuredClone(p),label:names[p.number],displayName:`${names[p.number]} · P${String(p.number).padStart(2,'0')}`} ]));
function width(n){const p=panels.get(n);return (p.uvBounds[2]-p.uvBounds[0])*scale;}
function height(n){const p=panels.get(n);return (p.uvBounds[3]-p.uvBounds[1])*scale;}
function place(n,x,y){panels.get(n).rect={x,y,w:width(n),h:height(n)};}
function row(numbers,y,gap=80,x=margin){for(const n of numbers){place(n,x,y);x+=width(n)+gap;}return {right:x-gap,bottom:y+Math.max(...numbers.map(height))};}
const body=row([18,19,17,16],340);
const collarX=body.right+180,collarCenters=[collarX+260,collarX+800];
place(11,collarCenters[0]-width(11)/2,340);place(10,collarCenters[1]-width(10)/2,340);
const collarRow2=340+Math.max(height(11),height(10))+180;
place(9,(collarCenters[0]+collarCenters[1]-width(9))/2,collarRow2);
const collarRow3=collarRow2+height(9)+180;
place(12,collarCenters[0]-width(12)/2,collarRow3);place(13,collarCenters[1]-width(13)/2,collarRow3);
const sleevesHeading=body.bottom+100,sleeves=row([15,14],sleevesHeading+110,160);
const trimsTop=sleeves.bottom+90;
place(8,panels.get(15).rect.x+(width(15)-width(8))/2,trimsTop);
place(7,panels.get(14).rect.x+(width(14)-width(7))/2,trimsTop);
const shortsHeading=trimsTop+Math.max(height(8),height(7))+100;
const shorts=row([5,6],shortsHeading+110,140);
row([4,1,2,3],shorts.bottom+90);
for(const group of groups)for(const n of group.panels)panels.get(n).group=group.id;
for(const panel of panels.values())if(panel.rect.x<margin||panel.rect.y<240||panel.rect.x+panel.rect.w>page-margin||panel.rect.y+panel.rect.h>page-100)throw new Error(`Panel ${panel.number} is outside the drawing area.`);

const esc=value=>String(value).replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[char]));
const rounded=value=>Number(value.toFixed(3));
const colors=['#c6a05e','#4a83af','#bd5f57','#72a183','#986fa6','#c18b4e','#5b9fa4'];
function contour(number){
  const old=previous.panels.find(p=>p.number===number),current=panels.get(number);
  const tag=sourceSvg.match(new RegExp(`<path id="PAINEL_${number}"[^>]+>`))?.[0];
  const d=tag?.match(/\bd="([^"]+)"/)?.[1];if(!d)throw new Error(`Missing drawing contour ${number}.`);
  return d.replace(/([ML])(-?[\d.]+),(-?[\d.]+)/g,(_,op,x,y)=>`${op}${rounded(current.rect.x+(Number(x)-old.rect.x)*scale/previous.texelsPerUvUnit)},${rounded(current.rect.y+(Number(y)-old.rect.y)*scale/previous.texelsPerUvUnit)}`);
}
function makeSvg(proof=false){
  const guides=[],art=[];
  for(const group of groups){
    const paths=[];
    for(const number of group.panels){
      const p=panels.get(number),r=p.rect,d=contour(number),color=colors[(number-1)%colors.length];
      paths.push(`<path id="PAINEL_${number}" data-name="${esc(p.label)}" fill="${proof?color:'#ffffff'}" fill-rule="evenodd" d="${d}"/>`);
      if(proof)paths.push(`<text x="${rounded(r.x+r.w/2)}" y="${rounded(r.y+r.h/2)}" text-anchor="middle" font-family="Arial,sans-serif" font-size="${Math.min(88,Math.max(12,r.h/3))}" fill="white">${number}</text>`);
      guides.push(`<path fill="none" stroke="${color}" stroke-width="3" d="${d}"/>`);
      const centered=number===16||number===17||group.id==='GOLAS';
      const x=centered?r.x+r.w/2:r.x,anchor=centered?' text-anchor="middle"':'';
      if(number===16||number===17){
        guides.push(`<text x="${rounded(x)}" y="${rounded(r.y-49)}"${anchor} font-family="Arial,sans-serif" font-size="25" fill="#39434a">RECORTE</text><text x="${rounded(x)}" y="${rounded(r.y-18)}"${anchor} font-family="Arial,sans-serif" font-size="23" fill="#39434a">${number===17?'ESQUERDO':'DIREITO'} · P${number}</text>`);
      }else{
        const label=[1,2,3,4].includes(number)?`CÓS DO CALÇÃO · P${String(number).padStart(2,'0')}`:p.displayName.toLocaleUpperCase('pt-BR');
        guides.push(`<text x="${rounded(x)}" y="${rounded(r.y-20)}"${anchor} font-family="Arial,sans-serif" font-size="27" fill="#39434a">${esc(label)}</text>`);
      }
    }
    art.push(`<g id="${group.id}">${paths.join('')}</g>`);
  }
  const headings=[['CORPO E RECORTES',margin,260,body.right],['GOLAS',collarX,260,page-margin],['MANGAS + FILETES',margin,sleevesHeading,page-margin],['CALÇÃO + CÓS',margin,shortsHeading,page-margin]].map(([title,x,y,right])=>`<text x="${rounded(x)}" y="${rounded(y)}" font-family="Arial,sans-serif" font-weight="bold" font-size="40" fill="#202b33">${title}</text><path d="M${rounded(x)},${rounded(y+20)} L${rounded(right)},${rounded(y+20)}" stroke="#bdc6cb" stroke-width="2"/>`).join('');
  const title='<text x="100" y="90" font-family="Arial,sans-serif" font-size="48" font-weight="bold" fill="#272727">KIT EDGE 2027</text><text x="100" y="146" font-family="Arial,sans-serif" font-size="23" fill="#65717a">ATLAS UNIFORM STUDIO · MAPA ORGANIZADO 4096 × 4096 · OCULTE AS GUIAS ANTES DE EXPORTAR</text>';
  return `<svg xmlns="http://www.w3.org/2000/svg" width="4096" height="4096" viewBox="0 0 4096 4096"><title>KIT EDGE 2027 — mapa de desenho</title><g id="FUNDO_MANTER_4096"><rect width="4096" height="4096" fill="#fff"/></g><g id="ARTE_DESENHE_AQUI">${art.join('')}</g><g id="GUIAS_OCULTAR_ANTES_DE_EXPORTAR">${title}${headings}${guides.join('')}</g></svg>`;
}

const descriptor={...structuredClone(previous),id:'kit-edge-2027-mapa-v2',atlasRevision:2,supersedes:previous.id,panels:[...panels.values()],texelsPerUvUnit:scale,layoutGroups:groups};
for(const primitive of descriptor.primitives){const p=descriptor.panels.find(p=>p.mesh===primitive.mesh&&p.primitive===primitive.primitive);primitive.label=p.label;primitive.displayName=p.displayName;}
const {json,binary:originalBinary}=readGlb(await readFile(path.join(original,'model.glb'))),binary=new Uint8Array(originalBinary),view=new DataView(binary.buffer);
for(const p of descriptor.panels){
  const primitive=json.meshes[p.mesh].primitives[p.primitive],uv=readAccessor(json,binary,primitive.attributes.TEXCOORD_1),output=json.accessors[primitive.attributes.TEXCOORD_0],buffer=json.bufferViews[output.bufferView];
  const offset=(buffer.byteOffset||0)+(output.byteOffset||0),stride=buffer.byteStride||8;
  if(output.componentType!==5126)throw new Error('The atlas must use float UVs.');
  for(let i=0;i<uv.count;i++){view.setFloat32(offset+i*stride,(p.rect.x+(uv.data[i*2]-p.uvBounds[0])*scale)/page,true);view.setFloat32(offset+i*stride+4,(p.rect.y+(uv.data[i*2+1]-p.uvBounds[1])*scale)/page,true);}
  json.meshes[p.mesh].name=p.displayName;
}
json.asset.generator+=' · KIT EDGE organized atlas 2';
const encoded=new TextEncoder().encode(JSON.stringify(json)),jsonSize=Math.ceil(encoded.length/4)*4,binSize=Math.ceil(binary.length/4)*4,output=new Uint8Array(28+jsonSize+binSize),header=new DataView(output.buffer);
header.setUint32(0,0x46546c67,true);header.setUint32(4,2,true);header.setUint32(8,output.length,true);header.setUint32(12,jsonSize,true);header.setUint32(16,0x4e4f534a,true);output.fill(32,20,20+jsonSize);output.set(encoded,20);header.setUint32(20+jsonSize,binSize,true);header.setUint32(24+jsonSize,0x004e4942,true);output.set(binary,28+jsonSize);

await mkdir(target,{recursive:true});
const svg=makeSvg(),proof=makeSvg(true);
await writeFile(path.join(target,'model.glb'),output);await writeFile(path.join(target,'template.svg'),svg);await writeFile(path.join(target,'proof.svg'),proof);await writeFile(path.join(target,'descriptor.json'),JSON.stringify(descriptor,null,2)+'\n');
const {INSTALLED_TEMPLATES}=await import('../lib/installed-templates.mjs');
const legacy=INSTALLED_TEMPLATES.find(entry=>entry.descriptor.id===previous.id);
if(!legacy)throw new Error('The previous atlas must remain registered.');
const current={...legacy,descriptor,status:'published',createdAt:new Date().toISOString(),assets:{...legacy.assets,model:'/assets/molds/kit-edge-2027-mapa-v2/model.glb',template:'/assets/molds/kit-edge-2027-mapa-v2/template.svg',proof:'/assets/molds/kit-edge-2027-mapa-v2/proof.svg'},templateSvg:svg};
const entries=[current,{...legacy,status:'archived'},...INSTALLED_TEMPLATES.filter(entry=>![current.descriptor.id,legacy.descriptor.id].includes(entry.descriptor.id))];
await writeFile(path.join(root,'lib/installed-templates.mjs'),'// Owner-requested models shipped with the Site. Database overrides retain their admin edits and status.\nexport const INSTALLED_TEMPLATES=Object.freeze('+JSON.stringify(entries)+');\n');
console.log(JSON.stringify({id:descriptor.id,panels:descriptor.panelCount,scale,bottom:Math.max(...descriptor.panels.map(p=>p.rect.y+p.rect.h)),groups:groups.map(g=>g.title)}));
