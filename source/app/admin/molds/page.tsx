import { requireChatGPTUser } from '@/app/chatgpt-auth';
import { isAdmin, templateService } from '@/lib/api';
import { notFound } from 'next/navigation';
import MoldManager from './mold-manager';
export const dynamic='force-dynamic';
export const metadata={title:'Moldes e mapas — Atlas Uniform Studio'};
export default async function Molds() {
  const user=await requireChatGPTUser('/admin/molds');
  if(!isAdmin(user))notFound();
  return <MoldManager initialTemplates={await templateService().adminList(user)} />;
}
