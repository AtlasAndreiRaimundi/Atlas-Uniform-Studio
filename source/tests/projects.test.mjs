import assert from 'node:assert/strict';
import { test } from 'node:test';
import { DatabaseSync } from 'node:sqlite';
import { readFile } from 'node:fs/promises';
import { ProjectService, imageUpload, projectFields } from '../lib/project-service.mjs';
import {migrations} from './migrations.mjs';
const migration=migrations.join('\n');
const alice = { userId: 'alice', email: 'alice@example.test', fullName: 'Estúdio Alice' };
const bob = { userId: 'bob', email: 'bob@example.test', fullName: 'Estúdio Bob' };
const map = new File([await readFile(new URL('../public/assets/mapa-conferencia.png', import.meta.url))], 'minha-arte.png', { type: 'image/png' });
const base = { name: 'Uniforme principal', clientName: 'Cliente A', visuals: { brightness: 112, background: 'dark' } };

test('presentation completion pins the reviewed version, requires saved art and is invalidated by a later save',async()=>{
 const {store}=setup(),created=await store.create(alice,base);assert.equal(created.reviewed,false);
 await assert.rejects(store.review(alice,created.id,created.version),{status:400});await assert.rejects(store.review(bob,created.id,created.version),{status:404});
 const saved=await store.save(alice,created.id,{...base,version:created.version},map,map);assert.equal(saved.reviewed,false);
 await assert.rejects(store.review(alice,created.id,created.version),{status:409});const checked=await store.review(alice,created.id,saved.version);assert.equal(checked.reviewed,true);assert.ok(checked.reviewedAt);assert.equal((await store.get(alice,created.id)).reviewed,true);
 const edited=await store.save(alice,created.id,{...base,name:'Alterado',version:checked.version});assert.equal(edited.reviewed,false);assert.equal(edited.reviewedAt,'');
});
function setup() {
  const sql = new DatabaseSync(':memory:'); sql.exec('PRAGMA foreign_keys=ON'); sql.exec(migration);
  const db = { prepare(query) { const statement = sql.prepare(query); let values = []; return {
    bind(...args) { values = args; return this; },
    async first() { return statement.get(...values) || null; },
    async all() { return { results: statement.all(...values) }; },
    async run() { return { meta: { changes: Number(statement.run(...values).changes) } }; },
  }; } };
  const objects = new Map();
  const bucket = {
    async put(key, bytes, options) { objects.set(key, { bytes: bytes.slice(), ...options }); },
    async get(key) { const obj = objects.get(key); return obj ? { ...obj, body: new Blob([obj.bytes]).stream() } : null; },
    async delete(keys) { for (const key of Array.isArray(keys) ? keys : [keys]) objects.delete(key); },
  };
  return { store: new ProjectService(db, bucket), sql, db, bucket, objects };
}

test('anonymous users and another account cannot read, mutate, share, delete, or fetch private art', async () => {
  const { store, objects } = setup();
  await assert.rejects(store.list(null), { status: 401 });
  const first = await store.create(alice, base), other = await store.create(bob, { ...base, name: 'Projeto do Bob' });
  await store.save(alice, first.id, { ...base, version: 1 }, map);
  assert.deepEqual((await store.list(alice)).map(p => p.id), [first.id]);
  assert.deepEqual((await store.list(bob)).map(p => p.id), [other.id]);
  const count = objects.size;
  for (const action of [() => store.get(bob, first.id), () => store.save(bob, first.id, { ...base, version: 2 }, map), () => store.share(bob, first.id, true), () => store.remove(bob, first.id), () => store.asset(bob, first.id, 'map')]) await assert.rejects(action(), { status: 404 });
  assert.equal(objects.size, count);
});

test('projects reopen with the original image, metadata and saved presentation settings', async () => {
  const { store } = setup();
  const created = await store.create(alice, base);
  const saved = await store.save(alice, created.id, { ...base, version: 1 }, map);
  assert.equal(saved.version, 2); assert.equal(saved.hasMap, true); assert.equal(saved.visuals.brightness, 112);
  const reopened = await store.get(alice, created.id); assert.equal(reopened.mapName, 'minha-arte.png');
  const image = await store.asset(alice, created.id, 'map');
  assert.deepEqual(image.bytes, new Uint8Array(await map.arrayBuffer()));
});
test('drawing attachments can require an exact saved version without exposing another account artwork',async()=>{
 const {store}=setup(),created=await store.create(alice,base),saved=await store.save(alice,created.id,{...base,version:1},map,map);
 assert.ok((await store.asset(alice,created.id,'thumbnail',null,saved.version)).bytes.length);
 await store.save(alice,created.id,{...base,version:saved.version},map,map);
 await assert.rejects(store.asset(alice,created.id,'thumbnail',null,saved.version),{status:409});
 await assert.rejects(store.asset(bob,created.id,'thumbnail',null,saved.version),{status:404});
});

