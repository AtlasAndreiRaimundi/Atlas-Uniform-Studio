import {clone,uid,visiblePanels,normalizeText,personalizationRole} from './core.js';
import {paletteColor} from './catalog.js';
export const SIDE_PAIRS=Object.freeze([
 {id:'sleeves',label:'Mangas',panels:['sleeve-right','sleeve-left']},
 {id:'strips',label:'Filetes das mangas',panels:['sleeve-strip-7','sleeve-strip-8']},
 {id:'shorts',label:'Lados do calção',panels:['short-panel-5','short-panel-6']},
 {id:'sides',label:'Recortes laterais',panels:['side-right','side-left']},
]);
export const sidePairs=s=>{const ids=new Set(visiblePanels(s).map(p=>p.id));return SIDE_PAIRS.filter(p=>p.panels.every(id=>ids.has(id)));};
// Only fresh creations opt in automatically. Never apply defaults when opening
// a saved design: absence of a pair also records the user's choice to disable it.
export const defaultLiveSymmetry=state=>Object.fromEntries(sidePairs(state).map(pair=>[pair.id,{mode:'mirror',scope:'patterns',colors:false,base:false}]));
const key=l=>l.copyKey||l.id;
const included=(l,scope)=>scope==='all'||l.type==='pattern';
function score(a,b){
 if(a.type!==b.type)return 0;if(key(a)===key(b))return 100;
 if(a.type==='image')return a.src===b.src?80:0;
 if(a.type==='pattern'&&a.pattern!==b.pattern)return 0;
 if(a.type==='text'&&!(personalizationRole(a)&&personalizationRole(a)===personalizationRole(b))&&a.text!==b.text)return 0;
 return a.name===b.name?60:40;
}
function counterpart(l,candidates,used){let match=null,best=0;for(const candidate of candidates){if(used.has(candidate.id))continue;const value=score(l,candidate);if(value>best){match=candidate;best=value;}}if(match)used.add(match.id);return match;}
function copiedLayer(original,mirror,id,locked=false){
 const copied={...original,id,copyKey:key(original),locked};if(original.pixels)copied.pixels={...original.pixels};
 if(mirror){copied.x=1-original.x;copied.rotation=original.type==='text'?0:-original.rotation;if(original.type==='pattern')copied.mirrorX=!original.mirrorX;}
 return normalizeText(copied);
}
function limits(state,checkBytes=true){
 if(state.panels.some(p=>p.layers.length>60)||state.panels.reduce((n,p)=>n+p.layers.length,0)>200)throw Error('A simetria ultrapassa o limite de 60 elementos por painel ou 200 por uniforme. Remova elementos ou desligue este par.');
 if(checkBytes&&JSON.stringify(state).length>10*1024*1024)throw Error('A cópia excede o espaço do desenho. Reduza as logos antes de copiar.');
}
function resolvePair(state,pairId,sourceId){const pair=sidePairs(state).find(p=>p.id===pairId);if(!pair||!pair.panels.includes(sourceId))throw Error('Escolha um par de painéis disponível neste uniforme.');return {pair,source:state.panels.find(p=>p.id===sourceId),target:state.panels.find(p=>p.id===pair.panels.find(id=>id!==sourceId))};}
export function copySideDetails(state,{pairId,sourceId,mirror=true,colorPolicy='target',colorId,copyBase=false,writeMode='merge',layerIds=null},{idFactory=uid}={}){
 const {source,target}=resolvePair(state,pairId,sourceId);
 if(!['target','source','custom'].includes(colorPolicy)||!['merge','replace'].includes(writeMode))throw Error('Confira as opções de cópia.');
 const requested=layerIds===null?null:new Set(layerIds),chosen=source.layers.filter(l=>!requested||requested.has(l.id));
 if(requested&&chosen.length!==requested.size)throw Error('Um dos elementos mudou. Abra a cópia novamente.');
 if(!chosen.length&&!copyBase)throw Error('Escolha elementos ou marque a cópia da cor de fundo.');
 const custom=colorPolicy==='custom'?paletteColor(colorId):null;if(colorPolicy==='custom'&&!custom)throw Error('Escolha uma cor para os detalhes copiados.');
 const next=clone(state),destination=next.panels.find(p=>p.id===target.id),used=new Set(),written=[],stats={added:0,updated:0,preservedColors:0,sourceColors:0,sourceCount:chosen.length,targetCount:target.layers.length};
 for(const original of chosen){
  const match=counterpart(original,target.layers,used),copy=copiedLayer(original,mirror,idFactory());
  if(copy.type!=='image'){if(custom){copy.color=custom.hex;copy.colorId=custom.id;}else if(colorPolicy==='target'&&match){copy.color=match.color;copy.colorId=match.colorId;stats.preservedColors++;}else stats.sourceColors++;}
  if(writeMode==='merge'&&match){destination.layers[destination.layers.findIndex(l=>l.id===match.id)]=copy;stats.updated++;}else{if(writeMode==='merge')destination.layers.push(copy);stats.added++;}written.push(copy);
 }
 if(writeMode==='replace')destination.layers=written;
 if(copyBase){destination.color=source.color;destination.colorId=source.colorId;}
 next.active=target.id;next.selected=written[0]?.id??null;next.order=null;limits(next);return {state:next,sourceId,targetId:target.id,stats};
}

