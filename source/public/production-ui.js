import {setupOrderPricing} from './order-pricing-ui.js';
import {orderFileStem} from './order-pricing.js';
import {usePresentationKit} from './order-presentation.js';
import {pieceFamilies,pieceFamilyKey,applicationGroups,syncFamilyCharacteristics,syncApplicationArrows,syncConfirmedApplicationPositions} from './order-linked-applications.js?v=3';
import {ORDER_PRODUCTS,KIT_PRESETS,createOrderProduct,prepareOrderProduct} from './order-composition.js';
import {createOrderVisualTools} from './order-visual-tools.js?v=15';
import {createProductionPackage,loadDeliveryLibraries} from './order-delivery.js?v=6';
import {createWorkflowGuide,workflowChoose,canonicalWorkflowPath} from './workflow-guide.js?v=3';
import {workflowRoute} from './workflow-contract.js?v=2';
import {TECHNIQUES,PRODUCTS as LEGACY_PRODUCTS,FABRICS,newId,newOrder as legacyNewOrder,newPage as legacyNewPage,newProduct as legacyNewProduct,newKitPage as legacyNewKitPage,kitTitle,demoOrder,parseGrade,validateOrder,releaseProblems,compareOrders,applyListToOrder} from './production-core.js?v=15';
import {buildSheets,sheetSVG,createPDF,PAPER,sheetLabel} from './production-sheet.js?v=22';
import {loadExcelLibrary,readOrderWorkbook} from './order-files.js?v=5';
import {prepareListSheets,prepareListText,parseListMatrix,needsListMapping,listProblems,listSummary} from './order-list.js?v=7';
import {CATALOG_VERSION,catalogOrder,attachCatalog,productCodeFor,productionSummary,fitOfSize,fitLabel,productDisplayName,applyFactoryDefaults} from './product-catalog.js?v=7';
import {catalogTypeField,catalogModelFields,catalogFabricFields,catalogFinishFields,catalogSpecialFields,setupCatalogEditor} from './product-catalog-ui.js?v=7';
const PRODUCTS=ORDER_PRODUCTS;
const newOrder=()=>catalogOrder({...legacyNewOrder(),compositionKind:''});
const newPage=(type='Camiseta')=>{const page=legacyNewPage(type);for(const p of page.products)prepareOrderProduct(p,page.id);return page;};
const newProduct=(type='Camiseta')=>createOrderProduct(type);
const newKitPage=(types=['Camiseta','Calção'])=>{const page=legacyNewKitPage(types);for(const p of page.products){prepareOrderProduct(p,page.id);p.kitGroupId=page.id;}return page;};
const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const params=new URLSearchParams(location.search);
let orderGeneration=0,viewingRelease=false;
let technicalBusy=false,complementPending=null;
let savedOrders=[],orderDeletion=null;
let orderReset=null,pageRemoval=null,bootReady=false,draftWriteQueue=Promise.resolve();
let orderPickerPage=0;
let displayedOrderThumbnail=null;
const ORDER_PICKER_SIZE=12;
const ORDER_STATE_LABELS={draft:'Em preparação',checked:'Conferido · não enviado',sent:'Enviado · aguardando aceite',accepted:'Aceito pela fábrica',returned:'Devolvido para correção'};
let doc=newOrder(),pageIndex=0,productIndex=0,sheetIndex=0,sheets=[],assets={},id=null,version=0,profile=null,projects=[],dirty=false,example=params.get('exemplo')==='1',conflict=false,savePromise=null,autoTimer,draftTimer,toastTimer,pendingAnchor=null,draftKey='demo',pdfURL,revision=0;
const page=()=>doc.pages[pageIndex],product=()=>page().products[productIndex];
const ORDER_STAGES=[
 {id:'identity',title:'Cliente',description:'Identifique o pedido, o cliente e o contato.',next:'Continuar para informações gerais →'},
 {id:'general',title:'Informações gerais',description:'Defina a composição, os responsáveis, as datas e o transporte.',next:'Continuar para pedido e observações →'},
 {id:'information',title:'Informações sobre o pedido e observações',description:'Registre as técnicas e orientações gerais.',next:'Continuar para a 1ª peça →'},
 {id:'pieces',title:'1ª peça',description:'Defina modelo, tecido, acabamento e desenho da primeira peça.'},
 {id:'piece2',title:'2ª peça',description:'Defina modelo, tecido, acabamento e desenho da segunda peça.'},
 {id:'personalization',title:'Aplicações e setas',description:'Escolha a peça, adicione TPU ou outras aplicações e posicione as setas no layout.',next:'Continuar para a lista →'},
 {id:'list',title:'Lista do pedido',description:'A lista preenche automaticamente as quantidades e tamanhos na frente do layout.',next:'Continuar para CDR do desenho →'},
 {id:'files',title:'CDR do desenho',description:'Anexe o arquivo original do CorelDRAW para produzir este pedido.',next:'Continuar para a conferência final →'},
 {id:'review',title:'Conferência geral',description:'Revise o pedido completo e as listas antes de conferir e enviar.'}
];
function flowStages(){return ORDER_STAGES.filter(s=>s.id!=='piece2'||pieceFamilies(page()).length>1);}
function pieceStage(){return ['pieces','piece2'].includes(orderStage);}
function nextPieceFlow(){const families=pieceFamilies(page()),at=families.findIndex(f=>f.includes(product()));if(at<families.length-1){productIndex=page().products.indexOf(families[at+1][0]);productStage='model';orderStage='piece2';render();showOrderStage('piece2',{focus:false,select:false});}else showOrderStage('personalization');}
const PRODUCT_STAGES=[{id:'model',title:'Modelo',description:'Identifique a peça e o modelo ou molde utilizado.'},{id:'fabric',title:'Tecido e estampa',description:'Defina o tecido, as cores e a técnica de estampa desta peça.'},{id:'art',title:'Desenho e acabamentos',description:'Use uma imagem do computador ou uma apresentação salva. Ajuste o layout quando precisar.'}];
let orderStage='identity',productStage='model',previewOpen=false,finalInvite=null,packageInvitePending=false;
const imageSources=new Map();
function initialCompositionState(){
 const first=doc.pages[0],seen=new Set(),logical=first.products.filter(p=>{const key=p.technical?p.technical.productCode+'|'+p.technical.designId:p.id;if(seen.has(key))return false;seen.add(key);return true;}),types=logical.map(p=>p.type),kind=doc.compositionKind===''?'unselected':doc.compositionKind||(types.length===1?'single':types.length===2&&first.mode==='conjunto'?'kit':types.length===2&&first.mode==='avulsas'?'pair':'other');
 const empty=first.products.length===logical.length&&first.products.every(p=>!p.technical?.fit)&&doc.pages.length===1&&!doc.listSource&&!first.visual&&!first.annotations?.length&&first.products.every(p=>!p.quantity&&!p.images.some(Boolean)&&!p.components.length&&!p.names.length&&!p.extraApplications?.length&&!p.projectRef&&!p.listKey&&(!p.print||p.print==='TRANSFER')&&['model','fabricColor','detailColor','grade','namesRaw','notes'].every(key=>!p[key])&&(!p.fabric||p.technical?.productCode==='CAL-001'&&p.technical.fabricId==='DRY_CALCAO'&&!p.technical.fit));
 return {kind,types,editable:kind!=='other'&&empty&&orderEditable()};
}
function renderInitialComposition(){
 const state=initialCompositionState(),two=['kit','pair'].includes(state.kind);$$('[data-initial-kind]').forEach(input=>{input.checked=input.dataset.initialKind===state.kind;input.disabled=!state.editable;input.closest('label').classList.toggle('selected',input.checked);});
 $('#initialOrderDetails').hidden=false;$('#initialProductTypes').hidden=state.kind==='unselected';$('#initialKitPresetField').hidden=state.kind!=='kit';
 $('#initialFirstTypeLabel').textContent=two?'1ª peça':'Tipo da peça';$('#initialSecondTypeLabel').textContent=state.kind==='pair'?'2ª peça independente':'2ª peça do kit';$('#initialSecondTypeField').hidden=!two;
 for(const [i,selector]of ['#initialFirstType','#initialSecondType'].entries()){const input=$(selector);if(document.activeElement!==input&&(i===0||two)){const value=state.types[i]||'';if(value&&input.options&&![...input.options].some(o=>o.value===value))input.add(new Option(value+' · cadastro antigo',value));input.value=value;}input.disabled=!state.editable;}
 const preset=KIT_PRESETS.find(p=>p.types.every((type,i)=>type===state.types[i]));$('#initialKitPreset').value=preset?.id||'';$('#initialKitPreset').disabled=!state.editable;
 $('#initialCompositionHelp').textContent=state.kind==='unselected'?'Escolha como começar. Você poderá adicionar outras peças depois.':state.editable?(state.kind==='pair'?'Duas peças independentes: quantidades, modelos e personalizações próprios, sem vínculo de kit.':'Cada peça pode incluir modelagens masculina, Baby Look e infantil no mesmo pedido.'):'Peças já configuradas. Altere os itens na etapa Peças e kits.';
}
function chooseInitialComposition(kind){
 const state=initialCompositionState();if(!state.editable||!['single','kit','pair'].includes(kind))return renderInitialComposition();if(state.kind===kind)return;
 const current=doc.pages[0],first=current.products[0],automaticTitle=!current.title||current.title===kitTitle(state.types);
 current.products=kind==='single'?[first]:[first,newProduct($('#initialSecondType').value.trim()||'Calção')];current.mode=kind==='kit'?'conjunto':kind==='pair'?'avulsas':'individual';doc.compositionKind=kind;
 for(const p of current.products){if(p.technical)p.technical.designId=p.id;if(kind==='kit')p.kitGroupId=current.id;else delete p.kitGroupId;}if(automaticTitle)current.title=kind==='kit'?kitTitle(current.products.map(p=>p.type)):'';
 pageIndex=productIndex=sheetIndex=0;productStage='model';changed();render();
}
$$('[data-initial-kind]').forEach(input=>input.addEventListener('change',()=>{if(input.checked)chooseInitialComposition(input.dataset.initialKind);}));
function setInitialType(i,type){const state=initialCompositionState(),current=doc.pages[0];if(!state.editable||!current.products[i])return false;if(!ORDER_PRODUCTS.includes(type))return error('Escolha um tipo de peça disponível.');const automaticTitle=current.title===kitTitle(state.types),p=current.products[i];p.type=type;if(p.technical)p.fabric='';delete p.technical;delete p.manualTechnical;if(!productCodeFor(type))p.id=newId();prepareOrderProduct(p,p.id);if(automaticTitle)current.title=kitTitle(current.products.map(p=>p.type));return true;}
for(const [i,selector]of ['#initialFirstType','#initialSecondType'].entries())$(selector).addEventListener('input',event=>{if(setInitialType(i,event.target.value.trim())){changed();render();}});
$('#initialKitPreset').addEventListener('change',event=>{const preset=KIT_PRESETS.find(p=>p.id===event.target.value);if(!preset||!initialCompositionState().editable)return;preset.types.forEach((type,i)=>setInitialType(i,type));changed();render();});

