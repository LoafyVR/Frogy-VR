'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const C=require('../public/collision.js'),M=require('../public/movement.js'),G=require('../public/grapple.js'),W=require('../public/world.js');
const root=path.resolve(__dirname,'..');
const game=fs.readFileSync(path.join(root,'public/game.js'),'utf8');
const dt=1/90, world={SIZE:W.SIZE,cover:[]};
// Lowered controller + player's virtual forearm reaches the real floor at
// normal standing height; a high hand never touches the ground.
for(const height of [1.3,1.7,1.95]){
 const low=.47*height;
 assert.equal(C.groundedHandSurface([0,low,0],height,'arena',world,true)?.type,'floor',`accessible standing contact ${height}`);
 assert.equal(C.groundedHandSurface([0,low+.3,0],height,'arena',world,false),null,`no phantom floor while jumping ${height}`);
 assert.equal(C.groundedHandSurface([0,height-.12,0],height,'arena',world,true),null,`head-high controllers cannot plant ${height}`);
}
assert.equal(C.groundedHandSurface([0,.85,0],1.7,'arena',world,false),null,'landing delay does not create ground contact before grounded');
const wallWorld={SIZE:58,cover:[{x:1,z:0,r:.6,h:4,type:'tree'}]};
assert.equal(C.groundedHandSurface([1.4,1.1,0],1.7,'arena',wallWorld,false)?.type,'wall','real wall can be used even in the air');
assert.equal(C.groundedHandSurface([0,1.1,0],1.7,'arena',wallWorld,false),null,'walls have no invisible reach extension');

// Any propulsion is gated by a solid contact, never the controller's movement alone.
const planted=C.groundedHandSurface([0,.91,0],1.7,'arena',world,true);
assert.equal(planted?.type,'floor');
let first=M.strokeContact(null,[0,.91,0],planted,dt,1.7,1000);
assert(first.contact&&!first.push,'first physical ground contact creates an anchor with no jump');
const stepped=M.strokeContact(first.contact,[0,.86,-.05],planted,dt,1.7,1011);
assert(stepped.push?.vz>1.0,'pushing off planted hand moves forward');
assert(stepped.push?.up>1.1,'pressing down on planted hand gives a smaller jump');
assert(M.preserveJump({x:0,y:0,z:0}).y>Math.min(5.2,stepped.push.up*1.3)+1,'A is a higher jump than arm launch');
const airborne=M.strokeContact(stepped.contact,[0,.85,.04],null,dt,1.7,1022);
assert.equal(airborne.contact,null,'releasing contact removes anchor immediately');
assert.equal(airborne.push,null,'recovery swing in air never shoves the player backward');
const airborneAgain=M.strokeContact(stepped.contact,[0,.85,.06],null,dt,1.7,1033);
assert.equal(airborneAgain.push,null,'prior planted hand cannot receive stale 100ms grace');
const side=M.strokeContact(first.contact,[.045,.91,0],planted,dt,1.7,1011);
assert(side.push?.vx<-.5,'ground contact allows deliberate sideways push');
const wall=C.groundedHandSurface([1.4,1.1,0],1.7,'arena',wallWorld,false);
assert(wall?.type==='wall','airborne wall touch is legitimate');
const firstWall=M.strokeContact(null,[1.4,1.1,0],wall,dt,1.7,1020);
const wallPush=M.strokeContact(firstWall.contact,[1.4,1.03,0],wall,dt,1.7,1031);
assert(wallPush.push?.up>0,'pushing down on REAL wall can climb while in air');

// One cooldown shared by BOTH controller buttons after any release.
assert(G.COOLDOWN_MS>=6000,'tongue has a substantially longer cooldown');
const start=1000,ready=G.sharedCooldown(start,0);
assert.equal(ready,start+G.COOLDOWN_MS);
assert(!G.canFireShared({left:{active:false},right:{active:false}},ready,start+100),'cannot switch hands to bypass cooldown');
assert(!G.canFireShared({left:{active:true},right:{active:false}},0,start+100),'only one active mouth tongue');
assert(G.canFireShared({left:{active:false},right:{active:false}},ready,ready),'either button may fire after full shared cooldown');
assert(G.sharedCooldown(start-100,ready)===ready,'older timer does not shorten cooldown');
assert(game.includes("FrogyCollision.groundedHandSurface(")&&game.includes('const gate=FrogyMotion.gateArmStroke(strokeGates[side],step.push,now)'),
 'actual Quest loop drives movement exclusively from current contact');
assert(!game.includes('FrogyMotion.relaxedArmStroke(')&&!game.includes('FrogyMotion.groundPress('),
 'no air-swing or fake waist-height hand press remains in active Quest locomotion');
assert(game.includes('FrogyGrapple.canFireShared(')&&game.includes('releaseTongue(performance.now()'),
 'both controllers use shared cooldown including natural and blocked releases');
// Denser maps without sacrificing medkits, weapon pickup safety, or spawn safety.
for(const [i,map] of W.maps.entries()){
 assert(map.cover.length>=290,`map ${i} offers more launch/grapple surfaces`);
 assert.equal(map.medkits.length,2,`map ${i} still has two kits`);
 for(const w of W.weapons)assert(map.cover.every(o=>Math.hypot(w.x-o.x,w.z-o.z)>o.r+1.2),`weapon ${w.id} isn't buried`);
 for(let j=0;j<8;j++){
  const [x,z]=W.spawnFor(i,false,j);
  assert(map.cover.every(o=>Math.hypot(x-o.x,z-o.z)>o.r+.9),`spawn ${i}/${j} remains accessible`);
 }
}
console.log('PASS v16.9: standing grounded push and small hop; strict no-air-juke; airborne wall climb; higher A jump; 7s shared grapple; dense safe maps');
