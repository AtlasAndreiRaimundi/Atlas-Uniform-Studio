import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import * as PDF from 'pdf-lib';
import Zip from 'jszip';
import fontkit from '@pdf-lib/fontkit';
import {newOrder,newPage,newKitPage,namesToGrade} from '../public/production-core.js';
import {buildSheets,listSections,PAPER,sheetLabel,orderPreviewSVG,sheetSVG,createPDF} from '../public/production-sheet.js';
import {catalogOrder} from '../public/product-catalog.js';
import {createProductionPackage} from '../public/order-delivery.js';

export function printFixture(){
 const order=newOrder();Object.assign(order,{number:'0001-01-MNZ',client:'Equipe Exemplo',artist:'Designer',deliveryDate:'2099-12-20'});
 const kit=newKitPage(),jacket=newPage('Jaqueta');kit.title='JOGO 1';jacket.title='VIAGEM 2';order.pages=[kit,jacket];
 for(const [i,p]of kit.products.entries()){p.model='EDGE 2027';p.fabric='DRY';p.names=[{name:'Ana',number:'07',additional:'CAPITÃ',size:i?'G':'M',quantity:2},{name:'',number:'0',additional:'',size:i?'M':'BLP',quantity:1}];p.quantity=3;p.grade=namesToGrade(p.names,p.type);}
 const p=jacket.products[0];p.model='Jaqueta viagem';p.fabric='HELANCA';p.names=[{name:'Bruno',number:'',additional:'COMISSÃO',size:'G',quantity:1}];p.quantity=1;p.grade=namesToGrade(p.names,p.type);return order;
}

function layoutsFixture(count=1){
 const order=newOrder();order.number='0001-10-MNZ';order.pages=Array.from({length:count},(_,i)=>{const page=newPage();page.title='ARTE '+(i+1);const product=page.products[0];product.names=Array.from({length:30},(_,j)=>({name:'ATLETA '+j,number:String(j),additional:'',size:'M',quantity:1}));product.quantity=30;product.grade=namesToGrade(product.names,product.type);return page;});return order;
}

test('one design with two list sheets remains 1 de 1, with separate list pagination',()=>{
 const order=layoutsFixture(),sheets=buildSheets(order),lists=sheets.filter(s=>s.kind==='list');
 assert.equal(sheets.length,3);assert.equal(lists.length,2);
 assert.deepEqual(sheets.map(s=>s.ops.find(op=>op.role==='layout-counter').text),['1 de 1','1 de 1','1 de 1']);
 assert.deepEqual(lists.map(s=>[s.listPage,s.listPageCount]),[[1,2],[2,2]]);assert.deepEqual(lists.map(sheetLabel),['Desenho 1 de 1 · Lista 1 de 2','Desenho 1 de 1 · Lista 2 de 2']);
 assert.match(orderPreviewSVG(order),/>1 de 1<\/text>/);
});

test('three designs count to 3 de 3 while lists, details and production summaries add no designs',()=>{
 const order=layoutsFixture(3);order.pages[1].products[0].notes='OBSERVAÇÃO DE ACABAMENTO '.repeat(140);
 const sheets=buildSheets(order);assert.equal(sheets.filter(s=>s.kind==='sheet').length,3);assert.ok(sheets.some(s=>s.kind==='details'));
 for(const sheet of sheets){assert.equal(sheet.layoutCount,3);assert.equal(sheet.ops.find(op=>op.role==='layout-counter').text,sheet.sourcePage+' de 3');}
 assert.deepEqual(sheets.filter(s=>s.kind==='sheet').map(s=>s.ops.find(op=>op.role==='layout-counter').text),['1 de 3','2 de 3','3 de 3']);
 const typed=catalogOrder(layoutsFixture()),catalogSheets=buildSheets(typed,{}, {draft:true});assert.ok(catalogSheets.some(s=>s.kind==='summary'));for(const sheet of catalogSheets){if(sheet.kind==='summary')assert.ok(!sheet.ops.some(op=>op.role==='layout-counter'));else assert.equal(sheet.ops.find(op=>op.role==='layout-counter').text,'1 de 1');}
});

test('the order code is right aligned above the right column in both SVG and PDF, leaving its old position empty',async()=>{
 const sheet=buildSheets(layoutsFixture())[0],code=sheet.ops.find(op=>op.kind==='text'&&op.text==='Nº 0001-10-MNZ');
 assert.equal(code.x,826);assert.equal(code.align,'right');assert.ok(!sheet.ops.some(op=>op.kind==='text'&&op.y===39&&op.x===470));assert.match(sheetSVG(sheet),/x="826" y="39" text-anchor="end"/);
 const pdf=await PDF.PDFDocument.load(await createPDF([sheet],PDF));assert.equal(pdf.getPageCount(),1);assert.equal(pdf.getPage(0).getWidth(),PAPER.width);
 const blank=newOrder(),svg=orderPreviewSVG(blank);assert.match(svg,/CÓDIGO GERADO AO SALVAR/);assert.doesNotMatch(svg,/0000-00-ATL/);
});

