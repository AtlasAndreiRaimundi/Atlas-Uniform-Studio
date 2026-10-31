export const TUTORIAL_STEPS=Object.freeze([
 {id:'model',tool:'model',targets:['#product'],title:'Comece pelas peças',body:'Na ferramenta Modelo, escolha kit, somente camiseta ou somente calção. O KIT EDGE 2027 é a base disponível para criar.',tip:'Novo uniforme começa uma criação do zero. Use essa opção quando quiser iniciar outro desenho.'},
 {id:'panels',targets:['.canvas-head'],title:'Escolha onde desenhar',body:'Em Você está editando, escolha frente, costas, mangas, filetes, recortes ou calção. As cores e os elementos serão aplicados ao painel escolhido.',tip:'Você também pode clicar na peça no 3D. Confira o nome do painel antes de editar.'},
 {id:'view',targets:['.canvas-area'],title:'Veja o uniforme por todos os lados',body:'Use Frente, Costas, Direita e Esquerda para conferir o desenho. Em 3D, arraste o fundo para girar e use + e − para aproximar ou afastar.',tip:'Mover elementos arrasta a arte; Girar o uniforme controla a câmera. Painel 2D ajuda nos ajustes de posição.'},
 {id:'colors',tool:'colors',targets:['#base-palette','.color-field'],title:'Escolha as cores',body:'A paleta muda o fundo do painel ativo. Busque uma cor pelo nome ou referência. Golas, filetes e cós têm um controle separado nesta área.',tip:'Aplicar esta cor em todos os painéis altera o uniforme inteiro. As cores da tela são referências para a impressão.'},
 {id:'graphics',tool:'patterns',targets:['.graphic-workspace'],title:'Troque um grafismo sem acumular camadas',body:'Escolha o Grafismo em edição. Depois, clique em um desenho da biblioteca para substituí-lo, mantendo sua cor, posição e ajustes. As categorias organizam as opções.',tip:'Para sobrepor mais um desenho, clique primeiro em Adicionar outro grafismo. A próxima escolha cria uma única camada.'},
 {id:'layers',targets:['#layers-section'],title:'Organize o que aparece por cima',body:'A lista separa Escudos e personalização de Grafismos. Clique no elemento que deseja editar. Dentro de cada grupo, a lista mostra a ordem de cima para baixo.',tip:'Escudos, logos, nomes e números ficam sempre acima dos grafismos. Subir e Descer alteram a ordem dentro do grupo.'},
 {id:'adjust',targets:['#properties','#layers-section'],title:'Ajuste cada elemento',body:'Ao selecionar uma camada, o painel de ajustes mostra cor, tamanho, posição e opacidade. Você pode centralizar, fixar, duplicar ou excluir. Grafismos também permitem rotação e inversão horizontal.',tip:'Se os ajustes não estiverem abertos, selecione uma camada após o guia. Nomes e números mantêm a proporção travada e não giram.'},
 {id:'text',tool:'text',targets:['[data-section="text"]'],title:'Adicione textos, nomes e números',body:'Em Textos, escreva o nome do time ou uma mensagem e escolha a fonte. Os atalhos inserem o nome do jogador e o número.',tip:'No simulador, os exemplos são JOGADOR e 00. Os nomes e números reais vêm da lista do pedido.'},
 {id:'logos',tool:'logos',targets:['#logo-drop'],title:'Envie escudos e patrocínios',body:'Em Logos, envie um arquivo PNG ou SVG, clicando ou arrastando para esta área. Depois, selecione a logo para dimensionar e posicionar.',tip:'Confira o aviso de resolução antes de ampliar um PNG. No SVG, use vetores com os textos convertidos em curvas.'},
 {id:'symmetry',targets:['#open-side-copy'],title:'Use os lados juntos ou separados',body:'Nos novos uniformes, mangas, filetes, recortes e lados do calção têm simetria em tempo real. Editar um lado atualiza o outro; as cores continuam independentes.',tip:'Ao editar um par ativo, o lembrete permite Desligar simetria. Copiar entre lados / simetria também oferece cópia única e configurações por par.'},
 {id:'save',targets:['.header-actions'],title:'Salve e retome suas criações',body:'Dê um nome ao projeto no painel da direita. Desfazer e Refazer ajudam a corrigir alterações. Salvar uniforme guarda a criação na sua conta; Meus uniformes permite reabri-la.',tip:'Sem entrar na conta, a criação fica neste navegador. Salve na sua conta para continuar em outro computador.'},
 {id:'review',targets:['#review'],title:'Confira e siga para a próxima etapa',body:'Em Conferir desenho, revise as quatro vistas e os avisos. Marque a conferência quando estiver satisfeito para criar uma apresentação ou continuar para um pedido.',tip:'A apresentação abre no estúdio para gerar imagens, vídeo e link. O pedido segue como rascunho para completar os dados técnicos e a lista.'},
]);

