// The account screens and the static tools use the same menu and icon paths.
export const APPROVED_ORDER_STAGES = ['checked', 'sent', 'accepted'];
export const ORDER_FILTERS = ['all', 'approved', 'draft', 'checked', 'sent', 'accepted', 'returned'];
export const normalizeOrderFilter = value => ORDER_FILTERS.includes(value) ? value : 'all';
export const orderMatchesFilter = (stage, filter) => filter === 'all' || (filter === 'approved' ? APPROVED_ORDER_STAGES.includes(stage) : stage === filter);

export const NAV_GROUPS = [
  {id:'creation', label:'Criação', items:[
    {id:'simulator', label:'Simulador de uniformes', href:'/simulador', icon:'M8 3 2 8l4 4 2-2v11h8V10l2 2 4-4-6-5c-1 4-7 4-8 0ZM12 10v7M9 14h6'},
    {id:'create-presentation', label:'Criar apresentação', href:'/projects?create=1', icon:'M3 3h18M4 3v12h16V3M12 15v6M8 21l4-4 4 4M8 7h8M8 11h4'},
    {id:'projects', label:'Meus projetos', href:'/projects', icon:'M3 8V5a2 2 0 0 1 2-2h5l2 3h7a2 2 0 0 1 2 2v1M3 8h18l-2 12H5L3 8Z'},
  ]},
  {id:'orders', label:'Pedidos', items:[
    {id:'create-order', label:'Criar pedido', href:'/pedidos?new=1', icon:'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8L14 2ZM14 2v6h6M12 12v6M9 15h6'},
    {id:'orders', label:'Meus pedidos', href:'/acompanhamento', icon:'M9 4H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2h-3M9 2h6v5H9V2ZM8 12h1M12 12h4M8 17h1M12 17h4'},
    {id:'approved-orders', label:'Pedidos aprovados', href:'/acompanhamento?status=approved', icon:'M12 3l8 3v6c0 5-8 9-8 9s-8-4-8-9V6l8-3ZM8 12l3 3 5-6'},
  ]},
  {id:'tools', label:'Ferramentas', items:[
    {id:'lists', label:'Criador de planilha', href:'/organizador', icon:'M4 3h16a1 1 0 0 1 1 1v16a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1ZM3 9h18M9 9v12M15 9v12M3 15h18'},
    {id:'atlas-vector', label:'ATLAS VECTOR (BETA)', href:'/ferramentas/atlas-vector', icon:'M4 4h5v5H4V4ZM15 15h5v5h-5v-5ZM7 9c0 7 10-2 10 6M9 6h8v9'},
  ]},
];
export const NAV_MORE = [
  {id:'proposals', label:'Propostas e retornos', href:'/propostas', icon:'M5 16V5h11M5 5l14 14M13 19h6v-6'},
  {id:'contacts', label:'Desenhistas e contatos', href:'/perfil?tab=designers', icon:'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8ZM22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75'},
  {id:'molds', label:'Moldes e mapas', href:'/admin/molds', admin:true, icon:'m12 3 10 5-10 5L2 8l10-5ZM2 12l10 5 10-5M2 16l10 5 10-5'},
];
const escape = value => String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function navigationHTML(active, {admin=false}={}) {
  const item = entry => `<a class="studio-nav-link" data-nav-id="${entry.id}"${entry.id==='proposals'?' id="proposalNav"':''} href="${escape(entry.href)}" target="_top"${entry.id===active?' aria-current="page"':''}><svg class="studio-nav-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="${entry.icon}"/></svg><span class="studio-nav-label">${escape(entry.label)}</span></a>`;
  return `<div class="studio-navigation-shell" data-studio-nav data-open="false"><button class="studio-nav-toggle" type="button" aria-expanded="false" aria-controls="studioNavigation"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6h16M4 12h16M4 18h16"/></svg>Menu do estúdio</button><nav class="studio-navigation" id="studioNavigation" aria-label="Menu do estúdio"><div class="studio-nav-groups">${NAV_GROUPS.map(group=>`<section class="studio-nav-group" aria-labelledby="nav-${group.id}"><h2 id="nav-${group.id}">${escape(group.label)}</h2><div class="studio-nav-items">${group.items.map(item).join('')}</div></section>`).join('')}</div><details class="studio-nav-more"${NAV_MORE.some(entry=>entry.id===active)?' open':''}><summary>Outras opções</summary><div>${NAV_MORE.filter(entry=>!entry.admin||admin).map(item).join('')}</div></details></nav></div>`;
}
