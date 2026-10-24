import { service } from '@/lib/api';
export const dynamic = 'force-dynamic';
export const metadata = { title: 'Apresentação 3D — Atlas Uniform Studio', robots: { index: false, follow: false } };
export default async function Presentation({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  try { await service().sharedRow(token); } catch {
    return <main className="unavailable"><p className="eyebrow">ATLAS UNIFORM STUDIO</p><h1>Apresentação indisponível.</h1><p>O link pode ter sido desativado ou o projeto excluído.<br />Solicite o endereço atualizado ao seu designer.</p></main>;
  }
  return <iframe className="studio-frame" title="Apresentação do uniforme em 3D" src={`/viewer.html?share=${encodeURIComponent(token)}`} />;
}
