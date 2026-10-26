import {FONTS,clone,uid,layer,activePanel,selectedLayer,visiblePanels,move,resize,clamp,quality,warnings,History,sanitizeSVG,personalizationRole,normalizeText,normalizeTextState} from './core.js';
import {paint,imageFor} from './paint.js';
import {UniformScene} from './scene.js';
import {ELITE_MODEL,eliteState,fetchEliteModel} from './elite.js';
import {COLORS,DEFAULT_BASE,DEFAULT_ACCENT,applyColor,paletteColor} from './catalog.js';
import {GRAPHICS} from './graphics.js';
import {presentationMap} from './presentation-bridge.js';
import {setupSideCopy} from './symmetry-ui.js';
import {sidePairs,synchronizeLive,disableLiveSymmetry} from './symmetry.js';
import {isGraphic,drawingLayers,pickDrawingLayer,graphicTarget,applyGraphic,canShiftLayer,shiftLayer} from './layers.js';
import {setupTutorial} from './tutorial.js';

const $=id=>document.getElementById(id);
const icons={
 shirt:'<path d="m8 3-6 5 4 4 2-2v11h8V10l2 2 4-4-6-5c-1 4-7 4-8 0Z"/>',palette:'<path d="M12 3a9 9 0 1 0 0 18h1a2 2 0 0 0 1-4 1.5 1.5 0 0 1 1-3h3a3 3 0 0 0 3-3 9 9 0 0 0-9-8Z"/><circle cx="7.5" cy="10" r=".8"/><circle cx="10" cy="6.5" r=".8"/><circle cx="15" cy="7" r=".8"/>',shapes:'<path d="M3 3h7v7H3zM15 3l6 7H10z"/><circle cx="7" cy="17" r="4"/><path d="M14 14h7v7h-7z"/>',text:'<path d="M4 5h16M12 5v15M8 20h8M4 5v3M20 5v3"/>',image:'<rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="8" cy="8" r="1.5"/><path d="m3 17 5-5 4 4 4-6 5 7"/>',upload:'<path d="M12 16V3m-5 5 5-5 5 5M4 15v5h16v-5"/>',plus:'<path d="M12 5v14M5 12h14"/>',minus:'<path d="M5 12h14"/>',move:'<path d="M12 2v20M2 12h20M8 6l4-4 4 4M8 18l4 4 4-4M6 8l-4 4 4 4m12-8 4 4-4 4"/>',orbit:'<circle cx="12" cy="12" r="4"/><path d="M4 9a9 9 0 1 1 0 6M4 4v5h5"/>',check:'<path d="m5 12 4 4L20 5"/>',arrow:'<path d="M4 12h16m-6-6 6 6-6 6"/>',undo:'<path d="M8 5 3 10l5 5M3 10h11a6 6 0 0 1 0 12"/>',redo:'<path d="m16 5 5 5-5 5m5-5H10a6 6 0 0 0 0 12"/>',flask:'<path d="M9 3h6m-5 0v6l-6 10a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2L14 9V3M7 15h10"/>',info:'<circle cx="12" cy="12" r="9"/><path d="M12 11v6m0-10v.1"/>',shield:'<path d="m12 2 8 4v6c0 5-8 10-8 10S4 17 4 12V6l8-4Z"/>',frame:'<path d="M3 8V3h5m8 0h5v5M3 16v5h5m8 0h5v-5"/>',cube:'<path d="m12 2 9 5v10l-9 5-9-5V7l9-5Zm0 10 9-5m-9 5L3 7m9 5v10"/>',copy:'<rect x="8" y="8" width="13" height="13" rx="2"/><path d="M16 8V3H3v13h5"/>',trash:'<path d="M3 6h18M9 6V3h6v3M6 6l1 15h10l1-15M10 10v7m4-7v7"/>',align:'<path d="M12 2v20M4 5h16v5H4zm3 9h10v5H7z"/>',lock:'<rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V6a4 4 0 0 1 8 0v4m-4 5v2"/>',up:'<path d="m6 12 6-6 6 6m-6-6v15"/>',down:'<path d="m6 12 6 6 6-6m-6 6V3"/>',close:'<path d="m6 6 12 12M6 18 18 6"/>',warning:'<path d="m12 3 10 18H2L12 3Zm0 6v5m0 3v.1"/>'
};
function icon(name){const span=document.createElement('span');span.dataset.icon=name;span.innerHTML=`<svg viewBox="0 0 24 24" aria-hidden="true">${icons[name]??icons.shapes}</svg>`;return span;}
document.querySelectorAll('[data-icon]').forEach(n=>n.replaceChildren(...icon(n.dataset.icon).childNodes));
function node(tag,cls,text){const e=document.createElement(tag);if(cls)e.className=cls;if(text!==undefined)e.textContent=text;return e;}
function toast(text){$('toast').textContent=text;$('toast').hidden=false;clearTimeout(toast.timer);toast.timer=setTimeout(()=>$('toast').hidden=true,6000);}
let STORAGE_KEY='anonymous';
let state=eliteState(),history=new History(state),scene=null,flat=false,db=null,saveTimer,dragFlat=null,gesture=false,revision=0,savedRevision=0,saveChain=Promise.resolve(),busy=false;
let session=null,designId=null,serverVersion=null,cloudDirty=true,cloudSaving=null,reviewSnapshot=null,paletteTarget=null,reviewOrderId=null;
let graphicPanels=state.panels,newGraphicPanel=null;const graphicTargets=new Map();

function openDB(){return new Promise((resolve,reject)=>{const r=indexedDB.open('meinerz-uniform-simulator-v1',1);r.onupgradeneeded=()=>r.result.createObjectStore('projects');r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});}
function readProject(){return new Promise((resolve,reject)=>{const r=db.transaction('projects').objectStore('projects').get(STORAGE_KEY);r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});}
function storeProject(value){return new Promise((resolve,reject)=>{const tx=db.transaction('projects','readwrite');tx.objectStore('projects').put(value,STORAGE_KEY);tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);});}
function scheduleSave(){revision++;$('save-status').textContent='Salvando neste navegador…';clearTimeout(saveTimer);saveTimer=setTimeout(saveNow,650);}
async function saveNow(){clearTimeout(saveTimer);const value={state:clone(state),cloud:{id:designId,version:serverVersion,dirty:cloudDirty}},n=revision;if(!db){$('save-status').textContent='Somente nesta sessão';return;}
 saveChain=saveChain.catch(()=>{}).then(()=>storeProject(value));try{await saveChain;savedRevision=Math.max(savedRevision,n);$('save-status').textContent=savedRevision===revision?'Salvo neste navegador':'Salvando neste navegador…';}catch{$('save-status').textContent='Não foi possível salvar';toast('O armazenamento deste navegador está indisponível ou cheio. Sua criação continua aberta nesta sessão.');}}
