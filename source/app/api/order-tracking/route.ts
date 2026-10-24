import {account,handle,result,trackingService} from '@/lib/api';
export const dynamic='force-dynamic';
export async function GET(request:Request){return handle(async()=>{const q=new URL(request.url).searchParams;return result(await trackingService().list(await account(),{factory:q.get('factory')==='1',page:Number(q.get('page')||0)}));});}
