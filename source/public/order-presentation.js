import {newKitPage} from './production-core.js?v=15';
import {createOrderProduct,prepareOrderProduct} from './order-composition.js';
export function presentationGarments(template={}){
 if(!['conjunto','kit'].includes(String(template.category||'').toLowerCase()))return null;
 const name=String(template.name||'').toUpperCase();
 if(/JAQUETA|AGASALHO/.test(name))return ['Jaqueta','Calça'];
 if(/POLO|PASSEIO/.test(name))return ['Polo','Bermuda'];
 if(/TOP/.test(name)&&/LEGGING/.test(name))return ['Top','Legging'];
 return ['Camiseta','Calção'];
}
export function usePresentationKit(order,page,product,template,image,reference){
 const types=presentationGarments(template);if(!types)return null;
 if(!page.products.every(p=>types.includes(p.type))){if(order.pages.length>=50)throw Error('Use até 50 desenhos por pedido.');page=newKitPage(types);for(const p of page.products)prepareOrderProduct(p,p.id);order.pages.push(page);}
 for(const type of types)if(!page.products.some(p=>p.type===type)){if(page.products.length>=8)throw Error('Não há espaço para a segunda peça neste desenho.');page.products.push(createOrderProduct(type));}
 page.mode='conjunto';page.title=page.title||'KIT · '+types.join(' + ').toUpperCase();page.visual={mode:'shared',image,transform:{scale:1,x:.5,y:.5}};
 for(const p of page.products){p.kitGroupId=page.id;p.projectRef=structuredClone(reference);p.images=[];for(const c of p.components||[])delete c.anchor;}
 if(order.pages.length===1)order.compositionKind='kit';return page;
}
