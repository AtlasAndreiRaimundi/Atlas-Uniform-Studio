import {newRecordId} from './record-id.js';
import {preserveCatalogList} from './catalog-list.js';
import {catalogProblems,attachCatalog,fitOfSize} from './product-catalog.js';
import {normalizeListRow,listProblems,listPieces} from './order-list.js?v=7';
export const SCHEMA=1;
export const TECHNIQUES=['TRANSFER','DTF','BORDADO / APLIQUE','TPU ALTO RELEVO','TERMOCOLANTE','SERIGRAFIA'];
export const EXTRA_APPLICATIONS=['TPU ALTO RELEVO','DTF','TERMOCOLANTE','APLIQUE BORDADO','BORDADO'];
export const PRODUCTS=['Camiseta','Colete','Jaqueta','Polo','Bermuda','Puffer','Agasalho','Calça','Calção','Regata','Corta vento','Top','Legging','Baby look','Camiseta de pesca'];
export const FABRICS=['DRY','ELASTIC','JACQUARD','JACQUARD ELITE','ABSTRAT','MANCHESTER','STRECH'];
export const newId=newRecordId;
export function newProduct(type='Camiseta'){return {id:newId(),type,model:'',fabric:'',fabricColor:'',detailColor:'',print:'TRANSFER',quantity:0,grade:'',extraApplications:[],components:[],images:[],names:[],notes:''};}
export function newPage(type='Camiseta'){return {id:newId(),title:'',label:'',mode:'individual',visualLayout:'stacked',notes:'',products:[newProduct(type)]};}
export const kitTitle=types=>('KIT · '+types.map((type,i)=>type||'Peça '+(i+1)).join(' + ').toLocaleUpperCase('pt-BR')).slice(0,160);
export function newKitPage(composition=false){const types=Array.isArray(composition)?composition:composition?['Jaqueta','Calça']:['Camiseta','Calção'];if(types.length!==2||types.some(type=>typeof type!=='string'||!type.trim()||type.trim().length>80))throw new Error('Escolha ou digite os nomes das duas peças do kit, com até 80 caracteres cada.');const page=newPage();page.products=types.map(type=>newProduct(type.trim()));page.title=kitTitle(types.map(type=>type.trim()));page.mode='conjunto';return page;}
export function newOrder(){return {schema:SCHEMA,title:'Novo pedido',number:'',client:'',contact:'',contactPhone:'',phone:'',registration:'',payment:'',seller:'',artist:'',orderDate:new Date().toLocaleDateString('en-CA',{timeZone:'America/Sao_Paulo'}),dispatchDate:'',deliveryDate:'',carrier:'',type:'PEDIDO NOVO',previousOrder:'',sample:false,controlN:'',controlE:'',techniques:['TRANSFER'],notice:'Estou ciente que, a partir do pedido fechado e enviado para produção, não terá mais como ser alterado. As informações contidas no pedido foram conferidas e são de minha responsabilidade.',notes:'',pages:[newPage()]};}
export function complementDocument(source,{number='',type='COMPLEMENTO',changes='',copyList=false}={}){
 if(typeof number!=='string'||number.trim().length>32||number.trim()&&number.trim().toLocaleLowerCase('pt-BR')===String(source.number||'').trim().toLocaleLowerCase('pt-BR'))throw new Error('Informe um novo número, diferente do pedido original, com até 32 caracteres.');
 if(!['COMPLEMENTO','COMPLEMENTO COM ALTERAÇÕES'].includes(type)||typeof copyList!=='boolean'||typeof changes!=='string'||changes.trim().length>2000)throw new Error('Confira o tipo e as alterações do complemento.');
 if(type==='COMPLEMENTO COM ALTERAÇÕES'&&!changes.trim())throw new Error('Descreva o que muda neste complemento.');
 const copy=structuredClone(source);for(const key of ['workflow','factoryTracking','origin','technicalFiles'])delete copy[key];
 Object.assign(copy,{title:('Complemento · '+source.title).slice(0,100),number:number.trim(),type,previousOrder:source.number||'',complementChanges:changes.trim(),orderDate:newOrder().orderDate,dispatchDate:'',deliveryDate:'',sample:false,controlN:'',controlE:''});
 const ids=new Map();for(const page of copy.pages){page.id=newId();for(const product of page.products){const old=product.id;product.id=newId();ids.set(old,product.id);if(!copyList)Object.assign(product,{quantity:0,grade:'',names:[],namesRaw:'',listMissing:false,listKey:''});}for(const annotation of page.annotations||[]){annotation.id=newId();annotation.productId=ids.get(annotation.productId)||'';}}
 if(copyList&&copy.listSource){delete copy.listSource.id;delete copy.listSource.version;copy.listSource.name=(copy.listSource.name+' · cópia').slice(0,200);copy.listSource.importedAt=new Date().toISOString();}else delete copy.listSource;
 return copy;
}
export function categorySize(raw){
 const s=String(raw||'').trim().toUpperCase().replace(/\s+/g,' ');
 if(/^(?:BL|BABY\s*LOOK)/.test(s))return {category:'BABY LOOK',size:s.replace(/^(?:BL|BABY\s*LOOK)\s*/,'')||'P'};
 if(/^(?:TAM(?:ANHO)?\.?\s*)?\d+$/.test(s))return {category:'INFANTIL',size:'TAM '+s.replace(/\D/g,'')};
 return {category:'CAMISETA',size:s};
}
export function parseGrade(text,product='Camiseta'){
 const groups=[],errors=[];let category=product.toUpperCase(),current=null;
 const group=name=>{let g=groups.find(g=>g.category===name);if(!g){g={category:name,rows:[]};groups.push(g);}return g;};
 String(text||'').split(/\r?\n/).forEach((line,index)=>{
  const s=line.trim();if(!s)return;
  if(s.toUpperCase()===String(product).toUpperCase()){category=s.toUpperCase();current=null;return;}
  const m=s.match(/^(.+?)\s*(?:=|:|\t|;|\s[-–]\s)\s*(\d+)\s*$/);
  if(m){const n=Number(m[2]);if(n>99999){errors.push('Linha '+(index+1)+': quantidade acima de 99.999.');return;}const size=m[1].trim().toUpperCase();if(!size||size.length>30){errors.push('Linha '+(index+1)+': tamanho inválido.');return;}current=group(category);const previous=current.rows.find(r=>r.size===size);if(previous)previous.quantity+=n;else current.rows.push({size,quantity:n});}
  else if(/[=;\t]|\d\s*$/.test(s)){errors.push('Linha '+(index+1)+': use TAMANHO = QUANTIDADE.');}
  else{category=s.replace(/:$/,'').trim().toUpperCase();if(category.length>200)errors.push('Linha '+(index+1)+': categoria muito longa.');current=null;}
 });
 return {groups,total:groups.reduce((sum,g)=>sum+g.rows.reduce((s,r)=>s+r.quantity,0),0),errors};
}
export function namesToGrade(names,type='Camiseta'){
 const groups=new Map();for(const row of names){const c=categorySize(row.size);if(c.category==='CAMISETA')c.category=type.toUpperCase();let g=groups.get(c.category);if(!g){g=new Map();groups.set(c.category,g);}g.set(c.size,(g.get(c.size)||0)+Number(row.quantity||1));}
 return [...groups].map(([name,sizes])=>name+'\n'+[...sizes].map(([s,n])=>s+' = '+n).join('\n')).join('\n\n');
}
export function parseNames(text){
 const rows=[],errors=[];
 String(text||'').split(/\r?\n/).forEach((s,i)=>{
  if(!s.trim())return;const a=s.split(/[;\t]/).map(v=>v.trim());
  if(i===0&&/nome/i.test(a[0])&&/tamanho/i.test(a[2]||''))return;
  if(a.length<3||a.length>5||!a[2]||a[0].length>120||a[1].length>20||a[2].length>30||a[3]&&!/^[1-9]\d{0,4}$/.test(a[3])||(a[4]||'').length>200){errors.push('Linha '+(i+1)+': use Nome;Número;Tamanho;Quantidade;Adicional.');return;}
  rows.push({name:a[0],number:a[1],size:a[2],quantity:Number(a[3]||1),additional:a[4]||''});
 });return {rows,errors};
}
export function validateOrder(order){
 const errors=[...dateProblems(order)];if(!order?.pages?.length)errors.push('Adicione uma página ao pedido.');
 for(const [pi,page]of (order.pages||[]).entries()){
  if(page.visual?.mode==='shared'&&(!page.visual.image||page.products.length>2))errors.push('Imagem única: use uma imagem e até duas peças na página.');
  if(!page.products?.length)errors.push('Página '+(pi+1)+': adicione uma peça.');
  for(const p of page.products||[]){const prefix='Página '+(pi+1)+' · '+(p.type||'Peça')+': ',g=parseGrade(p.grade,p.type);if(!String(p.type||'').trim())errors.push(prefix+'informe o produto.');if(p.namesRaw)errors.push(...parseNames(p.namesRaw).errors.map(x=>prefix+x));
   if(p.listMissing)errors.push(prefix+'esta peça não consta na lista atual. Confira ou desvincule a peça da lista.');
   errors.push(...g.errors.map(x=>prefix+x));if(!Number.isInteger(Number(p.quantity))||p.quantity<1||p.quantity>99999)errors.push(prefix+'quantidade inválida.');
   if(Number(p.quantity)>0&&!g.groups.length)errors.push(prefix+'informe as quantidades por categoria e tamanho.');
   if(g.groups.length&&g.total!==Number(p.quantity))errors.push(prefix+'a grade soma '+g.total+' e a quantidade está em '+p.quantity+'.');
   if(p.names?.length){const sum=p.names.reduce((s,n)=>s+Number(n.quantity),0);if(sum!==Number(p.quantity))errors.push(prefix+'a lista de nomes soma '+sum+' e a quantidade está em '+p.quantity+'.');const expected=parseGrade(namesToGrade(p.names,p.type),p.type);const normalize=grade=>grade.groups.flatMap(g=>g.rows.map(r=>g.category+'|'+r.size+'|'+r.quantity)).sort().join('\n');if(g.groups.length&&normalize(g)!==normalize(expected))errors.push(prefix+'os tamanhos da lista de nomes diferem da grade.');}
  }
 }errors.push(...catalogProblems(order,{release:true,parseGrade}));return [...new Set(errors)];
}
export function importList(rows,title,config={}){
 const order=newOrder();order.title=title||'Pedido importado';order.pages=[];const pages=new Map();
 for(const [rowIndex,input]of rows.entries()){const r=normalizeListRow({...input,produto:input.produto||'Camiseta'},config.catalog?{catalogVersion:3}:{}),parts=[r.modelo||'',r.cor||'',r.grupo||''],group=parts.filter(Boolean).join(' · '),groupKey=JSON.stringify(parts.map(key));let page=pages.get(groupKey);if(!page){page=newPage();page.products=[];page.title=group;page.listGroup=r.grupo||'';page.mode='avulsas';pages.set(groupKey,page);order.pages.push(page);}
  const pieces=listPieces(r);if(!pieces.length)throw new Error('Confira os tipos de peça, os tamanhos e as quantidades da lista.');const repeated=pieces.length===2&&productKey(pieces[0].product)===productKey(pieces[1].product);
  for(const [slot,piece]of pieces.entries()){const {product:type,size}=piece,modern=config.catalog||r.catalogVersion===3,fit=piece.fit||fitOfSize(size)||'MASCULINA',listKey=JSON.stringify([type,...parts,...(modern?['fit-'+fit]:[]),...(repeated?['kit-part-'+slot]:[])].map(key));let p=page.products.find(p=>p.listKey===listKey);if(!p){p=newProduct(type);p.model=r.modelo||'';p.fabricColor=r.cor||'';p.listKey=listKey;if(modern)attachCatalog(p,{designId:page.id,fit});if(r.produto==='Kit')p.kitGroupId=page.id;if(repeated)p.kitSlot=slot;page.products.push(p);}if(r.produto==='Kit')p.kitGroupId=page.id;if(!size)throw new Error('Há uma peça sem tamanho na lista. Confira no organizador.');const athleteId=r.id||'linha-'+rowIndex;p.names.push({name:piece.name??r.nome??'',number:piece.number??String(r.numero??''),additional:piece.additional??r.adicional??'',size,quantity:Number(piece.quantity??r.quantidade??1),...(modern?{athleteId,...(r.produto==='Kit'?{kitId:athleteId}:{}),specialReference:piece.specialReference||'',specialDescription:piece.specialDescription||''}:{})});}
 }
 for(const page of order.pages){if(page.products.length===1)page.mode='individual';for(const p of page.products){p.grade=namesToGrade(p.names,p.type);p.quantity=p.names.reduce((sum,n)=>sum+n.quantity,0);}}
 if(!order.pages.length)throw new Error('Adicione itens na lista antes de gerar o pedido.');return order;
}
const key=value=>String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toLowerCase();
const productKey=value=>key(value).replace(/^camisa polo$/,'polo');
function emptyProduct(p){return !p.quantity&&!p.grade&&!p.model&&!p.fabric&&!p.fabricColor&&!p.detailColor&&!p.notes&&!p.namesRaw&&!p.names?.length&&!p.images?.some(Boolean)&&!p.components?.length&&!p.extraApplications?.length&&!p.projectRef;}
export function applyListToOrder(current,rows,source={}){
 const normalized=rows.map(row=>normalizeListRow(row,current.technicalCatalogVersion?{catalogVersion:3}:{}));
 if(!normalized.length||normalized.length>5000||normalized.some(row=>listProblems(row).length))throw new Error('Corrija os itens da lista antes de aplicá-la ao pedido. Use até 5.000 linhas.');
 const imported=importList(normalized,current.title,{catalog:Boolean(current.technicalCatalogVersion)}),next=structuredClone(current);
 next.pages=next.pages.filter(page=>page.title||page.label||page.notes||page.visual?.image||page.annotations?.length||page.products.length!==1||!emptyProduct(page.products[0]));
 const existing=next.pages.flatMap(page=>page.products.map(product=>({page,product}))),used=new Set(),added=new Map();
 const incoming=imported.pages.flatMap(page=>page.products.map(product=>({page,product})));
 for(const item of incoming){const p=item.product;
  let match=existing.find(entry=>entry.product.listKey===p.listKey&&!used.has(entry.product.id));
  if(!match){
   let candidates=existing.filter(entry=>!used.has(entry.product.id)&&!entry.product.listKey&&productKey(entry.product.type)===productKey(p.type)&&(!entry.product.technical?.fit||!p.technical?.fit||entry.product.technical.fit===p.technical.fit)&&(!entry.product.model||!p.model||key(entry.product.model)===key(p.model))&&(!entry.product.fabricColor||!p.fabricColor||key(entry.product.fabricColor)===key(p.fabricColor))&&(!entry.page.listGroup||key(entry.page.listGroup)===key(item.page.listGroup)));
   const kitPage=candidates[0]?.page;if(p.kitSlot!==undefined&&kitPage?.mode==='conjunto'&&kitPage.products.length===2&&candidates.every(entry=>entry.page===kitPage)&&kitPage.products.every(product=>productKey(product.type)===productKey(p.type)))candidates=candidates.filter(entry=>entry.page.products.indexOf(entry.product)===p.kitSlot);
   if(!candidates.length&&existing.some(entry=>!used.has(entry.product.id)&&!entry.product.listKey&&productKey(entry.product.type)===productKey(p.type)))throw new Error('O modelo, a cor ou a modelagem de '+p.type+' na lista não corresponde à peça do pedido. Confira esses campos antes de importar.');
   if(candidates.length>1||p.kitSlot===undefined&&candidates.length===1&&incoming.filter(other=>productKey(other.product.type)===productKey(p.type)).length>1&&!candidates[0].product.model&&!candidates[0].product.fabricColor&&!candidates[0].page.listGroup)throw new Error('Há mais de uma variação de '+p.type+'. Identifique modelo e cor nas peças do pedido para associar a lista corretamente.');
   match=candidates[0];
  }
  if(match){if(match.product.technical&&!match.product.technical.fit&&p.technical?.fit)match.product.technical.fit=p.technical.fit;Object.assign(match.product,{quantity:p.quantity,grade:namesToGrade(p.names,match.product.type),names:p.names,namesRaw:'',listKey:p.listKey,listMissing:false});if(!match.product.model)match.product.model=p.model;if(!match.product.fabricColor)match.product.fabricColor=p.fabricColor;if(!match.page.listGroup)match.page.listGroup=item.page.listGroup;used.add(match.product.id);}
  else{let page=added.get(item.page.id);if(!page){page={...item.page,mode:'individual',products:[]};next.pages.push(page);added.set(item.page.id,page);}page.products.push(p);}
 }
 for(const {product} of existing)if(product.listKey&&!used.has(product.id))product.listMissing=true;
 if(next.pages.length>50)throw new Error('A lista excede o limite de 50 páginas de edição. Divida o pedido.');
 if(next.pages.some(page=>page.products.length>8||page.products.some(p=>p.quantity>99999)))throw new Error('A lista excede o limite de peças por página ou de 99.999 unidades por peça.');
 const fields=['grupo','nome','numero','adicional','tamanhoCamiseta','tamanhoCalcao','quantidade','produto','modelo','cor'];
 next.listSource={...(source.id&&Number.isSafeInteger(source.version)&&source.version>0?{id:source.id,version:source.version}:{}),name:String(source.name||'Lista do organizador').slice(0,200),importedAt:source.importedAt||new Date().toISOString(),rows:normalized.map(row=>({...preserveCatalogList(row),...Object.fromEntries(fields.map(field=>[field,row[field]]))}))};
 return next;
}
export function demoOrder(){const d=newOrder();Object.assign(d,{title:'Modelo de pedido · demonstração',number:'0000-'+d.orderDate.slice(5,7)+'-MNZ',client:'EQUIPE DEMONSTRAÇÃO',contact:'CONTATO DO CLIENTE',seller:'ANDREI',artist:'ANDREI'});const p=d.pages[0];p.title='UNIFORME DE JOGO';p.label='ETIQUETA PRETA';const item=p.products[0];Object.assign(item,{model:'Raglan · Gola Elite',fabric:'JACQUARD ELITE',fabricColor:'TRANSFER',detailColor:'PRETO',quantity:8,grade:'CAMISETA\nP = 2\nM = 4\n\nBABY LOOK\nP = 1\n\nINFANTIL\nTAM 10 = 1',components:[{name:'Gola',material:'Poliéster',finish:'Gola pronta preta',position:'Gola',anchor:{x:.28,y:.14}},{name:'Escudo',material:'TPU',finish:'Alto relevo',position:'Peito esquerdo',anchor:{x:.38,y:.28}}]});return d;}

