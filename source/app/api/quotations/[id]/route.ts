import {env} from 'cloudflare:workers';
import {account,handle,result,service} from '@/lib/api';
import {QuotationService} from '@/lib/quotation-service.mjs';
import {assertMutation,boundedJSON} from '@/lib/request-security.mjs';
export const dynamic='force-dynamic';
type Context={params:Promise<{id:string}>};
export async function GET(_request:Request,{params}:Context){return handle(async()=>result({quotation:await new QuotationService(env.DB,service()).get(await account(),(await params).id)}));}
export async function PATCH(request:Request,{params}:Context){return handle(async()=>{const user=await account();assertMutation(request,65536);return result({quotation:await new QuotationService(env.DB,service()).save(user,(await params).id,await boundedJSON(request,{maxBytes:65536}))});});}
export async function DELETE(request:Request,{params}:Context){return handle(async()=>{const user=await account();assertMutation(request,65536);return result(await new QuotationService(env.DB,service()).remove(user,(await params).id,await boundedJSON(request,{maxBytes:65536})));});}
