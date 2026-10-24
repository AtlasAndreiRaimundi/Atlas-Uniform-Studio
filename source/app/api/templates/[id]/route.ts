import { account, handle, result, templateService } from '@/lib/api';
export const dynamic='force-dynamic';
export async function GET(_:Request,{params}:{params:Promise<{id:string}>}){return handle(async()=>{const {id}=await params;const template=await templateService().readable(await account(),id);return result({template:{...template,modelUrl:`/api/templates/${id}/assets/model`,templateUrl:`/api/templates/${id}/assets/template`,proofUrl:`/api/templates/${id}/assets/proof`}});});}
