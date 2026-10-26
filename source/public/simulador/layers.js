import {activePanel,selectedLayer,layer,contains} from './core.js';
import {GRAPHICS} from './graphics.js';
import {DEFAULT_ACCENT} from './catalog.js';

export const isGraphic=l=>l.type==='pattern';
// All renderers and picking share this stable order, including older drawings.
export const drawingLayers=panel=>[...panel.layers.filter(isGraphic),...panel.layers.filter(l=>!isGraphic(l))];
export const pickDrawingLayer=(panel,point)=>drawingLayers(panel).reverse().find(l=>contains(l,point.x,point.y))??null;

export function graphicTarget(state,rememberedId){
 const panel=activePanel(state),selected=selectedLayer(state);
 return (selected&&isGraphic(selected)?selected:null)??panel.layers.find(l=>l.id===rememberedId&&isGraphic(l))??panel.layers.filter(isGraphic).at(-1)??null;
}
export function applyGraphic(state,graphicId,{createNew=false,targetId}={}){
 const graphic=GRAPHICS.find(g=>g.id===graphicId);if(!graphic)throw Error('Escolha um grafismo da biblioteca.');
 const panel=activePanel(state),target=createNew?null:targetId===undefined?graphicTarget(state):panel.layers.find(l=>l.id===targetId&&isGraphic(l));
 if(!createNew&&targetId!==undefined&&!target)throw Error('O grafismo em edição mudou. Selecione-o novamente.');
 if(target?.locked)throw Error('Este grafismo está fixado. Desfixe-o para trocar o desenho ou adicione outro grafismo.');
 let result=target;
 if(target){target.pattern=graphic.id;target.name=graphic.name;}
 else{
  if(panel.layers.length>=60||state.panels.reduce((n,p)=>n+p.layers.length,0)>=200)throw Error('Use até 60 elementos por painel e 200 por uniforme. Remova um elemento antes de adicionar outro.');
  result=layer('pattern',{name:graphic.name,pattern:graphic.id,color:DEFAULT_ACCENT.hex,colorId:DEFAULT_ACCENT.id,w:graphic.w,h:graphic.h});panel.layers.push(result);panel.layers=drawingLayers(panel);
 }
 state.selected=result.id;state.order=null;return {layer:result,created:!target};
}
function neighbour(panel,id,delta){
 const current=panel.layers.find(l=>l.id===id);if(!current||current.locked||![-1,1].includes(delta))return null;
 const group=panel.layers.filter(l=>isGraphic(l)===isGraphic(current)),index=group.indexOf(current);return group[index+delta]??null;
}
export const canShiftLayer=(panel,id,delta)=>!!neighbour(panel,id,delta);
export function shiftLayer(panel,id,delta){
 const next=neighbour(panel,id,delta);if(!next)return false;
 const ordered=drawingLayers(panel),from=ordered.findIndex(l=>l.id===id),to=ordered.indexOf(next);[ordered[from],ordered[to]]=[ordered[to],ordered[from]];panel.layers=ordered;return true;
}
