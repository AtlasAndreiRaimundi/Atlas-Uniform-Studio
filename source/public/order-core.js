export const ORDER_FIELDS = Object.freeze([
  ['modelo','Modelo'],['cor','Cor'],['nome','Nome'],['numero','Número'],
  ['categoria','Modelagem'],['tamanho','Tamanho'],['quantidade','Quantidade'],['tipo','Peça / kit'],
]);
export const JACKET_KIT='Kit - Jaqueta + Calça';
const KIT_COMPONENTS=Object.freeze({Kit:Object.freeze(['Camiseta','Calção']),[JACKET_KIT]:Object.freeze(['Jaqueta','Calça'])});
export function kitComponents(product){
  if(Object.hasOwn(KIT_COMPONENTS,product))return KIT_COMPONENTS[product];
  if(typeof product!=='string'||product.length>200||!/^kit\s*[-·:]\s*/i.test(product))return null;
  const body=product.replace(/^kit\s*[-·:]\s*/i,'');let parts;try{parts=body.startsWith('[')?JSON.parse(body):body.split(/\s+\+\s+/);}catch{return null;}
  return Array.isArray(parts)&&parts.length===2&&parts.every(part=>typeof part==='string'&&part.trim()&&part.trim().length<=80)?parts.map(part=>part.trim()):null;
}
export const kitLabel=types=>types.join('|')==='Camiseta|Calção'?'Kit':types.join('|')==='Jaqueta|Calça'?JACKET_KIT:'Kit - '+(types.some(type=>type.includes(' + ')||type.startsWith('['))?JSON.stringify(types):types.join(' + '));
export const validProductType=value=>typeof value==='string'&&Boolean(value.trim())&&value.length<=200&&(!/^kit\s*[-·:]/i.test(value)||Boolean(kitComponents(value)));
export const isBottomProduct=value=>['calca','calcao','bermuda','legging'].includes(normalizeKey(value));
export const PIECE_TYPES=Object.freeze(['Kit',JACKET_KIT,'Camiseta','Polo','Jaqueta','Calça','Colete','Regata','Calção']);
export const ORDER_LIMITS = Object.freeze({ bytes: 10 * 1024 * 1024, rows: 5000, columns: 80, text: 1000000 });
export const normalizeKey = value => String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[º°]/g,'').replace(/[^a-z0-9]+/g,' ').trim();
const aliases = {
  modelo:['modelo','uniforme','descricao','item'], cor:['cor','cores','color'],
  nome:['nome','nome completo','atleta','jogador','jogadora','nome do atleta','personalizacao'],
  numero:['numero','num','n','no','numero camisa','numero da camisa','n camisa'],
  categoria:['categoria','modelagem','grade','publico','adulto infantil baby look'],
  tamanho:['tamanho','tam','size','tamanhos'], quantidade:['quantidade','qtd','qtde','qt','qnt','quant','unidades'],
  tipo:['tipo','kit','kit ou peca','kit ou peca individual','peca kit','peca ou kit','peca','pecas','produto','categoria da peca','tipo de peca','tipo de produto','composicao','tipo de pedido'],
};
export function headerField(value) {
  const key=normalizeKey(value);
  return Object.keys(aliases).find(field=>aliases[field].includes(key)) || '';
}
export function categoryValue(value) {
  const key=normalizeKey(value);
  if(/\b(baby ?look|baby|bl)\b/.test(key))return 'Baby look';
  if(/\b(infantil|infanto juvenil|juvenil|kids|inf)\b/.test(key))return 'Infantil';
  if(/\b(adulto|adulta|adult|ad)\b/.test(key))return 'Adulto';
  return '';
}
export function typeValue(value) {
  const key=normalizeKey(value);
  if(/^(?:(?:kit|kits|conjunto) )?(?:camisetas?|camisas?) (?:e )?(?:calcao|calcoes|shorts?)$/.test(key))return 'Kit';
  if(/^(?:(?:kit|kits|conjunto) )?jaquetas? (?:e )?calcas?$/.test(key))return JACKET_KIT;
  const parts=kitComponents(value);if(parts)return kitLabel(parts);
  const labels={Kit:['kit','kits','conjunto','completo','kit completo','uniforme completo'],Camiseta:['camiseta','camisetas','camisa','camisas'],Polo:['polo','polos','camisa polo','camisas polo'],Jaqueta:['jaqueta','jaquetas'],Calça:['calca','calcas'],Colete:['colete','coletes'],Regata:['regata','regatas'],Calção:['calcao','calcoes']};
  for(const [label,variants] of Object.entries(labels))if(variants.includes(key))return label;
  return '';
}
const sizePattern=/^(?:PP|P|M|G|GG|GGG|GGGG|XG|XGG|XXG|XXXG|X{1,4}L|XS|S|L|XL|G[1-9]|[2-9]G|U|UNICO|ESPECIAL|\d{1,2})$/i;
export function quantityValue(value){
  const raw=String(value??'').replace(/\s*(?:kits?|pe[cç]as?|camisetas?|camisas?(?:\s+polo)?|polos?|jaquetas?|cal[cç]as?|coletes?|regatas?|cal[cç][aã]o|cal[cç][oõ]es|unid\.?|unidades?|und\.?)$/i,'').trim();
  return /^\d+(?:,0+|\.0{1,2})?$/.test(raw)?Number(raw.replace(',','.')):null;
}
export function sizeValue(value) {
  const original=String(value??'').trim(),category=categoryValue(original);
  let size=original.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase()
    .replace(/\b(?:BABY\s*LOOK|BABY|BL|INFANTO[ -]JUVENIL|INFANTIL|JUVENIL|KIDS|INF|ADULTO|ADULTA|ADULT|AD)\b/g,'')
    .replace(/\b(?:TAMANHO|TAM|ANOS|ANO)\b/g,'').replace(/^[\s:/.\-]+|[\s:/.\-]+$/g,'').trim();
  if(size==='ÚNICO'||size==='UNICO'||size==='U')size='ÚNICO';
  return {size,category,known:!size||sizePattern.test(size.normalize('NFD').replace(/[\u0300-\u036f]/g,''))};
}
export function normalizeOrder(input={},defaults={},source={}) {
  const fields={},inherited=[];
  for(const [key] of ORDER_FIELDS){const supplied=String(input[key]??'').trim(),fallback=String(defaults[key]??'').trim();fields[key]=supplied||fallback;if(!supplied&&fallback)inherited.push(key);}
  const parsed=sizeValue(fields.tamanho),explicitCategory=categoryValue(input.categoria),fallbackCategory=categoryValue(defaults.categoria);
  const notes=[];
  if(explicitCategory&&parsed.category&&explicitCategory!==parsed.category)notes.push('A modelagem da coluna difere da modelagem escrita no tamanho.');
  fields.categoria=explicitCategory||parsed.category||(!String(input.categoria??'').trim()?fallbackCategory:'');
  if(parsed.category&&!explicitCategory){const inheritedCategory=inherited.indexOf('categoria');if(inheritedCategory>=0)inherited.splice(inheritedCategory,1);}
  fields.tamanho=parsed.size;
  if(!parsed.known)notes.push('Confira o tamanho: ele não corresponde às grades mais comuns.');
  const rawType=fields.tipo;fields.tipo=typeValue(rawType);
  if(rawType&&!fields.tipo)notes.push(`Tipo não reconhecido: ${rawType}.`);
  fields.quantidade=quantityValue(fields.quantidade);
  fields.numero=fields.numero.replace(/^(?:n[º°o.]?|numero|número)\s*[:#-]?\s*/i,'');
  return {...fields,source,inherited,notes};
}
export function orderProblems(row) {
  const errors=[];
  for(const [field,label] of ORDER_FIELDS)if(!['nome','numero','quantidade'].includes(field)&&!String(row[field]??'').trim())errors.push(`${label} não informado`);
  if(!['Adulto','Baby look','Infantil'].includes(row.categoria)&&row.categoria)errors.push('Modelagem inválida');
  if(!PIECE_TYPES.includes(row.tipo)&&row.tipo)errors.push('Escolha Kit ou uma categoria de peça');
  if(!Number.isInteger(Number(row.quantidade))||Number(row.quantidade)<1||Number(row.quantidade)>99999)errors.push('Quantidade deve ser um inteiro de 1 a 99999');
  if(row.numero&&!/^\d{1,4}$/.test(row.numero))errors.push('Número deve ter até quatro dígitos; use vazio para sem número');
  if(/[/,;]|\bOU\b/i.test(row.tamanho||''))errors.push('Tamanho deve ter um único valor');
  if((row.notes||[]).some(note=>note.startsWith('A modelagem')))errors.push('Confira o conflito de modelagem na origem');
  return errors;
}
const collator=new Intl.Collator('pt-BR',{numeric:true,sensitivity:'base'});
const grades=['PP','P','M','G','GG','GGG','GGGG','XG','XGG','XXG','XXXG','G1','G2','G3','G4','G5','G6','G7','G8','G9','ÚNICO','ESPECIAL'];
function sizeRank(size){if(/^\d+$/.test(size))return Number(size);const index=grades.indexOf(size);return index<0?1000:100+index;}
export function sortOrders(rows) {
  const rank={'Adulto':0,'Baby look':1,'Infantil':2};
  return [...rows].sort((a,b)=>(rank[a.categoria]??9)-(rank[b.categoria]??9)||sizeRank(a.tamanho)-sizeRank(b.tamanho)||collator.compare(a.tamanho,b.tamanho)||collator.compare(a.modelo,b.modelo)||collator.compare(a.cor,b.cor)||collator.compare(a.nome,b.nome)||collator.compare(a.numero,b.numero));
}
export function summarizeOrders(rows) {
  const groups=new Map(),types=new Map();let kits=0,pieces=0,unknown=0;
  for(const row of sortOrders(rows)){
    const quantity=Number.isInteger(Number(row.quantidade))&&Number(row.quantidade)>0?Number(row.quantidade):0;
    if(kitComponents(row.tipo))kits+=quantity;else if(PIECE_TYPES.includes(row.tipo))pieces+=quantity;else unknown+=quantity;
    if(PIECE_TYPES.includes(row.tipo)){const type=types.get(row.tipo)||{tipo:row.tipo,quantidade:0,linhas:0};type.quantidade+=quantity;type.linhas++;types.set(row.tipo,type);}
    const key=JSON.stringify([row.categoria,row.tamanho,normalizeKey(row.modelo),normalizeKey(row.cor),row.tipo]);
    const group=groups.get(key)||{categoria:row.categoria,tamanho:row.tamanho,modelo:row.modelo,cor:row.cor,tipo:row.tipo,quantidade:0,linhas:0};
    group.quantidade+=quantity;group.linhas++;groups.set(key,group);
  }
  return {groups:[...groups.values()],byType:PIECE_TYPES.filter(type=>types.has(type)).map(type=>types.get(type)),kits,pieces,unknown,rows:rows.length,invalid:rows.filter(row=>orderProblems(row).length).length};
}
export function duplicateIds(rows) {
  const seen=new Map(),duplicates=new Set();
  for(const row of rows){const key=JSON.stringify(ORDER_FIELDS.map(([field])=>normalizeKey(row[field])));if(seen.has(key)){duplicates.add(row.id);duplicates.add(seen.get(key));}else seen.set(key,row.id);}
  return duplicates;
}
export function detectHeader(rows) {
  let best={row:-1,mapping:{},score:0};
  for(let i=0;i<Math.min(rows.length,30);i++){
    const mapping={};rows[i].forEach((cell,column)=>{const field=headerField(cell);if(field&&mapping[field]===undefined)mapping[field]=column;});
    const score=Object.keys(mapping).length;
    const populated=rows[i].filter(cell=>String(cell??'').trim()).length;
    if(score>=2&&score>=populated*.6&&score>best.score)best={row:i,mapping,score};
  }
  return best;
}
export function parseDelimited(text,delimiter) {
  text=String(text).replace(/^\uFEFF/,'');
  if(text.length>ORDER_LIMITS.text)throw new Error('O texto excede 1 milhão de caracteres. Divida o pedido.');
  const rows=[];let row=[],cell='',quoted=false,line=1,startLine=1;
  const pushRow=()=>{row.push(cell);row.rowNumber=startLine;rows.push(row);row=[];cell='';startLine=line;};
  for(let i=0;i<text.length;i++){
    const char=text[i];
    if(char==='"'){
      if(quoted&&text[i+1]==='"'){cell+='"';i++;}
      else if(quoted)quoted=false;
      else if(!cell.trim())quoted=true;
      else cell+=char;
    }else if(char===delimiter&&!quoted){row.push(cell);cell='';}
    else if((char==='\n'||char==='\r')&&!quoted){if(char==='\r'&&text[i+1]==='\n')i++;line++;pushRow();startLine=line;}
    else{cell+=char;if(char==='\n')line++;}
  }
  if(quoted)throw new Error('Há uma aspa aberta no texto. Feche as aspas do campo antes de organizar.');
  if(cell||row.length)pushRow();
  if(rows.length>ORDER_LIMITS.rows)throw new Error('Importe até 5.000 linhas por vez.');
  if(rows.some(row=>row.length>ORDER_LIMITS.columns))throw new Error('A origem tem mais de 80 colunas. Remova colunas que não fazem parte do pedido.');
  return rows;
}
export function delimiterFor(text) {
  let best='',score=0;
  for(const candidate of ['\t',';','|',',']){
    try{const rows=parseDelimited(text,candidate).filter(row=>row.some(value=>String(value).trim())).slice(0,20);const widths=rows.map(row=>row.length);const multi=widths.filter(width=>width>1).length;const current=multi*10+(Math.max(0,...widths)-1);if(multi&&current>score){best=candidate;score=current;}}catch{/* The selected parser reports precise errors later. */}
  }
  return best;
}
const labelRegex=/(^|[\s;,|])((?:modelo|produto|cor|nome(?: completo)?|atleta|n[º°.]|numero|número|num|modelagem|categoria|tamanho|tam|quantidade|qtd|qtde|tipo))\s*[:=]\s*/giu;
function labelled(line) {
  const matches=[...line.matchAll(labelRegex)],values={};
  matches.forEach((match,i)=>{const field=headerField(match[2]);if(field)values[field]=line.slice(match.index+match[0].length,matches[i+1]?.index??line.length).replace(/[\s;,|]+$/g,'').trim();});
  return values;
}
function contextLine(line) {
  const category=categoryValue(line),parsed=sizeValue(line);
  if(category&&(!parsed.size||parsed.known))return {categoria:category,...(parsed.size?{tamanho:parsed.size}:{})};
  if(/^(?:tamanho|tam)\s*[:.\-]?\s*/i.test(line)){const parsed=sizeValue(line);if(parsed.known&&parsed.size)return {tamanho:parsed.size,...(parsed.category?{categoria:parsed.category}:{})};}
  if(/^(?:PP|P|M|G|GG|GGG|XG|XXG|G[1-9])$/i.test(line))return {tamanho:line.toUpperCase()};
  return null;
}
function applyContext(context,fields){
  const category=categoryValue(fields.categoria)||sizeValue(fields.tamanho).category;
  if(category&&category!==categoryValue(context.categoria)&&!String(fields.tamanho??'').trim())delete context.tamanho;
  Object.assign(context,fields);
}
function positional(line,context) {
  let tokens=line.split(/\s+[–—-]\s+|\s*\|\s*|\t|\s*;\s*|\s+\/\s+/).map(token=>token.trim()).filter(Boolean);
  if(tokens.length===1){
    const trailing=line.match(/^(.+?)\s+(\d{1,4})\s+(PP|P|M|G|GG|GGG|XG|XXG|G[1-9])$/i);
    const leading=line.match(/^(\d{1,4})\s+(.+?)\s+(PP|P|M|G|GG|GGG|XG|XXG|G[1-9])$/i);
    if(trailing)tokens=[trailing[1],trailing[2],trailing[3]];
    else if(leading)tokens=[leading[2],leading[1],leading[3]];
  }
  if(tokens.length<2)return null;
  const values={},names=[],numbers=[];
  for(const token of tokens){
    const quantity=token.match(/^(\d+)\s*(kits?|pe[cç]as?|camisetas?|camisas?(?:\s+polo)?|polos?|jaquetas?|cal[cç]as?|coletes?|regatas?|cal[cç][aã]o|cal[cç][oõ]es|unidades?|unid\.?|und\.?)$/i);
    if(quantity){values.quantidade=quantity[1];const type=typeValue(quantity[2]);if(type)values.tipo=type;continue;}
    const type=typeValue(token);if(type){values.tipo=type;continue;}
    const parsed=sizeValue(token);
    if(parsed.category&&parsed.known){values.categoria=parsed.category;if(parsed.size)values.tamanho=parsed.size;continue;}
    if(parsed.known&&parsed.size&&!/^\d+$/.test(parsed.size)){values.tamanho=parsed.size;continue;}
    if(/^\d{1,2}\s+anos?$/i.test(token)){values.tamanho=token.match(/^\d+/)[0];values.categoria='Infantil';continue;}
    if(/^\d{1,4}$/.test(token)){numbers.push(token);continue;}
    if(/^(?:azul|vermelho|vermelha|branco|branca|preto|preta|verde|amarelo|amarela|laranja|roxo|roxa|rosa|cinza|vinho)$/i.test(token)){values.cor=token;continue;}
    if(/^(?:camiseta|cal[cç][aã]o|cal[cç]a|agasalho|linha|goleiro|goleira|treino)$/i.test(token)){values.modelo=token;continue;}
    names.push(token);
  }
  if(names.length!==1||numbers.length>1)return null;
  if(!values.tamanho&&!context.tamanho)return null;
  values.nome=names[0];if(numbers.length)values.numero=numbers[0];
  return values;
}
export function parseFreeText(text,defaults={},sheet='Texto colado') {
  if(String(text).length>ORDER_LIMITS.text)throw new Error('Cole até 1 milhão de caracteres por vez.');
  const lines=String(text).split(/\r?\n/);if(lines.length>ORDER_LIMITS.rows)throw new Error('Organize até 5.000 linhas por vez.');
  const records=[],unresolved=[],notes=[];let context={...defaults},pending=null;
  const flush=()=>{if(pending){records.push(normalizeOrder(pending.values,pending.context,{sheet,row:pending.row,text:pending.text}));pending=null;}};
  lines.forEach((raw,index)=>{
    const line=raw.replace(/^\s*(?:[-•*]+\s+|\d+[.)]\s+)/,'').trim(),source={sheet,row:index+1,text:raw};
    if(!line){flush();return;}
    const fields=labelled(line),keys=Object.keys(fields);
    if(keys.length){
      if(fields.nome&&pending?.values.nome)flush();
      const person=fields.nome!==undefined||fields.numero!==undefined||fields.quantidade!==undefined;
      if(person||pending){if(!pending)pending={values:{},context:{...context},row:index+1,text:''};Object.assign(pending.values,fields);pending.text+=(pending.text?'\n':'')+raw;}
      else{applyContext(context,fields);notes.push({...source,reason:'Dados comuns às próximas linhas'});}
      return;
    }
    flush();
    const section=contextLine(line);
    if(section){applyContext(context,section);notes.push({...source,reason:'Cabeçalho de modelagem/tamanho'});return;}
    if(/^(?:total|subtotal|observa[cç][aã]o|obs\b|pedido\b|lista\b)/i.test(line)){notes.push({...source,reason:'Título, total ou observação da origem'});return;}
    const values=positional(line,context);
    if(values)records.push(normalizeOrder(values,context,source));else unresolved.push({...source,reason:'Não foi possível separar os campos com segurança. Use rótulos ou colunas.'});
  });flush();return {records,unresolved,notes};
}
export function parseOrderMatrix(sheet,defaults={}) {
  const {rows,name,mapping,headerRow}=sheet;
  const records=[],unresolved=[],notes=[];let context={...defaults};
  rows.forEach((cells,index)=>{
    if(!cells.some(cell=>String(cell??'').trim()))return;
    const source={sheet:name,row:cells.rowNumber||index+1,text:cells.map(value=>String(value??'')).join(' | ')};
    if(index===headerRow){notes.push({...source,reason:'Cabeçalho de colunas'});return;}
    if(index<headerRow){const info=parseFreeText(cells.join('; '),context,name);for(const note of info.notes)notes.push({...source,reason:note.reason});if(info.notes.length){for(const cell of cells){const fields=labelled(String(cell));applyContext(context,{...fields,...(contextLine(String(cell))||{})});}}info.records.forEach(row=>records.push({...row,source}));info.unresolved.forEach(row=>unresolved.push({...source,reason:'Há dados antes do cabeçalho. Confira se são um pedido ou uma observação.'}));return;}
    const nonempty=cells.filter(cell=>String(cell??'').trim());
    if(nonempty.length<=2&&/^(?:total|subtotal)\b/i.test(String(nonempty[0]))){notes.push({...source,reason:'Total da origem; não contado como pedido'});return;}
    if(detectHeader([cells]).score>=2){notes.push({...source,reason:'Cabeçalho repetido'});return;}
    if(nonempty.length===1){const section=contextLine(String(nonempty[0]));const fields=labelled(String(nonempty[0]));if(section||Object.keys(fields).length){applyContext(context,{...section,...fields});notes.push({...source,reason:'Dados comuns às próximas linhas'});return;}}
    const values={};for(const [field] of ORDER_FIELDS){const column=Number(mapping[field]);if(Number.isInteger(column)&&column>=0)values[field]=cells[column]??'';}
    if(!Object.values(values).some(value=>String(value).trim())){unresolved.push({...source,reason:'Esta linha tem dados fora das colunas selecionadas.'});return;}
    records.push(normalizeOrder(values,context,source));
  });return {records,unresolved,notes};
}
export function prepareText(text) {
  const delimiter=delimiterFor(text);
  if(!delimiter)return {free:true,text};
  const rows=parseDelimited(text,delimiter),header=detectHeader(rows);
  if(header.row<0&&String(text).split(/\r?\n/).some(line=>Object.keys(labelled(line)).length>=2))return {free:true,text};
  return {free:false,sheets:[{name:'Texto colado',rows,headerRow:header.row,mapping:header.mapping}]};
}
