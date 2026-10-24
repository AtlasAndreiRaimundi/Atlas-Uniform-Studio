import {account,handle,simulatorService} from '@/lib/api';
export const dynamic='force-dynamic';
export async function GET(request:Request,{params}:{params:Promise<{id:string}>}){return handle(async()=>{const im=await simulatorService().thumbnail(await account(),(await params).id,new URL(request.url).searchParams.get('version'));return new Response(im.bytes,{headers:{'Content-Type':'image/png','Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff','Content-Security-Policy':"default-src 'none'; sandbox"}});});}
