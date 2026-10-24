import { getChatGPTUser } from './chatgpt-auth';
import { redirect } from 'next/navigation';
import Login from './login/page';
export const dynamic = 'force-dynamic';
export default async function Home() { if (await getChatGPTUser()) redirect('/pedidos'); return <Login />; }
