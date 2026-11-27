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
// v16.5: no fake floor in midair. Upright movement is from tracked strokes.
const waist=C.handSurface([0,.52,0],1.7,'hub',null,false,1.1);
assert.equal(waist,null,'waist-height paw has no invisible air collider');
assert.equal(C.handSurface([0,1.03,0],1.7,'hub',null,false,1.1),null,'standing hands never register phantom floor contact');
assert.equal(C.handSurface([0,.10,0],1.7,'hub',null,false,1.1)?.type,'floor','true physical floor remains usable');
assert.equal(C.handSurface([0,1.57,0],1.7,'hub',null,false,1.1),null,'raising to shoulder stays clear');
const wall=C.handSurface([C.hubBounds-.10,1.4,0],1.7,'hub',null,false,1.1);
assert.equal(wall?.type,'wall','an actually touched wall has a physical collider');
const clipped=C.constrainPaw([C.hubBounds+.1,1.15,0],'hub');
assert.equal(clipped[1],1.15,'wall correction never distorts hand height');
assert(clipped[0]<=C.hubBounds+.1,'a paw is held from passing through a boundary wall');
// Real colliders exist for EACH reachable visual tree, including trunk walls.
assert.equal(C.hubTrees.length>=8,true);
for(const tree of C.hubTrees.slice(0,8)){
 const grip=[tree.x+tree.r+.10,1.0,tree.z];
 assert.equal(C.surfaceAt(grip,'hub')?.type,'wall',`tree ${tree.x},${tree.z} has hand collider`);
 // Tree colliders must be usable by hands, but cannot block the frog torso.
}
const arena={SIZE:65,cover:[{x:0,z:3,r:.7,h:4,type:'tree'}]};
assert.equal(C.surfaceAt([.49,1.4,3],'arena',arena)?.type,'wall','arena trees have hand contact');
// The arena tree is a paw collider; the body has no wall collider in v13.
// Lily platforms are solid from the side, solid on top, and NOT magic lifts
// from underneath. Use crossed-height landing rather than a tiny foot overlap.
for(const pad of C.parkour){
 assert.equal(C.surfaceAt([pad.x,pad.h+.06,pad.z],'hub')?.type,'floor','lily pads have usable hand tops');
 assert.equal(C.sweptLanding(pad.x,pad.z,pad.h+.40,pad.h-.22,true),pad.h,'falling onto pad from above lands');
 assert.equal(C.sweptLanding(pad.x,pad.z,.02,pad.h+.3,true),null,'ascending through underside cannot land');
 // Players can pass through pad sides; its top is still a landing surface.
}
let dz=0,prior=[0,1.05,0];for(let i=1;i<=12;i++){
 const next=[0,1.05,-i*.027];
 const p=M.relaxedArmStroke(prior,next,1/90,1.7,1.5);
 dz+=p?.dz||0;prior=next;
}
assert(dz>.24,'repeated standing-height tracked strokes move forward without fake contacts');
const climb=M.strokeContact({type:'wall',raw:[0,1.4,0],since:1000,lastSeen:1000},[0,1.32,0],wall,.016,1.5,1016);
assert(climb.push?.wall&&climb.push.up>1,'downward hand stroke against wall produces upward body impulse');
const game=fs.readFileSync(require('node:path').join(__dirname,'../public/game.js'),'utf8');
assert(game.includes('FrogyCollision.sweptLanding'),'gameplay actually uses solid platform landing');
assert(!game.includes('hand=FrogyCollision.constrainPaw'),'visible hand matches true controller pose even near walls');
assert(game.includes('FrogyCollision.sweepTrackedBody('),'headset-aligned torso collides with solid buildings while grass remains decorative');
assert(game.includes("function paw(pos,s,color,orientation=0,pose=[0,0,0],side='right')")&&game.includes('const basis=FrogyPawPose.valid(orientation)'),'v16.1 paw renderer must preserve the tracked orientation');
assert(game.includes('Three digits TOTAL:')||game.includes('Three digits TOTAL'), 'redesigned paw has three digits including a thumb');
assert(game.includes('p.moveAmount'),'frog movement animation is wired');
const mirror=game.slice(game.indexOf('function drawMirrorPreview(t)'),game.indexOf('function updateBillboard(t)'));
assert(mirror.includes('DANCE MODE')&&mirror.includes('armLift(')&&mirror.includes('bounce=Math.abs(Math.sin(beat))'),'the mirror avatar dances independently');
assert(!mirror.includes('vrInput['),'mirror animation must not affect controller-tracked hands');
console.log('PASS v12: true tracked hand height, reachable contacts, climb pushes, tree collisions, swept lily landings, slim animated frogs and reference paws');
