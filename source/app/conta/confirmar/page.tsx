'use client';
import {useState} from 'react';
export default function VerifyAccount(){
 const [busy,setBusy]=useState(false),[result,setResult]=useState(''),[error,setError]=useState('');
 async function verify(){
  setBusy(true);setError('');
  try{
   const token=new URLSearchParams(location.search).get('token');
   const response=await fetch('/api/auth/verify',{method:'POST',headers:{'Content-Type':'application/json'},credentials:'same-origin',body:JSON.stringify({token})});
   const data=await response.json();
   if(!response.ok)throw new Error(data.error||'Não foi possível confirmar o cadastro.');
   setResult(data.message||'Cadastro confirmado.');
  }catch(e){setError(e instanceof Error?e.message:'Erro ao confirmar.');}
  finally{setBusy(false);}
 }
 return <main style={{minHeight:'100vh',display:'grid',placeItems:'center',padding:24,background:'#171717',color:'#f1eee7'}}>
  <section style={{width:'100%',maxWidth:490,padding:28,background:'#242424',border:'1px solid #514a3d',borderRadius:12}}>
   <p style={{fontSize:11,color:'#d1b67e',letterSpacing:1}}>ATLAS UNIFORM STUDIO</p>
   <h1 style={{fontSize:28,margin:'15px 0'}}>Confirmar seu cadastro</h1>
   <p style={{lineHeight:1.7,fontSize:13}}>Clique para validar o e-mail e ativar seu acesso como desenhista ou vendedor.</p>
   {!result&&<button onClick={verify} disabled={busy} style={{marginTop:15,padding:'13px 18px',background:'#d1b67e',color:'#171717',borderRadius:5}}>{busy?'Confirmando...':'Confirmar meu e-mail'}</button>}
   {result&&<p role="status" style={{color:'#9be3a7'}}>{result}</p>}
   {error&&<p role="alert" style={{color:'#f9a6a6'}}>{error}</p>}
   <p style={{marginTop:24}}><a href="/login" style={{color:'#d1b67e'}}>Ir para o login →</a></p>
  </section>
 </main>;
}
