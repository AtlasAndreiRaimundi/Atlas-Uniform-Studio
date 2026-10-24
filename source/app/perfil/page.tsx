import {requireChatGPTUser} from '../chatgpt-auth';
import ProfilePage from './profile-page';
export const dynamic='force-dynamic';
export const metadata={title:'Perfil e desenhistas — ATLAS'};
export default async function Profile(){await requireChatGPTUser('/perfil');return <ProfilePage/>;}
