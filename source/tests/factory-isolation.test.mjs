import {test} from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {migrations} from './migrations.mjs';
import {attachFixtureCDR} from './technical-fixture.mjs';
import {demoOrder} from '../public/production-core.js';
import {ProductionService} from '../lib/production-service.mjs';
import {OrderTrackingService} from '../lib/order-tracking.mjs';
import {OrderTechnicalService} from '../lib/order-technical-service.mjs';

function fixture(){
 const sql=new DatabaseSync(':memory:');sql.exec('PRAGMA foreign_keys=ON');for(const migration of migrations)sql.exec(migration);
 const db={prepare(query){const stmt=sql.prepare(query);let args=[];return {bind(...values){args=values;return this;},async first(){return stmt.get(...args)||null;},async all(){return {results:stmt.all(...args)};},async run(){stmt.run(...args);return {ok:true};}};}};
 const objects=new Map();
 const bucket={
  async put(key,body){objects.set(key,new Uint8Array(await new Response(body).arrayBuffer()));},
  async get(key){const bytes=objects.get(key);return bytes?{bytes,body:new Blob([bytes]).stream(),json:async()=>JSON.parse(new TextDecoder().decode(bytes))}:null;},
  async delete(key){for(const item of Array.isArray(key)?key:[key])objects.delete(item);},
  async list({prefix}){return {objects:[...objects.keys()].filter(key=>key.startsWith(prefix)).map(key=>({key})),truncated:false};}
 };
 const production=new ProductionService(db,bucket),tracking=new OrderTrackingService(db,bucket,production,'admin'),technical=new OrderTechnicalService(db,bucket,production,tracking);
 for(const id of ['owner','mnz','adi','dual','legacy'])sql.prepare('INSERT INTO profiles(user_id,display_name,factory_access,created_at,updated_at) VALUES (?,?,?,?,?)').run(id,id,id==='legacy'?1:0,'now','now');
 const admin={userId:'admin'},owner={userId:'owner'},mnz={userId:'mnz'},adi={userId:'adi'},dual={userId:'dual'},legacy={userId:'legacy'};
 return {sql,production,tracking,technical,admin,owner,mnz,adi,dual,legacy};
}
async function approve(f,factoryId){
 const document=demoOrder();Object.assign(document,{factoryId,client:'Time '+factoryId,deliveryDate:'2099-12-20',artist:'Designer'});
 let order=await f.production.save(f.owner,null,{document});order=await attachFixtureCDR(f.production,f.owner,order,document);
 return f.production.save(f.owner,order.id,{version:order.version,document,action:'release',checks:{art:true,list:true,technical:true}});
}

test('approval automatically queues the immutable order only for the chosen industry',async()=>{
 const f=fixture();
 await f.tracking.setMember(f.admin,{id:'mnz',factoryId:'meinerz',enabled:true});
 await f.tracking.setMember(f.admin,{id:'adi',factoryId:'adiprime',enabled:true});
 await f.tracking.setMember(f.admin,{id:'dual',factoryId:'meinerz',enabled:true});
 await f.tracking.setMember(f.admin,{id:'dual',factoryId:'adiprime',enabled:true});
 const m=await approve(f,'meinerz'),a=await approve(f,'adiprime');
 assert.equal(m.tracking.stage,'sent');assert.equal(a.tracking.stage,'sent');
 assert.equal(m.factoryId,'meinerz');assert.equal(a.factoryId,'adiprime');
 assert.ok(m.tracking.events.some(e=>e.action==='publish'&&e.factoryId==='meinerz'));
 assert.equal((await f.tracking.list(f.mnz,{factory:true})).orders.map(o=>o.id).join(),m.id);
 assert.equal((await f.tracking.list(f.adi,{factory:true})).orders.map(o=>o.id).join(),a.id);
 assert.equal((await f.tracking.list(f.dual,{factory:true})).orders.length,2);
 assert.equal((await f.tracking.list(f.dual,{factory:true,industry:'meinerz'})).orders.length,1);
 assert.equal((await f.tracking.list(f.dual,{factory:true,industry:'adiprime'})).orders.length,1);
 await assert.rejects(f.tracking.list(f.mnz,{factory:true,industry:'adiprime'}),{status:403});
 await assert.rejects(f.tracking.detail(f.mnz,a.id,{factory:true}),{status:404});
 await assert.rejects(f.tracking.preview(f.mnz,a.id,{factory:true}),{status:404});
 await assert.rejects(f.technical.delivery(f.mnz,a.id,{factory:true}),{status:404});
 await assert.rejects(f.tracking.recordDownload(f.mnz,a.id,{kind:'pdf',version:a.version}),{status:404});
 await assert.rejects(f.tracking.list(f.legacy,{factory:true}),{status:403},'old generic factory_access flag must grant nothing');
 const delivery=await f.technical.delivery(f.mnz,m.id,{factory:true});
 assert.equal(delivery.files.length,1);
 await f.technical.download(f.mnz,m.id,delivery.files[0].id,{factory:true});
 await f.tracking.recordDownload(f.mnz,m.id,{kind:'pdf',version:m.version});
 const downloads=f.sql.prepare('SELECT kind,factory_id FROM factory_download_events WHERE order_id=? ORDER BY created_at').all(m.id);
 assert.deepEqual(downloads.map(r=>r.kind).sort(),['cdr','pdf']);
 assert.ok((await f.tracking.list(f.mnz,{factory:true})).orders[0].tracking.downloadedAt);
});

