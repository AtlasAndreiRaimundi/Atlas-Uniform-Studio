import {WITHDRAWN_TEMPLATE_IDS,isWithdrawnTemplate} from '../lib/withdrawn-templates.mjs';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFile } from 'node:fs/promises';
import { DatabaseSync } from 'node:sqlite';
import { registerHooks } from 'node:module';
import { generateTemplate, readGlb, readAccessor, TemplateError } from '../lib/template-generator.mjs';
import { TemplateService } from '../lib/template-service.mjs';
import { ProjectService } from '../lib/project-service.mjs';
import { isAdminUser, requireAdminUser } from '../lib/admin-auth.mjs';
import { INSTALLED_TEMPLATES } from '../lib/installed-templates.mjs';
import { prepareBakedGeometry } from '../public/model-panels.js';
registerHooks({resolve(specifier,context,next){if(specifier==='three')return next(new URL('../public/vendor/three/build/three.module.min.js',import.meta.url).href,context);return next(specifier,context);}});
const {GLTFLoader}=await import('../public/vendor/three/examples/jsm/loaders/GLTFLoader.js');
globalThis.self=globalThis;
globalThis.ProgressEvent=class{constructor(type,detail){Object.assign(this,{type},detail);}};
globalThis.createImageBitmap=async blob=>{const data=Buffer.from(await blob.arrayBuffer());return {width:data.readUInt32BE(16),height:data.readUInt32BE(20),close(){}};};
const source=await readFile(new URL('../public/assets/camiseta.glb',import.meta.url));
const generated=await generateTemplate(source,{id:'new-shirt',name:'Camiseta importada',category:'camiseta'});
const admin={userId:'owner-stable-id',fullName:'Andrei Raimundi',email:'owner@example.test'},other={userId:'another-user',fullName:'Andrei Raimundi',email:'owner@example.test'};
import {migrations} from './migrations.mjs';
function setup(installedTemplates=[]){
  const sql=new DatabaseSync(':memory:');for(const migration of migrations)sql.exec(migration);
  const db={prepare(query){const statement=sql.prepare(query);let values=[];return {bind(...args){values=args;return this;},async first(){return statement.get(...values)||null;},async all(){return {results:statement.all(...values)};},async run(){return {meta:{changes:Number(statement.run(...values).changes)}};}};}};
  const objects=new Map(),bucket={async put(key,data,options){objects.set(key,{data,...options});},async get(key){return objects.get(key)||null;},async delete(keys){for(const key of Array.isArray(keys)?keys:[keys])objects.delete(key);}};
  const templates=new TemplateService(db,bucket,admin.userId,installedTemplates),projects=new ProjectService(db,bucket,templates);
  return {sql,db,bucket,objects,templates,projects};
}

async function assertTemplateChoice(templates,projects,catalog,entry){
 const d=entry.descriptor;
 if(isWithdrawnTemplate(d.id)){assert.ok(!catalog.some(t=>t.id===d.id));await assert.rejects(projects.create(other,{name:d.name,templateId:d.id}),{status:404});}
 else {assert.ok(catalog.some(t=>t.id===d.id&&t.category===d.category));const p=await projects.create(other,{name:d.name,templateId:d.id});assert.equal((await projects.template(other,p.id)).id,d.id);}
}

test('KIT EDGE 2027 preserves its prepared exterior geometry and source UVs with 19 separate drawing panels',async()=>{
  const entry=INSTALLED_TEMPLATES.find(item=>item.descriptor.id==='kit-edge-2027');assert.ok(entry);
  const before=readGlb(await readFile(new URL(`../public${entry.assets.source}`,import.meta.url))),model=await readFile(new URL(`../public${entry.assets.model}`,import.meta.url)),after=readGlb(model);
  assert.equal(entry.descriptor.name,'KIT EDGE 2027');assert.equal(entry.descriptor.category,'conjunto');assert.equal(entry.descriptor.panelCount,19);assert.equal(entry.descriptor.triangles,185891);assert.equal(entry.descriptor.vertices,94655);
  const hash=[...new Uint8Array(await crypto.subtle.digest('SHA-256',await readFile(new URL(`../public${entry.assets.source}`,import.meta.url))))].map(b=>b.toString(16).padStart(2,'0')).join('');assert.equal(hash,entry.descriptor.sourceSha256);
  for(let m=0;m<before.json.meshes.length;m++){
    const p=before.json.meshes[m].primitives[0],q=after.json.meshes[m].primitives[0];
    for(const attribute of ['POSITION','NORMAL'])assert.deepEqual(readAccessor(before.json,before.binary,p.attributes[attribute]).data,readAccessor(after.json,after.binary,q.attributes[attribute]).data);
    assert.deepEqual(readAccessor(before.json,before.binary,p.indices).data,readAccessor(after.json,after.binary,q.indices).data);
    const uv=readAccessor(before.json,before.binary,p.attributes.TEXCOORD_0).data,raw=readAccessor(after.json,after.binary,q.attributes.TEXCOORD_1).data,atlas=readAccessor(after.json,after.binary,q.attributes.TEXCOORD_0).data;
    assert.deepEqual(raw,uv);const panel=entry.descriptor.panels.find(part=>part.mesh===m),[minU,minV]=panel.uvBounds;
    for(let i=0;i<atlas.length/2;i++){
      assert.ok(atlas[i*2]>=0&&atlas[i*2]<=1&&atlas[i*2+1]>=0&&atlas[i*2+1]<=1);
      assert.ok(Math.abs(atlas[i*2]*4096-(panel.rect.x+(uv[i*2]-minU)*entry.descriptor.texelsPerUvUnit))<.001);
      assert.ok(Math.abs(atlas[i*2+1]*4096-(panel.rect.y+(uv[i*2+1]-minV)*entry.descriptor.texelsPerUvUnit))<.001);
    }
  }
  const rects=entry.descriptor.panels.map(p=>p.rect);
  for(let a=0;a<rects.length;a++)for(let b=a+1;b<rects.length;b++){const p=rects[a],q=rects[b];assert.ok(p.x+p.w<=q.x||q.x+q.w<=p.x||p.y+p.h<=q.y||q.y+q.h<=p.y);}
  const gltf=await new GLTFLoader().parseAsync(model.buffer.slice(model.byteOffset,model.byteOffset+model.byteLength),'');let count=0;
  gltf.scene.traverse(mesh=>{if(!mesh.isMesh)return;count++;const baked=prepareBakedGeometry(mesh.geometry);assert.equal(baked.atlasUv.count,baked.originalUv.count);});assert.equal(count,19);
});

