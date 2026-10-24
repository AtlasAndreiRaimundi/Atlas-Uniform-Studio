import { ORDER_FIELDS, ORDER_LIMITS, PIECE_TYPES, kitComponents, validProductType, isBottomProduct, typeValue, detectHeader, sortOrders, summarizeOrders, orderProblems } from './order-core.js?v=3';
import {LIST_FIELDS, LIST_TEMPLATE_ID, LIST_TEMPLATE_VERSION, listFields, GROUP_TYPES, LIST_SIZES, listProblems, sortListRows, listSummary} from './order-list.js?v=6';

const TEMPLATE_SHEET='_Modelo Atlas';
function readTemplate(workbook){
  const sheet=workbook.getWorksheet(TEMPLATE_SHEET)||workbook.getWorksheet('_Modelo Meinerz');
  if(!sheet||![LIST_TEMPLATE_ID,'meinerz.order-list'].includes(sheet.getCell('A1').value))return null;
  const version=sheet.getCell('B1').value;
  if(![1,LIST_TEMPLATE_VERSION].includes(version))throw new Error('Este modelo usa outra versão. Baixe o modelo atual no site.');
  const produto=String(sheet.getCell('B2').value??'');
  if(!validProductType(produto)||!workbook.getWorksheet('Pedido'))throw new Error('O modelo foi alterado. Mantenha a aba Pedido e baixe um novo modelo se necessário.');
  return {version,defaults:{produto,modelo:String(sheet.getCell('B3').value??''),cor:String(sheet.getCell('B4').value??'')},title:String(sheet.getCell('B5').value??'')};
}

export async function readOrderWorkbook(data,Excel) {
  const workbook=new Excel.Workbook();
  try{await workbook.xlsx.load(data,{ignoreNodes:['picture','drawing','conditionalFormatting','sheetProtection']});}
  catch{throw new Error('Não foi possível ler este XLSX. Abra no Excel ou LibreOffice e salve novamente como .xlsx.');}
  const template=readTemplate(workbook),sheets=[];let count=0;
  workbook.eachSheet(worksheet=>{
    // The supplied model has one input sheet. Help, examples and validation lists are never orders.
    if(template&&worksheet.name!=='Pedido')return;
    const rows=[];
    worksheet.eachRow({includeEmpty:false},row=>{
      if(!row.hasValues)return;
      count++;if(count>ORDER_LIMITS.rows*4+200)throw new Error('O arquivo tem abas demais para este pedido. Divida a planilha.');
      if(row.cellCount>ORDER_LIMITS.columns)throw new Error('Importe até 80 colunas por aba.');
      const values=Array.from({length:row.cellCount},(_,index)=>{
        const cell=row.getCell(index+1);let value=cell.value;
        if(value&&typeof value==='object'){
          if('formula' in value||'sharedFormula' in value)value=value.result??`=${value.formula||'FÓRMULA SEM RESULTADO'}`;
          else if(value.richText)value=value.richText.map(part=>part.text).join('');
          else if(value.text!==undefined)value=value.text;
          else if(value.error)value=value.error;
        }
        if(value instanceof Date)value=value.toISOString().slice(0,10);
        if(typeof value==='number'&&Number.isInteger(value)&&/^0{2,10}$/.test(cell.numFmt||''))value=String(value).padStart(cell.numFmt.length,'0');
        const text=String(value??'');
        if(text.length>2000)throw new Error(`A célula ${worksheet.name}!${cell.address} tem texto demais para um campo de pedido.`);
        return text;
      });
      if(values.join(' | ').length>30000)throw new Error(`A linha ${row.number} tem texto demais. Remova colunas que não fazem parte do pedido.`);
      values.rowNumber=row.number;rows.push(values);
    });
    if(rows.length){const header=detectHeader(rows);sheets.push({name:worksheet.name,rows,headerRow:header.row,mapping:header.mapping,enabled:worksheet.state!=='hidden'&&worksheet.state!=='veryHidden',...(template?{template}: {})});}
  });
  if(!sheets.length)throw new Error('Esta planilha não tem linhas preenchidas.');
  if(/^(?:Atlas|Meinerz) Uniform Studio/i.test(String(workbook.creator||''))&&sheets.some(sheet=>sheet.name==='Pedidos organizados')){
    sheets.forEach(sheet=>{sheet.enabled=sheet.name==='Pedidos organizados';});
  }
  if(/^(?:Atlas|Meinerz) Uniform Studio/i.test(String(workbook.creator||''))&&sheets.some(sheet=>sheet.name==='Pedido')){
    const primary=sheets.some(sheet=>sheet.name==='Dados do pedido')?'Dados do pedido':'Pedido';
    sheets.forEach(sheet=>{sheet.enabled=sheet.name===primary;});
  }
  const orders=sheets.filter(sheet=>sheet.enabled!==false);
  if(!orders.length)throw new Error('Não há uma aba visível com pedidos. Deixe a aba da lista visível no Excel e envie novamente.');
  return orders;
}

