import {account,handle,result,orderTechnicalService} from '@/lib/api';
export const dynamic='force-dynamic';
export async function GET(request:Request,{params}:{params:Promise<{id:string}>}){return handle(async()=>{const q=new URL(request.url).searchParams;return result(await orderTechnicalService().delivery(await account(),(await params).id,{factory:q.get('factory')==='1',revision:q.get('revision'),version:q.get('version')}));});}
