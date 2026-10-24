import { account, handle, jsonInput, mutation, result, service } from '@/lib/api';
export const dynamic = 'force-dynamic';
export async function GET() { return handle(async () => result({ projects: await service().list(await account()) })); }
export async function POST(request: Request) { return handle(async () => { await mutation(request); return result({ project: await service().create(await account(), await jsonInput(request)) }, 201); }); }
