import { requireChatGPTUser } from '@/app/chatgpt-auth';
import { isAdmin, templateService } from '@/lib/api';
import { notFound } from 'next/navigation';
export const dynamic='force-dynamic';
export default async function Preview({params}:{params:Promise<{id:string}>}) {
  const {id}=await params,user=await requireChatGPTUser(`/admin/molds/${id}/preview`);
  if(!isAdmin(user))notFound();
  try{await templateService().descriptor(id);}catch{notFound();}
  return <iframe className="studio-frame" title="Conferência do molde no visualizador 3D" src={`/viewer.html?mold=${encodeURIComponent(id)}`}/>;
}
