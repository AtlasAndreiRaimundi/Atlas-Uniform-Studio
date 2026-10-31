import {env} from 'cloudflare:workers';
import {account,handle,result,service,workspaceService} from '@/lib/api';
import {QuotationService} from '@/lib/quotation-service.mjs';
import {assertMutation,boundedJSON} from '@/lib/request-security.mjs';
export const dynamic='force-dynamic';
export async function POST(request:Request,{params}:{params:Promise<{id:string}>}){return handle(async()=>{const user=await account();assertMutation(request,2048);return result({quotation:await new QuotationService(env.DB,service(),workspaceService(),env.BUCKET).share(user,(await params).id,await boundedJSON(request,{maxBytes:2048}))});});}
