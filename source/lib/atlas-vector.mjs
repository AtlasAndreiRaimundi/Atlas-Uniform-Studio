import {AppError} from './project-service.mjs';
import {assertMutation} from './request-security.mjs';
export const VECTOR_LIMIT=4*1024*1024;
const OUTPUT_LIMIT=8*1024*1024;

export function vectorConfig(env){
  if(env.ATLAS_VECTOR_ENABLED!=='true')throw new AppError(503,'ATLAS VECTOR BETA ainda não está disponível.');
  let url;try{url=new URL(env.ATLAS_VECTOR_API_URL);}catch{throw new AppError(503,'Motor ATLAS não configurado.');}
  // Operator-owned exact service origin. Browser never supplies any URL.
  if(url.protocol!=='https:'||url.username||url.password||url.search||url.hash||url.pathname!=='/'||!env.ATLAS_VECTOR_API_TOKEN||env.ATLAS_VECTOR_API_TOKEN.length<32)throw new AppError(503,'Motor ATLAS não configurado.');
  return {url:url.origin,token:env.ATLAS_VECTOR_API_TOKEN};
}
export function validatePNG(bytes){
  if(bytes.length<33||bytes.length>VECTOR_LIMIT||[137,80,78,71,13,10,26,10].some((n,i)=>bytes[i]!==n))throw new AppError(415,'Envie uma imagem PNG de até 4 MB.');
  const v=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);
  if(v.getUint32(8)!==13||String.fromCharCode(...bytes.slice(12,16))!=='IHDR')throw new AppError(422,'PNG inválido.');
  const w=v.getUint32(16),h=v.getUint32(20);
  if(w<8||h<8||w>1536||h>1536||w*h>2097152)throw new AppError(422,'Limite: 2 megapixels e 1536 pixels por lado.');
}

