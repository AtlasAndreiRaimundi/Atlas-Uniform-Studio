import {env} from 'cloudflare:workers';
import {handle,jsonInput,mutation,result} from '@/lib/api';
import {loginAccount,sessionCookie} from '@/lib/studio-auth.mjs';
export async function POST(request:Request){return handle(async()=>{
 await mutation(request);
 const body=await jsonInput(request);
 const session=await loginAccount(env.DB,body,{ip:request.headers.get('cf-connecting-ip')||''});
 const response=result({user:session.user,expiresAt:session.expiresAt});
 response.headers.set('Set-Cookie',sessionCookie(session.token,{secure:new URL(request.url).protocol==='https:'}));
 return response;
});}
