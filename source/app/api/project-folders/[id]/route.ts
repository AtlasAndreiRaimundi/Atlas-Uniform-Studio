import {account,handle,jsonInput,mutation,result,service} from '@/lib/api';
export const dynamic='force-dynamic';
type Context={params:Promise<{id:string}>};
export async function PATCH(request:Request,context:Context){return handle(async()=>{await mutation(request);return result({folder:await service().updateFolder(await account(),(await context.params).id,await jsonInput(request))});});}
export async function DELETE(request:Request,context:Context){return handle(async()=>{await mutation(request);await service().removeFolder(await account(),(await context.params).id);return result({deleted:true});});}
