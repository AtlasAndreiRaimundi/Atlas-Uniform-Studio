import { handle, result, service } from '@/lib/api';
export const dynamic = 'force-dynamic';
export async function GET(_: Request, { params }: { params: Promise<{ token: string }> }) { return handle(async () => result({ presentation: await service().presentation((await params).token) })); }
