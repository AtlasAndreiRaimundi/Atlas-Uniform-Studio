import {sidePairs,copySideDetails,setLiveSymmetry,disableLiveSymmetry} from './symmetry.js';
import {paint} from './paint.js';
import {DEFAULT_ACCENT,paletteColor} from './catalog.js';
const $=id=>document.getElementById(id);
const option=(value,text)=>{const o=document.createElement('option');o.value=value;o.textContent=text;return o;};
export function setupSideCopy({getState,getRevision,onApply,openPalette,toast}){
 const dialog=$('side-copy-dialog');let draft=null,revisionAtOpen=0,customColor=DEFAULT_ACCENT.id,mode='copy';
 function config(){return {pairId:$('side-copy-pair').value,sourceId:$('side-copy-source').value,mirror:$('side-copy-layout').value==='mirror',colorPolicy:$('side-copy-colors').value,colorId:customColor,copyBase:$('side-copy-base').checked,writeMode:$('side-copy-mode').value,layerIds:[...$('side-copy-layers').querySelectorAll('input:checked')].map(i=>i.value)};}
 function preview(canvas,panel){const r=panel.cm.w/panel.cm.h;canvas.width=Math.max(1,Math.round(480*Math.min(1,r)));canvas.height=Math.max(1,Math.round(480*Math.min(1,1/r)));paint(canvas,panel);}
 function refresh(){
  draft=null;$('side-copy-apply').disabled=true;const state=getState(),c=config(),pair=sidePairs(state).find(p=>p.id===c.pairId),source=state.panels.find(p=>p.id===c.sourceId),target=state.panels.find(p=>p.id===pair?.panels.find(id=>id!==c.sourceId));if(!source||!target)return;
  const live=state.symmetry?.[c.pairId];$('side-live-status').textContent=live?'Tempo real ligado para '+pair.label:'Tempo real desligado para '+pair.label;$('side-live-disable').hidden=!live;
  for(const id of ['side-copy-tab-once','side-copy-tab-live']){const active=(id==='side-copy-tab-live')===(mode==='live');$(id).setAttribute('aria-pressed',String(active));$(id).classList.toggle('active',active);}
  $('side-copy-colors-field').hidden=mode==='live';$('side-live-scope-field').hidden=mode!=='live';$('side-copy-advanced').hidden=mode==='live';$('side-live-options').hidden=mode!=='live';$('side-copy-custom-field').hidden=mode==='live'||c.colorPolicy!=='custom';
  $('side-copy-origin-name').textContent=source.label;$('side-copy-target-name').textContent=target.label;$('side-copy-destination').textContent=target.label;preview($('side-copy-origin-canvas'),source);
  const color=paletteColor(customColor);$('side-copy-custom-color').style.backgroundColor=color.hex;$('side-copy-custom-name').textContent=color.name;
  $('side-copy-apply').textContent=mode==='copy'?'Aplicar cópia única':live?'Salvar simetria em tempo real':'Ligar simetria em tempo real';
  try{
   if(mode==='copy'){
    if(live)throw Error('Este par está com tempo real ligado. Ajuste na aba Tempo real ou desligue a atualização para usar uma cópia única.');
    draft=copySideDetails(state,c);const s=draft.stats;
    $('side-copy-summary').textContent=(c.writeMode==='replace'?`Substitui os ${s.targetCount} elementos atuais do destino por ${s.sourceCount}.`:`Atualiza ${s.updated} e adiciona ${s.added} elementos. Os demais serão mantidos.`)+' '+(c.colorPolicy==='target'?`Preserva as cores de ${s.preservedColors} elementos equivalentes; elementos novos usam a cor da origem.`:c.colorPolicy==='custom'?'Usa a cor escolhida nos detalhes copiados.':'Usa as cores dos detalhes da origem.')+(c.copyBase?' A cor de fundo também será copiada.':' A cor de fundo do destino será mantida.');
   }else{
    const settings={pairId:c.pairId,sourceId:c.sourceId,mode:c.mirror?'mirror':'same',scope:$('side-live-scope').value,colors:!$('side-live-colors-independent').checked,base:!$('side-live-base-independent').checked};
    draft=setLiveSymmetry(state,settings);const s=draft.stats;
    $('side-copy-summary').textContent=`Origem: ${s.sourceCount} ${s.sourceCount===1?'elemento':'elementos'}. Destino: ${s.targetCount} ${s.targetCount===1?'elemento':'elementos'}. Ao ligar ou atualizar, o desenho da origem substitui os elementos sincronizados do destino. Depois, alterações em qualquer lado atualizam o outro em tempo real. `+(settings.colors?'As cores dos detalhes também serão sincronizadas. ':'As cores dos detalhes continuam independentes. Elementos novos começam com a cor da origem. ')+(settings.base?'Os fundos também serão sincronizados.':'Os fundos continuam independentes.');
   }
   preview($('side-copy-target-canvas'),draft.state.panels.find(p=>p.id===draft.targetId));$('side-copy-apply').disabled=false;
  }catch(error){preview($('side-copy-target-canvas'),target);$('side-copy-summary').textContent=error.message;}
 }
 function populateLayers(){const source=getState().panels.find(p=>p.id===$('side-copy-source').value);$('side-copy-layers').replaceChildren();for(const l of source.layers){const label=document.createElement('label'),input=document.createElement('input'),name=document.createElement('span');input.type='checkbox';input.checked=true;input.value=l.id;name.textContent=l.name;label.append(input,name);input.onchange=refresh;$('side-copy-layers').append(label);}$('side-copy-empty').hidden=source.layers.length>0;refresh();}
 function pairFields(preferred){const state=getState(),pair=sidePairs(state).find(p=>p.id===$('side-copy-pair').value),live=state.symmetry?.[pair.id];$('side-copy-source').replaceChildren(...pair.panels.map(id=>option(id,state.panels.find(p=>p.id===id).label)));if(pair.panels.includes(preferred))$('side-copy-source').value=preferred;
  $('side-copy-layout').value=live?.mode||'mirror';$('side-live-scope').value=live?.scope||'patterns';$('side-live-colors-independent').checked=!live?.colors;$('side-live-base-independent').checked=!live?.base;populateLayers();
 }
 $('open-side-copy').onclick=()=>{const state=getState(),pairs=sidePairs(state);if(!pairs.length)return toast('Escolha um modelo com painéis correspondentes.');revisionAtOpen=getRevision();$('side-copy-pair').replaceChildren(...pairs.map(p=>option(p.id,p.label)));$('side-copy-pair').value=(pairs.find(p=>p.panels.includes(state.active))||pairs[0]).id;mode=state.symmetry?.[$('side-copy-pair').value]?'live':'copy';$('side-copy-colors').value='target';$('side-copy-base').checked=false;$('side-copy-mode').value='merge';$('side-copy-advanced').open=false;pairFields(state.active);dialog.showModal();};
 $('side-copy-pair').onchange=()=>pairFields();$('side-copy-source').onchange=populateLayers;
 $('side-copy-tab-once').onclick=()=>{mode='copy';refresh();};$('side-copy-tab-live').onclick=()=>{mode='live';refresh();};
 for(const id of ['side-copy-layout','side-copy-colors','side-copy-base','side-copy-mode','side-live-scope','side-live-colors-independent','side-live-base-independent'])$(id).onchange=refresh;
 $('side-copy-custom-color').onclick=()=>openPalette(c=>{customColor=c.id;refresh();});
 for(const id of ['side-copy-cancel','side-copy-close'])$(id).onclick=()=>dialog.close();
 function stillCurrent(){if(getRevision()===revisionAtOpen)return true;toast('O desenho mudou. Abra a opção novamente para conferir.');dialog.close();return false;}
 $('side-copy-apply').onclick=()=>{if(!draft||!stillCurrent())return;onApply(draft.state);dialog.close();toast(mode==='live'?'Simetria em tempo real ligada. Edite qualquer lado deste par.':'Cópia aplicada. Os lados continuam independentes.');};
 $('side-live-disable').onclick=()=>{if(!stillCurrent())return;onApply(disableLiveSymmetry(getState(),$('side-copy-pair').value));dialog.close();toast('Atualização simétrica desligada. O desenho e as cores dos dois lados foram preservados.');};
}
