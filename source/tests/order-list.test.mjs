import assert from 'node:assert/strict';
import {test} from 'node:test';
import {readFile} from 'node:fs/promises';
import ExcelJS from 'exceljs';
import {LIST_FIELDS,PIECE_TYPES,normalizeListRow,listSize,listProblems,sortListRows,listSummary,prepareListText,prepareListSheets,needsListMapping,parseListMatrix,parseListFreeText} from '../public/order-list.js';
import {readOrderWorkbook,writeListWorkbook} from '../public/order-files.js';
import {JACKET_KIT,kitComponents,typeValue} from '../public/order-core.js';
const make=input=>normalizeListRow({produto:'Kit',grupo:'Linha',quantidade:1,tamanhoCamiseta:'M',tamanhoCalcao:'G',...input});
const parse=(text,defaults={})=>parseListMatrix(prepareListText(text).sheets[0],defaults);

test('new template recognizes two independent sizes, group type and leading zero numbers',()=>{
 const result=parse('Tipo;Nome;Número;Adicional;Tam. Camiseta;Tam. Calção;Quantidade\n2 - Goleiro;João;01;ignorar;TAM10;TAM12;3\nLinha;Ana;09;;BLP;M;2');
 assert.equal(result.records.length,2);assert.deepEqual(result.records.flatMap(listProblems),[]);assert.equal(result.records[0].numero,'01');assert.equal(result.records[0].grupo,'2 - Goleiro');assert.equal(result.records[0].tamanhoCalcao,'TAM12');
 assert.equal(result.records[0].adicional,'ignorar');assert.equal(result.records[1].adicional,'');assert.equal(result.records[1].tamanhoCamiseta,'BLP');assert.equal(result.records[1].tamanhoCalcao,'M');assert.equal(result.unresolved.length,0);
});
test('the supplied workbook uses only the visible order sheet, not its hidden reference values',{skip:!process.env.ORDER_REFERENCE_XLSX},async()=>{
 const path=process.env.ORDER_REFERENCE_XLSX;
 const sheets=prepareListSheets(await readOrderWorkbook(await readFile(path),ExcelJS));
 assert.equal(sheets.length,1);assert.equal(needsListMapping({sheets}),false);
 assert.equal(sheets.filter(s=>s.enabled).length,1);assert.deepEqual(Object.keys(sheets[0].mapping),['grupo','nome','numero','tamanhoCamiseta','tamanhoCalcao','quantidade']);
 assert.equal(parseListMatrix(sheets[0]).records.length,0);
});
test('summary matches requested text and counts sizes rather than rows or whole kits',()=>{
 const rows=[make({tamanhoCamiseta:'P',tamanhoCalcao:'M',quantidade:2}),make({tamanhoCamiseta:'M',quantidade:4}),make({tamanhoCamiseta:'BLP',tamanhoCalcao:'P'}),make({tamanhoCamiseta:'TAM10',tamanhoCalcao:'TAM12',quantidade:3})];
 const summary=listSummary(rows);assert.equal(summary.kits,10);assert.equal(summary.pieces,20);
 assert.equal(summary.sections[0].text,'CAMISETA\nMasculina\nP=2\nM=4\n\nBaby Look\nP=1\n\nInfantil\nTAM10=3');
 assert.equal(summary.sections[1].text,'CALÇÃO\nMasculina\nP=1\nM=2\nG=4\n\nInfantil\nTAM12=3');
});
test('manual garment categories count only their own piece and no blank shorts are invented',()=>{
 for(const product of PIECE_TYPES.filter(p=>!kitComponents(p))){
   const row=make({produto:product,tamanhoCamiseta:['Calça','Calção'].includes(product)?'':'P',tamanhoCalcao:['Calça','Calção'].includes(product)?'M':'',quantidade:3});
   assert.deepEqual(listProblems(row),[]);const summary=listSummary([row]);assert.equal(summary.pieces,3);assert.equal(summary.kits,0);assert.equal(summary.sections[0].product,product);
 }
 const incomplete=make({tamanhoCalcao:''});assert.ok(listProblems(incomplete).some(m=>m.includes('calção do kit')));assert.equal(listSummary([incomplete]).pieces,0);
});
test('jacket and pants kits count each garment in its independent size and reject missing sizes',()=>{
 for(const value of ['KIT - JAQUETA + CALÇA','Kit · Jaqueta + Calça','jaqueta e calça'])assert.equal(typeValue(value),JACKET_KIT);
 const row=make({produto:JACKET_KIT,tamanhoCamiseta:'BLP',tamanhoCalcao:'TAM12',quantidade:3});
 assert.deepEqual(listProblems(row),[]);
 const summary=listSummary([row,make({quantidade:2})]);assert.equal(summary.kits,5);assert.equal(summary.pieces,10);
 assert.equal(summary.sections.find(s=>s.product==='Jaqueta').text,'JAQUETA\nBaby Look\nP=3');
 assert.equal(summary.sections.find(s=>s.product==='Calça').text,'CALÇA\nInfantil\nTAM12=3');
 assert.ok(listProblems({...row,tamanhoCamiseta:''}).some(message=>message.includes('jaqueta')));
 assert.ok(listProblems({...row,tamanhoCalcao:''}).some(message=>message.includes('calça')));
});
test('jacket kit import keeps the selected product and recognizes jacket and pants size labels',()=>{
 const generic=parse('Tipo;Nome;Número;Tam. Camiseta;Tam. Calção;Quantidade\nLinha;Ana;07;M;G;2',{produto:JACKET_KIT});
 const labelled=parseListFreeText('Produto: KIT - JAQUETA + CALÇA; Nome: Ana; Número: 07; Tam. Jaqueta: M; Tam. Calça: G; Quantidade: 2');
 const columns=parse('Tipo;Nome;Número;Tam. Jaqueta;Tam. Calça;Quantidade\nLinha;Ana;07;M;G;2');
 for(const parsed of [generic,labelled,columns]){
   assert.equal(parsed.records.length,1);assert.deepEqual(parsed.records.flatMap(listProblems),[]);
   assert.equal(parsed.records[0].produto,JACKET_KIT);assert.equal(parsed.records[0].tamanhoCamiseta,'M');assert.equal(parsed.records[0].tamanhoCalcao,'G');
 }
});
test('jacket kit Excel and mixed kits retain garment types, leading zero numbers and distinct size grades on reimport',async()=>{
 const jacket=make({produto:JACKET_KIT,nome:'Ana',numero:'07',tamanhoCamiseta:'BLP',tamanhoCalcao:'TAM12',quantidade:3});
 for(const rows of [[jacket],[jacket,make({nome:'Pedro',numero:'01',quantidade:2})]]){
   const bytes=await writeListWorkbook(rows,ExcelJS),book=new ExcelJS.Workbook();await book.xlsx.load(bytes);
   const primary=book.getWorksheet('Pedido');assert.equal(primary.columnCount,7);
   assert.equal(primary.getCell('D1').value,rows.length===1?'Tam. Jaqueta':'Tam. Camiseta / Jaqueta');
   assert.equal(primary.getCell('E1').value,rows.length===1?'Tam. Calça':'Tam. Calção / Calça');
   const summaries=book.getWorksheet('Resumo').getColumn(1).values;assert.ok(summaries.includes('JAQUETA'));assert.ok(summaries.includes('CALÇA'));
   const sheets=prepareListSheets(await readOrderWorkbook(bytes,ExcelJS)),again=parseListMatrix(sheets.find(sheet=>sheet.enabled));
   assert.deepEqual(again.records.flatMap(listProblems),[]);assert.equal(again.records.length,rows.length);
   const imported=again.records.find(row=>row.produto===JACKET_KIT);assert.equal(imported.numero,'07');assert.equal(imported.tamanhoCamiseta,'BLP');assert.equal(imported.tamanhoCalcao,'TAM12');
   assert.deepEqual(listSummary(again.records),listSummary(rows));
 }
});
test('generic template infers a single piece only from explicitly populated size columns',()=>{
 const result=parse('Tipo;Nome;Número;Tam. Camiseta;Tam. Calção;Quantidade\nLinha;João;07;P;;2\nLinha;Ana;09;;BLM;1\nLinha;Pedro;12;G;M;1');
 assert.deepEqual(result.records.map(r=>r.produto),['Camiseta','Calção','Kit']);assert.deepEqual(result.records.flatMap(listProblems),[]);assert.equal(listSummary(result.records).pieces,5);
});
test('quantity zero, fractions, missing kit sizes and unknown products block export',async()=>{
 for(const input of [{quantidade:0},{quantidade:1.5},{quantidade:100000},{numero:'07a'},{tamanhoCalcao:''},{produto:'Peça individual'},{tamanhoCamiseta:'M/G'}]){
   const row=make(input);assert.ok(listProblems(row).length);await assert.rejects(writeListWorkbook([row],ExcelJS),/Corrija/);
 }
 assert.deepEqual(listProblems(make({numero:'0',nome:''})),[]);
});
test('size normalization preserves baby look, numerical children and special grades',()=>{
 assert.equal(listSize('Baby Look P'),'BLP');assert.equal(listSize('BLP'),'BLP');assert.equal(listSize('TAM10'),'TAM10');assert.equal(listSize('10','Infantil'),'TAM10');assert.equal(listSize('Infantil 8'),'TAM08');assert.equal(listSize('M','Baby look'),'BLM');assert.equal(listSize('ESP1'),'ESP1');
});
test('natural sorting prioritizes size, then model, without merging duplicate records',()=>{
 const rows=[make({nome:'Inf10',tamanhoCamiseta:'TAM10'}),make({nome:'M Z',modelo:'Z'}),make({nome:'Baby',tamanhoCamiseta:'BLP'}),make({nome:'P',tamanhoCamiseta:'P'}),make({nome:'Inf8',tamanhoCamiseta:'TAM08'}),make({nome:'M A',modelo:'A'})];
 assert.deepEqual(sortListRows(rows).map(r=>r.nome),['P','M A','M Z','Baby','Inf8','Inf10']);
 assert.equal(listSummary([make({nome:'Repetido'}),make({nome:'Repetido'})]).pieces,4);
});
test('models and colors remain distinct in the piece summary',()=>{
 const summary=listSummary([make({cor:'Azul',modelo:'Jogo',quantidade:2}),make({cor:'AZUL',modelo:'JOGO'}),make({cor:'Branco',modelo:'Jogo',quantidade:4})]);
 assert.equal(summary.sections.length,4);assert.equal(summary.sections[0].quantity,3);assert.equal(summary.sections[1].quantity,4);assert.equal(summary.pieces,14);
});
test('seven-column XLSX output includes optional Adicional and reimports without counting the summary',async()=>{
 const rows=[make({numero:'07',nome:'=1+1',tamanhoCamiseta:'BLP'}),make({numero:'01',nome:'Pedro',tamanhoCamiseta:'TAM10',tamanhoCalcao:'TAM12',quantidade:3})];
 const bytes=await writeListWorkbook(rows,ExcelJS),workbook=new ExcelJS.Workbook();await workbook.xlsx.load(bytes);const sheet=workbook.getWorksheet('Pedido');
 assert.deepEqual(sheet.getRow(1).values.slice(1),LIST_FIELDS.map(([,label])=>label));assert.equal(sheet.columnCount,7);assert.equal(sheet.getCell('B2').value,'=1+1');assert.equal(sheet.getCell('C2').value,'07');assert.equal(sheet.getCell('D2').value,'BLP');assert.equal(sheet.getCell('F3').value,3);assert.ok(sheet.getCell('D2').dataValidation.formulae[0].includes('Tamanhos'));
 assert.equal(workbook.getWorksheet('Tamanhos').state,'hidden');assert.ok(workbook.getWorksheet('Resumo').getColumn(1).values.includes('TAM10=3'));
 const sheets=prepareListSheets(await readOrderWorkbook(bytes,ExcelJS));assert.equal(sheets.filter(s=>s.enabled).length,1);const again=parseListMatrix(sheets.find(s=>s.enabled));assert.equal(again.records.length,2);assert.deepEqual(again.records.map(r=>r.numero),['07','01']);assert.equal(listSummary(again.records).pieces,8);
});
test('supplementary fields retain mixed garments, models and colors while primary sheet includes Adicional',async()=>{
 const rows=[make({produto:'Polo',tamanhoCalcao:'',modelo:'Treino',cor:'Preto',quantidade:2}),make({produto:'Calça',tamanhoCamiseta:'',tamanhoCalcao:'BLG',modelo:'Viagem',cor:'Azul'})];
 const bytes=await writeListWorkbook(rows,ExcelJS),sheets=prepareListSheets(await readOrderWorkbook(bytes,ExcelJS));assert.equal(sheets.filter(s=>s.enabled).length,1);assert.equal(sheets.find(s=>s.enabled).name,'Dados do pedido');
 const result=parseListMatrix(sheets.find(s=>s.enabled));assert.deepEqual(result.records.flatMap(listProblems),[]);assert.deepEqual(result.records.map(r=>r.produto),['Polo','Calça']);assert.deepEqual(result.records.map(r=>r.cor),['Preto','Azul']);assert.equal(listSummary(result.records).pieces,3);
});
test('legacy lists retain their product, sizes and model without requiring optional colors',()=>{
 const result=parse('Modelo;Cor;Nome;Número;Modelagem;Tamanho;Quantidade;Tipo\nGoleiro;;Pedro;01;Infantil;10;2;Camiseta\nLinha;Azul;Ana;07;Baby look;P;1;Polo');
 assert.deepEqual(result.records.flatMap(listProblems),[]);assert.deepEqual(result.records.map(r=>r.produto),['Camiseta','Polo']);assert.equal(result.records[0].tamanhoCamiseta,'TAM10');assert.equal(result.records[1].tamanhoCamiseta,'BLP');
});
test('unmapped and pre-header data are retained for user review instead of being dropped',()=>{
 const result=parse('Texto antes do pedido\nTipo;Nome;Número;Tam. Camiseta;Tam. Calção;Quantidade;Outra\n;;;;;;Pedido sem campos');assert.equal(result.unresolved.length,2);assert.equal(result.records.length,0);
});
test('recognized lists import directly while unknown columns still request mapping',()=>{
 const standard='Tipo;Nome;Número;Tam. Camiseta;Tam. Calção;Quantidade\nLinha;;;M;G;3';
 assert.equal(needsListMapping(prepareListText(standard)),false);
 assert.equal(needsListMapping(prepareListText('Nome;Número;Tamanho\nJoão;07;M')),false);
 assert.equal(needsListMapping(prepareListText(standard.replace('Nome;','Personalização desconhecida;'))),true);
 assert.equal(needsListMapping(prepareListText(standard.replace('Tam. Camiseta;Tam. Calção;','Coluna A;Coluna B;'))),true);
 assert.equal(needsListMapping({sheets:[{rows:[['João','07','M']],headerRow:-1,mapping:{},enabled:true}]}),true);
 assert.equal(needsListMapping({free:true,text:'João 07 M'}),false);
});
test('blank downloadable template contains seven headers and native type and size lists',async()=>{
 const bytes=await writeListWorkbook([],ExcelJS,{template:true}),wb=new ExcelJS.Workbook();await wb.xlsx.load(bytes);const sheet=wb.getWorksheet('Pedido');assert.equal(sheet.getRow(1).cellCount,7);assert.equal(sheet.getCell('A5001').dataValidation.type,'list');assert.equal(sheet.getCell('D5001').dataValidation.type,'list');assert.equal(sheet.getCell('F5001').dataValidation.type,'whole');
 assert.deepEqual(wb.worksheets.filter(s=>s.state==='visible').map(s=>s.name),['Pedido','Como preencher']);
 const sheets=prepareListSheets(await readOrderWorkbook(bytes,ExcelJS));assert.equal(sheets.length,1);assert.equal(sheets[0].name,'Pedido');assert.equal(parseListMatrix(sheets[0]).records.length,0);
});
test('blank names and numbers belong to their own row and never inherit personalization',()=>{
 for(const input of [{},{nome:'',numero:''},{nome:'  ',numero:null}]){
   const row=normalizeListRow(input,{nome:'Nome anterior',numero:'77'});assert.equal(row.nome,'');assert.equal(row.numero,'');
 }
 assert.equal(normalizeListRow({numero:0}).numero,'0');
 const parsed=parse('Tipo;Nome;Número;Tam. Camiseta;Tam. Calção;Quantidade\nLinha;João;07;M;G;1\n;;;M;G;3\nLinha;Ana;;BLP;P;2\nLinha;;0;TAM10;TAM12;1\n;;;;;\n;;;M;G;3',{nome:'Não usar',numero:'99'});
 assert.deepEqual(parsed.records.map(row=>[row.nome,row.numero,row.quantidade]),[['João','07',1],['','',3],['Ana','',2],['','0',1],['','',3]]);
 assert.deepEqual(parsed.records.flatMap(listProblems),[]);assert.equal(parsed.unresolved.length,0);assert.equal(listSummary(parsed.records).pieces,20);
});
test('downloaded models round trip all garments with optional customization and their saved product context',async()=>{
 for(const produto of PIECE_TYPES){
   const wb=new ExcelJS.Workbook();await wb.xlsx.load(await writeListWorkbook([],ExcelJS,{template:true,defaults:{produto,modelo:'Jogo 01',cor:'Azul'},title:'Equipe'}));
   const kit=kitComponents(produto),isBottom=['Calça','Calção'].includes(produto),top=isBottom?'':'M',bottom=kit||isBottom?'G':'';
   wb.getWorksheet('Pedido').addRows([['1 - Linha','João','07',top,bottom,2],['','','',top,bottom,3],[],['','Ana','',top,bottom,''],['','',0,top,bottom,1]]);
   wb.creator='Microsoft Excel';
   const bytes=await wb.xlsx.writeBuffer(),sheets=prepareListSheets(await readOrderWorkbook(bytes,ExcelJS));
   assert.equal(sheets.length,1);assert.equal(sheets[0].template.title,'Equipe');
   const parsed=parseListMatrix(sheets[0],{produto:produto==='Kit'?'Polo':'Kit',modelo:'Outro',cor:'Outra',nome:'Anterior',numero:'99',quantidade:8,grupo:'Goleiro'});
   assert.deepEqual(parsed.records.flatMap(listProblems),[],produto);assert.equal(parsed.unresolved.length,0);assert.equal(parsed.records.length,4);
   assert.ok(parsed.records.every(row=>row.produto===produto&&row.modelo==='Jogo 01'&&row.cor==='Azul'&&row.grupo==='1 - Linha'));
   assert.deepEqual(parsed.records.map(row=>[row.nome,row.numero,row.quantidade]),[['João','07',2],['','',3],['Ana','',1],['','0',1]]);
   const exported=await writeListWorkbook(parsed.records,ExcelJS),again=prepareListSheets(await readOrderWorkbook(exported,ExcelJS)).filter(s=>s.enabled).flatMap(s=>parseListMatrix(s).records);
   assert.deepEqual(listSummary(again),listSummary(parsed.records));
   assert.deepEqual(again.map(row=>[row.nome,row.numero]).sort(),parsed.records.map(row=>[row.nome,row.numero]).sort());
 }
});
test('a model keeps an incomplete kit as a kit and reports the missing size without requiring customization',async()=>{
 const wb=new ExcelJS.Workbook();await wb.xlsx.load(await writeListWorkbook([],ExcelJS,{template:true,defaults:{produto:JACKET_KIT}}));
 wb.getWorksheet('Pedido').addRow(['','','','M','',2]);
 const sheet=prepareListSheets(await readOrderWorkbook(await wb.xlsx.writeBuffer(),ExcelJS))[0],parsed=parseListMatrix(sheet,{produto:'Camiseta'}),row=parsed.records[0];
 assert.equal(row.produto,JACKET_KIT);assert.equal(row.nome,'');assert.equal(row.numero,'');assert.deepEqual(listProblems(row),['Falta o tamanho da calça do kit.']);
});
test('changed model headers are reported before any names or quantities can be omitted',async()=>{
 const wb=new ExcelJS.Workbook();await wb.xlsx.load(await writeListWorkbook([],ExcelJS,{template:true}));wb.getWorksheet('Pedido').getCell('B1').value='Cabeçalho alterado';
 wb.getWorksheet('Pedido').addRow(['Linha','João','07','M','G',1]);
 const sheets=await readOrderWorkbook(await wb.xlsx.writeBuffer(),ExcelJS);assert.throws(()=>prepareListSheets(sheets),/títulos da aba Pedido/);
});
test('labelled text supports the two sizes in one line or consecutive labelled fields',()=>{
 const result=parseListFreeText('Tipo: Goleiro\nNome: João; Número: 07; Tam. Camiseta: M; Tam. Calção: G; Quantidade: 2\n\nNome: Ana\nNúmero: 09\nTam. Camiseta: BLP\nTam. Calção: P\nQuantidade: 1');
 assert.equal(result.records.length,2);assert.deepEqual(result.records.flatMap(listProblems),[]);assert.equal(result.records[0].grupo,'2 - Goleiro');assert.equal(result.records[0].numero,'07');assert.equal(result.records[1].tamanhoCamiseta,'BLP');assert.equal(listSummary(result.records).pieces,6);
});
test('missing optional import cells take defaults while explicit zero remains an error',()=>{
 const parsed=parse('Tipo;Nome;Número;Tam. Camiseta;Tam. Calção;Quantidade;Modelo;Cor\nLinha;Ana;09;BLP;;;;\nLinha;Pedro;01;P;;0;;',{modelo:'Jogo',cor:'Azul'});
 assert.equal(parsed.records[0].quantidade,1);assert.equal(parsed.records[0].modelo,'Jogo');assert.equal(parsed.records[0].cor,'Azul');assert.equal(parsed.records[1].quantidade,0);assert.ok(listProblems(parsed.records[1]).length);
});

test('new manual rows default to individual pieces and summaries retain separate groups',()=>{
 assert.equal(normalizeListRow({}).produto,'Camiseta');
 const base={produto:'Camiseta',tamanhoCamiseta:'M',quantidade:1,modelo:'Jogo',cor:'Azul'};
 const summary=listSummary([normalizeListRow({...base,grupo:'Linha'}),normalizeListRow({...base,grupo:'Goleiro'})]);
 assert.equal(summary.pieces,2);assert.equal(summary.sections.length,2);assert.match(summary.text,/Linha/);assert.match(summary.text,/Goleiro/);
});
