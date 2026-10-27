import Excel from 'exceljs';
import * as PDF from 'pdf-lib';
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

const application=(extra={})=>({id:crypto.randomUUID(),role:'ESCUDO',type:'TPU ALTO RELEVO',perUnit:2,position:'Peito esquerdo',exception:'',...extra});
test('new XLSX templates and roundtrips keep extended columns while old seven-column templates remain supported',async()=>{
 const bytes=await writeListWorkbook([],Excel,{template:true,defaults:{catalogVersion:3,produto:'Kit'}}),sheets=prepareListSheets(await readOrderWorkbook(bytes,Excel));assert.equal(sheets[0].template.version,3);assert.equal(Object.keys(sheets[0].mapping).length,18);
 const wb=new Excel.Workbook();await wb.xlsx.load(bytes);wb.getWorksheet('Pedido').addRow(['1 - Linha','Ana','07','M','BLG',1,'CAPITÃ',2,1,'MASCULINA','FEMININA','',false,true]);const filled=prepareListSheets(await readOrderWorkbook(await wb.xlsx.writeBuffer(),Excel)),parsed=parseListMatrix(filled[0]);assert.equal(parsed.records[0].quantidadeCamiseta,2);assert.equal(parsed.records[0].semNumeroCalcao,true);assert.deepEqual(parsed.records.flatMap(listProblems),[]);
 const exported=await writeListWorkbook(parsed.records,Excel),roundtrip=parseListMatrix(prepareListSheets(await readOrderWorkbook(exported,Excel))[0],{produto:'Kit'});assert.deepEqual(roundtrip.records.map(listPieces),parsed.records.map(listPieces));
 const old=prepareListSheets(await readOrderWorkbook(await writeListWorkbook([],Excel,{template:true,defaults:{produto:'Kit'}}),Excel));assert.equal(old[0].template.version,2);assert.equal(Object.keys(old[0].mapping).length,7);
});

test('A4 landscape export keeps sleeve representations together, app totals on first sheet and special instructions in lists',async()=>{
 const shirt=item(),long=structuredClone(shirt),shorts=item('CAL-001');long.id=crypto.randomUUID();c.technicalFieldChange(long,'sleeveLength','LONGA');shirt.technical.applications=[application({role:'MARCA MEINERZ',perUnit:1})];long.technical.applications=structuredClone(shirt.technical.applications);for(const p of [shirt,long,shorts])p.kitGroupId='kit';const o=orderWith(shirt,long,shorts);const sheets=buildSheets(o);assert.equal(sheets.filter(s=>s.kind==='sheet').length,1);assert.equal(sheets[0].anchors.length,3);assert.match(sheets[0].ops.map(op=>op.text||'').join('\n'),/MARCA MEINERZ/);assert.ok(!sheets.some(s=>s.kind==='summary'));assert.ok(sheets[0].ops.filter(op=>op.kind==='text').every(op=>!(op.x<413&&op.y>459)),'budget area stays blank');
 const p=shirt;p.names=[{name:'',number:'',size:'ESPECIAL',quantity:1,specialReference:'MEDIDAS FORNECIDAS',specialDescription:'AJUSTE '.repeat(140)}];p.grade=namesToGrade(p.names,p.type);const document=orderWith(p);const specialSheets=buildSheets(document);assert.match(specialSheets.filter(s=>s.kind==='list').flatMap(s=>s.ops.map(op=>op.text||'')).join('\n'),/TAMANHO ESPECIAL/);
 for(const sheet of specialSheets)for(const op of sheet.ops){if(op.kind==='text')assert.ok(op.y>=0&&op.y<PAPER.height,op.text);if(op.kind==='rect')assert.ok(op.y+op.h<=PAPER.height+.01);}
 const bytes=await createPDF(sheets,PDF);const pdf=await PDF.PDFDocument.load(bytes);for(const page of pdf.getPages()){assert.equal(page.getWidth(),PAPER.width);assert.equal(page.getHeight(),PAPER.height);}
});