test('installed molds support normal project selection, admin edits, archive and trash without reappearing or breaking existing projects',async()=>{
  const entry=INSTALLED_TEMPLATES[0],id=entry.descriptor.id,{templates,projects,db,bucket}=setup(INSTALLED_TEMPLATES);
  await assert.rejects(templates.catalog(null),{status:401});await assert.rejects(templates.adminList(other),{status:403});
  assert.equal((await templates.adminList(admin)).filter(t=>t.id===id).length,1);assert.ok((await templates.catalog(other)).some(t=>t.id===id));
  const project=await projects.create(other,{name:'Teste kit',templateId:id});assert.equal((await projects.template(other,project.id)).panelCount,19);
  await assert.rejects(templates.update(other,id,{name:'Outra',category:'conjunto'}),{status:403});
  await templates.update(admin,id,{name:'Kit Edge <2027>',category:'conjunto'});assert.match((await templates.asset(id,'template')).body,/<title>Kit Edge &lt;2027&gt; — mapa de desenho<\/title>/);
  await templates.status(admin,id,{status:'archived'});assert.ok(!(await templates.catalog(other)).some(t=>t.id===id));await assert.rejects(projects.create(other,{name:'Arquivado',templateId:id}),{status:404});
  assert.equal((await projects.template(other,project.id)).id,id);assert.deepEqual(await projects.asset(other,project.id,'model'),{redirect:entry.assets.model});
  await templates.remove(admin,id);const reopened=new TemplateService(db,bucket,admin.userId,INSTALLED_TEMPLATES);assert.equal((await reopened.adminList(admin)).find(t=>t.id===id).status,'deleted');assert.ok(!(await reopened.catalog(other)).some(t=>t.id===id));
  await reopened.restore(admin,id);assert.equal((await reopened.adminList(admin)).find(t=>t.id===id).status,'draft');
  await reopened.status(admin,id,{status:'published',confirmed:true});assert.equal((await reopened.catalog(other)).find(t=>t.id===id).name,'Kit Edge <2027>');assert.equal((await reopened.catalog(other)).filter(t=>t.id===id).length,1);
});

test('the organized Edge map follows the supplied panel names and group order while preserving geometry and the previous atlas',async()=>{
  const current=INSTALLED_TEMPLATES.find(item=>item.descriptor.id==='kit-edge-2027-mapa-v2'),legacy=INSTALLED_TEMPLATES.find(item=>item.descriptor.id==='kit-edge-2027');assert.ok(current&&legacy);
  const d=current.descriptor,labels={18:'Frente',19:'Costas',17:'Recorte esquerdo',16:'Recorte direito',15:'Manga direita',14:'Manga esquerda',4:'Cós do calção',1:'Cós do calção',2:'Cós do calção',3:'Cós do calção',11:'Gola',10:'Gola',9:'Gola',12:'Gola',13:'Gola',8:'Filete de manga',7:'Filete de manga',5:'Calção',6:'Calção'};
  for(const [number,label] of Object.entries(labels))assert.equal(d.panels.find(p=>p.number===Number(number)).label,label);
  assert.deepEqual(d.layoutGroups.map(g=>g.panels),[[18,19,17,16],[11,10,9,12,13],[15,14,8,7],[5,6,4,1,2,3]]);
  const panel=n=>d.panels.find(p=>p.number===n),top=ns=>Math.min(...ns.map(n=>panel(n).rect.y)),bottom=ns=>Math.max(...ns.map(n=>panel(n).rect.y+panel(n).rect.h));
  assert.ok(panel(11).rect.x>panel(16).rect.x+panel(16).rect.w);assert.ok(top([15,14,8,7])>bottom([18,19,17,16,11,10,9,12,13]));assert.ok(top([5,6,4,1,2,3])>bottom([15,14,8,7]));
  const old=readGlb(await readFile(new URL(`../public${legacy.assets.model}`,import.meta.url))),model=await readFile(new URL(`../public${current.assets.model}`,import.meta.url)),next=readGlb(model);let changed=0;
  for(const p of d.panels){
    const a=old.json.meshes[p.mesh].primitives[p.primitive],b=next.json.meshes[p.mesh].primitives[p.primitive];
    for(const attribute of ['POSITION','NORMAL','TEXCOORD_1'])assert.deepEqual(readAccessor(old.json,old.binary,a.attributes[attribute]).data,readAccessor(next.json,next.binary,b.attributes[attribute]).data);
    assert.deepEqual(readAccessor(old.json,old.binary,a.indices).data,readAccessor(next.json,next.binary,b.indices).data);
    const raw=readAccessor(next.json,next.binary,b.attributes.TEXCOORD_1).data,atlas=readAccessor(next.json,next.binary,b.attributes.TEXCOORD_0).data,previousUv=readAccessor(old.json,old.binary,a.attributes.TEXCOORD_0).data;
    if(atlas.some((value,index)=>value!==previousUv[index]))changed++;
    for(let i=0;i<atlas.length/2;i++){
      assert.ok(Math.abs(atlas[i*2]*4096-(p.rect.x+(raw[i*2]-p.uvBounds[0])*d.texelsPerUvUnit))<.001);
      assert.ok(Math.abs(atlas[i*2+1]*4096-(p.rect.y+(raw[i*2+1]-p.uvBounds[1])*d.texelsPerUvUnit))<.001);
    }
    assert.ok(p.rect.x>=100&&p.rect.x+p.rect.w<=3996&&p.rect.y>=240&&p.rect.y+p.rect.h<=3996);
  }
  assert.equal(changed,19);assert.equal(legacy.status,'archived');assert.equal(current.status,'archived');
  const rects=d.panels.map(p=>p.rect);for(let i=0;i<rects.length;i++)for(let j=i+1;j<rects.length;j++){const a=rects[i],b=rects[j];assert.ok(a.x+a.w<=b.x||b.x+b.w<=a.x||a.y+a.h<=b.y||b.y+b.h<=a.y);}
  const gltf=await new GLTFLoader().parseAsync(model.buffer.slice(model.byteOffset,model.byteOffset+model.byteLength),'');let meshes=0;gltf.scene.traverse(mesh=>{if(mesh.isMesh){meshes++;const association=gltf.parser.associations.get(mesh),entry=d.primitives.find(p=>p.key===`m${association.meshes??0}p${association.primitives}`);assert.ok(entry);assert.equal(next.json.meshes[entry.mesh].name,entry.displayName);prepareBakedGeometry(mesh.geometry);}});assert.equal(meshes,19);
  const {db,bucket,templates}=setup(INSTALLED_TEMPLATES),oldTemplates=new TemplateService(db,bucket,admin.userId,[{...legacy,status:'published'}]),oldProjects=new ProjectService(db,bucket,oldTemplates),oldProject=await oldProjects.create(other,{name:'Arte no mapa anterior',templateId:legacy.descriptor.id});
  const updatedProjects=new ProjectService(db,bucket,templates),existing=await updatedProjects.template(other,oldProject.id);assert.deepEqual(existing.panels,legacy.descriptor.panels);assert.deepEqual(await updatedProjects.asset(other,oldProject.id,'model'),{redirect:legacy.assets.model});
  const active=INSTALLED_TEMPLATES.find(entry=>entry.status==='published');assert.deepEqual((await templates.catalog(other)).filter(t=>t.category==='conjunto'&&t.id.startsWith('kit-edge-2027')).map(t=>t.id),[active.descriptor.id]);
  const project=await updatedProjects.create(other,{name:'Mapa organizado',templateId:active.descriptor.id});assert.deepEqual((await updatedProjects.template(other,project.id)).panels,active.descriptor.panels);
});

