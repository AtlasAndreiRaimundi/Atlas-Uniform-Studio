import {catalogOrder} from '../public/product-catalog.js';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {deflateSync} from 'node:zlib';
import * as PDF from 'pdf-lib';
import {readFile} from 'node:fs/promises';
import fontkit from '@pdf-lib/fontkit';
import {placeOrderImage,ORDER_PAGE} from '../public/order-image-layout.js';
import {newOrder,newProduct,newKitPage,applyListToOrder,finalPreviewProblems,validateOrder} from '../public/production-core.js';
import {buildSheets,createPDF,sheetSVG,PAPER} from '../public/production-sheet.js';
import {validateDocument} from '../lib/production-service.mjs';
import {createOrderVisualTools} from '../public/order-visual-tools.js';
import {newAnnotation,moveAnnotation} from '../public/order-annotations.js';

function rgbaPNG(width,height){
 const crc=bytes=>{let value=0xffffffff;for(const byte of bytes){value^=byte;for(let i=0;i<8;i++)value=value>>>1^(value&1?0xedb88320:0);}return (value^0xffffffff)>>>0;};
 const chunk=(type,data)=>{const name=Buffer.from(type),size=Buffer.alloc(4),check=Buffer.alloc(4);size.writeUInt32BE(data.length);check.writeUInt32BE(crc(Buffer.concat([name,data])));return Buffer.concat([size,name,data,check]);};
 const header=Buffer.alloc(13);header.writeUInt32BE(width);header.writeUInt32BE(height,4);header[8]=8;header[9]=6;
 const pixels=Buffer.alloc((width*4+1)*height);for(let y=0;y<height;y++)for(let x=0;x<width;x++){const i=y*(width*4+1)+1+x*4;pixels[i]=40;pixels[i+1]=120;pixels[i+2]=180;pixels[i+3]=x>0&&y>0&&x<width-1&&y<height-1?255:0;}
 return 'data:image/png;base64,'+Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),chunk('IHDR',header),chunk('IDAT',deflateSync(pixels)),chunk('IEND',Buffer.alloc(0))]).toString('base64');
}
const image=rgbaPNG(120,60);
function completeKit(){const doc=applyListToOrder(newOrder(),[{produto:'Kit',grupo:'Linha',nome:'Ana',numero:'07',adicional:'CAPITAO',tamanhoCamiseta:'M',tamanhoCalcao:'G',quantidade:2}],{name:'Equipe'});Object.assign(doc,{number:'123',client:'Equipe',artist:'Andrei',deliveryDate:'2026-11-30'});for(const p of doc.pages[0].products){p.model='Edge';p.fabric='DRY';}return doc;}

test('automatic image placement keeps its legacy framing and free placement can occupy the entire A4',()=>{
 const area={x:21,y:145,w:585,h:262};
 for(const scale of [.2,.5,1])for(const x of [0,.5,1])for(const y of [0,.5,1]){const box=placeOrderImage(image,area,{scale,x,y});assert.ok(Math.abs(box.w/box.h-2)<1e-8);assert.ok(box.x>=area.x&&box.y>=area.y);assert.ok(box.x+box.w<=area.x+area.w+.0001);assert.ok(box.y+box.h<=area.y+area.h+.0001);}
 assert.deepEqual(placeOrderImage(image,area,{frame:{x:650,y:490,w:150}}),{x:650,y:490,w:150,h:75});
 assert.deepEqual(placeOrderImage(image,area,{frame:{x:-20,y:0,w:900}}),{x:-20,y:0,w:900,h:450});
});

