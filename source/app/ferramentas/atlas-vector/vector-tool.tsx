'use client';
import {useEffect,useRef,useState} from 'react';
import StudioNavigation from '@/app/studio-navigation';
import ThemeSelector from '@/app/theme-selector';
import {Brand} from '@/app/brand';
import './vector.css';

export default function VectorTool(){
  const [file,setFile]=useState<File|null>(null),[original,setOriginal]=useState(''),[svg,setSVG]=useState(''),[gap,setGap]=useState(false),[ready,setReady]=useState(false),[busy,setBusy]=useState(false),[checking,setChecking]=useState(true),[error,setError]=useState(''),[notice,setNotice]=useState('');
  const operation=useRef<AbortController|null>(null),generation=useRef(0),health=useRef<AbortController|null>(null);
  useEffect(()=>()=>{operation.current?.abort();health.current?.abort();},[]);
  useEffect(()=>()=>{if(original)URL.revokeObjectURL(original);},[original]);
  useEffect(()=>()=>{if(svg)URL.revokeObjectURL(svg);},[svg]);
  async function check(){health.current?.abort();const controller=new AbortController();health.current=controller;setChecking(true);setReady(false);try{const r=await fetch('/api/atlas-vector',{cache:'no-store',signal:controller.signal});const d=await r.json() as {ready?:boolean;error?:string};if(!r.ok||!d.ready)throw new Error(d.error||'Motor indisponível.');setReady(true);setError('');}catch(e:any){if(!controller.signal.aborted)setError(e.message||'Não foi possível consultar o motor.');}finally{if(!controller.signal.aborted)setChecking(false);}}
  useEffect(()=>{check();},[]);
  async function choose(next?:File){
    operation.current?.abort();const id=++generation.current;setBusy(false);setFile(null);setOriginal('');setSVG('');setNotice('');setError('');if(!next)return;
    try{if(next.type!=='image/png'||next.size>4194304)throw new Error('Escolha um PNG de até 4 MB.');
      const head=new Uint8Array(await next.slice(0,33).arrayBuffer());if(head.length<33||[137,80,78,71,13,10,26,10].some((n,i)=>head[i]!==n))throw new Error('Arquivo PNG inválido.');
      const view=new DataView(head.buffer),w=view.getUint32(16),h=view.getUint32(20);if(!w||!h||w>1536||h>1536||w*h>1048576)throw new Error('Use até 1 megapixel e 1536 pixels por lado.');
      if(id!==generation.current)return;setFile(next);setOriginal(URL.createObjectURL(next));
    }catch(e:any){if(id===generation.current)setError(e.message);}
  }
  async function convert(){if(!file||!ready||busy)return;const controller=new AbortController();operation.current=controller;const id=++generation.current;setBusy(true);setError('');setSVG('');setNotice('');
    try{const r=await fetch('/api/atlas-vector',{method:'POST',headers:{'Content-Type':'image/png','X-Atlas-Gap-Repair':String(gap)},body:file,signal:controller.signal,cache:'no-store'});
      if(!r.ok){const d=await r.json() as {ready?:boolean;error?:string};throw new Error(d.error||'Não foi possível vetorizar.');}
      if(!r.headers.get('content-type')?.startsWith('image/svg+xml'))throw new Error('Resposta inesperada.');const blob=await r.blob();if(blob.size>8388608)throw new Error('SVG excede o limite.');if(id!==generation.current)return;
      setSVG(URL.createObjectURL(blob));setNotice('SVG pronto. Compare os detalhes antes de baixar.');
    }catch(e:any){if(!controller.signal.aborted&&id===generation.current)setError(e.message||'Falha de conexão. Tente novamente.');}finally{if(id===generation.current)setBusy(false);}}
  function cancel(){generation.current++;operation.current?.abort();setBusy(false);setNotice('Processamento cancelado.');}
  return <div className="av-shell"><aside className="studio-sidebar av-sidebar"><Brand/><StudioNavigation active="atlas-vector"/><ThemeSelector/></aside><main className="av-main">
    <header className="av-heading"><div><p className="av-eyebrow">FERRAMENTAS · MOTOR PRÓPRIO ATLAS</p><h1>ATLAS VECTOR <span>BETA</span></h1><p>Da imagem ao vetor. Importe, compare e baixe seu SVG editável.</p></div></header>
    <div className="av-service" role="status"><span className={ready?'av-dot ready':'av-dot'}/>{checking?'Verificando o motor…':ready?'Motor ATLAS disponível':'Motor ATLAS indisponível'}<button type="button" onClick={check} disabled={checking||busy}>Verificar novamente</button></div>
    {error&&<p className="av-alert" role="alert">{error}</p>}
    <div className="av-workspace"><section className="av-controls" aria-label="Preparar vetorização"><h2><span>1</span> Escolha a imagem</h2><p>PNG estático, até 4 MB, 1 megapixel e 1536 px por lado.</p><label className="av-upload">{file?'Trocar imagem':'Importar PNG'}<input type="file" accept="image/png" onChange={e=>{choose(e.target.files?.[0]);e.target.value='';}}/></label>{file&&<p className="av-filename">{file.name}</p>}
      <h2><span>2</span> Prepare o traçado</h2><div className="av-mode"><strong>Modo fiel</strong><p>Curvas e retas pelo motor ATLAS. Paleta automática de até 8 cores.</p></div><label className="av-checkbox"><input type="checkbox" checked={gap} disabled={busy} onChange={e=>{setGap(e.target.checked);setSVG('');setNotice('');}}/><span>Corrigir frestas<small>Adiciona preenchimentos vetoriais sob os caminhos. Pode aumentar a quantidade de objetos.</small></span></label><p className="av-hint">Melhor para desenhos com cores chapadas. Fotos e degradês serão simplificados. Transparência usa recorte de alfa; textos viram curvas, sem reconhecimento de fontes.</p>
      <button className="av-primary" type="button" onClick={convert} disabled={!file||!ready||busy||checking}>{busy?'Vetorizando com ATLAS…':'Vetorizar imagem'}</button>{busy&&<button className="av-secondary" type="button" onClick={cancel}>Cancelar</button>}<small className="av-privacy">Sem salvar em pedidos ou projetos. Os arquivos ficam temporariamente durante a conversão e são descartados ao concluir ou cancelar.</small></section>
      <section className="av-results" aria-label="Comparar original e vetor"><header><h2><span>3</span> Compare o resultado</h2>{svg&&<a className="av-download" href={svg} download={(file?.name.replace(/\.png$/i,'')||'atlas')+'-atlas-vector.svg'}>Baixar SVG editável ↓</a>}</header><div className="av-comparison"><figure><figcaption>Original · PNG</figcaption><div className="av-canvas">{original?<img src={original} alt="Imagem original para comparação"/>:<p>Sua imagem aparecerá aqui.</p>}</div></figure><figure><figcaption>Resultado · SVG</figcaption><div className="av-canvas" aria-busy={busy}>{svg?<img src={svg} alt="Resultado vetorial do motor ATLAS"/>:<p>{busy?'Traçando curvas e formas…':'O vetor aparecerá aqui após o processamento.'}</p>}</div></figure></div><p role="status" className="av-notice">{notice}</p><p className="av-hint">Amplie no seu editor vetorial para conferir bordas, vazios e detalhes. O SVG contém caminhos independentes e editáveis, sem imagem embutida.</p>{file&&<button type="button" className="av-secondary" onClick={()=>choose()}>Limpar imagem e resultado</button>}</section></div>
  </main></div>;
}