test('matching sleeve trim sizes changes only panel 7 atlas mapping and keeps every 3D surface and saved atlas intact',async()=>{
  const current=INSTALLED_TEMPLATES.find(entry=>entry.descriptor.id==='kit-edge-2027-mapa-v3'),previous=INSTALLED_TEMPLATES.find(entry=>entry.descriptor.id==='kit-edge-2027-mapa-v2');assert.ok(current&&previous);
  const p7=current.descriptor.panels.find(p=>p.number===7),p8=current.descriptor.panels.find(p=>p.number===8);assert.equal(p7.rect.w,p8.rect.w);assert.equal(p7.rect.h,p8.rect.h);assert.equal(p7.matchedToPanel,8);
  const before=readGlb(await readFile(new URL(`../public${previous.assets.model}`,import.meta.url))),bytes=await readFile(new URL(`../public${current.assets.model}`,import.meta.url)),after=readGlb(bytes);
  for(const panel of current.descriptor.panels){
    const a=before.json.meshes[panel.mesh].primitives[panel.primitive],b=after.json.meshes[panel.mesh].primitives[panel.primitive];
    for(const attr of ['POSITION','NORMAL','TEXCOORD_1'])assert.deepEqual(readAccessor(before.json,before.binary,a.attributes[attr]).data,readAccessor(after.json,after.binary,b.attributes[attr]).data);
    assert.deepEqual(readAccessor(before.json,before.binary,a.indices).data,readAccessor(after.json,after.binary,b.indices).data);
    const oldUv=readAccessor(before.json,before.binary,a.attributes.TEXCOORD_0).data,atlas=readAccessor(after.json,after.binary,b.attributes.TEXCOORD_0).data;
    if(panel.number!==7){assert.deepEqual(atlas,oldUv);assert.deepEqual(panel,previous.descriptor.panels.find(p=>p.number===panel.number));continue;}
    assert.notDeepEqual(atlas,oldUv);const source=readAccessor(after.json,after.binary,b.attributes.TEXCOORD_1).data;
    for(let i=0;i<atlas.length/2;i++){
      assert.ok(Math.abs(atlas[i*2]*4096-(panel.rect.x+(source[i*2]-panel.uvBounds[0])*panel.atlasScale.x))<.001);
      assert.ok(Math.abs(atlas[i*2+1]*4096-(panel.rect.y+(source[i*2+1]-panel.uvBounds[1])*panel.atlasScale.y))<.001);
    }
    const us=Array.from({length:atlas.length/2},(_,i)=>atlas[i*2]*4096),vs=Array.from({length:atlas.length/2},(_,i)=>atlas[i*2+1]*4096);assert.ok(Math.abs(Math.max(...us)-Math.min(...us)-p8.rect.w)<.001);assert.ok(Math.abs(Math.max(...vs)-Math.min(...vs)-p8.rect.h)<.001);
  }
  const rects=current.descriptor.panels.map(p=>p.rect);for(let i=0;i<rects.length;i++)for(let j=i+1;j<rects.length;j++){const a=rects[i],b=rects[j];assert.ok(a.x+a.w<=b.x||b.x+b.w<=a.x||a.y+a.h<=b.y||b.y+b.h<=a.y);}
  const gltf=await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');let meshes=0;gltf.scene.traverse(mesh=>{if(mesh.isMesh){meshes++;prepareBakedGeometry(mesh.geometry);}});assert.equal(meshes,19);
  const {db,bucket,templates}=setup(INSTALLED_TEMPLATES),oldTemplates=new TemplateService(db,bucket,admin.userId,[{...previous,status:'published'}]),oldProjects=new ProjectService(db,bucket,oldTemplates),oldProject=await oldProjects.create(other,{name:'Arte anterior nos filetes',templateId:previous.descriptor.id}),projects=new ProjectService(db,bucket,templates);
  assert.deepEqual((await projects.template(other,oldProject.id)).panels,previous.descriptor.panels);assert.deepEqual(await projects.asset(other,oldProject.id,'model'),{redirect:previous.assets.model});
  assert.deepEqual((await templates.catalog(other)).filter(t=>t.category==='conjunto'&&t.id.startsWith('kit-edge-2027')).map(t=>t.id),[current.descriptor.id]);
});
function tinyGlb(change=()=>{}){
  const position=new Float32Array([0,0,0,1,0,0,0,1,0,2,0,0,3,0,0,2,1,0]),uv=new Float32Array([0,0,1,0,0,1,0,0,1,0,0,1]);
  const binary=new Uint8Array(position.byteLength+uv.byteLength);binary.set(new Uint8Array(position.buffer));binary.set(new Uint8Array(uv.buffer),position.byteLength);
  const json={asset:{version:'2.0'},scene:0,scenes:[{nodes:[0]}],nodes:[{mesh:0}],meshes:[{primitives:[{attributes:{POSITION:0,TEXCOORD_0:1}}]}],buffers:[{byteLength:binary.length}],bufferViews:[{buffer:0,byteOffset:0,byteLength:position.byteLength},{buffer:0,byteOffset:position.byteLength,byteLength:uv.byteLength}],accessors:[{bufferView:0,componentType:5126,count:6,type:'VEC3'},{bufferView:1,componentType:5126,count:6,type:'VEC2'}]};change(json);
  const text=new TextEncoder().encode(JSON.stringify(json)),size=Math.ceil(text.length/4)*4,out=new Uint8Array(28+size+binary.length),v=new DataView(out.buffer);v.setUint32(0,0x46546c67,true);v.setUint32(4,2,true);v.setUint32(8,out.length,true);v.setUint32(12,size,true);v.setUint32(16,0x4e4f534a,true);out.fill(32,20,20+size);out.set(text,20);v.setUint32(20+size,binary.length,true);v.setUint32(24+size,0x004e4942,true);out.set(binary,28+size);return out;
}

test('the uploaded CLO model generates all 10 panels and the 1,739 exact boundary vertices',()=>{
  assert.equal(generated.descriptor.panelCount,10);assert.equal(generated.descriptor.triangles,71405);
  assert.equal(generated.descriptor.panels.reduce((n,p)=>n+p.contourVertices,0),1739);
  assert.match(generated.svg,/id="ARTE_DESENHE_AQUI"/);assert.match(generated.svg,/id="GUIAS_OCULTAR_ANTES_DE_EXPORTAR"/);
});

test('registration preserves every original position, index and UV while the new atlas matches the drawing',()=>{
  const original=readGlb(source),processed=readGlb(generated.model),scale=generated.descriptor.texelsPerUvUnit;
  for(let m=0;m<original.json.meshes.length;m++)for(let p=0;p<original.json.meshes[m].primitives.length;p++){
    const before=original.json.meshes[m].primitives[p],after=processed.json.meshes[m].primitives[p];
    for(const attribute of ['POSITION','NORMAL'])assert.deepEqual(readAccessor(original.json,original.binary,before.attributes[attribute]).data,readAccessor(processed.json,processed.binary,after.attributes[attribute]).data);
    assert.deepEqual(readAccessor(original.json,original.binary,before.indices).data,readAccessor(processed.json,processed.binary,after.indices).data);
    const raw=readAccessor(original.json,original.binary,before.attributes.TEXCOORD_0).data,saved=readAccessor(processed.json,processed.binary,after.attributes.TEXCOORD_1).data,atlas=readAccessor(processed.json,processed.binary,after.attributes.TEXCOORD_0).data;
    assert.deepEqual(raw,saved);
    const panel=generated.descriptor.panels.find(part=>part.mesh===m&&part.primitive===p),[minU,minV]=panel.uvBounds;
    for(let i=0;i<atlas.length/2;i++){
      assert.ok(atlas[i*2]>=0&&atlas[i*2]<=1&&atlas[i*2+1]>=0&&atlas[i*2+1]<=1);
      assert.ok(Math.abs(atlas[i*2]*4096-(panel.rect.x+(raw[i*2]-minU)*scale))<.001);
      assert.ok(Math.abs(atlas[i*2+1]*4096-(panel.rect.y+(raw[i*2+1]-minV)*scale))<.001);
    }
  }
  const panels=generated.descriptor.panels;
  for(let i=0;i<panels.length;i++)for(let j=i+1;j<panels.length;j++){
    const a=panels[i].rect,b=panels[j].rect;
    assert.ok(a.x+a.w<=b.x||b.x+b.w<=a.x||a.y+a.h<=b.y||b.y+b.h<=a.y,'Panel rectangles must not overlap.');
  }
});

