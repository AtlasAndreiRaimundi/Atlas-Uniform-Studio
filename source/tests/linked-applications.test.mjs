import {test} from 'node:test';
import assert from 'node:assert/strict';
import {syncApplicationArrows,pieceFamilies} from '../public/order-linked-applications.js';
import {catalogOrder} from '../public/product-catalog.js';
import {newOrder} from '../public/production-core.js';
import {validateDocument} from '../lib/production-service.mjs';
test('application arrows follow per-piece counts, retain manual positions and remove only linked arrows',()=>{const order=catalogOrder(newOrder()),page=order.pages[0],p=page.products[0];p.technical.applications=[{id:'a',type:'TPU ALTO RELEVO',role:'ESCUDO',perUnit:2,position:'Peito',exception:''}];assert.equal(syncApplicationArrows(page,p).length,2);page.annotations[0].x=244;const id=page.annotations[0].id;page.annotations.push({id:'free',type:'text',productId:p.id,text:'Livre',x:30,y:30,x2:40,y2:40,size:8,width:1,color:'#235394'});p.technical.applications[0].perUnit=1;syncApplicationArrows(page,p);assert.equal(page.annotations.find(a=>a.id===id).x,244);assert.ok(page.annotations.some(a=>a.id==='free'));assert.equal(validateDocument(order).pages[0].annotations.find(a=>a.id===id).applicationId,'a');p.technical.applications=[];syncApplicationArrows(page,p);assert.deepEqual(page.annotations.map(a=>a.id),['free']);assert.equal(pieceFamilies(page).length,1);});
