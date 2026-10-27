import {moldFor,productDisplayName} from './product-catalog.js?v=7';
export const PRICE_VERSION='ANEXO-01-2026';
export const APPLICATION_PRICES=Object.freeze([
 {id:'APLIQUE',label:'Escudo aplique',cents:500,types:['APLIQUE BORDADO']},
 {id:'APLIQUE_3D',label:'Escudo aplique 3D',cents:750,types:['APLIQUE BORDADO']},
 {id:'TPU',label:'Escudo alto relevo',cents:1000,types:['TPU ALTO RELEVO']},
 {id:'TAG',label:'Termocolante tag',cents:150,types:['TERMOCOLANTE']},
 {id:'BRASAO',label:'Termocolante brasão',cents:500,types:['TERMOCOLANTE']},
 {id:'GRANDE',label:'Termocolante grande',cents:750,types:['TERMOCOLANTE']},
 {id:'NUMERO',label:'Número termocolante',cents:1500,types:['TERMOCOLANTE']},
 {id:'DTF_PEQUENA',label:'DTF logo pequena',cents:500,types:['DTF']},
 {id:'DTF_GRANDE',label:'DTF logo grande',cents:1000,types:['DTF']},
]);
const norm=v=>String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase();
export const money=cents=>(cents/100).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
const cents=(v,label)=>{if(!Number.isSafeInteger(v)||v<0||v>10000000)throw Error(label+': informe um valor válido, em centavos.');return v;};
export function cleanPricing(value){if(!value||value.version!==PRICE_VERSION||!Number.isInteger(value.discountBps)||value.discountBps<0||value.discountBps>10000)throw Error('Confira o desconto: use de 0% a 100%, com até duas casas decimais.');return {version:PRICE_VERSION,discountBps:value.discountBps};}
export function cleanPriceConfig(value){if(!value||typeof value!=='object'||Array.isArray(value))throw Error('Confira os preços da peça.');const out={};for(const key of ['baseCents','finishCents'])if(value[key]!==undefined&&value[key]!==null)out[key]=cents(value[key],'Preço');for(const key of ['applications','applicationCents'])if(value[key]!==undefined){if(!value[key]||typeof value[key]!=='object'||Array.isArray(value[key])||Object.keys(value[key]).length>60)throw Error('Confira os valores das aplicações.');out[key]={};for(const [id,v]of Object.entries(value[key])){if(id.length>120||['__proto__','constructor','prototype'].includes(id))throw Error('Identificação de preço inválida.');if(key==='applications'&&!APPLICATION_PRICES.some(a=>a.id===v))throw Error('Preço de aplicação não reconhecido.');out[key][id]=key==='applications'?v:cents(v,'Aplicação');}}return out;}
export function pricingApplications(p){if(p.technical)return p.technical.applications.map(a=>({...a,key:a.id,free:a.role==='MARCA MEINERZ'}));
 const apps=(p.extraApplications||[]).map(type=>({key:'extra:'+type,type,role:type,perUnit:1}));
 for(const [i,c]of (p.components||[]).entries()){const text=norm([c.name,c.material,c.finish].join(' ')),type=/TPU|ALTO RELEVO/.test(text)?'TPU ALTO RELEVO':/TERMOCOLANTE/.test(text)?'TERMOCOLANTE':/APLIQUE|BORDADO/.test(text)?'APLIQUE BORDADO':/DTF/.test(text)?'DTF':'';if(type&&!apps.some(a=>a.type===type))apps.push({key:'component:'+i,type,role:c.name||type,perUnit:1});}return apps;}
