import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import Excel from 'exceljs';
import * as catalog from '../public/product-catalog.js';
import * as list from '../public/order-list.js';
import * as core from '../public/order-core.js';
import * as files from '../public/order-files.js';
import {newOrder,applyListToOrder,validateOrder} from '../public/production-core.js';

test('two filled sizes override shirt or shorts model metadata and preserve separate garment counts',async()=>{
 for(const product of ['Camiseta','Calção','Kit']){
  const bytes=await files.writeListWorkbook([],Excel,{template:true,defaults:{produto:product}}),book=new Excel.Workbook();await book.xlsx.load(bytes);
  book.getWorksheet('Pedido').addRow(['Linha',null,'0','BLP','TAM12',3,null]);
  const sheet=list.prepareListSheets(await files.readOrderWorkbook(await book.xlsx.writeBuffer(),Excel))[0];
  const parsed=list.parseListMatrix(sheet,{produto:'Camiseta'});assert.equal(parsed.records[0].produto,'Kit');assert.equal(parsed.records[0].numero,'0');assert.equal(parsed.records[0].adicional,'');assert.deepEqual(parsed.records.flatMap(list.listProblems),[]);
  const summary=list.listSummary(parsed.records);assert.equal(summary.kits,3);assert.equal(summary.pieces,6);
  const order=applyListToOrder(newOrder(),parsed.records);assert.deepEqual(validateOrder(order),[]);
  assert.deepEqual(order.pages.flatMap(p=>p.products).map(p=>[p.type,p.quantity,p.names[0].size]),[['Camiseta',3,'BLP'],['Calção',3,'TAM12']]);
 }
});

test('explicit product labels and simple garment columns recognize kits per row while single pieces remain single',()=>{
 for(const label of ['Kit','Kit · camiseta + calção','KIT - CAMISETA + CALÇÃO','Camiseta e calção'])assert.equal(core.typeValue(label),'Kit');
 const source=list.prepareListText('Produto;Nome;Camiseta;Calção;Quantidade\nCamiseta;Ana;M;G;2\nCamiseta;Bia;BLP;;1\nCalção;Caio;;TAM12;3\nCamiseta e calção;;P;M;1');
 assert.equal(list.needsListMapping(source),false);const parsed=list.parseListMatrix(source.sheets[0],{produto:'Camiseta'});
 assert.deepEqual(parsed.records.map(r=>r.produto),['Kit','Camiseta','Calção','Kit']);assert.deepEqual(parsed.records.flatMap(list.listProblems),[]);
 const jacket=list.normalizeListRow({produto:core.JACKET_KIT,tamanhoCamiseta:'M',tamanhoCalcao:'G'});assert.equal(jacket.produto,core.JACKET_KIT);
 assert.equal(list.normalizeListRow({produto:'Camiseta',tamanhoCamiseta:'P'}).produto,'Camiseta');
 assert.equal(list.normalizeListRow({produto:'Kit',tamanhoCamiseta:'P'}).produto,'Kit');assert.match(list.listProblems(list.normalizeListRow({produto:'Kit',tamanhoCamiseta:'P'})).join(' '),/tamanho do calção/);
});

