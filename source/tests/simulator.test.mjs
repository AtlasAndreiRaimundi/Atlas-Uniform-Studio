import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {DatabaseSync} from 'node:sqlite';
import {migrations} from './migrations.mjs';
import {SimulatorService} from '../lib/simulator-service.mjs';
import {ProductionService,validateDocument} from '../lib/production-service.mjs';
import {validateSimulatorState,simulatorPNG} from '../lib/simulator-validation.mjs';
import {eliteState} from '../public/simulador/elite.js';
import {COLORS,UNIFORM_FONTS,DEFAULT_BASE} from '../public/simulador/catalog.js';
import {layer,quality,resize,normalizeTextState,personalizationRole} from '../public/simulador/core.js';
import {drawLayer} from '../public/simulador/paint.js';
import {GRAPHICS} from '../public/simulador/graphics.js';
import {requireAdminUser} from '../lib/admin-auth.mjs';
const owner={userId:'alice'},other={userId:'bob'};
const bytes=await readFile(new URL('./fixtures/simulator-logo.png',import.meta.url)),preview='data:image/png;base64,'+bytes.toString('base64');
const manifest=JSON.parse(await readFile(new URL('../public/simulador/models/kit-elite-27.json',import.meta.url),'utf8'));
const creation=()=>eliteState(manifest.panels);
function setup(){
 const sql=new DatabaseSync(':memory:');sql.exec('PRAGMA foreign_keys=ON');for(const m of migrations)sql.exec(m);
 const db={prepare(query){const statement=sql.prepare(query);let args=[];return {bind(...v){args=v;return this;},async first(){return statement.get(...args)||null;},async all(){return {results:statement.all(...args)};},async run(){return {meta:{changes:statement.run(...args).changes}};}};}};
 const objects=new Map(),bucket={async put(k,v){objects.set(k,v);},async get(k){return objects.has(k)?{json:async()=>JSON.parse(objects.get(k))}:null;},async delete(keys){for(const k of Array.isArray(keys)?keys:[keys])objects.delete(k);},async list({prefix}){return {objects:[...objects.keys()].filter(k=>k.startsWith(prefix)).map(key=>({key})),truncated:false};}};
 const production=new ProductionService(db,bucket),simulator=new SimulatorService(db,bucket,production);return {sql,objects,bucket,production,simulator};
}
test('the supplied palette has all 103 original entries and the three unchanged uniform fonts',async()=>{
 assert.equal(COLORS.length,103);assert.equal(UNIFORM_FONTS.length,3);assert.deepEqual(UNIFORM_FONTS.map(f=>f.id),['mnz-autumn-26','mnz-revoke-26','mnz-bilbao-26']);assert.equal(COLORS.filter(c=>c.approximate).length,2);
 assert.equal(COLORS.find(c=>c.space==='PANTONE P 118-4 U').definition.space,'CMYK');assert.deepEqual(COLORS.find(c=>c.space==='PANTONE P 118-4 U').definition.values,[.49,0,.07,0]);
 for(const font of UNIFORM_FONTS){const bytes=await readFile(new URL('../public/simulador/'+font.file.replace('./',''),import.meta.url));assert.equal(createHash('sha256').update(bytes).digest('hex'),font.sha256);assert.ok(font.characters.includes(48));}
 assert.equal(new Set(GRAPHICS.map(g=>g.id)).size,26);assert.ok(GRAPHICS.some(g=>g.id==='horizontal-line'));assert.ok(GRAPHICS.some(g=>g.id==='pinstripes'));
});
test('server validation pins the approved mold, named palette colors, fonts and graphics',()=>{
 const state=creation(),clean=validateSimulatorState(state);assert.equal(clean.panels.length,19);assert.equal(clean.panels[0].colorId,DEFAULT_BASE.id);assert.equal(clean.order,null);
 const bad=structuredClone(state);bad.model='user-glb';assert.throws(()=>validateSimulatorState(bad),{status:400});bad.model=state.model;bad.panels[0].color='#123456';assert.throws(()=>validateSimulatorState(bad),{status:400});bad.panels[0].color=state.panels[0].color;bad.panels[0].layers.find(l=>l.type==='text').font='Arial';assert.throws(()=>validateSimulatorState(bad),{status:400});
 const duplicated=creation();duplicated.panels[1].id=duplicated.panels[0].id;assert.throws(()=>validateSimulatorState(duplicated),{status:400});const line=creation();line.panels[0].layers.push(layer('pattern',{pattern:'javascript'}));assert.throws(()=>validateSimulatorState(line),{status:400});
 const edge=creation();edge.panels[0].layers[0].x=NaN;assert.throws(()=>validateSimulatorState(edge),{status:400});
});
test('player placeholders stay upright and fixed after legacy reopen, save and order creation',async()=>{
 const s=creation(),back=s.panels.find(p=>p.id==='back'),name=back.layers.find(l=>l.personalization==='player-name'),number=back.layers.find(l=>l.personalization==='player-number');
 delete name.personalization;delete number.personalization;name.text='ATLETA';name.rotation=70;number.text='10';number.rotation=-45;
 const source=structuredClone(s);assert.equal(normalizeTextState(s),true);assert.equal(normalizeTextState(s),false);assert.equal(name.text,'JOGADOR');assert.equal(number.text,'00');assert.equal(name.rotation,0);assert.equal(number.rotation,0);assert.equal(personalizationRole(name),'player-name');
 const clean=validateSimulatorState(source),cleanBack=clean.panels.find(p=>p.id==='back');assert.deepEqual(cleanBack.layers.map(l=>[l.text,l.rotation]),[['JOGADOR',0],['00',0]]);
 const front=clean.panels.find(p=>p.id==='front');assert.equal(front.layers.find(l=>l.name==='Nome do time').text,'SEU TIME');const graphic=front.layers.find(l=>l.type==='pattern');graphic.rotation=35;assert.equal(validateSimulatorState(clean).panels[0].layers.find(l=>l.type==='pattern').rotation,35);
 const {simulator}=setup(),saved=await simulator.save(owner,null,{state:source,preview}),opened=await simulator.get(owner,saved.id);assert.equal(opened.state.panels.find(p=>p.id==='back').layers[1].text,'00');const order=await simulator.createOrder(owner,saved.id,{version:1,customer:'Time',quantity:2});assert.equal(order.document.simulatorDesign.state.panels.find(p=>p.id==='back').layers[0].text,'JOGADOR');
});
test('resizing preserves width to height ratio at both size limits',()=>{
 for(const initial of [{w:.62,h:.065},{w:.5,h:.31},{w:.04,h:.8}]){const l=layer('text',initial),ratio=l.h/l.w;for(const width of [1.8,0,.5,100,.035]){resize(l,width);assert.ok(Math.abs(l.h/l.w-ratio)<1e-12);assert.ok(l.w>=.035-1e-12&&l.w<=1.8+1e-12);assert.ok(l.h>=.015-1e-12&&l.h<=2+1e-12);}}
});
test('text fits uniformly in physical panel dimensions without a horizontal compression argument',()=>{
 const calls=[],ctx={save(){},restore(){},translate(){},rotate(a){assert.equal(a,0);},measureText(){return {width:600,actualBoundingBoxLeft:300,actualBoundingBoxRight:300,actualBoundingBoxAscent:80,actualBoundingBoxDescent:20};},scale(x,y){calls.push({x,y});},fillText(...args){assert.equal(args.length,3);}};
 const panel={cm:{w:42,h:66}};drawLayer(ctx,layer('text',{text:'JOGADOR',font:UNIFORM_FONTS[0].id,rotation:55,w:.6,h:.065}),1024,1024,panel);const scale=calls[0];assert.ok(Math.abs(scale.x*42-scale.y*66)<1e-12);
});
test('PNG dimensions are measured from the file and malformed uploads cannot bypass quality checks',()=>{
 const state=creation();state.panels[0].layers.push(layer('image',{src:preview,pixels:{w:10000,h:10000},vector:true,w:.5,h:.5}));const clean=validateSimulatorState(state),l=clean.panels[0].layers.at(-1);assert.deepEqual(l.pixels,{w:32,h:24});assert.equal(l.vector,false);assert.equal(quality(l,clean.panels[0]).level,'bad');
 assert.throws(()=>simulatorPNG('data:image/png;base64,AAAA'),{status:400});const damaged=Buffer.from(bytes);damaged[45]^=1;assert.throws(()=>simulatorPNG('data:image/png;base64,'+damaged.toString('base64')),{status:400});
 const s=creation();s.panels[0].layers.push(layer('image',{src:'https://untrusted.test/logo.png'}));assert.throws(()=>validateSimulatorState(s),{status:400});
});
test('sanitized SVG vectors are retained but scripts, text and external references are rejected',()=>{
 const src='<svg xmlns="http://www.w3.org/2000/svg" width="100" height="50" viewBox="0 0 100 50"><path fill="#ef694c" d="M0 0h100v50H0z"/></svg>';
 const valid=creation();valid.panels[0].layers.push(layer('image',{src:'data:image/svg+xml;charset=utf-8,'+encodeURIComponent(src)}));assert.equal(validateSimulatorState(valid).panels[0].layers.at(-1).vector,true);
 for(const payload of ['<script>alert(1)</script>','<image href="https://bad.test/x"/>','<text>x</text>','<use href="https://bad.test/x"/>']){const s=creation();s.panels[0].layers.push(layer('image',{src:'data:image/svg+xml;charset=utf-8,'+encodeURIComponent(src.replace('</svg>',payload+'</svg>'))}));assert.throws(()=>validateSimulatorState(s),{status:400});}
});
test('uniform saves and thumbnails require ownership and exact versions, with immutable stored checkpoints',async()=>{
 const {simulator,objects}=setup();const state=creation();await assert.rejects(simulator.save(null,null,{state,preview}),{status:401});let saved=await simulator.save(owner,null,{state,preview});assert.equal(saved.version,1);assert.equal((await simulator.list(other)).length,0);await assert.rejects(simulator.get(other,saved.id),{status:404});await assert.rejects(simulator.thumbnail(other,saved.id,1),{status:404});assert.deepEqual((await simulator.thumbnail(owner,saved.id,1)).bytes,bytes);
 const oldKeyCount=objects.size;state.title='Equipe nova';saved=await simulator.save(owner,saved.id,{state,preview,version:1});assert.equal(saved.version,2);assert.equal(objects.size,oldKeyCount+1);await assert.rejects(simulator.save(owner,saved.id,{state,preview,version:1}),{status:409});await assert.rejects(simulator.thumbnail(owner,saved.id,1),{status:409});assert.equal((await simulator.get(owner,saved.id)).state.title,'Equipe nova');
});
test('concurrent saves cannot overwrite another version or delete its objects',async()=>{
 const {simulator,objects}=setup();const original=await simulator.save(owner,null,{state:creation(),preview});const a=creation(),b=creation();a.title='Equipe A';b.title='Equipe B';const results=await Promise.allSettled([simulator.save(owner,original.id,{state:a,preview,version:1}),simulator.save(owner,original.id,{state:b,preview,version:1})]);assert.equal(results.filter(r=>r.status==='fulfilled').length,1);assert.equal(results.find(r=>r.status==='rejected').reason.status,409);assert.equal(objects.size,2);assert.equal((await simulator.get(owner,original.id)).version,2);
});
test('a reviewed kit starts one real draft order with a transparent image and an independent editable snapshot',async()=>{
 const {simulator,production}=setup();const saved=await simulator.save(owner,null,{state:creation(),preview});const input={version:saved.version,customer:'Equipe A',quantity:24,notes:'Conferir nomes na lista'};
 await assert.rejects(simulator.createOrder(other,saved.id,input),{status:404});await assert.rejects(simulator.createOrder(owner,saved.id,{...input,version:2}),{status:409});await assert.rejects(simulator.createOrder(owner,saved.id,{...input,quantity:0}),{status:400});
 const results=await Promise.all([simulator.createOrder(owner,saved.id,input),simulator.createOrder(owner,saved.id,input)]);assert.equal(results[0].id,results[1].id);assert.equal((await production.list(owner)).length,1);const order=results[0],doc=order.document;assert.equal(doc.workflow.status,'draft');assert.equal(doc.client,'Equipe A');assert.match(doc.number,/^\d{4}-\d{2}-MNZ$/);assert.equal(doc.pages[0].mode,'conjunto');assert.deepEqual(doc.pages[0].products.map(p=>p.type),['Camiseta','Calção']);assert.ok(doc.pages[0].products.every(p=>p.quantity===24));assert.equal(doc.pages[0].visual.image,preview);assert.equal(doc.simulatorDesign.version,1);assert.equal(doc.simulatorDesign.state.panels.length,19);
 const next=creation();next.title='Outro desenho';await simulator.save(owner,saved.id,{state:next,preview,version:1});assert.equal((await production.get(owner,order.id)).document.simulatorDesign.state.title,'Meu KIT ELITE 27');assert.equal((await simulator.fromOrder(owner,order.id)).state.title,'Meu KIT ELITE 27');await assert.rejects(simulator.fromOrder(other,order.id),{status:404});
 const roundtrip=await production.save(owner,order.id,{document:doc,version:order.version});assert.equal((await production.get(owner,roundtrip.id)).document.simulatorDesign.state.model,'kit-elite-27');assert.equal(validateDocument(doc).simulatorDesign.id,saved.id);
});
test('a failed order creation can be retried without discarding the saved drawing',async()=>{
 const {simulator,production}=setup();const saved=await simulator.save(owner,null,{state:creation(),preview}),save=production.save.bind(production);production.save=async()=>{throw Error('Storage unavailable');};await assert.rejects(simulator.createOrder(owner,saved.id,{version:1,customer:'Time',quantity:2}));assert.equal((await simulator.get(owner,saved.id)).orderId,null);production.save=save;const order=await simulator.createOrder(owner,saved.id,{version:1,customer:'Time',quantity:2});assert.equal(order.document.pages[0].products.length,2);
});
test('a legacy simulator preview must be refreshed before it can start a new Atlas order',async()=>{
 const {simulator,objects}=setup(),saved=await simulator.save(owner,null,{state:creation(),preview});
 for(const [key,value]of objects){const data=JSON.parse(value);if(data.state){delete data.state.platformBrand;objects.set(key,JSON.stringify(data));}}
 await assert.rejects(simulator.createOrder(owner,saved.id,{version:1,customer:'Time',quantity:2}),{status:409});
 const reopened=await simulator.get(owner,saved.id);assert.equal(reopened.orderId,null);const refreshed=await simulator.save(owner,saved.id,{state:reopened.state,preview,version:1});assert.equal(refreshed.state.platformBrand,'atlas');const order=await simulator.createOrder(owner,saved.id,{version:2,customer:'Time',quantity:2});assert.equal(order.document.simulatorDesign.state.platformBrand,'atlas');
});
test('GLB management remains admin-only and the customer editor has no upload control or arbitrary model entry point',async()=>{
 const html=await readFile(new URL('../public/simulador/editor.html',import.meta.url),'utf8'),js=await readFile(new URL('../public/simulador/app.js',import.meta.url),'utf8');assert.doesNotMatch(html,/glb-upload|accept="\.glb"|type="color"/);assert.doesNotMatch(js,/importModel|modelBuffer|glb-upload/);assert.match(js,/session\.isAdmin!==true/);assert.match(html,/\/admin\/molds/);assert.throws(()=>requireAdminUser(other,'alice'),{status:403});assert.equal(requireAdminUser(owner,'alice'),owner);
 const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);assert.equal(ids.length,new Set(ids).size);
});
