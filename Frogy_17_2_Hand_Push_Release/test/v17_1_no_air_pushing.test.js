'use strict';
const assert=require('node:assert/strict');
const M=require('../public/movement.js');
const C=require('../public/collision.js');
const fs=require('node:fs');
const rig={x:0,y:0,z:0},head=[0,1.7,0],map={SIZE:58,cover:[]};
const contact=(raw,grounded,prev,oldContact=null,world=map)=>M.contactSurface(raw,rig,grounded,1.7,1,C,'arena',world,prev,head,oldContact);
// At waist height, an idle or horizontal-swinging hand is IN AIR, not planted.
assert.equal(contact([0,.82,0],true,null),null);
assert.equal(contact([0,.82,-.05],true,[0,.82,0]),null);
// A deliberate downward movement can plant onto the physical floor and then push.
const planted=contact([0,.82,0],true,[0,.85,0]);
assert.equal(planted?.type,'floor');
const anchored=M.stepHand(null,[0,.82,0],head,planted,1/90,1.1,1000);
const stillTouch=contact([0,.82,-.025],true,[0,.82,0],anchored.contact);
assert.equal(stillTouch?.type,'floor');
const pushed=M.stepHand(anchored.contact,[0,.82,-.025],head,stillTouch,1/90,1.1,1011);
assert(pushed.push?.vz>0);
// Floor anchors must not survive actual takeoff, even with hands still lowered.
assert.equal(contact([0,.78,-.03],false,[0,.82,-.025],pushed.contact),null);
const flying=M.stepHand(pushed.contact,[0,.78,-.03],head,null,1/90,1.1,1022);
assert.equal(flying.push,null);
const midair=M.confirmPushes([{vx:13,vz:0,up:1,wall:false}],false,6.5);
assert.deepEqual(midair,[],'A takeoff on same frame discards floor impulses collected earlier');
assert.deepEqual(M.confirmPushes([{vx:13,vz:0,up:1,wall:false}],true,1),[], 'upward launch cannot add another floor impulse');
assert.equal(M.confirmPushes([{vx:8,vz:0,up:0,wall:true}],false,3).length,1,'real wall hand contact remains valid midair');
// Swept hand trajectories detect crossed walls, but crossing the wall does NOT
// become a lasting collision when the endpoint is already outside it.
const narrow={surfaceAt(p){return p[0]>.08&&p[0]<.10?{type:'wall',name:'thin',normal:[-1,0,0],point:[.09,p[1],p[2]]}:null;}};
const transient=M.contactSurface([.16,1.0,0],rig,false,1.7,1,narrow,'arena',null,[.0,1,0],head);
assert.equal(transient?.swept,true);
assert.equal(M.stepHand(anchored.contact,[.16,1,0],head,transient,1/90,1.1,2000).push,null,'fast pass-through cannot generate a phantom wall launch');
const open=M.contactSurface([.28,1,0],rig,false,1.7,1,narrow,'arena',null,[.16,1,0],head);
assert.equal(open,null);
const game=fs.readFileSync(require('node:path').join(__dirname,'../public/game.js'),'utf8');
assert(game.includes('FrogyMotion.confirmPushes(pushes,grounded,vel.y)'), 'XR gameplay filters stale pushes at takeoff');
assert(game.includes("const wallTouch=surface?.type==='wall'&&!surface.swept"), 'phantom swept wall never activates wall-clinging');
assert(game.includes('previousRaw,headRaw,side?pawContacts[side]:null'), 'XR gameplay carries actual hand plant state');
console.log('PASS 17.1 no air pushes: planted floor only, swept walls not anchors, no same-frame A impulse');