// Run the real organizer handlers with a minimal DOM. This checks interaction/state, not visual rendering.
async function organizer({search='',fetcher}={}){
 class Element{
  constructor(tag){this.tagName=tag.toUpperCase();this.children=[];this.dataset={};this.listeners={};this.disabled=false;this.hidden=false;this._value='';this.classList={toggle(){},add(){},remove(){}};}
  get options(){return this.children.flatMap(child=>child.tagName==='OPTION'?[child]:child.options);}
  get value(){return this._value||(this.tagName==='SELECT'?this.options[0]?.value||'':'');}set value(value){this._value=String(value);}
  get lastChild(){return this.children.at(-1);}get lastElementChild(){if(!this.children.length)this.append(new Element('div'));return this.children.at(-1);}before(...nodes){this.parent?.children.splice(this.parent.children.indexOf(this),0,...nodes);}querySelector(selector){return this.querySelectorAll(selector)[0]||null;}querySelectorAll(selector){return this.children.flatMap(child=>[...(selector==='fieldset'?child.tagName==='FIELDSET':selector==='[data-catalog-list-field]'?Boolean(child.dataset.catalogListField):selector==='.manual-actions'?false:false)?[child]:[],...child.querySelectorAll(selector)]);}append(...nodes){for(const node of nodes)node.parent=this;this.children.push(...nodes);}replaceChildren(...nodes){this.children=nodes;}
  setAttribute(){}removeAttribute(){}scrollIntoView(){}focus(){}close(){this.open=false;}showModal(){this.open=true;}
  addEventListener(type,handler){(this.listeners[type]||=[]).push(handler);}async emit(type){for(const handler of this.listeners[type]||[])await handler({preventDefault(){},target:this});}
 }
 const html=await readFile(new URL('../public/organizador.html',import.meta.url),'utf8'),elements=new Map();
 for(const [,tag,attrs,id] of html.matchAll(/<(\w+)([^>]*\bid="([^"]+)"[^>]*)>/g)){
  const element=new Element(tag);element.value=attrs.match(/\bvalue="([^"]*)"/)?.[1]||'';
  if(attrs.includes('data-export-orders'))element.dataset.exportOrders='';if(attrs.includes('data-input='))element.dataset.input=attrs.match(/data-input="([^"]+)"/)[1];elements.set('#'+id,element);
 }
 elements.set('.pagination',new Element('div'));
 const document={createElement:tag=>new Element(tag),querySelector:selector=>{assert.ok(elements.has(selector),'missing UI element '+selector);return elements.get(selector);},querySelectorAll(selector){return [...elements.values()].filter(element=>selector==='[data-input]'?element.dataset.input:selector==='[data-export-orders]'?'exportOrders' in element.dataset:['BUTTON','INPUT','SELECT','TEXTAREA'].includes(element.tagName));}};
 const destination={location:{href:''}},storage=new Map(),context=vm.createContext({...list,...catalog,...core,...files,CATALOG_LIST_FIELDS:(await import('../public/catalog-list.js')).CATALOG_LIST_FIELDS,document,crypto,URL,URLSearchParams,structuredClone,Blob,TextDecoder,location:{search,origin:'https://studio.test'},setTimeout:()=>1,clearTimeout(){},localStorage:{getItem:key=>storage.get(key)||null,setItem:(key,value)=>storage.set(key,value)},window:{top:destination,addEventListener(){}},createWorkflowGuide:()=>({update(){},hide(){}}),workflowOrders:async()=>[],workflowRoute:(kind,{orderId='',listId=''}={})=>(kind==='order'?'/pedidos':'/organizador')+'?order='+orderId+'&list='+listId,canonicalWorkflowPath(){},canAttachToOrder:()=>true,linkedWorkflowOrders:()=>[],fetch:fetcher||(async path=>({ok:true,json:async()=>path==='/api/profile'?{profile:{displayName:'Designer',email:'owner@test'}}:{lists:[],orders:[]}})),loadExcelLibrary:async()=>Excel});
 const catalogForm=(await readFile(new URL('../public/catalog-list-ui.js',import.meta.url),'utf8')).replace(/^import .*;\r?\n/gm,'').replace(/^export /gm,'');Object.assign(context,vm.runInContext('(function(){'+catalogForm+';return {setupCatalogListForm};})()',context));
 const script=(await readFile(new URL('../public/organizer-ui.js',import.meta.url),'utf8')).replace(/^import .*;\r?\n/gm,'');vm.runInContext(script,context);
 for(let i=0;i<6;i++)await new Promise(setImmediate);
 return {elements,destination,run:code=>vm.runInContext(code,context)};
}

