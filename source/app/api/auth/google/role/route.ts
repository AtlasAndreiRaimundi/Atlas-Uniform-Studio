import {env} from 'cloudflare:workers';
import {assertMutation} from '@/lib/request-security.mjs';
import {chooseGoogleRole,sessionFromHeader,safeReturnTo} from '@/lib/google-auth.mjs';
export const dynamic='force-dynamic';
export async function POST(request:Request){
 try{
  assertMutation(request,1024);
  if(Number(request.headers.get('content-length')||0)>1024)throw Error('Invalid form');
  const form=await request.formData();
  if([...form].length>2)throw Error('Invalid form');
  await chooseGoogleRole(env.DB,sessionFromHeader(request.headers.get('cookie')),form.get('role'));
  const returnTo=safeReturnTo(form.get('return_to'));
  return new Response(null,{status:303,headers:{Location:returnTo,'Cache-Control':'no-store'}});
 }catch{
  return new Response(null,{status:303,headers:{Location:'/conta/configurar?error=1','Cache-Control':'no-store'}});
 }
}
