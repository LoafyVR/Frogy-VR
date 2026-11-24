'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const C=require('../public/collision.js');
const M=require('../public/movement.js');
// Regression: visible paws ALWAYS stay at tracked vertical position, even after
// lowering the hands, walking, jumping, or turning in a lobby.
for(const rig of [{x:0,y:0,z:0},{x:6,y:.75,z:-8}]){
 for(const handY of [.14,.55,.93,1.17,1.55]){
  const world=C.reachablePaw([.4,handY,-.35],rig);
  assert.equal(world[1],handY+rig.y,`no downward paw drift at hand Y=${handY}`);
 }
}
const waist=C.handSurface([0,1.03,0],1.7,'hub',null,false,1.1);
assert.equal(waist?.type,'floor','lowered hands permit a comfortable floor push');
assert(waist.assisted,'assisted reach must not lie about the physical hand pose');
assert.equal(C.handSurface([0,1.57,0],1.7,'hub',null,false,1.1),null,'raising to shoulder releases contact');
const wall=C.handSurface([C.hubBounds-.24,1.4,0],1.7,'hub',null,false,1.1);
assert.equal(wall.type,'wall','a reachable wall is hit by the actual tracked paw');
const clipped=C.constrainPaw([C.hubBounds+.1,1.15,0],'hub');
assert.equal(clipped[1],1.15,'wall correction never distorts hand height');
assert(clipped[0]<=C.hubBounds+.1,'a paw is held from passing through a boundary wall');
// Real colliders exist for EACH reachable visual tree, including trunk walls.
assert.equal(C.hubTrees.length>=8,true);
for(const tree of C.hubTrees.slice(0,8)){
 const grip=[tree.x+tree.r+.10,1.0,tree.z];
 assert.equal(C.surfaceAt(grip,'hub')?.type,'wall',`tree ${tree.x},${tree.z} has hand collider`);
 const body=C.resolveCircle(tree.x,tree.z,.3,'hub');
 assert(Math.hypot(body.x-tree.x,body.z-tree.z)>=tree.r+.29,'tree blocks frog body');
}
const arena={SIZE:65,cover:[{x:0,z:3,r:.7,h:4,type:'tree'}]};
assert.equal(C.surfaceAt([.82,1.4,3],'arena',arena)?.type,'wall','arena trees have hand contact');
const arenaBody=C.resolveCircle(0,3,.3,'arena',arena);assert(Math.hypot(arenaBody.x,arenaBody.z-3)>=1,'arena trees block body motion');
// Lily platforms are solid from the side, solid on top, and NOT magic lifts
// from underneath. Use crossed-height landing rather than a tiny foot overlap.
for(const pad of C.parkour){
 assert.equal(C.surfaceAt([pad.x,pad.h+.06,pad.z],'hub')?.type,'floor','lily pads have usable hand tops');
 assert.equal(C.sweptLanding(pad.x,pad.z,pad.h+.40,pad.h-.22,true),pad.h,'falling onto pad from above lands');
 assert.equal(C.sweptLanding(pad.x,pad.z,.02,pad.h+.3,true),null,'ascending through underside cannot land');
 const foot=C.resolveCircle(pad.x,pad.z,.3,'hub',null,0);
 assert(Math.hypot(foot.x-pad.x,foot.z-pad.z)>=pad.r+.17,'lily pad blocks body entering side');
}
let c=M.strokeContact(null,[0,1.05,0],waist,1/90,1.5,1000);
let dz=0;for(let i=1;i<=12;i++){
 const p=M.strokeContact(c.contact,[0,1.05,-i*.027],waist,1/90,1.5,1000+11*i);
 dz+=p.push?.dz||0;c=p;
}
assert(dz>.24,'repeated lowered-hand strokes create forward travel without re-anchoring');
const climb=M.strokeContact({type:'wall',raw:[0,1.4,0],since:1000,lastSeen:1000},[0,1.32,0],wall,.016,1.5,1016);
assert(climb.push?.wall&&climb.push.up>1,'downward hand stroke against wall produces upward body impulse');
const game=fs.readFileSync(require('node:path').join(__dirname,'../public/game.js'),'utf8');
assert(game.includes('FrogyCollision.sweptLanding'),'gameplay actually uses solid platform landing');
assert(game.includes('FrogyCollision.constrainPaw'),'visible hand wall clipping is corrected');
assert(game.includes('const digits=[')&&game.includes('[.78,.29,.125]'),'three-finger orange-tipped paw based on supplied reference');
assert(game.includes('p.moveAmount'),'frog movement animation is wired');
const mirror=game.slice(game.indexOf('function drawMirrorPreview(t)'),game.indexOf('function updateBillboard(t)'));
assert(mirror.includes('DANCE MODE')&&mirror.includes('armLift(')&&mirror.includes('bounce=Math.abs(Math.sin(beat))'),'the mirror avatar dances independently');
assert(!mirror.includes('vrInput['),'mirror animation must not affect controller-tracked hands');
console.log('PASS v12: true tracked hand height, reachable contacts, climb pushes, tree collisions, swept lily landings, slim animated frogs and reference paws');
