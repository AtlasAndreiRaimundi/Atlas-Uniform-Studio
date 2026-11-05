import {getChatGPTUser} from '@/app/chatgpt-auth';
import {result} from '@/lib/api';
export const dynamic='force-dynamic';
export async function GET(){const user=await getChatGPTUser();return result({user:user?{displayName:user.displayName,email:user.email,role:user.role||'designer',provider:user.provider||'chatgpt'}:null});}
