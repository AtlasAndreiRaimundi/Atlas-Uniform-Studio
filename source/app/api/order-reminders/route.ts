import {account,handle,result,trackingService,mutation} from '@/lib/api';
export const dynamic='force-dynamic';
export async function GET(){return handle(async()=>result(await trackingService().reminders(await account())));}
export async function POST(request:Request){return handle(async()=>{await mutation(request);return result(await trackingService().dismissReminder(await account()));});}
