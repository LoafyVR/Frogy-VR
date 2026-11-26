'use strict';
/* Frogy v10 compatible movement foundation (originally v6.3) — tracked palms stay at physical controller locations.
   A floor/wall contact probe is separate from the visual hand; the anchored
   probe transfers hand displacement into avatar movement. No thumbstick walk.
   Pure helpers enable deterministic testing without a Quest device. */
const FrogyMotion=(()=>{
 const clamp=(v,a,b)=>Math.min(b,Math.max(a,v));
 const settings=Object.freeze({gravity:7.65,jumpSpeed:7.35,groundDrag:.48,airDrag:.12,maxHorizontalSpeed:12.5,monsterGravity:4.05,monsterAutoHop:7.85,monsterGroundDrag:.25,monsterAirDrag:.045});
 // One shared cap for both the physics loop and controller push handler.
 // v15.1 calculated this only inside physics(), so its first actual arm push
 // threw `ReferenceError: cap is not defined` in updateVRInputs().
 // The old Swift Legs motion is now close to the normal run. Swift Legs adds
 // another clearly noticeable burst, rather than being made obsolete.
 const BASE_RUN=1.8, SWIFT_RUN=1.55;
 function locomotionMultiplier(phase,player){
  return BASE_RUN*(phase==='playing'&&player?.activeTools?.speed?SWIFT_RUN:1);
 }
 function speedCap(phase,player){
  return settings.maxHorizontalSpeed*BASE_RUN*(phase==='playing'&&player?.monster?1.3:1)*(phase==='playing'&&player?.activeTools?.speed?SWIFT_RUN:1);
 }
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
 // Stable tracked-hand locomotion. Raw controller space deliberately excludes the
 // moving avatar rig: applying a push cannot move its own future contact anchor.
 // A brief contact grace prevents flicker on floor/obstacle triangle edges.
 function strokeContact(previous,raw,surface,dt,power=1,now=0){
  if(!raw||raw.length!==3||!raw.every(Number.isFinite)||!Number.isFinite(dt)||dt<=0)return {contact:null,push:null};
  const prev=previous&&previous.raw?previous:null;
  const type=surface?.type||null;
  const grace=prev&&type===null&&now-prev.lastSeen<100&&Math.abs(raw[1]-prev.raw[1])<.08;
  const selected=type||(grace?prev.type:null);
  if(!selected)return {contact:null,push:null};
  const contact={type:selected,raw:[...raw],lastSeen:type?now:prev.lastSeen,since:prev?.type===selected?prev.since:now};
  if(!prev||prev.type!==selected||dt>.09)return {contact,push:null};
  const dx=prev.raw[0]-raw[0],dz=prev.raw[2]-raw[2];
  // Tracking recentering, physically impossible motion, and X/Y teleportation
  // should never result in a violent avatar jerk.
  const planar=Math.hypot(dx,dz),vertical=Math.abs(prev.raw[1]-raw[1]);
  if(planar>.34||vertical>.32)return {contact,push:null};
  const f=clamp(power,.70,3.50),speed=Math.min(23,planar/Math.max(dt,.011)*f);
  // A deliberate downward press on a stable floor contact can propel the body
  // off the floor. Ignore small tracking noise; cap the resulting launch.
  const downward=prev.raw[1]-raw[1];
  const up=downward>.012?clamp((downward/Math.max(dt,.012)-(selected==='wall'?.22:.38))*(selected==='wall'?1.3:1.13),0,selected==='wall'?4.8:4.1):0;
  if((planar<.0014||speed<.04)&&up<.2)return {contact,push:null};
  return {contact,push:{dx:planar>0?dx/planar*speed*dt:0,dz:planar>0?dz/planar*speed*dt:0,vx:planar>0?dx/planar*speed:0,vz:planar>0?dz/planar*speed:0,up,wall:selected==='wall',source:'tracking-space'}};
 }
 // Keep forward speed on A-jump; a subtle takeoff impulse makes swinging
 // into a jump rewarding but never converts thumbsticks to locomotion.
 function relaxedArmStroke(before,after,dt,headHeight,power=1){
  if(!before||!after||!before.every(Number.isFinite)||!after.every(Number.isFinite)||!Number.isFinite(dt)||dt<=0||dt>.07)return null;
  const handY=Math.min(before[1],after[1]);
  if(handY>headHeight-.32||handY<.20)return null;
  const dx=before[0]-after[0],dz=before[2]-after[2],length=Math.hypot(dx,dz);
  if(length<.005||length>.23||Math.abs(before[1]-after[1])>.25)return null;
  const gain=clamp(power,.7,3.5)*.68; // v15.4 behavior; 5mm strokes now register
  // A real tracked swipe is required: idle paws and random jitter don't move.
  const speed=Math.min(13,length/Math.max(dt,.012)*gain);
  return {dx:dx*gain,dz:dz*gain,vx:dx/length*speed,vz:dz/length*speed,up:0,wall:false,source:'relaxed-stroke'};
 }
 function preserveJump(v){
  const speed=Math.hypot(v.x,v.z);
  return {x:v.x,y:settings.jumpSpeed+Math.min(.38,speed*.038),z:v.z};
 }
 // Jump buffering gives a brief grace window when A is pressed just before landing.
 function jumpBuffered(pressedAt,now,windowMs=155){return Number.isFinite(pressedAt)&&now-pressedAt>=0&&now-pressedAt<=windowMs;}
 function coyoteJump(lastGround,now,ms=155){return Number.isFinite(lastGround)&&now-lastGround>=0&&now-lastGround<=ms;}

 function drag(grounded,dt,monster=false){return Math.exp(-(grounded?(monster?settings.monsterGroundDrag:settings.groundDrag):(monster?settings.monsterAirDrag:settings.airDrag))*dt);}
 function isLobby(phase,spectating){return phase!=='playing'||!!spectating;}
 function canMove(phase,alive,spectating,menuOpen){return phase!=='playing'||!!spectating||!!alive;}
 function canJump(phase,alive,spectating,menuOpen){return phase!=='playing'||!!spectating||!!alive;}
 return {settings,BASE_RUN,SWIFT_RUN,locomotionMultiplier,speedCap,virtualReach,virtualPaw,renderHand,reachPlane,floorContact,handPush,stepContact,strokeContact,relaxedArmStroke,preserveJump,jumpBuffered,coyoteJump,drag,isLobby,canMove,canJump};
})();
if(typeof module!=='undefined'&&module.exports)module.exports=FrogyMotion;
