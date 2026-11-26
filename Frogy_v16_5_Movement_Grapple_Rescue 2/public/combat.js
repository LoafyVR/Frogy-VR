'use strict';
/* Server-authoritative shot trace and capped healing, no client side hit authority. */
const FrogyCombat=(()=>{
 const norm=v=>{const n=Math.hypot(...v);return n>1e-6?v.map(a=>a/n):null;};
 function coverDistance(origin,dir,cover,max=55){
  let first=max;
  for(const o of cover||[]){
   const cx=o.x-origin[0],cz=o.z-origin[2],radius=o.r+.13;
   const a=dir[0]**2+dir[2]**2;
   if(a<1e-8)continue;
   const B=-2*(cx*dir[0]+cz*dir[2]),C=cx*cx+cz*cz-radius*radius,disc=B*B-4*a*C;
   if(disc<0)continue;
   const roots=[(-B-Math.sqrt(disc))/(2*a),(-B+Math.sqrt(disc))/(2*a)];
   for(const t of roots){if(t>.06&&t<first&&origin[1]+dir[1]*t>=.0&&origin[1]+dir[1]*t<=o.h+.25){first=t;break;}}
  }
  // Ground is an occluding surface. A miss aimed down must end at the floor.
  if(dir[1]<-.001){const t=(.03-origin[1])/dir[1];if(t>.06&&t<first)first=t;}
  return first;
 }
 function trace(origin,direction,cover,players=[],shooterId=null,max=55){
  if(!Array.isArray(origin)||origin.length!==3||!origin.every(Number.isFinite))return null;
  if(!Array.isArray(direction)||direction.length!==3||!direction.every(Number.isFinite))return null;
  const d=norm(direction);if(!d)return null;
  let distance=coverDistance(origin,d,cover,max),target=null;
  for(const p of players){if(p.id===shooterId||!p.alive||p.spectating)continue;
   const center=[p.x,p.y+(p.monster?1.45:1.08),p.z],r=p.monster?1.10:.65;
   const v=center.map((n,i)=>n-origin[i]),projection=v.reduce((sum,n,i)=>sum+n*d[i],0);
   const miss2=v.reduce((sum,n)=>sum+n*n,0)-projection*projection;
   if(miss2>r*r)continue;
   const t=projection-Math.sqrt(Math.max(0,r*r-miss2));
   if(t>.06&&t<distance){distance=t;target=p;}
  }
  return {distance,point:origin.map((n,i)=>n+d[i]*distance),target};
 }
 function heal(hp,maxHp,amount=55){
  if(!Number.isFinite(hp)||!Number.isFinite(maxHp)||!Number.isFinite(amount)||maxHp<=0)return 0;
  return Math.min(maxHp,Math.max(0,hp)+Math.max(0,amount));
 }
 return {trace,coverDistance,heal};
})();
if(typeof module!=='undefined'&&module.exports)module.exports=FrogyCombat;
