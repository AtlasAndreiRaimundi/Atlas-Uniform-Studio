import { adminAccount, handle, jsonInput, mutation, result, templateService } from '@/lib/api';
import { AppError } from '@/lib/project-service.mjs';
export const dynamic='force-dynamic';
type Context={params:Promise<{id:string}>};
export async function GET(_:Request,{params}:Context){
  return handle(async()=>{
    await adminAccount();const {id}=await params,template=await templateService().descriptor(id);
    return result({template:{...template,modelUrl:`/api/admin/templates/${id}/assets/model`,templateUrl:`/api/admin/templates/${id}/assets/template`,proofUrl:`/api/admin/templates/${id}/assets/proof`}});
  });
}
export async function PATCH(request:Request,{params}:Context){
  return handle(async()=>{
    await mutation(request);const user=await adminAccount(),id=(await params).id,parsed=await jsonInput(request),service=templateService();
    if(!parsed||typeof parsed!=='object'||Array.isArray(parsed))throw new AppError(400,'Dados do molde inválidos.');
    const input=parsed as Record<string,unknown>;
    const template=input.action==='restore'?await service.restore(user,id):Object.hasOwn(input,'status')?await service.status(user,id,input):await service.update(user,id,input);
    return result({template});
  });
}
export async function DELETE(request:Request,{params}:Context){
  return handle(async()=>{await mutation(request);return result({template:await templateService().remove(await adminAccount(),(await params).id)});});
}
