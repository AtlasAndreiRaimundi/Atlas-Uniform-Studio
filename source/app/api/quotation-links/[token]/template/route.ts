import {env} from 'cloudflare:workers';
import {handle,result,service} from '@/lib/api';
import {QuotationService} from '@/lib/quotation-service.mjs';
export const dynamic='force-dynamic';
export async function GET(request:Request,{params}:{params:Promise<{token:string}>}){return handle(async()=>result({template:await new QuotationService(env.DB,service()).sharedTemplate((await params).token,new URL(request.url).searchParams.get('version'))}));}
