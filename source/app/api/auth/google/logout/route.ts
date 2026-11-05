import {env} from 'cloudflare:workers';
import {assertMutation} from '@/lib/request-security.mjs';
import {revokeGoogleSession,sessionFromHeader,clearSessionCookie} from '@/lib/google-auth.mjs';
export const dynamic='force-dynamic';
export async function POST(request:Request){
 try{assertMutation(request,1024);await revokeGoogleSession(env.DB,sessionFromHeader(request.headers.get('cookie')));}
 catch{/* The cookie must still be cleared even when database access fails. */}
 return new Response(null,{status:303,headers:{Location:'/login','Set-Cookie':clearSessionCookie(),'Cache-Control':'no-store'}});
}
