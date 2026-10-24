import {account,handle,result,service} from '@/lib/api';
export const dynamic='force-dynamic';
export async function GET(){return handle(async()=>result({designers:await service().designers(await account())}));}