export function applicationOptions(a){return APPLICATION_PRICES.filter(rate=>rate.types.includes(a.type));}
export function defaultApplicationRate(a){if(a.type==='TPU ALTO RELEVO')return 'TPU';if(a.type==='APLIQUE BORDADO')return 'APLIQUE';if(a.type==='TERMOCOLANTE'&&a.role==='ETIQUETA OFICIAL')return 'TAG';return '';}
export function quoteProduct(p,discountBps=0){
 const t=p.technical,cfg=p.priceConfig||{},fabric=norm(t?.fabricId||p.fabric).replaceAll('_',' '),type=norm(p.type),shirt=t?.productCode==='CAM-001'||['CAMISETA','CAMISA','BABY LOOK','POLO','CAMISETA SUBLIMADA / TRANSFER'].includes(type),shorts=t?.productCode==='CAL-001'||type==='CALCAO',polo=shirt&&(t?.collarModel==='POLO'||type==='POLO'),issues=[],items=[];
 let base=null;if(shirt){if(polo&&/ELASTIC|MANCHESTER|ARMY/.test(fabric))base=7250;else if(!polo){if(/JACQUARD/.test(fabric))base=7250;else if(/ELASTIC|MANCHESTER|ARMY/.test(fabric))base=6490;else if(/^DRY(?: |$)/.test(fabric))base=5990;}}else if(shorts){if(/^DRY(?: |$)/.test(fabric))base=5490;else if(/STRECH|STRETCH/.test(fabric))base=5690;}
 if(!t&&cfg.baseCents===undefined&&/GOLA|RECORTE|FILETE/.test(norm([p.model,...(p.components||[]).map(c=>[c.name,c.finish].join(' '))].join(' '))))issues.push('Cadastro antigo: aplique a ficha técnica ou informe o preço base incluindo os acabamentos.');
 if(cfg.baseCents!==undefined)base=cfg.baseCents;if(base===null)issues.push('Preço base não informado na tabela para '+(p.fabric||p.type)+'.');else items.push({label:'Peça / tecido'+(polo?' · Polo':''),cents:base});
 if(t?.productCode==='CAM-001'){if(t.hasSideCut)items.push({label:'Recorte lateral',cents:750});if(t.sleeveFinish==='FILETE COSTURADO')items.push({label:'Filete manga',cents:250});if(t.collarModel&&!['BRASIL','V','REDONDA','POLO'].includes(t.collarModel))items.push({label:'Gola premium',cents:500});}
 if(shorts&&moldFor(t)?.cut)items.push({label:'Recorte lateral',cents:750});
 if(shorts&&t?.hemFinish==='FILETE COSTURADO'){if(cfg.finishCents===undefined)issues.push('Filete do calção: informe o adicional, não consta no anexo.');else items.push({label:'Filete do calção · valor informado',cents:cfg.finishCents});}
 const applications=pricingApplications(p).map(a=>{const selected=cfg.applications?.[a.key]||defaultApplicationRate(a),rate=applicationOptions(a).find(r=>r.id===selected);let amount=a.free?0:cfg.applicationCents?.[a.key]??rate?.cents;if(amount===undefined){issues.push('Escolha o preço de '+a.role+' · '+a.type+'.');amount=null;}if(amount!==null)items.push({label:a.role+' · '+(a.free?'marca gratuita':rate?.label||a.type)+' × '+a.perUnit,cents:amount*a.perUnit});return {...a,rate:selected,cents:amount};});
 const subtotal=items.reduce((sum,item)=>sum+item.cents,0);if(!Number.isSafeInteger(subtotal)||!Number.isSafeInteger(subtotal*Number(p.quantity||0)))issues.push('O valor excede o limite de cálculo seguro.');
 const grossCents=issues.length?null:subtotal,unitCents=grossCents===null?null:Number((BigInt(grossCents)*BigInt(10000-discountBps)+5000n)/10000n),quantity=Number(p.quantity||0);
 return {id:p.id,product:p,description:productDisplayName(p)||p.type,quantity,items,applications,issues,grossCents,unitCents,totalCents:unitCents===null?null:unitCents*quantity};
}
export function quoteOrder(order){if(!order.pricing)return null;const discountBps=order.pricing.discountBps||0,rows=[];for(const page of order.pages||[])for(const p of page.products||[]){const q=quoteProduct(p,discountBps);rows.push({...q,pageId:page.id,pageTitle:page.title});}const pending=rows.filter(r=>r.quantity>0&&r.issues.length);return {version:PRICE_VERSION,discountBps,rows,issues:pending.flatMap(r=>r.issues.map(issue=>r.description+': '+issue)),totalCents:pending.length?null:rows.reduce((sum,r)=>sum+(r.totalCents||0),0)};}
export function pricingProblems(order){return quoteOrder(order)?.issues||[];}
export function groupedQuoteRows(quote,pageId){const map=new Map();for(const r of quote?.rows||[]){if(pageId&&r.pageId!==pageId||!r.quantity)continue;const key=JSON.stringify([r.pageId,r.description,r.unitCents,r.items]);if(map.has(key)){const prev=map.get(key);prev.quantity+=r.quantity;prev.totalCents=prev.unitCents===null?null:prev.unitCents*prev.quantity;}else map.set(key,{...r});}return [...map.values()];}
export function orderFileStem(order){const part=(value,fallback,max)=>String(value||fallback).normalize('NFC').replace(/[<>:"/\\|?*\x00-\x1f]/g,' ').replace(/\s+/g,' ').replace(/[. ]+$/,'').trim().slice(0,max)||fallback;return [part(order.number,'SEM CODIGO',32),part(order.client,'SEM CLIENTE',60),part(order.title,'PEDIDO',80)].join(' - ');}