function renderSectionState(){
 renderInitialComposition();
 const ready=reviewReady();$('#stageNext').disabled=orderStage==='general'&&initialCompositionState().kind==='unselected';
 if(orderStage==='review'&&!ready){orderStage='list';for(const input of $$('#releaseChecks input'))input.checked=false;}
 if(orderStage==='piece2'&&pieceFamilies(page()).length<2)orderStage='pieces';const stages=flowStages(),index=stages.findIndex(s=>s.id===orderStage),stage=stages[index];
 $$('[data-order-stage]').forEach(panel=>panel.hidden=panel.dataset.orderStage!==orderStage&&!(panel.dataset.orderStage==='pieces'&&pieceStage()));
 $$('[data-order-step]').forEach(button=>{button.hidden=!stages.some(s=>s.id===button.dataset.orderStep);if(!button.hidden)button.querySelector('b').textContent=stages.findIndex(s=>s.id===button.dataset.orderStep)+1;const active=button.dataset.orderStep===orderStage;button.classList.toggle('active',active);if(active)button.setAttribute('aria-current','step');else button.removeAttribute('aria-current');if(button.dataset.orderStep==='review'){button.disabled=!ready;button.title=ready?'Revisar o pedido preenchido':'Conclua os campos obrigatórios, as peças e as quantidades para revisar.';}});
 $('#productionMain').dataset.activeStage=orderStage;$('#stageEyebrow').textContent='ETAPA '+(index+1)+' DE '+stages.length;$('#stageTitle').textContent=stage.title;$('#stageDescription').textContent=stage.description;
 $('#stageBack').hidden=index===0;$('#stageBack').textContent='← '+(stages[index-1]?.title||'Voltar');$('#stageNext').hidden=['pieces','piece2','review'].includes(orderStage);$('#stageNext').textContent=stage.next||'';$('#stageNext').classList.toggle('gold-button',orderStage==='identity');$('#stageNext').classList.toggle('outline-button',orderStage!=='identity');
 const showPreview=pieceStage()&&previewOpen;$('#orderPreview').hidden=!showPreview;$('#orderWorkspace').classList.toggle('has-preview',showPreview);$('#toggleOrderPreview').hidden=!pieceStage();$('#toggleOrderPreview').textContent='Ver prévia ampliada';$('#reviewGateStatus').hidden=ready||orderStage==='review';$('#openFinalPreview').textContent=orderStage==='review'?'Revisar em tela cheia':'Ampliar prévia';$$('[data-review-only]').forEach(el=>el.hidden=orderStage!=='review');
 const variants=doc.pages.reduce((n,p)=>n+p.products.length,0),count=doc.pages.reduce((n,pg)=>n+new Set(pg.products.map(p=>p.technical?p.technical.productCode+'|'+p.technical.designId:p.id)).size,0);$('#piecesStageSummary').textContent=count+' '+(count===1?'peça':'peças')+' no pedido'+(variants>count?' · '+variants+' configurações':'');$('#listStageSummary').textContent=doc.listSource?doc.listSource.rows.length+' itens vinculados':'Tamanhos e personalização';
 $('#listQuantitySummary').innerHTML=doc.listSource?'<h3>Quantidades aplicadas ao layout</h3>'+doc.pages.map(pg=>pieceFamilies(pg).map(f=>'<p><strong>'+esc(f[0].type)+'</strong> · '+f.reduce((n,p)=>n+Number(p.quantity||0),0)+' unidades</p>'+f.map(p=>'<pre>'+esc(p.grade||'')+'</pre>').join('')).join('')).join(''):'';
 renderUnifiedApplications();renderProductStage();
}
function reviewReady(){return !orderEditable()||Boolean(doc.technicalFiles?.length)&&releaseProblems(doc).length===0;}
function showOrderStage(value,{focus=true,select=true}={}){if(!['identity','general'].includes(value)&&initialCompositionState().kind==='unselected'){error('Escolha primeiro: Kit, Peça avulsa ou 2 peças independentes.');return;}if(!ORDER_STAGES.some(s=>s.id===value))return;if(value==='review'&&orderEditable()&&!doc.technicalFiles?.length){orderStage='files';error('Anexe o CDR do desenho para continuar.');renderPreview();return;}if(value==='review'&&!reviewReady()){error('Antes de revisar: '+releaseProblems(doc).slice(0,5).join(' '));$('#error').scrollIntoView({behavior:'smooth',block:'nearest'});return;}orderStage=value;if(pieceStage()){if(select&&value!=='personalization'){const family=pieceFamilies(page())[value==='pieces'?0:1];if(family)productIndex=page().products.indexOf(family[0]);}productStage=value==='personalization'?'art':'model';renderProduct();}if(value==='review')sheetIndex=0;error();renderPreview();if(focus){$('#stageTitle').focus({preventScroll:true});$('#stageTitle').scrollIntoView({behavior:'smooth',block:'start'});if(value==='review')visualTools.openFinalPreview({mode:'review',sheet:sheetIndex});}}
function renderProductStage(){
 if(!$('#productStepTitle'))return;const index=PRODUCT_STAGES.findIndex(s=>s.id===productStage),stage=PRODUCT_STAGES[index];
 $$('[data-product-panel]').forEach(panel=>panel.hidden=panel.dataset.productPanel!==productStage);$$('[data-product-step]').forEach(button=>{const active=button.dataset.productStep===productStage;button.classList.toggle('active',active);button.setAttribute('aria-pressed',String(active));});
 $('#currentProductName').textContent=product().type;$('#productStepTitle').textContent=(orderStage==='personalization'?'Aplicações e setas':stage.title)+' · '+product().type;$('#productStepHelp').textContent=orderStage==='personalization'?'Escolha a peça. Adicione a aplicação, posicione a seta e confirme.':stage.description;$('#productStepCount').textContent=(index+1)+' de '+PRODUCT_STAGES.length;$('#productStepBack').hidden=index===0;$('#productStepNext').textContent=index<PRODUCT_STAGES.length-1?'Continuar →':pieceFamilies(page()).findIndex(f=>f.includes(product()))<pieceFamilies(page()).length-1?'Continuar para a próxima peça →':'Continuar para personalizações →';
 const personal=orderStage==='personalization';if(personal)productStage='art';$$('[data-piece-art]').forEach(el=>el.hidden=personal);$$('[data-piece-personalization]').forEach(el=>el.hidden=!personal);$$('.product-stages').forEach(el=>el.hidden=personal);$('#productStepCount').hidden=personal;$('#productStepNext').hidden=personal;$('#productStepBack').hidden=personal;
 const source=imageSources.get(product().id)||(product().projectRef?'presentation':'manual');$$('[data-image-source-panel]').forEach(panel=>panel.hidden=panel.dataset.imageSourcePanel!==source);$$('[data-image-source]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.imageSource===source)));
}
function showProductStage(value){if(!PRODUCT_STAGES.some(s=>s.id===value))return;productStage=value;renderProductStage();$('#productStepTitle').focus({preventScroll:true});$('#productStepTitle').scrollIntoView({behavior:'smooth',block:'nearest'});}
$('#orderStages').addEventListener('click',e=>{const button=e.target.closest('[data-order-step]');if(button)showOrderStage(button.dataset.orderStep);});
$('#stageBack').addEventListener('click',()=>showOrderStage(flowStages()[flowStages().findIndex(s=>s.id===orderStage)-1]?.id));
$('#stageNext').addEventListener('click',()=>showOrderStage(flowStages()[flowStages().findIndex(s=>s.id===orderStage)+1]?.id));
$('#toggleOrderPreview').addEventListener('click',()=>visualTools.openFinalPreview({mode:'draft',sheet:sheetIndex}));
const visualTools=createOrderVisualTools({getOrder:()=>doc,getPage:page,getProduct:product,getAssets:()=>assets,getGeneration:()=>orderGeneration,canEdit:orderEditable,readImage:imageData,onError:error,onDownload:()=>$('#downloadPDF').click(),onApply:applyVisualEdit,onReviewClose:()=>{if(packageInvitePending){packageInvitePending=false;$('#packageReadyDialog').showModal();}},onConfirmReview:async()=>{for(const input of $$('#releaseChecks input'))input.checked=true;const ok=await workflowAction('release');if(!ok)throw Error($('#error').textContent||'Não foi possível salvar. Tente novamente.');return ok;}});
const pricingEditor=setupOrderPricing({mount:$('#orderBudget'),getOrder:()=>doc,canEdit:orderEditable,changed,onError:error});
const catalogEditor=setupCatalogEditor({getOrder:()=>doc,getPage:page,getProduct:product,changed,render,error,toast,canEdit:orderEditable,getRevision:()=>revision,onPositionApplication:request=>visualTools.openImageEditor(request)});
const orderGuide=createWorkflowGuide({mount:'#workflowNextStep',onAction:orderWorkflowAction});
function toast(message){clearTimeout(toastTimer);$('#productionToast').textContent=message;$('#productionToast').hidden=false;toastTimer=setTimeout(()=>$('#productionToast').hidden=true,5000);}
function error(message=''){$('#error').textContent=message;$('#error').hidden=!message;}
async function api(path,options){const r=await fetch(path,{...options,cache:'no-store'});let data;try{data=await r.json();}catch{throw new Error('Não foi possível ler a resposta do estúdio.');}if(!r.ok){const e=new Error(data.error||'Não foi possível concluir.');e.status=r.status;throw e;}return data;}
async function database(){return new Promise((resolve,reject)=>{const request=indexedDB.open('meinerz-production',1);request.onupgradeneeded=()=>request.result.createObjectStore('drafts');request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);});}
async function localDraft(value){const db=await database();return new Promise((resolve,reject)=>{const tx=db.transaction('drafts',value?'readwrite':'readonly'),store=tx.objectStore('drafts'),r=value?store.put(value,draftKey):store.get(draftKey);let result;r.onsuccess=()=>{result=r.result;};tx.oncomplete=()=>{db.close();resolve(result);};tx.onerror=()=>{db.close();reject(tx.error);};});}
function snapshot(){return {id,version,document:structuredClone(doc),dirty,updatedAt:new Date().toISOString()};}
async function persist(force=false){if(example||!profile||orderReset&&!force)return true;const value=snapshot(),write=draftWriteQueue.catch(()=>{}).then(()=>localDraft(value));draftWriteQueue=write;try{await write;return true;}catch{error('Não foi possível guardar o rascunho neste navegador. Salve no estúdio ou baixe a cópia .json.');return false;}}
function status(text){$('#saveStatus').textContent=text;}
function changed(){if($('#readyReviewDialog').open)$('#readyReviewDialog').close();finalInvite=null;if(product()?.technical)syncFamilyCharacteristics(page(),product());if(doc.workflow?.status==='released'||viewingRelease)return;for(const e of $$('#releaseChecks input'))e.checked=false;dirty=true;revision++;clearTimeout(draftTimer);draftTimer=setTimeout(persist,200);clearTimeout(autoTimer);if(profile&&!example)autoTimer=setTimeout(()=>save(false),1600);status(example?'Exemplo · clique em Salvar para guardar uma cópia':'Alterações no rascunho…');renderPreview();}
let savedListSummaries=[],pendingListDeletion=null;
async function refreshSavedLists(){const {lists}=await api('/api/order-lists');savedListSummaries=lists;
 $('#savedOrderLists').innerHTML='<option value="">Selecione uma lista salva…</option>'+lists.map(list=>`<option value="${esc(list.id)}">${esc(list.title)}</option>`).join('');
 $('#savedListCards').innerHTML=lists.map(list=>'<div class="catalog-application"><strong>'+esc(list.title)+'</strong><p>'+list.rowCount+' itens · '+(list.reviewed?'Pronta para usar':'Rascunho')+'</p><div class="row-actions">'+(list.reviewed?'<button type="button" class="outline-button" data-use-list="'+esc(list.id)+'">Usar no pedido</button>':'')+'<a class="text-link" href="/organizador?list='+encodeURIComponent(list.id)+'" target="_top">Abrir lista</a><button type="button" class="text-link" data-delete-list="'+esc(list.id)+'">Excluir</button></div></div>').join('')||'<p class="helper">Nenhuma lista salva nesta conta.</p>';
}
$('#savedListCards').addEventListener('click',async event=>{const use=event.target.closest('[data-use-list]'),remove=event.target.closest('[data-delete-list]');if(use){$('#savedOrderLists').value=use.dataset.useList;await attachSavedList(use.dataset.useList);}if(remove){const list=savedListSummaries.find(l=>l.id===remove.dataset.deleteList);if(!list)return;pendingListDeletion={id:list.id,version:list.version};$('#deleteSavedListName').textContent=list.title;$('#deleteSavedListError').textContent='';$('#deleteSavedListDialog').showModal();}});
$('#cancelSavedListDelete').addEventListener('click',()=>{pendingListDeletion=null;$('#deleteSavedListDialog').close();});
$('#confirmSavedListDelete').addEventListener('click',async()=>{const target=pendingListDeletion,b=$('#confirmSavedListDelete');if(!target||b.disabled)return;b.disabled=true;try{await api('/api/order-lists/'+encodeURIComponent(target.id),{method:'DELETE',headers:{'Content-Type':'application/json'},body:JSON.stringify({version:target.version})});pendingListDeletion=null;$('#deleteSavedListDialog').close();await refreshSavedLists();toast('Lista excluída. Os pedidos continuam preservados.');}catch(e){$('#deleteSavedListError').textContent=e.message;}finally{b.disabled=false;}});

