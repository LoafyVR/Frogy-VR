'use strict';
/* Frogy arm movement tuning. Shared pure calculations are deliberately unit-testable
   without a VR headset. No joystick-based locomotion in immersive VR. */
const FrogyMotion=(()=>{
 const clamp=(v,lo,hi)=>Math.min(hi,Math.max(lo,v));
 const settings=Object.freeze({gravity:8.4,jumpSpeed:6.65,groundDrag:2.35,airDrag:.29,maxHorizontalSpeed:9.2});
 // A player's relaxed hands are below their headset, not at the physical floor.
 // Dynamically calibrate a virtual hand-contact plane to their standing/sitting height.
 function reachPlane(headHeight){return clamp(headHeight-.25,.72,1.85);}
 function handPush(prev,cur,dt,headHeight,nearGround,isWall){
  if(!prev||!cur||!Number.isFinite(dt)||dt<.005||dt>.085)return null;
  const contactFloor=nearGround&&Math.min(prev[1],cur[1])<=reachPlane(headHeight)+.10;
  if(!contactFloor&&!isWall)return null;
  const dx=clamp(cur[0]-prev[0],-.20,.20),dy=clamp(cur[1]-prev[1],-.20,.20),dz=clamp(cur[2]-prev[2],-.20,.20);
  const strength=Math.hypot(dx,dy,dz);
  if(strength<.004)return null;
  return {dx:-dx*1.33,dz:-dz*1.33,vx:clamp(-dx/dt*.42,-7.5,7.5),vz:clamp(-dz/dt*.42,-7.5,7.5),up:dy<0?clamp(-dy/dt*.23,0,3.4):0,wall:isWall};
 }
 function preserveJump(v){return {x:v.x,y:settings.jumpSpeed,z:v.z};}
 function drag(grounded,dt){return Math.exp(-(grounded?settings.groundDrag:settings.airDrag)*dt);}
 return {settings,reachPlane,handPush,preserveJump,drag};
})();
if(typeof module!=='undefined'&&module.exports)module.exports=FrogyMotion;
