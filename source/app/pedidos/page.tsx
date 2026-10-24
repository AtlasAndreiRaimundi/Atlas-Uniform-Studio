import {requireChatGPTUser} from '../chatgpt-auth';
export const dynamic='force-dynamic';
export const metadata={title:'Pedidos de produção — Atlas Uniform Studio'};
export default async function ProductionOrders({searchParams}:{searchParams:Promise<{import?:string;project?:string;order?:string;item?:string;list?:string;new?:string;attach?:string}>}){
 const params=await searchParams;const query=new URLSearchParams();if(typeof params.list==='string')query.set('list',params.list);if(params.new==='1')query.set('new','1');if(params.attach==='1')query.set('attach','1');if(params.import==='1')query.set('import','1');if(typeof params.project==='string')query.set('project',params.project);if(typeof params.order==='string')query.set('order',params.order);if(typeof params.item==='string')query.set('item',params.item);
 await requireChatGPTUser('/pedidos'+(query.size?'?'+query:''));
 return <iframe allowFullScreen className="studio-frame" title="Montador de pedidos de produção" src={'/pedido.html'+(query.size?'?'+query:'')}/>;
}
