import {account,assetResponse,handle,service} from '@/lib/api';
export const dynamic='force-dynamic';
export async function GET(_request:Request,{params}:{params:Promise<{id:string}>}){return handle(async()=>assetResponse(await service().profilePhoto(await account(),(await params).id)));}
