import * as linked from '../public/order-linked-applications.js';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import * as core from '../public/production-core.js';
import * as composition from '../public/order-composition.js';
import * as sheets from '../public/production-sheet.js';
import * as workflow from '../public/workflow-contract.js';
import {newRecordId} from '../public/record-id.js';
import * as catalog from '../public/product-catalog.js';
import * as listTools from '../public/order-list.js';

// A DOM fixture for the actual order page and controller. It honors ancestors,
// hidden panels and closed details so navigation is tested beyond the HTML text.
async function orderScreen({search='',initialDraft=null,chooseInitial=true}={}){
 let document;
 const decode=s=>s.replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&amp;/g,'&');
 class Element{
  constructor(tag='div'){this.tagName=tag.toUpperCase();this.dataset={};this.listeners={};this.style={};this.attributes={};this.children=[];this.value='';this.checked=false;this.disabled=false;this.hidden=false;this.open=false;this.classes=new Set();this.classList={toggle:(key,force)=>{if(force??!this.classes.has(key))this.classes.add(key);else this.classes.delete(key);},add:key=>this.classes.add(key),remove:key=>this.classes.delete(key)};}
  get options(){return this.children.flatMap(child=>child.tagName==='OPTION'?[child]:child.options);}
  get value(){return this._value||(this.tagName==='SELECT'?(this.options.find(o=>o.selected)||this.options[0])?.value||'':'');}set value(v){this._value=v;}add(option){this.append(option);}
  setAttribute(name,value){this.attributes[name]=String(value);if(name==='id')this.id=value;if(name==='class')this.classes=new Set(value.split(/\s+/));if(name==='value')this.value=decode(value);if(name==='type')this.type=value;if(name.startsWith('data-'))this.dataset[name.slice(5).replace(/-([a-z])/g,(_,c)=>c.toUpperCase())]=decode(value);if(['hidden','open','checked','disabled','selected'].includes(name))this[name]=true;}
  removeAttribute(name){delete this.attributes[name];if(['hidden','open','checked','disabled','selected'].includes(name))this[name]=false;}
  set innerHTML(html){this.html=html;this.children=[];const stack=[this];for(const token of html.matchAll(/<(\/?)([\w-]+)\b([^>]*)>/g)){const [,closing,tag,attrs]=token;if(closing){const at=stack.findLastIndex(e=>e.tagName===tag.toUpperCase());if(at>0)stack.length=at;continue;}const e=new Element(tag);for(const [,name,double,single,bare] of attrs.matchAll(/([\w:-]+)(?:=(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g))e.setAttribute(name,double??single??bare??'');stack.at(-1).appendChild(e);if(!['AREA','BASE','BR','COL','EMBED','HR','IMG','INPUT','LINK','META','PARAM','SOURCE','TRACK','WBR'].includes(e.tagName)&&!attrs.endsWith('/'))stack.push(e);}}
  get innerHTML(){return this.html||'';}
  after(...nodes){const index=this.parent.children.indexOf(this);for(const node of nodes)node.parent=this.parent;this.parent.children.splice(index+1,0,...nodes);}
  before(...nodes){const index=this.parent.children.indexOf(this);for(const node of nodes)node.parent=this.parent;this.parent.children.splice(index,0,...nodes);}
  addEventListener(type,handler){(this.listeners[type]||=[]).push(handler);}
  async emit(type,event={target:this}){event.preventDefault??=()=>{};for(const handler of this.listeners[type]||[])await handler(event);}
  append(...nodes){nodes.forEach(node=>this.appendChild(node));}appendChild(node){node.parent=this;this.children.push(node);}focus(){document.activeElement=this;}scrollIntoView(){}showModal(){this.open=true;}close(){this.open=false;}
  matches(selector){const parts=selector.trim().split(/\s+/),match=(node,part)=>{const checked=part.endsWith(':checked');part=part.replace(/:checked$/,'');if(checked&&!node.checked)return false;if(part.startsWith('#'))return node.id===part.slice(1);if(part.startsWith('.'))return node.classes.has(part.slice(1));const attr=part.match(/^\[([\w-]+)(?:="([^"]*)")?\]$/);if(attr)return attr[1] in node.attributes&&(attr[2]===undefined||node.attributes[attr[1]]===attr[2]);return node.tagName===part.toUpperCase();};let node=this;if(!match(node,parts.pop()))return false;while(parts.length){const part=parts.pop();do{node=node.parent;}while(node&&!match(node,part));if(!node)return false;}return true;}
  closest(selector){let node=this;while(node){if(node.matches(selector))return node;node=node.parent;}return null;}
  querySelectorAll(selector){return this.children.flatMap(child=>[...(child.matches(selector)?[child]:[]),...child.querySelectorAll(selector)]);}
  querySelector(selector){return this.querySelectorAll(selector)[0]||null;}
 }
 const root=new Element();root.innerHTML=await readFile(new URL('../public/pedido.html',import.meta.url),'utf8');document={body:root,activeElement:null,createElement:tag=>new Element(tag),getElementById:id=>root.querySelector('#'+id),addEventListener(){},querySelector:s=>root.querySelector(s),querySelectorAll:s=>root.querySelectorAll(s)};
 const previewCalls=[],calls=[],timers=new Map(),destination={location:{href:''}};let timerId=0;const context=vm.createContext({...core,...catalog,...composition,...linked,newRecordId,legacyNewOrder:core.newOrder,legacyNewPage:core.newPage,legacyNewProduct:core.newProduct,legacyNewKitPage:core.newKitPage,LEGACY_PRODUCTS:core.PRODUCTS,...sheets,...workflow,...listTools,document,crypto,structuredClone,FormData,File,Blob,URL,URLSearchParams,Option:function(text,value){const e=new Element('option');e.textContent=text;e.value=value;return e;},location:{search},window:{top:destination,addEventListener(){}},setTimeout:(handler,delay)=>{const key=++timerId;timers.set(key,{handler,delay});return key;},clearTimeout:key=>timers.delete(key),createOrderVisualTools:()=>({openImageEditor(){previewCalls.push({mode:"layout"});},openFinalPreview(options={}){previewCalls.push(structuredClone(options));}}),createWorkflowGuide:()=>({update(){}}),canonicalWorkflowPath(){},fetch:async path=>initialDraft&&path.startsWith('/api/')?{ok:true,json:async()=>path==='/api/profile'?{profile:{email:'designer@test',displayName:'Designer'}}:{orders:[],lists:[],projects:[]}}:{ok:false,json:async()=>({error:'Entre na conta'})}});
 const catalogUI=(await readFile(new URL('../public/product-catalog-ui.js',import.meta.url),'utf8')).replace(/^import .*;\r?\n/gm,'').replace(/^export /gm,'');Object.assign(context,vm.runInContext('(function(){'+catalogUI+';return {catalogTypeField,catalogModelFields,catalogFabricFields,catalogFinishFields,catalogSpecialFields,setupCatalogEditor};})()',context));
 const code=(await readFile(new URL('../public/production-ui.js',import.meta.url),'utf8')).replace(/^import .*;\r?\n/gm,'');vm.runInContext(code,context);if(initialDraft){context.recoveredDraft=structuredClone(initialDraft);context.draftCopies=[];vm.runInContext('localDraft=async(value)=>{if(value){draftCopies.push(structuredClone(value));return;}return recoveredDraft;};',context);}for(let i=0;i<8;i++)await new Promise(setImmediate);
 const find=s=>{const el=document.querySelector(s);assert.ok(el,'control exists: '+s);return el;},all=s=>document.querySelectorAll(s),evaluate=s=>vm.runInContext(s,context),click=async(container,selector)=>find(container).emit('click',{target:find(selector)}),input=async(selector,value)=>{const el=find(selector);el.value=value;await (selector.startsWith('[data-product')?find('#productEditor'):el).emit('input',{target:el});};
 const visible=el=>{for(let current=el;current;current=current.parent){if(current.hidden||current.tagName==='DIALOG'&&!current.open)return false;if(current.parent?.tagName==='DETAILS'&&!current.parent.open&&current!==current.parent.children.find(e=>e.tagName==='SUMMARY'))return false;}return true;};
 if(chooseInitial&&evaluate('initialCompositionState().kind')==='unselected')await evaluate('chooseInitialComposition("single")');
 assert.ok(document.querySelector('#productStepTitle'),'the page completed initialization');
 return {context,document,find,all,evaluate,click,input,visible,calls,destination,timers,previewCalls};
}

async function savedOrderScreen(){
 const screen=await orderScreen(),{context,evaluate,calls}=screen,records=new Map();
 for(const key of ['A','B']){const document=core.demoOrder();document.title='Pedido '+key;document.client='Cliente '+key;records.set(key,{id:key,version:1,title:document.title,client:document.client,number:key+'-2027',tracking:{stage:'draft'},document});}
 context.draftCopies=[];context.paths=[];context.canonicalWorkflowPath=path=>context.paths.push(path);
 evaluate('profile={email:"designer@test",displayName:"Designer"};localDraft=async(value)=>{if(value)draftCopies.push(structuredClone(value));};');
 context.fetch=async(path,options={})=>{
  calls.push({path,options});const key=decodeURIComponent(path.split('/').at(-1)),record=records.get(key);let data,status=200;
  if(path==='/api/production-orders')data={orders:[...records.values()]};
  else if(!record){status=404;data={error:'Pedido não encontrado.'};}
  else if(options.method==='DELETE'){
   if(JSON.parse(options.body).version!==record.version){status=409;data={error:'Este pedido mudou. Feche a confirmação e selecione o pedido novamente antes de excluir.'};}
   else{records.delete(key);data={deleted:true};}
  }else if(options.method==='PUT'){record.document=JSON.parse(options.body).document;record.version++;data={order:record};}
  else data={order:record};
  return {ok:status===200,status,json:async()=>structuredClone(data)};
 };
 context.loaded=structuredClone(records.get('A'));await evaluate('replaceDocument(loaded.document,loaded)');await evaluate('refreshOrders()');calls.length=0;
 return {...screen,records};
}

test('client comes first, composition is chosen in general information before pieces',async()=>{
 const {find,all,evaluate,visible,click}=await orderScreen({chooseInitial:false});
 assert.deepEqual(all('[data-initial-kind]').map(el=>el.dataset.initialKind),['kit','single','pair']);assert.ok(all('[data-initial-kind]').every(el=>!el.checked));assert.equal(visible(find('[data-order="client"]')),true);assert.equal(find('#stageNext').disabled,false);await find('#stageNext').emit('click');assert.equal(evaluate('orderStage'),'general');assert.equal(find('#stageNext').disabled,true);
 await click('#orderStages','[data-order-step="pieces"]');assert.equal(evaluate('orderStage'),'general');assert.match(find('#error').textContent,/Escolha primeiro/);
 const pair=find('[data-initial-kind="pair"]');pair.checked=true;await pair.emit('change');assert.equal(evaluate('doc.compositionKind'),'pair');assert.equal(evaluate('page().mode'),'avulsas');assert.equal(evaluate('page().products.length'),2);assert.equal(evaluate('page().products.some(p=>p.kitGroupId)'),false);assert.equal(visible(find('[data-order="client"]')),false);assert.equal(visible(find('#initialKitPreset')),false);assert.equal(find('#stageNext').disabled,false);
});

test('all three kit presets can be chosen without locking the blank form or inheriting another garment fabric',async()=>{
 const {find,evaluate}=await orderScreen({chooseInitial:false}),kit=find('[data-initial-kind="kit"]');kit.checked=true;await kit.emit('change');
 for(const preset of composition.KIT_PRESETS){find('#initialKitPreset').value=preset.id;await find('#initialKitPreset').emit('change');assert.equal(evaluate('page().products.map(p=>p.type).join()'),preset.types.join());assert.equal(evaluate('page().mode'),'conjunto');assert.equal(find('#initialKitPreset').disabled,false);assert.equal(evaluate('page().products.every(p=>p.kitGroupId===page().id)'),true);}
 assert.equal(evaluate('page().products.some(p=>p.fabric)'),false);assert.equal(evaluate('page().products.every(p=>p.manualTechnical)'),true);
});

test('the model panel selects all fits together, preserves quantities and identifies each editable variant',async()=>{
 const {find,evaluate,click,all}=await orderScreen();await click('#orderStages','[data-order-step="pieces"]');
 for(const fit of ['MASCULINA','FEMININA','INFANTIL']){const control=find('[data-model-fit="'+fit+'"]');control.checked=true;await find('#productEditor').emit('change',{target:control});}
 assert.equal(evaluate('page().products.length'),3);assert.equal(all('[data-model-fit]').filter(el=>el.checked).length,3);assert.equal(evaluate('document.querySelector(\'[data-tech="fit"]\')'),null);
 assert.equal(all('[data-product-index]').length,1);
 evaluate('productIndex=1;render();');assert.equal(find('#currentProductName').textContent,'Camiseta');evaluate('product().quantity=2;product().grade="BABY LOOK\\nP = 2";render();');const before=evaluate('JSON.stringify(doc)');const selected=find('[data-model-fit="FEMININA"]');selected.checked=false;await find('#productEditor').emit('change',{target:selected});assert.equal(evaluate('JSON.stringify(doc)'),before);assert.match(find('#error').textContent,/quantidades ou personalizações/);
});

test('saving assigns the server code to the field, print preview and local draft while preserving newer edits',async()=>{
 const {context,find,evaluate,calls}=await orderScreen();let finish;const pending=new Promise(resolve=>finish=resolve);
 assert.ok('readonly' in find('[data-order="number"]').attributes);
 context.draftCopies=[];evaluate('profile={email:"designer@test",displayName:"Designer"};doc.title="Pedido novo";doc.client="Equipe";localDraft=async(value)=>{if(value)draftCopies.push(structuredClone(value));};');
 context.fetch=async(path,options={})=>{calls.push({path,options});if(options.method==='POST'){await pending;return {ok:true,json:async()=>({order:{id:'NEW',version:1,number:'0042-10-MNZ'}})};}return {ok:true,json:async()=>({orders:[]})};};
 const save=evaluate('save(true)');await new Promise(setImmediate);evaluate('doc.notes="EDIÇÃO DURANTE O SALVAMENTO";changed();');finish();assert.equal(await save,true);
 assert.equal(evaluate('doc.number'),'0042-10-MNZ');assert.equal(find('[data-order="number"]').value,'0042-10-MNZ');assert.match(find('#sheet').innerHTML,/Nº 0042-10-MNZ/);assert.equal(context.draftCopies.at(-1).document.number,'0042-10-MNZ');assert.equal(evaluate('dirty'),true);assert.equal(evaluate('doc.notes'),'EDIÇÃO DURANTE O SALVAMENTO');
 assert.equal(JSON.parse(calls.find(call=>call.options.method==='POST').options.body).document.number,'');
});

test('the real order screen preserves existing piece data and saves before opening its named list',async()=>{
 const {context,find,evaluate,calls,destination}=await orderScreen();
 assert.ok(find('#continueOrderList').listeners.click.length);
 await find('#addKit').emit('click');assert.equal(evaluate('page().products.length'),2);assert.equal(evaluate('page().mode'),'conjunto');
 evaluate('product().extraApplications=["DTF"];');
 assert.equal(evaluate('product().extraApplications.join()'),'DTF');assert.equal(evaluate('page().products[1].extraApplications.length'),0);
 evaluate('product().notes="Preservar";doc.title="KIT EDGE 2027 · Equipe A";doc.client="Equipe A";profile={email:"owner@test",displayName:"Designer"};localDraft=async()=>null;');
 context.fetch=async(path,options={})=>{calls.push({path,options});let data={orders:[]};if(path==='/api/production-orders'&&options.method==='POST')data={order:{id:'ORDER-1',version:1}};else if(path==='/api/production-orders/ORDER-1/list')data={list:{id:'LIST-1',title:'KIT EDGE 2027 · Equipe A'}};return {ok:true,json:async()=>data};};
 await find('#continueOrderList').emit('click');assert.equal(destination.location.href,'/organizador?order=ORDER-1&list=LIST-1');
 assert.equal(calls[0].path,'/api/production-orders');const payload=JSON.parse(calls[0].options.body);assert.equal(payload.document.title,'KIT EDGE 2027 · Equipe A');assert.deepEqual(payload.document.pages[0].products[0].extraApplications,['DTF']);assert.equal(payload.document.pages[0].products[0].notes,'Preservar');
 assert.ok(calls.some(c=>c.path==='/api/production-orders/ORDER-1/list'&&c.options.method==='POST'));
});

test('order sectors and piece steps show one subject at a time and preserve inputs when navigating a kit',async()=>{
 const {find,all,evaluate,click,input,visible,previewCalls}=await orderScreen();
 assert.deepEqual(all('[data-order-stage]').filter(visible).map(el=>el.dataset.orderStage),['identity']);assert.equal(all('input').filter(visible).length,5);assert.equal(visible(find('#orderPreview')),false);
 const initial=evaluate('JSON.stringify(doc)');await find('#openAddPiece').emit('click');assert.equal(find('#addPieceDialog').open,true);await find('#closeAddPiece').emit('click');assert.equal(evaluate('JSON.stringify(doc)'),initial,'opening and cancelling the chooser creates no piece');
 await find('#addKit').emit('click');assert.equal(evaluate('doc.pages.length'),1,'the empty placeholder is replaced by the kit');assert.deepEqual(all('[data-order-stage]').filter(visible).map(el=>el.dataset.orderStage),['pieces']);assert.deepEqual(all('[data-product-panel]').filter(visible).map(el=>el.dataset.productPanel),['model']);
 await input('[data-product="model"]','KIT EDGE 2027');await find('#productEditor').emit('click',{target:find('[data-product-next]')});assert.deepEqual(all('[data-product-panel]').filter(visible).map(el=>el.dataset.productPanel),['fabric']);
 find('[data-tech="fabricId"]').value='DRY';await find('#productEditor').emit('change',{target:find('[data-tech="fabricId"]')});assert.equal(all('[data-extra-application]').length,0);
 await click('#productEditor','[data-product-step="art"]');assert.equal(visible(find('[data-image-source-panel="manual"]')),true);assert.equal(visible(find('[data-image-source-panel="presentation"]')),false);await click('#productEditor','[data-image-source="presentation"]');assert.equal(visible(find('[data-image-source-panel="manual"]')),false);assert.equal(visible(find('[data-image-source-panel="presentation"]')),true);
 assert.equal(all('[data-product-step]').some(el=>el.dataset.productStep==='quantities'),false);
 await click('#productEditor','[data-product-next]');assert.equal(evaluate('product().type'),'Calção');assert.equal(evaluate('productStage'),'model');assert.equal(find('#currentProductName').textContent,'Calção');await input('[data-product="model"]','CALÇÃO EDGE');
 await click('#productEditor','[data-product-step="art"]');await click('#productEditor','[data-product-next]');assert.equal(evaluate('orderStage'),'personalization');assert.equal(visible(find('[data-piece-art]')),false);assert.equal(visible(find('[data-piece-personalization]')),true);await find('#stageNext').emit('click');assert.equal(evaluate('orderStage'),'list');assert.deepEqual(all('[data-order-stage]').filter(visible).map(el=>el.dataset.orderStage),['list']);
 assert.equal(evaluate('doc.pages[0].products[0].model'),'KIT EDGE 2027');assert.equal(evaluate('doc.pages[0].products[0].fabric'),'DRY');assert.equal(evaluate('doc.pages[0].products[0].extraApplications.length'),0);assert.equal(evaluate('doc.pages[0].products[1].quantity'),0,'quantities await the list');
 const saved=evaluate('JSON.stringify(doc)'),revision=evaluate('revision');await click('#orderStages','[data-order-step="pieces"]');await find('#toggleOrderPreview').emit('click');assert.equal(visible(find('#orderPreview')),false);assert.equal(previewCalls.at(-1).mode,'draft');await click('#orderStages','[data-order-step="review"]');assert.deepEqual(all('[data-order-stage]').filter(visible).map(el=>el.dataset.orderStage),['pieces']);assert.equal(visible(find('#orderOverview')),false);await click('#orderStages','[data-order-step="identity"]');assert.equal(visible(find('#orderPreview')),false);assert.equal(evaluate('JSON.stringify(doc)'),saved);assert.equal(evaluate('revision'),revision,'navigation must not dirty or save the order');
});

test('adding individual pieces keeps page choices explicit and a protected revision remains unchanged',async()=>{
 const {find,evaluate,click}=await orderScreen();
 find('#newProductType').value='Camiseta';await find('#addProduct').emit('click');assert.equal(evaluate('doc.pages.length'),1);assert.equal(evaluate('product().type'),'Camiseta');evaluate('product().model="Treino";');
 find('#newProductType').value='Calção';await find('#addProduct').emit('click');assert.equal(evaluate('doc.pages.length'),2,'a second individual piece gets a separate page by default');assert.equal(evaluate('page().mode'),'individual');
 find('#newProductSamePage').checked=true;find('#newProductType').value='Camiseta';evaluate('product().model="Jogo";');await find('#addProduct').emit('click');assert.equal(evaluate('doc.pages.length'),2);assert.equal(evaluate('page().products.length'),2);assert.equal(evaluate('page().mode'),'avulsas');
 evaluate('page().visual={mode:"shared",image:"data:image/png;base64,AAAA"};');await find('#openAddPiece').emit('click');find('#newProductSamePage').checked=true;await find('#addProduct').emit('click');assert.equal(evaluate('page().products.length'),2);assert.equal(find('#addPieceDialog').open,true);assert.match(find('#addPieceError').textContent,/imagem única para duas peças/);await find('#closeAddPiece').emit('click');
 evaluate('doc.workflow={status:"released",revision:1,history:[]};');await evaluate('replaceDocument(doc)');assert.equal(evaluate('orderStage'),'review');assert.equal(find('#orderEditor').disabled,true);const released=evaluate('JSON.stringify(doc)');await find('#addKit').emit('click');await click('#orderStages','[data-order-step="identity"]');assert.equal(evaluate('JSON.stringify(doc)'),released);assert.equal(find('#saveOrder').disabled,true);
});

test('the list action reveals missing identification instead of focusing a hidden field',async()=>{
 const {document,find,evaluate,click}=await orderScreen();await click('#orderStages','[data-order-step="list"]');await find('#continueOrderList').emit('click');assert.equal(evaluate('orderStage'),'identity');assert.equal(document.activeElement,find('[data-order="title"]'));assert.match(find('#error').textContent,/nome ao pedido/);
 evaluate('doc.title="Time";');await click('#orderStages','[data-order-step="list"]');await find('#continueOrderList').emit('click');assert.equal(evaluate('orderStage'),'identity');assert.equal(document.activeElement,find('[data-order="client"]'));
});

test('the first step selects one shirt or a complete kit without duplicating placeholders or losing customer data',async()=>{
 const {find,evaluate,input}=await orderScreen(),pageId=evaluate('page().id');
 await input('[data-order="title"]','Equipe EDGE');await input('[data-order="client"]','Cliente A');
 const choose=async kind=>{const radio=find('[data-initial-kind="'+kind+'"]');radio.checked=true;await radio.emit('change');};
 await choose('kit');assert.equal(evaluate('orderStage'),'identity');assert.equal(evaluate('doc.pages.length'),1);assert.equal(evaluate('doc.pages[0].products.map(p=>p.type).join()'),'Camiseta,Calção');assert.equal(evaluate('page().mode'),'conjunto');assert.equal(evaluate('page().id'),pageId);assert.equal(find('#initialSecondTypeField').hidden,false);
 await input('#initialFirstType','Calção');await input('#initialSecondType','Camiseta');assert.equal(evaluate('page().products.map(p=>p.type).join()'),'Calção,Camiseta');
 await choose('single');assert.equal(evaluate('page().products.length'),1);assert.equal(evaluate('product().type'),'Calção');assert.equal(evaluate('page().mode'),'individual');assert.equal(find('#initialSecondTypeField').hidden,true);assert.equal(evaluate('doc.title'),'Equipe EDGE');assert.equal(evaluate('doc.client'),'Cliente A');
 await choose('kit');assert.equal(evaluate('page().products.length'),2);await find('#stageNext').emit('click');assert.equal(evaluate('orderStage'),'general');await find('#stageNext').emit('click');assert.equal(evaluate('orderStage'),'information');await find('#stageNext').emit('click');assert.equal(evaluate('orderStage'),'pieces');await input('[data-product="model"]','KIT EDGE 2027');
 const prepared=evaluate('JSON.stringify(doc)');assert.equal(find('[data-initial-kind="single"]').disabled,true);await choose('single');assert.equal(evaluate('JSON.stringify(doc)'),prepared,'the initial selector cannot discard configured pieces');
 await evaluate('replaceDocument(newOrder())');assert.equal(find('[data-initial-kind="single"]').checked,false);assert.equal(find('[data-initial-kind="kit"]').disabled,false);
});

test('names, numbers and additional text come from the list after the redundant forms are removed',async()=>{
 const {document,find,evaluate,click}=await orderScreen();
 assert.equal(document.querySelector('[data-extra-application]'),null);assert.equal(document.querySelector('#extraApplicationsSummary'),null);assert.equal(document.querySelector('#namesText'),null);assert.equal(document.querySelector('[data-action="sync-names"]'),null);
 find('[data-initial-kind="kit"]').checked=true;await find('[data-initial-kind="kit"]').emit('change');
 await evaluate('applyOrderList([{produto:"Kit",grupo:"Linha",nome:"Ana",numero:"07",adicional:"CAPITÃ / O+",tamanhoCamiseta:"M",tamanhoCalcao:"G",quantidade:2}],{name:"Lista EDGE"})');
 assert.ok(evaluate('validateOrder(doc).length')>0,'new catalog data remains pending until technical choices are completed');assert.equal(evaluate('doc.pages.length'),1);assert.equal(evaluate('page().products.length'),2);assert.equal(evaluate('page().products[0].names[0].number'),'07');assert.equal(evaluate('page().products[1].names[0].additional'),'CAPITÃ / O+');assert.equal(evaluate('page().products[0].quantity'),2);
 await click('#orderStages','[data-order-step="list"]');assert.equal(document.querySelector('#namesText'),null);assert.match(find('#stageDescription').textContent,/automaticamente/);
 const printed=evaluate('buildSheets(doc,{}, {draft:true}).flatMap(s=>s.ops.filter(o=>o.kind==="text").map(o=>o.text)).join(" ")');assert.match(printed,/Ana/);assert.match(printed,/07/);assert.match(printed,/CAPITÃ \/ O\+/);
});

test('order deletion names the selected order and cancelling preserves its unsaved draft',async()=>{
 const {find,evaluate,calls,timers}=await savedOrderScreen();evaluate('dirty=true;doc.notes="Ainda não salvo";');const before=evaluate('JSON.stringify(doc)');
 await find('#deleteOrder').emit('click');assert.equal(find('#deleteOrderDialog').open,true);assert.equal(find('#deleteOrderName').textContent,'Pedido A');assert.match(find('#deleteOrderMeta').textContent,/A-2027.*Cliente A/);assert.equal(find('#deleteDraftWarning').hidden,false);assert.equal(find('#confirmOrderDeletion').disabled,false);
 assert.equal(calls.filter(c=>c.options.method==='DELETE').length,0);assert.equal(await evaluate('save(false)'),false,'autosave pauses while this order is awaiting deletion');
 await find('#deleteOrderDialog').emit('cancel');assert.equal(find('#deleteOrderDialog').open,false);assert.equal(evaluate('JSON.stringify(doc)'),before);assert.equal(evaluate('dirty'),true);assert.equal(evaluate('id'),'A');assert.equal(calls.filter(c=>c.options.method==='DELETE').length,0);assert.ok([...timers.values()].some(t=>t.delay===1600),'cancellation resumes autosave');
});

test('deleting the open order clears its local draft and timers without creating a replacement on the server',async()=>{
 const {context,find,evaluate,input,calls,records,timers}=await savedOrderScreen();await input('[data-order="title"]','Pedido alterado');
 assert.ok([...timers.values()].some(t=>t.delay===1600));await find('#deleteOrder').emit('click');await find('#confirmOrderDeletion').emit('click');
 assert.equal(records.has('A'),false);assert.equal(records.has('B'),true);assert.equal(find('#deleteOrderDialog').open,false);assert.equal(evaluate('id'),null);assert.equal(evaluate('version'),0);assert.equal(evaluate('dirty'),false);assert.equal(evaluate('doc.title'),'Novo pedido');assert.equal(evaluate('doc.seller'),'Designer');assert.equal(find('#savedOrders').value,'');assert.ok(!find('#savedOrders').innerHTML.includes('value="A"'));assert.equal(find('#deleteOrder').disabled,true);
 assert.equal(context.draftCopies.at(-1).id,null);assert.equal(context.draftCopies.at(-1).dirty,false);assert.equal(context.paths.at(-1),'/pedidos');assert.equal(find('#pdfLink').hidden,true);
 assert.ok(![...timers.values()].some(t=>[200,500,1600].includes(t.delay)),'old save and draft timers are cancelled');assert.equal(calls.filter(c=>c.options.method==='DELETE').length,1);assert.equal(calls.some(c=>['POST','PUT'].includes(c.options.method)),false);
});

test('deleting a different saved order preserves the open draft, pins the target and rejects duplicate confirmation',async()=>{
 const {context,find,evaluate,calls,records}=await savedOrderScreen();evaluate('doc.notes="Rascunho importante";dirty=true;');const before=evaluate('JSON.stringify(doc)');find('#savedOrders').value='B';await find('#savedOrders').emit('change');await find('#deleteOrder').emit('click');assert.equal(find('#deleteOrderName').textContent,'Pedido B');assert.equal(find('#deleteDraftWarning').hidden,true);
 const fetch=context.fetch;let release;context.fetch=async(path,options)=>{if(options?.method==='DELETE')await new Promise(resolve=>{release=resolve;});return fetch(path,options);};
 const removing=find('#confirmOrderDeletion').emit('click');await new Promise(setImmediate);assert.equal(find('#cancelOrderDeletion').disabled,true);await find('#cancelOrderDeletion').emit('click');assert.equal(find('#deleteOrderDialog').open,true);find('#savedOrders').value='A';await find('#confirmOrderDeletion').emit('click');release();await removing;
 assert.equal(records.has('B'),false);assert.equal(records.has('A'),true);assert.equal(evaluate('id'),'A');assert.equal(evaluate('dirty'),true);assert.equal(evaluate('JSON.stringify(doc)'),before);const requests=calls.filter(c=>c.options.method==='DELETE');assert.equal(requests.length,1);assert.equal(requests[0].path,'/api/production-orders/B');
});

test('a changed order requires fresh confirmation and accepted orders cannot be deleted from the selector',async()=>{
 const {find,evaluate,calls,records}=await savedOrderScreen();const before=evaluate('JSON.stringify(doc)');find('#savedOrders').value='B';await find('#savedOrders').emit('change');await find('#deleteOrder').emit('click');records.get('B').version++;
 await find('#confirmOrderDeletion').emit('click');assert.equal(find('#deleteOrderDialog').open,true);assert.match(find('#deleteOrderError').textContent,/pedido mudou/);assert.equal(find('#confirmOrderDeletion').disabled,true);assert.equal(records.size,2);assert.equal(evaluate('JSON.stringify(doc)'),before);await find('#confirmOrderDeletion').emit('click');assert.equal(calls.filter(c=>c.options.method==='DELETE').length,1);await find('#cancelOrderDeletion').emit('click');
 for(const stage of ['accepted']){records.get('B').tracking.stage=stage;await evaluate('refreshOrders()');find('#savedOrders').value='B';await find('#savedOrders').emit('change');assert.equal(find('#deleteOrder').disabled,true);assert.equal(find('#deleteOrderHelp').hidden,false);await find('#deleteOrder').emit('click');assert.equal(find('#deleteOrderDialog').open,false);}
});

test('deletion waits for an in-flight autosave and confirms the resulting version',async()=>{
 const {context,find,evaluate,calls,records,timers}=await savedOrderScreen(),fetch=context.fetch;let release;
 context.fetch=async(path,options)=>{if(options?.method==='PUT')await new Promise(resolve=>{release=resolve;});return fetch(path,options);};evaluate('dirty=true;');const saving=evaluate('save(false)');await new Promise(setImmediate);
 const opening=find('#deleteOrder').emit('click');await new Promise(setImmediate);assert.equal(find('#deleteOrderDialog').open,true);assert.equal(find('#confirmOrderDeletion').disabled,true);assert.equal(calls.some(c=>c.options.method==='DELETE'),false);release();await saving;await opening;
 assert.equal(records.get('A').version,2);assert.equal(find('#confirmOrderDeletion').disabled,false);await find('#confirmOrderDeletion').emit('click');const removed=calls.find(c=>c.options.method==='DELETE');assert.deepEqual(JSON.parse(removed.options.body),{version:2});assert.equal(evaluate('id'),null);assert.equal(evaluate('savePromise'),null);assert.ok(![...timers.values()].some(t=>[500,1600].includes(t.delay)));
});

test('a sent saved order can be deleted with a queue warning and a remotely deleted draft is not recovered',async()=>{
 const {find,evaluate,records,context}=await savedOrderScreen();records.get('A').tracking.stage='sent';await evaluate('refreshOrders()');assert.equal(find('#deleteOrder').disabled,false);
 await find('#deleteOrder').emit('click');assert.equal(find('#deleteSentWarning').hidden,false);assert.equal(find('#confirmOrderDeletion').disabled,false);await find('#cancelOrderDeletion').emit('click');
 const before=evaluate('JSON.stringify(doc)'),fetch=context.fetch;records.delete('A');await evaluate('refreshOrders()');context.fetch=async(path,options)=>path==='/api/production-orders/A'?{ok:false,status:503,json:async()=>({error:'Indisponível'})}:fetch(path,options);
 await evaluate('verifyRecoveredOrder()');assert.equal(evaluate('JSON.stringify(doc)'),before,'temporary failures preserve the local copy');context.fetch=fetch;await evaluate('verifyRecoveredOrder()');assert.equal(evaluate('id'),null);assert.equal(evaluate('dirty'),false);assert.equal(evaluate('doc.title'),'Novo pedido');assert.equal(context.draftCopies.at(-1).id,null);assert.equal(records.has('B'),true);
});

test('initial selection offers garment types while catalog rules and legacy records remain readable',async()=>{
 const {context,find,evaluate,input,visible}=await orderScreen(),pieceId=evaluate('product().id');await input('[data-order="client"]','Equipe A');
 for(const type of ['Camiseta','Calção']){await input('#initialFirstType',type);assert.equal(evaluate('product().type'),type);assert.equal(evaluate('product().id'),pieceId);assert.equal(evaluate('doc.client'),'Equipe A');assert.equal(visible(find('#initialSecondType')),false);}
 assert.ok(['Camiseta','Calção','Jaqueta','Calça','Polo','Bermuda'].every(type=>find('#initialFirstType').options.some(o=>o.value===type)));
 const old=core.newOrder();old.pages[0].products[0].type='Puffer';context.previous=old;await evaluate('replaceDocument(previous,{id:"OLD",version:1})');assert.equal(evaluate('product().type'),'Puffer');assert.equal(find('#initialFirstType').value,'Puffer');assert.match(find('#productEditor').innerHTML,/Cadastro anterior/);
});

test('both kit fields independently select registered products and retain saved references',async()=>{
 const {context,find,evaluate,input}=await orderScreen();find('[data-initial-kind="kit"]').checked=true;await find('[data-initial-kind="kit"]').emit('change');
 await input('#initialFirstType','Calção');await input('#initialSecondType','Camiseta');assert.equal(evaluate('page().products.map(p=>p.type).join()'),'Calção,Camiseta');assert.equal(evaluate('page().products.length'),2);
 const document=JSON.parse(evaluate('JSON.stringify(doc)'));context.reloaded=document;await evaluate('replaceDocument(reloaded,{id:"KIT-1",version:1})');assert.equal(find('#initialFirstType').value,'Calção');assert.equal(find('#initialSecondType').value,'Camiseta');
 await find('#openAddPiece').emit('click');find('#newKitFirstType').value='Camiseta';find('#newKitSecondType').value='Calção';await find('#addKit').emit('click');assert.equal(evaluate('page().products.map(p=>p.type).join()'),'Camiseta,Calção');assert.equal(evaluate('doc.pages.length'),2);
 await find('#openAddPiece').emit('click');find('#newKitSecondType').value=' ';const before=evaluate('JSON.stringify(doc)');await find('#addKit').emit('click');assert.equal(evaluate('JSON.stringify(doc)'),before);assert.equal(find('#addPieceError').hidden,false);
});

test('a kit upload shares one image across both garments and the print, while stale uploads cannot modify another order',async()=>{
 const {context,find,evaluate,input,click}=await orderScreen();find('[data-initial-kind="kit"]').checked=true;await find('[data-initial-kind="kit"]').emit('change');await input('#initialFirstType','Camiseta');await input('#initialSecondType','Calção');evaluate('page().mode="conjunto";render();');await click('#orderStages','[data-order-step="pieces"]');await click('#productEditor','[data-product-step="art"]');
 const image='data:image/png;base64,AAAA';context.imageData=async()=>image;find('#sharedKitImage').files=[{name:'kit.png'}];await find('#productEditor').emit('change',{target:find('#sharedKitImage')});
 assert.equal(evaluate('page().visual.mode'),'shared');assert.equal(evaluate('page().visual.image'),image);assert.equal(evaluate('page().products.length'),2);assert.equal(evaluate('page().products.map(p=>p.type).join()'),'Camiseta,Calção');assert.equal(evaluate('buildSheets(doc,{}, {draft:true})[0].ops.filter(op=>op.imageKey==="shared").length'),1);assert.match(find('#overviewSummary').innerHTML,/Imagem única do kit/);
 await click('#productTabs','[data-product-index="1"]');assert.equal(evaluate('product().type'),'Calção');assert.equal(evaluate('page().visual.image'),image);await click('#productEditor','[data-action="use-individual-images"]');assert.equal(evaluate('page().visual.mode'),'per-product');assert.equal(evaluate('page().visual.image'),image,'switching modes retains the shared artwork for recovery');
 let complete;context.imageData=async()=>new Promise(resolve=>{complete=resolve;});find('#sharedKitImage').files=[{name:'late.png'}];const uploading=find('#productEditor').emit('change',{target:find('#sharedKitImage')});await new Promise(setImmediate);await evaluate('replaceDocument(newOrder())');complete(image);await uploading;assert.equal(evaluate('doc.pages[0].visual'),undefined);assert.match(find('#error').textContent,/pedido ou a peça mudou/);
});

test('the visual order picker shows names and previews and saves the current draft before opening the selected order',async()=>{
 const {find,evaluate,records,calls,click}=await savedOrderScreen();Object.assign(records.get('B'),{title:'Kit Puffer 2027',client:'Equipe Azul',number:'0001-MNZ',updatedAt:'2026-10-23T15:00:00Z'});records.get('B').document.title='Kit Puffer 2027';await evaluate('refreshOrders()');evaluate('dirty=true;doc.notes="Alteração a preservar";');const before=evaluate('JSON.stringify(doc)');
 await find('#openOrderPicker').emit('click');assert.equal(find('#savedOrderPicker').open,true);assert.match(find('#savedOrderCards').innerHTML,/Kit Puffer 2027/);assert.match(find('#savedOrderCards').innerHTML,/Equipe Azul/);assert.match(find('#savedOrderCards').innerHTML,/Em preparação/);assert.match(find('#savedOrderCards').innerHTML,/\/api\/order-tracking\/B\/thumbnail\?version=1/);
 await click('#savedOrderCards','[data-select-order="B"]');assert.equal(find('#savedOrderPicker').open,false);assert.equal(find('#savedOrders').value,'B');assert.equal(evaluate('id'),'A');assert.equal(evaluate('JSON.stringify(doc)'),before,'selection alone never edits or overwrites the current draft');assert.match(find('#selectedOrderSummary').innerHTML,/Kit Puffer 2027/);assert.match(find('#selectedOrderPreview').innerHTML,/\/B\/thumbnail/);
 await find('#openOrder').emit('click');assert.equal(evaluate('id'),'B');assert.equal(evaluate('doc.title'),'Kit Puffer 2027');assert.match(find('#selectedOrderSummary').innerHTML,/Kit Puffer 2027/);const saved=calls.findIndex(call=>call.path==='/api/production-orders/A'&&call.options.method==='PUT'),opened=calls.findIndex(call=>call.path==='/api/production-orders/B'&&!call.options.method);assert.ok(saved>=0&&opened>saved);assert.equal(records.get('A').document.notes,'Alteração a preservar');
});

test('the order picker searches names, filters drafts, paginates previews and retains an identifiable selection when a thumbnail fails',async()=>{
 const {find,all,evaluate,records,click,input}=await savedOrderScreen();for(let i=0;i<16;i++){const order=structuredClone(records.get('A'));Object.assign(order,{id:'DRAFT-'+i,title:'Rascunho '+i,client:'Equipe '+i,version:i+1});order.tracking.stage=i%2?'draft':'checked';records.set(order.id,order);}await evaluate('refreshOrders()');
 await find('#openOrderPicker').emit('click');assert.equal(all('[data-select-order]').length,12);assert.equal(find('#orderPickerNext').disabled,false);await find('#orderPickerNext').emit('click');assert.equal(all('[data-select-order]').length,6);
 await input('#orderPickerSearch','Rascunho 15');assert.equal(all('[data-select-order]').length,1);find('#orderPickerStatus').value='checked';await find('#orderPickerStatus').emit('change');assert.equal(all('[data-select-order]').length,0);find('#orderPickerStatus').value='draft';await find('#orderPickerStatus').emit('change');assert.equal(all('[data-select-order]').length,1);
 const card=find('[data-select-order="DRAFT-15"]'),img=card.querySelector('img');await find('#savedOrderCards').emit('error',{target:img});assert.equal(img.hidden,true);assert.equal(card.querySelector('[data-preview-fallback]').hidden,false);await click('#savedOrderCards','[data-select-order="DRAFT-15"]');assert.equal(find('#savedOrders').value,'DRAFT-15');assert.match(find('#selectedOrderSummary').innerHTML,/Rascunho 15/);assert.equal(evaluate('id'),'A');
 await find('#openOrderPicker').emit('click');assert.equal(find('[data-select-order="DRAFT-15"]').attributes['aria-pressed'],'true');assert.match(find('#orderPickerCount').textContent,/página 2 de 2/);await find('#closeOrderPicker').emit('click');await find('#deleteOrder').emit('click');assert.equal(find('#deleteOrderName').textContent,'Rascunho 15');assert.equal(evaluate('id'),'A','deletion confirmation identifies the selection independently of the open draft');await find('#cancelOrderDeletion').emit('click');
});


test('the review stays closed until required data is complete and opens a readable preview only after explicit completion',async()=>{
 const {find,evaluate,visible,click,input,context,previewCalls}=await orderScreen();
 assert.equal(find('[data-order-step="review"]').disabled,true);assert.equal(visible(find('#releaseChecks')),false);
 await click('#orderStages','[data-order-step="list"]');await find('#stageNext').emit('click');
 assert.equal(evaluate('orderStage'),'list');assert.equal(visible(find('#orderOverview')),false);assert.equal(previewCalls.length,0);assert.match(find('#error').textContent,/Antes de revisar/);
 const complete=core.demoOrder();Object.assign(complete,{orderDate:'2026-10-20',deliveryDate:'2026-11-01'});const second=core.newOrder().pages[0];Object.assign(second.products[0],{type:'Calção',model:'Treino',fabric:'DRY',quantity:1,grade:'CALÇÃO\nM = 1'});complete.pages.push(second);context.complete=complete;await evaluate('replaceDocument(complete,{id:"COMPLETE",version:1})');
 assert.equal(find('[data-order-step="review"]').disabled,false);assert.equal(evaluate('orderStage'),'identity');assert.equal(visible(find('#orderOverview')),false);assert.equal(previewCalls.length,0,'completing or recovering data never opens a modal automatically');
 await evaluate('pageIndex=1;productIndex=0;render()');assert.equal(evaluate('sheets[sheetIndex].sourcePage'),2);assert.equal(evaluate('sheets[sheetIndex].kind'),'sheet');const snapshot=evaluate('JSON.stringify(doc)'),revision=evaluate('revision');await click('#orderStages','[data-order-step="list"]');await find('#stageNext').emit('click');
 assert.equal(evaluate('orderStage'),'review');assert.equal(visible(find('#orderPreview')),true);assert.equal(visible(find('#releaseChecks')),true);assert.equal(previewCalls.at(-1).mode,'review');assert.equal(previewCalls.at(-1).sheet,0,'the final review starts at the first sheet even after editing another piece');assert.ok(!find('#sheet').innerHTML.includes('MOCKUP'),'the completed review shows the same blank area as the printed sheet when the optional image is absent');
 assert.equal(find('#checkArt').checked,false);assert.equal(find('#checkList').checked,false);assert.equal(find('#checkTechnical').checked,false);assert.equal(evaluate('JSON.stringify(doc)'),snapshot);assert.equal(evaluate('revision'),revision,'looking at the review never marks or sends the order');
 for(const id of ['checkArt','checkList','checkTechnical'])find('#'+id).checked=true;
 await click('#orderStages','[data-order-step="identity"]');await input('[data-order="deliveryDate"]','');
 assert.equal(find('[data-order-step="review"]').disabled,true);assert.equal(visible(find('#releaseChecks')),false);for(const id of ['checkArt','checkList','checkTechnical'])assert.equal(find('#'+id).checked,false);
 await click('#orderStages','[data-order-step="review"]');assert.equal(evaluate('orderStage'),'identity');assert.equal(previewCalls.length,1,'invalidating a required field closes access to review without opening another preview');
});


test('the complement dialog names the source and receives a server generated code without changing the original',async()=>{
 const screen=await savedOrderScreen(),{find,evaluate,context,calls,records}=screen,source=structuredClone(records.get('A')),fetch=context.fetch;
 context.fetch=async(path,options={})=>{
  if(!path.endsWith('/complement'))return fetch(path,options);
  calls.push({path,options});const input=JSON.parse(options.body);assert.equal(input.number,undefined);const document=core.complementDocument(source.document,input);document.number='0002-10-MNZ';document.origin={id:'A',number:source.document.number,revision:1};document.workflow={status:'draft',revision:1,history:[]};const order={id:'C',version:1,number:document.number,title:document.title,document,tracking:{stage:'draft'}};records.set('C',order);return {ok:true,json:async()=>structuredClone({order})};
 };
 await find('#startComplement').emit('click');assert.equal(find('#complementDialog').open,true);assert.equal(find('#complementCopyList').checked,false);assert.equal(screen.document.querySelector('#complementNumber'),null);
 find('#complementType').value='COMPLEMENTO COM ALTERAÇÕES';await find('#confirmComplement').emit('click');assert.equal(calls.filter(call=>call.path.endsWith('/complement')).length,0);assert.match(find('#complementError').textContent,/Descreva/);
 find('#complementNotes').value='Acrescentar camisetas';await find('#confirmComplement').emit('click');
 assert.equal(evaluate('id'),'C');assert.equal(evaluate('doc.number'),'0002-10-MNZ');assert.equal(evaluate('doc.origin.id'),'A');assert.equal(evaluate('doc.workflow.status'),'draft');assert.equal(evaluate('orderStage'),'identity');assert.equal(find('#complementDialog').open,false);assert.equal(find('[data-order="previousOrder"]').readOnly,true);assert.equal(evaluate('doc.pages[0].products[0].quantity'),0);assert.deepEqual(records.get('A'),source);
});

test('cancelling a complement preserves the source and makes no creation request',async()=>{
 const {find,evaluate,calls}=await savedOrderScreen();const before=evaluate('JSON.stringify(doc)');await find('#startComplement').emit('click');await find('#cancelComplement').emit('click');assert.equal(find('#complementDialog').open,false);assert.equal(evaluate('JSON.stringify(doc)'),before);assert.equal(calls.some(call=>call.path.endsWith('/complement')),false);
});

test('a CDR upload invalidates the checks and preserves edits made while the file request is in flight',async()=>{
 const {context,find,evaluate,records}=await savedOrderScreen(),fetch=context.fetch;let finish;
 const ref={id:'cdr-1',name:'uniforme.cdr',size:16,sha256:'a'.repeat(64)},pending=new Promise(resolve=>finish=resolve);
 context.fetch=async(path,options={})=>{
  if(!path.endsWith('/technical-files'))return fetch(path,options);
  await pending;const order=records.get('A');order.version++;order.document.technicalFiles=[ref];return {ok:true,json:async()=>structuredClone({order})};
 };
 evaluate('doc.deliveryDate="2099-12-20";orderStage="review";render();');for(const key of ['Art','List','Technical'])find('#check'+key).checked=true;
 find('#technicalFile').files=[new File(['RIFF0000CDRFdata'],'uniforme.cdr')];const upload=find('#technicalFile').emit('change');for(let i=0;i<10;i++)await new Promise(setImmediate);assert.equal(evaluate('technicalBusy'),true);assert.equal(await evaluate('canSwitch()'),false);
 evaluate('doc.contact="Contato atualizado durante envio";changed();');finish();await upload;
 assert.equal(evaluate('technicalBusy'),false);assert.equal(evaluate('doc.contact'),'Contato atualizado durante envio');assert.equal(evaluate('doc.technicalFiles[0].id'),'cdr-1');assert.equal(evaluate('dirty'),true);for(const key of ['Art','List','Technical'])assert.equal(find('#check'+key).checked,false);assert.equal(find('#downloadProductionPackage').disabled,true);
 await evaluate('save(true)');assert.equal(records.get('A').document.contact,'Contato atualizado durante envio');assert.equal(records.get('A').document.technicalFiles[0].id,'cdr-1');
});


test('PDF export keeps the captured order and its list when another order opens while fonts load',async()=>{
 const {context,find,evaluate,records}=await savedOrderScreen();let finish;context.fontGate=new Promise(resolve=>finish=resolve);context.printed=[];context.downloads=[];
 context.createPDF=async sheets=>{context.printed.push(structuredClone(sheets));return new Uint8Array([1]);};
 evaluate('fontAssets=async()=>{await fontGate;assets.fonts={regular:"font",bold:"font"};};script=async()=>({});download=(bytes,name,type,link)=>downloads.push({name,link:link?.id||null});');
 const job=find('#downloadPDF').emit('click');context.other=structuredClone(records.get('B'));context.other.document.number='9999-99-MNZ';await evaluate('replaceDocument(other.document,other)');finish();await job;
 const text=context.printed[0].flatMap(sheet=>sheet.ops.filter(op=>op.kind==='text').map(op=>op.text)).join('\n');assert.match(text,/Cliente A/);assert.doesNotMatch(text,/Cliente B/);assert.deepEqual(context.printed[0].map(sheet=>sheet.kind),['sheet','list']);assert.equal(context.downloads[0].link,null);assert.ok(!context.downloads[0].name.includes('9999'));assert.equal(evaluate('id'),'B');
});


test('page deletion is visible beside the current page and cancellation preserves its data',async()=>{
 const {find,evaluate,click,visible,calls}=await savedOrderScreen();await click('#orderStages','[data-order-step="pieces"]');const before=evaluate('JSON.stringify(doc)');
 assert.equal(visible(find('#removePage')),true);assert.equal(find('#removePage').disabled,false);assert.match(find('#activePageLabel').textContent,/Página 1 de 1/);
 await find('#removePage').emit('click');assert.equal(find('#removePageDialog').open,true);assert.match(find('#removePageName').textContent,/Página 1.*UNIFORME DE JOGO/);assert.match(find('#removePageItems').textContent,/Camiseta.*8 un/);assert.equal(find('#removeLastPageNote').hidden,false);assert.equal(evaluate('JSON.stringify(doc)'),before);
 await find('#removePageDialog').emit('cancel');assert.equal(find('#removePageDialog').open,false);assert.equal(evaluate('JSON.stringify(doc)'),before);assert.equal(calls.length,0);
});

test('confirming a page deletion removes only the pinned page and its printed list',async()=>{
 const {find,evaluate,records,calls}=await savedOrderScreen();evaluate('const another=legacyNewPage("Calção");another.title="REMOVER ESTA";another.products[0].model="MODELO REMOVIDO";another.products[0].quantity=2;another.products[0].grade="CALÇÃO\\nM = 2";doc.pages.push(another);pageIndex=1;productIndex=0;render();');
 const kept=evaluate('JSON.stringify(doc.pages[0])'),oldGeneration=evaluate('orderGeneration');await find('#removePage').emit('click');evaluate('pageIndex=0;render();');await find('#confirmPageRemoval').emit('click');
 assert.equal(evaluate('doc.pages.length'),1);assert.equal(evaluate('JSON.stringify(doc.pages[0])'),kept);assert.equal(evaluate('id'),'A');assert.equal(evaluate('doc.client'),'Cliente A');assert.equal(evaluate('dirty'),true);assert.ok(evaluate('orderGeneration')>oldGeneration);assert.equal(find('#pdfLink').hidden,true);assert.equal(find('#removePageDialog').open,false);
 assert.doesNotMatch(evaluate('buildSheets(doc,{}, {draft:true}).flatMap(s=>s.ops.map(op=>op.text||"")).join(" ")'),/MODELO REMOVIDO|REMOVER ESTA/);await evaluate('save(true)');assert.equal(records.get('A').document.pages.length,1);assert.equal(records.has('B'),true);assert.equal(calls.some(c=>c.options.method==='DELETE'),false);
});

test('the only page can be deleted and leaves one empty page with the order identity intact',async()=>{
 const {find,evaluate}=await savedOrderScreen(),before=evaluate('doc.pages[0].id');await find('#removePage').emit('click');await find('#confirmPageRemoval').emit('click');
 assert.equal(evaluate('doc.pages.length'),1);assert.notEqual(evaluate('doc.pages[0].id'),before);assert.equal(evaluate('product().quantity'),0);assert.equal(evaluate('product().images.length'),0);assert.equal(evaluate('product().names.length'),0);assert.equal(evaluate('doc.client'),'Cliente A');assert.equal(evaluate('id'),'A');assert.equal(evaluate('orderStage'),'pieces');assert.equal(evaluate('productStage'),'model');assert.equal(find('#removePage').disabled,false);
});

test('locked pages and stale page confirmations cannot alter a released or different document',async()=>{
 const {context,find,evaluate}=await savedOrderScreen();evaluate('doc.workflow={status:"released",revision:1};render();');const locked=evaluate('JSON.stringify(doc)');assert.equal(find('#removePage').disabled,true);await find('#removePage').emit('click');assert.equal(find('#removePageDialog').open,false);assert.equal(evaluate('JSON.stringify(doc)'),locked);
 evaluate('delete doc.workflow;render();');await find('#removePage').emit('click');context.replacement=core.demoOrder();context.replacement.title='OUTRO PEDIDO';await evaluate('replaceDocument(replacement,{id:"B",version:1})');const other=evaluate('JSON.stringify(doc)');await find('#confirmPageRemoval').emit('click');assert.equal(evaluate('JSON.stringify(doc)'),other);assert.equal(find('#removePageDialog').open,false);assert.match(find('#error').textContent,/pedido mudou/);
});

test('New order is always visible and cancelling a discard never forces a save',async()=>{
 const {find,evaluate,calls,timers,visible}=await savedOrderScreen();evaluate('doc.notes="INCOMPLETO";dirty=true;conflict=true;');const before=evaluate('JSON.stringify(doc)');assert.equal(visible(find('#newOrder')),true);await find('#newOrder').emit('click');assert.equal(find('#resetOrderDialog').open,true);assert.equal(find('#resetOrderName').textContent,'Pedido A');assert.equal(find('#resetSavedOrderNote').hidden,false);assert.equal(await evaluate('save(false)'),false);assert.equal(calls.length,0);
 await find('#cancelOrderReset').emit('click');assert.equal(find('#resetOrderDialog').open,false);assert.equal(evaluate('JSON.stringify(doc)'),before);assert.equal(evaluate('dirty'),true);assert.ok([...timers.values()].some(t=>t.delay===200),'local draft persistence resumes after cancellation');assert.equal(calls.length,0);
});

test('discard starts a clean order without saving or deleting the old saved order, even after save conflicts',async()=>{
 const {context,find,evaluate,calls,records}=await savedOrderScreen();evaluate('dirty=true;conflict=true;doc.notes="DESCARTAR";doc.listSource={name:"Lista antiga",rows:[]};doc.technicalFiles=[{id:"cdr-antigo",name:"Arte.cdr",size:4}];');const stored=structuredClone(records.get('A').document);
 await find('#newOrder').emit('click');await find('#confirmOrderReset').emit('click');assert.equal(evaluate('id'),null);assert.equal(evaluate('version'),0);assert.equal(evaluate('dirty'),false);assert.equal(evaluate('conflict'),false);assert.equal(evaluate('doc.title'),'Novo pedido');assert.equal(evaluate('doc.client'),'');assert.equal(evaluate('doc.pages.length'),1);assert.equal(evaluate('product().quantity'),0);assert.equal(evaluate('doc.listSource'),undefined);assert.equal(evaluate('doc.technicalFiles'),undefined);assert.equal(evaluate('doc.seller'),'Designer');assert.equal(evaluate('doc.artist'),'Designer');assert.equal(evaluate('orderStage'),'identity');assert.equal(find('#resetOrderDialog').open,false);assert.equal(find('#savedOrders').value,'');assert.equal(find('#pdfLink').hidden,true);
 assert.deepEqual(records.get('A').document,stored);assert.equal(records.has('B'),true);assert.equal(calls.some(c=>['POST','PUT','DELETE'].includes(c.options.method)),false);assert.equal(context.draftCopies.at(-1).id,null);assert.equal(context.draftCopies.at(-1).document.client,'');assert.equal(context.draftCopies.at(-1).dirty,false);assert.equal(context.paths.at(-1),'/pedidos');assert.equal(find('#initialSecondType').value,'Calção');
});

test('discard waits for an in-flight autosave and rejects duplicate confirmation before detaching the old order',async()=>{
 const {context,find,evaluate,calls,timers}=await savedOrderScreen(),fetch=context.fetch;let finish;context.fetch=async(path,options)=>{if(options?.method==='PUT')await new Promise(resolve=>{finish=resolve;});return fetch(path,options);};evaluate('dirty=true;');const saving=evaluate('save(false)');await new Promise(setImmediate);await find('#newOrder').emit('click');const resetting=find('#confirmOrderReset').emit('click');await new Promise(setImmediate);assert.equal(find('#cancelOrderReset').disabled,true);await find('#confirmOrderReset').emit('click');await find('#cancelOrderReset').emit('click');assert.equal(find('#resetOrderDialog').open,true);finish();await saving;await resetting;
 assert.equal(evaluate('id'),null);assert.equal(evaluate('doc.title'),'Novo pedido');assert.equal(evaluate('savePromise'),null);assert.equal(context.draftCopies.at(-1).id,null);assert.equal(context.paths.at(-1),'/pedidos');assert.equal(calls.filter(c=>c.options.method==='PUT').length,1);assert.equal(calls.some(c=>c.options.method==='POST'||c.options.method==='DELETE'),false);assert.ok(![...timers.values()].some(t=>[200,500,1600].includes(t.delay)));
});

test('queued old local writes finish before the clean draft so reload cannot restore discarded content',async()=>{
 const {context,find,evaluate}=await savedOrderScreen();let finish;context.localDraft=async value=>{if(value.document.notes==='ANTIGO')await new Promise(resolve=>{finish=resolve;});context.draftCopies.push(structuredClone(value));};evaluate('doc.notes="ANTIGO";dirty=true;');const oldWrite=evaluate('persist()');await new Promise(setImmediate);await find('#newOrder').emit('click');const resetting=find('#confirmOrderReset').emit('click');await new Promise(setImmediate);assert.equal(find('#confirmOrderReset').disabled,true);finish();await oldWrite;await resetting;assert.equal(context.draftCopies.at(-1).document.notes,'');assert.equal(context.draftCopies.at(-1).id,null);assert.equal(evaluate('doc.notes'),'');
});

test('the Create order navigation and new=1 recovery offer discarding without a forced save',async()=>{
 const first=await savedOrderScreen();first.evaluate('dirty=true;doc.notes="RASCUNHO";');await first.find('[data-nav-id="create-order"]').emit('click');assert.equal(first.find('#resetOrderDialog').open,true);assert.equal(first.calls.length,0);await first.find('#cancelOrderReset').emit('click');
 const doc=core.newOrder();doc.title='Rascunho incompleto';doc.notes='RECUPERAR SE CANCELAR';const {context,find,evaluate}=await orderScreen({search:'?new=1',initialDraft:{id:null,version:0,dirty:true,document:doc}});assert.equal(find('#resetOrderDialog').open,true);assert.equal(evaluate('doc.notes'),'RECUPERAR SE CANCELAR');await find('#confirmOrderReset').emit('click');assert.equal(evaluate('doc.title'),'Novo pedido');assert.equal(evaluate('doc.notes'),'');assert.equal(context.draftCopies.at(-1).document.title,'Novo pedido');
});


test('guided assembly skips a nonexistent second garment and opens linked arrows at application creation',async()=>{
 const {find,all,evaluate,click,visible,previewCalls}=await orderScreen();
 assert.equal(visible(find('[data-order-step="piece2"]')),false);
 await click('#orderStages','[data-order-step="pieces"]');
 await click('#productEditor','[data-product-step="art"]');
 await click('#productEditor','[data-product-next]');
 assert.equal(evaluate('orderStage'),'personalization');
 assert.equal(visible(find('[data-piece-art]')),false);
 assert.equal(visible(find('[data-piece-personalization]')),true);
 assert.equal(visible(find('#familyVariant')),true,'fit exceptions remain accessible alongside physical applications');
 await click('#productEditor','[data-catalog-action="add-application"]');
 assert.equal(evaluate('product().technical.applications.length'),1);
 assert.equal(evaluate('page().annotations.filter(a=>a.applicationId).length'),1);
 assert.equal(previewCalls.at(-1).mode,'layout');
 await find('#stageNext').emit('click');assert.equal(evaluate('orderStage'),'list');
 assert.equal(visible(find('#orderOverview')),false);
});
