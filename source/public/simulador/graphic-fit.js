// Keep the visual aspect ratio in physical panel space, not only in canvas pixels.
// The 3D texture is square even when the underlying pattern piece is a narrow strip.
export function fitGraphicBox(w,h,canvasWidth,canvasHeight,panel,sourceAspect=1){
 const cmW=Number(panel?.cm?.w),cmH=Number(panel?.cm?.h);
 if(!(w>0&&h>0&&canvasWidth>0&&canvasHeight>0&&sourceAspect>0&&cmW>0&&cmH>0))return {w,h};
 const pixelAspect=sourceAspect*(canvasWidth/cmW)/(canvasHeight/cmH);
 if(w/h>pixelAspect)return {w:h*pixelAspect,h};
 return {w,h:w/pixelAspect};
}
