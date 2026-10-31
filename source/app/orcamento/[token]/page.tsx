import {env} from 'cloudflare:workers';
import {service} from '@/lib/api';
import {QuotationService} from '@/lib/quotation-service.mjs';
import PublicQuotation from './public-quotation';
export const dynamic='force-dynamic';
export const metadata={title:'Orçamento e apresentação — ATLAS UNIFORM STUDIO',robots:{index:false,follow:false}};
export default async function QuotationLink({params}:{params:Promise<{token:string}>}){
 const {token}=await params;let quotation:Awaited<ReturnType<QuotationService['shared']>>|null=null;
 try{quotation=await new QuotationService(env.DB,service()).shared(token);}catch{}
 if(!quotation)return <main className="unavailable"><p>ATLAS UNIFORM STUDIO</p><h1>Orçamento indisponível.</h1><p>Este link foi desativado ou não existe. Solicite um novo endereço ao vendedor.</p></main>;
 return <PublicQuotation quotation={quotation} token={token}/>;
}
