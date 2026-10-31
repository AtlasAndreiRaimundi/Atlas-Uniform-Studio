import {env} from 'cloudflare:workers';
import {handle,assetResponse,service} from '@/lib/api';
import {QuotationService} from '@/lib/quotation-service.mjs';
export const dynamic='force-dynamic';
export async function GET(request:Request,{params}:{params:Promise<{token:string;kind:string}>}){return handle(async()=>{const {token,kind}=await params;return assetResponse(await new QuotationService(env.DB,service(),null,env.BUCKET).sharedAsset(token,kind,new URL(request.url).searchParams.get('version')));});}
