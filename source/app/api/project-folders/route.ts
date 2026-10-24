import {account,handle,jsonInput,mutation,result,service} from '@/lib/api';
export const dynamic='force-dynamic';
export async function GET(){return handle(async()=>result({folders:await service().listFolders(await account())}));}
export async function POST(request:Request){return handle(async()=>{await mutation(request);return result({folder:await service().createFolder(await account(),await jsonInput(request))},201);});}
