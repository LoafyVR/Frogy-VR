'use strict';
/* Frogy v6.3 — tracked palms stay at physical controller locations.
   A floor/wall contact probe is separate from the visual hand; the anchored
   probe transfers hand displacement into avatar movement. No thumbstick walk.
   Pure helpers enable deterministic testing without a Quest device. */
const FrogyMotion=(()=>{
 const clamp=(v,a,b)=>Math.min(b,Math.max(a,v));
 const settings=Object.freeze({gravity:7.65,jumpSpeed:7.35,groundDrag:1.32,airDrag:.12,maxHorizontalSpeed:12.5});
 // Distance beneath a real tracked palm at which a virtual contact probe can
 // reach the floor. This does NOT move the visible hand or controller ray.
 function virtualReach(headHeight,multiplier=1){return clamp(headHeight*.43+.15,.58,1.10)*clamp(multiplier,.86,1.38);}
 function virtualPaw(raw,rigY,headHeight,multiplier=1){return [raw[0],raw[1]+rigY-virtualReach(headHeight,multiplier),raw[2]];}
 function renderHand(raw,rig){return [raw[0]+rig.x,raw[1]+rig.y,raw[2]+rig.z];}
 function reachPlane(headHeight){return virtualReach(headHeight)+.36;}
 function floorContact(raw,rigY,headHeight,multiplier=1,alreadyPlanted=false){
  if(!raw||!raw.every(Number.isFinite))return false;
  // A controller up next to the headset is never a floor contact.
  if(raw[1]>headHeight-.28)return false;
  return virtualPaw(raw,rigY,headHeight,multiplier)[1]<=(alreadyPlanted?.31:.24);
 }
 function handPush(prev,cur,dt,headHeight,nearGround,isWall,power=1){
  if(!prev||!cur||!Number.isFinite(dt)||dt<=0||dt>.12)return null;
  if(!(nearGround&&Math.min(prev[1],cur[1])<=reachPlane(headHeight))&&!isWall)return null;
  const f=clamp(power,.75,1.9),dx=clamp(prev[0]-cur[0],-.25,.25)*f,dz=clamp(prev[2]-cur[2],-.25,.25)*f;
  if(Math.hypot(dx,dz)<.004)return null;
  return {dx,dz,vx:clamp(dx/dt,-11,11),vz:clamp(dz/dt,-11,11),up:0,wall:isWall};
 }
 function stepContact(previous,raw,rig,dt,surface,now,power=1){
  if(!surface||!raw||!Number.isFinite(dt)||dt<=0)return {contact:null,push:null};
  const current=renderHand(raw,rig);
  if(!previous||previous.type!==surface.type){return {contact:{type:surface.type,point:[...surface.point],since:now},push:null};}
  // A large teleport / recenter or a jump must not yank the camera across the map.
  const gap=Math.hypot(previous.point[0]-current[0],previous.point[2]-current[2]);
  if(gap>1.12)return {contact:{type:surface.type,point:[...surface.point],since:now},push:null};
  const factor=clamp(power,.75,1.9),dx=clamp(previous.point[0]-current[0],-.26,.26)*factor,dz=clamp(previous.point[2]-current[2],-.26,.26)*factor;
  if(Math.hypot(dx,dz)<.002)return {contact:previous,push:null};
  return {contact:previous,push:{dx,dz,vx:clamp(dx/dt,-12,12),vz:clamp(dz/dt,-12,12)}};
 }
 function preserveJump(v){return {x:v.x,y:settings.jumpSpeed,z:v.z};}
 function drag(grounded,dt){return Math.exp(-(grounded?settings.groundDrag:settings.airDrag)*dt);}
 function isLobby(phase,spectating){return phase!=='playing'||!!spectating;}
 function canMove(phase,alive,spectating,menuOpen){return phase!=='playing'||!!spectating||!!alive;}
 function canJump(phase,alive,spectating,menuOpen){return phase!=='playing'||!!spectating||!!alive;}
 return {settings,virtualReach,virtualPaw,renderHand,reachPlane,floorContact,handPush,stepContact,preserveJump,drag,isLobby,canMove,canJump};
})();
if(typeof module!=='undefined'&&module.exports)module.exports=FrogyMotion;
