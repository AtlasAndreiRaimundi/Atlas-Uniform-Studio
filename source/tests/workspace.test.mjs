import assert from 'node:assert/strict';
import {test} from 'node:test';
import {DatabaseSync} from 'node:sqlite';
import {readFile} from 'node:fs/promises';
import {ProjectService} from '../lib/project-service.mjs';
import {TemplateService} from '../lib/template-service.mjs';
import {WorkspaceService} from '../lib/workspace-service.mjs';
import {APPROVAL_STATEMENT,cleanAnchor,cleanCamera} from '../public/presentation-contract.js';
import {migrations} from './migrations.mjs';
const original=new Uint8Array(await readFile(new URL('./fixtures/blank-map-4096.png',import.meta.url))),map=new File([original],'mapa-aprovacao.png',{type:'image/png'});
const alice={userId:'alice',fullName:'Andrei Design',email:'alice@example.test'},bob={userId:'bob',fullName:'Outro Design'},base={name:'Principal',clientName:'Equipe A',visuals:{background:'dark'},presentation:{layout:'grid',camera:{position:[0,0,5],target:[0,0,0]},details:[{id:'gola',name:'Gola',camera:{position:[0,1,1],target:[0,1,0]}}]}};
const anchor={point:[.3,.5,.2],panel:'Frente',camera:{position:[0,0,5],target:[0,0,0]}};
function setup(){
  const sql=new DatabaseSync(':memory:');sql.exec('PRAGMA foreign_keys=ON');migrations.forEach(m=>sql.exec(m));
  const db={prepare(query){const statement=sql.prepare(query);let args=[];return {bind(...values){args=values;return this;},async first(){return statement.get(...args)||null;},async all(){return {results:statement.all(...args)};},async run(){return {meta:{changes:Number(statement.run(...args).changes)}};},runSync(){return statement.run(...args);}};},async batch(statements){sql.exec('BEGIN');try{const result=statements.map(s=>s.runSync());sql.exec('COMMIT');return result;}catch(error){sql.exec('ROLLBACK');throw error;}}};
  const objects=new Map(),bucket={async put(key,value,options){const bytes=value instanceof Uint8Array?value.slice():new Uint8Array(await new Response(value).arrayBuffer());objects.set(key,{bytes,...options});},async get(key){const obj=objects.get(key);return obj?{...obj,body:new Blob([obj.bytes]).stream()}:null;},async delete(keys){for(const key of Array.isArray(keys)?keys:[keys])objects.delete(key);}};
  const templates=new TemplateService(db,bucket,'alice'),projects=new ProjectService(db,bucket,templates),workspace=new WorkspaceService(db,bucket,projects,templates);
  async function saved(user=alice,input=base){const project=await projects.create(user,input);return projects.save(user,project.id,{...input,version:project.version},map);}
  async function proposal(project){const entry=await workspace.createProposal(alice,{name:'Proposta Equipe A',clientName:'Equipe A',options:[{projectId:project.id,version:project.version}]});return {...entry,token:entry.path.split('/').at(-1)};}
  return {sql,db,bucket,objects,templates,projects,workspace,saved,proposal};
}
test('presets, client files and proposals are isolated by trusted owner identity',async()=>{
  const {workspace,saved,proposal,objects}=setup();await assert.rejects(workspace.overview(null),{status:401});
  const client=await workspace.saveClient(alice,{name:'Equipe A',colors:['#ffffff','#0011aa']}),asset=await workspace.uploadAsset(alice,{clientId:client.id,name:'Logo',kind:'logo'},map);
  await workspace.savePreset(alice,{name:'Atlas escuro',settings:{visuals:{brightness:999},presentation:base.presentation}});
  const entry=await proposal(await saved()),before=objects.size;
  await assert.rejects(workspace.client(bob,client.id),{status:404});await assert.rejects(workspace.libraryAsset(bob,asset.id),{status:404});await assert.rejects(workspace.uploadAsset(bob,{clientId:client.id,kind:'arte'},map),{status:404});
  await assert.rejects(workspace.ownerDetail(bob,entry.id),{status:404});await assert.rejects(workspace.disableProposal(bob,entry.id),{status:404});assert.equal(objects.size,before);
  const mine=await workspace.overview(alice),other=await workspace.overview(bob);assert.equal(mine.presets[0].settings.visuals.brightness,160);assert.equal(mine.assets.length,1);assert.equal(other.clients.length+other.presets.length+other.assets.length+other.proposals.length,0);
});
test('a sent version retains original artwork, details and camera after later edits and project deletion',async()=>{
  const {workspace,projects,saved,proposal,objects}=setup(),project=await saved(),entry=await proposal(project),first=await workspace.sharedDetail(entry.token),version=first.versions[0];
  const before=await workspace.versionAsset(entry.token,version.id,'map');assert.deepEqual(before.bytes,original);assert.equal(version.presentation.details[0].name,'Gola');assert.equal(version.presentation.layout,'grid');
  await projects.save(alice,project.id,{...base,name:'Nova arte',visuals:{background:'light'},presentation:{details:[]},version:project.version},map);
  await projects.remove(alice,project.id);const frozen=await workspace.sharedDetail(entry.token);assert.equal(frozen.versions[0].name,'Principal');assert.equal(frozen.versions[0].visuals.background,'dark');assert.equal(frozen.versions[0].presentation.details[0].name,'Gola');assert.deepEqual((await workspace.versionAsset(entry.token,version.id,'map')).bytes,original);assert.equal(objects.size,1);
  const publicJson=JSON.stringify(frozen);for(const secret of ['ownerId','owner_id','map_key','projectId','alice@example.test'])assert.ok(!publicJson.includes(secret));
});
test('options bind exact revisions and cannot borrow another proposal or owner version',async()=>{
  const {workspace,saved,proposal}=setup(),a=await saved(),b=await saved(alice,{...base,name:'Visitante'}),foreign=await saved(bob);
  const entry=await proposal(a);await workspace.addOption(alice,{proposalId:entry.id,projectId:b.id,version:b.version});const detail=await workspace.sharedDetail(entry.token);assert.equal(detail.versions.length,2);assert.notEqual(detail.versions[0].id,detail.versions[1].id);
  const unrelated=await proposal(b);const isolated=await proposal(await saved(alice,{...base,name:'Terceira'}));
  await assert.rejects(workspace.versionAsset(isolated.token,detail.versions[0].id,'map'),{status:404});await assert.rejects(workspace.addOption(alice,{proposalId:entry.id,projectId:foreign.id}),{status:404});
  await assert.rejects(workspace.freeze(alice,a.id,1),{status:409});assert.equal((await workspace.sharedDetail(unrelated.token)).versions.length,1);
  await workspace.addOption(alice,{proposalId:entry.id,projectId:a.id,version:a.version});assert.equal((await workspace.sharedDetail(entry.token)).versions.length,2);
});
test('piece comments require a real bounded anchor and only the owner can mark them ALTERADO',async()=>{
  const {workspace,saved,proposal}=setup(),entry=await proposal(await saved()),version=(await workspace.sharedDetail(entry.token)).versions[0];
  const input={versionId:version.id,authorName:'Cliente A',body:'Aumentar o escudo',anchor,status:'changed'};
  await assert.rejects(workspace.comment(entry.token,{...input,anchor:null}),{status:400});await assert.rejects(workspace.comment(entry.token,{...input,anchor:{...anchor,point:[Infinity,0,0]}}),{status:400});
  let detail=await workspace.comment(entry.token,input);assert.equal(detail.comments[0].status,'open');assert.equal(detail.comments[0].versionId,version.id);
  const id=detail.comments[0].id;await assert.rejects(workspace.markComment(bob,{proposalId:entry.id,commentId:id,status:'changed'}),{status:404});
  detail=await workspace.markComment(alice,{proposalId:entry.id,commentId:id,status:'changed'});assert.equal(detail.comments[0].status,'changed');assert.ok(detail.comments[0].changedAt);
  detail=await workspace.markComment(alice,{proposalId:entry.id,commentId:id,status:'open'});assert.equal(detail.comments[0].changedAt,null);assert.equal((await workspace.overview(alice)).proposals[0].pending,1);
});
test('parallel public comments obey the proposal limit and revocation blocks writes already in flight',async()=>{
  const {workspace,saved,proposal,sql}=setup(),entry=await proposal(await saved()),version=(await workspace.sharedDetail(entry.token)).versions[0];
  const input={versionId:version.id,authorName:'Cliente',body:'Conferir escudo',anchor};
  const attempts=await Promise.allSettled(Array.from({length:45},()=>workspace.comment(entry.token,input)));
  assert.equal(attempts.filter(r=>r.status==='fulfilled').length,30);
  assert.equal(sql.prepare('SELECT COUNT(*) AS count FROM piece_comments WHERE proposal_id=?').get(entry.id).count,30);
  for(const attempt of attempts.filter(r=>r.status==='rejected'))assert.equal(attempt.reason.status,429);
  const other=await proposal(await saved()),original=workspace.option.bind(workspace);
  workspace.option=async(...args)=>{const option=await original(...args);await workspace.disableProposal(alice,other.id);return option;};
  const second=(await workspace.ownerDetail(alice,other.id)).versions[0];
  await assert.rejects(workspace.comment(other.token,{...input,versionId:second.id}),{status:404});
  assert.equal(sql.prepare('SELECT COUNT(*) AS count FROM piece_comments WHERE proposal_id=?').get(other.id).count,0);
  const third=await proposal(await saved()),thirdVersion=(await workspace.ownerDetail(alice,third.id)).versions[0];
  workspace.option=async(...args)=>{const option=await original(...args);await workspace.disableProposal(alice,third.id);return option;};
  await assert.rejects(workspace.approve(third.token,{versionId:thirdVersion.id,authorName:'Cliente',statement:APPROVAL_STATEMENT,confirmed:true}),{status:404});
  assert.equal(sql.prepare('SELECT COUNT(*) AS count FROM proposal_approvals WHERE proposal_id=?').get(third.id).count,0);
});
test('a proposal keeps at most eight options and re-adding an included revision is idempotent',async()=>{
  const {workspace,saved,proposal}=setup(),first=await saved(),entry=await proposal(first);
  for(let index=1;index<8;index++){const project=await saved(alice,{...base,name:`Opção ${index+1}`});await workspace.addOption(alice,{proposalId:entry.id,projectId:project.id,version:project.version});}
  const extra=await saved(alice,{...base,name:'Nona opção'});await assert.rejects(workspace.addOption(alice,{proposalId:entry.id,projectId:extra.id,version:extra.version}),{status:400});
  const again=await workspace.addOption(alice,{proposalId:entry.id,projectId:first.id,version:first.version});assert.equal(again.alreadyIncluded,true);assert.equal((await workspace.sharedDetail(entry.token)).versions.length,8);
});
test('approval records keep first signer and time for the exact option; a new revision stays unapproved',async()=>{
  const {workspace,projects,saved,proposal}=setup(),project=await saved(),entry=await proposal(project),version=(await workspace.sharedDetail(entry.token)).versions[0];
  const input={versionId:version.id,authorName:'Responsável A',statement:APPROVAL_STATEMENT,confirmed:true};
  await assert.rejects(workspace.approve(entry.token,{...input,confirmed:false}),{status:400});await assert.rejects(workspace.approve(entry.token,{...input,statement:'ok'}),{status:400});
  let detail=await workspace.approve(entry.token,input);const record=detail.approvals[0];await workspace.approve(entry.token,{...input,authorName:'Outra pessoa'});assert.deepEqual((await workspace.sharedDetail(entry.token)).approvals[0],record);
  const revised=await projects.save(alice,project.id,{...base,version:project.version},map);await workspace.addOption(alice,{proposalId:entry.id,projectId:project.id,version:revised.version});detail=await workspace.sharedDetail(entry.token);assert.equal(detail.versions.length,2);assert.equal(detail.approvals.length,1);assert.equal(detail.approvals[0].versionId,version.id);
  await workspace.disableProposal(alice,entry.id);for(const operation of [()=>workspace.sharedDetail(entry.token),()=>workspace.comment(entry.token,{...input,body:'Teste',anchor}),()=>workspace.approve(entry.token,input),()=>workspace.versionAsset(entry.token,version.id,'map')])await assert.rejects(operation(),{status:404});assert.equal((await workspace.ownerDetail(alice,entry.id)).approvals.length,1);
});
test('failed snapshot writes clean their uploads and leave the saved project readable',async()=>{
  const {workspace,projects,saved,db,bucket,objects,templates}=setup(),project=await saved(),count=objects.size;
  const broken={...db,prepare(query){if(query.startsWith('INSERT INTO proposal_versions'))throw new Error('Storage metadata failure');return db.prepare(query);}};
  const failing=new WorkspaceService(broken,bucket,projects,templates);await assert.rejects(failing.freeze(alice,project.id,project.version),/Storage metadata failure/);assert.equal(objects.size,count);assert.deepEqual((await projects.asset(alice,project.id,'map')).bytes,original);
});
test('camera and anchor validation reject non-finite and malformed coordinates',()=>{
  assert.equal(cleanCamera({position:[0,0,0],target:[0,0,0]}),null);assert.equal(cleanCamera({position:[0,0,500],target:[0,0,0]}),null);assert.equal(cleanAnchor({...anchor,point:[0,100,0]}),null);assert.deepEqual(cleanAnchor(anchor),anchor);
});