const deletionBlocked=order=>order?.tracking?.stage==='accepted';
const orderThumbnail=order=>order.thumbnailUrl||'/api/order-tracking/'+encodeURIComponent(order.id)+'/thumbnail?version='+order.version;
const orderStateLabel=order=>ORDER_STATE_LABELS[order.tracking?.stage]||'Situação não informada';
function orderPreviewMarkup(order){return `<span data-order-preview><img src="${esc(orderThumbnail(order))}" alt="Prévia do pedido ${esc(order.title||order.number||'Sem nome')}" loading="lazy" decoding="async"><span data-preview-fallback hidden>Prévia indisponível</span></span>`;}
function renderSelectedOrder(){
 const selected=savedOrders.find(o=>o.id===$('#savedOrders').value);$('#openOrderPicker').disabled=!profile;
 const previewKey=selected?orderThumbnail(selected):'';if(displayedOrderThumbnail!==previewKey){displayedOrderThumbnail=previewKey;$('#selectedOrderPreview').innerHTML=selected?orderPreviewMarkup(selected):'<span aria-hidden="true">▤</span>';}
 $('#selectedOrderSummary').innerHTML=selected?'<strong>'+esc(selected.title||'Pedido sem nome')+'</strong><small>'+esc([selected.number,selected.client].filter(Boolean).join(' · ')||'Cliente não informado')+'</small><small>'+esc(orderStateLabel(selected))+'</small>':'<strong>Escolher um pedido salvo</strong><small>Veja a miniatura, o nome e a situação antes de abrir.</small>';
 $('#openOrder').disabled=!selected;$('#openOrder').textContent=selected&&['sent','accepted'].includes(selected.tracking?.stage)?'Consultar pedido':'Abrir pedido';
}
function renderOrderLibraryActions(){const selected=savedOrders.find(o=>o.id===$('#savedOrders').value);$('#deleteOrder').disabled=!profile||!selected||Boolean(orderDeletion)||deletionBlocked(selected);$('#deleteOrderHelp').hidden=!deletionBlocked(selected);renderSelectedOrder();}
function renderSavedOrders(selected=id||$('#savedOrders').value){$('#savedOrders').innerHTML='<option value="">Selecione um pedido…</option>'+savedOrders.map(o=>`<option value="${esc(o.id)}">${esc([o.title||'Pedido sem nome',o.number,o.client].filter(Boolean).join(' · '))}</option>`).join('');$('#savedOrders').value=savedOrders.some(o=>o.id===selected)?selected:'';renderOrderLibraryActions();if($('#savedOrderPicker').open)renderOrderPicker();}
function renderOrderPicker(){
 const query=$('#orderPickerSearch').value.trim().toLocaleLowerCase('pt-BR'),state=$('#orderPickerStatus').value||'all',filtered=savedOrders.filter(order=>(state==='all'||order.tracking?.stage===state)&&(!query||[order.title,order.number,order.client].join(' ').toLocaleLowerCase('pt-BR').includes(query)));
 const pages=Math.max(1,Math.ceil(filtered.length/ORDER_PICKER_SIZE));orderPickerPage=Math.max(0,Math.min(orderPickerPage,pages-1));const visible=filtered.slice(orderPickerPage*ORDER_PICKER_SIZE,(orderPickerPage+1)*ORDER_PICKER_SIZE);
 $('#savedOrderCards').innerHTML=visible.map(order=>{const selected=$('#savedOrders').value===order.id,date=new Date(order.updatedAt),stamp=Number.isFinite(+date)?date.toLocaleString('pt-BR',{timeZone:'America/Sao_Paulo',day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'}):'';return `<button type="button" class="saved-order-card${selected?' selected':''}" data-select-order="${esc(order.id)}" aria-pressed="${selected}" aria-label="Selecionar pedido ${esc(order.title||order.number||'Sem nome')}"><span class="saved-order-card-preview">${orderPreviewMarkup(order)}</span><span class="saved-order-card-copy"><span class="saved-order-state">${esc(orderStateLabel(order))}</span><strong>${esc(order.title||'Pedido sem nome')}</strong><span>${esc([order.number,order.client].filter(Boolean).join(' · ')||'Cliente não informado')}</span><small>${esc([Number.isFinite(order.tracking?.pieces)?order.tracking.pieces+' peças':'',stamp?'Atualizado em '+stamp:''].filter(Boolean).join(' · '))}</small></span></button>`;}).join('')||'<p class="saved-orders-empty">'+(savedOrders.length?'Nenhum pedido encontrado com essa busca.':'Você ainda não tem pedidos salvos.')+'</p>';
 $('#orderPickerCount').textContent=filtered.length+' pedido(s) · página '+(orderPickerPage+1)+' de '+pages;$('#orderPickerPrevious').disabled=orderPickerPage===0;$('#orderPickerNext').disabled=orderPickerPage>=pages-1;
}
$('#openOrderPicker').addEventListener('click',()=>{if(!profile)return;orderPickerPage=Math.max(0,Math.floor(savedOrders.findIndex(order=>order.id===$('#savedOrders').value)/ORDER_PICKER_SIZE));$('#orderPickerSearch').value='';$('#orderPickerStatus').value='all';renderOrderPicker();$('#savedOrderPicker').showModal();$('#orderPickerSearch').focus();});
$('#closeOrderPicker').addEventListener('click',()=>$('#savedOrderPicker').close());
for(const selector of ['#orderPickerSearch','#orderPickerStatus'])$(selector).addEventListener(selector==='#orderPickerSearch'?'input':'change',()=>{orderPickerPage=0;renderOrderPicker();});
for(const [selector,direction]of [['#orderPickerPrevious',-1],['#orderPickerNext',1]])$(selector).addEventListener('click',()=>{orderPickerPage+=direction;renderOrderPicker();$('#savedOrderCards').scrollTop=0;});
$('#savedOrderCards').addEventListener('click',event=>{const button=event.target.closest('[data-select-order]');if(!button||!savedOrders.some(order=>order.id===button.dataset.selectOrder))return;$('#savedOrders').value=button.dataset.selectOrder;renderOrderLibraryActions();$('#savedOrderPicker').close();$('#openOrder').focus();});
function orderPreviewFailed(event){const frame=event.target.closest('[data-order-preview]');if(!frame)return;event.target.hidden=true;const fallback=frame.querySelector('[data-preview-fallback]');if(fallback)fallback.hidden=false;}
$('#savedOrderCards').addEventListener('error',orderPreviewFailed,true);$('#selectedOrderPreview').addEventListener('error',orderPreviewFailed,true);
async function refreshOrders(selected=$('#savedOrders').value||id){if(!profile)return;const data=await api('/api/production-orders');savedOrders=data.orders;renderSavedOrders(selected);}
async function verifyRecoveredOrder(){
 if(!id||savedOrders.some(order=>order.id===id))return;const recovered=id;
 try{await api('/api/production-orders/'+encodeURIComponent(recovered));}
 catch(e){if(e.status!==404||id!==recovered)return;const next=newOrder();if(profile)next.seller=next.artist=profile.displayName;await replaceDocument(next);if(!params.get('order')||params.get('order')===recovered)canonicalWorkflowPath(workflowRoute('order'));status('Este pedido foi excluído · comece um novo pedido');}
}
function renderOrderDeletion(){
 const state=orderDeletion;if(!state)return;
 $('#deleteOrderName').textContent=state.order.title;$('#deleteOrderMeta').textContent=[state.order.number?'Pedido '+state.order.number:'',state.order.client].filter(Boolean).join(' · ');
 $('#deleteSentWarning').hidden=state.order.tracking?.stage!=='sent';$('#deleteDraftWarning').hidden=state.id!==id||!dirty;$('#deleteOrderStatus').hidden=!state.loading&&!state.busy;$('#deleteOrderStatus').textContent=state.busy?'Excluindo pedido…':'Carregando pedido…';
 $('#confirmOrderDeletion').disabled=state.loading||state.busy||state.invalid||deletionBlocked(state.order);$('#confirmOrderDeletion').textContent=state.busy?'Excluindo…':'Excluir pedido';$('#cancelOrderDeletion').disabled=state.busy;
}
function deletionError(message=''){$('#deleteOrderError').textContent=message;$('#deleteOrderError').hidden=!message;}
function cancelOrderDeletion(){
 const state=orderDeletion;if(!state||state.busy)return;orderDeletion=null;if($('#deleteOrderDialog').open)$('#deleteOrderDialog').close();renderOrderLibraryActions();
 if(state.id===id&&dirty&&profile&&!example&&!conflict&&orderEditable())autoTimer=setTimeout(()=>save(false),1600);
}
async function requestOrderDeletion(){
 const selected=savedOrders.find(o=>o.id===$('#savedOrders').value);if(!profile||!selected||orderDeletion||deletionBlocked(selected))return;
 const state={id:selected.id,order:selected,loading:true,busy:false,invalid:false};orderDeletion=state;
 if(state.id===id)clearTimeout(autoTimer);deletionError();renderOrderDeletion();renderOrderLibraryActions();$('#deleteOrderDialog').showModal();
 try{
  // A save already in flight must settle before the version is shown for confirmation.
  if(state.id===id&&savePromise)await savePromise;if(orderDeletion!==state)return;
  const {order}=await api('/api/production-orders/'+encodeURIComponent(state.id));if(orderDeletion!==state)return;
  state.order=order;if(deletionBlocked(order))deletionError('Pedidos aceitos pela fábrica não podem ser excluídos.');
 }catch(e){if(orderDeletion!==state)return;state.invalid=true;deletionError(e.message);}
 finally{if(orderDeletion===state){state.loading=false;renderOrderDeletion();}}
}
async function confirmOrderDeletion(){
 const state=orderDeletion;if(!state||state.loading||state.busy||state.invalid||deletionBlocked(state.order))return;
 state.busy=true;deletionError();renderOrderDeletion();
 try{
  await api('/api/production-orders/'+encodeURIComponent(state.id),{method:'DELETE',headers:{'Content-Type':'application/json'},body:JSON.stringify({version:state.order.version})});
  if(id===state.id){
   clearTimeout(autoTimer);clearTimeout(draftTimer);example=false;const next=newOrder();if(profile)next.seller=next.artist=profile.displayName;
   await replaceDocument(next);canonicalWorkflowPath(workflowRoute('order'));updateOrderGuide();$('#pdfLink').hidden=true;
   if(pdfURL){URL.revokeObjectURL(pdfURL);pdfURL=undefined;}status('Pedido excluído · pronto para um novo pedido');
  }
  savedOrders=savedOrders.filter(o=>o.id!==state.id);orderDeletion=null;$('#deleteOrderDialog').close();renderSavedOrders();
  await refreshOrders().catch(()=>{});toast('Pedido excluído. As listas e apresentações continuam salvas.');
 }catch(e){
  if([400,404,409].includes(e.status))state.invalid=true;deletionError(e.message);await refreshOrders().catch(()=>{});
 }finally{state.busy=false;if(orderDeletion===state)renderOrderDeletion();renderOrderLibraryActions();}
}
$('#savedOrders').addEventListener('change',renderOrderLibraryActions);
$('#deleteOrder').addEventListener('click',requestOrderDeletion);
$('#cancelOrderDeletion').addEventListener('click',cancelOrderDeletion);
$('#confirmOrderDeletion').addEventListener('click',confirmOrderDeletion);
$('#deleteOrderDialog').addEventListener('cancel',event=>{event.preventDefault();cancelOrderDeletion();});
$('#deleteOrderDialog').addEventListener('close',cancelOrderDeletion);
async function save(explicit=true){
 if(orderReset)return false;
 if(technicalBusy){if(explicit)error('Aguarde o envio do arquivo técnico terminar.');return false;}
 if(orderDeletion?.id===id)return false;
 if(savePromise){const ok=await savePromise;if(ok&&dirty&&explicit)return save(true);return ok;}
 if(doc.workflow?.status==='released'||viewingRelease){if(explicit)toast('Revisão preservada. Inicie uma nova revisão para editar.');return !dirty;}
 if(!profile){if(explicit)error('Entre na sua conta pelo estúdio para salvar. Você pode baixar uma cópia deste pedido agora.');return false;}
 if(example&&!explicit)return false;if(conflict){if(explicit)error('Este pedido mudou em outra aba. Baixe sua cópia e reabra a versão salva antes de continuar.');return false;}
 clearTimeout(autoTimer);const created=!id,start=revision,payload={document:structuredClone(doc),version};$('#saveOrder').disabled=true;status('Salvando no estúdio…');
 savePromise=(async()=>{try{const {order}=await api(id?'/api/production-orders/'+encodeURIComponent(id):'/api/production-orders',{method:id?'PUT':'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});id=order.id;version=order.version;if(typeof order.number==='string'&&doc.number!==order.number){doc.number=order.number;$('[data-order="number"]').value=doc.number;renderPreview();}example=false;updateOrderGuide(created);canonicalWorkflowPath(workflowRoute('order',{orderId:id}));dirty=revision!==start;await persist();status(dirty?'Há alterações novas para salvar.':'Salvo no estúdio · versão '+version);error();await refreshOrders(created?id:undefined).catch(()=>{});if(explicit)toast('Pedido salvo no seu estúdio.');if(dirty)autoTimer=setTimeout(()=>save(false),500);return true;}
 catch(e){if(e.status===409)conflict=true;await persist();status('Rascunho neste navegador · pendente de salvar');error(e.message);return false;}
 finally{savePromise=null;$('#saveOrder').disabled=false;}})();return savePromise;
}
let continuingToList=false;
async function continueToList(){
 if(continuingToList)return;
 if(!orderEditable())return error('Abra uma revisão em preparação antes de montar a lista.');
 if(!doc.title.trim()||/^novo pedido$/i.test(doc.title.trim())){showOrderStage('identity');error('Dê um nome ao pedido para criar a lista com o mesmo nome.');$('[data-order="title"]').focus();return;}
 if(!doc.client.trim()){showOrderStage('identity');error('Preencha o cliente antes de continuar para a lista.');$('[data-order="client"]').focus();return;}
 continuingToList=true;renderOrderEditActions();$('#orderEditor').disabled=true;$('#continueOrderList').disabled=true;
 try{
  if(!await save(true))return;const destination=id,generation=orderGeneration;
  const {list}=await api('/api/production-orders/'+encodeURIComponent(id)+'/list',{method:'POST'});
  if(id!==destination||generation!==orderGeneration)throw new Error('O pedido mudou. Abra a lista pelo pedido correto.');
  if(dirty&&!await save(true))return;
  window.top.location.href=workflowRoute('list',{orderId:destination,listId:list.id});
 }catch(e){error(e.message);}finally{continuingToList=false;renderOrderEditActions();$('#orderEditor').disabled=!orderEditable();$('#continueOrderList').disabled=!orderEditable();}
}
async function canSwitch(){if(technicalBusy){error('Aguarde a operação dos arquivos técnicos terminar.');return false;}clearTimeout(autoTimer);if(dirty&&!example)return save(true);return true;}
async function replaceDocument(value,meta={}){clearTimeout(autoTimer);clearTimeout(draftTimer);for(const e of $$('#releaseChecks input'))e.checked=false;orderGeneration++;packageInvitePending=false;viewingRelease=Boolean(meta.viewingRelease);doc=value;if(orderEditable())applyFactoryDefaults(doc);if(!meta.id)doc.number='';if(meta.tracking)doc.factoryTracking=meta.viewingRelease?{...meta.tracking,stage:'checked',revision:doc.workflow?.revision}:meta.tracking;id=meta.id||null;version=meta.version||0;dirty=false;conflict=false;pageIndex=productIndex=sheetIndex=0;pendingAnchor=null;orderStage=orderEditable()?'identity':'review';productStage='model';previewOpen=false;imageSources.clear();$('.order-management').open=false;revision++;render();renderSavedOrders(meta.id||'');return persist(Boolean(meta.resetDraft));}
async function applyOrderList(rows,source){
 if(doc.workflow?.status==='released'||viewingRelease)throw new Error('Inicie uma nova revisão antes de aplicar a lista.');
 const destination=doc,start=revision,next=applyListToOrder(doc,rows,source);
 doc=next;for(const pg of doc.pages)syncConfirmedApplicationPositions(pg);pageIndex=productIndex=sheetIndex=0;changed();render();toast('Lista anexada. As quantidades já estão no pedido.');if(bootReady){const applied=doc;if(profile&&!example&&!await save(true))return true;if(doc===applied)offerFinalReview();}return true;
}
async function openSavedOrder(orderId){const {order}=await api('/api/production-orders/'+encodeURIComponent(orderId)),{document,...summary}=order;const index=savedOrders.findIndex(item=>item.id===order.id);if(index>=0)savedOrders[index]=summary;else savedOrders.unshift(summary);example=false;await replaceDocument(document,order);status('Salvo no estúdio · versão '+version);}
function renderListStatus(){const source=doc.listSource;$('#orderListStatus').textContent=source?`${source.name}${source.version?' · versão '+source.version:''} · ${source.rows.length} linhas · ${listSummary(source.rows).pieces} peças`:'Importe o Excel para preencher as quantidades e a personalização deste pedido.';}
function renderProjectLink(p){
 const ref=p.projectRef,current=ref&&projects.find(project=>project.id===ref.id),newer=current?.reviewed&&current.version>ref.version;
 const linked=ref?`<div class="linked-project"><strong>${esc(ref.name)} · versão ${ref.version}</strong><span>Quatro vistas em PNG transparente, guardadas neste pedido.</span><a href="/studio/${encodeURIComponent(ref.id)}" data-action="open-linked-project" target="_top">Abrir apresentação →</a>${newer?'<p>Há uma versão mais nova. O desenho anexado continua na versão '+ref.version+'.</p><button class="outline-button" data-action="refresh-project">Atualizar desenho para versão '+current.version+'</button>':''}</div>`:'';
 return `${linked}<div class="project-image"><label for="projectImage">Apresentação conferida<select id="projectImage"><option value="">Selecione uma apresentação…</option>${projects.filter(project=>project.reviewed&&project.hasMap).map(project=>`<option value="${esc(project.id)}"${project.id===(params.get('project')||ref?.id)?' selected':''}>${esc(project.name)} · V${project.version}</option>`).join('')}</select></label><button type="button" class="outline-button" data-action="project-image">Usar esta apresentação à peça</button><details class="presentation-options"><summary>Outras opções de apresentação</summary><div class="row-actions"><button type="button" class="text-link" data-action="open-selected-project">Abrir no estúdio</button><button type="button" class="text-link" data-action="refresh-projects">Atualizar opções</button><a class="text-link" data-action="create-presentation" href="/projects" target="_top">Criar apresentação →</a></div></details><p class="helper">Ao vincular, a imagem desta peça é substituída pelas quatro vistas da apresentação.</p></div>`;
}
async function attachProject(p,projectId){
 const generation=orderGeneration;
 const selected=projects.find(project=>project.id===projectId);if(!selected?.reviewed)throw new Error('Abra e conclua a conferência da apresentação antes de anexar.');if(!selected?.thumbnailUrl)throw new Error('Abra a apresentação no estúdio e salve para gerar a imagem das quatro vistas.');
 const [{template},response]=await Promise.all([api('/api/projects/'+encodeURIComponent(selected.id)+'/template'),fetch('/api/projects/'+encodeURIComponent(selected.id)+'/assets/thumbnail?version='+selected.version,{cache:'no-store'})]);
 if(!response.ok){const data=await response.json().catch(()=>({}));throw new Error(data.error||'Não foi possível abrir a imagem da apresentação.');}
 const blob=await response.blob();if(blob.type!=='image/png')throw new Error('Esta miniatura é de uma versão anterior. Abra a apresentação e salve novamente para gerar as quatro vistas transparentes.');
 const image=await imageData(blob,true);if(generation!==orderGeneration)throw new Error('O pedido aberto mudou durante o carregamento. Vincule a apresentação ao pedido correto.');p=doc.pages.flatMap(page=>page.products).find(item=>item.id===p.id);if(!p)throw new Error('A peça foi removida durante o carregamento. Selecione outra peça antes de anexar.');
 const reference={id:selected.id,name:selected.name,version:selected.version,templateId:selected.templateId,attachedAt:new Date().toISOString(),format:'four-transparent-v1'},targetPage=doc.pages.find(pg=>pg.products.includes(p)),kit=usePresentationKit(doc,targetPage,p,template,image,reference);if(kit){pageIndex=doc.pages.indexOf(kit);productIndex=0;p=kit.products[0];toast('Kit reconhecido: as duas peças usam a mesma apresentação.');}else{p.images=[image];p.projectRef=reference;}
 const anchors=p.components.some(component=>component.anchor);for(const component of p.components)delete component.anchor;if(anchors)toast('Desenho anexado. Reposicione as setas dos acabamentos na nova imagem.');
 if(!p.technical&&!p.model)p.model=selected.name;if(!doc.client)doc.client=selected.clientName||'';
}
function options(values,current){const all=[...new Set([current,...values].filter(Boolean))];return all.map(s=>`<option${s===current?' selected':''}>${esc(s)}</option>`).join('');}
function field(label,key,value,{wide=false,select=null,list=null,type='text',placeholder=''}={}){return `<label${wide?' class="wide"':''}>${label}${select?`<select data-product="${key}">${options(select,value)}</select>`:`<input data-product="${key}" type="${type}" value="${esc(value)}" ${list?'list="'+list+'"':''} ${type==='number'?'min="0" max="99999" step="1"':'maxlength="'+(key==='type'?80:200)+'"'} placeholder="${esc(placeholder)}">`}</label>`;}
function render(){
 pageIndex=Math.max(0,Math.min(pageIndex,doc.pages.length-1));productIndex=Math.max(0,Math.min(productIndex,page().products.length-1));
 for(const page of doc.pages)for(const p of page.products)if(p.technical&&!p.technical.designId)p.technical.designId=page.id;
 updateOrderGuide(false);renderListStatus();
 if($('#simulatorDrawing')){$('#simulatorDrawing').hidden=!doc.simulatorDesign||!id||viewingRelease;if(doc.simulatorDesign&&id)$('#openSimulatorDrawing').href='/simulador?order='+encodeURIComponent(id);}
 $$('[data-order]').forEach(e=>{if(e.type==='checkbox')e.checked=Boolean(doc[e.dataset.order]);else e.value=doc[e.dataset.order]??'';});
 $('#techniques').innerHTML=[...new Set([...TECHNIQUES,...doc.techniques])].filter(s=>!['TPU ALTO RELEVO','DTF','BORDADO / APLIQUE','TERMOCOLANTE'].includes(s)).map(s=>`<label><input type="checkbox" data-technique="${esc(s)}"${doc.techniques.includes(s)?' checked':''}>${esc(s)}</label>`).join('');
 $('#pageTabs').innerHTML=doc.pages.map((p,i)=>`<button data-page-index="${i}" class="${i===pageIndex?'active':''}" aria-pressed="${i===pageIndex}">${i+1}. ${esc(p.title||p.products.map(x=>x.type).join(' + '))}</button>`).join('');
 $$('[data-page]').forEach(e=>e.value=page()[e.dataset.page]||'');$('#pageUp').disabled=pageIndex===0;$('#pageDown').disabled=pageIndex===doc.pages.length-1;renderOrderEditActions();
 $('#productTabs').innerHTML=pieceFamilies(page()).map(family=>{const p=family[0],i=page().products.indexOf(p);return `<button type="button" data-product-index="${i}" class="${family.includes(product())?'active':''}" aria-pressed="${family.includes(product())}">${esc(p.type||'Peça '+(i+1))}</button>`;}).join('');$('#productTabs').hidden=page().products.length<2;$('#pageTabs').hidden=doc.pages.length<2;renderProduct();const found=buildSheets(doc,assets,{draft:true}).findIndex(s=>s.anchors.some(a=>a.id===product().id));if(found>=0)sheetIndex=found;renderPreview();
}
function renderProduct(){
 const p=product(),shared=page().visual?.mode==='shared',kit=page().mode==='conjunto',upload=(i)=>`<div><label for="image${i}">${p.images[i]?`<img src="${esc(p.images[i])}" alt="${i===0?'Imagem principal':'Imagem complementar'} de ${esc(p.type)}">`:i===0?'＋ Escolher imagem principal':'＋ Escolher imagem complementar'}<input id="image${i}" data-image="${i}" type="file" accept="image/png,image/jpeg,image/webp" hidden></label>${p.images[i]?`<button type="button" data-action="remove-image" data-slot="${i}">Remover imagem</button>`:''}</div>`;
 $('#productEditor').innerHTML=`<div class="product-card">
 <div class="product-card-heading"><div><p class="eyebrow">EDITANDO ESTA PEÇA</p><h3 id="currentProductName">${esc(p.type)}</h3></div><details class="product-actions"><summary>Mais opções</summary><div><button type="button" class="text-link" data-action="duplicate-product">Duplicar peça</button><button type="button" class="text-link" data-action="remove-product"${page().products.length===1?' disabled':''}>Remover peça</button></div></details></div>
 ${p.listMissing?'<p class="list-missing">Esta peça não está na lista. Confira a lista antes de finalizar.</p>':''}
<div class="fields"><label>Modelagem em edição<select id="familyVariant">${(pieceFamilies(page()).find(f=>f.includes(p))||[p]).map(item=>`<option value="${page().products.indexOf(item)}"${item===p?' selected':''}>${esc(item.technical?.fit?fitLabel(item.technical.productCode,item.technical.fit):item.type)}</option>`).join('')}</select></label></div> <nav class="product-stages" aria-label="Etapas desta peça">${PRODUCT_STAGES.map((stage,i)=>`<button type="button" data-product-step="${stage.id}" aria-pressed="${stage.id===productStage}" aria-controls="product-panel-${stage.id}"><b>${i+1}</b>${stage.title}</button>`).join('')}</nav>
 <div class="product-step-heading"><span id="productStepCount"></span><h3 id="productStepTitle" tabindex="-1"></h3><p id="productStepHelp" class="helper"></p></div>
 <section class="product-step-panel" id="product-panel-model" data-product-panel="model"${productStage==='model'?'':' hidden'}><div class="fields two">${catalogTypeField(p)}${'<div class="wide"><span class="helper">Nome automático</span><p>'+esc(productDisplayName(p))+'</p></div>'}</div>${catalogModelFields(p,doc,page())}${catalogSpecialFields(p)}<details class="editor-subsection"><summary>Observações desta peça</summary><div class="fields"><label>Informações para a produção<textarea data-product="notes" rows="3" maxlength="4000">${esc(p.notes)}</textarea></label></div></details></section>
 <section class="product-step-panel" id="product-panel-fabric" data-product-panel="fabric"${productStage==='fabric'?'':' hidden'}><div class="fields two">${p.technical?catalogFabricFields(p):`${field('Tecido principal','fabric',p.fabric,{wide:true,list:'fabricOptions',placeholder:'Escolha ou digite outro tecido'})}${field('Cor do tecido','fabricColor',p.fabricColor)}${field('Cor dos detalhes','detailColor',p.detailColor)}${field('Estampa em','print',p.print,{wide:true,list:'techniqueOptions'})}`}</div></section>
 <section class="product-step-panel" id="product-panel-art" data-product-panel="art"${productStage==='art'?'':' hidden'}>
 <div data-piece-art><div class="image-source-options" aria-label="Origem do desenho"><button type="button" data-image-source="manual">Imagem do computador</button><button type="button" data-image-source="presentation">Apresentação salva</button></div>
 <div data-image-source-panel="manual">${kit||shared?`<div class="kit-image-actions"><button type="button" class="outline-button" data-action="choose-shared-image">${shared&&page().visual?.image?'Substituir imagem das duas peças':'+ Adicionar uma imagem para as duas peças'}</button><input id="sharedKitImage" data-shared-image type="file" accept="image/png,image/jpeg,image/webp" hidden><p class="helper">Uma imagem para o kit inteiro, com os dados técnicos separados por peça.</p></div>`:''}${shared?`<div class="shared-image-preview">${page().visual?.image?`<img src="${esc(page().visual.image)}" alt="Imagem única do kit"><button type="button" class="text-link" data-action="use-individual-images">Usar imagens separadas por peça</button>`:''}</div>`:`<div class="image-uploads single-upload">${upload(0)}</div><details class="editor-subsection optional-image"><summary>Imagem complementar (opcional)</summary><div class="image-uploads single-upload">${upload(1)}</div></details>`}</div>
 <div data-image-source-panel="presentation" hidden>${renderProjectLink(p)}</div>
 ${catalogFinishFields(p)}</div>
 </section>
 <nav class="product-stage-footer" aria-label="Continuar esta peça"><button type="button" class="text-link" id="productStepBack" data-product-back>← Voltar</button><button type="button" class="gold-button" id="productStepNext" data-product-next>Continuar →</button></nav>
 </div>`;gradeStatus();renderProductStage();catalogEditor.refresh();
}
function gradeStatus(){if(!$('#gradeTotal'))return;const p=product(),g=parseGrade(p.grade,p.type);$('#gradeTotal').textContent='Soma da grade: '+g.total+' · Quantidade da peça: '+p.quantity+(g.errors.length?' · '+g.errors.join(' '):'');$('#gradeTotal').classList.toggle('invalid',Boolean(g.errors.length||g.groups.length&&g.total!==Number(p.quantity)));}
function renderPreview(){pricingEditor.render();renderOverview();renderSectionState();$('#openFinalPreview').disabled=orderStage==='review'&&!reviewReady();$('#finalPreviewHelp').textContent='Leia o pedido no tamanho ampliado. Use o zoom e confira todas as folhas; depois marque as três conferências abaixo. A revisão não envia o pedido à fábrica.';sheets=buildSheets(doc,assets,{draft:true});sheetIndex=Math.max(0,Math.min(sheetIndex,sheets.length-1));$('#sheet').innerHTML=sheets[sheetIndex]?sheetSVG(sheets[sheetIndex],{placeholders:orderStage!=='review'}):'';$('#sheetSelect').innerHTML=sheets.map((s,i)=>`<option value="${i}"${i===sheetIndex?' selected':''}>${esc(sheetLabel(s))}</option>`).join('');const layouts=sheets.filter(s=>s.kind==='sheet').length;$('#sheetCount').textContent=layouts+' '+(layouts===1?'desenho':'desenhos')+' · '+sheets.length+' '+(sheets.length===1?'folha para impressão':'folhas para impressão');$('#previousSheet').disabled=sheetIndex===0;$('#nextSheet').disabled=sheetIndex>=sheets.length-1;$('#anchorHint').hidden=!pendingAnchor;$('#sheetStage').classList.toggle('marking',Boolean(pendingAnchor));const problems=validateOrder(doc);$('#validation').classList.toggle('invalid',Boolean(problems.length));$('#validation').innerHTML=problems.length?'<b>Confira antes de exportar:</b><ul>'+problems.map(s=>'<li>'+esc(s)+'</li>').join('')+'</ul>':'Grade e quantidades conferidas. Consulte a conferência acima para liberar para produção.';$('#downloadPDF').disabled=Boolean(problems.length);$('#downloadSVG').disabled=Boolean(problems.length);if($('#gradeTotal'))gradeStatus();}
$$('[data-order]').forEach(e=>e.addEventListener('input',()=>{if(e.dataset.order==='number')return;const previousClient=doc.client;doc[e.dataset.order]=e.type==='checkbox'?e.checked:e.value;if(e.dataset.order==='client'&&(!doc.title.trim()||doc.title==='Novo pedido'||doc.title===previousClient)){doc.title=e.value;$('[data-order="title"]').value=doc.title;}changed();}));
$$('[data-page]').forEach(e=>e.addEventListener('input',()=>{page()[e.dataset.page]=e.value;changed();if(e.dataset.page==='mode')render();}));
$('#techniques').addEventListener('change',e=>{if(!e.target.dataset.technique)return;doc.techniques=$$('[data-technique]:checked').map(e=>e.dataset.technique);changed();});
$('#pageTabs').addEventListener('click',e=>{const b=e.target.closest('[data-page-index]');if(!b)return;pageIndex=Number(b.dataset.pageIndex);productIndex=0;render();});
$('#productTabs').addEventListener('click',e=>{const b=e.target.closest('[data-product-index]');if(!b)return;productIndex=Number(b.dataset.productIndex);if(orderStage!=='personalization')orderStage=pieceFamilies(page()).findIndex(f=>f.includes(product()))===0?'pieces':'piece2';render();});
$('#productEditor').addEventListener('input',e=>{
 const key=e.target.dataset.product;if(key){product()[key]=key==='quantity'?Number(e.target.value):e.target.value;changed();if(key==='type')$('#productTabs').querySelector('[data-product-index="'+productIndex+'"]').textContent=e.target.value;}
 const component=e.target.dataset.component;if(component){const i=Number(e.target.closest('[data-component-index]').dataset.componentIndex);product().components[i][component]=e.target.value;changed();}
});
async function imageData(file,requireTransparent=false){
 if(!file||!['image/png','image/jpeg','image/webp'].includes(file.type)||file.size>20*1024*1024)throw new Error('Escolha uma imagem PNG, JPG ou WebP de até 20 MB.');const url=URL.createObjectURL(file);try{const image=new Image();image.src=url;await image.decode();if(image.width*image.height>100000000)throw new Error('A imagem é grande demais. Reduza as dimensões antes de enviar.');const scale=Math.min(1,1700/Math.max(image.width,image.height)),canvas=document.createElement('canvas');canvas.width=Math.round(image.width*scale);canvas.height=Math.round(image.height*scale);const ctx=canvas.getContext('2d');ctx.drawImage(image,0,0,canvas.width,canvas.height);
 let output=canvas;if(file.type==='image/png'){const pixels=ctx.getImageData(0,0,canvas.width,canvas.height).data;let transparent=false,minX=canvas.width,minY=canvas.height,maxX=-1,maxY=-1;for(let y=0;y<canvas.height;y++)for(let x=0;x<canvas.width;x++){const alpha=pixels[(y*canvas.width+x)*4+3];if(alpha===0)transparent=true;if(alpha>8){minX=Math.min(minX,x);maxX=Math.max(maxX,x);minY=Math.min(minY,y);maxY=Math.max(maxY,y);}}if(requireTransparent&&maxX<0)throw new Error('A apresentação não contém peças visíveis. Salve o desenho no estúdio e tente novamente.');if(requireTransparent&&!transparent)throw new Error('A imagem está sem transparência. Salve novamente a apresentação para gerar o PNG transparente.');if(transparent&&maxX>=minX&&maxY>=minY){const pad=3,left=Math.max(0,minX-pad),top=Math.max(0,minY-pad),right=Math.min(canvas.width,maxX+pad+1),bottom=Math.min(canvas.height,maxY+pad+1);output=document.createElement('canvas');output.width=right-left;output.height=bottom-top;output.getContext('2d').drawImage(canvas,left,top,output.width,output.height,0,0,output.width,output.height);}}
 const data=output.toDataURL(file.type==='image/jpeg'?'image/jpeg':'image/png',.91);if(data.length>3*1024*1024)throw new Error('A imagem ainda tem mais de 2 MB. Exporte uma versão menor.');return data;}finally{URL.revokeObjectURL(url);}
}
$('#productEditor').addEventListener('change',async e=>{
 const shared='sharedImage' in e.target.dataset;if(!shared&&!e.target.dataset.image||!e.target.files?.[0]||!orderEditable())return;
 const productId=product().id,pageId=page().id,slot=Number(e.target.dataset.image),generation=orderGeneration;
 try{const image=await imageData(e.target.files[0]),target=doc.pages.find(page=>page.id===pageId),p=target?.products.find(item=>item.id===productId);if(generation!==orderGeneration||!p||!orderEditable())throw new Error('O pedido ou a peça mudou. Anexe a imagem novamente na peça correta.');
  if(shared){if(target.products.length!==2&&target.mode!=='conjunto')throw new Error('Use uma imagem única em um kit com duas peças.');target.mode='conjunto';target.visual={mode:'shared',image,transform:{scale:1,x:.5,y:.5}};for(const item of target.products){delete item.projectRef;for(const component of item.components)delete component.anchor;imageSources.set(item.id,'manual');}}
  else{p.images[slot]=image;if(slot===0)delete p.projectRef;}
  changed();render();
 }catch(err){error(err.message);}finally{e.target.value='';}
});
$('#productEditor').addEventListener('click',async e=>{
 const step=e.target.closest('[data-product-step]');if(step&&orderStage!=='personalization'){showProductStage(step.dataset.productStep);return;}
 if(e.target.closest('[data-product-back]')){showProductStage(PRODUCT_STAGES[PRODUCT_STAGES.findIndex(s=>s.id===productStage)-1]?.id);return;}
 if(e.target.closest('[data-product-next]')){const index=PRODUCT_STAGES.findIndex(s=>s.id===productStage);if(index<PRODUCT_STAGES.length-1)showProductStage(PRODUCT_STAGES[index+1].id);else nextPieceFlow();return;}
 const source=e.target.closest('[data-image-source]');if(source){imageSources.set(product().id,source.dataset.imageSource);renderProductStage();return;}
 const b=e.target.closest('[data-action]');if(!b)return;const p=product(),a=b.dataset.action,i=Number(b.dataset.index);
 try{
  if(a==='go-list'){showOrderStage('list');return;}
  if(a==='choose-shared-image'){if(orderEditable())$('#sharedKitImage').click();return;}
  if(a==='use-individual-images'){if(!orderEditable())return;page().visual.mode='per-product';changed();render();return;}
  if(a==='edit-image'){visualTools.openImageEditor();return;}
  if(a==='duplicate-product'){if(page().products.length>=8)throw new Error('Use até oito peças por página de edição.');const notes=(page().annotations||[]).filter(a=>a.productId===p.id);if((page().annotations||[]).length+notes.length>80)throw new Error('Use até 80 apontamentos por página.');const copy=structuredClone(p);copy.id=newId();page().annotations=[...(page().annotations||[]),...notes.map(a=>({...structuredClone(a),id:newId(),productId:copy.id}))];page().products.push(copy);productIndex=page().products.length-1;if(page().mode==='individual')page().mode='avulsas';}
  if(a==='remove-product'&&page().products.length>1){page().annotations=(page().annotations||[]).filter(a=>a.productId!==p.id);page().products.splice(productIndex,1);productIndex=Math.max(0,productIndex-1);}
  if(a==='remove-image'){p.images[Number(b.dataset.slot)]='';if(Number(b.dataset.slot)===0)delete p.projectRef;}
  if(a==='unlink-list'){delete p.listKey;delete p.listMissing;}
  if(a==='add-component'){if(p.components.length>=30)throw new Error('Use até 30 componentes por peça.');p.components.push({name:'',material:'',finish:'',position:''});}
  if(a==='remove-component')p.components.splice(i,1);
  if(a==='remove-anchor')delete p.components[i].anchor;
  if(a==='anchor'){if(page().freeComponents||page().imageArea==='expanded'){visualTools.openImageEditor();toast('Use Trazer acabamentos da peça para criar e ajustar os apontamentos livres.');return;}const target=sheets.findIndex(s=>s.anchors.some(a=>a.id===p.id));if(target<0)return;sheetIndex=target;pendingAnchor={product:p.id,index:i};previewOpen=true;renderPreview();$('#orderPreview').scrollIntoView({behavior:'smooth',block:'nearest'});toast('Clique na peça, na prévia, para apontar o acabamento.');return;}
  if(a==='project-image'||a==='refresh-project'){b.disabled=true;await attachProject(p,a==='refresh-project'?p.projectRef.id:$('#projectImage').value);}
  if(a==='refresh-projects'){projects=(await api('/api/projects')).projects;renderProduct();return;}
  if(a==='open-selected-project'||a==='open-linked-project'){e.preventDefault();const selected=a==='open-linked-project'?p.projectRef?.id:$('#projectImage').value;if(!selected)throw new Error('Selecione uma apresentação para abrir no estúdio.');if(await save(true))window.top.location.href='/studio/'+encodeURIComponent(selected)+'?order='+encodeURIComponent(id)+'&item='+encodeURIComponent(p.id);return;}
  if(a==='create-presentation'){e.preventDefault();if(await save(true))window.top.location.href='/projects?order='+encodeURIComponent(id)+'&item='+encodeURIComponent(p.id)+'&create=1';return;}
  changed();render();
 }catch(err){error(err.message);b.disabled=false;}
});
$('#sheet').addEventListener('click',e=>{if(!pendingAnchor)return;const svg=$('#sheet svg'),r=svg.getBoundingClientRect(),x=(e.clientX-r.left)/r.width*PAPER.width,y=(e.clientY-r.top)/r.height*PAPER.height,anchor=sheets[sheetIndex].anchors.find(a=>a.id===pendingAnchor.product);if(!anchor||x<anchor.x||x>anchor.x+anchor.w||y<anchor.y||y>anchor.y+anchor.h)return toast('Clique dentro da área do mockup desta peça.');const p=doc.pages.flatMap(p=>p.products).find(p=>p.id===pendingAnchor.product);if(!p?.components[pendingAnchor.index])return;p.components[pendingAnchor.index].anchor={x:(x-anchor.x)/anchor.w,y:(y-anchor.y)/anchor.h};pendingAnchor=null;changed();renderProduct();renderPreview();});
$('#cancelAnchor').addEventListener('click',()=>{pendingAnchor=null;renderPreview();});
function blankPage(current){return current.products.length===1&&current.products[0].type==='Camiseta'&&!current.title&&!current.label&&!current.notes&&!current.visual?.image&&!current.annotations?.length&&!current.products[0].extraApplications?.length&&['model','fabric','fabricColor','detailColor','grade','namesRaw','notes'].every(key=>!current.products[0][key])&&!current.products[0].quantity&&!current.products[0].images.some(Boolean)&&!current.products[0].components.length&&!current.products[0].names.length;}
function addPieceError(message){$('#addPieceError').textContent=message;$('#addPieceError').hidden=false;}
function finishAddingPiece(message){if(doc.compositionKind==='')doc.compositionKind=page().mode==='conjunto'?'kit':page().products.length===2?'pair':'single';productStage='model';orderStage='pieces';$('#addPieceDialog').close();changed();render();showOrderStage('pieces',{focus:false});$('#productStepTitle').focus({preventScroll:true});$('#productStepTitle').scrollIntoView({behavior:'smooth',block:'nearest'});toast(message);}
$('#openAddPiece').addEventListener('click',()=>{if(!orderEditable())return;$('#addPieceError').hidden=true;$('#newProductType').value='Camiseta';$('#newKitFirstType').value='Camiseta';$('#newKitSecondType').value='Calção';$('#newProductSamePage').checked=false;$('#addPieceDialog').showModal();});
$('#closeAddPiece').addEventListener('click',()=>$('#addPieceDialog').close());
$('#addKit').addEventListener('click',()=>{
 if(!orderEditable())return;let kit;try{kit=newKitPage([$('#newKitFirstType').value,$('#newKitSecondType').value]);}catch(e){return addPieceError(e.message);}const current=page();if(blankPage(current)){kit.id=current.id;doc.pages[pageIndex]=kit;}else{if(doc.pages.length>=50)return addPieceError('Use até 50 páginas de edição.');doc.pages.push(kit);pageIndex=doc.pages.length-1;}productIndex=0;finishAddingPiece('Kit adicionado. Comece pelo modelo de '+product().type+'.');
});
$('#addProduct').addEventListener('click',()=>{
 if(!orderEditable())return;const type=$('#newProductType').value.trim();if(!type||type.length>80)return addPieceError('Escolha ou digite o nome da peça, com até 80 caracteres.');const current=page(),added=newProduct(type);
 if(blankPage(current)){current.products=[added];productIndex=0;}
 else if($('#newProductSamePage').checked){if(current.products.length>=8)return addPieceError('Use até oito peças por página.');if(current.visual?.mode==='shared'&&current.products.length>=2)return addPieceError('Esta página usa uma imagem única para duas peças. Adicione a nova peça em outra página.');current.products.push(added);productIndex=current.products.length-1;if(current.mode==='individual')current.mode='avulsas';}
 else{if(doc.pages.length>=50)return addPieceError('Use até 50 páginas de edição.');const next=newPage();next.products=[added];doc.pages.push(next);pageIndex=doc.pages.length-1;productIndex=0;}
 finishAddingPiece('Peça adicionada. Preencha o modelo para continuar.');
});
$('#addPage').addEventListener('click',()=>{if(!orderEditable())return;if(doc.pages.length>=50)return toast('Use até 50 páginas de edição por pedido.');doc.pages.push(newPage());pageIndex=doc.pages.length-1;productIndex=0;finishAddingPiece('Nova página adicionada.');});
$('#duplicatePage').addEventListener('click',()=>{if(doc.pages.length>=50)return;const copy=structuredClone(page());copy.id=newId();const ids=new Map();copy.products.forEach(p=>{const previous=p.id;p.id=newId();ids.set(previous,p.id);});copy.annotations=(copy.annotations||[]).map(a=>({...a,id:newId(),productId:ids.get(a.productId)||''}));doc.pages.splice(pageIndex+1,0,copy);pageIndex++;productIndex=0;changed();render();});
$('#removePage').addEventListener('click',requestPageRemoval);
for(const [key,offset]of [['pageUp',-1],['pageDown',1]])$('#'+key).addEventListener('click',()=>{const next=pageIndex+offset;if(next<0||next>=doc.pages.length)return;[doc.pages[pageIndex],doc.pages[next]]=[doc.pages[next],doc.pages[pageIndex]];pageIndex=next;changed();render();});

function renderOrderEditActions(){
 const blocked=!bootReady||technicalBusy||continuingToList||Boolean(orderDeletion)||Boolean(orderReset)||Boolean(pageRemoval);
 $('#newOrder').disabled=blocked;$('#removePage').disabled=blocked||!orderEditable();
 $('#activePageLabel').textContent='Página '+(pageIndex+1)+' de '+doc.pages.length+(page().title?' · '+page().title:'');
}
function hidePrintedCopy(){
 $('#pdfLink').hidden=true;if(pdfURL){URL.revokeObjectURL(pdfURL);pdfURL=undefined;}
}
function hasOrderInput(){
 return Boolean(id||dirty||!initialCompositionState().editable||doc.title&&doc.title!=='Novo pedido'||['number','client','contact','contactPhone','phone','registration','payment','notes','previousOrder','complementChanges'].some(key=>doc[key])||doc.technicalFiles?.length||doc.simulatorDesign);
}
function cancelPageRemoval(){if(!pageRemoval)return;pageRemoval=null;if($('#removePageDialog').open)$('#removePageDialog').close();renderOrderEditActions();}
function requestPageRemoval(){
 if(!bootReady||!orderEditable()||technicalBusy||continuingToList||orderDeletion||orderReset||pageRemoval)return;
 pageRemoval={document:doc,generation:orderGeneration,revision,pageId:page().id};
 $('#removePageName').textContent='Página '+(pageIndex+1)+(page().title?' · '+page().title:'');
 $('#removePageItems').textContent=page().products.map(p=>[p.type,p.model,Number(p.quantity||0)+' un.'].filter(Boolean).join(' · ')).join(' / ');
 $('#removeLastPageNote').hidden=doc.pages.length!==1;renderOrderEditActions();$('#removePageDialog').showModal();
}
function confirmPageRemoval(){
 const state=pageRemoval;if(!state)return;
 if(!orderEditable()||state.document!==doc||state.generation!==orderGeneration||state.revision!==revision){cancelPageRemoval();return error('O pedido mudou. Selecione a página e confira novamente antes de excluir.');}
 const index=doc.pages.findIndex(p=>p.id===state.pageId);if(index<0){cancelPageRemoval();return error('A página não está mais neste pedido.');}
 const last=doc.pages.length===1;if(last)doc.pages=[newPage()];else doc.pages.splice(index,1);
 pageIndex=Math.max(0,Math.min(index-1,doc.pages.length-1));productIndex=sheetIndex=0;productStage='model';pendingAnchor=null;orderGeneration++;
 cancelPageRemoval();hidePrintedCopy();changed();render();showOrderStage('pieces',{focus:false});
 toast(last?'Página excluída. Uma página vazia está pronta para preencher.':'Página excluída do pedido.');
}
$('#cancelPageRemoval').addEventListener('click',cancelPageRemoval);
$('#confirmPageRemoval').addEventListener('click',confirmPageRemoval);
$('#removePageDialog').addEventListener('cancel',event=>{event.preventDefault();cancelPageRemoval();});
$('#removePageDialog').addEventListener('close',cancelPageRemoval);
function cancelOrderReset(){
 const state=orderReset;if(!state||state.busy)return;orderReset=null;if($('#resetOrderDialog').open)$('#resetOrderDialog').close();renderOrderEditActions();
 if(state.fromNavigation)canonicalWorkflowPath(workflowRoute('order',{orderId:id||''}));
 if(dirty){draftTimer=setTimeout(persist,200);if(profile&&!example&&!conflict&&orderEditable())autoTimer=setTimeout(()=>save(false),1600);}
}
async function requestOrderReset({fromNavigation=false}={}){
 if(!bootReady||orderReset||pageRemoval||orderDeletion)return;
 if(technicalBusy||continuingToList)return error('Aguarde a operação em andamento terminar para começar outro pedido.');
 const populated=hasOrderInput();orderReset={document:doc,generation:orderGeneration,fromNavigation,busy:false};clearTimeout(autoTimer);clearTimeout(draftTimer);
 $('#resetOrderName').textContent=doc.title||'Pedido sem nome';$('#resetOrderMeta').textContent=[doc.number,doc.client].filter(Boolean).join(' · ');
 $('#resetSavedOrderNote').hidden=!id&&!savePromise;$('#resetOrderStatus').hidden=true;$('#confirmOrderReset').disabled=$('#cancelOrderReset').disabled=false;
 renderOrderEditActions();if(!populated)return confirmOrderReset();$('#resetOrderDialog').showModal();
}
async function confirmOrderReset(){
 const state=orderReset;if(!state||state.busy)return;state.busy=true;$('#confirmOrderReset').disabled=$('#cancelOrderReset').disabled=true;$('#resetOrderStatus').hidden=!savePromise;
 try{
  // Finish only an existing request; discarding never initiates a save of the old form.
  if(savePromise)await savePromise;
  if(doc!==state.document||orderGeneration!==state.generation)throw new Error('O pedido aberto mudou. Confira novamente antes de descartar.');
  clearTimeout(autoTimer);clearTimeout(draftTimer);const next=newOrder();if(profile)next.seller=next.artist=profile.displayName;
  $('#initialSecondType').value=$('#newKitSecondType').value='Calção';$('#newKitFirstType').value=$('#newProductType').value='Camiseta';$('#newProductSamePage').checked=false;
  example=false;const stored=await replaceDocument(next,{resetDraft:true});canonicalWorkflowPath(workflowRoute('order'));hidePrintedCopy();$('#incomingProject').hidden=true;
  orderReset=null;if($('#resetOrderDialog').open)$('#resetOrderDialog').close();status('Novo pedido · preencha os dados');showOrderStage('identity');
  if(stored)error();else error('Novo pedido aberto. Não foi possível atualizar o rascunho deste navegador; salve o novo pedido no estúdio antes de sair.');
  $('[data-order="title"]').focus();toast('Novo pedido iniciado. Preenchimento anterior descartado.');
 }catch(e){state.busy=false;orderReset=state;$('#resetOrderStatus').hidden=true;$('#confirmOrderReset').disabled=$('#cancelOrderReset').disabled=false;error(e.message);}
 finally{renderOrderEditActions();}
}
$('#cancelOrderReset').addEventListener('click',cancelOrderReset);
$('#confirmOrderReset').addEventListener('click',confirmOrderReset);
$('#resetOrderDialog').addEventListener('cancel',event=>{event.preventDefault();cancelOrderReset();});
$('#resetOrderDialog').addEventListener('close',cancelOrderReset);

$('#sheetSelect').addEventListener('change',e=>{sheetIndex=Number(e.target.value);renderPreview();});$('#previousSheet').addEventListener('click',()=>{sheetIndex--;renderPreview();});$('#nextSheet').addEventListener('click',()=>{sheetIndex++;renderPreview();});
$('#saveOrder').addEventListener('click',()=>save(true));
$('#importOrderList').addEventListener('click',()=>$('#orderListFile').click());
$('#orderListFile').addEventListener('change',async event=>{
 const file=event.target.files[0];if(!file)return;const destination=doc,button=$('#importOrderList');button.disabled=true;error();
 try{if(file.size>10*1024*1024)throw new Error('Use uma planilha de até 10 MB.');const extension=file.name.split('.').at(-1).toLowerCase();let source;
 if(extension==='xlsx')source={sheets:prepareListSheets(await readOrderWorkbook(await file.arrayBuffer(),await loadExcelLibrary()))};
 else if(['csv','tsv','txt'].includes(extension))source=prepareListText(await file.text());else throw new Error('Envie uma planilha XLSX, CSV, TSV ou TXT.');
 if(source.free||needsListMapping(source))throw new Error('Esta lista precisa de ajuste de colunas. Use Abrir lista no organizador para conferir antes de aplicar ao pedido.');
 const parts=source.sheets.filter(sheet=>sheet.enabled!==false).map(sheet=>parseListMatrix(sheet)),rows=parts.flatMap(part=>part.records),pending=parts.flatMap(part=>part.unresolved);
 if(pending.length)throw new Error('Há '+pending.length+' linhas para conferir. Abra a lista no organizador.');
 const invalid=rows.filter(row=>listProblems(row).length);if(invalid.length)throw new Error(invalid.length+' itens precisam de ajuste. '+listProblems(invalid[0]).join(' '));
 if(rows.length>5000)throw new Error('Use até 5.000 linhas por lista.');if(doc!==destination)throw new Error('O pedido aberto mudou durante a leitura. Importe novamente a lista no pedido correto.');await applyOrderList(rows,{name:file.name});
 }catch(e){error(e.message);}finally{button.disabled=false;event.target.value='';}
});
$('#continueOrderList').addEventListener('click',continueToList);
$('#newOrder').addEventListener('click',()=>requestOrderReset());
$('[data-nav-id="create-order"]')?.addEventListener('click',event=>{event.preventDefault();requestOrderReset();});
$('#example').addEventListener('click',async()=>{if(!await canSwitch())return;example=true;await replaceDocument(demoOrder());status('Exemplo · clique em Salvar para guardar uma cópia');});
$('#openOrder').addEventListener('click',async()=>{const selected=$('#savedOrders').value;if(!selected||!await canSwitch())return;try{await openSavedOrder(selected);showOrderStage(orderStage);}catch(e){error(e.message);}});
function download(bytes,name,type,link=null){const blob=new Blob([bytes],{type}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;a.click();if(link){if(pdfURL)URL.revokeObjectURL(pdfURL);pdfURL=url;link.href=url;link.download=name;link.hidden=false;}else setTimeout(()=>URL.revokeObjectURL(url),60000);}
function filename(value=doc){return orderFileStem(value);}
$('#downloadData').addEventListener('click',()=>download(JSON.stringify({format:'atlas-production-order',document:doc},null,2),filename()+'.json','application/json'));
$('#importData').addEventListener('change',async e=>{const file=e.target.files[0];if(!file)return;try{if(file.size>16*1024*1024)throw new Error('A cópia excede 16 MB.');const input=JSON.parse(await file.text()),d=input.document;if(d?.schema!==1||!Array.isArray(d.pages)||!d.pages.length||d.pages.length>50)throw new Error('Esta cópia não é um pedido de produção compatível.');for(const p of d.pages){if(!Array.isArray(p.products)||!p.products.length||p.products.length>8)throw new Error('A cópia contém uma página inválida.');for(const item of p.products){if(!Array.isArray(item.images)||!Array.isArray(item.components)||!Array.isArray(item.names)||item.images.some(s=>s&&!/^data:image\/(png|jpeg);base64,[A-Za-z0-9+/]+={0,2}$/.test(s)))throw new Error('A cópia contém imagens ou dados inválidos.');}}if(!await canSwitch())return;delete d.workflow;delete d.factoryTracking;delete d.technicalFiles;delete d.origin;example=false;await replaceDocument(d);changed();toast('Cópia importada como um novo pedido.');}catch(err){error(err.message);}finally{e.target.value='';}});
async function script(src,name){if(window[name])return window[name];return new Promise((resolve,reject)=>{const s=document.createElement('script');s.src=src;s.onload=()=>resolve(window[name]);s.onerror=()=>reject(new Error('Não foi possível carregar a exportação PDF.'));document.head.append(s);});}
async function fontAssets(){if(assets.fonts)return;const paths=['/fonts/ChakraPetch-Regular.ttf','/fonts/ChakraPetch-SemiBold.ttf'];const values=await Promise.all(paths.map(async p=>{const r=await fetch(p);if(!r.ok)throw new Error('Não foi possível carregar a fonte do pedido.');const blob=await r.blob();return new Promise(resolve=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.readAsDataURL(blob);});}));assets.fonts={regular:values[0],bold:values[1]};}
$('#downloadPDF').addEventListener('click',async()=>{if(validateOrder(doc).length)return;const captured=structuredClone(doc),generation=orderGeneration,target=id,b=$('#downloadPDF');b.disabled=true;b.textContent='Gerando…';try{await fontAssets();const [PDF,fontkit]=await Promise.all([script('/vendor/pdf-lib/pdf-lib.min.js','PDFLib'),script('/vendor/fontkit/fontkit.umd.min.js','fontkit')]);const printed=buildSheets(captured,assets),bytes=await createPDF(printed,PDF,{fontkit,regular:assets.fonts.regular,bold:assets.fonts.bold});download(bytes,filename(captured)+'.pdf','application/pdf',generation===orderGeneration&&target===id?$('#pdfLink'):null);toast('PDF A4 horizontal gerado com o layout da prévia.');}catch(e){error(e.message);}finally{b.textContent='Baixar PDF ↓';b.disabled=Boolean(validateOrder(doc).length);}});
$('#openFinalPreview').addEventListener('click',()=>visualTools.openFinalPreview({mode:orderStage==='review'?'review':'draft',sheet:sheetIndex}));
$('#downloadSVG').addEventListener('click',()=>{if(validateOrder(doc).length)return;download(sheetSVG(sheets[sheetIndex],{placeholders:false}),filename()+' - folha '+(sheetIndex+1)+'.svg','image/svg+xml');toast('Folha editável exportada. O orçamento e as informações do pedido estão incluídos.');});
window.addEventListener('beforeunload',e=>{if(dirty&&!example){e.preventDefault();e.returnValue='';}});
document.addEventListener('keydown',e=>{if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='s'){e.preventDefault();save(true);}});
$('#refreshSavedLists').addEventListener('click',()=>refreshSavedLists().catch(e=>error(e.message)));
async function attachSavedList(selected=$('#savedOrderLists').value){
 if(!selected)return toast('Selecione uma lista salva.');const destination=doc,button=$('#useSavedList');button.disabled=true;
 try{const {list}=await api('/api/order-lists/'+encodeURIComponent(selected));if(doc!==destination)throw new Error('O pedido aberto mudou. Escolha novamente a lista.');if(!list.reviewed||list.document.unresolved?.length||list.document.rows.some(row=>listProblems(row).length))throw new Error('Esta lista tem itens para conferir. Abra a lista no organizador antes de aplicar.');await applyOrderList(list.document.rows,{name:list.title,id:list.id,version:list.version});}catch(e){error(e.message);}finally{button.disabled=false;}
}
$('#useSavedList').addEventListener('click',()=>attachSavedList());
function technicalQuery(){return viewingRelease?'revision='+encodeURIComponent(doc.workflow?.revision):'version='+encodeURIComponent(version);}
function renderTechnicalFiles(){
 const locked=!orderEditable(),files=doc.technicalFiles||[];
 $('#technicalCheckLabel').textContent=files.length?'Conferi tecidos, acabamentos, prazo e os CDRs anexados desta revisão.':'Conferi tecidos, acabamentos e prazo.';
 $('#technicalFileList').innerHTML=files.map(file=>'<div class="technical-file"><div><a href="/api/production-orders/'+encodeURIComponent(id)+'/technical-files/'+encodeURIComponent(file.id)+'?'+technicalQuery()+'">'+esc(file.name)+'</a><small>'+esc((file.size/1024/1024).toFixed(2))+' MB · SHA-256 '+esc(file.sha256?.slice(0,16))+'…</small></div>'+(!locked?'<button type="button" class="text-link" data-remove-technical="'+esc(file.id)+'"'+(technicalBusy?' disabled':'')+'>Remover desta revisão</button>':'')+'</div>').join('')||'<p class="helper">Nenhum CDR anexado nesta revisão.</p>';
 $('#technicalUploadLabel').hidden=locked;$('#technicalFile').disabled=locked||technicalBusy;$('#technicalUploadLabel').setAttribute('aria-disabled',String(locked||technicalBusy));$('#downloadProductionPackage').disabled=technicalBusy||doc.workflow?.status!=='released'||!files.length||!id;
 $('#startComplement').disabled=!profile||!id||viewingRelease||technicalBusy;
 $('#complementOrigin').hidden=!doc.origin;
 if(doc.origin)$('#complementOrigin').innerHTML='Complemento do pedido <a href="/pedidos?order='+encodeURIComponent(doc.origin.id)+'" target="_top">'+esc(doc.origin.number||doc.origin.title)+'</a> · revisão '+esc(doc.origin.revision)+'. O pedido original permanece preservado.';
 renderOrderEditActions();
 $('#complementChangesWrap').hidden=!doc.origin&&!/^COMPLEMENTO/.test(doc.type);$('[data-order="previousOrder"]').readOnly=Boolean(doc.origin);$('[data-order="type"]').querySelector('option').disabled=Boolean(doc.origin);
}
async function applyTechnicalResponse(order,target,generation,start){
 if(id!==target||orderGeneration!==generation)return;
 const pending=dirty||revision!==start;version=order.version;doc.technicalFiles=order.document.technicalFiles||[];doc.workflow=order.document.workflow;doc.factoryTracking=order.tracking;revision++;dirty=pending;
 for(const check of $$('#releaseChecks input'))check.checked=false;renderPreview();await persist();await refreshOrders().catch(()=>{});
}
async function technicalOperation(operation){
 if(technicalBusy||!await canSwitch())return;
 technicalBusy=true;clearTimeout(autoTimer);$('#technicalFileStatus').textContent='Preparando os arquivos…';renderOverview();
 try{await operation();error();}
 catch(e){error(e.message);}
 finally{technicalBusy=false;$('#technicalFileStatus').textContent='';$('#technicalFile').value='';renderOverview();if(doc.listSource&&doc.technicalFiles?.length&&orderEditable())offerFinalReview();if(dirty&&orderEditable())autoTimer=setTimeout(()=>save(false),500);}
}
$('#technicalFile').addEventListener('change',async event=>{
 const file=event.target.files[0];if(!file)return;
 if(!orderEditable())return error('Abra uma nova revisão antes de trocar o CDR.');
 if(file.size>20*1024*1024||!file.name.toLowerCase().endsWith('.cdr')){event.target.value='';return error('Envie o original .cdr de até 20 MB.');}
 if(!await save(true))return;
 await technicalOperation(async()=>{const target=id,generation=orderGeneration,start=revision,form=new FormData();form.set('version',String(version));form.set('file',file);$('#technicalFileStatus').textContent='Anexando CDR…';const {order}=await api('/api/production-orders/'+encodeURIComponent(target)+'/technical-files',{method:'POST',body:form});await applyTechnicalResponse(order,target,generation,start);toast('CDR anexado. Confira o original antes de concluir esta revisão.');});
});
$('#technicalFileList').addEventListener('click',async event=>{
 const button=event.target.closest('[data-remove-technical]');if(!button||!orderEditable())return;
 await technicalOperation(async()=>{const target=id,generation=orderGeneration,start=revision;const {order}=await api('/api/production-orders/'+encodeURIComponent(target)+'/technical-files/'+encodeURIComponent(button.dataset.removeTechnical),{method:'DELETE',headers:{'Content-Type':'application/json'},body:JSON.stringify({version})});await applyTechnicalResponse(order,target,generation,start);toast('Arquivo removido desta revisão. Revisões anteriores continuam preservadas.');});
});
function downloadProductionPackage(){return technicalOperation(async()=>{
 const target=id,query=technicalQuery();$('#technicalFileStatus').textContent='Gerando PDF com listas e reunindo CDRs…';const delivery=await api('/api/production-orders/'+encodeURIComponent(target)+'/delivery?'+query),libraries=await loadDeliveryLibraries();
 const result=await createProductionPackage(delivery,{...libraries,logo:assets.logo,readFile:async file=>{const response=await fetch(file.url,{cache:'no-store'});if(!response.ok){const body=await response.json().catch(()=>({}));throw new Error(body.error||'Não foi possível baixar o CDR desta revisão.');}return response.arrayBuffer();}});download(result.bytes,result.name,'application/zip');toast('Pacote gerado com PDF, listas incorporadas e CDRs da revisão conferida.');
});}
$('#downloadProductionPackage').addEventListener('click',downloadProductionPackage);
$('#downloadPackageNow').addEventListener('click',()=>{$('#packageReadyDialog').close();downloadProductionPackage();});
$('#downloadPackageLater').addEventListener('click',()=>$('#packageReadyDialog').close());
$('#startComplement').addEventListener('click',async()=>{
 if(!id||viewingRelease||technicalBusy||!await canSwitch())return;
 complementPending={id,version,generation:orderGeneration};$('#complementSource').textContent='Origem: '+doc.number+' · '+doc.title+' · revisão '+(doc.workflow?.revision||1);$('#complementType').value='COMPLEMENTO';$('#complementNotes').value='';$('#complementCopyList').checked=false;$('#complementError').hidden=true;$('#complementDialog').showModal();$('#complementType').focus();
});
function closeComplement(){if(technicalBusy)return;complementPending=null;$('#complementDialog').close();}
$('#cancelComplement').addEventListener('click',closeComplement);$('#complementDialog').addEventListener('cancel',event=>{if(technicalBusy)event.preventDefault();else complementPending=null;});
$('#confirmComplement').addEventListener('click',async()=>{
 const pending=complementPending;if(!pending||technicalBusy)return;
 const type=$('#complementType').value,changes=$('#complementNotes').value.trim();
 const fail=message=>{$('#complementError').textContent=message;$('#complementError').hidden=false;};
 if(type==='COMPLEMENTO COM ALTERAÇÕES'&&!changes)return fail('Descreva o que muda neste complemento.');
 if(id!==pending.id||version!==pending.version||orderGeneration!==pending.generation)return fail('O pedido mudou. Feche e abra novamente a criação do complemento.');
 technicalBusy=true;$('#confirmComplement').disabled=$('#cancelComplement').disabled=true;renderOverview();
 try{const {order}=await api('/api/production-orders/'+encodeURIComponent(pending.id)+'/complement',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({version:pending.version,type,changes,copyList:$('#complementCopyList').checked})});
  $('#complementDialog').close();complementPending=null;example=false;await replaceDocument(order.document,order);canonicalWorkflowPath(workflowRoute('order',{orderId:order.id}));await refreshOrders(order.id);status('Complemento criado · preencha prazo, lista e confira novamente');toast('Novo complemento criado. O pedido de origem permanece preservado.');
 }catch(e){fail(e.message);}finally{technicalBusy=false;$('#confirmComplement').disabled=$('#cancelComplement').disabled=false;renderOverview();}
});

async function boot(){
 let requestFreshAtBoot=false;
 for(const selector of ['#initialFirstType','#initialSecondType','#newProductType','#newKitFirstType','#newKitSecondType'])$(selector).innerHTML=ORDER_PRODUCTS.map(type=>'<option value="'+type+'">'+type+'</option>').join('');$('#initialSecondType').value=$('#newKitSecondType').value='Calção';
 $('#productOptions').innerHTML=PRODUCTS.map(s=>'<option value="'+s+'">').join('');
 $('#techniqueOptions').innerHTML=TECHNIQUES.map(s=>'<option value="'+esc(s)+'">').join('');
 $('#fabricOptions').innerHTML=FABRICS.map(s=>'<option value="'+s+'">').join('');
 try{await fontAssets();}catch(e){error(e.message);}
 try{const r=await fetch('/assets/atlas/atlas-logo-print.png'),blob=await r.blob();assets.logo=await new Promise(resolve=>{const f=new FileReader();f.onload=()=>resolve(f.result);f.readAsDataURL(blob);});}catch{}
 try{const data=await api('/api/profile');profile=data.profile;draftKey=profile.email;$('#designer').textContent=profile.displayName;const draft=await localDraft().catch(()=>null);if(draft?.document&&!example){doc=draft.document;id=draft.id;version=draft.version;dirty=Boolean(draft.dirty);status(dirty?'Rascunho recuperado · pendente de salvar':'Último pedido recuperado · versão '+version);}else status('Novo pedido · preencha os dados');await refreshOrders();await verifyRecoveredOrder();await refreshSavedLists().catch(()=>{});try{projects=(await api('/api/projects')).projects;}catch{}}
 catch{status(example?'Exemplo de pedido':'Entre no estúdio para salvar seus pedidos.');}
 if(example)doc=demoOrder();
 const requestedOrder=params.get('order');let targetReady=!requestedOrder;
 if((params.get('new')==='1'||params.get('list')||params.get('attach')==='1')&&!requestedOrder){const standaloneNew=params.get('new')==='1'&&!['list','attach','project','import'].some(key=>params.has(key));if(standaloneNew)requestFreshAtBoot=hasOrderInput();else{if(!await canSwitch())throw new Error('Salve o rascunho anterior antes de criar outro pedido.');example=false;await replaceDocument(newOrder());if(profile)doc.seller=doc.artist=profile.displayName;}}
 if(requestedOrder){try{if(dirty&&!await save(true))throw new Error('Não foi possível salvar o rascunho atual antes de abrir o pedido solicitado.');await openSavedOrder(requestedOrder);targetReady=true;}catch(e){error(e.message);}}
 if(params.get('import')==='1'&&targetReady){try{const raw=sessionStorage.getItem('meinerz-production-import');if(raw){const data=JSON.parse(raw),target=data.orderId||null;if(target&&requestedOrder&&target!==requestedOrder)throw new Error('A lista pertence a outro pedido. Abra novamente a lista pelo pedido correto.');if(dirty&&!await save(true))throw new Error('Salve o rascunho atual antes de importar a lista.');if(target&&id!==target)await openSavedOrder(target);
   if(target){if(!await applyOrderList(data.rows,data.source))throw new Error('Importação cancelada. A lista permanece salva na conta.');}else{doc=applyListToOrder(newOrder(),data.rows,data.source);doc.title=data.title||'Pedido importado';id=null;version=0;}
   example=false;dirty=true;revision++;sessionStorage.removeItem('meinerz-production-import');status('Lista aplicada · complete os dados técnicos e vincule o desenho');}}catch(e){error(e.message);}}
 if(params.get('list')&&targetReady){try{const {list}=await api('/api/order-lists/'+encodeURIComponent(params.get('list')));if(!list.reviewed||list.document.unresolved?.length||list.document.rows.some(row=>listProblems(row).length))throw new Error('A lista tem pendências. Conclua a conferência no organizador.');if(await applyOrderList(list.document.rows,{name:list.title,id:list.id,version:list.version})){if(!id)doc.title=list.title;await save(true);}}catch(e){error(e.message);}}
 const requestedItem=params.get('item');if(requestedItem)for(let pi=0;pi<doc.pages.length;pi++){const index=doc.pages[pi].products.findIndex(p=>p.id===requestedItem);if(index>=0){pageIndex=pi;productIndex=index;break;}}
 const requested=projects.find(p=>p.id===params.get('project'));if(requested){$('#incomingProject').hidden=false;$('#incomingProject').textContent='Apresentação selecionada: '+requested.name+'. Você pode criar um novo pedido ou abrir um pedido salvo acima. Depois, escolha a peça e clique em Usar esta apresentação.';}
 if(params.get('attach')==='1'&&targetReady){if(!requested)error('A apresentação selecionada não está disponível nesta conta.');else try{if(await attachWorkflowProject(requested.id,params.get('item')))$('#incomingProject').textContent='Apresentação anexada: '+requested.name+'. Continue com a lista ou com os dados técnicos do pedido.';}catch(e){error(e.message);}}
 if(profile&&!doc.seller&&!id)doc.seller=doc.artist=profile.displayName;if(!orderEditable())orderStage='review';else if(targetReady&&(params.get('list')||params.get('import')==='1')){orderStage='list';}else if(targetReady&&params.get('project')){orderStage='pieces';productStage='art';}if(orderEditable()&&applyFactoryDefaults(doc)){dirty=true;revision++;}const recoveredPositions=doc.pages.map(pg=>syncConfirmedApplicationPositions(pg)).some(Boolean);if(recoveredPositions){dirty=true;revision++;}bootReady=true;render();if(requestFreshAtBoot)await requestOrderReset({fromNavigation:true});if(targetReady&&(params.get('list')||params.get('import')==='1'))offerFinalReview();if(dirty&&!example)await persist();if(params.get('import')==='1'&&profile&&!example&&dirty)autoTimer=setTimeout(()=>save(false),1000);

}
boot().catch(e=>error(e.message));

function renderOverview(){
 const w=doc.workflow||{status:'draft',revision:1,history:[]},locked=w.status==='released'||viewingRelease||['sent','accepted'].includes(doc.factoryTracking?.stage),items=doc.pages.flatMap(page=>page.products.map(p=>({page,p}))),issues=releaseProblems(doc);
 $('#workflowStatus').textContent=(viewingRelease?'CONSULTA HISTÓRICA · ':locked?'REVISÃO CONFERIDA · ':'RASCUNHO · ')+'Revisão '+w.revision+(w.releasedAt&&locked?' · '+new Date(w.releasedAt).toLocaleString('pt-BR')+' · '+w.releasedBy:'');
 $('#overviewSummary').innerHTML='<p><strong>'+esc(doc.client||'Cliente pendente')+'</strong> · '+items.reduce((n,{p})=>n+Number(p.quantity||0),0)+' peças</p><p>Lista: '+esc(doc.listSource?doc.listSource.name+' · V'+(doc.listSource.version||'arquivo'):'Não vinculada; grade manual')+'</p><ul>'+items.map(({page,p})=>'<li><b>'+esc(p.type)+'</b> · '+esc(page.listGroup||page.title||'Sem grupo')+' · '+p.quantity+' un. · '+esc(p.fabric||'Tecido pendente')+' · '+esc(page.visual?.mode==='shared'&&page.visual.image?'Imagem única do kit':p.projectRef?p.projectRef.name+' V'+p.projectRef.version:p.images?.some(Boolean)?'Imagem manual':'Sem mockup; montagem posterior')+'</li>').join('')+'</ul>';
 $('#releaseIssues').innerHTML=issues.length?'<p>Para concluir a conferência:</p><ul>'+issues.map(issue=>'<li>'+esc(issue)+'</li>').join('')+'</ul>':'<p>Pedido pronto para a conferência final em tela cheia.</p>';
 $('#orderEditor').disabled=locked;$('#saveOrder').disabled=locked||technicalBusy;$('#continueOrderList').disabled=locked||technicalBusy;$('#releaseChecks').disabled=locked||technicalBusy;$('#releaseOrder').hidden=true;$('#reviseOrder').hidden=!locked||viewingRelease||['sent','accepted'].includes(doc.factoryTracking?.stage);
 const stage=doc.factoryTracking?.stage;if(stage)$('#workflowStatus').textContent+=' · '+({checked:'CONFERIDO · NÃO ENVIADO',sent:'ENVIADO · AGUARDANDO ACEITE',accepted:'ACEITO PELA FÁBRICA · BLOQUEADO',returned:'DEVOLVIDO PARA CORREÇÃO',draft:'EM PREPARAÇÃO'}[stage]||stage);
 $('#releaseOrder').disabled=technicalBusy||issues.length>0||!profile||!['Art','List','Technical'].every(key=>$('#check'+key).checked);$('#reviseOrder').disabled=technicalBusy;
 $('#releaseHistory').innerHTML=(w.history||[]).map(entry=>'<p>Revisão '+entry.revision+' · '+esc(entry.name)+' · '+esc(new Date(entry.at).toLocaleString('pt-BR'))+' <button class="text-link" data-history="'+entry.revision+'">Abrir cópia liberada</button></p>').join('')||'<p>Nenhuma revisão liberada.</p>';
 if(viewingRelease)$('#releaseHistory').innerHTML+='<button id="backToCurrent" class="outline-button">Voltar ao pedido atual</button>';
 renderTechnicalFiles();
}
for(const e of $$('#releaseChecks input'))e.addEventListener('change',renderOverview);
async function workflowAction(action){
 try{
  if(technicalBusy)throw new Error('Aguarde o envio do arquivo técnico terminar.');
  const checks={art:$('#checkArt').checked,list:$('#checkList').checked,technical:$('#checkTechnical').checked};
  const start=revision;if(action==='release'&&!await save(true))return;
  if(action==='release'&&(revision!==start||dirty))throw new Error('O pedido mudou. Confira novamente antes de liberar.');
  $('#orderEditor').disabled=true;
  $('#releaseOrder').disabled=$('#reviseOrder').disabled=true;
  const {order}=await api('/api/production-orders/'+encodeURIComponent(id),{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({document:doc,version,action,checks})});
  await openSavedOrder(order.id);orderStage='review';render();updateOrderGuide(action==='release');toast(action==='release'?'Pedido conferido. Agora você pode enviar à fábrica.':'Nova revisão aberta. A liberação anterior permanece no histórico.');if(action==='release')packageInvitePending=true;return true;
 }catch(e){error(e.message);return false;}finally{$('#reviseOrder').disabled=false;renderOverview();}
}
$('#releaseOrder').addEventListener('click',()=>workflowAction('release'));
$('#reviseOrder').addEventListener('click',()=>workflowAction('revise'));
$('#releaseHistory').addEventListener('click',async event=>{
 try{if(event.target.id==='backToCurrent')return await openSavedOrder(id);const button=event.target.closest('[data-history]');if(!button||!id||!await canSwitch())return;const {order}=await api('/api/production-orders/'+encodeURIComponent(id)+'?revision='+button.dataset.history);await replaceDocument(order.document,{...order,viewingRelease:true});}catch(e){error(e.message);}
});

function orderEditable(){return !viewingRelease&&doc.workflow?.status!=='released'&&!['sent','accepted'].includes(doc.factoryTracking?.stage);}
function updateOrderGuide(created=false){orderGuide.update({kind:'order',id,title:doc.number||doc.title,created,completed:doc.workflow?.status==='released',locked:!orderEditable(),message:!orderEditable()?'Esta revisão está protegida. Consulte o envio e o aceite no painel. Para alterar uma revisão apenas conferida, use Iniciar nova revisão.':undefined});}
async function orderWorkflowAction(action){
 if(action==='tracking'){if(await canSwitch())window.top.location.href='/acompanhamento';return;}
 if(!orderEditable())throw new Error('Esta revisão está protegida. Abra uma nova revisão antes de anexar informações.');
 if(!await save(true))return;const destination=id,generation=orderGeneration;
 if(action==='list-new')return continueToList();
 if(action==='presentation-new'){window.top.location.href=workflowRoute('presentation',{orderId:id,itemId:product().id})+'&create=1';return;}
 if(action==='list-existing'){
  const {lists}=await api('/api/order-lists'),selected=await workflowChoose({title:'Qual lista anexar a este pedido?',description:'As diferenças serão mostradas antes de aplicar. Os dados técnicos e desenhos existentes serão preservados.',items:lists.filter(list=>list.reviewed).map(list=>({id:list.id,label:list.title+' · '+list.rowCount+' itens'}))});if(!selected)return;
  const {list}=await api('/api/order-lists/'+encodeURIComponent(selected));if(id!==destination||generation!==orderGeneration)throw new Error('O pedido aberto mudou. Escolha novamente a lista.');
  if(!list.reviewed||list.document.unresolved?.length||list.document.rows.some(row=>listProblems(row).length))throw new Error('Esta lista tem pendências. Confira os itens no organizador.');
  if(await applyOrderList(list.document.rows,{name:list.title,id:list.id,version:list.version})){await save(true);updateOrderGuide(false);}return;
 }
 if(action==='presentation-existing'){
  projects=(await api('/api/projects')).projects;
  const selected=await workflowChoose({title:'Qual apresentação anexar?',description:'Somente apresentações com arte salva aparecem aqui. Em seguida, escolha a peça do pedido.',items:projects.filter(p=>p.reviewed&&p.hasMap&&p.thumbnailUrl).map(p=>({id:p.id,label:p.name+' · V'+p.version}))});if(!selected)return;
  if(id!==destination||generation!==orderGeneration)throw new Error('O pedido aberto mudou. Escolha novamente a apresentação.');await attachWorkflowProject(selected);return;
 }
}
async function attachWorkflowProject(projectId,itemId=null){
 if(!orderEditable())throw new Error('Esta revisão está protegida. Abra uma nova revisão antes de anexar o desenho.');
 const generation=orderGeneration,items=doc.pages.flatMap(page=>page.products.map(p=>({page,p})));let target=itemId?items.find(item=>item.p.id===itemId)?.p:null;
 if(itemId&&!target)throw new Error('A peça de origem não está mais neste pedido. Escolha a peça correta no editor.');
 if(!target&&items.length===1&&!items[0].p.images.some(Boolean))target=items[0].p;
 if(!target){const selected=await workflowChoose({title:'Em qual peça aplicar o desenho?',description:'A apresentação será anexada somente à peça escolhida. Se ela já tiver um mockup, ele será substituído.',confirmLabel:'Anexar a esta peça',items:items.map(({page,p})=>({id:p.id,label:[page.title,p.type,p.model].filter(Boolean).join(' · ')}))});if(!selected)return false;target=items.find(item=>item.p.id===selected)?.p;}
 if(generation!==orderGeneration||!target)throw new Error('O pedido mudou. Escolha novamente a peça.');
 const selected=projects.find(p=>p.id===projectId);if(target.projectRef?.id===projectId&&target.projectRef.version===selected?.version){toast('Esta apresentação já está anexada nesta versão.');return true;}
 await attachProject(target,projectId);changed();render();if(!await save(true))return false;toast('Apresentação anexada. Você pode adicionar a lista ou concluir os dados do pedido.');return true;
}

function applyVisualEdit(edit){
 const target=doc.pages.find(page=>page.id===edit.page.id),p=target?.products.find(product=>product.id===edit.productId);if(!target||!p||!orderEditable())throw new Error('O pedido ou a peça mudou. Abra o editor novamente.');
 target.visual=edit.page.visual?structuredClone(edit.page.visual):undefined;target.mode=edit.page.mode;target.imageArea=edit.page.imageArea;target.annotations=structuredClone(edit.page.annotations||[]);target.freeComponents=Boolean(edit.page.freeComponents);
 const source=edit.page.products.find(product=>product.id===edit.productId);if(edit.applicationId&&source.technical&&p.technical)p.technical.applications=structuredClone(source.technical.applications);for(const member of target.products){const incoming=edit.page.products.find(item=>item.id===member.id);if(incoming?.technical&&member.technical&&edit.applicationId)member.technical.applications=structuredClone(incoming.technical.applications);}syncConfirmedApplicationPositions(target);for(const member of edit.applicationId?[p]:target.products)for(const app of member.technical?.applications||[]){if(!app.position.trim()&&(target.annotations||[]).some(a=>a.applicationId===app.id))app.position='Conforme seta no desenho';}p.images=source.images;p.imageTransforms=source.imageTransforms;
 const affected=target.visual?.mode==='shared'?target.products:[p];let anchors=false;for(const item of affected){if(edit.sourceChanged)delete item.projectRef;for(const component of item.components){if(component.anchor){anchors=true;delete component.anchor;}}}
 changed();render();toast(anchors?'Imagem ajustada. Reposicione as setas dos componentes na nova composição.':'Imagem e enquadramento aplicados no pedido.');
}

$('#productEditor').addEventListener('change',event=>{if(event.target.id==='familyVariant'){productIndex=Number(event.target.value);render();}});

function applicationTargets(){return doc.pages.flatMap((pg,pi)=>pieceFamilies(pg).map(f=>({page:pg,product:f[0],pi,index:pg.products.indexOf(f[0]),key:pg.id+'|'+f[0].id})));}
function renderUnifiedApplications(){
 const targets=applicationTargets(),selected=$('#applicationTarget').value;
 $('#applicationTarget').innerHTML=targets.map(t=>'<option value="'+esc(t.key)+'"'+(t.key===selected?' selected':'')+'>'+esc((doc.pages.length>1?(t.page.title||'Desenho '+(t.pi+1))+' · ':'')+t.product.type)+'</option>').join('');
 const rows=targets.flatMap(t=>applicationGroups(t.page,t.product).map(group=>{const chosen=group.find(x=>x.product.technical.fit==='INFANTIL'&&x.app.type==='TPU ALTO RELEVO'&&!x.app.exception)||group[0];return {pg:t.page,p:chosen.product,a:chosen.app};}));
 $('#allApplications').innerHTML=rows.map(({pg,p,a})=>'<div class="catalog-application"><strong>'+esc(a.type)+'</strong><p>'+esc(p.type)+' · '+a.perUnit+' por peça · '+(a.position?'Seta confirmada':'Posicione e confirme a seta')+'</p><div class="row-actions"><button type="button" class="outline-button" data-edit-order-application="'+esc(a.id)+'" data-application-product="'+esc(p.id)+'" data-application-page="'+esc(pg.id)+'">Editar aplicação e seta</button><button type="button" class="text-link" data-remove-order-application="'+esc(a.id)+'" data-application-product="'+esc(p.id)+'" data-application-page="'+esc(pg.id)+'">Remover</button></div></div>').join('')||'<p class="helper">Nenhuma aplicação extra. Se não precisar, continue para a lista.</p>';
 $('#addOrderApplication').disabled=!orderEditable()||!targets.length;
}
function chooseApplicationTarget(pageId,productId){const pi=doc.pages.findIndex(pg=>pg.id===pageId),index=doc.pages[pi]?.products.findIndex(p=>p.id===productId);if(pi<0||index<0)throw Error('Esta peça mudou. Escolha novamente.');pageIndex=pi;productIndex=index;}
$('#addOrderApplication').addEventListener('click',()=>{try{const target=applicationTargets().find(t=>t.key===$('#applicationTarget').value);if(!target)return;chooseApplicationTarget(target.page.id,target.product.id);visualTools.openImageEditor({create:true});}catch(e){error(e.message);}});
$('#freeOrderAnnotation').addEventListener('click',()=>{try{const target=applicationTargets().find(t=>t.key===$('#applicationTarget').value);if(!target)return;chooseApplicationTarget(target.page.id,target.product.id);visualTools.openImageEditor();}catch(e){error(e.message);}});
$('#allApplications').addEventListener('click',event=>{const b=event.target.closest('[data-application-product]');if(!b||!orderEditable())return;try{chooseApplicationTarget(b.dataset.applicationPage,b.dataset.applicationProduct);if(b.dataset.editOrderApplication)visualTools.openImageEditor({applicationId:b.dataset.editOrderApplication});else{const group=applicationGroups(page(),product()).find(g=>g.some(x=>x.app.id===b.dataset.removeOrderApplication))||[],ids=new Set(group.map(x=>x.app.id));for(const member of page().products)if(member.technical)member.technical.applications=member.technical.applications.filter(a=>!ids.has(a.id));syncApplicationArrows(page(),product());changed();render();}}catch(e){error(e.message);}});
function offerFinalReview(){if(doc.listSource&&orderEditable()&&!doc.technicalFiles?.length){showOrderStage('files');return;}if(!doc.listSource||!orderEditable()||!reviewReady()||$('#readyReviewDialog').open)return;finalInvite={document:doc,generation:orderGeneration,revision};$('#readyReviewDialog').showModal();}
$('#reviewLater').addEventListener('click',()=>{$('#readyReviewDialog').close();finalInvite=null;});
$('#reviewNow').addEventListener('click',()=>{const invite=finalInvite;$('#readyReviewDialog').close();finalInvite=null;if(!invite||invite.document!==doc||invite.generation!==orderGeneration||invite.revision!==revision)return;showOrderStage('review');});
$('#launchFinalReview').addEventListener('click',()=>showOrderStage('review'));
