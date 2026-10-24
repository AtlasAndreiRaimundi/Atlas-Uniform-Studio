import {test} from 'node:test';
import assert from 'node:assert/strict';
import {workflowRoute,workflowActions,canAttachToOrder} from '../public/workflow-contract.js';
import {suggestListName} from '../public/workflow-contract.js';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';

test('next-step guidance stays hidden for creation and draft saves and appears only after explicit completion',async()=>{
 class Element{constructor(){this.children=[];this.classList={add(){}};}append(...nodes){this.children.push(...nodes);}replaceChildren(){this.children=[];}setAttribute(){}}
 const host=new Element(),document={querySelector:selector=>selector==='link[data-workflow-style]'?{}:host,createElement:()=>new Element()};
 const context=vm.createContext({document,workflowActions});vm.runInContext((await readFile(new URL('../public/workflow-guide.js',import.meta.url),'utf8')).replace(/^import .*;\r?\n/gm,'').replace(/export /g,''),context);
 const guide=vm.runInContext('createWorkflowGuide({mount:"#guide",onAction(){}})',context);
 for(const kind of ['list','presentation','order']){
  guide.update({kind,id:'one',created:true,ready:true,completed:false});assert.equal(host.hidden,true);
  guide.update({kind,id:'one',created:true,ready:true,completed:true,locked:kind==='order'});assert.equal(host.hidden,false);
  guide.update({kind,id:'one',ready:false,completed:false});assert.equal(host.hidden,true);
 }
});
test('list name suggestions use selected order or presentation context and leave room for manual naming',()=>{
 assert.equal(suggestListName({order:{number:'441',client:'Equipe A',title:'Treino'}}),'Lista · 441 · Equipe A');
 assert.equal(suggestListName({presentation:{clientName:'Equipe A',name:'Treino azul'}}),'Lista · Equipe A · Treino azul');
 assert.equal(suggestListName({product:'Kit',model:'Jogo',color:'Azul'}),'Lista · Jogo · Azul · Kit');
 assert.equal(suggestListName({presentation:{name:'x'.repeat(150)}}).length,100);
});
test('list handoff identifies a saved list and explicitly chooses a new or existing order',()=>{
 const fresh=new URL(workflowRoute('order',{listId:'list A',created:true}),'https://studio.test');assert.equal(fresh.pathname,'/pedidos');assert.equal(fresh.searchParams.get('list'),'list A');assert.equal(fresh.searchParams.get('new'),'1');assert.equal(fresh.searchParams.get('order'),null);
 const existing=new URL(workflowRoute('order',{listId:'list A',orderId:'order B'}),'https://studio.test');assert.equal(existing.searchParams.get('order'),'order B');assert.equal(existing.searchParams.has('new'),false);
});
test('presentation handoff preserves exact order and garment context and requests attachment',()=>{
 const url=new URL(workflowRoute('order',{projectId:'project&one',orderId:'order/two',itemId:'item=three',attach:true}),'https://studio.test');assert.equal(url.searchParams.get('project'),'project&one');assert.equal(url.searchParams.get('order'),'order/two');assert.equal(url.searchParams.get('item'),'item=three');assert.equal(url.searchParams.get('attach'),'1');assert.equal(url.origin,'https://studio.test');
});
test('new list and presentation paths retain the originating order',()=>{
 const list=new URL(workflowRoute('list',{orderId:'O',created:true}),'https://studio.test');assert.equal(list.pathname,'/organizador');assert.equal(list.searchParams.get('order'),'O');assert.equal(list.searchParams.get('new'),'1');
 const presentation=new URL(workflowRoute('presentation',{orderId:'O',itemId:'P'}),'https://studio.test');assert.equal(presentation.pathname,'/projects');assert.equal(presentation.searchParams.get('order'),'O');assert.equal(presentation.searchParams.get('item'),'P');
});
test('only editable drafts are offered as attachment destinations, including legacy release protection',()=>{
 assert.equal(canAttachToOrder({tracking:{stage:'draft'}}),true);
 for(const stage of ['checked','sent','accepted','returned'])assert.equal(canAttachToOrder({tracking:{stage}}),false);
 assert.equal(canAttachToOrder({document:{workflow:{status:'released'}}}),false);
});
test('ready linked artifacts return to their originating order while incomplete artifacts cannot attach',()=>{
 const linked=workflowActions('list',{orderId:'O',ready:true});assert.deepEqual(linked.map(a=>a.id),['attach-linked','attach-other']);assert.ok(linked.every(a=>!a.disabled));
 const incomplete=workflowActions('presentation',{ready:false});assert.ok(incomplete.every(a=>a.disabled));
});
test('an order offers both new and saved list/design choices and locked revisions offer tracking only',()=>{
 assert.deepEqual(workflowActions('order').map(a=>a.id),['list-new','list-existing','presentation-new','presentation-existing']);assert.deepEqual(workflowActions('order',{locked:true}).map(a=>a.id),['tracking']);
});

test('reopened saved lists and presentations find all their linked orders without confusing names',async()=>{
 const {linkedWorkflowOrders}=await import('../public/workflow-contract.js');
 const orders=[{id:'A',title:'Same name',tracking:{listId:'list1',projectIds:['project1']}},{id:'B',title:'Same name',tracking:{listId:'list2',projectIds:['project1','project2']}},{id:'C',tracking:{}}];
 assert.deepEqual(linkedWorkflowOrders('list','list1',orders).map(o=>o.id),['A']);assert.deepEqual(linkedWorkflowOrders('presentation','project1',orders).map(o=>o.id),['A','B']);
});
