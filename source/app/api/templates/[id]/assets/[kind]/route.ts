import { account, assetResponse, handle, templateService } from '@/lib/api';
import { AppError } from '@/lib/project-service.mjs';
export const dynamic='force-dynamic';
export async function GET(_:Request,{params}:{params:Promise<{id:string;kind:string}>}){return handle(async()=>{const {id,kind}=await params;if(kind==='source')throw new AppError(404,'Arquivo não encontrado.');await templateService().readable(await account(),id);return assetResponse(await templateService().asset(id,kind));});}
