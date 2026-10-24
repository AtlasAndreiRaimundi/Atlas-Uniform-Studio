import {drawBrandLogo} from './brand-assets.js';
import {PerspectiveCamera,Vector3} from './vendor/three/build/three.module.min.js';
import {captureFourViews,captureCameras,composeFourViewSheet,composeTransparentFourViews,FOUR_VIEWS} from './four-view-export.js?v=3';
import {paintBackdrop,sanitizeVisuals,isDarkBackdrop,composeSnapshot} from './presentation.js';
import {cleanCamera} from './presentation-contract.js';
const libraries=new Map();
export function loadLibrary(name,path){if(globalThis[name])return Promise.resolve(globalThis[name]);if(!libraries.has(name))libraries.set(name,new Promise((resolve,reject)=>{const script=document.createElement('script');script.src=path;script.onload=()=>resolve(globalThis[name]);script.onerror=()=>{libraries.delete(name);reject(new Error('Não foi possível carregar a ferramenta de exportação.'));};document.head.append(script);}));return libraries.get(name);}
export function slug(value){return String(value).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,70)||'uniforme';}
export const asBlob=(canvas,type='image/png',quality=.94)=>new Promise((resolve,reject)=>canvas.toBlob(blob=>blob?resolve(blob):reject(new Error('Não foi possível gerar a imagem.')),type,quality));
export function containRect(sourceWidth,sourceHeight,x,y,width,height){const scale=Math.min(width/sourceWidth,height/sourceHeight);return {x:x+(width-sourceWidth*scale)/2,y:y+(height-sourceHeight*scale)/2,width:sourceWidth*scale,height:sourceHeight*scale};}
function fitText(ctx,text,x,y,max,size){ctx.font=`700 ${size}px "Chakra Petch",Arial`;const str=String(text||'');ctx.fillText(str,x,y,max);}
function brand(ctx,logo,width,height,title,subtitle,designer){
  const m=width*.045,header=height*.13;ctx.fillStyle='#17191b';ctx.fillRect(0,0,width,header);ctx.fillRect(0,height-height*.06,width,height*.06);
  drawBrandLogo(ctx,logo,m,header*.18,width*.24,header*.65);ctx.fillStyle='#bba77d';ctx.fillRect(m,header-2,width-2*m,1);
  ctx.textAlign='right';ctx.fillStyle='#e7e6e0';fitText(ctx,title,width-m,header*.47,width*.61,width*.025);ctx.font=`400 ${width*.012}px "Chakra Petch",Arial`;ctx.fillStyle='#c4b18a';ctx.fillText(subtitle,width-m,header*.77,width*.63);
  ctx.textAlign='left';ctx.font=`400 ${width*.013}px "Chakra Petch",Arial`;ctx.fillText(`Design por ${designer||'Atlas'}`,m,height-height*.025,width-2*m);return {margin:m,top:header,bottom:height-height*.08};
}
export function composeSocial(canvas,{frames,logo,settings,title,designer,format='instagram',version=''}){
  canvas.width=1080;canvas.height=format==='whatsapp'?1440:1080;const ctx=canvas.getContext('2d'),w=canvas.width,h=canvas.height,s=sanitizeVisuals(settings);paintBackdrop(ctx,w,h,s);
  const area=brand(ctx,logo,w,h,title,`ATLAS UNIFORM STUDIO · V${version}`,designer),views=format==='whatsapp'?FOUR_VIEWS.slice(0,2):FOUR_VIEWS,cols=2,rows=Math.ceil(views.length/cols),cellW=(w-area.margin*2)/cols,cellH=(area.bottom-area.top)/rows;
  views.forEach((view,i)=>{const frame=frames.get(view.id);if(!frame)throw new Error('A captura da peça ficou incompleta.');const x=area.margin+(i%cols)*cellW,y=area.top+Math.floor(i/cols)*cellH,rect=containRect(frame.width,frame.height,x+14,y+14,cellW-28,cellH-65);ctx.save();ctx.filter=`contrast(${s.contrast/100})`;ctx.drawImage(frame,rect.x,rect.y,rect.width,rect.height);ctx.restore();ctx.fillStyle=isDarkBackdrop(s)?'#d0c09e':'#4e514a';ctx.textAlign='center';ctx.font='500 16px "Chakra Petch",Arial';ctx.fillText(view.label,x+cellW/2,y+cellH-15);});ctx.textAlign='left';return canvas;
}
export function composeGrid(canvas,{frames,logo,settings,title,designer,version=''}){canvas.width=2400;canvas.height=3000;const ctx=canvas.getContext('2d'),s=sanitizeVisuals(settings);paintBackdrop(ctx,2400,3000,s);const area=brand(ctx,logo,2400,3000,title,`QUATRO VISTAS · V${version}`,designer),cellW=(2400-area.margin*2)/2,cellH=(area.bottom-area.top)/2;FOUR_VIEWS.forEach((view,i)=>{const frame=frames.get(view.id),x=area.margin+i%2*cellW,y=area.top+Math.floor(i/2)*cellH,r=containRect(frame.width,frame.height,x,y+15,cellW,cellH-75);ctx.save();ctx.filter=`contrast(${s.contrast/100})`;ctx.drawImage(frame,r.x,r.y,r.width,r.height);ctx.restore();ctx.textAlign='center';ctx.fillStyle=isDarkBackdrop(s)?'#cbb88e':'#5a4f38';ctx.font='500 30px "Chakra Petch",Arial';ctx.fillText(view.label,x+cellW/2,y+cellH-20);});return canvas;}
export function capturePresentationSheet(context,metadata,{scale=1}={}){
  const {renderer,scene,liveCamera,bounds,logo,settings,layout}=context,target=document.createElement('canvas');
  if(layout!=='grid')return composeFourViewSheet(target,{logo,settings,outputScale:scale,projectName:metadata.name,designerName:metadata.designerName,captureViews:onCapture=>captureFourViews({renderer,scene,liveCamera,bounds,width:Math.max(47,Math.round(930*scale)),height:Math.max(77,Math.round(1536*scale)),onCapture})});
  const frames=new Map();try{captureFourViews({renderer,scene,liveCamera,bounds,onCapture:(id,frame)=>{const canvas=document.createElement('canvas');canvas.width=frame.width;canvas.height=frame.height;canvas.getContext('2d').drawImage(frame,0,0);frames.set(id,canvas);}});return composeGrid(target,{frames,logo,settings,title:metadata.name,designer:metadata.designerName,version:metadata.version});}finally{frames.forEach(canvas=>canvas.width=canvas.height=1);}
}