test('a client link stays the same after art updates, shows the new version, and exposes only presentation data', async () => {
  const { store } = setup(); const created = await store.create(alice, base);
  await store.save(alice, created.id, { ...base, version: 1 }, map);
  const shared = await store.share(alice, created.id, true), token = shared.sharePath.split('/').at(-1);
  assert.equal(token.length, 43);
  const first = await store.presentation(token); assert.equal(first.designerName, 'Estúdio Alice');
  assert.equal(Object.hasOwn(first, 'ownerId'), false); assert.equal(JSON.stringify(first).includes(alice.email), false);
  await store.save(alice, created.id, { ...base, name: 'Uniforme revisado', version: 2, visuals: { background: 'gray', contrast: 120 } }, map);
  const revised = await store.share(alice, created.id, true);
  assert.equal(revised.sharePath, shared.sharePath);
  const latest = await store.presentation(token); assert.equal(latest.name, 'Uniforme revisado'); assert.equal(latest.version, 3); assert.equal(latest.visuals.contrast, 120);
  assert.ok((await store.asset(null, null, 'map', token)).bytes.length);
});

test('revoking a link or deleting a project denies subsequent public reads and private files are removed', async () => {
  const { store, objects } = setup(); const p = await store.create(alice, base);
  await store.save(alice, p.id, { ...base, version: 1 }, map);
  const first = await store.share(alice, p.id, true); const token = first.sharePath.split('/').at(-1);
  await store.share(alice, p.id, false);
  await assert.rejects(store.presentation(token), { status: 404 });
  await assert.rejects(store.asset(null, null, 'map', token), { status: 404 });
  const fresh = await store.share(alice, p.id, true); assert.notEqual(fresh.sharePath, first.sharePath);
  await store.remove(alice, p.id); assert.equal(objects.size, 0);
  await assert.rejects(store.presentation(fresh.sharePath.split('/').at(-1)), { status: 404 });
});

test('stale saves cannot overwrite a newer revision or replace its image', async () => {
  const { store, objects } = setup(); const p = await store.create(alice, base);
  await store.save(alice, p.id, { ...base, version: 1 }, map);
  await assert.rejects(store.save(alice, p.id, { ...base, name: 'Old version', version: 1 }, map), { status: 409 });
  assert.equal((await store.get(alice, p.id)).name, base.name); assert.equal(objects.size, 1);
});

test('failed database saves roll back new file uploads without deleting the previous image', async () => {
  const { store, db, bucket, objects } = setup(); const p = await store.create(alice, base);
  await store.save(alice, p.id, { ...base, version: 1 }, map);
  const key = [...objects.keys()][0];
  const failing = new ProjectService({ prepare(query) { if (query.startsWith('UPDATE projects SET name')) throw new Error('Database unavailable'); return db.prepare(query); } }, bucket);
  await assert.rejects(failing.save(alice, p.id, { ...base, version: 2 }, map), /Database unavailable/);
  assert.equal(objects.size, 1); assert.ok(objects.has(key)); assert.equal((await store.get(alice, p.id)).version, 2);
});

test('profile signatures persist per account and are reflected in client presentations', async () => {
  const { store } = setup(); const p = await store.create(alice, base);
  await store.save(alice, p.id, { ...base, version: 1 }, map); const shared = await store.share(alice, p.id, true);
  await store.updateProfile(alice, { displayName: 'A. Design' });
  assert.equal((await store.profile(alice)).displayName, 'A. Design');
  assert.equal((await store.profile(bob)).displayName, 'Estúdio Bob');
  assert.equal((await store.presentation(shared.sharePath.split('/').at(-1))).designerName, 'A. Design');
});

test('empty projects cannot be shared; invalid files and out-of-range settings are handled', async () => {
  const { store } = setup(); const p = await store.create(alice, base);
  await assert.rejects(store.share(alice, p.id, true), { status: 400 });
  await assert.rejects(imageUpload(new File(['<svg/>'], 'fake.png', { type: 'image/png' })), { status: 400 });
  assert.throws(() => projectFields({ name: '' }), { status: 400 });
  const fields = projectFields({ name: '  Teste  ', visuals: { brightness: 999, contrast: -1, background: 'invalid' } });
  assert.equal(fields.name, 'Teste'); assert.equal(fields.visuals.brightness, 160); assert.equal(fields.visuals.contrast, 80);
  await assert.rejects(store.presentation('guessed-token'), { status: 404 });
});

