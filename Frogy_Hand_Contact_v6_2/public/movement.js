'use strict';
/* FROGY WebXR arm locomotion. Controller tracking is in local-floor space;
   each hand has a projected virtual paw and a short-lived surface anchor.
   No thumbstick translation is used. Pure helpers enable repeatable tests. */
const FrogyMotion=(()=>{
 const clamp=(v,lo,hi)=>Math.min(hi,Math.max(lo,v));
 const settings=Object.freeze({gravity:8.15,jumpSpeed:7.15,groundDrag:1.12,airDrag:.12,maxHorizontalSpeed:11.5});
 function virtualReach(headHeight,multiplier=1){return clamp(headHeight*.53+.09,.53,1.23)*clamp(multiplier,.85,1.35);}
 function virtualPaw(raw,rigY,headHeight,multiplier=1){return [raw[0],raw[1]+rigY-virtualReach(headHeight,multiplier),raw[2]];}
 function reachPlane(headHeight){return virtualReach(headHeight)+.25;}
 function floorContact(raw,rigY,headHeight,multiplier=1){return virtualPaw(raw,rigY,headHeight,multiplier)[1]<=.27;}
 function handPush(prev,cur,dt,headHeight,nearGround,isWall,power=1){
  if(!prev||!cur||!Number.isFinite(dt)||dt<.005||dt>.085)return null;
  if(!(nearGround&&Math.min(prev[1],cur[1])<=reachPlane(headHeight))&&!isWall)return null;
  const dx=clamp(cur[0]-prev[0],-.23,.23),dy=clamp(cur[1]-prev[1],-.23,.23),dz=clamp(cur[2]-prev[2],-.23,.23);
  if(Math.hypot(dx,dy,dz)<.006)return null;
  return {dx:-dx*power,dz:-dz*power,vx:clamp(-dx/dt*.48*power,-9,9),vz:clamp(-dz/dt*.48*power,-9,9),up:dy<0?clamp(-dy/dt*.29,0,3.2):0,wall:isWall};
 }
 // Surface is {type:'floor'|'wall', point:[x,y,z]}. On first touch
 // the paw is planted. On later frames, moving the controller moves the
 // player's rig in the opposite direction, as in arm-driven climbing games.
 // The anchor can never last through jumping or releasing contact.
 function stepContact(previous,raw,rig,dt,surface,now,power=1){
  if(!surface||!Number.isFinite(dt)||dt<=0)return {contact:null,push:null};
  const p=surface.point;
  if(!previous||previous.type!==surface.type||now-previous.since>900){
   return {contact:{type:surface.type,point:[...p],since:now},push:null};
  }
  const cur=[raw[0]+rig.x,raw[1]+rig.y,raw[2]+rig.z];
  const dx=clamp(previous.point[0]-cur[0],-.14,.14),dz=clamp(previous.point[2]-cur[2],-.14,.14);
  const gap=Math.hypot(previous.point[0]-cur[0],previous.point[2]-cur[2]);
  if(gap>1.05)return {contact:{type:surface.type,point:[...p],since:now},push:null};
  if(Math.hypot(dx,dz)<.003)return {contact:previous,push:null};
  const f=clamp(power,.7,1.8);
  return {contact:previous,push:{dx:dx*.93*f,dz:dz*.93*f,vx:clamp(dx/dt*.37*f,-9.5,9.5),vz:clamp(dz/dt*.37*f,-9.5,9.5)}};
 }
 function preserveJump(v){return {x:v.x,y:settings.jumpSpeed,z:v.z};}
 function drag(grounded,dt){return Math.exp(-(grounded?settings.groundDrag:settings.airDrag)*dt);}
 function isLobby(phase,spectating){return phase!=='playing'||!!spectating;}
 // Opening Settings must never disable the user's ability to get unstuck.
 function canMove(phase,alive,spectating,menuOpen){return phase!=='playing'||!!spectating||!!alive;}
 function canJump(phase,alive,spectating,menuOpen){return phase!=='playing'||!!spectating||!!alive;}
 return {settings,virtualReach,virtualPaw,reachPlane,floorContact,handPush,stepContact,preserveJump,drag,isLobby,canMove,canJump};
})();
if(typeof module!=='undefined'&&module.exports)module.exports=FrogyMotion;
