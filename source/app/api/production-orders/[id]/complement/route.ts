import {account,handle,mutation,jsonInput,result,orderTechnicalService} from '@/lib/api';
export const dynamic='force-dynamic';
export async function POST(request:Request,{params}:{params:Promise<{id:string}>}){return handle(async()=>{await mutation(request);return result({order:await orderTechnicalService().complement(await account(),(await params).id,await jsonInput(request))},201);});}