test('the generated GLB loads with the same viewer loader and retains source fabric UVs in UV1',async()=>{
  const gltf=await new GLTFLoader().parseAsync(generated.model.buffer,'');let meshes=0;
  gltf.scene.traverse(mesh=>{if(!mesh.isMesh)return;meshes++;const association=gltf.parser.associations.get(mesh);assert.ok(generated.descriptor.primitives.some(p=>p.key===`m${association.meshes??0}p${association.primitives}`));const before=mesh.geometry.attributes.uv.array.slice(),raw=mesh.geometry.attributes.uv1.array.slice(),prepared=prepareBakedGeometry(mesh.geometry);assert.deepEqual(prepared.atlasUv.array,before);assert.deepEqual(prepared.originalUv.array,raw);});
  assert.equal(meshes,10);
});

test('separate overlapping UV islands inside a single primitive get independent atlas regions',async()=>{
  const result=await generateTemplate(tinyGlb());assert.equal(result.descriptor.panelCount,2);assert.equal(result.descriptor.primitives.length,1);
  const parsed=readGlb(result.model),uv=readAccessor(parsed.json,parsed.binary,parsed.json.meshes[0].primitives[0].attributes.TEXCOORD_0).data;
  assert.notEqual(uv[0],uv[6]);assert.equal(result.descriptor.primitives[0].islandCount,2);
});

test('missing UVs, corrupt files, outside resources and unsupported compressed geometry are rejected',async()=>{
  await assert.rejects(generateTemplate(tinyGlb(j=>delete j.meshes[0].primitives[0].attributes.TEXCOORD_0)),/sem UVs/);
  await assert.rejects(generateTemplate(new Uint8Array(40)),TemplateError);
  await assert.rejects(generateTemplate(tinyGlb(j=>{j.images=[{uri:'https://example.test/texture.png'}];})),/Incorpore/);
  await assert.rejects(generateTemplate(tinyGlb(j=>{j.extensionsUsed=['KHR_draco_mesh_compression'];})),/compressão/);
  await assert.rejects(generateTemplate(tinyGlb(j=>{j.accessors[1].count=1000000;})),TemplateError);
  const escaped=await generateTemplate(tinyGlb(),{name:'<script>alert(1)</script>'});assert.ok(!escaped.svg.includes('<script>'));assert.ok(escaped.svg.includes('&lt;script&gt;'));
});


test('folded or overlapping UVs inside one connected panel are rejected instead of producing an ambiguous drawing',async()=>{
  const bytes=tinyGlb(),parsed=readGlb(bytes);
  new Float32Array(parsed.binary.buffer,parsed.binary.byteOffset,18).set([0,0,0,1,0,0,0,1,0,0,1,0,1,0,0,1,1,0]);
  new Float32Array(parsed.binary.buffer,parsed.binary.byteOffset+72,12).set([0,0,1,0,0,1,0,1,1,0,0,0]);
  await assert.rejects(generateTemplate(bytes),/sobrepostos|dobrados/);
});

test('administrator privileges depend on the configured stable identity and cannot be claimed by email, name or role',()=>{
  assert.equal(isAdminUser(admin,admin.userId),true);assert.equal(isAdminUser(other,admin.userId),false);assert.equal(isAdminUser(admin,''),false);
  assert.throws(()=>requireAdminUser(null,admin.userId),{status:401});assert.throws(()=>requireAdminUser({...other,isAdmin:true},admin.userId),{status:403});
});

test('only the admin can upload, list drafts, publish, archive or download draft models',async()=>{
  const {templates,objects}=setup(),file=new File([source],'camiseta.glb',{type:'model/gltf-binary'}),input={name:'Novo modelo',category:'camiseta'};
  await assert.rejects(templates.create(other,input,file),{status:403});assert.equal(objects.size,0);
  const draft=await templates.create(admin,input,file);assert.equal(draft.status,'draft');assert.equal(objects.size,4);
  assert.equal((await templates.catalog(other)).length,1);
  await assert.rejects(templates.readable(other,draft.id),{status:404});await assert.rejects(templates.adminList(other),{status:403});
  await assert.rejects(templates.status(other,draft.id,{status:'published',confirmed:true}),{status:403});
  await assert.rejects(templates.status(admin,draft.id,{status:'published'}),{status:400});
  await templates.status(admin,draft.id,{status:'published',confirmed:true});assert.equal((await templates.catalog(other)).length,2);
  await assert.rejects(templates.status(other,draft.id,{status:'archived'}),{status:403});
});

test('new projects bind to the chosen published model; archiving keeps saved projects and client presentations usable',async()=>{
  const {templates,projects}=setup(),file=new File([source],'camiseta.glb',{type:'model/gltf-binary'});
  const draft=await templates.create(admin,{name:'Outro corte',category:'camiseta'},file);
  await assert.rejects(projects.create(other,{name:'Draft selection',templateId:draft.id}),{status:404});
  await templates.status(admin,draft.id,{status:'published',confirmed:true});
  const p=await projects.create(other,{name:'Cliente B',templateId:draft.id});assert.equal(p.templateId,draft.id);
  const descriptor=await projects.template(other,p.id);assert.equal(descriptor.kind,'generated');assert.equal(descriptor.modelUrl,`/api/projects/${p.id}/assets/model`);
  const image=new File([await readFile(new URL('../public/assets/mapa-conferencia.png',import.meta.url))],'arte.png',{type:'image/png'});
  await projects.save(other,p.id,{name:p.name,version:1},image);
  const shared=await projects.share(other,p.id,true),token=shared.sharePath.split('/').at(-1);
  assert.ok((await projects.asset(null,null,'model',token)).data.length);
  const publicDescriptor=await projects.template(null,null,token);assert.equal(publicDescriptor.templateUrl,null);assert.equal(publicDescriptor.proofUrl,null);
  await assert.rejects(projects.asset(null,null,'template',token),{status:404});
  await templates.status(admin,draft.id,{status:'archived'});
  assert.equal((await templates.catalog(other)).length,1);
  assert.ok((await projects.asset(null,null,'model',token)).data.length);
  assert.equal((await projects.template(other,p.id)).id,draft.id);
  await assert.rejects(projects.create(other,{name:'No new project',templateId:draft.id}),{status:404});
  await assert.rejects(projects.asset(admin,p.id,'model'),{status:404});
});

