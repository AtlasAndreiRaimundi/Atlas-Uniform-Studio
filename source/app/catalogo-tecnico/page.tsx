import {requireChatGPTUser} from '../chatgpt-auth';
export const dynamic='force-dynamic';
export const metadata={title:'Fichas técnicas — Atlas Uniform Studio'};
export default async function TechnicalCatalog(){
 await requireChatGPTUser('/catalogo-tecnico');
 return <iframe className="studio-frame" title="Fichas técnicas CAM-001 e CAL-001" src="/referencia-producao.html"/>;
}
