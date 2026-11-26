'use strict';
const assert=require('node:assert/strict');
const C=require('../public/collision.js'),M=require('../public/movement.js');
const dt=1/90;
for(const height of [1.30,1.70,1.95]){
 const handY=height*.64;
 const contact=C.handSurface([0,handY,0],height,'hub',null,false,1.2);
 assert.equal(contact?.type,'floor',`standing floor assist works for headset height ${height}`);
 assert.equal(contact.assisted,true,'contact is virtual, not a visual hand snap');
 assert.equal(C.reachablePaw([0,handY,0],{x:0,y:0,z:0})[1],handY,'visual hand remains physical controller height');
 const p=M.groundPress([0,handY,0],[0,handY-.035,0],dt,height,1.4);
 assert(p&&p.up>=3&&p.up<=5.5,`standing press launches from ${handY} m`);
 assert.equal(C.handSurface([0,height-.10,0],height,'hub',null,false,1.2),null,'face-height hands do not contact ground');
 assert.equal(M.groundPress([0,height-.1,0],[0,height-.14,0],dt,height,1.4),null,'head-high waving does not trigger auto jumps');
}
const contact=C.handSurface([0,1.1,0],1.7,'hub',null,false,1.2);
let previous=M.strokeContact(null,[0,1.1,0],contact,dt,1.4,1000).contact;
for(const [x,z,axis,dir] of [[-.045,0,'vx',1],[.045,0,'vx',-1],[0,-.045,'vz',1],[0,.045,'vz',-1]]){
 const p=M.strokeContact(previous,[x,1.1,z],contact,dt,1.4,1011);
 assert(p.push&&p.push[axis]*dir>0.5,`sideways/forward/back pushes work: ${axis} ${dir}`);
 previous=M.strokeContact(null,[0,1.1,0],contact,dt,1.4,1100).contact;
}
assert.equal(M.groundPress([0,1.1,0],[0,.65,0],dt,1.7,1.4),null,'large tracking jumps rejected');
assert.equal(C.handSurface([0,1.10,0],1.7,'arena',{SIZE:58,cover:[]},false,1.2)?.type,'floor','same upright contact works in real maps');
console.log('PASS v16.3: waist-height ground press, four-way strokes, real visual hand height, varied heights, both hub and match');
