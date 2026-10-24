import { requireChatGPTUser } from '@/app/chatgpt-auth';
export const dynamic='force-dynamic';
export const metadata={title:'Organizar planilhas — Atlas Uniform Studio'};
export default async function Organizer({searchParams}:{searchParams:Promise<{order?:string;list?:string;new?:string}>}){
  const params=await searchParams,search=new URLSearchParams();if(params.new==='1')search.set('new','1');if(typeof params.order==='string')search.set('order',params.order);if(typeof params.list==='string')search.set('list',params.list);const query=search.size?'?'+search.toString():'';
  await requireChatGPTUser('/organizador'+query);
  return <iframe className="studio-frame" title="Organizador de pedidos e planilhas" src={'/organizador.html'+query}/>;
}
