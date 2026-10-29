import {env} from 'cloudflare:workers';
import {account,handle,result} from '@/lib/api';
import {vectorHealth} from '@/lib/atlas-vector.mjs';
export const dynamic='force-dynamic';
export async function GET(){return handle(async()=>{await account();try{const h=await vectorHealth(env);return result({enabled:true,engineConnected:true,engineVersion:h.engineVersion,availableModes:['faithful']});}catch{return result({enabled:env.ATLAS_VECTOR_ENABLED==='true',engineConnected:false,availableModes:[]});}});}
