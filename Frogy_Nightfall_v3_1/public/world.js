'use strict';
/* Shared deterministic world layout: the same cover and pickup coordinates on server and client. */
const WorldData=(()=>{
 const SIZE=44;
 const maps=[
  {name:'Rotwood Swamp',tagline:'THE WATER IS WATCHING',sky:[.014,.033,.047],ground:[.075,.12,.105],accent:[.21,.67,.48],fog:[.025,.067,.066]},
  {name:'Gravebell Cemetery',tagline:'EVERY BELL IS A WARNING',sky:[.022,.023,.049],ground:[.11,.115,.13],accent:[.49,.57,.73],fog:[.07,.075,.11]},
  {name:'Hollow Creek Facility',tagline:'DO NOT FEED THE SPECIMEN',sky:[.025,.033,.041],ground:[.10,.13,.14],accent:[.59,.83,.75],fog:[.055,.084,.086]}
 ];
 const spawns=[[-31,-28],[30,-28],[-29,28],[29,27],[-35,2],[35,-3],[2,-34],[-3,34]];
 const weapons=[[-25,-18],[21,-21],[-21,17],[24,20],[-3,-23],[10,15],[-32,6],[32,-8],[0,0],[15,-4],[-14,3],[-3,29]]
  .map((p,i)=>({id:(i%2?'k':'b')+i,type:i%2?'knife':'blaster',x:p[0],z:p[1]}));
 function rng(seed){let s=seed>>>0;return ()=>{s=(Math.imul(s,1664525)+1013904223)>>>0;return s/4294967296;};}
 const blocked=(x,z,r,existing)=>Math.hypot(x,z)<7||spawns.some(([a,b])=>Math.hypot(x-a,z-b)<r+3.5)||weapons.some(w=>Math.hypot(x-w.x,z-w.z)<r+1.6)||existing.some(o=>Math.hypot(x-o.x,z-o.z)<r+o.r+1.2);
 maps.forEach((m,k)=>{
  const rd=rng(3791+k*991),cover=[];let attempts=0;
  const count=k===0?48:k===1?55:52;
  while(cover.length<count&&attempts++<1600){const x=(rd()-.5)*78,z=(rd()-.5)*78,r=k===0?(.72+rd()*.65):k===1?(.47+rd()*.62):(.72+rd()*.72);if(blocked(x,z,r,cover))continue;
   const type=k===0?(rd()<.69?'tree':'boulder'):k===1?(rd()<.42?'tree':rd()<.85?'grave':'crypt'):(rd()<.55?'crate':rd()<.6?'tower':'tank');
   cover.push({x:+x.toFixed(2),z:+z.toFixed(2),r:+r.toFixed(2),h:+((k===0?2.9:k===1?2.2:2.65)+rd()*2.1).toFixed(2),type,rot:rd()*6.28});
  }
  // central and satellite setpieces: real, collidable hiding places
  if(k===0)cover.push({x:10,z:5,r:3.1,h:4.5,type:'tree',rot:0},{x:-10,z:-9,r:2.1,h:3.7,type:'tree',rot:.5});
  if(k===1)cover.push({x:10,z:6,r:3.2,h:4.6,type:'crypt',rot:0},{x:-12,z:-9,r:2.5,h:3.8,type:'crypt',rot:1});
  if(k===2)cover.push({x:10,z:8,r:3.2,h:4.2,type:'tank',rot:0},{x:-12,z:-9,r:2.7,h:3.9,type:'tower',rot:1});
  m.cover=cover;
 });
 return {SIZE,maps,spawns,weapons};
})();
if(typeof module!=='undefined'&&module.exports)module.exports=WorldData;