test('one kit image prints once with separate garment specifications and survives save validation',async()=>{
 const doc=completeKit(),page=doc.pages[0];page.visual={mode:'shared',image,transform:{scale:.65,x:1,y:0}};assert.deepEqual(validateOrder(doc),[]);assert.deepEqual(finalPreviewProblems(doc),[]);
 const saved=validateDocument(doc);assert.deepEqual(saved.pages[0].visual,page.visual);const sheets=buildSheets(saved),art=sheets[0].ops.filter(op=>op.kind==='image'&&op.src===image);assert.equal(art.length,1);assert.equal(sheets.filter(s=>s.kind==='sheet').length,1);
 assert.deepEqual(sheets.map(sheet=>sheet.kind),['sheet','list'],'personalization follows its technical sheet');assert.equal(sheets[0].anchors.length,2);const text=sheets.flatMap(s=>s.ops.filter(o=>o.kind==='text').map(o=>o.text)).join('\n');assert.match(text,/Camiseta/);assert.match(text,/Calção/);assert.match(text,/M = 2/);assert.match(text,/G = 2/);assert.match(text,/CAPITAO/);assert.match(sheetSVG(sheets[0]),/preserveAspectRatio="xMidYMid meet"/);
 const bytes=await createPDF(sheets,PDF),pdf=await PDF.PDFDocument.load(bytes);assert.equal(pdf.getPageCount(),sheets.length);assert.ok(pdf.context.enumerateIndirectObjects().some(([,object])=>object.dict?.get(PDF.PDFName.of('SMask'))),'transparent art must retain its alpha mask in the PDF');
 for(const sheet of sheets)for(const op of sheet.ops)if(op.kind==='text'&&sheet.kind!=='list')assert.ok(!(op.x<413&&op.y>459),'budget space remains blank on technical sheets');
});

test('a Top and Legging kit exports one transparent image with each garment and size identified independently',async()=>{
 const doc=newOrder();doc.pages=[newKitPage(['Top','Legging'])];Object.assign(doc,{number:'321',client:'Equipe',artist:'Andrei',deliveryDate:'2026-11-30'});
 const updated=applyListToOrder(doc,[{produto:'Kit - Top + Legging',grupo:'Linha',nome:'Ana',numero:'07',adicional:'CAPITÃ',tamanhoCamiseta:'M',tamanhoCalcao:'G',quantidade:2}],{name:'Kit fitness'});
 updated.pages[0].visual={mode:'shared',image,transform:{scale:1,x:.5,y:.5}};for(const product of updated.pages[0].products){product.model='Treino';product.fabric='DRY';}
 const saved=validateDocument(updated);assert.deepEqual(finalPreviewProblems(saved),[]);const sheets=buildSheets(saved),text=sheets.flatMap(s=>s.ops.filter(o=>o.kind==='text').map(o=>o.text)).join('\n');
 assert.equal(sheets[0].ops.filter(o=>o.imageKey==='shared').length,1);for(const expected of ['Top','Legging','M = 2','G = 2','07','CAPITÃ'])assert.ok(text.includes(expected),expected);
 const bytes=await createPDF(sheets,PDF),pdf=await PDF.PDFDocument.load(bytes);assert.equal(pdf.getPageCount(),2);assert.ok(pdf.context.enumerateIndirectObjects().some(([,object])=>object.dict?.get(PDF.PDFName.of('SMask'))));
});

test('per-piece image transforms persist while missing art, incomplete lists and malformed geometry block final review',()=>{
 const doc=completeKit();assert.match(finalPreviewProblems(doc).join(' '),/imagem manual/);for(const p of doc.pages[0].products){p.images=[image];p.imageTransforms=[{scale:.5,x:0,y:1}];}
 assert.deepEqual(finalPreviewProblems(doc),[]);assert.deepEqual(validateDocument(doc).pages[0].products[0].imageTransforms,[{scale:.5,x:0,y:1}]);
 delete doc.listSource;assert.match(finalPreviewProblems(doc).join(' '),/Vincule a lista/);doc.pages[0].products[0].imageTransforms[0].scale=50;assert.throws(()=>validateDocument(doc),{status:400});
 const kit=completeKit();kit.pages[0].visual={mode:'shared',image,transform:{scale:1,x:.5,y:.5}};kit.pages[0].products.push(newProduct('Colete'));assert.match(validateOrder(kit).join(' '),/até duas peças/);
});