test('admin transfer revokes old-industry access immediately and revoking membership blocks downloads',async()=>{
 const f=fixture();
 await f.tracking.setMember(f.admin,{id:'mnz',factoryId:'meinerz',enabled:true});
 await f.tracking.setMember(f.admin,{id:'adi',factoryId:'adiprime',enabled:true});
 let order=await approve(f,'meinerz');
 await assert.rejects(f.tracking.transition(f.mnz,order.id,{action:'transfer',version:order.version,factoryId:'adiprime'}),{status:403});
 order=await f.tracking.transition(f.admin,order.id,{action:'transfer',version:order.version,factoryId:'adiprime',note:'Capacidade de produção'});
 assert.equal(order.factoryId,'adiprime');assert.equal(order.tracking.stage,'sent');
 assert.equal((await f.tracking.list(f.mnz,{factory:true})).orders.length,0);
 await assert.rejects(f.tracking.detail(f.mnz,order.id,{factory:true}),{status:404});
 assert.equal((await f.tracking.list(f.adi,{factory:true})).orders.length,1);
 assert.equal((await f.tracking.detail(f.adi,order.id,{factory:true})).document.factoryId,'adiprime');
 assert.ok(order.tracking.events.some(e=>e.action==='transfer'&&e.factoryId==='adiprime'));
 await f.tracking.setMember(f.admin,{id:'adi',factoryId:'adiprime',enabled:false});
 await assert.rejects(f.technical.delivery(f.adi,order.id,{factory:true}),{status:403});
 await f.tracking.setMember(f.admin,{id:'adi',factoryId:'adiprime',enabled:true});
 order=await f.tracking.transition(f.adi,order.id,{action:'accept',version:order.version});
 assert.equal(order.tracking.stage,'accepted');
 await assert.rejects(f.tracking.transition(f.admin,order.id,{action:'transfer',version:order.version,factoryId:'meinerz'}),{status:400});
});

test('old approved orders remain unassigned and invisible until explicitly routed',async()=>{
 const f=fixture();
 await f.tracking.setMember(f.admin,{id:'mnz',factoryId:'meinerz',enabled:true});
 const order=await approve(f,'');assert.equal(order.tracking.stage,'checked');assert.equal(order.factoryId,'');
 assert.equal((await f.tracking.list(f.mnz,{factory:true})).orders.length,0);
 const sent=await f.tracking.transition(f.owner,order.id,{action:'send',version:order.version,factoryId:'meinerz'});
 assert.equal(sent.tracking.stage,'sent');assert.equal(sent.factoryId,'meinerz');
 assert.equal((await f.tracking.list(f.mnz,{factory:true})).orders.length,1);
});
