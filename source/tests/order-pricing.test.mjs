import {test} from 'node:test';
import assert from 'node:assert/strict';
import {newOrder,newProduct,newPage} from '../public/production-core.js';
import {attachCatalog,technicalFieldChange,MATERIALS} from '../public/product-catalog.js';
import {PRICE_VERSION,quoteProduct,quoteOrder,groupedQuoteRows,cleanPricing,cleanPriceConfig,orderFileStem,pricingProblems} from '../public/order-pricing.js';
import {buildSheets,createPDF} from '../public/production-sheet.js';
import {validateDocument} from '../lib/production-service.mjs';
const app=(id,type,role='ESCUDO',perUnit=1)=>({id,type,role,perUnit,position:'Peito',exception:''});
function piece(type='Camiseta',fabric='DRY') {const p=attachCatalog(newProduct(type),{designId:'design',fit:'MASCULINA'});p.quantity=10;p.grade='M = 10';p.fabric=MATERIALS[fabric]?.label||fabric;p.technical.fabricId=fabric;if(type==='Calção'){p.technical.moldId='CAL-M01';p.technical.drawstringColor='BRANCO';}else{p.technical.collarModel='REDONDA';p.technical.collarFinish='RIBANA';}return p;}
function order(...products){const o=newOrder();o.pricing={version:PRICE_VERSION,discountBps:1000};o.number='0001-10-MNZ';o.client='Equipe';o.title='Jogo 01';o.shirtSleeveCut='RAGLAN';o.pages=[{...newPage(),products}];return o;}
test('2026 base prices, standard collars, premium collars and Polo category follow the supplied schedule',()=>{
 for(const [fabric,expected]of [['DRY',5990],['ELASTIC',6490],['MANCHESTER',6490],['JACQUARD_ELITE',7250],['JACQUARD_DIAMOND',7250]])for(const collar of ['V','BRASIL','REDONDA']){const p=piece('Camiseta',fabric);p.technical.collarModel=collar;assert.equal(quoteProduct(p).unitCents,expected);}
 const p=piece();p.technical.collarModel='EDGE';p.technical.hasSideCut=true;p.technical.sleeveFinish='FILETE COSTURADO';assert.equal(quoteProduct(p).unitCents,7490);p.technical.collarModel='POLO';p.technical.fabricId='ELASTIC';p.fabric='ELASTIC';assert.equal(quoteProduct(p).unitCents,8250);assert.ok(!quoteProduct(p).items.some(i=>i.label==='Gola premium'));
 assert.equal(quoteProduct(piece('Calção','DRY_CALCAO')).unitCents,5490);const old=newProduct('Calção');old.fabric='STRECH';assert.equal(quoteProduct(old).unitCents,5690);
});
test('physical applications use per garment counts, selected rates and the existing free factory brand rule',()=>{
 const p=piece();p.technical.applications=[app('a','TPU ALTO RELEVO','ESCUDO',2),app('b','APLIQUE BORDADO'),app('c','TERMOCOLANTE','ETIQUETA OFICIAL'),app('d','TPU ALTO RELEVO','MARCA MEINERZ')];p.priceConfig={applications:{b:'APLIQUE_3D'}};const q=quoteProduct(p,1000);assert.equal(q.grossCents,8890);assert.equal(q.unitCents,8001);assert.equal(q.totalCents,80010);assert.equal(q.applications.find(a=>a.key==='d').cents,0);
 p.technical.applications.push(app('e','TERMOCOLANTE','ETIQUETA OFICIAL'));p.priceConfig.applications.e='NUMERO';assert.equal(quoteProduct(p).grossCents,10390);
 p.technical.applications.pop();p.technical.applications=p.technical.applications.filter(a=>a.id!=='a');assert.equal(quoteProduct(p).grossCents,6890);
});
test('unlisted fabrics, unknown application sizes and shorts filet stay pending until a price is supplied',()=>{
 const p=piece('Camiseta','ABSTRAT');assert.equal(quoteProduct(p).unitCents,null);p.priceConfig={baseCents:7000};assert.equal(quoteProduct(p).unitCents,7000);
 const old=newProduct();old.fabric='DRY';old.extraApplications=['DTF','TERMOCOLANTE'];assert.equal(quoteProduct(old).unitCents,null);old.priceConfig={applications:{'extra:DTF':'DTF_GRANDE','extra:TERMOCOLANTE':'BRASAO'}};assert.equal(quoteProduct(old).unitCents,7490);
 const shorts=piece('Calção','FLEX');assert.equal(quoteProduct(shorts).unitCents,null);shorts.priceConfig={baseCents:5690};shorts.technical.hemFinish='FILETE COSTURADO';assert.equal(quoteProduct(shorts).unitCents,null);shorts.priceConfig.finishCents=250;assert.equal(quoteProduct(shorts).unitCents,5940);
});
test('unit rounding happens before quantity multiplication and totals combine independently sized kit pieces',()=>{
 const shirt=piece('Camiseta','JACQUARD_ELITE'),shorts=piece('Calção','DRY_CALCAO');shirt.quantity=10;shorts.quantity=20;const o=order(shirt,shorts),q=quoteOrder(o);assert.equal(q.rows[0].unitCents,6525);assert.equal(q.rows[1].unitCents,4941);assert.equal(q.totalCents,164070);
 const baby=structuredClone(shirt);baby.id='baby';baby.quantity=3;o.pages[0].products.push(baby);const updated=quoteOrder(o);assert.equal(groupedQuoteRows(updated)[0].quantity,13);assert.equal(updated.totalCents,183645);o.pricing.discountBps=1234;const r=quoteOrder(o).rows[0];assert.equal(r.totalCents,r.unitCents*10);
});
test('pricing is validated, preserved on save and cannot silently publish totals with pending prices',()=>{
 const p=piece(),o=order(p);o.shirtSleeveCut='RAGLAN';o.pages[0].products[0].technical.filetMaterial='';assert.deepEqual(validateDocument(o).pricing,o.pricing);assert.throws(()=>cleanPricing({version:PRICE_VERSION,discountBps:-1}));assert.throws(()=>cleanPricing({version:PRICE_VERSION,discountBps:10001}));assert.throws(()=>cleanPriceConfig({baseCents:12.3}));assert.throws(()=>cleanPriceConfig({applications:{a:'INVENTED'}}));assert.throws(()=>cleanPriceConfig(JSON.parse('{"applications":{"__proto__":"TPU"}}')));
 p.technical.fabricId='ABSTRAT';p.fabric='ABSTRAT';assert.ok(pricingProblems(o).length);p.priceConfig={baseCents:7000};assert.deepEqual(pricingProblems(o),[]);assert.deepEqual(validateDocument(o).pages[0].products[0].priceConfig,p.priceConfig);
});
test('budget occupies the reserved rectangle, hides zero discount and enlarges the right aligned order code',()=>{
 const o=order(piece(),piece('Calção','DRY_CALCAO')),sheet=buildSheets(o)[0],texts=sheet.ops.filter(op=>op.kind==='text');assert.ok(texts.some(op=>op.text==='TOTAL DO PEDIDO'&&op.x<413&&op.y>458));assert.ok(texts.some(op=>op.text.includes('10% de desconto já aplicado')));const number=texts.find(op=>op.text==='Nº 0001-10-MNZ');assert.ok(number.size>=30);assert.equal(number.align,'right');assert.equal(number.x,826);o.pricing.discountBps=0;assert.ok(!buildSheets(o)[0].ops.some(op=>/desconto/.test(op.text||'')));
});
test('all order file names start with code, client and title while blocking path and control characters',()=>{
 assert.equal(orderFileStem(order()),'0001-10-MNZ - Equipe - Jogo 01');const stem=orderFileStem({number:'0001-10-MNZ',client:'A/B\\C',title:'Jogo: 01\nFinal'});assert.equal(stem,'0001-10-MNZ - A B C - Jogo 01 Final');assert.ok(!stem.includes('/'));assert.equal(orderFileStem({}),'SEM CODIGO - SEM CLIENTE - PEDIDO');
});
