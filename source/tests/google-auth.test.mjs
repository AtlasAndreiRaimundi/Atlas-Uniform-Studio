import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {generateKeyPairSync,sign} from 'node:crypto';
import {migrations} from './migrations.mjs';
import {
 safeReturnTo,startGoogleLogin,validateFlow,verifyGoogleIDToken,exchangeGoogleCode,
 completeGoogleLogin,chooseGoogleRole,googleSession,revokeGoogleSession,
 sessionCookie,sessionFromHeader,clearSessionCookie
} from '../lib/google-auth.mjs';

function db(){
 const sql=new DatabaseSync(':memory:');sql.exec('PRAGMA foreign_keys=ON');
 for(const m of migrations)sql.exec(m.replaceAll('--> statement-breakpoint',''));
 return {prepare(text){const raw=sql.prepare(text);let args=[];return {
  bind(...values){args=values;return this;},
  async first(){return raw.get(...args)||null;},
  async run(){return {meta:{changes:raw.run(...args).changes}};},
  async all(){return {results:raw.all(...args)};}
 };},close(){sql.close();}};
}
const env=db=>({GOOGLE_CLIENT_ID:'atlas-123.apps.googleusercontent.com',GOOGLE_CLIENT_SECRET:'test-secret-not-real',GOOGLE_AUTH_ORIGIN:'https://studio.example.com',DB:db});
const {privateKey,publicKey}=generateKeyPairSync('rsa',{modulusLength:2048});
const jwk={...publicKey.export({format:'jwk'}),kid:'test-key-1',alg:'RS256',use:'sig'};
const encodeJson=x=>Buffer.from(JSON.stringify(x)).toString('base64url');
const token=payload=>{const header=encodeJson({alg:'RS256',kid:'test-key-1',typ:'JWT'}),body=encodeJson(payload),message=header+'.'+body;return message+'.'+sign('RSA-SHA256',Buffer.from(message),privateKey).toString('base64url');};
const signedClaims=(nonce,overrides={})=>({iss:'https://accounts.google.com',aud:'atlas-123.apps.googleusercontent.com',sub:'123456789012345678901',email:'Designer@Example.com',email_verified:true,name:'Desenhista Teste',exp:Math.floor(Date.now()/1000)+1800,iat:Math.floor(Date.now()/1000),nonce,...overrides});
const fetchGoogle=idToken=>async url=>url.includes('/certs')?{ok:true,async json(){return {keys:[jwk]};}}:{ok:true,async json(){return {id_token:idToken};}};

test('Google OAuth inicia com estado antifalsificação, nonce, PKCE e redirecionamento local',async()=>{
 const d=db(),start=await startGoogleLogin(env(d),'/pedidos?new=1'),url=new URL(start.url);
 assert.equal(url.origin,'https://accounts.google.com');
 assert.equal(url.searchParams.get('redirect_uri'),'https://studio.example.com/api/auth/google/callback');
 assert.equal(url.searchParams.get('code_challenge_method'),'S256');
 assert.equal(url.searchParams.get('scope'),'openid email profile');
 assert.match(start.cookie,/Secure; HttpOnly; SameSite=Lax/);
 const flow=validateFlow(start.cookie,url.searchParams.get('state'));
 assert.equal(flow.returnTo,'/pedidos?new=1');
 assert.equal(flow.nonce,url.searchParams.get('nonce'));
 assert.notEqual(flow.verifier,url.searchParams.get('code_challenge'));
 assert.throws(()=>validateFlow(start.cookie,'wrong-state'),{status:400});
 assert.equal(safeReturnTo('//evil.example'),'/pedidos');
 assert.equal(safeReturnTo('https://evil.example'),'/pedidos');
 assert.equal(safeReturnTo('/api/auth/google/callback'),'/pedidos');
 d.close();
});
test('código Google gera sessão própria somente após verificar assinatura e claims OIDC',async()=>{
 const d=db(),start=await startGoogleLogin(env(d),'/projects'),url=new URL(start.url);
 const flow=validateFlow(start.cookie,url.searchParams.get('state'));
 const idToken=token(signedClaims(flow.nonce));
 const identity=await exchangeGoogleCode(env(d),'code-from-google',flow.verifier,flow.nonce,{fetchImpl:fetchGoogle(idToken)});
 assert.equal(identity.userId,'google:123456789012345678901');
 assert.equal(identity.email,'designer@example.com');
 let account=await completeGoogleLogin(d,identity);
 assert.equal(account.role,null);
 assert.match(sessionCookie(account.token),/HttpOnly; SameSite=Lax/);
 let session=await googleSession(d,sessionFromHeader(sessionCookie(account.token)));
 assert.equal(session.role,null);
 session=await chooseGoogleRole(d,account.token,'designer');
 assert.equal(session.role,'designer');
 await assert.rejects(()=>chooseGoogleRole(d,account.token,'admin'),{status:400});
 const second=await completeGoogleLogin(d,{...identity,email:'updated@example.com'});
 assert.equal(second.role,'designer');
 assert.equal((await googleSession(d,second.token)).email,'updated@example.com');
 assert.equal(await googleSession(d,'invalid'),null);
 await revokeGoogleSession(d,account.token);
 assert.equal(await googleSession(d,account.token),null);
 assert.match(clearSessionCookie(),/Max-Age=0/);
 d.close();
});
test('rejeita identidade forjada, e-mail não verificado, audiência errada e nonce incorreto',async()=>{
 const nonce='nonce-verified-test';
 const ok=token(signedClaims(nonce)),fetchImpl=fetchGoogle(ok);
 assert.equal((await verifyGoogleIDToken(ok,'atlas-123.apps.googleusercontent.com',nonce,{fetchImpl})).email,'designer@example.com');
 const parts=ok.split('.'),forged=parts[0]+'.'+encodeJson({...signedClaims(nonce),email:'hijack@example.com'})+'.'+parts[2];
 await assert.rejects(()=>verifyGoogleIDToken(forged,'atlas-123.apps.googleusercontent.com',nonce,{fetchImpl}),{status:400});
 await assert.rejects(()=>verifyGoogleIDToken(ok,'atlas-123.apps.googleusercontent.com','other-nonce',{fetchImpl}),{status:400});
 await assert.rejects(()=>verifyGoogleIDToken(ok,'wrong-client',nonce,{fetchImpl}),{status:400});
 await assert.rejects(()=>verifyGoogleIDToken(token(signedClaims(nonce,{email_verified:false})),'atlas-123.apps.googleusercontent.com',nonce,{fetchImpl}),{status:400});
 await assert.rejects(()=>verifyGoogleIDToken(token(signedClaims(nonce,{exp:Math.floor(Date.now()/1000)-1})),'atlas-123.apps.googleusercontent.com',nonce,{fetchImpl}),{status:400});
});
