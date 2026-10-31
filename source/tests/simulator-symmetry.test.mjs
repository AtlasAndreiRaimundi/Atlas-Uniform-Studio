import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {DatabaseSync} from 'node:sqlite';
import {migrations} from './migrations.mjs';
import {eliteState} from '../public/simulador/elite.js';
import {layer,clone,History} from '../public/simulador/core.js';
import {sidePairs,copySideDetails,setLiveSymmetry,disableLiveSymmetry,synchronizeLive,normalizeSymmetry} from '../public/simulador/symmetry.js';
import {COLORS,UNIFORM_FONTS} from '../public/simulador/catalog.js';
import {drawLayer,imageCache} from '../public/simulador/paint.js';
import {validateSimulatorState} from '../lib/simulator-validation.mjs';
import {SimulatorService} from '../lib/simulator-service.mjs';
import {ProductionService} from '../lib/production-service.mjs';
const manifest=JSON.parse(await readFile(new URL('../public/simulador/models/kit-edge-2027.json',import.meta.url),'utf8'));
const preview='data:image/png;base64,'+(await readFile(new URL('./fixtures/simulator-logo.png',import.meta.url))).toString('base64');
const color=i=>({color:COLORS[i].hex,colorId:COLORS[i].id}),panel=(s,id)=>s.panels.find(p=>p.id===id),right=s=>panel(s,'sleeve-right'),left=s=>panel(s,'sleeve-left');
// Explicitly independent/legacy fixture; fresh creations have defaults below.
const state=()=>{const s=eliteState(manifest.panels);delete s.symmetry;for(const p of s.panels)p.layers=[];return s;};
const graphic=(extra={})=>layer('pattern',{name:'Faixa',pattern:'sash',x:.2,y:.4,w:.6,h:.2,rotation:25,...color(2),...extra});
const pair={pairId:'sleeves',sourceId:'sleeve-right'};
const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-10,`${a} ≠ ${b}`);
function initial(){const s=state();right(s).layers=[graphic()];left(s).layers=[graphic({...color(5)})];Object.assign(right(s),color(7));Object.assign(left(s),color(8));s.active='sleeve-right';return s;}

