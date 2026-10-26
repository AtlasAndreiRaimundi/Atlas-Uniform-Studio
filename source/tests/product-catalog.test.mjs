import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as c from '../public/product-catalog.js';
import {catalogModelFields,catalogFabricFields,catalogFinishFields} from '../public/product-catalog-ui.js';
import {normalizeListRow,listProblems,listPieces,listSummary,prepareListSheets,parseListMatrix} from '../public/order-list.js';
import {writeListWorkbook,readOrderWorkbook} from '../public/order-files.js';
import {newOrder,newProduct,newPage,newKitPage,parseGrade,namesToGrade,applyListToOrder,validateOrder} from '../public/production-core.js';
import {validateDocument} from '../lib/production-service.mjs';
import {validateList} from '../lib/list-service.mjs';
import {buildSheets,listSections,createPDF,PAPER} from '../public/production-sheet.js';
const message=problems=>problems.join(' ');
function item(code='CAM-001',fit='MASCULINA',designId='desenho-1'){
 const p=c.attachCatalog(newProduct(code==='CAM-001'?'Camiseta':'Calção'),{fit,designId});p.model='Jogo';p.quantity=1;p.grade='M = 1';p.technical.fabricId=code==='CAM-001'?'DRY':'DRY_CALCAO';p.fabric=c.MATERIALS[p.technical.fabricId].label;
 if(code==='CAM-001')Object.assign(p.technical,{collarModel:'REDONDA',collarFinish:'RIBANA'});else Object.assign(p.technical,{moldId:fit==='MASCULINA'?'CAL-M01':fit==='FEMININA'?'CAL-F02':'CAL-I01',drawstringColor:'BRANCO'});
 if(fit==='INFANTIL')p.grade='TAM 10 = 1';return p;
}
function orderWith(...items){const order=c.catalogOrder(newOrder());order.number='0001-01-ATL';order.client='Equipe';order.shirtSleeveCut='TRADICIONAL';order.pages=[{...newPage(),products:items}];return order;}
function listRow(extra={}){return normalizeListRow({catalogVersion:3,produto:'Kit',tamanhoCamiseta:'M',tamanhoCalcao:'G',quantidade:1,grupo:'Linha',nome:'Ana',numero:'07',...extra});}

test('factory catalogs retain stable IDs, exact ordered combinations and separate Polo references',()=>{
 assert.equal(c.PRODUCT_CATALOG.length,2);assert.equal(c.PRODUCT_CATALOG[0].fabrics.length,8);assert.deepEqual(c.PRODUCT_CATALOG[1].fabrics,['DRY_CALCAO','FLEX']);assert.equal(c.COLLARS.length,9);assert.equal(c.SHORT_MOLDS.length,9);
 const expected=[['VERMELHO','MEXICO'],['MEXICO','BRANCO'],['VERMELHO','BRANCO'],['SOL 1048','PRETO'],['VERDE ESCURO','PRETO'],['BRANCO','PRETO'],['BRANCO','VERMELHO'],['BRANCO','COLIBRI'],['VERDE ESCURO','BRANCO'],['P-6931','PRETO'],['P-6931','BRANCO'],['PRETO','BRANCO'],['BRANCO','TROPICAL'],['BRANCO','MEXICO']];
 assert.deepEqual(c.SHARED_RIBBONS.slice(0,14).map(r=>r.factoryColorRef),expected);assert.equal(c.SHARED_RIBBONS.length,24);assert.equal(c.POLO_RIBBONS.length,10);assert.deepEqual(c.POLO_RIBBONS[0].factoryColorRef,['COLONIAL']);assert.equal(c.POLO_RIBBONS[0].displayColorName,'AZUL CELESTE');assert.equal(c.SHARED_RIBBONS.some(r=>r.factoryColorRef.length===1&&r.factoryColorRef[0]==='VERDE ESCURO'),false);
});

