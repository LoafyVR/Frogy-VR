'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const M=require('../public/movement.js');
const C=require('../public/collision.js');
const G=require('../public/grapple.js');
const dir=path.join(__dirname,'../public');
const code=fs.readFileSync(path.join(dir,'game.js'),'utf8');
const server=fs.readFileSync(path.join(__dirname,'../server.js'),'utf8');
const dt=1/90,head=[0,1.7,0],floor={type:'floor',point:[0,0,0],normal:[0,1,0]};
// All propulsion must come from an actual planted contact, even with boosted speed.
const planted=M.stepHand(null,[0,.90,0],head,floor,dt,1.4,1000);
const short=M.stepHand(planted.contact,[0,.88,-.030],head,floor,dt,1.4,1011);
assert(short.push?.vz>8,'small 3cm planted-hand push is powerful enough to move a normal frog');
const initialVel=M.applyPushes({x:0,y:0,z:0},[short.push],M.speedCap('playing',{monster:false}),true);
assert(initialVel.vel.z>6,'single short stroke transfers useful forward momentum');
const reset=M.stepHand(short.contact,[0,.94,-.005],head,floor,dt,1.4,1022);
assert.equal(reset.push,null,'hand reset does not shove frog backward');
assert.equal(reset.contact,null,'hand reset detaches from ground');
assert.equal(M.stepHand(short.contact,[0,.9,.12],head,null,dt,1.4,1033).push,null,'air strokes still do not propel');
assert(M.HAND_PUSH_BOOST>=2.5&&M.HAND_PUSH_BOOST<=3,'push increase is 2-3 times v17');
assert(M.settings.maxHorizontalSpeed>=18.6,'horizontal cap doubled from 9.3m/s');
assert(M.speedCap('playing',{activeTools:{speed:true}})>M.speedCap('playing',{activeTools:{}}),'Swift Legs remains faster');
// Higher-speed collision checks must cover the full path; never truncate at 0.25m/frame.
const sweep=C.sweepTrackedBody({x:0,z:0},{x:0,z:0},{x:18,z:0},1/30,.23,'arena',{SIZE:58,cover:[]},0);
assert(sweep.x>.5,'body sweep accepts faster than 0.25m/frame on safe terrain');
const tree={SIZE:58,cover:[{x:1.1,z:0,r:.38,h:3,type:'tree'}]};
const blocked=C.sweepTrackedBody({x:0,z:0},{x:0,z:0},{x:18,z:0},.05,.23,'arena',tree,0);
assert(blocked.x<.9,'fast frog still stops at tree rather than tunneling through');
// Menu should only pause controls, not gravity or momentum.
assert(M.canMove('playing',true,false,true),'in-game menu does not freeze physics');
assert(!M.canJump('playing',true,false,true),'menu still blocks jump input');
const moving=M.integrate({x:0,y:1,z:0},{x:7,y:0,z:0},false,.04,M.speedCap('playing',{}));
assert(moving.pos.x>.2&&moving.pos.y<1,'avatar keeps drifting and falling with menu open');
assert(code.includes('const surface=(tetherMoving||vrMenuOpen)?null:'),'hands cannot create surface pushes while menu is open');
assert(code.includes('pawContacts={};\n if(vrMenuOpen)releaseTongue'),'menu toggling clears planted-hand anchors');
assert(code.includes('const beforePhysics={...vrPos};physics(dt);'),'physics is still run each frame');
// Range is genuinely shorter and shared cooldown is untouched.
assert.equal(G.LIMIT,21);
assert.equal(G.COOLDOWN_MS,7000);
assert(G.raycast([0,1.6,0],[0,-.1,-.995],'arena',{SIZE:58,cover:[]}), 'ground within 21m is reachable');
assert.equal(G.raycast([0,2.6,0],[0,-.1,-.995],'arena',{SIZE:58,cover:[]}),null,'ground beyond 21m is unreachable');
assert(server.includes('<=24?tongue:null'),'server only relays tether endpoints within shortened range');
console.log('PASS Frogy 17.1: 2.6x push speed, short strokes, return release, no air boost, fast swept collisions, menu momentum, 21m shared tongue');
