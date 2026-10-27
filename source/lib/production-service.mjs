import {preserveCatalogList} from '../public/catalog-list.js';
import {CATALOG_VERSION,cleanTechnical,catalogProblems} from '../public/product-catalog.js';
import {boundedJSON} from './request-security.mjs';
import {trackingOf} from './order-tracking.mjs';
import {AppError} from './project-service.mjs';
import {normalizeListRow,listProblems} from '../public/order-list.js';
import {releaseProblems,EXTRA_APPLICATIONS,parseGrade} from '../public/production-core.js';
import {simulatorSnapshot} from './simulator-validation.mjs';
import {allocateOrderNumber} from './order-number.mjs';
const MAX=16*1024*1024;
const text=(value,max=200)=>{if(typeof value!=='string'||value.length>max)throw new AppError(400,'Um dos campos do pedido é inválido ou muito longo.');return value;};
function imageValue(image){if(image===null||image==='')return '';if(typeof image!=='string'||image.length>3*1024*1024||!/^data:image\/(?:png|jpeg);base64,[A-Za-z0-9+/]+={0,2}$/.test(image))throw new AppError(400,'Use imagens PNG ou JPG de até 2 MB.');return image;}
function imageTransform(value={}){const out={};for(const [key,fallback,min,max]of [['scale',1,.05,10],['x',.5,0,1],['y',.5,0,1]]){const n=value?.[key]??fallback;if(typeof n!=='number'||!Number.isFinite(n)||n<min||n>max)throw new AppError(400,'Confira o tamanho e a posição da imagem.');out[key]=n;}
 if(value?.frame!==undefined){if(!value.frame||typeof value.frame!=='object')throw new AppError(400,'Confira a posição livre da imagem.');out.frame={};for(const [key,min,max]of [['x',-8418.9,8418.9],['y',-5952.8,5952.8],['w',.28,8418.9]]){const n=value.frame[key];if(typeof n!=='number'||!Number.isFinite(n)||n<min||n>max)throw new AppError(400,'Confira o tamanho e a posição livre da imagem.');out.frame[key]=n;}}
 return out;}
