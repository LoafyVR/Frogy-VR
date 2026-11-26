'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const Motion=require('../public/movement.js');
const Collision=require('../public/collision.js');
const code=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');
// Test the direct source of back/forth rocking: returning a hand right after
// its forward power stroke should NOT send an equal reverse movement impulse.
const forward={dx:0,dz:.08,vx:0,vz:7,up:0};
const backward={dx:0,dz:-.08,vx:0,vz:-7,up:0};
let s=Motion.gateArmStroke(null,forward,1000);
assert(s.push?.vz>0,'first deliberate push travels forward');
s=Motion.gateArmStroke(s.state,backward,1060);
assert.equal(s.push,null,'immediate hand return does not reverse the frog');
s=Motion.gateArmStroke(s.state,backward,1350);
assert(s.push?.vz<0,'genuine new backward push can work after reset');
for(const sign of [-1,1]){
 const side=Motion.gateArmStroke(null,{dx:sign*.02,dz:0,vx:sign*1.8,vz:0,up:0},1000);
 assert(side.push&&Math.sign(side.push.vx)===sign,'sideways movement works in both directions');
}
const dt=1/90,waist=Motion.relaxedArmStroke([0,1.02,0],[0,1.02,-.035],dt,1.7,1.4);
assert(waist&&waist.vz>0,'standing frog can move without squatting or floor collision');
assert(Motion.groundPress([0,.92,0],[0,.86,0],dt,1.7,1.3)?.up>=2,'standing-downward push launches');
assert(Motion.speedCap('playing',{monster:true})>Motion.speedCap('playing',{monster:false}),'monster has faster travel cap');
const normal=Motion.strokeVelocity([waist],dt,'playing',{monster:false});
const mega=Motion.strokeVelocity([waist],dt,'playing',{monster:true});
assert(Math.hypot(mega.x,mega.z)>Math.hypot(normal.x,normal.z),'monster uses same stroke but runs more easily');
const world={SIZE:58,cover:[{type:'crate',x:2,z:0,r:1,h:4}]};
const result=Collision.sweepTrackedBody({x:0,z:0},{x:.6,z:0},{x:10,z:0},.15,.31,'arena',world,0);
assert(result.blockedX&&result.head.x<.70,'real tracked head blocks against walls');
assert(Math.abs(result.x-(result.head.x-.6))<1e-8,'rig is corrected by headset offset, not a guessed center');
assert.equal(Collision.handSurface([0,1.02,0],1.7,'hub'),null,'no invisible air floor');
const game=code('public/game.js'),server=code('server.js'),features=code('public/features.js');
assert(game.includes('FrogyCollision.sweepTrackedBody'),'real physics loop uses tracked-head collision solver');
assert(game.includes('FrogyMotion.gateArmStroke(strokeGates[side]'),'real VR loop removes reset-stroke wobble');
assert(game.includes('drawPhysicalTutorial(t)')&&game.includes('clickPhysicalTutorial(ray.o,ray.d)'),'physical tutorial renders and responds to controller');
assert(features.includes('function drawPhysicalTutorial(t)')&&features.includes('function clickPhysicalTutorial(origin,direction)'),'six step lobby practice board exists');
assert(features.includes('Grip near a weapon')&&features.includes('Press A on the right controller'),'weapon and movement lessons are in the world');
assert(server.includes('r.pickups=r.pickups.filter(w=>w.id!==closest.thing.id);'),'picked-up sword is consumed instead of respawning');
assert(server.includes("Private room: no Tadpole bot by default"),'Tadpole is opt-in and private room instructions are sent');
assert(game.includes('q.ray?.d||null'),'first-person sword orientation follows tracked hand ray');
console.log('PASS v16.6: no return-stroke wobble, headset-aligned walls, monster mobility, upright pushes, weapon consumption, physical tutorial, optional Tadpole');
