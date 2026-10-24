import {requireChatGPTUser} from '../chatgpt-auth';
import TrackingPanel from './tracking-panel';
export const dynamic='force-dynamic';
export const metadata={title:'Conferência e fábrica — ATLAS'};
export default async function Page(){await requireChatGPTUser('/acompanhamento');return <TrackingPanel/>;}
