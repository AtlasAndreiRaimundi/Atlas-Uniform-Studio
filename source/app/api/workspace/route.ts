import {account,handle,jsonInput,mutation,result,workspaceService} from '@/lib/api';
import {AppError} from '@/lib/project-service.mjs';
export const dynamic='force-dynamic';
export async function GET(){return handle(async()=>result(await workspaceService().overview(await account())));}
export async function POST(request:Request){return handle(async()=>{
  await mutation(request);const user=await account(),input=await jsonInput(request) as any,service=workspaceService();
  if(!input||typeof input!=='object'||Array.isArray(input))throw new AppError(400,'Dados inválidos.');
  switch(input.action){
    case 'savePreset':return result({preset:await service.savePreset(user,input)});
    case 'removePreset':await service.removePreset(user,input.id);return result({ok:true});
    case 'saveClient':return result({client:await service.saveClient(user,input)});
    case 'freeze':{const version=await service.freeze(user,input.projectId,input.version);return result({version:{id:version.id,version:version.project_version,name:version.name,designerName:version.designer_name,createdAt:version.created_at}});}
    case 'createProposal':return result({proposal:await service.createProposal(user,input)},201);
    case 'addOption':return result({proposal:await service.addOption(user,input)});
    case 'disableProposal':await service.disableProposal(user,input.id);return result({ok:true});
    case 'markComment':return result({proposal:await service.markComment(user,input)});
    default:throw new AppError(400,'Ação inválida.');
  }
});}
