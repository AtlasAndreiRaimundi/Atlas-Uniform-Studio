import {newRecordId} from './record-id.js';
export const pieceFamilyKey=p=>p.technical?p.technical.productCode+'|'+p.technical.designId+'|'+p.technical.sleeveLength:p.id;
export function pieceFamilies(page){const groups=new Map();for(const p of page.products){const key=pieceFamilyKey(p);if(!groups.has(key))groups.set(key,[]);groups.get(key).push(p);}return [...groups.values()];}
export function syncApplicationArrows(page,product){
 const family=page.products.filter(p=>pieceFamilyKey(p)===pieceFamilyKey(product)),ids=new Set(family.map(p=>p.id)),desired=[];
 const seen=new Set();for(const member of family)for(const a of member.technical?.applications||[])for(let i=0;i<a.perUnit;i++){const key=a.role+'|'+a.type+'|'+i;if(!seen.has(key)){seen.add(key);desired.push({applicationId:a.id,applicationSlot:i});}}
 const old=page.annotations||[],retained=old.filter(a=>!ids.has(a.productId)||!a.applicationId),linked=[];
 if(retained.length+desired.length>80)throw Error('As aplicações excedem o limite de 80 apontamentos desta página.');
 for(const [index,key]of desired.entries()){const app=family.flatMap(p=>p.technical?.applications||[]).find(a=>a.id===key.applicationId),previous=old.find(a=>ids.has(a.productId)&&a.applicationId===key.applicationId&&a.applicationSlot===key.applicationSlot);linked.push({...previous,id:previous?.id||newRecordId(),type:'callout',productId:family[0].id,...key,text:[app.type,app.role,app.position].filter(Boolean).join(' · ').slice(0,400),x:previous?.x??30+(index%3)*190,y:previous?.y??170+Math.floor(index/3)*35,x2:previous?.x2??160+(index%3)*120,y2:previous?.y2??260+Math.floor(index/3)*35,color:previous?.color||'#235394',size:previous?.size||8,width:previous?.width||1});}
 page.annotations=[...retained,...linked];return linked;
}
export function syncFamilyCharacteristics(page,source){
 const keys=['model','fabricColor','detailColor','print','images','imageTransforms','projectRef','components','notes'];
 const technical=['fabricId','collarModel','collarFinish','ribanaId','vConstruction','sleeveLength','sleeveFinish','filetMaterial','filetException','hasSideCut','sideCutFabric','hemShape','hemFinish','drawstringColor'];
 for(const p of page.products.filter(p=>p!==source&&pieceFamilyKey(p)===pieceFamilyKey(source))){for(const key of keys)if(source[key]!==undefined)p[key]=structuredClone(source[key]);p.fabric=source.fabric;for(const key of technical)p.technical[key]=structuredClone(source.technical[key]);}
}
