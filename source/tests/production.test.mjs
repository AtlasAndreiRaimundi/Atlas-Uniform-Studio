import {test} from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {PDFDocument} from 'pdf-lib';
import * as PDF from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import {readFile} from 'node:fs/promises';
import {newOrder,newProduct,demoOrder,parseGrade,parseNames,namesToGrade,validateOrder,importList,applyListToOrder} from '../public/production-core.js';
import {buildSheets,sheetSVG,createPDF,PAPER} from '../public/production-sheet.js';
import {ProductionService,validateDocument} from '../lib/production-service.mjs';
import {ListService} from '../lib/list-service.mjs';
import {migrations} from './migrations.mjs';
function setup(){const sql=new DatabaseSync(':memory:');migrations.forEach(m=>sql.exec(m));sql.exec('PRAGMA foreign_keys=ON');const db={prepare(query){const stmt=sql.prepare(query);let args=[];return {bind(...values){args=values;return this;},async first(){return stmt.get(...args)||null;},async all(){return {results:stmt.all(...args)};}};}};const objects=new Map(),bucket={async put(key,value){objects.set(key,value);},async get(key){return objects.has(key)?{json:async()=>JSON.parse(objects.get(key))}:null;},async delete(key){for(const k of Array.isArray(key)?key:[key])objects.delete(k);},async list({prefix,cursor}){const keys=[...objects.keys()].filter(key=>key.startsWith(prefix)&&(!cursor||key>cursor)).sort(),page=keys.slice(0,2);return {objects:page.map(key=>({key})),truncated:keys.length>2,cursor:page.at(-1)};}};return {service:new ProductionService(db,bucket),objects,sql};}
test('quantity groups preserve adult, baby look and child totals without turning pieces into kits',()=>{const doc=demoOrder(),p=doc.pages[0].products[0],g=parseGrade(p.grade,p.type);assert.deepEqual(g.groups.map(g=>g.category),['CAMISETA','BABY LOOK','INFANTIL']);assert.equal(g.total,8);assert.deepEqual(validateOrder(doc),[]);p.quantity=9;assert.match(validateOrder(doc).join(' '),/soma 8/);p.quantity=8;p.grade+='\nGG = -1';assert.match(validateOrder(doc).join(' '),/TAMANHO = QUANTIDADE/);});
test('name numbers retain zeroes and mismatches in sizes block production export',()=>{const parsed=parseNames('Nome;Número;Tamanho;Quantidade\nJoão;01;M;1\nAna;07;BLP;2\nPedro;09;TAM 10;1');assert.equal(parsed.rows[0].number,'01');assert.equal(parsed.rows[1].number,'07');const doc=newOrder(),p=doc.pages[0].products[0];p.names=parsed.rows;p.quantity=4;p.grade=namesToGrade(p.names);assert.deepEqual(validateOrder(doc),[]);p.grade='CAMISETA\nG = 1\nBABY LOOK\nP = 2\nINFANTIL\nTAM 10 = 1';assert.match(validateOrder(doc).join(' '),/diferem/);p.namesRaw='João;01';assert.match(validateOrder(doc).join(' '),/use Nome/);});
test('organizer handoff keeps independent shirt and shorts sizes and counts',()=>{const doc=importList([{produto:'Kit',grupo:'Linha',modelo:'Jogo',cor:'Azul',nome:'João',numero:'07',tamanhoCamiseta:'M',tamanhoCalcao:'G',quantidade:2},{produto:'Camiseta',grupo:'Linha',modelo:'Jogo',cor:'Azul',nome:'Ana',numero:'01',tamanhoCamiseta:'BLP',tamanhoCalcao:'',quantidade:1}],'Equipe');const page=doc.pages[0];assert.equal(page.mode,'avulsas');assert.equal(page.products[0].quantity,3);assert.equal(page.products[1].quantity,2);assert.match(page.products[0].grade,/M = 2/);assert.match(page.products[1].grade,/G = 2/);assert.deepEqual(validateOrder(doc),[]);});
test('individual, loose and intentional sets paginate correctly with no multiplication',()=>{const doc=demoOrder();doc.pages[0].products.push(newProduct('Calção'));assert.deepEqual(buildSheets(doc).map(sheet=>sheet.kind),['sheet','list','sheet']);doc.pages[0].mode='avulsas';assert.deepEqual(buildSheets(doc).map(sheet=>sheet.kind),['sheet','list']);doc.pages[0].mode='conjunto';assert.deepEqual(buildSheets(doc).map(sheet=>sheet.kind),['sheet','list']);assert.equal(doc.pages[0].products[0].quantity,8);});
test('packing instructions remain beside the budget on the primary sheet',()=>{const d=demoOrder();d.pages[0].notes='EMBALAR CAMISETA E CALÇÃO JUNTOS';const sheets=buildSheets(d),texts=sheets[0].ops.filter(o=>o.kind==='text').map(o=>o.text).join(' ');assert.match(texts,/EMBALAR CAMISETA E CALÇÃO JUNTOS/);assert.deepEqual(sheets.map(sheet=>sheet.kind),['sheet','list']);});
test('long specifications, components, grades and names continue without clipping or losing rows',()=>{const doc=demoOrder(),p=doc.pages[0].products[0];p.fabric='TECIDO EXTENSO '.repeat(15);p.names=Array.from({length:145},(_,i)=>({name:'Atleta '+i,number:String(i).padStart(2,'0'),size:'M',quantity:1}));p.components=Array.from({length:8},(_,i)=>({name:'Componente '+i,material:'Material específico',finish:'Acabamento',position:'Manga'}));doc.notes='NOTA FINAL DO PEDIDO';const sheets=buildSheets(doc);assert.ok(sheets.length>3);const text=sheets.flatMap(s=>s.ops.filter(o=>o.kind==='text').map(o=>o.text)).join('\n');assert.ok(text.includes('Atleta 144'));assert.ok(text.includes('Componente 7'));assert.ok(text.includes('NOTA FINAL DO PEDIDO'));for(const sheet of sheets){for(const o of sheet.ops){if(o.kind==='text'){assert.ok(o.x>=0&&o.x<PAPER.width);assert.ok(o.y>0&&o.y<PAPER.height);if(sheet.kind!=='list')assert.ok(!(o.x<413&&o.y>459),'Budget area must stay blank on technical sheets');}}}const svg=sheetSVG(sheets[0]);assert.ok(!svg.includes('<script'));assert.match(svg,/QUANTIDADES/);});
test('export creates genuine A4 landscape PDF pages with the same page count',async()=>{const sheets=buildSheets(demoOrder());const bytes=await createPDF(sheets,PDF),pdf=await PDFDocument.load(bytes);assert.equal(pdf.getPageCount(),sheets.length);const {width,height}=pdf.getPage(0).getSize();assert.ok(Math.abs(width-841.89)<.01);assert.ok(Math.abs(height-595.28)<.01);});
test('production PDF embeds the document typeface and preserves multi-page output',async()=>{const d=demoOrder();d.pages.push(structuredClone(d.pages[0]));d.pages[1].id=crypto.randomUUID();d.pages[1].products[0].id=crypto.randomUUID();const sheets=buildSheets(d),regular=await readFile(new URL('../public/fonts/ChakraPetch-Regular.ttf',import.meta.url)),bold=await readFile(new URL('../public/fonts/ChakraPetch-SemiBold.ttf',import.meta.url)),bytes=await createPDF(sheets,PDF,{fontkit,regular,bold}),pdf=await PDFDocument.load(bytes);assert.equal(pdf.getPageCount(),4);assert.deepEqual(sheets.map(sheet=>sheet.kind),['sheet','list','sheet','list']);assert.ok(bytes.length>5000);});
test('production orders are durable, isolated by owner and protected against stale overwrites',async()=>{const {service,objects}=setup(),alice={userId:'alice'},bob={userId:'bob'},document=demoOrder();await assert.rejects(service.list(null),{status:401});const saved=await service.save(alice,null,{document});assert.equal(saved.version,1);await assert.rejects(service.get(bob,saved.id),{status:404});await assert.rejects(service.save(bob,saved.id,{document,version:1}),{status:404});assert.equal((await service.list(bob)).length,0);const copy=(await service.get(alice,saved.id)).document;copy.title='Pedido atualizado';await service.save(alice,saved.id,{document:copy,version:1});await assert.rejects(service.save(alice,saved.id,{document,version:1}),{status:409});assert.equal((await service.get(alice,saved.id)).document.title,'Pedido atualizado');assert.equal(objects.size,2);assert.equal((await service.list(alice)).length,1);});
test('deletion removes only the chosen order and its snapshots, detaches its list and preserves the artwork',async()=>{
 const {service,objects,sql}=setup(),user={userId:'alice'},lists=new ListService(service.db,service.bucket),document=demoOrder();
 Object.assign(document,{orderDate:'2026-10-22',deliveryDate:'2026-12-20',artist:'Designer'});
 const at='2026-10-22T12:00:00Z';sql.prepare('INSERT INTO projects (id,owner_id,name,visual_json,map_key,thumbnail_key,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?)').run('art-a','alice','Arte original','{}','projects/art-a/map.png','projects/art-a/thumb.png',at,at);
 objects.set('projects/art-a/map.png','DESENHO');objects.set('projects/art-a/thumb.png','PRÉVIA');
 let saved=await service.save(user,null,{document});
 const linked=await lists.save(user,null,{document:{schema:1,title:'Lista da equipe',defaults:{},rows:[{grupo:'1 - Linha',produto:'Camiseta',nome:'Ana',numero:'07',adicional:'CAPITÃ',tamanhoCamiseta:'M',quantidade:1}],links:{orderId:saved.id,projectId:'art-a'}},action:'complete'});
 for(let i=0;i<3;i++)saved=await service.save(user,saved.id,{version:saved.version,document});
 saved=await service.save(user,saved.id,{version:saved.version,document,action:'release',checks:{art:true,list:true,technical:true}});
 const other=await service.save(user,null,{document}),otherKey=sql.prepare('SELECT object_key FROM production_orders WHERE id=?').get(other.id).object_key;
 objects.set('production-orders/'+saved.id+'-other/file.json','OUTRO PREFIXO');
 assert.ok([...objects.keys()].filter(k=>k.startsWith('production-orders/'+saved.id+'/')).length>2,'cleanup spans more than one object-list page');
 await service.remove(user,saved.id,{version:saved.version});
 await assert.rejects(service.get(user,saved.id),{status:404});await assert.rejects(service.released(user,saved.id,1),{status:404});
 await assert.rejects(service.save(user,saved.id,{version:saved.version,document}),{status:404});await assert.rejects(lists.forOrder(user,saved.id),{status:404});
 assert.deepEqual((await service.list(user)).map(o=>o.id),[other.id]);assert.equal((await service.get(user,other.id)).title,document.title);
 const retained=await lists.get(user,linked.id);assert.equal(retained.orderId,null);assert.equal(retained.document.links.orderId,'');assert.equal(retained.projectId,'art-a');assert.equal(retained.reviewed,true);assert.equal(retained.document.rows[0].numero,'07');assert.equal(retained.document.rows[0].adicional,'CAPITÃ');
 retained.document.title='Lista independente';await lists.save(user,linked.id,{version:retained.version,document:retained.document});
 assert.equal(sql.prepare('SELECT name FROM projects WHERE id=?').get('art-a').name,'Arte original');assert.equal(objects.get('projects/art-a/map.png'),'DESENHO');assert.equal(objects.get('projects/art-a/thumb.png'),'PRÉVIA');assert.ok(objects.has(otherKey));assert.ok(objects.has('production-orders/'+saved.id+'-other/file.json'));assert.ok(![...objects.keys()].some(k=>k.startsWith('production-orders/'+saved.id+'/')));
 const {OrderTrackingService}=await import('../lib/order-tracking.mjs'),tracking=new OrderTrackingService(service.db,service.bucket,service);
 assert.ok(!(await tracking.list(user)).orders.some(o=>o.id===saved.id));assert.equal((await tracking.reminders(user,new Date('2026-12-01'))).orders.length,0);
});
test('deletion requires the owner and the exact confirmed version without changing any data on rejection',async()=>{
 const {service,objects}=setup(),user={userId:'alice'},document=demoOrder();let saved=await service.save(user,null,{document});
 await assert.rejects(service.remove(null,saved.id,{version:saved.version}),{status:401});await assert.rejects(service.remove({userId:'bob'},saved.id,{version:saved.version}),{status:404});
 for(const input of [undefined,{},null,{version:'1'},{version:0}])await assert.rejects(service.remove(user,saved.id,input),{status:409});
 const old=saved.version;saved=await service.save(user,saved.id,{version:saved.version,document});await assert.rejects(service.remove(user,saved.id,{version:old}),{status:409});
 assert.equal((await service.get(user,saved.id)).version,saved.version);assert.equal(objects.size,2);
 await service.remove(user,saved.id,{version:saved.version});assert.equal((await service.list(user)).length,0);assert.equal(objects.size,0);
});
test('a concurrent acceptance prevents deletion at the database mutation and preserves the files',async()=>{
 const {service,objects,sql}=setup(),user={userId:'alice'},saved=await service.save(user,null,{document:demoOrder()}),prepare=service.db.prepare;
 service.db.prepare=query=>{if(query.startsWith('DELETE FROM production_orders'))sql.prepare("UPDATE production_orders SET version=version+1,production_state='accepted' WHERE id=?").run(saved.id);return prepare(query);};
 await assert.rejects(service.remove(user,saved.id,{version:saved.version}),{status:409});assert.equal((await service.get(user,saved.id)).tracking.stage,'accepted');assert.equal(objects.size,1);
});
test('temporary file cleanup failures do not restore a successfully deleted order',async()=>{
 const {service}=setup(),user={userId:'alice'},saved=await service.save(user,null,{document:demoOrder()});service.bucket.list=async()=>{throw new Error('Storage unavailable');};
 await service.remove(user,saved.id,{version:saved.version});await assert.rejects(service.get(user,saved.id),{status:404});assert.equal((await service.list(user)).length,0);
});
test('the owner can delete a sent order before factory acceptance and it leaves both queues while retaining its list',async()=>{
 const {OrderTrackingService}=await import('../lib/order-tracking.mjs');
 const {service,objects}=setup(),owner={userId:'alice'},factory={userId:'factory'},tracking=new OrderTrackingService(service.db,service.bucket,service,'factory'),lists=new ListService(service.db,service.bucket),document=demoOrder();Object.assign(document,{orderDate:'2026-10-22',deliveryDate:'2026-12-20',artist:'Designer'});
 let saved=await service.save(owner,null,{document});const list=await lists.forOrder(owner,saved.id);
 saved=await service.save(owner,saved.id,{document,version:saved.version,action:'release',checks:{art:true,list:true,technical:true}});saved=await tracking.transition(owner,saved.id,{action:'send',version:saved.version});
 assert.equal((await tracking.list(factory,{factory:true})).orders.length,1);const files=objects.size;
 await assert.rejects(service.remove(factory,saved.id,{version:saved.version}),{status:404});await assert.rejects(service.remove(owner,saved.id,{version:saved.version-1}),{status:409});assert.equal(objects.size,files);
 await service.remove(owner,saved.id,{version:saved.version});assert.equal((await tracking.list(owner)).orders.length,0);assert.equal((await tracking.list(factory,{factory:true})).orders.length,0);await assert.rejects(tracking.transition(factory,saved.id,{action:'accept',version:saved.version}),{status:404});
 const retained=await lists.get(owner,list.id);assert.equal(retained.orderId,null);assert.equal(retained.title,document.title);assert.equal(objects.size,1,'only the independent list document remains');
});
test('order thumbnails show the saved first sheet, enforce ownership and factory access, and reject stale or deleted versions',async()=>{
 const {OrderTrackingService}=await import('../lib/order-tracking.mjs');
 const {service}=setup(),owner={userId:'alice'},other={userId:'bob'},factory={userId:'factory'},tracking=new OrderTrackingService(service.db,service.bucket,service,'factory'),document=demoOrder();Object.assign(document,{title:'Rascunho <script>alert(1)</script>',client:'Cliente A',orderDate:'2026-10-22',deliveryDate:'2026-12-20',artist:'Designer'});document.pages[0].products[0].images=['data:image/png;base64,AAAA'];document.pages[0].title=document.title;
 let saved=await service.save(owner,null,{document});assert.match(saved.thumbnailUrl,new RegExp(encodeURIComponent(saved.id)+'/thumbnail\\?version=1$'));
 await assert.rejects(tracking.preview(null,saved.id),{status:401});await assert.rejects(tracking.preview(other,saved.id),{status:404});await assert.rejects(tracking.preview(other,saved.id,{factory:true}),{status:403});await assert.rejects(tracking.preview(factory,saved.id,{factory:true}),{status:404});
 const preview=await tracking.preview(owner,saved.id,{version:'1'});assert.match(preview,/<svg/);assert.match(preview,/Cliente A/);assert.match(preview,/data:image\/png;base64,AAAA/);assert.ok(!preview.includes('<script>'));assert.ok(preview.includes('&lt;script&gt;'));assert.ok(!preview.includes('MOCKUP'),'draft previews do not invent a garment image');
 saved=await service.save(owner,saved.id,{document,version:saved.version,action:'release',checks:{art:true,list:true,technical:true}});await assert.rejects(tracking.preview(owner,saved.id,{version:'1'}),{status:409});
 saved=await tracking.transition(owner,saved.id,{action:'send',version:saved.version});assert.match(await tracking.preview(factory,saved.id,{factory:true,version:saved.version}),/Cliente A/);
 await service.remove(owner,saved.id,{version:saved.version});await assert.rejects(tracking.preview(owner,saved.id),{status:404});await assert.rejects(tracking.preview(factory,saved.id,{factory:true}),{status:404});
});
test('external image URLs, oversized structures and malformed quantities are rejected before saving',()=>{const d=demoOrder();d.pages[0].products[0].images=['https://untrusted.test/image.png'];assert.throws(()=>validateDocument(d),{status:400});d.pages[0].products[0].images=[];d.pages[0].products[0].quantity=-1;assert.throws(()=>validateDocument(d),{status:400});});

