import {env} from 'cloudflare:workers';
import {account,handle,mutation,result} from '@/lib/api';
import {ListService} from '@/lib/list-service.mjs';
export const dynamic='force-dynamic';
export async function POST(request:Request,{params}:{params:Promise<{id:string}>}){return handle(async()=>{await mutation(request);return result({list:await new ListService(env.DB,env.BUCKET).forOrder(await account(),(await params).id)});});}
