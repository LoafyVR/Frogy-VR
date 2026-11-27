'use strict';
const assert=require('node:assert/strict');
const m=require('../public/movement.js'),v=require('../public/voteboard.js');
const floor={type:'floor',point:[0,.17,0]};
let c=m.strokeContact(null,[0,1.08,0],floor,1/90,1.4,1000);
assert.ok(c.contact&&!c.push,'first contact plants without a snap');
// Direct, real-world controller sweep advances the body in a controlled direction.
let sum=0;
for(let i=1;i<=10;i++){
 const r=m.strokeContact(c.contact,[0,1.08,-.025*i],floor,1/90,1.4,1000+11*i);
 assert.ok(r.push&&r.push.dz>0,'pulling paw backwards pushes avatar forward');
 assert.ok(r.push.dz<.12,'no high-frequency teleport');
 sum+=r.push.dz;c=r;
}
assert.ok(sum>.2,'sustained hand stroke travels a usable distance');
// Avatar rig motion must not feed back into the hand input and kick the player.
let still=m.strokeContact(c.contact,[0,1.08,-.25],floor,1/90,1.4,1115);
assert.equal(still.push,null,'no hand tracking motion means no phantom force');
// v16.9 intentionally removes old seam hysteresis: air must never push.
let seam=m.strokeContact(c.contact,[0,1.081,-.251],null,1/90,1.4,1135);
assert.equal(seam.contact,null,'missing physical contact releases the anchor immediately');
assert.equal(seam.push,null,'missing physical contact cannot create a mid-air juke');
const released=m.strokeContact(seam.contact,[0,1.50,-.25],null,1/90,1.4,1200);
assert.equal(released.contact,null,'lifting releases contact');
assert.equal(m.strokeContact(c.contact,[.7,1.08,-.25],floor,1/90,1.4,1150).push,null,'tracking recenter cannot teleport avatar');
assert.equal(m.preserveJump({x:3,y:0,z:4}).x,3,'jump preserves horizontal velocity');
assert.ok(v.hit([0,1.9,1],[0,0,-1]),'map voting board is hittable from lobby');
const hit=v.hit([0,1.9,1],[0,0,-1]);
assert.ok(hit.u>0&&hit.u<1);
assert.equal(v.hit([0,1.9,-9],[0,0,1]),null,'do not vote through back of board');
assert.equal(v.selection(.5,.35),0);assert.equal(v.selection(.5,.58),1);assert.equal(v.selection(.5,.80),2);
assert.equal(v.selection(.02,.30),-1,'only large vote buttons react');
console.log('PASS v8: steady paw contact, no phantom air grace, no rig feedback, real travel, correct jump carry, physical board ray hits');
