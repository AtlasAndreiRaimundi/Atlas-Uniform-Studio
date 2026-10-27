import {test} from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import Excel from 'exceljs';
import {migrations} from './migrations.mjs';
import {ListService,validateList} from '../lib/list-service.mjs';
import {ProductionService} from '../lib/production-service.mjs';
import {normalizeListRow,listProblems,prepareListSheets,parseListMatrix,needsListMapping,prepareListText,parseListFreeText} from '../public/order-list.js';
import {readOrderWorkbook,writeListWorkbook} from '../public/order-files.js';
import {newOrder,newKitPage,PRODUCTS,applyListToOrder,parseNames,validateOrder} from '../public/production-core.js';
import {isBottomProduct,kitComponents} from '../public/order-core.js';
import {buildSheets} from '../public/production-sheet.js';
import {catalogOrder} from '../public/product-catalog.js';
import {KIT_PRESETS,createOrderProduct} from '../public/order-composition.js';

function setup(){
 const sql=new DatabaseSync(':memory:');for(const migration of migrations)sql.exec(migration);
 const db={prepare(query){const stmt=sql.prepare(query);let args=[];return {bind(...values){args=values;return this;},async first(){return stmt.get(...args)||null;},async all(){return {results:stmt.all(...args)};}};}};
 const objects=new Map(),bucket={async put(key,value){objects.set(key,value);},async get(key){return objects.has(key)?{json:async()=>JSON.parse(objects.get(key))}:null;},async delete(key){objects.delete(key);}};
 return {lists:new ListService(db,bucket),orders:new ProductionService(db,bucket),objects,sql};
}
const user={userId:'alice'},row=fields=>normalizeListRow({produto:'Kit',grupo:'Linha',nome:'João',numero:'07',adicional:'CAPITÃO · O+',tamanhoCamiseta:'M',tamanhoCalcao:'G',quantidade:1,...fields});
const document=rows=>({schema:1,title:'Equipe A',defaults:{produto:'Kit'},sourceName:'Cliente.xlsx',rows,unresolved:[]});

test('the new kit presets persist their correct technical mode and open a compatible named list, while an independent pair stays independent',async()=>{
 const {lists,orders}=setup();
 for(const preset of KIT_PRESETS){const doc=catalogOrder(newOrder());doc.compositionKind='kit';doc.title='KIT '+preset.id;const page=doc.pages[0];page.mode='conjunto';page.products=preset.types.map(type=>{const p=createOrderProduct(type,page.id);p.kitGroupId=page.id;return p;});const saved=await orders.save(user,null,{document:doc}),order=await orders.get(user,saved.id),list=await lists.forOrder(user,saved.id);assert.equal(order.document.compositionKind,'kit');assert.deepEqual(order.document.pages[0].products.map(p=>p.type),preset.types);assert.equal(list.title,doc.title);assert.equal(Boolean(list.document.defaults.catalogVersion),preset.id==='jogo');}
 const doc=catalogOrder(newOrder());doc.compositionKind='pair';doc.pages[0].mode='avulsas';doc.pages[0].products.push(createOrderProduct('Calção','independent'));const saved=await orders.save(user,null,{document:doc}),list=await lists.forOrder(user,saved.id);assert.equal(list.document.defaults.produto,'Camiseta');assert.equal((await orders.get(user,saved.id)).document.pages[0].products.some(p=>p.kitGroupId),false);
});

test('order first creates one durable list with the order name and ownership, then reopens its completed content',async()=>{
 const {lists,orders}=setup(),doc=newOrder();doc.title='KIT EDGE 2027 · Equipe A';doc.client='Equipe A';
 const order=await orders.save(user,null,{document:doc}),first=await lists.forOrder(user,order.id);
 assert.equal(first.title,doc.title);assert.equal(first.document.links.orderId,order.id);assert.equal(first.reviewed,false);assert.deepEqual(first.document.rows,[]);
 assert.equal((await lists.forOrder(user,order.id)).id,first.id);assert.equal((await lists.list(user)).length,1);
 const concurrent=await Promise.all([lists.forOrder(user,order.id),lists.forOrder(user,order.id)]);assert.ok(concurrent.every(l=>l.id===first.id));
 const filled={...first.document,rows:[row({})]};const completed=await lists.save(user,first.id,{version:first.version,document:filled,action:'complete'});
 const reopened=await lists.forOrder(user,order.id);assert.equal(reopened.id,completed.id);assert.equal(reopened.reviewed,true);assert.equal(reopened.document.rows[0].numero,'07');
 await assert.rejects(lists.forOrder({userId:'bob'},order.id),{status:404});await assert.rejects(lists.forOrder(null,order.id),{status:401});
 const standalone=await lists.save(user,null,{document:document([row({})])});assert.equal(standalone.orderId,null);
});

