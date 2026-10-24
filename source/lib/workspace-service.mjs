import {AppError,freshToken,validToken} from './project-service.mjs';
import {cleanPreset,cleanPresentation,cleanAnchor,APPROVAL_STATEMENT} from '../public/presentation-contract.js';
const now=()=>new Date().toISOString(),uid=()=>crypto.randomUUID();
function field(value,max=100,required=true){const text=typeof value==='string'?value.trim():'';if((required&&!text)||text.length>max)throw new AppError(400,`Preencha o campo com até ${max} caracteres.`);return text;}
const parse=(value,fallback={})=>{try{return JSON.parse(value);}catch{return fallback;}};
export class WorkspaceService {
  constructor(db,bucket,projects,templates){Object.assign(this,{db,bucket,projects,templates});}
  user(user){return this.projects.requireUser(user);}
  async overview(user){
    const owner=this.user(user);
    const folders=await this.projects.listFolders(user);
    const [presets,assets,proposals,options]=await Promise.all([
      this.db.prepare('SELECT * FROM presentation_presets WHERE owner_id = ? ORDER BY created_at DESC').bind(owner).all(),
      this.db.prepare('SELECT * FROM library_assets WHERE owner_id = ? AND deleted = 0 ORDER BY created_at DESC').bind(owner).all(),
      this.db.prepare("SELECT p.*, (SELECT COUNT(*) FROM piece_comments c WHERE c.proposal_id=p.id AND c.status='open') AS pending FROM proposals p WHERE p.owner_id = ? ORDER BY p.updated_at DESC").bind(owner).all(),
      this.db.prepare('SELECT o.proposal_id,v.id,v.project_id,v.project_version,v.name,v.created_at FROM proposal_options o JOIN proposal_versions v ON v.id=o.version_id WHERE v.owner_id = ? ORDER BY o.created_at').bind(owner).all(),
    ]);
    // Keep the clients alias for editor tabs opened before folders became canonical.
    return {folders,clients:folders,presets:presets.results.map(p=>({id:p.id,name:p.name,settings:cleanPreset(parse(p.settings_json))})),assets:assets.results.map(a=>this.assetSummary(a)),proposals:proposals.results.map(p=>({...this.proposalSummary(p),options:options.results.filter(o=>o.proposal_id===p.id).map(o=>({id:o.id,projectId:o.project_id,version:o.project_version,name:o.name,createdAt:o.created_at}))}))};
  }
  assetSummary(a){return {id:a.id,folderId:a.folder_id??null,clientId:a.folder_id||'',name:a.name,kind:a.kind,fileName:a.file_name,contentType:a.content_type,size:a.size,url:`/api/workspace/assets/${a.id}`,createdAt:a.created_at};}
  proposalSummary(p){return {id:p.id,name:p.name,clientName:p.client_name,enabled:!!p.enabled,path:`/proposta/${p.token}`,pending:Number(p.pending||0),createdAt:p.created_at,updatedAt:p.updated_at};}
  async ownProposal(user,id){const row=await this.db.prepare('SELECT * FROM proposals WHERE id = ? AND owner_id = ?').bind(id,this.user(user)).first();if(!row)throw new AppError(404,'Proposta não encontrada.');return row;}
  async client(user,id){
    const owner=this.user(user);if(typeof id!=='string'||!id)throw new AppError(400,'Escolha uma pasta para o arquivo.');
    await this.projects.importLegacyClients(user);
    const row=await this.db.prepare('SELECT * FROM project_folders WHERE owner_id=? AND (id=? OR id=(SELECT folder_id FROM client_libraries WHERE id=? AND owner_id=? AND migrated_at IS NOT NULL))').bind(owner,id,id,owner).first();
    if(!row)throw new AppError(404,'Pasta não encontrada.');return row;
  }
  async saveClient(user,input){
    this.user(user);const name=field(input.name),colors=Array.isArray(input.colors)?input.colors:[];
    if(colors.length>12||colors.some(c=>!/^#[0-9a-f]{6}$/i.test(c)))throw new AppError(400,'Use até 12 cores em hexadecimal, como #ffffff.');
    if(input.id){const folder=await this.client(user,input.id);return this.projects.updateFolder(user,folder.id,{name,colors});}
    const folders=await this.projects.listFolders(user),key=value=>value.normalize('NFKC').toLocaleLowerCase('pt-BR').replace(/\s+/g,' ');
    let folder=folders.find(folder=>key(folder.name)===key(name));
    if(!folder){try{folder=await this.projects.createFolder(user,{name});}catch(error){if(error.status!==409)throw error;folder=(await this.projects.listFolders(user)).find(folder=>key(folder.name)===key(name));if(!folder)throw error;}}
    return this.projects.updateFolder(user,folder.id,{colors:[...new Set([...folder.colors,...colors.map(c=>c.toLowerCase())])]});
  }
  async savePreset(user,input){
    const owner=this.user(user),name=field(input.name,80),id=uid(),settings=cleanPreset(input.settings);
    await this.db.prepare('INSERT INTO presentation_presets (id,owner_id,name,settings_json,created_at) VALUES (?,?,?,?,?)').bind(id,owner,name,JSON.stringify(settings),now()).run();return {id,name,settings};
  }
  async removePreset(user,id){await this.db.prepare('DELETE FROM presentation_presets WHERE id = ? AND owner_id = ?').bind(id,this.user(user)).run();}
  async uploadAsset(user,input,file){
    const owner=this.user(user),folder=await this.client(user,input.folderId??input.clientId);
    if(!['logo','patrocinador','arte','outro'].includes(input.kind))throw new AppError(400,'Escolha uma categoria de arquivo.');
    if(!file?.size||file.size>20*1024*1024)throw new AppError(413,'Envie um arquivo de até 20 MB.');
    const extension=String(file.name).split('.').at(-1).toLowerCase();
    const types={png:'image/png',jpg:'image/jpeg',jpeg:'image/jpeg',webp:'image/webp',svg:'image/svg+xml',pdf:'application/pdf',cdr:'application/octet-stream'};
    if(!types[extension])throw new AppError(400,'Use PNG, JPG, WebP, SVG, PDF ou CDR.');
    const bytes=new Uint8Array(await file.arrayBuffer()),id=uid(),key=`library/${owner}/${id}`,date=now(),name=field(input.name||file.name,180),fileName=field(file.name,180),type=types[extension];
    await this.bucket.put(key,bytes,{httpMetadata:{contentType:type}});
    try{const row=await this.db.prepare('INSERT INTO library_assets (id,owner_id,client_id,folder_id,name,kind,file_key,content_type,file_name,size,created_at) SELECT ?,?,?,?,?,?,?,?,?,?,? WHERE EXISTS (SELECT 1 FROM project_folders WHERE id=? AND owner_id=?) RETURNING id').bind(id,owner,folder.id,folder.id,name,input.kind,key,type,fileName,bytes.length,date,folder.id,owner).first();if(!row)throw new AppError(409,'A pasta foi removida. Escolha outro destino.');}catch(error){await this.bucket.delete(key).catch(()=>{});throw error;}
    return this.assetSummary({id,folder_id:folder.id,name,kind:input.kind,content_type:type,file_name:fileName,size:bytes.length,created_at:date});
  }
  async moveAsset(user,id,input){
    const owner=this.user(user);
    if(!input||typeof input!=='object'||Array.isArray(input)||!Object.hasOwn(input,'folderId'))throw new AppError(400,'Escolha o destino do arquivo.');
    const previous=await this.db.prepare('SELECT id FROM library_assets WHERE id=? AND owner_id=? AND deleted=0').bind(id,owner).first();if(!previous)throw new AppError(404,'Arquivo não encontrado.');
    const destination=input.folderId;if(destination!==null&&(typeof destination!=='string'||!destination))throw new AppError(400,'Escolha uma pasta válida.');
    const folderId=destination===null?null:(await this.projects.ownFolder(user,destination)).id;
    const row=await this.db.prepare('UPDATE library_assets SET folder_id=? WHERE id=? AND owner_id=? AND deleted=0 AND (? IS NULL OR EXISTS (SELECT 1 FROM project_folders WHERE id=? AND owner_id=?)) RETURNING *').bind(folderId,id,owner,folderId,folderId,owner).first();
    if(!row)throw new AppError(409,'A pasta ou o arquivo mudou. Atualize a página.');return this.assetSummary(row);
  }
  async libraryAsset(user,id){const row=await this.db.prepare('SELECT * FROM library_assets WHERE id = ? AND owner_id = ? AND deleted = 0').bind(id,this.user(user)).first();if(!row)throw new AppError(404,'Arquivo não encontrado.');const object=await this.bucket.get(row.file_key);if(!object)throw new AppError(404,'Arquivo não encontrado.');return {row,object};}
  async removeAsset(user,id){this.user(user);await this.db.prepare('UPDATE library_assets SET deleted=1 WHERE id = ? AND owner_id = ?').bind(id,user.userId).run();}
  async freeze(user,projectId,expected){
    const row=await this.projects.own(user,projectId);
    if(!row.map_key)throw new AppError(400,'Salve uma arte antes de criar a proposta.');
    if(expected!==undefined&&expected!==row.version)throw new AppError(409,'O projeto mudou. Reabra antes de enviar esta versão.');
    const existing=await this.db.prepare('SELECT * FROM proposal_versions WHERE project_id = ? AND project_version = ? AND owner_id = ?').bind(projectId,row.version,user.userId).first();if(existing)return existing;
    const id=uid(),mapKey=`versions/${id}/map`,thumbnailKey=row.thumbnail_key?`versions/${id}/thumbnail`:null,uploaded=[];
    const [map,thumb,profile,template]=await Promise.all([this.bucket.get(row.map_key),row.thumbnail_key?this.bucket.get(row.thumbnail_key):null,this.projects.profile(user),this.projects.template(user,projectId)]);
    if(!map)throw new AppError(409,'A arte mudou durante o envio. Tente novamente.');
    try{
      for(const [key,object] of [[mapKey,map],[thumbnailKey,thumb]])if(key&&object){await this.bucket.put(key,object.body||object.bytes||object.data,{httpMetadata:object.httpMetadata});uploaded.push(key);}
      await this.db.prepare('INSERT INTO proposal_versions (id,owner_id,project_id,project_version,name,client_name,designer_name,template_id,template_json,visual_json,presentation_json,map_key,map_name,thumbnail_key,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(project_id,project_version) DO NOTHING').bind(id,user.userId,projectId,row.version,row.name,row.client_name,profile.displayName,row.template_id,JSON.stringify(template),row.visual_json,JSON.stringify(cleanPresentation(parse(row.presentation_json))),mapKey,row.map_name||'mapa.png',thumb?thumbnailKey:null,now()).run();
      const saved=await this.db.prepare('SELECT * FROM proposal_versions WHERE project_id = ? AND project_version = ? AND owner_id = ?').bind(projectId,row.version,user.userId).first();
      if(!saved)throw new AppError(500,'Não foi possível preservar a versão.');if(saved.id!==id)await this.bucket.delete(uploaded).catch(()=>{});return saved;
    }catch(error){if(uploaded.length)await this.bucket.delete(uploaded).catch(()=>{});throw error;}
  }
  async createProposal(user,input){
    const owner=this.user(user),name=field(input.name),clientName=field(input.clientName,100,false);
    if(!Array.isArray(input.options)||input.options.length<1||input.options.length>8)throw new AppError(400,'Selecione de 1 a 8 opções.');
    const versions=[];for(const option of input.options)versions.push(await this.freeze(user,option.projectId,option.version));
    const id=uid(),token=freshToken(),date=now();
    await this.db.batch([this.db.prepare('INSERT INTO proposals (id,owner_id,name,client_name,token,created_at,updated_at) VALUES (?,?,?,?,?,?,?)').bind(id,owner,name,clientName,token,date,date),...[...new Map(versions.map(v=>[v.id,v])).values()].map(v=>this.db.prepare('INSERT INTO proposal_options (id,proposal_id,version_id,created_at) VALUES (?,?,?,?)').bind(uid(),id,v.id,date))]);
    return this.proposalSummary(await this.ownProposal(user,id));
  }
  async addOption(user,input){
    const proposal=await this.ownProposal(user,input.proposalId);if(!proposal.enabled)throw new AppError(400,'Esta proposta está desativada.');
    const version=await this.freeze(user,input.projectId,input.version),date=now();
    const existing=await this.db.prepare('SELECT id FROM proposal_options WHERE proposal_id=? AND version_id=?').bind(proposal.id,version.id).first();
    if(existing)return {...this.proposalSummary(proposal),alreadyIncluded:true};
    await this.db.batch([this.db.prepare('INSERT INTO proposal_options (id,proposal_id,version_id,created_at) SELECT ?,?,?,? WHERE (SELECT COUNT(*) FROM proposal_options WHERE proposal_id=?)<8 ON CONFLICT(proposal_id,version_id) DO NOTHING').bind(uid(),proposal.id,version.id,date,proposal.id),this.db.prepare('UPDATE proposals SET updated_at = ? WHERE id = ? AND owner_id = ?').bind(date,proposal.id,user.userId)]);
    const added=await this.db.prepare('SELECT id FROM proposal_options WHERE proposal_id=? AND version_id=?').bind(proposal.id,version.id).first();if(!added)throw new AppError(400,'Cada proposta comporta até 8 opções.');
    return this.proposalSummary(await this.ownProposal(user,proposal.id));
  }
  async disableProposal(user,id){await this.ownProposal(user,id);await this.db.prepare('UPDATE proposals SET enabled=0,updated_at=? WHERE id=? AND owner_id=?').bind(now(),id,user.userId).run();}
  async shared(token){if(!validToken(token))throw new AppError(404,'Proposta indisponível.');const row=await this.db.prepare('SELECT * FROM proposals WHERE token=? AND enabled=1').bind(token).first();if(!row)throw new AppError(404,'Proposta indisponível.');return row;}
  async option(proposalId,versionId){const row=await this.db.prepare('SELECT v.* FROM proposal_versions v JOIN proposal_options o ON o.version_id=v.id WHERE o.proposal_id=? AND v.id=?').bind(proposalId,versionId).first();if(!row)throw new AppError(404,'Esta versão não pertence à proposta.');return row;}
  versionSummary(v,token){return {id:v.id,name:v.name,version:v.project_version,clientName:v.client_name,designerName:v.designer_name,templateId:v.template_id,createdAt:v.created_at,visuals:parse(v.visual_json),presentation:cleanPresentation(parse(v.presentation_json)),mapName:v.map_name,mapUrl:`/api/proposals/${token}/versions/${v.id}/map`,thumbnailUrl:v.thumbnail_key?`/api/proposals/${token}/versions/${v.id}/thumbnail`:null,template:{...parse(v.template_json),modelUrl:`/api/proposals/${token}/versions/${v.id}/model`,templateUrl:null,proofUrl:null}};}
  async detail(proposal,owner=false){
    const [versions,comments,approvals]=await Promise.all([
      this.db.prepare('SELECT v.* FROM proposal_versions v JOIN proposal_options o ON o.version_id=v.id WHERE o.proposal_id=? ORDER BY o.created_at,v.created_at,v.project_version,v.name,v.id').bind(proposal.id).all(),
      this.db.prepare('SELECT * FROM piece_comments WHERE proposal_id=? ORDER BY created_at DESC').bind(proposal.id).all(),
      this.db.prepare('SELECT * FROM proposal_approvals WHERE proposal_id=? ORDER BY created_at').bind(proposal.id).all(),
    ]);
    return {...this.proposalSummary(proposal),versions:versions.results.map(v=>({...this.versionSummary(v,proposal.token),...(owner?{projectId:v.project_id}:{})})),comments:comments.results.map(c=>({id:c.id,versionId:c.version_id,authorName:c.author_name,body:c.body,anchor:parse(c.anchor_json),status:c.status,changedAt:c.changed_at,createdAt:c.created_at})),approvals:approvals.results.map(a=>({id:a.id,versionId:a.version_id,authorName:a.author_name,statement:a.statement,createdAt:a.created_at,identity:'Nome informado pelo cliente'}))};
  }
  async sharedDetail(token){return this.detail(await this.shared(token));}
  async ownerDetail(user,id){return this.detail(await this.ownProposal(user,id),true);}
  async comment(token,input){
    const proposal=await this.shared(token);await this.option(proposal.id,input.versionId);
    const author=field(input.authorName,80),body=field(input.body,2000),anchor=cleanAnchor(input.anchor);
    if(!anchor)throw new AppError(400,'Marque um ponto na peça antes de salvar o comentário.');
    // Check and insert atomically: parallel requests cannot all pass the same
    // counter, and revoking a link also stops writes already in flight.
    const inserted=await this.db.prepare('INSERT INTO piece_comments (id,proposal_id,version_id,author_name,body,anchor_json,created_at) SELECT ?,?,?,?,?,?,? WHERE EXISTS (SELECT 1 FROM proposals WHERE id=? AND enabled=1) AND (SELECT COUNT(*) FROM piece_comments WHERE proposal_id=?)<500 AND (SELECT COUNT(*) FROM piece_comments WHERE proposal_id=? AND created_at>?)<30 RETURNING id').bind(uid(),proposal.id,input.versionId,author,body,JSON.stringify(anchor),now(),proposal.id,proposal.id,proposal.id,new Date(Date.now()-600000).toISOString()).first();
    if(!inserted){await this.shared(token);throw new AppError(429,'Há muitos comentários recentes. Aguarde alguns minutos.');}
    return this.sharedDetail(token);
  }
  async markComment(user,input){
    const proposal=await this.ownProposal(user,input.proposalId);if(!['open','changed'].includes(input.status))throw new AppError(400,'Situação inválida.');
    await this.db.prepare('UPDATE piece_comments SET status=?,changed_by=?,changed_at=? WHERE id=? AND proposal_id=?').bind(input.status,user.userId,input.status==='changed'?now():null,input.commentId,proposal.id).run();return this.ownerDetail(user,proposal.id);
  }
  async approve(token,input){
    const proposal=await this.shared(token),version=await this.option(proposal.id,input.versionId),author=field(input.authorName,80);
    if(input.confirmed!==true||input.statement!==APPROVAL_STATEMENT)throw new AppError(400,'Confirme a aprovação da versão selecionada.');
    await this.db.prepare('INSERT INTO proposal_approvals (id,proposal_id,version_id,author_name,statement,created_at) SELECT ?,?,?,?,?,? WHERE EXISTS (SELECT 1 FROM proposals WHERE id=? AND enabled=1) ON CONFLICT(proposal_id,version_id) DO NOTHING').bind(uid(),proposal.id,version.id,author,APPROVAL_STATEMENT,now(),proposal.id).run();return this.sharedDetail(token);
  }
  async versionAsset(token,versionId,kind){
    const proposal=await this.shared(token),version=await this.option(proposal.id,versionId);
    if(kind==='model')return this.templates.asset(version.template_id,'model');
    const key=kind==='map'?version.map_key:kind==='thumbnail'?version.thumbnail_key:null;if(!key)throw new AppError(404,'Arquivo não encontrado.');
    const object=await this.bucket.get(key);if(!object)throw new AppError(404,'Arquivo não encontrado.');return object;
  }
}
