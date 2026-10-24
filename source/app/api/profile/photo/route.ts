import {account,handle,formInput,mutation,result,service} from '@/lib/api';
export const dynamic='force-dynamic';
export async function POST(request:Request){return handle(async()=>{await mutation(request);const user=await account();const form=await formInput(request,{maxBytes:3*1024*1024,message:'Envie uma foto de até 2 MB.'});return result({profile:await service().uploadProfilePhoto(user,form.get('photo'))});});}
export async function DELETE(request:Request){return handle(async()=>{await mutation(request);return result({profile:await service().removeProfilePhoto(await account())});});}
