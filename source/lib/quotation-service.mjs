import {AppError} from './project-service.mjs';
import {cleanQuotation,calculateQuotation} from '../public/quotation-core.js';
export class QuotationService{
 constructor(db,projects){this.db=db;this.projects=projects;}
 owner(user){if(!user?.userId)throw new AppError(401,'Entre para abrir os orçamentos.');return user.userId;}
 async ready(){if(!this.db)throw new AppError(503,'Orçamentos temporariamente indisponíveis.');}
 decode(row){return {id:row.id,version:row.version,createdAt:row.created_at,updatedAt:row.updated_at,document:JSON.parse(row.document_json)};}
 async list(user){const owner=this.owner(user);await this.ready();const {results}=await this.db.prepare('SELECT * FROM sales_quotations WHERE owner_id=? ORDER BY updated_at DESC LIMIT 200').bind(owner).all();return results.map(r=>this.decode(r));}
 async get(user,id){const owner=this.owner(user);await this.ready();const row=await this.db.prepare('SELECT * FROM sales_quotations WHERE id=? AND owner_id=?').bind(id,owner).first();if(!row)throw new AppError(404,'Orçamento não encontrado.');return this.decode(row);}
 async save(user,id,input){const owner=this.owner(user);await this.ready();let document;try{document=cleanQuotation(input?.document);const q=calculateQuotation(document,{draft:false});if(q.issues.length)throw Error(q.issues.join(' '));}catch(e){throw new AppError(400,e.message);}
 if(document.presentation){const project=await this.projects.get(user,document.presentation.id);if(project.version!==document.presentation.version)throw new AppError(409,'A apresentação mudou. Selecione novamente a versão atual.');}
 const at=new Date().toISOString();let row;
 if(id){if(!Number.isSafeInteger(input.version)||input.version<1)throw new AppError(400,'Confira a versão do orçamento.');row=await this.db.prepare('UPDATE sales_quotations SET document_json=?,version=version+1,updated_at=? WHERE id=? AND owner_id=? AND version=? RETURNING *').bind(JSON.stringify(document),at,id,owner,input.version).first();if(!row){await this.get(user,id);throw new AppError(409,'Este orçamento mudou em outra aba. Reabra antes de salvar.');}}
 else row=await this.db.prepare('INSERT INTO sales_quotations (id,owner_id,document_json,version,created_at,updated_at) VALUES (?,?,?,1,?,?) RETURNING *').bind(crypto.randomUUID(),owner,JSON.stringify(document),at,at).first();return this.decode(row);
 }
 async remove(user,id,input){const previous=await this.get(user,id);if(input?.version!==previous.version)throw new AppError(409,'Este orçamento mudou. Reabra antes de excluir.');const row=await this.db.prepare('DELETE FROM sales_quotations WHERE id=? AND owner_id=? AND version=? RETURNING id').bind(id,this.owner(user),input.version).first();if(!row)throw new AppError(409,'O orçamento mudou.');return {deleted:true};}
}
