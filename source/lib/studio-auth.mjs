import {AppError} from './project-service.mjs';

export const STUDIO_COOKIE='atlas_session';
const ITERATIONS=310_000,SESSION_DAYS=7,VERIFY_HOURS=24;
const encoder=new TextEncoder();
const iso=ms=>new Date(ms).toISOString();
const randomToken=bytes=>Array.from(crypto.getRandomValues(new Uint8Array(bytes)),byte=>byte.toString(16).padStart(2,'0')).join('');
const bytesHex=bytes=>Array.from(new Uint8Array(bytes),v=>v.toString(16).padStart(2,'0')).join('');
const fromHex=hex=>new Uint8Array((hex.match(/.{2}/g)||[]).map(v=>parseInt(v,16)));
const nowMs=()=>Date.now();
async function sha256(value){return bytesHex(await crypto.subtle.digest('SHA-256',encoder.encode(value)));}
function cleanEmail(raw){
 if(typeof raw!=='string')throw new AppError(400,'Informe um e-mail válido.');
 const email=raw.trim().toLowerCase();
 if(email.length>254||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))throw new AppError(400,'Informe um e-mail válido.');
 return email;
}
function validPassword(value){
 if(typeof value!=='string'||value.length<12||value.length>128||!/[A-Za-z]/.test(value)||!/[0-9]/.test(value))throw new AppError(400,'Crie uma senha com 12 a 128 caracteres, incluindo letras e números.');
 return value;
}
function profile(row){
 return {userId:'studio:'+row.id,displayName:row.display_name,email:row.email,fullName:row.display_name,role:row.role,provider:'studio'};
}
async function derived(password,salt,iterations=ITERATIONS){
 const material=await crypto.subtle.importKey('raw',encoder.encode(password),'PBKDF2',false,['deriveBits']);
 return bytesHex(await crypto.subtle.deriveBits({name:'PBKDF2',salt:fromHex(salt),iterations,hash:'SHA-256'},material,256));
}
function equals(a,b){
 if(typeof a!=='string'||typeof b!=='string'||a.length!==b.length)return false;
 let diff=0;for(let i=0;i<a.length;i++)diff|=a.charCodeAt(i)^b.charCodeAt(i);
 return diff===0;
}
async function limit(db,action,key,max,minutes){
 const hash=await sha256(action+':'+key),now=iso(nowMs()),reset=iso(nowMs()+minutes*60_000);
 await db.prepare('INSERT INTO studio_auth_limits (key,attempts,reset_at) VALUES (?,1,?) ON CONFLICT(key) DO UPDATE SET attempts=CASE WHEN reset_at<=? THEN 1 ELSE attempts+1 END,reset_at=CASE WHEN reset_at<=? THEN excluded.reset_at ELSE reset_at END').bind(hash,reset,now,now).run();
 const row=await db.prepare('SELECT attempts FROM studio_auth_limits WHERE key=?').bind(hash).first();
 if(row.attempts>max)throw new AppError(429,'Muitas tentativas. Aguarde antes de tentar novamente.');
}
async function sendVerification(env,email,token,{send=globalThis.fetch}={}){
 if(!env.RESEND_API_KEY||!env.AUTH_EMAIL_FROM||!env.AUTH_APP_URL)throw new AppError(503,'A confirmação por e-mail ainda não está configurada pelo administrador.');
 const base=new URL(env.AUTH_APP_URL);
 if(base.protocol!=='https:'&&!['localhost','127.0.0.1'].includes(base.hostname))throw new AppError(503,'O endereço seguro do estúdio não está configurado.');
 const link=new URL('/conta/confirmar',base);link.searchParams.set('token',token);
 const response=await send('https://api.resend.com/emails',{method:'POST',headers:{Authorization:'Bearer '+env.RESEND_API_KEY,'Content-Type':'application/json'},body:JSON.stringify({from:env.AUTH_EMAIL_FROM,to:[email],subject:'Confirme seu e-mail — ATLAS Uniform Studio',html:`<div style="font-family:Arial,sans-serif;color:#1b1b1b"><h2>Confirme seu e-mail</h2><p>Para ativar sua conta no ATLAS Uniform Studio, confirme seu endereço de e-mail no link abaixo.</p><p><a href="${link.toString()}">Confirmar meu cadastro</a></p><p>O link expira em 24 horas. Se você não pediu o cadastro, ignore esta mensagem.</p></div>`})});
 if(!response.ok)throw new AppError(503,'O e-mail de confirmação não pôde ser enviado. Tente reenviar mais tarde.');
}
async function verification(db,accountId,email,env,options){
 const token=randomToken(32),hash=await sha256(token),now=nowMs();
 await db.prepare('DELETE FROM studio_verifications WHERE account_id=?').bind(accountId).run();
 await db.prepare('INSERT INTO studio_verifications (token_hash,account_id,expires_at,created_at) VALUES (?,?,?,?)').bind(hash,accountId,iso(now+VERIFY_HOURS*3600000),iso(now)).run();
 await db.prepare('UPDATE studio_accounts SET last_verification_sent_at=?,updated_at=? WHERE id=?').bind(iso(now),iso(now),accountId).run();
 await sendVerification(env,email,token,options);
}
export async function registerAccount(db,env,input,options={}){
 if(!db)throw new AppError(503,'O armazenamento de contas não está disponível.');
 if(!env.RESEND_API_KEY||!env.AUTH_EMAIL_FROM||!env.AUTH_APP_URL)throw new AppError(503,'O cadastro aguarda a configuração do serviço de confirmação por e-mail.');
 const email=cleanEmail(input?.email),name=String(input?.name??'').trim(),role=input?.role,password=validPassword(input?.password);
 if(name.length<2||name.length>80)throw new AppError(400,'Informe o seu nome com 2 a 80 caracteres.');
 if(!['designer','vendedor'].includes(role))throw new AppError(400,'Escolha Designer ou Vendedor.');
 if(input?.confirmPassword!==password)throw new AppError(400,'A confirmação de senha não confere.');
 await limit(db,'registration',options.ip||email,5,60);
 const existing=await db.prepare('SELECT id,verified_at,last_verification_sent_at FROM studio_accounts WHERE email=?').bind(email).first();
 if(existing)throw new AppError(409,'Este e-mail já está cadastrado. Entre na conta ou solicite uma nova confirmação.');
 const salt=randomToken(16),hash=await derived(password,salt),id=crypto.randomUUID(),now=iso(nowMs());
 try{await db.prepare('INSERT INTO studio_accounts (id,email,display_name,role,password_salt,password_hash,password_iterations,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?)').bind(id,email,name,role,salt,hash,ITERATIONS,now,now).run();}
 catch{throw new AppError(409,'Este e-mail já está cadastrado.');}
 await verification(db,id,email,env,options);
 return {message:'Cadastro criado. Confira seu e-mail para ativar a conta. Você só poderá entrar depois da confirmação.'};
}
export async function resendVerification(db,env,input,options={}){
 const email=cleanEmail(input?.email);
 await limit(db,'resend',options.ip||email,5,60);
 const row=await db.prepare('SELECT id,verified_at,last_verification_sent_at FROM studio_accounts WHERE email=?').bind(email).first();
 const message='Se este e-mail tiver um cadastro pendente, enviaremos um novo link de confirmação.';
 if(!row||row.verified_at)return {message};
 if(row.last_verification_sent_at&&nowMs()-Date.parse(row.last_verification_sent_at)<60_000)throw new AppError(429,'Aguarde um minuto antes de reenviar.');
 await verification(db,row.id,email,env,options);return {message};
}
export async function verifyAccount(db,token){
 if(typeof token!=='string'||!/^[a-f0-9]{64}$/.test(token))throw new AppError(400,'Link de confirmação inválido.');
 const hash=await sha256(token),row=await db.prepare('SELECT v.account_id,a.verified_at FROM studio_verifications v JOIN studio_accounts a ON a.id=v.account_id WHERE v.token_hash=? AND v.expires_at>?').bind(hash,iso(nowMs())).first();
 if(!row)throw new AppError(400,'O link expirou ou já foi usado. Solicite uma nova confirmação.');
 const now=iso(nowMs());await db.batch([
  db.prepare('UPDATE studio_accounts SET verified_at=COALESCE(verified_at,?),updated_at=? WHERE id=?').bind(now,now,row.account_id),
  db.prepare('DELETE FROM studio_verifications WHERE account_id=?').bind(row.account_id)
 ]);
 return {message:'E-mail confirmado. Sua conta está pronta para entrar.'};
}
export async function loginAccount(db,input,{ip=''}={}){
 const email=cleanEmail(input?.email),password=String(input?.password??'');
 await limit(db,'login',email,12,15);
 if(ip)await limit(db,'login-ip',ip,60,15);
 const account=await db.prepare('SELECT * FROM studio_accounts WHERE email=?').bind(email).first();
 // Always run password derivation to reduce timing differences for unknown accounts.
 const salt=account?.password_salt??'00'.repeat(16);
 const candidate=await derived(password.slice(0,128),salt,account?.password_iterations??ITERATIONS);
 if(!account||!equals(candidate,account.password_hash))throw new AppError(401,'E-mail ou senha incorretos.');
 if(!account.verified_at)throw new AppError(403,'Confirme o e-mail antes de entrar. Você pode pedir um novo link.');
 const token=randomToken(32),hash=await sha256(token),now=nowMs(),expires=iso(now+SESSION_DAYS*24*3600000);
 await db.prepare('INSERT INTO studio_sessions (token_hash,account_id,expires_at,created_at) VALUES (?,?,?,?)').bind(hash,account.id,expires,iso(now)).run();
 return {token,user:profile(account),expiresAt:expires};
}
export async function sessionAccount(db,token){
 if(!db||typeof token!=='string'||!/^[a-f0-9]{64}$/.test(token))return null;
 const hash=await sha256(token);
 const row=await db.prepare('SELECT a.* FROM studio_sessions s JOIN studio_accounts a ON a.id=s.account_id WHERE s.token_hash=? AND s.expires_at>? AND a.verified_at IS NOT NULL').bind(hash,iso(nowMs())).first();
 return row?profile(row):null;
}
export async function logoutAccount(db,token){
 if(!db||typeof token!=='string'||!/^[a-f0-9]{64}$/.test(token))return;
 await db.prepare('DELETE FROM studio_sessions WHERE token_hash=?').bind(await sha256(token)).run();
}
export function readSessionToken(cookieHeader=''){
 const name=STUDIO_COOKIE+'=';
 const match=cookieHeader.split(';').map(v=>v.trim()).find(v=>v.startsWith(name));
 return match?match.slice(name.length):null;
}
export function sessionCookie(token,{secure=true}={}){
 return STUDIO_COOKIE+'='+token+'; Path=/; Max-Age='+SESSION_DAYS*24*3600+'; HttpOnly; SameSite=Lax'+(secure?'; Secure':'');
}
export function clearSessionCookie({secure=true}={}){
 return STUDIO_COOKIE+'=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax'+(secure?'; Secure':'');
}
