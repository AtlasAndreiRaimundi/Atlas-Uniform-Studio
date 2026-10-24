import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {readGlb,readAccessor} from '../lib/template-generator.mjs';
import {INSTALLED_TEMPLATES} from '../lib/installed-templates.mjs';

const root=fileURLToPath(new URL('../',import.meta.url)),oldId='kit-edge-2027-mapa-v2',id='kit-edge-2027-mapa-v3';
const previous=INSTALLED_TEMPLATES.find(entry=>entry.descriptor.id===oldId);
if(!previous)throw new Error('The previous organized atlas must remain registered.');
const descriptor=structuredClone(previous.descriptor),p7=descriptor.panels.find(p=>p.number===7),p8=descriptor.panels.find(p=>p.number===8),oldRect={...p7.rect};
p7.rect={x:oldRect.x+(oldRect.w-p8.rect.w)/2,y:oldRect.y,w:p8.rect.w,h:p8.rect.h};
p7.atlasScale={x:p7.rect.w/(p7.uvBounds[2]-p7.uvBounds[0]),y:p7.rect.h/(p7.uvBounds[3]-p7.uvBounds[1])};
p7.matchedToPanel=8;
descriptor.id=id;descriptor.atlasRevision=3;descriptor.supersedes=oldId;
const rounded=value=>Number(value.toFixed(3));
function transformSvg(source,proof=false){
  const tag=source.match(/<path id="PAINEL_7"[^>]+>/)?.[0],oldD=tag?.match(/\bd="([^"]+)"/)?.[1];
  if(!oldD)throw new Error('Panel 7 is missing from the source drawing.');
  const d=oldD.replace(/([ML])(-?[\d.]+),(-?[\d.]+)/g,(_,op,x,y)=>`${op}${rounded(p7.rect.x+(Number(x)-oldRect.x)*p7.rect.w/oldRect.w)},${rounded(p7.rect.y+(Number(y)-oldRect.y)*p7.rect.h/oldRect.h)}`);
  let output=source.replaceAll(oldD,d);
  output=output.replace(/<text\b[^>]*>FILETE DE MANGA · P07<\/text>/,tag=>tag.replace(/\bx="[^"]+"/,`x="${rounded(p7.rect.x)}"`));
  if(proof){
    const group=output.match(/<g id="MANGAS_E_FILETES">[\s\S]*?<\/g>/)?.[0];
    if(!group)throw new Error('The sleeves and trims group is missing.');
    const changed=group.replace(/(<path id="PAINEL_7"[^>]+\/>)(<text\b[^>]*>7<\/text>)/,(_,shape,text)=>shape+text.replace(/\by="[^"]+"/,`y="${rounded(p7.rect.y+p7.rect.h/2)}"`));
    output=output.replace(group,changed);
  }
  return output;
}
const {json,binary:oldBinary}=readGlb(await readFile(path.join(root,'public'+previous.assets.model))),binary=new Uint8Array(oldBinary),view=new DataView(binary.buffer);
const primitive=json.meshes[p7.mesh].primitives[p7.primitive],raw=readAccessor(json,binary,primitive.attributes.TEXCOORD_1),output=json.accessors[primitive.attributes.TEXCOORD_0],buffer=json.bufferViews[output.bufferView],offset=(buffer.byteOffset||0)+(output.byteOffset||0),stride=buffer.byteStride||8;
if(output.componentType!==5126)throw new Error('Atlas UVs must use floats.');
for(let i=0;i<raw.count;i++){
  view.setFloat32(offset+i*stride,(p7.rect.x+(raw.data[i*2]-p7.uvBounds[0])*p7.atlasScale.x)/4096,true);
  view.setFloat32(offset+i*stride+4,(p7.rect.y+(raw.data[i*2+1]-p7.uvBounds[1])*p7.atlasScale.y)/4096,true);
}
json.asset.generator+=' · matched sleeve trim UV density';
const encoded=new TextEncoder().encode(JSON.stringify(json)),jsonSize=Math.ceil(encoded.length/4)*4,binSize=Math.ceil(binary.length/4)*4,model=new Uint8Array(28+jsonSize+binSize),header=new DataView(model.buffer);
header.setUint32(0,0x46546c67,true);header.setUint32(4,2,true);header.setUint32(8,model.length,true);header.setUint32(12,jsonSize,true);header.setUint32(16,0x4e4f534a,true);model.fill(32,20,20+jsonSize);model.set(encoded,20);header.setUint32(20+jsonSize,binSize,true);header.setUint32(24+jsonSize,0x004e4942,true);model.set(binary,28+jsonSize);
const target=path.join(root,'public/assets/molds',id);await mkdir(target,{recursive:true});
const svg=transformSvg(previous.templateSvg),proof=transformSvg(await readFile(path.join(root,'public'+previous.assets.proof),'utf8'),true);
await writeFile(path.join(target,'template.svg'),svg);await writeFile(path.join(target,'proof.svg'),proof);await writeFile(path.join(target,'model.glb'),model);await writeFile(path.join(target,'descriptor.json'),JSON.stringify(descriptor,null,2)+'\n');
const current={...previous,descriptor,status:'published',createdAt:new Date().toISOString(),assets:{...previous.assets,model:`/assets/molds/${id}/model.glb`,template:`/assets/molds/${id}/template.svg`,proof:`/assets/molds/${id}/proof.svg`},templateSvg:svg};
const entries=[current,...INSTALLED_TEMPLATES.filter(entry=>entry.descriptor.id!==id).map(entry=>entry.descriptor.id===oldId?{...entry,status:'archived'}:entry)];
await writeFile(path.join(root,'lib/installed-templates.mjs'),'// Owner-requested models shipped with the Site. Database overrides retain their admin edits and status.\nexport const INSTALLED_TEMPLATES=Object.freeze('+JSON.stringify(entries)+');\n');
console.log(JSON.stringify({id,panel7:p7.rect,panel8:p8.rect,sameWidth:p7.rect.w===p8.rect.w,sameHeight:p7.rect.h===p8.rect.h}));
