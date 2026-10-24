import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import * as PDF from 'pdf-lib';
import Zip from 'jszip';
import fontkit from '@pdf-lib/fontkit';
import {newOrder,newPage,newKitPage,namesToGrade} from '../public/production-core.js';
import {buildSheets,listSections,PAPER} from '../public/production-sheet.js';
import {createProductionPackage} from '../public/order-delivery.js';

export function printFixture(){
 const order=newOrder();Object.assign(order,{number:'0001-01-MNZ',client:'Equipe Exemplo',artist:'Designer',deliveryDate:'2099-12-20'});
 const kit=newKitPage(),jacket=newPage('Jaqueta');kit.title='JOGO 1';jacket.title='VIAGEM 2';order.pages=[kit,jacket];
 for(const [i,p]of kit.products.entries()){p.model='EDGE 2027';p.fabric='DRY';p.names=[{name:'Ana',number:'07',additional:'CAPITÃ',size:i?'G':'M',quantity:2},{name:'',number:'0',additional:'',size:i?'M':'BLP',quantity:1}];p.quantity=3;p.grade=namesToGrade(p.names,p.type);}
 const p=jacket.products[0];p.model='Jaqueta viagem';p.fabric='HELANCA';p.names=[{name:'Bruno',number:'',additional:'COMISSÃO',size:'G',quantity:1}];p.quantity=1;p.grade=namesToGrade(p.names,p.type);return order;
}

test('each technical sheet is immediately followed by its own list and kits keep both sizes in the same row',()=>{
 const order=printFixture(),sheets=buildSheets(order);assert.deepEqual(sheets.map(sheet=>[sheet.kind,sheet.sourcePage]),[['sheet',1],['list',1],['sheet',2],['list',2]]);
 const text=sheet=>sheet.ops.filter(op=>op.kind==='text').map(op=>op.text).join('\n');assert.match(text(sheets[1]),/LISTA DE 0001-01-MNZ - PÁGINA 1/);assert.match(text(sheets[3]),/PÁGINA 2/);assert.match(text(sheets[1]),/Ana/);assert.doesNotMatch(text(sheets[1]),/Bruno/);assert.match(text(sheets[3]),/Bruno/);assert.doesNotMatch(text(sheets[3]),/Ana/);
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
 const manifest=JSON.parse(await zip.file('VERSAO_DO_PEDIDO.json').async('string')),pdf=await PDF.PDFDocument.load(await zip.file(manifest.pdf.name).async('uint8array'));assert.equal(pdf.getPageCount(),4);assert.equal(manifest.order.revision,2);assert.equal(manifest.order.version,8);assert.deepEqual(await zip.file(manifest.technicalFiles[0].name).async('uint8array'),data);
 await assert.rejects(createProductionPackage(delivery,{...options,readFile:async()=>new TextEncoder().encode('arquivo trocado')}),/não corresponde/);
});
