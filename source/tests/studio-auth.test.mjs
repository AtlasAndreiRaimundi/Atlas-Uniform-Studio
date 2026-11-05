import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {migrations} from './migrations.mjs';
import {registerAccount,resendVerification,verifyAccount,loginAccount,sessionAccount,logoutAccount,readSessionToken,sessionCookie} from '../lib/studio-auth.mjs';
import {fitGraphicBox} from '../public/simulador/graphic-fit.js';
import {isShirtFillPanel,paintPanelBackground} from '../public/simulador/gradient.js';
import {eliteState} from '../public/simulador/elite.js';
import {validateSimulatorState} from '../lib/simulator-validation.mjs';
import {COLORS} from '../public/simulador/catalog.js';

function db(){
 const sqlite=new DatabaseSync(':memory:');sqlite.exec('PRAGMA foreign_keys=ON');
 for(const sql of migrations)sqlite.exec(sql.replaceAll('--> statement-breakpoint',''));
 const adapter={prepare(statement){const raw=sqlite.prepare(statement);let args=[];
  return {bind(...values){args=values;return this;},async first(){return raw.get(...args)||null;},async run(){return {meta:{changes:raw.run(...args).changes}};},async all(){return {results:raw.all(...args)}}};},
  async batch(statements){const results=[];sqlite.exec('BEGIN');
   try{for(const statement of statements)results.push(await statement.run());sqlite.exec('COMMIT');return results;}
   catch(error){sqlite.exec('ROLLBACK');throw error;}
  }
 };
 return {adapter,sqlite};
}
test('professional registration verifies email before first password login and persists role',async()=>{
 const {adapter}=db(),env={RESEND_API_KEY:'dummy',AUTH_EMAIL_FROM:'conta@example.com',AUTH_APP_URL:'https://studio.example.com'};
 let verificationLink='';
 const send=async(url,request)=>{assert.equal(url,'https://api.resend.com/emails');const email=JSON.parse(request.body);assert.deepEqual(email.to,['desenhista@example.com']);verificationLink=email.html.match(/https:\/\/studio.example.com\/conta\/confirmar\?token=[0-9a-f]+/)?.[0];return {ok:true};};
 const password=['minha','senha','1234'].join('-');
 const input={name:'Desenhista Teste',email:'Desenhista@Example.com',role:'designer',password,confirmPassword:password};
 const registered=await registerAccount(adapter,env,input,{send});
 assert.match(registered.message,/Confira/);assert.ok(verificationLink);
 await assert.rejects(()=>loginAccount(adapter,{email:input.email,password:input.password}),{status:403});
 const token=new URL(verificationLink).searchParams.get('token');
 await verifyAccount(adapter,token);
 await assert.rejects(()=>verifyAccount(adapter,token),{status:400});
 const session=await loginAccount(adapter,{email:input.email,password:input.password});
 assert.equal(session.user.role,'designer');assert.equal(session.user.email,'desenhista@example.com');
 assert.equal((await sessionAccount(adapter,session.token))?.userId,session.user.userId);
 assert.equal(readSessionToken(sessionCookie(session.token)),session.token);
 await logoutAccount(adapter,session.token);
 assert.equal(await sessionAccount(adapter,session.token),null);
});
test('registration requires unique email, valid role and strong password',async()=>{
 const {adapter}=db(),env={RESEND_API_KEY:'dummy',AUTH_EMAIL_FROM:'sender@example.com',AUTH_APP_URL:'https://studio.example.com'};
 const send=async()=>({ok:true});
 const password=['senha','segura','98765'].join('-');
 const base={name:'Vendedor Teste',email:'venda@example.com',role:'vendedor',password,confirmPassword:password};
 await assert.rejects(()=>registerAccount(adapter,env,{...base,role:'administrador'},{send}),{status:400});
 await assert.rejects(()=>registerAccount(adapter,env,{...base,password:'123'},{send}),{status:400});
 await registerAccount(adapter,env,base,{send});
 await assert.rejects(()=>registerAccount(adapter,env,base,{send}),{status:409});
 assert.ok((await adapter.prepare('SELECT role FROM studio_accounts WHERE email=?').bind(base.email).first()).role==='vendedor');
 await assert.rejects(()=>resendVerification(adapter,env,{email:base.email},{send}),{status:429});
});
test('physical graphics fit keeps aspect ratio when mapped to narrow sleeve-strip panel',()=>{
 const panel={cm:{w:38,h:4}};
 const result=fitGraphicBox(450,450,1024,1024,panel,2);
 assert.ok(result.w<=450&&result.h<=450);
 assert.ok(Math.abs((result.w/1024*panel.cm.w)/(result.h/1024*panel.cm.h)-2)<1e-10);
});
test('background gradient stays restricted to untrimmed shirt panels and survives state validation',()=>{
 const state=eliteState();
 const panel=state.panels.find(p=>p.id==='front'),detail=state.panels.find(p=>p.id==='sleeve-strip-7');
 assert.equal(isShirtFillPanel(panel),true);assert.equal(isShirtFillPanel(detail),false);
 const secondary=COLORS.find(c=>c.hex!==panel.color);
 panel.gradient={toColor:secondary.hex,toColorId:secondary.id,angle:90};
 const clean=validateSimulatorState(state);
 assert.deepEqual(clean.panels.find(p=>p.id==='front').gradient,panel.gradient);
 const calls=[];const ctx={fillStyle:null,createLinearGradient(...values){calls.push(values);return {addColorStop(...stop){calls.push(stop);}}},fillRect(){}};
 paintPanelBackground(ctx,panel,100,100);assert.equal(calls.length,3);
 paintPanelBackground(ctx,detail,100,100);assert.equal(calls.length,3);
 detail.gradient=panel.gradient;assert.throws(()=>validateSimulatorState(state),{status:400});
});
