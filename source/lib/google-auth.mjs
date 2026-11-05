// ATLAS: Google OpenID Connect. No user passwords or Google API tokens are stored.
const GOOGLE_AUTH='https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_TOKEN='https://oauth2.googleapis.com/token';
const GOOGLE_JWKS='https://www.googleapis.com/oauth2/v3/certs';
const COOKIE_FLOW='__Host-atlas_google_flow';
const COOKIE_SESSION='__Host-atlas_google_session';
const SESSION_SECONDS=7*24*60*60;
const FLOW_SECONDS=10*60;

export class GoogleAuthError extends Error {
  constructor(status,message){super(message);this.status=status;}
}
const fail=(message='Não foi possível concluir a autenticação Google.',status=400)=>{throw new GoogleAuthError(status,message);};
const encode=(bytes)=>btoa(String.fromCharCode(...bytes)).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
const decode=(value)=>{
  if(typeof value!=='string'||!/^[A-Za-z0-9_-]+$/.test(value)||value.length>16000)fail();
  const str=atob(value.replace(/-/g,'+').replace(/_/g,'/')+'='.repeat((4-value.length%4)%4));
  return Uint8Array.from(str,c=>c.charCodeAt(0));
};
const randomToken=()=>{const bytes=new Uint8Array(32);crypto.getRandomValues(bytes);return encode(bytes);};
const sha256=async value=>new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value)));
const hash=async value=>Array.from(await sha256(value),b=>b.toString(16).padStart(2,'0')).join('');
const jsonB64=value=>encode(new TextEncoder().encode(JSON.stringify(value)));
const fromJsonB64=value=>JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(decode(value)));
export function safeReturnTo(value){
 if(typeof value!=='string'||value.length>1200||!value.startsWith('/')||value.startsWith('//')||value.includes('\\'))return '/pedidos';
 try{
  const url=new URL(value,'https://atlas.invalid');
  if(url.origin!=='https://atlas.invalid'||/^\/(?:login|signin-with-chatgpt|signout-with-chatgpt|callback|conta\/configurar)(?:\/|$)/.test(url.pathname)||url.pathname.startsWith('/api/auth/'))return '/pedidos';
  return url.pathname+url.search+url.hash;
 }catch{return '/pedidos';}
}
export function configured(env){
 try{
  const origin=new URL(env?.GOOGLE_AUTH_ORIGIN||'');
  return Boolean(env?.GOOGLE_CLIENT_ID&&env?.GOOGLE_CLIENT_SECRET&&env?.DB&&origin.protocol==='https:'&&!origin.username&&!origin.password&&!origin.search&&!origin.hash&&origin.pathname==='/');
 }catch{return false;}
}
export function config(env){
 if(!configured(env))fail('O login com Google ainda não está configurado.',503);
 return {clientId:env.GOOGLE_CLIENT_ID,secret:env.GOOGLE_CLIENT_SECRET,origin:new URL(env.GOOGLE_AUTH_ORIGIN).origin};
}
export function callbackURL(cfg){return cfg.origin+'/api/auth/google/callback';}
export function cookieValue(header,name){
 const pair=(header||'').split(';').map(s=>s.trim()).find(s=>s.startsWith(name+'='));
 return pair?pair.slice(name.length+1):null;
}
const cookie=(name,value,maxAge)=>`${name}=${value}; Path=/; Max-Age=${maxAge}; Secure; HttpOnly; SameSite=Lax`;
export const flowCookie=value=>cookie(COOKIE_FLOW,value,FLOW_SECONDS);
export const clearFlowCookie=()=>cookie(COOKIE_FLOW,'',0);
export const sessionCookie=value=>cookie(COOKIE_SESSION,value,SESSION_SECONDS);
export const clearSessionCookie=()=>cookie(COOKIE_SESSION,'',0);
export const flowFromHeader=header=>cookieValue(header,COOKIE_FLOW);
export const sessionFromHeader=header=>cookieValue(header,COOKIE_SESSION);
export async function startGoogleLogin(env,returnTo){
 const cfg=config(env),state=randomToken(),nonce=randomToken(),verifier=randomToken();
 const challenge=encode(await sha256(verifier));
 const flow=jsonB64({state,nonce,verifier,issued:Date.now(),returnTo:safeReturnTo(returnTo)});
 const url=new URL(GOOGLE_AUTH);
 for(const [key,value] of Object.entries({response_type:'code',client_id:cfg.clientId,redirect_uri:callbackURL(cfg),scope:'openid email profile',state,nonce,code_challenge:challenge,code_challenge_method:'S256',prompt:'select_account'}))url.searchParams.set(key,value);
 return {url:url.toString(),cookie:flowCookie(flow)};
}
export function validateFlow(header,state){
 let payload;
 try{payload=fromJsonB64(flowFromHeader(header));}catch{fail('A tentativa de login expirou. Comece novamente.');}
 if(!payload||typeof state!=='string'||state.length<20||payload.state!==state||!Number.isFinite(payload.issued)||payload.issued>Date.now()+30_000||Date.now()-payload.issued>FLOW_SECONDS*1000||!/^[A-Za-z0-9_-]{30,100}$/.test(payload.nonce)||!/^[A-Za-z0-9_-]{30,100}$/.test(payload.verifier))fail('A tentativa de login expirou. Comece novamente.');
 return payload;
}
export async function verifyGoogleIDToken(idToken,clientId,expectedNonce,{fetchImpl=fetch,now=Math.floor(Date.now()/1000)}={}){
 if(typeof idToken!=='string'||idToken.length>12000)fail('Token Google inválido.');
 const parts=idToken.split('.');
 if(parts.length!==3)fail('Token Google inválido.');
 let header,claims;
 try{header=fromJsonB64(parts[0]);claims=fromJsonB64(parts[1]);}catch{fail('Token Google inválido.');}
 if(header?.alg!=='RS256'||typeof header.kid!=='string'||header.kid.length>256||header.crit||claims?.iss!=='https://accounts.google.com'&&claims?.iss!=='accounts.google.com'||claims?.aud!==clientId||typeof claims?.exp!=='number'||claims.exp<=now||typeof claims?.iat!=='number'||claims.iat>now+60||claims.iat<now-3600||claims.nonce!==expectedNonce||claims.email_verified!==true||typeof claims.sub!=='string'||!/^\d{8,32}$/.test(claims.sub)||typeof claims.email!=='string'||claims.email.length>254||!/^\S+@\S+\.\S+$/.test(claims.email))fail('A identidade Google não pôde ser validada.');
 let keys;
 try{const response=await fetchImpl(GOOGLE_JWKS,{headers:{Accept:'application/json'}});if(!response.ok)fail();keys=(await response.json()).keys;}catch{fail('Não foi possível validar a assinatura Google.',503);}
 const jwk=Array.isArray(keys)?keys.find(k=>k.kid===header.kid&&k.kty==='RSA'&&(!k.use||k.use==='sig')&&(!k.alg||k.alg==='RS256')):null;
 if(!jwk)fail('Chave de assinatura Google não encontrada.');
 let verified=false;
 try{
  const publicKey=await crypto.subtle.importKey('jwk',jwk,{name:'RSASSA-PKCS1-v1_5',hash:'SHA-256'},false,['verify']);
  verified=await crypto.subtle.verify('RSASSA-PKCS1-v1_5',publicKey,decode(parts[2]),new TextEncoder().encode(parts[0]+'.'+parts[1]));
 }catch{fail('Assinatura Google inválida.');}
 if(!verified)fail('Assinatura Google inválida.');
 return {userId:'google:'+claims.sub,email:claims.email.toLowerCase(),displayName:String(claims.name||claims.email).slice(0,140)};
}
export async function exchangeGoogleCode(env,code,verifier,expectedNonce,{fetchImpl=fetch}={}){
 const cfg=config(env);
 if(typeof code!=='string'||code.length>4096||!code)fail('Código Google inválido.');
 let response;
 try{response=await fetchImpl(GOOGLE_TOKEN,{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded',Accept:'application/json'},body:new URLSearchParams({code,code_verifier:verifier,client_id:cfg.clientId,client_secret:cfg.secret,redirect_uri:callbackURL(cfg),grant_type:'authorization_code'})});}catch{fail('Não foi possível contactar o Google.',502);}
 if(!response.ok)fail('O Google recusou o código de autenticação.');
 const body=await response.json().catch(()=>null);
 if(!body||typeof body.id_token!=='string')fail('O Google não retornou uma identidade válida.');
 return verifyGoogleIDToken(body.id_token,cfg.clientId,expectedNonce,{fetchImpl});
}
export async function completeGoogleLogin(db,identity){
 if(!db)fail('Banco de dados indisponível.',503);
 const now=new Date().toISOString(),token=randomToken(),digest=await hash(token),expiresAt=Date.now()+SESSION_SECONDS*1000;
 // Upsert by Google subject only: never link accounts using mutable email addresses.
 await db.prepare('INSERT INTO google_accounts (id,email,display_name,role,created_at,updated_at) VALUES (?,?,?,NULL,?,?) ON CONFLICT(id) DO UPDATE SET email=excluded.email,display_name=excluded.display_name,updated_at=excluded.updated_at').bind(identity.userId,identity.email,identity.displayName,now,now).run();
 await db.prepare('INSERT INTO google_sessions (token_hash,user_id,expires_at,created_at) VALUES (?,?,?,?)').bind(digest,identity.userId,expiresAt,now).run();
 const account=await db.prepare('SELECT role FROM google_accounts WHERE id=?').bind(identity.userId).first();
 return {token,role:account?.role||null};
}
export async function googleSession(db,token){
 if(!db||typeof token!=='string'||!/^[A-Za-z0-9_-]{43}$/.test(token))return null;
 const row=await db.prepare('SELECT a.id AS userId,a.email,a.display_name AS displayName,a.role FROM google_sessions s JOIN google_accounts a ON a.id=s.user_id WHERE s.token_hash=? AND s.expires_at>?').bind(await hash(token),Date.now()).first();
 if(!row)return null;
 return {userId:row.userId,displayName:row.displayName,email:row.email,fullName:row.displayName,role:row.role,provider:'google'};
}
export async function chooseGoogleRole(db,token,role){
 if(!['designer','vendedor'].includes(role))fail('Escolha Designer ou Vendedor.');
 const session=await googleSession(db,token);if(!session)fail('Sua sessão expirou. Entre novamente.',401);
 await db.prepare('UPDATE google_accounts SET role=?,updated_at=? WHERE id=? AND role IS NULL').bind(role,new Date().toISOString(),session.userId).run();
 return googleSession(db,token);
}
export async function revokeGoogleSession(db,token){
 if(!db||typeof token!=='string'||!/^[A-Za-z0-9_-]{43}$/.test(token))return;
 await db.prepare('DELETE FROM google_sessions WHERE token_hash=?').bind(await hash(token)).run();
}