test('long model names reduce their type size and extreme values stay complete on the first sheet',async()=>{
 const face=fontkit.create(await readFile(new URL('../public/fonts/ChakraPetch-SemiBold.ttf',import.meta.url))),pdf=await PDF.PDFDocument.create(),fallback=await pdf.embedFont(PDF.StandardFonts.HelveticaBold);
 for(const model of ['KIT EDGE 2027 MASCULINO MANGA LONGA PERSONALIZADO','WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW','Nome completo do modelo com todas as especificações técnicas e acabamento especial '.repeat(2)]){
  const doc=completeKit();doc.pages[0].mode='conjunto';doc.pages[0].products[0].model=model;
  const sheets=buildSheets(doc),ops=sheets[0].ops.filter(o=>o.kind==='text'&&o.x===623&&o.y>280&&o.y<301);assert.equal(sheets.filter(sheet=>sheet.kind!=='list').length,1,'short specifications still fit the technical sheet');assert.ok(ops.length);assert.ok(ops.some(o=>o.size<8));
  for(const op of ops){assert.ok(fallback.widthOfTextAtSize(op.text,op.size)<=94);const width=face.layout(op.text).glyphs.reduce((sum,glyph)=>sum+glyph.advanceWidth,0)/face.unitsPerEm*op.size;assert.ok(width<=94,'the model cannot cross into the adjacent piece column');assert.ok(op.y<300);}
  const text=sheets[0].ops.filter(o=>o.kind==='text').map(o=>o.text).join(' ').replace(/\s+/g,' ');if(ops.some(o=>o.text.includes('ver detalhes')))assert.ok(text.includes(model.trim()));else assert.equal(ops.map(o=>o.text).join('').replace(/\s/g,''),('Camiseta · '+model).replace(/\s/g,''));
 }
});

test('explicit image frames and A4 callouts survive list refresh and export without the old art-area crop',async()=>{
 const doc=completeKit(),page=doc.pages[0],frame={x:650,y:490,w:150};page.visual={mode:'shared',image,transform:{scale:1,x:.5,y:.5,frame}};const note=newAnnotation('callout',page.products[0].id,{x:630,y:70});note.text='Acabamento lateral';note.x2=820;note.y2=570;page.annotations=[note];
 const saved=validateDocument(doc),updated=validateDocument(applyListToOrder(saved,saved.listSource.rows,saved.listSource));assert.deepEqual(updated.pages[0].visual.transform.frame,frame);assert.deepEqual(updated.pages[0].annotations,[note]);
 const sheets=buildSheets(updated),art=sheets[0].ops.find(o=>o.imageKey==='shared');assert.deepEqual({x:art.x,y:art.y,w:art.w,h:art.h},{...frame,h:75});assert.deepEqual(art.clip,ORDER_PAGE);const svg=sheetSVG(sheets[0]);assert.match(svg,/x="650"[^>]+y="490"[^>]+width="150"[^>]+height="75"/);
 const bytes=await createPDF(sheets,PDF),pdf=await PDF.PDFDocument.load(bytes),contents=pdf.context.lookup(pdf.getPages()[0].node.Contents()),decoded=new TextDecoder().decode(PDF.decodePDFRawStream(pdf.context.lookup(contents.get(0))).decode());const matrices=[...decoded.matchAll(/([\d.-]+) ([\d.-]+) ([\d.-]+) ([\d.-]+) ([\d.-]+) ([\d.-]+) cm/g)].map(m=>m.slice(1).map(n=>Math.round(Number(n)*100)/100));assert.ok(matrices.some(m=>JSON.stringify(m)==='[1,0,0,1,650,30.28]'),'the PDF keeps the user position beside and below the old art area');assert.ok(matrices.some(m=>JSON.stringify(m)==='[150,0,0,75,0,0]'),'the PDF keeps the image width and aspect ratio');
 for(const bad of [{x:NaN,y:0,w:10},{x:0,y:0,w:0},{x:0,y:0},{x:0,y:9000,w:10}]){const invalid=structuredClone(saved);invalid.pages[0].visual.transform.frame=bad;assert.throws(()=>validateDocument(invalid),{status:400});}
});

