import {env} from 'cloudflare:workers';
import {account,handle,result,service} from '@/lib/api';
import {QuotationService} from '@/lib/quotation-service.mjs';
import {assertMutation,boundedJSON} from '@/lib/request-security.mjs';
export const dynamic='force-dynamic';
export async function GET(){return handle(async()=>result({quotations:await new QuotationService(env.DB,service()).list(await account())}));}
export async function POST(request:Request){return handle(async()=>{const user=await account();assertMutation(request,65536);return result({quotation:await new QuotationService(env.DB,service()).save(user,null,await boundedJSON(request,{maxBytes:65536}))},201);});}