const integratedRows=[{produto:'Kit',grupo:'Linha',nome:'',numero:'0',tamanhoCamiseta:'M',tamanhoCalcao:'G',quantidade:2},{produto:'Camiseta',grupo:'Linha',nome:'Ana',numero:'07',tamanhoCamiseta:'BLP',tamanhoCalcao:'',quantidade:1}];
test('applying a list updates the existing order and retains its technical details, identifiers and attached drawing',()=>{
 const original=demoOrder();original.title='Pedido existente';original.number='1234';original.client='EQUIPE A';const p=original.pages[0].products[0];p.images=['data:image/png;base64,AAAA'];p.projectRef={id:'project-a',name:'Desenho',version:4,templateId:'kit-edge-2027-v3',attachedAt:'2026-10-22',format:'four-transparent-v1'};
 const before=structuredClone(original),next=applyListToOrder(original,integratedRows,{name:'Equipe.xlsx'}),shirt=next.pages.flatMap(page=>page.products).find(item=>item.id===p.id);
 assert.deepEqual(original,before);for(const key of ['title','number','client','seller','artist','orderDate','notice'])assert.equal(next[key],original[key]);
 for(const key of ['fabric','model','components','images','projectRef'])assert.deepEqual(shirt[key],p[key]);
 assert.equal(shirt.quantity,3);assert.equal(shirt.names[0].name,'');assert.equal(shirt.names[0].number,'0');assert.equal(shirt.names[1].number,'07');assert.deepEqual(validateOrder(next),[]);
 assert.equal(next.pages.flatMap(page=>page.products).length,2);assert.equal(next.listSource.name,'Equipe.xlsx');assert.equal(next.listSource.rows.length,2);
 const again=applyListToOrder(next,integratedRows);assert.equal(again.pages.flatMap(page=>page.products).length,2);assert.equal(again.pages.flatMap(page=>page.products).find(item=>item.id===p.id).quantity,3);
});
test('a new order groups list variants and flags removed garments instead of silently using obsolete quantities',()=>{
 const next=applyListToOrder(newOrder(),integratedRows),products=next.pages.flatMap(page=>page.products);assert.equal(products.length,2);assert.deepEqual(validateOrder(next),[]);
 const updated=applyListToOrder(next,[{...integratedRows[1],quantidade:4}]);assert.ok(updated.pages.flatMap(page=>page.products).find(p=>p.type==='Calção').listMissing);assert.match(validateOrder(updated).join(' '),/não consta na lista atual/);
});
test('ambiguous garment matches and invalid quantities leave the existing order untouched',()=>{
 const d=demoOrder();d.pages[0].products[0].model='';d.pages[0].products.push(newProduct('Camiseta'));const before=structuredClone(d);
 assert.throws(()=>applyListToOrder(d,[integratedRows[1]]),/mais de uma/);assert.deepEqual(d,before);
 assert.throws(()=>applyListToOrder(newOrder(),[{...integratedRows[1],quantidade:0}]),/Corrija/);
});
test('Polo list quantities retain the existing Camisa polo type and its valid grade',()=>{
 const order=newOrder(),p=order.pages[0].products[0];p.type='Camisa polo';p.fabric='DRY';
 const next=applyListToOrder(order,[{...integratedRows[1],produto:'Polo',tamanhoCamiseta:'M'},{...integratedRows[1],produto:'Polo'}]);assert.equal(next.pages.length,1);assert.equal(next.pages[0].products.length,1);assert.equal(next.pages[0].products[0].type,'Camisa polo');assert.match(next.pages[0].products[0].grade,/CAMISA POLO/);assert.match(next.pages[0].products[0].grade,/BABY LOOK/);assert.deepEqual(validateOrder(next),[]);
});
test('saved orders retain their list and the exact presentation version and PNG snapshot',async()=>{
 const {service}=setup(),user={userId:'alice'},d=applyListToOrder(newOrder(),integratedRows,{name:'Lista.xlsx'}),p=d.pages[0].products[0];p.images=['data:image/png;base64,AAAA'];p.projectRef={id:'project-a',name:'Desenho',version:4,templateId:'kit-edge-2027-v3',attachedAt:'2026-10-22',format:'four-transparent-v1'};
 const saved=await service.save(user,null,{document:d}),again=await service.get(user,saved.id);assert.deepEqual(again.document.listSource,d.listSource);assert.deepEqual(again.document.pages[0].products[0].projectRef,p.projectRef);assert.equal(again.document.pages[0].products[0].images[0],p.images[0]);
 const merged=applyListToOrder(again.document,integratedRows);assert.equal(merged.pages.flatMap(page=>page.products).length,2);assert.deepEqual(merged.pages[0].products[0].projectRef,p.projectRef);
});
test('reimporting model and color labels with different capitalization updates the same garments',()=>{
 const original=applyListToOrder(newOrder(),integratedRows.map(r=>({...r,modelo:'Jogo',cor:'Azul'})));
 const again=applyListToOrder(original,integratedRows.map(r=>({...r,modelo:'JOGO',cor:'AZUL'})));assert.equal(again.pages.flatMap(p=>p.products).length,2);assert.deepEqual(validateOrder(again),[]);
});

