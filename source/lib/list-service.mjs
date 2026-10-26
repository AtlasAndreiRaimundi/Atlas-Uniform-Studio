import {preserveCatalogList} from '../public/catalog-list.js';
import {boundedJSON} from './request-security.mjs';
import {AppError} from './project-service.mjs';
import {normalizeListRow,listProblems} from '../public/order-list.js';
import {kitLabel,validProductType} from '../public/order-core.js';

const MAX=10*1024*1024;
const text=(value,max=200)=>{if(typeof value!=='string'||value.length>max)throw new AppError(400,'Um campo da lista é inválido ou muito longo.');return value;};
const source=value=>({sheet:text(value?.sheet||'',200),row:Number.isSafeInteger(value?.row)?value.row:0,text:text(value?.text||'',10000)});
export function validateList(value){
 if(!value||value.schema!==1||!Array.isArray(value.rows)||value.rows.length>5000||!Array.isArray(value.unresolved||[])||(value.unresolved||[]).length>5000)throw new AppError(400,'Use uma lista com até 5.000 itens.');
 const document={schema:1,title:text(value.title||'Nova lista',100),sourceName:text(value.sourceName||'',200),defaults:{},rows:[],unresolved:[],links:{orderId:text(value.links?.orderId||'',100),projectId:text(value.links?.projectId||'',100)}};
 if(value.defaults?.catalogVersion!==undefined){if(value.defaults.catalogVersion!==3)throw new AppError(400,'Versão do catálogo da lista inválida.');document.defaults.catalogVersion=3;}
 for(const key of ['produto','modelo','cor','grupo'])document.defaults[key]=text(value.defaults?.[key]||'',200);
 document.rows=value.rows.map(row=>{
  if(!row||typeof row!=='object')throw new AppError(400,'Confira os itens da lista.');
  const out={id:text(row.id||crypto.randomUUID(),100)};
  for(const key of ['grupo','nome','numero','adicional','tamanhoCamiseta','tamanhoCalcao','produto','modelo','cor'])out[key]=text(row[key]??'',key==='nome'?120:200);
  out.produto=normalizeListRow(out).produto;
  if(row.quantidade!==null&&(!Number.isInteger(row.quantidade)||Math.abs(row.quantidade)>99999))throw new AppError(400,'Confira a quantidade de um dos itens.');
  try{Object.assign(out,preserveCatalogList(row));}catch(e){throw new AppError(400,e.message);}out.quantidade=row.quantidade;out.source=source(row.source);
  if(!Array.isArray(row.notes||[])||(row.notes||[]).length>20)throw new AppError(400,'Confira as observações da lista.');
  out.notes=(row.notes||[]).map(note=>text(note,500));return out;
 });
 document.unresolved=(value.unresolved||[]).map(row=>{if(!row||typeof row!=='object')throw new AppError(400,'Confira os itens pendentes.');return {...source(row),id:text(row.id||crypto.randomUUID(),100),reason:text(row.reason||'',1000)};});
 if(JSON.stringify(document).length>MAX)throw new AppError(413,'A lista excede 10 MB. Divida a lista.');
 return document;
}
export async function listInput(request){
 return boundedJSON(request,{maxBytes:MAX,message:'A lista excede 10 MB.',invalid:'Não foi possível ler a lista.',empty:'Lista vazia.'});
}

