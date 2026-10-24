import { adminAccount, assetResponse, handle, templateService } from '@/lib/api';
export const dynamic='force-dynamic';
export async function GET(_:Request,{params}:{params:Promise<{id:string;kind:string}>}){return handle(async()=>{await adminAccount();const {id,kind}=await params;return assetResponse(await templateService().asset(id,kind));});}
