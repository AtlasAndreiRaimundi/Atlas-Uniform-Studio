import {assetResponse,handle,workspaceService} from '@/lib/api';
export const dynamic='force-dynamic';
export async function GET(_:Request,{params}:{params:Promise<{token:string;id:string;kind:string}>}){return handle(async()=>{const {token,id,kind}=await params;return assetResponse(await workspaceService().versionAsset(token,id,kind));});}
