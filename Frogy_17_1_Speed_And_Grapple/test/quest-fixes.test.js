'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const motion=require('../public/movement.js'),controls=require('../public/controls.js');
const game=fs.readFileSync(path.join(__dirname,'../public/game.js'),'utf8');
const features=fs.readFileSync(path.join(__dirname,'../public/features.js'),'utf8');
// A tracked controller near waist height must render at WAIST height, not floor height.
const hand=motion.renderHand([-.4,1.03,-.6],{x:12,y:.3,z:-7});
assert.deepEqual(hand,[11.6,1.33,-7.6]);
assert.equal(motion.floorContact([0,1.04,0],0,1.72,1.2),true);
assert.equal(motion.floorContact([0,1.68,0],0,1.72,1.2),false);
assert.equal(motion.floorContact([0,1.43,0],0,1.72,1.2,true),false,'raising paws releases anchors comfortably');
// Simulate 90 Hz hand draw, ensuring the rig travels forward along the hand push.
let rig={x:0,y:0,z:0},now=1000;
let contact=motion.stepContact(null,[0,1.04,0],rig,1/90,{type:'floor',point:[0,.17,0]},now,1.4).contact;
let total=0;
for(let n=1;n<=12;n++){
 now+=11.11;
 const raw=[0,1.04,-n*.055];
 const step=motion.stepContact(contact,raw,rig,1/90,{type:'floor',point:[0,.17,-n*.055]},now,1.4);
 contact=step.contact;
 const advance=step.push?.dz||0;
 rig.z+=advance;total+=advance;
}
assert.ok(total>.48,`hand sweep must move forward substantially, moved ${total}`);
// Menu remains open on hold and one dropped sample, then toggles once after a real release.
let state=null,toggles=0;
for(let n=0;n<15;n++){
 const r=controls.menuLatch(state,n===8?false:true,n*11);
 state=r.state;if(r.toggle)toggles++;
}
assert.equal(toggles,1,'holding X while briefly missing a sample is only one press');
for(let n=15;n<30;n++)state=controls.menuLatch(state,false,n*11).state;
let pressed=controls.menuLatch(state,true,330);assert.equal(pressed.toggle,true,'next real press toggles off');
let held=controls.menuLatch(pressed.state,true,341);assert.equal(held.toggle,false);
assert.ok(game.includes('autoJoinPond();send({type:\'vrPresence\',active:true});s.requestAnimationFrame(frameVR)'), 'entering VR auto joins public');
assert.ok(game.includes('FrogyCollision.reachablePaw(raw,vrPos);'), 'visible paws follow raw controller pose without offset');
assert.ok(game.includes('menuLatchState=result.state'),'menu latching is used');
assert.ok(features.includes('SERVER HOP'),'public menu offers server hop');
console.log('PASS: true controller hand height, substantial anchored hand movement, one-press latch, auto matchmaking, and server hop controls');
