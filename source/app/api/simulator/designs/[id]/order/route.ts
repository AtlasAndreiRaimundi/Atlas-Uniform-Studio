import {account,handle,jsonInput,mutation,result,simulatorService} from '@/lib/api';
export const dynamic='force-dynamic';
export async function POST(request:Request,{params}:{params:Promise<{id:string}>}){return handle(async()=>{await mutation(request);const user=await account();return result({order:await simulatorService().createOrder(user,(await params).id,await jsonInput(request))},201);});}
