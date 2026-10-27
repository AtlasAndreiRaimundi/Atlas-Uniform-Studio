import {test} from 'node:test';
import assert from 'node:assert/strict';
import {syncApplicationArrows,pieceFamilies,syncConfirmedApplicationPositions} from '../public/order-linked-applications.js';
import {catalogOrder} from '../public/product-catalog.js';
import {newOrder} from '../public/production-core.js';
import {validateDocument} from '../lib/production-service.mjs';
test('application arrows follow per-piece counts, retain manual positions and remove only linked arrows',()=>{const order=catalogOrder(newOrder()),page=order.pages[0],p=page.products[0];p.technical.applications=[{id:'a',type:'TPU ALTO RELEVO',role:'ESCUDO',perUnit:2,position:'Peito',exception:''}];assert.equal(syncApplicationArrows(page,p).length,2);page.annotations[0].x=244;const id=page.annotations[0].id;page.annotations.push({id:'free',type:'text',productId:p.id,text:'Livre',x:30,y:30,x2:40,y2:40,size:8,width:1,color:'#235394'});p.technical.applications[0].perUnit=1;syncApplicationArrows(page,p);assert.equal(page.annotations.find(a=>a.id===id).x,244);assert.ok(page.annotations.some(a=>a.id==='free'));assert.equal(validateDocument(order).pages[0].annotations.find(a=>a.id===id).applicationId,'a');p.technical.applications=[];syncApplicationArrows(page,p);assert.deepEqual(page.annotations.map(a=>a.id),['free']);assert.equal(pieceFamilies(page).length,1);});


test('distinct applications keep distinct arrows while equivalent fits share confirmed position without touching another garment',()=>{
 const order=catalogOrder(newOrder()),pg=order.pages[0],p=pg.products[0];p.technical.fit='MASCULINA';p.technical.applications=[{id:'first',role:'ESCUDO',type:'TPU ALTO RELEVO',perUnit:1,position:'Conforme seta no desenho',exception:''},{id:'second',role:'ESCUDO',type:'TPU ALTO RELEVO',perUnit:1,position:'',exception:''}];
 syncApplicationArrows(pg,p);assert.equal(pg.annotations.length,2,'two separate TPU entries must not collapse into one arrow');pg.annotations[0].x2=456;
 const baby=structuredClone(p);baby.id='baby';baby.technical.fit='FEMININA';baby.technical.applications= baby.technical.applications.map((a,i)=>({...a,id:'baby-'+i,position:''}));pg.products.push(baby);
 assert.equal(syncConfirmedApplicationPositions(pg),true);assert.equal(baby.technical.applications[0].position,'Conforme seta no desenho');assert.equal(baby.technical.applications[1].position,'','an unconfirmed application stays pending');
 syncApplicationArrows(pg,baby);assert.equal(pg.annotations.length,2);assert.equal(pg.annotations[0].x2,456);
 const shorts=structuredClone(p);shorts.id='shorts';shorts.technical.productCode='CAL-001';shorts.technical.designId='other';shorts.technical.applications=[{...p.technical.applications[0],id:'short-app',position:''}];pg.products.push(shorts);syncConfirmedApplicationPositions(pg);assert.equal(shorts.technical.applications[0].position,'','a shirt arrow is never substituted for a shorts arrow');
});


test('a saved legacy shorts arrow that was already positioned repairs its missing textual position',()=>{const order=catalogOrder(newOrder()),pg=order.pages[0],p=pg.products[0];p.technical.applications=[{id:'legacy',role:'ESCUDO',type:'TPU ALTO RELEVO',perUnit:1,position:'',exception:''}];syncApplicationArrows(pg,p);assert.equal(p.technical.applications[0].position,'');pg.annotations[0].x2=321;assert.equal(syncConfirmedApplicationPositions(pg),true);assert.equal(p.technical.applications[0].position,'Conforme seta no desenho');});
