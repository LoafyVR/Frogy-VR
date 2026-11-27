'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const M=require('../public/movement.js');
const dt=1/90,head=[0,1.7,0],floor={type:'floor',name:'floor',normal:[0,1,0],point:[0,0,0]};
const anchor=M.stepHand(null,[0,.89,0],head,floor,dt,1.3,1000);
assert(anchor.contact&&!anchor.push);
const diagonal=M.stepHand(anchor.contact,[0,.867,-.028],head,floor,dt,1.3,1011);
assert(diagonal.push?.vz>4,'diagonal contact strokes must propel forward');
assert(diagonal.push?.up>3.2,'diagonal contact strokes must ALSO propel upward');
assert(diagonal.push?.up<M.settings.jumpSpeed,'hand push must not overpower A jump');
const launch=M.applyPushes({x:0,y:0,z:0},[diagonal.push],M.speedCap('playing',{}),true);
assert(launch.vel.z>3 && launch.vel.y>3 && launch.hop,'same contact must create forward movement plus upward launch');
assert.deepEqual(M.confirmPushes([diagonal.push],false,launch.vel.y),[],'midair must reject floor re-push');
const air=M.stepHand(diagonal.contact,[0,.83,-.07],head,null,dt,1.3,1022);
assert(!air.push,'air has no push surface');
// A stationary hand must never reapply cached velocity samples and fling later.
let contact=anchor.contact, velocity={x:0,y:0,z:0};
const first=M.stepHand(contact,[0,.89,-.035],head,floor,dt,1.3,2011);
contact=first.contact;
velocity=M.applyPushes(velocity,[first.push],M.speedCap('playing',{}),true).vel;
const initialSpeed=Math.hypot(velocity.x,velocity.z);
assert(initialSpeed>3);
for(let i=0;i<35;i++){
 const stopped=M.stepHand(contact,[0,.89,-.035],head,floor,dt,1.3,2022+11*i);
 assert.equal(stopped.push,null,`standing still cannot create a stored push at frame ${i}`);
 assert.deepEqual(stopped.contact.samples,[],'no stale rolling velocity samples');
 contact=stopped.contact;
 velocity=M.brakePlantedHold(velocity,{left:contact},dt,true);
 velocity=M.integrate({x:0,y:0,z:0},velocity,true,dt,M.speedCap('playing',{})).vel;
}
assert(Math.hypot(velocity.x,velocity.z)<.25,'stationary planted hand must brake momentum before release');
const released=M.stepHand(contact,[0,.96,-.035],head,null,dt,1.3,2440);
assert.equal(released.push,null,'lifting hand cannot create a delayed launch');
const after=M.integrate({x:0,y:0,z:0},velocity,true,dt,M.speedCap('playing',{})).vel;
assert(Math.hypot(after.x,after.z)<=Math.hypot(velocity.x,velocity.z),'release does not increase speed');
// Stationary wall contact brakes lingering travel as well; ordinary midair
// movement without a planted hand must preserve legitimate launch momentum.
const wallHold={type:'wall',idleFrames:4};
const wallBraked=M.brakePlantedHold({x:7,y:2,z:3},{right:wallHold},dt,false);
assert(Math.hypot(wallBraked.x,wallBraked.z)<Math.hypot(7,3));
const flyingUnplanted=M.brakePlantedHold({x:7,y:2,z:3},{},dt,false);
assert.deepEqual(flyingUnplanted,{x:7,y:2,z:3},'empty-air flight must not receive phantom braking');

const extra=M.stepHand(contact,[0,.89,-.035],[0,1.7,0],floor,dt,1.3,3000);
assert(!extra.push,'still hand cannot generate a new impulse after contact is held');
// A crouching headset moving down together with the hand must not become a
// mysterious jump. Real relative hand pressure should still work.
const crouch=M.stepHand(anchor.contact,[0,.865,-.025],[0,1.675,0],floor,dt,1.3,1022);
assert((crouch.push?.up||0)<.7,'moving head+hand down together must not trigger a launch');
// Finger controls are appearance-only; the game still uses the same grip and
// trigger buttons for pickup/combat.
const text=fs.readFileSync(path.join(__dirname,'../public/game.js'),'utf8');
const expression=text.match(/function handPoseFromButtons\(buttons=\{\}\)\{[\s\S]*?\n\}/)?.[0];
assert(expression,'hand pose mapping must exist');
const pose=vm.runInNewContext(`${expression}\nhandPoseFromButtons`,{clamp:(n,min,max)=>Math.max(min,Math.min(max,n))});
assert.deepEqual(Array.from(pose({grip:1,trigger:0})),[0,0,1],'grip curls last finger after swap');
assert.deepEqual(Array.from(pose({grip:0,trigger:1})),[0,1,0],'trigger curls outer finger after swap');
assert.deepEqual(Array.from(pose({thumbA:1})),[1,0,0],'thumb button animation untouched');
assert(text.includes('FrogyMotion.brakePlantedHold(vel,pawContacts,dt,grounded)'), 'stationary contact brake must actually be in live VR physics');
assert(text.includes('const gripBrake=Math.exp(-15'), 'wall clinging must also bleed off stored horizontal momentum');
console.log('PASS Frogy 17.2: no delayed fling, diagonal jump+forward, airborne reject, crouch filter, swapped finger curls');
