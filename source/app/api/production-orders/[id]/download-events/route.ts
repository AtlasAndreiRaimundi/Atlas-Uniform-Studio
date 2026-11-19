import {account,handle,result,trackingService,mutation,jsonInput} from '@/lib/api';
export const dynamic='force-dynamic';
export async function POST(request:Request,{params}:{params:Promise<{id:string}>}){return handle(async()=>{await mutation(request);return result(await trackingService().recordDownload(await account(),(await params).id,await jsonInput(request)));});}