export function normalizeSymmetry(value){
 if(value==null)return {};
 if(typeof value!=='object'||Array.isArray(value)||Object.keys(value).length>4)throw Error('Confira os pares de simetria em tempo real.');
 const out={};for(const [id,config]of Object.entries(value)){
  if(!SIDE_PAIRS.some(p=>p.id===id)||!config||typeof config!=='object'||Array.isArray(config)||!['mirror','same'].includes(config.mode)||!['patterns','all'].includes(config.scope)||typeof config.colors!=='boolean'||typeof config.base!=='boolean')throw Error('Confira as opções de atualização simétrica.');
  out[id]={mode:config.mode,scope:config.scope,colors:config.colors,base:config.base};
 }return out;
}
// Local copies keep stable counterpart IDs in live mode. Immutable logo strings
// are shared by value, while mutable layer/size objects remain independent.
function synchronizePair(state,pair,sourceId,config,idFactory=uid){
 const source=state.panels.find(p=>p.id===sourceId),target=state.panels.find(p=>p.id===pair.panels.find(id=>id!==sourceId));if(!source||!target)return;
 const originals=source.layers.filter(l=>included(l,config.scope)),candidates=target.layers.filter(l=>included(l,config.scope)),used=new Set();
 const copies=originals.map(l=>{const match=counterpart(l,candidates,used),copy=copiedLayer(l,config.mode==='mirror',match?.id||idFactory(),match?.locked||false);if(!config.colors&&match&&copy.type!=='image'){copy.color=match.color;copy.colorId=match.colorId;}return copy;});
 if(config.scope==='all')target.layers=copies;
 else {let i=0;const layers=[];for(const old of target.layers){if(included(old,config.scope)){if(i<copies.length)layers.push(copies[i++]);}else layers.push(old);}target.layers=layers.concat(copies.slice(i));}
 if(config.base){target.color=source.color;target.colorId=source.colorId;}
 return {sourceId:source.id,targetId:target.id,sourceCount:originals.length,targetCount:candidates.length};
}
export function setLiveSymmetry(state,{pairId,sourceId,mode='mirror',scope='patterns',colors=false,base=false},{idFactory=uid}={}){
 const {pair}=resolvePair(state,pairId,sourceId),next=clone(state),config=normalizeSymmetry({[pairId]:{mode,scope,colors,base}})[pairId];
 next.symmetry={...(next.symmetry||{}),[pairId]:config};const stats=synchronizePair(next,pair,sourceId,config,idFactory);next.order=null;limits(next);return {state:next,sourceId:stats.sourceId,targetId:stats.targetId,stats};
}
export function disableLiveSymmetry(state,pairId){const next=clone(state);if(next.symmetry){delete next.symmetry[pairId];if(!Object.keys(next.symmetry).length)delete next.symmetry;}return next;}
function changed(panel,old,config){
 if(!old)return true;if(config.base&&(panel.color!==old.color||panel.colorId!==old.colorId))return true;
 const a=panel.layers.filter(l=>included(l,config.scope)),b=old.layers.filter(l=>included(l,config.scope));if(a.length!==b.length)return true;
 const fields=['id','type','name','x','y','w','h','rotation','opacity','pattern','mirrorX','text','font','personalization','src','vector',...(config.colors?['color','colorId']:[])];
 return a.some((l,i)=>fields.some(f=>l[f]!==b[i][f]));
}
// Called on every drag/slider input as well as each committed edit. Both sides
// can be the origin; the active panel wins when a gesture has changed both.
export function synchronizeLive(state,previous){
 let structural=false;
 for(const pair of SIDE_PAIRS){const config=state.symmetry?.[pair.id];if(!config)continue;
  const changedIds=pair.panels.filter(id=>{const p=state.panels.find(p=>p.id===id);return p&&changed(p,previous?.panels.find(p=>p.id===id),config);});if(!changedIds.length)continue;
  const sourceId=changedIds.includes(state.active)?state.active:changedIds[0];
  for(const id of pair.panels){const p=state.panels.find(p=>p.id===id),old=previous?.panels.find(p=>p.id===id);if(p.layers.length!==old?.layers.length||p.layers.some(l=>!old?.layers.some(o=>o.id===l.id&&o.src===l.src)))structural=true;}
  synchronizePair(state,pair,sourceId,config);
 }
 limits(state,structural);return state;
}
