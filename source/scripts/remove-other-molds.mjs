// Remove obsolete source/deployment assets; keep the exact owner-approved files.
import{readdir,rm}from'node:fs/promises';import path from'node:path';
export const retained=new Set(['assets/molds/kit-edge-2027-mapa-v3/model.glb','assets/molds/kit-edge-2027-mapa-v3/descriptor.json','assets/molds/kit-edge-2027-mapa-v3/template.svg','assets/molds/kit-edge-2027-mapa-v3/proof.svg','assets/molds/kit-edge-2027/source.glb']);
async function prune(root){async function walk(dir){let entries;try{entries=await readdir(dir,{withFileTypes:true});}catch(e){if(e.code==='ENOENT')return;throw e;}for(const entry of entries){const file=path.join(dir,entry.name),relative=path.relative(root,file).split(path.sep).join('/');if(entry.isDirectory())await walk(file);else if(!retained.has(relative)&&!retained.has(relative.replace(/\.glb\.gz$/,'.glb')))await rm(file,{force:true});}}
 await walk(path.join(root,'assets/molds'));
 for(const name of ['assets/camiseta.glb','assets/template-camiseta.svg','assets/mapa-conferencia.png','assets/molde-preview.png','assets/passeio-v2-encaixe.png','simulador/models/kit-elite-27.glb','simulador/models/kit-elite-27-compatible.glb','conferencia-passeio.html'])await rm(path.join(root,name),{force:true});}
await prune('public');await prune('dist/client');
