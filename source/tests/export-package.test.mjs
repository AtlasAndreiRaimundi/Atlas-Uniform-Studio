import assert from 'node:assert/strict';
import {test} from 'node:test';
import {createRequire} from 'node:module';
import JSZip from 'jszip';
import * as PDFLib from 'pdf-lib';
import {Box3,PerspectiveCamera,Scene,Vector2,Vector3,Vector4} from '../public/vendor/three/build/three.module.min.js';
import {createExportPackage,composeSocial,containRect,videoType,detailCamera,recordTurntable,capturePresentationSheet,createExportImage,createStandalonePdf} from '../public/export-package.js';
import {exportRequest} from '../public/export-menu.js';
import {newOrder} from '../public/production-core.js';
import {buildSheets,createPDF} from '../public/production-sheet.js';
const require=createRequire(import.meta.url);let createCanvas;
try{({createCanvas}=require(require.resolve('@napi-rs/canvas',{paths:[process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES||process.cwd()]})));}catch{}
function canvas(width=1,height=1){const c=createCanvas(width,height);c.toBlob=(callback,type)=>callback(new Blob([c.toBuffer(type||'image/png')],{type:type||'image/png'}));return c;}
function rendererFixture(liveCamera){
  const state={size:new Vector2(300,200),ratio:1,viewport:new Vector4(0,0,300,200),scissor:new Vector4(0,0,300,200),scissorTest:false,target:null},initial=JSON.stringify(state),domElement=canvas(300,200);
  const renderer={domElement,getSize:out=>out.copy(state.size),getPixelRatio:()=>state.ratio,getViewport:out=>out.copy(state.viewport),getScissor:out=>out.copy(state.scissor),getScissorTest:()=>state.scissorTest,getRenderTarget:()=>state.target,getActiveCubeFace:()=>0,getActiveMipmapLevel:()=>0,setPixelRatio:value=>{state.ratio=value;},setSize(x,y){state.size.set(x,y);domElement.width=x*state.ratio;domElement.height=y*state.ratio;},setRenderTarget:value=>{state.target=value;},setViewport:value=>state.viewport.copy(value),setScissor:value=>state.scissor.copy(value),setScissorTest:value=>{state.scissorTest=value;},render(scene,camera){const ctx=domElement.getContext('2d');ctx.clearRect(0,0,domElement.width,domElement.height);if(camera!==liveCamera){ctx.fillStyle=camera.position.z>0?'#ff0000':camera.position.z<0?'#00ff00':camera.position.x<0?'#0000ff':'#ffff00';ctx.fillRect(0,0,domElement.width,domElement.height);}}};return {renderer,state,initial};
}
test('social composition keeps native proportions and delivers square Instagram and portrait WhatsApp', {skip:!createCanvas},()=>{
  const frames=new Map(['front','back','left','right'].map(id=>[id,canvas(100,200)])),logo=canvas(250,100),base={frames,logo,settings:{background:'dark'},title:'Equipe teste',designer:'Andrei',version:2};
  const instagram=composeSocial(canvas(),base),whatsapp=composeSocial(canvas(),{...base,format:'whatsapp'});assert.deepEqual([instagram.width,instagram.height],[1080,1080]);assert.deepEqual([whatsapp.width,whatsapp.height],[1080,1440]);
  const rect=containRect(100,200,0,0,500,400);assert.equal(rect.width/rect.height,.5);assert.equal(rect.x,150);
});
test('complete ZIP contains four distinct views, native social PNGs, detail image and valid version-specific approval PDF',{skip:!createCanvas},async()=>{
  const previous={document:globalThis.document,JSZip:globalThis.JSZip,PDFLib:globalThis.PDFLib};globalThis.document={createElement:tag=>{assert.equal(tag,'canvas');return canvas();}};globalThis.JSZip=JSZip;globalThis.PDFLib=PDFLib;
  const liveCamera=new PerspectiveCamera(32,1,.03,100),fixture=rendererFixture(liveCamera),metadata={id:'immutable-version-test',version:7,name:'Equipe A',designerName:'Andrei Raimundi',createdAt:'2026-10-22T04:00:00.000Z'};
  try{
    const grid=capturePresentationSheet({...fixture,scene:new Scene(),liveCamera,bounds:new Box3(new Vector3(-1,-1.4,-.2),new Vector3(1,1.4,.2)),logo:canvas(250,100),settings:{background:'dark'},layout:'grid'},metadata);assert.deepEqual([grid.width,grid.height],[2400,3000]);grid.width=grid.height=1;
    const blob=await createExportPackage({...fixture,scene:new Scene(),liveCamera,bounds:new Box3(new Vector3(-1,-1.4,-.2),new Vector3(1,1.4,.2)),logo:canvas(250,100),settings:{background:'dark',contrast:115},details:[{id:'gola',name:'Gola',camera:{position:[0,1,1],target:[0,1,0]}}]},metadata);
    const zip=await JSZip.loadAsync(await blob.arrayBuffer());for(const path of ['01-quatro-vistas.png','02-whatsapp.png','03-instagram.png','04-para-aprovacao.pdf','vistas/front.png','vistas/back.png','vistas/left.png','vistas/right.png','detalhes/1-gola.png','versao.json'])assert.ok(zip.file(path),path);
    const instagram=await zip.file('03-instagram.png').async('nodebuffer'),whatsapp=await zip.file('02-whatsapp.png').async('nodebuffer');assert.deepEqual([instagram.readUInt32BE(16),instagram.readUInt32BE(20)],[1080,1080]);assert.deepEqual([whatsapp.readUInt32BE(16),whatsapp.readUInt32BE(20)],[1080,1440]);
    const views=await Promise.all(['front','back','left','right'].map(view=>zip.file(`vistas/${view}.png`).async('base64')));assert.equal(new Set(views).size,4);
    const pdf=await PDFLib.PDFDocument.load(await zip.file('04-para-aprovacao.pdf').async('uint8array'));assert.equal(pdf.getPageCount(),3);assert.equal(JSON.parse(await zip.file('versao.json').async('string')).id,metadata.id);assert.equal(JSON.stringify(fixture.state),fixture.initial);
  }finally{Object.assign(globalThis,previous);}
});
test('video MIME negotiation chooses only advertised formats and detail cameras never mirror coordinates',()=>{
  assert.equal(videoType({isTypeSupported:type=>type==='video/webm;codecs=vp8'}),'video/webm;codecs=vp8');assert.equal(videoType({isTypeSupported:()=>false}),'');assert.equal(videoType(null),'');
  const camera=detailCamera({position:[1,2,3],target:[0,1,0]},1);assert.deepEqual(camera.position.toArray(),[1,2,3]);assert.ok(camera.matrixWorld.determinant()>0);assert.throws(()=>detailCamera({position:[0,0,0],target:[0,0,0]},1));
});
async function videoFixture(action){
  const names=['document','HTMLCanvasElement','MediaRecorder','requestAnimationFrame','cancelAnimationFrame'],previous=Object.fromEntries(names.map(name=>[name,globalThis[name]]));let tracksStopped=0,clock=0;const listeners=new Map();
  class Recorder{static isTypeSupported(type){return type==='video/mp4';}constructor(stream,options){this.state='inactive';this.mimeType=options.mimeType;}start(){this.state='recording';}stop(){this.state='inactive';queueMicrotask(()=>{this.ondataavailable?.({data:new Blob(['simulated-encoder-output'],{type:this.mimeType})});this.onstop?.();});}}
  globalThis.HTMLCanvasElement=class{};globalThis.HTMLCanvasElement.prototype.captureStream=()=>{};globalThis.MediaRecorder=Recorder;
  globalThis.document={hidden:false,createElement(){const c=canvas();c.captureStream=()=>({getTracks:()=>[{stop:()=>tracksStopped++}]});return c;},addEventListener:(name,fn)=>listeners.set(name,fn),removeEventListener:name=>listeners.delete(name)};
  globalThis.requestAnimationFrame=callback=>setImmediate(()=>callback(clock+=250));globalThis.cancelAnimationFrame=id=>clearImmediate(id);
  const liveCamera=new PerspectiveCamera(32,1,.03,100),before=JSON.stringify(liveCamera.toJSON()),fixture=rendererFixture(liveCamera),context={...fixture,scene:new Scene(),liveCamera,bounds:new Box3(new Vector3(-1,-1.4,-.2),new Vector3(1,1.4,.2)),logo:canvas(250,100),settings:{background:'dark'},name:'Teste',designerName:'Andrei'};
  try{await action(context);assert.equal(tracksStopped,1);assert.equal(listeners.size,0);assert.equal(JSON.stringify(fixture.state),fixture.initial);assert.equal(JSON.stringify(liveCamera.toJSON()),before);}finally{Object.assign(globalThis,previous);}
}
test('simulated video encoder completes the turn and cleans tracks without changing the live camera',{skip:!createCanvas},async()=>{await videoFixture(async context=>{let progress=0;const result=await recordTurntable(context,{motion:'compatible',videoResolution:'720p',seconds:10,onProgress:p=>{progress=p;}});assert.equal(result.extension,'mp4');assert.equal(result.blob.type,'video/mp4');assert.equal(progress,1);assert.equal(result.width,1280);assert.equal(result.height,720);assert.equal(result.fps,30);});});
test('cancelled video export rejects and restores renderer and media tracks',{skip:!createCanvas},async()=>{await videoFixture(async context=>{const controller=new AbortController();await assert.rejects(recordTurntable(context,{motion:'compatible',videoResolution:'720p',seconds:10,signal:controller.signal,onProgress:p=>{if(p>=.25)controller.abort();}}),/cancelada/);});});
test('single-format exports produce real PNG, JPEG, social and PDF files with bounded preview resolution',{skip:!createCanvas},async()=>{
  const previous={document:globalThis.document,PDFLib:globalThis.PDFLib};globalThis.document={createElement:()=>canvas()};globalThis.PDFLib=PDFLib;
  const liveCamera=new PerspectiveCamera(32,1,.03,100),fixture=rendererFixture(liveCamera),context={...fixture,scene:new Scene(),liveCamera,bounds:new Box3(new Vector3(-1,-1.4,-.2),new Vector3(1,1.4,.2)),logo:canvas(250,100),settings:{background:'dark'},layout:'line'},metadata={id:'exact-version',version:3,name:'Equipe',designerName:'Andrei',createdAt:'2026-10-22'};
  try{
    for(const [options,dimensions] of [[{format:'four'},[4096,2304]],[{format:'four',resolution:'standard'},[2048,1152]],[{format:'four',preview:true},[819,461]],[{format:'whatsapp'},[1080,1440]],[{format:'instagram'},[1080,1080]]]){
      const image=Buffer.from(await(await createExportImage(context,metadata,options)).arrayBuffer());assert.deepEqual([image.readUInt32BE(16),image.readUInt32BE(20)],dimensions);
    }
    const jpg=await createExportImage(context,metadata,{format:'instagram',fileType:'jpg'});assert.equal(jpg.type,'image/jpeg');assert.deepEqual([...new Uint8Array(await jpg.arrayBuffer()).slice(0,2)],[255,216]);
    const pdf=await createStandalonePdf(context,metadata);assert.equal(pdf.type,'application/pdf');assert.equal((await PDFLib.PDFDocument.load(await pdf.arrayBuffer())).getPageCount(),2);assert.equal(JSON.stringify(fixture.state),fixture.initial);
  }finally{Object.assign(globalThis,previous);}
});
test('export menu requests keep image defaults, valid file types and supported video durations',()=>{
 assert.deepEqual(exportRequest('image','four'),{mode:'image',format:'four',fileType:'png',resolution:'high',seconds:10});
 assert.deepEqual(exportRequest('video','unknown',{fileType:'exe',resolution:'anything',seconds:999}),{mode:'video',format:'four',fileType:'png',resolution:'high',seconds:10,videoResolution:'1080p',aspect:'16:9',motion:'smooth',fps:60,width:1920,height:1080,backgroundFit:'cover'});
 for(const seconds of [10,15,30])assert.equal(exportRequest('video','four',{seconds}).seconds,seconds);assert.equal(exportRequest('video','four',{seconds:6}).seconds,10);assert.equal(exportRequest('link','four').mode,'link');
 assert.equal(exportRequest('image','production',{fileType:'jpg'}).fileType,'png');
});
test('production image stays RGBA PNG even when JPEG is requested and its alpha survives attachment into the order PDF',{skip:!createCanvas},async()=>{
 const previous=globalThis.document;globalThis.document={createElement:()=>canvas()};
 const liveCamera=new PerspectiveCamera(32,1,.03,100),fixture=rendererFixture(liveCamera),context={...fixture,scene:new Scene(),liveCamera,bounds:new Box3(new Vector3(-1,-1.4,-.2),new Vector3(1,1.4,.2)),settings:{background:'dark'}};
 try{const blob=await createExportImage(context,{}, {format:'production',fileType:'jpg',resolution:'standard'}),bytes=Buffer.from(await blob.arrayBuffer());assert.equal(blob.type,'image/png');assert.equal(bytes[25],6,'PNG must carry an alpha channel');
 const {loadImage}=require(require.resolve('@napi-rs/canvas',{paths:[process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES||process.cwd()]})),image=await loadImage(bytes),sample=canvas(image.width,image.height);sample.getContext('2d').drawImage(image,0,0);assert.equal(sample.getContext('2d').getImageData(0,0,1,1).data[3],0);
 const order=newOrder(),p=order.pages[0].products[0];p.images=['data:image/png;base64,'+bytes.toString('base64')];p.quantity=1;p.grade='CAMISETA\nM = 1';const pdf=await PDFLib.PDFDocument.load(await createPDF(buildSheets(order),PDFLib));
 assert.ok(pdf.context.enumerateIndirectObjects().some(([,object])=>object.dict?.has(PDFLib.PDFName.of('SMask'))),'the PDF must embed the alpha mask');
 }finally{globalThis.document=previous;}
});
