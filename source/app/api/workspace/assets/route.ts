import {account,handle,formInput,mutation,result,workspaceService} from '@/lib/api';
export const dynamic='force-dynamic';
export async function POST(request:Request){return handle(async()=>{await mutation(request);const user=await account(),form=await formInput(request);return result({asset:await workspaceService().uploadAsset(user,{folderId:form.get('folderId'),clientId:form.get('clientId'),name:form.get('name'),kind:form.get('kind')},form.get('file'))},201);});}
