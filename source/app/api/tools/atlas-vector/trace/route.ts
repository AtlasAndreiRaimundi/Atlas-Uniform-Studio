import {env} from 'cloudflare:workers';
import {account,handle} from '@/lib/api';
import {vectorTraceForm} from '@/lib/atlas-vector.mjs';
export const dynamic='force-dynamic';
export async function POST(request:Request){return handle(async()=>{const user=await account();return vectorTraceForm(request,env,fetch,user.userId);});}
