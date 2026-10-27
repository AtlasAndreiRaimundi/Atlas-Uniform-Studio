import {test} from 'node:test';
import assert from 'node:assert/strict';
import {newOrder} from '../public/production-core.js';
import {catalogOrder,productDisplayName,technicalFieldChange,detectedTechniques} from '../public/product-catalog.js';
import {usePresentationKit,presentationGarments} from '../public/order-presentation.js';
test('a kit presentation makes a shared two-garment kit without duplicating its image or losing quantities',()=>{
 const o=catalogOrder(newOrder()),page=o.pages[0],shirt=page.products[0];shirt.quantity=9;const ref={id:'p',name:'Jogo',version:2};
 assert.deepEqual(presentationGarments({category:'conjunto',name:'Elite 27'}),['Camiseta','Calção']);assert.equal(presentationGarments({category:'camiseta',name:'Kit antigo'}),null);
 usePresentationKit(o,page,shirt,{category:'conjunto',name:'Elite 27'},'image',ref);assert.equal(o.compositionKind,'kit');assert.deepEqual(page.products.map(p=>p.type),['Camiseta','Calção']);assert.equal(shirt.quantity,9);assert.equal(page.visual.image,'image');assert.ok(page.products.every(p=>p.projectRef.version===2));usePresentationKit(o,page,shirt,{category:'conjunto'},'image2',ref);assert.equal(page.products.length,2);
});
test('piece names, Fluence cuts and same-fabric filets come from the selected options; applications drive header techniques',()=>{
 const o=catalogOrder(newOrder()),p=o.pages[0].products[0];technicalFieldChange(p,'collarModel','EDGE');technicalFieldChange(p,'hasSideCut',true);assert.equal(p.technical.sideCutFabric,'FLUENCE');assert.match(productDisplayName(p),/Camiseta gola EDGE com recorte/);technicalFieldChange(p,'fabricId','ELASTIC');technicalFieldChange(p,'sleeveFinish','FILETE COSTURADO');assert.equal(p.technical.filetMaterial,'MESMO TECIDO DA CAMISETA');p.technical.applications=[{type:'TPU ALTO RELEVO',perUnit:1}];assert.ok(detectedTechniques(o).includes('TPU ALTO RELEVO'));p.technical.applications=[];assert.ok(!detectedTechniques(o).includes('TPU ALTO RELEVO'));
});
