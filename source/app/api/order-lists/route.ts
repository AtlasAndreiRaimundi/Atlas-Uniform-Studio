import {env} from 'cloudflare:workers';
import {account,handle,mutation,result} from '@/lib/api';
import {ListService,listInput} from '@/lib/list-service.mjs';
export const dynamic='force-dynamic';
export async function GET(request:Request){return handle(async()=>result({lists:await new ListService(env.DB,env.BUCKET).list(await account(),new URL(request.url).searchParams.get('project')||'')}));}
export async function POST(request:Request){return handle(async()=>{await mutation(request);return result({list:await new ListService(env.DB,env.BUCKET).save(await account(),null,await listInput(request))},201);});}
