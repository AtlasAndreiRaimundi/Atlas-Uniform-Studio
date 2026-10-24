import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import ts from 'typescript';
import * as navigation from '../public/studio-navigation.js';

// Exercise the actual TSX and its effects/handlers without a browser. Native
// dialog layout and focus still require a separate visual browser check.
async function trackingScreen({search='',initialStages=['sent','checked','accepted']}={}){
 const records=new Map(initialStages.map((stage,index)=>{const id='ORDER-'+index;return [id,{id,title:'Uniforme '+index,number:'000'+index+'-MNZ',client:'Cliente '+index,version:1,tracking:{stage,revision:1,pieces:40,events:[]}}];})),calls=[],slots=[];
 let cursor=0,changed=true,tree,effects=[];
 const hooks={
  useState(initial){const key=cursor++;if(!(key in slots))slots[key]=typeof initial==='function'?initial():initial;return [slots[key],value=>{const next=typeof value==='function'?value(slots[key]):value;if(!Object.is(slots[key],next)){slots[key]=next;changed=true;}}];},
  useRef(initial){const key=cursor++;if(!(key in slots))slots[key]={current:initial};return slots[key];},
  useEffect(callback,deps){const key=cursor++,previous=slots[key];if(!previous||deps.some((value,i)=>!Object.is(value,previous[i]))){slots[key]=deps;effects.push(callback);}}
 };
 const jsx=(type,props,key)=>({type,props:props||{},key}),module={exports:{}},context=vm.createContext({module,exports:module.exports,URLSearchParams,location:{search},setTimeout(){},require(name){if(name==='react')return hooks;if(name==='react/jsx-runtime')return {jsx,jsxs:jsx,Fragment:'fragment'};if(name==='lucide-react')return new Proxy({},{get:(_,key)=>'icon-'+String(key)});if(name==='../studio-navigation'||name==='../brand')return new Proxy({},{get:()=>()=>null});if(name==='@/public/studio-navigation.js')return navigation;if(name.endsWith('.css'))return {};throw new Error('Unexpected module '+name);},fetch:async(path,options={})=>{
  calls.push({path,options});let status=200,data;
  if(path.startsWith('/api/order-tracking?')){const factory=path.includes('factory=1');data={orders:[...records.values()].filter(order=>!factory||['sent','accepted','returned'].includes(order.tracking.stage)),hasMore:false,factoryAccess:true,isAdmin:false};}
  else if(options.method==='DELETE'){
   const key=decodeURIComponent(path.split('/').at(-1)),order=records.get(key),input=JSON.parse(options.body);
   if(!order){status=404;data={error:'Pedido não encontrado.'};}
   else if(input.version!==order.version){status=409;data={error:'Este pedido mudou. Feche a confirmação e selecione o pedido novamente antes de excluir.'};}
   else if(order.tracking.stage==='accepted'){status=400;data={error:'Pedidos aceitos pela fábrica não podem ser excluídos.'};}
   else{records.delete(key);data={deleted:true};}
  }else throw new Error('Unexpected request '+path);
  return {ok:status===200,status,json:async()=>structuredClone(data)};
 }});
 const source=(await readFile(new URL('../app/acompanhamento/tracking-panel.tsx',import.meta.url),'utf8')).replace(/import ThemeSelector from '[^']+';/,"const ThemeSelector = () => null;");const compiled=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText;vm.runInContext(compiled,context);
 function* walk(node){if(Array.isArray(node)){for(const child of node)yield*walk(child);}else if(node&&typeof node==='object'&&node.props){yield node;yield*walk(node.props.children);}}
 function text(node){if(Array.isArray(node))return node.map(text).join('');if(node&&typeof node==='object')return text(node.props?.children);return typeof node==='string'||typeof node==='number'?String(node):'';}
 function render(){changed=false;cursor=0;tree=module.exports.default();for(const node of walk(tree))if(node.type==='dialog'&&node.props.ref&&!node.props.ref.current)node.props.ref.current={open:false,showModal(){this.open=true;},close(){this.open=false;}};const pending=effects;effects=[];pending.forEach(callback=>callback());}
 async function flush(){for(let i=0;i<15;i++){if(changed)render();await new Promise(setImmediate);}if(changed)render();}
 const all=(type,root)=>[...walk(root===undefined?tree:root)].filter(node=>node.type===type),findButton=(label,root)=>{const found=all('button',root).find(node=>text(node)===label);assert.ok(found,'button exists: '+label);return found;},row=number=>{const found=all('tr').find(node=>text(node).includes(number));assert.ok(found,'order row exists: '+number);return found;},click=async button=>{assert.ok(!button.props.disabled,'button is enabled');const pending=button.props.onClick();await flush();await pending;await flush();};
 await flush();return {context,records,calls,flush,all,text,findButton,row,click,dialog:()=>all('dialog')[0]};
}

