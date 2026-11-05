import ThemeSelector from '../theme-selector';
import {env} from 'cloudflare:workers';
import {configured,safeReturnTo} from '@/lib/google-auth.mjs';
import { service } from '@/lib/api';
import { Brand } from '../brand';
import { chatGPTSignInPath, getChatGPTUser } from '../chatgpt-auth';
import HeroComposition from './hero-composition';
import './home-hero.css';
export const dynamic = 'force-dynamic';
export default async function Login({searchParams}:{searchParams?:Promise<{return_to?:string;google_error?:string}>}={}) {
  const params=await searchParams,returnTo=safeReturnTo(params?.return_to||'/pedidos'),googleEnabled=configured(env);
  const googleHref='/api/auth/google/start?return_to='+encodeURIComponent(returnTo);
  const user = await getChatGPTUser();
  let displayName = user?.displayName || '';
  if (user) { try { displayName = (await service().profile(user)).displayName; } catch { /* The entry remains available while storage recovers. */ } }
  return <main className="login-page creative-entry">
    <section className="login-art">
      <Brand />
      <span className="entry-brand-note">DESIGN / ESPORTE / PRODUÇÃO</span>
      <div className="login-statement"><p className="eyebrow">ATLAS · IDEIAS EM MOVIMENTO</p><h1><span>Liberdade</span><span>para criar.</span><span className="entry-headline-accent">Poder para</span><span className="entry-headline-accent">produzir.</span></h1><p>Do primeiro traço ao uniforme em quadra.<br/>As ferramentas para dar vida às suas ideias,<br/>com a liberdade de fazer do seu jeito.</p></div>
      <HeroComposition/>
      <footer className="login-art-footer"><span>CRIE. VISUALIZE. TRANSFORME.</span><span>CRIADO POR ANDREI RAIMUNDI</span></footer>
      <a className="entry-mobile-jump" href="#studio-access">Entrar no estúdio ↓</a>
    </section>
    <section className="login-form-section" id="studio-access">
      <div className="login-form"><ThemeSelector/><span className="tiny-line" /><p className="eyebrow">SUA PRÓXIMA CRIAÇÃO COMEÇA AQUI</p><h2>{user ? `Olá, ${displayName.split(' ')[0]}.` : 'Entre no seu estúdio.'}</h2><p className="body-copy">Desenhe uniformes, apresente suas ideias e conecte cada detalhe ao pedido. Tudo no seu ritmo, em um só lugar.</p>
        {user ? <><a className="gold-button login-cta" href={returnTo}>Acessar meus pedidos <span>↗</span></a>{user.provider==='google'&&<form method="post" action="/api/auth/google/logout" className="google-exit-form"><button type="submit">Sair da conta Google</button></form>}</> : <div className="login-methods">
          {googleEnabled&&<a className="gold-button login-cta" href={googleHref} target="_top">Entrar com Google <span>↗</span></a>}
          {googleEnabled&&<p className="login-method-divider">ou continue com a sua conta atual</p>}
          <a className={googleEnabled?'outline-button google-chatgpt-secondary':'gold-button login-cta'} href={chatGPTSignInPath(returnTo)} target="_top">Entrar com ChatGPT <span>↗</span></a>
         </div>}
        <p className="signin-explanation">{googleEnabled?'A conta Google cria um perfil próprio. Projetos da conta ChatGPT anterior continuam separados.':'Use o e-mail da sua conta ChatGPT.'}<br />Seus projetos ficam vinculados à sua conta.</p>{params?.google_error&&<p role="alert" className="google-login-error">Não foi possível entrar com Google. Confira sua conta ou tente novamente.</p>}
        <a className="outline-button simulator-entry-cta" href="/simulador" target="_top">CRIE SEU UNIFORME COM NOSSO SIMULADOR <span>↗</span></a>
        <div className="login-features"><p><span>01</span><span><strong>Criação com liberdade</strong>Seu uniforme, suas cores, sua identidade.</span></p><p><span>02</span><span><strong>Ideias que ganham forma</strong>Apresentações em 3D para ver cada detalhe.</span></p><p><span>03</span><span><strong>Produção conectada</strong>Desenho, lista e pedido no mesmo fluxo.</span></p></div>
      </div><p className="login-bottom">ATLAS UNIFORM STUDIO · POR ANDREI RAIMUNDI</p>
    </section>
  </main>;
}
