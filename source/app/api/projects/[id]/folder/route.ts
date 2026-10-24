import {account,handle,jsonInput,mutation,result,service} from '@/lib/api';
export const dynamic='force-dynamic';
export async function PATCH(request:Request,context:{params:Promise<{id:string}>}){return handle(async()=>{await mutation(request);return result({project:await service().moveToFolder(await account(),(await context.params).id,await jsonInput(request))});});}
