import {AppError} from './project-service.mjs';

export function assertMutation(request, maxBytes=22*1024*1024) {
  const origin=request.headers.get('origin');
  if ((origin && origin!==new URL(request.url).origin) || request.headers.get('sec-fetch-site')==='cross-site') {
    throw new AppError(403,'Solicitação não permitida.');
  }
  if (Number(request.headers.get('content-length'))>maxBytes) throw new AppError(413,'O envio excede o limite de tamanho.');
}

// Count received bytes even when Content-Length is absent or inaccurate.
export async function bodyBytes(request,{maxBytes,message='Solicitação muito grande.',empty='Solicitação vazia.'}) {
  if (Number(request.headers.get('content-length'))>maxBytes) throw new AppError(413,message);
  const reader=request.body?.getReader();
  if (!reader) throw new AppError(400,empty);
  const chunks=[];let size=0;
  try {
    for (;;) {
      const {done,value}=await reader.read();if (done) break;
      size+=value.byteLength;
      if (size>maxBytes) {
        // A cloned/teed request may keep cancellation pending until the other
        // branch is consumed. Reject promptly without waiting on that branch.
        void reader.cancel().catch(()=>{});
        throw new AppError(413,message);
      }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  if (!size) throw new AppError(400,empty);
  const bytes=new Uint8Array(size);let offset=0;
  for (const chunk of chunks) {bytes.set(chunk,offset);offset+=chunk.byteLength;}
  return bytes;
}

export async function boundedJSON(request,{maxBytes=65536,message='Solicitação muito grande.',invalid='Não foi possível ler os dados.',empty=invalid}={}) {
  if (request.headers.get('content-type')?.split(';',1)[0].trim().toLowerCase()!=='application/json') throw new AppError(415,'Envie os dados no formato JSON.');
  const bytes=await bodyBytes(request,{maxBytes,message,empty});
  try {
    const value=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes));
    if (!value || typeof value!=='object' || Array.isArray(value)) throw new Error('object required');
    return value;
  } catch { throw new AppError(400,invalid); }
}

export async function boundedForm(request,{maxBytes=22*1024*1024,message='O envio excede o limite de tamanho.'}={}) {
  const type=request.headers.get('content-type')||'';
  if (!/^multipart\/form-data\s*;/i.test(type)) throw new AppError(415,'Envie os arquivos pelo formulário de upload.');
  const bytes=await bodyBytes(request,{maxBytes,message});
  let form;
  try {form=await new Response(bytes,{headers:{'Content-Type':type}}).formData();}
  catch {throw new AppError(400,'Não foi possível ler os arquivos enviados.');}
  let count=0;
  for (const [,value] of form) {
    if (++count>16 || typeof value==='string' && new TextEncoder().encode(value).byteLength>65536) throw new AppError(413,'Há campos demais ou dados muito grandes no formulário.');
  }
  return form;
}
