import {account,handle,result,trackingService,mutation,jsonInput} from '@/lib/api';
export const dynamic='force-dynamic';
export async function GET(request:Request,{params}:{params:Promise<{id:string}>}){return handle(async()=>result({order:await trackingService().detail(await account(),(await params).id,{factory:new URL(request.url).searchParams.get('factory')==='1'})}));}
export async function POST(request:Request,{params}:{params:Promise<{id:string}>}){return handle(async()=>{await mutation(request);return result({order:await trackingService().transition(await account(),(await params).id,await jsonInput(request))});});}
