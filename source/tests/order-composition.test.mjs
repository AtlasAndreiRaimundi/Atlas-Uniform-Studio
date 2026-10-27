import {test} from 'node:test';
import assert from 'node:assert/strict';
import {newOrder,newPage,applyListToOrder,validateOrder,releaseProblems} from '../public/production-core.js';
import {catalogOrder,catalogProblems,technicalFieldChange,usesCatalogList,collarFinishes} from '../public/product-catalog.js';
import {createOrderProduct,toggleModelFit,KIT_PRESETS} from '../public/order-composition.js';
import {validateDocument} from '../lib/production-service.mjs';
import {buildSheets} from '../public/production-sheet.js';

function shirt(){const order=catalogOrder(newOrder()),page=order.pages[0],product=page.products[0];product.model='JOGO';technicalFieldChange(product,'fabricId','DRY');technicalFieldChange(product,'collarModel','PRIME');technicalFieldChange(product,'collarFinish',collarFinishes('PRIME')[0]);order.shirtSleeveCut='RAGLAN';return {order,page,product};}
const rows=[{nome:'Adulto',tamanhoCamiseta:'M'},{nome:'Baby',tamanhoCamiseta:'BLP'},{nome:'Infantil',tamanhoCamiseta:'TAM10'}].map(row=>({produto:'Camiseta',grupo:'Linha',quantidade:1,numero:'',adicional:'',tamanhoCalcao:'',...row}));

test('three model fits preserve the artwork and original quantities without copying athletes or physical application counts',()=>{
 const {order,page,product}=shirt();toggleModelFit(page,product,'MASCULINA',true);product.quantity=2;product.grade='CAMISETA\nM = 2';product.images=['data:image/png;base64,AAAA'];product.technical.applications=[{id:'shield',role:'ESCUDO',type:'APLIQUE BORDADO',perUnit:1,position:'Peito',exception:''}];
 toggleModelFit(page,product,'FEMININA',true);toggleModelFit(page,product,'INFANTIL',true);assert.deepEqual(page.products.map(p=>p.technical.fit),['MASCULINA','FEMININA','INFANTIL']);assert.deepEqual(page.products.map(p=>p.quantity),[2,0,0]);
 for(const p of page.products.slice(1)){assert.deepEqual(p.names,[]);assert.deepEqual(p.images,product.images);assert.equal(p.technical.designId,product.technical.designId);assert.deepEqual(p.technical.applications,[]);}
 const before=structuredClone(order);assert.throws(()=>toggleModelFit(page,product,'MASCULINA',false),/quantidades/);assert.deepEqual(order,before);toggleModelFit(page,product,'FEMININA',false);assert.equal(page.products.length,2);assert.equal(product.quantity,2);
});

test('a mixed list fills the three fits in one order and retains the configured design, fabric and image',()=>{
 const {order,page,product}=shirt();product.images=['data:image/png;base64,AAAA'];const result=applyListToOrder(order,rows,{name:'Equipe'}),products=result.pages.flatMap(p=>p.products);
 assert.equal(products.length,3);assert.deepEqual(products.map(p=>p.technical.fit),['MASCULINA','FEMININA','INFANTIL']);assert.deepEqual(products.map(p=>p.quantity),[1,1,1]);assert.deepEqual(products.map(p=>p.names[0].name),['Adulto','Baby','Infantil']);for(const p of products){assert.deepEqual(p.images,product.images);assert.equal(p.fabric,'DRY');assert.equal(p.technical.collarModel,'PRIME');}
 assert.deepEqual(validateOrder(result),[]);assert.doesNotThrow(()=>validateDocument(result));assert.equal(order.pages[0].products.length,1,'the original is unchanged until list confirmation');
 const again=applyListToOrder(result,rows,{name:'Equipe'});assert.deepEqual(again.pages.flatMap(p=>p.products).map(p=>[p.id,p.quantity]),products.map(p=>[p.id,p.quantity]));
});

test('kits for jacket/trousers and polo/shorts use editable manual details while approved shirt/short rules remain enforced',()=>{
 for(const preset of KIT_PRESETS){const order=catalogOrder(newOrder()),page=newPage();page.mode='conjunto';order.compositionKind='kit';page.products=preset.types.map(type=>createOrderProduct(type,page.id));order.pages=[page];const validated=validateDocument(order);assert.equal(validated.compositionKind,'kit');assert.deepEqual(validated.pages[0].products.map(p=>p.type),preset.types);assert.equal(usesCatalogList(order),preset.id==='jogo');
  if(preset.id!=='jogo'){for(const p of page.products){p.model='Referência';p.fabric='Helanca';p.quantity=1;p.grade=p.type.toUpperCase()+'\nM = 1';}Object.assign(order,{number:'0001-10-MNZ',client:'Equipe',artist:'Designer',deliveryDate:'2099-12-20'});assert.deepEqual(releaseProblems(order),[]);assert.doesNotThrow(()=>buildSheets(order));}
 }
 const {order,product}=shirt();delete product.technical;product.manualTechnical=true;assert.throws(()=>validateDocument(order),/ficha técnica/);assert.match(catalogProblems(order).join(' '),/ficha técnica/);
});

test('three short fits have independent compatible molds without weakening rules within the same fit',()=>{
 const page=newPage('Calção');page.products=[createOrderProduct('Calção',page.id)];const order=catalogOrder({...newOrder(),pages:[page]}),p=page.products[0];for(const fit of ['MASCULINA','FEMININA','INFANTIL'])toggleModelFit(page,p,fit,true);
 for(const [index,mold] of ['CAL-M01','CAL-F02','CAL-I01'].entries()){const product=page.products[index];technicalFieldChange(product,'moldId',mold);technicalFieldChange(product,'drawstringColor','BRANCO');}
 assert.deepEqual(catalogProblems(order),[]);assert.doesNotThrow(()=>validateDocument(order));assert.equal(new Set(page.products.map(p=>p.technical.moldId)).size,3);
 const conflicting=structuredClone(p);conflicting.id='other-male';technicalFieldChange(conflicting,'moldId','CAL-M02');page.products.push(conflicting);assert.match(catalogProblems(order).join(' '),/um único molde/);
});
