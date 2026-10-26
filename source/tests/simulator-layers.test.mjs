import test from 'node:test';
import assert from 'node:assert/strict';
import {eliteState} from '../public/simulador/elite.js';
import {layer,clone,History,FONTS} from '../public/simulador/core.js';
import {COLORS} from '../public/simulador/catalog.js';
import {applyGraphic,graphicTarget,drawingLayers,pickDrawingLayer,canShiftLayer,shiftLayer} from '../public/simulador/layers.js';
import {synchronizeLive} from '../public/simulador/symmetry.js';
import {paint,imageCache} from '../public/simulador/paint.js';
import {validateSimulatorState} from '../lib/simulator-validation.mjs';

const empty=()=>{const s=eliteState();for(const p of s.panels)p.layers=[];s.active='front';s.selected=null;return s;};
const panel=(s,id='front')=>s.panels.find(p=>p.id===id);
const graphic=extra=>layer('pattern',{pattern:'sash',...extra});

test('successive library choices replace one graphic while retaining all placement, color and symmetry metadata',()=>{
 const s=empty(),g=graphic({x:.22,y:.61,w:.72,h:.34,rotation:29,opacity:.7,mirrorX:true,copyKey:'shared-graphic',color:COLORS[4].hex,colorId:COLORS[4].id}),badge=layer('badge');panel(s).layers=[g,badge];s.selected=badge.id;const before=clone(g);
 for(const id of ['stripes','chevron','center-stripe']){const result=applyGraphic(s,id);assert.equal(result.created,false);assert.equal(result.layer.id,g.id);assert.equal(panel(s).layers.length,2);assert.equal(g.pattern,id);}
 const {name,pattern,...unchanged}=g,{name:oldName,pattern:oldPattern,...original}=before;assert.deepEqual(unchanged,original);assert.equal(s.selected,g.id);assert.equal(panel(s).layers[1],badge);
});
test('only an explicit addition makes another layer, then browsing replaces the newly selected layer',()=>{
 const s=empty(),first=applyGraphic(s,'sash').layer,firstSnapshot=clone(first);const second=applyGraphic(s,'stripes',{createNew:true}).layer;
 assert.notEqual(first.id,second.id);assert.equal(panel(s).layers.length,2);assert.equal(second.copyKey,undefined);applyGraphic(s,'chevron');applyGraphic(s,'wave');assert.equal(panel(s).layers.length,2);assert.equal(second.pattern,'wave');assert.deepEqual(first,firstSnapshot);
});
test('graphic targeting is explicit per panel and foreground selections do not become graphics',()=>{
 const s=empty(),a=applyGraphic(s,'sash').layer,b=applyGraphic(s,'stripes',{createNew:true}).layer,badge=layer('badge');panel(s).layers.push(badge);s.selected=badge.id;
 assert.equal(graphicTarget(s,a.id),a);applyGraphic(s,'half',{targetId:a.id});assert.equal(a.pattern,'half');assert.equal(b.pattern,'stripes');assert.equal(badge.type,'badge');
 s.active='sleeve-right';s.selected=null;assert.equal(graphicTarget(s,a.id),null);const created=applyGraphic(s,'sash');assert.equal(created.created,true);assert.equal(panel(s,'sleeve-right').layers.length,1);assert.equal(panel(s).layers.length,3);
});
test('locked, stale and invalid choices fail without editing another layer or exceeding quotas',()=>{
 const s=empty(),a=applyGraphic(s,'sash').layer;a.locked=true;let before=clone(s);assert.throws(()=>applyGraphic(s,'stripes'),/fixado/);assert.deepEqual(s,before);assert.throws(()=>applyGraphic(s,'stripes',{targetId:'missing'}),/mudou/);assert.deepEqual(s,before);assert.throws(()=>applyGraphic(s,'unknown'),/biblioteca/);assert.deepEqual(s,before);
 assert.equal(applyGraphic(s,'stripes',{createNew:true}).created,true);panel(s).layers=Array.from({length:60},()=>graphic());before=clone(s);assert.throws(()=>applyGraphic(s,'half',{createNew:true}),/60/);assert.deepEqual(s,before);
});
test('foreground is always above graphics; reordering stays within a group and picking follows the visible order',()=>{
 const s=empty(),g1=graphic(),g2=graphic(),badge=layer('badge'),name=layer('text',{text:'JOGADOR',font:FONTS[0].id}),number=layer('text',{text:'00',font:FONTS[0].id});const p=panel(s);p.layers=[badge,g1,name,g2,number];const old=[...p.layers];assert.deepEqual(drawingLayers(p),[g1,g2,badge,name,number]);assert.deepEqual(p.layers,old);assert.equal(pickDrawingLayer(p,{x:.5,y:.5}),number);
 assert.equal(canShiftLayer(p,g2.id,1),false);assert.equal(shiftLayer(p,g2.id,1),false);assert.equal(shiftLayer(p,badge.id,-1),false);assert.equal(shiftLayer(p,g1.id,1),true);assert.deepEqual(drawingLayers(p),[g2,g1,badge,name,number]);assert.equal(shiftLayer(p,number.id,-1),true);assert.deepEqual(drawingLayers(p),[g2,g1,badge,number,name]);assert.equal(pickDrawingLayer(p,{x:.5,y:.5}),name);name.locked=true;assert.equal(shiftLayer(p,name.id,-1),false);
});
test('the shared 2D/3D/export painter draws graphics first even in legacy interleaved arrays',t=>{
 const pathDescriptor=Object.getOwnPropertyDescriptor(globalThis,'Path2D');Object.defineProperty(globalThis,'Path2D',{value:class {},configurable:true});t.after(()=>{if(pathDescriptor)Object.defineProperty(globalThis,'Path2D',pathDescriptor);else delete globalThis.Path2D;});
 const text=layer('text',{text:'JOGADOR',font:FONTS[0].id,x:.11}),g1=graphic({pattern:'horizontal-line',x:.22}),badge=layer('badge',{x:.33}),image=layer('image',{x:.44,src:'fixture'}),g2=graphic({pattern:'horizontal-line',x:.55});const p={color:COLORS[0].hex,layers:[text,g1,badge,image,g2]},calls=[];let depth=0;
 const ctx=new Proxy({save(){depth++;},restore(){depth--;},createLinearGradient:()=>({addColorStop(){}}),translate(x,y){if(depth===1)calls.push(x);},measureText:()=>({width:100,actualBoundingBoxLeft:50,actualBoundingBoxRight:50,actualBoundingBoxAscent:80,actualBoundingBoxDescent:20})},{get:(o,k)=>o[k]??(()=>{})});imageCache.set('fixture',{width:32,height:24});try{paint({width:100,height:100,getContext:()=>ctx},p);assert.deepEqual(calls.map(n=>Math.round(n)),[22,55,11,33,44]);}finally{imageCache.delete('fixture');}
});
test('replacing a linked sleeve keeps a single counterpart, its independent color, and undo/redo and save order',()=>{
 const s=empty();s.active='sleeve-right';let previous=clone(s);const source=applyGraphic(s,'sash').layer;synchronizeLive(s,previous);const target=panel(s,'sleeve-left').layers[0];target.color=COLORS[5].hex;target.colorId=COLORS[5].id;const targetId=target.id,history=new History(s);
 previous=clone(s);applyGraphic(s,'chevron');synchronizeLive(s,previous);history.push(s);assert.equal(panel(s,'sleeve-left').layers.length,1);assert.equal(targetId,panel(s,'sleeve-left').layers[0].id);assert.equal(panel(s,'sleeve-left').layers[0].pattern,'chevron');assert.equal(panel(s,'sleeve-left').layers[0].colorId,COLORS[5].id);assert.equal(panel(history.undo(),'sleeve-right').layers[0].pattern,'sash');assert.equal(panel(history.redo(),'sleeve-right').layers[0].pattern,'chevron');assert.equal(source.id,panel(s,'sleeve-right').layers[0].id);
 const badge=layer('badge');panel(s,'sleeve-right').layers.unshift(badge);const clean=validateSimulatorState(s);assert.deepEqual(panel(clean,'sleeve-right').layers.map(l=>l.type),['pattern','badge']);assert.equal(panel(clean,'sleeve-right').layers.at(-1).id,badge.id);
});