test('all eight shirt fabrics allow the nine collars and each ready-made catalog is exclusive',()=>{
 for(const fabricId of c.PRODUCT_CATALOG[0].fabrics)for(const collarModel of c.COLLARS){const p=item(),o=orderWith(p),t=p.technical;t.fabricId=fabricId;p.fabric=c.MATERIALS[fabricId].label;t.collarModel=collarModel;t.collarFinish=c.collarFinishes(collarModel)[0];if(c.needsRibbon(t))t.ribanaId=c.ribbonOptions(t)[0].id;if(collarModel==='V')t.vConstruction='TRADICIONAL';if(['POLO','REDONDA COM PEITILHO'].includes(collarModel))t.buttons=2;assert.deepEqual(c.technicalProblems(p,o,true),[],fabricId+' '+collarModel);}
 for(const rib of c.SHARED_RIBBONS){const p=item();Object.assign(p.technical,{collarModel:'EDGE',collarFinish:'PRONTA',ribanaId:rib.id});assert.deepEqual(c.technicalProblems(p,orderWith(p),true),[]);assert.match(c.technicalLines(p).join('\n'),new RegExp(rib.factoryColorRef[0]));}
 for(const rib of c.POLO_RIBBONS){const p=item();Object.assign(p.technical,{collarModel:'POLO',collarFinish:'PRONTA',ribanaId:rib.id,buttons:1});assert.deepEqual(c.technicalProblems(p,orderWith(p),true),[]);p.technical.ribanaId='COMP-01';assert.match(message(c.technicalProblems(p,{},false)),/catálogo desta gola/);}
 const p=item();Object.assign(p.technical,{collarModel:'EDGE',collarFinish:'SUBLIMADA'});assert.match(message(c.technicalProblems(p)),/incompatível/);
});

test('dependent shirt choices reset with notice and keep global cut independent of fit and sleeve length',()=>{
 const p=item();Object.assign(p.technical,{fabricId:'ELASTIC',sleeveFinish:'FILETE COSTURADO',filetMaterial:'MESMO TECIDO DA CAMISETA'});const result=c.technicalFieldChange(p,'fabricId','ELASTIC');assert.equal(p.technical.filetMaterial,'DRY');assert.ok(result.notices.length);
 c.technicalFieldChange(p,'sleeveLength','LONGA');assert.equal(p.technical.sleeveFinish,'BARRA COMUM');assert.equal(p.technical.filetMaterial,'');assert.deepEqual(c.sleeveFinishes(p.technical),['BARRA COMUM','PUNHO']);c.technicalFieldChange(p,'sleeveFinish','PUNHO');assert.match(c.technicalLines(p).join(' '),/RIBANA SUBLIMADA/);
 c.technicalFieldChange(p,'hasSideCut',true);c.technicalFieldChange(p,'sideCutFabric','FLUENCE');c.technicalFieldChange(p,'hemShape','ARREDONDADA');c.technicalFieldChange(p,'hasSideCut',false);assert.equal(p.technical.hemShape,'RETA');assert.equal(p.technical.sideCutFabric,'MESMO TECIDO DA PEÇA');
 Object.assign(p.technical,{collarModel:'POLO',collarFinish:'PRONTA',ribanaId:'POLO-01',buttons:3});c.technicalFieldChange(p,'fit','FEMININA');assert.equal(p.technical.buttons,null);c.technicalFieldChange(p,'collarModel','EDGE');assert.equal(p.technical.ribanaId,'');assert.equal(p.technical.collarFinish,'PRONTA');
});

test('sleeve filet exceptions and Polo fit limits are validated at save and release boundaries',()=>{
 const p=item(),o=orderWith(p);Object.assign(p.technical,{fabricId:'ELASTIC',sleeveFinish:'FILETE COSTURADO',filetMaterial:'RIBANA (EXCEÇÃO)'});p.fabric='ELASTIC';assert.match(message(c.technicalProblems(p,o,true)),/solicitação excepcional/);p.technical.filetException='Cliente solicitou explicitamente';assert.deepEqual(c.technicalProblems(p,o,true),[]);
 Object.assign(p.technical,{fit:'INFANTIL',collarModel:'POLO',collarFinish:'SUBLIMADA COM ENTRETELA',buttons:3});assert.match(message(c.technicalProblems(p,o)),/máximo 2/);assert.throws(()=>validateDocument(o),/máximo 2/);
 p.technical.buttons=2;p.technical.poloSideV=true;assert.match(message(c.technicalProblems(p,o)),/pendente/);
});

