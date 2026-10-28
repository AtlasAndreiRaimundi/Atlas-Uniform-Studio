'use client';
import {useEffect,useMemo,useRef,useState} from 'react';
import ThemeSelector from '../theme-selector';
import StudioNavigation from '../studio-navigation';
import {ArrowDownToLine,ArrowUpRight,Box,Check,ChevronDown,ChevronRight,Ellipsis,Folder,FolderOpen,FolderPlus,Grid2X2,Layers3,LayoutList,Link2,LogOut,MoveRight,Plus,Search,Settings2,TableProperties,Trash2,X} from 'lucide-react';
import {Brand} from '../brand';
import type {ProjectFolder} from './types';
import './projects.css';
import MoldPicker from './mold-picker';

type Mold={id:string;name:string;category:string;panelCount:number};
type Project={templateId:string;id:string;name:string;clientName:string;folderId:string|null;hasMap:boolean;thumbnailUrl:string|null;sharePath:string|null;presentationPath:string|null;version:number;updatedAt:string};
type Modal={kind:'new'|'profile'}|{kind:'folder';folder?:ProjectFolder}|{kind:'move'|'removeProject';project:Project}|{kind:'removeFolder';folder:ProjectFolder};
async function api(path:string,options?:RequestInit){
  const response=await fetch(path,{...options,cache:'no-store'});
  if(response.status===401){window.top!.location.href='/signin-with-chatgpt?return_to=%2Fprojects';throw new Error('Entre novamente para continuar.');}
  const data=await response.json() as any;if(!response.ok)throw new Error(data.error||'Não foi possível concluir.');return data;
}
const date=(value:string)=>new Intl.DateTimeFormat('pt-BR',{day:'2-digit',month:'short'}).format(new Date(value));
const presentationPath=(project:Project)=>project.presentationPath||project.sharePath;
const json=(value:unknown)=>({headers:{'Content-Type':'application/json'},body:JSON.stringify(value)});