test('oversized art, free finish callouts and per-piece extra applications survive save, list updates and clipped PDF export',async()=>{
 const doc=completeKit(),p=doc.pages[0],shirt=p.products[0],shorts=p.products[1];
 shirt.extraApplications=['DTF','TPU ALTO RELEVO'];shorts.extraApplications=['BORDADO'];p.imageArea='expanded';p.freeComponents=true;
 p.visual={mode:'shared',image,transform:{scale:3.5,x:.75,y:.25}};
 const callout=newAnnotation('callout',shirt.id,{x:40,y:170});callout.text='TPU no peito';callout.x2=260;callout.y2=270;
 const line=newAnnotation('line',shorts.id,{x:70,y:355}),text=newAnnotation('text',shirt.id,{x:420,y:430});text.text='Gola preta';p.annotations=[callout,line,text];
 const saved=validateDocument(doc),restored=saved.pages[0];assert.equal(restored.visual.transform.scale,3.5);assert.equal(restored.imageArea,'expanded');assert.equal(restored.freeComponents,true);assert.deepEqual(restored.annotations,p.annotations);
 assert.deepEqual(restored.products[0].extraApplications,['TPU ALTO RELEVO','DTF']);assert.deepEqual(restored.products[1].extraApplications,['BORDADO']);
 const updated=applyListToOrder(saved,saved.listSource.rows,saved.listSource);assert.deepEqual(updated.pages[0].annotations,p.annotations);assert.deepEqual(updated.pages[0].products[0].extraApplications,restored.products[0].extraApplications);
 const sheets=buildSheets(saved),art=sheets[0].ops.find(o=>o.kind==='image'&&o.src===image);assert.ok(art.w>art.clip.w);assert.deepEqual(art.clip,ORDER_PAGE);assert.deepEqual(sheets.map(sheet=>sheet.kind),['sheet','list']);
 assert.match(sheetSVG(sheets[0]),/clip-path=/);assert.match(sheetSVG(sheets[0]),/TPU no peito/);const labels=sheets.flatMap(s=>s.ops.filter(o=>o.kind==='text').map(o=>o.text));assert.ok(labels.some(t=>t.includes('APLICAÇÕES EXTRAS')));assert.ok(labels.includes('TPU ALTO RELEVO'));assert.ok(labels.includes('APLIQUE BORDADO'));
 assert.equal(sheets[0].ops.filter(o=>o.kind==='rect'&&o.w===7&&o.h===7).length,10,'all five checkboxes for each piece are on the first sheet');
 assert.equal(sheets[0].ops.filter(o=>o.kind==='line'&&o.width===.9).length,6,'three independently selected applications have check marks');
 const bytes=await createPDF(sheets,PDF),pdf=await PDF.PDFDocument.load(bytes);assert.equal(pdf.getPageCount(),sheets.length);
 const content=pdf.context.lookup(pdf.getPages()[0].node.Contents()),stream=pdf.context.lookup(content.get(0)),decoded=new TextDecoder().decode(PDF.decodePDFRawStream(stream).decode());assert.match(decoded,/W\s+n/,'PDF uses the same clipping regions as SVG');
 for(const sheet of sheets)for(const op of sheet.ops)if(op.kind==='text'&&sheet.kind!=='list')assert.ok(!(op.x<413&&op.y>459));
 const moved=moveAnnotation(callout,1000,1000);assert.equal(moved.x2,ORDER_PAGE.w);assert.equal(moved.y2,ORDER_PAGE.h);assert.equal(moved.x2-moved.x,callout.x2-callout.x);
 assert.equal(moveAnnotation(callout,-1000,-1000,'end').x2,0);assert.doesNotThrow(()=>validateDocument({...saved,pages:[{...restored,annotations:[moveAnnotation(text,1000,0)]}]}));
 assert.throws(()=>validateDocument({...saved,pages:[{...restored,annotations:[{...callout,y2:600}]}]}),{status:400});
 assert.throws(()=>validateDocument({...saved,pages:[{...restored,products:[{...shirt,extraApplications:['INVALIDA']},shorts]}]}),{status:400});
});

