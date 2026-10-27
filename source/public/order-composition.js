import {PRODUCTS,newProduct,newId} from './production-core.js?v=13';
import {FITS,productCodeFor,attachCatalog,technicalFieldChange,cloneFitVariant} from './product-catalog.js?v=4';

export const ORDER_PRODUCTS=PRODUCTS;
export const KIT_PRESETS=[
 {id:'jogo',label:'Camiseta e calção',types:['Camiseta','Calção']},
 {id:'agasalho',label:'Jaqueta e calça',types:['Jaqueta','Calça']},
 {id:'passeio',label:'Polo e bermuda',types:['Polo','Bermuda']},
];
export function prepareOrderProduct(product,designId){
 if(productCodeFor(product.type)){delete product.manualTechnical;attachCatalog(product,{designId});}
 else product.manualTechnical=true;
 return product;
}
export function createOrderProduct(type,designId=''){
 if(!ORDER_PRODUCTS.includes(type))throw Error('Escolha um tipo de peça disponível.');
 return prepareOrderProduct(newProduct(type),designId);
}
export function modelFamily(page,product){
 const t=product.technical;if(!t)return [];
 return page.products.filter(p=>p.technical?.productCode===t.productCode&&p.technical.designId===t.designId&&(t.productCode!=='CAM-001'||p.technical.sleeveLength===t.sleeveLength));
}
export function toggleModelFit(page,product,fit,checked){
 if(!FITS.some(f=>f.id===fit)||!product.technical)throw Error('Modelagem inválida.');
 const family=modelFamily(page,product),matching=family.filter(p=>p.technical.fit===fit);
 if(checked){
  if(matching.length)return matching[0].id;
  const blank=family.find(p=>!p.technical.fit);
  if(blank){technicalFieldChange(blank,'fit',fit);return blank.id;}
  if(page.products.length>=8)throw Error('Esta página comporta até oito representações. Adicione outra página para mais variações.');
  const clone=cloneFitVariant(product,fit);page.products.push(clone);
  const notes=(page.annotations||[]).filter(a=>a.productId===product.id);if((page.annotations||[]).length+notes.length>80){page.products.pop();throw Error('A cópia dos apontamentos excederia o limite da página.');}
  page.annotations=[...(page.annotations||[]),...notes.map(a=>({...structuredClone(a),id:newId(),productId:clone.id}))];
  return clone.id;
 }
 if(matching.some(p=>p.quantity||p.grade?.trim()||p.names?.length||p.namesRaw?.trim()))throw Error('Esta modelagem tem quantidades ou personalizações. Revise a lista antes de removê-la.');
 if(matching.length===family.length){for(const p of matching)technicalFieldChange(p,'fit','');return product.id;}
 const removed=new Set(matching.map(p=>p.id));page.products=page.products.filter(p=>!removed.has(p.id));page.annotations=(page.annotations||[]).filter(a=>!removed.has(a.productId));
 return removed.has(product.id)?modelFamily(page,product)[0]?.id:product.id;
}
