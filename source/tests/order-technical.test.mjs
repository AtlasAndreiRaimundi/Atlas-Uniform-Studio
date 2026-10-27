import {test} from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {createHash} from 'node:crypto';
import {migrations} from './migrations.mjs';
import {ProductionService} from '../lib/production-service.mjs';
import {OrderTrackingService} from '../lib/order-tracking.mjs';
import {OrderTechnicalService} from '../lib/order-technical-service.mjs';
import {demoOrder,applyListToOrder,newOrder} from '../public/production-core.js';

const alice={userId:'alice'},bob={userId:'bob'},factory={userId:'factory'};
const cdr=(name='desenho.cdr',content='original')=>new File([new Uint8Array([82,73,70,70,50,0,0,0,67,68,82,70]),content],name,{type:'application/octet-stream'});
function setup(){
 const sql=new DatabaseSync(':memory:');sql.exec('PRAGMA foreign_keys=ON');migrations.forEach(m=>sql.exec(m));
 const db={prepare(query){const statement=sql.prepare(query);let args=[];return {bind(...values){args=values;return this;},async first(){return statement.get(...args)||null;},async all(){return {results:statement.all(...args)};},async run(){return {meta:{changes:Number(statement.run(...args).changes)}};}};}};
 const objects=new Map(),bucket={async put(key,body,options){objects.set(key,{bytes:new Uint8Array(await new Response(body).arrayBuffer()),...options});},async get(key){const value=objects.get(key);return value?{...value,body:new Blob([value.bytes]).stream(),json:async()=>JSON.parse(new TextDecoder().decode(value.bytes))}:null;},async delete(keys){for(const key of Array.isArray(keys)?keys:[keys])objects.delete(key);},async list({prefix}){return {objects:[...objects.keys()].filter(key=>key.startsWith(prefix)).map(key=>({key})),truncated:false};}};
 const production=new ProductionService(db,bucket),tracking=new OrderTrackingService(db,bucket,production,'admin'),technical=new OrderTechnicalService(db,bucket,production,tracking);
 const document=demoOrder();Object.assign(document,{number:'0001-01-MNZ',artist:'Designer',deliveryDate:'2099-11-20'});
 async function saved(){return production.get(alice,(await production.save(alice,null,{document})).id);}
 async function release(order){await production.save(alice,order.id,{document:order.document,version:order.version,action:'release',checks:{art:true,list:true,technical:true}});return production.get(alice,order.id);}
 return {sql,objects,bucket,production,tracking,technical,saved,release,document};
}

test('CDR uploads preserve bytes and hashes and enforce owner, file format, version and immutable revisions',async()=>{
 const {technical,production,objects,saved,release}=setup();let order=await saved();const before=objects.size;
 await assert.rejects(technical.attach(bob,order.id,order.version,cdr()),{status:404});
 await assert.rejects(technical.attach(alice,order.id,order.version+1,cdr()),{status:409});
 await assert.rejects(technical.attach(alice,order.id,order.version,new File(['bad'],'fake.cdr')),{status:400});
 await assert.rejects(technical.attach(alice,order.id,order.version,{size:21*1024*1024}),{status:413});assert.equal(objects.size,before);
 const file=cdr();order=await technical.attach(alice,order.id,order.version,file);const ref=order.document.technicalFiles[0],download=await technical.download(alice,order.id,ref.id);
 assert.equal(ref.sha256,createHash('sha256').update(new Uint8Array(await file.arrayBuffer())).digest('hex'));assert.deepEqual(download.object.bytes,new Uint8Array(await file.arrayBuffer()));
 await assert.rejects(production.save(bob,null,{document:order.document}),{status:400});
 const other=await saved();await assert.rejects(production.save(alice,other.id,{version:other.version,document:{...other.document,technicalFiles:[ref]}}),{status:404});
 order=await release(order);const count=objects.size;
 await assert.rejects(technical.attach(alice,order.id,order.version,cdr('novo.cdr')),{status:400});await assert.rejects(technical.detach(alice,order.id,ref.id,order.version),{status:400});assert.equal(objects.size,count);
});

test('a removed CDR stays available on its released revision and factory downloads require explicit permission',async()=>{
 const {sql,production,tracking,technical,saved,release}=setup();let order=await saved();order=await technical.attach(alice,order.id,order.version,cdr());const ref=order.document.technicalFiles[0];order=await release(order);
 await assert.rejects(technical.delivery(bob,order.id),{status:404});await assert.rejects(technical.delivery(factory,order.id,{factory:true}),{status:403});
 sql.prepare('INSERT INTO profiles (user_id,display_name,factory_access,created_at,updated_at) VALUES (?,?,?,?,?)').run('factory','Fábrica',1,'now','now');
 await tracking.transition(alice,order.id,{action:'send',version:order.version});order=await production.get(alice,order.id);
 const delivery=await technical.delivery(factory,order.id,{factory:true,version:String(order.version)});assert.equal(delivery.files[0].id,ref.id);assert.ok(delivery.files[0].url.includes('factory=1'));
 assert.deepEqual((await technical.download(factory,order.id,ref.id,{factory:true})).object.bytes,new Uint8Array(await cdr().arrayBuffer()));
 await assert.rejects(technical.delivery(factory,order.id,{factory:true,revision:1}),{status:403});
 await tracking.transition(factory,order.id,{action:'return',version:order.version,note:'Trocar arquivo'});order=await production.get(alice,order.id);
 await production.save(alice,order.id,{document:order.document,version:order.version,action:'revise'});order=await production.get(alice,order.id);
 order=await technical.detach(alice,order.id,ref.id,order.version);assert.equal(order.document.technicalFiles.length,0);
 await assert.rejects(technical.download(alice,order.id,ref.id),{status:404});assert.equal((await technical.download(alice,order.id,ref.id,{revision:1})).sha256,ref.sha256);
 await assert.rejects(technical.delivery(alice,order.id),{status:400});
});

