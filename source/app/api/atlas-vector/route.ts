import {env} from 'cloudflare:workers';
import {account,handle,result} from '@/lib/api';
import {vectorHealth,vectorizeRequest} from '@/lib/atlas-vector.mjs';
export const dynamic='force-dynamic';
export async function GET(){return handle(async()=>{await account();return result(await vectorHealth(env));});}
export async function POST(request:Request){return handle(async()=>{const user=await account();return vectorizeRequest(request,env,fetch,user.userId);});}