test('each technical sheet is immediately followed by its own list and kits keep both sizes in the same row',()=>{
 const order=printFixture(),sheets=buildSheets(order);assert.deepEqual(sheets.map(sheet=>[sheet.kind,sheet.sourcePage]),[['sheet',1],['list',1],['sheet',2],['list',2]]);
 const text=sheet=>sheet.ops.filter(op=>op.kind==='text').map(op=>op.text).join('\n');assert.match(text(sheets[1]),/LISTA DE 0001-01-MNZ · DESENHO 1/);assert.match(text(sheets[3]),/DESENHO 2/);assert.match(text(sheets[1]),/Ana/);assert.doesNotMatch(text(sheets[1]),/Bruno/);assert.match(text(sheets[3]),/Bruno/);assert.doesNotMatch(text(sheets[3]),/Ana/);
 assert.doesNotMatch(text(sheets[0]),/CAPITÃ/,'personalization lives on the list, not in the art area');
 const section=listSections(order.pages[0].products,{kit:true})[0];assert.equal(section.rows.length,2);assert.deepEqual(section.rows[0],['1','Ana','07','M','G','2','CAPITÃ']);assert.deepEqual(section.rows[1],['2','SEM NOME','0','BLP','M','1','SEM ADICIONAL']);assert.deepEqual(section.totals.map(item=>item.quantity),[3,3]);
 assert.equal(listSections(order.pages[0].products).length,2,'loose pieces must not be silently relabeled as kits');
});

test('independent personalized rows never pair by name alone and manual grades print without inventing names',()=>{
 const order=printFixture();order.pages[0].products[1].names[0].additional='GOLEIRO';assert.equal(listSections(order.pages[0].products,{kit:true}).length,2);
 const p=order.pages[1].products[0];p.names=[];p.grade='JAQUETA\nM = 2\n\nINFANTIL\nTAM 10 = 1';p.quantity=3;const section=listSections([p])[0];assert.match(section.title,/GRADE SEM PERSONALIZAÇÃO/);assert.deepEqual(section.rows.map(row=>row.slice(1)),[['SEM NOME','SEM NÚMERO','M','2','SEM ADICIONAL'],['SEM NOME','SEM NÚMERO','INFANTIL TAM 10','1','SEM ADICIONAL']]);
});

test('large lists paginate in the same order before the next technical sheet and preserve long fields and totals',()=>{
 const order=printFixture(),p=order.pages[1].products[0];p.names=Array.from({length:145},(_,i)=>({name:'Atleta '+String(i).padStart(3,'0')+' '+('W'.repeat(100)),number:String(i),additional:'ACABAMENTO '+('COORDENADOR '.repeat(14)).slice(0,175),size:'G',quantity:1}));p.quantity=145;p.grade=namesToGrade(p.names,p.type);
 const sheets=buildSheets(order),list=sheets.filter(sheet=>sheet.kind==='list'&&sheet.sourcePage===2);assert.ok(list.length>4);const text=list.flatMap(sheet=>sheet.ops.filter(op=>op.kind==='text').map(op=>op.text)).join('\n');for(let i=0;i<145;i++)assert.match(text,new RegExp('Atleta '+String(i).padStart(3,'0')));assert.match(text,/TOTAL: JAQUETA = 145/);
 for(const sheet of list)for(const op of sheet.ops){if(op.kind==='text')assert.ok(op.y>0&&op.y<PAPER.height&&op.x>=0&&op.x<PAPER.width);if(op.kind==='rect')assert.ok(op.y+op.h<=PAPER.height);}
});

test('production ZIP contains the same interleaved PDF, exact CDR bytes and revision manifest without an Excel',async()=>{
 const document=printFixture();document.workflow={status:'released',revision:2,releasedAt:'2026-10-24T12:00:00Z'};const data=new TextEncoder().encode('CDR ORIGINAL'),hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',data)),b=>b.toString(16).padStart(2,'0')).join(''),file={id:'file',name:'../../uniforme.cdr',size:data.length,sha256:hash};document.technicalFiles=[file];
 const regular=new Uint8Array(await readFile(new URL('../public/fonts/ChakraPetch-Regular.ttf',import.meta.url))),bold=new Uint8Array(await readFile(new URL('../public/fonts/ChakraPetch-SemiBold.ttf',import.meta.url))),delivery={order:{id:'order',version:8,document},files:[file]},options={PDF,Zip,fontkit,regular,bold,readFile:async()=>data};
 const result=await createProductionPackage(delivery,options),zip=await Zip.loadAsync(result.bytes),names=Object.keys(zip.files).filter(name=>!zip.files[name].dir);assert.ok(!names.some(name=>/\.xlsx?$/.test(name)));assert.ok(!names.some(name=>name.split('/').includes('..')));
 const manifest=JSON.parse(await zip.file(names.find(name=>name.endsWith(' - versao.json'))).async('string')),pdf=await PDF.PDFDocument.load(await zip.file(manifest.pdf.name).async('uint8array'));assert.equal(pdf.getPageCount(),4);assert.equal(manifest.order.revision,2);assert.equal(manifest.order.version,8);assert.ok(result.name.startsWith(document.number+' - '+document.client+' - '+document.title));assert.ok(manifest.pdf.name.startsWith(document.number+' - '));assert.ok(manifest.technicalFiles[0].name.split('/').at(-1).startsWith(document.number+' - '));assert.deepEqual(await zip.file(manifest.technicalFiles[0].name).async('uint8array'),data);
 await assert.rejects(createProductionPackage(delivery,{...options,readFile:async()=>new TextEncoder().encode('arquivo trocado')}),/não corresponde/);
});
