import {env} from 'cloudflare:workers';
import {handle,result,service} from '@/lib/api';
import {QuotationService} from '@/lib/quotation-service.mjs';
export const dynamic='force-dynamic';
export async function GET(_request:Request,{params}:{params:Promise<{token:string}>}){return handle(async()=>result({quotation:await new QuotationService(env.DB,service()).shared((await params).token)}));}
