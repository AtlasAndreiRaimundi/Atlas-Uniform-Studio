import {pieceFamilies} from './order-linked-applications.js?v=3';
import {catalogProblems,technicalLines,physicalApplications,fitLabel,moldFor,catalogSheetGroups,productionSummary,isSpecialSize,productDisplayName,finishSummary,detectedTechniques} from './product-catalog.js?v=6';
import {NOTE_AREA,annotationVisible} from './order-annotations.js?v=2';
import {parseGrade,EXTRA_APPLICATIONS} from './production-core.js?v=14';
import {placeOrderImage,ORDER_PAGE} from './order-image-layout.js?v=3';
export const PAPER={width:841.89,height:595.28};
const C={ink:'#17202b',muted:'#68717d',line:'#b9bec5',red:'#c52a36',blue:'#235394',light:'#f4f5f7',white:'#ffffff'};
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
export function wrap(text,width,size=8){
 const lines=[];const max=Math.max(2,Math.floor(width/(size*.58)));
 for(const para of String(text??'').split('\n')){let line='';for(const word of para.split(/\s+/)){if(!word)continue;let rest=word;while(rest.length>max){if(line){lines.push(line);line='';}lines.push(rest.slice(0,max));rest=rest.slice(max);}if((line+' '+rest).trim().length>max){lines.push(line);line=rest;}else line=(line+' '+rest).trim();}lines.push(line);}
 return lines;
}
function canvas(){const ops=[];return {ops,rect:(x,y,w,h,fill='none',stroke=C.line,r=0)=>ops.push({kind:'rect',x,y,w,h,fill,stroke,r}),line:(x,y,x2,y2,color=C.line,width=.55)=>ops.push({kind:'line',x,y,x2,y2,color,width}),text:(text,x,y,size=8,color=C.ink,bold=false)=>ops.push({kind:'text',text:String(text??''),x,y,size,color,bold}),image:(src,x,y,w,h,clip)=>ops.push({kind:'image',src,x,y,w,h,...(clip?{clip}:{})})};}
const date=s=>/^\d{4}-\d{2}-\d{2}$/.test(s)?s.split('-').reverse().join('/'):s||'';
function base(order,assets,section=''){const d=canvas();d.rect(0,0,PAPER.width,PAPER.height,C.white,'none');d.rect(16,14,258,38,C.ink,'none',1.5);if(assets.logo)d.image(assets.logo,34,19,222,28);else d.text('ATLAS',37,43,27,C.white,true);d.text('PEDIDO',305,34,21,C.ink,true);d.text((order.factoryTracking?.stage==='accepted'?'ACEITO PELA FÁBRICA':order.factoryTracking?.stage==='sent'?'ENVIADO À FÁBRICA':order.workflow?.status==='released'?'CONFERIDO':'RASCUNHO')+' · R'+(order.workflow?.revision||1)+(section?' · '+section:''),305,61,6.5,C.muted,true);const number=order.number?'Nº '+order.number:'CÓDIGO GERADO AO SALVAR';d.text(number,826,39,order.number?Math.min(24,208/(number.length*.8)):9,C.ink,true);d.ops.at(-1).align='right';return d;}
function layoutCounter(sheet,total){
 sheet.layoutIndex=sheet.sourcePage||null;sheet.layoutCount=total;
 if(!sheet.layoutIndex)return;
 sheet.ops.push({kind:'rect',x:307,y:39,w:79,h:16,fill:C.white,stroke:C.line,r:8},{kind:'text',text:sheet.layoutIndex+' de '+total,x:329,y:50.5,size:9,color:C.ink,bold:true,role:'layout-counter'});
}
export function sheetLabel(sheet){
 if(!sheet.layoutIndex)return sheet.title;
 const layout='Desenho '+sheet.layoutIndex+' de '+sheet.layoutCount;
 if(sheet.kind==='list')return layout+' · Lista '+sheet.listPage+' de '+sheet.listPageCount;
 if(sheet.kind==='details')return layout+' · Dados complementares';
 return layout+' · '+sheet.title;
}
export function fitFieldText(value,width,height,{size=8,minSize=5.5,max=2}={}){
 let lines,limit,chosen=size;
 for(;;chosen=Math.max(minSize,chosen-.25)){lines=wrapField(value||'—',width,chosen);limit=Math.max(1,Math.min(max,Math.floor((height-20)/(chosen+1.25))+1));if(lines.length<=limit||chosen===minSize)break;}
 return {size:chosen,lines,limit,overflow:lines.length>limit};
}
// Conservative advances for the bundled typeface and the PDF fallback. Wide
// letters must fit too; a character count alone underestimates names with W/M.
const FIELD_ADVANCES=[.278,.333,.475,.707,.629,.889,.722,.239,.335,.335,.389,.584,.278,.422,.278,.503,.644,.556,.566,.595,.571,.598,.614,.556,.63,.619,.333,.333,.606,.584,.606,.611,.975,.722,.722,.722,.722,.667,.611,.778,.722,.278,.572,.722,.611,.833,.722,.778,.667,.778,.722,.667,.611,.722,.667,.945,.667,.667,.611,.333,.518,.333,.65,.556,.333,.567,.611,.556,.611,.576,.392,.611,.611,.278,.278,.556,.278,.889,.611,.611,.611,.611,.401,.556,.406,.611,.556,.778,.556,.585,.5,.389,.28,.389,.584];
function wrapField(value,width,size){
 const advance=c=>{const code=c.normalize('NFD').replace(/[\u0300-\u036f]/g,'').codePointAt(0);return (FIELD_ADVANCES[code-32]??(c==='·'?.3:1))*size*1.02;},lines=[];
 for(const paragraph of String(value).split('\n')){let line='',used=0;for(const word of paragraph.split(/\s+/).filter(Boolean)){const wordWidth=[...word].reduce((sum,c)=>sum+advance(c),0),gap=line?advance(' '):0;if(line&&used+gap+wordWidth>width){lines.push(line);line='';used=0;}if(wordWidth<=width){line+=(line?' ':'')+word;used+=(line===word?0:gap)+wordWidth;}else{for(const c of word){const w=advance(c);if(line&&used+w>width){lines.push(line);line='';used=0;}line+=c;used+=w;}}}lines.push(line);}
 return lines;
}
function field(d,label,value,x,y,w,h,extra,{color=C.ink,size=8,max=2}={}){
 d.text(label.toUpperCase(),x+5,y+10,6.1,C.muted,true);
 const fit=fitFieldText(value,w-10,h,{size,max}),shown=fit.overflow?[...fit.lines.slice(0,fit.limit-1),'(ver detalhes)']:fit.lines;
 shown.forEach((s,i)=>d.text(s,x+5,y+18+i*(fit.size+1.25),fit.size,color,true));d.line(x,y+h,x+w,y+h);
 if(fit.overflow)extra.push(label.toUpperCase()+': '+value);
}
function metadata(d,o,extra){
 const x=618,w=208;d.rect(x,65,w,514,C.white,C.line,7);
 field(d,'Contato / telefone',[o.contact,o.contactPhone].filter(Boolean).join(' · '),x,65,w,32,extra,{max:1});
 field(d,'Cliente',o.client,x,97,w,32,extra,{size:9,max:1});
 for(const [label,value,y]of [['TELEFONE',o.phone,140],['Nº CADASTRO',o.registration,153]]){const lines=wrap(label+': '+(value||'—'),197,7);d.text(lines[0],x+5,y,7);if(lines.length>1)extra.push(label+': '+value);}
 const payment=wrap('PAGAMENTO: '+(o.payment||'—'),197,7);d.text(payment[0],x+5,166,7);if(payment.length>1)extra.push('FORMA DE PAGAMENTO: '+o.payment);
 d.line(x,174,x+w,174);const control='N: '+(o.controlN||'—')+'     E: '+(o.controlE||'—'),controlLines=wrap(control,197,7);d.text(controlLines[0],x+5,185,7,C.muted);if(controlLines.length>1)extra.push(control);
 d.line(x,191,x+w,191);d.text('PEDIDO: '+date(o.orderDate),x+5,202,7);d.text('DESPACHO: '+date(o.dispatchDate),x+5,215,7,C.red,true);
 const carrier=wrap('TRANSPORTADORA: '+(o.carrier||'—'),198,7);d.text(carrier[0],x+5,228,7);if(carrier.length>1)extra.push('TRANSPORTADORA: '+o.carrier);
 d.text('ENTREGA: '+date(o.deliveryDate),x+5,241,7);d.line(x,247,x+w,247);
 const seller=wrap('VENDEDOR: '+(o.seller||'—'),196,8);d.text(seller[0],x+5,260,8,C.ink,true);if(seller.length>1)extra.push('VENDEDOR: '+o.seller);d.line(x,267,x+w,267);
 d.rect(x,535,w,15,C.red,'none');d.text('AMOSTRA DO CLIENTE',x+9,546,7.8,C.white,true);d.rect(x+184,538,9,9,C.white,C.white);if(o.sample){d.text('X',x+185.5,545.5,7,C.red,true);}
 const previous=wrap('PEDIDO ANTERIOR: '+(o.previousOrder||'—'),196,7);d.text(previous[0],x+5,561,7,C.muted);if(previous.length>1)extra.push('PEDIDO ANTERIOR: '+o.previousOrder);d.line(x,566,x+w,566);
 const artist=wrap(o.artist||'ARTE-FINALISTA',196,9);d.text(artist[0],x+7,577,9,C.ink,true);if(artist.length>1)extra.push('ARTE-FINALISTA: '+o.artist);
}
function primary(order,page,products,assets,sourcePage=1){
 const d=base(order,assets,'DESENHO '+sourcePage),extra=[];metadata(d,order,extra);
 d.rect(16,65,215,46,'none',C.line,5);const label=wrap(page.label||'',202,11);label.slice(0,2).forEach((s,i)=>d.text(s,23,85+i*14,11,C.red,true));if(label.length>2)extra.push('ETIQUETA / DESTAQUE: '+page.label);
 d.rect(237,65,178,46,'none',C.line,5);const techniques=detectedTechniques(order,products);TECH_ROWS(d,techniques,extra);
 d.rect(421,65,190,46,'none',C.line,5);['PEDIDO NOVO','COMPLEMENTO','COMPLEMENTO COM ALTERAÇÕES'].forEach((s,i)=>{const chosen=order.type===s;d.text('('+ (chosen?'X':' ')+') '+s,427,79+i*12,6.8,chosen?C.red:C.muted,chosen);});
 const title=wrap(page.title||'',581,13);title.slice(0,2).forEach((s,i)=>d.text(s,24,132+i*15,13,C.red,true));if(title.length>2)extra.push('TÍTULO: '+page.title);
 const top=title.length>1?157:145,bottom=452,slot=595/products.length;
 const anchors=[],imageEntries=[],placeholderEntries=[],componentArrows=[],shared=page.visual?.mode==='shared'&&page.visual.image,applications=products.some(p=>p.technical?.applications.length||p.extraApplications?.length||p.technical?.drawstringColor);
 const appTop=applications?458-products.length*20-3:458;
 const artBottom=applications?Math.min(bottom,appTop-16):bottom;
 const addImage=(src,frame,transform,key)=>{const box=placeOrderImage(src,frame,transform);d.image(src,box.x,box.y,box.w,box.h,ORDER_PAGE);d.ops.at(-1).imageKey=key;imageEntries.push({op:d.ops.at(-1),src,frame,transform});};
 if(shared)addImage(page.visual.image,{x:21,y:top,w:585,h:artBottom-top-4},page.visual.transform,'shared');
 products.forEach((p,i)=>{
  const x=16+i*slot,stacked=products.length===2&&page.visualLayout!=='side',ratio=/calção|bermuda/i.test(products[1]?.type||'') ? .72 : .5,split=top+(bottom-top)*ratio;
  const area=shared?{id:p.id,x:16,y:top,w:595,h:bottom-top}:stacked?{id:p.id,x:16,y:i===0?top:split,w:595,h:i===0?split-top:bottom-split}:{id:p.id,x,y:top,w:slot,h:bottom-top};anchors.push(area);const images=(p.images||[]).map((src,slot)=>({src,slot})).filter(image=>image.src);
  if(!shared&&images.length){const iw=(area.w-10)/images.length;images.forEach(({src,slot},j)=>{const frame={x:area.x+5+j*iw,y:area.y,w:iw-4,h:Math.min(area.h-4,artBottom-area.y-4)};addImage(src,frame,p.imageTransforms?.[slot],p.id+':'+slot);});}
  else if(!shared){d.ops.push({kind:'placeholder',x:area.x+10,y:area.y+3,w:area.w-20,h:area.h-5,label:p.type});placeholderEntries.push(d.ops.at(-1));}
  const color=i===0?C.blue:C.red,colW=208/products.length,colX=618+i*colW;if(i)d.line(colX,267,colX,535);
  field(d,'Modelo '+(i+1),p.technical?productDisplayName(p):[p.type,p.model!==p.type?p.model:''].filter(Boolean).join(' · '),colX,267,colW,34,extra,{color,size:8,max:3});
  field(d,'Tecido',p.fabric,colX,301,colW,30,extra,{color,size:8,max:2});
  field(d,'Cor do tecido',p.fabricColor,colX,331,colW,27,extra,{color,max:1});
  field(d,'Estampa e aplicações',finishSummary(p),colX,358,colW,54,extra,{color,size:7.2,max:5});
  field(d,'Quantidade',String(p.quantity||0)+' UNIDADES',colX,412,colW,28,extra,{color,size:9,max:1});
  d.text('QUANTIDADES:',colX+5,452,7,color,true);
  const grade=parseGrade(p.grade,p.type),rows=[];grade.groups.forEach(g=>{rows.push({text:g.category,bold:true});g.rows.forEach(r=>rows.push({text:(isSpecialSize(r.size)?'TAMANHO ESPECIAL':r.size)+' = '+r.quantity,bold:isSpecialSize(r.size)}));});
  const gradeSize=Math.max(5.5,Math.min(7.2,65/Math.max(1,rows.length)-1)),gradeStep=gradeSize+1,gradeLimit=Math.floor(65/gradeStep)+1;
  const visible=rows.slice(0,gradeLimit);visible.forEach((r,j)=>d.text(r.text,colX+5,464+j*gradeStep,gradeSize,color,r.bold));
  if(rows.length>gradeLimit){extra.push('QUANTIDADES · '+p.type,...rows.slice(gradeLimit).map(r=>r.text));d.text('Continua em detalhes',colX+5,532,5.8,C.muted);}
  if(!rows.length)d.text('Grade não informada',colX+5,466,7,C.muted);
  if(p.notes)extra.push('OBSERVAÇÕES · '+p.type+': '+p.notes);for(const member of p.familyMembers||[p]){const t=member.technical;if(t?.specialDescription)extra.push('TAMANHO ESPECIAL · '+member.type+': '+t.specialReference+' · '+t.specialDescription);if(t?.pocketRequest)extra.push('BOLSOS · '+member.type+': '+t.pocketRequest);for(const a of t?.applications||[])if(a.exception)extra.push('EXCEÇÃO · '+member.type+' · '+a.type+': '+a.exception);}
  (p.components||[]).forEach((c,j)=>{
   const value=[c.name,c.material,c.finish,c.position].filter(Boolean).join(' · ');const lines=wrap(value,slot-16,7.3);
   if(!applications&&!page.freeComponents&&page.imageArea!=='expanded'&&j<2&&lines.length<=2){lines.forEach((s,k)=>d.text(s,x+7,424+j*17+k*8,7.3,C.red,j===0));if(c.anchor&&(shared||images.length)){const a={x:area.x+c.anchor.x*area.w,y:area.y+c.anchor.y*area.h};d.line(x+18,415+j*17,a.x,a.y,C.red,.6);const line=d.ops.at(-1);d.rect(a.x-1,a.y-1,2,2,C.red,'none');componentArrows.push({line,tip:d.ops.at(-1),area,anchor:c.anchor});}}
   else extra.push('COMPONENTE · '+p.type+': '+value);
  });
 });
 if(applications)drawApplications(d,products,appTop);
 d.line(16,458,611,458,C.line,1); // Automatic layout reserves the lower left for a budget.
 const notes=[order.origin?'COMPLEMENTO DO PEDIDO '+order.origin.number+' · R'+order.origin.revision:'',order.complementChanges?'ALTERAÇÕES: '+order.complementChanges:'',page.notes,order.notes].filter(Boolean).join('\n');let noticeY=472,noticeSize=7.5,noticeMax=8;
 if(notes){const lines=wrap(notes,187,8.2),shown=lines.length>3?[...lines.slice(0,2),'(ver detalhes)']:lines;shown.forEach((s,i)=>d.text(s,420,472+i*10,8.2,C.red,true));if(lines.length>3)extra.push('OBSERVAÇÕES DO PEDIDO: '+notes);noticeY+=shown.length*10+5;noticeSize=7;noticeMax=Math.max(1,Math.floor((552-noticeY)/8.5));}
 const notice=wrap(order.notice,190,noticeSize),visibleNotice=notice.length>noticeMax?[...notice.slice(0,noticeMax-1),'(lembrete em detalhes)']:notice;visibleNotice.forEach((s,i)=>d.text(s,420,noticeY+i*8.5,noticeSize,C.red));if(notice.length>noticeMax)extra.push('LEMBRETE: '+order.notice);
 d.line(420,566,607,566,C.red,.7);d.text('ASSINATURA RESPONSÁVEL',445,578,7,C.red,true);
 drawAnnotations(d,page.annotations||[],products,extra);
 return {ops:d.ops,extra,anchors,title:page.title||products.map(p=>p.type).join(' + '),mode:page.mode,kind:'sheet',sourcePage};
}