function syncLinked(){try{synchronizeLive(state,history.items[history.index]);return true;}catch(error){state=clone(history.items[history.index]);cloudDirty=true;toast(error.message);render();return false;}}
function commit(){if(!syncLinked())return false;state.order=null;cloudDirty=true;history.push(state);scheduleSave();render();return true;}
function updateScene(){scene?.update(state);drawFlat();}
function drawFlat(){if(flat){const p=activePanel(state),canvas=$('flat-canvas'),longest=Math.max(p.cm.w,p.cm.h);canvas.width=Math.max(1,Math.round(1024*p.cm.w/longest));canvas.height=Math.max(1,Math.round(1024*p.cm.h/longest));paint(canvas,p,{selected:state.selected,grid:true});}}
function selectPanel(id){if(!state.panels.some(p=>p.id===id))return;state.active=id;state.selected=null;render();}
function pickLayer(panel,point){const p=state.panels.find(p=>p.id===panel);if(!p)return null;const l=pickDrawingLayer(p,point);state.active=panel;state.selected=l?.id??null;render();return l;}
function setTool(tool){document.querySelectorAll('[data-tool]').forEach(b=>{const active=b.dataset.tool===tool;b.classList.toggle('active',active);if(active)b.setAttribute('aria-current','page');else b.removeAttribute('aria-current');});document.querySelectorAll('[data-section]').forEach(s=>s.hidden=s.dataset.section!==tool);}
function setFlat(value){flat=value;$('flat-view').hidden=!value;$('viewer').hidden=value;$('view-3d').classList.toggle('active',!value);$('view-2d').classList.toggle('active',value);$('view-3d').setAttribute('aria-pressed',String(!value));$('view-2d').setAttribute('aria-pressed',String(value));$('interaction-hint').textContent=value?'Arraste a arte para mover no painel':'Arraste a arte para mover · arraste o fundo para girar';$('mode-edit').disabled=value;$('mode-orbit').disabled=value;if(value)drawFlat();else scene?.resize();}
function addLayer(l){activePanel(state).layers.push(l);state.selected=l.id;commit();}
function modify(fn,{finish=true}={}){const l=selectedLayer(state);if(!l)return;fn(l);state.order=null;cloudDirty=true;if(!syncLinked())return;updateScene();renderProperties();renderWarnings();if(finish)commit();}
function textLayer(text,font=FONTS[0].id,personalization){return normalizeText(layer('text',{text,name:text,font,personalization,w:text.length<=3?.25:.65,h:text.length<=3?.2:.09}));}
function render(){
 const brandChanged=state.platformBrand!=='atlas';state.platformBrand='atlas';if(normalizeTextState(state)||brandChanged){cloudDirty=true;state.order=null;scheduleSave();}
 const p=activePanel(state);if(!p)return;const available=visiblePanels(state);
 const options=[];for(const group of new Set(available.map(p=>p.group??'Painéis do modelo'))){const g=node('optgroup');g.label=group;for(const p of available.filter(p=>(p.group??'Painéis do modelo')===group)){const o=node('option',null,p.label);o.value=p.id;g.append(o);}options.push(g);}$('active-panel').replaceChildren(...options);$('active-panel').value=p.id;
 $('project-title').value=state.title;$('piece-summary').textContent=state.product==='kit'?'Kit · camiseta + calção':state.product==='shirt'?'Camiseta':state.product==='shorts'?'Calção':'Modelo 3D personalizado';
 $('product').value=state.product;
 $('model-card-title').textContent='KIT ELITE 27';$('model-card-detail').textContent='Camiseta + calção · 19 painéis';
 setColorChip($('base-color'),p.colorId||p.color);setColorChip($('trim-color'),state.trimColorId||state.trim);const c=paletteColor(p.colorId||p.color);$('base-hex').textContent=c?.name??p.color;$('base-color-description').textContent=c?`${c.hex.toUpperCase()} · ${c.space}${c.approximate?' · Aproximação para a tela':''}`:'';
 $('base-palette').querySelectorAll('button').forEach(b=>b.classList.toggle('active',b.dataset.colorId===p.colorId));
 $('layer-count').textContent=p.layers.length;$('layers-empty').hidden=!!p.layers.length;
 renderLayerList(p);
 $('undo').disabled=history.index===0;$('redo').disabled=history.index===history.items.length-1;
 $('model-note').textContent='KIT ELITE 27: corpo e recortes, gola, mangas e filetes, calção e cós. Escolha o painel e personalize cada parte.';
 const linked=sidePairs(state).filter(pair=>state.symmetry?.[pair.id]);$('side-copy-live-status').hidden=!linked.length;$('side-copy-live-status').textContent='Tempo real ligado: '+linked.map(pair=>pair.label).join(' · ');
 const activePair=linked.find(pair=>pair.panels.includes(p.id));$('symmetry-notice').hidden=!activePair;
 if(activePair){const settings=state.symmetry[activePair.id],other=state.panels.find(panel=>panel.id===activePair.panels.find(id=>id!==p.id));$('symmetry-notice-title').textContent='Simetria ligada · '+activePair.label;$('symmetry-notice-text').textContent=(settings.scope==='all'?'Os elementos também atualizam em ':'Os grafismos também atualizam em ')+other.label+'.'+(!settings.colors&&!settings.base?' Cores e fundos são independentes.':'');$('symmetry-disable').setAttribute('aria-label','Desligar simetria: '+activePair.label);}
 renderProperties();renderWarnings();updateScene();
}
function renderLayerList(panel){
 const graphics=panel.layers.filter(isGraphic),ordered=drawingLayers(panel).reverse(),groups=[];
 for(const [foreground,title,note]of [[true,'Escudos e personalização','Sempre acima dos grafismos'],[false,'Grafismos','De cima para baixo: ordem de sobreposição']]){
  const layers=ordered.filter(l=>isGraphic(l)!==foreground);if(!layers.length)continue;
  const group=node('section','layer-sector');group.setAttribute('aria-label',title);group.append(node('h3',null,title),node('p','layer-sector-note',note));
  for(const l of layers){const b=node('button',`layer-row${l.id===state.selected?' active':''}`);b.type='button';b.setAttribute('aria-pressed',String(l.id===state.selected));const preview=node('span','layer-preview');preview.append(icon(l.type==='text'?'text':l.type==='image'?'image':l.type==='badge'?'shield':'shapes'));b.append(preview,node('span',null,isGraphic(l)?`${graphics.indexOf(l)+1} · ${l.name}`:l.name));if(l.locked){const lock=node('span','layer-lock');lock.append(icon('lock'));b.append(lock);}b.onclick=()=>{state.selected=l.id;if(isGraphic(l))setTool('patterns');render();};group.append(b);}groups.push(group);
 }$('layers').replaceChildren(...groups);
}
function filterGraphicLibrary(){const group=$('graphic-group').value;$('pattern-library').querySelectorAll('button').forEach(b=>b.hidden=group!=='all'&&b.dataset.group!==group);}
function renderGraphicPicker(){
 if(graphicPanels!==state.panels){graphicPanels=state.panels;graphicTargets.clear();newGraphicPanel=null;}
 const panel=activePanel(state),selected=selectedLayer(state);if(selected||newGraphicPanel!==panel.id)newGraphicPanel=null;
 if(selected&&isGraphic(selected))graphicTargets.set(panel.id,selected.id);
 const target=graphicTarget(state,graphicTargets.get(panel.id)),graphics=panel.layers.filter(isGraphic),adding=newGraphicPanel===panel.id||!target;
 if(target)graphicTargets.set(panel.id,target.id);
 $('graphic-target').replaceChildren(...graphics.map((l,i)=>{const o=node('option',null,`${i+1} · ${l.name}${l.locked?' · fixado':''}`);o.value=l.id;return o;}));$('graphic-target').disabled=!graphics.length;if(target)$('graphic-target').value=target.id;
 $('graphic-target-field').hidden=!graphics.length;$('graphic-cancel-new').hidden=newGraphicPanel!==panel.id;$('graphic-new').hidden=adding;
 $('graphic-edit-title').textContent=adding?'1. Adicionar grafismo':'1. Trocar grafismo';$('graphic-action-hint').textContent=adding?'Escolha a nova camada abaixo. Depois, os cliques voltam a trocar o grafismo.':target.locked?'O grafismo está fixado. Desfixe-o para trocar ou adicione outro grafismo.':'Escolher abaixo troca este grafismo. A cor e os ajustes são mantidos.';
 for(const b of $('pattern-library').querySelectorAll('button')){const active=!adding&&target?.pattern===b.dataset.graphic;b.classList.toggle('active',active);b.setAttribute('aria-pressed',String(active));b.title=(adding?'Adicionar ':'Trocar por ')+b.dataset.name;b.querySelector('.graphic-card-action').replaceChildren(...icon(adding?'plus':'arrow').childNodes);}
}
function renderProperties(){
 renderGraphicPicker();const p=activePanel(state),l=selectedLayer(state);$('properties').hidden=!l;
 $('panel-width').value=p.cm.w;$('panel-height').value=p.cm.h;if(!l)return;
 $('properties-title').textContent=isGraphic(l)?'Ajustar grafismo':'Ajustar identidade';$('stack-note').textContent=isGraphic(l)?'A ordem muda somente entre grafismos. Escudos, logos e textos ficam sempre acima.':'Este elemento permanece acima dos grafismos.';for(const [id,delta]of [['layer-up',1],['layer-down',-1]])$(id).disabled=l.locked||!canShiftLayer(p,l.id,delta);
 for(const [id,value] of [['layer-name',l.name],['layer-text',l.text??''],['layer-font',l.font??FONTS[0].id],['layer-size',Math.round(l.w*100)],['layer-rotation',l.rotation],['layer-opacity',l.opacity*100],['layer-x',+(l.x*100).toFixed(1)],['layer-y',+(l.y*100).toFixed(1)]]){if(document.activeElement!==$(id))$(id).value=value;}
 setColorChip($('layer-color'),l.colorId||l.color);
 $('size-output').value=`${(l.w*p.cm.w).toFixed(1)} cm`;$('rotation-output').value=`${Math.round(l.rotation)}°`;$('opacity-output').value=`${Math.round(l.opacity*100)}%`;
 $('text-properties').hidden=l.type!=='text';$('layer-color-field').hidden=l.type==='image';$('pattern-mirror-field').hidden=l.type!=='pattern';$('layer-mirror').checked=l.mirrorX===true;$('layer-mirror').disabled=l.locked;
 const role=personalizationRole(l);$('rotation-field').hidden=l.type==='text';$('layer-text-field').hidden=!!role;$('proportion-note').hidden=l.type!=='text';$('personalization-note').hidden=!role;$('personalization-note').textContent=role?'Exibição fixa: '+l.text+'. Nomes e números reais vêm da lista do pedido.':'';
 $('lock').classList.toggle('active',l.locked);$('lock').lastElementChild.textContent=l.locked?'Fixado':'Fixar';
 for(const id of ['layer-size','layer-rotation','layer-x','layer-y','center-x'])$(id).disabled=l.locked||(id==='layer-rotation'&&l.type==='text');
 const q=quality(l,p);$('logo-quality').hidden=!q;if(q){$('logo-quality').textContent=q.message;$('logo-quality').className=`logo-quality ${q.level}`;}
}
function renderWarnings(){const w=warnings(state);$('warning-count').textContent=w.length?`${w.length} ${w.length===1?'aviso':'avisos'}`:'Sem avisos';$('warning-button').classList.toggle('warning',!!w.length);$('warning-button').firstElementChild.replaceChildren(...icon(w.length?'warning':'check').childNodes);$('warning-list').replaceChildren();if(!w.length)$('warning-list').append(node('p','warning-empty','Nenhum alerta de resolução ou de borda neste desenho. Medidas e costuras de produção ainda precisam de conferência.'));for(const item of w){const b=node('button',`warning-row ${item.level}`,item.message);b.onclick=()=>{state.active=item.panel;state.selected=item.layer;$('warning-list').hidden=true;render();};$('warning-list').append(b);}}
function setColorChip(button,value){const c=paletteColor(value);if(!c)return;button.value=c.id;button.style.backgroundColor=c.hex;button.title=c.name+' · '+c.hex.toUpperCase()+(c.approximate?' · Aproximação de tela':'');}
function paletteButton(c,full=false){const b=node('button',full?'palette-card':'');b.type='button';b.dataset.colorId=c.id;b.dataset.search=(c.name+' '+c.hex+' '+c.space).toLowerCase();b.title=c.name+' · '+c.hex.toUpperCase()+(c.approximate?' · Aproximação de tela':'');b.setAttribute('aria-label',c.name+(c.approximate?' · aproximação':'')+' · '+c.hex);if(full){const sample=node('span','palette-sample');sample.style.backgroundColor=c.hex;b.append(sample,node('strong',null,c.name),node('small',null,c.space+(c.approximate?' · referência de tela':'')));}else b.style.backgroundColor=c.hex;return b;}
function chooseColor(c){if(typeof paletteTarget==='function'){paletteTarget(c);$('palette-dialog').close();return;}if(paletteTarget==='base')applyColor(activePanel(state),c.id);if(paletteTarget==='layer'){const l=selectedLayer(state);if(l)applyColor(l,c.id);}if(paletteTarget==='trim'){state.trim=c.hex;state.trimColorId=c.id;for(const p of state.panels)if(p.trim)applyColor(p,c.id);}commit();$('palette-dialog').close();}
function openPalette(target){paletteTarget=target;$('palette-search').value='';$('palette-colors').querySelectorAll('button').forEach(b=>b.hidden=false);$('palette-dialog').showModal();$('palette-search').focus();}
function setupLibrary(){
 for(const c of COLORS){const b=paletteButton(c);b.onclick=()=>{applyColor(activePanel(state),c.id);commit();};$('base-palette').append(b);const card=paletteButton(c,true);card.onclick=()=>chooseColor(c);$('palette-colors').append(card);}
 for(const [input,container]of [['base-color-search','base-palette'],['palette-search','palette-colors']])$(input).oninput=e=>{const q=e.target.value.trim().toLowerCase();$(container).querySelectorAll('button').forEach(b=>b.hidden=!b.dataset.search.includes(q));};
 $('close-palette').onclick=()=>$('palette-dialog').close();
 for(const g of GRAPHICS){const b=node('button','pattern-card'),canvas=node('canvas');b.dataset.group=g.group;b.dataset.graphic=g.id;b.dataset.name=g.name;canvas.width=240;canvas.height=210;paint(canvas,{color:DEFAULT_BASE.hex,layers:[layer('pattern',{pattern:g.id,color:DEFAULT_ACCENT.hex,colorId:DEFAULT_ACCENT.id,w:g.id==='straight-line'?.06:1.2,h:g.id==='horizontal-line'?.06:1.2})]});const caption=node('span',null,g.name),action=icon('arrow');action.classList.add('graphic-card-action');caption.append(action);b.append(canvas,caption);b.onclick=()=>{try{const target=graphicTarget(state,graphicTargets.get(state.active)),result=applyGraphic(state,g.id,{createNew:newGraphicPanel===state.active,...(target?{targetId:target.id}:{})});newGraphicPanel=null;graphicTargets.set(state.active,result.layer.id);if(commit())toast(result.created?'Grafismo adicionado. Escolher outro desenho agora troca esta camada.':'Grafismo trocado. Cor e ajustes foram mantidos.');}catch(error){toast(error.message);}};$('pattern-library').append(b);}
 $('graphic-group').onchange=filterGraphicLibrary;filterGraphicLibrary();
 $('graphic-target').onchange=e=>{newGraphicPanel=null;state.selected=e.target.value;graphicTargets.set(state.active,e.target.value);render();};
 $('graphic-new').onclick=()=>{state.selected=null;newGraphicPanel=state.active;render();};$('graphic-cancel-new').onclick=()=>{newGraphicPanel=null;state.selected=graphicTarget(state,graphicTargets.get(state.active))?.id??null;render();};
 for(const target of ['new-font','layer-font'])$(target).replaceChildren(...FONTS.map(f=>{const o=node('option',null,f.label);o.value=f.id;return o;}));
 const fontPreview=()=>{$('font-preview').style.fontFamily=FONTS.find(f=>f.id===$('new-font').value)?.family;};$('new-font').onchange=fontPreview;fontPreview();
 document.querySelectorAll('[data-tool]').forEach(b=>b.onclick=()=>setTool(b.dataset.tool));
 $('add-text-form').onsubmit=e=>{e.preventDefault();const text=$('new-text').value.trim();if(text)addLayer(textLayer(text,$('new-font').value));};
 document.querySelectorAll('[data-text]').forEach(b=>b.onclick=()=>addLayer(textLayer(b.dataset.text,FONTS[0].id,b.dataset.personalization)));
 $('add-badge').onclick=()=>addLayer(layer('badge',{name:'Escudo de exemplo',w:.2,h:.2}));
 $('logo-upload').onchange=async e=>{if(e.target.files[0])await uploadLogo(e.target.files[0]);e.target.value='';};
 for(const name of ['dragenter','dragover'])$('logo-drop').addEventListener(name,e=>{e.preventDefault();$('logo-drop').classList.add('drag-over');});
 for(const name of ['dragleave','drop'])$('logo-drop').addEventListener(name,e=>{e.preventDefault();$('logo-drop').classList.remove('drag-over');if(name==='drop'&&e.dataTransfer.files[0])uploadLogo(e.dataTransfer.files[0]);});
 $('site-menu-button').onclick=()=>{const open=$('site-nav').dataset.open!=='true';$('site-nav').dataset.open=String(open);$('site-menu-button').setAttribute('aria-expanded',String(open));};
 document.addEventListener('keydown',e=>{if(e.key==='Escape'){$('site-nav').dataset.open='false';$('site-menu-button').setAttribute('aria-expanded','false');}});
}

