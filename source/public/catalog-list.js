import {FITS,productCodeFor,fitOfSize,canonicalSize,isSpecialSize} from './product-catalog.js';
export const CATALOG_LIST_FIELDS=Object.freeze([
 ['quantidadeCamiseta','Qtd. Camiseta'],['quantidadeCalcao','Qtd. Calção'],['modelagemCamiseta','Modelagem Camiseta'],['modelagemCalcao','Modelagem Calção'],['nomeCalcao','Nome Calção'],['semNumeroCamiseta','Sem Número Camiseta'],['semNumeroCalcao','Sem Número Calção'],['especialReferenciaCamiseta','Referência Especial Camiseta'],['especialDescricaoCamiseta','Instruções Especial Camiseta'],['especialReferenciaCalcao','Referência Especial Calção'],['especialDescricaoCalcao','Instruções Especial Calção'],
]);
const own=(o,k)=>Object.hasOwn(o,k),norm=v=>String(v??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase().trim();
export function normalizeCatalogList(input={},defaults={}){
 if(input.catalogVersion!==undefined&&input.catalogVersion!==3)throw Error('Versão de catálogo da lista não reconhecida.');
 const out={};if(input.id)out.id=String(input.id);if(input.catalogVersion!==3&&defaults.catalogVersion!==3&&!CATALOG_LIST_FIELDS.some(([key])=>own(input,key)))return out;
 out.catalogVersion=3;
 for(const [key]of CATALOG_LIST_FIELDS){if(!own(input,key))continue;const raw=input[key],text=String(raw??'').trim();
  if(key.startsWith('quantidade')){if(text!=='')out[key]=/^\d+$/.test(text)?Number(text):null;}
  else if(key.startsWith('semNumero'))out[key]=typeof raw==='boolean'?raw:['SIM','S','TRUE','1'].includes(norm(raw))?true:['','NAO','N','FALSE','0'].includes(norm(raw))?false:text;
  else if(key.startsWith('modelagem'))out[key]=['FEMININA','FEMININO','BABY LOOK','BABY LOOK (FEMININA)'].includes(norm(raw))?'FEMININA':norm(raw).startsWith('INFANTIL')?'INFANTIL':['MASCULINO','MASCULINA'].includes(norm(raw))?'MASCULINA':text;
  else out[key]=text;
 }return out;
}
export function catalogListProblems(row){
 if(row.catalogVersion!==3)return [];const errors=[],kit=row.produto==='Kit';if(!kit&&!productCodeFor(row.produto))errors.push('Produto sem ficha técnica cadastrada nesta versão da lista.');
 for(const suffix of ['Camiseta','Calcao']){const q=row['quantidade'+suffix];if(q!==undefined&&(!Number.isSafeInteger(q)||q<0||q>99999))errors.push('Quantidade por peça: use 0 a 99999 ou deixe vazia para usar a quantidade comum.');const fit=row['modelagem'+suffix];if(fit&&!FITS.some(f=>f.id===fit))errors.push('Modelagem por peça: escolha Masculina, Feminina ou Infantil.');if(row['semNumero'+suffix]!==undefined&&typeof row['semNumero'+suffix]!=='boolean')errors.push('Sem número: use SIM, NÃO ou deixe vazio.');
  if(!kit&&((suffix==='Calcao')!==(productCodeFor(row.produto)==='CAL-001')))continue;
  const size=row[suffix==='Camiseta'?'tamanhoCamiseta':'tamanhoCalcao'];if(!size||q===0)continue;
  const resolved=fit||fitOfSize(size)||'MASCULINA';if(!isSpecialSize(size)&&!FITS.find(f=>f.id===resolved)?.sizes.includes(canonicalSize(size)))errors.push('Tamanho '+size+' fora da grade autorizada para '+resolved+'.');
  if(isSpecialSize(size)){const ref=row['especialReferencia'+suffix];if(!['MEDIDAS FORNECIDAS','PEÇA FÍSICA DE AMOSTRA'].includes(ref)||!row['especialDescricao'+suffix]?.trim())errors.push('Tamanho especial: informe a referência e as instruções da '+(suffix==='Camiseta'?'camiseta':'peça inferior')+'.');}
 }const active=kit?['Camiseta','Calcao']:[productCodeFor(row.produto)==='CAL-001'?'Calcao':'Camiseta'];if(!active.some(s=>(row['quantidade'+s]??row.quantidade)>0))errors.push('Informe quantidade positiva para pelo menos uma peça.');return [...new Set(errors)];
}
export function catalogPieceData(row,slot,product,size){
 if(row.catalogVersion!==3)return {product,size};const suffix=slot===1||productCodeFor(product)==='CAL-001'?'Calcao':'Camiseta',fit=row['modelagem'+suffix]||fitOfSize(size)||'MASCULINA';
 return {product,size,fit,quantity:row['quantidade'+suffix]??row.quantidade,name:row.produto==='Kit'&&suffix==='Calcao'?(row.nomeCalcao||''):row.nome,number:row['semNumero'+suffix]?'':row.numero,additional:row.adicional||'',specialReference:row['especialReferencia'+suffix]||'',specialDescription:row['especialDescricao'+suffix]||''};
}
export function preserveCatalogList(input){const out=normalizeCatalogList(input);for(const [key]of CATALOG_LIST_FIELDS){const v=out[key];if(typeof v==='string'&&v.length>(key.includes('Descricao')?1000:200))throw Error('Campo de lista muito longo: '+key);}if(out.id?.length>100)throw Error('Identificação de atleta inválida.');return out;}
