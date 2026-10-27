import {newRecordId} from './record-id.js';
export const pieceFamilyKey=p=>p.technical?p.technical.productCode+'|'+p.technical.designId+'|'+p.technical.sleeveLength:p.id;
export function pieceFamilies(page){const groups=new Map();for(const p of page.products){const key=pieceFamilyKey(p);if(!groups.has(key))groups.set(key,[]);groups.get(key).push(p);}return [...groups.values()];}
export function applicationGroups(page,product){
 const family=page.products.filter(p=>pieceFamilyKey(p)===pieceFamilyKey(product)),groups=new Map();
 for(const p of family){const count=new Map();for(const app of p.technical?.applications||[]){const signature=app.role+'|'+app.type,index=count.get(signature)||0;count.set(signature,index+1);const key=signature+'|'+index;if(!groups.has(key))groups.set(key,[]);groups.get(key).push({product:p,app});}}
 return [...groups.values()];
}
export function syncConfirmedApplicationPositions(page){
 let changed=false;for(const family of pieceFamilies(page)){let offset=0;for(const group of applicationGroups(page,family[0])){const ids=new Set(group.map(x=>x.app.id)),notes=(page.annotations||[]).filter(n=>ids.has(n.applicationId)),max=Math.max(...group.map(x=>x.app.perUnit));
  const moved=notes.some(n=>{const index=offset+n.applicationSlot;return Number.isInteger(n.applicationSlot)&&[n.x!==30+(index%3)*190,n.y!==170+Math.floor(index/3)*35,n.x2!==160+(index%3)*120,n.y2!==260+Math.floor(index/3)*35].some(Boolean);});
  if(group.some(x=>x.app.position?.trim())||moved)for(const {app}of group)if(!app.position.trim()&&notes.length>=app.perUnit){app.position='Conforme seta no desenho';changed=true;}
  offset+=max;
 }}return changed;
}
export function syncApplicationArrows(page,product){
 const family=page.products.filter(p=>pieceFamilyKey(p)===pieceFamilyKey(product)),ids=new Set(family.map(p=>p.id)),old=page.annotations||[],retained=old.filter(a=>!ids.has(a.productId)||!a.applicationId),desired=[];
 for(const group of applicationGroups(page,product)){const aliases=new Set(group.map(x=>x.app.id)),existing=old.find(n=>aliases.has(n.applicationId)),app=group.find(x=>x.app.id===existing?.applicationId)?.app||group[0].app,max=Math.max(...group.map(x=>x.app.perUnit));if(!Number.isSafeInteger(max)||max<1||max>80)throw Error('Use até 80 aplicações por desenho.');for(let slot=0;slot<max;slot++)desired.push({app,aliases,slot});}
 if(retained.length+desired.length>80)throw Error('Use até 80 setas neste desenho.');
 const linked=desired.map(({app,aliases,slot},index)=>{const previous=old.find(a=>aliases.has(a.applicationId)&&a.applicationSlot===slot);return {...previous,id:previous?.id||newRecordId(),type:'callout',productId:family[0].id,applicationId:app.id,applicationSlot:slot,text:[app.type,app.role,app.position==='Conforme seta no desenho'?'':app.position].filter(Boolean).join(' · ').slice(0,400),x:previous?.x??30+(index%3)*190,y:previous?.y??170+Math.floor(index/3)*35,x2:previous?.x2??160+(index%3)*120,y2:previous?.y2??260+Math.floor(index/3)*35,color:previous?.color||'#235394',size:previous?.size||8,width:previous?.width||1};});
 page.annotations=[...retained,...linked];syncConfirmedApplicationPositions(page);return linked;
}
export function syncFamilyCharacteristics(page,source){
 const keys=['model','fabricColor','detailColor','print','images','imageTransforms','projectRef','components','notes'];
 const technical=['fabricId','collarModel','collarFinish','ribanaId','vConstruction','sleeveLength','sleeveFinish','filetMaterial','filetException','hasSideCut','sideCutFabric','hemShape','hemFinish','drawstringColor'];
 for(const p of page.products.filter(p=>p!==source&&pieceFamilyKey(p)===pieceFamilyKey(source))){for(const key of keys)if(source[key]!==undefined)p[key]=structuredClone(source[key]);p.fabric=source.fabric;for(const key of technical)p.technical[key]=structuredClone(source.technical[key]);}
}
