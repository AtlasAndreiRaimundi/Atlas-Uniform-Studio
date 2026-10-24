import {ORDER_LIMITS, PIECE_TYPES, JACKET_KIT, kitComponents, validProductType, isBottomProduct, normalizeKey, quantityValue, typeValue, delimiterFor, parseDelimited, parseFreeText} from './order-core.js?v=3';

export {ORDER_LIMITS, PIECE_TYPES};
export const LIST_FIELDS=Object.freeze([
  ['grupo','Tipo'],['nome','Nome'],['numero','Número'],['tamanhoCamiseta','Tam. Camiseta'],['tamanhoCalcao','Tam. Calção'],['quantidade','Quantidade'],['adicional','Adicional'],
]);
export const LIST_TEMPLATE_ID='atlas.order-list';
export const LIST_TEMPLATE_VERSION=2;
export function listFields(rows=[]){
  const products=[...new Set(rows.map(row=>row.produto).filter(Boolean))],parts=products.length===1?kitComponents(products[0]):null;
  if(parts&&products[0]!=='Kit'&&products[0]!==JACKET_KIT)return LIST_FIELDS.map(([key,label])=>[key,key==='tamanhoCamiseta'?'Tam. Peça 1 · '+parts[0]:key==='tamanhoCalcao'?'Tam. Peça 2 · '+parts[1]:label]);
  if(products.length>1&&products.some(product=>!PIECE_TYPES.includes(product)))return LIST_FIELDS.map(([key,label])=>[key,key==='tamanhoCamiseta'?'Tam. Peça 1':key==='tamanhoCalcao'?'Tam. Peça 2':label]);
  if(products.length===1&&!parts&&!['Camiseta','Calção','Polo','Jaqueta','Calça','Colete','Regata'].includes(products[0]))return LIST_FIELDS.map(([key,label])=>[key,key===(bottom(products[0])?'tamanhoCalcao':'tamanhoCamiseta')?'Tam. Peça '+(bottom(products[0])?'2':'1')+' · '+products[0]:label]);
  if(!rows.some(row=>row.produto===JACKET_KIT))return LIST_FIELDS;
  const mixed=rows.some(row=>row.produto!==JACKET_KIT);
  return LIST_FIELDS.map(([key,label])=>[key,key==='tamanhoCamiseta'?(mixed?'Tam. Camiseta / Jaqueta':'Tam. Jaqueta'):key==='tamanhoCalcao'?(mixed?'Tam. Calção / Calça':'Tam. Calça'):label]);
}
export const GROUP_TYPES=Object.freeze(['1 - Linha','2 - Goleiro','3 - Torcida','4 - Comissão Téc.','5 - Staff','6 - Outro']);
export const LIST_SIZES=Object.freeze(['PP','P','M','G','GG','EG','EXG','4G','5G','6G','7G','BLPP','BLP','BLM','BLG','BLGG','BLEG','BLEXG','TAM01','TAM02','TAM04','TAM06','TAM08','TAM10','TAM12','TAM14','TAM16','ESP1','ESP2','ESP3','ESP4']);
const collator=new Intl.Collator('pt-BR',{numeric:true,sensitivity:'base'});
const bottom=isBottomProduct;
export function groupValue(value) {
  const key=normalizeKey(value).replace(/^[1-6]\s+/, '');
  const names=['linha','goleiro','torcida','comissao tec','staff','outro'];
  const index=names.findIndex((name,i)=>name===key||(i===1&&key==='goleira')||(i===3&&['comissao tecnica','comissao'].includes(key)));
  return index>=0?GROUP_TYPES[index]:'';
}
export function listSize(value,category='') {
  let raw=String(value??'').trim().normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase();
  const key=normalizeKey(raw),cat=normalizeKey(category);
  if(!raw)return '';
  const baby=/^(?:BL|BABY\s*LOOK|BABY)[\s.:-]*/.test(raw)||/baby|^bl$/.test(cat);
  const infant=/^(?:TAM\s*\d|INFANTIL|INFANTO|JUVENIL|KIDS)/.test(raw)||/infantil|juvenil|kids/.test(cat);
  raw=raw.replace(/^(?:BABY\s*LOOK|BABY|BL|INFANTO[ -]JUVENIL|INFANTIL|JUVENIL|KIDS|ADULTO|ADULTA|MASCULINO|MASCULINA)[\s.:-]*/,'')
    .replace(/^(?:TAMANHO|TAM)[\s.:-]*/,'').replace(/\s+ANOS?$/,'').trim();
  if(baby)return `BL${raw.replace(/\s+/g,'')}`;
  if(infant&&/^\d{1,2}$/.test(raw))return `TAM${raw.padStart(2,'0')}`;
  if(/^\d{1,2}$/.test(raw)&&!key.startsWith('adult'))return `TAM${raw.padStart(2,'0')}`;
  return raw.replace(/\s+/g,'');
}
export function sizeInfo(size) {
  if(/^BL.+/.test(size))return {category:'Baby Look',size:size.slice(2)};
  if(/^TAM\d{2}$/.test(size))return {category:'Infantil',size};
  return {category:'Masculina',size};
}
function knownSize(size){return LIST_SIZES.includes(size)||/^(?:GGG|GGGG|XG|XGG|XXG|XXXG|G[1-9]|[2-9]G|X{1,4}L|XS|S|L|U|UNICO|ESPECIAL|ESP[1-9]|TAM\d{2}|BL(?:GGG|XG|G[1-9]))$/.test(size);}
export function normalizeListRow(input={},defaults={},source=input.source||{}) {
  const text=key=>String(input[key]??'').trim()||String(defaults[key]??'').trim();
  const explicitProduct=String(input.produto??input.tipo??'').trim();
  let produto=explicitProduct?(typeValue(explicitProduct)||explicitProduct):(typeValue(defaults.produto)||String(defaults.produto||'').trim()||'Camiseta');
  let top=text('tamanhoCamiseta'),shorts=text('tamanhoCalcao');
  if(input.tamanho&&!top&&!shorts){if(bottom(produto))shorts=input.tamanho;else top=input.tamanho;}
  top=listSize(top,input.categoria);shorts=listSize(shorts,input.categoriaCalcao);
  // Two filled garment sizes define the shirt/shorts kit, including older shirt-only model metadata.
  if(top&&shorts&&['Camiseta','Calção','Kit'].includes(produto))produto='Kit';
  if(!explicitProduct&&!defaults.produto&&top&&shorts)produto='Kit';
  // A generic template has no product column: infer only from the two explicit size columns.
  if(!input.produto&&!input.tipo&&defaults.inferProduct){
    const kit=kitComponents(produto);
    if(top&&shorts)produto=kit?produto:'Kit';
    else if(top)produto=kit?kit[0]:bottom(produto)?'Camiseta':produto;
    else if(shorts)produto=kit?kit[1]:bottom(produto)?produto:'Calção';
  }
  const rawGroup=String(input.grupo??'').trim();
  return {grupo:rawGroup?(groupValue(rawGroup)||rawGroup):(groupValue(defaults.grupo)||GROUP_TYPES[0]),
    // Personalization belongs to this row. A blank never inherits another name or number.
    nome:String(input.nome??'').trim(),numero:String(input.numero??'').trim().replace(/^(?:n[º°o.]?|numero|número)\s*[:#-]?\s*/i,''),adicional:String(input.adicional??'').trim(),
    tamanhoCamiseta:top,tamanhoCalcao:shorts,quantidade:quantityValue(String(input.quantidade??'').trim()||defaults.quantidade||1),produto,
    modelo:text('modelo'),cor:text('cor'),source,notes:[...(input.notes||[])]};
}
export function listProblems(row) {
  const errors=[];
  if(!GROUP_TYPES.includes(row.grupo))errors.push('Tipo: escolha Linha, Goleiro, Torcida, Comissão, Staff ou Outro.');
  if(!validProductType(row.produto))errors.push('Escolha ou digite a peça ou as duas peças do kit.');
  if(!Number.isInteger(row.quantidade)||row.quantidade<1||row.quantidade>99999)errors.push('Quantidade: use um inteiro de 1 a 99999.');
  if(row.numero&&!/^\d{1,4}$/.test(row.numero))errors.push('Número: use até quatro dígitos ou deixe vazio.');
  if(String(row.adicional??'').length>200)errors.push('Adicional: use até 200 caracteres ou deixe vazio.');
  const kit=kitComponents(row.produto);
  if(kit){
    if(!row.tamanhoCamiseta)errors.push(`Falta o tamanho da ${kit[0].toLowerCase()} do kit.`);
    if(!row.tamanhoCalcao)errors.push(`Falta o tamanho ${kit[1]==='Calção'?'do calção':'da '+kit[1].toLowerCase()} do kit.`);
  }else if(bottom(row.produto)){
    if(!row.tamanhoCalcao)errors.push(`Falta o tamanho de ${row.produto.toLowerCase()}.`);
    if(row.tamanhoCamiseta)errors.push('Há dois tamanhos: selecione Kit ou remova o tamanho da camiseta.');
  }else{
    if(!row.tamanhoCamiseta)errors.push(`Falta o tamanho de ${String(row.produto).toLowerCase()}.`);
    if(row.tamanhoCalcao)errors.push('Há dois tamanhos: selecione Kit ou remova o tamanho do calção.');
  }
  for(const [key,label] of listFields([row]).filter(([key])=>key==='tamanhoCamiseta'||key==='tamanhoCalcao'))if(row[key]&&!knownSize(row[key]))errors.push(`${label}: confira o tamanho “${row[key]}”.`);
  if(row.notes?.some(note=>note.startsWith('A modelagem')))errors.push('A modelagem e o tamanho da origem são diferentes; confira a linha.');
  if(row.notes?.some(note=>note.startsWith('Tipo não reconhecido')))errors.push('Confira a categoria de peça informada no texto de origem.');
  return errors;
}
const categories=['Masculina','Baby Look','Infantil'];
const adultSizes=['PP','P','M','G','GG','EG','GGG','EXG','GGGG','XG','XGG','XXG','XXXG','4G','5G','6G','7G'];
function sizeRank(value){const info=sizeInfo(value),index=adultSizes.indexOf(info.size);return categories.indexOf(info.category)*1000+(/^TAM\d+$/.test(info.size)?Number(info.size.slice(3)):index<0?100:index);}
export function sortListRows(rows){return [...rows].sort((a,b)=>sizeRank(a.tamanhoCamiseta||a.tamanhoCalcao)-sizeRank(b.tamanhoCamiseta||b.tamanhoCalcao)||collator.compare(a.tamanhoCamiseta||a.tamanhoCalcao,b.tamanhoCamiseta||b.tamanhoCalcao)||collator.compare(a.modelo||a.grupo,b.modelo||b.grupo)||collator.compare(a.cor,b.cor)||collator.compare(a.nome,b.nome)||collator.compare(a.numero,b.numero));}
export function listPieces(row) {
  if(listProblems(row).length)return [];
  const kit=kitComponents(row.produto);
  if(kit)return [{product:kit[0],size:row.tamanhoCamiseta},{product:kit[1],size:row.tamanhoCalcao}];
  return [{product:row.produto,size:bottom(row.produto)?row.tamanhoCalcao:row.tamanhoCamiseta}];
}
export function listSummary(rows) {
  const products=new Map();let pieces=0,kits=0,invalid=0,units=0;
  for(const row of rows){
    if(listProblems(row).length){invalid++;continue;}
    units+=row.quantidade;if(kitComponents(row.produto))kits+=row.quantidade;
    for(const item of listPieces(row)){
      const info=sizeInfo(item.size);pieces+=row.quantidade;
      if(!products.has(item.product))products.set(item.product,new Map());
      const variants=products.get(item.product),variant=JSON.stringify([normalizeKey(row.modelo),normalizeKey(row.cor),normalizeKey(row.grupo)]);
      if(!variants.has(variant))variants.set(variant,{modelo:row.modelo,cor:row.cor,grupo:row.grupo,categories:new Map(),quantity:0});
      const target=variants.get(variant);target.quantity+=row.quantidade;
      if(!target.categories.has(info.category))target.categories.set(info.category,new Map());
      const sizes=target.categories.get(info.category);sizes.set(info.size,(sizes.get(info.size)||0)+row.quantidade);
    }
  }
  const sections=[];
  for(const product of [...new Set([...PIECE_TYPES.filter(p=>!kitComponents(p)),...products.keys()])])if(products.has(product)){
    for(const variant of [...products.get(product).values()].sort((a,b)=>collator.compare(a.modelo,b.modelo)||collator.compare(a.cor,b.cor))){
      const lines=[product.toLocaleUpperCase('pt-BR')];
      if(variant.grupo&&new Set([...products.get(product).values()].map(v=>v.grupo)).size>1)lines.push(variant.grupo);
      if(variant.modelo||variant.cor)lines.push([variant.modelo,variant.cor].filter(Boolean).join(' · '));
      for(const category of categories)if(variant.categories.has(category)){
        lines.push(category);
        const sizes=[...variant.categories.get(category)].sort(([a],[b])=>sizeRank(category==='Baby Look'?`BL${a}`:a)-sizeRank(category==='Baby Look'?`BL${b}`:b)||collator.compare(a,b));
        lines.push(...sizes.map(([size,quantity])=>`${size}=${quantity}`),'');
      }
      sections.push({product,grupo:variant.grupo,modelo:variant.modelo,cor:variant.cor,quantity:variant.quantity,text:lines.join('\n').trimEnd()});
    }
  }
  return {sections,text:sections.map(s=>s.text).join('\n\n'),pieces,kits,units,invalid};
}

const fieldAliases={
  adicional:['adicional','adicionais','informacao adicional','informacoes adicionais','cargo','tipo sanguineo'],
  grupo:['tipo','tipo de uniforme','funcao','grupo'],nome:['nome','nome completo','atleta','jogador','jogadora','personalizacao'],
  numero:['numero','num','n','no','numero camisa','numero da camisa'],quantidade:['quantidade','qtd','qtde','qt','quant','quantidades'],
  tamanhoCamiseta:['tam camiseta','tamanho camiseta','tam camisa','tamanho camisa','camiseta','camisa','tam polo','tam jaqueta','tamanho jaqueta','tam colete','tam regata','tam camiseta jaqueta'],
  tamanhoCalcao:['tam calcao','tamanho calcao','calcao','shorts','tam calca','tamanho calca','tam shorts','tam calcao calca'],
  tamanho:['tamanho','tam','size'],categoria:['categoria','modelagem','grade','publico'],
  produto:['peca kit','peca ou kit','produto','peca','tipo de peca','kit ou peca'],modelo:['modelo','uniforme','descricao'],cor:['cor','cores','color'],
};
export const IMPORT_FIELDS=Object.freeze([...LIST_FIELDS,['produto','Peça / kit'],['modelo','Modelo'],['cor','Cor'],['tamanho','Tamanho único (lista antiga)'],['categoria','Modelagem (lista antiga)']]);
export function detectListHeader(rows){
  let best={row:-1,mapping:{},score:0};
  rows.slice(0,30).forEach((cells,index)=>{
    const mapping={};cells.forEach((cell,column)=>{const key=normalizeKey(cell),field=/^tam peca 1\b/.test(key)?'tamanhoCamiseta':/^tam peca 2\b/.test(key)?'tamanhoCalcao':Object.keys(fieldAliases).find(name=>fieldAliases[name].includes(key));if(field&&mapping[field]===undefined)mapping[field]=column;});
    const score=Object.keys(mapping).length,populated=cells.filter(cell=>String(cell??'').trim()).length;
    if(score>=2&&score>=populated*.5&&score>best.score)best={row:index,mapping,score};
  });return best;
}
export function prepareListText(text){
  if(String(text).length>ORDER_LIMITS.text)throw new Error('Cole até 1 milhão de caracteres por vez.');
  const delimiter=delimiterFor(text);
  if(!delimiter)return {free:true,text};
  const rows=parseDelimited(text,delimiter),header=detectListHeader(rows);
  if(header.row<0)return {free:true,text};
  return {free:false,text,sheets:[{name:'Texto colado',rows,headerRow:header.row,mapping:header.mapping,enabled:true}]};
}
export function prepareListSheets(sheets){
  return sheets.map(sheet=>{const header=detectListHeader(sheet.rows);
    if(sheet.template&&LIST_FIELDS.some(([key])=>(sheet.template.version>=2||key!=='adicional')&&header.mapping[key]===undefined))throw new Error('Mantenha os títulos da aba Pedido. Baixe um novo modelo para restaurar as colunas.');
    return {...sheet,headerRow:header.row,mapping:header.mapping};});
}
export function needsListMapping(source){
  if(!source||source.free)return false;
  const sheets=(source.sheets||[]).filter(sheet=>sheet.enabled!==false);
  if(!sheets.length)return true;
  return sheets.some(sheet=>{
    const mapping=sheet.mapping||{},columns=new Set(Object.values(mapping));
    if(sheet.headerRow<0||!['tamanhoCamiseta','tamanhoCalcao','tamanho'].some(key=>Number.isInteger(mapping[key])&&mapping[key]>=0))return true;
    return (sheet.rows[sheet.headerRow]||[]).some((label,column)=>String(label??'').trim()&&!columns.has(column));
  });
}
export function parseListMatrix(sheet,defaults={}){
  const records=[],unresolved=[],notes=[];
  if(sheet.template)defaults={...defaults,...sheet.template.defaults,grupo:GROUP_TYPES[0],quantidade:1};
  const topHeader=normalizeKey(sheet.rows[sheet.headerRow]?.[sheet.mapping.tamanhoCamiseta]);
  if(!sheet.template&&(topHeader==='tam jaqueta'||topHeader==='tamanho jaqueta'))defaults={...defaults,produto:JACKET_KIT};
  sheet.rows.forEach((cells,index)=>{
    const source={sheet:sheet.name,row:cells.rowNumber||index+1,text:cells.map(v=>String(v??'')).join(' | ')};
    const filled=cells.filter(c=>String(c??'').trim());if(!filled.length)return;
    if(index===sheet.headerRow||detectListHeader([cells]).row===0){notes.push({...source,reason:'Cabeçalho'});return;}
    if(/^(?:total|subtotal|resumo|obs\b|observa)/i.test(String(filled[0]))&&filled.length<=2){notes.push({...source,reason:'Total ou observação'});return;}
    if(index<sheet.headerRow){unresolved.push({...source,reason:'Dados antes do cabeçalho: confirme se são um título ou um item.'});return;}
    const values={};for(const [key] of IMPORT_FIELDS){const column=sheet.mapping[key];if(Number.isInteger(column)&&column>=0)values[key]=cells[column]??'';}
    // In older exports Tipo meant product. In the supplied template it means Linha/Goleiro/etc.
    if(typeValue(values.grupo)){values.produto=values.grupo;delete values.grupo;}
    if(!Object.values(values).some(value=>String(value??'').trim())){unresolved.push({...source,reason:'Dados fora das colunas reconhecidas.'});return;}
    const row=normalizeListRow(values,{...defaults,inferProduct:!sheet.template&&!Object.hasOwn(values,'tamanho')},source);
    if(!values.grupo&&!Object.hasOwn(values,'grupo')&&groupValue(values.modelo))row.grupo=groupValue(values.modelo);
    records.push(row);
  });return {records,unresolved,notes};
}
export function parseListFreeText(text,defaults={}){
  if(String(text).length>ORDER_LIMITS.text)throw new Error('Cole até 1 milhão de caracteres por vez.');
  if(String(text).split(/\r?\n/).length>ORDER_LIMITS.rows)throw new Error('Use até 5.000 linhas por vez.');
  const labels=/(^|[\s;,|])((?:tam(?:anho)?\.?\s*(?:camiseta|camisa|jaqueta|cal[cç][aã]o|cal[cç]a)|adicional|cargo|tipo sanguíneo|tipo sanguineo|nome(?: completo)?|n[º°.]|numero|número|num|tipo|produto|modelo|cor|quantidade|qtd|qtde|tamanho|tam|modelagem))\s*[:=]\s*/giu;
  const lines=String(text).split(/\r?\n/);
  if(lines.some(line=>[...line.matchAll(labels)].some(m=>/tam.*(?:camiseta|camisa|jaqueta|cal[cç])/.test(normalizeKey(m[2]))))){
    const records=[],unresolved=[],notes=[];let context={...defaults,...(lines.some(line=>[...line.matchAll(labels)].some(m=>normalizeKey(m[2]).endsWith('jaqueta')))?{produto:JACKET_KIT}:{})},pending=null;
    const flush=()=>{if(pending){records.push(normalizeListRow(pending.values,context,pending.source));pending=null;}};
    lines.forEach((raw,index)=>{
      const line=raw.trim(),source={sheet:'Texto colado',row:index+1,text:raw};if(!line){flush();return;}
      const matches=[...line.matchAll(labels)],values={};
      matches.forEach((match,i)=>{const key=normalizeKey(match[2]),field=Object.keys(fieldAliases).find(f=>fieldAliases[f].includes(key))||(key==='n'?'numero':'');if(field)values[field]=line.slice(match.index+match[0].length,matches[i+1]?.index??line.length).replace(/[\s;,|]+$/g,'').trim();});
      if(typeValue(values.grupo)){values.produto=values.grupo;delete values.grupo;}
      if(Object.keys(values).length){
        if(values.nome!==undefined&&pending?.values.nome!==undefined)flush();
        if(pending||['nome','numero','adicional','quantidade'].some(key=>Object.hasOwn(values,key))){if(!pending)pending={values:{},source:{...source,text:''}};Object.assign(pending.values,values);pending.source.text+=(pending.source.text?'\n':'')+raw;}
        else{Object.assign(context,values);notes.push({...source,reason:'Dados comuns às próximas linhas'});}
      }else{flush();if(/^(?:total|subtotal|obs\b|observa)/i.test(line))notes.push({...source,reason:'Total ou observação'});else unresolved.push({...source,reason:'Use rótulos como Nome:, Número:, Tam. Camiseta: e Tam. Calção:.'});}
    });flush();return {records,unresolved,notes};
  }
  const expanded=String(text).replace(/\bBL(PP|P|M|G|GG|EG|EXG)\b/gi,'Baby look $1').replace(/\bTAM(\d{1,2})\b/gi,'Infantil $1');
  const parsed=parseFreeText(expanded,{quantidade:1,tipo:defaults.produto||'Kit',modelo:defaults.modelo||'',cor:defaults.cor||''});
  return {...parsed,records:parsed.records.map(row=>normalizeListRow({...row,grupo:groupValue(row.modelo)||defaults.grupo,produto:row.tipo||defaults.produto},defaults,{...row.source,text:lines[row.source.row-1]||row.source.text}))};
}
