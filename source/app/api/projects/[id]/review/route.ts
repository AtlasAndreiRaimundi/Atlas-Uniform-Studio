import {account,handle,jsonInput,mutation,result,service} from '@/lib/api';
export const dynamic='force-dynamic';
export async function POST(request:Request,{params}:{params:Promise<{id:string}>}){return handle(async()=>{await mutation(request);return result({project:await service().review(await account(),(await params).id,((await jsonInput(request)) as {version:number}).version)});});}
