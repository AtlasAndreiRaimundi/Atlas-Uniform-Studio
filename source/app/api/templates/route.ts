import { account, handle, result, templateService } from '@/lib/api';
export const dynamic='force-dynamic';
export async function GET(){return handle(async()=>result({templates:await templateService().catalog(await account())}));}
