export function workflowRoute(kind,{orderId='',projectId='',listId='',itemId='',created=false,attach=false}={}){
 const query=new URLSearchParams();if(orderId)query.set('order',orderId);if(projectId)query.set('project',projectId);if(listId)query.set('list',listId);if(itemId)query.set('item',itemId);if(created)query.set('new','1');if(attach)query.set('attach','1');
 const base=kind==='list'?'/organizador':kind==='presentation'?'/projects':'/pedidos';return base+(query.size?'?'+query:'');
}
export const canAttachToOrder=order=>(order.tracking?.stage||'draft')==='draft'&&order.document?.workflow?.status!=='released';
export function workflowActions(kind,{orderId='',locked=false,ready=true}={}){
 if(kind==='order')return locked?[{id:'tracking',label:'Acompanhar envio e aceite'}]:[{id:'list-new',label:'Criar lista para este pedido'},{id:'list-existing',label:'Anexar lista salva'},{id:'presentation-new',label:'Criar apresentação para este pedido'},{id:'presentation-existing',label:'Anexar apresentação salva'}];
 const disabled=!ready;
 if(orderId)return [{id:'attach-linked',label:'Anexar ao pedido de origem',disabled},{id:'attach-other',label:'Escolher outro pedido',disabled}];
 return [{id:'attach-new',label:'Criar pedido com '+(kind==='list'?'esta lista':'este design'),disabled},{id:'attach-other',label:'Anexar a um pedido existente',disabled}];
}

export const linkedWorkflowOrders=(kind,id,orders)=>orders.filter(order=>kind==='list'?order.tracking?.listId===id:order.tracking?.projectIds?.includes(id));

export function suggestListName({order,presentation,product='',model='',color='',source=''}={}){
 const context=order?[order.number,order.client||order.title].filter(Boolean).join(' · '):presentation?[presentation.clientName,presentation.name].filter(Boolean).join(' · '):[model,color,product].filter(Boolean).join(' · ')||String(source).replace(/\.[^.]+$/,'');
 return ('Lista · '+(context||new Date().toLocaleDateString('pt-BR',{timeZone:'America/Sao_Paulo'}))).slice(0,100);
}
