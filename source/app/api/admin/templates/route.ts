import { adminAccount, handle,formInput, mutation, result, templateService } from '@/lib/api';
import { AppError } from '@/lib/project-service.mjs';
export const dynamic='force-dynamic';
export async function GET(){return handle(async()=>result({templates:await templateService().adminList(await adminAccount())}));}
export async function POST(request:Request){return handle(async()=>{await mutation(request);const user=await adminAccount(),form=await formInput(request);let input;try{input=JSON.parse(String(form.get('metadata')));}catch{throw new AppError(400,'Dados do molde inválidos.');}return result({template:await templateService().create(user,input,form.get('model'))},201);});}