async function uploadLogo(file){
 if(busy)return;busy=true;const panelId=state.active;
 try{
  if(file.size>5*1024*1024)throw Error('Envie uma logo de até 5 MB.');
  let src,pixels,vector=false;
  if(/\.svg$/i.test(file.name)||file.type==='image/svg+xml'){
   const result=sanitizeSVG(await file.text());src=`data:image/svg+xml;charset=utf-8,${encodeURIComponent(result.source)}`;pixels={w:result.w,h:result.h};vector=true;
  }else{
   if(!/\.png$/i.test(file.name)&&file.type!=='image/png')throw Error('Envie uma logo PNG ou SVG.');
   const bytes=new Uint8Array(await file.arrayBuffer());if(bytes.length<24||[137,80,78,71,13,10,26,10].some((v,i)=>bytes[i]!==v))throw Error('O arquivo não é um PNG válido.');
   const dv=new DataView(bytes.buffer);pixels={w:dv.getUint32(16),h:dv.getUint32(20)};
   if(!pixels.w||!pixels.h||pixels.w>10000||pixels.h>10000||pixels.w*pixels.h>24_000_000)throw Error('Use uma logo PNG com até 24 megapixels e 10 mil pixels por lado.');
   src=await new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(r.result);r.onerror=()=>reject(Error('Falha ao ler a logo.'));r.readAsDataURL(file);});
  }
  await imageFor(src);const p=state.panels.find(p=>p.id===panelId);if(!p)throw Error('O painel foi alterado. Envie a logo novamente.');
  const w=.3,h=clamp(w*(pixels.h/pixels.w)*(p.cm.w/p.cm.h),.025,.7);const l=layer('image',{name:file.name.slice(0,80),src,pixels,vector,w,h});p.layers.push(l);state.active=p.id;state.selected=l.id;if(!commit())return;toast(vector?'Logo vetorial adicionada.':'Logo adicionada. Confira a resolução no painel de ajustes.');
 }catch(e){toast(e.message);}finally{busy=false;}
}
function setupControls(){
 $('active-panel').onchange=e=>{selectPanel(e.target.value);if(!flat&&!scene?.custom)changeView(activePanel(state).view??'front',{select:false});};
 $('symmetry-disable').onclick=()=>{const pair=sidePairs(state).find(pair=>pair.panels.includes(state.active)&&state.symmetry?.[pair.id]);if(!pair)return;state=disableLiveSymmetry(state,pair.id);if(commit()){$('active-panel').focus();toast('Simetria desligada: '+pair.label+'. Os desenhos foram mantidos. Agora você pode editar cada lado separadamente.');}};
 $('product').onchange=e=>{state.product=e.target.value;if(!visiblePanels(state).some(p=>p.id===state.active))state.active=visiblePanels(state)[0].id;state.selected=null;commit();};
 $('base-color').onclick=()=>openPalette('base');
 $('apply-all').onclick=()=>{const c=activePanel(state).colorId;for(const p of state.panels)applyColor(p,c);state.trim=paletteColor(c).hex;state.trimColorId=c;commit();};
 $('trim-color').onclick=()=>openPalette('trim');
 $('project-title').oninput=e=>{state.title=e.target.value.slice(0,80);cloudDirty=true;scheduleSave();};$('project-title').onchange=commit;
 $('undo').onclick=()=>{state=history.undo();cloudDirty=true;scheduleSave();render();};$('redo').onclick=()=>{state=history.redo();cloudDirty=true;scheduleSave();render();};
 $('view-2d').onclick=()=>setFlat(true);$('view-3d').onclick=()=>{if(scene)setFlat(false);else toast('O 3D não está disponível neste navegador. Continue no painel 2D.');};$('fallback-2d').onclick=()=>{$('webgl-error').hidden=true;setFlat(true);};
 document.querySelectorAll('[data-view]').forEach(b=>b.onclick=()=>changeView(b.dataset.view));
 $('mode-edit').onclick=()=>setMode('edit');$('mode-orbit').onclick=()=>setMode('orbit');
 $('zoom-in').onclick=()=>scene?.zoom(.88);$('zoom-out').onclick=()=>scene?.zoom(1.12);$('view-reset').onclick=()=>changeView('front');
 $('warning-button').onclick=()=>$('warning-list').hidden=!$('warning-list').hidden;
 const range=(id,fn)=>{$(id).oninput=e=>{gesture=true;modify(l=>fn(l,Number(e.target.value)),{finish:false});};$(id).onchange=()=>{gesture=false;commit();};};
 range('layer-size',(l,v)=>{if(!l.locked)resize(l,v/100);});range('layer-rotation',(l,v)=>{if(!l.locked&&l.type!=='text')l.rotation=clamp(v,-180,180);});range('layer-opacity',(l,v)=>l.opacity=clamp(v/100,.1,1));
 $('layer-name').onchange=e=>modify(l=>l.name=e.target.value.trim().slice(0,80)||'Elemento');
 $('layer-text').oninput=e=>modify(l=>{if(!personalizationRole(l))l.text=e.target.value.slice(0,80);normalizeText(l);},{finish:false});$('layer-text').onchange=commit;
 $('layer-font').onchange=e=>modify(l=>l.font=FONTS.some(f=>f.id===e.target.value)?e.target.value:FONTS[0].id);
 $('layer-color').onclick=()=>openPalette('layer');
 $('layer-mirror').onchange=e=>modify(l=>{if(l.type==='pattern'&&!l.locked)l.mirrorX=e.target.checked;});
 for(const [id,key] of [['layer-x','x'],['layer-y','y']]){$(id).oninput=e=>modify(l=>{if(!l.locked)l[key]=clamp(Number(e.target.value)/100,0,1);},{finish:false});$(id).onchange=()=>commit();}
 for(const [id,key] of [['panel-width','w'],['panel-height','h']])$(id).onchange=e=>{activePanel(state).cm[key]=clamp(Number(e.target.value),1,300);commit();};
 $('center-x').onclick=()=>modify(l=>{if(!l.locked)l.x=.5;});$('lock').onclick=()=>modify(l=>l.locked=!l.locked);
 $('duplicate').onclick=()=>{const l=selectedLayer(state);if(l){const copy={...clone(l),id:uid(),name:`${l.name} · cópia`.slice(0,80),x:clamp(l.x+.04,0,1),y:clamp(l.y+.04,0,1),locked:false};delete copy.copyKey;addLayer(copy);}};
 $('delete').onclick=deleteSelected;
 for(const [id,delta] of [['layer-up',1],['layer-down',-1]])$(id).onclick=()=>{if(!selectedLayer(state)?.locked&&shiftLayer(activePanel(state),state.selected,delta))commit();};
 $('demo-reset').onclick=()=>{if(busy||cloudSaving)return;const dialog=document.createElement('dialog');const wrap=node('div','dialog-scroll');wrap.append(node('h2',null,'Começar um novo uniforme?'),node('p','muted','A criação aberta será substituída. Os uniformes salvos na sua conta continuam em Meus uniformes.'));const actions=node('div','dialog-actions'),cancel=node('button','button subtle','Continuar editando'),ok=node('button','button dark','Criar novo uniforme');cancel.onclick=()=>{dialog.close();dialog.remove();};ok.onclick=async()=>{busy=true;ok.disabled=true;try{const loaded=await fetchEliteModel(!!scene?.software);const panels=scene?await scene.loadGLB(loaded.buffer,{preset:ELITE_MODEL}):loaded.manifest.panels;state=eliteState(panels);designId=null;serverVersion=null;cloudDirty=true;history=new History(state);scheduleSave();render();changeView('front');dialog.close();dialog.remove();toast('Novo uniforme pronto para criar.');}catch(e){toast(e.message);}finally{busy=false;ok.disabled=false;}};actions.append(cancel,ok);wrap.append(actions);dialog.append(wrap);document.body.append(dialog);dialog.showModal();};
 document.addEventListener('keydown',e=>{if(/INPUT|TEXTAREA|SELECT/.test(e.target.tagName)||document.querySelector('dialog[open]'))return;if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='z'){e.preventDefault();(e.shiftKey?$('redo'):$('undo')).click();}if(e.key==='Delete'||e.key==='Backspace'){e.preventDefault();deleteSelected();}if(e.key==='Escape'){state.selected=null;$('warning-list').hidden=true;render();}if(e.key.startsWith('Arrow')){const l=selectedLayer(state);if(!l||l.locked)return;e.preventDefault();const d=e.shiftKey?.025:.005;move(l,l.x+(e.key==='ArrowRight'?d:e.key==='ArrowLeft'?-d:0),l.y+(e.key==='ArrowDown'?d:e.key==='ArrowUp'?-d:0));commit();}});
 const fc=$('flat-canvas');function point(e){const r=fc.getBoundingClientRect();return {x:(e.clientX-r.left)/r.width,y:(e.clientY-r.top)/r.height};}
 fc.onpointerdown=e=>{const p=point(e),l=pickLayer(state.active,p);if(!l||l.locked)return;gesture=true;dragFlat={id:e.pointerId,dx:p.x-l.x,dy:p.y-l.y};fc.setPointerCapture(e.pointerId);};fc.onpointermove=e=>{if(!dragFlat||e.pointerId!==dragFlat.id)return;const p=point(e);modify(l=>move(l,p.x-dragFlat.dx,p.y-dragFlat.dy),{finish:false});};const finish=e=>{if(!dragFlat||e.pointerId!==dragFlat.id)return;dragFlat=null;gesture=false;if(fc.hasPointerCapture(e.pointerId))fc.releasePointerCapture(e.pointerId);commit();};fc.onpointerup=finish;fc.onpointercancel=finish;
}
function deleteSelected(){const p=activePanel(state),i=p.layers.findIndex(l=>l.id===state.selected);if(i>=0){p.layers.splice(i,1);state.selected=null;commit();}}
function changeView(view,{select=true}={}){if(!scene)return;if(select&&!scene.custom){const panel=state.product==='shorts'?'short-panel-5':{front:'front',back:'back',right:'sleeve-right',left:'sleeve-left'}[view];if(view!=='angle'&&panel&&visiblePanels(state).some(p=>p.id===panel)&&state.active!==panel){state.active=panel;state.selected=null;render();}}scene.view(view);document.querySelectorAll('[data-view]').forEach(b=>b.classList.toggle('active',b.dataset.view===view));}
function setMode(mode){scene?.setMode(mode);for(const id of ['edit','orbit']){$(`mode-${id}`).classList.toggle('active',mode===id);$(`mode-${id}`).setAttribute('aria-pressed',String(mode===id));}$('interaction-hint').textContent=mode==='edit'?'Arraste a arte para mover · arraste o fundo para girar':'Arraste o uniforme para girar';}

