import { handle,result,service } from '@/lib/api';
export const dynamic='force-dynamic';
export async function GET(_:Request,{params}:{params:Promise<{token:string}>}){return handle(async()=>result({template:await service().template(null,null,(await params).token)}));}
