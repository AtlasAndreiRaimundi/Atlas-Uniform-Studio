import {AppError} from './project-service.mjs';
import {complementDocument} from '../public/production-core.js';
import {createHash} from 'node:crypto';

const MAX_CDR=20*1024*1024;
export class OrderTechnicalService{
 constructor(db,bucket,production,tracking){Object.assign(this,{db,bucket,production,tracking});}
 async authorizeUpload(user,id){const row=await this.production.own(user,id);if(['checked','sent','accepted'].includes(row.production_state))throw new AppError(400,'Abra uma nova revisão para alterar os arquivos técnicos.');return row;}
 async editable(user,id,version){
  const order=await this.production.get(user,id);
  if(!Number.isSafeInteger(version)||version!==order.version)throw new AppError(409,'O pedido mudou. Atualize antes de anexar ou remover o CDR.');
  if(order.document.workflow?.status==='released'||['sent','accepted'].includes(order.tracking.stage))throw new AppError(400,'Abra uma nova revisão para alterar os arquivos técnicos.');
  return order;
 }
 async record(user,id,file){
  return this.db.prepare('SELECT * FROM order_technical_files WHERE id=? AND order_id=? AND owner_id=?').bind(file,id,this.production.owner(user)).first();
 }
 async writeFile(user,order,file){
  if(!file?.size||typeof file.arrayBuffer!=='function'||file.size>MAX_CDR)throw new AppError(413,'Envie um CDR de até 20 MB.');
  const name=String(file.name||'').normalize('NFC').replace(/[\u0000-\u001f\u007f\\/]/g,'_').trim();
  if(!/\.cdr$/i.test(name)||name.length>180)throw new AppError(400,'Escolha o arquivo original .cdr, com nome de até 180 caracteres.');
  const bytes=new Uint8Array(await file.slice(0,12).arrayBuffer());
  const head=new TextDecoder('ascii').decode(bytes),riff=head.startsWith('RIFF')&&head.slice(8,11)==='CDR',zip=bytes.length>4&&bytes[0]===80&&bytes[1]===75&&bytes[2]===3&&bytes[3]===4;
  if(!riff&&!zip)throw new AppError(400,'O conteúdo não corresponde a um CDR reconhecido. Salve o original no CorelDRAW e tente novamente.');
  const hash=createHash('sha256');let size=0;for await(const chunk of file.stream()){size+=chunk.byteLength;if(size>MAX_CDR)throw new AppError(413,'O CDR excede o limite de tamanho.');hash.update(chunk);}if(size!==file.size)throw new AppError(400,'O arquivo foi recebido incompleto.');
  return this.store(user,order.id,{body:file,name,size,sha256:hash.digest('hex'),label:''});
 }
 async store(user,orderId,{body,name,size,sha256,label}){
  const id=crypto.randomUUID(),key='production-orders/'+orderId+'/technical/'+id+'.cdr',owner=this.production.owner(user),createdAt=new Date().toISOString();
  await this.bucket.put(key,body,{httpMetadata:{contentType:'application/octet-stream'}});
  try{await this.db.prepare('INSERT INTO order_technical_files (id,order_id,owner_id,object_key,file_name,size,sha256,label,created_at) VALUES (?,?,?,?,?,?,?,?,?)').bind(id,orderId,owner,key,name,size,sha256,label||'',createdAt).run();}
  catch(error){await this.bucket.delete(key).catch(()=>{});throw error;}
  return {id,name,size,sha256,label:label||'',createdAt};
 }
 async discard(user,orderId,file){const row=await this.record(user,orderId,file.id);if(row){await this.db.prepare('DELETE FROM order_technical_files WHERE id=? AND order_id=? AND owner_id=?').bind(row.id,orderId,user.userId).run();await this.bucket.delete(row.object_key).catch(()=>{});}}
 async attach(user,id,version,file){
  const order=await this.editable(user,id,version);if((order.document.technicalFiles||[]).length>=10)throw new AppError(400,'Use até dez CDRs por pedido.');
  const added=await this.writeFile(user,order,file);
  try{await this.production.save(user,id,{version,document:{...order.document,technicalFiles:[...(order.document.technicalFiles||[]),added]}});}
  catch(error){await this.discard(user,id,added).catch(()=>{});throw error;}
  return this.production.get(user,id);
 }
 async detach(user,id,file,version){
  const order=await this.editable(user,id,version),files=order.document.technicalFiles||[];
  if(!files.some(f=>f.id===file))throw new AppError(404,'Arquivo não encontrado neste pedido.');
  await this.production.save(user,id,{version,document:{...order.document,technicalFiles:files.filter(f=>f.id!==file)}});
  // Old releases keep their exact files. Detaching never destroys snapshots.
  return this.production.get(user,id);
 }
 async authorized(user,id,{factory=false,revision=null,version=null}={}){
  if(factory&&revision!==null)throw new AppError(403,'A fábrica consulta a revisão enviada pelo painel de recebimento.');
  const order=revision!==null?await this.production.released(user,id,revision):factory?await this.tracking.detail(user,id,{factory:true}):await this.production.get(user,id);
  if(version!==null&&String(order.version)!==String(version))throw new AppError(409,'O pedido mudou. Atualize antes de baixar o pacote.');
  return order;
 }
 async download(user,id,file,options={}){
  const order=await this.authorized(user,id,options),ref=order.document.technicalFiles?.find(f=>f.id===file);
  if(!ref)throw new AppError(404,'O arquivo não pertence a esta revisão do pedido.');
  const owner=(await this.db.prepare('SELECT owner_id FROM production_orders WHERE id=?').bind(id).first())?.owner_id;
  const row=await this.db.prepare('SELECT * FROM order_technical_files WHERE id=? AND order_id=? AND owner_id=?').bind(file,id,owner).first();
  if(!row||row.sha256!==ref.sha256||row.size!==ref.size)throw new AppError(409,'O arquivo técnico diverge da revisão conferida.');
  const object=await this.bucket.get(row.object_key);if(!object)throw new AppError(503,'O CDR está indisponível. Tente novamente.');
  return {object,name:row.file_name,size:row.size,sha256:row.sha256};
 }
 async delivery(user,id,options={}){
  const order=await this.authorized(user,id,options);
  if(order.document.workflow?.status!=='released')throw new AppError(400,'Conclua a conferência antes de baixar o pacote de produção.');
  if(!order.document.technicalFiles?.length)throw new AppError(400,'Anexe o CDR e confira a revisão para gerar o pacote. O PDF já inclui a lista.');
  const query=new URLSearchParams();for(const [key,value]of Object.entries(options))if(value!==null&&value!==false&&value!==undefined)query.set(key,value===true?'1':String(value));
  return {order:{...order,document:{...order.document,factoryTracking:options.revision!==null&&options.revision!==undefined?{stage:'checked'}:order.tracking}},files:order.document.technicalFiles.map(file=>({...file,url:'/api/production-orders/'+encodeURIComponent(id)+'/technical-files/'+encodeURIComponent(file.id)+(query.size?'?'+query:'')}))};
 }
 async complement(user,id,input){
  const source=await this.production.get(user,id);
  if(!source.document.number.trim())throw new AppError(400,'Defina o número do pedido original antes de criar um complemento.');
  if(!Number.isSafeInteger(input?.version)||input.version!==source.version)throw new AppError(409,'O pedido original mudou. Atualize antes de criar o complemento.');
  let document;try{document=complementDocument(source.document,input);}catch(error){throw new AppError(400,error.message);}
  const origin={id,number:source.document.number,title:source.document.title,revision:source.document.workflow?.revision||1,version:source.version,createdAt:new Date().toISOString()};
  let created;
  try{
   created=await this.production.save(user,null,{document},{origin});
   const copied=[];
   for(const file of source.document.technicalFiles||[]){const row=await this.record(user,id,file.id);if(!row||row.sha256!==file.sha256)throw new AppError(503,'O CDR original está indisponível. O complemento não foi criado.');const object=await this.bucket.get(row.object_key);if(!object)throw new AppError(503,'O CDR original está indisponível.');copied.push(await this.store(user,created.id,{body:object.body,name:row.file_name,size:row.size,sha256:row.sha256,label:row.label}));}
   if(copied.length)created=await this.production.save(user,created.id,{version:created.version,document:{...document,technicalFiles:copied}});
   return this.production.get(user,created.id);
  }catch(error){if(created){const current=await this.production.own(user,created.id).catch(()=>null);if(current)await this.production.remove(user,created.id,{version:current.version}).catch(()=>{});}throw error;}
 }
}
