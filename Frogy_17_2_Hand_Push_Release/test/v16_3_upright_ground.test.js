'use strict';
const assert=require('node:assert/strict');
const C=require('../public/collision.js'),M=require('../public/movement.js');
const dt=1/90;
for(const height of [1.30,1.70,1.95]){
 const handY=height*.61;
 assert.equal(C.handSurface([0,handY,0],height,'hub',null,false,1.2),null,`no invisible air contact for height ${height}`);
 assert.equal(C.reachablePaw([0,handY,0],{x:0,y:0,z:0})[1],handY,'hand remains at actual controller height');
 const p=M.groundPress([0,handY,0],[0,handY-.045,0],dt,height,1.4);
 assert(p&&p.up>=2&&p.up<=4.3,`real downward hand press launches from ${handY} m`);
 assert.equal(M.groundPress([0,height-.1,0],[0,height-.14,0],dt,height,1.4),null,'head-high waving cannot jump');
}
for(const [x,z,axis,dir] of [[-.045,0,'vx',1],[.045,0,'vx',-1],[0,-.045,'vz',1],[0,.045,'vz',-1]]){
 const p=M.relaxedArmStroke([0,1.05,0],[x,1.05,z],dt,1.7,1.4);
 assert(p&&p[axis]*dir>0.5,`standing movement works in ${axis} / direction ${dir}`);
}
assert.equal(M.groundPress([0,1.1,0],[0,.65,0],dt,1.7,1.4),null,'large tracking spikes rejected');
assert.equal(C.handSurface([0,1.10,0],1.7,'arena',{SIZE:58,cover:[]},false,1.2),null,'no phantom floor in game maps');
console.log('PASS v16.5 upright: authentic contact + all-direction tracked movement at multiple heights');
