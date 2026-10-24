export const el=(tag,className='',text)=>{const node=document.createElement(tag);node.className=className;if(text!==undefined)node.textContent=String(text);return node;};
export const option=(value,label)=>{const node=el('option','',label);node.value=value;return node;};
export const button=(label,action,className='outline-button')=>{const node=el('button',className,label);node.type='button';node.addEventListener('click',action);return node;};
export async function api(path,options){const response=await fetch(path,{...options,cache:'no-store'}),data=await response.json();if(!response.ok)throw new Error(data.error||'Não foi possível concluir.');return data;}
export const mutate=input=>api('/api/workspace',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(input)});
export const date=value=>new Date(value).toLocaleString('pt-BR',{dateStyle:'short',timeStyle:'short'});
export function renderComments(host,proposal,{owner=false,versionId,onJump,onStatus}={}){
  host.replaceChildren();const comments=proposal.comments.filter(c=>!versionId||c.versionId===versionId);
  if(!comments.length)host.append(el('p','empty-copy','Nenhuma observação nesta versão.'));
  comments.forEach((comment,index)=>{const card=el('article',`comment-card ${comment.status==='changed'?'changed':''}`),version=proposal.versions.find(v=>v.id===comment.versionId);
    const top=el('div','comment-top');top.append(el('span','status-tag',comment.status==='changed'?'ALTERADO':'PENDENTE'),el('span','',`V${version?.version??'?'} · ${comment.anchor.panel||'Peça'}`));card.append(top,el('p','comment-body',comment.body),el('small','',`${comment.authorName} · ${date(comment.createdAt)}`));
    if(comment.changedAt)card.append(el('small','','Marcado como alterado em '+date(comment.changedAt)));
    const actions=el('div','card-actions');if(onJump)actions.append(button('Ver ponto na peça ↗',()=>onJump(comment),'text-link'));
    if(owner&&onStatus)actions.append(button(comment.status==='changed'?'Reabrir pedido':'Marcar ALTERADO',()=>onStatus(comment),'outline-button'));
    card.append(actions);host.append(card);
  });
}
export function showError(host,error){host.textContent=error?.message||String(error);host.hidden=false;}
