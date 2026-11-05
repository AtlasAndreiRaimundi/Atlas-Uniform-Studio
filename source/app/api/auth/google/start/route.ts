import {env} from 'cloudflare:workers';
import {startGoogleLogin} from '@/lib/google-auth.mjs';
export const dynamic='force-dynamic';
export async function GET(request:Request){
 try{
  const url=new URL(request.url);
  const login=await startGoogleLogin(env,url.searchParams.get('return_to')||'/pedidos');
  return new Response(null,{status:302,headers:{Location:login.url,'Set-Cookie':login.cookie,'Cache-Control':'no-store','Referrer-Policy':'no-referrer'}});
 }catch{return Response.redirect(new URL('/login?google_error=unavailable',request.url),302);}
}