test('folders are private to the trusted account and have unique human-readable names',async()=>{
  const {store}=setup();await assert.rejects(store.listFolders(null),{status:401});await assert.rejects(store.createFolder(null,{name:'ADEMA'}),{status:401});
  const folder=await store.createFolder(alice,{name:'  ADEMA  ',ownerId:bob.userId}),other=await store.createFolder(bob,{name:'ADEMA'});
  assert.equal(folder.name,'ADEMA');assert.deepEqual((await store.listFolders(alice)).map(f=>f.id),[folder.id]);assert.deepEqual((await store.listFolders(bob)).map(f=>f.id),[other.id]);
  await assert.rejects(store.createFolder(alice,{name:'adema'}),{status:409});
  for(const input of [{name:''},{name:'A'.repeat(101)},{name:'ADEMA\nTreino'},null])await assert.rejects(store.createFolder(alice,input),{status:400});
  for(const action of [()=>store.ownFolder(bob,folder.id),()=>store.renameFolder(bob,folder.id,{name:'Outra'}),()=>store.removeFolder(bob,folder.id)])await assert.rejects(action(),{status:404});
  assert.equal((await store.renameFolder(alice,folder.id,{name:'ADEMA Futsal'})).name,'ADEMA Futsal');
  await store.createFolder(alice,{name:'Treino'});await assert.rejects(store.renameFolder(alice,folder.id,{name:'treino'}),{status:409});
});

test('projects can be created in folders or moved without changing the artwork, revision or client link',async()=>{
  const {store,objects}=setup(),folder=await store.createFolder(alice,{name:'ADEMA'});
  const first=await store.create(alice,{...base,name:'Modelo de jogo 1',folderId:folder.id});
  await store.create(alice,{...base,name:'Modelo de jogo 2',folderId:folder.id});await store.create(alice,{...base,name:'Treino',folderId:folder.id});
  assert.equal((await store.get(alice,first.id)).folderId,folder.id);assert.equal((await store.list(alice)).filter(p=>p.folderId===folder.id).length,3);
  await store.save(alice,first.id,{...base,name:first.name,version:1},map);const linked=await store.share(alice,first.id,true),files=[...objects.keys()];
  await store.moveToFolder(alice,first.id,{folderId:null});const moved=await store.get(alice,first.id);
  assert.equal(moved.folderId,null);assert.equal(moved.version,linked.version);assert.equal(moved.updatedAt,linked.updatedAt);assert.equal(moved.sharePath,linked.sharePath);assert.equal(moved.mapUrl,linked.mapUrl);assert.deepEqual([...objects.keys()],files);
  await store.moveToFolder(alice,first.id,{folderId:folder.id});
  const saved=await store.save(alice,first.id,{...base,name:first.name,version:moved.version},null);
  assert.equal(saved.folderId,folder.id);assert.equal(saved.sharePath,linked.sharePath);
});

test('foreign folders, foreign projects and malformed move destinations are rejected before changes',async()=>{
  const {store}=setup(),mine=await store.createFolder(alice,{name:'Minha'}),foreign=await store.createFolder(bob,{name:'Outra'}),p=await store.create(alice,base),other=await store.create(bob,base);
  await assert.rejects(store.create(alice,{...base,folderId:foreign.id}),{status:404});await assert.rejects(store.moveToFolder(alice,p.id,{folderId:foreign.id}),{status:404});
  await assert.rejects(store.moveToFolder(bob,p.id,{folderId:foreign.id}),{status:404});await assert.rejects(store.moveToFolder(alice,other.id,{folderId:mine.id}),{status:404});
  for(const input of [{},{folderId:4},{folderId:'../pasta'},null])await assert.rejects(store.moveToFolder(alice,p.id,input),{status:400});
  assert.equal((await store.get(alice,p.id)).folderId,null);assert.equal((await store.list(alice)).length,1);assert.equal((await store.get(bob,other.id)).folderId,null);
});

