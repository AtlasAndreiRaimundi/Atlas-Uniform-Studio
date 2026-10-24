import {account,handle,mutation,result,simulatorService} from '@/lib/api';
import {boundedJSON} from '@/lib/request-security.mjs';
export const dynamic='force-dynamic';
export async function GET(){return handle(async()=>result({designs:await simulatorService().list(await account())}));}
export async function POST(request:Request){return handle(async()=>{await mutation(request);const user=await account();const input=await boundedJSON(request,{maxBytes:14*1024*1024});return result({design:await simulatorService().save(user,null,input)},201);});}
