import {moldFor,ribbonOptions} from './product-catalog.js?v=7';
import {pieceFamilyKey} from './order-linked-applications.js?v=3';
import {newAnnotation} from './order-annotations.js?v=2';
export function requiredFinishes(product){
 const t=product.technical;if(!t)return [];const result=[];
 const add=(id,label,values)=>result.push({id,label,signature:JSON.stringify([id,...values])});
 if(t.productCode==='CAM-001'){
  if(t.collarModel){const ribbon=ribbonOptions(t).find(r=>r.id===t.ribanaId)?.displayColorName;add('collar','GOLA '+[t.collarModel,t.collarFinish,ribbon].filter(Boolean).join(' · '),[t.collarModel,t.collarFinish,t.ribanaId,t.vConstruction,t.buttons]);}
  if(t.sleeveFinish&&t.sleeveFinish!=='BARRA COMUM')add('sleeve','MANGAS · '+t.sleeveFinish,[t.sleeveLength,t.sleeveFinish,t.filetMaterial,product.detailColor]);
  if(t.hasSideCut)add('side-cut','RECORTES LATERAIS COSTURADOS · '+t.sideCutFabric,[t.sideCutFabric,product.detailColor]);
  if(t.hemShape&&t.hemShape!=='RETA')add('hem-shape','BARRA '+t.hemShape,[t.hemShape]);
 }
 if(t.productCode==='CAL-001'){
  const mold=moldFor(t);
  if(t.hemFinish&&t.hemFinish!=='BARRA COMUM')add('hem','BARRA · '+t.hemFinish,[t.moldId,t.hemFinish,product.detailColor]);
  if(mold?.cut)add('side-cut','RECORTES COSTURADOS · '+t.sideCutFabric,[t.moldId,t.sideCutFabric,product.detailColor]);
  if(mold?.stein)add('bias','VIÉS NA BARRA E LATERAIS · '+(t.biasColorNote||'DRY'),[t.moldId,t.biasColorNote]);
  if(mold?.elite)add('side-opening','ABERTURA LATERAL EM V',[t.moldId]);
  if(t.drawstringColor)add('drawstring','CORDÃO · '+t.drawstringColor,[t.drawstringColor]);
  if(t.pocketRequest)add('pockets','BOLSOS · '+t.pocketRequest,[t.moldId,t.pocketRequest]);
 }
 return result;
}
export function finishNote(page,product,finish){
 const family=new Set(page.products.filter(p=>pieceFamilyKey(p)===pieceFamilyKey(product)).map(p=>p.id));
 return (page.annotations||[]).find(a=>family.has(a.productId)&&a.finishId===finish.id&&a.finishSignature===finish.signature&&a.type==='callout');
}
export function finishMarked(page,product,finish){const note=finishNote(page,product,finish);return Boolean(note?.finishConfirmed&&note.text?.trim()&&Number.isFinite(note.x2)&&Number.isFinite(note.y2)&&(note.x!==note.x2||note.y!==note.y2));}
export function finishProblems(order){return (order.pages||[]).flatMap((page,i)=>page.products.flatMap(p=>requiredFinishes(p).filter(f=>!finishMarked(page,p,f)).map(f=>'Página '+(i+1)+' · '+p.type+': marque e confirme '+f.label+' em Aplicações e setas.')));}
export function beginFinish(page,product,id){
 const finish=requiredFinishes(product).find(f=>f.id===id);if(!finish)throw Error('Este acabamento foi alterado. Escolha novamente.');
 let note=finishNote(page,product,finish);if(!note){if((page.annotations||[]).length>=80)throw Error('Use até 80 apontamentos por página.');note={...newAnnotation('callout',product.id),finishId:id,finishSignature:finish.signature,finishConfirmed:false,text:finish.label.slice(0,400),color:'#235394'};(page.annotations||=[]).push(note);}return note;
}
export function confirmFinish(page,product,id){const finish=requiredFinishes(product).find(f=>f.id===id),note=finish&&finishNote(page,product,finish);if(!note||note.type!=='callout'||!note.text.trim()||(note.x===note.x2&&note.y===note.y2))throw Error('Posicione a seta do acabamento antes de confirmar.');note.finishConfirmed=true;return note;}
export function syncFinishNotes(page){if(!page.annotations?.some(a=>a.finishId))return;page.annotations=(page.annotations||[]).filter(a=>!a.finishId||page.products.some(p=>pieceFamilyKey(p)===pieceFamilyKey(page.products.find(p=>p.id===a.productId)||{})&&requiredFinishes(p).some(f=>f.id===a.finishId&&f.signature===a.finishSignature)));}