test('project link filters include active proposals and folder moves preserve the approved version',async()=>{
  const {projects,workspace,saved,proposal}=setup(),project=await saved(),entry=await proposal(project),folder=await projects.createFolder(alice,{name:'ADEMA'});
  assert.equal((await projects.list(alice))[0].presentationPath,entry.path);
  const version=(await workspace.sharedDetail(entry.token)).versions[0];
  await workspace.approve(entry.token,{versionId:version.id,authorName:'Cliente',statement:APPROVAL_STATEMENT,confirmed:true});
  await projects.moveToFolder(alice,project.id,{folderId:folder.id});await projects.removeFolder(alice,folder.id);
  const after=await workspace.sharedDetail(entry.token);assert.equal(after.versions[0].id,version.id);assert.equal(after.approvals[0].versionId,version.id);assert.equal((await projects.get(alice,project.id)).version,project.version);
  const legacy=await projects.share(alice,project.id,true);await workspace.disableProposal(alice,entry.id);
  assert.equal((await projects.list(alice))[0].presentationPath,legacy.sharePath);
  await projects.share(alice,project.id,false);assert.equal((await projects.list(alice))[0].presentationPath,null);
});

test('legacy libraries merge into matching owner folders once, preserving colors, projects and original files',async()=>{
  const {sql,workspace,projects,bucket,objects,saved}=setup(),folder=await projects.createFolder(alice,{name:'ADEMA'});
  await projects.updateFolder(alice,folder.id,{colors:['#112233']});const project=await saved(alice,{...base,folderId:folder.id});
  const insert=sql.prepare('INSERT INTO client_libraries (id,owner_id,name,colors_json,created_at,updated_at) VALUES (?,?,?,?,?,?)');
  insert.run('legacy-a','alice','adema','["#FFFFFF","#0011aa"]','2026-01-01','2026-01-01');insert.run('legacy-b','alice','ADEMA','["#ffffff","#ee0011"]','2026-01-02','2026-01-02');insert.run('legacy-bob','bob','ADEMA','["#010203"]','2026-01-01','2026-01-01');
  await bucket.put('legacy/file',original,{httpMetadata:{contentType:'image/png'}});
  sql.prepare('INSERT INTO library_assets (id,owner_id,client_id,name,kind,file_key,content_type,file_name,size,created_at) VALUES (?,?,?,?,?,?,?,?,?,?)').run('legacy-asset','alice','legacy-b','Escudo oficial','logo','legacy/file','image/png','escudo.png',original.length,'2026-01-01');
  let overview=await workspace.overview(alice);assert.equal(overview.folders.length,1);assert.equal(overview.folders[0].id,folder.id);assert.deepEqual(overview.clients,overview.folders);assert.deepEqual(new Set(overview.folders[0].colors),new Set(['#112233','#ffffff','#0011aa','#ee0011']));assert.equal(overview.assets[0].folderId,folder.id);
  assert.equal((await workspace.client(alice,'legacy-b')).id,folder.id);assert.deepEqual((await workspace.libraryAsset(alice,'legacy-asset')).object.bytes,original);assert.equal(sql.prepare('SELECT file_key FROM library_assets WHERE id=?').get('legacy-asset').file_key,'legacy/file');assert.equal((await projects.get(alice,project.id)).version,project.version);
  assert.equal(sql.prepare('SELECT migrated_at FROM client_libraries WHERE id=?').get('legacy-bob').migrated_at,null);
  await assert.rejects(workspace.client(bob,'legacy-a'),{status:404});assert.equal((await projects.listFolders(bob)).length,1);
  const count=objects.size;await projects.updateFolder(alice,folder.id,{name:'ADEMA Futsal',colors:['#778899']});overview=await workspace.overview(alice);assert.equal(overview.folders.length,1);assert.deepEqual(overview.folders[0].colors,['#778899']);
  await projects.removeFolder(alice,folder.id);overview=await workspace.overview(alice);assert.equal(overview.folders.length,0);assert.equal(overview.assets[0].folderId,null);assert.equal((await projects.get(alice,project.id)).folderId,null);assert.equal(sql.prepare('SELECT folder_id FROM client_libraries WHERE id=?').get('legacy-a').folder_id,null);assert.equal(objects.size,count);assert.deepEqual((await workspace.libraryAsset(alice,'legacy-asset')).object.bytes,original);await assert.rejects(workspace.client(alice,'legacy-a'),{status:404});
});

