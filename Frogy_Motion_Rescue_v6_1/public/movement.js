'use strict';
/* Frogy arm movement tuning. Shared pure calculations are deliberately unit-testable
   without a VR headset. No joystick-based locomotion in immersive VR. */
const FrogyMotion=(()=>{
 const clamp=(v,lo,hi)=>Math.min(hi,Math.max(lo,v));
 const settings=Object.freeze({gravity:8.6,jumpSpeed:6.8,groundDrag:1.4,airDrag:.22,maxHorizontalSpeed:10.0});
 // A player's relaxed hands are below their headset, not at the physical floor.
 // Dynamically calibrate a virtual hand-contact plane to their standing/sitting height.
 function reachPlane(headHeight){return clamp(headHeight-.07,.85,1.95);}
 function handPush(prev,cur,dt,headHeight,nearGround,isWall){
  if(!prev||!cur||!Number.isFinite(dt)||dt<.005||dt>.085)return null;
  const contactFloor=nearGround&&Math.min(prev[1],cur[1])<=reachPlane(headHeight)+.10;
  if(!contactFloor&&!isWall)return null;
  const dx=clamp(cur[0]-prev[0],-.20,.20),dy=clamp(cur[1]-prev[1],-.20,.20),dz=clamp(cur[2]-prev[2],-.20,.20);
  const strength=Math.hypot(dx,dy,dz);
  // Avoid jitter drifting the player, without discarding normal deliberate hand strokes.
  if(strength<.008)return null;
  return {dx:-dx*1.33,dz:-dz*1.33,vx:clamp(-dx/dt*.42,-7.5,7.5),vz:clamp(-dz/dt*.42,-7.5,7.5),up:dy<0?clamp(-dy/dt*.23,0,3.4):0,wall:isWall};
 }
 function preserveJump(v){return {x:v.x,y:settings.jumpSpeed,z:v.z};}
 function drag(grounded,dt){return Math.exp(-(grounded?settings.groundDrag:settings.airDrag)*dt);}
 function isLobby(phase,spectating){return phase!=='playing'||!!spectating;}
 // Headset lobby movement is intentional even when the menu is open: otherwise
 // players spawn behind a menu and perceive the entire game as frozen.
 function canMove(phase,alive,spectating,menuOpen){return phase!=='playing'||!!spectating||(!!alive&&!menuOpen);}
 function canJump(phase,alive,spectating,menuOpen){return phase!=='playing'||!!spectating||(!!alive&&!menuOpen);}
 return {settings,reachPlane,handPush,preserveJump,drag,isLobby,canMove,canJump};
})();
if(typeof module!=='undefined'&&module.exports)module.exports=FrogyMotion;
