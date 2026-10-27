import {env} from 'cloudflare:workers';
import {account,handle,mutation,result} from '@/lib/api';
import {ListService,listInput} from '@/lib/list-service.mjs';
export const dynamic='force-dynamic';
export async function GET(_request:Request,{params}:{params:Promise<{id:string}>}){return handle(async()=>result({list:await new ListService(env.DB,env.BUCKET).get(await account(),(await params).id)}));}
export async function PUT(request:Request,{params}:{params:Promise<{id:string}>}){return handle(async()=>{await mutation(request);return result({list:await new ListService(env.DB,env.BUCKET).save(await account(),(await params).id,await listInput(request))});});}

export async function DELETE(request:Request,{params}:{params:Promise<{id:string}>}){return handle(async()=>{await mutation(request);return result(await new ListService(env.DB,env.BUCKET).remove(await account(),(await params).id,await listInput(request)));});}
