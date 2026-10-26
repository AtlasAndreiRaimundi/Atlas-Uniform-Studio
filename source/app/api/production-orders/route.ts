import {CATALOG_VERSION} from '@/public/product-catalog.js';
import {AppError} from '@/lib/project-service.mjs';
import {env} from 'cloudflare:workers';
import {account,handle,mutation,result} from '@/lib/api';
import {ProductionService,productionInput} from '@/lib/production-service.mjs';
export const dynamic='force-dynamic';
export async function GET(){return handle(async()=>result({orders:await new ProductionService(env.DB,env.BUCKET).list(await account())}));}
export async function POST(request:Request){return handle(async()=>{await mutation(request);const user=await account(),input=await productionInput(request);if(input?.document?.technicalCatalogVersion!==CATALOG_VERSION)throw new AppError(400,'Aplique e confira as fichas técnicas atuais nas peças antes de salvar um novo pedido. Pedidos já salvos permanecem disponíveis.');return result({order:await new ProductionService(env.DB,env.BUCKET).save(user,null,input)},201);});}
