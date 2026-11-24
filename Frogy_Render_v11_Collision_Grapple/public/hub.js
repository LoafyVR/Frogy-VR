'use strict';
/* Independent, physically navigable 42m abandoned pump-house lobby.
   Keep playable corridors clear of props; all dimensions in meters. */
const FrogyHub=(()=>{
 const LIMIT=19.4;
 const stations=Object.freeze([
  {id:'computer',x:-11,z:-8,r:2.1},
  {id:'shop',x:0,z:-12,r:3.4},
  {id:'dressing',x:11,z:-8,r:2.2}
 ]);
 const spawns=Object.freeze([[0,5],[-2,5],[2,5],[0,8],[-4,7],[4,7],[-2,9],[2,9]]);
 function spawn(index){return [...spawns[index%spawns.length]];}
 function resolve(x,z,r=.45){
  x=Math.max(-LIMIT,Math.min(LIMIT,x));z=Math.max(-LIMIT,Math.min(LIMIT,z));
  for(const s of stations){const dx=x-s.x,dz=z-s.z,d=Math.hypot(dx,dz),min=s.r+r;if(d<min){const a=d>.0001?dx/d:0,b=d>.0001?dz/d:1;x=s.x+a*min;z=s.z+b*min;}}
  return {x:Math.max(-LIMIT,Math.min(LIMIT,x)),z:Math.max(-LIMIT,Math.min(LIMIT,z))};
 }
 function free(x,z,r=.45){const q=resolve(x,z,r);return Math.abs(q.x-x)<.001&&Math.abs(q.z-z)<.001;}
 return {LIMIT,stations,spawns,spawn,resolve,free};
})();
if(typeof module!=='undefined'&&module.exports)module.exports=FrogyHub;
if(typeof window!=='undefined')window.FrogyHub=FrogyHub;
