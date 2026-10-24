import {sanitizeVisuals} from './presentation.js';
export function cleanCamera(value){
  if(!value||!['position','target'].every(key=>Array.isArray(value[key])&&value[key].length===3&&value[key].every(n=>typeof n==='number'&&Number.isFinite(n)&&Math.abs(n)<=100)))return null;
  const distance=Math.hypot(...value.position.map((n,i)=>n-value.target[i]));
  if(distance<.03||distance>100)return null;
  return {position:[...value.position],target:[...value.target]};
}
export function cleanPresentation(value={}){
  return {layout:value?.layout==='grid'?'grid':'line',camera:cleanCamera(value?.camera),
    details:(Array.isArray(value?.details)?value.details:[]).slice(0,8).map(item=>({id:String(item.id||'').slice(0,80),name:String(item.name||'Detalhe').trim().slice(0,50),camera:cleanCamera(item.camera)})).filter(item=>item.camera)};
}
export function cleanPreset(value={}){return {visuals:sanitizeVisuals(value.visuals),presentation:cleanPresentation(value.presentation),brand:'atlas'};}
export function cleanAnchor(value){
  const camera=cleanCamera(value?.camera),point=value?.point;
  if(!camera||!Array.isArray(point)||point.length!==3||!point.every(n=>typeof n==='number'&&Number.isFinite(n)&&Math.abs(n)<=20))return null;
  return {point:[...point],camera,panel:String(value.panel||'Peça').slice(0,80)};
}
export const APPROVAL_STATEMENT='Aprovo esta versão específica da arte e autorizo sua produção conforme apresentada.';