// Accept only the tiny ATLAS path dialect, reconstruct it rather than injecting
// arbitrary XML. The Python service independently validates full XML structure.
export function safeVectorSVG(xml){
  if(typeof xml!=='string'||new TextEncoder().encode(xml).length>OUTPUT_LIMIT||/<!|&/.test(xml))throw new AppError(502,'SVG inválido recebido do motor.');
  xml=xml.replace(/^<\?xml\s+version=['"]1\.0['"]\s+encoding=['"]utf-8['"]\?>\s*/i,'').trim();
  const tokens=[];for(let i=0;i<xml.length;){const tag=xml[i]==='<',end=xml.indexOf(tag?'>':'<',i+1);if(tag&&(end<0||xml.slice(i+1,end).includes('<')))throw new AppError(502,'SVG inválido.');const next=end<0?xml.length:tag?end+1:end;tokens.push(xml.slice(i,next));i=next;if(tokens.length>60000)throw new AppError(502,'SVG excede o limite.');}let root=false,closed=false,title=false,count=0,width,height,paths=[];
  const bad=()=>{throw new AppError(502,'SVG não permitido recebido do motor.');};
  function attrs(raw,allowed){const out={};let m;const re=/\s+([\w-]+)="([^"]*)"/g;let used='';while((m=re.exec(raw))){used+=m[0];if(!allowed.includes(m[1])||Object.hasOwn(out,m[1]))bad();out[m[1]]=m[2];}if(used!==raw)bad();return out;}
  for(const token of tokens){
    if(!token.trim())continue;
    if(!root){const m=token.match(/^<svg(.*)>$/s);if(!m)bad();const a=attrs(m[1],['xmlns','width','height','viewBox']);width=a.width;height=a.height;if(a.xmlns!=='http://www.w3.org/2000/svg'||!/^\d{1,4}$/.test(width)||!/^\d{1,4}$/.test(height)||+width>1536||+height>1536||+width<1||+height<1||+width*+height>2097152||a.viewBox!==`0 0 ${width} ${height}`)bad();root=true;continue;}
    if(closed)bad();
    if(token==='<title>'&&!title){title=true;continue;}
    if(token==='</title>'&&title){title=false;continue;}
    if(title){if(token.includes('<')||token.length>200)bad();continue;}
    if(token==='</svg>'){closed=true;continue;}
    const m=token.match(/^<path(.*?)\s*\/>$/s);if(!m)bad();const a=attrs(m[1],['id','fill','fill-rule','d','data-atlas-role']);
    if(!/^#[a-f0-9]{6}$/i.test(a.fill)||a['fill-rule']!=='evenodd'||!a.d||!/^[MLCZmlczHhVvQqSsTtAaEe0-9.,+\s-]+$/.test(a.d)||++count>20000)bad();
    paths.push(`<path id="elemento-${count}" fill="${a.fill}" fill-rule="evenodd" d="${a.d}"/>`);
  }
  if(!closed||title||!count)bad();
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><title>ATLAS VECTOR BETA</title>${paths.join('')}</svg>`;
}

async function upstream(config,path,init,fetcher,signal){
  try{return await fetcher(config.url+path,{...init,redirect:'error',signal,headers:{...init.headers,Authorization:'Bearer '+config.token}});}
  catch{throw new AppError(503,'Motor ATLAS indisponível. Tente novamente mais tarde.');}
}
async function timedBytes(source,maxBytes,signal,status=502){
  const reader=source.body?.getReader();if(!reader)throw new AppError(status,'Resposta vazia.');
  const chunks=[];let size=0;const abort=()=>{void reader.cancel().catch(()=>{});};
  signal.addEventListener('abort',abort,{once:true});
  try{for(;;){if(signal.aborted)throw new AppError(504,'Tempo limite atingido.');const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>maxBytes)throw new AppError(status,'Arquivo excede o limite.');chunks.push(value);}if(signal.aborted)throw new AppError(504,'Tempo limite atingido.');}
  finally{signal.removeEventListener('abort',abort);void reader.cancel().catch(()=>{});reader.releaseLock();}
  const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length;}return bytes;
}
export async function vectorHealth(env,fetcher=fetch){
  const config=vectorConfig(env),signal=AbortSignal.timeout(3000),r=await upstream(config,'/health',{method:'GET'},fetcher,signal);
  if(!r.ok){void r.body?.cancel();throw new AppError(503,'Motor ATLAS indisponível.');}
  const bytes=await timedBytes(r,2048,signal);let data;try{data=JSON.parse(new TextDecoder().decode(bytes));}catch{throw new AppError(503,'Motor ATLAS indisponível.');}
  if(data.engine!=='ATLAS'||data.ready!==true)throw new AppError(503,'Motor ATLAS indisponível.');
  return {ready:true,formats:['image/png'],mode:'faithful',engineVersion:typeof data.engineVersion==='string'?data.engineVersion:null};
}
export async function vectorizeRequest(request,env,fetcher=fetch,userId){
  assertMutation(request,VECTOR_LIMIT);
  if(!userId)throw new AppError(401,'Entre na sua conta para continuar.');
  const config=vectorConfig(env);
  const subject=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(new URL(request.url).origin+'\0'+userId))),b=>b.toString(16).padStart(2,'0')).join('');
  if(new URL(request.url).search||request.headers.get('content-type')!=='image/png')throw new AppError(415,'Envie um PNG.');
  const gap=request.headers.get('x-atlas-gap-repair')||'true';if(!['true','false'].includes(gap))throw new AppError(400,'Opção inválida.');
  const bytes=await timedBytes(request,VECTOR_LIMIT,AbortSignal.any([request.signal,AbortSignal.timeout(10000)]),413);validatePNG(bytes);
  const timeout=AbortSignal.timeout(35000);
  const signal=AbortSignal.any([timeout,request.signal]);
  const r=await upstream(config,'/vectorize',{method:'POST',headers:{'Content-Type':'image/png','X-Atlas-Gap-Repair':gap,'X-Atlas-Subject':subject},body:bytes},fetcher,signal);
  if(!r.ok){void r.body?.cancel();throw new AppError([413,415,422,429,504].includes(r.status)?r.status:503,r.status===429?'Motor ocupado. Aguarde um instante.':r.status===422?'O motor não conseguiu processar esta imagem.':r.status===504?'Tempo limite atingido. Use uma imagem menor.':'Motor ATLAS indisponível.');}
  if(!r.headers.get('content-type')?.startsWith('image/svg+xml'))throw new AppError(502,'Resposta inválida do motor.');
  // Keep timeout through body consumption, not only response headers.
  const out=await timedBytes(r,OUTPUT_LIMIT,signal);
  const svg=safeVectorSVG(new TextDecoder('utf-8',{fatal:true}).decode(out));
  return new Response(svg,{headers:{'X-Atlas-Objects':String((svg.match(/<path /g)||[]).length),'Content-Type':'image/svg+xml','Content-Disposition':'attachment; filename="atlas-vector-resultado.svg"','Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff','Content-Security-Policy':"default-src 'none'; sandbox"}});
}

export async function vectorTraceForm(request,env,fetcher=fetch,userId){
  assertMutation(request,VECTOR_LIMIT+65536);
  vectorConfig(env);
  if(new URL(request.url).search||!request.headers.get('content-type')?.startsWith('multipart/form-data;'))throw new AppError(415,'Envie uma imagem PNG.');
  const bytes=await timedBytes(request,VECTOR_LIMIT+65536,AbortSignal.any([request.signal,AbortSignal.timeout(10000)]),413);
  let form;try{form=await new Request(request.url,{method:'POST',headers:{'content-type':request.headers.get('content-type')},body:bytes}).formData();}catch{throw new AppError(400,'Formulário inválido.');}
  for(const key of form.keys())if(!['image','mode','closeGaps'].includes(key)||form.getAll(key).length!==1)throw new AppError(400,'Opção inválida.');
  const image=form.get('image'),mode=form.get('mode')||'faithful',gap=form.get('closeGaps')||'true';
  if(mode!=='faithful'||!['true','false'].includes(gap))throw new AppError(400,'Opção inválida.');
  if(!image||typeof image==='string'||image.type!=='image/png')throw new AppError(415,'Envie PNG.');
  if(image.size>VECTOR_LIMIT)throw new AppError(413,'Limite de 4 MB.');
  return vectorizeRequest(new Request(request.url,{method:'POST',headers:{origin:new URL(request.url).origin,'content-type':'image/png','x-atlas-gap-repair':gap},body:await image.arrayBuffer(),signal:request.signal}),env,fetcher,userId);
}
