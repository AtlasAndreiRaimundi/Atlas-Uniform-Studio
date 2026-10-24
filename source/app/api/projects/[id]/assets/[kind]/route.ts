import { account, assetResponse, handle, service } from '@/lib/api';
export const dynamic = 'force-dynamic';
export async function GET(request: Request, { params }: { params: Promise<{ id: string; kind: string }> }) { return handle(async () => { const { id, kind } = await params;const expected=new URL(request.url).searchParams.get('version');return assetResponse(await service().asset(await account(), id, kind, null, expected===null?null:Number(expected))); }); }