test('canonical folder uploads and the cached client API never create a parallel client library',async()=>{
  const {workspace,projects,sql}=setup(),folder=await projects.createFolder(alice,{name:'Equipe A'});
  await projects.updateFolder(alice,folder.id,{colors:['#112233']});
  const cached=await workspace.saveClient(alice,{name:'equipe a',colors:[]});assert.equal(cached.id,folder.id);assert.deepEqual(cached.colors,['#112233']);
  const created=await workspace.saveClient(alice,{name:'Equipe B',colors:['#FFFFFF']});assert.deepEqual(created.colors,['#ffffff']);assert.equal(sql.prepare('SELECT COUNT(*) AS total FROM client_libraries').get().total,0);
  const asset=await workspace.uploadAsset(alice,{folderId:folder.id,name:'Patrocinador',kind:'patrocinador'},map);assert.equal(asset.folderId,folder.id);assert.equal(asset.clientId,folder.id);
  const renamed=await workspace.saveClient(alice,{id:folder.id,name:'Equipe A 2027',colors:['#112233']});assert.equal(renamed.id,folder.id);assert.equal((await projects.listFolders(alice)).length,2);
});

test('file moves enforce both owners, preserve file bytes and retain unfiled assets after folder deletion',async()=>{
  const {workspace,projects,objects}=setup(),a=await projects.createFolder(alice,{name:'ADEMA'}),b=await projects.createFolder(alice,{name:'Treino'}),foreign=await projects.createFolder(bob,{name:'Outra equipe'}),asset=await workspace.uploadAsset(alice,{folderId:a.id,name:'Mapa',kind:'arte'},map),before=[...objects.keys()];
  await assert.rejects(workspace.moveAsset(bob,asset.id,{folderId:foreign.id}),{status:404});await assert.rejects(workspace.moveAsset(alice,asset.id,{folderId:foreign.id}),{status:404});
  for(const input of [{},{folderId:3},{folderId:''},null])await assert.rejects(workspace.moveAsset(alice,asset.id,input),{status:400});
  assert.equal((await workspace.moveAsset(alice,asset.id,{folderId:b.id})).folderId,b.id);await projects.removeFolder(alice,b.id);assert.equal((await workspace.overview(alice)).assets[0].folderId,null);
  assert.equal((await workspace.moveAsset(alice,asset.id,{folderId:a.id})).folderId,a.id);assert.equal((await workspace.moveAsset(alice,asset.id,{folderId:null})).folderId,null);assert.deepEqual([...objects.keys()],before);assert.deepEqual((await workspace.libraryAsset(alice,asset.id)).object.bytes,original);assert.equal((await workspace.overview(bob)).assets.length,0);
  await workspace.removeAsset(alice,asset.id);await assert.rejects(workspace.moveAsset(alice,asset.id,{folderId:a.id}),{status:404});
});

test('folder palette edits preserve project revisions and approval while validating account and color input',async()=>{
  const {workspace,projects,saved,proposal}=setup(),folder=await projects.createFolder(alice,{name:'ADEMA'}),project=await saved(alice,{...base,folderId:folder.id}),entry=await proposal(project),version=(await workspace.sharedDetail(entry.token)).versions[0];
  await workspace.approve(entry.token,{versionId:version.id,authorName:'Cliente',statement:APPROVAL_STATEMENT,confirmed:true});
  for(const colors of [null,['red'],['#fff'],[4],Array(65).fill('#ffffff')])await assert.rejects(projects.updateFolder(alice,folder.id,{colors}),{status:400});await assert.rejects(projects.updateFolder(bob,folder.id,{colors:['#000000']}),{status:404});
  assert.deepEqual((await projects.updateFolder(alice,folder.id,{colors:['#FFFFFF','#ffffff','#0011aa']})).colors,['#ffffff','#0011aa']);assert.equal((await projects.get(alice,project.id)).updatedAt,project.updatedAt);assert.equal((await projects.get(alice,project.id)).version,project.version);assert.equal((await workspace.sharedDetail(entry.token)).approvals[0].versionId,version.id);
});
