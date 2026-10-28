import {readFile,writeFile} from 'node:fs/promises';
import {ORDER_MOLD_TEMPLATES} from '../lib/order-mold-templates.mjs';
const root=new URL('../',import.meta.url),entries=structuredClone(ORDER_MOLD_TEMPLATES),entry=entries.find(e=>e.descriptor.id==='polo');
const name='POLO COM RECORTE V';entry.descriptor.name=name;
for(const kind of ['template','proof']){const url=new URL('public'+entry.assets[kind],root),svg=(await readFile(url,'utf8')).replace(/>POLO</g,'>'+name+'<').replace(/POLO — mapa de desenho/g,name+' — mapa de desenho');await writeFile(url,svg);if(kind==='template')entry.templateSvg=svg;}
await writeFile(new URL('public/assets/molds/polo/descriptor.json',root),JSON.stringify(entry.descriptor,null,2)+'\n');
const metaUrl=new URL('public/assets/molds/polo/preparation.json',root),meta=JSON.parse(await readFile(metaUrl));meta.name=name;await writeFile(metaUrl,JSON.stringify(meta,null,2)+'\n');
await writeFile(new URL('lib/order-mold-templates.mjs',root),'// Prepared owner-supplied models for presentations and orders. Simulator catalog remains independent.\nexport const ORDER_MOLD_TEMPLATES=Object.freeze('+JSON.stringify(entries)+');\n');
