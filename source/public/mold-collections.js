// Classification is based on stable metadata/IDs, never the administrator's display name.
export function moldCollection(mold={}) {
  if(mold.line==='jogo'||mold.line==='passeio')return mold.line;
  return /^(polo|bermuda-passeio|kit-passeio-prime|passeio-)/.test(mold.id||'')?'passeio':'jogo';
}
export const collectionMolds=(templates,line)=>templates.filter(t=>moldCollection(t)===line);

export function moldBottomLabel(mold={}){
  if(mold.category!=='conjunto'||moldCollection(mold)!=='jogo')return '';
  if(mold.bottomVariant==='5-partes')return 'calção 5 partes';
  return mold.bottomVariant==='com-recorte'?'calção com recorte':'calção sem recorte';
}
export function moldOptionName(mold){
  const label=moldBottomLabel(mold),name=String(mold.name||'');
  return label&&!name.toLocaleLowerCase('pt-BR').includes(label)?name+' · '+label:name;
}