const STATUSES=new Set(['started','dismissed','completed']);
export function readTutorialChoice(storage,key){try{const value=storage?.getItem(key);return STATUSES.has(value)?value:null;}catch{return null;}}
export function writeTutorialChoice(storage,key,status){if(!STATUSES.has(status))return false;try{if(!storage)return false;storage.setItem(key,status);return true;}catch{return false;}}

export function placeTutorialCard(rect,card,viewport){
 const margin=16,gap=16,width=Math.min(card.width,Math.max(1,viewport.width-margin*2)),height=Math.min(card.height,Math.max(1,viewport.height-margin*2));
 const clamp=(n,min,max)=>Math.max(min,Math.min(Math.max(min,max),n));
 const fit=(left,top)=>left>=margin&&top>=margin&&left+width<=viewport.width-margin&&top+height<=viewport.height-margin;
 const centerX=rect?(rect.left+rect.right)/2:viewport.width/2,centerY=rect?(rect.top+rect.bottom)/2:viewport.height/2;
 if(rect){
  const x=clamp(centerX-width/2,margin,viewport.width-width-margin),y=clamp(centerY-height/2,margin,viewport.height-height-margin);
  const candidates=[{left:rect.right+gap,top:y,side:'right'},{left:rect.left-gap-width,top:y,side:'left'},{left:x,top:rect.bottom+gap,side:'bottom'},{left:x,top:rect.top-gap-height,side:'top'}];
  const fitting=candidates.find(c=>fit(c.left,c.top));if(fitting)return {...fitting,width,height};
 }
 return {left:clamp(centerX-width/2,margin,viewport.width-width-margin),top:rect?Math.max(margin,viewport.height-height-margin):clamp(centerY-height/2,margin,viewport.height-height-margin),side:rect?'overlay':'center',width,height};
}

