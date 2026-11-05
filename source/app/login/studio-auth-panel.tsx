'use client';
import {useState} from 'react';
import './studio-auth.css';
type Mode='login'|'register'|'resend';
function safeReturn(){
 const value=new URLSearchParams(window.location.search).get('return_to')||'/pedidos';
 return value.startsWith('/')&&!value.startsWith('//')&&!value.startsWith('/\\')?value:'/pedidos';
}
export default function StudioAuthPanel(){
 const [mode,setMode]=useState<Mode>('login'),[name,setName]=useState(''),[email,setEmail]=useState(''),
 [password,setPassword]=useState(''),[confirmPassword,setConfirmPassword]=useState(''),
 [role,setRole]=useState<'designer'|'vendedor'>('designer'),[busy,setBusy]=useState(false),
 [error,setError]=useState(''),[message,setMessage]=useState('');
 function show(next:Mode){setMode(next);setError('');setMessage('');setPassword('');setConfirmPassword('');}
 async function submit(e:React.FormEvent){
  e.preventDefault();if(busy)return;setBusy(true);setError('');setMessage('');
  const endpoint=mode==='login'?'login':mode==='register'?'register':'resend';
  try{
   const response=await fetch('/api/auth/'+endpoint,{method:'POST',cache:'no-store',
    credentials:'same-origin',headers:{'Content-Type':'application/json'},
    body:JSON.stringify(mode==='login'?{email,password}:mode==='register'?{name,email,password,confirmPassword,role}:{email})});
   const data=await response.json();
   if(!response.ok)throw new Error(data.error||'Não foi possível continuar.');
   if(mode==='login'){window.location.assign(safeReturn());return;}
   setPassword('');setConfirmPassword('');setMessage(data.message||'Confira seu e-mail.');
  }catch(e){setError(e instanceof Error?e.message:'Não foi possível continuar.');}
  finally{setBusy(false);}
 }
 return <div className="studio-auth">
  <div className="studio-auth-tabs" role="group" aria-label="Acesso ao estúdio">
   <button type="button" className={mode==='login'?'active':''} onClick={()=>show('login')}>Entrar</button>
   <button type="button" className={mode==='register'?'active':''} onClick={()=>show('register')}>Criar cadastro</button>
  </div>
  <form onSubmit={submit} autoComplete="on">
   {mode==='register'&&<label>Nome completo<input autoComplete="name" minLength={2} maxLength={80} value={name} onChange={e=>setName(e.target.value)} required/></label>}
   <label>E-mail<input type="email" autoComplete="email" maxLength={254} value={email} onChange={e=>setEmail(e.target.value)} required/></label>
   {mode==='register'&&<label>Tipo de cadastro<select value={role} onChange={e=>setRole(e.target.value as 'designer'|'vendedor')}><option value="designer">Desenhista / Designer</option><option value="vendedor">Vendedor</option></select></label>}
   {mode!=='resend'&&<label>Senha<input type="password" autoComplete={mode==='register'?'new-password':'current-password'} minLength={mode==='register'?12:1} maxLength={128} value={password} onChange={e=>setPassword(e.target.value)} required/></label>}
   {mode==='register'&&<><label>Confirme a senha<input type="password" autoComplete="new-password" minLength={12} maxLength={128} value={confirmPassword} onChange={e=>setConfirmPassword(e.target.value)} required/></label><p className="studio-auth-hint">Use pelo menos 12 caracteres, com letras e números. O acesso será liberado somente após confirmar seu e-mail.</p></>}
   {error&&<p role="alert" className="studio-auth-error">{error}</p>}
   {message&&<p role="status" className="studio-auth-success">{message}</p>}
   <button type="submit" className="gold-button login-cta" disabled={busy}>{busy?'Processando...':mode==='login'?'Entrar no estúdio':mode==='register'?'Criar cadastro e confirmar e-mail':'Reenviar confirmação'} <span>↗</span></button>
  </form>
  <div className="studio-auth-links">{mode==='login'&&<button type="button" onClick={()=>show('resend')}>Ainda não confirmou seu e-mail?</button>}{mode==='resend'&&<button type="button" onClick={()=>show('login')}>Voltar ao login</button>}{mode==='register'&&<button type="button" onClick={()=>show('login')}>Já tenho cadastro</button>}</div>
 </div>;
}
