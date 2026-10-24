import {account,handle,result,simulatorService} from '@/lib/api';
export const dynamic='force-dynamic';
export async function GET(_request:Request,{params}:{params:Promise<{id:string}>}){return handle(async()=>result(await simulatorService().fromOrder(await account(),(await params).id)));}