// Adicional is optional, row-specific text. Legacy six-column models remain readable.
export async function writeListWorkbook(rows,Excel,{title='Pedido',template=false,defaults={}}={}) {
  if(!template&&!rows.length)throw new Error('Adicione pelo menos uma linha ao pedido.');
  if(rows.length>ORDER_LIMITS.rows)throw new Error('Use até 5.000 linhas por pedido.');
  if(rows.some(row=>listProblems(row).length))throw new Error('Corrija as linhas sinalizadas antes de baixar o Excel.');
  const workbook=new Excel.Workbook();workbook.creator='Atlas Uniform Studio · Andrei Raimundi';workbook.subject=title;workbook.created=new Date();
  const sorted=sortListRows(rows),sheet=workbook.addWorksheet('Pedido');
  const templateDefaults={produto:typeValue(defaults.produto)||String(defaults.produto||'').trim()||'Kit',modelo:String(defaults.modelo??'').trim(),cor:String(defaults.cor??'').trim()};
  if(!validProductType(templateDefaults.produto))throw new Error('Confira os nomes das peças antes de baixar o modelo.');
  const fields=listFields(template?[templateDefaults]:sorted);
  sheet.addRow(fields.map(([,label])=>label));
  sorted.forEach(row=>sheet.addRow(LIST_FIELDS.map(([field])=>field==='quantidade'?row.quantidade:(String(row[field]??'')||null))));
  formatSheet(sheet,[25,32,13,21,21,16,32]);
  for(const column of [1,2,3,4,5,7])sheet.getColumn(column).numFmt='@';
  sheet.getColumn(6).numFmt='0';
  const sizes=workbook.addWorksheet('Tamanhos',{state:'hidden'}),types=workbook.addWorksheet('Tipos',{state:'hidden'});
  LIST_SIZES.forEach(size=>sizes.addRow([size]));GROUP_TYPES.forEach(type=>types.addRow([type]));
  workbook.definedNames.add(`Tipos!$A$1:$A$${GROUP_TYPES.length}`,'TiposPedido');
  workbook.definedNames.add(`Tamanhos!$A$1:$A$${LIST_SIZES.length}`,'TamanhosPedido');
  const last=template?ORDER_LIMITS.rows+1:Math.max(500,sorted.length+100);
  for(const [column,formula] of [['A','TiposPedido'],['D','TamanhosPedido'],['E','TamanhosPedido']]){
    sheet.dataValidations.add(`${column}2:${column}${last}`,{type:'list',allowBlank:true,formulae:[formula],showErrorMessage:true,errorStyle:'stop',errorTitle:'Valor inválido',error:'Selecione um valor da lista.'});
  }
  sheet.dataValidations.add(`F2:F${last}`,{type:'whole',operator:'between',formulae:[1,99999],allowBlank:true,showErrorMessage:true,error:'Use uma quantidade inteira de 1 a 99999.'});
  if(template){
    sheet.dataValidations.add(`B2:B${last}`,{type:'textLength',operator:'lessThanOrEqual',formulae:[120],allowBlank:true,showInputMessage:true,promptTitle:'Nome opcional',prompt:'Deixe vazio para produzir sem nome. Não repita o nome da linha anterior.'});
    sheet.dataValidations.add(`C2:C${last}`,{type:'textLength',operator:'lessThanOrEqual',formulae:[4],allowBlank:true,showInputMessage:true,promptTitle:'Número opcional',prompt:'Deixe vazio para produzir sem número. Use até 4 dígitos, inclusive 0 ou 07.',showErrorMessage:true,error:'Use até quatro dígitos ou deixe vazio.'});
    sheet.dataValidations.add(`G2:G${last}`,{type:'textLength',operator:'lessThanOrEqual',formulae:[200],allowBlank:true,showInputMessage:true,promptTitle:'Adicional opcional',prompt:'Cargo, tipo sanguíneo ou outro texto. Deixe vazio para produzir sem adicional.',showErrorMessage:true,error:'Use até 200 caracteres ou deixe vazio.'});
    addTemplateInstructions(workbook,fields,templateDefaults);
    const metadata=workbook.addWorksheet(TEMPLATE_SHEET,{state:'veryHidden'});
    metadata.addRows([[LIST_TEMPLATE_ID,LIST_TEMPLATE_VERSION],['Peça / kit',templateDefaults.produto],['Modelo',templateDefaults.modelo],['Cor',templateDefaults.cor],['Pedido',title==='Pedido'?'':title]]);
  }
  if(!template){
    const summary=listSummary(sorted),totals=workbook.addWorksheet('Resumo');
    for(const section of summary.sections){
      for(const line of section.text.split('\n'))totals.addRow([line]);
      totals.addRow([]);
    }
    totals.addRow([`TOTAL DE PEÇAS=${summary.pieces}`]);
    if(summary.kits)totals.addRow([`KITS=${summary.kits} (as duas peças de cada kit já estão incluídas no total de peças)`]);
    totals.getColumn(1).width=80;
    totals.eachRow(row=>{row.font={name:'Arial',size:11};row.alignment={wrapText:true,vertical:'middle'};if(row.getCell(1).value&&String(row.getCell(1).value)===String(row.getCell(1).value).toLocaleUpperCase('pt-BR')&&!String(row.getCell(1).value).includes('=')){row.font={name:'Arial',size:12,bold:true};row.height=24;}else row.height=20;});
    totals.pageSetup={paperSize:9,fitToPage:true,fitToWidth:1,fitToHeight:0};
    if(sorted.some(row=>row.modelo||row.cor||!['Kit','Camiseta','Calção'].includes(row.produto))){
      const details=workbook.addWorksheet('Dados do pedido');
      details.addRow([...fields.map(([,label])=>label),'Peça / kit','Modelo','Cor']);
      sorted.forEach(row=>details.addRow([...LIST_FIELDS.map(([field])=>field==='quantidade'?row.quantidade:(String(row[field]??'')||null)),row.produto,row.modelo,row.cor]));
      formatSheet(details,[25,32,13,21,21,16,32,18,25,20]);
      for(const column of [1,2,3,4,5,7,8,9,10])details.getColumn(column).numFmt='@';
    }
  }
  return workbook.xlsx.writeBuffer();
}

