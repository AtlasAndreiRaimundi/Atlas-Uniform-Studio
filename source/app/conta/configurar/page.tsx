import {cookies} from 'next/headers';
import {redirect} from 'next/navigation';
import {env} from 'cloudflare:workers';
import {googleSession,safeReturnTo} from '@/lib/google-auth.mjs';
export const dynamic='force-dynamic';
export const metadata={title:'Configurar perfil profissional — ATLAS'};
export default async function ConfigureGoogleProfile({searchParams}:{searchParams:Promise<{return_to?:string;error?:string}>}){
 const params=await searchParams,returnTo=safeReturnTo(params.return_to||'/pedidos');
 const store=await cookies(),token=store.get('__Host-atlas_google_session')?.value;
 const user=await googleSession(env.DB,token).catch(()=>null);
 if(!user)redirect('/login');
 if(user.role)redirect(returnTo);
 return <main style={{minHeight:'100vh',display:'grid',placeItems:'center',padding:'24px',background:'#171717',color:'#f7f5ee',fontFamily:'inherit'}}>
  <section style={{width:'min(100%,480px)',padding:'36px',background:'#222',border:'1px solid #59513f',borderRadius:14}}>
   <p style={{fontSize:12,letterSpacing:2,color:'#c6a76c'}}>ATLAS UNIFORM STUDIO</p>
   <h1 style={{fontSize:28,margin:'16px 0'}}>Qual é sua função?</h1>
   <p>Bem-vindo, {user.displayName}. Sua conta Google <strong>{user.email}</strong> foi autenticada. Escolha seu perfil para continuar.</p>
   {params.error&&<p role="alert" style={{color:'#ffc0ac'}}>Não foi possível salvar. Tente novamente.</p>}
   <form action="/api/auth/google/role" method="post" style={{display:'grid',gap:16,marginTop:24}}>
    <input type="hidden" name="return_to" value={returnTo}/>
    <label style={{display:'grid',gap:8}}>Atuação profissional
     <select name="role" required defaultValue="" style={{padding:14,borderRadius:6}}>
      <option value="" disabled>Selecione sua função</option>
      <option value="designer">Desenhista / Designer</option>
      <option value="vendedor">Vendedor</option>
     </select>
    </label>
    <button type="submit" style={{padding:14,background:'#d5b777',border:0,borderRadius:6,fontWeight:700}}>Acessar meu estúdio →</button>
   </form>
   <p style={{fontSize:12,opacity:.72}}>Esta escolha organiza seu perfil, mas não concede permissões administrativas.</p>
   <form method="post" action="/api/auth/google/logout"><button type="submit" style={{background:'none',border:0,color:'#ddd',textDecoration:'underline',cursor:'pointer'}}>Usar outra conta</button></form>
  </section>
 </main>;
}