test('failed registrations clean uploaded files and leave the existing approved template untouched',async()=>{
  const {templates,db,bucket,objects}=setup();
  const failing=new TemplateService({prepare(query){if(query.startsWith('INSERT INTO templates'))throw new Error('Write failed');return db.prepare(query);}},bucket,admin.userId);
  await assert.rejects(failing.create(admin,{name:'Falha',category:'camiseta'},new File([source],'modelo.glb')),/Write failed/);assert.equal(objects.size,0);
  assert.equal((await templates.catalog(admin)).length,1);
  assert.equal((await templates.descriptor('camiseta-teste-clo-v1')).kind,'builtin');
});

test('only the administrator edits metadata; renaming updates descriptors and SVG without changing the atlas',async()=>{
  const {templates,objects}=setup();
  const draft=await templates.create(admin,{name:'Nome antigo',category:'camiseta'},new File([source],'modelo.glb'));
  const before=await templates.descriptor(draft.id),model=await templates.asset(draft.id,'model');
  await assert.rejects(templates.update(other,draft.id,{name:'Outro',category:'camiseta'}),{status:403});
  const renamed=await templates.update(admin,draft.id,{name:'Novo <nome> $&',category:'conjunto',orientation:{front:'-z'}});
  assert.equal(renamed.name,'Novo <nome> $&');assert.equal(renamed.category,'conjunto');assert.equal(renamed.status,'draft');
  const after=await templates.descriptor(draft.id);assert.deepEqual(after.panels,before.panels);assert.deepEqual(after.orientation,before.orientation);
  assert.equal(await templates.asset(draft.id,'model'),model);assert.equal(objects.size,4);
  const svg=await templates.asset(draft.id,'template');assert.ok(svg.data.includes('Novo &lt;nome&gt; $&amp;'));assert.ok(!svg.data.includes('Nome antigo'));
  await assert.rejects(templates.update(admin,draft.id,{name:' ',category:'camiseta'}),{status:400});
});

test('deleted molds leave the catalog, retain saved project assets, and can be restored',async()=>{
  const {templates,projects,objects}=setup();
  const draft=await templates.create(admin,{name:'Meu molde',category:'camiseta'},new File([source],'modelo.glb'));
  await templates.status(admin,draft.id,{status:'published',confirmed:true});
  const project=await projects.create(other,{name:'Pedido existente',templateId:draft.id});
  await assert.rejects(templates.remove(other,draft.id),{status:403});
  await templates.remove(admin,draft.id);assert.equal(objects.size,4);
  assert.equal((await templates.catalog(other)).length,1);
  assert.ok((await projects.asset(other,project.id,'model')).data.length);
  assert.equal((await projects.template(other,project.id)).id,draft.id);
  await assert.rejects(templates.available(other,draft.id),{status:404});
  await assert.rejects(templates.status(admin,draft.id,{status:'published',confirmed:true}),{status:400});
  await assert.rejects(templates.restore(other,draft.id),{status:403});
  assert.equal((await templates.restore(admin,draft.id)).status,'draft');
  assert.equal((await templates.adminList(admin)).find(t=>t.id===draft.id).status,'draft');
});

test('the original mold supports rename and reversible deletion without touching its original geometry',async()=>{
  const {templates,projects,objects}=setup(),id='camiseta-teste-clo-v1';
  const p=await projects.create(other,{name:'Molde original',templateId:id});
  await templates.update(admin,id,{name:'Minha camiseta original',category:'camiseta'});
  assert.equal((await templates.catalog(other))[0].name,'Minha camiseta original');
  assert.equal((await templates.descriptor(id)).kind,'builtin');
  await templates.remove(admin,id);assert.deepEqual(await templates.catalog(other),[]);
  await assert.rejects(templates.available(other,id),{status:404});
  assert.equal((await projects.template(other,p.id)).kind,'builtin');
  assert.equal((await templates.asset(id,'model')).redirect,'/assets/camiseta.glb');
  assert.equal((await templates.restore(admin,id)).status,'published');assert.equal(objects.size,0);
});

test('twelve order molds preserve cloth geometry, original UVs and scene transforms, with distinct non-overlapping named maps',async()=>{
 const {ORDER_MOLD_TEMPLATES}=await import('../lib/order-mold-templates.mjs');assert.equal(ORDER_MOLD_TEMPLATES.length,12);
 const {templates,projects}=setup(INSTALLED_TEMPLATES),catalog=await templates.catalog(other);
 for(const entry of ORDER_MOLD_TEMPLATES){
  const d=entry.descriptor,sourceBytes=await readFile(new URL(`../public${entry.assets.source}`,import.meta.url)),modelBytes=await readFile(new URL(`../public${entry.assets.model}`,import.meta.url)),before=readGlb(sourceBytes),after=readGlb(modelBytes);
  await assertTemplateChoice(templates,projects,catalog,entry);
  assert.equal(Buffer.from(await crypto.subtle.digest('SHA-256',sourceBytes)).toString('hex'),d.sourceSha256);
  assert.deepEqual(after.json.nodes,JSON.parse(JSON.stringify(before.json.nodes)));assert.equal(after.json.meshes.length,before.json.meshes.length);assert.ok(!after.json.images?.length);assert.equal(d.panels.length,d.panelCount);
  for(const p of d.panels){const a=before.json.meshes[p.mesh].primitives[p.primitive],b=after.json.meshes[p.mesh].primitives[p.primitive];assert.ok(p.label&&p.group);for(const key of ['POSITION','NORMAL'])assert.deepEqual(readAccessor(before.json,before.binary,a.attributes[key]).data,readAccessor(after.json,after.binary,b.attributes[key]).data);assert.deepEqual(readAccessor(before.json,before.binary,a.indices).data,readAccessor(after.json,after.binary,b.indices).data);
   const uv=readAccessor(before.json,before.binary,a.attributes.TEXCOORD_0).data,raw=readAccessor(after.json,after.binary,b.attributes.TEXCOORD_1).data,atlas=readAccessor(after.json,after.binary,b.attributes.TEXCOORD_0).data;assert.deepEqual(uv,raw);
   for(let i=0;i<uv.length/2;i++){assert.ok(Math.abs(atlas[i*2]*4096-(p.rect.x+(uv[i*2]-p.uvBounds[0])*d.texelsPerUvUnit))<.001);assert.ok(Math.abs(atlas[i*2+1]*4096-(p.rect.y+(uv[i*2+1]-p.uvBounds[1])*d.texelsPerUvUnit))<.001);}
   assert.ok(p.rect.x>=0&&p.rect.y>=0&&p.rect.x+p.rect.w<=4096&&p.rect.y+p.rect.h<=4096);
  }
  for(let i=0;i<d.panels.length;i++)for(let j=i+1;j<d.panels.length;j++){const a=d.panels[i].rect,b=d.panels[j].rect;assert.ok(a.x+a.w<=b.x||b.x+b.w<=a.x||a.y+a.h<=b.y||b.y+b.h<=a.y);}
  const gltf=await new GLTFLoader().parseAsync(modelBytes.buffer.slice(modelBytes.byteOffset,modelBytes.byteOffset+modelBytes.byteLength),'');let cloth=0,decorations=0;gltf.scene.traverse(mesh=>{if(!mesh.isMesh)return;const a=gltf.parser.associations.get(mesh),p=d.primitives.find(p=>p.key===`m${a.meshes??0}p${a.primitives}`);assert.ok(p);if(p.decorativeOnly)decorations++;else {cloth++;prepareBakedGeometry(mesh.geometry);}});assert.equal(cloth,d.panelCount);assert.equal(decorations,d.id.startsWith('polo')?6:d.id==='kit-passeio-prime'?2:0);
  assert.match(entry.templateSvg,/ARTE_DESENHE_AQUI/);assert.match(entry.templateSvg,/GUIAS_OCULTAR_ANTES_DE_EXPORTAR/);
 }
 const simulator=await readFile(new URL('../public/simulator-catalog.js',import.meta.url),'utf8').catch(()=> '');for(const e of ORDER_MOLD_TEMPLATES)assert.ok(!simulator.includes(`/assets/molds/${e.descriptor.id}/`));
});

