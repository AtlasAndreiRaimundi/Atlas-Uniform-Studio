import {account,handle,mutation,result,simulatorService,formInput} from '@/lib/api';
import {AppError} from '@/lib/project-service.mjs';
export const dynamic='force-dynamic';
export async function POST(request:Request,{params}:{params:Promise<{id:string}>}){
 return handle(async()=>{
  await mutation(request);const user=await account(),id=(await params).id,store=simulatorService();
  await store.row(user,id); // Authorize before reading the uploaded map.
  const form=await formInput(request);let input;
  try{input=JSON.parse(String(form.get('metadata')));}catch{throw new AppError(400,'Confira os dados da apresentação.');}
  return result({project:await store.createPresentation(user,id,input,form.get('map'))},201);
 });
}
