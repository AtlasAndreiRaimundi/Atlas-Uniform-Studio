import { requireChatGPTUser, chatGPTSignOutPath } from '../chatgpt-auth';
import { isAdmin } from '@/lib/api';
import Dashboard from './dashboard';
export const dynamic = 'force-dynamic';
export default async function Projects({searchParams}:{searchParams:Promise<{folder?:string|string[];tab?:string|string[];order?:string|string[];item?:string|string[];create?:string|string[]}>}) {
  const params=await searchParams;
  const folderId=typeof params.folder==='string'?params.folder:null;
  const orderId=typeof params.order==='string'?params.order:null,productId=typeof params.item==='string'?params.item:null,query=new URLSearchParams();if(folderId)query.set('folder',folderId);if(orderId){query.set('order',orderId);if(productId)query.set('item',productId);}
  if(params.create==='1')query.set('create','1');
  const user = await requireChatGPTUser('/projects'+(query.size?'?'+query:''));
  return <Dashboard initialCreate={params.create==='1'} initialFolderId={folderId} initialOrderId={orderId} initialProductId={productId} isAdmin={isAdmin(user)} initialName={user.fullName || user.email} email={user.email} signOutPath={chatGPTSignOutPath('/login')} />;
}
