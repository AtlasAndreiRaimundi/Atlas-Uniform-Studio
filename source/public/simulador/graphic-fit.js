// Dimensions are expressed in physical centimetres, independently of the panel UV aspect.
// A narrow cuff must not squeeze an originally square SVG or procedural graphic.
export function fitGraphicBox(w,h,canvasWidth,canvasHeight,panel,sourceAspect=1){
 const cmW=Number(panel?.cm?.w),cmH=Number(panel?.cm?.h);
 if(!(w>0&&h>0&&canvasWidth>0&&canvasHeight>0&&sourceAspect>0&&cmW>0&&cmH>0))return {w,h};
 const pixelAspect=sourceAspect*(canvasWidth/cmW)/(canvasHeight/cmH);
 if(w/h>pixelAspect)return {w:h*pixelAspect,h};
 return {w,h:w/pixelAspect};
}
const finite=(value)=>Number.isFinite(Number(value))&&Number(value)>0;
// These correspond to the existing simulator server validation bounds.
export const GRAPHIC_LIMITS=Object.freeze({minW:.035,maxW:1.8,minH:.015,maxH:2});
export function naturalGraphicSize(panel,aspect,requestedWidthCm){
 const cmW=Number(panel?.cm?.w),cmH=Number(panel?.cm?.h),ratio=Number(aspect);
 if(!finite(cmW)||!finite(cmH)||!finite(ratio)||ratio<.001||ratio>1000)throw Error('O grafismo não tem proporções válidas.');
 const limits=GRAPHIC_LIMITS;
 const lower=Math.max(limits.minW*cmW,limits.minH*cmH*ratio);
 const upper=Math.min(limits.maxW*cmW,limits.maxH*cmH*ratio);
 if(lower>upper+1e-8)throw Error('Este grafismo tem proporção extrema para os limites atuais do painel.');
 const ideal=requestedWidthCm===undefined?Math.min(cmW*.78,cmH*.72*ratio):Number(requestedWidthCm);
 if(!finite(ideal))throw Error('Informe uma medida válida em centímetros.');
 const widthCm=Math.min(upper,Math.max(lower,ideal));
 return {w:widthCm/cmW,h:widthCm/ratio/cmH,widthCm,heightCm:widthCm/ratio};
}
// Older designs used a virtual bounding box and were proportionalized at drawing time.
// Convert them once when edited/copied, keeping their visible artwork size.
export function promoteGraphicSize(layer,panel,aspect){
 if(layer.naturalAspect!==undefined)return layer;
 const visible=fitGraphicBox(layer.w,layer.h,1,1,panel,aspect);
 const size=naturalGraphicSize(panel,aspect,visible.w*panel.cm.w);
 layer.w=size.w;layer.h=size.h;layer.naturalAspect=aspect;layer.keepAspect=true;
 return layer;
}
export function editGraphicDimension(layer,panel,dimension,centimetres){
 if(!['width','height'].includes(dimension)||!finite(centimetres))throw Error('Informe largura ou altura válida em centímetros.');
 const aspect=layer.naturalAspect;
 if(!finite(aspect))throw Error('Selecione um grafismo com proporção original conhecida.');
 if(layer.keepAspect!==false){
  const preferredWidth=dimension==='width'?Number(centimetres):Number(centimetres)*aspect;
  const size=naturalGraphicSize(panel,aspect,preferredWidth);
  layer.w=size.w;layer.h=size.h;
 }else{
  const axis=dimension==='width'?'w':'h',limitMin=axis==='w'?GRAPHIC_LIMITS.minW:GRAPHIC_LIMITS.minH,limitMax=axis==='w'?GRAPHIC_LIMITS.maxW:GRAPHIC_LIMITS.maxH;
  const value=Number(centimetres)/panel.cm[axis];
  layer[axis]=Math.min(limitMax,Math.max(limitMin,value));
 }
 return layer;
}
export function graphicCm(layer,panel){return {width:layer.w*panel.cm.w,height:layer.h*panel.cm.h};}