function addTemplateInstructions(workbook,fields,defaults){
  const sheet=workbook.addWorksheet('Como preencher'),kit=kitComponents(defaults.produto),isBottom=isBottomProduct(defaults.produto);
  const product=defaults.produto==='Kit'?'Kit de camiseta + calção':defaults.produto;
  sheet.addRows([
    ['Como preencher'],
    ['Peça / kit',product],
    ['Preenchimento','Preencha somente a aba Pedido, a partir da linha 2. Mantenha os sete títulos.'],
    ['Nome vazio','A peça vai sem nome. O nome da linha anterior não é repetido.'],
    ['Número vazio','A peça vai sem número. Nome e número podem ficar vazios na mesma linha.'],
    ['Adicional','Opcional: cargo, tipo sanguíneo ou outro texto a aplicar na peça. Vazio = sem adicional; nunca repete a linha anterior.'],
    ['Número 0 ou 07','São números válidos. O zero e os zeros à esquerda são preservados.'],
    ['Tipo vazio','Será considerado 1 - Linha. Use a lista para Goleiro, Torcida, Comissão, Staff ou Outro.'],
    ['Quantidade vazia','Será considerada 1. Para várias peças iguais, informe a quantidade na mesma linha.'],
    ['Tamanhos',kit?`Informe os dois tamanhos: ${kit[0]} e ${kit[1]}. Eles podem ser diferentes.`:`Preencha somente ${fields[isBottom?4:3][1]} para ${defaults.produto}. Deixe a outra coluna de tamanho vazia.${['Camiseta','Calção'].includes(defaults.produto)?' Se preencher os dois tamanhos de camiseta e calção, a linha será lida como Kit.':''}`],
    ['Grades','P, M, G etc. = Masculina. BLP, BLM etc. = Baby Look. TAM08, TAM10 etc. = Infantil.'],
    ['Linhas vazias','São ignoradas. Cada linha preenchida é mantida, mesmo sem nome e sem número.'],
    ['Importação','Salve em .xlsx e envie no site. A aba Pedido será reconhecida e organizada automaticamente.'],
    [],
    ['Exemplos (não entram no pedido)'],
    fields.map(([,label])=>label),
    ['1 - Linha','João','07',isBottom?null:'M',kit||isBottom?'G':null,1,'CAPITÃO'],
    ['1 - Linha',null,null,isBottom?null:'P',kit||isBottom?'M':null,3,null],
    ['2 - Goleiro',null,'0',isBottom?null:'TAM10',kit||isBottom?'TAM12':null,1,'O+'],
  ]);
  [25,83,13,21,21,16,32].forEach((width,index)=>{sheet.getColumn(index+1).width=width;});
  for(const column of [1,2,3,4,5,7])sheet.getColumn(column).numFmt='@';
  sheet.views=[{showGridLines:false}];
  sheet.eachRow(row=>{row.font={name:'Arial',size:11,color:{argb:'FF252A2B'}};row.alignment={vertical:'middle',wrapText:true};row.height=row.number>=3&&row.number<=12?34:25;});
  sheet.getRow(1).font={name:'Arial',size:15,bold:true};sheet.getRow(1).height=30;
  sheet.getRow(15).font={name:'Arial',size:11,bold:true};
  sheet.getRow(15).height=40;
  sheet.getRow(16).eachCell(cell=>{cell.fill={type:'pattern',pattern:'solid',fgColor:{argb:'FF202326'}};cell.font={name:'Arial',size:11,bold:true,color:{argb:'FFFFFFFF'}};});
  sheet.pageSetup={orientation:'landscape',paperSize:9,fitToPage:true,fitToWidth:1,fitToHeight:1};
}

