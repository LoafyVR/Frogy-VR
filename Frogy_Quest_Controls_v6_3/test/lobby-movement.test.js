'use strict';
const assert=require('node:assert/strict');
const m=require('../public/movement.js'),hub=require('../public/hub.js');
for(const phase of ['home','lobby','countdown','intermission']){
 assert.equal(m.canMove(phase,false,false,true),true,phase+' arm locomotion');
 assert.equal(m.canJump(phase,false,false,true),true,phase+' A jumps');
}
assert.equal(m.canMove('playing',true,false,true),true,'opening Settings must not freeze the avatar');
assert.equal(m.canMove('playing',false,true,true),true,'spectating friends can walk in lobby');
assert.deepEqual(m.preserveJump({x:6,y:0,z:-4}),{x:6,y:m.settings.jumpSpeed,z:-4});
assert.ok(m.floorContact([0,1.03,0],0,1.7,1.12));
for(let i=0;i<8;i++)assert.ok(hub.free(...hub.spawn(i)));
for(const q of hub.stations)assert.equal(hub.free(q.x,q.z),false);
assert.equal(hub.resolve(999,999).x,hub.LIMIT);
console.log('PASS: room/menu movement, A jump and collision-safe hub');
