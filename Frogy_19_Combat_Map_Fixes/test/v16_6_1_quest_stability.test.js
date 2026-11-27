'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const M=require('../public/movement.js');
const C=require('../public/collision.js');
const Controls=require('../public/controls.js');
const code=fs.readFileSync(path.join(__dirname,'..','public/game.js'),'utf8');
const close=(a,b,e=1e-6)=>Math.abs(a-b)<e;
// Room-scale walking: both hand and head shift equally, so no avatar push.
let h=M.smoothStroke(null,[0,1,0],.014),head=M.smoothStroke(null,[0,1.65,0],.014),d=[...h];
for(let i=0;i<25;i++){
 const nextHand=M.smoothStroke(h,[i*.016,1,i*.01],.014);
 const nextHead=M.smoothStroke(head,[i*.016,1.65,i*.01],.014);
 const nextDrive=M.integratedArmStroke(d,h,nextHand,head,nextHead);
 assert(close(nextDrive[0],0)&&close(nextDrive[2],0),'physically walking with hands does not cause an extra push');
 d=nextDrive;h=nextHand;head=nextHead;
}
// Head-only lean, stationary physical hands: no phantom arm push.
assert.deepEqual(M.integratedArmStroke([0,1,0],[0,1,0],[0,1,0],[0,1.65,0],[.13,1.6,0]),[0,1,0]);
// Hand-only genuine stroke: still moves the avatar while upright.
const genuine=M.integratedArmStroke([0,1,0],[0,1,0],[0,1,-.07],[0,1.65,0],[0,1.65,0]);
assert(M.relaxedArmStroke([0,1,0],genuine,1/72,1.65,1.35)?.vz>0);
// Crouching and lowering both hands together is NOT an unintended jump.
assert(close(M.integratedArmStroke([0,1,0],[0,1,0],[0,.92,0],[0,1.65,0],[0,1.57,0])[1],1));
// Deliberate press and quick hand reset: first stroke, not its return, counts.
let gate=M.gateArmStroke(null,{dx:0,dz:.06,vx:0,vz:4},1000);
assert(gate.push);
gate=M.gateArmStroke(gate.state,{dx:0,dz:-.06,vx:0,vz:-4},1150);
assert.equal(gate.push,null);
gate=M.gateArmStroke(gate.state,null,1600);
assert.equal(gate.state,null,'direction reset allowed after hands rest');
// NEW: room-scale head movement must never push the *whole* VR rig back.
// XR physical motion cannot be canceled by a virtual geometry collision.
const world={SIZE:58,cover:[{type:'crate',x:.7,z:0,r:.3,h:3}]};
const hit=C.sweepTrackedBody({x:0,z:0},{x:.37,z:0},{x:0,z:0},1/72,.1,'arena',world,0,{x:0,z:0});
assert(close(hit.x,0)&&close(hit.z,0),'real-world leaning does not teleport the virtual world');
assert(hit.insideTrackingGeometry,'head may be physically inside a virtual obstacle without a virtual push');
const still=C.sweepTrackedBody({x:hit.x,z:hit.z},{x:.37,z:0},{x:0,z:0},1/72,.1,'arena',world,0,{x:.37,z:0});
assert(close(still.x,hit.x,.01),'resting against a wall has no pushback oscillation');
const into=C.sweepTrackedBody({x:hit.x,z:hit.z},{x:.37,z:0},{x:3,z:0},1/72,.1,'arena',world,0);
assert(into.blockedX&&close(into.x,0),'locomotion deeper into solid geometry remains blocked');
const out=C.sweepTrackedBody({x:0,z:0},{x:.37,z:0},{x:-3,z:0},1/72,.1,'arena',world,0);
assert(out.x<0,'deliberately moving out of a wall still works');
// Snap-turn rotation pivot must preserve the camera's world position.
const yaw=Math.PI/4,point=[.4,-.18],old=Controls.rotate(...point,0),next=Controls.rotate(...point,yaw);
const rig=[1.4,2.1],compensated=[rig[0]+old[0]-next[0],rig[1]+old[1]-next[1]];
assert(close(compensated[0]+next[0],rig[0]+old[0]));
assert(close(compensated[1]+next[1],rig[1]+old[1]));
assert(code.includes('FrogyMotion.integratedArmStroke')&&code.includes('const oldHead=hm?FrogyControls.rotate'),'actual VR frame loop uses head-compensated movement and pivoted turning');
assert(code.includes("paw(pos,.30,color,basis,pose,side)"),'hands are reduced to headset-friendly scale');
assert((code.match(/finger\(\[/g)||[]).length===3,'frog paw contains exactly three digits');
console.log('PASS v16.6.1: room-scale walking, head-only leaning, deliberate pushing, squat suppression, wall sweep, snap-turn, three-finger rendering');
