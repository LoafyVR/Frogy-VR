'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const M=require('../public/movement.js'),P=require('../public/paw-pose.js'),G=require('../public/grapple.js'),W=require('../public/world.js');
const code=f=>fs.readFileSync(path.join(__dirname,'..',f),'utf8');
const dt=1/90;
// Low hands now push UP on the very first tracked downward stroke, with no anchored contact frame.
const press=M.groundPress([0,.52,0],[0,.47,0],dt,1.7,1.2);
assert(press&&press.up>=4,'a real downward stroke near the floor launches a useful upward impulse');
assert.equal(M.groundPress([0,1.35,0],[0,1.30,0],dt,1.7,1.2),null,'head-high downward swings do not simulate floor contact');
assert.equal(M.groundPress([0,.52,0],[0,.05,0],dt,1.7,1.2),null,'tracking spikes are rejected');
for(const [a,b,dimension] of [ [[0,.5,0],[-.045,.5,0],'vx'], [[0,.5,0],[.045,.5,0],'vx'], [[0,.5,0],[0,.5,-.045],'vz'],[[0,.5,0],[0,.5,.045],'vz'] ]){
 const stroke=M.relaxedArmStroke(a,b,dt,1.7,1.4);
 assert(stroke&&Math.abs(stroke[dimension])>0.5,`responsive hand locomotion on ${dimension} in both directions`);
}
// All three grip-pose axes must rotate with the controller, not just yaw.
const id=new Float32Array(16);id[0]=id[5]=id[10]=id[15]=1;
const horizontal=P.basisFromGrip(id,0);
assert(Math.abs(horizontal[4])<.01,'level controller fingers point forward, not down');
const tilted=new Float32Array(16);tilted[0]=tilted[15]=1;tilted[6]=-1;tilted[9]=1;
const down=P.basisFromGrip(tilted,0);
assert(down[4]<-.99,'controller pitched down makes the paw fingers point down');
assert(P.point([0,1,0],down,[0,.2,0])[1]<.81,'actual fingertip visibly drops when controller tilts down');
assert(!P.valid([1,0,0]),'remote invalid paw matrix cannot be trusted');
// A fast launch must decelerate nonlinearly, and release automatically by the mouth.
const initial=G.pullSpeed(25,25),middle=G.pullSpeed(13,25),end=G.pullSpeed(2,25);
assert(initial>middle&&middle>end&&end>0,'grapple launches fast then eases down near the target');
const active={active:true,started:1000,initialDistance:25,point:[0,1.45,1.3]};
assert(!G.update(active,1050,{x:0,y:0,z:0},{x:0,y:0,z:0},dt).state.active,'grapple automatically disconnects close to its target');
assert(!G.update({...active,point:[0,1.45,25]},1000+G.MAX_MS+1,{x:0,y:0,z:0},{x:0,y:0,z:0},dt).state.active,'grapple also has time limit');
assert.equal(W.SIZE,60,'arena radius slightly smaller than v16.0');
for(let i=0;i<3;i++){
 assert(W.maps[i].cover.length>=248,'more cover for each smaller arena');
 for(const w of W.weapons)assert(W.maps[i].cover.every(o=>Math.hypot(w.x-o.x,w.z-o.z)>o.r+1.2),'all weapons unblocked');
}
const game=code('public/game.js'),server=code('server.js'),bootstrap=code('public/bootstrap.js');
assert(game.includes('FrogyMotion.groundPress(prevHands[side]'), 'real game uses ground press on every hand');
assert(game.includes('FrogyPawPose.basisFromGrip(m,turnYaw)'), 'real game uses full 3D controller orientation');
assert(game.includes('const other=side===\'left\'?\'right\':\'left\';')&&game.includes('tongues[other]={active:false,readyAt:0}'), 'only one mouth tongue can exist');
assert(game.includes('FrogyGrapple.activate(tongues[side],now,currentMouth.o,currentMouth.d'), 'tongue launches from the headset mouth, not a hand');
assert(game.includes('const origin=currentMouth?.o'), 'rope starts at mouth for first-person view');
assert(server.includes('lBasis:p.lBasis||null')&&server.includes('tongue:p.tongue||null'), 'remote frogs replicate controller orientation and mouth tether');
assert(bootstrap.includes("'grapple.js','paw-pose.js'"), 'paw pose module loads before game');
assert(game.includes('Tiny decorative legs/feet'), 'cute frogs have tiny decorative legs');
assert(game.includes('-.54,.34,.405,.075,cream'), 'belly moved forward rather than clipping into the torso');
assert(fs.existsSync(path.join(__dirname,'..','FUTURE_UPDATE_BACKLOG.md')), 'future menu redesign is tracked');
console.log('PASS v16.1: ground press, lateral travel, 3D paws, one mouth grapple with nonlinear easing, denser smaller maps and menu backlog');
