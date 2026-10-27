import {newRecordId} from './record-id.js';
// Factory-approved production rules. Atlas is the software; MEINERZ below is
// the physical supplier/sponsor mark specified in the approved product sheets.
export const CATALOG_VERSION='2026-10-26.1';
export const PRODUCT_CATALOG=Object.freeze([
 {code:'CAM-001',type:'Camiseta',name:'CAMISETA SUBLIMADA / TRANSFER',fabrics:['DRY','ELASTIC','MANCHESTER','ABSTRAT','HIBISCO','JACQUARD_DIAMOND','JACQUARD_ELITE','SOLUTIO']},
 {code:'CAL-001',type:'Calção',name:'CALÇÃO DE JOGO',fabrics:['DRY_CALCAO','FLEX']},
]);
export const MATERIALS=Object.freeze(Object.fromEntries(['DRY','ELASTIC','MANCHESTER','ABSTRAT','HIBISCO','JACQUARD_DIAMOND','JACQUARD_ELITE','SOLUTIO','DRY_CALCAO','FLEX','FLUENCE','RIBANA_SUBLIMADA','RIBANA'].map(id=>[id,{id,label:id.replaceAll('_',' ').replace('CALCAO','CALÇÃO')}])));
export const FITS=Object.freeze([{id:'MASCULINA',shirt:'Masculina',shorts:'Masculino',sizes:['P','M','G','GG','EG','EXG','4G','5G','6G']},{id:'FEMININA',shirt:'Baby Look (feminina)',shorts:'Feminino',sizes:['PP','P','M','G','GG','EG','EXG']},{id:'INFANTIL',shirt:'Infantil (unissex)',shorts:'Infantil',sizes:['TAM 01','TAM 02','TAM 04','TAM 06','TAM 08','TAM 10','TAM 12','TAM 14','TAM 16']}]);
export const COLORS_FACTORY=Object.freeze({VERMELHO:'VERMELHO',MEXICO:'AZUL MARINHO',BRANCO:'BRANCO',COLIBRI:'AZUL ROYAL',TROPICAL:'VERDE','SOL 1048':'AMARELO',PRETO:'PRETO',LAGE:'CINZA',UVA:'VINHO','P-6931':'DOURADO','VERDE ESCURO':'VERDE ESCURO',COLONIAL:'AZUL CELESTE'});
const combinations=[['VERMELHO','MEXICO'],['MEXICO','BRANCO'],['VERMELHO','BRANCO'],['SOL 1048','PRETO'],['VERDE ESCURO','PRETO'],['BRANCO','PRETO'],['BRANCO','VERMELHO'],['BRANCO','COLIBRI'],['VERDE ESCURO','BRANCO'],['P-6931','PRETO'],['P-6931','BRANCO'],['PRETO','BRANCO'],['BRANCO','TROPICAL'],['BRANCO','MEXICO']];
const rib=(id,factoryColorRef)=>({id,factoryColorRef,displayColorName:factoryColorRef.map(c=>COLORS_FACTORY[c]).join(' + ')});
export const SHARED_RIBBONS=Object.freeze([...combinations.map((refs,i)=>rib('COMP-'+String(i+1).padStart(2,'0'),refs)),...['VERMELHO','MEXICO','BRANCO','COLIBRI','TROPICAL','SOL 1048','PRETO','LAGE','UVA','P-6931'].map((ref,i)=>rib('LISA-'+String(i+1).padStart(2,'0'),[ref]))]);
export const POLO_RIBBONS=Object.freeze(['COLONIAL','VERMELHO','MEXICO','BRANCO','COLIBRI','TROPICAL','SOL 1048','PRETO','LAGE','UVA'].map((ref,i)=>rib('POLO-'+String(i+1).padStart(2,'0'),[ref])));
export const COLLARS=Object.freeze(['REDONDA','V','POLO','BRASIL','REDONDA COM PEITILHO','PRIME','FIELD','PRESTIGE','EDGE']);
export const SHORT_MOLDS=Object.freeze([
 {id:'CAL-M01',fit:'MASCULINA',label:'CALÇÃO 2 (PADRÃO)',filet:true,description:'2 partes; barra convencional ou filete costurado'},
 {id:'CAL-M02',fit:'MASCULINA',label:'CALÇÃO 5 PARTES',filet:true,five:true,description:'5 partes; barra convencional ou filete costurado'},
 {id:'CAL-M03',fit:'MASCULINA',label:'CALÇÃO COM RECORTE',cut:true,description:'Recortes próprios; barra convencional; sem outros acabamentos opcionais'},
 {id:'CAL-F01',fit:'FEMININA',label:'MOLDE STEIN',stein:true,pockets:false,description:'4 partes; viés DRY na barra e laterais, de fora a fora'},
 {id:'CAL-F02',fit:'FEMININA',label:'MOLDE RETO',filet:true,description:'Barra convencional ou filete costurado'},
 {id:'CAL-F03',fit:'FEMININA',label:'MOLDE ELITE',elite:true,pockets:false,description:'4 partes curvadas; barra comum e abertura lateral em V fixa'},
 {id:'CAL-I01',fit:'INFANTIL',label:'2 PARTES (PADRÃO)',filet:true,description:'Barra convencional ou filete costurado'},
 {id:'CAL-I02',fit:'INFANTIL',label:'MOLDE STEIN',stein:true,pockets:'pending',description:'4 partes; viés DRY na barra e laterais, de fora a fora'},
 {id:'CAL-I03',fit:'INFANTIL',label:'CALÇÃO 5 PARTES',filet:true,five:true,description:'5 partes; barra convencional ou filete costurado'},
]);
export const DRAWSTRINGS=Object.freeze(['PRETO','BRANCO','AZUL MARINHO','VERMELHO']);
export const FIVE_PARTS_WARNING='Evite artes que dependam do encaixe perfeito de grafismos, linhas ou outros elementos nas laterais e costuras; podem ocorrer desalinhamentos na confecção.';
export const CATALOG_PENDING=Object.freeze(['Bolsos: compatibilidade do Stein Infantil e homologação dos demais moldes; quantidade, construção e posição ainda não definidas.','Polo: moldes compatíveis com abertura em V nas duas laterais inferiores ainda não definidos.','Redonda/V: catálogo específico de cores/material da ribana não fornecido.','Redonda com peitilho: quantidade de botões deve ser informada, sem padrão presumido; limite de 2.','TPU infantil: exige justificativa da exceção; papel de aprovador não definido.','Preços de aplicações e distância exata da etiqueta à barra não fornecidos.']);
const uid=newRecordId,copy=x=>structuredClone(x),norm=x=>String(x||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase().trim();
export const productDefinition=code=>PRODUCT_CATALOG.find(p=>p.code===code);
export const productCodeFor=type=>['CAMISETA','CAMISETA SUBLIMADA / TRANSFER'].includes(norm(type))?'CAM-001':['CALCAO','CALCAO DE JOGO'].includes(norm(type))?'CAL-001':null;
export const moldFor=technical=>SHORT_MOLDS.find(m=>m.id===technical?.moldId);
export const ribbonOptions=t=>t?.collarModel==='POLO'?POLO_RIBBONS:SHARED_RIBBONS;
export const needsRibbon=t=>t.collarModel==='EDGE'||['PRIME','FIELD','PRESTIGE','POLO'].includes(t.collarModel)&&t.collarFinish==='PRONTA';
export function collarFinishes(model){return ({REDONDA:['RIBANA','GALÃO'],V:['RIBANA'],POLO:['PRONTA','SUBLIMADA COM ENTRETELA'],BRASIL:['DRY SUBLIMADO'],'REDONDA COM PEITILHO':['RIBANA'],PRIME:['SUBLIMADA','PRONTA'],FIELD:['SUBLIMADA','PRONTA'],PRESTIGE:['SUBLIMADA','PRONTA'],EDGE:['PRONTA']})[model]||[];}
export function newTechnical(code,designId=''){
 if(!productDefinition(code))throw Error('Produto sem ficha técnica cadastrada.');
 return {version:CATALOG_VERSION,productCode:code,designId,fit:'',fabricId:code==='CAL-001'?'DRY_CALCAO':'',moldId:'',collarModel:'',collarFinish:'',ribanaId:'',vConstruction:'',buttons:null,poloSideV:false,sleeveLength:'CURTA',sleeveFinish:'BARRA COMUM',filetMaterial:'',filetException:'',hasSideCut:false,sideCutFabric:'MESMO TECIDO DA PEÇA',hemShape:'RETA',hemFinish:'BARRA COMUM',drawstringColor:'',biasColorNote:'',pocketRequest:'',specialReference:'',specialDescription:'',applications:[],legacyReviewed:true};
}
export function attachCatalog(product,{designId='',fit='',legacy=false}={}){
 const code=productCodeFor(product.type);if(!code)return product;
 if(product.technical)return product;
 if(legacy)product.legacyTechnical={type:product.type,model:product.model||'',fabric:product.fabric||'',print:product.print||'',extraApplications:copy(product.extraApplications||[])};
 const t=newTechnical(code,designId);t.fit=fit;const fabric=productDefinition(code).fabrics.find(id=>norm(MATERIALS[id].label)===norm(product.fabric));if(fabric)t.fabricId=fabric;t.legacyReviewed=!legacy;
 product.technical=t;product.fabric=MATERIALS[t.fabricId]?.label||'';product.print='TRANSFER';product.extraApplications=[];return product;
}
export function catalogOrder(order){order.technicalCatalogVersion=CATALOG_VERSION;order.shirtSleeveCut??='';for(const page of order.pages)for(const product of page.products){attachCatalog(product,{designId:page.id});if(page.mode==='conjunto'&&page.products.length===2)product.kitGroupId=page.id;}return order;}
export const usesCatalogList=order=>Boolean(order.technicalCatalogVersion)&&order.pages.every(pg=>pg.products.every(p=>Boolean(productCodeFor(p.type))));
export function fitOfSize(size){const s=norm(size).replace(/\s+/g,'');return /^BL|^BABY/.test(s)?'FEMININA':/^TAM|^\d+$/.test(s)?'INFANTIL':null;}
export function canonicalSize(size){let s=norm(size).replace(/^BABY\s*LOOK\s*|^BL\s*/,'');if(/^(TAM\s*)?\d+$/.test(s))return 'TAM '+s.replace(/\D/g,'').padStart(2,'0');return s.replace(/\s+/g,'');}
export const isSpecialSize=size=>/^(?:TAMANHO\s*)?(?:ESPECIAL|ESP\s*[1-9]\d*)$/.test(norm(size));
export const fitLabel=(code,fit)=>FITS.find(f=>f.id===fit)?.[code==='CAL-001'?'shorts':'shirt']||'Modelagem pendente';
export function sleeveFinishes(t){return t.sleeveLength==='LONGA'?['BARRA COMUM','PUNHO']:['BARRA COMUM','FILETE COSTURADO'];}
export function filetMaterials(t){return t.fabricId==='ELASTIC'?['DRY','RIBANA (EXCEÇÃO)']:['DRY','MESMO TECIDO DA CAMISETA'];}
export function technicalFieldChange(product,field,value){
 const t=product.technical;if(!t)throw Error('Aplique uma ficha técnica antes de editar.');const before=copy(t),notices=[];t[field]=value;
 const clear=(key,why)=>{if(t[key]!==''&&t[key]!==null){t[key]=key==='buttons'?null:'';notices.push(why);}};
 if(field==='fit'&&t.moldId&&moldFor(t)?.fit!==t.fit)clear('moldId','Escolha um molde compatível com a nova modelagem.');
 if(field==='fit'&&t.collarModel==='POLO'&&t.fit!=='MASCULINA'&&t.buttons===3)clear('buttons','Polo Baby Look/Infantil aceita no máximo 2 botões.');
 if(field==='collarModel'){t.collarFinish=collarFinishes(t.collarModel).length===1?collarFinishes(t.collarModel)[0]:'';clear('ribanaId','Selecione a ribana da nova gola.');clear('buttons','Informe a quantidade de botões da nova gola.');t.vConstruction='';t.poloSideV=false;}
 if(field==='collarFinish'&&!needsRibbon(t))clear('ribanaId','A seleção de ribana pronta foi removida.');
 if(!needsRibbon(t)&&t.ribanaId)clear('ribanaId','Esta gola não utiliza o catálogo de ribana pronta.');
 if(needsRibbon(t)&&t.ribanaId&&!ribbonOptions(t).some(r=>r.id===t.ribanaId))clear('ribanaId','Selecione uma ribana do catálogo correto.');
 if(!sleeveFinishes(t).includes(t.sleeveFinish)){t.sleeveFinish='BARRA COMUM';notices.push('O acabamento anterior foi removido para o novo comprimento de manga.');}
 if(t.sleeveFinish!=='FILETE COSTURADO'){t.filetMaterial='';t.filetException='';}else if(t.fabricId==='ELASTIC'&&!filetMaterials(t).includes(t.filetMaterial)){t.filetMaterial='DRY';notices.push('No ELASTIC, o filete comum é DRY.');}
 if(field==='sleeveFinish'&&value==='FILETE COSTURADO'&&!t.filetMaterial)t.filetMaterial='DRY';
 if(t.productCode==='CAM-001'&&!t.hasSideCut){t.sideCutFabric='MESMO TECIDO DA PEÇA';if(t.hemShape!=='RETA')notices.push('Sem recorte lateral, a barra passa a ser reta.');t.hemShape='RETA';}
 const mold=moldFor(t);if(t.productCode==='CAL-001'&&!mold?.filet&&t.hemFinish!=='BARRA COMUM'){t.hemFinish='BARRA COMUM';notices.push('Este molde não aceita filete opcional.');}if(t.productCode==='CAL-001'&&!mold?.cut)t.sideCutFabric='MESMO TECIDO DA PEÇA';
 if(t.productCode==='CAL-001'&&field==='moldId'){t.biasColorNote='';if(mold?.pockets===false&&t.pocketRequest){t.pocketRequest='';notices.push('Solicitação de bolsos removida: o novo molde não permite bolsos.');}}
 product.fabric=MATERIALS[t.fabricId]?.label||'';return {before,notices};
}
export function cloneFitVariant(product,fit){
 const clone=copy(product);clone.id=newRecordId();Object.assign(clone,{quantity:0,grade:'',names:[],namesRaw:'',listKey:'',listMissing:false,extraApplications:[]});clone.technical.specialReference=clone.technical.specialDescription='';clone.technical.applications=[];technicalFieldChange(clone,'fit',fit);return clone;
}
export function cleanTechnical(input){
 if(!input||input.version!==CATALOG_VERSION||!productDefinition(input.productCode))throw Error('Versão ou produto da ficha técnica inválido.');
 const out=newTechnical(input.productCode);for(const field of Object.keys(out)){
  if(field==='applications')continue;const value=input[field]??out[field];
  if(['buttons'].includes(field)){if(value!==null&&(!Number.isSafeInteger(value)||value<0||value>3))throw Error('Confira a quantidade de botões.');}
  else if(typeof out[field]==='boolean'){if(typeof value!=='boolean')throw Error('Confira as opções da ficha técnica.');}
  else if(typeof value!=='string'||value.length>(['filetException','pocketRequest','specialDescription'].includes(field)?1000:200))throw Error('Campo inválido ou muito longo na ficha técnica.');out[field]=value;
 }
 if(!Array.isArray(input.applications)||input.applications.length>1000)throw Error('A ficha excede o limite de registros de aplicação.');
 out.applications=input.applications.map(a=>{if(!a||!['ESCUDO','MARCA MEINERZ','ETIQUETA OFICIAL'].includes(a.role)||!['TPU ALTO RELEVO','APLIQUE BORDADO','TERMOCOLANTE'].includes(a.type)||!Number.isSafeInteger(a.perUnit)||a.perUnit<1)throw Error('Confira tipo e quantidade das aplicações físicas.');const b={role:a.role,type:a.type,perUnit:a.perUnit};for(const field of ['id','position','exception']){if(typeof a[field]!=='string'||a[field].length>(field==='id'?80:1000))throw Error('Confira a identificação, posição e justificativa da aplicação.');b[field]=a[field];}return b;});if(new Set(out.applications.map(a=>a.id)).size!==out.applications.length)throw Error('Aplicações físicas com identificadores repetidos.');return out;
}
export function technicalProblems(product,order={},release=false){
 const t=product.technical;if(!t)return [];const errors=[],def=productDefinition(t.productCode),need=(value,message)=>{if(release&&!value)errors.push(message);},one=(value,allowed,message)=>{if(value&&!allowed.includes(value))errors.push(message);};
 if(t.version!==CATALOG_VERSION||!def)return ['Ficha técnica com produto ou versão inválida.'];
 if(productCodeFor(product.type)!==t.productCode)errors.push('A ficha técnica não corresponde à peça.');
 one(t.fit,FITS.map(f=>f.id),'Modelagem não autorizada.');need(t.fit,'Escolha a modelagem.');one(t.fabricId,def.fabrics,'Tecido principal não autorizado para este produto.');need(t.fabricId,'Escolha o tecido principal.');if((MATERIALS[t.fabricId]?.label||'')!==(product.fabric||''))errors.push('Tecido exibido e código do material não correspondem.');
 need(t.designId,'Identifique o desenho da peça.');if(release&&!t.legacyReviewed)errors.push('Confira a conversão dos dados técnicos antigos.');
 one(t.sideCutFabric,['MESMO TECIDO DA PEÇA','FLUENCE'],'Tecido de recorte não autorizado.');if(t.hasSideCut||moldFor(t)?.cut)need(t.sideCutFabric,'Escolha o tecido do recorte.');
 if(t.productCode==='CAM-001'){
  if(t.moldId||t.drawstringColor||t.biasColorNote||t.pocketRequest||t.hemFinish!=='BARRA COMUM')errors.push('A camiseta contém opções de calção incompatíveis.');
  one(order.shirtSleeveCut,['TRADICIONAL','RAGLAN'],'Corte de manga deve ser tradicional ou raglan no pedido.');need(order.shirtSleeveCut,'Escolha o corte de manga do pedido: tradicional ou raglan.');
  one(t.collarModel,COLLARS,'Gola não cadastrada.');need(t.collarModel,'Escolha a gola.');one(t.collarFinish,collarFinishes(t.collarModel),'Acabamento incompatível com a gola.');need(t.collarFinish,'Escolha o acabamento da gola.');
  if(needsRibbon(t)){need(t.ribanaId,'Escolha a ribana pronta.');if(t.ribanaId&&!ribbonOptions(t).some(r=>r.id===t.ribanaId))errors.push('A ribana deve pertencer ao catálogo desta gola.');}else if(t.ribanaId)errors.push('Esta gola não utiliza seleção de ribana pronta.');
  if(t.collarModel==='V'){one(t.vConstruction,['TRADICIONAL','TRASPASSADA'],'Construção da gola V inválida.');need(t.vConstruction,'Escolha V tradicional ou traspassada.');}else if(t.vConstruction)errors.push('Construção V está preenchida para outra gola.');
  if(t.collarModel==='POLO'){need(t.buttons,'Informe 1, 2 ou 3 botões na Polo.');if(t.buttons!==null&&(![1,2,3].includes(t.buttons)||t.fit!=='MASCULINA'&&t.buttons>2))errors.push('Polo: 1 a 3 botões na masculina; no máximo 2 na Baby Look/Infantil.');}
  else if(t.collarModel==='REDONDA COM PEITILHO'){if(release&&t.buttons===null)errors.push('Informe a quantidade de botões do peitilho, até 2.');if(t.buttons!==null&&(t.buttons<0||t.buttons>2))errors.push('Redonda com peitilho aceita no máximo 2 botões.');}else if(t.buttons!==null)errors.push('Botões não são opção para esta gola.');
  if(t.poloSideV)errors.push('Abertura em V nas duas laterais da Polo: compatibilidade dos moldes pendente de confirmação.');
  one(t.sleeveLength,['CURTA','LONGA'],'Comprimento de manga inválido.');need(t.sleeveLength,'Escolha o comprimento da manga.');one(t.sleeveFinish,sleeveFinishes(t),'Acabamento incompatível com o comprimento de manga.');need(t.sleeveFinish,'Escolha o acabamento da manga.');
  if(t.sleeveFinish==='FILETE COSTURADO'){one(t.filetMaterial,filetMaterials(t),'Material do filete incompatível com o tecido principal.');need(t.filetMaterial,'Informe o material do filete.');if(t.filetMaterial==='RIBANA (EXCEÇÃO)')need(t.filetException.trim(),'Registre a solicitação excepcional do cliente para filete de ribana no ELASTIC.');}else if(t.filetMaterial||t.filetException)errors.push('Há material de filete preenchido sem filete de manga curta.');
  need(t.hemShape,'Escolha o formato da barra.');one(t.hemShape,t.hasSideCut?['RETA','ARREDONDADA']:['RETA'],'Barra arredondada exige recorte lateral.');if(!t.hasSideCut&&t.sideCutFabric!=='MESMO TECIDO DA PEÇA')errors.push('Tecido de recorte informado sem recorte lateral.');
 }else{
  const mold=moldFor(t);need(t.moldId,'Escolha o molde do calção.');if(t.moldId&&(!mold||mold.fit!==t.fit))errors.push('Molde incompatível com a modelagem do calção.');
  need(t.hemFinish,'Escolha o acabamento da barra.');one(t.hemFinish,mold?.filet?['BARRA COMUM','FILETE COSTURADO']:['BARRA COMUM'],'Este molde não aceita acabamento adicional.');if(!mold?.cut&&t.sideCutFabric!=='MESMO TECIDO DA PEÇA')errors.push('Este molde não permite escolha de tecido de recorte.');
  one(t.drawstringColor,DRAWSTRINGS,'Cor de cordão não autorizada.');need(t.drawstringColor,'Escolha a cor do cordão obrigatório.');if(mold?.stein)need(t.biasColorNote.trim(),'Identifique a cor do viés Stein conforme a arte.');
  if(t.collarModel||t.collarFinish||t.ribanaId||t.hasSideCut||t.poloSideV||t.filetMaterial||t.filetException||t.vConstruction||t.sleeveLength!=='CURTA'||t.sleeveFinish!=='BARRA COMUM'||t.hemShape!=='RETA'||t.buttons!==null)errors.push('O calção contém opções de camiseta incompatíveis.');
 }
 if(t.pocketRequest){if(t.productCode!=='CAL-001'||moldFor(t)?.pockets===false)errors.push('Este produto/molde não permite bolsos.');else if(release)errors.push('Bolsos solicitados: homologação de compatibilidade, quantidade, construção e posição ainda pendente.');}
 let brand=0;for(const a of t.applications){
  if(a.role==='ESCUDO'&&!['TPU ALTO RELEVO','APLIQUE BORDADO'].includes(a.type))errors.push('Escudos especiais: use TPU alto relevo ou aplique bordado.');
  if(a.role==='MARCA MEINERZ'){brand+=a.perUnit;if(t.productCode!=='CAM-001'||a.type!=='TPU ALTO RELEVO'||brand>1)errors.push('MEINERZ TPU: somente uma por camiseta; no calção a marca é sublimada.');}
  if(a.role==='ETIQUETA OFICIAL'&&(t.productCode!=='CAM-001'||!['TPU ALTO RELEVO','TERMOCOLANTE'].includes(a.type)))errors.push('Etiqueta oficial física só está disponível na camiseta, em TPU ou termocolante.');
  if(t.fit==='INFANTIL'&&a.type==='APLIQUE BORDADO')errors.push('Aplique bordado infantil é proibido.');if(t.fit==='INFANTIL'&&a.type==='TPU ALTO RELEVO')need(a.exception.trim(),'TPU infantil é excepcional: registre a justificativa no pedido.');need(a.position.trim(),'Identifique manualmente a posição de cada aplicação física.');
  if(!Number.isSafeInteger(a.perUnit*Number(product.quantity||0)))errors.push('Quantidade de aplicações excede o limite numérico do pedido.');
 }return [...new Set(errors)];
}
export function physicalApplications(product){return (product.technical?.applications||[]).map(a=>({...a,quantity:a.perUnit*Number(product.quantity||0),...(a.role==='MARCA MEINERZ'?{customerCharge:0}:{})}));}
export function technicalWarnings(product){const t=product.technical;if(!t)return ['Dados antigos: ficha técnica ainda não aplicada.'];const out=[],m=moldFor(t);if(m?.five)out.push(FIVE_PARTS_WARNING);if(t.fit==='INFANTIL'&&t.applications.some(a=>a.type==='TPU ALTO RELEVO'))out.push('TPU INFANTIL EXCEPCIONAL — conferir a justificativa técnica.');if(t.pocketRequest)out.push('BOLSOS PENDENTES DE HOMOLOGAÇÃO: '+t.pocketRequest);if(!t.legacyReviewed)out.push('Conversão do cadastro antigo aguardando conferência.');return out;}
export function designKey(product,page){return product.technical?.designId||page?.id||product.id;}
function applicationSignature(t){return t.applications.map(a=>[a.role,a.type,a.perUnit,a.position]).sort((a,b)=>JSON.stringify(a).localeCompare(JSON.stringify(b)));}
export function productionSignature(product,{sleeve=true}={}){const t=product.technical;if(!t)return null;return JSON.stringify(t.productCode==='CAM-001'?[t.fabricId,t.collarModel,t.collarFinish,t.ribanaId,t.vConstruction,t.buttons,t.hasSideCut,t.sideCutFabric,t.hemShape,applicationSignature(t),...(sleeve?[t.sleeveLength,t.sleeveFinish,t.filetMaterial]:[])]:[t.fabricId,t.moldId,t.hemFinish,t.sideCutFabric,Boolean(t.pocketRequest),applicationSignature(t)]);}
export function pageCompatibility(page){
 const errors=[],shirts=new Map(),shorts=page.products.filter(p=>p.technical?.productCode==='CAL-001');
 for(const fit of FITS){const same=shorts.filter(p=>p.technical.fit===fit.id);if(new Set(same.map(p=>p.technical.fabricId)).size>1||new Set(same.map(p=>p.technical.moldId)).size>1)errors.push('Cada modelagem da página deve ter um único molde e tecido principal de calção.');}
 const designs=new Map();for(const p of page.products){if(!p.technical)continue;const t=p.technical,key=t.productCode+'|'+t.fit+'|'+designKey(p,page),base=productionSignature(p,{sleeve:false}),found=designs.get(key);if(found&&found!==base)errors.push('Mesmo desenho com tecido, gola, recortes, bolsos ou aplicações diferentes exige outra página.');designs.set(key,base);if(t.productCode==='CAM-001'){const k=key+'|'+t.sleeveLength,sig=productionSignature(p),old=shirts.get(k);if(old&&old!==sig)errors.push('Filetes/acabamentos diferentes do mesmo desenho e comprimento de manga exigem outra página.');shirts.set(k,sig);}}
 return [...new Set(errors)];
}
export function catalogProblems(order,{release=false,parseGrade}={}){
 const errors=[],special={'CAM-001':0,'CAL-001':0},groups=new Map();
 if(order.technicalCatalogVersion&&order.technicalCatalogVersion!==CATALOG_VERSION)errors.push('Versão do catálogo do pedido não reconhecida.');
 for(const [i,page]of (order.pages||[]).entries()){
  errors.push(...pageCompatibility(page).map(s=>'Página '+(i+1)+': '+s));if(release&&page.groupingReviewRequired)errors.push('Página '+(i+1)+': confira imagens e apontamentos após reorganizar as peças.');
  for(const p of page.products||[]){const t=p.technical;if(p.manualTechnical&&productCodeFor(p.type))errors.push(p.type+': use a ficha técnica cadastrada deste produto.');if(!t){if(order.technicalCatalogVersion&&!p.manualTechnical)errors.push('Página '+(i+1)+' · '+p.type+': aplique uma ficha técnica cadastrada.');continue;}
   errors.push(...technicalProblems(p,order,release).map(s=>'Página '+(i+1)+' · '+p.type+': '+s));
   const entries=p.names?.length?p.names:parseGrade?parseGrade(p.grade,p.type).groups.flatMap(g=>g.rows.map(r=>({...r,size:(/BABY|FEMIN/i.test(g.category)?'BL':/INFANTIL/i.test(g.category)?'TAM ':'')+r.size}))):[];
   for(const row of entries){if(isSpecialSize(row.size)){special[t.productCode]+=row.quantity;const reference=row.specialReference||t.specialReference,description=row.specialDescription||t.specialDescription;if(reference&&!['MEDIDAS FORNECIDAS','PEÇA FÍSICA DE AMOSTRA'].includes(reference))errors.push(p.type+': referência de tamanho especial inválida.');if(release&&(!reference||!description?.trim()))errors.push(p.type+': TAMANHO ESPECIAL exige referência por medidas ou peça física e descrição.');}
    else if(t.fit){const fit=fitOfSize(row.size);if(fit&&fit!==t.fit||!FITS.find(f=>f.id===t.fit)?.sizes.includes(canonicalSize(row.size)))errors.push(p.type+': tamanho '+row.size+' incompatível com '+fitLabel(t.productCode,t.fit)+'.');}}
   if(t.productCode==='CAM-001'){const key=designKey(p,page)+'|'+t.fit+'|'+productionSignature(p,{sleeve:false});let group=groups.get(key);if(!group){group=[];groups.set(key,group);}group.push({p,page});}
  }
 }
 for(const [code,n]of Object.entries(special))if(n>3)errors.push(productDefinition(code).type+': até 3 UNIDADES em TAMANHO ESPECIAL por pedido; encontrados '+n+'.');
 for(const entries of groups.values())if(new Set(entries.map(e=>e.p.technical.sleeveLength)).size>1&&new Set(entries.map(e=>e.page.id)).size>1)errors.push('Mangas curta e longa do mesmo desenho/configuração precisam ser representadas na mesma página.');
 const numbered=new Map();for(const page of order.pages||[])for(const p of page.products||[])for(const row of p.names||[]){if(!row.kitId||!row.number)continue;const old=numbered.get(row.kitId);if(old&&old!==row.number)errors.push('As duas peças numeradas do mesmo kit devem compartilhar o número do atleta.');numbered.set(row.kitId,row.number);}
 return [...new Set(errors)];
}
export function suggestPageGrouping(order){
 const next=copy(order),all=next.pages.flatMap(page=>page.products.map(p=>({p,page}))),blocks=[],used=new Set();
 for(const entry of all){if(used.has(entry.p.id))continue;const block=[entry];used.add(entry.p.id);const t=entry.p.technical;
  if(t?.productCode==='CAM-001'){for(const other of all){if(used.has(other.p.id)||other.p.technical?.productCode!=='CAM-001')continue;if(designKey(other.p,other.page)===designKey(entry.p,entry.page)&&productionSignature(other.p,{sleeve:false})===productionSignature(entry.p,{sleeve:false})&&!pageCompatibility({products:[...block.map(e=>e.p),other.p]}).length){block.push(other);used.add(other.p.id);}}}blocks.push(block);
 }
 const bins=[];for(const block of blocks){if(block.length>8)throw Error('Há mais de oito representações no mesmo desenho. Revise a distribuição manualmente.');const kits=new Set(block.map(e=>e.p.kitGroupId).filter(Boolean));
  const candidates=bins.filter(b=>b.products.length+block.length<=8&&!pageCompatibility({products:[...b.products,...block.map(e=>e.p)]}).length);
  let bin=candidates.find(b=>b.products.some(p=>p.kitGroupId&&kits.has(p.kitGroupId)))||candidates.find(b=>b.sourceIds.has(block[0].page.id));
  if(!bin){const original=block[0].page;bin={...copy(original),id:uid(),products:[],annotations:[],sourceIds:new Set()};bins.push(bin);}bin.products.push(...block.map(e=>e.p));for(const e of block)bin.sourceIds.add(e.page.id);
 }
 next.pages=bins.map((bin,i)=>{const sourceIds=bin.sourceIds,originals=next.pages.filter(p=>sourceIds.has(p.id));delete bin.sourceIds;
  const visuals=originals.map(p=>p.visual).filter(v=>v?.image),uniqueVisuals=[...new Set(visuals.map(v=>JSON.stringify(v)))];if(uniqueVisuals.length>1)throw Error('As páginas têm imagens únicas ou enquadramentos diferentes. Passe as imagens para as peças antes de agrupar, para preservar as duas representações.');if(visuals.length)bin.visual=copy(visuals[0]);
  const join=key=>[...new Set(originals.map(p=>p[key]).filter(Boolean))].join(' / '),titles=join('title'),labels=join('label'),groups=join('listGroup'),notes=join('notes');const preserved=[notes,...(titles.length>160?['TÍTULOS ORIGINAIS: '+titles]:[]),...(labels.length>160?['DESTAQUES ORIGINAIS: '+labels]:[]),...(groups.length>100?['GRUPOS ORIGINAIS: '+groups]:[])].filter(Boolean).join('\n');if(preserved.length>4000)throw Error('As observações combinadas excedem o espaço da página. Revise manualmente sem apagar os dados de origem.');bin.notes=preserved;bin.title=titles.length<=160?titles:originals[0].title;bin.label=labels.length<=160?labels:originals[0].label;bin.listGroup=groups.length<=100?groups:originals[0].listGroup;if(sourceIds.size>1)bin.mode='avulsas';
  bin.annotations=originals.flatMap(p=>(p.annotations||[]).filter(a=>!a.productId||bin.products.some(item=>item.id===a.productId))).map(a=>({...a,id:uid()}));bin.groupingReviewRequired=true;bin.title=bin.title||'Variação '+(i+1);return bin;});if(next.pages.length>50)throw Error('A sugestão ultrapassa 50 páginas. Revise manualmente.');return next;
}
export function technicalLines(product,order={}){
 const t=product.technical;if(!t)return [];const lines=[t.productCode+' · '+fitLabel(t.productCode,t.fit)];
 if(t.productCode==='CAM-001')lines.push('Manga: '+(order.shirtSleeveCut||'CORTE PENDENTE')+' · '+t.sleeveLength+' · '+(t.sleeveFinish==='PUNHO'?'PUNHO DE RIBANA SUBLIMADA':t.sleeveFinish),'Gola: '+[t.collarModel,t.collarFinish,t.vConstruction,t.buttons!==null?t.buttons+' BOTÕES':''].filter(Boolean).join(' · '));
 if(t.collarModel==='REDONDA COM PEITILHO')lines.push('PEITILHO FIXO: DRY');if(t.collarModel==='PRIME')lines.push('VIÉS FIXO DA GOLA: DRY SUBLIMADO');
 if(t.productCode==='CAL-001'){const m=moldFor(t);lines.push('Molde: '+(m?.label||'PENDENTE'),m?.description||'',m?.stein?'VIÉS FIXO: DRY · COR: '+(t.biasColorNote||'PENDENTE'):t.hemFinish,'CORDÃO OBRIGATÓRIO: '+(t.drawstringColor||'PENDENTE'));}
 if(t.sleeveFinish==='FILETE COSTURADO')lines.push('Filete: '+t.filetMaterial+(t.filetException?' · EXCEÇÃO: '+t.filetException:''));
 if(t.hasSideCut||moldFor(t)?.cut)lines.push('RECORTE: '+t.sideCutFabric);if(t.productCode==='CAM-001')lines.push('Barra: '+t.hemShape);
 if(t.ribanaId){const rib=ribbonOptions(t).find(r=>r.id===t.ribanaId);if(rib)lines.push('RIBANA '+rib.id+': '+rib.displayColorName+' · FÁBRICA: '+rib.factoryColorRef.join(' + '));}
 for(const a of physicalApplications(product))lines.push(a.role+' · '+a.type+' · '+a.perUnit+'/peça = '+a.quantity+' aplicações · '+a.position+(a.customerCharge===0?' · GRATUITA PARA O CLIENTE':'')+(a.exception?' · EXCEÇÃO: '+a.exception:''));
 if(!t.applications.length)lines.push('Escudos, marcas e personalização: SUBLIMADOS NA ARTE; sem aplicação física adicional.');
 if(t.specialReference||t.specialDescription)lines.push('TAMANHO ESPECIAL: '+t.specialReference+' · '+t.specialDescription);
 lines.push(...technicalWarnings(product));return lines.filter(Boolean);
}
export function catalogSheetGroups(page){
 if(!page.products.some(p=>p.technical))return null;const remaining=[...page.products],groups=[];
 while(remaining.length){const first=remaining.shift(),group=[first];if(first.technical?.productCode==='CAM-001'){const i=remaining.findIndex(p=>p.technical?.productCode==='CAM-001'&&designKey(p,page)===designKey(first,page)&&p.technical.fit===first.technical.fit&&p.technical.sleeveLength!==first.technical.sleeveLength);if(i>=0)group.push(remaining.splice(i,1)[0]);}
  while(remaining.length&&group.length<3){let i=first.kitGroupId?remaining.findIndex(p=>p.kitGroupId===first.kitGroupId):0;if(i<0)i=0;group.push(remaining.splice(i,1)[0]);}groups.push(group);
 }return groups;
}
export function productionSummary(order,parseGrade){
 const groups=new Map();for(const page of order.pages||[])for(const product of page.products||[]){const t=product.technical,fit=t?.fit||'',name=product.type.toUpperCase()+(fit?' · '+fitLabel(t.productCode,fit).toUpperCase():''),rows=product.names?.length?product.names:parseGrade(product.grade,product.type).groups.flatMap(g=>g.rows.map(r=>({...r,category:g.category})));for(const row of rows){const label=name+(!fit&&row.category&&row.category!==product.type.toUpperCase()?' · '+row.category:''),size=isSpecialSize(row.size)?'TAMANHO ESPECIAL':canonicalSize(row.size);if(!groups.has(label))groups.set(label,new Map());const group=groups.get(label);group.set(size,(group.get(size)||0)+Number(row.quantity||0));}}
 return [...groups].map(([product,sizes])=>({product,rows:[...sizes].map(([size,quantity])=>({size,quantity})),quantity:[...sizes.values()].reduce((a,b)=>a+b,0)}));
}
