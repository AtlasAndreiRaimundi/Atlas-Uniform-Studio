import {AppError} from './project-service.mjs';
import {isAdminUser} from './admin-auth.mjs';
import {releaseProblems} from '../public/production-core.js';
import {orderPreviewSVG} from '../public/production-sheet.js';
export const localDay=value=>{const parts=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date(value));return ['year','month','day'].map(type=>parts.find(p=>p.type===type).value).join('-');};
export function trackingOf(row,document=null){
 let tracking={};try{tracking=JSON.parse(row.tracking_json||'{}');}catch{}
 const stage=row.production_state||(document?.workflow?.status==='released'?'checked':'draft');
 return {...tracking,stage,checkedAt:tracking.checkedAt||(stage==='checked'?document?.workflow?.releasedAt:null),revision:tracking.revision||document?.workflow?.revision||1,events:tracking.events||[]};
}
export const reminderDue=(tracking,now=new Date())=>tracking.stage==='checked'&&Boolean(tracking.checkedAt)&&localDay(tracking.checkedAt)<localDay(now);
const safeText=(value,max=1000)=>{if(typeof value!=='string'||value.trim().length>max)throw new AppError(400,'Confira as informações do envio.');return value.trim();};
export class OrderTrackingService{
 constructor(db,bucket,production,adminId=''){Object.assign(this,{db,bucket,production,adminId});}
 owner(user){return this.production.owner(user);}
 async factoryAllowed(user){const id=this.owner(user);if(isAdminUser(user,this.adminId))return true;const row=await this.db.prepare('SELECT factory_access FROM profiles WHERE user_id=?').bind(id).first();return row?.factory_access===1;}
 async requireFactory(user){if(!await this.factoryAllowed(user))throw new AppError(403,'O aceite é reservado à equipe da fábrica autorizada pelo administrador.');}
 async summary(row){
  let document=null;if(!row.production_state){const object=await this.bucket.get(row.object_key);if(!object)throw new AppError(503,'Um pedido está indisponível. Tente novamente.');document=await object.json();}
  return {...this.production.summary(row),tracking:trackingOf(row,document),designer:row.designer_name||'',city:row.city||'',store:row.store||''};
 }
 async list(user,{factory=false,page=0}={}){
  const owner=this.owner(user);if(factory)await this.requireFactory(user);page=Number(page);if(!Number.isSafeInteger(page)||page<0||page>100000)throw new AppError(400,'Página inválida.');
  const where=factory?"o.production_state IN ('sent','accepted','returned')":'o.owner_id=?',args=factory?[]:[owner];
  const count=await this.db.prepare('SELECT COUNT(*) AS total FROM production_orders o WHERE '+where).bind(...args).first();
  const rows=await this.db.prepare("SELECT o.*,p.display_name AS designer_name,json_extract(p.details_json,'$.city') AS city,json_extract(p.details_json,'$.store') AS store FROM production_orders o LEFT JOIN profiles p ON p.user_id=o.owner_id WHERE "+where+' ORDER BY o.updated_at DESC,o.id LIMIT 100 OFFSET ?').bind(...args,page*100).all();
  return {orders:await Promise.all(rows.results.map(row=>this.summary(row))),total:count.total,page,hasMore:(page+1)*100<count.total,factoryAccess:await this.factoryAllowed(user),isAdmin:isAdminUser(user,this.adminId)};
 }
 async detail(user,id,{factory=false}={}){
  let row;if(factory){await this.requireFactory(user);row=await this.db.prepare("SELECT * FROM production_orders WHERE id=? AND production_state IN ('sent','accepted','returned')").bind(id).first();if(!row)throw new AppError(404,'Pedido não encontrado na fábrica.');}else row=await this.production.own(user,id);
  const object=await this.bucket.get(row.object_key);if(!object)throw new AppError(503,'Pedido indisponível.');return {...this.production.summary(row),document:await object.json()};
 }
 /** @param {{factory?: boolean,version?: string|number|null}} [options] */
 async preview(user,id,options={}){
  const {factory=false,version=null}=options;
  const order=await this.detail(user,id,{factory});if(version!==null&&String(order.version)!==String(version))throw new AppError(409,'O pedido mudou. Atualize a lista para ver a prévia atual.');
  return orderPreviewSVG(order.document);
 }
 async transition(user,id,input){
  this.owner(user);const action=input?.action,factory=['accept','return'].includes(action);let row;
  if(factory){await this.requireFactory(user);row=await this.db.prepare('SELECT * FROM production_orders WHERE id=?').bind(id).first();if(!row)throw new AppError(404,'Pedido não encontrado.');}else row=await this.production.own(user,id);
  if(!Number.isSafeInteger(input.version)||input.version!==row.version)throw new AppError(409,'O pedido mudou. Atualize o painel antes de continuar.');
  const object=await this.bucket.get(row.object_key);if(!object)throw new AppError(503,'Pedido indisponível.');const document=await object.json(),tracking=trackingOf(row,document),at=new Date().toISOString();
  const note=safeText(input.note||''),protocol=safeText(input.protocol||'',100);
  const profile=await this.db.prepare('SELECT display_name FROM profiles WHERE user_id=?').bind(user.userId).first();const actor=profile?.display_name||user.fullName||'Usuário';
  if(action==='send'){
   if(tracking.stage!=='checked'||document.workflow?.status!=='released')throw new AppError(400,'Confira e libere esta revisão antes de enviar.');
   const problems=releaseProblems(document);if(problems.length)throw new AppError(400,problems.join(' '));
   tracking.stage='sent';tracking.sentAt=at;tracking.sentBy=actor;tracking.sentById=user.userId;tracking.protocol=protocol;tracking.note=note;tracking.submittedRevision=document.workflow.revision;
  }else if(action==='accept'){
   if(tracking.stage!=='sent')throw new AppError(400,'Somente pedidos enviados e aguardando aceite podem ser aceitos.');
   tracking.stage='accepted';tracking.acceptedAt=at;tracking.acceptedBy=actor;tracking.acceptedById=user.userId;tracking.acceptanceNote=note;
  }else if(action==='return'){
   if(tracking.stage!=='sent')throw new AppError(400,'Somente pedidos aguardando aceite podem ser devolvidos.');
   if(!note)throw new AppError(400,'Informe o motivo da devolução.');tracking.stage='returned';tracking.returnedAt=at;tracking.returnedBy=actor;tracking.returnReason=note;
  }else throw new AppError(400,'Ação inválida.');
  tracking.events=[...(tracking.events||[]),{action,at,by:actor,byId:user.userId,revision:document.workflow?.revision||1,note,protocol}];
  const updated=await this.db.prepare('UPDATE production_orders SET production_state=?,tracking_json=?,version=version+1,updated_at=? WHERE id=? AND owner_id=? AND version=? RETURNING *').bind(tracking.stage,JSON.stringify(tracking),at,id,row.owner_id,input.version).first();if(!updated)throw new AppError(409,'O pedido mudou. Atualize o painel.');
  return this.summary(updated);
 }
 async reminders(user,now=new Date()){
  const owner=this.owner(user),rows=await this.db.prepare("SELECT * FROM production_orders WHERE owner_id=? AND (production_state='checked' OR production_state='') ORDER BY updated_at").bind(owner).all();
  const all=await Promise.all(rows.results.map(row=>this.summary(row))),due=all.filter(order=>reminderDue(order.tracking,now));
  const receipt=await this.db.prepare('SELECT seen_on FROM order_reminder_receipts WHERE user_id=?').bind(owner).first();
  return {orders:due,show:due.length>0&&receipt?.seen_on!==localDay(now),day:localDay(now)};
 }
 async dismissReminder(user){const owner=this.owner(user);await this.db.prepare('INSERT INTO order_reminder_receipts (user_id,seen_on) VALUES (?,?) ON CONFLICT(user_id) DO UPDATE SET seen_on=excluded.seen_on RETURNING user_id').bind(owner,localDay(new Date())).first();return {ok:true};}
 async members(user){if(!isAdminUser(user,this.adminId))throw new AppError(403,'Somente o administrador pode autorizar a equipe da fábrica.');return (await this.db.prepare("SELECT user_id AS id,display_name AS name,factory_access AS factoryAccess,json_extract(details_json,'$.city') AS city,json_extract(details_json,'$.store') AS store FROM profiles ORDER BY display_name").all()).results;}
 async setMember(user,input){await this.members(user);if(typeof input?.enabled!=='boolean'||typeof input.id!=='string')throw new AppError(400,'Selecione o usuário e a permissão.');const row=await this.db.prepare('UPDATE profiles SET factory_access=? WHERE user_id=? RETURNING user_id').bind(input.enabled?1:0,input.id).first();if(!row)throw new AppError(404,'Usuário não encontrado.');return {ok:true};}
}