test('all nine shorts molds accept both main fabrics with the exact dependent finish rules',()=>{
 for(const mold of c.SHORT_MOLDS)for(const fabricId of ['DRY_CALCAO','FLEX']){const p=item('CAL-001',mold.fit);Object.assign(p.technical,{moldId:mold.id,fabricId,biasColorNote:mold.stein?'Branco conforme arte':''});p.fabric=c.MATERIALS[fabricId].label;assert.deepEqual(c.technicalProblems(p,{},true),[],mold.id+' '+fabricId);if(mold.filet){p.technical.hemFinish='FILETE COSTURADO';assert.deepEqual(c.technicalProblems(p,{},true),[]);}if(mold.five)assert.ok(c.technicalWarnings(p).includes(c.FIVE_PARTS_WARNING));}
 const p=item('CAL-001');p.technical.hemFinish='FILETE COSTURADO';const result=c.technicalFieldChange(p,'moldId','CAL-M03');assert.equal(p.technical.hemFinish,'BARRA COMUM');assert.ok(result.notices.length);c.technicalFieldChange(p,'sideCutFabric','FLUENCE');assert.deepEqual(c.technicalProblems(p,{},true),[]);p.technical.fabricId='DRY';p.fabric='DRY';assert.match(message(c.technicalProblems(p)),/não autorizado/);
});

test('pending pockets cannot be released, forbidden female molds reject them at save, drawstring colors remain explicit',()=>{
 const p=item('CAL-001'),o=orderWith(p);p.technical.pocketRequest='Cliente pediu bolsos';assert.deepEqual(c.technicalProblems(p,o),[]);assert.match(message(c.technicalProblems(p,o,true)),/homologação/);assert.throws(()=>buildSheets(o),/homologação/);
 Object.assign(p.technical,{fit:'FEMININA',moldId:'CAL-F01'});assert.match(message(c.technicalProblems(p)),/não permite bolsos/);const result=c.technicalFieldChange(p,'moldId','CAL-F03');assert.equal(p.technical.pocketRequest,'');assert.ok(result.notices.length);
 p.technical.drawstringColor='VERDE';assert.match(message(c.technicalProblems(p)),/Cor de cordão/);assert.deepEqual(c.DRAWSTRINGS,['PRETO','BRANCO','AZUL MARINHO','VERMELHO']);
});

const application=(extra={})=>({id:crypto.randomUUID(),role:'ESCUDO',type:'TPU ALTO RELEVO',perUnit:2,position:'Peito esquerdo',exception:'',...extra});
test('physical applications retain per-piece and total quantities, free brand and infant exceptions',()=>{
 const p=item(),o=orderWith(p);p.quantity=7;p.technical.applications=[application(),application({type:'APLIQUE BORDADO',position:'Manga'}),application({role:'MARCA MEINERZ',perUnit:1})];assert.deepEqual(c.technicalProblems(p,o,true),[]);assert.deepEqual(c.physicalApplications(p).map(a=>a.quantity),[14,14,7]);assert.equal(c.physicalApplications(p)[2].customerCharge,0);
 p.technical.fit='INFANTIL';assert.match(message(c.technicalProblems(p,o)),/bordado infantil é proibido/);p.technical.applications=[application()];assert.match(message(c.technicalProblems(p,o,true)),/justificativa/);p.technical.applications[0].exception='Exceção solicitada e conferida';assert.deepEqual(c.technicalProblems(p,o,true),[]);
 const shorts=item('CAL-001');shorts.technical.applications=[application({role:'MARCA MEINERZ',perUnit:1})];assert.match(message(c.technicalProblems(shorts)),/no calção a marca é sublimada/);shorts.technical.applications=[application({role:'ETIQUETA OFICIAL'})];assert.match(message(c.technicalProblems(shorts)),/só está disponível na camiseta/);
});

