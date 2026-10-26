import {CATALOG_LIST_FIELDS} from './catalog-list.js';
import {FITS,productCodeFor} from './product-catalog.js';

// The optional panel keeps the usual seven fields readable while exposing
// independent kit quantities and factory references when they are needed.
export function setupCatalogListForm(form){
 const panel=document.createElement('details');panel.id='manualCatalogAdvanced';panel.className='catalog-list-advanced';
 panel.innerHTML='<summary>Quantidades por peça, modelagem e tamanhos especiais</summary><p class="helper">Cada peça tem quantidade e modelagem próprias. Quantidade por peça vazia usa a quantidade comum; 0 retira somente essa peça. O número comum só é aplicado às peças numeradas.</p>';
 const hint=document.createElement('p');hint.className='helper';hint.hidden=true;hint.textContent='Item de lista antiga: os dados serão mantidos nas regras anteriores. Para revisar pelas fichas atuais, clique abaixo.';
 const convert=document.createElement('button');convert.type='button';convert.className='outline-button';convert.textContent='Revisar este item pelas fichas atuais';convert.hidden=true;
 let enabled=true,activeProduct='Camiseta';
 for(const suffix of ['Camiseta','Calcao']){
  const fieldset=document.createElement('fieldset');fieldset.dataset.listPiece=suffix;const legend=document.createElement('legend');legend.textContent=suffix==='Camiseta'?'Camiseta · CAM-001':'Calção · CAL-001';fieldset.append(legend);const grid=document.createElement('div');grid.className='catalog-list-grid';fieldset.append(grid);
  const fields=CATALOG_LIST_FIELDS.filter(([key])=>key.endsWith(suffix));
  for(const [key,title]of fields){const label=document.createElement('label');label.textContent=title;let input;
   if(key.startsWith('modelagem')||key.startsWith('especialReferencia')){input=document.createElement('select');const values=key.startsWith('modelagem')?[['','Pelo tamanho (BL / TAM / masculina)'],...FITS.map(f=>[f.id,f[suffix==='Camiseta'?'shirt':'shorts']])]:[['','Sem tamanho especial'],['MEDIDAS FORNECIDAS','Medidas fornecidas'],['PEÇA FÍSICA DE AMOSTRA','Peça física de amostra']];for(const [value,title]of values){const opt=document.createElement('option');opt.value=value;opt.textContent=title;input.append(opt);}}
   else{input=document.createElement('input');if(key.startsWith('quantidade')){input.type='number';input.min='0';input.max='99999';input.step='1';input.placeholder='Vazio = quantidade comum';}else if(key.startsWith('semNumero')){input.type='checkbox';label.className='catalog-list-check';}else{input.maxLength=key.includes('Descricao')?'1000':'200';input.placeholder=key==='nomeCalcao'?'Vazio = calção sem nome':'';}}
   input.dataset.catalogListField=key;input.id='manual-'+key;label.append(input);grid.append(label);
  }panel.append(fieldset);
 }
 form.append(hint,convert,panel);const submit=form.querySelector('#addManualBtn');if(submit){const actions=document.createElement('div');actions.className='manual-actions';actions.append(submit);form.append(actions);}
 const fields=()=>[...panel.querySelectorAll('[data-catalog-list-field]')];
 const setMode=value=>{enabled=value;hint.hidden=value;convert.hidden=value;panel.hidden=!value;};
 convert.addEventListener('click',()=>{setMode(true);panel.open=true;form.dispatchEvent(new Event('input',{bubbles:true}));});
 return {
  read(){return enabled?{catalogVersion:3,...Object.fromEntries(fields().filter(e=>activeProduct==='Kit'||e.dataset.catalogListField.endsWith(productCodeFor(activeProduct)==='CAL-001'?'Calcao':'Camiseta')).map(e=>[e.dataset.catalogListField,e.type==='checkbox'?e.checked:e.value]))}:{};},
  restore(row){setMode(row.catalogVersion===3);for(const e of fields()){const value=row[e.dataset.catalogListField];if(e.type==='checkbox')e.checked=Boolean(value);else e.value=value??'';}panel.open=row.catalogVersion===3&&CATALOG_LIST_FIELDS.some(([key])=>row[key]!==undefined&&row[key]!==''&&row[key]!==false);},
  reset(){setMode(true);for(const e of fields()){if(e.type==='checkbox')e.checked=false;else e.value='';}panel.open=false;},
  sync(product){activeProduct=product;const kit=product==='Kit',code=productCodeFor(product);for(const section of panel.querySelectorAll('fieldset')){const active=kit||(section.dataset.listPiece==='Camiseta'?code==='CAM-001':code==='CAL-001');section.hidden=!active;section.disabled=!active;}},
 };
}