test('the tracking row offers deletion for sent orders, names the target and cancellation sends nothing',async()=>{
 const screen=await trackingScreen(),{findButton,row,click,dialog,text,calls}=screen;
 assert.match(text(row('0000-MNZ')),/Uniforme 0/);const preview=screen.all('img',row('0000-MNZ'))[0];assert.equal(preview.props.src,'/api/order-tracking/ORDER-0/thumbnail?version=1');assert.match(preview.props.alt,/Uniforme 0/);
 await click(findButton('Excluir pedido',row('0000-MNZ')));assert.equal(dialog().props.ref.current.open,true);assert.match(text(dialog()),/0000-MNZ.*Cliente 0/);assert.match(text(dialog()),/removido da fila de recebimento/);assert.equal(screen.all('textarea',dialog()).length,0);
 await click(findButton('Cancelar',dialog()));assert.equal(dialog().props.ref.current.open,false);assert.equal(calls.some(call=>call.options.method==='DELETE'),false);assert.equal(screen.records.size,3);
 assert.equal(findButton('Excluir pedido',row('0002-MNZ')).props.disabled,true);
 await click(findButton('Fila da fábrica'));assert.equal(screen.all('button').filter(button=>text(button)==='Excluir pedido').length,0,'factory permission cannot delete other designers’ orders');assert.match(screen.all('img')[0].props.src,/factory=1/);
});

test('confirmation deletes precisely one sent order, blocks duplicate clicks and updates the rows and counters',async()=>{
 const {context,records,calls,findButton,row,click,dialog,flush,all,text}=await trackingScreen();await click(findButton('Excluir pedido',row('0000-MNZ')));
 const fetch=context.fetch;let complete;context.fetch=async(path,options)=>{if(options?.method==='DELETE')await new Promise(resolve=>{complete=resolve;});return fetch(path,options);};
 const confirm=findButton('Confirmar exclusão',dialog()),removing=confirm.props.onClick();await confirm.props.onClick();await flush();assert.equal(findButton('Excluindo…',dialog()).props.disabled,true);assert.equal(findButton('Cancelar',dialog()).props.disabled,true);let prevented=false;dialog().props.onCancel({preventDefault(){prevented=true;}});assert.equal(prevented,true);complete();await removing;await flush();
 const deleted=calls.filter(call=>call.options.method==='DELETE');assert.equal(deleted.length,1);assert.equal(deleted[0].path,'/api/production-orders/ORDER-0');assert.deepEqual(JSON.parse(deleted[0].options.body),{version:1});assert.equal(records.has('ORDER-0'),false);assert.equal(records.size,2);assert.ok(!all('tr').some(node=>text(node).includes('0000-MNZ')));assert.match(text(all('button').find(button=>text(button).includes('Aguardando aceite'))),/^0/);assert.equal(dialog().props.ref.current.open,false);assert.ok(all('p').some(node=>node.props.role==='status'&&text(node).includes('0000-MNZ excluído')));
});

test('a stale confirmation cannot delete a newly accepted order and refresh requires a new selection',async()=>{
 const {records,calls,findButton,row,click,dialog,all,text}=await trackingScreen();await click(findButton('Excluir pedido',row('0000-MNZ')));records.get('ORDER-0').version++;records.get('ORDER-0').tracking.stage='accepted';
 await click(findButton('Confirmar exclusão',dialog()));assert.equal(records.has('ORDER-0'),true);assert.equal(findButton('Confirmar exclusão',dialog()).props.disabled,true);assert.ok(all('p',dialog()).some(node=>node.props.role==='alert'&&text(node).includes('pedido mudou')));assert.equal(calls.filter(call=>call.options.method==='DELETE').length,1);
 await click(findButton('Atualizar painel e conferir novamente',dialog()));assert.equal(dialog().props.ref.current.open,false);assert.equal(findButton('Excluir pedido',row('0000-MNZ')).props.disabled,true);
});

test('a failed list refresh after deletion does not bring the deleted row back',async()=>{
 const {context,findButton,row,click,dialog,all,text}=await trackingScreen();await click(findButton('Excluir pedido',row('0000-MNZ')));const fetch=context.fetch;context.fetch=async(path,options)=>path.startsWith('/api/order-tracking?')?{ok:false,status:503,json:async()=>({error:'Atualização indisponível. Tente novamente.'})}:fetch(path,options);
 await click(findButton('Confirmar exclusão',dialog()));assert.ok(!all('tr').some(node=>text(node).includes('0000-MNZ')));assert.ok(all('p').some(node=>node.props.role==='status'&&text(node).includes('excluído')));assert.ok(all('p').some(node=>node.props.role==='alert'&&text(node).includes('Atualização indisponível')));
});


test('the approved-orders view includes checked, sent and accepted revisions and removes returned or unfinished orders',async()=>{
 const screen=await trackingScreen({search:'?status=approved',initialStages:['draft','checked','sent','accepted','returned']}),{all,text,records,findButton,click}=screen;
 const rows=()=>all('tr').map(text).join('\n');
 assert.ok(!rows().includes('0000-MNZ'));assert.ok(!rows().includes('0004-MNZ'));
 for(const number of ['0001-MNZ','0002-MNZ','0003-MNZ'])assert.ok(rows().includes(number));
 assert.ok(all('h2').some(node=>text(node)==='Pedidos aprovados'));
 assert.equal(all('select').find(node=>node.props['aria-label']==='Filtrar situação').props.value,'approved');
 records.get('ORDER-1').tracking.stage='returned';await click(findButton('Atualizar'));assert.ok(!rows().includes('0001-MNZ'),'a returned order needs another review before it appears again');
 await click(findButton('Meus pedidos'));assert.ok(rows().includes('0000-MNZ'));assert.ok(rows().includes('0004-MNZ'));
 const invalid=await trackingScreen({search:'?status=unknown'});assert.equal(invalid.all('tr').length,4,'unknown filters fall back to the complete list');
});
