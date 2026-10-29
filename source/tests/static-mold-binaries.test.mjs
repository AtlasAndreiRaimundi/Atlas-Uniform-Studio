import{test}from'node:test';import assert from'node:assert/strict';import{gzipSync,gunzipSync}from'node:zlib';import{readFile}from'node:fs/promises';import{serveCompressedMold}from'../lib/static-mold-binaries.mjs';
test('packed static models preserve exact GLB bytes, public paths and conditional/head responses',async()=>{
 const original=await readFile(new URL('../public/assets/molds/bermuda-passeio-v2/model.glb',import.meta.url)),packed=gzipSync(original),requests=[];
 const assets={async fetch(req){requests.push(req);return new Response(packed,{headers:{'Content-Type':'application/gzip','Content-Length':String(packed.length),'Content-Encoding':'gzip','ETag':'"model-v2"','Cache-Control':'public, max-age=0, must-revalidate'}});}};
 const url='https://atlas.example/assets/molds/bermuda-passeio-v2/model.glb?v=source';const response=await serveCompressedMold(new Request(url,{headers:{Range:'bytes=0-99'}}),assets);assert.equal(response.status,200);assert.deepEqual(Buffer.from(await response.arrayBuffer()),original);assert.equal(response.headers.get('content-type'),'model/gltf-binary');assert.equal(response.headers.get('content-encoding'),null);assert.equal(response.headers.get('content-length'),null);assert.equal(requests[0].url,'https://atlas.example/assets/molds/bermuda-passeio-v2/model.glb.gz');assert.equal(requests[0].headers.get('range'),null);
 const head=await serveCompressedMold(new Request(url,{method:'HEAD'}),assets);assert.equal(head.body,null);assert.equal(head.status,200);
 const notModified=await serveCompressedMold(new Request(url,{headers:{'If-None-Match':'"other", "model-v2"'}}),assets);assert.equal(notModified.status,304);assert.equal(notModified.body,null);
});
test('packing does not intercept uploads, unrelated paths, mutations, traversal or missing models',async()=>{
 let count=0;const assets={async fetch(){count++;return new Response(null,{status:404});}};
 for(const path of ['/api/projects/a/assets/model','/assets/camiseta.glb','/assets/molds/UPPER/model.glb','/assets/molds/a/../../file/model.glb','/assets/molds/a/proof.svg'])assert.equal(await serveCompressedMold(new Request('https://atlas.example'+path),assets),null);
 assert.equal(count,0);assert.equal(await serveCompressedMold(new Request('https://atlas.example/assets/molds/a/model.glb',{method:'POST'}),assets),null);assert.equal(count,0);
 assert.equal(await serveCompressedMold(new Request('https://atlas.example/assets/molds/a/model.glb'),assets),null);assert.equal(count,1);
 assert.equal(await serveCompressedMold(new Request('https://atlas.example/assets/molds/a/model.glb'),null),null);
});
