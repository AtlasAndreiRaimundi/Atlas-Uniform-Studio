import { assetResponse, handle, service } from '@/lib/api';
export const dynamic = 'force-dynamic';
export async function GET(_: Request, { params }: { params: Promise<{ token: string; kind: string }> }) { return handle(async () => { const { token, kind } = await params; return assetResponse(await service().asset(null, null, kind, token)); }); }
