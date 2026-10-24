import {ORDER_PAGE} from './order-image-layout.js?v=3';
// The whole A4 page is available for manual layout.
export const NOTE_AREA={...ORDER_PAGE};
export const notePoint=p=>({x:Math.max(0,Math.min(NOTE_AREA.w,p.x)),y:Math.max(0,Math.min(NOTE_AREA.h,p.y))});
export function newAnnotation(type,productId='',point={x:60,y:180}){
 const p=notePoint(point);return {id:crypto.randomUUID(),type,productId,text:['text','callout'].includes(type)?'Acabamento':'',...p,x2:Math.min(NOTE_AREA.w,p.x+100),y2:Math.min(NOTE_AREA.h,p.y+60),color:'#c52a36',size:9,width:1};
}
export function moveAnnotation(value,dx,dy,handle='move'){
 const a={...value};
 if(handle==='start'||handle==='end'){const p=notePoint({x:(handle==='end'?a.x2:a.x)+dx,y:(handle==='end'?a.y2:a.y)+dy});if(handle==='end'){a.x2=p.x;a.y2=p.y;}else{a.x=p.x;a.y=p.y;}return a;}
 const xs=a.type==='text'?[a.x]:[a.x,a.x2],ys=a.type==='text'?[a.y]:[a.y,a.y2];
 dx=Math.max(-Math.min(...xs),Math.min(NOTE_AREA.w-Math.max(...xs),dx));dy=Math.max(-Math.min(...ys),Math.min(NOTE_AREA.h-Math.max(...ys),dy));
 const end=notePoint({x:a.x2+dx,y:a.y2+dy});return {...a,x:a.x+dx,y:a.y+dy,x2:end.x,y2:end.y};
}
export function annotationVisible(a,products){return !a.productId||products.some(p=>p.id===a.productId);}