function printRows(product){
 if(product.names?.length)return product.names.map(n=>({name:String(n.name??'').trim(),number:String(n.number??'').trim(),additional:String(n.additional??'').trim(),size:n.size,quantity:n.quantity,athleteId:n.athleteId||'',kitId:n.kitId||'',specialReference:n.specialReference||'',specialDescription:n.specialDescription||''}));
 return parseGrade(product.grade,product.type).groups.flatMap(group=>group.rows.filter(row=>row.quantity>0).map(row=>({name:'',number:'',additional:'',size:(group.category===product.type.toUpperCase()?'':group.category+' ')+row.size,quantity:row.quantity})));
}
export function listSections(products,{kit=false}={}){
 const rows=products.map(printRows);
 if(products.length===2&&products.every(p=>p.technical&&p.names?.length)&&rows[0].every(r=>r.kitId)&&rows[1].every(r=>r.kitId)){
  const keys=rows.map(items=>new Set(items.map(r=>r.kitId))),same=keys[0].size===rows[0].length&&keys[1].size===rows[1].length&&keys[0].size===keys[1].size&&[...keys[0]].every(k=>keys[1].has(k));
  if(same){const right=new Map(rows[1].map(r=>[r.kitId,r]));return [{title:'LISTA VINCULADA · '+products.map(p=>[p.type,p.model].filter(Boolean).join(' · ')).join(' + '),columns:[['ITEM',30],['NOME / Nº · '+products[0].type,170],['TAM. 1',65],['QTD. 1',50],['NOME / Nº · '+products[1].type,170],['TAM. 2',65],['QTD. 2',50],['ADICIONAL / ESPECIAL',210]],rows:rows[0].map((a,i)=>{const b=right.get(a.kitId),label=r=>(r.name||'SEM NOME')+' / '+(r.number||'SEM NÚMERO'),size=r=>isSpecialSize(r.size)?'TAMANHO ESPECIAL':r.size,notes=[...new Set([a.additional,b.additional].filter(Boolean)),...[a,b].filter(r=>isSpecialSize(r.size)).map((r,j)=>products[j].type+': '+[r.specialReference,r.specialDescription].filter(Boolean).join(' · '))].join(' · ');return [String(i+1),label(a),size(a),String(a.quantity),label(b),size(b),String(b.quantity),notes||'SEM ADICIONAL'];}),totals:products.map(p=>({type:p.type,quantity:p.quantity}))}];}
 }
 const paired=kit&&products.length===2&&products.every(p=>p.names?.length)&&rows[0].length===rows[1].length&&rows[0].every((row,i)=>['name','number','additional','quantity'].every(key=>row[key]===rows[1][i][key]));
 const values=row=>[row.name||'SEM NOME',row.number||'SEM NÚMERO',row.additional||'SEM ADICIONAL'];
 const title=items=>items.map(p=>[p.type,p.model,p.fabricColor].filter(Boolean).join(' · ')).join(' + ');
 if(paired)return [{title:title(products),columns:[['ITEM',30],['NOME',200],['NÚMERO',70],[products[0].type+(products[0].type===products[1].type?' 1':''),105],[products[1].type+(products[0].type===products[1].type?' 2':''),105],['QTD. KITS',60],['ADICIONAL',240]],rows:rows[0].map((row,i)=>{const [name,number,additional]=values(row);return [String(i+1),name,number,row.size,rows[1][i].size,String(row.quantity),additional];}),totals:products.map(p=>({type:p.type,quantity:p.quantity}))}];
 return products.map((product,index)=>({title:title([product])+(product.names?.length?'':' · GRADE SEM PERSONALIZAÇÃO'),columns:[['ITEM',30],['NOME',230],['NÚMERO',80],['TAMANHO',100],['QTD.',60],['ADICIONAL',310]],rows:rows[index].map((row,i)=>{const [name,number,additional]=values(row),special=isSpecialSize(row.size);return [String(i+1),name,number,special?'TAMANHO ESPECIAL':row.size,String(row.quantity),[additional,...(special?[row.specialReference,row.specialDescription]:[])].filter(Boolean).join(' · ')];}),totals:[{type:product.type,quantity:product.quantity}]})).filter(section=>section.rows.length);
}
function listSheets(order,page,products,assets,sourcePage){
 const sections=listSections(products,{kit:page.mode==='conjunto'||page.visual?.mode==='shared'});if(!sections.length)return [];
 const result=[];let d,y,current;
 function start(){d=base(order,assets,'LISTA · DESENHO '+sourcePage);current={ops:d.ops,extra:[],anchors:[],title:'Lista do desenho '+sourcePage,mode:'lista',kind:'list',sourcePage};result.push(current);
  const title='LISTA DE '+(order.number||'PEDIDO SEM NÚMERO')+' · DESENHO '+sourcePage,fit=fitFieldText(title,800,44,{size:15,minSize:7,max:3});fit.lines.forEach((line,i)=>d.text(line,21,82+i*(fit.size+2),fit.size,C.ink,true));
  const subtitle=wrapField([order.client,page.title||page.listGroup].filter(Boolean).join(' · '),800,8);subtitle.slice(0,2).forEach((line,i)=>d.text(line,21,119+i*10,8,C.muted));y=145;
 }
 function heading(section){const lines=wrapField(section.title,800,9.2);for(const line of lines){d.text(line,21,y+10,9.2,C.blue,true);y+=12;}y+=4;const headings=section.columns.map(([label,w])=>wrapField(label,w-10,7));const h=Math.max(...headings.map(lines=>lines.length))*9+10;let x=16;d.rect(16,y,810,h,C.light,C.line);headings.forEach((lines,i)=>{lines.forEach((line,j)=>d.text(line,x+5,y+12+j*9,7,C.ink,true));x+=section.columns[i][1];});y+=h;}
 start();
 for(const section of sections){
  const total='TOTAL: '+section.totals.map(item=>item.type.toUpperCase()+' = '+item.quantity).join(' · '),totalLines=wrapField(total,800,8),totalHeight=totalLines.length*11+14;
  const headingHeight=wrapField(section.title,800,9.2).length*12+14+Math.max(...section.columns.map(([label,w])=>wrapField(label,w-10,7).length))*9;
  if(y+headingHeight+40>535)start();heading(section);
  for(const [rowIndex,row]of section.rows.entries()){
   const cells=row.map((text,i)=>wrapField(text,section.columns[i][1]-10,8)),lineCount=Math.max(...cells.map(lines=>lines.length)),bottom=rowIndex===section.rows.length-1?Math.min(535,550-totalHeight):535,special=row.some(cell=>String(cell).includes('TAMANHO ESPECIAL'));let offset=0;
   while(offset<lineCount){let available=Math.floor((bottom-y-10)/10);if(available<1){start();heading(section);available=Math.floor((bottom-y-10)/10);}const take=Math.min(lineCount-offset,available),h=take*10+10;let x=16;d.rect(16,y,810,h,'none',C.line);
    cells.forEach((lines,i)=>{if(i)d.line(x,y,x,y+h);const shown=lines.slice(offset,offset+take);if(offset&&i===0&&!shown.length)shown.push(row[0]);shown.forEach((line,j)=>d.text(line,x+5,y+13+j*10,8,C.ink,special||i===row.length-2));x+=section.columns[i][1];});y+=h;offset+=take;
    if(offset<lineCount){start();heading(section);}
   }
  }
  if(y+totalHeight>550){start();heading(section);}totalLines.forEach(line=>{d.text(line,21,y+14,8,C.ink,true);y+=11;});y+=20;
 }
 result.forEach((sheet,i)=>{sheet.listPage=i+1;sheet.listPageCount=result.length;sheet.title+=' · '+(i+1)+' de '+result.length;sheet.ops.push({kind:'text',text:'LISTA '+sheet.listPage+' DE '+sheet.listPageCount+' · DESENHO '+sourcePage,x:21,y:575,size:7,color:C.muted,bold:true});});return result;
}
function drawApplications(d,products,top){
 d.text(products.some(p=>p.technical?.drawstringColor)?'APLICAÇÕES E CORDÃO':'APLICAÇÕES EXTRAS',22,top-5,6.3,C.muted,true);
 d.rect(16,top,595,products.length*20,'none',C.line,2);
 const columns=[{x:111,w:112},{x:223,w:48},{x:271,w:120},{x:391,w:124},{x:515,w:96}];
 products.forEach((p,i)=>{const y=top+i*20,color=i===0?C.blue:C.red;if(i)d.line(16,y,611,y);const heading=fitFieldText(p.type,84,20,{size:7,minSize:5.5,max:1});d.text(heading.lines[0],22,y+13,heading.size,color,true);
  if(p.technical){const totals=new Map();for(const a of physicalApplications(p))totals.set(a.role+' · '+a.type,(totals.get(a.role+' · '+a.type)||0)+a.quantity);const text=[...[...totals].map(([label,n])=>label+' = '+n),p.technical.drawstringColor?'Cordão: '+p.technical.drawstringColor:''].filter(Boolean).join(' · ')||'SOMENTE SUBLIMADOS NA ARTE';const fitted=fitFieldText(text,490,20,{size:6.7,minSize:5,max:2});fitted.lines.slice(0,2).forEach((line,j)=>d.text(line,116,y+9+j*7,fitted.size,color,true));return;}EXTRA_APPLICATIONS.forEach((label,j)=>{const x=columns[j].x;d.rect(x,y+7,7,7,'none',color);if(p.extraApplications?.includes(label)){d.line(x+1,y+8,x+6,y+13,color,.9);d.line(x+1,y+13,x+6,y+8,color,.9);}d.text(label,x+11,y+13,6.3,color);});
 });
}
function drawAnnotations(d,annotations,products,extra){
 for(const a of annotations.filter(a=>annotationVisible(a,products))){
  const start=d.ops.length,color=a.color||C.red,size=a.size||9,width=a.width||1;
  if(a.type!=='text'){
   d.line(a.x,a.y,a.x2,a.y2,color,width);
   if(a.type==='arrow'||a.type==='callout'){const angle=Math.atan2(a.y2-a.y,a.x2-a.x),length=6+width;for(const delta of [-.45,.45])d.line(a.x2,a.y2,a.x2-length*Math.cos(angle+delta),a.y2-length*Math.sin(angle+delta),color,width);}
  }
  if(a.text){const lines=wrap(a.text,Math.max(30,Math.min(190,PAPER.width-a.x-4)),size),available=Math.max(1,Math.floor((PAPER.height-5-a.y)/(size+2))+1);const shown=lines.slice(0,available),boxWidth=Math.min(PAPER.width-a.x-1,Math.max(...shown.map(line=>line.length))*size*.65+5);d.rect(Math.max(0,a.x-2),Math.max(0,a.y-size-2),boxWidth,shown.length*(size+2)+3,C.white,'none',1);shown.forEach((line,i)=>d.text(line,a.x,a.y+i*(size+2),size,color,true));if(lines.length>available)extra.push('APONTAMENTO · '+(products.find(p=>p.id===a.productId)?.type||'Página')+': '+a.text);}
  for(const op of d.ops.slice(start))op.clip={...NOTE_AREA};
 }
}
function TECH_ROWS(d,techniques,extra){
 const shown=techniques.slice(0,6),step=shown.length>4?6.8:10;shown.forEach((s,i)=>d.text('(X) '+s,243,76+i*step,shown.length>4?5.8:6.9,C.red,i===0));if(!shown.length)d.text('TÉCNICAS DE APLICAÇÃO',243,82,6.5,C.muted);if(techniques.length>6)extra.push('TÉCNICAS DE APLICAÇÃO: '+techniques.join(', '));
}
function continuation(order,title,lines,assets){const d=base(order,assets),extra=[];metadata(d,order,extra);d.rect(16,65,595,39,C.light,C.line,5);d.text('DADOS COMPLEMENTARES',27,81,7,C.muted,true);wrap(title,568,11).slice(0,1).forEach(s=>d.text(s,27,97,11,C.ink,true));
 lines.forEach((s,i)=>{const col=i>=33?1:0,row=i%33;if(/^\[[X ]\] /.test(s)){const x=25+col*298,y=121+row*9.7;d.rect(x,y-7,7,7,'none',C.ink);if(s[1]==='X'){d.line(x+1,y-6,x+6,y-1,C.ink,.8);d.line(x+1,y-1,x+6,y-6,C.ink,.8);}d.text(s.slice(4),x+12,y,7.7);}else d.text(s,25+col*298,121+row*9.7,7.7,C.ink,/^(?:APLICAÇÕES EXTRAS|QUANTIDADES|PERSONALIZAÇÃO|OBSERVAÇÕES|COMPONENTE|NOME \|)/.test(s));});
 d.text('COMPLEMENTO DA FICHA TÉCNICA',627,289,7,C.muted,true);d.text('Dados e quantidades',627,310,9,C.ink,true);d.text('continuam nesta folha.',627,325,9,C.ink);d.line(16,458,611,458,C.line,1);d.line(420,566,607,566,C.red,.7);d.text('ASSINATURA RESPONSÁVEL',445,578,7,C.red,true);return {ops:d.ops,extra:[],anchors:[],title:'Complemento · '+title,mode:'complemento'};}
