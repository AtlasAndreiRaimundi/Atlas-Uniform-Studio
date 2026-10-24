import {account,handle,result,workspaceService} from '@/lib/api';
export const dynamic='force-dynamic';
export async function GET(_:Request,{params}:{params:Promise<{id:string}>}){return handle(async()=>result({proposal:await workspaceService().ownerDetail(await account(),(await params).id)}));}
