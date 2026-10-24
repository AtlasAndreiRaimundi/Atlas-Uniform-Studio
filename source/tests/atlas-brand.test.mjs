import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import Excel from 'exceljs';
import {drawBrandLogo} from '../public/brand-assets.js';
import {writeListWorkbook,readOrderWorkbook} from '../public/order-files.js';
import {prepareListSheets,parseListMatrix} from '../public/order-list.js';

test('the light and dark Atlas variants preserve the original supplied vector paths',async()=>{
 const original=await readFile(new URL('../public/assets/atlas/atlas-original.svg',import.meta.url),'utf8'),paths=[...original.matchAll(/\bd="([^"]+)"/g)].map(m=>m[1]);
 for(const theme of ['light','dark']){const svg=await readFile(new URL('../public/assets/atlas/atlas-logo-'+theme+'.svg',import.meta.url),'utf8'),actual=[...svg.matchAll(/\bd="([^"]+)"/g)].map(m=>m[1]);assert.ok(actual.length>0);for(const path of actual)assert.ok(paths.includes(path),'Logo geometry must come from the supplied artwork');const box=svg.match(/viewBox="([^"]+)"/)[1].split(' ').map(Number);assert.ok(box[2]/box[3]>3.5&&box[2]/box[3]<3.6);assert.doesNotMatch(svg,/<script|<image|foreignObject|<!DOCTYPE/i);}
});
test('presentation and video logos retain the entire native aspect ratio without viewport cropping',()=>{
 const image={naturalWidth:1200,naturalHeight:338},calls=[],ctx={drawImage(...args){calls.push(args);}};const r=drawBrandLogo(ctx,image,12,15,440,160);assert.equal(calls[0].length,5);assert.equal(calls[0][0],image);assert.ok(Math.abs(r.width/r.height-1200/338)<1e-12);assert.ok(r.width<=440&&r.height<=160);
});
test('Atlas templates import old company models without losing leading zero numbers or empty fields',async()=>{
 const bytes=await writeListWorkbook([],Excel,{template:true}),book=new Excel.Workbook();await book.xlsx.load(bytes);assert.match(book.creator,/Atlas Uniform Studio/);const metadata=book.getWorksheet('_Modelo Atlas');assert.equal(metadata.getCell('A1').value,'atlas.order-list');metadata.name='_Modelo Meinerz';metadata.getCell('A1').value='meinerz.order-list';book.creator='Meinerz Uniform Studio · Andrei Raimundi';
 book.getWorksheet('Pedido').addRow(['Linha',null,'00','M','G',1,null]);const sheets=prepareListSheets(await readOrderWorkbook(await book.xlsx.writeBuffer(),Excel)),parsed=parseListMatrix(sheets.find(s=>s.enabled));assert.equal(parsed.records.length,1);assert.equal(parsed.records[0].numero,'00');assert.equal(parsed.records[0].nome,'');assert.equal(parsed.records[0].adicional,'');assert.equal(parsed.records[0].produto,'Kit');
});
test('every current tool screen uses Atlas branding and the supplied logo variants',async()=>{
 for(const file of ['pedido.html','organizador.html','viewer.html','acervo.html','proposta.html','simulador/editor.html']){const html=await readFile(new URL('../public/'+file,import.meta.url),'utf8');assert.doesNotMatch(html,/meinerz/i);assert.match(html,/atlas-logo-light\.svg/);assert.match(html,/atlas-logo-dark\.svg/);assert.match(html,/atlas-brand\.css/);}
});