async function api(path,options={}){const response=await fetch(path,{credentials:'same-origin',...options,headers:{...(options.body&&!(options.body instanceof FormData)?{'Content-Type':'application/json'}:{}),...options.headers}});let data;try{data=await response.json();}catch{throw Error('O servidor retornou uma resposta inválida. Tente novamente.');}if(!response.ok){const error=Error(data.error||'Não foi possível concluir.');error.status=response.status;throw error;}return data;}
async function needLogin(){await saveNow();sessionStorage.setItem('mnz-simulator-login-draft',String(Date.now()));window.top.location.href='/signin-with-chatgpt?return_to=%2Fsimulador';}
async function captureCreation(){
 if(!scene)throw Error('A prévia 3D precisa estar disponível para conferir o uniforme.');
 const captured=clone(state),capturedRevision=revision,position=scene.camera.position.clone(),target=scene.controls.target.clone(),images=[];
 scene.update({...captured,active:''});
 try{for(const [id,label]of [['front','Frente'],['back','Costas'],['right','Direita'],['left','Esquerda']]){scene.view(id);images.push({label,src:scene.capture()});}}finally{scene.update(state);scene.camera.position.copy(position);scene.controls.target.copy(target);scene.controls.update();scene.dirty=true;}
 const decoded=await Promise.all(images.map(v=>new Promise((resolve,reject)=>{const image=new Image();image.onload=()=>resolve(image);image.onerror=()=>reject(Error('Falha ao preparar a prévia.'));image.src=v.src;})));
 const height=620,gap=18,widths=decoded.map(im=>im.width/im.height*height),total=widths.reduce((s,w)=>s+w,0)+gap*3,scale=Math.min(1,1600/total),canvas=document.createElement('canvas');canvas.width=Math.ceil(total*scale);canvas.height=Math.ceil(height*scale);const ctx=canvas.getContext('2d');let x=0;for(let i=0;i<decoded.length;i++){ctx.drawImage(decoded[i],x*scale,0,widths[i]*scale,height*scale);x+=widths[i]+gap;}
 return {state:captured,preview:canvas.toDataURL('image/png'),images,revision:capturedRevision};
}
async function saveCloud(snapshot=null){
 if(!session){await needLogin();throw Error('Entre na sua conta para salvar.');}if(cloudSaving)return cloudSaving;if(!cloudDirty&&designId)return {id:designId,version:serverVersion};
 cloudSaving=(async()=>{const capturedRevision=revision,capturedId=designId,frame=snapshot??await captureCreation();$('save-design').disabled=true;$('save-status').textContent='Salvando na sua conta…';const body={state:frame.state,preview:frame.preview,...(capturedId?{version:serverVersion}:{})};const {design}=await api('/api/simulator/designs'+(capturedId?'/'+encodeURIComponent(capturedId):''),{method:capturedId?'PUT':'POST',body:JSON.stringify(body)});if(designId!==capturedId)throw Error('A criação aberta mudou durante o salvamento.');designId=design.id;serverVersion=design.version;cloudDirty=revision!==capturedRevision;if(!cloudDirty){state=design.state;render();}$('save-status').textContent=cloudDirty?'Há novas alterações neste navegador':'Uniforme salvo na sua conta';await saveNow();return design;})();
 try{return await cloudSaving;}finally{cloudSaving=null;$('save-design').disabled=false;}
}
async function openCloudDesign(id){if(cloudSaving||busy)return;if(cloudDirty&&revision>0)await saveCloud();const {design}=await api('/api/simulator/designs/'+encodeURIComponent(id));state=design.state;designId=design.id;serverVersion=design.version;cloudDirty=false;history=new History(state);revision++;render();changeView(activePanel(state).view??'front',{select:false});$('designs-dialog').close();scheduleSave();toast('Uniforme aberto.');}
function setupCloud(){
 $('save-design').onclick=async()=>{try{await saveCloud();toast('Uniforme salvo na sua conta.');}catch(e){toast(e.message);}};
 $('close-designs').onclick=()=>$('designs-dialog').close();
 $('open-designs').onclick=async()=>{if(!session){await needLogin();return;}try{const {designs}=await api('/api/simulator/designs');$('design-list').replaceChildren();if(!designs.length)$('design-list').append(node('p','muted','Seus uniformes salvos aparecerão aqui.'));for(const d of designs){const card=node('button','design-card');card.dataset.search=d.title.toLowerCase();const image=node('img');image.src=d.thumbnailUrl;image.alt='';image.loading='lazy';const detail=node('span');detail.append(node('strong',null,d.title),node('small',null,'KIT ELITE 27 · versão '+d.version));card.append(image,detail,icon('arrow'));card.onclick=()=>openCloudDesign(d.id).catch(e=>toast(e.message));$('design-list').append(card);}$('design-search').value='';$('designs-dialog').showModal();}catch(e){toast(e.message);}};
 $('design-search').oninput=e=>$('design-list').querySelectorAll('button').forEach(b=>b.hidden=!b.dataset.search.includes(e.target.value.trim().toLowerCase()));
}
function setupReview(){
 const dialog=$('review-dialog');const close=()=>{if(!busy)dialog.close();};$('close-review').onclick=close;$('back-editor').onclick=close;$('finish-test').onclick=close;dialog.addEventListener('cancel',e=>{if(busy)e.preventDefault();});
 $('review').onclick=async()=>{if(busy||cloudSaving)return;$('review').disabled=true;try{
  reviewSnapshot=await captureCreation();reviewOrderId=null;$('review-stage').hidden=false;$('order-stage').hidden=true;$('order-result').hidden=true;$('review-check').checked=false;$('to-order').disabled=true;$('to-presentation').disabled=true;$('dialog-title').textContent='Veja seu uniforme por inteiro.';$('review-images').replaceChildren();
  for(const view of reviewSnapshot.images){const figure=node('figure'),image=node('img');image.src=view.src;image.alt='Uniforme · '+view.label;figure.append(image,node('figcaption',null,view.label));$('review-images').append(figure);}
  const panels=visiblePanels(state);$('review-details').replaceChildren(node('strong',null,state.title||'Meu uniforme'),node('span',null,$('piece-summary').textContent),node('span',null,panels.reduce((n,p)=>n+p.layers.length,0)+' elementos · '+panels.length+' painéis'));$('review-warnings').replaceChildren(...warnings(state).map(a=>node('p','warning-row '+a.level,a.message)));dialog.showModal();
 }catch(e){toast(e.message);}finally{$('review').disabled=false;}};
 $('review-check').onchange=e=>{for(const id of ['to-order','to-presentation'])$(id).disabled=!e.target.checked;};
 async function createPresentation(event){
  if(busy||!reviewSnapshot||!$('review-check').checked)return;
  if(revision!==reviewSnapshot.revision){toast('O desenho mudou. Volte ao editor e confira novamente antes de criar a apresentação.');return;}
  busy=true;const button=event.currentTarget,previous=button.textContent;button.textContent='Preparando apresentação…';for(const id of ['to-order','to-presentation','order-presentation'])$(id).disabled=true;
  try{
   const saved=await saveCloud(reviewSnapshot),map=await presentationMap(reviewSnapshot.state);
   if(revision!==reviewSnapshot.revision||cloudDirty)throw Error('Há alterações novas no uniforme. Confira o desenho novamente.');
   const form=new FormData();form.set('metadata',JSON.stringify({version:saved.version}));form.set('map',map,map.name);
   const {project}=await api('/api/simulator/designs/'+encodeURIComponent(saved.id)+'/presentation',{method:'POST',body:form});
   await saveNow();window.top.location.href='/studio/'+encodeURIComponent(project.id)+(reviewOrderId?'?order='+encodeURIComponent(reviewOrderId):'');
  }catch(e){toast(e.message);}finally{busy=false;button.textContent=previous;for(const id of ['to-order','to-presentation'])$(id).disabled=!$('review-check').checked;$('order-presentation').disabled=false;}
 }
 $('to-presentation').onclick=createPresentation;$('order-presentation').onclick=createPresentation;
 $('to-order').onclick=()=>{if(!$('review-check').checked)return;$('review-stage').hidden=true;$('order-stage').hidden=false;$('dialog-title').textContent='Seu desenho já inicia um pedido.';$('quantity-label').textContent=state.product==='kit'?'kits':'peças';$('customer').focus();};
 $('back-review').onclick=()=>{$('review-stage').hidden=false;$('order-stage').hidden=true;$('dialog-title').textContent='Veja seu uniforme por inteiro.';};
 $('order-form').onsubmit=async e=>{e.preventDefault();if(busy)return;busy=true;const submit=e.target.querySelector('[type=submit]');submit.disabled=true;try{const saved=await saveCloud(reviewSnapshot);const {order}=await api('/api/simulator/designs/'+encodeURIComponent(saved.id)+'/order',{method:'POST',body:JSON.stringify({version:saved.version,customer:$('customer').value,quantity:Number($('quantity').value),notes:$('order-notes').value})});reviewOrderId=order.id;$('order-stage').hidden=true;$('order-result').hidden=false;$('dialog-title').textContent='Pedido criado como rascunho.';$('order-result-details').replaceChildren(node('strong',null,order.number||order.title),node('div',null,'Cliente: '+order.client),node('div',null,'Quantidade: '+$('quantity').value+' '+(state.product==='kit'?'kits':'peças')),node('div',null,'Uniforme editável e imagem de quatro lados vinculados.'),node('div',null,'Complete a lista e os dados técnicos antes de liberar para produção.'));$('continue-order').href='/pedidos?order='+encodeURIComponent(order.id);}catch(e){toast(e.message);}finally{busy=false;submit.disabled=false;}};
}
async function boot(){
 document.querySelector('main').inert=true;$('review').disabled=true;let restored=false;
 setupLibrary();setupControls();setupReview();setupCloud();
 setupSideCopy({getState:()=>state,getRevision:()=>revision,openPalette,toast,onApply:next=>{state=next;commit();changeView(activePanel(state).view??'front',{select:false});}});
 try{session=await api('/api/simulator/session');STORAGE_KEY='current:'+session.userId;$('admin-models').hidden=session.isAdmin!==true;}catch{session=null;STORAGE_KEY='anonymous';$('save-design').lastChild.textContent='Entrar para salvar';}
 try{db=await openDB();const stored=await readProject();if(stored?.state?.schema===1&&stored.state.model===ELITE_MODEL&&stored.state.panels?.length===19){state=stored.state;designId=stored.cloud?.id??null;serverVersion=stored.cloud?.version??null;cloudDirty=stored.cloud?.dirty!==false;history=new History(state);restored=true;}
  const handoff=Number(sessionStorage.getItem('mnz-simulator-login-draft'));if(session&&handoff&&Date.now()-handoff<30*60*1000){const request=db.transaction('projects').objectStore('projects').get('anonymous');const guest=await new Promise(resolve=>{request.onsuccess=()=>resolve(request.result);request.onerror=()=>resolve(null);});if(guest?.state?.model===ELITE_MODEL){state=guest.state;designId=null;serverVersion=null;cloudDirty=true;history=new History(state);restored=true;}sessionStorage.removeItem('mnz-simulator-login-draft');}
 }catch{$('save-status').textContent='Somente nesta sessão';}
 try{scene=new UniformScene($('viewer'),{deferModel:true,select:selectPanel,selection:pickLayer,dragStart:()=>{gesture=true;},dragMove:(x,y)=>modify(l=>move(l,x,y),{finish:false}),dragEnd:()=>{gesture=false;commit();}});if(scene.software)$('interaction-hint').textContent='3D compatível · arraste para editar ou girar';}catch{scene=null;$('webgl-error').hidden=false;setFlat(true);}
 const loaded=await fetchEliteModel(!!scene?.software);const panels=scene?await scene.loadGLB(loaded.buffer,{preset:ELITE_MODEL}):loaded.manifest.panels;if(!restored){state=eliteState(panels);history=new History(state);}
 const query=new URLSearchParams(location.search);if(session&&query.get('design')){const {design}=await api('/api/simulator/designs/'+encodeURIComponent(query.get('design')));state=design.state;designId=design.id;serverVersion=design.version;cloudDirty=false;history=new History(state);}else if(session&&query.get('order')){const source=await api('/api/simulator/from-order/'+encodeURIComponent(query.get('order')));state=source.state;designId=null;serverVersion=null;cloudDirty=true;history=new History(state);toast('Desenho do pedido aberto como nova criação. O pedido original é preservado.');}
 try{await Promise.all(state.panels.flatMap(p=>p.layers).filter(l=>l.type==='image').map(l=>imageFor(l.src)));}catch{toast('Uma logo salva não pôde ser carregada. Envie o arquivo novamente.');}
 await Promise.all(FONTS.map(f=>document.fonts.load('18px '+f.family)));
 render();if(scene)changeView(activePanel(state).view??'front',{select:false});$('loading').hidden=true;document.querySelector('main').inert=false;$('review').disabled=false;$('save-status').textContent=db?'Salvo neste navegador':'Somente nesta sessão';
 const tutorial=setupTutorial({setTool,key:STORAGE_KEY,notify:toast,canOffer:()=>!busy&&!cloudSaving&&!gesture});requestAnimationFrame(()=>tutorial.offer());
 document.addEventListener('visibilitychange',()=>{if(document.hidden)saveNow();});window.addEventListener('pagehide',saveNow);
}
boot().catch(e=>{$('loading').hidden=true;document.querySelector('main').inert=false;toast('Não foi possível iniciar: '+e.message);});
