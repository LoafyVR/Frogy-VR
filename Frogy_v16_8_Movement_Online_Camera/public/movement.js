'use strict';
/* Frogy v10 compatible movement foundation (originally v6.3) — tracked palms stay at physical controller locations.
   A floor/wall contact probe is separate from the visual hand; the anchored
   probe transfers hand displacement into avatar movement. No thumbstick walk.
   Pure helpers enable deterministic testing without a Quest device. */
const FrogyMotion=(()=>{
 const clamp=(v,a,b)=>Math.min(b,Math.max(a,v));
 const settings=Object.freeze({gravity:7.65,jumpSpeed:7.35,groundDrag:7.2,airDrag:.48,maxHorizontalSpeed:12.5,monsterGravity:7.36,monsterAutoHop:7.35,monsterGroundDrag:7.2,monsterAirDrag:.48});
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
  return settings.maxHorizontalSpeed*BASE_RUN*(phase==='playing'&&player?.monster?1.15:1)*(phase==='playing'&&player?.activeTools?.speed?SWIFT_RUN:1);
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
  if((planar<.0018||speed<.06)&&up<.2)return {contact,push:null};
  return {contact,push:{dx:planar>0?dx/planar*speed*dt:0,dz:planar>0?dz/planar*speed*dt:0,vx:planar>0?dx/planar*speed:0,vz:planar>0?dz/planar*speed:0,up,wall:selected==='wall',source:'tracking-space'}};
 }
 // Keep forward speed on A-jump; a subtle takeoff impulse makes swinging
 // into a jump rewarding but never converts thumbsticks to locomotion.
 // Keep locomotion strokes relative to the tracked headset rather than the
 // tracking-room origin. Walking, leaning or crouching in real life moves the
 // headset and controller together: it must NOT produce an extra virtual push.
 // Normalize headset height to 1.65m so crouching alone cannot trigger a hop.
 function relativeStrokePose(raw,headOffset,headY){
  if(!raw||!raw.every(Number.isFinite))return null;
  const hx=Number.isFinite(headOffset?.x)?headOffset.x:0;
  const hz=Number.isFinite(headOffset?.z)?headOffset.z:0;
  const hy=Number.isFinite(headY)?headY:1.65;
  return [raw[0]-hx,raw[1]-hy+1.65,raw[2]-hz];
 }
 // Low-pass tiny XR tracking fluctuations without drifting the visible paw.
 // Only the propulsion probe is filtered; hand mesh and aim remain 1:1.
 function smoothStroke(previous,target,dt){
  if(!target||!target.every(Number.isFinite))return null;
  if(!previous||!previous.every(Number.isFinite)||!(dt>0)||dt>.10||
     Math.hypot(target[0]-previous[0],target[1]-previous[1],target[2]-previous[2])>.45)return [...target];
  const alpha=clamp(1-Math.exp(-23*dt),.16,.85);
  return previous.map((v,i)=>v+(target[i]-v)*alpha);
 }
 // Integrate the arm's REAL tracking displacement, subtracting only motion
 // that the headset AND hand share. Subtracting the whole head displacement
 // would be wrong: looking/leaning with stationary hands must not propel Frogy.
 // Smoothed head and hand inputs are sampled at the same time each frame.
 function integratedArmStroke(previousDrive,previousHand,hand,previousHead,head){
  if(!previousDrive||!previousHand||!hand||!previousHead||!head)return hand?[...hand]:null;
  const result=[];
  for(let i=0;i<3;i++){
   const h=hand[i]-previousHand[i],b=head[i]-previousHead[i];
   if(!Number.isFinite(h)||!Number.isFinite(b))return [...hand];
   const shared=h*b>0?Math.sign(h)*Math.min(Math.abs(h),Math.abs(b)):0;
   result.push(previousDrive[i]+h-shared);
  }
  return result;
 }
 function relaxedArmStroke(before,after,dt,headHeight,power=1){
  if(!before||!after||!before.every(Number.isFinite)||!after.every(Number.isFinite)||!Number.isFinite(dt)||dt<=0||dt>.07)return null;
  const handY=Math.min(before[1],after[1]);
  if(handY>headHeight-.23||handY<-.08)return null;
  const dx=before[0]-after[0],dz=before[2]-after[2],length=Math.hypot(dx,dz);
  if(length<.0028||length>.28||Math.abs(before[1]-after[1])>.28)return null;
  const gain=clamp(power,.7,3.5)*1.02; // responsive upright strokes, with no fake floor contacts
  // A real tracked swipe is required: idle paws and random jitter don't move.
  const speed=Math.min(11,length/Math.max(dt,.012)*gain);
  return {dx:dx*gain,dz:dz*gain,vx:dx/length*speed,vz:dz/length*speed,up:0,wall:false,source:'relaxed-stroke'};
 }
 // A low tracked paw pressing DOWN contributes an upward impulse even when
 // an assisted collider comes and goes between frames. The physical paw stays
 // at its real controller pose; no fake mesh or floor snap is ever rendered.
 // This is important for a first ground stroke, which cannot have a preexisting
 // contact anchor. Both monster and survivor use exactly the same calculation.
 function groundPress(before,after,dt,headHeight,power=1){
  if(!before||!after||!before.every(Number.isFinite)||!after.every(Number.isFinite)||!Number.isFinite(dt)||dt<=0||dt>.08)return null;
  // Match the upright ground-assist zone: players should press down from
  // their normal standing hand height, not physically bend to knee level.
  // This remains a real downward controller movement, not automatic jumping.
  const reach=Math.min(headHeight-.39,clamp(headHeight*.69,.68,1.28)),down=before[1]-after[1];
  // Reject sub-centimeter tracking noise that previously caused repeated
  // unintentional bobbing/hops while holding the controllers still.
  if(Math.min(before[1],after[1])>reach||before[1]<-.08||down<.021||down>.20)return null;
  const up=clamp((down/Math.max(dt,.011))*1.65*clamp(power,.65,2.7),0,4.3);
  if(up<1.45)return null;
  return {dx:0,dz:0,vx:0,vz:0,up,wall:false,source:'ground-press'};
 }
 // Short strokes must produce short movements. v15.4 converted even small pushes
 // into running velocity and kept almost all of it on the ground, causing slide.
 // The tracked displacement stays proportional, with no minimum forward speed.
 function strokeVelocity(pushes,dt,phase,player){
  if(!Array.isArray(pushes)||!pushes.length||!Number.isFinite(dt)||dt<=0)return null;
  const dx=pushes.reduce((s,p)=>s+(Number(p.dx)||0),0)/pushes.length;
  const dz=pushes.reduce((s,p)=>s+(Number(p.dz)||0),0)/pushes.length;
  const speed=Math.hypot(dx,dz)/Math.max(.009,dt);
  if(!Number.isFinite(speed)||speed<.065)return null;
  const isMega=phase==='playing'&&!!player?.monster;
  const swift=phase==='playing'&&!!player?.activeTools?.speed;
  const maximum=(isMega?11.0:9.4)*(swift?SWIFT_RUN:1);
  const magnitude=Math.min(maximum,speed*(isMega?1.15:.96));
  const distance=Math.hypot(dx,dz);
  return {x:dx/distance*magnitude,z:dz/distance*magnitude};
 }
 // A single 2cm Quest wrist tick must not accelerate the entire avatar by
 // several meters per second in one 72/90Hz frame. Shared survivor/monster
 // acceleration cap; monster has a modest speed edge, not unstable physics.
 function stabilizeArmVelocity(current,target,dt,phase,player,grounded){
  if(!target||!Number.isFinite(target.x)||!Number.isFinite(target.z)||!Number.isFinite(dt)||dt<=0)return current;
  const monster=phase==='playing'&&!!player?.monster;
  const swift=phase==='playing'&&!!player?.activeTools?.speed;
  const maxSpeed=(monster?8.8:7.8)*(swift?1.3:1);
  const len=Math.hypot(target.x,target.z);
  const scale=len>maxSpeed?maxSpeed/len:1;
  const goal={x:target.x*scale,z:target.z*scale};
  const maxStep=Math.max(.005,Math.min(dt,.06))*(grounded?(monster?54:48):(monster?34:30));
  const deltaX=goal.x-(Number(current?.x)||0),deltaZ=goal.z-(Number(current?.z)||0);
  const stepLen=Math.hypot(deltaX,deltaZ),stepScale=stepLen>maxStep?maxStep/stepLen:1;
  return {x:(Number(current?.x)||0)+deltaX*stepScale,z:(Number(current?.z)||0)+deltaZ*stepScale};
 }
 // Anti-wobble gate: a push followed immediately by resetting the hand must
 // NOT send a reverse impulse into the character. Changing travel direction is
 // still possible after a brief pause. This operates on tracked displacements,
 // never on an invisible collider or the player's head pitch.
 function gateArmStroke(previous,push,now){
  if(!push||!Number.isFinite(push.vx)||!Number.isFinite(push.vz))return {state:previous&&now-previous.at<420?previous:null,push:null};
  const magnitude=Math.hypot(push.vx,push.vz);
  if(magnitude<.07)return {state:previous||null,push:null};
  const direction=[push.vx/magnitude,push.vz/magnitude];
  const previousValid=previous&&Number.isFinite(previous.at)&&now>=previous.at;
  const old=previousValid?previous:null;
  const gap=old?now-old.at:Infinity;
  const oppose=old&&direction[0]*old.direction[0]+direction[1]*old.direction[1]<-.38;
  if(oppose&&gap<540)return {state:old,push:null};
  // Small reset or tracking jitter is filtered; first deliberate stroke and
  // new strokes in the same direction remain responsive.
  return {state:{direction,at:now},push};
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
 return {settings,BASE_RUN,SWIFT_RUN,locomotionMultiplier,speedCap,stabilizeArmVelocity,gateArmStroke,relativeStrokePose,smoothStroke,integratedArmStroke,virtualReach,virtualPaw,renderHand,reachPlane,floorContact,handPush,stepContact,strokeContact,relaxedArmStroke,groundPress,strokeVelocity,preserveJump,jumpBuffered,coyoteJump,drag,isLobby,canMove,canJump};
})();
if(typeof module!=='undefined'&&module.exports)module.exports=FrogyMotion;
