import {workspaceService} from '@/lib/api';
export const dynamic='force-dynamic';
export const metadata={title:'Sua proposta — Atlas Uniform Studio',robots:{index:false,follow:false}};
export default async function Proposal({params}:{params:Promise<{token:string}>}){
  const {token}=await params;try{await workspaceService().shared(token);}catch{return <main className="unavailable"><p className="eyebrow">ATLAS UNIFORM STUDIO</p><h1>Proposta indisponível.</h1><p>Solicite o link atualizado ao seu designer.</p></main>;}
  return <iframe className="studio-frame" title="Proposta, comparação e aprovação do uniforme" src={`/proposta.html?token=${encodeURIComponent(token)}`}/>;
}