test('each original kit retains its available shirt-only presentation, map, framing and project binding',async()=>{
 const {SHIRT_PRESENTATION_TEMPLATES}=await import('../lib/shirt-presentation-templates.mjs'),{selectPresentationGarments}=await import('../public/model-panels.js'),{Box3,Vector3}=await import('three');
 const kits=INSTALLED_TEMPLATES.filter(e=>e.status==='published'&&e.descriptor.category==='conjunto'&&!e.descriptor.compositionVersion);assert.equal(SHIRT_PRESENTATION_TEMPLATES.length,kits.length);
 const {templates,projects}=setup(INSTALLED_TEMPLATES);for(const kit of kits){const shirt=SHIRT_PRESENTATION_TEMPLATES.find(e=>e.descriptor.baseTemplateId===kit.descriptor.id);assert.ok(shirt);const d=shirt.descriptor;assert.equal(d.category,'camiseta');assert.ok(d.panels.every(p=>p.group!=='CALCAO_E_COS'));assert.ok(d.panels.length<kit.descriptor.panels.length);assert.ok(!shirt.templateSvg.includes('id="CALCAO_E_COS"'));
  const project=await projects.create(other,{name:d.name,templateId:d.id});assert.equal((await projects.template(other,project.id)).id,d.id);assert.equal((await projects.template(other,project.id)).category,'camiseta');
  const b=await readFile(new URL(`../public${shirt.assets.model}`,import.meta.url)),g=await new GLTFLoader().parseAsync(b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength),'');const height=new Box3().setFromObject(g.scene).getSize(new Vector3()).y;selectPresentationGarments(g.scene,g.parser.associations,d);let count=0;g.scene.traverse(mesh=>{if(!mesh.isMesh)return;count++;const a=g.parser.associations.get(mesh);assert.ok(!d.excludedPrimitiveKeys.includes(`m${a.meshes}p${a.primitives}`));const entry=d.primitives.find(p=>p.key===`m${a.meshes}p${a.primitives}`);if(!entry.decorativeOnly)prepareBakedGeometry(mesh.geometry);});assert.equal(count,d.primitives.length);assert.ok(new Box3().setFromObject(g.scene).getSize(new Vector3()).y<height);
  for(const p of d.panels)assert.deepEqual(p,kit.descriptor.panels.find(q=>q.number===p.number));
 }
});

test('switching project molds is owned, versioned, publication-checked and clears incompatible artwork atomically',async()=>{
 const {templates,projects,objects,db,bucket}=setup(INSTALLED_TEMPLATES),a='kit-elite-27',b=a+'-camiseta',c='kit-raglan-basico';
 let p=await projects.create(other,{name:'Troca ao vivo',templateId:a});const art=new File([await readFile(new URL('../public/assets/mapa-conferencia.png',import.meta.url))],'arte.png',{type:'image/png'});
 p=await projects.save(other,p.id,{name:p.name,version:p.version},art,art);const original=p.mapUrl;assert.equal(objects.size,2);p=await projects.review(other,p.id,p.version);
 await assert.rejects(projects.save(admin,p.id,{name:p.name,version:p.version,templateId:b}),{status:404});
 p=await projects.save(other,p.id,{name:p.name,version:p.version,templateId:b});assert.equal(p.templateId,b);assert.ok(p.hasMap);assert.equal(p.reviewed,false);assert.equal(p.thumbnailUrl,null);assert.equal(objects.size,1);assert.equal((await projects.template(other,p.id)).category,'camiseta');
 await assert.rejects(projects.save(other,p.id,{name:p.name,version:p.version-1,templateId:c}),{status:409});assert.equal((await projects.get(other,p.id)).templateId,b);
 await templates.status(admin,c,{status:'archived'});await assert.rejects(projects.save(other,p.id,{name:p.name,version:p.version,templateId:c}),{status:404});await templates.status(admin,c,{status:'published',confirmed:true});
 const failing=new ProjectService({prepare(q){if(q.startsWith('UPDATE projects SET'))throw Error('Database unavailable');return db.prepare(q);}},bucket,templates);
 await assert.rejects(failing.save(other,p.id,{name:p.name,version:p.version,templateId:c},art,art),/Database unavailable/);assert.equal(objects.size,1);assert.equal((await projects.get(other,p.id)).templateId,b);
 p=await projects.save(other,p.id,{name:p.name,version:p.version,templateId:c});assert.equal(p.templateId,c);assert.equal(p.hasMap,false);assert.equal(p.mapName,null);assert.equal(p.thumbnailUrl,null);assert.equal(objects.size,0);
 p=await projects.save(other,p.id,{name:p.name,version:p.version,templateId:a},art,art);assert.equal(p.templateId,a);assert.ok(p.hasMap&&p.thumbnailUrl);assert.equal(objects.size,2);
});

test('polo variants use distinct models and maps without replacing the original saved project',async()=>{
 const original=INSTALLED_TEMPLATES.find(e=>e.descriptor.id==='polo'),next=INSTALLED_TEMPLATES.find(e=>e.descriptor.id==='polo-sem-recorte-v');assert.ok(original&&next);assert.equal(original.descriptor.name,'POLO COM RECORTE V');assert.equal(next.descriptor.name,'POLO SEM RECORTE V');assert.equal(next.descriptor.category,'camiseta');assert.equal(next.descriptor.panelCount,10);assert.equal(next.descriptor.triangles,74640);assert.equal(original.descriptor.triangles,76729);assert.notEqual(next.assets.model,original.assets.model);assert.notEqual(next.assets.template,original.assets.template);assert.notEqual(next.descriptor.originalSourceSha256,original.descriptor.originalSourceSha256);
 const {templates,projects}=setup(INSTALLED_TEMPLATES),catalog=await templates.catalog(other);assert.ok(catalog.some(t=>t.id==='polo'&&t.name==='POLO COM RECORTE V'));assert.ok(catalog.some(t=>t.id==='polo-sem-recorte-v'&&t.name==='POLO SEM RECORTE V'));
 const a=await projects.create(other,{name:'Anterior',templateId:'polo'}),b=await projects.create(other,{name:'Sem V',templateId:'polo-sem-recorte-v'});assert.equal((await projects.template(other,a.id)).id,'polo');assert.equal((await projects.template(other,b.id)).id,'polo-sem-recorte-v');
 const bytes=await readFile(new URL(`../public${next.assets.model}`,import.meta.url));assert.ok(bytes.length<20*1024*1024);assert.match(next.templateSvg,/POLO SEM RECORTE V/);assert.match(original.templateSvg,/POLO COM RECORTE V/);
});

