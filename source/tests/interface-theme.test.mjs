import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
import vm from 'node:vm';

const source=await readFile(new URL('../public/interface-theme.js',import.meta.url),'utf8');
function surface({saved=null,blocked=false}={}) {
  const events=new Map(),domEvents=new Map(),writes=[],messages=[],controls=[],meta={content:''};
  class Element {
    constructor(tag){this.tag=tag;this.children=[];this.listeners={};this.value='';}
    append(...children){this.children.push(...children);}
    setAttribute(name,value){this[name]=value;}
    addEventListener(name,fn){this.listeners[name]=fn;}
    querySelector(tag){return this.children.flatMap(x=>[x,...x.children]).find(x=>x.tag===tag);}
  }
  const host=new Element('div'),child={postMessage(data,origin){messages.push({data,origin});}},frame={contentWindow:child};
  const document={readyState:'loading',documentElement:{dataset:{}},querySelector:()=>meta,
    querySelectorAll(selector){if(selector==='iframe')return[frame];if(selector==='[data-static-theme-picker]')return[host];if(selector==='[data-static-theme-picker] select')return controls;throw Error(selector);},
    createElement:tag=>{const e=new Element(tag);if(tag==='select')controls.push(e);return e;},
    addEventListener:(name,fn)=>domEvents.set(name,fn)};
  const window={addEventListener(name,fn){const listeners=events.get(name)||[];listeners.push(fn);events.set(name,listeners);},dispatchEvent(event){for(const fn of events.get(event.type)||[])fn(event);}};window.parent=window;
  const localStorage={getItem(){if(blocked)throw Error('disabled');return saved;},setItem(key,value){if(blocked)throw Error('disabled');saved=value;writes.push({key,value});}};
  const context=vm.createContext({window,document,localStorage,location:{origin:'https://studio.example'},CustomEvent:class {constructor(type,options){this.type=type;this.detail=options.detail;}}});
  vm.runInContext(source,context);
  return {window,document,controls,writes,messages,child,meta,mount:()=>domEvents.get('DOMContentLoaded')(),emit:(type,event)=>window.dispatchEvent({type,...event}),reload:()=>surface({saved,blocked})};
}

test('the saved interface theme applies before the controls mount and the three choices persist across visits',()=>{
  const page=surface({saved:'gray'});assert.equal(page.document.documentElement.dataset.interfaceTheme,'gray');assert.equal(page.meta.content,'#50545a');assert.equal(page.controls.length,0);
  page.mount();const select=page.controls[0];assert.equal(select['aria-label'],'Tema da interface');assert.equal(select.children.map(x=>x.textContent).join(','),'Escuro,Cinza,Claro');assert.equal(select.value,'gray');
  let updates=0;page.window.addEventListener('studio-theme-change',()=>updates++);
  select.value='light';select.listeners.change();assert.equal(page.document.documentElement.dataset.interfaceTheme,'light');assert.equal(updates,1);assert.equal(page.writes[0].key,'meinerz.interface-theme');assert.equal(page.reload().window.StudioTheme.get(),'light');
  page.mount();assert.equal(page.controls.length,1,'the static selector is not duplicated');
});

test('separate screens synchronize valid themes and ignore unrelated messages or invalid stored values',()=>{
  const page=surface({saved:'invalid-theme'});page.mount();assert.equal(page.window.StudioTheme.get(),'dark');
  page.emit('storage',{key:'another.preference',newValue:'light'});assert.equal(page.window.StudioTheme.get(),'dark');
  page.emit('storage',{key:'meinerz.interface-theme',newValue:'gray'});assert.equal(page.controls[0].value,'gray');assert.equal(page.writes.length,0);
  page.emit('message',{origin:'https://other.example',source:page.child,data:{type:'meinerz-interface-theme',theme:'light'}});assert.equal(page.window.StudioTheme.get(),'gray');
  page.emit('message',{origin:'https://studio.example',source:{},data:{type:'meinerz-interface-theme',theme:'light'}});assert.equal(page.window.StudioTheme.get(),'gray');
  page.emit('message',{origin:'https://studio.example',source:page.child,data:{type:'meinerz-interface-theme',theme:'light'}});assert.equal(page.window.StudioTheme.get(),'light');
  assert.equal(page.messages.at(-1).origin,'https://studio.example');
  page.window.StudioTheme.set('unsupported');assert.equal(page.window.StudioTheme.get(),'light');
  page.emit('storage',{key:'meinerz.interface-theme',newValue:null});assert.equal(page.window.StudioTheme.get(),'dark');
});

test('a browser that blocks preference storage can still switch the interface and notify its embedded screen',()=>{
  const page=surface({blocked:true});page.mount();assert.doesNotThrow(()=>page.window.StudioTheme.set('light'));assert.equal(page.controls[0].value,'light');assert.equal(page.document.documentElement.dataset.interfaceTheme,'light');assert.equal(page.messages.at(-1).data.theme,'light');
});

const require=createRequire(import.meta.url),postcss=createRequire(require.resolve('vite'))('postcss');
const luminance=hex=>hex.slice(1).match(/../g).map(x=>parseInt(x,16)/255).map(x=>x<=.04045?x/12.92:((x+.055)/1.055)**2.4).reduce((s,x,i)=>s+x*[.2126,.7152,.0722][i],0);
function contrast(a,b){const x=luminance(a),y=luminance(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05);}
test('all themes keep text, labels, actions and alerts retain at least 4.5:1 contrast on the interface surfaces',async()=>{
  const css=postcss.parse(await readFile(new URL('../public/interface-theme.css',import.meta.url),'utf8'));
  for(const theme of ['dark','gray','light']){
    const rule=css.nodes.find(n=>n.selector?.split(/,\s*/).includes(`:root[data-interface-theme="${theme}"]`)),tokens=Object.fromEntries(rule.nodes.filter(n=>n.type==='decl').map(n=>[n.prop.slice(5),n.value]));
    for(const foreground of ['text','muted','accent','danger','warning','success'])for(const background of ['bg','nav','panel','input','raised','hover','selected','row'])assert.ok(contrast(tokens[foreground],tokens[background])>=4.5,`${theme}: ${foreground} on ${background}`);
    for(const kind of ['danger','warning','success'])assert.ok(contrast(tokens[kind],tokens[kind+'-bg'])>=4.5,`${theme}: ${kind} alert`);
  }
});
