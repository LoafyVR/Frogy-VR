'use strict';
// Execute the actual XR controller handler with synthetic grip/controller poses.
// Unlike helper-only tests, this catches an undefined variable inside the real
// arm-stroke branch (the v15.1 first-push blocker).
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.resolve(__dirname,'..');
const code=fs.readFileSync(path.join(root,'public/game.js'),'utf8');
const start=code.indexOf('function updateVRInputs(');
const end=code.indexOf('function onXRSelect(',start);
assert(start>=0&&end>start,'real XR input handler is accessible for simulation');
const handler=code.slice(start,end);
const physicsStart=code.indexOf('function physics('),physicsEnd=code.indexOf('function wallHandContact(',physicsStart);
assert(physicsStart>=0&&physicsEnd>physicsStart);
const physicsHandler=code.slice(physicsStart,physicsEnd);
const Motion=require('../public/movement.js');
const Collision=require('../public/collision.js');
const Controls=require('../public/controls.js');
const Cling=require('../public/cling.js');
assert.equal(Motion.speedCap('lobby',{monster:false}),Motion.settings.maxHorizontalSpeed*Motion.BASE_RUN);
assert.equal(Motion.speedCap('playing',{monster:true,activeTools:{speed:true}}),Motion.settings.maxHorizontalSpeed*Motion.BASE_RUN*1.3*Motion.SWIFT_RUN);
const gripSpace={kind:'grip'},targetRaySpace={kind:'ray'};
const gp={buttons:Array.from({length:7},()=>({pressed:false})),axes:[0,0,0,0]};
const src={handedness:'right',gamepad:gp,gripSpace,targetRaySpace};
let clock=1000,controllerZ=0,controllerY=1.02;
const matrix=(x,y,z)=>{
 const m=new Float32Array(16);m[0]=m[5]=m[10]=m[15]=1;
 m[12]=x;m[13]=y;m[14]=z;return m;
};
const viewerPose={transform:{matrix:matrix(0,1.7,0)}};
const frame={getPose(space){if(space===gripSpace||space===targetRaySpace)return {transform:{matrix:matrix(0,controllerY,controllerZ)}};return null;}};
const initial={
 FrogyMotion:Motion,FrogyCollision:Collision,FrogyControls:Controls,FrogyCling:Cling,
 FrogySettings:{state:{armPower:1.4,reachScale:1.2,joystickTurning:false}},
 FrogyAudio:{play(){}},FrogyGrapple:{},
 session:{inputSources:[src]},refSpace:{},referenceShift:0,
 phase:'lobby',me:{alive:true,monster:false},isHub:()=>true,
 pawSurface:(raw,world,wasFloor)=>Collision.handSurface(world,1.7,'hub',null,wasFloor,1.2),
 WorldData:{SIZE:65},obstacles:()=>[],
 vrPos:{x:0,y:0,z:4},vel:{x:0,y:0,z:0},vrInput:{left:null,right:null},
 lastButtons:{},pawContacts:{},prevHands:{},lastKnownHands:{},
 lastWallAt:{left:-Infinity,right:-Infinity},missingControllerSince:{left:0,right:0},
 headHeight:1.7,turnYaw:0,lookYaw:0,stickLatched:false,
 vrMenuOpen:false,menuLatchState:{armed:true,releasedAt:null,pressed:false},
 lastMenuToggleAt:-Infinity,lastJumpAt:-Infinity,lastPushAt:0,lastHandThump:0,
 lastMonsterAutoHopAt:-Infinity,lastPalmPushOffAt:-Infinity,
 grounded:true,lastGroundAt:0,pendingJumpAt:-Infinity,extraJumpUsed:false,
 clingState:Cling.initial(),clingActive:false,clingClimb:0,clingLockUntil:0,clingSoundAt:0,
 trackingWarning:'',
 performance:{now:()=>clock},
 clamp:(v,a,b)=>Math.max(a,Math.min(b,v)),norm:v=>v,
 console
};
const ctx=vm.createContext(initial);
vm.runInContext(handler+'\n'+physicsHandler+'\n;globalThis.exercise=updateVRInputs;globalThis.exercisePhysics=physics;',ctx,{timeout:2000});
// A real physical hand at waist height makes an assisted ground contact.
ctx.exercise(frame,1/90,viewerPose);
assert.equal(ctx.pawContacts.right.type,'floor','tracked controller plants at comfortable floor-contact height');
assert.equal(ctx.vel.z,0,'touchdown does not teleport the player');
// Pull the hand backwards, as in Gorilla Tag arm locomotion. v15.1 used a
// `cap` local to physics() here and threw ReferenceError before any movement.
clock+=11;controllerZ=-.046;
assert.doesNotThrow(()=>ctx.exercise(frame,1/90,viewerPose),'valid tracked stroke must never crash the VR input frame');
assert(ctx.vel.z>0.5,`backward controller stroke creates usable forward velocity, got ${ctx.vel.z}`);
assert(Number.isFinite(ctx.vel.z)&&Math.abs(ctx.vel.z)<=Motion.speedCap('lobby',ctx.me));
// Integrate that velocity through the same physics() function the VR loop uses.
ctx.exercisePhysics(1/90);
assert(ctx.vrPos.z>4,'a valid paw stroke actually advances avatar position through physics()');
const priorVelocity=ctx.vel.z;
clock+=11;controllerZ=-.091;
assert.doesNotThrow(()=>ctx.exercise(frame,1/90,viewerPose),'successive strokes remain stable');
assert(ctx.vel.z>0&&ctx.vel.z<=Motion.speedCap('lobby',ctx.me),'velocity remains finite and capped');
assert(Math.abs(ctx.vrInput.right.hand[1]-controllerY)<1e-5,'rendered hand has real controller height');
// Static tracked hands should not secretly add more movement or jump impulses.
clock+=11;
assert.doesNotThrow(()=>ctx.exercise(frame,1/90,viewerPose));
assert(Number.isFinite(ctx.vel.z));
assert(ctx.vel.z<=Motion.speedCap('lobby',ctx.me)*Motion.BASE_RUN);
assert(priorVelocity>0);
// Raising the hand releases the contact; no invisible paw can continue pushing.
clock+=11;controllerY=1.57;
ctx.exercise(frame,1/90,viewerPose);
assert.equal(ctx.pawContacts.right,null,'raising the controller releases the assisted floor contact');
console.log('PASS v15.2 XR handler: real controller-stroke branch does not crash, creates forward velocity, keeps physical paws and releases contact');
