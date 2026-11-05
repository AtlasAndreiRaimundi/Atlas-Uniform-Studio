import {env} from 'cloudflare:workers';
import {handle,jsonInput,mutation,result} from '@/lib/api';
import {resendVerification} from '@/lib/studio-auth.mjs';
export async function POST(request:Request){return handle(async()=>{
 await mutation(request);
 const body=await jsonInput(request);
 return result(await resendVerification(env.DB,env,body,{ip:request.headers.get('cf-connecting-ip')||''}));
});}