test('each product has an independent three-unit special-size limit across all pages',()=>{
 const shirt=item(),shorts=item('CAL-001'),o=orderWith(shirt,shorts);for(const p of [shirt,shorts]){p.quantity=3;p.grade='ESPECIAL = 3';p.technical.specialReference='MEDIDAS FORNECIDAS';p.technical.specialDescription='Conferir medidas em centímetros';}assert.deepEqual(c.catalogProblems(o,{release:true,parseGrade}),[]);shirt.quantity=4;shirt.grade='ESPECIAL = 4';assert.match(message(c.catalogProblems(o,{parseGrade})),/Camiseta: até 3 UNIDADES/);assert.doesNotMatch(message(c.catalogProblems(o,{parseGrade})),/Calção: até 3/);shirt.grade='ESPECIAL = 3';shirt.technical.specialDescription='';assert.match(message(c.catalogProblems(o,{release:true,parseGrade})),/exige referência/);
});

test('sizes resolve 4G as adult, maintain independent kit fits and do not offer unsupported sizes',()=>{
 assert.equal(c.fitOfSize('4G'),null);assert.equal(c.fitOfSize('TAM10'),'INFANTIL');assert.equal(c.canonicalSize('BLPP'),'PP');assert.deepEqual(listProblems(listRow({tamanhoCamiseta:'4G'})),[]);assert.match(message(listProblems(listRow({tamanhoCamiseta:'7G'}))),/grade autorizada/);assert.match(message(listProblems(listRow({tamanhoCamiseta:'PP'}))),/grade autorizada/);assert.deepEqual(listProblems(listRow({modelagemCamiseta:'FEMININA',tamanhoCamiseta:'PP',modelagemCalcao:'INFANTIL',tamanhoCalcao:'TAM10'})),[]);
});

test('modern kit rows preserve separate quantities, names and numbering through persistence and handoff',()=>{
 const row=listRow({id:'atleta-a',quantidadeCamiseta:2,quantidadeCalcao:1,nomeCalcao:'',semNumeroCalcao:true,modelagemCalcao:'FEMININA',tamanhoCalcao:'BLG'});assert.deepEqual(listProblems(row),[]);const pieces=listPieces(row);assert.deepEqual(pieces.map(p=>[p.quantity,p.name,p.number]),[[2,'Ana','07'],[1,'','']]);assert.equal(listSummary([row]).pieces,3);
 const list=validateList({schema:1,title:'Equipe',defaults:{catalogVersion:3,produto:'Kit'},rows:[row],unresolved:[]});assert.equal(list.rows[0].quantidadeCamiseta,2);assert.equal(list.rows[0].semNumeroCalcao,true);assert.equal(list.defaults.catalogVersion,3);
 const o=applyListToOrder(c.catalogOrder(newOrder()),[row],{name:'Equipe'});const [shirt,shorts]=o.pages[0].products;assert.deepEqual([shirt.quantity,shorts.quantity],[2,1]);assert.equal(shorts.names[0].name,'');assert.equal(shorts.names[0].number,'');assert.equal(shirt.names[0].kitId,shorts.names[0].kitId);assert.equal(shorts.technical.fit,'FEMININA');assert.equal(o.listSource.rows[0].quantidadeCamiseta,2);assert.equal(validateDocument(o).listSource.rows[0].semNumeroCalcao,true);
 const sections=listSections([shirt,shorts]);assert.equal(sections.length,1);assert.deepEqual(sections[0].rows[0].slice(1,7),['Ana / 07','M','2','SEM NOME / SEM NÚMERO','BLG','1']);
});

