import {requireChatGPTUser} from '@/app/chatgpt-auth';
export const dynamic='force-dynamic';
export default async function Proposals(){await requireChatGPTUser('/propostas');return <iframe className="studio-frame" title="Propostas e pedidos de alteração" src="/acervo.html?tab=proposals"/>;}
