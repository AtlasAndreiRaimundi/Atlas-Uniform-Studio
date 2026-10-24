import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {readFile,mkdtemp,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {execFileSync} from 'node:child_process';
import {Box3,Color,PerspectiveCamera,Scene,Vector2,Vector3,Vector4} from '../public/vendor/three/build/three.module.min.js';
import {videoSettings,backgroundRect,readVideoBackground} from '../public/video-settings.js';
import {videoFrameSource,createVideoPreview,smoothEncoderConfig,encodeSmoothFrames,recordTurntable} from '../public/video-export.js';
const require=createRequire(import.meta.url),{createCanvas}=require(require.resolve('@napi-rs/canvas',{paths:[process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES||process.cwd()]}));

test('video presets retain all requested durations, aspect ratios, resolutions and motion modes',()=>{
 for(const seconds of [10,15,30])for(const aspect of ['16:9','9:16','1:1'])for(const videoResolution of ['720p','1080p']){
  const s=videoSettings({seconds,aspect,videoResolution});assert.equal(s.seconds,seconds);assert.equal(s.aspect,aspect);assert.equal(s.fps,60);assert.equal(s.width%2,0);assert.equal(s.height%2,0);const [w,h]=aspect.split(':').map(Number);assert.equal(s.width/s.height,w/h);
 }
 assert.equal(videoSettings({motion:'compatible'}).fps,30);assert.equal(videoSettings({seconds:6,videoResolution:'bad',aspect:'bad'}).seconds,10);
 assert.deepEqual(backgroundRect(400,400,1600,900),{x:0,y:-350,width:1600,height:1600});
 assert.deepEqual(backgroundRect(400,400,1600,900,'contain'),{x:350,y:0,width:900,height:900});
});

function fixture(){
 const liveCamera=new PerspectiveCamera(32,1.5,.03,100),scene=new Scene();scene.background=new Color('#123456');const floor={visible:true};
 const c=createCanvas(300,200),state={size:new Vector2(300,200),ratio:1,viewport:new Vector4(0,0,300,200),scissor:new Vector4(0,0,300,200),scissorTest:true,target:null};let resizes=0;
 const renderer={domElement:c,getSize:o=>o.copy(state.size),getPixelRatio:()=>state.ratio,getViewport:o=>o.copy(state.viewport),getScissor:o=>o.copy(state.scissor),getScissorTest:()=>state.scissorTest,getRenderTarget:()=>state.target,getActiveCubeFace:()=>0,getActiveMipmapLevel:()=>0,setPixelRatio:n=>{state.ratio=n;},setSize(w,h){resizes++;state.size.set(w,h);c.width=w;c.height=h;},setRenderTarget:t=>{state.target=t;},setViewport:v=>state.viewport.copy(v),setScissor:v=>state.scissor.copy(v),setScissorTest:v=>{state.scissorTest=v;},render(){const ctx=c.getContext('2d');ctx.clearRect(0,0,c.width,c.height);ctx.fillStyle='#00ff00';ctx.fillRect(c.width*.3,c.height*.25,c.width*.4,c.height*.5);}};
 return {renderer,scene,liveCamera,productionHidden:[floor],bounds:new Box3(new Vector3(-1,-1.4,-.2),new Vector3(1,1.4,.2)),logo:createCanvas(250,100),settings:{background:'dark'},name:'KIT EDGE 2027',state,floor,get resizes(){return resizes;}};
}
test('video uses one persistent capture size, preserves the camera and fits a custom background in each selected format',()=>{
 const previous=globalThis.document;globalThis.document={createElement:()=>createCanvas(1,1)};
 try{for(const aspect of ['16:9','9:16','1:1']){
  const f=fixture(),before=JSON.stringify(f.state),camera=JSON.stringify(f.liveCamera.toJSON()),background=f.scene.background,bg=createCanvas(100,100);bg.getContext('2d').fillStyle='#ff00ff';bg.getContext('2d').fillRect(0,0,100,100);
  const source=videoFrameSource(f,{videoResolution:'720p',aspect,backgroundImage:bg});assert.equal(f.resizes,1);assert.equal(f.floor.visible,false);
  for(const p of [0,.25,.5,.75,1])source.draw(p);assert.equal(f.resizes,1,'the drawing buffer is not resized per frame');
  assert.deepEqual([...source.canvas.getContext('2d').getImageData(5,source.canvas.height/2,1,1).data],[255,0,255,255]);
  source.restore();source.restore();assert.equal(f.resizes,2);assert.equal(f.floor.visible,true);assert.equal(f.scene.background,background);assert.equal(JSON.stringify(f.state),before);assert.equal(JSON.stringify(f.liveCamera.toJSON()),camera);
  const preview=createVideoPreview(f,{aspect,videoResolution:'1080p',backgroundImage:bg});assert.equal(Math.max(preview.width,preview.height),640);const [w,h]=aspect.split(':').map(Number);assert.equal(preview.width/preview.height,w/h);
 }}finally{globalThis.document=previous;}
});

test('background loading rejects invalid and oversized files and releases object URLs on replacement or decode failure',async()=>{
 await assert.rejects(readVideoBackground({type:'image/svg+xml',size:10}),/PNG, JPG/);await assert.rejects(readVideoBackground({type:'image/png',size:21*1024*1024}),/20 MB/);
 const previous={Image:globalThis.Image,create:URL.createObjectURL,revoke:URL.revokeObjectURL},revoked=[];let broken=false;
 URL.createObjectURL=()=>broken?'blob:broken':'blob:background';URL.revokeObjectURL=url=>revoked.push(url);
 globalThis.Image=class{naturalWidth=1920;naturalHeight=1080;async decode(){if(broken)throw new Error('bad bytes');}};
 try{const result=await readVideoBackground({type:'image/png',size:10,name:'Quadra.png'});assert.equal(result.width,1920);result.dispose();assert.deepEqual(revoked,['blob:background']);broken=true;await assert.rejects(readVideoBackground({type:'image/png',size:10}),/Não foi possível abrir/);assert.ok(revoked.includes('blob:broken'));}
 finally{globalThis.Image=previous.Image;URL.createObjectURL=previous.create;URL.revokeObjectURL=previous.revoke;}
});

const sample=JSON.parse(await readFile(new URL('./fixtures/black-64-avc.json',import.meta.url),'utf8')),data=Buffer.from(sample.data,'base64'),description=Buffer.from(sample.description,'base64');
class Chunk{
 constructor(value){Object.assign(this,value);this.byteLength=data.length;}copyTo(target){target.set(data);}
}
function encoderFixture({drop=false,fail=false}={}){
 const seen=[];let closed=0,framesClosed=0,queue=0,maxQueue=0,output;
 class Frame{constructor(canvas,options){Object.assign(this,options);}close(){framesClosed++;}}
 class Encoder{
  static async isConfigSupported(config){return {supported:config.codec==='avc1.42002a',config};}
  constructor(init){output=init.output;this.error=init.error;this.state='unconfigured';this.pending=[];}
  configure(config){this.config=config;this.state='configured';}
  get encodeQueueSize(){return queue;}
  encode(frame){seen.push({...frame});if(fail&&seen.length===12){this.error(new Error('Falha no encoder'));return;}this.pending.push({...frame});maxQueue=Math.max(maxQueue,++queue);}
  async flush(){await new Promise(setImmediate);for(const [i,f]of this.pending.entries())if(!(drop&&i===0&&f.timestamp>0))output(new Chunk({...f,type:'key'}),{decoderConfig:{codec:'avc1.42002a',codedWidth:64,codedHeight:64,description}});this.pending=[];queue=0;}
  close(){closed++;this.state='closed';}
 }
 return {Encoder,Frame,seen,get closed(){return closed;},get framesClosed(){return framesClosed;},get maxQueue(){return maxQueue;}};
}
test('smooth export assigns every frame an exact timestamp, bounds encoder queues and produces a decodable 60 fps MP4',async()=>{
 const previous=globalThis.EncodedVideoChunk;globalThis.EncodedVideoChunk=Chunk;
 try{for(const seconds of [10,15,30]){const e=encoderFixture(),s={...videoSettings({seconds}),width:64,height:64},angles=[],total=seconds*60;
  const config=await smoothEncoderConfig(s,e.Encoder),result=await encodeSmoothFrames({settings:s,draw:p=>{angles.push(p);return {}; }},{Encoder:e.Encoder,Frame:e.Frame,config});
  assert.equal(result.blob.type,'video/mp4');assert.equal(e.seen.length,total);assert.equal(e.framesClosed,total);assert.equal(e.closed,1);assert.ok(e.maxQueue<=4);
  e.seen.forEach((f,i)=>assert.equal(f.timestamp,Math.round(i*1000000/60)));assert.equal(e.seen.at(-1).timestamp+e.seen.at(-1).duration,seconds*1000000);assert.equal(angles[0],0);assert.equal(angles.at(-1),(total-1)/total);
  const temp=await mkdtemp(join(tmpdir(),'atlas-video-'));
  try{const path=join(temp,'smooth.mp4');await writeFile(path,Buffer.from(await result.blob.arrayBuffer()));const probe=JSON.parse(execFileSync('ffprobe',['-v','error','-show_streams','-of','json',path],{encoding:'utf8'})).streams[0];assert.equal(probe.width,64);assert.equal(probe.height,64);assert.equal(probe.nb_frames,String(total));assert.equal(probe.r_frame_rate,'60/1');assert.equal(Number(probe.duration),seconds);execFileSync('ffmpeg',['-v','error','-i',path,'-frames:v','3','-f','null','-']);}
  finally{await rm(temp,{recursive:true,force:true});}
 }}finally{globalThis.EncodedVideoChunk=previous;}
});
test('smooth export cancellation and codec failures close all frames and reject incomplete movies',async()=>{
 const previous=globalThis.EncodedVideoChunk;globalThis.EncodedVideoChunk=Chunk;
 try{for(const mode of ['cancel','drop','fail']){
  const e=encoderFixture({drop:mode==='drop',fail:mode==='fail'}),controller=new AbortController(),s={...videoSettings(),width:64,height:64},config=await smoothEncoderConfig(s,e.Encoder);
  await assert.rejects(encodeSmoothFrames({settings:s,draw:()=>({})},{Encoder:e.Encoder,Frame:e.Frame,config,signal:controller.signal,onProgress:p=>{if(mode==='cancel'&&p>.02)controller.abort();}}),mode==='cancel'?/cancelada/:mode==='fail'?/Falha no encoder/:/todos os quadros/);
  assert.equal(e.framesClosed,e.seen.length);assert.equal(e.closed,1);
 }}finally{globalThis.EncodedVideoChunk=previous;}
 assert.equal(await smoothEncoderConfig(videoSettings(),{isConfigSupported:async()=>({supported:false})}),null);
 const controller=new AbortController();controller.abort();await assert.rejects(recordTurntable(null,{signal:controller.signal}),/cancelada/);
});