export function captureProductionSheet(context,{scale=1,maxWidth=4096}={}){
  return composeTransparentFourViews(document.createElement('canvas'),{settings:context.settings,maxWidth,captureViews:onCapture=>captureFourViews({...context,width:Math.max(64,Math.round(1024*scale)),height:Math.max(96,Math.round(1536*scale)),transparent:true,hideObjects:context.productionHidden||[],onCapture})});
}

export function renderExportImage(context,metadata,{format='four',resolution='high',preview=false}={}){
  const scale=preview ? 0.2 : resolution==='standard' ? 0.5 : 1;
  if(format==='production')return captureProductionSheet(context,{scale});
  if(format==='four'){
    const canvas=capturePresentationSheet(context,metadata,{scale});
    if(context.layout==='grid'&&scale!==1){const small=document.createElement('canvas');small.width=Math.round(canvas.width*scale);small.height=Math.round(canvas.height*scale);small.getContext('2d').drawImage(canvas,0,0,small.width,small.height);canvas.width=canvas.height=1;return small;}
    return canvas;
  }
  if(format==='current'){
    context.renderer.render(context.scene,context.liveCamera);
    const backdrop=document.createElement('canvas');backdrop.width=context.renderer.domElement.width;backdrop.height=context.renderer.domElement.height;
    try{paintBackdrop(backdrop.getContext('2d'),backdrop.width,backdrop.height,context.settings);return composeSnapshot(document.createElement('canvas'),backdrop,context.renderer.domElement,context.settings);}finally{backdrop.width=backdrop.height=1;}
  }
  if(!['whatsapp','instagram'].includes(format))throw new Error('Escolha um formato de imagem válido.');
  const frames=new Map();try{
    captureFourViews({...context,width:465,height:768,onCapture:(id,frame)=>{const copy=document.createElement('canvas');copy.width=frame.width;copy.height=frame.height;copy.getContext('2d').drawImage(frame,0,0);frames.set(id,copy);}});
    return composeSocial(document.createElement('canvas'),{frames,logo:context.logo,settings:context.settings,title:metadata.name,designer:metadata.designerName,version:metadata.version,format});
  }finally{frames.forEach(c=>c.width=c.height=1);}
}
export async function createExportImage(context,metadata,options={}){
  const canvas=renderExportImage(context,metadata,options);
  try{return await asBlob(canvas,options.format!=='production'&&options.fileType==='jpg'?'image/jpeg':'image/png',.88);}finally{canvas.width=canvas.height=1;}
}
export async function createApprovalPdf(images,metadata){
  const PDF=await loadLibrary('PDFLib','/vendor/pdf-lib/pdf-lib.min.js'),pdf=await PDF.PDFDocument.create();pdf.setTitle('Atlas - Apresentacao para aprovacao');
  const font=await pdf.embedFont(PDF.StandardFonts.Helvetica),footer=`PARA APROVACAO | Versao ${metadata.version} | ID ${metadata.id} | ${metadata.createdAt}`;
  for(const item of images){const image=await pdf.embedPng(item.bytes),page=pdf.addPage([841.89,595.28]),r=containRect(image.width,image.height,20,42,801.89,533.28);page.drawImage(image,{x:r.x,y:r.y,width:r.width,height:r.height});page.drawText(footer,{x:22,y:25,size:7,font,maxWidth:800});}
  const page=pdf.addPage([841.89,595.28]);for(const [i,line] of ['REGISTRO DE APROVACAO',`Versao: ${metadata.version} | ID imutavel: ${metadata.id}`,`Preparado em: ${metadata.createdAt}`,'Este PDF e uma apresentacao para conferencia.','A aprovacao registrada no site refere-se somente a versao selecionada.','Responsavel: __________________________________________','Data: ____________________   Assinatura: ____________________'].entries())page.drawText(line,{x:50,y:525-i*49,font,size:i===0?19:12});
  return pdf.save();
}
export async function createStandalonePdf(context,metadata){
  const bytes=new Uint8Array(await(await createExportImage(context,metadata,{format:'four'})).arrayBuffer());
  return new Blob([await createApprovalPdf([{bytes}],metadata)],{type:'application/pdf'});
}
export function detailCamera(bookmark,aspect,fov=32){const saved=cleanCamera(bookmark);if(!saved)throw new Error('O enquadramento deste detalhe não é válido.');const camera=new PerspectiveCamera(fov,aspect,.01,200);camera.position.fromArray(saved.position);camera.lookAt(new Vector3(...saved.target));camera.updateMatrixWorld(true);return camera;}
export async function createExportPackage(context,metadata,onProgress=()=>{}){
  const {renderer,scene,liveCamera,bounds,settings,logo,details=[],layout='line'}=context,frames=new Map(),canvases=[];
  const make=()=>{const c=document.createElement('canvas');canvases.push(c);return c;};
  try{
    onProgress('Capturando as quatro vistas…');
    captureFourViews({renderer,scene,liveCamera,bounds,onCapture:(id,frame)=>{const c=make();c.width=frame.width;c.height=frame.height;c.getContext('2d').drawImage(frame,0,0);frames.set(id,c);}});
    const params={frames,logo,settings,title:metadata.name,designer:metadata.designerName,version:metadata.version};
    const sheet=layout==='grid'?composeGrid(make(),params):composeFourViewSheet(make(),{logo,settings,projectName:metadata.name,designerName:metadata.designerName,captureViews:callback=>FOUR_VIEWS.forEach(v=>callback(v.id,frames.get(v.id)))});
    const files=[],add=async(name,canvas)=>{files.push({name,bytes:new Uint8Array(await(await asBlob(canvas)).arrayBuffer())});canvas.width=canvas.height=1;};
    await add('01-quatro-vistas.png',sheet);await add('02-whatsapp.png',composeSocial(make(),{...params,format:'whatsapp'}));await add('03-instagram.png',composeSocial(make(),params));
    await add('05-pedido-4-vistas-transparente.png',captureProductionSheet(context));
    for(const view of FOUR_VIEWS){const canvas=make(),frame=frames.get(view.id);canvas.width=frame.width;canvas.height=frame.height;paintBackdrop(canvas.getContext('2d'),canvas.width,canvas.height,settings);const ctx=canvas.getContext('2d');ctx.save();ctx.filter=`contrast(${sanitizeVisuals(settings).contrast/100})`;ctx.drawImage(frame,0,0);ctx.restore();await add(`vistas/${view.id}.png`,canvas);}
    frames.forEach(canvas=>canvas.width=canvas.height=1);const detailFiles=[];
    for(const [index,detail] of details.entries()){
      onProgress(`Capturando detalhe ${index+1} de ${details.length}…`);const canvas=make();canvas.width=1200;canvas.height=1200;const ctx=canvas.getContext('2d');paintBackdrop(ctx,1200,1200,settings);
      captureCameras({renderer,scene,liveCamera,width:1200,height:1200,cameras:[{id:detail.id,camera:detailCamera(detail.camera,1,liveCamera.fov)}],onCapture:(_,frame)=>{ctx.save();ctx.filter=`contrast(${sanitizeVisuals(settings).contrast/100})`;ctx.drawImage(frame,0,0);ctx.restore();}});
      ctx.fillStyle='#17191b';ctx.fillRect(0,1110,1200,90);ctx.fillStyle='#cfbd96';ctx.font='500 28px "Chakra Petch",Arial';ctx.fillText(detail.name,40,1164,1120);const name=`detalhes/${index+1}-${slug(detail.name)}.png`;await add(name,canvas);detailFiles.push(files.at(-1));
    }
    onProgress('Montando PDF de aprovação…');
    files.push({name:'04-para-aprovacao.pdf',bytes:await createApprovalPdf([files[0],...detailFiles],metadata)},{name:'versao.json',bytes:new TextEncoder().encode(JSON.stringify({...metadata,files:files.map(f=>f.name)},null,2))});
    onProgress('Preparando o pacote…');const Zip=await loadLibrary('JSZip','/vendor/jszip/jszip.min.js'),zip=new Zip();files.forEach(file=>zip.file(file.name,file.bytes));return new Blob([await zip.generateAsync({type:'uint8array',compression:'STORE'})],{type:'application/zip'});
  }finally{canvases.forEach(c=>c.width=c.height=1);}
}
export {videoType,recordTurntable,createVideoPreview} from './video-export.js?v=1';