test('per-piece zero quantity excludes only that piece and blank number is never inherited',()=>{
 const row=listRow({quantidadeCamiseta:0,quantidadeCalcao:2,numero:'',nome:''});assert.deepEqual(listProblems(row),[]);assert.equal(listPieces(row).length,1);assert.equal(listPieces(row)[0].product,'Calção');assert.equal(listSummary([row]).pieces,2);assert.ok(listProblems(listRow({quantidadeCamiseta:0,quantidadeCalcao:0})).length);assert.ok(listProblems(listRow({produto:'Calção',tamanhoCamiseta:'',quantidadeCalcao:0})).length);
});


test('page rules split real production differences while keeping sleeve lengths and drawstring variation together',()=>{
 const short=item(),long=structuredClone(short);long.id=crypto.randomUUID();c.technicalFieldChange(long,'sleeveLength','LONGA');const o=orderWith(short,long);assert.deepEqual(c.catalogProblems(o,{release:true,parseGrade}),[]);o.pages.push({...newPage(),products:[o.pages[0].products.pop()]});assert.match(message(c.catalogProblems(o,{parseGrade})),/mesma página/);
 const grouped=c.suggestPageGrouping(o);assert.equal(grouped.pages.length,1);assert.equal(grouped.pages[0].products.length,2);assert.equal(grouped.pages[0].groupingReviewRequired,true);assert.equal(o.pages.length,2,'proposal does not mutate the current document');assert.match(message(c.catalogProblems(grouped,{release:true,parseGrade})),/confira imagens/);
 const a=item('CAL-001'),b=structuredClone(a);b.id=crypto.randomUUID();b.technical.drawstringColor='PRETO';assert.deepEqual(c.pageCompatibility({products:[a,b]}),[]);b.technical.fabricId='FLEX';b.fabric='FLEX';assert.match(message(c.pageCompatibility({products:[a,b]})),/único molde e tecido/);assert.equal(c.suggestPageGrouping(orderWith(a,b)).pages.length,2);
 b.technical.fabricId='DRY_CALCAO';b.fabric='DRY CALÇÃO';b.technical.applications=[application()];assert.match(message(c.pageCompatibility({products:[a,b]})),/aplicações diferentes/);
});

test('kit and loose pieces aggregate by product, fit and size without a separate kit production category',()=>{
 const o=applyListToOrder(c.catalogOrder(newOrder()),[listRow({quantidadeCamiseta:2,quantidadeCalcao:1}),listRow({produto:'Camiseta',tamanhoCalcao:'',quantidade:3})]);const summary=c.productionSummary(o,parseGrade);assert.equal(summary.find(g=>g.product.startsWith('CAMISETA')).quantity,5);assert.equal(summary.find(g=>g.product.startsWith('CALÇÃO')).quantity,1);assert.equal(summary.some(g=>g.product.includes('KIT')),false);
});

test('forms expose only product-specific finishes, correct ready catalogs and mandatory warnings',()=>{
 const p=item('CAL-001','FEMININA');p.technical.moldId='CAL-F01';const fields=catalogFinishFields(p);assert.match(fields,/viés DRY/);assert.doesNotMatch(fields,/data-tech="collarModel"|ETIQUETA OFICIAL|data-tech="hemFinish"|data-tech="pocketRequest"/);assert.match(catalogModelFields(p,orderWith(p),newPage()),/CAL-F01/);assert.doesNotMatch(catalogFabricFields(p),/value="FLUENCE"|value="DRY"/);
 const shirt=item();Object.assign(shirt.technical,{collarModel:'POLO',collarFinish:'PRONTA'});assert.match(catalogFinishFields(shirt),/POLO-01/);assert.doesNotMatch(catalogFinishFields(shirt),/COMP-01/);Object.assign(shirt.technical,{collarModel:'EDGE',collarFinish:'PRONTA'});assert.match(catalogFinishFields(shirt),/COMP-14/);assert.doesNotMatch(catalogFinishFields(shirt),/value="SUBLIMADA"/);
});