test('complements create independent orders, reset approvals and dates and retain an immutable source reference',async()=>{
 const {technical,production,saved,release}=setup();let source=await saved();source=await technical.attach(alice,source.id,source.version,cdr());source=await release(source);const before=structuredClone(source);
 const copy=await technical.complement(alice,source.id,{version:source.version,number:'0001-02-MNZ',changes:'Mais peças',copyList:false});
 assert.notEqual(copy.id,source.id);assert.equal(copy.document.origin.id,source.id);assert.equal(copy.document.origin.revision,1);assert.equal(copy.document.previousOrder,source.document.number);assert.equal(copy.document.workflow.status,'draft');assert.deepEqual(copy.document.workflow.history,[]);assert.equal(copy.document.deliveryDate,'');assert.equal(copy.document.dispatchDate,'');assert.equal(copy.document.pages[0].products[0].quantity,0);assert.equal(copy.document.pages[0].products[0].fabric,source.document.pages[0].products[0].fabric);assert.notEqual(copy.document.pages[0].products[0].id,source.document.pages[0].products[0].id);
 assert.notEqual(copy.document.technicalFiles[0].id,source.document.technicalFiles[0].id);assert.equal(copy.document.technicalFiles[0].sha256,source.document.technicalFiles[0].sha256);assert.deepEqual(await production.get(alice,source.id),before);
 const forged={...copy.document,origin:{id:'bob'},previousOrder:'wrong'};await production.save(alice,copy.id,{version:copy.version,document:forged});assert.equal((await production.get(alice,copy.id)).document.origin.id,source.id);
 await production.remove(alice,source.id,{version:source.version});assert.equal((await technical.download(alice,copy.id,copy.document.technicalFiles[0].id)).sha256,source.document.technicalFiles[0].sha256);
});

test('copying the previous list is explicit, detaches its identity and concurrent complements receive distinct automatic codes',async()=>{
 const {technical,production}=setup(),document=applyListToOrder(newOrder(),[{produto:'Kit',nome:'Ana',numero:'07',adicional:'CAPITÃ',grupo:'Linha',tamanhoCamiseta:'M',tamanhoCalcao:'G',quantidade:2}],{id:'source-list',version:3,name:'Equipe'});document.number='0001-01-MNZ';
 const source=await production.get(alice,(await production.save(alice,null,{document})).id),input={version:source.version,number:'0001-02-MNZ',type:'COMPLEMENTO COM ALTERAÇÕES',changes:'Novas mangas',copyList:true};
 const attempts=await Promise.allSettled([technical.complement(alice,source.id,input),technical.complement(alice,source.id,input)]);assert.equal(attempts.filter(r=>r.status==='fulfilled').length,2);assert.equal(new Set(attempts.map(r=>r.value.number)).size,2);assert.ok(attempts.every(r=>r.value.number!==input.number&&r.value.number!==source.number));
 const copy=attempts.find(r=>r.status==='fulfilled').value;assert.equal(copy.document.listSource.id,undefined);assert.equal(copy.document.pages[0].products[0].names[0].number,'07');assert.equal(copy.document.pages[0].products[1].names[0].size,'G');assert.equal(copy.document.pages[0].products[0].names[0].additional,'CAPITÃ');
 const next=await technical.complement(alice,source.id,{...input,number:'0001-02-mnz'});assert.notEqual(next.number,input.number);assert.notEqual(next.number,copy.number);await assert.rejects(technical.complement(bob,source.id,input),{status:404});await assert.rejects(technical.complement(alice,source.id,{...input,version:source.version+1}),{status:409});await assert.rejects(technical.complement(alice,source.id,{...input,number:'0001-03-MNZ',changes:''}),{status:400});
});

test('a failed attachment save cleans only the new file and failed complement copies leave the original intact',async()=>{
 const {technical,production,objects,saved,sql}=setup();let source=await saved();source=await technical.attach(alice,source.id,source.version,cdr());const row=sql.prepare('SELECT object_key FROM order_technical_files WHERE id=?').get(source.document.technicalFiles[0].id);objects.delete(row.object_key);
 await assert.rejects(technical.complement(alice,source.id,{version:source.version,number:'0001-02-MNZ',copyList:false}),{status:503});assert.equal((await production.list(alice)).length,1);assert.equal((await production.get(alice,source.id)).document.number,source.document.number);assert.equal(sql.prepare('SELECT COUNT(*) AS count FROM order_technical_files').get().count,1);
 const originalSave=production.save.bind(production);production.save=async()=>{throw new Error('Save failed');};const count=objects.size;
 await assert.rejects(technical.attach(alice,source.id,source.version,cdr('outra.cdr')),/Save failed/);assert.equal(objects.size,count);assert.equal(sql.prepare('SELECT COUNT(*) AS count FROM order_technical_files').get().count,1);production.save=originalSave;
});