test('removing a folder returns its projects to the root and keeps files and live links usable',async()=>{
  const {store,objects}=setup(),folder=await store.createFolder(alice,{name:'ADEMA'}),foreign=await store.createFolder(bob,{name:'Equipe B'});
  const p=await store.create(alice,{...base,folderId:folder.id});await store.save(alice,p.id,{...base,version:1},map);const linked=await store.share(alice,p.id,true),count=objects.size;
  await store.removeFolder(alice,folder.id);const reopened=await store.get(alice,p.id);
  assert.equal(reopened.folderId,null);assert.equal(reopened.version,linked.version);assert.equal(reopened.sharePath,linked.sharePath);assert.equal(objects.size,count);
  assert.equal((await store.presentation(linked.sharePath.split('/').at(-1))).name,base.name);assert.equal((await store.listFolders(alice)).length,0);assert.equal((await store.listFolders(bob))[0].id,foreign.id);
});

test('the folder migration keeps existing projects in the root and installs a null-on-delete foreign key',()=>{
  const sql=new DatabaseSync(':memory:');sql.exec('PRAGMA foreign_keys=ON');for(const value of migrations.slice(0,3))sql.exec(value);
  sql.prepare('INSERT INTO projects (id,owner_id,name,visual_json,created_at,updated_at) VALUES (?,?,?,?,?,?)').run('legacy','alice','Projeto existente','{}','2026-01-01','2026-01-01');
  for(const value of migrations.slice(3))sql.exec(value);
  const row=sql.prepare('SELECT * FROM projects WHERE id=?').get('legacy');assert.equal(row.name,'Projeto existente');assert.equal(row.folder_id,null);assert.equal(row.version,1);
  assert.ok(sql.prepare('PRAGMA foreign_key_list(projects)').all().some(f=>f.from==='folder_id'&&f.on_delete==='SET NULL'));
});

test('designer registration retains optional data, generates WhatsApp links and keeps login email out of directory',async()=>{
 const {store}=setup();
 const profile=await store.updateProfile(alice,{displayName:'Alice',city:'Toledo',store:'Centro',role:'Desenhista',bio:'Uniformes de jogo',contactEmail:'design@example.test',whatsapp:'(45) 99999-1234',directoryVisible:true});
 assert.equal(profile.whatsappUrl,'https://wa.me/5545999991234');assert.equal(profile.city,'Toledo');assert.equal(profile.email,alice.email);
 await store.updateProfile(alice,{displayName:'Alice Design'});assert.equal((await store.profile(alice)).store,'Centro');
 await store.updateProfile(bob,{displayName:'Bob',city:'Outra cidade',contactEmail:'private@example.test'});
 let directory=await store.designers(bob);assert.equal(directory.length,1);assert.equal(directory[0].displayName,'Alice Design');assert.equal(directory[0].email,undefined);assert.equal(directory[0].contactEmail,'design@example.test');assert.equal(directory[0].photoKey,undefined);
 await assert.rejects(store.designers(null),{status:401});
 await store.updateProfile(alice,{directoryVisible:false,whatsapp:'',contactEmail:''});assert.equal((await store.designers(bob)).length,0);assert.equal((await store.profile(alice)).whatsappUrl,'');
 await assert.rejects(store.updateProfile(bob,{contactEmail:'bad mail'}),{status:400});
 await assert.rejects(store.updateProfile(bob,{whatsapp:'https://evil.test/5545999991234'}),{status:400});
 await assert.rejects(store.updateProfile(bob,{directoryVisible:'true'}),{status:400});
 assert.equal((await store.updateProfile(bob,{whatsapp:'https://api.whatsapp.com/send?phone=5545999991234'})).whatsappUrl,'https://wa.me/5545999991234');
 assert.equal((await store.updateProfile(bob,{whatsapp:'https://wa.me/message/ABC123'})).whatsappUrl,'https://wa.me/message/ABC123');
});
test('designer photos are private by default and are shared only while listed; another account cannot change the owner photo',async()=>{
 const {store}=setup();await store.uploadProfilePhoto(alice,map);
 assert.ok((await store.profile(alice)).photoUrl);await store.profilePhoto(alice,alice.userId);
 await assert.rejects(store.profilePhoto(null,alice.userId),{status:401});await assert.rejects(store.profilePhoto(bob,alice.userId),{status:404});
 await store.updateProfile(alice,{directoryVisible:true});await store.profilePhoto(bob,alice.userId);
 await store.removeProfilePhoto(bob);assert.ok((await store.profile(alice)).photoUrl);
 await store.updateProfile(alice,{directoryVisible:false});await assert.rejects(store.profilePhoto(bob,alice.userId),{status:404});
 await store.removeProfilePhoto(alice);assert.equal((await store.profile(alice)).photoUrl,null);await assert.rejects(store.profilePhoto(alice,alice.userId),{status:404});
 await assert.rejects(store.uploadProfilePhoto(alice,new File(['<svg/>'],'fake.png',{type:'image/png'})),{status:400});
});
