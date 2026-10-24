import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createExportMenu} from '../public/export-menu.js';

test('the real export menu previews the chosen video format, passes its custom background to export and keeps image export independent',async()=>{
 const prior={document:globalThis.document,window:globalThis.window,Image:globalThis.Image,VideoEncoder:globalThis.VideoEncoder,VideoFrame:globalThis.VideoFrame,setTimeout:globalThis.setTimeout,clearTimeout:globalThis.clearTimeout};
 const nodes=new Map(),choices=[],timers=new Map();let timerId=0;
 class Element{
  constructor(tag='div'){this.tagName=tag.toUpperCase();this.value='';this.dataset={};this.listeners={};this.open=false;this.style={setProperty:(key,value)=>{this.style[key]=value;}};this.classList={toggle(){}};}
  setAttribute(){}removeAttribute(){}focus(){}showModal(){this.open=true;}close(){this.open=false;}
  addEventListener(type,handler){(this.listeners[type]||=[]).push(handler);}
  async emit(type,event={target:this}){for(const handler of this.listeners[type]||[])await handler(event);}
  querySelectorAll(){return [...nodes.values()].filter(n=>['BUTTON','INPUT','SELECT'].includes(n.tagName));}
 }
 const html=await readFile(new URL('../public/viewer.html',import.meta.url),'utf8');
 for(const [,tag,attributes,id]of html.matchAll(/<(\w+)([^>]*\bid="([^"]+)"[^>]*)>/g))nodes.set('#'+id,new Element(tag));
 for(const [,id,content]of html.matchAll(/<select id="([^"]+)"[^>]*>(.*?)<\/select>/gs)){const options=[...content.matchAll(/<option value="([^"]+)"([^>]*)>/g)];nodes.get('#'+id).value=(options.find(o=>o[2].includes('selected'))||options[0])?.[1]||'';}
 for(const mode of ['image','video','link']){const e=new Element('button');e.dataset.exportMode=mode;choices.push(e);}
 globalThis.document={querySelector:selector=>{assert.ok(nodes.has(selector),'export control exists: '+selector);return nodes.get(selector);},querySelectorAll:selector=>selector==='[data-export-mode]'?choices:[]};
 globalThis.window={addEventListener(){}};globalThis.Image=class{naturalWidth=1920;naturalHeight=1080;async decode(){}};globalThis.VideoEncoder=class{};globalThis.VideoFrame=class{};
 globalThis.setTimeout=fn=>{timers.set(++timerId,fn);return timerId;};globalThis.clearTimeout=id=>timers.delete(id);
 const previews=[],exported=[],viewer={isReady:()=>true,hasMap:()=>true,rotate(){},previewVideo:async request=>{previews.push(request);return new Blob(['preview'],{type:'image/png'});},previewExport:async()=>new Blob(['image'],{type:'image/png'})},session={getProject:()=>({id:'P',name:'Equipe A',version:1,hasMap:true}),hasUnsavedChanges:()=>false};
 try{
  const menu=createExportMenu(viewer,session,{onExport:async request=>exported.push(request),onCreateLink(){},onManage(){}}),get=id=>nodes.get('#'+id);
  menu.open('video');get('exportVideoAspect').value='9:16';get('exportVideoResolution').value='720p';get('exportVideoSeconds').value='30';await get('exportVideoAspect').emit('change');
  assert.match(get('exportVideoDimensions').textContent,/720 × 1280/);assert.match(get('exportPreviewCaption').textContent,/30 segundos · 60 fps/);
  const file=new File(['test image'],'Quadra.png',{type:'image/png'});get('exportVideoBackground').files=[file];await get('exportVideoBackground').emit('change');assert.match(get('exportVideoBackgroundInfo').textContent,/Quadra.png/);
  await [...timers.values()].at(-1)();assert.equal(previews.at(-1).aspect,'9:16');assert.ok(previews.at(-1).backgroundImage instanceof Image);
  await get('exportPrimaryBtn').emit('click');assert.equal(exported.length,1);assert.equal(exported[0].seconds,30);assert.equal(exported[0].width,720);assert.equal(exported[0].height,1280);assert.equal(exported[0].motion,'smooth');assert.ok(exported[0].backgroundImage);
  await get('removeVideoBackground').emit('click');assert.match(get('exportVideoBackgroundInfo').textContent,/20 MB/);
  menu.close();menu.open('image');assert.equal(get('exportVideoOptions').hidden,true);await get('exportPrimaryBtn').emit('click');assert.equal(exported[1].mode,'image');assert.equal(exported[1].format,'production');assert.equal(exported[1].fileType,'png');assert.equal(exported[1].backgroundImage,undefined);menu.close();
 }finally{Object.assign(globalThis,prior);}
});