function annotations(value=[]){
 if(!Array.isArray(value)||value.length>80)throw new AppError(400,'Use até 80 apontamentos por página.');
 return value.map(a=>{
  if(!a||!['line','arrow','text','callout'].includes(a.type))throw new AppError(400,'Confira o tipo do apontamento.');
  const out={id:text(a.id,80),type:a.type,text:text(a.text||'',400),productId:text(a.productId||'',80),color:['#c52a36','#235394','#17202b'].includes(a.color)?a.color:'#c52a36'};
  for(const [key,min,max,fallback]of [['x',0,841.89,40],['y',0,595.28,180],['x2',0,841.89,160],['y2',0,595.28,250],['size',6,18,9],['width',.4,3,1]]){const n=a[key]??fallback;if(typeof n!=='number'||!Number.isFinite(n)||n<min||n>max)throw new AppError(400,'Mantenha os apontamentos dentro da folha A4.');out[key]=n;}
  return out;
 });
}
export function validateDocument(value){
 if(!value||typeof value!=='object'||value.schema!==1||!Array.isArray(value.pages)||!value.pages.length||value.pages.length>50)throw new AppError(400,'Use um pedido válido, com até 50 páginas de edição.');
 const document={schema:1};if(value.technicalCatalogVersion!==undefined){if(value.technicalCatalogVersion!==CATALOG_VERSION)throw new AppError(400,'Versão do catálogo não reconhecida.');document.technicalCatalogVersion=CATALOG_VERSION;}if(value.shirtSleeveCut!==undefined){if(!['','TRADICIONAL','RAGLAN'].includes(value.shirtSleeveCut))throw new AppError(400,'Corte de manga inválido.');document.shirtSleeveCut=value.shirtSleeveCut;}for(const key of ['title','number','client','contact','contactPhone','phone','registration','payment','seller','artist','orderDate','dispatchDate','deliveryDate','carrier','type','previousOrder','controlN','controlE'])document[key]=text(value[key]??'');
 if(!document.title.trim())throw new AppError(400,'Dê um nome ao pedido.');document.notice=text(value.notice??'',2000);document.notes=text(value.notes??'',4000);document.sample=Boolean(value.sample);
 document.complementChanges=text(value.complementChanges||'',2000);
 if(value.simulatorDesign!==undefined)document.simulatorDesign=simulatorSnapshot(value.simulatorDesign);
 if(value.technicalFiles!==undefined){if(!Array.isArray(value.technicalFiles)||value.technicalFiles.length>10)throw new AppError(400,'Use até dez arquivos técnicos por pedido.');document.technicalFiles=value.technicalFiles.map(file=>({id:text(file?.id,100)}));if(new Set(document.technicalFiles.map(file=>file.id)).size!==document.technicalFiles.length)throw new AppError(400,'O mesmo arquivo técnico foi anexado mais de uma vez.');}
 if(!Array.isArray(value.techniques)||value.techniques.length>12)throw new AppError(400,'Selecione as técnicas de aplicação.');document.techniques=value.techniques.map(s=>text(s,60));
 if(value.listSource){const source=value.listSource;if(source.id&&(!Number.isSafeInteger(source.version)||source.version<1))throw new AppError(400,'Confira a versão da lista vinculada.');if(!Array.isArray(source.rows)||source.rows.length>5000)throw new AppError(400,'Use uma lista com até 5.000 linhas.');document.listSource={...(source.id?{id:text(source.id,100),version:source.version}:{}),name:text(source.name||'',200),importedAt:text(source.importedAt||'',40),rows:source.rows.map(input=>{let extra;try{extra=preserveCatalogList(input);}catch(e){throw new AppError(400,e.message);}const fields=['grupo','nome','numero','adicional','tamanhoCamiseta','tamanhoCalcao','produto','modelo','cor'],row={...extra,quantidade:input.quantidade};for(const field of fields)row[field]=text(input[field]??'',field==='nome'?120:200);const normalized=normalizeListRow(row);if(listProblems(normalized).length)throw new AppError(400,'Confira os dados da lista vinculada.');return {...row,quantidade:normalized.quantidade};})};}
 let count=0;document.pages=value.pages.map(page=>{
  if(!page||!Array.isArray(page.products)||!page.products.length||page.products.length>8||!['individual','avulsas','conjunto'].includes(page.mode))throw new AppError(400,'Confira a organização das peças.');
  return {groupingReviewRequired:Boolean(page.groupingReviewRequired),id:text(page.id,80),title:text(page.title||'',160),label:text(page.label||'',160),listGroup:text(page.listGroup||'',100),mode:page.mode,visualLayout:page.visualLayout==='side'?'side':'stacked',imageArea:page.imageArea==='expanded'?'expanded':'standard',annotations:annotations(page.annotations),freeComponents:Boolean(page.freeComponents),...(page.visual?{visual:{mode:page.visual.mode==='shared'?'shared':'per-product',image:imageValue(page.visual.image||''),transform:imageTransform(page.visual.transform)}}:{}),notes:text(page.notes||'',4000),products:page.products.map(p=>{
   const product={};for(const key of ['id','type','model','fabric','fabricColor','detailColor','print'])product[key]=text(p[key]??'',200);
   if(!Number.isSafeInteger(p.quantity)||p.quantity<0||p.quantity>99999)throw new AppError(400,'Confira a quantidade das peças.');product.quantity=p.quantity;if(p.technical!==undefined){try{product.technical=cleanTechnical(p.technical);}catch(e){throw new AppError(400,e.message);}}if(p.kitGroupId!==undefined)product.kitGroupId=text(p.kitGroupId,80);if(p.legacyTechnical){product.legacyTechnical={};for(const key of ['type','model','fabric','print'])product.legacyTechnical[key]=text(p.legacyTechnical[key]||'',200);product.legacyTechnical.extraApplications=(p.legacyTechnical.extraApplications||[]).map(s=>text(s,80));}product.grade=text(p.grade||'',10000);product.notes=text(p.notes||'',4000);product.namesRaw=text(p.namesRaw||'',500000);
   if(!Array.isArray(p.images)||p.images.length>2||!Array.isArray(p.components)||p.components.length>30||!Array.isArray(p.names)||p.names.length>5000)throw new AppError(400,'A peça excede os limites de imagens, componentes ou nomes.');
   product.images=p.images.map(imageValue);if(p.imageTransforms){if(!Array.isArray(p.imageTransforms)||p.imageTransforms.length>2)throw new AppError(400,'Confira os ajustes das imagens.');product.imageTransforms=p.imageTransforms.map(imageTransform);}
   if(p.extraApplications!==undefined&&(!Array.isArray(p.extraApplications)||p.extraApplications.length>5||p.extraApplications.some(a=>!EXTRA_APPLICATIONS.includes(a))))throw new AppError(400,'Confira as aplicações extras desta peça.');product.extraApplications=EXTRA_APPLICATIONS.filter(a=>p.extraApplications?.includes(a));
   if(product.technical){if(product.extraApplications.some(a=>!['TPU ALTO RELEVO','APLIQUE BORDADO','TERMOCOLANTE'].includes(a)))throw new AppError(400,'Use as aplicações físicas autorizadas na ficha.');product.extraApplications=[...new Set(product.technical.applications.map(a=>a.type))];}product.components=p.components.map(c=>{const out={};for(const key of ['name','material','finish','position'])out[key]=text(c[key]||'',200);if(c.anchor&&[c.anchor.x,c.anchor.y].every(n=>typeof n==='number'&&Number.isFinite(n)&&n>=0&&n<=1))out.anchor={x:c.anchor.x,y:c.anchor.y};return out;});
   product.listKey=text(p.listKey||'',1200);product.listMissing=Boolean(p.listMissing);
   if(p.projectRef){const ref=p.projectRef;if(!Number.isSafeInteger(ref.version)||ref.version<1||ref.format!=='four-transparent-v1')throw new AppError(400,'Confira a versão da apresentação anexada.');product.projectRef={id:text(ref.id,100),name:text(ref.name,100),templateId:text(ref.templateId||'',100),version:ref.version,attachedAt:text(ref.attachedAt||'',40),format:'four-transparent-v1'};}
   product.names=p.names.map(n=>{count++;if(count>10000||!Number.isSafeInteger(n.quantity)||n.quantity<1||n.quantity>99999)throw new AppError(400,'Confira a lista de nomes e quantidades.');const row={name:text(n.name||'',120),number:text(n.number||'',20),additional:text(n.additional||'',200),size:text(n.size||'',30),quantity:n.quantity};for(const key of ['athleteId','kitId','specialReference','specialDescription'])if(n[key]!==undefined)row[key]=text(n[key],key==='specialDescription'?1000:100);return row;});return product;
  })};
 });const catalogErrors=catalogProblems(document,{parseGrade});if(catalogErrors.length)throw new AppError(400,catalogErrors.join(' '));if(JSON.stringify(document).length>MAX)throw new AppError(413,'O pedido excede 16 MB. Reduza o tamanho das imagens ou divida o pedido.');return document;
}
export async function productionInput(request){
 return boundedJSON(request,{maxBytes:MAX,message:'O pedido excede 16 MB.',invalid:'Não foi possível ler o pedido.',empty:'Pedido vazio.'});
}