test('the order list screen inherits the exact order name and completion returns to that order, while New list stays independent',async()=>{
 const order={id:'ORDER-A',title:'KIT EDGE 2027 · Equipe A',document:{title:'KIT EDGE 2027 · Equipe A'}},listDocument={schema:1,title:order.title,defaults:{produto:'Kit'},links:{orderId:order.id},rows:[list.normalizeListRow({produto:'Kit',tamanhoCamiseta:'M',tamanhoCalcao:'G',quantidade:1})],unresolved:[]};
 const calls=[];const ui=await organizer({search:'?order=ORDER-A&new=1',fetcher:async(path,options={})=>{
  calls.push({path,options});let data={lists:[],projects:[]};
  if(path==='/api/profile')data={profile:{email:'owner@test',displayName:'Designer'}};
  else if(path==='/api/production-orders/ORDER-A')data={order};
  else if(path==='/api/production-orders/ORDER-A/list')data={list:{id:'LIST-A',version:1,document:listDocument}};
  else if(path==='/api/order-lists/LIST-A'&&options.method==='PUT')data={list:{id:'LIST-A',version:2,reviewed:true}};
  return {ok:true,json:async()=>data};
 }});
 assert.equal(ui.elements.get('#orderTitle').value,order.title);assert.equal(ui.elements.get('#listOrderLink').value,'ORDER-A');
 assert.ok(calls.some(c=>c.path==='/api/production-orders/ORDER-A/list'&&c.options.method==='POST'));
 await ui.elements.get('#completeList').emit('click');assert.equal(ui.destination.location.href,'/pedidos?order=ORDER-A&list=LIST-A');
 const write=calls.find(c=>c.path==='/api/order-lists/LIST-A');assert.equal(JSON.parse(write.options.body).action,'complete');
 await ui.elements.get('#newList').emit('click');assert.equal(ui.elements.get('#listOrderLink').value,'');assert.equal(ui.run('orderTarget'),null);assert.equal(ui.run('savedListId'),null);
});

test('manual kit selection enables both sizes and adds two pieces, including auto selection from a shirt',async()=>{
 const ui=await organizer(),get=id=>ui.elements.get('#'+id);
 for(const product of ['Kit','Camiseta','Calção']){
  get('orderProduct').value=product;await get('orderProduct').emit('change');assert.equal(get('manualTop').disabled,false);assert.equal(get('manualBottom').disabled,false);
  get('manualTop').value='M';get('manualBottom').value='G';get('manualQuantity').value='2';await get('manualForm').emit('change');assert.equal(get('orderProduct').value,'Kit');await get('manualForm').emit('submit');
 }
 assert.equal(ui.run('records.length'),3);assert.equal(ui.run('listSummary(records).kits'),6);assert.equal(ui.run('listSummary(records).pieces'),12);assert.equal(ui.run('listReady()'),true);assert.equal(get('exportOrdersBtn').disabled,false);
});

test('importing a shirt model with two sizes selects the kit and leaves manual sizes enabled after loading',async()=>{
 const ui=await organizer(),bytes=await files.writeListWorkbook([],Excel,{template:true,defaults:{produto:'Camiseta'}}),book=new Excel.Workbook();await book.xlsx.load(bytes);book.getWorksheet('Pedido').addRow(['Linha','João','07','P','G',1,'CAPITÃO']);
 const content=await book.xlsx.writeBuffer();ui.run('globalThis.uploadContent=null');
 // Pass bytes through a shared object rather than serialized text, matching a native File read.
 const promise=ui.run('(file)=>importFile(file)')({name:'Equipe.xlsx',size:content.byteLength,arrayBuffer:async()=>content});await promise;
 assert.equal(ui.run('records[0].produto'),'Kit');assert.equal(ui.elements.get('#orderProduct').value,'Kit');assert.equal(ui.elements.get('#manualTop').disabled,false);assert.equal(ui.elements.get('#manualBottom').disabled,false);assert.equal(ui.run('listReady()'),true);
});
