import {env} from 'cloudflare:workers';
import {handle,mutation,result} from '@/lib/api';
import {clearSessionCookie,logoutAccount,readSessionToken} from '@/lib/studio-auth.mjs';
export async function POST(request:Request){return handle(async()=>{
 await mutation(request);
 await logoutAccount(env.DB,readSessionToken(request.headers.get('cookie')||''));
 const response=result({ok:true});
 response.headers.set('Set-Cookie',clearSessionCookie({secure:new URL(request.url).protocol==='https:'}));
 return response;
});}
