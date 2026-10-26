import test from 'node:test';
import assert from 'node:assert/strict';
import {placeTutorialCard,readTutorialChoice,writeTutorialChoice} from '../public/simulador/tutorial.js';

const overlaps=(a,b)=>a.left<b.right&&a.right>b.left&&a.top<b.bottom&&a.bottom>b.top;
test('tutorial cards remain readable beside highlighted tools and do not cover targets when space is available',()=>{
 const viewport={width:1366,height:936},card={width:360,height:390};
 for(const target of [{left:335,top:200,right:500,bottom:445},{left:1160,top:205,right:1340,bottom:590},{left:1190,top:18,right:1345,bottom:60}]){
  const result=placeTutorialCard(target,card,viewport);assert.notEqual(result.side,'overlay');assert.equal(overlaps(target,{...result,right:result.left+result.width,bottom:result.top+result.height}),false);assert.ok(result.left>=16&&result.top>=16&&result.left+result.width<=viewport.width-16&&result.top+result.height<=viewport.height-16);
 }
});
test('narrow and short screens keep navigation inside the viewport; missing targets center the explanation',()=>{
 for(const viewport of [{width:360,height:780},{width:320,height:480},{width:640,height:360}]){
  const result=placeTutorialCard({left:16,top:60,right:viewport.width-16,bottom:viewport.height-60},{width:360,height:500},viewport);assert.ok(result.left>=16&&result.top>=16);assert.ok(result.left+result.width<=viewport.width-16);assert.ok(result.top+result.height<=viewport.height-16);
 }
 const centered=placeTutorialCard(null,{width:360,height:300},{width:1000,height:700});assert.equal(centered.side,'center');assert.equal(centered.left,320);assert.equal(centered.top,200);
});
test('tutorial choices persist separately by account and unavailable browser storage cannot interrupt the editor',()=>{
 const values=new Map(),storage={getItem:key=>values.get(key)??null,setItem:(key,value)=>values.set(key,value)};
 assert.equal(readTutorialChoice(storage,'guest'),null);assert.equal(writeTutorialChoice(storage,'guest','dismissed'),true);assert.equal(readTutorialChoice(storage,'guest'),'dismissed');assert.equal(readTutorialChoice(storage,'account'),null);writeTutorialChoice(storage,'account','completed');assert.equal(readTutorialChoice(storage,'account'),'completed');assert.equal(readTutorialChoice(storage,'guest'),'dismissed');
 assert.equal(writeTutorialChoice(storage,'guest','invalid'),false);values.set('invalid','bad-data');assert.equal(readTutorialChoice(storage,'invalid'),null);
 const blocked={getItem(){throw Error('blocked');},setItem(){throw Error('quota');}};assert.equal(readTutorialChoice(blocked,'key'),null);assert.equal(writeTutorialChoice(blocked,'key','started'),false);assert.equal(readTutorialChoice(null,'key'),null);assert.equal(writeTutorialChoice(null,'key','completed'),false);
});
