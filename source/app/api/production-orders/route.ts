import {env} from 'cloudflare:workers';
import {account,handle,mutation,result} from '@/lib/api';
import {ProductionService,productionInput} from '@/lib/production-service.mjs';
export const dynamic='force-dynamic';
export async function GET(){return handle(async()=>result({orders:await new ProductionService(env.DB,env.BUCKET).list(await account())}));}
export async function POST(request:Request){return handle(async()=>{await mutation(request);const user=await account();return result({order:await new ProductionService(env.DB,env.BUCKET).save(user,null,await productionInput(request))},201);});}
