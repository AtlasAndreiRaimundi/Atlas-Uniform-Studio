import {setupCatalogListForm} from './catalog-list-ui.js';
import {FITS} from './product-catalog.js';
import {createWorkflowGuide,workflowChoose,workflowOrders,canonicalWorkflowPath} from './workflow-guide.js?v=3';
import {workflowRoute,canAttachToOrder,linkedWorkflowOrders,suggestListName} from './workflow-contract.js?v=2';
import {LIST_FIELDS, listFields, listPieces, IMPORT_FIELDS, GROUP_TYPES, LIST_SIZES, ORDER_LIMITS, PIECE_TYPES, normalizeListRow, listProblems, sortListRows, listSummary, prepareListText, prepareListSheets, needsListMapping, parseListMatrix, parseListFreeText, detectListHeader} from './order-list.js?v=7';
import {normalizeKey,kitComponents,isBottomProduct} from './order-core.js?v=3';
import {loadExcelLibrary, readOrderWorkbook, writeListWorkbook} from './order-files.js?v=5';

const $=selector=>document.querySelector(selector),$$=selector=>[...document.querySelectorAll(selector)];
const EXAMPLE='Tipo;Nome;Número;Tam. Camiseta;Tam. Calção;Quantidade;Adicional\nLinha;João;07;P;M;2;CAPITÃO\nLinha;Carlos;10;M;M;4;\nLinha;Ana;09;BLP;P;1;PROFESSORA\nGoleiro;Pedro;01;TAM10;TAM12;3;O+';
let mode='manual',records=[],unresolved=[],fileSource=null,mappingSource=null,organizedSource=null,busy=false,page=0,editing=null,detailsId=null,lastAction=null,dirty=false,draftDirty=false,toastTimer;
const PAGE_SIZE=50,urls={},disabledControls=new Map();
const catalogManual=setupCatalogListForm($('#manualForm'));
const listParams=new URLSearchParams(location.search);let orderTarget=listParams.get('order'),orderContext=null;
let listChecked=false,listOrders=[],listProjects=[];
let listSourceName='',savedListId=null,savedListVersion=0,listRevision=0,listSavePromise=null,listAutoTimer,listConflict=false,listAccount=null;
let localSequence=0,listLinkedOrders=[];
const listGuide=createWorkflowGuide({mount:'#workflowNextStep',onAction:listWorkflowAction});
const id=()=>globalThis.crypto?.randomUUID?.()||`list-${Date.now().toString(36)}-${++localSequence}`;
const node=(tag,className,text)=>{const e=document.createElement(tag);if(className)e.className=className;if(text!==undefined)e.textContent=String(text);return e;};
const opt=(value,label=value)=>{const e=node('option','',label);e.value=String(value);return e;};
const button=(text,style,action)=>{const e=node('button',style,text);e.type='button';e.addEventListener('click',action);return e;};
const defaults=()=>({catalogVersion:3,produto:$('#orderProduct').value,modelo:$('#orderModel').value.trim(),cor:$('#orderColor').value.trim(),grupo:$('#manualGroup').value,quantidade:1});
function toast(text){clearTimeout(toastTimer);$('#orderToast').textContent=text;$('#orderToast').hidden=false;toastTimer=setTimeout(()=>$('#orderToast').hidden=true,5000);}
function sourceError(message=''){$('#sourceError').textContent=message;$('#sourceError').hidden=!message;}
function markChanged(){listChecked=false;listGuide.hide();dirty=true;listRevision++;queueListSave();$('#exportFileLink').hidden=true;if(urls.export){URL.revokeObjectURL(urls.export);delete urls.export;}}
function saveUndo(){lastAction={records:structuredClone(records),unresolved:structuredClone(unresolved)};$('#undoBtn').hidden=false;}
function setMode(next){mode=next;for(const tab of $$('[data-input]')){const active=tab.dataset.input===next;tab.classList.toggle('active',active);tab.setAttribute('aria-selected',String(active));$(`#${tab.dataset.input}InputPanel`).hidden=!active;}const source=next==='file'?fileSource:mappingSource?.text===$('#orderText').value?mappingSource:null;$('#importActions').hidden=next==='manual'||next==='file'&&source===organizedSource;$('#mappingPanel').hidden=next==='manual'||source===organizedSource||!needsListMapping(source);sourceError();}
function setBusy(value){busy=value;if(value){for(const control of $$('button,input,select,textarea')){disabledControls.set(control,control.disabled);control.disabled=true;}}else{for(const [control,disabled] of disabledControls)control.disabled=disabled;disabledControls.clear();syncProduct();}$('#organizeBtn').textContent=value?'Preparando…':'Organizar lista →';renderStats();}
function sizeSelect(select){
  select.append(opt('','Selecione'));
  for(const fit of FITS){const group=node('optgroup');group.label=fit.shirt;for(const size of fit.sizes){const value=fit.id==='FEMININA'?'BL'+size:size.replaceAll(' ','');group.append(opt(value));}select.append(group);}
  select.append(opt('ESPECIAL','TAMANHO ESPECIAL'));
}
function setSelect(select,value){if(value&&![...select.options].some(o=>o.value===value))select.append(opt(value));select.value=value||'';}
function syncProduct(clear=false){
  catalogManual.sync($('#orderProduct').value);
  const product=$('#orderProduct').value,isBottom=isBottomProduct(product),kit=kitComponents(product),shirtKit=['Camiseta','Calção','Kit'].includes(product);
  $('#manualTop').disabled=busy||isBottom&&!shirtKit;$('#manualBottom').disabled=busy||!isBottom&&!kit&&!shirtKit;
  $('#topSizeLabel').textContent=`Tam. ${kit?kit[0]:!isBottom?product:'Camiseta'}`;
  $('#bottomSizeLabel').textContent=`Tam. ${kit?kit[1]:isBottom?product:'Calção'}`;
  $('#templateProductHint').textContent=`Modelo para: ${product==='Kit'?'Kit · camiseta + calção':product}. A peça escolhida fica salva no Excel.`;
  if(clear){if(isBottom)$('#manualTop').value='';if(!isBottom&&!kit)$('#manualBottom').value='';}
}
function detectManualKit(){
  const select=$('#orderProduct');
  if(['Camiseta','Calção'].includes(select.value)&&$('#manualTop').value&&$('#manualBottom').value){select.value='Kit';syncProduct();toast('Kit de camiseta + calção selecionado. Cada peça mantém seu tamanho.');}
}
function resetManual(){catalogManual.reset();catalogManual.sync($('#orderProduct').value);editing=null;draftDirty=false;$('#manualName').value='';$('#manualNumber').value='';$('#manualAdditional').value='';$('#manualQuantity').value='1';$('#manualError').hidden=true;$('#cancelEditBtn').hidden=true;$('#addManualBtn').textContent='Adicionar';$('#manualHint').textContent='Preencha camiseta e calção para montar um kit automaticamente. Nome, número e adicional são opcionais. BL = Baby Look. TAM = Infantil.';renderStats();}
function manualRow(){return normalizeListRow({...catalogManual.read(),grupo:$('#manualGroup').value,nome:$('#manualName').value,numero:$('#manualNumber').value,adicional:$('#manualAdditional').value,tamanhoCamiseta:$('#manualTop').value,tamanhoCalcao:$('#manualBottom').value,quantidade:$('#manualQuantity').value,produto:$('#orderProduct').value,modelo:$('#orderModel').value,cor:$('#orderColor').value},{},{sheet:'Criação manual',text:'Item preenchido manualmente.'});}
function editRow(row){
  if(draftDirty&&editing!==row.id)return toast('Salve ou descarte o item em preenchimento antes de editar outro.');
  editing=row.id;catalogManual.restore(row);setMode('manual');setSelect($('#orderProduct'),row.produto);$('#orderModel').value=row.modelo;$('#orderColor').value=row.cor;syncProduct();
  setSelect($('#manualGroup'),row.grupo);$('#manualName').value=row.nome;$('#manualNumber').value=row.numero;$('#manualAdditional').value=row.adicional||'';setSelect($('#manualTop'),row.tamanhoCamiseta);setSelect($('#manualBottom'),row.tamanhoCalcao);$('#manualQuantity').value=row.quantidade??'';
  $('#addManualBtn').textContent='Salvar item';$('#cancelEditBtn').hidden=false;$('#manualHint').textContent='Editando o item selecionado. Salve para atualizar a lista e o resumo.';$('#manualError').hidden=true;draftDirty=true;renderStats();$('#manualForm').scrollIntoView({behavior:'smooth',block:'center'});$('#manualName').focus();
}
function showDetails(row){detailsId=row.id;setSelect($('#detailProduct'),row.produto);$('#detailModel').value=row.modelo;$('#detailColor').value=row.cor;$('#detailSource').textContent=row.source?.text?`Origem: ${row.source.sheet||'Lista'}${row.source.row?` · linha ${row.source.row}`:''}\n${row.source.text}`:'Item criado manualmente.';$('#rowDetails').showModal();}
function renderRows(){
  const fields=listFields(records);$('#listTopSizeLabel').textContent=fields[3][1];$('#listBottomSizeLabel').textContent=fields[4][1];
  const query=normalizeKey($('#searchOrders').value),filtered=records.filter(row=>!query||normalizeKey([...LIST_FIELDS.map(([key])=>row[key]),row.modelo,row.cor,row.produto].join(' ')).includes(query));
  page=Math.min(page,Math.max(0,Math.ceil(filtered.length/PAGE_SIZE)-1));const start=page*PAGE_SIZE,host=$('#ordersBody');host.replaceChildren();
  for(const row of filtered.slice(start,start+PAGE_SIZE)){
    const tr=node('tr'),problems=listProblems(row);tr.classList.toggle('has-issues',!!problems.length);
    for(const [field] of LIST_FIELDS){const td=node('td','',field==='numero'?(row.numero||'Sem número'):row[field]??'—');if(field==='nome'){
      td.replaceChildren(node('span','',row.nome||'Sem nome'));
      const context=[row.produto,row.modelo,row.cor,...(row.catalogVersion===3?[listPieces(row).map(p=>(p.quantity??row.quantidade)+' '+p.product.toLowerCase()+'(s)').join(' / '),row.modelagemCamiseta,row.modelagemCalcao,...(row.produto==='Kit'?['Calção: '+(row.nomeCalcao||'sem nome')+' / '+(row.semNumeroCalcao?'sem número':row.numero||'sem número')]:[]),...(row.semNumeroCamiseta?['Camiseta sem número']:[])]:[])].filter(Boolean).join(' · ');td.append(node('small','row-context',context));
    }tr.append(td);}
    const actions=node('td','simple-row-actions');actions.append(button('Editar','text-link',()=>editRow(row)),button('Detalhes','text-link',()=>showDetails(row)),button('×','remove-order',()=>{
      if(editing===row.id)resetManual();saveUndo();records=records.filter(item=>item.id!==row.id);markChanged();render();toast('Item removido. Você pode desfazer.');
    }));actions.lastChild.setAttribute('aria-label',`Remover ${row.nome||'item sem nome'}`);
    if(problems.length){const warning=node('span','row-warning','Conferir');warning.title=problems.join('\n');actions.prepend(warning);}tr.append(actions);host.append(tr);
  }
  if(!filtered.length){const tr=node('tr'),td=node('td','empty-table',records.length?'Nenhum item para esta busca.':'Sua lista começa aqui. Adicione o primeiro item acima.');td.colSpan=8;tr.append(td);host.append(tr);}
  $('#pageStatus').textContent=filtered.length?`${start+1}–${Math.min(start+PAGE_SIZE,filtered.length)} de ${filtered.length} itens`:'';
  $('#previousPageBtn').disabled=page===0;$('#nextPageBtn').disabled=start+PAGE_SIZE>=filtered.length;
  $('.pagination').hidden=filtered.length<=PAGE_SIZE;
}
function renderStats(){
  const summary=listSummary(records),pending=summary.invalid+unresolved.length;
  $('#recordCount').textContent=`${records.length} ${records.length===1?'item':'itens'}`;$('#pieceCount').textContent=summary.pieces;$('#kitCount').textContent=summary.kits;$('#issueCount').textContent=`${pending} pendência(s)`;
  for(const control of $$('[data-export-orders]'))control.disabled=busy||!records.length||!!pending||draftDirty;
  $('#copySummaryBtn').disabled=busy||!records.length||!!pending||draftDirty;
  $('#exportHelp').textContent=draftDirty?'Há um item em preenchimento. Clique em Adicionar ou Salvar item antes de baixar.':pending?'Ajuste os itens em Conferência para liberar o Excel e o resumo.':records.length?'O Excel inclui os campos por peça e o resumo de produção. A busca não reduz a exportação.':'Comece adicionando um item.';
  return summary;
}
function renderSummary(){
  const summary=listSummary(records),host=$('#summaryCards');host.replaceChildren();
  for(const section of summary.sections){const card=node('article','quantity-card');card.append(node('pre','',section.text));host.append(card);}
  $('#summaryText').value=summary.text;
  $('#summaryNotice').textContent=summary.invalid||unresolved.length?'Resumo parcial. Corrija as pendências para fechar as quantidades.':draftDirty?'O item em preenchimento ainda não entrou no resumo.':records.length?`${summary.pieces} peças no total. Cada peça é contada separadamente no próprio tamanho.`:'Adicione itens para ver as quantidades por tamanho.';
  $('#summaryPlain').hidden=!summary.text;
}
function renderReview(){
  const host=$('#reviewList');host.replaceChildren();$('#reviewPanel').hidden=!unresolved.length&&!records.some(row=>listProblems(row).length);
  records.filter(row=>listProblems(row).length).slice(0,100).forEach(row=>{const card=node('div','review-card'),text=node('div');text.append(node('strong','',row.nome||'Item sem nome'),node('p','',listProblems(row).join('\n')));card.append(text,button('Corrigir item','outline-button',()=>editRow(row)));host.append(card);});
  unresolved.slice(0,100).forEach(pending=>{
    const card=node('div','review-card'),text=node('div');text.append(node('strong','',`${pending.sheet} · linha ${pending.row}`),node('p','',pending.text),node('p','',pending.reason));const actions=node('div');
    actions.append(button('Preencher item','outline-button',()=>{if(records.length>=ORDER_LIMITS.rows)return toast('O limite é de 5.000 itens.');saveUndo();const row={...normalizeListRow({},defaults(),pending),id:id()};records.push(row);unresolved=unresolved.filter(item=>item.id!==pending.id);markChanged();render();editRow(row);}),button('É uma observação','text-link',()=>{saveUndo();unresolved=unresolved.filter(item=>item.id!==pending.id);markChanged();render();}));card.append(text,actions);host.append(card);
  });
  if(unresolved.length>100)host.append(node('p','helper',`Exibindo 100 de ${unresolved.length} trechos. Ajuste as colunas da origem para reconhecer os demais.`));
}
function render(){renderStats();renderRows();renderSummary();renderReview();$('#listHeading').textContent=$('#orderTitle').value.trim()||'Itens da lista';}

