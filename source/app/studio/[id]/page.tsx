import { requireChatGPTUser } from '@/app/chatgpt-auth';
import { service } from '@/lib/api';
import { notFound } from 'next/navigation';
export const dynamic = 'force-dynamic';
export default async function Studio({ params,searchParams }: { params: Promise<{ id: string }>;searchParams:Promise<{order?:string;item?:string;created?:string}> }) {
  const { id } = await params;
  const search=await searchParams,createdQuery=search.created==='1'?'&created=1':'',orderQuery=typeof search.order==='string'?'&order='+encodeURIComponent(search.order)+(typeof search.item==='string'?'&item='+encodeURIComponent(search.item):''):'';
  const user = await requireChatGPTUser(`/studio/${id}`+(orderQuery?'?'+orderQuery.slice(1):''));
  try { await service().own(user, id); } catch (error: any) { if (error.status === 404) notFound(); throw error; }
  return <iframe className="studio-frame" title="Estúdio de edição do uniforme" src={`/viewer.html?project=${encodeURIComponent(id)}${orderQuery}${createdQuery}`} />;
}
