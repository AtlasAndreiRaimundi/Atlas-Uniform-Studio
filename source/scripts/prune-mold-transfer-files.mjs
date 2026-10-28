// Remove orphan temporary transfers only; never remove a canonical GLB.
import {readdir,unlink} from 'node:fs/promises';
import path from 'node:path';
async function prune(root){let entries;try{entries=await readdir(root,{withFileTypes:true});}catch(error){if(error.code==='ENOENT')return;throw error;}for(const entry of entries){const file=path.join(root,entry.name);if(entry.isDirectory())await prune(file);else if(entry.isFile()&&/^\.model\.glb\.[A-Za-z0-9]+$/.test(entry.name))await unlink(file).catch(error=>{if(error.code!=='ENOENT')throw error;});}}
await prune('public/assets/molds');await prune('dist/client/assets/molds');
