import {account,handle,mutation,formInput,result,orderTechnicalService} from '@/lib/api';
export const dynamic='force-dynamic';
export async function POST(request:Request,{params}:{params:Promise<{id:string}>}){return handle(async()=>{await mutation(request);const user=await account(),id=(await params).id,service=orderTechnicalService();await service.authorizeUpload(user,id);const form=await formInput(request);return result({order:await service.attach(user,id,Number(form.get('version')),form.get('file'))},201);});}
