import { account, handle,formInput, mutation, result, service } from '@/lib/api';
import { AppError } from '@/lib/project-service.mjs';
export const dynamic = 'force-dynamic';
type Context = { params: Promise<{ id: string }> };
export async function GET(_: Request, context: Context) { return handle(async () => result({ project: await service().get(await account(), (await context.params).id) })); }
export async function PUT(request: Request, context: Context) {
  return handle(async () => {
    await mutation(request); const user = await account(), { id } = await context.params;
    // Authorize before reading the upload into memory.
    const store = service(); await store.own(user, id);
    const form = await formInput(request); let input;
    try { input = JSON.parse(String(form.get('metadata'))); } catch { throw new AppError(400, 'Dados de projeto inválidos.'); }
    return result({ project: await store.save(user, id, input, form.get('map'), form.get('thumbnail')) });
  });
}
export async function DELETE(request: Request, context: Context) { return handle(async () => { await mutation(request); await service().remove(await account(), (await context.params).id); return result({ deleted: true }); }); }
