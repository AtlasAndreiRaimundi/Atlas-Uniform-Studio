import {createAnnotationEditor} from './order-annotation-editor.js?v=4';
import {buildSheets,sheetSVG,PAPER} from './production-sheet.js?v=13';
import {imageTransform} from './order-image-layout.js?v=3';
import {finalPreviewProblems,releaseProblems} from './production-core.js?v=10';

export function createOrderVisualTools({getOrder,getPage,getProduct,getAssets,getGeneration,canEdit,readImage,onApply,onError,onDownload,onReviewClose}){
 const editor=document.createElement('dialog');editor.className='order-image-dialog';editor.setAttribute('aria-label','Editar layout e apontamentos');
 editor.innerHTML=`<header><div><h2>Layout e apontamentos</h2><p>Amplie e arraste a imagem. Desenhe linhas, setas e textos diretamente na prévia.</p></div><button type="button" data-close>Fechar</button></header><div class="image-editor-grid"><div class="image-editor-controls"><label>Imagem a editar<select data-target></select></label><label class="image-file-label">Inserir / substituir imagem<input data-file type="file" accept="image/png,image/jpeg,image/webp"></label><label>Tamanho <output data-scale-label>100%</output><input data-transform="scale" type="range" min="5" max="1000" step="1" value="100"></label><div class="note-size-fields"><label>Posição X · mm<input data-position="x" type="number" step="0.1"></label><label>Posição Y · mm<input data-position="y" type="number" step="0.1"></label></div><label>Largura da imagem · mm<input data-image-width type="number" min="0.1" max="2970" step="0.1"></label><button type="button" data-page-fit>Encaixar na folha A4</button><button type="button" data-reset>Voltar ao enquadramento automático</button><section class="annotation-controls" data-annotation-controls></section><p class="helper">A proporção e a transparência da imagem são preservadas. A folha A4 inteira está ativa. Arraste a imagem e a alça para ajustar posição e tamanho, inclusive sobre outros campos. As sobreposições ficam sob seu controle.</p><p data-error role="alert"></p><button type="button" class="gold-button" data-apply>Aplicar no pedido</button><button type="button" data-cancel>Descartar alterações</button></div><div class="image-editor-preview" data-preview tabindex="0" aria-label="Prévia interativa do layout"></div></div>`;
 document.body.appendChild(editor);const find=s=>editor.querySelector(s);let edit=null,draftSheet=null;
 const annotations=createAnnotationEditor({mount:find('[data-annotation-controls]'),preview:find('[data-preview]'),getEdit:()=>edit,getSheet:()=>draftSheet,currentImage,getImageKey:currentImageKey,getTransform:currentTransform,writeTransform,render});
 function selected(){return edit.page.products.find(p=>p.id===edit.productId);}
 function shared(){return find('[data-target]').value==='shared';}
 function currentImageKey(){return shared()?'shared':edit.productId+':'+find('[data-target]').value;}
 function currentArt(){return draftSheet?.ops.find(o=>o.imageKey===currentImageKey());}
 function currentImage(){return shared()?edit.page.visual?.image:selected().images[Number(find('[data-target]').value)]||'';}
 function currentTransform(){return imageTransform(shared()?edit.page.visual?.transform:selected().imageTransforms?.[Number(find('[data-target]').value)]);}
 function writeTransform(value){if(shared())edit.page.visual.transform=value;else{const p=selected(),slot=Number(find('[data-target]').value);p.imageTransforms||=[];p.imageTransforms[slot]=value;}}
 function render(){
  const draft={...edit.header,pages:[edit.page]},sheets=buildSheets(draft,getAssets()),sheet=sheets.find(s=>s.anchors?.some(a=>a.id===edit.productId))||sheets[0];draftSheet=sheet;find('[data-preview]').innerHTML=sheet?sheetSVG(sheet).replace('</svg>',annotations.overlay()+'</svg>'):'';
  const t=currentTransform(),art=currentArt();find('[data-transform="scale"]').value=String(Math.round(t.scale*100));find('[data-scale-label]').textContent=Math.round(t.scale*100)+'%';for(const key of ['x','y']){const input=find('[data-position="'+key+'"]');if(document.activeElement!==input)input.value=art?String(Math.round(art[key]*25.4/72*10)/10):'';}const width=find('[data-image-width]');if(document.activeElement!==width)width.value=art?String(Math.round(art.w*25.4/72*10)/10):'';find('[data-apply]').disabled=edit.loading;
 }
 function changeTarget(){
  if(shared()){edit.page.visual={mode:'shared',image:edit.page.visual?.image||selected().images.find(Boolean)||'',transform:imageTransform(edit.page.visual?.transform)};edit.page.mode='conjunto';}
  else{if(edit.page.visual)edit.page.visual.mode='per-product';edit.page.mode=edit.originalMode;}
  find('[data-error]').textContent='';render();
 }
 function closeEditor(){edit=null;editor.close();}
 find('[data-close]').onclick=find('[data-cancel]').onclick=closeEditor;editor.addEventListener('cancel',()=>{edit=null;});
 find('[data-target]').onchange=changeTarget;
 function resizeArt(width){const art=currentArt();if(!art||!Number.isFinite(width)||width<.28||width>8418.9)return;const t=currentTransform(),ratio=width/art.w;writeTransform({...t,scale:Math.max(.05,Math.min(10,t.scale*ratio)),frame:{x:art.x+(art.w-width)/2,y:art.y+(art.h-art.h*ratio)/2,w:width}});render();}
 find('[data-transform="scale"]').oninput=()=>{const art=currentArt();if(art)resizeArt(art.w*Number(find('[data-transform="scale"]').value)/100/currentTransform().scale);};
 for(const key of ['x','y'])find('[data-position="'+key+'"]').oninput=()=>{const art=currentArt(),raw=find('[data-position="'+key+'"]').value,value=Number(raw)*72/25.4;if(!art||!raw.trim()||!Number.isFinite(value))return;const frame={x:art.x,y:art.y,w:art.w};frame[key]=value;writeTransform(imageTransform({...currentTransform(),frame}));render();};
 find('[data-image-width]').oninput=()=>resizeArt(Number(find('[data-image-width]').value)*72/25.4);
 find('[data-page-fit]').onclick=()=>{const art=currentArt();if(!art)return;const ratio=Math.min(PAPER.width/art.w,PAPER.height/art.h)*.96,t=currentTransform();writeTransform({...t,scale:Math.max(.05,Math.min(10,t.scale*ratio)),frame:{x:(PAPER.width-art.w*ratio)/2,y:(PAPER.height-art.h*ratio)/2,w:art.w*ratio}});render();};
 find('[data-reset]').onclick=()=>{if(edit){writeTransform({scale:1,x:.5,y:.5});render();}};
 find('[data-file]').onchange=async event=>{
  if(!edit||!event.target.files[0])return;const current=edit,target=find('[data-target]').value;current.loading=true;find('[data-target]').disabled=true;render();
  try{const image=await readImage(event.target.files[0]);if(edit!==current||getGeneration()!==current.generation)throw new Error('O pedido mudou. Abra o editor novamente.');if(target==='shared')current.page.visual.image=image;else selected().images[Number(target)]=image;current.sourceChanged=true;writeTransform({scale:1,x:.5,y:.5});find('[data-error]').textContent='';}
  catch(error){if(edit===current)find('[data-error]').textContent=error.message;}
  finally{if(edit===current){current.loading=false;find('[data-target]').disabled=false;find('[data-file]').value='';render();}}
 };
 find('[data-apply]').onclick=()=>{
  if(!edit||edit.loading||!canEdit())return;try{if(getGeneration()!==edit.generation)throw new Error('O pedido mudou. Abra o editor novamente.');onApply(edit);closeEditor();}catch(error){find('[data-error]').textContent=error.message;}
 };
 function openImageEditor(){
  if(!canEdit())return onError('Abra uma revisão em preparação para editar o layout.');const page=getPage(),product=getProduct();
  edit={header:getOrder(),page:structuredClone(page),productId:product.id,generation:getGeneration(),originalMode:page.mode,sourceChanged:false,loading:false};annotations.reset();
  const options=[['0','Imagem principal desta peça'],['1','Imagem complementar desta peça (opcional)']];if(page.products.length===2)options.push(['shared','Uma imagem única do kit / conjunto']);
  const select=find('[data-target]');select.replaceChildren(...options.map(([value,label])=>{const option=document.createElement('option');option.value=value;option.textContent=label;return option;}));
  const isKit=page.products.length===2&&(page.mode==='conjunto'||[['Camiseta','Calção'],['Jaqueta','Calça']].some(pair=>pair.every(type=>page.products.some(p=>p.type===type))));
  const useShared=page.visual?page.visual.mode==='shared':isKit&&page.products.filter(p=>p.images.some(Boolean)).length<=1;
  select.value=useShared?'shared':'0';select.disabled=false;find('[data-file]').value='';changeTarget();editor.showModal();
 }
 const final=document.createElement('dialog');final.className='order-final-preview';final.setAttribute('aria-label','Prévia final de impressão');
 final.innerHTML=`<header><div><h2 data-title>Conferência do pedido</h2><p data-description>Confira o desenho, as grades e todas as folhas complementares.</p></div><button data-close type="button">Voltar à conferência · Esc</button></header><nav aria-label="Leitura da ficha"><button data-prev type="button" aria-label="Folha anterior">← Anterior</button><select data-sheet aria-label="Folha da prévia final"></select><button data-next type="button" aria-label="Próxima folha">Próxima →</button><label>Zoom<select data-zoom aria-label="Zoom da ficha"><option value="width">Ajustar à largura</option><option value="page">Folha inteira</option><option value="75">75%</option><option value="100" selected>100% · leitura</option><option value="125">125%</option><option value="150">150%</option><option value="200">200%</option></select></label><button data-pdf type="button" class="gold-button">Baixar PDF para imprimir</button></nav><p class="final-preview-status" data-page-status role="status"></p><div class="final-sheet-scroll" data-scroll tabindex="0" aria-label="Ficha ampliada; role para ler toda a folha"><div data-final-sheet></div></div>`;
 document.body.appendChild(final);const out=s=>final.querySelector(s);let finalSheets=[],currentSheet=0,previewMode='final';
 const paperPixels=PAPER.width*96/72;
 function resizeFinal(){
  if(!final.open)return;const zoom=out('[data-zoom]').value,scroll=out('[data-scroll]'),width=Math.max(260,(scroll.clientWidth||paperPixels+48)-48),height=Math.max(180,(scroll.clientHeight||PAPER.height*96/72+48)-48);
  const pixels=zoom==='width'?width:zoom==='page'?Math.min(width,height*PAPER.width/PAPER.height):paperPixels*Number(zoom)/100;
  out('[data-final-sheet]').style.width=Math.round(pixels)+'px';
 }
 function renderFinal(){if(!finalSheets.length)return;currentSheet=Math.max(0,Math.min(currentSheet,finalSheets.length-1));out('[data-final-sheet]').innerHTML=sheetSVG(finalSheets[currentSheet],{placeholders:false});out('[data-sheet]').value=String(currentSheet);out('[data-prev]').disabled=currentSheet===0;out('[data-next]').disabled=currentSheet===finalSheets.length-1;out('[data-page-status]').textContent='Folha '+(currentSheet+1)+' de '+finalSheets.length+' · Use 100% ou mais para ler os detalhes.';resizeFinal();out('[data-scroll]').scrollTo?.({top:0,left:0});}
 function closeFinal(){if(document.fullscreenElement===final)document.exitFullscreen?.().catch(()=>{});final.close();}
 out('[data-close]').onclick=closeFinal;final.addEventListener('cancel',()=>{if(document.fullscreenElement===final)document.exitFullscreen?.().catch(()=>{});});
 final.addEventListener('close',()=>{if(previewMode==='review')onReviewClose?.();});
 out('[data-prev]').onclick=()=>{if(currentSheet>0){currentSheet--;renderFinal();}};out('[data-next]').onclick=()=>{if(currentSheet<finalSheets.length-1){currentSheet++;renderFinal();}};out('[data-sheet]').onchange=event=>{const next=Number(event.target.value);if(Number.isSafeInteger(next)){currentSheet=next;renderFinal();}};out('[data-zoom]').onchange=resizeFinal;out('[data-pdf]').onclick=onDownload;
 final.addEventListener('keydown',event=>{if(['INPUT','SELECT','TEXTAREA'].includes(event.target?.tagName)||event.altKey||event.ctrlKey||event.metaKey)return;if(event.key==='ArrowLeft'){event.preventDefault();out('[data-prev]').onclick();}if(event.key==='ArrowRight'){event.preventDefault();out('[data-next]').onclick();}});
 if(typeof ResizeObserver==='function')new ResizeObserver(()=>{if(['width','page'].includes(out('[data-zoom]').value))resizeFinal();}).observe(out('[data-scroll]'));
 final.addEventListener('fullscreenchange',resizeFinal);
 function openFinalPreview({mode='final',sheet=0}={}){
  if(!['draft','review','final'].includes(mode))return;let issues=[];if(mode==='final')issues=finalPreviewProblems(getOrder());else if(mode==='review'&&canEdit())issues=releaseProblems(getOrder());
  if(issues.length)return onError('Conclua antes da prévia final: '+issues.slice(0,8).join(' '));
  finalSheets=buildSheets(getOrder(),getAssets());if(!finalSheets.length)return onError('Adicione uma peça antes de abrir a prévia.');previewMode=mode;currentSheet=Number.isSafeInteger(sheet)?sheet:0;
  out('[data-title]').textContent=mode==='draft'?'Prévia durante o preenchimento':'Conferência do pedido';out('[data-description]').textContent=mode==='draft'?'Prévia de trabalho. A conferência fica disponível depois que os campos obrigatórios estiverem completos.':'Confira todas as folhas. Ao fechar, marque as conferências de arte, lista e dados técnicos no pedido.';out('[data-close]').textContent=mode==='draft'?'Voltar ao preenchimento · Esc':'Voltar à conferência · Esc';out('[data-pdf]').hidden=mode==='draft';
  out('[data-zoom]').value='100';out('[data-sheet]').replaceChildren(...finalSheets.map((sheet,index)=>{const option=document.createElement('option');option.value=String(index);option.textContent=(index+1)+' de '+finalSheets.length+' · '+sheet.title;return option;}));final.showModal();renderFinal();final.requestFullscreen?.().catch(()=>{});
 }
 return {openImageEditor,openFinalPreview};
}
