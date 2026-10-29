// Registered GLB URLs remain unchanged. Deployment stores the same bytes in
// gzip containers; stream decompression avoids buffering whole models in memory.
export async function serveCompressedMold(request,assets){
 if(!assets||!['GET','HEAD'].includes(request.method))return null;
 const url=new URL(request.url);
 if(!/^\/assets\/molds\/[a-z0-9-]+\/(?:model|source)\.glb$/.test(url.pathname))return null;
 url.pathname+='.gz';url.search='';
 const packed=await assets.fetch(new Request(url,{method:'GET',headers:{'Accept-Encoding':'identity'}}));
 if(packed.status===404){await packed.body?.cancel();return null;}
 if(!packed.ok||!packed.body)return new Response('Não foi possível carregar o molde.',{status:502});
 const headers=new Headers(packed.headers);
 for(const key of ['content-encoding','content-length','content-range','accept-ranges'])headers.delete(key);
 headers.set('Content-Type','model/gltf-binary');headers.set('X-Content-Type-Options','nosniff');
 const etag=headers.get('etag');
 if(etag&&request.headers.get('if-none-match')?.split(',').map(s=>s.trim()).some(s=>s==='*'||s===etag)){await packed.body.cancel();return new Response(null,{status:304,headers});}
 if(request.method==='HEAD'){await packed.body.cancel();return new Response(null,{status:200,headers});}
 return new Response(packed.body.pipeThrough(new DecompressionStream('gzip')),{status:200,headers});
}
