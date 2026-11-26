'use strict';
/* FROGY v17 experimental locomotion — new contact-only movement engine.
 * No swing assist, inferred air surfaces, head-to-hand push feedback, or auto hop.
 * Rendering, grapple, weapons and menu systems do not call this engine.
 * All positions in metres; all speeds in metres/second. */
const FrogyMotion=(()=>{
 const clamp=(n,lo,hi)=>Math.max(lo,Math.min(hi,n));
 const valid=v=>Array.isArray(v)&&v.length===3&&v.every(Number.isFinite);
 const settings=Object.freeze({
  gravity:9.8,monsterGravity:9.8,jumpSpeed:7.3,
  maxHorizontalSpeed:9.3,groundDrag:3.0,airDrag:.45,
  monsterGroundDrag:3.0,monsterAirDrag:.45
 });
 const BASE_RUN=1,SWIFT_RUN=1.35;
 const locomotionMultiplier=(phase,p)=>phase==='playing'&&p?.activeTools?.speed?SWIFT_RUN:1;
 const speedCap=(phase,p)=>settings.maxHorizontalSpeed*(phase==='playing'&&p?.monster?1.12:1)*locomotionMultiplier(phase,p);
 const drag=(ground,dt,monster=false)=>Math.exp(-(ground?settings.groundDrag:settings.airDrag)*Math.max(0,dt));
 const isLobby=(phase,spectating)=>phase!=='playing'||!!spectating;
 const canMove=(phase,alive,spectating,menuOpen)=>!menuOpen&&(phase!=='playing'||!!spectating||!!alive);
 const canJump=(phase,alive,spectating,menuOpen)=>!menuOpen&&(phase!=='playing'||!!spectating||!!alive);
 const jumpBuffered=(pressed,now,ms=140)=>Number.isFinite(pressed)&&now>=pressed&&now-pressed<=ms;
 const coyoteJump=(land,now,ms=100)=>Number.isFinite(land)&&now>=land&&now-land<=ms;
 const preserveJump=v=>({...v,y:settings.jumpSpeed});

 // GorillaLocomotion (Another Axiom, MIT) movement principles, adapted for
 // WebXR coordinates and Frogy's analytic world surfaces instead of Unity physics:
 // capped tracked hand reach, swept sphere contact, planted-hand displacement,
 // two-hand averaging, wall sliding, momentum after release, and unclenching.
 // See GORILLA_MOVEMENT_ATTRIBUTION.md for official source and license.
 function reachFor(standingHeight,reachScale=1){
  // Frog arms are long. A *virtual palm probe* reaches lower than the tracked
  // grip; it is never rendered as another hand and never runs while airborne.
  return clamp(clamp(standingHeight,1.25,2.1)*.54*clamp(reachScale,.9,1.13),.65,1.04);
 }
 function limitHand(raw,head,maxArmLength=1.5){
  if(!valid(raw)||!valid(head))return raw;
  const delta=raw.map((v,i)=>v-head[i]);
  const distance=Math.hypot(...delta);
  return distance>maxArmLength?head.map((v,i)=>v+delta[i]*maxArmLength/distance):raw;
 }
 function contactSurface(raw,rig,grounded,standingHeight,reachScale,collision,mode,map,previousRaw=null,headRaw=null){
  if(!valid(raw))return null;
  const limited=limitHand(raw,headRaw);
  const actual=[limited[0]+rig.x,limited[1]+rig.y,limited[2]+rig.z];
  const wall=collision.surfaceAt(actual,mode,map,.135);
  if(wall?.type==='wall')return wall;
  // Sweep the *real* paw along its tracked path so fast strokes cannot tunnel
  // through thin world structures. Only the closest few centimetres touch.
  // The ground probe is intentionally never part of this wall sweep.
  if(valid(previousRaw)){
   const last=limitHand(previousRaw,headRaw);
   const start=[last[0]+rig.x,last[1]+rig.y,last[2]+rig.z];
   const distance=Math.hypot(...start.map((v,i)=>actual[i]-v));
   if(distance>.012&&distance<.27){
    const steps=Math.min(12,Math.ceil(distance/.035));
    for(let i=1;i<=steps;i++){
     const sample=start.map((v,j)=>v+(actual[j]-v)*i/steps);
     const hit=collision.surfaceAt(sample,mode,map,.075);
     if(hit?.type==='wall')return hit;
    }
   }
  }
  if(!grounded)return null;
  const tip=[actual[0],actual[1]-reachFor(standingHeight,reachScale),actual[2]];
  const floor=collision.surfaceAt(tip,mode,map,.10);
  // Contact is with the real scene geometry (floor or platform), never an air
  // plane. On takeoff all floor contacts reset immediately.
  return floor?.type==='floor'&&Math.abs(tip[1]-floor.point[1])<=.11?floor:null;
 }
 function stepHand(previous,raw,headRaw,surface,dt,power=1,now=0){
  if(!valid(raw)||!surface)return {contact:null,push:null};
  const type=surface.type;
  const contact={type,name:surface.name||null,raw:[...raw],head:valid(headRaw)?[...headRaw]:null,at:now,
   normal:valid(surface.normal)?[...surface.normal]:null,samples:previous?.samples||[]};
  if(!previous||previous.type!==type||previous.name!==contact.name||!valid(previous.raw)||dt<=.005||dt>.075)
   return {contact,push:null};
  // Last hand location - current hand location, just like GorillaLocomotion's
  // first-iteration planted-hand body displacement.
  const dx=previous.raw[0]-raw[0],dy=previous.raw[1]-raw[1],dz=previous.raw[2]-raw[2];
  const distance=Math.hypot(dx,dy,dz);
  if(distance>.21)return {contact:{...contact,samples:[]},push:null}; // tracking snap
  // Release upward-returning hands so resets never reverse a push.
  if(type==='floor'&&dy<-.012)return {contact:null,push:null};
  if(type==='wall'&&contact.normal){
   const away=(-dx*contact.normal[0]-dy*contact.normal[1]-dz*contact.normal[2]);
   if(away>.012)return {contact:null,push:null};
  }
  const planar=Math.hypot(dx,dz);
  const headDx=valid(headRaw)&&valid(previous.head)?previous.head[0]-headRaw[0]:0;
  const headDz=valid(headRaw)&&valid(previous.head)?previous.head[2]-headRaw[2]:0;
  const headTravel=Math.hypot(headDx,headDz),shared=Math.hypot(dx-headDx,dz-headDz);
  // Physical room-scale walking/leaning does not create extra locomotion.
  if(headTravel>.008&&planar>.006&&shared<Math.max(.018,headTravel*.36))return {contact,push:null};
  const gain=clamp(power,.65,2.2);
  const sx=planar>.003?clamp(dx/dt*gain,-9.6,9.6):0;
  const sz=planar>.003?clamp(dz/dt*gain,-9.6,9.6):0;
  const downward=dy/dt;
  const up=dy>.012&&downward>1.15?clamp((downward-1.15)*.85,0,type==='wall'?3.8:4.3):0;
  if(Math.hypot(sx,sz)<.16&&up<.7)return {contact,push:null};
  // Short rolling average of *real contact strokes* only; no air impulses.
  const samples=[...contact.samples,{x:sx,z:sz}].slice(-3);
  contact.samples=samples;
  // Short strokes retain their initial impulse; longer strokes are smoothed.
  const avg=(key)=>samples.reduce((n,s)=>n+s[key],0)/samples.length;
  return {contact,push:{vx:avg('x'),vz:avg('z'),up,wall:type==='wall'}};
 }
 function applyPushes(vel,pushes,cap,grounded){
  if(!pushes?.length)return {vel:{...vel},hop:false};
  // GorillaLocomotion averages the two hand displacements when both touch.
  // No additive two-hand acceleration spikes.
  const vx=clamp(pushes.reduce((s,p)=>s+p.vx,0)/pushes.length,-cap,cap);
  const vz=clamp(pushes.reduce((s,p)=>s+p.vz,0)/pushes.length,-cap,cap);
  const up=Math.max(0,...pushes.map(p=>p.up||0));
  const strength=grounded?.76:.63;
  const next={x:clamp(vel.x*(1-strength)+vx*strength,-cap,cap),
   z:clamp(vel.z*(1-strength)+vz*strength,-cap,cap),y:vel.y};
  const hop=up>.85&&(grounded||pushes.some(p=>p.wall));
  if(hop)next.y=Math.max(next.y,up);
  return {vel:next,hop};
 }
 function integrate(position,velocity,grounded,dt,cap,gravity=settings.gravity){
  dt=clamp(dt,0,.05);
  const pos={...position},vel={...velocity};
  if(!grounded||vel.y>0||pos.y>.001){vel.y-=gravity*dt;pos.y+=vel.y*dt;}
  else vel.y=0;
  let landed=false;
  if(pos.y<0){pos.y=0;vel.y=0;landed=true;grounded=true;}
  else grounded=pos.y<=.001&&vel.y<=0;
  const planar=Math.hypot(vel.x,vel.z);
  if(planar>cap){vel.x*=cap/planar;vel.z*=cap/planar;}
  pos.x+=vel.x*dt;pos.z+=vel.z*dt;
  const fade=drag(grounded,dt);
  vel.x*=fade;vel.z*=fade;
  return {pos,vel,grounded,landed};
 }
 return {settings,BASE_RUN,SWIFT_RUN,speedCap,locomotionMultiplier,drag,isLobby,canMove,canJump,
  jumpBuffered,coyoteJump,preserveJump,reachFor,limitHand,contactSurface,stepHand,applyPushes,integrate};
})();
if(typeof module!=='undefined'&&module.exports)module.exports=FrogyMotion;
if(typeof window!=='undefined')window.FrogyMotion=FrogyMotion;
