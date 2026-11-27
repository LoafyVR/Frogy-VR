'use strict';
// Quest regression: tiny real ground pushes must not fail just because the hand
// is below a narrow probe band; resetting must not reverse a fast frog.
const assert=require('node:assert/strict');
const M=require('../public/movement.js');
const C=require('../public/collision.js');
const dt=1/90,head=[0,1.7,0],rig={x:0,y:0,z:0};
const map={SIZE:58,cover:[]};
const floor=(raw,old=[raw[0],raw[1]+.02,raw[2]],contact=null)=>M.contactSurface(raw,rig,true,1.7,1.2,C,'arena',map,old,head,contact);
for(const y of [0.58,0.72,0.89,1.0]){
 assert.equal(floor([0,y,0])?.type,'floor',`real lowered hand at ${y}m should contact floor`);
}
assert.equal(floor([0,1.30,0]),null,'chest-high hands cannot create floor contact');
assert.equal(M.contactSurface([0,.88,0],rig,true,1.7,1.2,C,'arena',map,[0,.88,-.03],head),null,'unplanted horizontal swings do not touch the floor');
assert.equal(M.contactSurface([0,.6,0],rig,false,1.7,1.2,C,'arena',map,null,head),null,'air has no floor contact');
let s=M.stepHand(null,[0,.88,0],head,floor([0,.88,0]),dt,1.4,1000);
s=M.stepHand(s.contact,[0,.88,-.025],head,floor([0,.88,-.025]),dt,1.4,1011);
assert(s.push?.vz>4,'2.5cm deliberate short push drives forward');
let motion=M.applyPushes({x:0,y:0,z:0},[s.push],M.speedCap('playing',{}),true).vel;
assert(motion.z>4,'real small push generates momentum');
const back=M.stepHand(s.contact,[0,.88,.005],head,floor([0,.88,.005]),dt,1.4,1022);
assert.equal(back.push,null,'horizontal hand reset at unchanged height cannot push frog backwards');
assert.equal(back.contact?.type,'recovery','reset temporarily releases planted palm');
// Keep raising/resetting for several frames; every one must be harmless.
let c=back.contact;
for(const [i,z] of [.025,.05,.07,.08,.08,.08,.08,.08,.08,.08,.08,.08,.08].entries()){
 const now=1033+i*11;
 const result=M.stepHand(c,[0,.88,z],head,floor([0,.88,z]),dt,1.4,now);
 assert.equal(result.push,null,'reset cannot gain reverse impulse on frame '+i);
 c=result.contact;
}
const continued=M.integrate({x:0,y:0,z:0},motion,true,.05,M.speedCap('playing',{}));
assert(continued.pos.z>0,'momentum remains forward while a hand resets');
// Short lateral movement remains possible after a new plant.
const plant=M.stepHand(null,[0,.86,0],head,floor([0,.86,0]),dt,1.4,2000);
const strafe=M.stepHand(plant.contact,[-.012,.86,0],head,floor([-.012,.86,0]),dt,1.4,2011);
assert(strafe.push?.vx>0,'12mm lateral planted movement registers');
const jitter=M.stepHand(plant.contact,[-.003,.86,0],head,floor([-.003,.86,0]),dt,1.4,2011);
assert.equal(jitter.push,null,'3mm controller tracking jitter does not cause drift');
console.log('PASS Frogy 17.1 low-hand floor contact, short stroke speed, harmless horizontal resets, no air pushes');