test('all initial garment types and custom names remain intact through the order-first list workflow',async()=>{
 const {lists,orders}=setup();
 for(const type of [...PRODUCTS,'Casaco térmico especial','Camisa edição 2027']){
  const doc=newOrder();doc.title='Pedido · '+type;doc.pages[0].products[0].type=type;
  const saved=await orders.save(user,null,{document:doc}),linked=await lists.forOrder(user,saved.id);assert.equal(linked.document.defaults.produto,type);
  const line=normalizeListRow({tamanhoCamiseta:isBottomProduct(type)?'':'M',tamanhoCalcao:isBottomProduct(type)?'G':'',quantidade:2},linked.document.defaults);assert.deepEqual(listProblems(line),[]);
  const completed=await lists.save(user,linked.id,{version:linked.version,document:{...linked.document,rows:[line]},action:'complete'});assert.equal(completed.reviewed,true);
  const applied=applyListToOrder((await orders.get(user,saved.id)).document,[line],{id:linked.id,version:completed.version,name:linked.title});assert.equal(applied.pages.flatMap(p=>p.products).length,1);assert.equal(applied.pages[0].products[0].type,type);assert.equal(applied.pages[0].products[0].quantity,2);assert.deepEqual(validateOrder(applied),[]);
 }
});

test('configurable kits keep both garment identities, independent sizes and a shared image through saved lists and Excel templates',async()=>{
 const {lists,orders}=setup();
 for(const types of [['Top','Legging'],['Polo','Bermuda'],['Puffer','Calça'],['Casaco térmico especial','Bermuda de treino'],['Polo','Polo'],['Camisa + manga longa','Calção'],['A'.repeat(80),'B'.repeat(80)]]){
  const doc=newOrder();doc.title='Kit de teste';doc.pages=[newKitPage(types)];doc.pages[0].visual={mode:'shared',image:'data:image/png;base64,AAAA',transform:{scale:1,x:.5,y:.5}};
  const ids=doc.pages[0].products.map(p=>p.id),saved=await orders.save(user,null,{document:doc}),linked=await lists.forOrder(user,saved.id);assert.deepEqual(kitComponents(linked.document.defaults.produto),types);assert.equal(saved.tracking.hasPresentation,true);
  const bytes=await writeListWorkbook([],Excel,{template:true,defaults:linked.document.defaults}),book=new Excel.Workbook();await book.xlsx.load(bytes);book.getWorksheet('Pedido').addRow(['Linha','Ana','07','M','G',2,'CAPITÃ']);
  const sheets=prepareListSheets(await readOrderWorkbook(await book.xlsx.writeBuffer(),Excel));assert.equal(needsListMapping({sheets}),false);const rows=parseListMatrix(sheets[0]).records;assert.deepEqual(rows.flatMap(listProblems),[]);assert.equal(rows[0].numero,'07');
  const list=await lists.save(user,linked.id,{version:linked.version,document:{...linked.document,rows},action:'complete'}),source={id:list.id,version:list.version,name:list.title};
  const applied=applyListToOrder((await orders.get(user,saved.id)).document,rows,source);assert.deepEqual(applied.pages[0].products.map(p=>p.type),types);assert.deepEqual(applied.pages[0].products.map(p=>p.id),ids);assert.deepEqual(applied.pages[0].products.map(p=>p.quantity),[2,2]);assert.deepEqual(applied.pages[0].products.map(p=>p.names[0].size),['M','G']);assert.deepEqual(validateOrder(applied),[]);
  const next=await orders.save(user,saved.id,{version:saved.version,document:applied}),reopened=(await orders.get(user,saved.id)).document,again=applyListToOrder(reopened,rows,source);assert.deepEqual(again.pages[0].products.map(p=>p.id),ids);assert.deepEqual(again.pages[0].products.map(p=>p.names[0].additional),['CAPITÃ','CAPITÃ']);assert.equal(again.pages[0].visual.image,doc.pages[0].visual.image);assert.equal(next.id,saved.id);
 }
});

test('starting an order list keeps a previous list snapshot and protects checked revisions',async()=>{
 const {lists,orders}=setup(),source=await lists.save(user,null,{document:document([row({})]),action:'complete'});
 const doc=applyListToOrder(newOrder(),(await lists.get(user,source.id)).document.rows,{id:source.id,version:1,name:source.title});doc.title='Pedido importado';
 const saved=await orders.save(user,null,{document:doc}),linked=await lists.forOrder(user,saved.id);
 assert.notEqual(linked.id,source.id);assert.equal(linked.title,'Pedido importado');assert.equal(linked.document.defaults.produto,'Kit');assert.equal(linked.document.rows[0].adicional,'CAPITÃO · O+');
 assert.equal((await lists.get(user,source.id)).orderId,null);
 Object.assign(doc,{number:'123',client:'Cliente',artist:'Designer',deliveryDate:'2026-11-30'});for(const p of doc.pages.flatMap(p=>p.products)){p.model='EDGE';p.fabric='DRY';}
 await orders.save(user,saved.id,{version:saved.version,document:doc,action:'release',checks:{art:true,list:true,technical:true}});
 await assert.rejects(lists.forOrder(user,saved.id),{status:400});
});

