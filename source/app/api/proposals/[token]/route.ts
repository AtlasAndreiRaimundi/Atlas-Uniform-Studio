import {handle,jsonInput,mutation,result,workspaceService} from '@/lib/api';
import {AppError} from '@/lib/project-service.mjs';
export const dynamic='force-dynamic';
type Context={params:Promise<{token:string}>};
export async function GET(_:Request,{params}:Context){return handle(async()=>result({proposal:await workspaceService().sharedDetail((await params).token)}));}
export async function POST(request:Request,{params}:Context){return handle(async()=>{
  await mutation(request);const input=await jsonInput(request) as any,token=(await params).token,service=workspaceService();
  if(input?.action==='comment')return result({proposal:await service.comment(token,input)},201);
  if(input?.action==='approve')return result({proposal:await service.approve(token,input)});
  throw new AppError(400,'Ação inválida.');
});}
