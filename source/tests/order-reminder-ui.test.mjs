import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import ts from 'typescript';

const source=await readFile(new URL('../app/order-reminder.tsx',import.meta.url),'utf8');
const compiled=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText;
async function reminderScreen(path,{deferred=false}={}){
 const url=new URL(path,'https://studio.example'),location={pathname:url.pathname,search:url.search},slots=[],calls=[],listeners={},intervals=[],dialog={open:false,showModal(){this.open=true;},close(){this.open=false;}};
 let cursor=0,changed=true,effects=[],respond,otherDialog=false;
 const hooks={useState(initial){const i=cursor++;if(!(i in slots))slots[i]=initial;return[slots[i],v=>{slots[i]=typeof v==='function'?v(slots[i]):v;changed=true;}];},useRef(initial){const i=cursor++;if(!(i in slots))slots[i]={current:initial};return slots[i];},useEffect(callback,deps){const i=cursor++,previous=slots[i];if(!previous||deps.some((v,n)=>v!==previous[n])){slots[i]=deps;effects.push(callback);}}};
 const jsx=(type,props)=>({type,props}),module={exports:{}},context=vm.createContext({module,exports:module.exports,URLSearchParams,location,window:{location,addEventListener:(name,fn)=>listeners[name]=fn,removeEventListener(){}},document:{visibilityState:'visible',querySelector:()=>otherDialog||dialog.open?{}:null,addEventListener:(name,fn)=>listeners[name]=fn,removeEventListener(){}},setInterval:fn=>{intervals.push(fn);return intervals.length;},clearInterval(){},require(name){if(name==='react')return hooks;if(name==='react/jsx-runtime')return {jsx,jsxs:jsx};if(name.endsWith('.css'))return {};throw Error(name);},fetch:async(path,options)=>{calls.push({path,options});if(deferred)await new Promise(resolve=>{respond=resolve;});return{ok:true,json:async()=>({show:true,orders:[{id:'ORDER',number:'0123',client:'Equipe'}]})};}});
 vm.runInContext(compiled,context);
 function render(){changed=false;cursor=0;const node=module.exports.default();node.props.ref.current=dialog;const pending=effects;effects=[];pending.forEach(fn=>fn());}
 async function flush(){for(let i=0;i<8;i++){if(changed)render();await new Promise(setImmediate);}}
 await flush();return {location,calls,dialog,flush,focus:()=>listeners.focus(),resolve:()=>respond?.(),setOtherDialog:value=>{otherDialog=value;},tick:()=>intervals[0]?.()};
}

test('the automatic conference reminder never interrupts an order, list or presentation being prepared',async()=>{
 for(const path of ['/pedidos','/organizador?new=1','/studio/PROJECT','/projects?create=1']){
  const screen=await reminderScreen(path);screen.focus();screen.tick();await screen.flush();assert.equal(screen.calls.length,0,path);assert.equal(screen.dialog.open,false,path);
 }
 const browsing=await reminderScreen('/acompanhamento');assert.equal(browsing.calls.length,1);assert.equal(browsing.dialog.open,true,'the reminder remains available when browsing the order queue');
});

test('a delayed reminder response cannot open over a newly started order or another dialog',async()=>{
 const editing=await reminderScreen('/projects',{deferred:true});assert.equal(editing.calls.length,1);editing.location.pathname='/pedidos';editing.resolve();await editing.flush();assert.equal(editing.dialog.open,false);assert.ok(editing.calls.every(call=>!call.options?.method),'deferring the reminder does not dismiss it on the server');
 const busy=await reminderScreen('/projects',{deferred:true});busy.setOtherDialog(true);busy.resolve();await busy.flush();assert.equal(busy.dialog.open,false);
});
