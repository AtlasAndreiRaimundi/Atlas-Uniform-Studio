import {buildSheets,createPDF} from './production-sheet.js?v=20';

const safe=value=>String(value||'pedido').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^A-Za-z0-9_.-]+/g,'_').replace(/^\.+/,'').slice(0,100)||'pedido';
let libraries;
export async function loadDeliveryLibraries(){
 if(libraries)return libraries;
 const script=(path,name)=>globalThis[name]?Promise.resolve(globalThis[name]):new Promise((resolve,reject)=>{const element=document.createElement('script');element.src=path;element.onload=()=>resolve(globalThis[name]);element.onerror=()=>reject(new Error('Não foi possível carregar o pacote de produção.'));document.head.appendChild(element);});
 const bytes=async path=>{const response=await fetch(path);if(!response.ok)throw new Error('Não foi possível carregar a fonte do pedido.');return response.arrayBuffer();};
 const logo=fetch('/assets/atlas/atlas-logo-print.png').then(async response=>{if(!response.ok)return undefined;const blob=await response.blob();return new Promise(resolve=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.readAsDataURL(blob);});}).catch(()=>undefined);
 libraries=Promise.all([script('/vendor/pdf-lib/pdf-lib.min.js','PDFLib'),script('/vendor/jszip/jszip.min.js','JSZip'),script('/vendor/fontkit/fontkit.umd.min.js','fontkit'),bytes('/fonts/ChakraPetch-Regular.ttf'),bytes('/fonts/ChakraPetch-SemiBold.ttf'),logo]).then(([PDF,Zip,fontkit,regular,bold,logo])=>({PDF,Zip,fontkit,regular,bold,logo})).catch(error=>{libraries=null;throw error;});return libraries;
}
export async function createProductionPackage(delivery,{PDF,Zip,fontkit,regular,bold,logo,readFile}={}){
 const {order,files}=delivery,document=order?.document;
 if(document?.workflow?.status!=='released'||!files?.length)throw new Error('Confira o pedido e anexe o CDR antes de gerar o pacote de produção.');
 const stem='PEDIDO_'+safe(document.number)+'_R'+document.workflow.revision,sheets=buildSheets(document,{logo}),pdfName=stem+'.pdf',zip=new Zip();
 const pdf=await createPDF(sheets,PDF,{fontkit,regular,bold});zip.file(pdfName,pdf);
 const manifest={schema:1,order:{id:order.id,number:document.number,revision:document.workflow.revision,version:order.version,releasedAt:document.workflow.releasedAt,origin:document.origin||null},pdf:{name:pdfName,pages:sheets.length},technicalFiles:[]};
 for(const [index,file]of files.entries()){
  const bytes=new Uint8Array(await readFile(file));
  const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),byte=>byte.toString(16).padStart(2,'0')).join('');
  if(bytes.length!==file.size||hash!==file.sha256)throw new Error('O CDR recebido não corresponde à revisão conferida. Baixe novamente o pacote.');
  const name='tecnicos/'+String(index+1).padStart(2,'0')+'_'+safe(file.name);zip.file(name,bytes);manifest.technicalFiles.push({name,originalName:file.name,size:file.size,sha256:hash});
 }
 zip.file('VERSAO_DO_PEDIDO.json',JSON.stringify(manifest,null,2));
 return {bytes:await zip.generateAsync({type:'uint8array',compression:'STORE'}),name:stem+'.zip'};
}
