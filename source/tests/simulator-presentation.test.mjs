import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {DatabaseSync} from 'node:sqlite';
import {createRequire} from 'node:module';
import {migrations} from './migrations.mjs';
import {SimulatorService} from '../lib/simulator-service.mjs';
import {ProjectService} from '../lib/project-service.mjs';
import {TemplateService} from '../lib/template-service.mjs';
import {ProductionService} from '../lib/production-service.mjs';
import {SIMULATOR_PRESENTATION_TEMPLATES} from '../lib/simulator-presentation-templates.mjs';
import {PRESENTATION_LAYOUTS} from '../public/simulador/presentation-layouts.js';
import {readGlb,readAccessor} from '../lib/template-generator.mjs';
import {eliteState} from '../public/simulador/elite.js';
import {layer} from '../public/simulador/core.js';
import {imageCache} from '../public/simulador/paint.js';
import {presentationMap} from '../public/simulador/presentation-bridge.js';
const require=createRequire(import.meta.url),sharp=createRequire(require.resolve('next/package.json'))('sharp');
const owner={userId:'alice'},other={userId:'bob'},manifest=JSON.parse(await readFile(new URL('../public/simulador/models/kit-elite-27.json',import.meta.url),'utf8'));
const previewBytes=await readFile(new URL('./fixtures/simulator-logo.png',import.meta.url)),preview='data:image/png;base64,'+previewBytes.toString('base64');
const mapBytes=await sharp({create:{width:4096,height:4096,channels:4,background:'#e5e5dd'}}).png().toBuffer(),map=new File([mapBytes],'uniforme.png',{type:'image/png'});
const creation=product=>({...eliteState(manifest.panels),product:product||'kit'});
function setup(){
 const sql=new DatabaseSync(':memory:');sql.exec('PRAGMA foreign_keys=ON');for(const m of migrations)sql.exec(m);
 const db={prepare(query){const statement=sql.prepare(query);let args=[];return {bind(...v){args=v;return this;},async first(){return statement.get(...args)||null;},async all(){return {results:statement.all(...args)};},async run(){return {meta:{changes:statement.run(...args).changes}};}};}};
 const objects=new Map(),bucket={async put(k,v,options){objects.set(k,{bytes:typeof v==='string'?v:v.slice(),...options});},async get(k){const value=objects.get(k);return value?{...value,json:async()=>JSON.parse(value.bytes),body:new Blob([value.bytes]).stream()}:null;},async delete(keys){for(const k of Array.isArray(keys)?keys:[keys])objects.delete(k);}};
 const templates=new TemplateService(db,bucket),projects=new ProjectService(db,bucket,templates),production=new ProductionService(db,bucket),simulator=new SimulatorService(db,bucket,production,projects);return {sql,objects,bucket,templates,projects,simulator};
}
test('every presentation vertex retains exact simulator geometry, local UVs and upright placement for kit and separate pieces',{skip:'Historical model deleted at owner request'},async()=>{
 const source=readGlb(await readFile(new URL('../public/simulador/models/kit-elite-27.glb',import.meta.url)));
 for(const entry of SIMULATOR_PRESENTATION_TEMPLATES){
  const layout=Object.values(PRESENTATION_LAYOUTS).find(v=>v.id===entry.descriptor.id),next=readGlb(await readFile(new URL('../public'+entry.assets.model,import.meta.url)));
  assert.equal(next.json.meshes.length,layout.product==='kit'?19:layout.product==='shirt'?13:6);
  for(const [i,mesh]of next.json.meshes.entries()){
   const meta=mesh.extras.labPanel,original=source.json.meshes.find(m=>m.extras.labPanel.id===meta.id),a=original.primitives[0],b=mesh.primitives[0],rect=layout.panels.find(p=>p.id===meta.id).rect;
   assert.ok(layout.product==='kit'||meta.piece===layout.product);
   for(const attr of ['POSITION','NORMAL'])assert.deepEqual(readAccessor(source.json,source.binary,a.attributes[attr]).data,readAccessor(next.json,next.binary,b.attributes[attr]).data);
   assert.deepEqual(readAccessor(source.json,source.binary,a.indices).data,readAccessor(next.json,next.binary,b.indices).data);
   const local=readAccessor(source.json,source.binary,a.attributes.TEXCOORD_0).data,uv=readAccessor(next.json,next.binary,b.attributes.TEXCOORD_0).data;
   assert.deepEqual(readAccessor(next.json,next.binary,b.attributes.TEXCOORD_1).data,local);
   for(let j=0;j<local.length;j+=2){assert.ok(Math.abs(uv[j]*4096-(rect.x+local[j]*rect.w))<.001);assert.ok(Math.abs(uv[j+1]*4096-(rect.y+(1-local[j+1])*rect.h))<.001);}
   assert.equal(entry.descriptor.primitives[i].key,`m${i}p0`);
  }
  const rects=layout.panels.map(p=>p.rect);for(const a of rects){assert.ok(a.x>=0&&a.y>=0&&a.x+a.w<=4096&&a.y+a.h<=4096);for(const b of rects)if(a!==b)assert.ok(a.x+a.w<b.x||b.x+b.w<a.x||a.y+a.h<b.y||b.y+b.h<a.y);}
 }
});
test('the bridge waits for uniform fonts and logos and paints only the selected product with the existing layer renderer',async()=>{
 const state=creation('shorts');for(const p of state.panels)p.layers=[];const shorts=state.panels.find(p=>p.id==='short-panel-5');shorts.layers=[layer('text',{text:'00'}),layer('image',{src:preview})];
 const image={width:32,height:24};imageCache.set(preview,image);const calls=[],text=[],destinations=[];let canvasCount=0,fontLoaded=false,logoLoaded=false;
 const context=new Proxy({measureText:()=>({width:120,actualBoundingBoxLeft:60,actualBoundingBoxRight:60,actualBoundingBoxAscent:80,actualBoundingBoxDescent:20}),drawImage:(...args)=>calls.push(args),fillText:t=>text.push(t)},{get:(obj,key)=>key in obj?obj[key]:()=>{}});
 const file=await presentationMap(state,{loadFonts:async()=>{fontLoaded=true;},loadImage:async src=>{assert.equal(src,preview);logoLoaded=true;},canvasFactory:()=>{const atlas=canvasCount++===0;return {getContext:()=>atlas?{clearRect(){},drawImage:(...args)=>{assert.ok(fontLoaded&&logoLoaded);destinations.push(args);}}:context,toBlob:callback=>callback(new Blob(['png']))};}});
 assert.equal(file.type,'image/png');assert.deepEqual(text,['00']);assert.equal(calls[0][0],image);assert.equal(destinations.length,12);assert.equal(state.product,'shorts');assert.ok(destinations.every(args=>args.length===5));imageCache.delete(preview);
});
test('a confirmed design creates a complete private native project and repeated or concurrent clicks reuse it without overwriting edits',{skip:'Historical model deleted at owner request'},async()=>{
 const {simulator,projects,objects,templates}=setup(),saved=await simulator.save(owner,null,{state:creation(),preview});
 const results=await Promise.all([simulator.createPresentation(owner,saved.id,{version:1},map),simulator.createPresentation(owner,saved.id,{version:1},map)]);
 assert.equal(results[0].id,results[1].id);assert.equal((await projects.list(owner)).length,1);const project=results[0];assert.ok(project.hasMap&&project.thumbnailUrl);assert.equal(project.name,saved.title);assert.equal(project.templateId,PRESENTATION_LAYOUTS.kit.id);assert.equal(project.reviewed,false);assert.equal(objects.size,3);
 await assert.rejects(projects.get(other,project.id),{status:404});await assert.rejects(projects.asset(other,project.id,'map'),{status:404});assert.equal((await projects.template(owner,project.id)).panelCount,19);
 assert.ok(!(await templates.catalog(owner)).some(t=>t.id===project.templateId));
 const edited=await projects.save(owner,project.id,{name:'Apresentação personalizada',version:project.version,visuals:{background:'light'}});
 const again=await simulator.createPresentation(owner,saved.id,{version:1},map);assert.equal(again.id,project.id);assert.equal(again.version,edited.version);assert.equal(again.name,'Apresentação personalizada');
 const shared=await projects.share(owner,project.id,true),token=shared.sharePath.split('/').at(-1);assert.equal((await projects.presentation(token)).name,edited.name);
 const next=creation('shirt');next.title='Segundo uniforme';await simulator.save(owner,saved.id,{state:next,preview,version:1});const another=await simulator.createPresentation(owner,saved.id,{version:2},map);assert.notEqual(another.id,project.id);assert.equal(another.templateId,PRESENTATION_LAYOUTS.shirt.id);assert.equal((await projects.get(owner,project.id)).name,edited.name);
});
test('presentation creation rejects other accounts, stale versions, legacy previews and incomplete maps before leaving projects',{skip:'Historical model deleted at owner request'},async()=>{
 const {simulator,projects,objects}=setup(),saved=await simulator.save(owner,null,{state:creation(),preview});
 await assert.rejects(simulator.createPresentation(null,saved.id,{version:1},map),{status:401});await assert.rejects(simulator.createPresentation(other,saved.id,{version:1},map),{status:404});await assert.rejects(simulator.createPresentation(owner,saved.id,{version:2},map),{status:409});
 await assert.rejects(simulator.createPresentation(owner,saved.id,{version:1},new File([previewBytes],'small.png',{type:'image/png'})),{status:400});
 const corrupt=Buffer.from(mapBytes);corrupt[0]=0;await assert.rejects(simulator.createPresentation(owner,saved.id,{version:1},new File([corrupt],'fake.png',{type:'image/png'})),{status:400});assert.equal((await projects.list(owner)).length,0);assert.equal(objects.size,1);
 for(const value of objects.values()){const data=JSON.parse(value.bytes);delete data.state.platformBrand;value.bytes=JSON.stringify(data);}
 await assert.rejects(simulator.createPresentation(owner,saved.id,{version:1},map),{status:409});
});
test('failed uploads leave no empty presentation and a retry succeeds; later simulator and order edits stay independent',{skip:'Historical model deleted at owner request'},async()=>{
 const {simulator,projects,bucket,objects}=setup(),saved=await simulator.save(owner,null,{state:creation('shorts'),preview}),put=bucket.put;
 bucket.put=async(key,...args)=>{if(key.endsWith('/thumbnail'))throw Error('storage unavailable');return put(key,...args);};
 await assert.rejects(simulator.createPresentation(owner,saved.id,{version:1},map));assert.equal((await projects.list(owner)).length,0);assert.equal(objects.size,1);bucket.put=put;
 const project=await simulator.createPresentation(owner,saved.id,{version:1},map),order=await simulator.createOrder(owner,saved.id,{version:1,customer:'Equipe',quantity:5});assert.equal(project.templateId,PRESENTATION_LAYOUTS.shorts.id);assert.equal(order.document.pages[0].products[0].type,'Calção');
 await projects.remove(owner,project.id);const recreated=await simulator.createPresentation(owner,saved.id,{version:1},map);assert.ok(recreated.hasMap);assert.equal((await projects.list(owner)).length,1);
});
