'use strict';
/* Frogy blaster aiming: one controller-aligned frame for art and shots, plus
   server-authoritative ray / cover intersections. Runs in Node and Quest. */
const FrogyBlaster=(()=>{
 const EPS=1e-7,MAX_RANGE=55;
 const vec=(a,b)=>a.map((v,i)=>v+b[i]);
 const sub=(a,b)=>a.map((v,i)=>v-b[i]);
 const mul=(a,t)=>a.map(v=>v*t);
 const dot=(a,b)=>a.reduce((s,v,i)=>s+v*b[i],0);
 const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
 const unit=a=>{const d=Math.hypot(...a);return d>EPS?a.map(v=>v/d):[0,0,-1];};
 function frame(origin,dir,side='right'){
  const forward=unit(dir),axis=Math.abs(forward[1])>.95?[0,0,1]:[0,1,0];
  const right=unit(cross(forward,axis)),up=unit(cross(right,forward));
  // The gun sits slightly below/forward of the target-ray origin, not at face height.
  // Local -Z is forward. Its muzzle and bore share the controller's true aim.
  const base=vec(vec(origin,mul(forward,.17)),mul(up,-.065));
  const point=(x,y,z)=>vec(vec(vec(base,mul(right,x)),mul(up,y)),mul(forward,-z));
  return {base,forward,right,up,point,muzzle:point(0,.075,-.60),side};
 }
 function raySphere(o,d,c,r,max=MAX_RANGE){
  const a=sub(o,c),b=dot(a,d),h=b*b-dot(a,a)+r*r;
  if(h<0)return null;const root=Math.sqrt(h),t=-b-root,t2=-b+root;
  if(t>=0.02&&t<=max)return t;
  return t2>=0.02&&t2<=max?t2:null;
 }
 function rayCylinder(o,d,ob,max=MAX_RANGE){
  const x=o[0]-ob.x,z=o[2]-ob.z,r=Math.max(.01,ob.r||0),minY=.03,maxY=Math.max(.10,ob.h||2);
  let tBest=Infinity;
  const a=d[0]*d[0]+d[2]*d[2],b=2*(x*d[0]+z*d[2]),c=x*x+z*z-r*r;
  if(a>EPS){const disc=b*b-4*a*c;
   if(disc>=0){const sq=Math.sqrt(disc);
    for(const t of [(-b-sq)/(2*a),(-b+sq)/(2*a)])if(t>=.02&&t<=max){const y=o[1]+t*d[1];if(y>=minY&&y<=maxY)tBest=Math.min(tBest,t);}
   }
  }
  if(Math.abs(d[1])>EPS)for(const y of [minY,maxY]){
   const t=(y-o[1])/d[1];if(t<.02||t>max)continue;
   if((x+t*d[0])**2+(z+t*d[2])**2<=r*r)tBest=Math.min(tBest,t);
  }
  return Number.isFinite(tBest)?tBest:null;
 }
 function rayCapsule(o,d,target,max=MAX_RANGE){
  const monster=!!target.monster,rad=monster?1.06:.64;
  const foot=target.y||0,bot=foot+(monster?1.1:.72),top=foot+(monster?2.55:1.48);
  // Stable hits from belly to face, including when players jump or crouch.
  const cyl=rayCylinder(o,d,{x:target.x,z:target.z,r:rad,h:top},max);
  let hit=cyl!==null&&o[1]+d[1]*cyl>=bot?cyl:null;
  for(const y of [bot,top]){const t=raySphere(o,d,[target.x,y,target.z],rad,max);if(t!==null)hit=hit===null?t:Math.min(hit,t);}
  return hit;
 }
 function trace(origin,direction,targets=[],cover=[],max=MAX_RANGE){
  const d=unit(direction),o=origin;
  let best=max,kind='miss',target=null;
  const ground=d[1]<-.00001?(.025-o[1])/d[1]:null;
  if(ground!==null&&ground>=.02&&ground<best){best=ground;kind='ground';}
  for(const c of cover){const t=rayCylinder(o,d,c,best);if(t!==null&&t<best){best=t;kind='cover';}}
  for(const player of targets){if(!player?.alive||player.spectating)continue;
   const t=rayCapsule(o,d,player,best);
   if(t!==null&&t<best){best=t;kind='player';target=player;}
  }
  return {distance:best,point:vec(o,mul(d,best)),kind,target};
 }
 return {MAX_RANGE,unit,frame,raySphere,rayCylinder,rayCapsule,trace};
})();
if(typeof module!=='undefined'&&module.exports)module.exports=FrogyBlaster;
if(typeof window!=='undefined')window.FrogyBlaster=FrogyBlaster;
