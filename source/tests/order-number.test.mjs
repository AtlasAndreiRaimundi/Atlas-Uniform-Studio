import {test} from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {migrations} from './migrations.mjs';
import {allocateOrderNumber} from '../lib/order-number.mjs';
import {ProductionService} from '../lib/production-service.mjs';
import {newOrder} from '../public/production-core.js';

function setup(){
 const sql=new DatabaseSync(':memory:');migrations.forEach(m=>sql.exec(m));
 const db={prepare(query){const statement=sql.prepare(query);let args=[];return {bind(...values){args=values;return this;},async first(){return statement.get(...args)||null;},async all(){return {results:statement.all(...args)};}};}};
 const objects=new Map(),bucket={async put(key,value){objects.set(key,value);},async get(key){return objects.has(key)?{json:async()=>JSON.parse(objects.get(key))}:null;},async delete(key){objects.delete(key);},async list({prefix}){return {objects:[...objects.keys()].filter(key=>key.startsWith(prefix)).map(key=>({key})),truncated:false};}};
 const service=new ProductionService(db,bucket,{now:new Date('2026-10-27T12:00:00Z')});
 function legacy(number){const id=crypto.randomUUID(),document={...newOrder(),number},key='legacy/'+id;objects.set(key,JSON.stringify(document));sql.prepare('INSERT INTO production_orders (id,owner_id,title,client,order_number,object_key,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?)').run(id,'legacy',document.title,'',number,key,'old','old');return id;}
 return {sql,db,objects,service,legacy};
}
const alice={userId:'alice'},bob={userId:'bob'};

test('new codes are server generated, unique across accounts and persisted in the document',async()=>{
 const {service}=setup(),document={...newOrder(),number:'9999-99-OUTRA'};
 const saved=await Promise.all(Array.from({length:20},(_,i)=>service.save(i%2?alice:bob,null,{document})));
 assert.equal(new Set(saved.map(o=>o.number)).size,20);assert.deepEqual(saved.map(o=>o.number).sort(),Array.from({length:20},(_,i)=>String(i+1).padStart(4,'0')+'-10-MNZ'));
 for(const [i,order] of saved.entries())assert.equal((await service.get(i%2?alice:bob,order.id)).document.number,order.number);
 assert.equal(document.number,'9999-99-OUTRA','allocation never mutates the request object');
});

test('the month uses the creation time in Sao Paulo and the identifier continues across months',async()=>{
 const {db}=setup();
 assert.equal(await allocateOrderNumber(db,{now:new Date('2026-11-01T02:59:59Z')}),'0001-10-MNZ');
 assert.equal(await allocateOrderNumber(db,{now:new Date('2026-11-01T03:00:00Z')}),'0002-11-MNZ');
});

test('existing unit identifiers seed the sequence without renumbering legacy orders',async()=>{
 const {legacy,service}=setup(),id=legacy('0042-03-mnz');legacy('0080-MNZ');legacy('9100-10-ABC');
 const saved=await service.save(alice,null,{document:newOrder()});assert.equal(saved.number,'0081-10-MNZ');
 const old=await service.get({userId:'legacy'},id);old.document.number='forged';
 const updated=await service.save({userId:'legacy'},id,{version:old.version,document:old.document});assert.equal(updated.number,'0042-03-mnz');
 assert.equal((await service.get({userId:'legacy'},id)).document.number,'0042-03-mnz');
});

test('editing dates or forging a number cannot change an assigned code, and importing a copy gets a new code',async()=>{
 const {service}=setup(),saved=await service.save(alice,null,{document:newOrder()}),order=await service.get(alice,saved.id);
 order.document.number='9000-01-ABC';order.document.orderDate='2027-06-20';
 const updated=await service.save(alice,order.id,{version:order.version,document:order.document});assert.equal(updated.number,saved.number);
 const copy=await service.save(alice,null,{document:order.document});assert.equal(copy.number,'0002-10-MNZ');assert.notEqual(copy.id,saved.id);
});

test('deletion does not reuse an identifier and an existing blank code is assigned on its next save',async()=>{
 const {service,legacy}=setup(),saved=await service.save(alice,null,{document:newOrder()});await service.remove(alice,saved.id,{version:saved.version});
 const next=await service.save(alice,null,{document:newOrder()});assert.equal(next.number,'0002-10-MNZ');
 const id=legacy(''),old=await service.get({userId:'legacy'},id),updated=await service.save({userId:'legacy'},id,{version:old.version,document:old.document});assert.equal(updated.number,'0003-10-MNZ');
});

test('future server configured units have separate sequences and the four digit limit cannot wrap or reuse codes',async()=>{
 const {db,legacy}=setup(),now=new Date('2026-10-27T12:00:00Z');
 assert.equal(await allocateOrderNumber(db,{unit:'ABC',now}),'0001-10-ABC');assert.equal(await allocateOrderNumber(db,{now}),'0001-10-MNZ');
 legacy('9998-09-MNZ');assert.equal(await allocateOrderNumber(db,{now}),'9999-10-MNZ');
 await assert.rejects(allocateOrderNumber(db,{now}),{status:409});await assert.rejects(allocateOrderNumber(db,{unit:'invalid unit',now}),{status:500});
});