test('typed documents reject tampered combinations on save and export; legacy orders retain all original fields',()=>{
 const p=item(),o=orderWith(p);assert.deepEqual(validateOrder(o),[]);const cleaned=validateDocument(o);assert.equal(cleaned.technicalCatalogVersion,c.CATALOG_VERSION);assert.deepEqual(cleaned.pages[0].products[0].technical,p.technical);p.technical.fabricId='FLUENCE';p.fabric='FLUENCE';assert.throws(()=>validateDocument(o),/não autorizado/);assert.throws(()=>buildSheets(o),/não autorizado/);
 const legacy=newOrder();legacy.pages[0].products[0].fabric='TECIDO ANTIGO';legacy.pages[0].products[0].extraApplications=['DTF'];assert.equal(validateDocument(legacy).pages[0].products[0].fabric,'TECIDO ANTIGO');const migrated=structuredClone(legacy.pages[0].products[0]);c.attachCatalog(migrated,{legacy:true,designId:'desenho'});assert.equal(migrated.legacyTechnical.fabric,'TECIDO ANTIGO');assert.deepEqual(migrated.legacyTechnical.extraApplications,['DTF']);assert.equal(migrated.technical.legacyReviewed,false);
 assert.throws(()=>c.cleanTechnical({...item().technical,version:'future'}),/Versão/);assert.throws(()=>validateList({schema:1,rows:[{...listRow(),catalogVersion:999}],unresolved:[]}),/Versão/);
});


test('group proposals retain source notes and manual arrows and refuse to discard different shared images',()=>{
 const a=item(),b=structuredClone(a);b.id=crypto.randomUUID();c.technicalFieldChange(b,'sleeveLength','LONGA');const o=orderWith(a);o.pages[0].notes='Nota da frente';o.pages[0].annotations=[{id:'seta-a',type:'arrow',productId:a.id,x:50,y:180,x2:100,y2:220,text:'Manual'}];o.pages.push({...newPage(),products:[b],notes:'Nota da manga longa'});const grouped=c.suggestPageGrouping(o);assert.match(grouped.pages[0].notes,/Nota da frente/);assert.match(grouped.pages[0].notes,/Nota da manga longa/);assert.equal(grouped.pages[0].annotations.length,1);assert.equal(grouped.pages[0].annotations[0].productId,a.id);assert.equal(o.pages[0].annotations[0].id,'seta-a');
 o.pages[0].visual={mode:'shared',image:'data:image/png;base64,AAAA'};o.pages[1].visual={mode:'shared',image:'data:image/png;base64,BBBB'};assert.throws(()=>c.suggestPageGrouping(o),/preservar as duas representações/);assert.equal(o.pages[1].visual.image,'data:image/png;base64,BBBB');
});

test('both numbered kit pieces share the athlete number and the special limit sums separate pages',()=>{
 const o=applyListToOrder(c.catalogOrder(newOrder()),[listRow({id:'atleta-a'})]);const p=o.pages[0].products;p[1].names[0].number='08';assert.match(message(c.catalogProblems(o,{parseGrade})),/compartilhar o número/);p[1].names[0].number='';assert.doesNotMatch(message(c.catalogProblems(o,{parseGrade})),/compartilhar o número/);
 const a=item(),b=item('CAM-001','MASCULINA','outro-desenho');a.grade='ESPECIAL = 2';b.grade='ESPECIAL = 2';const all=orderWith(a);all.pages.push({...newPage(),products:[b]});assert.match(message(c.catalogProblems(all,{parseGrade})),/encontrados 4/);
});

test('a saved typed order cannot remove its catalog or a product technical record in a later revision',async()=>{
 const {ProductionService}=await import('../lib/production-service.mjs'),stored=orderWith(item()),service=new ProductionService({},{});service.own=async()=>({id:'order-a',version:1});service.get=async()=>({document:stored});const changed=structuredClone(stored);delete changed.technicalCatalogVersion;delete changed.pages[0].products[0].technical;
 await assert.rejects(service.save({userId:'alice'},'order-a',{version:1,document:changed}),/ficha técnica não pode ser removida/);
 const partial=structuredClone(stored);delete partial.technicalCatalogVersion;service.get=async()=>({document:partial});await assert.rejects(service.save({userId:'alice'},'order-a',{version:1,document:changed}),/ficha técnica de uma peça/);
});
