import test from 'node:test';
import assert from 'node:assert/strict';
import {historyShortcut,handleHistoryShortcut} from '../public/simulador/history-shortcuts.js';
import {History} from '../public/simulador/core.js';
const event=(extra={})=>({key:'z',ctrlKey:true,target:{tagName:'CANVAS'},preventDefault(){this.prevented=true;},...extra});
test('Ctrl/Cmd shortcuts undo and redo from canvas and nontext controls',()=>{
 assert.equal(historyShortcut(event()),'undo');assert.equal(historyShortcut(event({ctrlKey:false,metaKey:true})),'undo');
 assert.equal(historyShortcut(event({shiftKey:true})),'redo');assert.equal(historyShortcut(event({key:'y'})),'redo');
 for(const type of ['range','checkbox','radio'])assert.equal(historyShortcut(event({target:{tagName:'INPUT',type}})),'undo');
});
test('typing, editable descendants, composition, modals and active operations keep native behavior',()=>{
 for(const target of [{tagName:'INPUT',type:'text'},{tagName:'INPUT',type:'number'},{tagName:'TEXTAREA'},{tagName:'SELECT'},{isContentEditable:true},{closest:()=>({})}])assert.equal(historyShortcut(event({target})),null);
 assert.equal(historyShortcut(event({composedPath:()=>[{},{isContentEditable:true}]})),null);
 for(const extra of [{isComposing:true},{defaultPrevented:true},{altKey:true},{ctrlKey:false}])assert.equal(historyShortcut(event(extra)),null);
 assert.equal(historyShortcut(event(),{blocked:true}),null);assert.equal(historyShortcut(event(),{modal:true}),null);
});
test('one keypress restores a full editing step; redo and branching preserve exact snapshots',()=>{
 const initial={panels:[{color:'white',layers:[]},{color:'white',layers:[]}]},h=new History(initial);let current=structuredClone(initial);
 current.panels[0].color='red';h.push(current);
 current.panels[0].layers.push({id:'graphic',x:.1});current.panels[1].layers.push({id:'mirror',x:.9});h.push(current);
 // One completed drag is one snapshot, including its mirrored changes.
 current.panels[0].layers[0].x=.3;current.panels[1].layers[0].x=.7;h.push(current);
 const apply=action=>{current=h[action]();};const e=event();assert.equal(handleHistoryShortcut(e,{},apply),true);assert.equal(e.prevented,true);
 assert.equal(current.panels[0].layers[0].x,.1);assert.equal(current.panels[1].layers[0].x,.9);
 handleHistoryShortcut(event({key:'y'}),{},apply);assert.equal(current.panels[0].layers[0].x,.3);
 handleHistoryShortcut(event(),{},apply);current.panels[0].color='blue';h.push(current);assert.deepEqual(h.redo(),current);
 const before=h.index;handleHistoryShortcut(event({repeat:true}),{},apply);assert.equal(h.index,before);
});
