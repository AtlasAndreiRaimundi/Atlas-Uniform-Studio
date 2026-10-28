import {presentationGarments} from '../public/order-presentation.js';
import {moldCollection} from '../public/mold-collections.js';
import { AppError } from './project-service.mjs';
import { requireAdminUser, isAdminUser } from './admin-auth.mjs';
import { generateTemplate, TemplateError, TEMPLATE_LIMITS } from './template-generator.mjs';
import { BUILTIN_TEMPLATE } from '../public/template-catalog.js';
import { SIMULATOR_PRESENTATION_TEMPLATES } from './simulator-presentation-templates.mjs';

const date = () => new Date().toISOString();
const categories = ['camiseta','calcao','conjunto','outro'];
export class TemplateService {
  /** @param {readonly any[]} installedTemplates */
  constructor(db, bucket, adminId = '', installedTemplates = []) { this.db = db; this.bucket = bucket; this.adminId = adminId; this.installedTemplates = [...installedTemplates,...SIMULATOR_PRESENTATION_TEMPLATES.filter(entry=>!installedTemplates.some(item=>item.descriptor.id===entry.descriptor.id))]; }
  installedRow(id) {
    const entry=this.installedTemplates.find(item=>item.descriptor.id===id);
    if(!entry)return null;
    const {descriptor,assets}=entry;
    return {id,name:descriptor.name,category:descriptor.category,status:entry.status,model_key:assets.model,source_key:assets.source,svg_key:assets.template,proof_key:assets.proof,layout_json:JSON.stringify(descriptor),source_name:entry.sourceName,created_by:this.adminId,created_at:entry.createdAt,updated_at:entry.createdAt};
  }
  async ensureInstalled(id) {
    const row=this.installedRow(id);if(!row)return;
    await this.db.prepare('INSERT INTO templates (id,name,category,status,model_key,source_key,svg_key,proof_key,layout_json,source_name,created_by,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(id) DO NOTHING')
      .bind(row.id,row.name,row.category,row.status,row.model_key,row.source_key,row.svg_key,row.proof_key,row.layout_json,row.source_name,row.created_by,row.created_at,row.updated_at).run();
  }
  summary(row) {
    const layout = JSON.parse(row.layout_json);
    if(row.id===BUILTIN_TEMPLATE.id)return {...BUILTIN_TEMPLATE,name:row.name,line:moldCollection({...layout,id:row.id}),category:row.category,status:row.status,updatedAt:row.updated_at};
    return { id:row.id, name:row.name, line:moldCollection({...layout,id:row.id}), bottomVariant:layout.bottomVariant, category:row.category, kind:'generated', status:row.status,
      panelCount:layout.panelCount, triangles:layout.triangles, pageSize:4096, sourceName:row.source_name,
      createdAt:row.created_at, updatedAt:row.updated_at, orientation:layout.orientation, ...(layout.thumbnailUrl?{thumbnailUrl:layout.thumbnailUrl}:{}) };
  }
  async row(id) {
    const row = await this.db.prepare('SELECT * FROM templates WHERE id = ?').bind(id).first() || this.installedRow(id);
    if(!row)throw new AppError(404,'Molde não encontrado.');
    // Clarify the original default label even when it was persisted before the second polo existed.
    if(id==='polo'&&row.name==='POLO')return {...row,name:'POLO COM RECORTE V'};
    return row;
  }
  async catalog(user) {
    if(!user?.userId)throw new AppError(401,'Entre na sua conta para continuar.');
    const rows=await this.db.prepare("SELECT * FROM templates WHERE status = 'published' ORDER BY created_at DESC").all();
    const builtin=await this.builtin();
    const installed=await Promise.all(this.installedTemplates.filter(entry=>!entry.presentationOnly).map(entry=>this.row(entry.descriptor.id))),ids=new Set(this.installedTemplates.map(entry=>entry.descriptor.id));
    return [...(builtin.status==='published'?[builtin]:[]),...installed.filter(row=>row.status==='published').map(row=>this.summary(row)),...rows.results.filter(row=>row.id!==BUILTIN_TEMPLATE.id&&!ids.has(row.id)).map(row=>this.summary(row))];
  }
  async builtin() {
    const row=await this.db.prepare('SELECT * FROM templates WHERE id = ?').bind(BUILTIN_TEMPLATE.id).first();
    return row?this.summary(row):{...BUILTIN_TEMPLATE};
  }
  async ensureBuiltin() {
    const at=date();
    await this.db.prepare("INSERT INTO templates (id,name,category,status,model_key,source_key,svg_key,proof_key,layout_json,source_name,created_by,created_at,updated_at) VALUES (?,?,?,'published',?,?,?,?,?,?,?,?,?) ON CONFLICT(id) DO NOTHING")
      .bind(BUILTIN_TEMPLATE.id,BUILTIN_TEMPLATE.name,BUILTIN_TEMPLATE.category,BUILTIN_TEMPLATE.modelUrl,BUILTIN_TEMPLATE.modelUrl,BUILTIN_TEMPLATE.templateUrl,BUILTIN_TEMPLATE.proofUrl,JSON.stringify(BUILTIN_TEMPLATE),'camiseta.glb',this.adminId,at,at).run();
  }
  async adminList(user) {
    requireAdminUser(user,this.adminId);
    const rows=await this.db.prepare('SELECT * FROM templates ORDER BY created_at DESC').all();
    const installed=await Promise.all(this.installedTemplates.filter(entry=>!entry.presentationOnly).map(entry=>this.row(entry.descriptor.id))),ids=new Set(this.installedTemplates.map(entry=>entry.descriptor.id));
    return [...installed.map(row=>this.summary(row)),await this.builtin(),...rows.results.filter(row=>row.id!==BUILTIN_TEMPLATE.id&&!ids.has(row.id)).map(row=>this.summary(row))];
  }
  async available(user,id) {
    if(!user?.userId)throw new AppError(401,'Entre na sua conta para continuar.');
    if(id===BUILTIN_TEMPLATE.id){const builtin=await this.builtin();if(builtin.status!=='published')throw new AppError(404,'Este molde não está disponível para novos projetos.');return builtin;}
    const row=await this.row(id);
    if(row.status!=='published')throw new AppError(404,'Este molde não está disponível para novos projetos.');
    return this.summary(row);
  }
  async descriptor(id) {
    if(id===BUILTIN_TEMPLATE.id)return this.builtin();
    const row=await this.row(id);return {...JSON.parse(row.layout_json),name:row.name,status:row.status,category:row.category};
  }
  async readable(user,id) {
    if(!user?.userId)throw new AppError(401,'Entre na sua conta para continuar.');
    const state=id===BUILTIN_TEMPLATE.id?await this.builtin():await this.row(id);
    if(state.status!=='published'&&!isAdminUser(user,this.adminId))throw new AppError(404,'Molde não encontrado.');
    return this.descriptor(id);
  }
  async create(user,input,file) {
    requireAdminUser(user,this.adminId);
    const name=typeof input?.name==='string'?input.name.trim():'';
    if(!name||name.length>80)throw new AppError(400,'Dê um nome ao molde com até 80 caracteres.');
    if(!categories.includes(input.category))throw new AppError(400,'Selecione o tipo de peça.');
    if(!file||typeof file.arrayBuffer!=='function'||!file.size||file.size>TEMPLATE_LIMITS.bytes||!file.name.toLowerCase().endsWith('.glb'))throw new AppError(400,'Envie um GLB completo, de até 20 MB.');
    const id=`molde-${crypto.randomUUID()}`, bytes=new Uint8Array(await file.arrayBuffer());
    let generated;
    try { generated=await generateTemplate(bytes,{id,name,category:input.category,up:input.up,front:input.front}); }
    catch(error){if(error instanceof TemplateError)throw new AppError(400,error.message);throw error;}
    if(input.line!==undefined&&!['jogo','passeio'].includes(input.line))throw new AppError(400,'Escolha Jogo ou Passeio.');
    generated.descriptor.line=input.line||'jogo';
    const keys={model:`templates/${id}/model.glb`,source:`templates/${id}/source.glb`,svg:`templates/${id}/template.svg`,proof:`templates/${id}/proof.svg`},written=[];
    try {
      for(const [kind,data,type] of [['model',generated.model,'model/gltf-binary'],['source',bytes,'model/gltf-binary'],['svg',generated.svg,'image/svg+xml'],['proof',generated.proof,'image/svg+xml']]) {
        written.push(keys[kind]);await this.bucket.put(keys[kind],data,{httpMetadata:{contentType:type}});
      }
      const at=date();
      await this.db.prepare('INSERT INTO templates (id,name,category,status,model_key,source_key,svg_key,proof_key,layout_json,source_name,created_by,created_at,updated_at) VALUES (?,?,?,\'draft\',?,?,?,?,?,?,?,?,?)').bind(id,name,input.category,keys.model,keys.source,keys.svg,keys.proof,JSON.stringify(generated.descriptor),String(file.name).slice(0,180),user.userId,at,at).run();
    }catch(error){if(written.length)await this.bucket.delete(written).catch(()=>{});throw error;}
    return this.summary(await this.row(id));
  }
  async status(user,id,input) {
    requireAdminUser(user,this.adminId);
    if(id===BUILTIN_TEMPLATE.id)await this.ensureBuiltin();
    await this.ensureInstalled(id);
    const row=await this.row(id);
    if(row.status==='deleted')throw new AppError(400,'Restaure este molde pela lixeira antes de publicar.');
    if(!['published','archived'].includes(input?.status))throw new AppError(400,'Selecione uma situação válida para o molde.');
    if(input.status==='published'&&input.confirmed!==true)throw new AppError(400,'Confira o mapa e confirme a publicação.');
    await this.db.prepare('UPDATE templates SET status = ?,updated_at = ? WHERE id = ?').bind(input.status,date(),id).run();
    return this.summary(await this.row(id));
  }
  async update(user,id,input) {
    requireAdminUser(user,this.adminId);
    const name=typeof input?.name==='string'?input.name.trim():'';
    if(!name||name.length>80)throw new AppError(400,'Dê um nome ao molde com até 80 caracteres.');
    if(!categories.includes(input.category))throw new AppError(400,'Selecione o tipo de peça.');
    if(id===BUILTIN_TEMPLATE.id)await this.ensureBuiltin();
    await this.ensureInstalled(id);
    const row=await this.row(id);
    if(row.status==='deleted')throw new AppError(400,'Restaure este molde antes de editar.');
    if(input.line!==undefined&&!['jogo','passeio'].includes(input.line))throw new AppError(400,'Escolha Jogo ou Passeio.');
    const layout=JSON.parse(row.layout_json);if(!layout.garments&&row.category==='conjunto')layout.garments=presentationGarments({...layout,id,name:row.name,category:row.category});layout.line=input.line||moldCollection({...layout,id});
    await this.db.prepare('UPDATE templates SET name = ?,category = ?,layout_json = ?,updated_at = ? WHERE id = ?').bind(name,input.category,JSON.stringify(layout),date(),id).run();
    return this.summary(await this.row(id));
  }
  async remove(user,id) {
    requireAdminUser(user,this.adminId);
    if(id===BUILTIN_TEMPLATE.id)await this.ensureBuiltin();
    await this.ensureInstalled(id);
    await this.row(id);
    // Reversible removal; retain the geometry used by existing projects/links.
    await this.db.prepare("UPDATE templates SET status = 'deleted',updated_at = ? WHERE id = ?").bind(date(),id).run();
    return this.summary(await this.row(id));
  }
  async restore(user,id) {
    requireAdminUser(user,this.adminId);
    const row=await this.row(id);
    if(row.status!=='deleted')throw new AppError(400,'Este molde não está na lixeira.');
    await this.db.prepare('UPDATE templates SET status = ?,updated_at = ? WHERE id = ?').bind(id===BUILTIN_TEMPLATE.id?'published':'draft',date(),id).run();
    return this.summary(await this.row(id));
  }
  async asset(id,kind) {
    if(!['model','template','proof','source'].includes(kind))throw new AppError(404,'Arquivo não encontrado.');
    if(id===BUILTIN_TEMPLATE.id) {
      const path={model:BUILTIN_TEMPLATE.modelUrl,template:BUILTIN_TEMPLATE.templateUrl,proof:BUILTIN_TEMPLATE.proofUrl,source:BUILTIN_TEMPLATE.modelUrl}[kind];return {redirect:path};
    }
    const row=await this.row(id),key={model:row.model_key,source:row.source_key,template:row.svg_key,proof:row.proof_key}[kind];
    const installed=this.installedTemplates.find(entry=>entry.descriptor.id===id);
    if(installed&&key===installed.assets[kind]&&(kind!=='template'||row.name===JSON.parse(row.layout_json).name))return {redirect:key};
    const object=installed&&kind==='template'&&key===installed.assets.template?{text:async()=>installed.templateSvg}:await this.bucket.get(key);if(!object)throw new AppError(404,'Arquivo não encontrado.');
    if(kind==='template'&&row.name!==JSON.parse(row.layout_json).name){
      const escape=value=>String(value).replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[char]));
      const original=typeof object.text==='function'?await object.text():String(object.data);
      const svg=original.replace(/<title>[\s\S]*?<\/title>/,()=>`<title>${escape(row.name)} — mapa de desenho</title>`)
        .replace(/(<text x="100" y="90"[^>]*>)[\s\S]*?(<\/text>)/,(_,start,end)=>start+escape(row.name)+end);
      return {body:svg,data:svg,httpMetadata:{contentType:'image/svg+xml'}};
    }
    return object;
  }
}