test('the original polo default name is clarified for persisted rows while custom admin names remain intact',async()=>{
 const entry=INSTALLED_TEMPLATES.find(e=>e.descriptor.id==='polo'),legacy={...entry,descriptor:{...entry.descriptor,name:'POLO'}},{db,bucket,templates}=setup(INSTALLED_TEMPLATES),old=new TemplateService(db,bucket,admin.userId,[legacy]);await old.ensureInstalled('polo');assert.equal((await templates.catalog(other)).find(t=>t.id==='polo').name,'POLO COM RECORTE V');assert.equal((await templates.descriptor('polo')).name,'POLO COM RECORTE V');const map=await templates.asset('polo','template');if(map.body)assert.match(map.body,/POLO COM RECORTE V/);
 await templates.update(admin,'polo',{name:'Polo personalizada da fábrica',category:'camiseta'});assert.equal((await templates.descriptor('polo')).name,'Polo personalizada da fábrica');
});

test('Prime shirt stays available while the withdrawn kit and shorts retain their original maps',async()=>{
 const {presentationGarments}=await import('../public/order-presentation.js');
 const kit=INSTALLED_TEMPLATES.find(e=>e.descriptor.id==='kit-passeio-prime'),shirt=INSTALLED_TEMPLATES.find(e=>e.descriptor.id==='kit-passeio-prime-camiseta'),shorts=INSTALLED_TEMPLATES.find(e=>e.descriptor.id==='bermuda-passeio');assert.ok(kit&&shirt&&shorts);
 assert.equal(kit.descriptor.name,'KIT DE PASSEIO PRIME');assert.equal(shirt.descriptor.name,'CAMISETA GOLA PRIME');assert.equal(shorts.descriptor.name,'BERMUDA DE PASSEIO');assert.equal(kit.descriptor.panelCount,17);assert.equal(shirt.descriptor.panelCount,9);assert.equal(shorts.descriptor.panelCount,8);assert.equal(shirt.descriptor.triangles,70295);assert.equal(shorts.descriptor.triangles,9486);
 assert.deepEqual(presentationGarments(kit.descriptor),['Camiseta','Bermuda']);assert.equal(presentationGarments(shirt.descriptor),null);assert.equal(presentationGarments(shorts.descriptor),null);
 assert.ok(shirt.descriptor.panels.every(p=>p.group!=='CALCAO_E_COS'));assert.ok(shorts.descriptor.panels.every(p=>p.group==='CALCAO_E_COS'));assert.match(shorts.templateSvg,/BERMUDA \+ CÓS \+ BOLSOS/);assert.equal(shorts.sourceName,'BERMUDA PASSEIO.glb');
 const {templates,projects}=setup(INSTALLED_TEMPLATES),catalog=await templates.catalog(other);for(const entry of [kit,shirt,shorts])await assertTemplateChoice(templates,projects,catalog,entry);
 const {compatibleTemplateArt}=await import('../public/template-family.js');assert.equal(compatibleTemplateArt(kit.descriptor,shirt.descriptor),true);assert.equal(compatibleTemplateArt(kit.descriptor,shorts.descriptor),false);
});

test('composed kits retain their maps and available kits keep editable administrator names',async()=>{
 const {COMPOSED_GAME_TEMPLATES}=await import('../lib/composed-game-templates.mjs'),{COMPOSED_PASSEIO_TEMPLATES}=await import('../lib/composed-passeio-templates.mjs'),{COMPOSED_PASSEIO_SHIRTS}=await import('../lib/composed-passeio-shirts.mjs'),{moldCollection}=await import('../public/mold-collections.js'),{presentationPanelNumber}=await import('../public/model-panels.js');assert.equal(COMPOSED_PASSEIO_TEMPLATES.length,8);assert.equal(COMPOSED_PASSEIO_SHIRTS.length,6);assert.equal(COMPOSED_GAME_TEMPLATES.length,6);
 const {templates,projects}=setup(INSTALLED_TEMPLATES);
 for(const e of [...COMPOSED_PASSEIO_TEMPLATES,...COMPOSED_GAME_TEMPLATES]){const d=e.descriptor;assert.equal(moldCollection(d),d.bottomVariant==='com-recorte'?'jogo':'passeio');const b=await readFile(new URL('../public'+e.assets.model,import.meta.url)),g=readGlb(b);assert.equal(Buffer.from(await crypto.subtle.digest('SHA-256',b)).toString('hex'),d.sourceSha256);assert.ok(b.length<20*1024*1024);assert.ok(d.sourceComponents.every(c=>c.uniformScale>0&&Number.isFinite(c.uniformScale)));let cloth=0;
  for(const pr of d.primitives){const panel=d.panels.find(p=>p.mesh===pr.mesh&&p.primitive===pr.primitive);if(pr.decorativeOnly){assert.ok(!panel);continue;}assert.ok(panel);cloth++;assert.equal(presentationPanelNumber(d,pr),panel.number);const p=g.json.meshes[pr.mesh].primitives[0],uv=readAccessor(g.json,g.binary,p.attributes.TEXCOORD_0).data;for(let i=0;i<uv.length;i+=2){const x=uv[i]*4096,y=uv[i+1]*4096;assert.ok(x>=panel.rect.x-.002&&x<=panel.rect.x+panel.rect.w+.002);assert.ok(y>=panel.rect.y-.002&&y<=panel.rect.y+panel.rect.h+.002);}assert.ok(panel.rect.x>=0&&panel.rect.y>=0&&panel.rect.x+panel.rect.w<=4096&&panel.rect.y+panel.rect.h<=4096);}
  assert.equal(cloth,d.panelCount);for(let i=0;i<d.panels.length;i++)for(let j=i+1;j<d.panels.length;j++){const a=d.panels[i].rect,b=d.panels[j].rect;assert.ok(a.x+a.w<=b.x||b.x+b.w<=a.x||a.y+a.h<=b.y||b.y+b.h<=a.y);}
  const loaded=await new GLTFLoader().parseAsync(b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength),'');let count=0;loaded.scene.traverse(mesh=>{if(mesh.isMesh)count++;});assert.equal(count,d.primitives.length);
  if(isWithdrawnTemplate(d.id)){await assertTemplateChoice(templates,projects,await templates.catalog(other),e);continue;}
  const p=await projects.create(other,{name:d.name,templateId:d.id});assert.equal((await projects.template(other,p.id)).id,d.id);await assert.rejects(templates.update(other,d.id,{name:'Inválido',category:'conjunto',line:'passeio'}),{status:403});await templates.update(admin,d.id,{name:'Nome escolhido pelo ADM',category:'conjunto',line:d.line});assert.equal((await templates.descriptor(d.id)).name,'Nome escolhido pelo ADM');assert.equal((await templates.catalog(other)).find(t=>t.id===d.id).line,d.line);assert.match((await templates.asset(d.id,'template')).body,/Nome escolhido pelo ADM/);assert.deepEqual((await templates.descriptor(d.id)).panels,d.panels);
 }
 for(const shirt of COMPOSED_PASSEIO_SHIRTS){assert.equal(moldCollection(shirt.descriptor),'passeio');assert.ok(shirt.descriptor.panels.every(p=>p.group!=='BERMUDA'));assert.ok(COMPOSED_PASSEIO_TEMPLATES.some(e=>e.descriptor.id===shirt.descriptor.baseTemplateId));}
});