export function setupTutorial({setTool,key,notify=()=>{},canOffer=()=>true}){
 const $=id=>document.getElementById(id),welcome=$('tutorial-welcome'),tour=$('tutorial-tour'),card=$('tutorial-card'),spotlight=$('tutorial-spotlight'),launch=$('tutorial-launch');
 let storage=null;try{storage=window.localStorage;}catch{}
 const preferenceKey='atlas-simulator-guide-v1:'+key;let offered=false,index=0,snapshot=null,target=null,frame=0;
 const observer=new ResizeObserver(()=>scheduleLayout());
 function remember(status){writeTutorialChoice(storage,preferenceKey,status);}
 function visible(selector){const element=document.querySelector(selector);return element&&element.getClientRects().length&&getComputedStyle(element).visibility!=='hidden'?element:null;}
 function targetRect(){
  if(!target?.isConnected)return null;let r=target.getBoundingClientRect(),left=Math.max(8,r.left-6),top=Math.max(8,r.top-6),right=Math.min(innerWidth-8,r.right+6),bottom=Math.min(innerHeight-8,r.bottom+6);
  for(let parent=target.parentElement;parent&&parent!==document.body;parent=parent.parentElement){const style=getComputedStyle(parent);if(/auto|scroll|hidden|clip/.test(style.overflow+style.overflowX+style.overflowY)){r=parent.getBoundingClientRect();left=Math.max(left,r.left);right=Math.min(right,r.right);top=Math.max(top,r.top);bottom=Math.min(bottom,r.bottom);}}
  return right>left&&bottom>top?{left,top,right,bottom}:null;
 }
 function layout(){
  frame=0;if(!tour.open)return;const rect=targetRect();spotlight.hidden=!rect;
  if(rect){Object.assign(spotlight.style,{left:rect.left+'px',top:rect.top+'px',width:(rect.right-rect.left)+'px',height:(rect.bottom-rect.top)+'px'});}
  const position=placeTutorialCard(rect,{width:card.offsetWidth,height:card.offsetHeight},{width:innerWidth,height:innerHeight});Object.assign(card.style,{left:position.left+'px',top:position.top+'px'});tour.dataset.placement=position.side;
 }
 function scheduleLayout(){if(tour.open&&!frame)frame=requestAnimationFrame(layout);}
 function showStep(){
  const step=TUTORIAL_STEPS[index];if(step.tool)setTool(step.tool);
  $('tutorial-step').textContent=`ETAPA ${index+1} DE ${TUTORIAL_STEPS.length}`;$('tutorial-title').textContent=step.title;$('tutorial-body').textContent=step.body;$('tutorial-tip').textContent=step.tip;
  $('tutorial-progress').max=TUTORIAL_STEPS.length;$('tutorial-progress').value=index+1;$('tutorial-back').disabled=index===0;$('tutorial-next').textContent=index===TUTORIAL_STEPS.length-1?'Concluir guia':'Próximo';
  observer.disconnect();target=step.targets.map(visible).find(Boolean)??null;
  target?.scrollIntoView({block:innerWidth<=700?'start':'center',inline:'nearest',behavior:'instant'});if(target)observer.observe(target);observer.observe(card);layout();scheduleLayout();$('tutorial-next').focus({preventScroll:true});
 }
 function restore(){
  if(!snapshot)return;setTool(snapshot.tool);for(const {element,top,left}of snapshot.scrolls)if(element.isConnected){element.scrollTop=top;element.scrollLeft=left;}window.scrollTo({left:snapshot.x,top:snapshot.y,behavior:'instant'});snapshot=null;launch.focus({preventScroll:true});
 }
 function finish(completed=false){
  if(!tour.open)return;remember(completed?'completed':'dismissed');observer.disconnect();cancelAnimationFrame(frame);frame=0;tour.close();restore();if(completed)notify('Guia concluído. Você pode rever o passo a passo em Como usar.');
 }
 function start(){
  if(tour.open)return;if(welcome.open)welcome.close();
  snapshot={tool:document.querySelector('[data-tool][aria-current="page"]')?.dataset.tool??'patterns',scrolls:[...document.querySelectorAll('.library,.inspector')].map(element=>({element,top:element.scrollTop,left:element.scrollLeft})),x:scrollX,y:scrollY};
  remember('started');index=0;tour.showModal();showStep();
 }
 function dismissWelcome(){remember('dismissed');welcome.close();launch.focus({preventScroll:true});}
 function showWelcome(){if(tour.open||document.querySelector('dialog[open]'))return false;welcome.showModal();$('tutorial-start').focus({preventScroll:true});return true;}
 launch.disabled=false;launch.onclick=showWelcome;$('tutorial-start').onclick=start;for(const id of ['tutorial-later','tutorial-welcome-close'])$(id).onclick=dismissWelcome;
 welcome.addEventListener('cancel',event=>{event.preventDefault();dismissWelcome();});tour.addEventListener('cancel',event=>{event.preventDefault();finish();});
 $('tutorial-close').onclick=()=>finish();$('tutorial-skip').onclick=()=>finish();$('tutorial-back').onclick=()=>{if(index>0){index--;showStep();}};$('tutorial-next').onclick=()=>{if(index<TUTORIAL_STEPS.length-1){index++;showStep();}else finish(true);};
 tour.addEventListener('keydown',event=>{if(event.key==='ArrowRight'){event.preventDefault();$('tutorial-next').click();}else if(event.key==='ArrowLeft'){event.preventDefault();$('tutorial-back').click();}});
 window.addEventListener('resize',scheduleLayout);document.addEventListener('scroll',scheduleLayout,true);
 return {offer(){if(offered||readTutorialChoice(storage,preferenceKey)||!canOffer())return false;offered=showWelcome();return offered;},start,close:finish};
}
