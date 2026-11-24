 'use strict';
/* Shared world/hand contact primitives. All collision dimensions are in meters.
   A collider is a physical surface, NOT a second visual paw. */
const FrogyCollision=(()=>{
 const clamp=(v,a,b)=>Math.min(b,Math.max(a,v));
 const hubBounds=19.4;
 const hubBoxes=Object.freeze([
  // Mirrors the major visible furnishings in features.js. Keep the map vote board unobstructed.
  {name:'computer desk',x:-11,z:-8,rx:1.58,rz:.86,h:1.25},
  {name:'boutique counter',x:0,z:-12,rx:2.90,rz:1.02,h:1.48},
  {name:'dressing mirror',x:11,z:-8.75,rx:1.54,rz:.38,h:3.25},
  {name:'left bench',x:-4.25,z:-1.7,rx:1.2,rz:.60,h:1.57},
  {name:'right bench',x:4.25,z:-1.7,rx:1.2,rz:.60,h:1.57},
  {name:'Lucky Lily cabinet',x:7.2,z:-4.57,rx:1.08,rz:.44,h:2.45},
  ...[[-17,-4],[17,-3],[-15,-17],[16,-17]].map(([x,z])=>({name:'crate',x,z,rx:.79,rz:.77,h:1.0})),
  ...[[-16,-15],[16,-15],[-16,15],[16,15]].map(([x,z])=>({name:'stone ruin',x,z,rx:1.80,rz:1.20,h:1.5}))
 ]);
 // Visible trees share exact center/radius data with body and paw colliders.
 // Interior trees make climbing practice possible; perimeter trees remain scenery
 // until they are within reach of the playable boundary.
 const interiorTrees=Object.freeze([
  [-14,0,.53,6.2],[-13,8,.64,5.9],[-14,15,.50,6.5],
  [13,4,.61,6.0],[14,11,.54,5.7],[15,-12,.48,5.4],
  [-15,-10,.53,6.1],[10,17,.55,5.9]
 ].map(([x,z,r,h])=>({name:'swamp tree',x,z,r,h})));
 const perimeterTrees=Object.freeze(Array.from({length:19},(_,i)=>{
  const a=i/19*Math.PI*2,rad=19.5+(i%3)*.9;
  return {name:'swamp tree',x:Math.cos(a)*rad,z:Math.sin(a)*rad,r:.24+(i%4)*.045,h:5.4+(i%6)*.46};
 }));
 const hubTrees=Object.freeze([...interiorTrees,...perimeterTrees]);
 const hubPillars=Object.freeze([[-6,-6],[6,-6],[-8,8],[8,8],[0,13]].map(([x,z])=>({x,z,r:.19,h:3.2})));
 const parkour=Object.freeze([
  {x:-11,z:11,h:.60,r:1.00},{x:-8.3,z:13.5,h:1.04,r:1.05},{x:-5.2,z:15.5,h:1.48,r:1.07},
  {x:-1.8,z:14.7,h:1.93,r:1.10},{x:1.8,z:12.6,h:2.38,r:1.14},
  {x:5.1,z:14.2,h:2.85,r:1.06},{x:8.5,z:16.1,h:3.28,r:1.02}
 ]);
 function boxesFor(mode,world){return mode==='hub'?hubBoxes:[];}
 function plateAt(x,z,r=.21){return parkour.find(p=>Math.hypot(x-p.x,z-p.z)<p.r-r*.30)||null;}
 function closestOnBox(x,z,box){return [clamp(x,box.x-box.rx,box.x+box.rx),clamp(z,box.z-box.rz,box.z+box.rz)];}
 function resolveCircle(x,z,r=.34,mode='hub',world=null,footY=0){
  if(mode==='hub'){
   x=clamp(x,-hubBounds+r,hubBounds-r);z=clamp(z,-hubBounds+r,hubBounds-r);
   for(const b of hubBoxes){if(footY>=b.h+.08)continue;
    const [px,pz]=closestOnBox(x,z,b),dx=x-px,dz=z-pz,d=Math.hypot(dx,dz);
    if(d<r){if(d>.001){x+=dx/d*(r-d);z+=dz/d*(r-d)}
     else {const edges=[{v:Math.abs(x-(b.x-b.rx)),x:b.x-b.rx-r,z},{v:Math.abs(x-(b.x+b.rx)),x:b.x+b.rx+r,z},{v:Math.abs(z-(b.z-b.rz)),x,z:b.z-b.rz-r},{v:Math.abs(z-(b.z+b.rz)),x,z:b.z+b.rz+r}];edges.sort((a,b)=>a.v-b.v);x=edges[0].x;z=edges[0].z;}
    }
   }
   for(const b of hubPillars){if(footY>b.h)continue;const dx=x-b.x,dz=z-b.z,d=Math.hypot(dx,dz),rad=b.r+r;if(d<rad){x+=(d?dx/d:1)*(rad-d);z+=(d?dz/d:0)*(rad-d);}}
   for(const b of hubTrees){if(footY>b.h)continue;
    const dx=x-b.x,dz=z-b.z,d=Math.hypot(dx,dz),rad=b.r+r;
    if(d<rad){x+=(d?dx/d:1)*(rad-d);z+=(d?dz/d:0)*(rad-d);}}
   for(const b of parkour){if(footY>=b.h-.08)continue;const dx=x-b.x,dz=z-b.z,d=Math.hypot(dx,dz),rad=b.r+r*.65;if(d<rad){x+=(d?dx/d:1)*(rad-d);z+=(d?dz/d:0)*(rad-d);}}
   return {x,z};
  }
  const limit=(world?.SIZE||65)-r-.5,dist=Math.hypot(x,z);if(dist>limit){x*=limit/dist;z*=limit/dist;}
  for(const o of world?.cover||[]){if(footY>o.h+.08)continue;const dx=x-o.x,dz=z-o.z,d=Math.hypot(dx,dz),rad=o.r+r;
   if(d<rad){x+=(d?dx/d:1)*(rad-d);z+=(d?dz/d:0)*(rad-d);}
  }
  return {x,z};
 }
 function surfaceAt(q,mode='hub',world=null,range=.20){
  if(!q||q.length!==3||!q.every(Number.isFinite))return null;
  const [x,y,z]=q;
  if(mode==='hub'){
   // Boundary walls are continuous even at corners.
   if(y<4.1&&Math.abs(x)>=hubBounds-range)return {type:'wall',point:[Math.sign(x)*hubBounds,y,z],normal:[-Math.sign(x),0,0]};
   if(y<4.1&&Math.abs(z)>=hubBounds-range)return {type:'wall',point:[x,y,Math.sign(z)*hubBounds],normal:[0,0,-Math.sign(z)]};
   for(const b of hubBoxes){if(y<-.12||y>b.h+range)continue;const [cx,cz]=closestOnBox(x,z,b),dx=x-cx,dz=z-cz,d=Math.hypot(dx,dz);
    if(d<=range){if(d>.0001)return {type:'wall',point:[cx,y,cz],normal:[dx/d,0,dz/d],name:b.name};
     const edges=[{distance:Math.abs(x-(b.x-b.rx)),point:[b.x-b.rx,y,z],normal:[-1,0,0]},{distance:Math.abs(x-(b.x+b.rx)),point:[b.x+b.rx,y,z],normal:[1,0,0]},{distance:Math.abs(z-(b.z-b.rz)),point:[x,y,b.z-b.rz],normal:[0,0,-1]},{distance:Math.abs(z-(b.z+b.rz)),point:[x,y,b.z+b.rz],normal:[0,0,1]}];edges.sort((a,b)=>a.distance-b.distance);return {type:'wall',...edges[0],name:b.name};
    }
   }
   for(const b of hubPillars){if(y<0||y>b.h+range)continue;const dx=x-b.x,dz=z-b.z,dist=Math.hypot(dx,dz);if(dist<=b.r+range){const nx=dx/Math.max(.001,dist),nz=dz/Math.max(.001,dist);return {type:'wall',point:[b.x+nx*b.r,y,b.z+nz*b.r],normal:[nx,0,nz],name:'lantern post'};}}
   for(const b of hubTrees){if(y<-.2||y>b.h+range)continue;
    const dx=x-b.x,dz=z-b.z,dist=Math.hypot(dx,dz);
    if(dist<=b.r+range){const nx=dist>.001?dx/dist:1,nz=dist>.001?dz/dist:0;
     return {type:'wall',point:[b.x+nx*b.r,y,b.z+nz*b.r],normal:[nx,0,nz],name:b.name};}}
   for(const p of parkour){const dist=Math.hypot(x-p.x,z-p.z);if(dist>p.r+range)continue;
    if(Math.abs(y-p.h)<=range&&dist<p.r-.04)return {type:'floor',point:[x,p.h,z],normal:[0,1,0],name:'parkour'};
    if(y>=0&&y<p.h-range&&Math.abs(dist-p.r)<range)return {type:'wall',point:[p.x+(x-p.x)/Math.max(.001,dist)*p.r,y,p.z+(z-p.z)/Math.max(.001,dist)*p.r],normal:[(x-p.x)/Math.max(.001,dist),0,(z-p.z)/Math.max(.001,dist)],name:'parkour edge'};
   }
  }else{
   const limit=(world?.SIZE||65)-.5,dist=Math.hypot(x,z);if(y<4.5&&dist>limit-range)return {type:'wall',point:[x/dist*limit,y,z/dist*limit],normal:[-x/dist,0,-z/dist]};
   for(const b of world?.cover||[]){if(y<-.1||y>b.h+range)continue;const d=Math.hypot(x-b.x,z-b.z);if(d<=b.r+range){const nx=(x-b.x)/Math.max(d,.001),nz=(z-b.z)/Math.max(d,.001);return {type:'wall',point:[b.x+nx*b.r,y,b.z+nz*b.r],normal:[nx,0,nz],name:b.type};}}
  }
  if(y>=-.35&&y<=range)return {type:'floor',point:[x,0,z],normal:[0,1,0]};
  return null;
 }
 function landHeight(x,z,previousFootY=0,falling=true){if(!falling)return null;let h=0;
  for(const p of parkour)if(Math.hypot(x-p.x,z-p.z)<p.r-.16&&previousFootY>=p.h-.14)h=Math.max(h,p.h);
  return h;
 }
 // Controller grip pose is already in the same physical floor reference space
 // as the headset. Never translate a visible paw down toward the ground.
 // This function is also used by weapons and shared network pose rendering.
 function reachablePaw(raw,rig){
  if(!raw||raw.length!==3||!raw.every(Number.isFinite))return null;
  return [raw[0]+rig.x,raw[1]+rig.y,raw[2]+rig.z];
 }
 // A physical sphere collider centered on the REAL paw. While standing, an
 // optional assisted floor *contact zone* activates at a comfortable lowered
 // hand height. It NEVER moves the hand mesh or draws a fake extension.
 function handSurface(world,headHeight,mode='hub',map=null,wasFloor=false,reachScale=1){
  if(!world||!world.every(Number.isFinite))return null;
  const actual=surfaceAt(world,mode,map,.38);
  if(actual?.type==='wall'||actual?.name==='parkour')return actual;
  const [x,y,z]=world;
  const h=clamp(Number(headHeight)||1.65,1.1,2.2);
  const comfortable=clamp(h*.64*clamp(reachScale,.85,1.38),.62,1.35);
  const threshold=comfortable+(wasFloor?.14:0);
  // Do not permit contact above the shoulder or while jumping far above ground.
  if(y>=-.23&&y<=threshold){
   const under=mode==='hub'?parkour.find(a=>Math.hypot(x-a.x,z-a.z)<a.r-.08&&y>=a.h-.08&&y<=a.h+threshold):null;
   return {type:'floor',point:[x,under?.h||0,z],normal:[0,1,0],assisted:y>(under?.h||0)+.30};
  }
  return actual;
 }
 // Stop a tracked paw visually tunneling through solid objects. Only the
 // *horizontal* penetration is resolved; height remains exactly tracker-based.
 function constrainPaw(world,mode='hub',map=null,radius=.075){
  if(!world||!world.every(Number.isFinite))return world;
  const hit=surfaceAt(world,mode,map,.35);
  if(!hit||hit.type!=='wall'||!hit.normal)return [...world];
  const [nx,,nz]=hit.normal;
  const depth=(world[0]-hit.point[0])*nx+(world[2]-hit.point[2])*nz;
  const correction=clamp(radius-depth,0,.29);
  return [world[0]+nx*correction,world[1],world[2]+nz*correction];
 }
 // Capture the top crossed during a falling physics step. A landing is never
 // granted while ascending or when coming from underneath a lily platform.
 function sweptLanding(x,z,previousFootY,nextFootY,descending=true){
  if(!descending||nextFootY>previousFootY)return null;
  let top=nextFootY<=0&&previousFootY>=0?0:null;
  for(const p of parkour){
   if(Math.hypot(x-p.x,z-p.z)>p.r-.06)continue;
   if(previousFootY>=p.h-.012&&nextFootY<=p.h+.015)top=Math.max(top??0,p.h);
  }
  return top;
 }

 return {hubBounds,hubBoxes,hubPillars,hubTrees,parkour,resolveCircle,surfaceAt,handSurface,constrainPaw,sweptLanding,landHeight,reachablePaw,plateAt};
})();
if(typeof window!=='undefined')window.FrogyCollision=FrogyCollision;
if(typeof module!=='undefined'&&module.exports)module.exports=FrogyCollision;
