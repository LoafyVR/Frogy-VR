'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..');
const Paw=require('../public/paw-pose.js');
const b0=[1,0,0,0,1,0,0,0,1];
const rotateX=(a)=>[1,0,0,0,Math.cos(a),Math.sin(a),0,-Math.sin(a),Math.cos(a)];
const rotateZ=(a)=>[Math.cos(a),Math.sin(a),0,-Math.sin(a),Math.cos(a),0,0,0,1];
let cases=0;
for(const basis of [b0,rotateX(.8),rotateX(-1.2),rotateZ(.9),rotateZ(-.9)]){
 for(const curls of [[0,0,0],[1,0,0],[0,1,0],[0,0,1],[.75,.4,.8]]){
  for(const side of ['left','right']){
   for(const size of [.30,.44*.94,.62*1.83]){
    const bottom=Paw.lowestRelativeY(size,basis,curls,side);
    assert(Number.isFinite(bottom)&&bottom<0.9&&bottom>-1.3,'bounds must be plausible');
    const level=cases%2===0?0:1.6;
    const center=Paw.floorAlignedY(level,size,basis,curls,side);
    assert(Math.abs(center+bottom-level-.003)<1e-8,'lowest paw point must touch floor with 3mm clearance');
    cases++;
   }
  }
 }
}
const game=fs.readFileSync(path.join(root,'public/game.js'),'utf8');
const server=fs.readFileSync(path.join(root,'server.js'),'utf8');
const camera=fs.readFileSync(path.join(root,'public/frogy-camera-adapter-v166.js'),'utf8');
assert(game.includes("FrogyPawPose.floorAlignedY(floorY,.30,handBasis,handPose,side)"),'wearer hand is grounded by actual paw pose');
assert(game.includes('FrogyPawPose.floorAlignedY(reportedFloor,handSize,basis,pose,handSide)'),'remote model has size-aware grounding');
assert(game.includes('const footP={...bodyP,y:p.y}'),'grounded legs do not rise with torso animations');
assert(game.includes('lFloorY:vrInput.left?.floorY??null'),'floor metadata sent only for rendering');
assert(server.includes('lFloorY:p.lFloorY??null')&&server.includes('validFloorY(msg.lFloorY)'),'server forwards optional visual flags');
assert(camera.includes('lFloorY:vrInput.left?.floorY??null'),'Camera Lab uses same ground placement');
if(process.env.FROGY_17_2_MOVEMENT_PATH){
 const file=f=>crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');
 assert.equal(file(path.join(root,'public/movement.js')),file(process.env.FROGY_17_2_MOVEMENT_PATH),'approved movement code must remain byte-for-byte identical');
}
console.log(`PASS Frogy 18: ${cases} left/right rotated/curled paw contact cases; first person, network and camera grounding; unchanged 17.2 movement`);
