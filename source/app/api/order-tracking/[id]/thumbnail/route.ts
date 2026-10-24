import {account,handle,trackingService} from '@/lib/api';
export const dynamic='force-dynamic';
export async function GET(request:Request,{params}:{params:Promise<{id:string}>}){
 return handle(async()=>{
  const query=new URL(request.url).searchParams,svg=await trackingService().preview(await account(),(await params).id,{factory:query.get('factory')==='1',version:query.get('version')});
  return new Response(svg,{headers:{'Content-Type':'image/svg+xml; charset=utf-8','Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff','Content-Security-Policy':"default-src 'none'; img-src data:; style-src 'unsafe-inline'; sandbox"}});
 });
}
