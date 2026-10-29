import {compatibleTemplateArt} from '../public/template-family.js';
import {profileDetails,readProfileDetails} from './designer-profile.mjs';
import { BUILTIN_TEMPLATE } from '../public/template-catalog.js';
import {RETAINED_MOLD_ID} from './removed-molds.mjs';
import { DEFAULT_VISUALS, sanitizeVisuals } from '../public/presentation.js';
import { cleanPresentation } from '../public/presentation-contract.js';

export class AppError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}
const now = () => new Date().toISOString();
export const TEMPLATE_ID = 'camiseta-teste-clo-v1';
const MAX_FILE = 20 * 1024 * 1024;
export const MAX_REQUEST = 22 * 1024 * 1024;

function textField(value, max, required = false) {
  const result = typeof value === 'string' ? value.trim() : '';
  if ((required && !result) || result.length > max) throw new AppError(400, `Preencha um nome com até ${max} caracteres.`);
  return result;
}
export function projectFields(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new AppError(400, 'Dados do projeto inválidos.');
  return {
    name: textField(input.name, 100, true),
    clientName: textField(input.clientName, 100),
    presentation: cleanPresentation(input.presentation),
    visuals: sanitizeVisuals(input.visuals && typeof input.visuals === 'object' ? input.visuals : { ...DEFAULT_VISUALS, background: 'dark' }),
  };
}
function folderReference(value) {
  if(value===null||value===undefined||value==='')return null;
  if(typeof value!=='string'||!/^[a-zA-Z0-9_-]{1,80}$/.test(value))throw new AppError(400,'Escolha uma pasta válida.');
  return value;
}
function folderFields(input) {
  if(!input||typeof input!=='object'||Array.isArray(input))throw new AppError(400,'Dados de pasta inválidos.');
  const name=textField(input.name,100,true);
  if(/[\u0000-\u001f\u007f]/.test(name))throw new AppError(400,'Use um nome de pasta sem quebras de linha.');
  return {name,key:name.normalize('NFKC').toLocaleLowerCase('pt-BR').replace(/\s+/g,' ')};
}
function palette(json){try{const value=JSON.parse(json||'[]');return Array.isArray(value)?[...new Set(value.filter(c=>typeof c==='string'&&/^#[0-9a-f]{6}$/i.test(c)).map(c=>c.toLowerCase()))]:[];}catch{return [];}}
export function revision(value) {
  if (!Number.isSafeInteger(value) || value < 1) throw new AppError(400, 'A versão do projeto é inválida. Reabra o projeto.');
  return value;
}
export function freshToken() {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return btoa(String.fromCharCode(...bytes)).replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '');
}
export function validToken(token) { return typeof token === 'string' && /^[A-Za-z0-9_-]{43}$/.test(token); }

export async function imageUpload(file, thumbnail = false) {
  if (!file || typeof file.arrayBuffer !== 'function' || file.size === 0) throw new AppError(400, 'Escolha uma imagem.');
  if (file.size > (thumbnail ? 2 * 1024 * 1024 : MAX_FILE)) throw new AppError(413, thumbnail ? 'A capa deve ter até 2 MB.' : 'O mapa deve ter até 20 MB.');
  if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) throw new AppError(400, 'Envie PNG, JPG ou WebP.');
  const bytes = new Uint8Array(await file.arrayBuffer());
  const png = bytes.length > 24 && bytes[0] === 137 && bytes[1] === 80 && bytes[2] === 78 && bytes[3] === 71 && bytes[4] === 13 && bytes[5] === 10 && bytes[6] === 26 && bytes[7] === 10;
  const jpeg = bytes.length > 4 && bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255;
  const webp = bytes.length > 20 && String.fromCharCode(...bytes.slice(0, 4)) === 'RIFF' && String.fromCharCode(...bytes.slice(8, 12)) === 'WEBP';
  if (!(file.type === 'image/png' && png || file.type === 'image/jpeg' && jpeg || file.type === 'image/webp' && webp)) throw new AppError(400, 'O conteúdo do arquivo não corresponde ao formato de imagem.');
  if (!thumbnail) {
    let width = 0, height = 0;
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    if (png) { width = view.getUint32(16); height = view.getUint32(20); }
    if (jpeg) {
      for (let offset = 2; offset + 9 < bytes.length;) {
        if (bytes[offset] !== 255) break;
        const marker = bytes[offset + 1], size = view.getUint16(offset + 2);
        if ([192, 193, 194, 195, 197, 198, 199, 201, 202, 203, 205, 206, 207].includes(marker)) { height = view.getUint16(offset + 5); width = view.getUint16(offset + 7); break; }
        if (size < 2) break;
        offset += 2 + size;
      }
    }
    if (webp && bytes.length >= 30) {
      const format = String.fromCharCode(...bytes.slice(12, 16));
      if (format === 'VP8X') { width = 1 + bytes[24] + (bytes[25] << 8) + (bytes[26] << 16); height = 1 + bytes[27] + (bytes[28] << 8) + (bytes[29] << 16); }
      if (format === 'VP8 ') { width = view.getUint16(26, true) & 16383; height = view.getUint16(28, true) & 16383; }
      if (format === 'VP8L') { const bits = view.getUint32(21, true); width = 1 + (bits & 16383); height = 1 + ((bits >>> 14) & 16383); }
    }
    if (width !== height || width < 256 || width > 16384) throw new AppError(400, 'Exporte a página inteira do template em uma imagem quadrada, de 256 a 16384 pixels.');
  }
  return { bytes, type: file.type, name: textField(file.name, 180) || 'mapa.png' };
}

// The service receives trusted identity from the server route, never from a body
// or query parameter. Every private SQL read and write contains owner_id.
export class ProjectService {
  constructor(db, bucket, templates = /** @type {any} */ (null)) { this.db = db; this.bucket = bucket; this.templates = templates; }
  requireUser(user) { if (!user?.userId) throw new AppError(401, 'Entre na sua conta para continuar.'); return user.userId; }
  profileSummary(row,user=null){
    const details=readProfileDetails(row?.details_json);
    return {id:row?.user_id||user?.userId,displayName:row?.display_name||user?.fullName||user?.email||'Designer',...details,photoUrl:row?.photo_key?'/api/designers/'+encodeURIComponent(row.user_id)+'/photo?v='+encodeURIComponent(row.updated_at):null,...(user?{email:user.email}:{})};
  }
  async profile(user) {
    const id=this.requireUser(user),row=await this.db.prepare('SELECT * FROM profiles WHERE user_id = ?').bind(id).first();
    return this.profileSummary(row,user);
  }
  async updateProfile(user,input){
    if(!input||typeof input!=='object'||Array.isArray(input))throw new AppError(400,'Dados de perfil inválidos.');
    const id=this.requireUser(user),previous=await this.profile(user),name=textField(input.displayName??previous.displayName,80,true),date=now(),details=profileDetails(input,previous);
    await this.db.prepare('INSERT INTO profiles (user_id,display_name,details_json,created_at,updated_at) VALUES (?,?,?,?,?) ON CONFLICT(user_id) DO UPDATE SET display_name=excluded.display_name,details_json=excluded.details_json,updated_at=excluded.updated_at').bind(id,name,JSON.stringify(details),date,date).run();
    return this.profile(user);
  }
  async designers(user){
    this.requireUser(user);const rows=await this.db.prepare('SELECT * FROM profiles ORDER BY display_name COLLATE NOCASE').all();
    return rows.results.filter(row=>readProfileDetails(row.details_json).directoryVisible).map(row=>this.profileSummary(row));
  }
  async uploadProfilePhoto(user,file){
    const owner=this.requireUser(user),image=await imageUpload(file,true),date=now(),key='profile-photos/'+owner+'/'+crypto.randomUUID();
    await this.bucket.put(key,image.bytes,{httpMetadata:{contentType:image.type}});
    try{await this.db.prepare('INSERT INTO profiles (user_id,display_name,photo_key,created_at,updated_at) VALUES (?,?,?,?,?) ON CONFLICT(user_id) DO UPDATE SET photo_key=excluded.photo_key,updated_at=excluded.updated_at').bind(owner,user.fullName||'Designer',key,date,date).run();}
    catch(error){await this.bucket.delete(key).catch(()=>{});throw error;}
    return this.profile(user);
  }
  async removeProfilePhoto(user){
    const owner=this.requireUser(user);await this.db.prepare('UPDATE profiles SET photo_key=NULL,updated_at=? WHERE user_id=?').bind(now(),owner).run();return this.profile(user);
  }
  async profilePhoto(user,id){
    const owner=this.requireUser(user),row=await this.db.prepare('SELECT * FROM profiles WHERE user_id=?').bind(id).first();
    if(!row?.photo_key||(id!==owner&&!readProfileDetails(row.details_json).directoryVisible))throw new AppError(404,'Foto indisponível.');
    const object=await this.bucket.get(row.photo_key);if(!object)throw new AppError(404,'Foto indisponível.');return object;
  }
  async own(user, id) {
    const owner = this.requireUser(user);
    const row = await this.db.prepare('SELECT * FROM projects WHERE id = ? AND owner_id = ?').bind(id, owner).first();
    if (!row) throw new AppError(404, 'Projeto não encontrado.');
    return row;
  }
  folderSummary(row){return {id:row.id,name:row.name,colors:palette(row.colors_json),createdAt:row.created_at,updatedAt:row.updated_at};}
  async importLegacyClients(user){
    const owner=this.requireUser(user),legacy=await this.db.prepare('SELECT * FROM client_libraries WHERE owner_id=? AND migrated_at IS NULL ORDER BY created_at,id').bind(owner).all();
    for(const client of legacy.results){
      const fields=folderFields({name:client.name.replace(/[\u0000-\u001f\u007f]/g,' ').trim()||'Cliente'}),date=now();
      const pending='SELECT 1 FROM client_libraries WHERE id=? AND owner_id=? AND migrated_at IS NULL';
      // Each owner's import is atomic and guarded. Concurrent reads cannot repeat it
      // or resurrect a folder removed after it was imported.
      await this.db.batch([
        this.db.prepare(`INSERT INTO project_folders (id,owner_id,name,name_key,created_at,updated_at) SELECT ?,?,?,?,?,? WHERE EXISTS (${pending}) ON CONFLICT(owner_id,name_key) DO NOTHING`).bind(crypto.randomUUID(),owner,fields.name,fields.key,date,date,client.id,owner),
        this.db.prepare(`UPDATE project_folders SET colors_json=(SELECT json_group_array(color) FROM (SELECT lower(value) AS color FROM json_each(project_folders.colors_json) UNION SELECT lower(value) AS color FROM json_each(?))) WHERE owner_id=? AND name_key=? AND EXISTS (${pending})`).bind(JSON.stringify(palette(client.colors_json)),owner,fields.key,client.id,owner),
        this.db.prepare(`UPDATE library_assets SET folder_id=(SELECT id FROM project_folders WHERE owner_id=? AND name_key=?) WHERE owner_id=? AND client_id=? AND EXISTS (${pending})`).bind(owner,fields.key,owner,client.id,client.id,owner),
        this.db.prepare('UPDATE client_libraries SET folder_id=(SELECT id FROM project_folders WHERE owner_id=? AND name_key=?),migrated_at=? WHERE id=? AND owner_id=? AND migrated_at IS NULL').bind(owner,fields.key,date,client.id,owner),
      ]);
    }
  }
  async ownFolder(user,id){
    const owner=this.requireUser(user);
    const row=await this.db.prepare('SELECT * FROM project_folders WHERE id = ? AND owner_id = ?').bind(id,owner).first();
    if(!row)throw new AppError(404,'Pasta não encontrada.');return row;
  }
  async listFolders(user){
    await this.importLegacyClients(user);
    const rows=await this.db.prepare('SELECT * FROM project_folders WHERE owner_id = ? ORDER BY name_key, id').bind(this.requireUser(user)).all();
    return rows.results.map(row=>this.folderSummary(row));
  }
  async createFolder(user,input){
    const owner=this.requireUser(user),fields=folderFields(input),date=now(),id=crypto.randomUUID();
    const row=await this.db.prepare('INSERT INTO project_folders (id,owner_id,name,name_key,created_at,updated_at) VALUES (?,?,?,?,?,?) ON CONFLICT(owner_id,name_key) DO NOTHING RETURNING *').bind(id,owner,fields.name,fields.key,date,date).first();
    if(!row)throw new AppError(409,'Você já tem uma pasta com esse nome.');return this.folderSummary(row);
  }
  async renameFolder(user,id,input){
    folderFields(input);return this.updateFolder(user,id,input);
  }
  async updateFolder(user,id,input){
    const previous=await this.ownFolder(user,id);
    if(!input||typeof input!=='object'||Array.isArray(input)||!['name','colors'].some(key=>Object.hasOwn(input,key)))throw new AppError(400,'Informe o nome ou as cores da pasta.');
    const updates=[],values=[];let condition='';
    if(Object.hasOwn(input,'name')){const fields=folderFields(input);updates.push('name=?','name_key=?');values.push(fields.name,fields.key);condition=' AND NOT EXISTS (SELECT 1 FROM project_folders WHERE owner_id=? AND name_key=? AND id<>?)';}
    if(Object.hasOwn(input,'colors')){
      if(!Array.isArray(input.colors)||input.colors.length>Math.max(64,palette(previous.colors_json).length)||input.colors.some(c=>typeof c!=='string'||!/^#[0-9a-f]{6}$/i.test(c)))throw new AppError(400,'Use cores em hexadecimal, como #ffffff (até 64 cores).');
      updates.push('colors_json=?');values.push(JSON.stringify([...new Set(input.colors.map(c=>c.toLowerCase()))]));
    }
    updates.push('updated_at=?');values.push(now(),id,user.userId);
    if(condition)values.push(user.userId,folderFields(input).key,id);
    const row=await this.db.prepare(`UPDATE project_folders SET ${updates.join(',')} WHERE id=? AND owner_id=?${condition} RETURNING *`).bind(...values).first();
    if(!row)throw new AppError(409,'A pasta mudou ou já existe outra com esse nome. Atualize a lista.');return this.folderSummary(row);
  }
  async removeFolder(user,id){
    await this.ownFolder(user,id);
    // Nullable foreign keys preserve projects and files outside the removed folder.
    await this.db.prepare('DELETE FROM project_folders WHERE id=? AND owner_id=?').bind(id,user.userId).run();
  }
  async moveToFolder(user,id,input){
    await this.own(user,id);
    if(!input||typeof input!=='object'||Array.isArray(input)||!Object.hasOwn(input,'folderId'))throw new AppError(400,'Escolha o destino do projeto.');
    const folderId=folderReference(input.folderId);if(folderId)await this.ownFolder(user,folderId);
    // Moving changes organization only, so it cannot invalidate an art revision or approval.
    const row=await this.db.prepare('UPDATE projects SET folder_id=? WHERE id=? AND owner_id=? AND (? IS NULL OR EXISTS (SELECT 1 FROM project_folders WHERE id=? AND owner_id=?)) RETURNING id,folder_id').bind(folderId,id,user.userId,folderId,folderId,user.userId).first();
    if(!row)throw new AppError(409,'A pasta ou o projeto mudou. Atualize a lista.');return {id:row.id,folderId:row.folder_id};
  }
  serialize(row) {
    return { id: row.id, name: row.name, clientName: row.client_name, templateId: row.template_id, folderId:row.folder_id??null,
      visuals: sanitizeVisuals(JSON.parse(row.visual_json)), hasMap: !!row.map_key, mapName: row.map_name,
      presentation: cleanPresentation(JSON.parse(row.presentation_json || '{}')),
      mapUrl: row.map_key ? `/api/projects/${row.id}/assets/map?v=${row.version}` : null,
      thumbnailUrl: row.thumbnail_key ? `/api/projects/${row.id}/assets/thumbnail?v=${row.version}` : null,
      sharePath: row.share_token ? `/p/${row.share_token}` : null,
      presentationPath: row.proposal_token ? `/proposta/${row.proposal_token}` : row.share_token ? `/p/${row.share_token}` : null,
      reviewed:row.reviewed_version===row.version,reviewedAt:row.reviewed_version===row.version?row.reviewed_at||'':'',
      version: row.version, createdAt: row.created_at, updatedAt: row.updated_at };
  }
  async review(user,id,version){
    const previous=await this.own(user,id);
    if(!Number.isSafeInteger(version)||version!==previous.version)throw new AppError(409,'A apresentação mudou. Salve e confira a versão atual.');
    if(!previous.map_key||!previous.thumbnail_key)throw new AppError(400,'Aplique a arte e salve as quatro vistas antes de concluir a apresentação.');
    const row=await this.db.prepare('UPDATE projects SET reviewed_version=version,reviewed_at=? WHERE id=? AND owner_id=? AND version=? RETURNING *').bind(now(),id,this.requireUser(user),version).first();
    if(!row)throw new AppError(409,'A apresentação mudou durante a conferência. Confira novamente.');return this.serialize(row);
  }
  async list(user) {
    const owner = this.requireUser(user);
    const rows = await this.db.prepare(`SELECT projects.*, (SELECT p.token FROM proposal_versions v JOIN proposal_options o ON o.version_id=v.id JOIN proposals p ON p.id=o.proposal_id WHERE v.project_id=projects.id AND v.owner_id=projects.owner_id AND p.owner_id=projects.owner_id AND p.enabled=1 ORDER BY p.updated_at DESC,p.id LIMIT 1) AS proposal_token FROM projects WHERE owner_id = ? ORDER BY updated_at DESC`).bind(owner).all();
    return rows.results.map((row) => this.serialize(row));
  }
  async create(user, input) {
    const owner = this.requireUser(user), fields = projectFields(input), id = crypto.randomUUID(), date = now();
    const folderId=folderReference(input.folderId);if(folderId)await this.ownFolder(user,folderId);
    const templateId = typeof input.templateId === 'string' ? input.templateId : this.templates ? RETAINED_MOLD_ID : TEMPLATE_ID;
    if (this.templates) await this.templates.available(user, templateId);
    else if(templateId !== TEMPLATE_ID) throw new AppError(404, 'Molde não encontrado.');
    await this.db.prepare('INSERT INTO profiles (user_id, display_name, created_at, updated_at) VALUES (?, ?, ?, ?) ON CONFLICT(user_id) DO NOTHING').bind(owner, user.fullName || 'Designer', date, date).run();
    const created=await this.db.prepare('INSERT INTO projects (id, owner_id, name, client_name, folder_id, template_id, visual_json, presentation_json, version, created_at, updated_at) SELECT ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ? WHERE ? IS NULL OR EXISTS (SELECT 1 FROM project_folders WHERE id=? AND owner_id=?) RETURNING id').bind(id, owner, fields.name, fields.clientName, folderId, templateId, JSON.stringify(fields.visuals), JSON.stringify(fields.presentation), date, date,folderId,folderId,owner).first();
    if(!created)throw new AppError(409,'A pasta foi removida. Atualize a lista e escolha outro destino.');
    return this.serialize(await this.own(user, id));
  }
  async get(user, id) { return this.serialize(await this.own(user, id)); }
  // Internal, atomic creation with art: retries cannot duplicate a simulator
  // version, expose an empty project or replace a presentation edited later.
  async createWithArt(user,id,input,mapFile,thumbnailFile) {
    const owner=this.requireUser(user),fields=projectFields(input),templateId=input.templateId;
    if(!this.templates)throw new AppError(503,'A base da apresentação está indisponível.');
    await this.templates.available(user,templateId);
    const map=await imageUpload(mapFile),thumbnail=await imageUpload(thumbnailFile,true),date=now();
    const prefix=`projects/${id}/${crypto.randomUUID()}`,mapKey=prefix+'/map',thumbnailKey=prefix+'/thumbnail',written=[];
    try {
      written.push(mapKey);await this.bucket.put(mapKey,map.bytes,{httpMetadata:{contentType:map.type}});
      written.push(thumbnailKey);await this.bucket.put(thumbnailKey,thumbnail.bytes,{httpMetadata:{contentType:thumbnail.type}});
      await this.db.prepare('INSERT INTO profiles (user_id,display_name,created_at,updated_at) VALUES (?,?,?,?) ON CONFLICT(user_id) DO NOTHING').bind(owner,user.fullName||'Designer',date,date).run();
      const row=await this.db.prepare('INSERT INTO projects (id,owner_id,name,client_name,template_id,visual_json,presentation_json,map_key,map_name,thumbnail_key,version,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,1,?,?) ON CONFLICT(id) DO NOTHING RETURNING *').bind(id,owner,fields.name,fields.clientName,templateId,JSON.stringify(fields.visuals),JSON.stringify(fields.presentation),mapKey,map.name,thumbnailKey,date,date).first();
      if(row)return this.serialize(row);
      const existing=await this.get(user,id);
      await this.bucket.delete(written).catch(()=>{});return existing;
    }catch(error){await this.bucket.delete(written).catch(()=>{});throw error;}
  }
  async save(user, id, input, mapFile, thumbnailFile) {
    const previous = await this.own(user, id), fields = projectFields(input), expected = revision(input.version);
    if (previous.version !== expected) throw new AppError(409, 'Este projeto foi atualizado em outra aba. Reabra-o para carregar a versão mais recente.');
    const templateId = typeof input.templateId === 'string' ? input.templateId : previous.template_id;
    const switching = templateId !== previous.template_id;
    let keepArt = true;
    if (switching) {
      if (!this.templates) throw new AppError(503, 'A seleção de moldes está indisponível.');
      await this.templates.available(user, templateId);
      const [before, after] = await Promise.all([this.templates.descriptor(previous.template_id), this.templates.descriptor(templateId)]);
      keepArt = compatibleTemplateArt(before, after);
    }
    const uploads = [], date = now();
    let savedRow;
    let mapKey = previous.map_key, thumbnailKey = previous.thumbnail_key, mapName = previous.map_name;
    if ((switching && !keepArt) || input.discardMap === true) { mapKey = null; mapName = null; thumbnailKey = null; }
    if (switching) thumbnailKey = null;
    const map = mapFile ? await imageUpload(mapFile) : null;
    const thumbnail = thumbnailFile ? await imageUpload(thumbnailFile, true) : null;
    if (!this.bucket && (map || thumbnail)) throw new AppError(503, 'O armazenamento está indisponível. Tente novamente.');
    try {
      if (map) {
        mapKey = `projects/${id}/${crypto.randomUUID()}/map`;
        uploads.push(mapKey); await this.bucket.put(mapKey, map.bytes, { httpMetadata: { contentType: map.type } }); mapName = map.name;
        // An old preview must not represent a newly uploaded design.
        thumbnailKey = null;
      }
      if (thumbnail) {
        thumbnailKey = `projects/${id}/${crypto.randomUUID()}/thumbnail`;
        uploads.push(thumbnailKey); await this.bucket.put(thumbnailKey, thumbnail.bytes, { httpMetadata: { contentType: thumbnail.type } });
      }
      savedRow = await this.db.prepare('UPDATE projects SET template_id = ?, name = ?, client_name = ?, visual_json = ?, presentation_json = ?, map_key = ?, map_name = ?, thumbnail_key = ?, version = version + 1, updated_at = ? WHERE id = ? AND owner_id = ? AND version = ? RETURNING *').bind(templateId, fields.name, fields.clientName, JSON.stringify(fields.visuals), JSON.stringify(fields.presentation), mapKey, mapName, thumbnailKey, date, id, user.userId, expected).first();
      if (!savedRow) throw new AppError(409, 'Outra atualização foi salva. Reabra o projeto antes de continuar.');
    } catch (error) {
      if (uploads.length) await this.bucket.delete(uploads).catch(() => {});
      throw error;
    }
    const obsolete = [previous.map_key !== mapKey ? previous.map_key : null, previous.thumbnail_key !== thumbnailKey ? previous.thumbnail_key : null].filter(Boolean);
    if (obsolete.length) await this.bucket.delete(obsolete).catch(() => {});
    return this.serialize(savedRow);
  }
  async remove(user, id) {
    const row = await this.own(user, id);
    await this.db.prepare('DELETE FROM projects WHERE id = ? AND owner_id = ?').bind(id, user.userId).run();
    const keys = [row.map_key, row.thumbnail_key].filter(Boolean);
    if (keys.length) await this.bucket.delete(keys).catch(() => {});
  }
  async share(user, id, enabled) {
    const row = await this.own(user, id);
    if (enabled && !row.map_key) throw new AppError(400, 'Salve uma arte no projeto antes de gerar sua apresentação.');
    if (enabled) await this.db.prepare('UPDATE projects SET share_token = COALESCE(share_token, ?) WHERE id = ? AND owner_id = ?').bind(freshToken(), id, user.userId).run();
    else await this.db.prepare('UPDATE projects SET share_token = NULL WHERE id = ? AND owner_id = ?').bind(id, user.userId).run();
    return this.get(user, id);
  }
  async sharedRow(token) {
    if (!validToken(token)) throw new AppError(404, 'Esta apresentação não está disponível.');
    const row = await this.db.prepare('SELECT projects.*, profiles.display_name AS designer_name FROM projects LEFT JOIN profiles ON projects.owner_id = profiles.user_id WHERE share_token = ?').bind(token).first();
    if (!row?.map_key) throw new AppError(404, 'Esta apresentação não está disponível.');
    return row;
  }
  async presentation(token) {
    const row = await this.sharedRow(token);
    return { name: row.name, designerName: row.designer_name || 'Designer', templateId: row.template_id,
      visuals: sanitizeVisuals(JSON.parse(row.visual_json)), version: row.version, updatedAt: row.updated_at,
      presentation: cleanPresentation(JSON.parse(row.presentation_json || '{}')),
      mapName: row.map_name, mapUrl: `/api/presentations/${token}/assets/map?v=${row.version}` };
  }
  async template(user, id, token = /** @type {string | null} */ (null)) {
    const row = token ? await this.sharedRow(token) : await this.own(user, id);
    const descriptor = this.templates ? await this.templates.descriptor(row.template_id) : { ...BUILTIN_TEMPLATE };
    const prefix = token ? `/api/presentations/${token}` : `/api/projects/${id}`;
    descriptor.modelUrl = `${prefix}/assets/model`;
    descriptor.templateUrl = token ? null : `${prefix}/assets/template`;
    descriptor.proofUrl = token ? null : `${prefix}/assets/proof`;
    return descriptor;
  }
  async asset(user, id, kind, token = /** @type {string | null} */ (null), expectedVersion = /** @type {number | null} */ (null)) {
    if (!['map', 'thumbnail', 'model', 'template', 'proof'].includes(kind)) throw new AppError(404, 'Arquivo não encontrado.');
    const row = token ? await this.sharedRow(token) : await this.own(user, id);
    if(expectedVersion!==null&&(!Number.isSafeInteger(expectedVersion)||expectedVersion!==row.version))throw new AppError(409,'A apresentação mudou. Atualize a lista de apresentações e tente novamente.');
    if (['model', 'template', 'proof'].includes(kind)) {
      if (token && kind !== 'model') throw new AppError(404, 'Arquivo não encontrado.');
      if(this.templates)return this.templates.asset(row.template_id,kind);
      if (row.template_id === TEMPLATE_ID) return { redirect: { model: BUILTIN_TEMPLATE.modelUrl, template: BUILTIN_TEMPLATE.templateUrl, proof: BUILTIN_TEMPLATE.proofUrl }[kind] };
      return this.templates.asset(row.template_id, kind);
    }
    const key = kind === 'map' ? row.map_key : row.thumbnail_key;
    if (!key) throw new AppError(404, 'Arquivo não encontrado.');
    const object = await this.bucket.get(key);
    if (!object) throw new AppError(404, 'Arquivo não encontrado.');
    return object;
  }
}