test('collection classification survives renaming and admins can reclassify without changing geometry',async()=>{
 const {moldCollection}=await import('../public/mold-collections.js');assert.equal(moldCollection({id:'passeio-polo',name:'JOGO'}),'passeio');assert.equal(moldCollection({id:'kit-raglan-basico',name:'PASSEIO'}),'jogo');
 const {templates}=setup(INSTALLED_TEMPLATES);const id='kit-normal-basico',before=await templates.descriptor(id);await templates.update(admin,id,{name:'Meu modelo',category:'conjunto',line:'passeio'});const after=await templates.descriptor(id);assert.equal(after.line,'passeio');assert.deepEqual(after.panels,before.panels);await assert.rejects(templates.update(admin,id,{name:'Outro',category:'conjunto',line:'invalido'}),{status:400});assert.equal((await templates.descriptor(id)).name,'Meu modelo');
});

test('renaming a game kit does not turn its garments into a polo and bermuda by name inference',async()=>{
 const {templates}=setup(INSTALLED_TEMPLATES),{presentationGarments}=await import('../public/order-presentation.js');await templates.update(admin,'kit-normal-basico',{name:'Passeio da equipe',category:'conjunto',line:'jogo'});const d=await templates.descriptor('kit-normal-basico');assert.deepEqual(d.garments,['Camiseta','Calção']);assert.deepEqual(presentationGarments(d),['Camiseta','Calção']);
});

test('the supplied cut-panel shorts exclude their mannequin and produce six game kits alongside the plain versions',async()=>{
 const entry=INSTALLED_TEMPLATES.find(e=>e.descriptor.id==='calcao-jogo-com-recorte');assert.ok(entry);assert.equal(entry.descriptor.panelCount,10);assert.equal(entry.descriptor.triangles,4078);assert.equal(entry.descriptor.bottomVariant,'com-recorte');assert.equal(entry.descriptor.panels.filter(p=>/Recorte lateral/.test(p.label)).length,2);
 const b=await readFile(new URL('../public'+entry.assets.model,import.meta.url)),g=readGlb(b);assert.equal(g.json.meshes.length,10);assert.ok(!g.json.skins?.length&&!g.json.animations?.length);assert.ok(g.json.meshes.every(m=>!/head|avatar/i.test(m.name)));assert.ok(b.length<1024*1024);
 const {COMPOSED_GAME_TEMPLATES}=await import('../lib/composed-game-templates.mjs'),{moldOptionName,moldCollection}=await import('../public/mold-collections.js'),{presentationGarments}=await import('../public/order-presentation.js');
 for(const kit of COMPOSED_GAME_TEMPLATES){const d=kit.descriptor;assert.equal(moldCollection(d),'jogo');assert.equal(d.bottomVariant,'com-recorte');assert.deepEqual(presentationGarments(d),['Camiseta','Calção']);assert.equal(d.panels.filter(p=>/Recorte lateral/.test(p.label)).length,2);assert.equal(d.sourceComponents[1].templateId,entry.descriptor.id);assert.equal(moldOptionName({...d,name:'Meu kit'}),'Meu kit · calção com recorte');const original=INSTALLED_TEMPLATES.find(e=>e.descriptor.id===d.sourceComponents[0].templateId.replace(/-camiseta$/,''));assert.ok(original&&original.status==='published');assert.match(moldOptionName(original.descriptor),/sem recorte/);}
});


test('withdrawn casual shorts and all nine kits disappear even with published renamed database rows, while saved projects and shirts survive',async()=>{
 const {templates,projects,db,bucket}=setup(INSTALLED_TEMPLATES);
 assert.equal(WITHDRAWN_TEMPLATE_IDS.length,10);
 // Create a historical project before applying the current availability rules.
 const historical=new ProjectService(db,bucket,{available:async()=>({status:'published'})});
 const old=await historical.create(other,{name:'Apresentação já salva',templateId:'passeio-polo'});
 const current=await projects.create(other,{name:'Projeto ativo',templateId:'polo'});
 for(const id of WITHDRAWN_TEMPLATE_IDS){
  await templates.ensureInstalled(id);
  await db.prepare("UPDATE templates SET name = ?,status = 'published' WHERE id = ?").bind('Nome personalizado antigo',id).run();
  assert.equal((await templates.row(id)).status,'deleted');
  await assert.rejects(templates.available(other,id),{status:404});
  await assert.rejects(projects.create(other,{name:'Novo projeto',templateId:id}),{status:404});
  await assert.rejects(projects.save(other,current.id,{name:current.name,version:current.version,templateId:id}),{status:404});
  await assert.rejects(templates.status(admin,id,{status:'published',confirmed:true}),{status:400});
  await assert.rejects(templates.restore(admin,id),{status:400});
 }
 const catalog=await templates.catalog(other),adminCatalog=await templates.adminList(admin);
 for(const id of WITHDRAWN_TEMPLATE_IDS){assert.ok(!catalog.some(t=>t.id===id));assert.ok(!adminCatalog.some(t=>t.id===id));}
 for(const id of ['polo','polo-sem-recorte-v','kit-passeio-prime-camiseta','passeio-kit-elite-27-camiseta-camiseta','kit-elite-27','calcao-jogo-5-partes'])assert.ok(catalog.some(t=>t.id===id),id+' must stay available');
 assert.equal((await projects.template(other,old.id)).id,'passeio-polo');
 assert.deepEqual(await projects.asset(other,old.id,'model'),{redirect:INSTALLED_TEMPLATES.find(e=>e.descriptor.id==='passeio-polo').assets.model});
 assert.equal((await projects.get(other,old.id)).name,old.name);
 assert.equal((await projects.save(other,old.id,{name:'Arte antiga preservada',version:old.version})).templateId,'passeio-polo');
});

test('the new casual shorts and ten checked combinations are available without restoring any withdrawn ID',async()=>{
 const {COMPOSED_PASSEIO_V2_TEMPLATES:kits}=await import('../lib/composed-passeio-v2-templates.mjs'),{templates,projects}=setup(INSTALLED_TEMPLATES),catalog=await templates.catalog(other);
 for(const e of [INSTALLED_TEMPLATES.find(e=>e.descriptor.id==='bermuda-passeio-v2'),...kits]){const d=e.descriptor;assert.ok(catalog.some(t=>t.id===d.id&&t.line==='passeio'));const p=await projects.create(other,{name:d.name,templateId:d.id}),template=await projects.template(other,p.id);assert.equal(template.fitVersion,'passeio-v2');assert.equal(template.previewBaseColors.lower,'#d51d2f');assert.deepEqual(await projects.asset(other,p.id,'model'),{redirect:e.assets.model});}
 assert.ok(WITHDRAWN_TEMPLATE_IDS.every(id=>!catalog.some(t=>t.id===id)));
});
