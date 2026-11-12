import {test} from 'node:test';
import assert from 'node:assert/strict';
import {requiredFinishes,finishMarked,finishProblems,beginFinish,confirmFinish,syncFinishNotes} from '../public/order-finishes.js';
import {catalogOrder,technicalFieldChange} from '../public/product-catalog.js';
import {newOrder,releaseProblems} from '../public/production-core.js';
import {validateDocument} from '../lib/production-service.mjs';
import {listTargets,normalizeEntryRows} from '../public/order-list-entry.js';
import {newKitPage} from '../public/production-core.js';
const fixture=()=>{const order=catalogOrder(newOrder()),page=order.pages[0],product=page.products[0];product.technical.collarModel='REDONDA';product.technical.collarFinish='RIBANA';return {order,page,product};};
test('selected finishes require confirmed linked arrows and survive server normalization',()=>{
 const {order,page,product}=fixture();technicalFieldChange(product,'sleeveFinish','FILETE COSTURADO');technicalFieldChange(product,'hasSideCut',true);
 assert.deepEqual(requiredFinishes(product).map(f=>f.id),['collar','sleeve','side-cut']);assert.equal(finishProblems(order).length,3);
 for(const f of requiredFinishes(product)){beginFinish(page,product,f.id);assert.equal(finishMarked(page,product,f),false);confirmFinish(page,product,f.id);}
 const clean=validateDocument(order);assert.deepEqual(finishProblems(clean),[]);assert.ok(!releaseProblems(clean).some(s=>s.includes('marque e confirme')));
 page.annotations.splice(0,1);assert.equal(finishProblems(order).length,1);assert.ok(releaseProblems(order).some(s=>s.includes('GOLA')));
});
test('changing or removing a finish invalidates only its own arrow, preserving TPU and free notes',()=>{
 const {order,page,product}=fixture();beginFinish(page,product,'collar');confirmFinish(page,product,'collar');page.annotations.push({id:'free',type:'text',text:'Livre',productId:product.id},{id:'tpu',applicationId:'TPU',productId:product.id});
 technicalFieldChange(product,'collarModel','V');syncFinishNotes(page);assert.deepEqual(page.annotations.map(a=>a.id),['free','tpu']);assert.equal(finishProblems(order).length,1);
});
test('equivalent fits share a finish arrow, but another garment cannot reuse it',()=>{
 const {order,page,product}=fixture();const baby=structuredClone(product);baby.id='baby';baby.technical.fit='FEMININA';page.products.push(baby);beginFinish(page,product,'collar');confirmFinish(page,product,'collar');assert.deepEqual(finishProblems(order),[]);
 baby.technical.collarFinish='GALÃO';assert.equal(finishProblems(order).length,1);baby.technical.collarFinish='RIBANA';page.annotations[0].productId='unrelated';assert.equal(finishProblems(order).length,2);
});
test('shorts select their actual optional construction finishes',()=>{
 const {product}=fixture();product.type='Calção';Object.assign(product.technical,{productCode:'CAL-001',collarModel:'',moldId:'CAL-M03',sideCutFabric:'FLUENCE',drawstringColor:'BRANCO'});assert.deepEqual(requiredFinishes(product).map(f=>f.id),['side-cut','drawstring']);
 product.technical.moldId='CAL-F01';assert.ok(requiredFinishes(product).some(f=>f.id==='bias'));
});
test('the simple list preserves blank names, leading zeroes, separate kit sizes and advanced existing values',()=>{
 const order=newOrder();order.pages=[newKitPage()];assert.equal(listTargets(order)[0].produto,'Kit');
 const [row]=normalizeEntryRows([{produto:'Kit',catalogVersion:3,nome:'Ana',nomeCalcao:'',numero:'07',tamanhoCamiseta:'BLP',tamanhoCalcao:'TAM10',quantidade:'2',semNumeroCalcao:true,especialDescricaoCamiseta:'Detalhe existente'}]);assert.equal(row.nomeCalcao,'');assert.equal(row.numero,'07');assert.equal(row.quantidade,2);assert.equal(row.semNumeroCalcao,true);assert.equal(row.especialDescricaoCamiseta,'Detalhe existente');
});