export default function Dashboard({initialName,email,signOutPath,isAdmin,initialFolderId=null,initialOrderId=null,initialProductId=null,initialCreate=false}:{initialCreate?:boolean;initialName:string;email:string;signOutPath:string;isAdmin:boolean;initialFolderId?:string|null;initialOrderId?:string|null;initialProductId?:string|null}){
  const projectPath=(folderId:string|null)=>{const query=new URLSearchParams();if(folderId)query.set('folder',folderId);if(initialOrderId){query.set('order',initialOrderId);if(initialProductId)query.set('item',initialProductId);}return '/projects'+(query.size?'?'+query:'');};
  const studioPath=(projectId:string)=>'/studio/'+encodeURIComponent(projectId)+(initialOrderId?'?order='+encodeURIComponent(initialOrderId)+(initialProductId?'&item='+encodeURIComponent(initialProductId):''):'');
  const [name,setName]=useState(initialName),[projects,setProjects]=useState<Project[]>([]),[folders,setFolders]=useState<ProjectFolder[]>([]);
  const [loading,setLoading]=useState(true),[error,setError]=useState(''),[notice,setNotice]=useState('');
  const [query,setQuery]=useState(''),[filter,setFilter]=useState<'all'|'shared'>('all'),[sort,setSort]=useState('recent'),[layout,setLayout]=useState('grid');
  const [modal,setModal]=useState<Modal|null>(null),[busy,setBusy]=useState(false),[modalError,setModalError]=useState('');
  const [projectName,setProjectName]=useState(''),[clientName,setClientName]=useState(''),[profileName,setProfileName]=useState(initialName),[folderName,setFolderName]=useState(''),[destination,setDestination]=useState('');
  const [photoUrl,setPhotoUrl]=useState<string|null>(null);
  const [templates,setTemplates]=useState<Mold[]>([]),[templateId,setTemplateId]=useState('');
  const selectedTemplate=templates.find(template=>template.id===templateId);
  const dialog=useRef<HTMLDialogElement>(null);
  const folderId=initialFolderId,activeFolder=folders.find(folder=>folder.id===folderId);
  const folderUnavailable=Boolean(folderId&&!loading&&!error&&!activeFolder);
  const folderNames=useMemo(()=>new Map(folders.map(folder=>[folder.id,folder.name])),[folders]);
  const sharedCount=projects.filter(p=>presentationPath(p)).length;
  const folderProjects=projects.filter(p=>p.folderId===folderId);
  const search=query.trim().toLocaleLowerCase('pt-BR');
  const matches=(p:Project)=>!search||[p.name,p.clientName,folderNames.get(p.folderId||'')||''].join(' ').toLocaleLowerCase('pt-BR').includes(search);
  const filtered=useMemo(()=>projects.filter(p=>(folderId?p.folderId===folderId:search||!p.folderId)&&matches(p)&&(filter==='all'||presentationPath(p))).sort((a,b)=>sort==='name'?a.name.localeCompare(b.name,'pt-BR'):b.updatedAt.localeCompare(a.updatedAt)),[projects,folderId,search,filter,sort,folderNames]);
  const visibleFolders=useMemo(()=>folderId?[]:folders.filter(folder=>{
    const contained=projects.filter(p=>p.folderId===folder.id&&(filter==='all'||presentationPath(p)));
    return (filter==='all'||contained.length>0)&&(!search||folder.name.toLocaleLowerCase('pt-BR').includes(search)||contained.some(matches));
  }).sort((a,b)=>a.name.localeCompare(b.name,'pt-BR')),[folders,projects,folderId,filter,search,folderNames]);

  const load=async()=>{
    setLoading(true);setError('');
    try{
      const [list,profile,molds,groups]=await Promise.all([api('/api/projects'),api('/api/profile'),api('/api/templates'),api('/api/project-folders')]);
      setProjects(list.projects);setFolders(groups.folders);setTemplates(molds.templates);setName(profile.profile.displayName);setPhotoUrl(profile.profile.photoUrl);setProfileName(profile.profile.displayName);
      setTemplateId(current=>molds.templates.some((m:Mold)=>m.id===current)?current:(molds.templates[0]?.id||''));
    }catch(err:any){setError(err.message);}finally{setLoading(false);}
  };
  useEffect(()=>{load();},[]);
  useEffect(()=>{if(initialCreate)openModal({kind:'new'});},[initialCreate]);
  useEffect(()=>{if(modal)dialog.current?.showModal();else dialog.current?.close();},[modal]);
  useEffect(()=>{if(notice){const timer=setTimeout(()=>setNotice(''),4500);return()=>clearTimeout(timer);}},[notice]);
  const close=()=>{if(!busy)setModal(null);};
  const openModal=(next:Modal)=>{
    if(next.kind==='profile'){window.location.href='/perfil';return;}
    setModalError('');
    if(next.kind==='new'){setProjectName('');setClientName('');setDestination(activeFolder?.id||'');}
    if(next.kind==='folder')setFolderName(next.folder?.name||'');
    if(next.kind==='move')setDestination(next.project.folderId||'');
    setModal(next);
  };
  async function submit(event:React.FormEvent){
    event.preventDefault();if(!modal||busy)return;setBusy(true);setModalError('');
    try{
      if(modal.kind==='new'){
        const data=await api('/api/projects',{method:'POST',...json({name:projectName,clientName,templateId,folderId:destination||null})});
        const path=studioPath(data.project.id);window.location.href=path+(path.includes('?')?'&':'?')+'created=1';return;
      }
      if(modal.kind==='folder'){
        const previous=modal.folder;
        const data=await api(previous?`/api/project-folders/${encodeURIComponent(previous.id)}`:'/api/project-folders',{method:previous?'PATCH':'POST',...json({name:folderName})});
        if(!previous){window.location.href=projectPath(data.folder.id);return;}
        setFolders(list=>list.map(folder=>folder.id===previous.id?data.folder:folder));setNotice('Nome da pasta atualizado.');
      }
      if(modal.kind==='move'){
        const data=await api(`/api/projects/${encodeURIComponent(modal.project.id)}/folder`,{method:'PATCH',...json({folderId:destination||null})});
        setProjects(list=>list.map(project=>project.id===data.project.id?{...project,folderId:data.project.folderId}:project));
        setNotice(destination?`Projeto movido para ${folderNames.get(destination)}.`:'Projeto movido para fora das pastas.');
      }
      if(modal.kind==='removeFolder'){
        await api(`/api/project-folders/${encodeURIComponent(modal.folder.id)}`,{method:'DELETE'});
        if(folderId===modal.folder.id){window.location.href=projectPath(null);return;}
        setFolders(list=>list.filter(folder=>folder.id!==modal.folder.id));setProjects(list=>list.map(project=>project.folderId===modal.folder.id?{...project,folderId:null}:project));
        setNotice('Pasta removida. Os projetos continuam em Meus projetos.');
      }
      if(modal.kind==='removeProject'){
        await api(`/api/projects/${encodeURIComponent(modal.project.id)}`,{method:'DELETE'});setProjects(list=>list.filter(project=>project.id!==modal.project.id));setNotice('Projeto excluído.');
      }
      if(modal.kind==='profile'){
        const data=await api('/api/profile',{method:'PATCH',...json({displayName:profileName})});setName(data.profile.displayName);setNotice('Sua assinatura foi atualizada.');
      }
      setModal(null);
    }catch(err:any){setModalError(err.message);}finally{setBusy(false);}
  }
  async function copy(project:Project){try{await navigator.clipboard.writeText(`${location.origin}${presentationPath(project)}`);setNotice('Link da apresentação copiado.');}catch{setNotice('Abra o projeto para visualizar e copiar o link.');}}
  const modalTitle=modal?.kind==='folder'?(modal.folder?'Renomear pasta.':'Uma pasta para seus modelos.'):modal?.kind==='move'?'Mover projeto.':modal?.kind==='removeFolder'?'Remover esta pasta?':modal?.kind==='removeProject'?'Excluir este projeto?':modal?.kind==='profile'?'Como você assina?':'Um nome para sua criação.';
  const submitLabel=modal?.kind==='folder'?(modal.folder?'Salvar nome':'Criar pasta'):modal?.kind==='move'?'Mover projeto':modal?.kind==='removeFolder'?'Remover pasta':modal?.kind==='removeProject'?'Excluir projeto':modal?.kind==='profile'?'Salvar assinatura':'Criar e abrir estúdio';
  const removal=modal?.kind==='removeFolder'||modal?.kind==='removeProject';
  const emptySearch=Boolean(search||filter==='shared');
  return <div className="dashboard-shell">
    <aside className="app-nav studio-sidebar"><Brand/><StudioNavigation active={modal?.kind==='new'?'create-presentation':'projects'} isAdmin={isAdmin} projectHref={projectPath(null)} onCreatePresentation={()=>openModal({kind:'new'})} creationDisabled={loading||!!error||folderUnavailable}/>
    <div className="nav-account"><button onClick={()=>openModal({kind:'profile'})} className="profile-trigger"><span className="avatar">{photoUrl?<img src={photoUrl} alt="Sua foto" style={{width:'100%',height:'100%',objectFit:'cover',borderRadius:'50%'}}/>:name.slice(0,1).toUpperCase()}</span><span><strong>{name}</strong><small>Seu perfil de designer</small></span><Settings2 size={16}/></button><a className="signout" href={signOutPath} target="_top"><LogOut size={14}/>Sair da conta</a></div></aside>

    <main className="dashboard-main">
      <header className="dashboard-top"><span>MEU ESTÚDIO <i>/</i> <b>Meus projetos</b></span><button className="top-signature" onClick={()=>openModal({kind:'profile'})} aria-label="Editar assinatura do designer">DESIGN POR <strong>{name}</strong><span className="avatar small">{photoUrl?<img src={photoUrl} alt="Sua foto" style={{width:'100%',height:'100%',objectFit:'cover',borderRadius:'50%'}}/>:name.slice(0,1).toUpperCase()}</span></button><ThemeSelector/></header>
      <div className="dashboard-content">
        <div className="project-location"><nav aria-label="Localização dos projetos"><a href={projectPath(null)} aria-current={!folderId?'page':undefined}>Meus projetos</a>{folderId&&<><ChevronRight size={14}/><span aria-current="page">{activeFolder?.name||(loading?'Abrindo pasta…':'Pasta indisponível')}</span></>}</nav>{activeFolder&&<button className="folder-rename" onClick={()=>openModal({kind:'folder',folder:activeFolder})}>Renomear pasta</button>}</div>
        <section className="page-intro"><div><p className="eyebrow">{activeFolder?'SEUS MODELOS, NO MESMO LUGAR':'SEU PORTFÓLIO EM MOVIMENTO'}</p><h1>{activeFolder?activeFolder.name:'Cada projeto, uma nova ideia.'}</h1><p>{activeFolder?'Os modelos deste cliente, reunidos na mesma pasta.':'Comece pela apresentação, pela lista ou pelo pedido. Reúna tudo quando quiser.'}</p></div><div className="project-create-actions">{!folderId&&<button className="outline-button" onClick={()=>openModal({kind:'folder'})} disabled={loading||!!error}><FolderPlus size={17}/>Nova pasta</button>}<button className="gold-button new-project" onClick={()=>openModal({kind:'new'})} disabled={loading||!!error||folderUnavailable}><Plus size={17}/>Novo projeto</button></div></section>
        <div className="row-actions" style={{display:"flex",gap:12,flexWrap:"wrap",marginBottom:20}}><a className="outline-button" href="/pedidos">Montar pedido</a><a className="outline-button" href="/organizador">Organizar lista</a><button className="outline-button" onClick={()=>openModal({kind:'new'})} disabled={loading||!!error}>Criar apresentação</button></div><div className="collection-summary"><span><strong>{String(activeFolder?folderProjects.length:projects.length).padStart(2,'0')}</strong> {activeFolder?'projetos nesta pasta':'projetos no estúdio'}</span><i/>{!folderId&&<><span><strong>{String(folders.length).padStart(2,'0')}</strong> pastas</span><i/></>}<span><strong>{String(activeFolder?folderProjects.filter(p=>presentationPath(p)).length:sharedCount).padStart(2,'0')}</strong> com link</span><span className="summary-label"><span className="status-dot"/> SUA BIBLIOTECA PESSOAL</span></div>
        <div className="collection-tools"><div className="project-filter" role="group" aria-label="Filtrar projetos"><button className={filter==='all'?'active':''} aria-pressed={filter==='all'} onClick={()=>setFilter('all')}>Todos</button><button className={filter==='shared'?'active':''} aria-pressed={filter==='shared'} onClick={()=>setFilter('shared')}><Link2 size={13}/>Com link</button></div><div className="tools-right"><label className="search-field"><Search size={16}/><input placeholder={folderId?'Buscar nesta pasta':'Buscar projeto, cliente ou pasta'} value={query} onChange={e=>setQuery(e.target.value)} aria-label="Buscar projeto, cliente ou pasta"/></label><div className="sort-select"><select aria-label="Ordenar projetos" value={sort} onChange={e=>setSort(e.target.value)}><option value="recent">Mais recentes</option><option value="name">Nome A–Z</option></select><ChevronDown size={13}/></div><div className="layout-toggle"><button aria-label="Exibir em grade" aria-pressed={layout==='grid'} className={layout==='grid'?'active':''} onClick={()=>setLayout('grid')}><Grid2X2 size={16}/></button><button aria-label="Exibir em lista" aria-pressed={layout==='list'} className={layout==='list'?'active':''} onClick={()=>setLayout('list')}><LayoutList size={17}/></button></div></div></div>

        {error?<div className="load-error" role="alert"><h3>Não conseguimos abrir seus projetos.</h3><p>{error}</p><button className="outline-button" onClick={load}>Tentar novamente</button></div>:loading?<div className="project-grid" aria-label="Carregando projetos">{[1,2,3].map(n=><div key={n} className="skeleton-card"/>)}</div>:folderUnavailable?<div className="load-error" role="alert"><h3>Esta pasta não está disponível.</h3><p>Ela pode ter sido removida ou pertencer a outra conta.</p><a className="outline-button" href={projectPath(null)}>Voltar aos projetos</a></div>:<>
          {!folderId&&visibleFolders.length>0&&<section className="project-folders-section" aria-label="Pastas de projetos"><div className="folder-section-heading"><h2>Pastas</h2><span>{visibleFolders.length}</span></div><div className="project-folders-grid">{visibleFolders.map(folder=>{
            const children=projects.filter(p=>p.folderId===folder.id),links=children.filter(p=>presentationPath(p)).length;
            return <article className="project-folder" key={folder.id}><a className="folder-open" href={projectPath(folder.id)} aria-label={`Abrir pasta ${folder.name}`}><Folder size={29} strokeWidth={1.2}/><h3>{folder.name}</h3><p>{children.length} {children.length===1?'projeto':'projetos'}{links?` · ${links} com link`:''}</p><ChevronRight className="folder-arrow" size={16}/></a><details className="project-menu folder-menu"><summary aria-label={`Opções da pasta ${folder.name}`}><Ellipsis size={20}/></summary><div><button onClick={()=>openModal({kind:'folder',folder})}><Settings2 size={14}/>Renomear pasta</button><button className="delete-action" onClick={()=>openModal({kind:'removeFolder',folder})}><Trash2 size={14}/>Remover pasta</button></div></details></article>;
          })}</div></section>}
          {filtered.length>0?<section aria-label="Projetos"><div className="folder-section-heading"><h2>{search?'Resultados da busca':activeFolder?'Modelos da pasta':'Projetos sem pasta'}</h2><span>{filtered.length}</span></div><div className={`project-grid ${layout==='list'?'as-list':''}`}>{filtered.map((p,i)=><article className="project-card" key={p.id}><a className="project-preview" href={studioPath(p.id)}><span className="preview-index">{String(i+1).padStart(2,'0')} / 3D</span>{p.templateId!=='camiseta-teste-clo-v1'&&!p.thumbnailUrl?<div className="project-placeholder"><Box size={48} strokeWidth={.8}/><span>MOLDE CADASTRADO</span></div>:<img src={p.thumbnailUrl||'/assets/molde-preview.png'} alt={p.thumbnailUrl?`Apresentação de ${p.name}`:'Molde de camiseta sem capa salva'} className={p.thumbnailUrl?'project-thumbnail':'neutral-preview'}/>}<span className="preview-open">Abrir no estúdio <ArrowUpRight size={15}/></span><span className={`project-badge ${presentationPath(p)?'shared':''}`}><i/>{presentationPath(p)?'Link ativo':p.hasMap?'Arte salva':'Rascunho'}</span></a><div className="project-info"><div><p>{(search&&p.folderId?folderNames.get(p.folderId):p.clientName)||'PROJETO AUTORAL'}</p><a href={studioPath(p.id)}><h3>{p.name}</h3></a></div><details className="project-menu"><summary aria-label={`Opções de ${p.name}`}><Ellipsis size={20}/></summary><div>{presentationPath(p)&&<><a href={presentationPath(p)!} target="_blank" rel="noreferrer"><ArrowUpRight size={14}/>Ver apresentação</a><button onClick={()=>copy(p)}><Link2 size={14}/>Copiar link</button></>}<a href={`/pedidos?project=${encodeURIComponent(p.id)}${initialOrderId?'&order='+encodeURIComponent(initialOrderId)+(initialProductId?'&item='+encodeURIComponent(initialProductId):''):''}`}><TableProperties size={14}/>Usar em um pedido</a><button onClick={()=>openModal({kind:'move',project:p})}><MoveRight size={14}/>Mover para pasta</button><button className="delete-action" onClick={()=>openModal({kind:'removeProject',project:p})}><Trash2 size={14}/>Excluir projeto</button></div></details></div><footer className="project-footer"><span>Atualizado em {date(p.updatedAt)}</span><span>V{String(p.version).padStart(2,'0')} <ArrowUpRight size={13}/></span></footer></article>)}<button className="add-project-card" onClick={()=>openModal({kind:'new'})}><span><Plus size={24} strokeWidth={1}/></span><strong>{activeFolder?'Mais um modelo?':'Uma nova ideia?'}</strong><p>Crie seu próximo projeto.</p></button></div></section>:visibleFolders.length>0?<p className="folder-root-note">{emptySearch?'Nenhum projeto solto corresponde ao filtro. Abra uma pasta acima para ver seus modelos.':'Seus modelos estão organizados nas pastas acima. Projetos sem pasta aparecem aqui.'}</p>:<div className="empty-library folder-empty"><div className="empty-folder-icon"><FolderOpen size={58} strokeWidth={.8}/></div><div><p className="eyebrow">{emptySearch?'ENCONTRE SUA CRIAÇÃO':activeFolder?'PASTA CRIADA':'ORGANIZE SEU ESTÚDIO'}</p><h2>{search?'Nenhum projeto encontrado.':filter==='shared'?'Nenhum projeto com link nesta visualização.':activeFolder?'O primeiro modelo começa aqui.':'Uma pasta para cada equipe.'}</h2><p>{emptySearch?'Tente outra busca ou selecione Todos.':activeFolder?'Crie seus modelos de jogo e treino. Para trazer uma criação existente, use Mover para pasta no menu do projeto.':'Crie uma pasta com o nome do cliente e guarde seus modelos lá dentro. Projetos existentes continuam disponíveis aqui.'}</p>{emptySearch?<button className="outline-button" onClick={()=>{setQuery('');setFilter('all');}}>Mostrar todos</button>:<button className="gold-button" onClick={()=>openModal(activeFolder?{kind:'new'}:{kind:'folder'})}>{activeFolder?<Plus size={16}/>:<FolderPlus size={16}/>} {activeFolder?'Criar primeiro projeto':'Criar pasta'}</button>}</div></div>}
        </>}
        <footer className="dashboard-footer"><span>ATLAS UNIFORM STUDIO</span><p>Você cuida da criação. A apresentação acompanha.</p><span>CRIADO POR ANDREI RAIMUNDI</span></footer>
      </div>
    </main>
    <dialog ref={dialog} className="studio-dialog" aria-labelledby="projectDialogTitle" onCancel={e=>{if(busy)e.preventDefault();else close();}} onClick={e=>{if(e.target===dialog.current)close();}}><form onSubmit={submit}><button className="dialog-close" aria-label="Fechar" type="button" onClick={close} disabled={busy}><X size={20}/></button><p className="eyebrow">{modal?.kind==='profile'?'SUA ASSINATURA':modal?.kind==='new'?'COMECE UMA NOVA IDEIA':'ORGANIZAR SEU ESTÚDIO'}</p><h2 id="projectDialogTitle">{modalTitle}</h2>
      {modal?.kind==='removeProject'?<p className="body-copy">“{modal.project.name}” e sua arte salva serão excluídos do estúdio.</p>:modal?.kind==='removeFolder'?<p className="body-copy">A pasta “{modal.folder.name}” será removida. Os projetos continuarão salvos e aparecerão fora das pastas, em Meus projetos.</p>:modal?.kind==='folder'?<><p className="body-copy">Use o nome que preferir. Por exemplo, ADEMA para reunir jogo 1, jogo 2 e treino.</p><label className="form-field">Nome da pasta<input value={folderName} onChange={e=>setFolderName(e.target.value)} maxLength={100} placeholder="Ex.: ADEMA" required autoFocus disabled={busy}/></label></>:modal?.kind==='move'?<><p className="body-copy">Escolha onde guardar “{modal.project.name}”.</p><label className="form-field folder-field">Pasta de destino<select value={destination} onChange={e=>setDestination(e.target.value)} disabled={busy}><option value="">Fora das pastas</option>{folders.map(folder=><option key={folder.id} value={folder.id}>{folder.name}</option>)}</select></label></>:modal?.kind==='profile'?<><p className="body-copy">Este nome aparece no seu estúdio e nas apresentações para seus clientes.</p><label className="form-field">Nome do designer ou estúdio<input value={profileName} onChange={e=>setProfileName(e.target.value)} maxLength={80} required autoFocus disabled={busy}/></label><p className="account-email">{email}</p><a className="profile-signout" href={signOutPath} target="_top">Sair da conta ↗</a></>:modal?.kind==='new'?<><label className="form-field">Nome do projeto<input value={projectName} onChange={e=>setProjectName(e.target.value)} placeholder="Ex.: Modelo de jogo 1" maxLength={100} required autoFocus disabled={busy}/></label><label className="form-field">Cliente <small>opcional</small><input value={clientName} onChange={e=>setClientName(e.target.value)} placeholder="Nome do time ou cliente" maxLength={100} disabled={busy}/></label><label className="form-field folder-field">Pasta<select value={destination} onChange={e=>setDestination(e.target.value)} disabled={busy}><option value="">Fora das pastas</option>{folders.map(folder=><option key={folder.id} value={folder.id}>{folder.name}</option>)}</select></label><div className="mold-choice"><label htmlFor="projectMold">Molde do projeto</label><MoldPicker templates={templates} value={templateId} onChange={setTemplateId} disabled={busy}/><p>Escolha o molde e baixe o template para desenhar. Esse mesmo molde será usado na apresentação.</p>{selectedTemplate&&<a className="outline-button mold-template-download" href={`/api/templates/${encodeURIComponent(selectedTemplate.id)}/assets/template`} download={`Template_${selectedTemplate.name.replace(/[^a-zA-Z0-9_-]/g, '_')}.svg`} aria-label={`Baixar template de ${selectedTemplate.name}`}><ArrowDownToLine size={15}/>Baixar template SVG</a>}</div></>:null}
      {modalError&&<p className="form-error" role="alert">{modalError}</p>}<div className="dialog-actions"><button type="button" className="outline-button" onClick={close} disabled={busy}>Cancelar</button><button className={removal?'danger-button':'gold-button'} disabled={busy||(modal?.kind==='new'&&!templateId)||(modal?.kind==='move'&&destination===(modal.project.folderId||''))}>{busy?'Salvando…':submitLabel}{!busy&&<ArrowUpRight size={16}/>}</button></div>
    </form></dialog>
    {notice&&<div className="app-toast" role="status"><Check size={15}/>{notice}</div>}
  </div>;
}
