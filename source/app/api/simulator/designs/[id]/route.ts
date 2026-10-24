import {account,handle,mutation,result,simulatorService} from '@/lib/api';
import {boundedJSON} from '@/lib/request-security.mjs';
export const dynamic='force-dynamic';
type Context={params:Promise<{id:string}>};
export async function GET(_request:Request,{params}:Context){return handle(async()=>result({design:await simulatorService().get(await account(),(await params).id)}));}
export async function PUT(request:Request,{params}:Context){return handle(async()=>{await mutation(request);const user=await account();const input=await boundedJSON(request,{maxBytes:14*1024*1024});return result({design:await simulatorService().save(user,(await params).id,input)});});}
