import {env} from 'cloudflare:workers';
import {config,validateFlow,exchangeGoogleCode,completeGoogleLogin,clearFlowCookie,sessionCookie,safeReturnTo} from '@/lib/google-auth.mjs';
export const dynamic='force-dynamic';
export async function GET(request:Request){
 const params=new URL(request.url).searchParams;
 const headers=new Headers({'Cache-Control':'no-store','Referrer-Policy':'no-referrer','Set-Cookie':clearFlowCookie()});
 try{
  config(env);
  if(params.has('error'))throw Error('Google denied authorization');
  const code=params.get('code'),state=params.get('state');
  if(!code||!state)throw Error('Missing code or state');
  const flow=validateFlow(request.headers.get('cookie'),state);
  const identity=await exchangeGoogleCode(env,code,flow.verifier,flow.nonce);
  const account=await completeGoogleLogin(env.DB,identity);
  headers.append('Set-Cookie',sessionCookie(account.token));
  const redirect=account.role?safeReturnTo(flow.returnTo):'/conta/configurar?return_to='+encodeURIComponent(safeReturnTo(flow.returnTo));
  headers.set('Location',new URL(redirect,config(env).origin).toString());
  return new Response(null,{status:303,headers});
 }catch{
  headers.set('Location',new URL('/login?google_error=failed',request.url).toString());
  return new Response(null,{status:303,headers});
 }
}