test('a list can be saved before any order, reopened and applied later to a new or existing order',async()=>{
 const {lists,orders}=setup(),saved=await lists.save(user,null,{document:document([row({}),row({nome:'',numero:'',adicional:'',quantidade:2})])});
 assert.equal((await orders.list(user)).length,0);assert.equal((await lists.list(user)).length,1);
 const reopened=await lists.get(user,saved.id);assert.equal(reopened.document.rows[0].adicional,'CAPITÃO · O+');assert.equal(reopened.document.rows[1].adicional,'');
 const source={id:saved.id,version:saved.version,name:saved.title},newDoc=applyListToOrder(newOrder(),reopened.document.rows,source);
 assert.deepEqual(validateOrder(newDoc),[]);assert.equal(newDoc.listSource.id,saved.id);
 const shirt=newDoc.pages.flatMap(p=>p.products).find(p=>p.type==='Camiseta');assert.equal(shirt.names[0].additional,'CAPITÃO · O+');assert.equal(shirt.names[1].additional,'');assert.equal(shirt.names[1].name,'');assert.equal(shirt.quantity,3);
 const existing=newOrder();existing.number='552';existing.client='Cliente';const p=existing.pages[0].products[0];p.fabric='JACQUARD';p.images=['data:image/png;base64,AAAA'];
 const first=await orders.save(user,null,{document:existing});const merged=applyListToOrder((await orders.get(user,first.id)).document,reopened.document.rows,source);
 await orders.save(user,first.id,{document:merged,version:first.version});const order=await orders.get(user,first.id);
 assert.equal((await orders.list(user)).length,1);assert.equal(order.document.number,first.number);assert.equal(order.document.pages[0].products[0].fabric,'JACQUARD');assert.deepEqual(order.document.pages[0].products[0].images,p.images);
 assert.equal(order.document.listSource.id,saved.id);assert.equal(order.document.listSource.version,1);assert.equal(order.document.pages[0].products[0].names[0].additional,'CAPITÃO · O+');
 await lists.save(user,saved.id,{version:1,document:document([row({adicional:'PROFESSOR'})])});
 assert.equal((await orders.get(user,first.id)).document.pages[0].products[0].names[0].additional,'CAPITÃO · O+','an order keeps its reviewed list snapshot');
 assert.match(buildSheets(order.document).flatMap(s=>s.ops.filter(o=>o.kind==='text').map(o=>o.text)).join('\n'),/CAPITÃO · O\+/);
});

test('standalone lists allow unfinished items, retain review notes and reject foreign access or stale writes',async()=>{
 const {lists,objects}=setup(),draft=document([row({tamanhoCalcao:'',adicional:''})]);draft.unresolved=[{text:'Informação a conferir',sheet:'Pedido',row:3,reason:'Confira a coluna'}];
 await assert.rejects(lists.list(null),{status:401});const saved=await lists.save(user,null,{document:draft});
 const copy=(await lists.get(user,saved.id)).document;assert.match(listProblems(copy.rows[0]).join(' '),/tamanho do calção/);assert.equal(copy.unresolved[0].text,'Informação a conferir');
 const other={userId:'bob'};assert.equal((await lists.list(other)).length,0);await assert.rejects(lists.get(other,saved.id),{status:404});await assert.rejects(lists.save(other,saved.id,{document:draft,version:1}),{status:404});
 copy.title='Atualizada';await lists.save(user,saved.id,{document:copy,version:1});await assert.rejects(lists.save(user,saved.id,{document:draft,version:1}),{status:409});assert.equal((await lists.get(user,saved.id)).title,'Atualizada');assert.equal(objects.size,2);
 assert.throws(()=>validateList(document([row({adicional:'a'.repeat(201)})])),{status:400});assert.throws(()=>validateList(document([null])),{status:400});
});

