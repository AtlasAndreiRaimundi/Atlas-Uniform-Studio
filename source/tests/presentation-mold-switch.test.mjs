import {test} from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
import {moldCollection,collectionMolds,moldOptionName} from '../public/mold-collections.js';
import {compatibleTemplateArt,templateFamily} from '../public/template-family.js';
const source=(await readFile(new URL('../public/project-session.js',import.meta.url),'utf8')).replace(/^import .*;\n/gm,'').replace('export function createProjectSession','function createProjectSession');
async function setup(){
 const elements=new Map();class El{value='';hidden=true;disabled=false;children=[];handlers={};classList={add(){},toggle(){}};firstChild={textContent:''};append(e){this.children.push(e)}replaceChildren(){this.children=[]}prepend(e){this.children.unshift(e)}addEventListener(n,f){this.handlers[n]=f}setAttribute(){}removeAttribute(){}focus(){}async change(value){this.value=value;await this.handlers.change?.()}}
 const el=s=>{if(!elements.has(s))elements.set(s,new El());return elements.get(s)};
 let project={id:'p',name:'Meu projeto',clientName:'Cliente',templateId:'kit',version:1,hasMap:true,mapName:'original.png',mapUrl:'/original.png',visuals:{},presentation:{},updatedAt:'2026-10-28T12:00:00Z'};
 const templates={kit:{id:'kit',name:'KIT',category:'conjunto'},shirt:{id:'shirt',baseTemplateId:'kit',name:'CAMISETA',category:'camiseta'},other:{id:'other',name:'OUTRO',category:'camiseta'},polo:{id:'polo',name:'POLO',category:'camiseta'}};
 const calls=[],messages=[],saved=[];let fail=false;
 const viewer={configureTemplate(){},setVisuals(){},setPresentation(){},getVisuals:()=>({}),getPresentation:()=>({}),isReady:()=>true,canSwitchTemplate:()=>true,replaceTemplate:async(t,keep)=>{calls.push([t.id,keep]);if(fail)throw Error('Falha de rede');},loadMap:async()=>true,toast:m=>messages.push(m),thumbnail:async()=>null};
 const fetch=async(path,options={})=>{
  if(path==='/original.png')return {ok:true,blob:async()=>new Blob(['art']),headers:{get:()=> 'image/png'}};
  let data={};if(path==='/api/projects/p'&&options.method==='PUT'){const input=JSON.parse(options.body.get('metadata'));saved.push({input,map:options.body.get('map')});project={...project,...input,version:project.version+1};data={project};}
  else if(path==='/api/projects/p')data={project};else if(path==='/api/projects/p/template')data={template:templates.kit};else if(path==='/api/profile')data={profile:{displayName:'Designer'}};else if(path==='/api/templates')data={templates:Object.values(templates)};else if(path.startsWith('/api/templates/'))data={template:templates[path.split('/').at(-1)]};else data={lists:[],orders:[]};
  return {ok:true,status:200,json:async()=>data};
 };
 const context={URL,URLSearchParams,FormData,File,Blob,fetch,Date,console,compatibleTemplateArt,templateFamily,moldCollection,collectionMolds,moldOptionName,location:{search:'?project=p',origin:'https://example.test'},window:{top:{location:{}},addEventListener(){}},document:{querySelector:el,createElement:()=>new El(),addEventListener(){},body:{classList:{add(){}}}},createWorkflowGuide:()=>({update(){},hide(){}}),workflowOrders:async()=>[],linkedWorkflowOrders:()=>[],workflowRoute(){},canAttachToOrder(){},setInterval(){},navigator:{}};
 const create=vm.runInNewContext(source+'\ncreateProjectSession',context),session=create(viewer);await session.ready;await new Promise(resolve=>setImmediate(resolve));
 return {el,session,calls,saved,messages,setFail:value=>{fail=value}};
}
test('live picker preserves art for explicit variants, restores art when returning and saves the chosen mold in the same project',async()=>{
 const t=await setup(),picker=t.el('#presentationMoldSelect');assert.equal(t.el('#projectMoldControl').hidden,false);assert.equal(picker.children.length,2);
 await picker.change('shirt');assert.deepEqual(t.calls[0],['shirt',true]);assert.equal(t.session.hasUnsavedChanges(),true);
 await picker.change('other');assert.deepEqual(t.calls[1],['other',false]);await assert.rejects(t.session.getMapFile(),/Carregue uma arte/);
 await picker.change('kit');assert.equal((await t.session.getMapFile()).name,'original.png');assert.equal(await t.session.ensureSaved(),true);assert.equal(t.saved.at(-1).input.templateId,'kit');assert.ok(t.saved.at(-1).map);assert.equal(t.session.hasUnsavedChanges(),false);
 await picker.change('other');await t.session.ensureSaved();assert.equal(t.saved.at(-1).input.templateId,'other');assert.equal(t.saved.at(-1).input.discardMap,true);assert.equal(t.saved.at(-1).map,null);
});
test('a failed live model load keeps the selected mold, existing art and clean saved state',async()=>{
 const t=await setup();t.setFail(true);await t.el('#presentationMoldSelect').change('other');assert.equal(t.el('#presentationMoldSelect').value,'kit');assert.equal(t.session.hasUnsavedChanges(),false);assert.equal((await t.session.getMapFile()).name,'original.png');assert.ok(t.messages.includes('Falha de rede'));assert.equal(t.el('#presentationMoldSelect').disabled,false);
});

test('Jogo and Passeio tabs filter choices without switching the live model until an option is chosen',async()=>{
 const t=await setup(),host=t.el('#presentationMoldCollections'),picker=t.el('#presentationMoldSelect');assert.equal(host.children.length,2);await host.children.find(b=>b.textContent==='PASSEIO').handlers.click();assert.equal(picker.value,'');assert.equal(t.calls.length,0);await picker.change('polo');assert.deepEqual(t.calls[0],['polo',false]);assert.equal(picker.value,'polo');await host.children.find(b=>b.textContent==='JOGO').handlers.click();assert.equal(picker.value,'');assert.equal(t.calls.length,1);await picker.change('kit');assert.equal(picker.value,'kit');assert.equal((await t.session.getMapFile()).name,'original.png');
});