export class ListService{
 constructor(db,bucket){this.db=db;this.bucket=bucket;}
 owner(user){if(!user?.userId)throw new AppError(401,'Entre na sua conta para abrir as listas.');return user.userId;}
 summary(row){return {id:row.id,title:row.title,rowCount:row.row_count,version:row.version,updatedAt:row.updated_at,projectId:row.project_id||null,orderId:row.order_id||null,reviewed:Boolean(row.reviewed_at),reviewedAt:row.reviewed_at||''};}
 async list(user,projectId=''){const owner=this.owner(user),rows=projectId?await this.db.prepare('SELECT * FROM order_lists WHERE owner_id=? AND project_id=? ORDER BY updated_at DESC LIMIT 200').bind(owner,projectId).all():await this.db.prepare('SELECT * FROM order_lists WHERE owner_id=? ORDER BY updated_at DESC LIMIT 200').bind(owner).all();return rows.results.map(row=>this.summary(row));}
 async own(user,id){const row=await this.db.prepare('SELECT * FROM order_lists WHERE id=? AND owner_id=?').bind(id,this.owner(user)).first();if(!row)throw new AppError(404,'Lista não encontrada.');return row;}
 async get(user,id){const row=await this.own(user,id),object=await this.bucket.get(row.object_key);if(!object)throw new AppError(503,'A lista está indisponível. Tente novamente.');const document=await object.json();document.links={orderId:row.order_id||'',projectId:row.project_id||''};return {...this.summary(row),document};}
 async forOrder(user,orderId){
  const owner=this.owner(user),order=await this.db.prepare('SELECT * FROM production_orders WHERE id=? AND owner_id=?').bind(orderId,owner).first();
  if(!order)throw new AppError(404,'Pedido não encontrado.');
  const object=await this.bucket.get(order.object_key);if(!object)throw new AppError(503,'O pedido está indisponível. Tente novamente.');const document=await object.json();
  if(document.workflow?.status==='released'||['checked','sent','accepted'].includes(order.production_state))throw new AppError(400,'Abra uma revisão em preparação antes de montar a lista.');
  if(document.listSource?.id){const linked=await this.db.prepare('SELECT id FROM order_lists WHERE id=? AND owner_id=? AND order_id=?').bind(document.listSource.id,owner,orderId).first();if(linked)return this.get(user,linked.id);}
  const previous=await this.db.prepare('SELECT id FROM order_lists WHERE owner_id=? AND order_id=? ORDER BY updated_at DESC LIMIT 1').bind(owner,orderId).first();if(previous)return this.get(user,previous.id);
  const listId='pedido-'+orderId;
  const first=document.pages[0],types=document.pages.flatMap(p=>p.products.map(p=>p.type)),produto=first.mode==='conjunto'&&first.products.length===2?kitLabel(first.products.map(p=>p.type)):types.includes('Camiseta')&&types.includes('Calção')?'Kit':types[0]||'Camiseta';
  if(!validProductType(produto)||types.some(type=>!type.trim()))throw new AppError(400,'Defina os nomes das peças antes de montar a lista. Use até 80 caracteres por peça do kit.');
  try{await this.save(user,null,{document:{schema:1,title:document.title.slice(0,100),sourceName:document.listSource?.name||'',defaults:{produto,...(document.technicalCatalogVersion?{catalogVersion:3}:{})},rows:document.listSource?.rows||[],unresolved:[],links:{orderId}}},listId);}
  catch(error){const concurrent=await this.db.prepare('SELECT id FROM order_lists WHERE id=? AND owner_id=? AND order_id=?').bind(listId,owner,orderId).first();if(!concurrent)throw error;}
  return this.get(user,listId);
 }
 async save(user,id,input,createdId=''){
  const owner=this.owner(user),previous=id?await this.own(user,id):null,document=validateList(input?.document);
  if(previous&&input.version!==previous.version)throw new AppError(409,'Esta lista mudou em outra aba. Exporte sua planilha ou salve como nova antes de reabrir.');
  for(const [field,table] of [['projectId','projects'],['orderId','production_orders']])if(document.links[field]){const linked=await this.db.prepare('SELECT id FROM '+table+' WHERE id=? AND owner_id=?').bind(document.links[field],owner).first();if(!linked)throw new AppError(404,'O pedido ou a apresentação escolhida não foi encontrado na sua conta.');}
  const listId=previous?.id||createdId||crypto.randomUUID(),date=new Date().toISOString(),key='order-lists/'+listId+'/'+crypto.randomUUID()+'.json';
  let reviewedAt='';
  if(input.action==='complete'){
   if(!document.title.trim()||/^nova lista$/i.test(document.title.trim())||!document.rows.length||document.unresolved.length||document.rows.some(row=>listProblems(row).length))throw new AppError(400,'Dê um nome à lista e conclua os itens e as pendências antes de marcar como conferida.');
   reviewedAt=date;
  }else if(previous?.reviewed_at){const old=await this.bucket.get(previous.object_key);if(old&&JSON.stringify(validateList(await old.json()))===JSON.stringify(document))reviewedAt=previous.reviewed_at;}
  document.review={state:reviewedAt?'checked':'draft',checkedAt:reviewedAt};
  await this.bucket.put(key,JSON.stringify(document),{httpMetadata:{contentType:'application/json'}});let row;
  try{row=previous?await this.db.prepare('UPDATE order_lists SET title=?,row_count=?,object_key=?,project_id=?,order_id=?,reviewed_at=?,version=version+1,updated_at=? WHERE id=? AND owner_id=? AND version=? RETURNING *').bind(document.title,document.rows.length,key,document.links.projectId||null,document.links.orderId||null,reviewedAt,date,listId,owner,input.version).first():await this.db.prepare('INSERT INTO order_lists (id,owner_id,title,row_count,object_key,project_id,order_id,reviewed_at,version,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,1,?,?) RETURNING *').bind(listId,owner,document.title,document.rows.length,key,document.links.projectId||null,document.links.orderId||null,reviewedAt,date,date).first();if(!row)throw new AppError(409,'Esta lista mudou em outra aba. Sua edição foi mantida neste navegador.');}
  catch(error){await this.bucket.delete(key);throw error;}
  return this.summary(row);
 }
}