export function dateProblems(order={}){
 const errors=[],valid={};
 for(const [field,label] of [['orderDate','pedido'],['dispatchDate','despacho'],['deliveryDate','entrega']]){
  const value=order[field];if(!value)continue;
  const date=new Date(value+'T12:00:00Z');
  if(!/^\d{4}-\d{2}-\d{2}$/.test(value)||!Number.isFinite(+date)||date.toISOString().slice(0,10)!==value)errors.push('Data de '+label+' inválida.');else valid[field]=value;
 }
 if(valid.dispatchDate&&valid.orderDate&&valid.dispatchDate<valid.orderDate)errors.push('O despacho não pode ser anterior ao pedido.');
 if(valid.deliveryDate&&valid.orderDate&&valid.deliveryDate<valid.orderDate)errors.push('A entrega não pode ser anterior ao pedido.');
 if(valid.deliveryDate&&valid.dispatchDate&&valid.deliveryDate<valid.dispatchDate)errors.push('A entrega não pode ser anterior ao despacho.');return errors;
}
export function releaseProblems(order){
 const errors=validateOrder(order);
 if(order.origin&&order.type==='COMPLEMENTO COM ALTERAÇÕES'&&!String(order.complementChanges||'').trim())errors.push('Descreva as alterações deste complemento antes de conferir.');
 for(const [field,label] of [['number','Número do pedido'],['client','Cliente'],['orderDate','Data do pedido'],['deliveryDate','Previsão de entrega'],['artist','Responsável técnico']])if(!String(order[field]||'').trim())errors.push(label+': preencha antes de liberar.');
 for(const page of order.pages||[])for(const p of page.products||[])for(const [field,label] of [['model','modelo / molde'],['fabric','tecido principal'],['print','técnica de aplicação']])if(!String(p[field]||'').trim())errors.push(p.type+': informe '+label+'.');
 return [...new Set(errors)];
}
export function compareOrders(before,after){
 const changes=[],old=new Map((before.pages||[]).flatMap(page=>page.products.map(p=>[p.id,p]))),next=(after.pages||[]).flatMap(page=>page.products);
 for(const p of next){const previous=old.get(p.id),label=[p.type,p.model,p.fabricColor].filter(Boolean).join(' · ');
  if(!previous){changes.push(label+': nova peça, '+p.quantity+' unidades.');continue;}
  if(previous.quantity!==p.quantity)changes.push(label+': quantidade '+previous.quantity+' → '+p.quantity+'.');
  if(previous.grade!==p.grade)changes.push(label+': grade de tamanhos alterada.');
  if(JSON.stringify(previous.names)!==JSON.stringify(p.names))changes.push(label+': personalização alterada (nomes, números, tamanhos ou adicional).');
  if(p.listMissing&&!previous.listMissing)changes.push(label+': ausente na nova lista; conferência obrigatória.');
 }
 return changes.length?changes:['Mesmas quantidades, tamanhos e personalizações. A origem da lista será atualizada.'];
}

export function finalPreviewProblems(order){
 const errors=[...releaseProblems(order)];
 if(!order.listSource?.rows?.length)errors.push('Vincule a lista do pedido para conferir os nomes, números e tamanhos.');
 for(const page of order.pages||[]){
  if(page.visual?.mode==='shared'&&page.products.length>2)errors.push('Separe a imagem única em uma página com até duas peças.');
  for(const p of page.products||[])if(p.quantity>0&&!(page.visual?.mode==='shared'&&page.visual.image)&&!p.images?.some(Boolean))errors.push((p.type||'Peça')+': adicione a apresentação ou a imagem manual.');
 }
 return errors;
}
