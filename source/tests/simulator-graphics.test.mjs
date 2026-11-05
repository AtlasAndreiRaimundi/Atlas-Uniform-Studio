import test from 'node:test';
import assert from 'node:assert/strict';
import {fitGraphicBox} from '../public/simulador/graphic-fit.js';
import {isShirtFillPanel,paintPanelBackground} from '../public/simulador/gradient.js';
import {eliteState} from '../public/simulador/elite.js';
import {validateSimulatorState} from '../lib/simulator-validation.mjs';
import {COLORS} from '../public/simulador/catalog.js';

test('grafismo vetorial mantém proporção física no filete estreito da manga',()=>{
 const panel={cm:{w:38,h:4}},box=fitGraphicBox(450,450,1024,1024,panel,2);
 assert.ok(box.w<=450&&box.h<=450);
 assert.ok(Math.abs((box.w/1024*panel.cm.w)/(box.h/1024*panel.cm.h)-2)<1e-10);
});
test('degradê fica apenas no tecido da camiseta e é validado ao salvar',()=>{
 const state=eliteState();
 const panel=state.panels.find(p=>p.id==='front'),detail=state.panels.find(p=>p.id==='sleeve-strip-7');
 assert.equal(isShirtFillPanel(panel),true);
 assert.equal(isShirtFillPanel(detail),false);
 const secondary=COLORS.find(c=>c.hex!==panel.color);
 panel.gradient={toColor:secondary.hex,toColorId:secondary.id,angle:90};
 const clean=validateSimulatorState(state);
 assert.deepEqual(clean.panels.find(p=>p.id==='front').gradient,panel.gradient);
 const calls=[],ctx={fillStyle:null,createLinearGradient(...args){calls.push(args);return {addColorStop(...s){calls.push(s);}}},fillRect(){}};
 paintPanelBackground(ctx,panel,100,100);assert.equal(calls.length,3);
 paintPanelBackground(ctx,detail,100,100);assert.equal(calls.length,3);
 detail.gradient=panel.gradient;assert.throws(()=>validateSimulatorState(state),{status:400});
});
