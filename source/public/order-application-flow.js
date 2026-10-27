import {newRecordId} from './record-id.js';
import {applicationGroups,syncApplicationArrows,syncConfirmedApplicationPositions} from './order-linked-applications.js?v=3';
export const DRAWING_POSITION='Conforme seta no desenho';
export function applicationChoices(product){
 const t=product.technical;if(!t)return [];
 const choices=[{role:'ESCUDO',type:'TPU ALTO RELEVO',label:'TPU alto relevo · escudo'}];
 if(t.fit!=='INFANTIL')choices.push({role:'ESCUDO',type:'APLIQUE BORDADO',label:'Aplique bordado · escudo'});
 if(t.productCode==='CAM-001')choices.push({role:'MARCA MEINERZ',type:'TPU ALTO RELEVO',label:'TPU alto relevo · marca Meinerz'},{role:'ETIQUETA OFICIAL',type:'TERMOCOLANTE',label:'Termocolante · etiqueta'},{role:'ETIQUETA OFICIAL',type:'TPU ALTO RELEVO',label:'TPU alto relevo · etiqueta'});
 return choices;
}
export function beginApplication(page,product,request={}){
 if(!product.technical)throw Error('Esta peça não tem uma ficha de aplicações. Use um apontamento livre.');
 let app=product.technical.applications.find(a=>a.id===request.applicationId);
 if(!app){if(!request.create)throw Error('Esta aplicação foi removida. Escolha outra.');app={id:newRecordId(),role:'ESCUDO',type:'TPU ALTO RELEVO',perUnit:1,position:'',exception:''};product.technical.applications.push(app);}
 syncApplicationArrows(page,product);syncConfirmedApplicationPositions(page);return app;
}
export function applicationNotes(page,product,app){
 const group=applicationGroups(page,product).find(group=>group.some(x=>x.app.id===app.id))||[],ids=new Set(group.map(x=>x.app.id));
 return (page.annotations||[]).filter(a=>ids.has(a.applicationId));
}
export function confirmApplication(page,product,app){
 const notes=applicationNotes(page,product,app);
 if(notes.length<app.perUnit)throw Error('Falta uma seta. Volte ao tipo da aplicação para recriar e posicionar.');
 if(product.technical.fit==='INFANTIL'&&app.type==='TPU ALTO RELEVO'&&!app.exception.trim())throw Error('Informe por que este pedido infantil precisa de TPU.');
 if(app.role==='MARCA MEINERZ'&&product.technical.applications.filter(a=>a.role==='MARCA MEINERZ').reduce((n,a)=>n+a.perUnit,0)>1)throw Error('A marca Meinerz já foi adicionada. Edite a aplicação existente.');
 if(!app.position.trim())app.position=DRAWING_POSITION;
 syncConfirmedApplicationPositions(page);return app;
}
