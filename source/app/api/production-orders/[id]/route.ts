import {env} from 'cloudflare:workers';
import {account,handle,mutation,result} from '@/lib/api';
import {ProductionService,productionInput} from '@/lib/production-service.mjs';
export const dynamic='force-dynamic';
export async function GET(request:Request,{params}:{params:Promise<{id:string}>}){return handle(async()=>{const service=new ProductionService(env.DB,env.BUCKET),user=await account(),id=(await params).id,revision=new URL(request.url).searchParams.get('revision');return result({order:revision?await service.released(user,id,revision):await service.get(user,id)});});}
export async function PUT(request:Request,{params}:{params:Promise<{id:string}>}){return handle(async()=>{await mutation(request);const user=await account();return result({order:await new ProductionService(env.DB,env.BUCKET).save(user,(await params).id,await productionInput(request))});});}
export async function DELETE(request:Request,{params}:{params:Promise<{id:string}>}){return handle(async()=>{await mutation(request);const user=await account();await new ProductionService(env.DB,env.BUCKET).remove(user,(await params).id,await productionInput(request));return result({deleted:true});});}
