import {requireChatGPTUser} from '../chatgpt-auth';
import ProfilePage from './profile-page';
export const dynamic='force-dynamic';
export const metadata={title:'Perfil e desenhistas — ATLAS'};
export default async function Profile(){const user=await requireChatGPTUser('/perfil');return <><ProfilePage/>{user.provider==='google'&&<form method="post" action="/api/auth/google/logout" style={{padding:'12px 24px'}}><button type="submit">Sair da conta Google</button></form>}</>;}
