// Lossless deployment packing only. Keep all canonical source models in Git.
import {readdir,readFile,writeFile,unlink}from'node:fs/promises';
import {gzipSync,gunzipSync}from'node:zlib';
import path from'node:path';
let count=0,before=0,after=0;
async function pack(dir){for(const e of await readdir(dir,{withFileTypes:true})){const file=path.join(dir,e.name);if(e.isDirectory()){await pack(file);continue;}if(!e.isFile()||!['model.glb','source.glb'].includes(e.name))continue;const original=await readFile(file),compressed=gzipSync(original,{level:9});if(!gunzipSync(compressed).equals(original))throw Error('GLB verification failed: '+file);await writeFile(file+'.gz',compressed);await unlink(file);count++;before+=original.length;after+=compressed.length;}}
await pack('dist/client/assets/molds');console.log(JSON.stringify({models:count,originalBytes:before,deploymentBytes:after}));
