import { account, handle, jsonInput, mutation, result, service } from '@/lib/api';
export const dynamic = 'force-dynamic';
export async function GET() { return handle(async () => result({ profile: await service().profile(await account()) })); }
export async function PATCH(request: Request) { return handle(async () => { await mutation(request); return result({ profile: await service().updateProfile(await account(), await jsonInput(request)) }); }); }
