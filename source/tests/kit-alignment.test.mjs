import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {registerHooks} from 'node:module';
import * as THREE from '../public/vendor/three/build/three.module.min.js';
import {alignPresentationKit} from '../public/kit-alignment.js';
import {selectPresentationGarments} from '../public/model-panels.js';
import {INSTALLED_TEMPLATES} from '../lib/installed-templates.mjs';
import {readGlb,readAccessor} from '../lib/template-generator.mjs';
import {moldOptionName} from '../public/mold-collections.js';
registerHooks({resolve(s,c,next){return next(s==='three'?new URL('../public/vendor/three/build/three.module.min.js',import.meta.url).href:s,c);}});
const {GLTFLoader}=await import('../public/vendor/three/examples/jsm/loaders/GLTFLoader.js');
globalThis.self=globalThis;globalThis.ProgressEvent=class{constructor(type,d){Object.assign(this,{type},d);}};
globalThis.createImageBitmap=async blob=>{const b=Buffer.from(await blob.arrayBuffer());return {width:b.readUInt32BE(16),height:b.readUInt32BE(20),close(){}};};
async function load(e){const b=await readFile(new URL('../public'+e.assets.model,import.meta.url));return new GLTFLoader().parseAsync(b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength),'');}
function orient(g,d){const vertical=new THREE.Group();vertical.add(g.scene);if(d.orientation?.up==='z')vertical.rotation.x=-Math.PI/2;const root=new THREE.Group();root.add(vertical);root.rotation.y={'+z':0,'-z':Math.PI,'+x':-Math.PI/2,'-x':Math.PI/2}[d.orientation?.front||'+z'];return root;}
test('actual presentation kits have no visible vertical opening, including legacy models and shirt-only views',async()=>{
 let corrected=0;
 for(const e of INSTALLED_TEMPLATES.filter(e=>e.status==='published'&&e.descriptor.category==='conjunto')){
  const g=await load(e),d=e.descriptor,root=orient(g,d),before=new Map();root.traverse(m=>{if(m.isMesh)before.set(m,{position:m.geometry.attributes.position.array.slice(),uv:m.geometry.attributes.uv.array.slice()});});
  const result=alignPresentationKit(root,g.parser.associations,d,THREE);if(d.fitVersion==='passeio-v2'){assert.equal(result,null);continue;}assert.ok(result,e.descriptor.id);assert.ok(result.gapAfter<=-result.bodyHeight*.069+1e-8,`${d.id} has a gap`);if(result.deltaY)corrected++;
  assert.equal(alignPresentationKit(root,g.parser.associations,d,THREE).deltaY,0,'alignment must be idempotent');
  for(const [m,b]of before){assert.deepEqual(m.geometry.attributes.position.array,b.position);assert.deepEqual(m.geometry.attributes.uv.array,b.uv);}
  console.log(d.id,`gap ${result.gapBefore.toFixed(5)} → ${result.gapAfter.toFixed(5)}`);
 }
 assert.ok(corrected>0,'exercise the actual separated legacy kit regression');
 const e=INSTALLED_TEMPLATES.find(e=>e.descriptor.variant==='shirt-only'),g=await load(e);selectPresentationGarments(g.scene,g.parser.associations,e.descriptor);assert.equal(alignPresentationKit(orient(g,e.descriptor),g.parser.associations,e.descriptor,THREE),null);
});
test('all lower panels move together across rotated and scaled parents without changing UVs',()=>{
 const root=new THREE.Group(),parent=new THREE.Group();parent.rotation.z=.2;parent.scale.setScalar(2);root.add(parent);const body=new THREE.Mesh(new THREE.BoxGeometry(1,2,.3));body.position.y=3;root.add(body);const a=new THREE.Mesh(new THREE.BoxGeometry(.4,.8,.3)),b=a.clone();a.position.x=-.3;b.position.x=.3;parent.add(a,b);const associations=new Map([[body,{meshes:0,primitives:0}],[a,{meshes:1,primitives:0}],[b,{meshes:2,primitives:0}]]),descriptor={kind:'generated',category:'conjunto',primitives:[0,1,2].map(mesh=>({key:`m${mesh}p0`,mesh,primitive:0})),panels:[{mesh:0,primitive:0,label:'Frente'},{mesh:1,primitive:0,label:'Calção',group:'CALCAO'},{mesh:2,primitive:0,label:'Cós',group:'CALCAO'}]};root.updateMatrixWorld(true);const oldA=a.getWorldPosition(new THREE.Vector3()),oldB=b.getWorldPosition(new THREE.Vector3());const r=alignPresentationKit(root,associations,descriptor,THREE);assert.equal(r.movedMeshes,2);const da=a.getWorldPosition(new THREE.Vector3()).sub(oldA),db=b.getWorldPosition(new THREE.Vector3()).sub(oldB);assert.ok(da.distanceTo(db)<1e-10);assert.ok(Math.abs(da.x)<1e-10&&Math.abs(da.z)<1e-10);assert.ok(r.gapAfter<0);
});
test('casual kit shorts shrink uniformly once, rise under the hem and leave shirts, game kits and standalone shorts intact',async()=>{
 const casual=INSTALLED_TEMPLATES.filter(e=>e.descriptor.category==='conjunto'&&(e.descriptor.id==='kit-passeio-prime'||e.descriptor.sourceComponents?.some(c=>c.role==='bottom'&&c.templateId==='bermuda-passeio')));
 assert.equal(casual.length,9);
 for(const e of casual){
  const g=await load(e),root=orient(g,e.descriptor),lower=[],upper=[];root.updateMatrixWorld(true);
  root.traverse(mesh=>{if(!mesh.isMesh)return;const a=g.parser.associations.get(mesh),p=e.descriptor.panels.find(p=>p.mesh===a?.meshes&&p.primitive===a?.primitives);if(p&&(p.group==='BERMUDA'||p.group==='CALCAO_E_COS'))lower.push(mesh);else upper.push({mesh,matrix:mesh.matrixWorld.clone()});});
  const box=()=>lower.reduce((b,m)=>b.union(new THREE.Box3().setFromObject(m)),new THREE.Box3()),before=box(),size=before.getSize(new THREE.Vector3());
  const result=alignPresentationKit(root,g.parser.associations,e.descriptor,THREE),after=box(),next=after.getSize(new THREE.Vector3());
  assert.equal(result.scaleApplied,.9,e.descriptor.id);assert.equal(result.casual,true);
  assert.ok(Math.abs(result.extraRise/result.bodyHeight-10/70)<1e-10,'add about 10 cm above the previous fit, independently of the GLB export scale');
  const previousDelta=result.gapBefore>-result.bodyHeight*.109?result.gapBefore+result.bodyHeight*.11:0;
  assert.ok(Math.abs((after.max.y-before.max.y)-previousDelta-result.extraRise)<1e-8,'raise the complete waistband by the additional offset');
  for(const axis of ['x','y','z'])assert.ok(Math.abs(next[axis]/size[axis]-.9)<1e-6,`${e.descriptor.id}: ${axis}`);
  assert.ok(after.max.y>=before.max.y-1e-8);assert.ok(result.gapAfter<=-result.bodyHeight*.109+1e-8);
  if(e.descriptor.id.startsWith('passeio-polo'))assert.ok(result.deltaY>0,'the polo waistband must rise');
  for(const {mesh,matrix}of upper)assert.deepEqual(mesh.matrixWorld.elements,matrix.elements,'shirt/buttons/stitching must stay in place');
  const second=alignPresentationKit(root,g.parser.associations,e.descriptor,THREE);assert.equal(second.scaleApplied,1);assert.equal(second.deltaY,0);assert.equal(second.extraRise,0);assert.ok(box().min.distanceTo(after.min)<1e-8&&box().max.distanceTo(after.max)<1e-8);
 }
 const game=INSTALLED_TEMPLATES.find(e=>e.descriptor.id==='jogo-5-partes-kit-elite-27-camiseta'),g=await load(game);assert.equal(alignPresentationKit(orient(g,game.descriptor),g.parser.associations,game.descriptor,THREE).scaleApplied,1);
 const standalone=INSTALLED_TEMPLATES.find(e=>e.descriptor.id==='bermuda-passeio'),s=await load(standalone),root=orient(s,standalone.descriptor),before=new THREE.Box3().setFromObject(root);assert.equal(alignPresentationKit(root,s.parser.associations,standalone.descriptor,THREE),null);assert.ok(before.equals(new THREE.Box3().setFromObject(root)));
});
test('five-part shorts preserve the supplied five body parts and four waistband panels in standalone and six kits',async()=>{
 const e=INSTALLED_TEMPLATES.find(e=>e.descriptor.id==='calcao-jogo-5-partes');assert.ok(e);assert.equal(e.descriptor.panelCount,9);assert.equal(e.descriptor.bottomVariant,'5-partes');assert.equal(e.descriptor.panels.filter(p=>/Cós/.test(p.label)).length,4);assert.equal(e.descriptor.panels.filter(p=>/pala/.test(p.label)).length,1);
 const b=await readFile(new URL('../public'+e.assets.model,import.meta.url)),g=readGlb(b);assert.equal(g.json.meshes.length,9);assert.ok(!g.json.images&&!g.json.skins&&!g.json.animations);assert.ok(b.length<1024*1024);
 const {COMPOSED_FIVE_PART_TEMPLATES:kits}=await import('../lib/composed-five-part-templates.mjs');assert.equal(kits.length,6);
 for(const kit of kits){const d=kit.descriptor;assert.deepEqual(d.garments,['Camiseta','Calção']);assert.equal(d.sourceComponents[1].templateId,e.descriptor.id);assert.equal(d.bottomVariant,'5-partes');assert.equal(moldOptionName({...d,name:'Kit teste'}),'Kit teste · calção 5 partes');const bytes=await readFile(new URL('../public'+kit.assets.model,import.meta.url));assert.equal(Buffer.from(await crypto.subtle.digest('SHA-256',bytes)).toString('hex'),d.sourceSha256);const {json,binary}=readGlb(bytes);for(const panel of d.panels){const p=json.meshes[panel.mesh].primitives[0],uv=readAccessor(json,binary,p.attributes.TEXCOORD_0).data;for(let i=0;i<uv.length;i+=2){assert.ok(uv[i]>=0&&uv[i]<=1&&uv[i+1]>=0&&uv[i+1]<=1);}}
 }
});