test('the image editing guide previews and applies one resized kit image and opens the complete print preview',async()=>{
 class Element{
  constructor(tag){this.tagName=tag;this.children=[];this.nodes=[];this.dataset={};this.style={};this.value='';this.open=false;this.listeners={};}
  set innerHTML(html){this.html=html;this.nodes=[];for(const [,tag,attributes]of html.matchAll(/<(\w+)\b([^>]*)>/g)){const element=new Element(tag);for(const [,name,value]of attributes.matchAll(/data-([a-z-]+)(?:="([^"]*)")?/g))element.dataset[name.replace(/-([a-z])/g,(_,c)=>c.toUpperCase())]=value||'';element.value=attributes.match(/\bvalue="([^"]*)"/)?.[1]||'';this.nodes.push(element);}}
  get innerHTML(){return this.html||'';}setAttribute(){}appendChild(node){this.children.push(node);}replaceChildren(...nodes){this.children=nodes;}addEventListener(type,handler){(this.listeners[type]||=[]).push(handler);}emit(type,event){for(const handler of this.listeners[type]||[])handler(event);}showModal(){this.open=true;}close(){this.open=false;this.emit('close',{});}
  getBoundingClientRect(){return {left:0,top:0,width:841.89,height:595.28};}
  querySelectorAll(selector){const [,name,value]=selector.match(/^\[data-([a-z-]+)(?:="([^"]*)")?\]$/)||[];const key=name?.replace(/-([a-z])/g,(_,c)=>c.toUpperCase());return this.nodes.filter(node=>key in node.dataset&&(value===undefined||node.dataset[key]===value));}
  querySelector(selector){return selector==='svg'?this.nodes.find(node=>node.tagName==='svg'):this.querySelectorAll(selector)[0];}
 }
 const prior=globalThis.document,body=new Element('body');globalThis.document={body,createElement:tag=>new Element(tag)};
 try{
  const doc=completeKit();doc.pages[0].products[0].images=[image];let applied=null,failure='',reviewClosed=0,reviewConfirmed=0;
  const tools=createOrderVisualTools({getOrder:()=>doc,getPage:()=>doc.pages[0],getProduct:()=>doc.pages[0].products[0],getAssets:()=>({}),getGeneration:()=>1,canEdit:()=>true,readImage:async()=>image,onApply:edit=>{applied=edit;},onError:error=>{failure=error;},onDownload(){},onReviewClose(){reviewClosed++;},onConfirmReview:async()=>{reviewConfirmed++;return true;}});
  const editor=body.children[0],final=body.children[1],find=s=>editor.querySelector(s);tools.openImageEditor();assert.equal(editor.open,true);assert.equal(find('[data-target]').value,'shared');
  find('[data-transform="scale"]').value='50';find('[data-transform="scale"]').oninput();for(const [key,value] of [['x','10'],['y','20']]){find('[data-position="'+key+'"]').value=value;find('[data-position="'+key+'"]').oninput();}assert.equal((find('[data-preview]').innerHTML.match(/<image /g)||[]).length,1);find('[data-apply]').onclick();
  assert.equal(editor.open,false);assert.equal(applied.page.visual.mode,'shared');assert.equal(applied.page.visual.transform.scale,.5);assert.ok(Math.abs(applied.page.visual.transform.frame.x-10*72/25.4)<.0001);assert.ok(Math.abs(applied.page.visual.transform.frame.y-20*72/25.4)<.0001);assert.equal(applied.page.mode,'conjunto');
  tools.openFinalPreview();assert.equal(final.open,false);assert.match(failure,/imagem manual/);
  // Required technical data is complete. An optional missing image does not
  // block the readable review; it leaves the same blank space as the PDF.
  tools.openFinalPreview({mode:'review'});assert.equal(final.open,true);assert.equal(final.querySelector('[data-final-sheet]').style.width,Math.round(PAPER.width*96/72)+'px');assert.ok(!final.querySelector('[data-final-sheet]').innerHTML.includes('MOCKUP'));final.querySelector('[data-close]').onclick();assert.equal(reviewClosed,1);
  const scroll=final.querySelector('[data-scroll]');scroll.clientWidth=648;scroll.clientHeight=348;tools.openFinalPreview({mode:'review'});
  const zoom=final.querySelector('[data-zoom]');zoom.value='width';zoom.onchange();assert.equal(final.querySelector('[data-final-sheet]').style.width,'600px');zoom.value='page';zoom.onchange();assert.equal(final.querySelector('[data-final-sheet]').style.width,Math.round(300*PAPER.width/PAPER.height)+'px');zoom.value='200';zoom.onchange();assert.equal(final.querySelector('[data-final-sheet]').style.width,Math.round(PAPER.width*96/72*2)+'px');final.querySelector('[data-close]').onclick();
  const delivery=doc.deliveryDate;doc.deliveryDate='';tools.openFinalPreview({mode:'review'});assert.equal(final.open,false);assert.match(failure,/Previsão de entrega/);tools.openFinalPreview({mode:'draft'});assert.equal(final.open,true);assert.equal(final.querySelector('[data-pdf]').hidden,true);assert.match(final.querySelector('[data-title]').textContent,/preenchimento/);final.querySelector('[data-close]').onclick();assert.equal(reviewClosed,2,'a draft preview never completes a review');doc.deliveryDate=delivery;
  doc.pages[0]=applied.page;tools.openImageEditor();const noteUI=find('[data-annotation-controls]'),preview=find('[data-preview]'),pick=s=>noteUI.querySelector(s);
  find('[data-transform="scale"]').value='250';find('[data-transform="scale"]').oninput();
  const pointer=(x,y,target={closest:()=>null})=>({button:0,pointerId:1,clientX:x,clientY:y,target,preventDefault(){}});
  const beforeDrag={x:Number(find('[data-position="x"]').value),y:Number(find('[data-position="y"]').value)};
  preview.emit('pointerdown',pointer(750,520));preview.emit('pointermove',pointer(550,170));preview.emit('pointerup',pointer(550,170));
  assert.ok(Math.abs(Number(find('[data-position="x"]').value)-beforeDrag.x+200*25.4/72)<.2,'dragging from outside the old art area moves the selected image');assert.ok(Math.abs(Number(find('[data-position="y"]').value)-beforeDrag.y+350*25.4/72)<.2);
  const widthBefore=Number(find('[data-image-width]').value),resize={closest:selector=>selector==='[data-image-resize]'?{}:null};
  preview.emit('pointerdown',pointer(600,400,resize));preview.emit('pointermove',pointer(640,420,resize));preview.emit('pointerup',pointer(640,420,resize));assert.ok(Number(find('[data-image-width]').value)>widthBefore,'the corner handle resizes the image');
  find('[data-page-fit]').onclick();assert.ok(Number(find('[data-position="x"]').value)>=0);assert.ok(Number(find('[data-image-width]').value)<=297);find('[data-reset]').onclick();assert.equal(find('[data-scale-label]').textContent,'100%');
  find('[data-image-width]').value='80';find('[data-image-width]').oninput();assert.equal(find('[data-image-width]').value,'80');
  pick('[data-tool="callout"]').onclick();
  preview.emit('pointerdown',pointer(60,180));preview.emit('pointermove',pointer(260,290));preview.emit('pointerup',pointer(260,290));
  pick('[data-field="text"]').value='Bordado no peito';pick('[data-field="text"]').oninput();assert.match(preview.innerHTML,/Bordado no peito/);
  const noteId=pick('[data-list]').value,handle={dataset:{noteHit:noteId,noteHandle:'end'},closest(){return this;}};
  preview.emit('pointerdown',pointer(260,290,handle));preview.emit('pointermove',pointer(800,560,handle));preview.emit('pointerup',pointer(800,560,handle));find('[data-apply]').onclick();
  assert.ok(Math.abs(applied.page.visual.transform.frame.w-80*72/25.4)<.0001);assert.equal(applied.page.annotations.length,1);assert.equal(applied.page.annotations[0].text,'Bordado no peito');assert.equal(applied.page.annotations[0].x2,800);assert.equal(applied.page.annotations[0].y2,560);
  doc.pages[0]=applied.page;tools.openFinalPreview({mode:'review'});assert.equal(final.querySelector('[data-confirm-review]').hidden,false);assert.equal(reviewConfirmed,0);await final.querySelector('[data-confirm-review]').onclick();assert.equal(reviewConfirmed,1);assert.equal(final.open,false);final.querySelector('[data-zoom]').value='100';tools.openFinalPreview();assert.equal(final.open,true);assert.match(final.querySelector('[data-final-sheet]').innerHTML,/<svg/);assert.equal(final.querySelector('[data-sheet]').children.length,2,'the list follows the technical sheet');
  doc.pages[0].products[0].notes='Informação detalhada '.repeat(120);tools.openFinalPreview();assert.ok(final.querySelector('[data-sheet]').children.length>1);assert.equal(final.querySelector('[data-prev]').disabled,true);final.querySelector('[data-prev]').onclick();assert.equal(final.querySelector('[data-sheet]').value,'0');final.querySelector('[data-next]').onclick();assert.match(final.querySelector('[data-final-sheet]').innerHTML,/LISTA DE/);final.querySelector('[data-next]').onclick();assert.match(final.querySelector('[data-final-sheet]').innerHTML,/DADOS COMPLEMENTARES/);
  doc.pages=catalogOrder(newOrder()).pages;const initial=JSON.stringify(doc.pages);applied=null;
  tools.openImageEditor({create:true});assert.equal(find('[data-application-form]').hidden,false);assert.equal(find('[data-image-options]').open,false);assert.equal(JSON.stringify(doc.pages),initial,'the modal edits a private draft');find('[data-cancel]').onclick();assert.equal(applied,null);assert.equal(JSON.stringify(doc.pages),initial,'cancel leaves no application or stray arrow');
  tools.openImageEditor({create:true});find('[data-app-count]').value='2';find('[data-app-count]').onchange();find('[data-apply]').onclick();assert.equal(editor.open,false);assert.equal(applied.page.products[0].technical.applications[0].position,'Conforme seta no desenho');assert.equal(applied.page.annotations.length,2);assert.doesNotThrow(()=>validateDocument({...doc,pages:[applied.page]}));
  doc.pages[0]=applied.page;const aid=doc.pages[0].products[0].technical.applications[0].id;doc.pages[0].annotations[0].x2=499;tools.openImageEditor({applicationId:aid});find('[data-apply]').onclick();assert.equal(applied.page.annotations[0].x2,499,'reopening and confirming preserves positioning');
  tools.openImageEditor({create:true});find('[data-app-choice]').value='3';find('[data-app-choice]').onchange();find('[data-apply]').onclick();assert.equal(applied.page.products[0].technical.applications.at(-1).type,'TERMOCOLANTE');assert.equal(applied.page.products[0].technical.applications.at(-1).position,'Conforme seta no desenho');
  doc.pages=[newKitPage(['Puffer','Legging'])];doc.pages[0].products[0].images=[image];tools.openImageEditor();assert.equal(find('[data-target]').value,'shared','custom kit compositions default to one image');find('[data-apply]').onclick();assert.deepEqual(applied.page.products.map(p=>p.type),['Puffer','Legging']);
  doc.pages[0]=applied.page;doc.pages[0].visual.mode='per-product';tools.openImageEditor();assert.equal(find('[data-target]').value,'0','an explicit choice of separate images remains selected');
 }finally{globalThis.document=prior;}
});
