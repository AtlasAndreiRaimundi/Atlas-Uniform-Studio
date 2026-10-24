import { account,handle,result,service } from '@/lib/api';
export const dynamic='force-dynamic';
export async function GET(_:Request,{params}:{params:Promise<{id:string}>}){return handle(async()=>result({template:await service().template(await account(),(await params).id)}));}
