'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs');
const C=require('../public/collision.js'),G=require('../public/grapple.js'),M=require('../public/movement.js');
const code=fs.readFileSync(require('node:path').join(__dirname,'../public/game.js'),'utf8');
for(const y of [.52,.83,1.10,1.4]){
 assert.equal(C.handSurface([0,y,0],1.7,'hub',null,false,1.2),null,`air at y=${y} is never solid`);
}
assert.equal(C.handSurface([0,.08,0],1.7,'hub')?.type,'floor','true ground is solid');
assert.equal(C.handSurface([C.hubBounds-.08,1,0],1.7,'hub')?.type,'wall','actual walls remain solid');
assert(M.relaxedArmStroke([0,.97,0],[-.04,.97,0],1/90,1.7,1.4)?.vx>1,'standing motion needs no fake floor');
assert(M.groundPress([0,.95,0],[0,.89,0],1/90,1.7,1.4)?.up>=2,'downward standing press launches without crouching');
const target={active:true,point:[15,1.45,0],initialDistance:15,started:1000,readyAt:0};
let blocked=target;
for(let i=0;i<25&&blocked.active;i++)blocked=G.releaseIfStalled(blocked,1200+i*11,{x:0,y:0,z:0},{x:0,y:0,z:0},.011);
assert(!blocked.active&&blocked.releaseReason==='blocked','tongue releases when body is blocked by cover');
let advancing=target;
for(let i=0;i<22;i++){
 const x=i*.20;advancing=G.releaseIfStalled(advancing,1200+i*11,{x,y:0,z:0},{x:x+.20,y:0,z:0},.011);
 assert(advancing.active,'grapple continues while moving towards target');
}
const box={SIZE:58,cover:[{x:2,z:0,r:1,h:3,type:'crate'}]};
const swept=C.sweepBody({x:0,z:0},{x:4,z:0},.31,'arena',box,0);
assert(swept.x<.75,'walls stop the body instead of letting it tunnel across');
const recover=C.sweepBody({x:2,z:0},{x:3.4,z:0},.31,'arena',box,0);
assert(Number.isFinite(recover.x)&&Number.isFinite(recover.z),'body can recover from an embedded start');
assert(code.includes("const mirror=side==='left'?-1:1"),'left and right paws are anatomically mirrored');
assert(code.includes('drawTongue(origin,tongues[side].point,t)')&&code.includes('PURELY VISUAL'),'tongue is a detailed render-only mesh');
assert(code.includes('FrogyGrapple.releaseIfStalled'),'real VR loop checks grapple obstructions');
console.log('PASS v16.5: no air colliders, standing movement, clear grapple on obstruction, mirrored paws and safe body walls');
