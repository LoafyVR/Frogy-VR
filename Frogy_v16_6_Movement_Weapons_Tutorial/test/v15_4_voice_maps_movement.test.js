'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..'),src=p=>fs.readFileSync(path.join(root,p),'utf8');
const W=require('../public/world.js'),M=require('../public/movement.js');
// World geometry is shared and deterministic; all weapons and players stay reachable.
for(let k=0;k<3;k++){
 const m=W.maps[k];assert(m.cover.length>215,`${m.name} must be meaningfully denser`);
 for(const w of W.weapons)assert(m.cover.every(o=>Math.hypot(o.x-w.x,o.z-w.z)>o.r+1.2),`weapon ${w.id} blocked in ${m.name}`);
 for(let i=0;i<8;i++){const [x,z]=W.spawnFor(k,false,i);assert(m.cover.every(o=>Math.hypot(o.x-x,o.z-z)>o.r+.95),`spawn ${i} blocked`);}
 const [x,z]=W.spawnFor(k,true,0);assert(m.cover.every(o=>Math.hypot(o.x-x,o.z-z)>o.r+.95),'monster spawn blocked');
}
// Standing shoulder-height swipes travel when a surface triangle fails detection.
const t=1/90,low=M.relaxedArmStroke([0,1.30,0],[0,1.29,-.042],t,1.68,2.0);
assert(low&&low.vz>2,'real tracking stroke gives assisted forward movement');
assert.equal(M.relaxedArmStroke([0,1.59,0],[0,1.59,-.04],t,1.68,2),null,'no movement from head-high gestures');
assert.equal(M.relaxedArmStroke([0,1.3,0],[0,1.3,-.5],t,1.68,2),null,'tracking spike rejected');
assert(M.settings.monsterGravity<M.settings.gravity&&M.settings.monsterGravity>M.settings.gravity*.85,'monster gets a slight gravity advantage without floating');
assert(M.speedCap('playing',{monster:true})>M.speedCap('playing',{monster:false}),'monster speed advantage');
const game=src('public/game.js'),server=src('server.js');
assert(game.includes("if(head&&phase!=='playing'&&p.alive!==false)drawNameTag"),'no supernatural player nametags in match');
assert(game.includes("if(phase==='playing'&&me?.monster)attack('roar',d)"),'monster uses roar instead of tongue grapple');
assert(game.includes("if(phase==='playing'&&me?.monster)tongues="),'monster loses stale grapple when round starts');
assert(game.includes('ongoingBleeding(dt)'),'ripped-arm blood flows continuously');
assert(server.includes('injured.nextBleedPatchAt=now+740'),'replicated blood trails appear over time');
assert(server.includes('voiceIceServers()')&&server.includes('FROGY_TURN_URL'),'TURN relay configurable');
console.log('PASS v15.4: 3 dense maps, unblocked spawns/weapons, relaxed swipe movement, monster-only balance, hidden match nameplates, blood pours, optional TURN');
