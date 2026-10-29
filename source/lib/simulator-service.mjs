import {catalogOrder} from '../public/product-catalog.js';
import {AppError} from './project-service.mjs';
import {validateSimulatorState,simulatorPNG,describeSimulatorColors} from './simulator-validation.mjs';
import {newOrder,newPage,newKitPage} from '../public/production-core.js';
import {UNIFORM_FONTS} from '../public/simulador/catalog.js';
import {SIMULATOR_PRESENTATION_TEMPLATES} from './simulator-presentation-templates.mjs';
import {PRESENTATION_LAYOUTS} from '../public/simulador/presentation-layouts.js';
export class SimulatorService{
 /** @param {import('./project-service.mjs').ProjectService | null} projects */
 constructor(db,bucket,production,projects=null){this.db=db;this.bucket=bucket;this.production=production;this.projects=projects;}
 owner(user){if(!user?.userId)throw new AppError(401,'Entre na sua conta para salvar seu uniforme.');return user.userId;}
 summary(row){return {id:row.id,title:row.title,model:row.model_id,product:row.product,version:row.version,updatedAt:row.updated_at,orderId:row.order_id,thumbnailUrl:`/api/simulator/designs/${encodeURIComponent(row.id)}/thumbnail?version=${row.version}`};}
 async row(user,id){const row=await this.db.prepare('SELECT * FROM uniform_designs WHERE id=? AND owner_id=?').bind(id,this.owner(user)).first();if(!row)throw new AppError(404,'Uniforme não encontrado.');return row;}
 async list(user){const rows=await this.db.prepare('SELECT * FROM uniform_designs WHERE owner_id=? ORDER BY updated_at DESC LIMIT 200').bind(this.owner(user)).all();return rows.results.map(r=>this.summary(r));}
 async get(user,id){const row=await this.row(user,id),object=await this.bucket.get(row.object_key);if(!object)throw new AppError(503,'O desenho está temporariamente indisponível.');return {...this.summary(row),...await object.json()};}
 async save(user,id,input){
  const owner=this.owner(user),previous=id?await this.row(user,id):null;if(previous&&(!Number.isSafeInteger(input?.version)||input.version!==previous.version))throw new AppError(409,'Este uniforme mudou em outra aba. Reabra a versão salva antes de substituir.');
  const state=validateSimulatorState(input?.state),preview=simulatorPNG(input?.preview,{maxPixels:12_000_000}).src,designId=previous?.id||crypto.randomUUID(),at=new Date().toISOString(),key=`uniform-designs/${designId}/${crypto.randomUUID()}.json`;
  await this.bucket.put(key,JSON.stringify({state,preview}),{httpMetadata:{contentType:'application/json'}});let row;
  try{row=previous?await this.db.prepare('UPDATE uniform_designs SET title=?,product=?,object_key=?,version=version+1,updated_at=? WHERE id=? AND owner_id=? AND version=? RETURNING *').bind(state.title,state.product,key,at,designId,owner,input.version).first():await this.db.prepare('INSERT INTO uniform_designs (id,owner_id,title,model_id,product,object_key,version,created_at,updated_at) VALUES (?,?,?,?,?,?,1,?,?) RETURNING *').bind(designId,owner,state.title,state.model,state.product,key,at,at).first();if(!row)throw new AppError(409,'O uniforme foi atualizado em outra aba.');}catch(e){await this.bucket.delete(key).catch(()=>{});throw e;}
  return {...this.summary(row),state,preview};
 }
 async thumbnail(user,id,version){const saved=await this.get(user,id);if(String(saved.version)!==String(version))throw new AppError(409,'A miniatura mudou. Atualize a lista.');return simulatorPNG(saved.preview);}
 async createPresentation(user,id,input,mapFile){
  const saved=await this.get(user,id);
  if(!SIMULATOR_PRESENTATION_TEMPLATES.length)throw new AppError(503,'As bases antigas do simulador foram excluídas. Prepare um novo molde antes de gerar apresentações.');
  if(!Number.isSafeInteger(input?.version)||saved.version!==input.version)throw new AppError(409,'O uniforme mudou. Confira e salve a versão atual antes de criar a apresentação.');
  if(saved.state.platformBrand!=='atlas')throw new AppError(409,'Abra o uniforme no montador e confira o desenho atualizado antes de criar a apresentação.');
  if(!this.projects)throw new AppError(503,'O estúdio de apresentações está indisponível.');
  const layout=PRESENTATION_LAYOUTS[saved.state.product],projectId=`simulator-${saved.id}-v${saved.version}`;
  // Each reviewed uniform version has one independent native presentation.
  try{return await this.projects.get(user,projectId);}catch(error){if(error.status!==404)throw error;}
  if(!layout||!mapFile||typeof mapFile.arrayBuffer!=='function')throw new AppError(400,'Prepare o desenho do uniforme antes de criar a apresentação.');
  const bytes=new Uint8Array(await mapFile.arrayBuffer());
  if(bytes.length<24||new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength).getUint32(16)!==layout.pageSize||new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength).getUint32(20)!==layout.pageSize)throw new AppError(400,'O mapa da apresentação deve conter todos os painéis em 4096 × 4096 pixels.');
  if((await this.row(user,id)).version!==saved.version)throw new AppError(409,'O uniforme foi alterado em outra aba. Confira a versão atual.');
  const thumbnail=simulatorPNG(saved.preview),file=new File([bytes],'uniforme-montador.png',{type:mapFile.type});
  return this.projects.createWithArt(user,projectId,{name:saved.title||'Meu uniforme',clientName:'',templateId:layout.id,visuals:{background:'dark'},presentation:{layout:'line'}},file,new File([thumbnail.bytes],'uniforme-quatro-vistas.png',{type:'image/png'}));
 }
 async createOrder(user,id,input){
  const saved=await this.get(user,id);if(!Number.isSafeInteger(input?.version)||saved.version!==input.version)throw new AppError(409,'O uniforme foi alterado. Confira e salve novamente.');if(saved.state.platformBrand!=='atlas')throw new AppError(409,'O simulador foi atualizado. Abra o uniforme e confira o desenho novamente antes de iniciar o pedido.');
  const customer=typeof input.customer==='string'?input.customer.trim():'',notes=typeof input.notes==='string'?input.notes.trim():'';if(!customer||customer.length>160||notes.length>2000||!Number.isSafeInteger(input.quantity)||input.quantity<1||input.quantity>9999)throw new AppError(400,'Informe o cliente e uma quantidade entre 1 e 9999.');
  const owner=this.owner(user),proposed=crypto.randomUUID();let row=await this.db.prepare('UPDATE uniform_designs SET order_id=?,order_version=? WHERE id=? AND owner_id=? AND version=? AND (order_id IS NULL OR order_version<>?) RETURNING *').bind(proposed,saved.version,id,owner,saved.version,saved.version).first();
  if(!row){row=await this.row(user,id);if(row.version!==saved.version)throw new AppError(409,'O uniforme mudou durante a conferência. Reabra o desenho.');}
  const orderId=row.order_id;
  try{return await this.production.get(user,orderId);}catch(e){if(e.status!==404)throw e;}
  const document=newOrder();document.title=saved.title.slice(0,100);document.client=customer;document.notes=notes;const kit=saved.state.product==='kit',type=saved.state.product==='shorts'?'Calção':'Camiseta',page=kit?newKitPage():newPage(type);document.pages=[page];page.title='KIT ELITE 27';page.visual={mode:'shared',image:saved.preview,transform:{scale:1,x:.5,y:.5}};
  for(const p of page.products){const piece=p.type==='Calção'?'shorts':'shirt',colors=describeSimulatorColors(saved.state,piece);p.model='KIT ELITE 27';p.quantity=input.quantity;p.fabricColor=(colors[0]||'').slice(0,200);p.detailColor=colors.slice(1).join(' · ').slice(0,200);p.notes=('Cores: '+colors.join(' · ')+'\nFontes: '+[...new Set(saved.state.panels.filter(p=>p.piece===piece).flatMap(p=>p.layers.filter(l=>l.type==='text').map(l=>UNIFORM_FONTS.find(f=>f.id===l.font)?.label)))].filter(Boolean).join(' · ')).slice(0,3500);}
  catalogOrder(document);
  document.simulatorDesign={schema:1,id:saved.id,version:saved.version,confirmedAt:new Date().toISOString(),state:saved.state};
  try{const created=await this.production.save(user,null,{document},{newId:orderId});return this.production.get(user,created.id);}catch(e){try{return await this.production.get(user,orderId);}catch{await this.db.prepare('UPDATE uniform_designs SET order_id=NULL,order_version=NULL WHERE id=? AND owner_id=? AND order_id=? AND order_version=?').bind(id,owner,orderId,saved.version).run();throw e;}}
 }
 async fromOrder(user,id){const order=await this.production.get(user,id);if(!order.document.simulatorDesign)throw new AppError(404,'Este pedido não possui um desenho de simulador.');return {state:order.document.simulatorDesign.state,orderId:order.id,orderTitle:order.title};}
}
