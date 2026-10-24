export const ORDER_PAGE={x:0,y:0,w:841.89,h:595.28};
export function imageTransform(value={}){
 value??={};
 const bounded=(key,fallback,min,max)=>typeof value[key]==='number'&&Number.isFinite(value[key])?Math.max(min,Math.min(max,value[key])):fallback;
 const out={scale:bounded('scale',1,.05,10),x:bounded('x',.5,0,1),y:bounded('y',.5,0,1)};
 if(value.frame&&['x','y','w'].every(k=>typeof value.frame[k]==='number'&&Number.isFinite(value.frame[k])))out.frame={x:Math.max(-ORDER_PAGE.w*10,Math.min(ORDER_PAGE.w*10,value.frame.x)),y:Math.max(-ORDER_PAGE.h*10,Math.min(ORDER_PAGE.h*10,value.frame.y)),w:Math.max(.28,Math.min(ORDER_PAGE.w*10,value.frame.w))};
 return out;
}
const dimensions=new Map();
function imageSize(src){
 if(dimensions.has(src))return dimensions.get(src);let result=null;
 try{
  const bytes=Uint8Array.from(atob(src.split(',')[1]),c=>c.charCodeAt(0)),view=new DataView(bytes.buffer);
  if(src.startsWith('data:image/png')&&bytes.length>=24&&view.getUint32(0)===0x89504e47)result={w:view.getUint32(16),h:view.getUint32(20)};
  else if(bytes[0]===255&&bytes[1]===216){let at=2;while(at+8<bytes.length){if(bytes[at++]!==255)break;let marker=bytes[at++];while(marker===255)marker=bytes[at++];if(marker===0xda||marker===0xd9)break;const length=view.getUint16(at);if(length<2)break;if([0xc0,0xc1,0xc2,0xc3,0xc5,0xc6,0xc7,0xc9,0xca,0xcb,0xcd,0xce,0xcf].includes(marker)){result={h:view.getUint16(at+3),w:view.getUint16(at+5)};break;}at+=length;}}
 }catch{/* Invalid legacy placeholders use the available rectangle. */}
 if(!result?.w||!result?.h)result=null;if(dimensions.size>80)dimensions.clear();dimensions.set(src,result);return result;
}
export function placeOrderImage(src,area,value){
 const t=imageTransform(value),size=imageSize(src),ratio=size?size.w/size.h:area.w/area.h;
 if(t.frame)return {x:t.frame.x,y:t.frame.y,w:t.frame.w,h:t.frame.w/ratio};
 const w=Math.min(area.w,area.h*ratio)*t.scale,h=w/ratio;
 return {x:area.x+(area.w-w)*t.x,y:area.y+(area.h-h)*t.y,w,h};
}
