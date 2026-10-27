import {PAPER} from './production-sheet.js?v=16';
import {notePoint,newAnnotation,moveAnnotation,annotationVisible} from './order-annotations.js?v=2';
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

export function createAnnotationEditor({mount,preview,getEdit,getSheet,currentImage,getImageKey,getTransform,writeTransform,render}){
 mount.innerHTML='<h3>Linhas e acabamentos livres</h3><div class="annotation-tools"><button type="button" data-tool="image">Arrastar imagem</button><button type="button" data-tool="select">Selecionar / mover</button><button type="button" data-tool="line">+ Linha</button><button type="button" data-tool="arrow">+ Seta</button><button type="button" data-tool="text">+ Texto</button><button type="button" data-tool="callout">+ Texto com seta</button></div><p class="helper" data-hint></p><button type="button" data-import>Trazer acabamentos da peça</button><label class="visual-check"><input data-free type="checkbox"> Organizar acabamentos livremente</label><label>Apontamento selecionado<select data-list></select></label><div data-fields hidden><label>Texto<textarea data-field="text" rows="3" maxlength="400"></textarea></label><label>Cor<select data-field="color"><option value="#c52a36">Vermelho</option><option value="#235394">Azul</option><option value="#17202b">Preto</option></select></label><div class="note-size-fields"><label>Tamanho do texto<input data-field="size" type="number" min="6" max="18"></label><label>Espessura<input data-field="width" type="number" min="0.4" max="3" step="0.2"></label></div><button type="button" data-delete>Excluir apontamento</button></div><button type="button" data-undo>Desfazer apontamento</button><p data-message role="status"></p>';
 const find=s=>mount.querySelector(s);let tool='image',selected='',gesture=null,history=[];
 const note=()=>getEdit()?.page.annotations?.find(a=>a.id===selected);
 function remember(){const e=getEdit();history.push({annotations:structuredClone(e.page.annotations||[]),freeComponents:e.page.freeComponents});if(history.length>50)history.shift();}
 function reset(){const e=getEdit();e.page.annotations||=[];tool='image';selected='';gesture=null;history=[];find('[data-message]').textContent='';}
 function visible(){return (getEdit().page.annotations||[]).filter(a=>annotationVisible(a,(getSheet()?.anchors||[]).map(a=>({id:a.id}))));}
 function overlay(){
  const e=getEdit(),a=note(),notes=visible();find('[data-free]').checked=Boolean(e.page.freeComponents);
  for(const button of mount.querySelectorAll('[data-tool]'))button.setAttribute('aria-pressed',String(button.dataset.tool===tool));
  find('[data-hint]').textContent=tool==='image'?'Toda a folha A4 está ativa. Arraste para mover; a alça azul ajusta o tamanho.':tool==='select'?'Arraste para mover. Os círculos ajustam as pontas da linha ou seta.':tool==='text'?'Clique na prévia para inserir um texto.':'Clique e arraste na prévia para desenhar. Depois ajuste as pontas.';
  const options=[['','Selecione na prévia…'],...notes.map((n,i)=>[n.id,(i+1)+'. '+(n.text||({line:'Linha',arrow:'Seta',callout:'Texto com seta',text:'Texto'}[n.type]))])];
  find('[data-list]').replaceChildren(...options.map(([value,label])=>{const o=document.createElement('option');o.value=value;o.textContent=label.slice(0,90);return o;}));find('[data-list]').value=selected;
  find('[data-fields]').hidden=!a;for(const key of ['text','color','size','width'])if(a){const input=find('[data-field="'+key+'"]');if(input.value!==String(a[key]))input.value=String(a[key]);}find('[data-undo]').disabled=!history.length;
  let html='<rect x="1" y="1" width="839.89" height="593.28" fill="none" stroke="#9a813c" stroke-width=".6" stroke-dasharray="3 4" pointer-events="none"/>';
  const art=getSheet()?.ops.find(o=>o.imageKey===getImageKey());if(tool==='image'&&art)html+='<rect x="'+art.x+'" y="'+art.y+'" width="'+art.w+'" height="'+art.h+'" fill="none" stroke="#235394" stroke-width="1" stroke-dasharray="4 3" pointer-events="none"/><circle data-image-resize cx="'+(art.x+art.w)+'" cy="'+(art.y+art.h)+'" r="6" fill="#235394" stroke="#fff" stroke-width="1.5"/>';
  for(const n of notes){
   if(n.type!=='text')html+='<line data-note-hit="'+esc(n.id)+'" x1="'+n.x+'" y1="'+n.y+'" x2="'+n.x2+'" y2="'+n.y2+'" stroke="transparent" stroke-width="14"/>';
   if(n.text)html+='<rect data-note-hit="'+esc(n.id)+'" x="'+(n.x-3)+'" y="'+(n.y-n.size)+'" width="'+Math.min(190,Math.max(35,n.text.length*n.size*.5))+'" height="'+Math.max(16,n.size+7)+'" fill="transparent"/>';
  }
  if(a&&notes.includes(a))for(const end of ['start',...(a.type==='text'?[]:['end'])])html+='<circle data-note-hit="'+esc(a.id)+'" data-note-handle="'+end+'" cx="'+(end==='end'?a.x2:a.x)+'" cy="'+(end==='end'?a.y2:a.y)+'" r="5" fill="#fff" stroke="#235394" stroke-width="1.5"/>';
  return '<g class="annotation-overlay">'+html+'</g>';
 }
 for(const button of mount.querySelectorAll('[data-tool]'))button.onclick=()=>{tool=button.dataset.tool;render();};
 find('[data-list]').onchange=event=>{selected=event.target.value;tool='select';render();};
 find('[data-free]').onchange=event=>{remember();getEdit().page.freeComponents=event.target.checked;render();};
 for(const input of mount.querySelectorAll('[data-field]'))input.oninput=()=>{
  const a=note();if(!a)return;const key=input.dataset.field,value=['size','width'].includes(key)?Number(input.value):input.value;
  if(key==='size'&&(!Number.isFinite(value)||value<6||value>18)||key==='width'&&(!Number.isFinite(value)||value<.4||value>3))return;
  remember();a[key]=value;render();
 };
 function remove(){if(!note())return;remember();getEdit().page.annotations=getEdit().page.annotations.filter(a=>a.id!==selected);selected='';render();}
 find('[data-delete]').onclick=remove;
 find('[data-undo]').onclick=()=>{if(!history.length)return;Object.assign(getEdit().page,history.pop());selected='';render();};
 find('[data-import]').onclick=()=>{
  const e=getEdit(),p=e.page.products.find(p=>p.id===e.productId),components=p.components.filter(c=>[c.name,c.material,c.finish,c.position].some(Boolean));
  if(!components.length){find('[data-message]').textContent='Adicione componentes à peça ou crie seus apontamentos com as ferramentas acima.';return;}
  if(e.page.annotations.length+components.length>80){find('[data-message]').textContent='Use até 80 apontamentos por página.';return;}
  remember();components.forEach((c,i)=>{const a=newAnnotation('callout',p.id,{x:35+(i%3)*190,y:175+Math.floor(i/3)*25});a.text=[c.name,c.material,c.finish,c.position].filter(Boolean).join(' · ').slice(0,400);const area=getSheet().anchors.find(a=>a.id===p.id);if(c.anchor&&area){const target=notePoint({x:area.x+c.anchor.x*area.w,y:area.y+c.anchor.y*area.h});a.x2=target.x;a.y2=target.y;}e.page.annotations.push(a);selected=a.id;});e.page.freeComponents=true;tool='select';render();
 };
 function point(event){const rect=preview.querySelector('svg')?.getBoundingClientRect();return rect?.width?{x:(event.clientX-rect.left)*PAPER.width/rect.width,y:(event.clientY-rect.top)*PAPER.height/rect.height}:null;}
 preview.addEventListener('pointerdown',event=>{
  const e=getEdit();if(!e||e.loading||event.button!==0)return;const p=point(event);if(!p)return;const hit=event.target.closest?.('[data-note-hit]');
  if(hit&&tool!=='image'){selected=hit.dataset.noteHit;tool='select';remember();gesture={type:'note',start:p,value:{...note()},handle:hit.dataset.noteHandle||'move'};}
  else if(tool==='image'){
   const art=getSheet().ops.find(o=>o.imageKey===getImageKey());if(!art||p.x<0||p.x>PAPER.width||p.y<0||p.y>PAPER.height)return;
   gesture={type:event.target.closest?.('[data-image-resize]')?'resize':'image',start:p,value:getTransform(),art};
  }else if(['line','arrow','text','callout'].includes(tool)){
   if(p.x<0||p.x>PAPER.width||p.y<0||p.y>PAPER.height)return;if(e.page.annotations.length>=80){find('[data-message]').textContent='Use até 80 apontamentos por página.';return;}
   remember();const a=newAnnotation(tool,e.productId,p);e.page.annotations.push(a);selected=a.id;gesture={type:'create',start:p};
  }else{selected='';render();return;}
  preview.setPointerCapture?.(event.pointerId);event.preventDefault();render();
 });
 preview.addEventListener('pointermove',event=>{
  if(!getEdit()||!gesture)return;const p=point(event);if(!p)return;const dx=p.x-gesture.start.x,dy=p.y-gesture.start.y;
  if(gesture.type==='image'){const t=gesture.value,a=gesture.art;writeTransform({...t,frame:{x:Math.max(-8418.9,Math.min(8418.9,a.x+dx)),y:Math.max(-5952.8,Math.min(5952.8,a.y+dy)),w:a.w}});}
  else if(gesture.type==='resize'){const a=gesture.art,t=gesture.value,width=Math.max(.28,Math.min(8418.9,a.w+(dx+dy*a.h/a.w)/(1+(a.h/a.w)**2)));writeTransform({...t,scale:Math.max(.05,Math.min(10,t.scale*width/a.w)),frame:{x:a.x,y:a.y,w:width}});}
  else{const a=note();if(!a)return;if(gesture.type==='create'&&a.type!=='text'){const end=notePoint(p);a.x2=end.x;a.y2=end.y;}else if(gesture.type==='note')Object.assign(a,moveAnnotation(gesture.value,dx,dy,gesture.handle));}
  render();
 });
 function finish(){if(gesture?.type==='create')tool='select';gesture=null;if(getEdit())render();}
 preview.addEventListener('pointerup',finish);preview.addEventListener('pointercancel',finish);
 preview.addEventListener('keydown',event=>{if(getEdit()&&['Delete','Backspace'].includes(event.key)){event.preventDefault();remove();}});
 return {reset,overlay};
}