test('the downloadable model round trips optional additional text and never inherits it into blank rows',async()=>{
 const bytes=await writeListWorkbook([],Excel,{template:true}),wb=new Excel.Workbook();await wb.xlsx.load(bytes);const sheet=wb.getWorksheet('Pedido');
 assert.equal(sheet.getCell('G1').value,'Adicional');assert.equal(sheet.getCell('G5001').dataValidation.allowBlank,true);
 sheet.addRow(['Linha','João','07','M','G',1,'=CAPITÃO']);sheet.addRow(['Linha',null,null,'M','G',2,null]);
 const sheets=prepareListSheets(await readOrderWorkbook(await wb.xlsx.writeBuffer(),Excel));assert.equal(needsListMapping({sheets}),false);
 const parsed=parseListMatrix(sheets[0],{adicional:'NÃO HERDAR'});assert.equal(parsed.records[0].adicional,'=CAPITÃO');assert.equal(parsed.records[1].adicional,'');assert.deepEqual(parsed.records.flatMap(listProblems),[]);
 const exported=await writeListWorkbook(parsed.records,Excel),again=parseListMatrix(prepareListSheets(await readOrderWorkbook(exported,Excel)).find(s=>s.enabled));assert.deepEqual(again.records.map(r=>[r.nome,r.adicional]).sort(),[['João','=CAPITÃO'],['','']].sort());
});

test('version one models with six columns continue to import without additional text',async()=>{
 const bytes=await writeListWorkbook([],Excel,{template:true}),wb=new Excel.Workbook();await wb.xlsx.load(bytes);wb.getWorksheet('_Modelo Atlas').getCell('B1').value=1;
 const sheet=wb.getWorksheet('Pedido');sheet.getCell('G1').value=null;sheet.addRow(['Linha',null,'0','M','G',1]);
 const parsed=parseListMatrix(prepareListSheets(await readOrderWorkbook(await wb.xlsx.writeBuffer(),Excel))[0]);assert.equal(parsed.records[0].adicional,'');assert.equal(parsed.records[0].numero,'0');assert.deepEqual(parsed.records.flatMap(listProblems),[]);
});

test('optional additional labels and manual production personalization accept content and blanks',()=>{
 const source=prepareListText('Nome;Número;Tamanho;Cargo\nJoão;07;M;CAPITÃO\nAna;;P;');assert.equal(needsListMapping(source),false);const parsed=parseListMatrix(source.sheets[0]);assert.deepEqual(parsed.records.map(r=>r.adicional),['CAPITÃO','']);
 const text=parseListFreeText('Nome: João Número: 07 Tam. Camiseta: M Tam. Calção: G Adicional: O+');assert.equal(text.records[0].adicional,'O+');
 const names=parseNames('Nome;Número;Tamanho;Quantidade;Adicional\nJoão;07;M;1;O+\n;;G;2;');assert.deepEqual(names.errors,[]);assert.deepEqual(names.rows.map(n=>n.additional),['O+','']);assert.equal(parseNames('João;07;M;1').rows[0].additional,'');
});

test('list completion is explicit, durable, invalidated by edits and independently linked to owned orders and presentations',async()=>{
 const {lists,orders,sql}=setup();
 sql.prepare("INSERT INTO projects (id,owner_id,name,visual_json,created_at,updated_at) VALUES (?,?,?,?,?,?)").run('P','alice','Uniforme azul','{}','now','now');
 sql.prepare("INSERT INTO projects (id,owner_id,name,visual_json,created_at,updated_at) VALUES (?,?,?,?,?,?)").run('FOREIGN','bob','Privado','{}','now','now');
 const order=await orders.save(user,null,{document:newOrder()}),d=document([row({})]);d.links={orderId:order.id,projectId:'P'};
 const draft=await lists.save(user,null,{document:d});assert.equal(draft.reviewed,false);assert.equal((await lists.list(user,'P'))[0].id,draft.id);
 await assert.rejects(lists.save(user,null,{document:{...d,title:'Nova lista'},action:'complete'}),{status:400});
 await assert.rejects(lists.save(user,null,{document:{...d,links:{projectId:'FOREIGN'}}}),{status:404});
 const checked=await lists.save(user,draft.id,{document:d,version:draft.version,action:'complete'});assert.equal(checked.reviewed,true);assert.ok(checked.reviewedAt);
 const reopened=await lists.get(user,draft.id);assert.equal(reopened.document.review.state,'checked');assert.equal(reopened.document.links.orderId,order.id);assert.equal(reopened.document.links.projectId,'P');
 const unchanged=await lists.save(user,draft.id,{document:reopened.document,version:checked.version});assert.equal(unchanged.reviewed,true);
 reopened.document.rows[0].adicional='PROFESSOR';const edited=await lists.save(user,draft.id,{document:reopened.document,version:unchanged.version});assert.equal(edited.reviewed,false);
 sql.exec('PRAGMA foreign_keys=ON');sql.prepare('DELETE FROM projects WHERE id=?').run('P');assert.equal((await lists.get(user,draft.id)).document.links.projectId,'','deleting a design keeps the independent list available');
});
