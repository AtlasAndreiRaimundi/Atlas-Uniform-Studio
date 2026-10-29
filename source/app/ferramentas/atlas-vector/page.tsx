import {requireChatGPTUser} from '@/app/chatgpt-auth';
import VectorTool from './vector-tool';
export const dynamic='force-dynamic';
export const metadata={title:'ATLAS VECTOR (BETA) — ATLAS Uniform Studio'};
export default async function Page(){await requireChatGPTUser('/ferramentas/atlas-vector');return <VectorTool/>;}
