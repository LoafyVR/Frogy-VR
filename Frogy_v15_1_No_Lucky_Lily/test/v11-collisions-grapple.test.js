'use strict';
const assert=require('node:assert/strict');const C=require('../public/collision.js'),G=require('../public/grapple.js');
// Station meshes have the same solid footprints as their client render.
assert.equal(C.surfaceAt([-11,1.1,-7.10],'hub')?.type,'wall','Computer desk must have a hand collider');
assert.equal(C.surfaceAt([11,1.5,-8.3],'hub')?.type,'wall','Dressing mirror must have a collider');
assert.equal(C.surfaceAt([4.25,.55,-1.7],'hub')?.type,'wall','Benches must be solid');
assert.equal(C.surfaceAt([19.3,1.1,0],'hub')?.type,'wall','Outer lobby boundary is solid');
assert.equal(C.surfaceAt([0,.18,0],'hub')?.type,'floor','The actual hand touches the same 0m floor');
assert.equal(C.surfaceAt([-11,.60,11],'hub')?.type,'floor','Parkour first pad has a climbable physical top');
assert.equal(C.surfaceAt([0,2,0],'hub'),null,'Free air does not create fake paws');
assert.equal(C.landHeight(-5.2,15.5,1.95,true),1.48,'The raised 3rd lily pad supports landings');
assert.equal(C.landHeight(-5.2,15.5,.2,true),0,'Players cannot teleport through a platform from below');
// Torso collision intentionally removed in v13. Solid paw colliders remain.
assert(C.surfaceAt([-11,1,-7.1],'hub')?.type==='wall');
assert(C.surfaceAt([-8.3,1.04,13.5],'hub')?.name==='parkour');
const h=C.reachablePaw([0,.65,0],{x:0,y:0,z:0},1.65,1.2);assert.equal(h[1],.65,'Tracked hands do not jump downwards to meet a fake floor');
assert.equal(C.reachablePaw([0,1.4,0],{x:0,y:0,z:0})[1],1.4,'Raised hands keep their actual height');
const hit=G.raycast([-11,1.1,-4.5],[0,0,-1],'hub',null);assert(hit&&hit.surface.includes('desk'),'Grapple hits a real desk collider');
const far=G.raycast([0,1.1,0],[0,1,0],'hub',null);assert.equal(far,null,'Grapple cannot lock to empty air');
let g=G.activate(null,1000,[-11,1.1,-4.5],[0,0,-1],'hub',null);assert(g.active,'B attaches tongue to a physical surface');
let move=G.update(g,1020,{x:-11,y:0,z:-4.5},{x:0,y:0,z:0},.016);assert(move.velocity.z<0,'The tether pulls toward the surface');
assert(!G.update(g,3400,{x:0,y:0,z:0},{x:0,y:0,z:0},.016).state.active,'Tongue automatically releases');
g=G.activate(g,1200,[-11,1.1,-4.5],[0,0,-1],'hub');assert(!g.active,'Second B disconnects');
assert(!G.activate(g,1300,[-11,1.1,-4.5],[0,0,-1],'hub').active,'Cooldown prevents immediate reattach');
const arena={SIZE:65,cover:[{x:3,z:0,r:1.4,h:4,type:'tree'}]};assert(G.raycast([0,1.1,0],[1,0,0],'arena',arena)?.surface==='tree');
console.log('PASS v11 collisions: paws, lobby walls/furniture, raised parkour, no torso blocking, tongue raycast/launch/release/cooldown');
