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
  ...[[-17,-4],[17,-3],[-15,-17],[16,-17]].map(([x,z])=>({name:'crate',x,z,rx:.79,rz:.77,h:1.0})),
  ...[[-16,-15],[16,-15],[-16,15],[16,15]].map(([x,z])=>({name:'stone ruin',x,z,rx:1.80,rz:1.20,h:1.5}))
 ]);
 const hubPillars=Object.freeze([[-6,-6],[6,-6],[-8,8],[8,8],[0,13]].map(([x,z])=>({x,z,r:.19,h:3.2})));
 const parkour=Object.freeze([
  {x:-11,z:11,h:.25,r:1.00},{x:-8.3,z:13.5,h:.56,r:1.05},{x:-5.2,z:15.5,h:.83,r:1.07},
  {x:-1.8,z:14.7,h:1.07,r:1.10},{x:1.8,z:12.6,h:1.35,r:1.14},
  {x:5.1,z:14.2,h:1.68,r:1.06},{x:8.5,z:16.1,h:1.95,r:1.02}
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
   for(const p of parkour){const dist=Math.hypot(x-p.x,z-p.z);if(dist>p.r+range)continue;
    if(Math.abs(y-p.h)<=range)return {type:'floor',point:[x,p.h,z],normal:[0,1,0],name:'parkour'};
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
 // A subtle reachable hand offset when arms are lowered: the *same visual paw*
 // and its collider move together. Never draw a second hand or a dangling pole.
 function reachablePaw(raw,rig,headHeight,reachScale=1){
  const low=Math.max(.7,headHeight*.73),height=Number(raw?.[1]||0),reach=clamp(reachScale,.86,1.38);
  const down=clamp((low-height)*1.20*reach,0,.60);
  return [raw[0]+rig.x,Math.max(rig.y,height+rig.y-down),raw[2]+rig.z];
 }
 return {hubBounds,hubBoxes,hubPillars,parkour,resolveCircle,surfaceAt,landHeight,reachablePaw,plateAt};
})();
if(typeof window!=='undefined')window.FrogyCollision=FrogyCollision;
if(typeof module!=='undefined'&&module.exports)module.exports=FrogyCollision;
