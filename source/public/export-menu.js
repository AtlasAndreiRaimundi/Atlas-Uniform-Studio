import {videoSettings,smoothVideoAvailable,readVideoBackground} from './video-settings.js?v=1';
const $=selector=>document.querySelector(selector),$$=selector=>[...document.querySelectorAll(selector)];
export const EXPORT_FORMATS=Object.freeze({
  production:{title:'Quatro vistas para o pedido.',description:'Frente, costas e duas laterais próximas, em PNG transparente. Somente o uniforme, sem fundo, sombra de chão ou textos.',badge:'PNG TRANSPARENTE',action:'Baixar PNG para pedido'},
  four:{title:'Quatro vistas em uma imagem.',description:'Seu uniforme de frente, de costas e das duas laterais. Fundo, luz e marca Atlas já aplicados.',badge:'4 VISTAS',action:'Baixar imagem'},
  whatsapp:{title:'Pronta para enviar no WhatsApp.',description:'Frente e costas em uma imagem vertical de 1080 × 1440, com a marca Atlas.',badge:'WHATSAPP',action:'Baixar imagem'},
  instagram:{title:'Quatro vistas para o Instagram.',description:'Apresentação quadrada de 1080 × 1080 com as quatro vistas e a marca Atlas.',badge:'INSTAGRAM',action:'Baixar imagem'},
  current:{title:'O ângulo que você escolheu.',description:'Uma imagem do enquadramento atual, com o fundo e a luz do seu projeto.',badge:'ÂNGULO ATUAL',action:'Baixar imagem'},
  pdf:{title:'PDF para aprovação.',description:'Quatro vistas e uma ficha para aprovação, identificadas com a versão salva.',badge:'PDF',action:'Baixar PDF'},
  package:{title:'A apresentação completa.',description:'ZIP com quatro vistas, imagens separadas, WhatsApp, Instagram, detalhes ampliados e PDF para aprovação.',badge:'PACOTE COMPLETO',action:'Baixar pacote'},
});
export function exportRequest(mode,format,options={}){
  const {fileType='png',resolution='high',seconds=10}=options,safeMode=['image','video','link'].includes(mode)?mode:'image';
  return {mode:safeMode,format:Object.hasOwn(EXPORT_FORMATS,format)?format:'four',fileType:format!=='production'&&fileType==='jpg'?'jpg':'png',resolution:resolution==='standard'?'standard':'high',seconds:[10,15,30].includes(Number(seconds))?Number(seconds):10,...(safeMode==='video'?videoSettings(options):{})};
}
export function createExportMenu(viewer,session,{onExport,onCreateLink,onManage}){
  let mode='image',busy=false,previewTimer,previewUrl,requestId=0,linkedVersion=null,background=null,backgroundRequest=0,backgroundLoading=false;
  const dialog=$('#exportDialog');
  const options=()=>({...exportRequest(mode,$('#exportFormat').value,{fileType:$('#exportFileType').value,resolution:$('#exportResolution').value,seconds:$('#exportVideoSeconds').value,videoResolution:$('#exportVideoResolution').value,aspect:$('#exportVideoAspect').value,motion:$('#exportVideoMotion').value,backgroundFit:$('#exportVideoBackgroundFit').value,}),...(background?{backgroundImage:background.image}:{})});
  function update(){
    const request=options(),format=EXPORT_FORMATS[request.format],project=session.getProject();
    if(session.hasUnsavedChanges?.())$('#deliveryDownload').hidden=true;
    if(linkedVersion!==null&&(project?.version!==linkedVersion||session.hasUnsavedChanges?.())){$('#proposalCreated').hidden=true;linkedVersion=null;}
    for(const choice of $$('[data-export-mode]')){const active=choice.dataset.exportMode===mode;choice.classList.toggle('active',active);choice.setAttribute('aria-checked',String(active));choice.tabIndex=active?0:-1;}
    for(const kind of ['image','video','link'])$(`#export${kind[0].toUpperCase()+kind.slice(1)}Options`).hidden=mode!==kind;
    $('#exportFormatTitle').textContent=format.title;$('#exportFormatDescription').textContent=format.description;$('#exportFormatKicker').textContent=['four','production'].includes(request.format)?'A OPÇÃO MAIS USADA':'OUTROS FORMATOS';
    $('#exportPreviewBadge').textContent=mode==='image'?format.badge:mode==='video'?'VÍDEO 360°':'LINK INTERATIVO';
    $('#exportProjectTitle').textContent=project?.name||'Seu uniforme';
    $('#exportPreviewCaption').textContent=mode==='image'?format.description:mode==='video'?`${request.width} × ${request.height} · ${request.seconds} segundos · ${request.fps} fps. Prévia estática do enquadramento e do fundo.`:'O cliente abre esta versão para girar, comentar e aprovar.';
    $('#exportPreviewFrame').classList.toggle('video-preview',mode==='video');$('#exportPreviewFrame').style.setProperty('--video-aspect',mode==='video'?request.aspect.replace(':',' / '):'16 / 9');
    const video=videoSettings(request);$('#exportVideoDimensions').textContent=`Saída: ${video.width} × ${video.height} pixels (${video.aspect}). Fundo recomendado nas mesmas dimensões.`;
    $('#exportVideoBackgroundInfo').textContent=background?`${background.name} · ${background.width} × ${background.height} px`:'PNG, JPG ou WebP · até 20 MB.';$('#removeVideoBackground').hidden=!background;$('#exportVideoBackgroundFit').disabled=busy||!background;
    $('#exportVideoSmoothHint').textContent=video.motion==='smooth'?'Suave: 60 fps, gerados quadro a quadro para evitar saltos. Pode levar mais tempo.':'Compatível: 30 fps, gravados em tempo real. HD 720p exige menos do computador.';
    $('#exportRasterSettings').hidden=mode!=='image'||['pdf','package'].includes(request.format);
    $('#exportResolutionLabel').hidden=!['four','production'].includes(request.format);
    $('#exportFileType').disabled=busy||request.format==='production';if(request.format==='production')$('#exportFileType').value='png';
    $('#exportPreviewFrame').classList.toggle('transparent-preview',request.format==='production'&&mode==='image');
    $('#exportPrimaryBtn').textContent=busy?'Preparando…':mode==='video'?'Gerar vídeo':mode==='link'?(linkedVersion!==null?'Copiar link':'Criar link'):format.action;
    const hasArt=viewer.hasMap?.()??project?.hasMap;
    $('#exportPrimaryBtn').disabled=busy||backgroundLoading||session.readOnly||!project||!hasArt||(mode!=='link'&&!viewer.isReady());
    $('#exportActionStatus').textContent=!project?'Abra um projeto para exportar.':!hasArt?'Carregue uma arte no projeto para continuar.':mode!=='link'&&!viewer.isReady()?'Aguarde o modelo 3D carregar para gerar os arquivos.':mode==='link'?'O link preserva esta versão. Novas alterações podem ser adicionadas à proposta.':'Suas alterações serão salvas antes de gerar o arquivo.';
  }
  async function preview(){
    if(!dialog.open||busy)return;
    const request=options(),index=++requestId;
    if(!viewer.isReady()){++requestId;$('#exportPreviewImage').hidden=true;$('#exportPreviewEmpty').hidden=false;$('#exportPreviewMessage').textContent='A prévia aparece quando o modelo 3D carregar.';return;}
    $('#exportPreviewMessage').textContent='Preparando a prévia…';
    try{
      const format=mode==='image'&&!['pdf','package'].includes(request.format)?request.format:mode==='image'?'four':'current';
      const blob=mode==='video'?await viewer.previewVideo(request):await viewer.previewExport(format,request);
      if(index!==requestId||!dialog.open)return;
      const url=URL.createObjectURL(blob);if(previewUrl)URL.revokeObjectURL(previewUrl);previewUrl=url;
      $('#exportPreviewImage').src=url;$('#exportPreviewImage').hidden=false;$('#exportPreviewEmpty').hidden=true;
    }catch(error){if(index!==requestId)return;$('#exportPreviewImage').hidden=true;$('#exportPreviewEmpty').hidden=false;$('#exportPreviewMessage').textContent=error.message||'Não foi possível preparar a prévia.';}
  }
  function refreshPreview(){update();clearTimeout(previewTimer);if(dialog.open)previewTimer=setTimeout(preview,180);}
  function choose(next){mode=['image','video','link'].includes(next)?next:'image';$('#deliveryDownload').hidden=true;refreshPreview();}
  function open(next='image'){
    if(session.readOnly)return;
    viewer.rotate?.(false);
    mode=next;$('#deliveryDownload').hidden=true;
    if(next==='image')$('#exportFormat').value='production';
    $('#otherExportFormats').open=false;$('#advancedExportOptions').open=false;
    if(!dialog.open)dialog.showModal();refreshPreview();
  }
  function close(){if(busy)return;clearTimeout(previewTimer);++requestId;++backgroundRequest;backgroundLoading=false;dialog.close();if(previewUrl){URL.revokeObjectURL(previewUrl);previewUrl=null;}$('#exportPreviewImage').removeAttribute('src');}
  function setBusy(value){busy=value;if(value){clearTimeout(previewTimer);++requestId;}for(const control of dialog.querySelectorAll('button,input,select')){if(value){control.dataset.exportDisabled=String(control.disabled);control.disabled=true;}else{control.disabled=control.dataset.exportDisabled==='true';delete control.dataset.exportDisabled;}}dialog.setAttribute('aria-busy',String(value));update();}
  $$('[data-export-mode]').forEach(choice=>{choice.addEventListener('click',()=>choose(choice.dataset.exportMode));choice.addEventListener('keydown',event=>{const keys=['ArrowRight','ArrowLeft','ArrowUp','ArrowDown','Home','End'];if(!keys.includes(event.key))return;event.preventDefault();const choices=$$('[data-export-mode]'),at=choices.indexOf(choice),next=event.key==='Home'?0:event.key==='End'?2:(at+(['ArrowRight','ArrowDown'].includes(event.key)?1:2))%3;choices[next].focus();choose(choices[next].dataset.exportMode);});});
  for(const selector of ['#exportFormat','#exportResolution','#exportFileType','#exportVideoSeconds','#exportVideoResolution','#exportVideoAspect','#exportVideoMotion','#exportVideoBackgroundFit'])$(selector).addEventListener('change',()=>{$('#deliveryDownload').hidden=true;refreshPreview();});
  if(!smoothVideoAvailable()){$('#exportVideoMotion').value='compatible';$('#exportVideoSmoothOption').disabled=true;$('#exportVideoSupport').textContent='Este navegador oferece o modo Compatível. Para o modo Suave, use um navegador com codificação de vídeo disponível.';}
  $('#exportVideoBackground').addEventListener('change',async event=>{
    const file=event.target.files[0];if(!file)return;const index=++backgroundRequest;backgroundLoading=true;update();$('#exportVideoBackgroundError').textContent='';
    try{const next=await readVideoBackground(file);if(index!==backgroundRequest){next.dispose();return;}background?.dispose();background=next;$('#deliveryDownload').hidden=true;refreshPreview();}
    catch(error){if(index===backgroundRequest)$('#exportVideoBackgroundError').textContent=error.message;}
    finally{if(index===backgroundRequest){backgroundLoading=false;update();}event.target.value='';}
  });
  $('#removeVideoBackground').addEventListener('click',()=>{++backgroundRequest;backgroundLoading=false;background?.dispose();background=null;$('#exportVideoBackgroundError').textContent='';$('#deliveryDownload').hidden=true;refreshPreview();});
  window.addEventListener('pagehide',()=>{++backgroundRequest;background?.dispose();background=null;});
  $('#openExportBtn').addEventListener('click',()=>open());$('#deliveryExportBtn').addEventListener('click',()=>open('link'));$('#closeExportBtn').addEventListener('click',close);
  $('#manageProposalsBtn').addEventListener('click',()=>{close();onManage();});
  dialog.addEventListener('cancel',event=>{event.preventDefault();close();});dialog.addEventListener('click',event=>{if(event.target===dialog){const r=dialog.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)close();}});
  $('#exportPrimaryBtn').addEventListener('click',async()=>{if(busy||$('#exportPrimaryBtn').disabled)return;if(mode==='link'&&linkedVersion!==null){$('#copyProposalBtn').click();return;}const request=options();setBusy(true);try{if(mode==='link')await onCreateLink();else await onExport(request);}finally{setBusy(false);}});
  return {open,close,refreshPreview,update,linkCreated(version){linkedVersion=version;$('#proposalCreatedLabel').textContent=`Link criado · versão ${version}`;},isOpen:()=>dialog.open};
}
