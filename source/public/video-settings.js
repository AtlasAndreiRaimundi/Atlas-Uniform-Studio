export const VIDEO_SECONDS=Object.freeze([10,15,30]);
export const VIDEO_SIZES=Object.freeze({
 '720p':Object.freeze({'16:9':[1280,720],'9:16':[720,1280],'1:1':[720,720]}),
 '1080p':Object.freeze({'16:9':[1920,1080],'9:16':[1080,1920],'1:1':[1080,1080]}),
});
export function videoSettings(value={}){
 const resolution=Object.hasOwn(VIDEO_SIZES,value.videoResolution)?value.videoResolution:'1080p',aspect=Object.hasOwn(VIDEO_SIZES[resolution],value.aspect)?value.aspect:'16:9';
 const [width,height]=VIDEO_SIZES[resolution][aspect],motion=value.motion==='compatible'?'compatible':'smooth',fps=motion==='smooth'?60:30;
 return {videoResolution:resolution,aspect,seconds:VIDEO_SECONDS.includes(Number(value.seconds))?Number(value.seconds):10,motion,fps,width,height,backgroundFit:value.backgroundFit==='contain'?'contain':'cover'};
}
export const smoothVideoAvailable=()=>typeof globalThis.VideoEncoder==='function'&&typeof globalThis.VideoFrame==='function';
export function backgroundRect(sw,sh,width,height,fit='cover'){
 const scale=(fit==='contain'?Math.min:Math.max)(width/sw,height/sh);
 return {x:(width-sw*scale)/2,y:(height-sh*scale)/2,width:sw*scale,height:sh*scale};
}
export async function readVideoBackground(file){
 if(!file||!['image/png','image/jpeg','image/webp'].includes(file.type)||file.size>20*1024*1024)throw new Error('Use um fundo PNG, JPG ou WebP de até 20 MB.');
 const url=URL.createObjectURL(file),image=new Image();
 try{image.src=url;await image.decode();const width=image.naturalWidth,height=image.naturalHeight;
  if(!width||!height||width*height>40000000)throw new Error('Use um fundo com até 40 milhões de pixels.');
  return {image,width,height,name:file.name,dispose(){image.src='';URL.revokeObjectURL(url);}};
 }catch(error){URL.revokeObjectURL(url);throw new Error(error.message?.startsWith('Use um fundo')?error.message:'Não foi possível abrir o fundo. Tente outro arquivo.');}
}