test('release requires completed technical data and independent checks; locked releases survive new revisions',async()=>{
 const {service}=setup(),user={userId:'alice'},document=demoOrder();document.deliveryDate='2026-12-20';document.orderDate='2026-10-22';document.artist='Andrei';
 let saved=await service.save(user,null,{document});
 await assert.rejects(service.save(user,saved.id,{document,version:saved.version,action:'release',checks:{art:true,list:true}}),/Confirme/);
 saved=await service.save(user,saved.id,{document,version:saved.version,action:'release',checks:{art:true,list:true,technical:true}});
 const released=(await service.get(user,saved.id)).document;assert.equal(released.workflow.status,'released');assert.equal(released.workflow.revision,1);
 const forged=structuredClone(released);forged.client='ALTERADO';delete forged.workflow;
 await assert.rejects(service.save(user,saved.id,{document:forged,version:saved.version}),/liberado/);
 const revision=await service.save(user,saved.id,{document:forged,version:saved.version,action:'revise'});
 const draft=(await service.get(user,saved.id)).document;assert.equal(draft.client,document.client);assert.equal(draft.workflow.status,'draft');assert.equal(draft.workflow.revision,2);
 draft.client='NOVO CLIENTE';await service.save(user,saved.id,{document:draft,version:revision.version});
 assert.equal((await service.released(user,saved.id,1)).document.client,document.client);
 await assert.rejects(service.released({userId:'bob'},saved.id,1),{status:404});
});
test('empty exports and invalid date sequences are rejected while drafts can still be saved',async()=>{
 assert.match(validateOrder(newOrder()).join(' '),/quantidade inválida/);
 const d=demoOrder();d.orderDate='2026-10-22';d.deliveryDate='2026-10-21';assert.match(validateOrder(d).join(' '),/anterior ao pedido/);
 d.deliveryDate='2026-02-30';assert.match(validateOrder(d).join(' '),/inválida/);
 const {service}=setup();assert.equal((await service.save({userId:'alice'},null,{document:newOrder()})).version,1);
});