function formatSheet(sheet,widths) {
  sheet.views=[{state:'frozen',ySplit:1}];
  sheet.pageSetup={orientation:'landscape',paperSize:9,fitToPage:true,fitToWidth:1,fitToHeight:0};
  sheet.pageSetup.printTitlesRow='1:1';
  widths.forEach((width,index)=>{sheet.getColumn(index+1).width=width;});
  sheet.getRow(1).height=29;
  sheet.eachRow((row,index)=>{
    row.font={name:'Arial',size:10,color:{argb:'FF252A2B'}};
    row.alignment={vertical:'middle',wrapText:true};
    row.eachCell({includeEmpty:true},cell=>{
      cell.border={bottom:{style:'hair',color:{argb:'FFE0E0DA'}}};
      if(index>1&&index%2===0)cell.fill={type:'pattern',pattern:'solid',fgColor:{argb:'FFF5F5F0'}};
    });
  });
  sheet.getRow(1).eachCell(cell=>{cell.fill={type:'pattern',pattern:'solid',fgColor:{argb:'FF202326'}};cell.font={name:'Arial',size:10,bold:true,color:{argb:'FFD4C19A'}};});
  if(sheet.rowCount>1)sheet.autoFilter={from:{row:1,column:1},to:{row:sheet.rowCount,column:widths.length}};
}