function renderMappings(source){
  mappingSource=source;const host=$('#sheetMappings');host.replaceChildren();const needsMapping=source!==organizedSource&&needsListMapping(source);$('#mappingPanel').hidden=mode==='manual'||!needsMapping;if(!needsMapping)return;
  $('#mappingStatus').textContent='Não reconhecemos todas as colunas. Confira a importação.';$('#mappingDetails').open=true;
  for(const sheet of source.sheets){
    const detail=node('details','sheet-mapping'),summary=node('summary'),enabled=document.createElement('input');enabled.type='checkbox';enabled.checked=sheet.enabled!==false;enabled.setAttribute('aria-label',`Usar aba ${sheet.name}`);enabled.addEventListener('click',event=>event.stopPropagation());enabled.addEventListener('change',()=>sheet.enabled=enabled.checked);summary.append(enabled,node('strong','',sheet.name),node('span','',`${Math.max(0,sheet.rows.length-1)} linhas`));detail.append(summary);detail.open=sheet.enabled!==false&&sheet.headerRow<0;
    const headerLabel=node('label','header-choice','Linha dos títulos'),header=document.createElement('select');header.setAttribute('aria-label',`Cabeçalho de ${sheet.name}`);header.append(opt(-1,'Sem cabeçalho'));sheet.rows.slice(0,30).forEach((row,i)=>header.append(opt(i,`${row.rowNumber||i+1} · ${row.filter(Boolean).join(' / ').slice(0,65)}`)));header.value=sheet.headerRow;header.addEventListener('change',()=>{sheet.headerRow=Number(header.value);sheet.mapping=sheet.headerRow<0?{}:detectListHeader([sheet.rows[sheet.headerRow]]).mapping;renderMappings(source);});headerLabel.append(header);detail.append(headerLabel);
    const grid=node('div','mapping-grid'),columns=Math.max(0,...sheet.rows.slice(0,100).map(r=>r.length));
    for(const [key,label] of IMPORT_FIELDS){const field=node('label','',label),select=document.createElement('select');select.setAttribute('aria-label',`${label} na aba ${sheet.name}`);select.append(opt(-1,'Não usar / não informado'));for(let col=0;col<columns;col++)select.append(opt(col,`${col+1} · ${sheet.rows[sheet.headerRow]?.[col]||`Coluna ${col+1}`}`));select.value=sheet.mapping[key]??-1;select.addEventListener('change',()=>{if(Number(select.value)<0)delete sheet.mapping[key];else sheet.mapping[key]=Number(select.value);});field.append(select);grid.append(field);}detail.append(grid);host.append(detail);
  }
}
async function importFile(file){
  if(!file||busy)return;sourceError();if(file.size>ORDER_LIMITS.bytes)return sourceError('Use um arquivo de até 10 MB.');const extension=file.name.split('.').at(-1).toLowerCase();if(!['xlsx','csv','tsv','txt'].includes(extension))return sourceError('Use XLSX, CSV, TSV ou TXT. Salve arquivos XLS antigos como XLSX.');
  let autoImport=false;
  setBusy(true);$('#sourceSummary').textContent=`Lendo ${file.name}…`;
  try{const data=await file.arrayBuffer();fileSource=extension==='xlsx'?{free:false,sheets:prepareListSheets(await readOrderWorkbook(data,await loadExcelLibrary()))}:prepareListText(new TextDecoder('utf-8',{fatal:true}).decode(data));fileSource.file=file.name;
    const template=fileSource.sheets?.find(sheet=>sheet.template)?.template;
    const recognized=!fileSource.free&&!needsListMapping(fileSource);
    $('#sourceSummary').textContent=template?`${file.name} · modelo reconhecido · ${template.defaults.produto}`:recognized?`${file.name} · colunas reconhecidas`:`${file.name} · pronto para organizar`;
    if(template?.title&&!$('#orderTitle').value.trim())$('#orderTitle').value=template.title;
    if(template&&!draftDirty){setSelect($('#orderProduct'),template.defaults.produto);$('#orderModel').value=template.defaults.modelo;$('#orderColor').value=template.defaults.cor;syncProduct(true);}
    setMode('file');renderMappings(fileSource);autoImport=recognized&&!draftDirty;
  }
  catch(error){fileSource=null;mappingSource=null;$('#mappingPanel').hidden=true;$('#sourceSummary').textContent='';sourceError(error instanceof TypeError?'Salve o texto como UTF-8 e tente novamente.':error.message);}
  finally{setBusy(false);$('#orderFile').value='';}
  if(autoImport)organize();
}
function organize(){
  if(busy)return;sourceError();if(draftDirty)return sourceError('Adicione ou cancele o item em preenchimento antes de importar outra lista.');
  try{
    let source;if(mode==='file'){if(!fileSource)throw new Error('Escolha uma planilha.');source=fileSource;}else{const text=$('#orderText').value;if(!text.trim())throw new Error('Cole a lista para organizar.');source=mappingSource?.text===text?mappingSource:prepareListText(text);renderMappings(source);}
    const sheets=source.sheets?.filter(s=>s.enabled!==false)||[];if(!source.free&&!sheets.length)throw new Error('Selecione uma aba com os pedidos.');
    if(sheets.some(s=>!Object.keys(s.mapping).length))throw new Error('Abra Ajustar colunas e indique as colunas da lista.');
    const parts=source.free?[parseListFreeText(source.text,defaults())]:sheets.map(sheet=>parseListMatrix(sheet,defaults())),next=parts.flatMap(p=>p.records),pending=parts.flatMap(p=>p.unresolved);
    if(next.length>ORDER_LIMITS.rows)throw new Error('Use até 5.000 itens por lista.');
    saveUndo();records=sortListRows(next.map(row=>({...row,id:id()})));unresolved=pending.map(row=>({...row,id:id()}));page=0;$('#searchOrders').value='';organizedSource=source;
    if(records.length&&PIECE_TYPES.includes(records[0].produto)&&records.every(row=>row.produto===records[0].produto)){setSelect($('#orderProduct'),records[0].produto);syncProduct();}
    renderMappings(source);setMode(mode);markChanged();render();
    if(!records.length&&!unresolved.length){setMode('manual');toast('Modelo em branco carregado. Adicione os itens manualmente.');}else{toast(`${records.length} itens organizados. Confira a lista e o resumo.`);$('#results').scrollIntoView({behavior:'smooth',block:'start'});}
  }catch(error){sourceError(error.message);}
}
function download(bytes,name,target){if(urls[target])URL.revokeObjectURL(urls[target]);const url=URL.createObjectURL(new Blob([bytes],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'}));urls[target]=url;const link=$(`#${target}FileLink`);link.href=url;link.download=name;link.hidden=false;const a=node('a');a.href=url;a.download=name;a.hidden=true;document.body.append(a);a.click();a.remove();}

for(const selector of ['#orderProduct','#detailProduct'])['Camiseta','Calção','Kit'].forEach(p=>$(selector).append(opt(p,p==='Kit'?'Kit · camiseta + calção':p)));
GROUP_TYPES.forEach(g=>$('#manualGroup').append(opt(g)));sizeSelect($('#manualTop'));sizeSelect($('#manualBottom'));syncProduct();
$$('[data-input]').forEach(tab=>tab.addEventListener('click',()=>setMode(tab.dataset.input)));
function draftChanged(){listGuide.hide();clearTimeout(listAutoTimer);detectManualKit();draftDirty=true;$('#cancelEditBtn').hidden=false;$('#cancelEditBtn').textContent=editing?'Cancelar edição':'Descartar preenchimento';renderStats();renderSummary();}
$('#manualForm').addEventListener('input',draftChanged);$('#manualForm').addEventListener('change',draftChanged);
$('#manualForm').addEventListener('submit',event=>{
  event.preventDefault();if(busy)return;detectManualKit();const row=manualRow(),problems=listProblems(row);if(problems.length){$('#manualError').textContent=problems.join(' ');$('#manualError').hidden=false;return;}
  if(!editing&&records.length>=ORDER_LIMITS.rows)return toast('O limite é de 5.000 itens.');saveUndo();
  if(editing){const previous=records.find(r=>r.id===editing);row.id=editing;row.source=previous.source;records=records.map(r=>r.id===editing?row:r);}else records.push({...row,id:id()});
  records=sortListRows(records);markChanged();resetManual();$('#searchOrders').value='';page=0;render();$('#manualName').focus();
});
$('#cancelEditBtn').addEventListener('click',()=>{resetManual();if(dirty)queueListSave();$('#manualTop').value='';$('#manualBottom').value='';render();});
$('#newManualBtn').addEventListener('click',()=>{setMode('manual');$('#manualForm').scrollIntoView({behavior:'smooth',block:'center'});$('#manualName').focus();});
$('#orderProduct').addEventListener('change',()=>{syncProduct(true);markChanged();if(editing){draftDirty=true;renderStats();}});
for(const selector of ['#orderModel','#orderColor'])$(selector).addEventListener('input',()=>{markChanged();if(editing){draftDirty=true;renderStats();}});
$('#orderTitle').addEventListener('input',()=>{markChanged();$('#listHeading').textContent=$('#orderTitle').value.trim()||'Itens da lista';});
$('#orderFile').addEventListener('change',event=>importFile(event.target.files?.[0]));$('#organizeBtn').addEventListener('click',organize);
$('#orderDrop').addEventListener('dragover',event=>{event.preventDefault();$('#orderDrop').classList.add('dragging');});$('#orderDrop').addEventListener('dragleave',()=>$('#orderDrop').classList.remove('dragging'));$('#orderDrop').addEventListener('drop',event=>{event.preventDefault();$('#orderDrop').classList.remove('dragging');importFile(event.dataTransfer.files?.[0]);});
$('#loadExampleBtn').addEventListener('click',()=>{$('#orderText').value=EXAMPLE;mappingSource=null;setMode('text');toast('Exemplo carregado. Clique em Organizar lista para testar.');});
$('#orderText').addEventListener('input',()=>{if(mappingSource?.text!==$('#orderText').value)$('#mappingPanel').hidden=true;});
$('#undoBtn').addEventListener('click',()=>{if(!lastAction)return;records=lastAction.records;unresolved=lastAction.unresolved;lastAction=null;$('#undoBtn').hidden=true;resetManual();markChanged();render();});
$('#searchOrders').addEventListener('input',()=>{page=0;renderRows();});$('#previousPageBtn').addEventListener('click',()=>{page--;renderRows();});$('#nextPageBtn').addEventListener('click',()=>{page++;renderRows();});
$('#closeDetailsBtn').addEventListener('click',()=>$('#rowDetails').close());
$('#detailsForm').addEventListener('submit',event=>{event.preventDefault();const row=records.find(r=>r.id===detailsId);if(!row)return;saveUndo();row.produto=$('#detailProduct').value;row.modelo=$('#detailModel').value.trim();row.cor=$('#detailColor').value.trim();markChanged();render();$('#rowDetails').close();});
$('#copySummaryBtn').addEventListener('click',async()=>{const summary=listSummary(records);if(summary.invalid||unresolved.length||draftDirty)return;try{await navigator.clipboard.writeText(summary.text);toast('Resumo copiado. Pronto para colar no WhatsApp.');}catch{$('#summaryPlain').open=true;$('#summaryText').focus();$('#summaryText').select();toast('Selecionei o resumo. Use Ctrl+C para copiar.');}});
async function exportOrders(){
  if(busy||!records.length||draftDirty||unresolved.length||records.some(r=>listProblems(r).length))return;
  setBusy(true);for(const control of $$('[data-export-orders]')){control.textContent='Exportando…';control.setAttribute('aria-busy','true');}
  try{
    const title=$('#orderTitle').value.trim()||'Pedido',bytes=await writeListWorkbook(records,await loadExcelLibrary(),{title});
    download(bytes,`atlas-${normalizeKey(title).replace(/\s+/g,'-').slice(0,80)||'pedido'}.xlsx`,'export');toast('Planilha exportada em Excel, com a lista e o resumo das peças.');
  }catch(error){toast(error.message);}
  finally{
    for(const control of $$('[data-export-orders]')){control.textContent='Exportar planilha ↓';control.removeAttribute('aria-busy');}
    setBusy(false);
  }
}
$$('[data-export-orders]').forEach(control=>control.addEventListener('click',exportOrders));
$('#downloadTemplateBtn').addEventListener('click',async()=>{if(busy)return;setBusy(true);try{const selected=defaults();download(await writeListWorkbook([],await loadExcelLibrary(),{template:true,defaults:selected,title:$('#orderTitle').value.trim()||'Pedido'}),`Atlas_Modelo_${normalizeKey(selected.produto).replace(/\s+/g,'_')}.xlsx`,'template');toast('Modelo pronto, com instruções. Nome, número e adicional vazios significam sem personalização nesses campos.');}catch(error){toast(error.message);}finally{setBusy(false);}});
window.addEventListener('beforeunload',event=>{if(dirty||draftDirty){event.preventDefault();event.returnValue='';}});
async function listApi(path,options){
 const response=await fetch(path,{...options,cache:'no-store'});const data=await response.json();
 if(!response.ok){const error=new Error(data.error||'Não foi possível salvar a lista.');error.status=response.status;throw error;}return data;
}
function listDocument(){return {schema:1,title:$('#orderTitle').value.trim()||'Nova lista',defaults:defaults(),links:{orderId:$('#listOrderLink').value,projectId:$('#listProjectLink').value},sourceName:fileSource?.file||listSourceName||'',rows:structuredClone(records),unresolved:structuredClone(unresolved)};}
function saveLocalList(){if(!listAccount)return;try{localStorage.setItem('meinerz-list-draft:'+listAccount,JSON.stringify({id:savedListId,version:savedListVersion,document:listDocument(),dirty}));}catch{}}
function queueListSave(){
 saveLocalList();clearTimeout(listAutoTimer);$('#listSaveStatus').textContent='Alterações na lista…';
 if(listAccount&&!listConflict)listAutoTimer=setTimeout(()=>saveList(false),1600);
}
async function refreshLists(){
 const {lists}=await listApi('/api/order-lists');$('#savedLists').replaceChildren(opt('','Selecione uma lista…'),...lists.map(list=>opt(list.id,`${list.title} · ${list.rowCount} itens`)));if(savedListId)$('#savedLists').value=savedListId;
}
async function saveList(explicit=true,complete=false){
 if(listSavePromise){const ok=await listSavePromise;return ok&&(complete||dirty&&explicit)?saveList(explicit,complete):ok;}
 if(!listAccount)return false;
 if(draftDirty){if(explicit)toast('Adicione ou descarte o item em preenchimento antes de sair.');return false;}
 if(listConflict){if(explicit)toast('A lista mudou em outra aba. Use Salvar como nova para guardar sua edição.');return false;}
 if(complete&&(!listReady()||!$('#orderTitle').value.trim()||/^nova lista$/i.test($('#orderTitle').value.trim()))){toast('Dê um nome à lista, conclua os itens e confira as pendências antes de finalizar.');return false;}
 clearTimeout(listAutoTimer);const created=!savedListId,start=listRevision,payload={document:listDocument(),version:savedListVersion,action:complete?'complete':'save'};$('#saveList').disabled=true;
 listSavePromise=(async()=>{try{
  const {list}=await listApi(savedListId?'/api/order-lists/'+encodeURIComponent(savedListId):'/api/order-lists',{method:savedListId?'PUT':'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
  savedListId=list.id;savedListVersion=list.version;dirty=start!==listRevision;listChecked=Boolean(list.reviewed)&&!dirty&&!draftDirty;updateListGuide(complete);canonicalWorkflowPath(workflowRoute('list',{listId:savedListId,orderId:orderTarget||''}));dirty=start!==listRevision;saveLocalList();$('#listSaveStatus').textContent=dirty?'Há alterações novas para salvar.':(listChecked?'Lista conferida':'Rascunho salvo')+' · versão '+list.version;
  await refreshLists().catch(()=>{});if(explicit)toast(complete&&(dirty||draftDirty)?'Há alterações novas. Conclua e confira novamente.':complete?'Lista pronta e conferida. Escolha a próxima etapa quando quiser.':'Rascunho salvo. Conclua e confira a lista quando estiver pronta.');if(dirty)listAutoTimer=setTimeout(()=>saveList(false),500);return !complete||!dirty&&!draftDirty;
 }catch(error){if(error.status===409)listConflict=true;saveLocalList();$('#listSaveStatus').textContent=error.message;return false;}finally{listSavePromise=null;$('#saveList').disabled=false;}})();return listSavePromise;
}
function loadListDocument(document,meta={}){listLinkedOrders=[];
 clearTimeout(listAutoTimer);savedListId=meta.id||null;savedListVersion=meta.version||0;listConflict=false;listRevision++;dirty=Boolean(meta.dirty);
 const repaired=document.rows.some(row=>row.produto!==normalizeListRow(row).produto);records=document.rows.map(row=>({...row,produto:normalizeListRow(row).produto,adicional:row.adicional||'',id:row.id||id()}));dirty=dirty||repaired;listChecked=Boolean(meta.reviewed||document.review?.state==='checked')&&!dirty;setSelect($('#listOrderLink'),document.links?.orderId||orderTarget||'');setSelect($('#listProjectLink'),document.links?.projectId||'');unresolved=(document.unresolved||[]).map(row=>({...row,id:row.id||id()}));listSourceName=document.sourceName||'';fileSource=null;$('#sourceSummary').textContent='';$('#orderText').value='';mappingSource=organizedSource=null;lastAction=null;$('#undoBtn').hidden=true;page=0;
 $('#orderTitle').value=document.title||'';if(document.defaults?.produto)setSelect($('#orderProduct'),document.defaults.produto);$('#orderModel').value=document.defaults?.modelo||'';$('#orderColor').value=document.defaults?.cor||'';resetManual();syncProduct();setMode('manual');render();saveLocalList();
 updateListGuide(false);if(dirty)queueListSave();
 $('#listSaveStatus').textContent=dirty?'Rascunho recuperado · pendente de salvar':savedListId?'Lista salva na sua conta · versão '+savedListVersion:'Nova lista independente';
}
async function canLeaveList(){if(draftDirty){toast('Adicione ou descarte o item em preenchimento antes de sair.');return false;}return !dirty||await saveList(true);}
$('#saveList').addEventListener('click',()=>saveList(true));
$('#openList').addEventListener('click',async()=>{const selected=$('#savedLists').value;if(!selected||!await canLeaveList())return;setBusy(true);try{const {list}=await listApi('/api/order-lists/'+encodeURIComponent(selected));loadListDocument(list.document,list);}catch(error){toast(error.message);}finally{setBusy(false);syncProduct();}});
$('#newList').addEventListener('click',async()=>{if(!await canLeaveList())return;orderTarget=null;orderContext=null;canonicalWorkflowPath('/organizador?new=1');loadListDocument({title:'',rows:[],unresolved:[],defaults:{produto:'Camiseta'}});setSelect($('#listOrderLink'),'');setSelect($('#listProjectLink'),'');$('#completeList').textContent='Concluir e conferir lista';$('#orderTitle').focus();});
$('#saveListCopy').addEventListener('click',async()=>{if(draftDirty)return toast('Conclua o item em preenchimento.');if(listSavePromise)await listSavePromise;savedListId=null;savedListVersion=0;listConflict=false;listChecked=false;listGuide.hide();dirty=true;listRevision++;await saveList(true);});
$('#continuePresentation').addEventListener('click',async event=>{event.preventDefault();if(await canLeaveList())window.top.location.href=workflowRoute('presentation',{orderId:orderTarget||''})+(orderTarget?'&create=1':'');});
async function transferList(target){
 if(!listChecked||!listReady())throw new Error('Conclua e confira a lista antes de anexar.');
 if(!await canLeaveList())return;if(!savedListId&&!await saveList(true))return;
 window.top.location.href=workflowRoute('order',{orderId:target||'',listId:savedListId,projectId:$('#listProjectLink').value,created:!target,attach:!!$('#listProjectLink').value});
}
function listReady(){return records.length>0&&!draftDirty&&!unresolved.length&&!records.some(row=>listProblems(row).length);}
function updateListGuide(created=false){listGuide.update({kind:'list',id:savedListId,title:$('#orderTitle').value.trim()||'Lista salva',orderId:$('#listOrderLink').value||orderTarget||'',projectId:$('#listProjectLink').value,linkedOrders:listLinkedOrders,created,completed:listChecked&&!dirty&&listReady(),ready:listReady(),message:listReady()?undefined:'Sua lista foi salva. Conclua os itens e as pendências para incorporá-la a um pedido.'});}
async function listWorkflowAction(action){
 if(!listReady())throw new Error('Adicione ou conclua os itens antes de anexar a lista.');
 if(action==='attach-new')return transferList(null);
 if(action==='attach-linked')return transferList($('#listOrderLink').value||orderTarget);
 const orders=(await workflowOrders(listApi)).filter(canAttachToOrder);
 const selected=await workflowChoose({title:'Em qual pedido usar esta lista?',description:'Escolha um pedido em preparação. Pedidos conferidos precisam de uma nova revisão; enviados e aceitos permanecem protegidos.',items:orders.map(order=>({id:order.id,label:(order.number||order.title)+(order.client?' · '+order.client:'')}))});
 if(selected)return transferList(selected);
}
$('#generateProductionOrder').addEventListener('click',async()=>{
 if(orderTarget&&!orderContext)return toast('Aguarde o pedido vinculado carregar.');
 if(!records.length||draftDirty||unresolved.length||records.some(row=>listProblems(row).length))return toast('Conclua a lista e confira os itens antes de usá-la no pedido.');
 if(!listChecked)return toast('Marque a lista como pronta e conferida antes de escolher o pedido.');if($('#listOrderLink').value||orderTarget)return transferList($('#listOrderLink').value||orderTarget);
 setBusy(true);try{const orders=await workflowOrders(listApi);$('#listOrderDestination').replaceChildren(opt('','Criar novo pedido'),...orders.filter(canAttachToOrder).map(order=>opt(order.id,`${order.number||order.title}${order.client?' · '+order.client:''}`)));$('#orderDestination').showModal();}catch(error){toast(error.message);}finally{setBusy(false);syncProduct();}
});
$('#closeOrderDestination').addEventListener('click',()=>$('#orderDestination').close());
$('#orderDestinationForm').addEventListener('submit',async event=>{event.preventDefault();$('#applyListDestination').disabled=true;try{await transferList($('#listOrderDestination').value);}finally{$('#applyListDestination').disabled=false;}});
async function bootLists(){
 setBusy(true);try{
  const data=await listApi('/api/profile');listAccount=data.profile.email||data.profile.id;$('#toolDesigner').textContent=data.profile.displayName;await refreshLists();await refreshListLinks();
  const requested=listParams.get('list');let draft=null;try{draft=JSON.parse(localStorage.getItem('meinerz-list-draft:'+listAccount)||'null');}catch{}
  // Keep an unsaved draft in the account before opening a different entry point.
  if(draft?.dirty){loadListDocument(draft.document,{...draft,dirty:true});if(requested||orderTarget||listParams.get('new')==='1'){if(!await saveList(false))throw new Error('Não foi possível guardar o rascunho recuperado. Salve como nova antes de abrir outra lista.');}}
  if(orderTarget){orderContext=(await listApi('/api/production-orders/'+encodeURIComponent(orderTarget))).order;$('#generateProductionOrder').textContent='Concluir lista e voltar ao pedido →';$('#completeList').textContent='Concluir lista e voltar ao pedido →';$('#resultDescription').textContent='Você pode editar a lista e aplicá-la ao pedido '+(orderContext.number||orderContext.title)+'.';}
  if(requested){const {list}=await listApi('/api/order-lists/'+encodeURIComponent(requested));loadListDocument(list.document,list);}
  else if(orderContext){const {list}=await listApi('/api/production-orders/'+encodeURIComponent(orderTarget)+'/list',{method:'POST'});loadListDocument(list.document,list);}
  else if(listParams.get('new')==='1'){loadListDocument({title:'',rows:[],unresolved:[],defaults:{produto:'Camiseta'}});}
  else if(draft?.document&&!draft.dirty){if(draft.id){const {list}=await listApi('/api/order-lists/'+encodeURIComponent(draft.id));loadListDocument(list.document,list);}else loadListDocument(draft.document,draft);}
  else if(!draft?.dirty)$('#listSaveStatus').textContent='Comece sua lista. As alterações serão salvas na sua conta.';
  if(dirty)listAutoTimer=setTimeout(()=>saveList(false),500);
  if(savedListId){const requestedId=savedListId;workflowOrders(listApi).then(orders=>{if(savedListId===requestedId){listLinkedOrders=linkedWorkflowOrders('list',requestedId,orders);updateListGuide(false);}}).catch(()=>{});}
 }catch(error){sourceError(error.message);$('#listSaveStatus').textContent=error.message;}finally{setBusy(false);syncProduct();}
}
async function refreshListLinks(){
 const orderValue=$('#listOrderLink').value,projectValue=$('#listProjectLink').value;
 const data=await Promise.all([workflowOrders(listApi),listApi('/api/projects')]);listOrders=data[0];listProjects=data[1].projects||[];
 $('#listOrderLink').replaceChildren(opt('','Decidir depois / criar novo pedido'),...listOrders.filter(canAttachToOrder).map(order=>opt(order.id,(order.number||order.title)+(order.client?' · '+order.client:''))));
 $('#listProjectLink').replaceChildren(opt('','Sem apresentação vinculada'),...listProjects.map(project=>opt(project.id,project.name+(project.clientName?' · '+project.clientName:''))));setSelect($('#listOrderLink'),orderValue);setSelect($('#listProjectLink'),projectValue);
}
function suggestedName(){return suggestListName({order:listOrders.find(order=>order.id===$('#listOrderLink').value),presentation:listProjects.find(project=>project.id===$('#listProjectLink').value),product:$('#orderProduct').value,model:$('#orderModel').value.trim(),color:$('#orderColor').value.trim(),source:listSourceName});}
$('#suggestListName').addEventListener('click',()=>{$('#orderTitle').value=suggestedName();markChanged();render();});
for(const field of ['#listOrderLink','#listProjectLink'])$(field).addEventListener('change',()=>{if(!$('#orderTitle').value.trim()||/^nova lista$/i.test($('#orderTitle').value.trim()))$('#orderTitle').value=suggestedName();markChanged();render();});
$('#refreshListLinks').addEventListener('click',()=>refreshListLinks().catch(error=>toast(error.message)));
$('#completeList').addEventListener('click',async()=>{if(!await saveList(true,true))return;const linked=$('#listOrderLink').value||orderTarget;if(linked)return transferList(linked);$('#workflowNextStep').scrollIntoView({behavior:'smooth',block:'center'});});
render();$('#orderProduct').value='Camiseta';syncProduct();
bootLists();
