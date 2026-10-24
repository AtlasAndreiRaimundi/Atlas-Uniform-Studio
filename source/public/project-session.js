import {createWorkflowGuide,workflowChoose,workflowOrders} from './workflow-guide.js?v=3';
import {workflowRoute,canAttachToOrder,linkedWorkflowOrders} from './workflow-contract.js?v=2';
const $ = (selector) => document.querySelector(selector);

export function createProjectSession(viewer) {
  const params = new URLSearchParams(location.search), token = params.get('share'), id = params.get('project'), previewId = params.get('mold'),proposalToken=params.get('proposal'),versionId=params.get('version'),orderId=params.get('order');
  const readOnly = Boolean(token || previewId || proposalToken);
  const productionPath=id?'/pedidos?project='+encodeURIComponent(id)+(orderId?'&order='+encodeURIComponent(orderId)+(params.get('item')?'&item='+encodeURIComponent(params.get('item')):''):''):'/pedidos';
  const productionShortcut=document.querySelector('#productionShortcut');if(productionShortcut){productionShortcut.hidden=readOnly;productionShortcut.href=productionPath;if(orderId)productionShortcut.firstChild.textContent='Voltar ao pedido com este desenho ';}
  let project = null, pendingMap = null, dirty = false, hydrating = true, saving = false, loaded = false, mapError = false;
  let lastName = '', lastClient = '',linkedOrders=[],linkedLists=[],completing=false;
  const projectGuide=readOnly?null:createWorkflowGuide({mount:'#workflowNextStep',onAction:projectWorkflowAction});
  function refreshWorkflowGuide(created=false){projectGuide?.update({kind:'presentation',id:project?.id||id,title:project?.name,orderId:orderId||'',linkedOrders,linkedLists,created,completed:Boolean(project?.reviewed&&!dirty),ready:Boolean(project?.reviewed&&project?.hasMap&&project?.thumbnailUrl),message:!project?.hasMap?'Sua apresentação foi criada. Aplique a arte e salve para anexar o design a um pedido.':undefined});}
  async function projectWorkflowAction(action){
   if(readOnly||!loaded||mapError||!viewer.isReady?.())throw new Error('Aguarde a apresentação carregar.');
   if(dirty&&!await save())return;if(dirty)throw new Error('Salve as alterações antes de continuar.');
   if(!project.reviewed)throw new Error('Conclua e confira a apresentação antes de anexar ao pedido.');
   if(!project.hasMap||!project.thumbnailUrl)throw new Error('Aplique uma arte e salve a apresentação antes de anexar ao pedido.');
   let target=action==='attach-linked'?orderId:null;
   if(action==='attach-other'||action==='attach-picker'){const orders=(await workflowOrders(api)).filter(canAttachToOrder);target=await workflowChoose({title:'A qual pedido anexar este design?',description:'Escolha um pedido em preparação. Pedidos enviados ou aceitos ficam protegidos.',allowNew:action==='attach-picker',newLabel:'Criar novo pedido com este design',items:orders.map(order=>({id:order.id,label:(order.number||order.title)+(order.client?' · '+order.client:'')}))});if(!target)return;if(target==='__new__')target=null;}
   const lists=(await api('/api/order-lists?project='+encodeURIComponent(id))).lists.filter(list=>list.reviewed);let listId=lists.length===1?lists[0].id:'';if(lists.length>1){listId=await workflowChoose({title:'Qual lista conferida usar com este desenho?',items:lists.map(list=>({id:list.id,label:list.title}))});if(!listId)return;}
   window.top.location.href=workflowRoute('order',{projectId:id,listId,orderId:target||'',itemId:action==='attach-linked'?params.get('item')||'':'',created:!target,attach:true});
  }

  async function api(path, options) {
    const response = await fetch(path, { ...options, cache: 'no-store' });
    if (response.status === 401 && !readOnly) {
      window.top.location.href = `/signin-with-chatgpt?return_to=${encodeURIComponent(id ? `/studio/${id}` : '/projects')}`;
      throw new Error('Entre novamente para continuar.');
    }
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Não foi possível concluir.');
    return data;
  }
  function state() {
    $('#saveProjectBtn').disabled = !loaded || saving || completing || !dirty || mapError;
    $('#completeProjectBtn').hidden=readOnly;$('#completeProjectBtn').disabled=!loaded||saving||completing||mapError||Boolean(project?.reviewed&&!dirty);$('#completeProjectBtn').textContent=completing?'Conferindo…':project?.reviewed&&!dirty?'Apresentação conferida':'Concluir e conferir';
    $('#shareProjectBtn').disabled = !loaded || saving || mapError;
    $('#openExportBtn').disabled = readOnly || !loaded || saving || mapError;
    $('#saveState').textContent = !loaded ? 'Carregando…' : saving ? 'Salvando…' : mapError ? 'Falha ao carregar arte' : dirty ? 'Alterações não salvas' : project?.reviewed?'Conferida no estúdio':'Rascunho salvo';
    $('#saveState').classList.toggle('dirty', dirty || mapError);
    $('#saveProjectBtn span').textContent = saving ? 'Salvando…' : 'Salvar projeto';
    $('#projectNameInput').disabled = saving || !loaded;
    $('#projectClientInput').disabled = saving || !loaded;
    if (project && !readOnly) $('#projectVersion').textContent = `VERSÃO ${String(project.version).padStart(2, '0')} · ${new Date(project.updatedAt).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}`;
  }
  function changed() { if (!hydrating && !readOnly && loaded) { dirty = true; projectGuide?.hide();state(); } }
  function title(name) {
    $('#projectHeading').textContent = name;
    $('#headerProjectName').textContent = name;
    document.title = `${name} — Atlas Uniform Studio`;
  }
  function fail(message) {
    $('#projectFailureMessage').textContent = message;
    $('#projectFailure').hidden = false;
  }
  async function save() {
    if (readOnly || !project || saving || mapError) return false;
    const name = $('#projectNameInput').value.trim(), clientName = $('#projectClientInput').value.trim();
    if (!name) { viewer.toast('Dê um nome ao projeto antes de salvar.'); $('#projectNameInput').focus(); return false; }
    saving = true; state();
    // The UI remains usable during a network request; preserve changes made
    // after this snapshot instead of incorrectly marking them as saved.
    const firstArt=!project.hasMap;
    const startMap = pendingMap, startVisuals = JSON.stringify(viewer.getVisuals());
    const startPresentation=JSON.stringify({...viewer.getPresentation(),camera:null});
    const input = { name, clientName, visuals: viewer.getVisuals(), presentation:viewer.getPresentation(), version: project.version };
    try {
      const form = new FormData(); form.set('metadata', JSON.stringify(input));
      if (startMap) form.set('map', startMap, startMap.name || 'mapa.png');
      const thumbnail = await viewer.thumbnail();
      if(pendingMap!==startMap||startVisuals!==JSON.stringify(viewer.getVisuals())||startPresentation!==JSON.stringify({...viewer.getPresentation(),camera:null})||name!==$('#projectNameInput').value.trim()||clientName!==$('#projectClientInput').value.trim()){viewer.toast('A apresentação mudou durante a captura. Salve novamente para guardar o desenho e a imagem da mesma versão.');return false;}
      if (thumbnail) form.set('thumbnail', thumbnail, 'apresentacao-4-vistas.png');
      const data = await api(`/api/projects/${encodeURIComponent(id)}`, { method: 'PUT', body: form });
      project = data.project;
      lastName = name; lastClient = clientName;
      if (pendingMap === startMap) pendingMap = null;
      dirty = Boolean(pendingMap) || startVisuals !== JSON.stringify(viewer.getVisuals()) || startPresentation!==JSON.stringify({...viewer.getPresentation(),camera:null})||name!==$('#projectNameInput').value.trim()||clientName!==$('#projectClientInput').value.trim();
      title(name);refreshWorkflowGuide(firstArt&&project.hasMap);
      viewer.toast(project.sharePath ? 'Projeto salvo. A apresentação no mesmo link foi atualizada.' : 'Projeto salvo no seu estúdio.');
      return true;
    } catch (error) { viewer.toast(error.message); return false; }
    finally { saving = false; state(); }
  }
  function showLink() {
    const url = `${location.origin}${project.sharePath}`;
    $('#shareUrl').value = url; $('#openShareLink').href = project.sharePath;
    $('#shareDialog').showModal();
  }
  async function share() {
    if (readOnly || !project || saving || mapError) return;
    if(viewer.openDelivery){viewer.openDelivery();return;}
    if (dirty && !await save()) return;
    if (!project.hasMap) { viewer.toast('Carregue uma arte e salve o projeto antes de gerar o link.'); return; }
    $('#shareProjectBtn').disabled = true;
    try { const data = await api(`/api/projects/${encodeURIComponent(id)}/share`, { method: 'POST' }); project = data.project; showLink(); }
    catch (error) { viewer.toast(error.message); }
    finally { state(); }
  }
  $('#saveProjectBtn').addEventListener('click', save);
  $('#completeProjectBtn').addEventListener('click',async()=>{
   if(readOnly||completing||!loaded||mapError)return;
   if(!viewer.isReady?.())return viewer.toast('Aguarde a apresentação carregar antes de conferir.');if(!await save())return;if(dirty)return viewer.toast('A apresentação mudou. Salve e confira novamente.');
   completing=true;state();try{const data=await api('/api/projects/'+encodeURIComponent(id)+'/review',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({version:project.version})});project=data.project;linkedLists=(await api('/api/order-lists?project='+encodeURIComponent(id))).lists;refreshWorkflowGuide(true);viewer.toast(dirty?'Há alterações novas. Confira novamente após salvar.':'Apresentação conferida. Agora você pode vinculá-la a um pedido.');$('#workflowNextStep')?.scrollIntoView({behavior:'smooth',block:'center'});}catch(error){viewer.toast(error.message);}finally{completing=false;state();}
  });
  productionShortcut?.addEventListener('click',async event=>{event.preventDefault();try{await projectWorkflowAction(orderId?'attach-linked':'attach-picker');}catch(error){viewer.toast(error.message);}});
  $('#shareProjectBtn').addEventListener('click', share);
  $('#closeShareBtn').addEventListener('click', () => $('#shareDialog').close());
  $('#shareDialog').addEventListener('click', e => { if (e.target === $('#shareDialog')) $('#shareDialog').close(); });
  $('#copyShareBtn').addEventListener('click', async () => {
    try { await navigator.clipboard.writeText($('#shareUrl').value); viewer.toast('Link da apresentação copiado.'); }
    catch { $('#shareUrl').select(); viewer.toast('Selecione e copie o endereço da apresentação.'); }
  });
  $('#revokeShareBtn').addEventListener('click', async () => {
    if (!project || readOnly) return;
    $('#revokeShareBtn').disabled = true;
    try { const data = await api(`/api/projects/${encodeURIComponent(id)}/share`, { method: 'DELETE' }); project = data.project; $('#shareDialog').close(); viewer.toast('Link desativado. A apresentação anterior não pode mais ser aberta.'); }
    catch (error) { viewer.toast(error.message); }
    finally { $('#revokeShareBtn').disabled = false; }
  });
  $('#projectNameInput').addEventListener('input', () => { title($('#projectNameInput').value || 'Seu uniforme'); changed(); });
  $('#projectClientInput').addEventListener('input', changed);
  window.addEventListener('beforeunload', (event) => { if (dirty && !readOnly) { event.preventDefault(); event.returnValue = ''; } });
  document.addEventListener('keydown', e => { if (!readOnly && (e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') { e.preventDefault(); if (dirty) save(); } });

  if (token || proposalToken) {
    document.body.classList.add('client-view');
    $('#viewerEyebrow').textContent = 'SEU UNIFORME, EM TODOS OS ÂNGULOS';
    $('#clientToolbar').hidden = false;
    $('#mapInput').disabled = true;
    $('#studioBrand').removeAttribute('href');
    $('#clientRotateBtn').addEventListener('click', () => {
      const on = $('#clientRotateBtn').getAttribute('aria-pressed') !== 'true';
      $('#clientRotateBtn').setAttribute('aria-pressed', String(on));
      viewer.rotate(on);
    });
    document.addEventListener('visibilitychange', () => { if (!document.hidden) refreshPresentation(); });
  }
  async function refreshPresentation() {
    if (!token || hydrating || !loaded) return;
    try {
      const { presentation } = await api(`/api/presentations/${encodeURIComponent(token)}`);
      if (presentation.version !== project.version) {
        if (!await viewer.loadMap(presentation.mapUrl, presentation.mapName || 'Arte do projeto')) throw new Error('Não foi possível carregar a arte atualizada.');
        viewer.setVisuals(presentation.visuals); project = presentation; title(presentation.name);
        viewer.setPresentation(presentation.presentation);
        $('#clientVersion').textContent = `VERSÃO ${String(presentation.version).padStart(2, '0')}`;
        viewer.toast('Seu designer atualizou esta apresentação.');
      }
      $('#designerName').textContent = presentation.designerName;
    } catch (error) { if (error.message.includes('disponível')) fail(error.message); }
  }
  async function open() {
    try {
      if (previewId) {
        document.body.classList.add('mold-preview');
        $('#moldPreviewToolbar').hidden = false;
        $('#viewerEyebrow').textContent = 'CONFERÊNCIA DO MOLDE · MAPA GERADO';
        $('#designerName').textContent = 'Andrei Raimundi · ADM';
        $('#mapInput').disabled = true;
        const { template } = await api(`/api/admin/templates/${encodeURIComponent(previewId)}`);
        viewer.configureTemplate(template); title(template.name);
        viewer.setVisuals({ background: 'dark' });
        if (!await viewer.loadMap(template.proofUrl, 'Conferência dos painéis')) throw new Error('Não foi possível abrir o mapa de conferência.');
      } else if (proposalToken) {
        document.body.classList.add('proposal-view');
        const {proposal}=await api(`/api/proposals/${encodeURIComponent(proposalToken)}`);
        const version=proposal.versions.find(v=>v.id===versionId);if(!version)throw new Error('Esta versão não está disponível na proposta.');
        project=version;viewer.configureTemplate(version.template);title(`${version.name} · V${version.version}`);
        $('#designerName').textContent=version.designerName;$('#clientVersion').textContent=`VERSÃO ${version.version}`;
        viewer.setVisuals(version.visuals);viewer.setPresentation(version.presentation);
        if(!await viewer.loadMap(version.mapUrl,version.mapName))throw new Error('Não foi possível carregar a arte desta versão.');
      } else if (token) {
        const [{ presentation }, { template }] = await Promise.all([api(`/api/presentations/${encodeURIComponent(token)}`), api(`/api/presentations/${encodeURIComponent(token)}/template`)]);
        viewer.configureTemplate(template);
        project = presentation; title(project.name);
        $('#designerName').textContent = project.designerName;
        $('#clientVersion').textContent = `VERSÃO ${String(project.version).padStart(2, '0')}`;
        viewer.setVisuals(project.visuals);
        viewer.setPresentation(project.presentation);
        if (!await viewer.loadMap(project.mapUrl, project.mapName || 'Arte do projeto')) throw new Error('Não foi possível carregar a arte desta apresentação.');
      } else {
        if (!id) { window.top.location.replace('/projects'); return; }
        const [data, profileData, moldData] = await Promise.all([api(`/api/projects/${encodeURIComponent(id)}`), api('/api/profile'), api(`/api/projects/${encodeURIComponent(id)}/template`)]);
        viewer.configureTemplate(moldData.template);
        project = data.project; title(project.name);
        $('#editorBreadcrumb a').href=project.folderId?`/projects?folder=${encodeURIComponent(project.folderId)}`:'/projects';
        $('#designerName').textContent = profileData.profile.displayName;
        $('#projectNameInput').value = lastName = project.name;
        $('#projectClientInput').value = lastClient = project.clientName;
        viewer.setVisuals(project.visuals);
        viewer.setPresentation(project.presentation);
        if (project.mapUrl && !await viewer.loadMap(project.mapUrl, project.mapName || 'Arte salva')) {
          mapError = true; viewer.toast('A arte salva não pôde ser carregada. Reabra o projeto ou carregue o mapa completo novamente.');
        }
      }
      loaded = true;
    } catch (error) { fail(error.message); }
    finally { hydrating = false; state();if(!readOnly&&project)refreshWorkflowGuide(params.get('created')==='1'); }
    if (token && loaded) setInterval(refreshPresentation, 30000);
    return loaded;
  }
  const ready = open().then(async loaded=>{if(loaded&&!readOnly){api('/api/order-lists?project='+encodeURIComponent(id)).then(data=>{linkedLists=data.lists;refreshWorkflowGuide(false);}).catch(()=>{});workflowOrders(api).then(orders=>{linkedOrders=linkedWorkflowOrders('presentation',id,orders);refreshWorkflowGuide(false);}).catch(()=>{});}return loaded;});
  return {
    readOnly, changed, ready,proposalToken,versionId,showWorkflowGuide:()=>refreshWorkflowGuide(true),
    getProject:()=>project,
    hasUnsavedChanges:()=>dirty,
    ensureSaved:async()=>{if(readOnly||!loaded||mapError)return false;if(dirty){if(!await save())return false;if(dirty){viewer.toast('Houve outra alteração durante o envio. Salve o projeto antes de continuar.');return false;}}return true;},
    getMapFile:async()=>{if(pendingMap)return pendingMap;if(!project?.mapUrl)throw new Error('Carregue uma arte primeiro.');const response=await fetch(project.mapUrl,{cache:'no-store'});if(!response.ok)throw new Error('Não foi possível abrir a arte.');return new File([await response.blob()],project.mapName||'mapa.png',{type:response.headers.get('content-type')||'image/png'});},
    mapChanged(file) { if (readOnly) return; pendingMap = file; mapError = false; changed(); },
  };
}
