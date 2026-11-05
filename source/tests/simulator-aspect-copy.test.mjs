import test from 'node:test';
import assert from 'node:assert/strict';
import {eliteState} from '../public/simulador/elite.js';
import {GRAPHICS,AVAILABLE_GRAPHICS,REMOVED_GRAPHIC_IDS} from '../public/simulador/graphics.js';
import {applyGraphic,copyGraphicToPanels} from '../public/simulador/layers.js';
import {naturalGraphicSize,promoteGraphicSize,editGraphicDimension,graphicCm} from '../public/simulador/graphic-fit.js';
import {validateSimulatorState} from '../lib/simulator-validation.mjs';

test('os quatro grafismos pedidos saem da lista, mas permanecem legíveis em projetos antigos',()=>{
 assert.equal(GRAPHICS.length,26);assert.equal(AVAILABLE_GRAPHICS.length,22);
 for(const position of [2,5,10,17])assert.ok(REMOVED_GRAPHIC_IDS.has(GRAPHICS[position-1].id));
 const saved=eliteState();saved.panels[0].layers[0].pattern='shoulders';
 assert.equal(validateSimulatorState(saved).panels[0].layers[0].pattern,'shoulders');
 assert.throws(()=>applyGraphic(saved,'shoulders',{createNew:true}));
});
test('inserção em filete respeita a razão física original, não o formato do painel',()=>{
 const s=eliteState(),p=s.panels.find(p=>p.id==='sleeve-strip-7');
 p.cm={w:38,h:4};s.active=p.id;
 const g=applyGraphic(s,'wave',{createNew:true}).layer,cm=graphicCm(g,p);
 assert.equal(g.keepAspect,true);assert.equal(g.naturalAspect,1);
 assert.ok(Math.abs(cm.width/cm.height-1)<1e-10);
 assert.ok(cm.width<8);
 assert.equal(validateSimulatorState(s).panels.find(q=>q.id===p.id).layers[0].keepAspect,true);
});
test('largura e altura podem mudar juntas ou independentemente',()=>{
 const s=eliteState(),p=s.panels.find(p=>p.id==='sleeve-strip-7');p.cm={w:38,h:4};s.active=p.id;
 const g=applyGraphic(s,'zigzag',{createNew:true}).layer;
 editGraphicDimension(g,p,'width',3.5);
 assert.ok(Math.abs(graphicCm(g,p).height-3.5)<1e-10);
 g.keepAspect=false;editGraphicDimension(g,p,'width',12);editGraphicDimension(g,p,'height',1.5);
 assert.ok(Math.abs(graphicCm(g,p).width-12)<1e-10);
 assert.ok(Math.abs(graphicCm(g,p).height-1.5)<1e-10);
 assert.equal(validateSimulatorState(s).panels.find(q=>q.id===p.id).layers[0].keepAspect,false);
});
test('cópia mantém centímetros em múltiplos painéis com tamanhos diferentes',()=>{
 const s=eliteState(),src=s.panels.find(p=>p.id==='sleeve-strip-7');
 src.cm={w:38,h:4};s.panels.find(p=>p.id==='sleeve-strip-8').cm={w:42,h:6};
 s.panels.find(p=>p.id==='sleeve-right').cm={w:38,h:27};s.active=src.id;
 const original=applyGraphic(s,'wave',{createNew:true}).layer;original.rotation=45;
 const before=JSON.stringify(s),cm=graphicCm(original,src),output=copyGraphicToPanels(s,{sourcePanelId:src.id,graphicId:original.id,targetPanelIds:['sleeve-strip-8','sleeve-right']});
 assert.equal(output.created.length,2);assert.equal(JSON.stringify(s),before);
 for(const item of output.created){
  const dest=output.state.panels.find(p=>p.id===item.panelId),copy=dest.layers.find(l=>l.id===item.layerId),size=graphicCm(copy,dest);
  assert.ok(Math.abs(size.width-cm.width)<1e-10);assert.ok(Math.abs(size.height-cm.height)<1e-10);
  assert.equal(copy.rotation,45);assert.notEqual(copy.id,original.id);
 }
 assert.equal(validateSimulatorState(output.state).panels.length,19);
});
test('cópia impossível não modifica nem reduz a imagem',()=>{
 const s=eliteState();s.active='front';const g=applyGraphic(s,'wave',{createNew:true}).layer;
 s.panels.find(p=>p.id==='sleeve-strip-7').cm={w:38,h:4};const before=JSON.stringify(s);
 assert.throws(()=>copyGraphicToPanels(s,{sourcePanelId:'front',graphicId:g.id,targetPanelIds:['sleeve-strip-7']}),/não é possível manter/i);
 assert.equal(JSON.stringify(s),before);
});
test('grafismo antigo é convertido à razão visual original quando editado',()=>{
 const p={cm:{w:38,h:4}},legacy={w:.8,h:.3};
 promoteGraphicSize(legacy,p,1);
 const size=graphicCm(legacy,p);
 assert.ok(Math.abs(size.width/size.height-1)<1e-10);
 assert.equal(legacy.keepAspect,true);
 assert.ok(naturalGraphicSize(p,2).widthCm>0);
});
