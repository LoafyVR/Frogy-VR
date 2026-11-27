'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const World=require('../public/world.js'),Combat=require('../public/combat.js');
assert.equal(World.weapons.length,18);
for(const type of ['blaster','knife','sword','mallet'])assert(World.weapons.some(w=>w.type===type),'missing '+type);
for(let i=0;i<3;i++){
 const kits=World.medkitsFor(i);assert.equal(kits.length,2);
 assert.equal(new Set(kits.map(k=>k.id)).size,2);
 for(const k of kits){
  assert(k.type==='medkit'&&Math.hypot(k.x,k.z)<World.SIZE-4);
  assert(World.maps[i].cover.every(o=>Math.hypot(k.x-o.x,k.z-o.z)>o.r+1.45));
  assert(World.weapons.every(w=>Math.hypot(k.x-w.x,k.z-w.z)>3));
 }
}
assert.equal(Combat.heal(170,175,55),175,'healing does not exceed the normal max');
assert.equal(Combat.heal(40,175,55),95,'medkit restores 55 HP');
assert.equal(Combat.heal(175,175,55),175,'no overheal at full');
const shooter={x:0,y:0,z:0,id:'a',alive:true},target={x:0,y:0,z:-6,id:'b',alive:true,monster:true};
const block={x:0,z:-3,r:1,h:4};
const wall=Combat.trace([0,1,0],[0,0,-1],[block],[shooter,target],'a');
assert(wall&&!wall.target&&wall.distance<3,'shot stops at cover before monster');
const hit=Combat.trace([0,1,0],[0,0,-1],[],[shooter,target],'a');
assert.equal(hit.target,target,'aiming directly at monster hits it');
const misses=Combat.trace([0,1,0],[0,0,1],[],[shooter,target],'a');
assert.equal(misses.target,null,'shots aimed away miss');
const slope=Combat.trace([0,1,0],[0,-.2,-1],[],[shooter],'a');
assert(slope.distance<55,'downward bullets hit the ground');
const server=fs.readFileSync(require('node:path').join(__dirname,'../server.js'),'utf8');
const game=fs.readFileSync(require('node:path').join(__dirname,'../public/game.js'),'utf8');
assert(server.includes('MEDKIT_HEAL=55')&&server.includes("closest.kind==='medkit'"));
assert(server.includes('r.pickups=r.pickups.filter(w=>w.id!==closest.thing.id)'),'medkit disappears on use');
assert(server.includes('p.bleedUntil=0'),'medkit bandages lost arm wound');
assert(server.includes("if(!r.npcPractice)questEvent(client,'grabWeapon')")||server.includes("if(closest.kind==='weapon'&&!r.npcPractice)questEvent(client,'grabWeapon')"));
assert(game.includes("case 'medkitUsed'")&&game.includes("type==='medkit'"),'VR client renders and acknowledges medkits');
assert(game.includes('q.ray?.d||null'),'weapon points where controller points');
console.log('PASS v16.4: two map-safe medkits per round, capped heals, bleeding bandage, sword/mallet, accurate cover-aware gun traces');
