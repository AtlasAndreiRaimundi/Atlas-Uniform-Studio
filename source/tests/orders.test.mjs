import assert from 'node:assert/strict';
import {test} from 'node:test';
import ExcelJS from 'exceljs';
import {PIECE_TYPES,normalizeOrder,orderProblems,sortOrders,summarizeOrders,duplicateIds,parseDelimited,prepareText,parseOrderMatrix,parseFreeText,detectHeader,quantityValue,typeValue} from '../public/order-core.js';
import {readOrderWorkbook,writeOrderWorkbook} from '../public/order-files.js';
const defaults={modelo:'Camiseta',cor:'Azul',categoria:'Adulto',tamanho:'M',quantidade:1,tipo:'Kit'};
const make=(input,source={sheet:'Origem',row:1,text:'Dado original'})=>normalizeOrder(input,defaults,source);
const table='Modelo;Cor;Nome;Número;Modelagem;Tamanho;Quantidade;Tipo\nPeça;Azul;João;07;Adulto;M;1;Kit\nCamiseta;Branco;Ana;09;Baby look;P;2;Polo';

test('column import retains accents, zero-prefixed shirt numbers and real data named Peça/Kit',()=>{
  const prepared=prepareText('\uFEFF'+table),parsed=parseOrderMatrix(prepared.sheets[0]);
  assert.equal(parsed.records.length,2);assert.equal(parsed.records[0].nome,'João');assert.equal(parsed.records[0].numero,'07');
  assert.equal(parsed.records[1].numero,'09');assert.equal(parsed.records[1].tipo,'Polo');
  assert.deepEqual(parsed.records.flatMap(orderProblems),[]);assert.equal(parsed.unresolved.length,0);
  assert.equal(detectHeader([['Peça','Azul','João','07','Adulto','M','1','Kit']]).row,-1);
});
test('quoted CSV fields, escaped quotes and multiline names preserve record boundaries',()=>{
  const rows=parseDelimited('Nome;Número;Tamanho\r\n"João; \"\"Capitão\"\"";07;M\r\n"Maria\nSilva";09;P',';');
  assert.equal(rows.length,3);assert.equal(rows[1][0],'João; "Capitão"');assert.equal(rows[2][0],'Maria\nSilva');
  assert.equal(rows[1].rowNumber,2);assert.equal(rows[2].rowNumber,3);
  assert.throws(()=>parseDelimited('"Nome sem fechar;07',';'),/aspa aberta/);
});
test('labelled text blocks and size headings keep garment quantities and raw provenance',()=>{
  const text='Modelo: Camiseta; Cor: Azul; Tipo: Kit\nADULTO M\nJoão - 07 - M - 2 kits\nMaria - 10 - G - 1 polo\nBABY LOOK P\nNome: Ana\nNúmero: 09\nQuantidade: 3\n\nTOTAL 6\nInformação sem campos';
  const result=parseFreeText(text,{quantidade:1});
  assert.equal(result.records.length,3);assert.deepEqual(result.records.map(r=>r.quantidade),[2,1,3]);
  assert.equal(result.records[1].tipo,'Polo');assert.equal(result.records[2].categoria,'Baby look');assert.equal(result.records[2].tamanho,'P');
  assert.equal(result.records[2].numero,'09');assert.match(result.records[2].source.text,/Número: 09/);
  assert.equal(result.unresolved.length,1);assert.equal(result.unresolved[0].text,'Informação sem campos');
  assert.ok(result.notes.some(note=>note.text==='TOTAL 6'));
});
test('all garment categories keep separate totals and generic legacy pieces require classification',async()=>{
  const variants=['kits','kit jaqueta + calça','camisetas','camisa polo','jaquetas','calças','coletes','regatas','calções'];
  assert.deepEqual(variants.map(typeValue),PIECE_TYPES);
  const rows=variants.map((tipo,index)=>make({nome:`Atleta ${index}`,tipo,quantidade:index+1}));
  assert.deepEqual(rows.flatMap(orderProblems),[]);
  const summary=summarizeOrders(rows);
  assert.equal(summary.kits,3);assert.equal(summary.pieces,42);
  assert.deepEqual(summary.byType.map(({tipo,quantidade})=>[tipo,quantidade]),PIECE_TYPES.map((tipo,index)=>[tipo,index+1]));
  const legacy=make({tipo:'Peça individual'});assert.equal(legacy.tipo,'');assert.ok(orderProblems(legacy).includes('Peça / kit não informado'));
  const workbook=new ExcelJS.Workbook();await workbook.xlsx.load(await writeOrderWorkbook(rows,[],ExcelJS));
  const totals=workbook.getWorksheet('Totais por peça');
  assert.equal(totals.rowCount,10);assert.equal(totals.getCell('A10').value,'Calção');assert.equal(totals.getCell('B10').value,9);
  const again=await readOrderWorkbook(await workbook.xlsx.writeBuffer(),ExcelJS);
  assert.deepEqual(parseOrderMatrix(again.find(sheet=>sheet.enabled)).records.map(row=>row.tipo).sort(),[...PIECE_TYPES].sort());
});
test('comma-separated labelled fields are not mistaken for a column table',()=>{
  const text='Nome: João, Número: 07, Tamanho: Adulto M, Modelo: Camiseta, Cor: Azul, Tipo: Kit';
  assert.equal(prepareText(text).free,true);const result=parseFreeText(text,{quantidade:1});
  assert.equal(result.records[0].numero,'07');assert.equal(result.records[0].categoria,'Adulto');assert.equal(result.records[0].cor,'Azul');
});
test('ambiguous numbers remain unresolved and defaults never invent names, numbers or modelagem',()=>{
  const result=parseFreeText('João - 07 - 10\nSó uma pessoa',defaults);
  assert.equal(result.records.length,0);assert.equal(result.unresolved.length,2);
  const empty=normalizeOrder({nome:'Maria',tamanho:'P'},{quantidade:1});
  assert.equal(empty.categoria,'');assert.equal(empty.numero,'');assert.ok(orderProblems(empty).includes('Modelagem não informado'));
  const feminine=normalizeOrder({nome:'Maria',categoria:'Feminino',tamanho:'G'},defaults);assert.equal(feminine.categoria,'');
  const infant=make({tamanho:'Infantil 10'});assert.equal(infant.categoria,'Infantil');assert.equal(infant.tamanho,'10');assert.ok(!infant.inherited.includes('categoria'));
});
test('changing modelagem does not silently carry a size from the previous grade',()=>{
  const result=parseFreeText('ADULTO M\nJoão - 07 - M\nBABY LOOK\nNome: Ana\nNúmero: 09',defaults);
  assert.equal(result.records.length,2);assert.equal(result.records[1].categoria,'Baby look');assert.equal(result.records[1].tamanho,'');
});
test('sorting is natural by modelagem, size and model; summaries count kits separately from pieces',()=>{
  const rows=[make({nome:'Inf 10',categoria:'Infantil',tamanho:'10',quantidade:2}),make({nome:'G',tamanho:'G',tipo:'Polo',quantidade:3}),make({nome:'M Linha',modelo:'Linha',tamanho:'M'}),make({nome:'P',tamanho:'P'}),make({nome:'Inf 8',categoria:'Infantil',tamanho:'8'}),make({nome:'Baby',categoria:'Baby look',tamanho:'P'}),make({nome:'M Goleiro',modelo:'Goleiro',tamanho:'M'})];
  assert.deepEqual(sortOrders(rows).map(r=>r.nome),['P','M Goleiro','M Linha','G','Baby','Inf 8','Inf 10']);
  const summary=summarizeOrders(rows);assert.equal(summary.kits,7);assert.equal(summary.pieces,3);assert.equal(summary.rows,7);
  const colored=summarizeOrders([make({cor:'Azul',quantidade:2}),make({cor:'AZUL',quantidade:3})]);assert.equal(colored.groups.length,1);assert.equal(colored.groups[0].quantidade,5);
});
test('invalid quantities and conflicting sizes are blocked, while zero shirt numbers remain valid',()=>{
  for(const quantity of [0,-1,1.5,100000,'abc'])assert.ok(orderProblems(make({quantidade:quantity})).some(issue=>issue.startsWith('Quantidade')));
  assert.equal(quantityValue('1,00'),1);assert.equal(quantityValue('2.0'),2);assert.equal(quantityValue('1.000'),null);
  assert.equal(quantityValue('1,5'),null);assert.equal(orderProblems(make({numero:'0'})).length,0);
  assert.ok(orderProblems(make({categoria:'Adulto',tamanho:'Infantil 10'})).some(issue=>issue.includes('conflito')));
  assert.ok(orderProblems(make({tamanho:'M/G'})).some(issue=>issue.startsWith('Tamanho')));
});
test('duplicate records are flagged and retained instead of silently merged',()=>{
  const rows=[{...make({nome:'João',numero:'07'}),id:'a'},{...make({nome:'João',numero:'07'}),id:'b'}];
  assert.deepEqual([...duplicateIds(rows)],['b','a']);assert.equal(summarizeOrders(rows).kits,2);
});
test('XLSX import handles merged common fields, formatted zero prefixes and cached formula values',async()=>{
  const workbook=new ExcelJS.Workbook(),sheet=workbook.addWorksheet('Linha');
  sheet.addRow(['Modelo','Cor','Nome','Número','Modelagem','Tamanho','Quantidade','Tipo']);
  sheet.addRow(['Camiseta','Azul','João',7,'Adulto','M',{formula:'1+1',result:2},'Kit']);
  sheet.addRow(['','','Ana',9,'Baby look','P',1,'Polo']);sheet.mergeCells('A2:A3');sheet.mergeCells('B2:B3');
  sheet.getCell('D2').numFmt='00';sheet.getCell('D3').numFmt='00';
  const imported=await readOrderWorkbook(await workbook.xlsx.writeBuffer(),ExcelJS),parsed=parseOrderMatrix(imported[0]);
  assert.equal(parsed.records.length,2);assert.deepEqual(parsed.records.map(row=>row.numero),['07','09']);assert.equal(parsed.records[1].modelo,'Camiseta');assert.equal(parsed.records[0].quantidade,2);
  await assert.rejects(readOrderWorkbook(new Uint8Array([1,2,3]),ExcelJS),/Não foi possível ler/);
});
test('XLSX export round-trips all rows and quantities without reimporting its summaries as extra orders',async()=>{
  const parsed=parseOrderMatrix(prepareText(table).sheets[0]);parsed.records[0].nome='=1+1';
  const bytes=await writeOrderWorkbook(parsed.records,parsed.notes,ExcelJS),workbook=new ExcelJS.Workbook();await workbook.xlsx.load(bytes);
  const sheet=workbook.getWorksheet('Pedidos organizados');assert.equal(sheet.rowCount,3);assert.equal(sheet.getCell('D2').value,'07');assert.equal(sheet.getCell('C2').value,'=1+1');assert.equal(typeof sheet.getCell('G2').value,'number');
  const reimported=await readOrderWorkbook(bytes,ExcelJS);assert.equal(reimported.filter(s=>s.enabled).length,1);
  const again=parseOrderMatrix(reimported.find(s=>s.enabled));assert.equal(again.records.length,2);assert.deepEqual(again.records.map(r=>r.numero),['07','09']);
  const totals=summarizeOrders(again.records);assert.equal(totals.kits,1);assert.equal(totals.pieces,2);
  assert.ok(workbook.getWorksheet('Conferência da origem').getCell('D2').value.includes('João'));
});
test('unknown lines before headers are retained for review, and oversized input is rejected rather than truncated',async()=>{
  const prepared=prepareText('Dado sem classificação\n'+table),result=parseOrderMatrix(prepared.sheets[0]);
  assert.equal(result.records.length,2);assert.equal(result.unresolved.length,1);assert.match(result.unresolved[0].text,/Dado sem classificação/);
  assert.throws(()=>parseDelimited('x;y\n'.repeat(5001),';'),/5.000/);
  assert.throws(()=>parseFreeText('a'.repeat(1000001)),/milhão/);
  await assert.rejects(writeOrderWorkbook([normalizeOrder({nome:'João'})],[],ExcelJS),/Corrija/);
});
