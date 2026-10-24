import {account,handle,result,trackingService,mutation,jsonInput} from '@/lib/api';
export const dynamic='force-dynamic';
export async function GET(){return handle(async()=>result({members:await trackingService().members(await account())}));}
export async function PATCH(request:Request){return handle(async()=>{await mutation(request);return result(await trackingService().setMember(await account(),await jsonInput(request)));});}
