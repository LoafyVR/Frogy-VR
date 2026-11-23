'use strict';
/* Shared deterministic world layout: the same cover and pickup coordinates on server and client. */
const WorldData=(()=>{
 const SIZE=65;
 const maps=[
  {name:'Rotwood Swamp',tagline:'THE WATER IS WATCHING',sky:[.007,.026,.021],ground:[.049,.092,.073],accent:[.16,.43,.28],fog:[.014,.065,.046]},
  {name:'Gravebell Cemetery',tagline:'EVERY BELL IS A WARNING',sky:[.016,.014,.043],ground:[.13,.12,.15],accent:[.44,.38,.64],fog:[.047,.037,.087]},
  {name:'Hollow Creek Facility',tagline:'DO NOT FEED THE SPECIMEN',sky:[.015,.016,.023],ground:[.079,.088,.091],accent:[.64,.13,.12],fog:[.042,.048,.052]}
 ];
 const spawns=[[-48,-46],[47,-45],[-47,45],[48,46],[-53,4],[52,-6],[4,-52],[-7,52]];
 const weapons=[[-35,-31],[34,-30],[-37,30],[36,32],[-4,-38],[15,24],[-42,7],[42,-11],[0,0],[17,-9],[-19,4],[-5,41],[29,8],[-31,1],[7,-43],[-8,32],[47,15],[-49,-12]]
  .map((p,i)=>({id:(i%2?'k':'b')+i,type:i%2?'knife':'blaster',x:p[0],z:p[1]}));
 function rng(seed){let s=seed>>>0;return ()=>{s=(Math.imul(s,1664525)+1013904223)>>>0;return s/4294967296;};}
 const blocked=(x,z,r,existing)=>Math.hypot(x,z)<7||spawns.some(([a,b])=>Math.hypot(x-a,z-b)<r+3.5)||weapons.some(w=>Math.hypot(x-w.x,z-w.z)<r+1.6)||existing.some(o=>Math.hypot(x-o.x,z-o.z)<r+o.r+1.2);
 maps.forEach((m,k)=>{
  const rd=rng(3791+k*991),cover=[];let attempts=0;
  const count=k===0?105:k===1?113:106;
  while(cover.length<count&&attempts++<4000){const x=(rd()-.5)*119,z=(rd()-.5)*119,r=k===0?(.72+rd()*.65):k===1?(.47+rd()*.62):(.72+rd()*.72);if(blocked(x,z,r,cover))continue;
   const type=k===0?(rd()<.70?'tree':rd()<.75?'shack':'boulder'):k===1?(rd()<.35?'tree':rd()<.82?'grave':'crypt'):(rd()<.51?'crate':rd()<.68?'tower':'tank');
   cover.push({x:+x.toFixed(2),z:+z.toFixed(2),r:+r.toFixed(2),h:+((k===0?2.9:k===1?2.2:2.65)+rd()*2.1).toFixed(2),type,rot:rd()*6.28});
  }
  // central and satellite setpieces: real, collidable hiding places
  if(k===0)cover.push({x:13,z:8,r:3.1,h:6.5,type:'tree',rot:0},{x:-16,z:-13,r:4.6,h:3.5,type:'shack',rot:.5},{x:36,z:18,r:4.0,h:3.3,type:'shack',rot:.8},{x:-34,z:28,r:3.7,h:3.1,type:'shack',rot:.2});
  if(k===1)cover.push({x:14,z:9,r:4.1,h:5.6,type:'crypt',rot:0},{x:-17,z:-16,r:4.2,h:4.8,type:'crypt',rot:1},{x:38,z:20,r:3.2,h:5.2,type:'crypt',rot:1.3},{x:-35,z:26,r:3.3,h:5.2,type:'crypt',rot:2});
  if(k===2)cover.push({x:13,z:9,r:4.4,h:5.2,type:'tank',rot:0},{x:-17,z:-15,r:4.0,h:6.5,type:'tower',rot:1},{x:35,z:27,r:4.5,h:5.3,type:'tank',rot:.2},{x:-36,z:25,r:3.5,h:6.2,type:'tower',rot:1.2});
  // Map-identity collision landmarks. These are intentionally unlike the shared small cover.
  if(k===1)cover.push({x:0,z:-27,r:7.3,h:8.8,type:'chapel',rot:0});
  if(k===2){
   cover.push({x:26,z:25,r:5.1,h:7.2,type:'reactor',rot:0});
   // Factory corridors: staggered segments leave large gaps for arm-locomotion routes.
   for(const [x,z,rot] of [[-24,-23,0],[-18,-23,0],[-12,-23,0],[-12,-17,1.57],[-12,-11,1.57],[-25,10,0],[-19,10,0],[-13,10,0],[16,-20,1.57],[16,-14,1.57],[16,-8,1.57],[25,-18,0],[31,-18,0],[34,-2,1.57],[-33,27,1.57],[-33,33,1.57]]){
    cover.push({x,z,r:2.1,h:4.2,type:'labwall',rot});
   }
  }
  m.cover=cover;
 });
 return {SIZE,maps,spawns,weapons};
})();
if(typeof module!=='undefined'&&module.exports)module.exports=WorldData;
