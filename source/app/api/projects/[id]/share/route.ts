import { account, handle, mutation, result, service } from '@/lib/api';
export const dynamic = 'force-dynamic';
type Context = { params: Promise<{ id: string }> };
export async function POST(request: Request, context: Context) { return handle(async () => { await mutation(request); return result({ project: await service().share(await account(), (await context.params).id, true) }); }); }
export async function DELETE(request: Request, context: Context) { return handle(async () => { await mutation(request); return result({ project: await service().share(await account(), (await context.params).id, false) }); }); }