export class ProductionService{
 constructor(db,bucket,numberOptions={}){this.db=db;this.bucket=bucket;this.numberOptions=numberOptions;}
 owner(user){if(!user?.userId)throw new AppError(401,'Entre na sua conta para abrir os pedidos.');return user.userId;}
 summary(row){return {id:row.id,title:row.title,client:row.client,number:row.order_number,version:row.version,updatedAt:row.updated_at,thumbnailUrl:'/api/order-tracking/'+encodeURIComponent(row.id)+'/thumbnail?version='+row.version,tracking:trackingOf(row)};}
 async list(user){const rows=await this.db.prepare('SELECT * FROM production_orders WHERE owner_id=? ORDER BY updated_at DESC LIMIT 200').bind(this.owner(user)).all();return rows.results.map(r=>this.summary(r));}
 async own(user,id){const row=await this.db.prepare('SELECT * FROM production_orders WHERE id=? AND owner_id=?').bind(id,this.owner(user)).first();if(!row)throw new AppError(404,'Pedido não encontrado.');return row;}
 async get(user,id){const row=await this.own(user,id),object=await this.bucket.get(row.object_key);if(!object)throw new AppError(503,'O arquivo do pedido está indisponível. Tente novamente.');const document=await object.json();return {...this.summary(row),tracking:trackingOf(row,document),document};}
 async released(user,id,revision){
  const current=await this.get(user,id),entry=current.document.workflow?.history?.find(item=>String(item.revision)===String(revision));
  if(!entry?.snapshotKey)throw new AppError(404,'Revisão liberada não encontrada.');
  const object=await this.bucket.get(entry.snapshotKey);if(!object)throw new AppError(503,'Revisão indisponível.');
  return {...this.summary(await this.own(user,id)),version:entry.version,document:await object.json()};
 }
 async remove(user,id,input){
  const row=await this.own(user,id);
  if(!Number.isSafeInteger(input?.version)||input.version!==row.version)throw new AppError(409,'Este pedido mudou. Feche a confirmação e selecione o pedido novamente antes de excluir.');
  if(row.production_state==='accepted')throw new AppError(400,'Pedidos aceitos pela fábrica não podem ser excluídos.');
  const deleted=await this.db.prepare("DELETE FROM production_orders WHERE id=? AND owner_id=? AND version=? AND production_state<>'accepted' RETURNING id").bind(id,this.owner(user),input.version).first();
  if(!deleted)throw new AppError(409,'Este pedido mudou. Feche a confirmação e selecione o pedido novamente antes de excluir.');
  // The list foreign key is SET NULL. Independent lists and presentations stay intact.
  // Remove only this order's files, including its old autosaves and released snapshots.
  try{
   let cursor;
   do{
    const page=await this.bucket.list({prefix:'production-orders/'+row.id+'/',...(cursor?{cursor}:{})});
    if(page.objects.length)await this.bucket.delete(page.objects.map(object=>object.key));
    cursor=page.truncated?page.cursor:undefined;
   }while(cursor);
  }catch{/* The deleted record stays deleted if storage cleanup is temporarily unavailable. */}
 }
 async save(user,id,input,trusted={}){
  const owner=this.owner(user),previous=id?await this.own(user,id):null,document=validateDocument(input?.document);if(previous&&(!Number.isSafeInteger(input.version)||input.version!==previous.version))throw new AppError(409,'Este pedido foi atualizado em outra aba. Baixe sua cópia antes de reabrir a versão salva.');
  const stored=previous?(await this.get(user,id)).document:null;
  if(stored?.technicalCatalogVersion&&document.technicalCatalogVersion!==stored.technicalCatalogVersion)throw new AppError(400,'A ficha técnica não pode ser removida do pedido. Revise os campos do catálogo atual.');
  const typedIds=new Set((stored?.pages||[]).flatMap(page=>page.products.filter(p=>p.technical).map(p=>p.id)));if(document.pages.some(page=>page.products.some(p=>typedIds.has(p.id)&&!p.technical)))throw new AppError(400,'A ficha técnica de uma peça já cadastrada não pode ser removida.');
  // The saved code is authoritative. New orders, imports and complements all
  // receive a fresh server code; client-supplied numbers cannot overwrite it.
  document.number=stored?.number||'';
  if(stored?.origin||trusted.origin){document.origin=stored?.origin||trusted.origin;document.previousOrder=document.origin.number;if(!['COMPLEMENTO','COMPLEMENTO COM ALTERAÇÕES'].includes(document.type))throw new AppError(400,'Mantenha o tipo de complemento neste pedido vinculado.');}
  const tracking=previous?trackingOf(previous,stored):{stage:'draft',events:[],revision:1};
  if(['sent','accepted'].includes(tracking.stage))throw new AppError(400,tracking.stage==='accepted'?'Pedido aceito pela fábrica. Não pode ser alterado.':'Pedido enviado. Aguarde o aceite ou a devolução pela fábrica.');
  const action=input.action||'save';if(!['save','release','revise'].includes(action))throw new AppError(400,'Ação inválida.');
  if(stored?.workflow?.status==='released'&&action!=='revise')throw new AppError(400,'Pedido liberado. Inicie uma nova revisão antes de editar.');
  document.workflow=stored?.workflow||{status:'draft',revision:1,history:[]};
  if(action==='revise'){
   if(stored?.workflow?.status!=='released')throw new AppError(400,'Este pedido ainda não foi liberado.');
   // Start from the immutable saved release, never from an edited client payload.
   Object.assign(document,stored);document.workflow={...stored.workflow,status:'draft',revision:stored.workflow.revision+1,checks:null};
  }
  if(document.technicalFiles?.length){
   if(!previous)throw new AppError(400,'Salve o pedido antes de anexar arquivos técnicos.');
   const files=[];for(const file of document.technicalFiles){const row=await this.db.prepare('SELECT * FROM order_technical_files WHERE id=? AND order_id=? AND owner_id=?').bind(file.id,id,owner).first();if(!row)throw new AppError(404,'O arquivo técnico não pertence a este pedido.');files.push({id:row.id,name:row.file_name,label:row.label,size:row.size,sha256:row.sha256,createdAt:row.created_at});}document.technicalFiles=files;
  }
  if(!document.number.trim())document.number=await allocateOrderNumber(this.db,this.numberOptions);
  if(action==='release'){
   const problems=releaseProblems(document);if(problems.length)throw new AppError(400,problems.join(' '));
   if(!input.checks||['art','list','technical'].some(key=>input.checks[key]!==true))throw new AppError(400,'Confirme arte, lista e dados técnicos separadamente.');
   const at=new Date().toISOString(),entry={revision:document.workflow.revision,at,by:user.userId,name:document.artist,version:(previous?.version||0)+1};
   document.workflow={...document.workflow,status:'released',checks:{art:true,list:true,technical:true},releasedAt:at,releasedBy:document.artist,history:[...(document.workflow.history||[]),entry]};
  }
  if(action==='release'){tracking.stage='checked';tracking.checkedAt=document.workflow.releasedAt;tracking.checkedBy=document.artist;tracking.revision=document.workflow.revision;tracking.events=[...(tracking.events||[]),{action:'check',at:tracking.checkedAt,by:document.artist,byId:owner,revision:tracking.revision}];}
  if(action==='revise'){tracking.stage='draft';tracking.revision=document.workflow.revision;tracking.checkedAt=null;tracking.sentAt=null;tracking.acceptedAt=null;tracking.acceptedBy='';tracking.returnedAt=null;tracking.returnReason='';tracking.protocol='';tracking.submittedRevision=null;tracking.events=[...(tracking.events||[]),{action:'revise',at:new Date().toISOString(),byId:owner,revision:document.workflow.revision}];}
  const products=document.pages.flatMap(page=>page.products);tracking.pieces=products.reduce((sum,p)=>sum+p.quantity,0);tracking.hasList=Boolean(document.listSource?.rows?.length||products.every(p=>p.grade));tracking.hasPresentation=document.pages.every(page=>page.visual?.mode==='shared'&&Boolean(page.visual.image)||page.products.every(p=>p.images.some(Boolean)));tracking.listId=document.listSource?.id||null;tracking.projectIds=[...new Set(products.map(p=>p.projectRef?.id).filter(Boolean))];tracking.deliveryDate=document.deliveryDate;
  const orderId=previous?.id||trusted.newId||crypto.randomUUID(),date=new Date().toISOString(),key='production-orders/'+orderId+'/'+crypto.randomUUID()+'.json';if(action==='release')document.workflow.history.at(-1).snapshotKey=key;await this.bucket.put(key,JSON.stringify(document),{httpMetadata:{contentType:'application/json'}});let row;
  try{row=previous?await this.db.prepare('UPDATE production_orders SET title=?,client=?,order_number=?,object_key=?,production_state=?,tracking_json=?,version=version+1,updated_at=? WHERE id=? AND owner_id=? AND version=? RETURNING *').bind(document.title,document.client,document.number,key,tracking.stage,JSON.stringify(tracking),date,orderId,owner,input.version).first():await this.db.prepare('INSERT INTO production_orders (id,owner_id,title,client,order_number,object_key,production_state,tracking_json,version,created_at,updated_at) SELECT ?,?,?,?,?,?,?,?,1,?,?'+(trusted.origin?' WHERE NOT EXISTS (SELECT 1 FROM production_orders WHERE owner_id=? AND lower(order_number)=lower(?))':'')+' RETURNING *').bind(orderId,owner,document.title,document.client,document.number,key,tracking.stage,JSON.stringify(tracking),date,date,...(trusted.origin?[owner,document.number]:[])).first();if(!row)throw new AppError(409,trusted.origin?'Esse número já está em uso na sua conta. Escolha outro número para o complemento.':'O pedido mudou em outra aba. Sua edição foi preservada neste navegador.');}
  catch(error){await this.bucket.delete(key);throw error;}
  // Retain old immutable objects as recovery checkpoints; do not destroy prior artwork on a save.
  return this.summary(row);
 }
}
