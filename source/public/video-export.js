import {drawBrandLogo} from './brand-assets.js';
import {Color,PerspectiveCamera,Vector2,Vector3,Vector4} from './vendor/three/build/three.module.min.js';
import {paintBackdrop,sanitizeVisuals} from './presentation.js';
import {videoSettings,backgroundRect,smoothVideoAvailable} from './video-settings.js?v=1';
const cancelled=()=>new Error('Gravação cancelada.');
function checkAbort(signal){if(signal?.aborted)throw cancelled();}
const yieldUI=()=>new Promise(resolve=>setTimeout(resolve,0));

// Resize once for the entire movie. The live viewer is paused by exportContext.
export function videoFrameSource(context,options={}){
 const settings=videoSettings(options),{width,height}=settings,{renderer,scene,liveCamera,bounds,logo}=context;
 if(bounds.isEmpty())throw new Error('Aguarde o molde carregar antes de gerar o vídeo.');
 const canvas=document.createElement('canvas'),backdrop=document.createElement('canvas'),overlay=document.createElement('canvas');
 for(const c of [canvas,backdrop,overlay]){c.width=width;c.height=height;}
 const ctx=canvas.getContext('2d'),s=sanitizeVisuals(context.settings),back=backdrop.getContext('2d'),front=overlay.getContext('2d');
 paintBackdrop(back,width,height,s);
 if(options.backgroundImage){const image=options.backgroundImage,r=backgroundRect(image.naturalWidth||image.width,image.naturalHeight||image.height,width,height,settings.backgroundFit);back.drawImage(image,r.x,r.y,r.width,r.height);}
 const m=width*.045,head=height*.13;front.fillStyle='#17191b';front.fillRect(0,0,width,head);front.fillRect(0,height*.94,width,height*.06);
 drawBrandLogo(front,logo,m,head*.18,width*.24,head*.65);front.fillStyle='#bba77d';front.fillRect(m,head-2,width-2*m,1);
 front.textAlign='right';front.fillStyle='#e7e6e0';front.font='700 '+Math.min(width*.025,height*.045)+'px "Chakra Petch",Arial';front.fillText(context.name||'Seu uniforme',width-m,head*.47,width*.61);
 front.fillStyle='#c4b18a';front.font='400 '+Math.max(10,Math.min(width*.012,height*.024))+'px "Chakra Petch",Arial';front.fillText('APRESENTAÇÃO 360°',width-m,head*.77,width*.63);
 front.textAlign='left';front.fillText('Design por '+(context.designerName||'Atlas'),m,height*.978,width-2*m);
 const center=bounds.getCenter(new Vector3()),size=bounds.getSize(new Vector3()),camera=new PerspectiveCamera(32,width/height,.03,500),radius=Math.hypot(size.x,size.z)/2,tanY=Math.tan(32*Math.PI/360),tanX=tanY*width/height;
 const distance=Math.max(size.y*.58/(tanY*.78)+radius,radius/(tanX*.88)+radius)*1.08;
 const saved={size:renderer.getSize(new Vector2()),ratio:renderer.getPixelRatio(),viewport:renderer.getViewport(new Vector4()),scissor:renderer.getScissor(new Vector4()),scissorTest:renderer.getScissorTest(),target:renderer.getRenderTarget(),cube:renderer.getActiveCubeFace(),mip:renderer.getActiveMipmapLevel(),background:scene.background,color:renderer.getClearColor?.(new Color()),alpha:renderer.getClearAlpha?.(),visibility:options.backgroundImage?(context.productionHidden||[]).filter(Boolean).map(o=>[o,o.visible]):[]};
 let restored=false;
 function restore(){if(restored)return;restored=true;scene.background=saved.background;if(saved.color)renderer.setClearColor(saved.color,saved.alpha);for(const [o,visible] of saved.visibility)o.visible=visible;
  renderer.setPixelRatio(saved.ratio);renderer.setSize(saved.size.x,saved.size.y,false);renderer.setRenderTarget(saved.target,saved.cube,saved.mip);renderer.setViewport(saved.viewport);renderer.setScissor(saved.scissor);renderer.setScissorTest(saved.scissorTest);renderer.render(scene,liveCamera);for(const c of [canvas,backdrop,overlay])c.width=c.height=1;
 }
 try{scene.background=null;renderer.setClearColor?.(0x000000,0);for(const [o]of saved.visibility)o.visible=false;renderer.setPixelRatio(1);renderer.setSize(width,height,false);renderer.setRenderTarget(null);renderer.setScissorTest(false);}
 catch(error){restore();throw error;}
 function draw(progress){
  const angle=progress*Math.PI*2;camera.position.set(center.x+Math.sin(angle)*distance,center.y+size.y*.08,center.z+Math.cos(angle)*distance);camera.lookAt(center);camera.updateMatrixWorld(true);
  renderer.render(scene,camera);ctx.drawImage(backdrop,0,0);ctx.save();ctx.filter='contrast('+s.contrast/100+')';ctx.drawImage(renderer.domElement,0,0);ctx.restore();ctx.drawImage(overlay,0,0);return canvas;
 }
 return {canvas,draw,restore,settings};
}
export function createVideoPreview(context,options={}){
 const s=videoSettings(options),source=videoFrameSource(context,{...options,videoResolution:'720p'}),target=document.createElement('canvas');
 try{source.draw(0);const scale=Math.min(1,640/Math.max(s.width,s.height));target.width=Math.round(s.width*scale);target.height=Math.round(s.height*scale);target.getContext('2d').drawImage(source.canvas,0,0,target.width,target.height);return target;}
 finally{source.restore();}
}
export function videoType(Recorder=globalThis.MediaRecorder){if(!Recorder?.isTypeSupported)return '';return ['video/mp4','video/mp4;codecs=avc1.420028','video/webm;codecs=vp8','video/webm;codecs=vp9','video/webm'].find(type=>Recorder.isTypeSupported(type))||'';}
export async function smoothEncoderConfig(settings,Encoder=globalThis.VideoEncoder){
 if(!Encoder?.isConfigSupported)return null;
 const {width,height,fps}=settings,bitrate=Math.round(Math.min(16000000,Math.max(3000000,width*height*fps*.11)));
 for(const codec of ['avc1.42002a','avc1.4d002a','avc1.420028']){
  const config={codec,width,height,framerate:fps,bitrate,latencyMode:'realtime',avc:{format:'avc'}};
  try{if((await Encoder.isConfigSupported(config)).supported)return config;}catch{/* Try the next codec supported by this browser. */}
 }
 return null;
}
// Frame timestamps come from their index, independently of rendering speed.
export async function encodeSmoothFrames(source,{signal,onProgress=()=>{},config,Encoder=globalThis.VideoEncoder,Frame=globalThis.VideoFrame}={}){
 const {Muxer,ArrayBufferTarget}=await import('./vendor/mp4-muxer/mp4-muxer.mjs'),s=source.settings,total=s.seconds*s.fps;
 const muxer=new Muxer({target:new ArrayBufferTarget(),video:{codec:'avc',width:s.width,height:s.height,frameRate:s.fps},fastStart:{expectedVideoChunks:total},firstTimestampBehavior:'strict'});
 let failure,encoder,encoded=0;const fail=error=>{failure=error instanceof Error?error:new Error('Não foi possível codificar o vídeo.');};
 checkAbort(signal);
 try{
  encoder=new Encoder({output:(chunk,meta)=>{try{
   const timestamp=Math.round(encoded*1000000/s.fps),duration=Math.round((encoded+1)*1000000/s.fps)-timestamp;
   if(chunk.timestamp!==timestamp)throw new Error('O navegador não conseguiu gerar todos os quadros em ordem.');
   const bytes=new Uint8Array(chunk.byteLength);chunk.copyTo(bytes);muxer.addVideoChunkRaw(bytes,chunk.type,timestamp,duration,meta);encoded++;
  }catch(e){fail(e);}},error:fail});encoder.configure(config);
  for(let i=0;i<total;i++){
   checkAbort(signal);if(failure)throw failure;const timestamp=Math.round(i*1000000/s.fps),duration=Math.round((i+1)*1000000/s.fps)-timestamp;
   const frame=new Frame(source.draw(i/total),{timestamp,duration});
   try{encoder.encode(frame,{keyFrame:i%(s.fps*2)===0});}finally{frame.close();}
   if(encoder.encodeQueueSize>=4)await encoder.flush();
   if(i%4===0){onProgress(i/total);await yieldUI();}
  }
  await encoder.flush();checkAbort(signal);if(failure)throw failure;if(encoded!==total)throw new Error('O navegador não conseguiu gerar todos os quadros. Tente HD 720p ou o modo Compatível.');muxer.finalize();onProgress(1);
  return {blob:new Blob([muxer.target.buffer],{type:'video/mp4'}),extension:'mp4',...s};
 }catch(error){checkAbort(signal);throw error;}
 finally{if(encoder&&encoder.state!=='closed')encoder.close();}
}
async function recordCompatible(source,{signal,onProgress=()=>{}}={}){
 const mimeType=videoType();if(!mimeType||!source.canvas.captureStream)throw new Error('Este navegador não oferece gravação compatível. Tente o modo Suave ou outro navegador.');
 const {width,height,seconds,fps}=source.settings;let stream,recorder,raf,start,resolve,reject,ended=false,last=-1;const chunks=[];
 const result=new Promise((res,rej)=>{resolve=res;reject=rej;});
 const stop=error=>{if(ended)return;ended=true;cancelAnimationFrame(raf);if(recorder?.state==='recording'){if(error)recorder.onstop=()=>reject(error);recorder.stop();}else error?reject(error):resolve();};
 const abort=()=>stop(cancelled()),hidden=()=>{if(document.hidden)stop(new Error('Gravação interrompida ao sair da aba. Mantenha o estúdio aberto ou use o modo Suave.'));};
 function draw(time){try{if(signal?.aborted)return abort();start??=time;const elapsed=(time-start)/1000,p=Math.min(1,elapsed/seconds),index=Math.min(seconds*fps,Math.floor(elapsed*fps+.0001));if(index!==last||p===1){last=index;source.draw(index/(seconds*fps));onProgress(p);}if(p>=1)stop();else raf=requestAnimationFrame(draw);}catch(error){stop(error);}}
 try{
  checkAbort(signal);source.draw(0);stream=source.canvas.captureStream(fps);recorder=new MediaRecorder(stream,{mimeType,videoBitsPerSecond:Math.round(Math.min(12000000,Math.max(3000000,width*height*fps*.12)))});
  recorder.ondataavailable=event=>{if(event.data.size)chunks.push(event.data);};recorder.onerror=event=>stop(event.error||new Error('O navegador não conseguiu gravar o vídeo.'));
  recorder.onstop=()=>{const type=chunks[0]?.type||recorder.mimeType||mimeType,blob=new Blob(chunks,{type});blob.size?resolve({blob,extension:type.includes('mp4')?'mp4':'webm',...source.settings}):reject(new Error('O navegador retornou um vídeo vazio.'));};
  signal?.addEventListener('abort',abort,{once:true});document.addEventListener('visibilitychange',hidden);recorder.start(250);raf=requestAnimationFrame(draw);return await result;
 }finally{cancelAnimationFrame(raf);signal?.removeEventListener('abort',abort);document.removeEventListener('visibilitychange',hidden);if(recorder?.state==='recording')recorder.stop();stream?.getTracks().forEach(t=>t.stop());}
}
export async function recordTurntable(context,options={}){
 const s=videoSettings(options);checkAbort(options.signal);
 let config;if(s.motion==='smooth'){if(!smoothVideoAvailable()||!(config=await smoothEncoderConfig(s)))throw new Error('O modo Suave não está disponível nesta resolução neste navegador. Tente HD 720p ou selecione Compatível.');}
 checkAbort(options.signal);const source=videoFrameSource(context,options);
 try{return s.motion==='smooth'?await encodeSmoothFrames(source,{...options,config}):await recordCompatible(source,options);}
 catch(error){checkAbort(options.signal);throw new Error(s.motion==='smooth'?'Não foi possível concluir o vídeo suave. Tente HD 720p ou o modo Compatível.':error.message||'Não foi possível gravar o vídeo.',{cause:error});}
 finally{source.restore();}
}
