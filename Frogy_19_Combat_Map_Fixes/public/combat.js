'use strict';
/* FROGY 19: server-authoritative weapon traces aligned with real solid cover.
   Cosmetic grass, tree canopies and foliage never block bullets. */
const FrogyCombat=(()=>{
 const norm=v=>{const n=Math.hypot(...v);return n>1e-6?v.map(a=>a/n):null;};
 const Coll=typeof FrogyCollision!=='undefined'?FrogyCollision:typeof require==='function'?require('./collision.js'):null;
 function shapeFor(o){
  // Backward compatibility with test/admin-authored blockers without a type.
  if(!o?.type)return {kind:'circle',x:o.x,z:o.z,r:o.r,h:o.h};
  return Coll?.footprint(o)||null;
 }
 function sphereHit(origin,dir,center,r,max){
  const v=center.map((n,i)=>n-origin[i]),proj=v.reduce((s,n,i)=>s+n*dir[i],0);
  const miss2=v.reduce((s,n)=>s+n*n,0)-proj*proj;
  if(miss2>r*r)return null;
  const root=Math.sqrt(Math.max(0,r*r-miss2)),t=proj-root;
  return t>.035&&t<max?t:null;
 }
 function boxHit(origin,dir,b,max){
  const low=[b.x-b.rx,.02,b.z-b.rz],hi=[b.x+b.rx,b.h,b.z+b.rz];
  let t0=-Infinity,t1=Infinity;
  for(let i=0;i<3;i++){
   if(Math.abs(dir[i])<1e-7){if(origin[i]<low[i]||origin[i]>hi[i])return null;continue;}
   let a=(low[i]-origin[i])/dir[i],c=(hi[i]-origin[i])/dir[i];if(a>c)[a,c]=[c,a];
   t0=Math.max(t0,a);t1=Math.min(t1,c);if(t1<t0)return null;
  }
  const d=t0>.05?t0:t1>.05?t1:null;return d!==null&&d<max?d:null;
 }
 function circleHit(origin,dir,b,max){
  const a=dir[0]**2+dir[2]**2;if(a<1e-8)return null;
  const cx=origin[0]-b.x,cz=origin[2]-b.z;
  const bb=2*(cx*dir[0]+cz*dir[2]),cc=cx*cx+cz*cz-(b.r+.015)**2,disc=bb*bb-4*a*cc;
  if(disc<0)return null;
  const root=Math.sqrt(disc),times=[(-bb-root)/(2*a),(-bb+root)/(2*a)];
  for(const t of times){const y=origin[1]+dir[1]*t;if(t>.05&&t<max&&y>=.02&&y<=b.h+.025)return t;}
  return null;
 }
 function coverDistance(origin,dir,cover,max=55){
  let first=max;
  for(const obj of cover||[]){const shape=shapeFor(obj);if(!shape)continue;
   const t=shape.kind==='box'?boxHit(origin,dir,shape,first):circleHit(origin,dir,shape,first);
   if(t!==null&&t<first)first=t;
  }
  if(dir[1]<-.001){const t=(.03-origin[1])/dir[1];if(t>.05&&t<first)first=t;}
  return first;
 }
 function targetRayDistance(origin,d,target,max){
  // Frogs have different proportions. Aim-assist is entirely a forgiving,
  // server-side collision volume rather than bending the visible laser beam.
  const spheres=target.monster?
    [[[target.x,target.y+1.64,target.z],1.48],[[target.x,target.y+2.9,target.z],1.08]]:
    [[[target.x,target.y+1.05,target.z],.76],[[target.x,target.y+1.72,target.z],.55]];
  let best=max;
  for(const [c,r] of spheres){const v=sphereHit(origin,d,c,r,best);if(v!==null)best=v;}
  return best<max?best:null;
 }
 function trace(origin,direction,cover,players=[],shooterId=null,max=55){
  if(!Array.isArray(origin)||origin.length!==3||!origin.every(Number.isFinite))return null;
  if(!Array.isArray(direction)||direction.length!==3||!direction.every(Number.isFinite))return null;
  const d=norm(direction);if(!d)return null;
  let distance=coverDistance(origin,d,cover,max),target=null;
  for(const p of players){if(p.id===shooterId||!p.alive||p.spectating)continue;
   const t=targetRayDistance(origin,d,p,distance);
   if(t!==null){distance=t;target=p;}
  }
  return {distance,point:origin.map((n,i)=>n+d[i]*distance),target};
 }
 function meleeTarget(origin,direction,cover,players=[],shooterId=null,reach=2.85){
  if(!origin||origin.length!==3||!origin.every(Number.isFinite))return null;
  const d=norm(direction);if(!d)return null;
  let best=null,bestDistance=Infinity;
  for(const p of players){if(p.id===shooterId||!p.alive||p.spectating)continue;
   const target=[p.x,p.y+(p.monster?1.75:1.12),p.z],relative=target.map((v,i)=>v-origin[i]);
   const dist=Math.hypot(...relative),radius=p.monster?1.0:.53;
   if(dist>reach+radius||dist<.001)continue;
   const facing=(relative[0]*d[0]+relative[1]*d[1]+relative[2]*d[2])/dist;
   // Sword swings have a wide arc, but cannot hit behind the grip.
   if(facing<-.25)continue;
   const along=relative.map(v=>v/dist);
   if(coverDistance(origin,along,cover,dist+.01)<dist-radius*.6)continue;
   if(dist<bestDistance){best=p;bestDistance=dist;}
  }
  return best;
 }
 function heal(hp,maxHp,amount=55){
  if(!Number.isFinite(hp)||!Number.isFinite(maxHp)||!Number.isFinite(amount)||maxHp<=0)return 0;
  return Math.min(maxHp,Math.max(0,hp)+Math.max(0,amount));
 }
 return {trace,coverDistance,meleeTarget,heal};
})();
if(typeof window!=='undefined')window.FrogyCombat=FrogyCombat;
if(typeof module!=='undefined'&&module.exports)module.exports=FrogyCombat;
