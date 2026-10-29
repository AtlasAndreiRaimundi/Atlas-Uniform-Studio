// Keep canonical models/sources; omit orphan transfers and generator-only cloth inputs from deployment.
import {readdir,unlink} from 'node:fs/promises';
import path from 'node:path';
async function prune(root,buildOutput=false){let entries;try{entries=await readdir(root,{withFileTypes:true});}catch(error){if(error.code==='ENOENT')return;throw error;}for(const entry of entries){const file=path.join(root,entry.name);if(entry.isDirectory())await prune(file,buildOutput);else if(entry.isFile()&&(/^\.(?:model|source|cloth-input)\.glb(?:\.gz)?\.[A-Za-z0-9]+$/.test(entry.name)||(buildOutput&&entry.name==='cloth-input.glb')))await unlink(file).catch(error=>{if(error.code!=='ENOENT')throw error;});}}
await prune('public/assets/molds');await prune('dist/client/assets/molds',true);