export async function writeOrderWorkbook(rows,notes,Excel,{title='Pedido organizado'}={}) {
  if(!rows.length)throw new Error('Adicione pelo menos uma linha ao pedido.');
  if(rows.some(row=>orderProblems(row).length))throw new Error('Corrija as linhas sinalizadas antes de exportar.');
  const workbook=new Excel.Workbook();workbook.creator='Atlas Uniform Studio · Andrei Raimundi';workbook.subject=title;
  workbook.created=new Date();
  const sorted=sortOrders(rows),summary=summarizeOrders(sorted),orders=workbook.addWorksheet('Pedidos organizados');
  orders.addRow(ORDER_FIELDS.map(([,label])=>label.toUpperCase()));
  for(const row of sorted)orders.addRow(ORDER_FIELDS.map(([field])=>field==='quantidade'?Number(row[field]):String(row[field]??'')));
  formatSheet(orders,[25,20,30,13,18,14,15,23]);
  for(const col of [1,2,3,4,5,6,8])orders.getColumn(col).numFmt='@';
  orders.getColumn(7).numFmt='0';
  let previous='';
  sorted.forEach((row,index)=>{const group=`${row.categoria}/${row.tamanho}`;if(index&&group!==previous)orders.getRow(index+2).eachCell(cell=>{cell.border={...cell.border,top:{style:'thin',color:{argb:'FFBBA77D'}}};});previous=group;});
  const totals=workbook.addWorksheet('Resumo de produção');
  totals.addRow(['MODELAGEM','TAMANHO','MODELO','COR','PEÇA / KIT','QUANTIDADE','LINHAS']);
  summary.groups.forEach(group=>totals.addRow([group.categoria,group.tamanho,group.modelo,group.cor,group.tipo,group.quantidade,group.linhas]));
  totals.addRow([]);totals.addRow(['TOTAL KITS','','','','Kit',summary.kits]);
  totals.addRow(['TOTAL PEÇAS','','','','Categorias de peças',summary.pieces]);
  totals.addRow(['Kits são contados como kits. A quantidade de peças dentro de um kit não é presumida.']);
  formatSheet(totals,[24,14,26,21,24,16,12]);
  totals.getColumn(2).numFmt='@';
  const byType=workbook.addWorksheet('Totais por peça');
  byType.addRow(['PEÇA / KIT','QUANTIDADE','LINHAS']);
  summary.byType.forEach(type=>byType.addRow([type.tipo,type.quantidade,type.linhas]));
  formatSheet(byType,[26,18,15]);
  const audit=workbook.addWorksheet('Conferência da origem');
  audit.addRow(['CLASSIFICAÇÃO','ABA / ORIGEM','LINHA','CONTEÚDO ORIGINAL','OBSERVAÇÃO']);
  sorted.forEach(row=>audit.addRow(['Pedido',row.source?.sheet||'Edição manual',row.source?.row||'',row.source?.text||'',[
    ...(row.inherited?.length?[`Dados comuns: ${row.inherited.map(key=>ORDER_FIELDS.find(([field])=>field===key)?.[1]||key).join(', ')}`]:[]),...(row.notes||[]),
  ].join(' · ')]));
  notes.forEach(note=>audit.addRow(['Observação',note.sheet,note.row,note.text,note.reason]));
  formatSheet(audit,[18,25,10,90,65]);
  return workbook.xlsx.writeBuffer();
}

let excelPromise;
export function loadExcelLibrary() {
  if(globalThis.ExcelJS)return Promise.resolve(globalThis.ExcelJS);
  excelPromise ||= new Promise((resolve,reject)=>{
    const script=document.createElement('script');script.src='/vendor/exceljs/exceljs.min.js';
    script.onload=()=>globalThis.ExcelJS?resolve(globalThis.ExcelJS):reject(new Error('Não foi possível iniciar a leitura de planilhas.'));
    script.onerror=()=>reject(new Error('Não foi possível carregar o leitor de planilhas. Verifique a conexão e tente de novo.'));
    document.head.append(script);
  }).catch(error=>{excelPromise=null;throw error;});
  return excelPromise;
}
