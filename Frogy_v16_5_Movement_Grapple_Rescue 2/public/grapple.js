'use strict';
/* B-triggered tongue tether: finite range, actual collider ray hit, smooth rope pull,
   automatic release + cooldown. No client authority to teleport through walls. */
const FrogyGrapple=(()=>{
 const Collision=typeof window!=='undefined'?window.FrogyCollision:require('./collision.js');
 const LIMIT=38,MAX_MS=3300,COOLDOWN_MS=420,RELEASE_DISTANCE=1.55;
 const add=(o,d,t)=>o.map((n,i)=>n+d[i]*t);
 function rayBox(o,d,b,max){let min=0,maxT=max;
  for(const [axis,lo,hi] of [[0,b.x-b.rx,b.x+b.rx],[1,.1,b.h],[2,b.z-b.rz,b.z+b.rz]]){
   const v=d[axis];if(Math.abs(v)<1e-6){if(o[axis]<lo||o[axis]>hi)return null;continue;}
   const t1=(lo-o[axis])/v,t2=(hi-o[axis])/v,near=Math.min(t1,t2),far=Math.max(t1,t2);min=Math.max(min,near);maxT=Math.min(maxT,far);if(maxT<min)return null;
  }return min>.10?min:null;
 }
 function rayCylinder(o,d,b,max){const px=o[0]-b.x,pz=o[2]-b.z,a=d[0]*d[0]+d[2]*d[2];if(a<1e-8)return null;
  const B=2*(px*d[0]+pz*d[2]),C=px*px+pz*pz-b.r*b.r,disc=B*B-4*a*C;if(disc<0)return null;
  const roots=[(-B-Math.sqrt(disc))/(2*a),(-B+Math.sqrt(disc))/(2*a)];
  for(const t of roots)if(t>.18&&t<max&&o[1]+d[1]*t>=.1&&o[1]+d[1]*t<=b.h+.2)return t;
  return null;
 }
 function raycast(o,dir,mode='hub',world=null,max=LIMIT){
  if(!o||!dir||o.length!==3||dir.length!==3)return null;
  const len=Math.hypot(...dir);if(len<.1)return null;const d=dir.map(n=>n/len);let best=max+1,tag='';
  const accept=(t,name)=>{if(t!==null&&t>0&&t<best){best=t;tag=name;}};
  // Any solid floor, wall, lily pad, tree or furnishing is a valid tether
  // target. Never accept empty air or objects outside the playable collider set.
  if(d[1]<-.015){const t=-o[1]/d[1];if(t>.18&&t<max){const q=add(o,d,t);
    if(mode==='hub'?Math.abs(q[0])<Collision.hubBounds&&Math.abs(q[2])<Collision.hubBounds:Math.hypot(q[0],q[2])<(world?.SIZE||65)-.8)accept(t,'ground');
  }}
  if(mode==='hub'){
   for(const b of Collision.hubBoxes)accept(rayBox(o,d,b,max),b.name);
   for(const tree of [...Collision.hubTrees,...Collision.hubPillars])accept(rayCylinder(o,d,tree,max),tree.name||'pillar');
   for(const b of Collision.hubBoxes){if(d[1]<-.015){const t=(b.h-o[1])/d[1],q=add(o,d,t);if(t>.18&&t<max&&Math.abs(q[0]-b.x)<=b.rx&&Math.abs(q[2]-b.z)<=b.rz)accept(t,b.name+' top');}}
   for(const p of Collision.parkour){accept(rayCylinder(o,d,{...p,h:p.h},max),'lily pad');
    // Top plane can serve as a tongue landing surface.
    if(d[1]<-.03){const t=(p.h-o[1])/d[1];const q=add(o,d,t);if(t>.18&&t<max&&Math.hypot(q[0]-p.x,q[2]-p.z)<=p.r)accept(t,'lily pad top');}
   }
   for(const axis of [0,2])for(const sign of [-1,1]){if(Math.abs(d[axis])<.01)continue;const t=(sign*Collision.hubBounds-o[axis])/d[axis],q=add(o,d,t);if(t>.15&&t<max&&q[1]>0&&q[1]<4&&Math.abs(q[2-axis])<=Collision.hubBounds)accept(t,'boundary');}
  }else{
   for(const b of world?.cover||[]){
     accept(rayCylinder(o,d,b,max),b.type||'cover');
     if(d[1]<-.015){const t=(b.h-o[1])/d[1],q=add(o,d,t);if(t>.18&&t<max&&Math.hypot(q[0]-b.x,q[2]-b.z)<=b.r)accept(t,(b.type||'cover')+' top');}
   }
   const limit=(world?.SIZE||65)-.5,ox=o[0],oz=o[2],A=d[0]*d[0]+d[2]*d[2],B=2*(ox*d[0]+oz*d[2]),C=ox*ox+oz*oz-limit*limit;
   if(A>0){const disc=B*B-4*A*C;if(disc>=0){const t=(-B+Math.sqrt(disc))/(2*A);if(t>.15&&t<max&&o[1]+d[1]*t<5)accept(t,'arena wall');}}
  }
  if(best>max)return null;return {point:add(o,d,best),distance:best,surface:tag};
 }
 function activate(current,now,origin,direction,mode,world){if(current?.active)return {...current,active:false,readyAt:now+COOLDOWN_MS};if(now<(current?.readyAt||0))return current||{active:false,readyAt:now};const hit=raycast(origin,direction,mode,world);return hit?{active:true,point:hit.point,initialDistance:hit.distance,started:now,readyAt:0,surface:hit.surface}:{active:false,readyAt:now+150};}
 function pullSpeed(distance,initialDistance){
  // Non-linear easing: a satisfying initial launch, then a gentle approach.
  // Smoothstep uses remaining distance relative to the original rope length.
  const finish=RELEASE_DISTANCE,span=Math.max(2,(initialDistance||distance)-finish);
  const t=Math.max(0,Math.min(1,(distance-finish)/span));
  const eased=t*t*(3-2*t);
  return 2.5+18.0*eased;
 }
 function releaseIfStalled(current,now,before,after,dt){
  if(!current?.active)return current;
  const distance=pos=>Math.hypot(current.point[0]-pos.x,current.point[1]-(pos.y+1.45),current.point[2]-pos.z);
  const beforeD=distance(before),afterD=distance(after);
  const expected=pullSpeed(beforeD,current.initialDistance)*Math.min(.045,Math.max(0,dt));
  // An anchored tongue never creates a physics collider. If the BODY cannot
  // make progress toward it because a wall blocks the way, drop the tether.
  const blocked=beforeD>RELEASE_DISTANCE+.3&&expected>.045&&(beforeD-afterD)<expected*.10;
  const blockedFor=blocked?(current.blockedFor||0)+Math.max(0,dt)*1000:0;
  if(blockedFor>180)return {active:false,readyAt:now+COOLDOWN_MS,releaseReason:'blocked'};
  return {...current,blockedFor};
 }
 function update(current,now,rig,vel,dt,menuOpen=false){if(!current?.active)return {state:current,velocity:vel};
  const dy=current.point[1]-(rig.y+1.45);
  const dx=current.point[0]-rig.x,dz=current.point[2]-rig.z;
  const distance=Math.hypot(dx,dy,dz);
  if(menuOpen||now-current.started>MAX_MS||distance<=RELEASE_DISTANCE)return {state:{active:false,readyAt:now+COOLDOWN_MS},velocity:vel};
  const speed=pullSpeed(distance,current.initialDistance),len=distance||1;
  // High initial response (no slow elastic build-up), decelerating automatically.
  const blend=Math.min(1,Math.max(.55,dt*43));
  return {state:current,velocity:{x:vel.x*(1-blend)+dx/len*speed*blend,y:vel.y*(1-blend)+dy/len*speed*blend,z:vel.z*(1-blend)+dz/len*speed*blend}};
 }
 return {LIMIT,MAX_MS,COOLDOWN_MS,RELEASE_DISTANCE,raycast,activate,pullSpeed,update,releaseIfStalled};
})();
if(typeof window!=='undefined')window.FrogyGrapple=FrogyGrapple;
if(typeof module!=='undefined'&&module.exports)module.exports=FrogyGrapple;