test('new uniforms enable all four mirrored graphic pairs with independent colors and backgrounds',()=>{
 const s=eliteState(manifest.panels);assert.deepEqual(Object.keys(s.symmetry),['sleeves','strips','shorts','sides']);
 for(const pair of sidePairs(s)){
  assert.deepEqual(s.symmetry[pair.id],{mode:'mirror',scope:'patterns',colors:false,base:false});
  const before=clone(s),source=panel(s,pair.panels[1]),target=panel(s,pair.panels[0]);s.active=source.id;source.layers.push(graphic());synchronizeLive(s,before);
  assert.equal(target.layers.length,1);close(target.layers[0].x,.8);assert.equal(target.layers[0].mirrorX,true);
 }
 const clean=validateSimulatorState(s);assert.deepEqual(clean.symmetry,s.symmetry);
 const another=eliteState(manifest.panels);another.symmetry.sleeves.colors=true;assert.equal(s.symmetry.sleeves.colors,false);assert.equal(another.symmetry.strips.colors,false);
});
test('disabling a default pair preserves both drawings and remains off after save validation and further edits',()=>{
 const fresh=eliteState(manifest.panels),before=clone(fresh);fresh.active='sleeve-right';right(fresh).layers.push(graphic());synchronizeLive(fresh,before);
 const off=disableLiveSymmetry(fresh,'sleeves');assert.deepEqual(off.panels,fresh.panels);assert.equal(off.symmetry.sleeves,undefined);assert.equal(Object.keys(off.symmetry).length,3);
 const reopened=validateSimulatorState(clone(off)),previous=clone(reopened);right(reopened).layers[0].x=.35;synchronizeLive(reopened,previous);close(left(reopened).layers[0].x,.8);assert.equal(reopened.symmetry.sleeves,undefined);
 const legacy=state();assert.equal(validateSimulatorState(legacy).symmetry,undefined);
});
test('explicitly independent designs stay independent and copy-once does not bind future edits',()=>{
 const s=initial(),before=clone(s);assert.equal(s.symmetry,undefined);assert.equal(sidePairs(s).length,4);s.product='shorts';assert.deepEqual(sidePairs(s).map(p=>p.id),['shorts']);assert.throws(()=>copySideDetails(s,pair));s.product='kit';
 const copied=copySideDetails(s,pair).state;assert.equal(copied.symmetry,undefined);assert.equal(left(copied).layers[0].mirrorX,true);close(left(copied).layers[0].x,.8);assert.equal(left(copied).layers[0].rotation,-25);assert.equal(left(copied).layers[0].colorId,COLORS[5].id);assert.notEqual(left(copied).layers[0].id,right(copied).layers[0].id);right(copied).layers[0].x=.1;assert.equal(left(copied).layers[0].x,.8);assert.deepEqual(s,before);
});
test('copy-once has independent source/custom colors, selection, merge, replace and optional background',()=>{
 const s=initial();right(s).layers.push(layer('badge',{name:'Brasão',...color(3)}));left(s).layers.push(layer('text',{name:'Número',text:'00',font:UNIFORM_FONTS[0].id,...color(4)}));
 const custom=copySideDetails(s,{...pair,colorPolicy:'custom',colorId:COLORS[6].id,copyBase:true,layerIds:[right(s).layers[0].id]}).state;assert.equal(left(custom).layers.length,2);assert.equal(left(custom).layers[0].colorId,COLORS[6].id);assert.equal(left(custom).colorId,COLORS[7].id);
 const replaced=copySideDetails(s,{...pair,writeMode:'replace',mirror:false,colorPolicy:'source',layerIds:[right(s).layers[0].id]}).state;assert.equal(left(replaced).layers.length,1);close(left(replaced).layers[0].x,.2);assert.equal(left(replaced).layers[0].colorId,COLORS[2].id);assert.equal(left(replaced).colorId,COLORS[8].id);
 const repeated=copySideDetails(custom,{...pair,layerIds:[right(s).layers[0].id]}).state;assert.equal(left(repeated).layers.length,2);assert.equal(left(repeated).layers[0].colorId,COLORS[6].id);
});
test('live mirroring updates both directions during successive uncommitted drag frames with stable counterparts',()=>{
 const linked=setLiveSymmetry(initial(),pair).state,gestureStart=clone(linked),targetId=left(linked).layers[0].id;
 right(linked).layers[0].x=.35;right(linked).layers[0].w=.7;right(linked).layers[0].rotation=40;synchronizeLive(linked,gestureStart);close(left(linked).layers[0].x,.65);assert.equal(left(linked).layers[0].w,.7);assert.equal(left(linked).layers[0].rotation,-40);assert.equal(left(linked).layers[0].id,targetId);
 right(linked).layers[0].x=.45;synchronizeLive(linked,gestureStart);close(left(linked).layers[0].x,.55);assert.equal(left(linked).layers[0].id,targetId);
 const nextGesture=clone(linked);linked.active='sleeve-left';left(linked).layers[0].x=.1;left(linked).layers[0].y=.8;left(linked).layers[0].h=.4;synchronizeLive(linked,nextGesture);close(right(linked).layers[0].x,.9);assert.equal(right(linked).layers[0].y,.8);assert.equal(right(linked).layers[0].h,.4);assert.equal(right(linked).layers[0].mirrorX,false);
});
test('independent detail and background colors survive bidirectional drawing edits; shared colors are explicit',()=>{
 let s=setLiveSymmetry(initial(),pair).state;let before=clone(s);Object.assign(right(s).layers[0],color(10));Object.assign(right(s),color(11));synchronizeLive(s,before);assert.equal(left(s).layers[0].colorId,COLORS[5].id);assert.equal(left(s).colorId,COLORS[8].id);
 before=clone(s);right(s).layers[0].x=.3;synchronizeLive(s,before);assert.equal(left(s).layers[0].colorId,COLORS[5].id);assert.equal(left(s).colorId,COLORS[8].id);
 s=setLiveSymmetry(s,{...pair,colors:true,base:true}).state;before=clone(s);s.active='sleeve-left';Object.assign(left(s).layers[0],color(13));Object.assign(left(s),color(14));synchronizeLive(s,before);assert.equal(right(s).layers[0].colorId,COLORS[13].id);assert.equal(right(s).colorId,COLORS[14].id);
});
test('new elements, deletion and ordering synchronize while patterns-only mode preserves different logos and numbers',()=>{
 let s=initial();right(s).layers.push(layer('badge',{name:'Brasão direito',...color(3)}));left(s).layers.push(layer('text',{name:'Número esquerdo',text:'00',font:UNIFORM_FONTS[0].id,...color(4)}));s=setLiveSymmetry(s,pair).state;
 let before=clone(s);right(s).layers.push(graphic({name:'Segunda',pattern:'wave'}));synchronizeLive(s,before);assert.equal(left(s).layers.filter(l=>l.type==='pattern').length,2);assert.ok(left(s).layers.some(l=>l.name==='Número esquerdo'));assert.ok(!left(s).layers.some(l=>l.type==='badge'));
 before=clone(s);s.active='sleeve-left';left(s).layers=left(s).layers.filter(l=>l.name!=='Faixa');synchronizeLive(s,before);assert.ok(!right(s).layers.some(l=>l.name==='Faixa'));assert.ok(right(s).layers.some(l=>l.name==='Brasão direito'));
 before=clone(s);left(s).layers.push(graphic({name:'Terceira',pattern:'half'}));synchronizeLive(s,before);before=clone(s);const graphs=left(s).layers.filter(l=>l.type==='pattern').reverse(),other=left(s).layers.filter(l=>l.type!=='pattern');left(s).layers=[...graphs,...other];synchronizeLive(s,before);assert.deepEqual(right(s).layers.filter(l=>l.type==='pattern').map(l=>l.name),graphs.map(l=>l.name));
});
test('all-elements mode preserves readable text and logo artwork; graphic reflection is rendered and validated',()=>{
 let s=initial();right(s).layers.push(layer('text',{name:'Número',text:'00',font:UNIFORM_FONTS[0].id,personalization:'player-number',...color(3)}),layer('image',{name:'Patrocinador',src:preview,pixels:{w:32,h:24},vector:false,...color(4)}));s=setLiveSymmetry(s,{...pair,scope:'all'}).state;
 const text=left(s).layers.find(l=>l.type==='text'),image=left(s).layers.find(l=>l.type==='image');assert.equal(text.text,'00');assert.equal(text.rotation,0);assert.equal(text.mirrorX,undefined);assert.equal(image.src,preview);assert.equal(image.mirrorX,undefined);
 const calls=[],ctx=new Proxy({scale:(x,y)=>calls.push([x,y]),measureText:()=>({width:100,actualBoundingBoxLeft:50,actualBoundingBoxRight:50,actualBoundingBoxAscent:80,actualBoundingBoxDescent:20})},{get:(o,k)=>o[k]||(()=>{})});drawLayer(ctx,left(s).layers[0],100,100);assert.deepEqual(calls.shift(),[-1,1]);drawLayer(ctx,{...text,mirrorX:true},100,100);assert.ok(calls.every(([x,y])=>x>0&&y>0));calls.length=0;imageCache.set(preview,{width:32,height:24});drawLayer(ctx,{...image,mirrorX:true},100,100);assert.equal(calls.length,0);imageCache.delete(preview);
});
test('empty pairs can enable future live edits, pairs remain independent, and same-position mode is distinct',()=>{
 let s=state();s.active='sleeve-right';s=setLiveSymmetry(s,{...pair,mode:'same'}).state;s=setLiveSymmetry(s,{pairId:'strips',sourceId:'sleeve-strip-7'}).state;const before=clone(s);right(s).layers.push(graphic());synchronizeLive(s,before);close(left(s).layers[0].x,.2);assert.equal(left(s).layers[0].rotation,25);assert.equal(panel(s,'sleeve-strip-8').layers.length,0);assert.equal(Object.keys(s.symmetry).length,2);
});
test('disabling preserves both designs and undo/redo restores the chosen live setting without automatic binding',()=>{
 const linked=setLiveSymmetry(initial(),pair).state,history=new History(linked),off=disableLiveSymmetry(linked,'sleeves');history.push(off);assert.deepEqual(off.panels,linked.panels);assert.equal(off.symmetry,undefined);assert.deepEqual(history.undo(),linked);assert.deepEqual(history.redo(),off);const before=clone(off);right(off).layers[0].x=.1;synchronizeLive(off,before);close(left(off).layers[0].x,.8);
});
test('invalid settings and quota overflow are rejected without corrupting the original enable/copy operation',()=>{
 const s=initial();for(const settings of [{unknown:{mode:'mirror',scope:'all',colors:false,base:false}},{sleeves:{mode:'arbitrary',scope:'all',colors:false,base:false}},{sleeves:{mode:'mirror',scope:'all',colors:'yes',base:false}}])assert.throws(()=>normalizeSymmetry(settings));
 const crowded=state();right(crowded).layers=Array.from({length:60},()=>graphic());panel(crowded,'front').layers=Array.from({length:60},()=>graphic());panel(crowded,'back').layers=Array.from({length:60},()=>graphic());const before=clone(crowded);assert.throws(()=>setLiveSymmetry(crowded,pair),/limite/);assert.deepEqual(crowded,before);assert.throws(()=>copySideDetails(crowded,pair),/limite/);
 const invalid=setLiveSymmetry(s,pair).state;left(invalid).layers[0].mirrorX='yes';assert.throws(()=>validateSimulatorState(invalid),{status:400});
});
test('live settings, mirrored layers and independent colors persist through service save, reopen and a frozen order snapshot',async()=>{
 const sql=new DatabaseSync(':memory:');sql.exec('PRAGMA foreign_keys=ON');for(const migration of migrations)sql.exec(migration);
 const db={prepare(query){const stmt=sql.prepare(query);let args=[];return {bind(...v){args=v;return this;},async first(){return stmt.get(...args)||null;},async all(){return {results:stmt.all(...args)};},async run(){return {meta:{changes:stmt.run(...args).changes}};}};}};
 const objects=new Map(),bucket={async put(k,v){objects.set(k,v);},async get(k){return objects.has(k)?{json:async()=>JSON.parse(objects.get(k))}:null;},async delete(keys){for(const k of Array.isArray(keys)?keys:[keys])objects.delete(k);}};
 const production=new ProductionService(db,bucket),service=new SimulatorService(db,bucket,production),user={userId:'alice'},s=setLiveSymmetry(initial(),pair).state;
 const saved=await service.save(user,null,{state:s,preview}),opened=await service.get(user,saved.id);assert.deepEqual(opened.state.symmetry,s.symmetry);assert.equal(left(opened.state).layers[0].mirrorX,true);assert.equal(left(opened.state).layers[0].colorId,COLORS[5].id);const before=clone(opened.state);opened.state.active='sleeve-left';left(opened.state).layers[0].x=.15;synchronizeLive(opened.state,before);close(right(opened.state).layers[0].x,.85);
 const order=await service.createOrder(user,saved.id,{version:saved.version,customer:'Equipe',quantity:2});assert.deepEqual(order.document.simulatorDesign.state.symmetry,s.symmetry);close(right(order.document.simulatorDesign.state).layers[0].x,.2);
});