export function orderPreviewSVG(order,assets={}){
 const groups=layoutGroups(order);if(!groups.length)throw new Error('Pedido sem página para gerar a prévia.');
 const {page,products}=groups[0],sheet=primary(order,page,products,assets);sheet.fonts=assets.fonts;layoutCounter(sheet,groups.length);
 return sheetSVG(sheet,{placeholders:false});
}
function layoutGroups(order){return (order.pages||[]).flatMap(original=>{const page={...original,products:pieceFamilies(original).map(f=>{if(f.length===1)return f[0];const p={...f[0],quantity:f.reduce((n,p)=>n+Number(p.quantity||0),0),names:f.flatMap(p=>p.names||[]),grade:f.map(p=>(p.technical?.fit?fitLabel(p.technical.productCode,p.technical.fit).toUpperCase()+'\n':'')+p.grade).join('\n\n'),notes:f.map(p=>(p.technical?.fit?fitLabel(p.technical.productCode,p.technical.fit)+': ':'')+(p.notes||'')).filter(Boolean).join('\n')};p.familyMembers=f;return p;})};const count=page.visual?.mode==='shared'?2:page.mode==='individual'?1:2;return (catalogSheetGroups(page)||Array.from({length:Math.ceil(page.products.length/count)},(_,i)=>page.products.slice(i*count,i*count+count))).map(products=>({page,products}));});}
export function buildSheets(order,assets={},options={}){
 if(!options.draft){const errors=catalogProblems(order,{release:true,parseGrade});if(errors.length)throw Error(errors.join(' '));}
 const result=[],groups=layoutGroups(order);for(const [index,{page,products}] of groups.entries()){const sourcePage=index+1,main=primary(order,page,products,assets,sourcePage);result.push(main,...listSheets(order,page,products,assets,sourcePage));const lines=main.extra.flatMap(t=>wrap(t,280,7.7));for(let start=0;start<lines.length;start+=66){const details=continuation(order,'DESENHO '+sourcePage+' · '+main.title,lines.slice(start,start+66),assets);details.kind='details';details.sourcePage=sourcePage;result.push(details);}}
 if(order.pages.some(page=>page.products.some(p=>p.technical))){const lines=productionSummary(order,parseGrade).flatMap(g=>[g.product,...g.rows.map(r=>r.size+' = '+r.quantity),'']);for(let start=0;start<lines.length;start+=66){const summary=continuation(order,'RESUMO GERAL DE PRODUÇÃO · KITS E AVULSOS SOMADOS',lines.slice(start,start+66),assets);summary.kind='summary';summary.title='Resumo geral de produção';result.push(summary);}}
 result.forEach(p=>{p.fonts=assets.fonts;layoutCounter(p,groups.length);});return result;
}
// Printed sheets define their own paint; UI icon styles must not outline the text.
export function sheetSVG(sheet,{placeholders=true}={}){const clips=[];const body=sheet.ops.map((o,index)=>{
 const clipped=html=>{if(!o.clip)return html;const id='clip-'+index,c=o.clip;clips.push(`<clipPath id="${id}"><rect x="${c.x}" y="${c.y}" width="${c.w}" height="${c.h}"/></clipPath>`);return `<g clip-path="url(#${id})">${html}</g>`;};
 if(o.kind==='rect')return clipped(`<rect x="${o.x}" y="${o.y}" width="${o.w}" height="${o.h}" rx="${o.r||0}" fill="${o.fill}" stroke="${o.stroke}" stroke-width=".55"/>`);
 if(o.kind==='line')return clipped(`<line x1="${o.x}" y1="${o.y}" x2="${o.x2}" y2="${o.y2}" stroke="${o.color}" stroke-width="${o.width}"/>`);
 if(o.kind==='text')return clipped(`<text x="${o.x}" y="${o.y}"${o.align==='right'?' text-anchor="end"':''} font-size="${o.size}" fill="${o.color}" font-weight="${o.bold?700:400}">${esc(o.text)}</text>`);
 if(o.kind==='image')return clipped(`<image href="${esc(o.src)}" xlink:href="${esc(o.src)}" x="${o.x}" y="${o.y}" width="${o.w}" height="${o.h}" preserveAspectRatio="xMidYMid meet"/>`);
 if(o.kind==='placeholder'&&placeholders){const cx=o.x+o.w/2,scale=Math.min(o.w/190,o.h/220);return `<g transform="translate(${cx-80*scale},${o.y+10}) scale(${scale})" opacity=".28"><path d="M50 12 10 36 25 77 45 66 45 194 122 194 122 66 142 77 157 36 116 12C106 35 63 35 50 12Z" fill="#f1f2f4" stroke="#7a8391" stroke-width="1.4"/><path d="M50 12Q83 40 116 12" fill="none" stroke="#7a8391"/><text x="83" y="112" text-anchor="middle" font-size="9">MOCKUP</text><text x="83" y="126" text-anchor="middle" font-size="8">${esc(o.label)}</text></g>`;}
 return '';}).join('');const fonts=sheet.fonts?`<defs><style>@font-face{font-family:AtlasPedido;src:url('${sheet.fonts.regular}')}@font-face{font-family:AtlasPedido;src:url('${sheet.fonts.bold}');font-weight:700}</style></defs>`:'';return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 ${PAPER.width} ${PAPER.height}" role="img" aria-label="Pedido A4 horizontal · ${esc(sheet.title)}" style="font-family:${sheet.fonts?'AtlasPedido':'Arial,Helvetica,sans-serif'};fill:${C.ink};stroke:none">${fonts}<defs>${clips.join('')}</defs>${body}</svg>`;}
function rgb(hex,PDF){return PDF.rgb(...[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)/255));}
export async function createPDF(sheets,PDF,fonts=null){
 const doc=await PDF.PDFDocument.create();if(fonts)doc.registerFontkit(fonts.fontkit);const normal=await doc.embedFont(fonts?fonts.regular:PDF.StandardFonts.Helvetica,{subset:Boolean(fonts)}),bold=await doc.embedFont(fonts?fonts.bold:PDF.StandardFonts.HelveticaBold,{subset:Boolean(fonts)}),cache=new Map();
 doc.setTitle('ATLAS · Pedido de produção');doc.setCreator('ATLAS Uniform Studio');
 function printable(text,font){try{font.encodeText(text);return text;}catch{throw new Error('Um texto contém um caractere incompatível com a fonte do PDF. Use o SVG editável para preservar esse texto.');}}
 for(const sheet of sheets){const page=doc.addPage([PAPER.width,PAPER.height]);for(const o of sheet.ops){
  if(o.clip)page.pushOperators(PDF.pushGraphicsState(),PDF.rectangle(o.clip.x,PAPER.height-o.clip.y-o.clip.h,o.clip.w,o.clip.h),PDF.clip(),PDF.endPath());
  if(o.kind==='rect')page.drawRectangle({x:o.x,y:PAPER.height-o.y-o.h,width:o.w,height:o.h,...(o.fill!=='none'?{color:rgb(o.fill,PDF)}:{}),...(o.stroke!=='none'?{borderColor:rgb(o.stroke,PDF),borderWidth:.55}:{})});
  else if(o.kind==='line')page.drawLine({start:{x:o.x,y:PAPER.height-o.y},end:{x:o.x2,y:PAPER.height-o.y2},color:rgb(o.color,PDF),thickness:o.width});
  else if(o.kind==='text'){const font=o.bold?bold:normal,text=printable(o.text,font);page.drawText(text,{x:o.x-(o.align==='right'?font.widthOfTextAtSize(text,o.size):0),y:PAPER.height-o.y,size:o.size,font,color:rgb(o.color,PDF)});}
  else if(o.kind==='image'){let img=cache.get(o.src);if(!img){const bytes=Uint8Array.from(atob(o.src.split(',')[1]),c=>c.charCodeAt(0));img=o.src.startsWith('data:image/png')?await doc.embedPng(bytes):await doc.embedJpg(bytes);cache.set(o.src,img);}const scale=Math.min(o.w/img.width,o.h/img.height),w=img.width*scale,h=img.height*scale;page.drawImage(img,{x:o.x+(o.w-w)/2,y:PAPER.height-o.y-h-(o.h-h)/2,width:w,height:h});}
  if(o.clip)page.pushOperators(PDF.popGraphicsState());
 }}return doc.save();
}