test('factory queue enforces permissions, exact revisions, acceptance lock and unchanged technical snapshots',async()=>{
 const {OrderTrackingService}=await import('../lib/order-tracking.mjs');
 const {service,sql,objects}=setup(),alice={userId:'alice'},factory={userId:'factory'},bob={userId:'bob'},db=service.db;
 const tracking=new OrderTrackingService(db,service.bucket,service,'factory');
 const document=demoOrder();Object.assign(document,{deliveryDate:'2026-12-20',orderDate:'2026-10-22',artist:'Andrei'});
 let saved=await service.save(alice,null,{document});
 await assert.rejects(tracking.transition(alice,saved.id,{action:'send',version:saved.version}),/Confira/);
 saved=await service.save(alice,saved.id,{document,version:saved.version,action:'release',checks:{art:true,list:true,technical:true}});
 const snapshot=JSON.stringify((await service.get(alice,saved.id)).document);
 await assert.rejects(tracking.transition(bob,saved.id,{action:'send',version:saved.version}),{status:404});
 saved=await tracking.transition(alice,saved.id,{action:'send',version:saved.version,protocol:'PROTO-01'});assert.equal(saved.tracking.stage,'sent');

 assert.equal(JSON.stringify((await service.get(alice,saved.id)).document),snapshot);
 await assert.rejects(service.save(alice,saved.id,{document,version:saved.version,action:'revise'}),/enviado/);
 await assert.rejects(tracking.list(bob,{factory:true}),{status:403});
 await assert.rejects(tracking.transition(alice,saved.id,{action:'accept',version:saved.version}),{status:403});
 await assert.rejects(tracking.transition(factory,saved.id,{action:'accept',version:saved.version-1}),{status:409});
 assert.equal((await tracking.list(factory,{factory:true})).orders.length,1);
 assert.equal((await tracking.detail(factory,saved.id,{factory:true})).document.client,document.client);
 await assert.rejects(tracking.detail(bob,saved.id,{factory:true}),{status:403});
 saved=await tracking.transition(factory,saved.id,{action:'accept',version:saved.version});assert.equal(saved.tracking.stage,'accepted');assert.equal(saved.tracking.acceptedById,'factory');
 await assert.rejects(service.remove(alice,saved.id,{version:saved.version}),/não podem ser excluídos/);
 assert.equal(JSON.stringify((await service.get(alice,saved.id)).document),snapshot);
 await assert.rejects(service.save(alice,saved.id,{document,version:saved.version,action:'revise'}),/aceito/);
 await assert.rejects(tracking.transition(factory,saved.id,{action:'return',version:saved.version,note:'Teste'}),/aguardando aceite/);
 assert.equal((await tracking.list(alice)).orders[0].tracking.stage,'accepted');
});
test('factory returns require reasons and allow a new reviewed revision without losing previous events',async()=>{
 const {OrderTrackingService}=await import('../lib/order-tracking.mjs');
 const {service}=setup(),owner={userId:'alice'},factory={userId:'factory'},tracking=new OrderTrackingService(service.db,service.bucket,service,'factory'),document=demoOrder();Object.assign(document,{deliveryDate:'2026-12-20',artist:'Andrei'});
 let order=await service.save(owner,null,{document,action:'release',checks:{art:true,list:true,technical:true}});
 order=await tracking.transition(owner,order.id,{action:'send',version:order.version});
 await assert.rejects(tracking.transition(factory,order.id,{action:'return',version:order.version}),/motivo/);
 order=await tracking.transition(factory,order.id,{action:'return',version:order.version,note:'Conferir gola'});assert.equal(order.tracking.stage,'returned');
 order=await service.save(owner,order.id,{document,version:order.version,action:'revise'});assert.equal(order.tracking.stage,'draft');assert.equal(order.tracking.revision,2);assert.equal(order.tracking.sentAt,null);assert.equal(order.tracking.checkedAt,null);assert.ok(order.tracking.events.some(e=>e.action==='return'));
 await assert.rejects(tracking.transition(owner,order.id,{action:'send',version:order.version}),/Confira/);
});
test('reminder eligibility starts the next Sao Paulo calendar day and excludes drafts, sent, accepted and returned orders',async()=>{
 const {localDay,reminderDue}=await import('../lib/order-tracking.mjs');
 const checked={stage:'checked',checkedAt:'2026-10-23T02:59:00Z'};
 assert.equal(localDay(checked.checkedAt),'2026-10-22');assert.equal(reminderDue(checked,new Date('2026-10-23T02:59:59Z')),false);
 assert.equal(reminderDue(checked,new Date('2026-10-23T03:00:00Z')),true);
 for(const stage of ['draft','sent','accepted','returned'])assert.equal(reminderDue({...checked,stage},new Date('2026-10-24T12:00:00Z')),false);
});
test('reminders are owner isolated and dismissal persists across requests without changing order state',async()=>{
 const {OrderTrackingService,localDay}=await import('../lib/order-tracking.mjs');
 const {service,sql}=setup(),owner={userId:'alice'},other={userId:'bob'},tracking=new OrderTrackingService(service.db,service.bucket,service,'factory'),document=demoOrder();Object.assign(document,{deliveryDate:'2026-12-20',artist:'Andrei'});
 const saved=await service.save(owner,null,{document,action:'release',checks:{art:true,list:true,technical:true}});
 const row=sql.prepare('SELECT tracking_json FROM production_orders WHERE id=?').get(saved.id),data=JSON.parse(row.tracking_json);data.checkedAt='2020-01-01T12:00:00Z';sql.prepare('UPDATE production_orders SET tracking_json=? WHERE id=?').run(JSON.stringify(data),saved.id);
 assert.equal((await tracking.reminders(owner)).show,true);assert.equal((await tracking.reminders(other)).show,false);
 await tracking.dismissReminder(owner);assert.equal((await tracking.reminders(owner)).show,false);assert.equal((await service.get(owner,saved.id)).tracking.stage,'checked');
 assert.equal((await tracking.reminders(owner,new Date(Date.now()+2*86400000))).show,true);
});
test('factory permissions are administrator controlled and self profile edits cannot grant them',async()=>{
 const {OrderTrackingService}=await import('../lib/order-tracking.mjs');
 const {service,sql}=setup(),admin={userId:'factory'},designer={userId:'alice'},tracking=new OrderTrackingService(service.db,service.bucket,service,'factory');
 sql.prepare("INSERT INTO profiles(user_id,display_name,created_at,updated_at) VALUES ('alice','Alice','2026-01-01','2026-01-01')").run();
 assert.equal(await tracking.factoryAllowed(designer),false);await assert.rejects(tracking.setMember(designer,{id:'alice',enabled:true}),{status:403});
 await tracking.setMember(admin,{id:'alice',enabled:true});assert.equal(await tracking.factoryAllowed(designer),true);await tracking.setMember(admin,{id:'alice',enabled:false});assert.equal(await tracking.factoryAllowed(designer),false);
});

test('saved production summaries retain durable reverse links to the exact list and presentation IDs',async()=>{
 const {service}=setup(),owner={userId:'alice'},doc=applyListToOrder(newOrder(),integratedRows,{id:'list1',version:2,name:'Lista salva'});
 for(const p of doc.pages.flatMap(page=>page.products))p.projectRef={id:'project1',name:'Desenho',version:4,templateId:'mold',format:'four-transparent-v1'};
 const saved=await service.save(owner,null,{document:doc});assert.equal(saved.tracking.listId,'list1');assert.deepEqual(saved.tracking.projectIds,['project1']);
 const again=await service.get(owner,saved.id);assert.equal(again.document.listSource.version,2);assert.equal(again.document.pages[0].products[0].projectRef.version,4);
});
