// Owner-authorized one-time deletion. No project, order, artwork or CDR keys.
import {RETAINED_MOLD_ID} from './removed-molds.mjs';
const RESET='2026-10-29-edge-only-v1';
const TABLE='atlas_mold_catalog_resets';
const inflight=new WeakMap();
export function resetMoldCatalog(db,bucket){
  if(!db||!bucket)return Promise.resolve();
  if(inflight.has(db))return inflight.get(db);
  const pending=reset(db,bucket).finally(()=>inflight.delete(db));
  inflight.set(db,pending);return pending;
}
async function reset(db,bucket){
  await db.prepare(`CREATE TABLE IF NOT EXISTS ${TABLE} (id TEXT PRIMARY KEY,manifest_json TEXT,completed_at TEXT,removed_rows INTEGER NOT NULL DEFAULT 0,removed_objects INTEGER NOT NULL DEFAULT 0)`).run();
  let state=await db.prepare(`SELECT * FROM ${TABLE} WHERE id=?`).bind(RESET).first();
  if(state?.completed_at)return;
  if(!state){
    const retained=await db.prepare('SELECT * FROM templates WHERE id=?').bind(RETAINED_MOLD_ID).first();
    const protectedKeys=new Set(retained?['model_key','source_key','svg_key','proof_key'].map(k=>retained[k]).filter(Boolean):[]);
    const rows=await db.prepare('SELECT id FROM templates WHERE id<>?').bind(RETAINED_MOLD_ID).all();
    const keys=[];let cursor;
    do{const page=await bucket.list({prefix:'templates/',limit:1000,...(cursor?{cursor}:{})});
      for(const object of page.objects)if(object.key.startsWith('templates/')&&!protectedKeys.has(object.key))keys.push(object.key);
      cursor=page.truncated?page.cursor:null;
    }while(cursor);
    // Store a stable snapshot. Concurrent retries cannot delete future uploads.
    const manifest=JSON.stringify({ids:rows.results.map(r=>r.id),keys});
    await db.prepare(`INSERT INTO ${TABLE} (id,manifest_json) VALUES (?,?) ON CONFLICT(id) DO NOTHING`).bind(RESET,manifest).run();
    state=await db.prepare(`SELECT * FROM ${TABLE} WHERE id=?`).bind(RESET).first();
  }
  if(state.completed_at)return;
  const {ids,keys}=JSON.parse(state.manifest_json);
  for(let i=0;i<keys.length;i+=100)await bucket.delete(keys.slice(i,i+100));
  for(const id of ids)if(id!==RETAINED_MOLD_ID)await db.prepare('DELETE FROM templates WHERE id=?').bind(id).run();
  await db.prepare(`UPDATE ${TABLE} SET manifest_json=NULL,completed_at=?,removed_rows=?,removed_objects=? WHERE id=?`).bind(new Date().toISOString(),ids.length,keys.length,RESET).run();
}
