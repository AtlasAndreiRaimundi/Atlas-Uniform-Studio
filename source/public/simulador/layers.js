import {activePanel,selectedLayer,layer,contains,clone,uid,visiblePanels} from './core.js';
import {GRAPHICS,AVAILABLE_GRAPHICS} from './graphics.js';
import {GRAPHIC_LIMITS,naturalGraphicSize,promoteGraphicSize,graphicCm} from './graphic-fit.js';
import {DEFAULT_ACCENT} from './catalog.js';

export const isGraphic=l=>l.type==='pattern'||l.type==='svg-graphic';
// All renderers and picking share this stable order, including older drawings.
export const drawingLayers=panel=>[...panel.layers.filter(isGraphic),...panel.layers.filter(l=>!isGraphic(l))];
export const pickDrawingLayer=(panel,point)=>drawingLayers(panel).reverse().find(l=>contains(l,point.x,point.y))??null;

export function graphicTarget(state,rememberedId){
 const panel=activePanel(state),selected=selectedLayer(state);
 return (selected&&isGraphic(selected)?selected:null)??panel.layers.find(l=>l.id===rememberedId&&isGraphic(l))??panel.layers.filter(isGraphic).at(-1)??null;
}
export function applyGraphic(state,graphicId,{createNew=false,targetId}={}){
 const graphic=AVAILABLE_GRAPHICS.find(g=>g.id===graphicId);if(!graphic)throw Error('Escolha um grafismo disponível na biblioteca.');
 const panel=activePanel(state),target=createNew?null:targetId===undefined?graphicTarget(state):panel.layers.find(l=>l.id===targetId&&isGraphic(l));
 if(!createNew&&targetId!==undefined&&!target)throw Error('O grafismo em edição mudou. Selecione-o novamente.');
 if(target?.locked)throw Error('Este grafismo está fixado. Desfixe-o para trocar o desenho ou adicione outro grafismo.');
 const naturalAspect=graphic.w/graphic.h;
 let result=target;
 if(target){
  // Changing a graphic does not reuse the thin panel's ratio; retain the selected
  // visual width in centimetres and construct the replacement at natural aspect.
  const previous=target.naturalAspect?{w:target.w}:promoteGraphicSize({...target},panel,target.type==='svg-graphic'?(target.pixels?.w||1)/(target.pixels?.h||1):(GRAPHICS.find(g=>g.id===target.pattern)?.w||1)/(GRAPHICS.find(g=>g.id===target.pattern)?.h||1));
  const size=naturalGraphicSize(panel,naturalAspect,previous.w*panel.cm.w);
  target.type='pattern';target.pattern=graphic.id;target.name=graphic.name;
  target.w=size.w;target.h=size.h;target.naturalAspect=naturalAspect;target.keepAspect=true;
  delete target.src;delete target.pixels;delete target.vector;
 }else{
  if(panel.layers.length>=60||state.panels.reduce((n,p)=>n+p.layers.length,0)>=200)throw Error('Use até 60 elementos por painel e 200 por uniforme. Remova um elemento antes de adicionar outro.');
  const size=naturalGraphicSize(panel,naturalAspect);
  result=layer('pattern',{name:graphic.name,pattern:graphic.id,color:DEFAULT_ACCENT.hex,colorId:DEFAULT_ACCENT.id,w:size.w,h:size.h,naturalAspect,keepAspect:true});
  panel.layers.push(result);panel.layers=drawingLayers(panel);
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

// Copy a single graphic to any selection of other panels, keeping its exact
// physical dimensions in centimetres rather than copying UV percentages.
export function copyGraphicToPanels(state,{sourcePanelId,graphicId,targetPanelIds},{idFactory=uid}={}){
 const source=state.panels.find(p=>p.id===sourcePanelId);
 const original=source?.layers.find(l=>l.id===graphicId&&isGraphic(l));
 if(!original)throw Error('Escolha um grafismo de origem.');
 if(!Array.isArray(targetPanelIds)||!targetPanelIds.length||new Set(targetPanelIds).size!==targetPanelIds.length)throw Error('Escolha pelo menos um painel de destino.');
 const targets=targetPanelIds.map(id=>visiblePanels(state).find(p=>p.id===id));
 if(targets.some((p,i)=>!p||p.id===sourcePanelId))throw Error('Escolha outros painéis disponíveis neste uniforme.');
 const master=clone(original);
 const ratio=master.naturalAspect??(master.type==='svg-graphic'?(master.pixels?.w||1)/(master.pixels?.h||1):(GRAPHICS.find(g=>g.id===master.pattern)?.w||1)/(GRAPHICS.find(g=>g.id===master.pattern)?.h||1));
 promoteGraphicSize(master,source,ratio);
 const cm=graphicCm(master,source),min=GRAPHIC_LIMITS;
 const next=clone(state),total=next.panels.reduce((n,p)=>n+p.layers.length,0);
 if(total+targets.length>200||targets.some(p=>p.layers.length>=60))throw Error('Limite de 60 elementos por painel ou 200 por uniforme. Remova elementos antes de copiar.');
 const created=[];
 for(const target of targets){
  const w=cm.width/target.cm.w,h=cm.height/target.cm.h;
  if(w<min.minW-1e-8||w>min.maxW+1e-8||h<min.minH-1e-8||h>min.maxH+1e-8){
   throw Error(`Não é possível manter exatamente ${cm.width.toFixed(1)} × ${cm.height.toFixed(1)} cm no painel "${target.label}" com os limites atuais. Ajuste o grafismo original antes de copiar.`);
  }
  const copy={...clone(master),id:idFactory(),w,h,locked:false};
  delete copy.copyKey;
  next.panels.find(p=>p.id===target.id).layers.push(copy);
  created.push({panelId:target.id,layerId:copy.id});
 }
 next.order=null;
 if(JSON.stringify(next).length>10*1024*1024)throw Error('A cópia excede o espaço de 10 MB do desenho.');
 return {state:next,created,widthCm:cm.width,heightCm:cm.height};
}
