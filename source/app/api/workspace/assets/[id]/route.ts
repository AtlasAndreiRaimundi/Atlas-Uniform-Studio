import {account,handle,jsonInput,mutation,result,workspaceService} from '@/lib/api';
export const dynamic='force-dynamic';
type Context={params:Promise<{id:string}>};
export async function GET(request:Request,{params}:Context){return handle(async()=>{
  const {row,object}=await workspaceService().libraryAsset(await account(),(await params).id);
  const raster=['image/png','image/jpeg','image/webp'].includes(row.content_type),download=new URL(request.url).searchParams.has('download');
  const name=encodeURIComponent(row.file_name).replace(/'/g,'%27');
  return new Response(object.body,{headers:{'Content-Type':row.content_type,'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff','Content-Security-Policy':"default-src 'none'; sandbox",'Content-Disposition':`${raster&&!download?'inline':'attachment'}; filename*=UTF-8''${name}`}});
});}
export async function DELETE(request:Request,{params}:Context){return handle(async()=>{await mutation(request);await workspaceService().removeAsset(await account(),(await params).id);return result({ok:true});});}
export async function PATCH(request:Request,{params}:Context){return handle(async()=>{await mutation(request);return result({asset:await workspaceService().moveAsset(await account(),(await params).id,await jsonInput(request))});});}
