import {test} from 'node:test';import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';import {createHash} from 'node:crypto';
import {PRESENTATION_PACK_TEMPLATES as pack} from '../lib/presentation-pack-templates.mjs';
import {INSTALLED_TEMPLATES} from '../lib/installed-templates.mjs';import {readGlb,readAccessor} from '../lib/template-generator.mjs';
import {registerHooks} from 'node:module';
registerHooks({resolve(specifier,context,next){if(specifier==='three')return next(new URL('../public/vendor/three/build/three.module.min.js',import.meta.url).href,context);return next(specifier,context);}});
const {GLTFLoader}=await import('../public/vendor/three/examples/jsm/loaders/GLTFLoader.js');globalThis.self=globalThis;globalThis.ProgressEvent=class{constructor(type,detail){Object.assign(this,{type},detail);}};
import {moldOptionName} from '../public/mold-collections.js';
test('all 17 supplied kits have unique IDs and the requested catalog hierarchy',()=>{assert.equal(pack.length,17);assert.equal(new Set(pack.map(e=>e.descriptor.id)).size,17);for(const {descriptor:d}of pack){assert.ok(['RAGLAN','NORMAL'].includes(d.modeling));assert.equal(d.bottomParts,2);assert.equal(d.category,'conjunto');assert.equal(d.catalogPath[0],'KIT');assert.equal(d.catalogPath.at(-1),'CALÇÃO 2 PARTES');assert.ok(!moldOptionName(d).includes('calção sem recorte'));assert.ok(INSTALLED_TEMPLATES.some(e=>e.descriptor.id===d.id));}});
for(const entry of pack)test(entry.descriptor.id+' preserves source cloth geometry with an exact nonoverlapping drawing atlas',async()=>{
 const d=entry.descriptor,root=new URL('../public/assets/molds/'+d.id+'/',import.meta.url),source=await readFile(new URL('source.glb',root)),model=await readFile(new URL('model.glb',root)),a=readGlb(source),b=readGlb(model);
 const loaded=await new GLTFLoader().parseAsync(model.buffer.slice(model.byteOffset,model.byteOffset+model.byteLength),'');let meshes=0;loaded.scene.traverse(o=>{if(o.isMesh){meshes++;assert.ok(o.geometry.attributes.position.count>0);assert.ok(o.geometry.attributes.normal);}});assert.equal(meshes,d.primitives.length);
 assert.equal(createHash('sha256').update(source).digest('hex'),d.sourceSha256);assert.equal(d.panels.length,d.panelCount);assert.equal(d.panels.filter(p=>p.label.startsWith('Calção ')).length,2);assert.ok(!a.json.meshes.some(m=>/head_|avatar/i.test(m.name)));assert.equal(a.json.images,undefined);
 for(const p of d.panels){const sourcePrim=a.json.meshes[p.mesh].primitives[p.primitive],targetPrim=b.json.meshes[p.mesh].primitives[p.primitive];for(const key of ['POSITION','NORMAL'])assert.deepEqual(readAccessor(a.json,a.binary,sourcePrim.attributes[key]).data,readAccessor(b.json,b.binary,targetPrim.attributes[key]).data);assert.deepEqual(readAccessor(a.json,a.binary,sourcePrim.indices).data,readAccessor(b.json,b.binary,targetPrim.indices).data);assert.deepEqual(readAccessor(a.json,a.binary,sourcePrim.attributes.TEXCOORD_0).data,readAccessor(b.json,b.binary,targetPrim.attributes.TEXCOORD_1).data);
  const uv=readAccessor(b.json,b.binary,targetPrim.attributes.TEXCOORD_0).data,original=readAccessor(b.json,b.binary,targetPrim.attributes.TEXCOORD_1).data;
  for(let i=0;i<uv.length;i+=2){assert.ok(Math.abs(uv[i]*4096-(p.rect.x+(original[i]-p.uvBounds[0])*d.texelsPerUvUnit))<.001);assert.ok(Math.abs(uv[i+1]*4096-(p.rect.y+(original[i+1]-p.uvBounds[1])*d.texelsPerUvUnit))<.001);}
  assert.ok(p.rect.x>=0&&p.rect.y>=0&&p.rect.x+p.rect.w<=4096&&p.rect.y+p.rect.h<=4096);
 }
 for(let i=0;i<d.panels.length;i++)for(let j=i+1;j<d.panels.length;j++){const x=d.panels[i].rect,y=d.panels[j].rect;assert.ok(x.x+x.w<=y.x||y.x+y.w<=x.x||x.y+x.h<=y.y||y.y+y.h<=x.y,'overlapping panels');}
 const svg=await readFile(new URL('template.svg',root),'utf8');for(const p of d.panels)assert.ok(svg.includes('id="PAINEL_'+p.number+'"'));assert.ok(svg.includes('ARTE_DESENHE_AQUI'));assert.ok(svg.includes('GUIAS_OCULTAR_ANTES_DE_EXPORTAR'));
});
