'use strict';
/* Shared deterministic world layout: the same cover and pickup coordinates on server and client. */
const WorldData=(()=>{
 const SIZE=58, LAYOUT_SCALE=.80;
 const maps=[
  {name:'Rotwood Swamp',tagline:'THE WATER IS WATCHING',sky:[.007,.026,.021],ground:[.049,.092,.073],accent:[.16,.43,.28],fog:[.014,.065,.046]},
  {name:'Gravebell Cemetery',tagline:'EVERY BELL IS A WARNING',sky:[.016,.014,.043],ground:[.13,.12,.15],accent:[.44,.38,.64],fog:[.047,.037,.087]},
  {name:'Hollow Creek Facility',tagline:'DO NOT FEED THE SPECIMEN',sky:[.015,.016,.023],ground:[.079,.088,.091],accent:[.64,.13,.12],fog:[.042,.048,.052]}
 ];
 // Shared lobby starts: survivors arrive as one group, the monster starts beyond the map.
 // All spawns are collision-checked against the selected map's cover.
 const spawns=[[-46,-42],[-43,-42],[-46,-39],[-43,-39],[-49,-40],[-40,-44],[-49,-44],[-40,-40]].map(([x,z])=>[+(x*LAYOUT_SCALE).toFixed(2),+(z*LAYOUT_SCALE).toFixed(2)]);
 const monsterSpawns=[[48,45],[46,-45],[48,45]].map(([x,z])=>[+(x*LAYOUT_SCALE).toFixed(2),+(z*LAYOUT_SCALE).toFixed(2)]);
 const weapons=[[-35,-31],[34,-30],[-44,34],[46,33],[-4,-38],[15,24],[-42,7],[42,-11],[0,0],[23,-11],[-19,4],[-5,41],[29,8],[-31,1],[7,-43],[-8,32],[47,15],[-49,-12]]
  .map((p,i)=>({id:(i%2?'k':'b')+i,type:i%2?'knife':'blaster',x:+(p[0]*LAYOUT_SCALE).toFixed(2),z:+(p[1]*LAYOUT_SCALE).toFixed(2)}));
 function rng(seed){let s=seed>>>0;return ()=>{s=(Math.imul(s,1664525)+1013904223)>>>0;return s/4294967296;};}
 const blocked=(x,z,r,existing)=>Math.hypot(x,z)<7||spawns.some(([a,b])=>Math.hypot(x-a,z-b)<r+3.5)||weapons.some(w=>Math.hypot(x-w.x,z-w.z)<r+1.6)||existing.some(o=>Math.hypot(x-o.x,z-o.z)<r+o.r+.78);
 maps.forEach((m,k)=>{
  const rd=rng(3791+k*991),cover=[];let attempts=0;
  const count=k===0?258:k===1?286:266;
  while(cover.length<count&&attempts++<12000){const x=(rd()-.5)*110,z=(rd()-.5)*110,r=k===0?(.65+rd()*.78):k===1?(.42+rd()*.76):(.63+rd()*.78);if(blocked(x,z,r,cover))continue;
   const type=k===0?(rd()<.76?'tree':rd()<.77?'shack':'boulder'):k===1?(rd()<.35?'tree':rd()<.88?'grave':'crypt'):(rd()<.57?'crate':rd()<.64?'tower':'tank');
   cover.push({x:+x.toFixed(2),z:+z.toFixed(2),r:+r.toFixed(2),h:+((k===0?2.9:k===1?2.2:2.65)+rd()*2.1).toFixed(2),type,rot:rd()*6.28});
  }
  const landmark=(...things)=>cover.push(...things.map(o=>({...o,x:+(o.x*LAYOUT_SCALE).toFixed(2),z:+(o.z*LAYOUT_SCALE).toFixed(2)})));
  // Central and satellite setpieces: real, collidable hiding places.
  // High cover density is deterministic; keep clear safety rings at spawn and weapon pickups.
  if(k===0)landmark({x:13,z:8,r:3.1,h:6.5,type:'tree',rot:0},{x:-16,z:-13,r:4.6,h:3.5,type:'shack',rot:.5},{x:36,z:18,r:4.0,h:3.3,type:'shack',rot:.8},{x:-34,z:28,r:3.7,h:3.1,type:'shack',rot:.2});
  if(k===1)landmark({x:14,z:9,r:4.1,h:5.6,type:'crypt',rot:0},{x:-17,z:-16,r:4.2,h:4.8,type:'crypt',rot:1},{x:38,z:20,r:3.2,h:5.2,type:'crypt',rot:1.3},{x:-35,z:26,r:3.3,h:5.2,type:'crypt',rot:2});
  if(k===2)landmark({x:13,z:9,r:4.4,h:5.2,type:'tank',rot:0},{x:-17,z:-15,r:4.0,h:6.5,type:'tower',rot:1},{x:35,z:27,r:4.5,h:5.3,type:'tank',rot:.2},{x:-36,z:25,r:3.5,h:6.2,type:'tower',rot:1.2});
  // Map-identity collision landmarks. These are intentionally unlike the shared small cover.
  if(k===1)landmark({x:0,z:-27,r:7.3,h:8.8,type:'chapel',rot:0});
  if(k===2){
   cover.push({x:26,z:25,r:5.1,h:7.2,type:'reactor',rot:0});
   // Factory corridors: staggered segments leave large gaps for arm-locomotion routes.
   for(const [x,z,rot] of [[-24,-23,0],[-18,-23,0],[-12,-23,0],[-12,-17,1.57],[-12,-11,1.57],[-25,10,0],[-19,10,0],[-13,10,0],[16,-20,1.57],[16,-14,1.57],[16,-8,1.57],[25,-18,0],[31,-18,0],[34,-2,1.57],[-33,27,1.57],[-33,33,1.57]]){
    landmark({x,z,r:2.1,h:4.2,type:'labwall',rot});
   }
  }
  m.cover=cover.filter(o=>(['chapel','reactor','labwall','tank','tower','crypt','shack'].includes(o.type))||weapons.every(w=>Math.hypot(w.x-o.x,w.z-o.z)>o.r+1.22));
 });
 function spawnFor(mapIndex,isMonster,index){
  const m=maps[Math.max(0,Math.min(2,mapIndex|0))],base=isMonster?monsterSpawns[mapIndex]||monsterSpawns[0]:spawns[index%spawns.length];
  const offsets=[[0,0],[3,0],[-3,0],[0,3],[0,-3],[4,4],[-4,-4],[6,0],[-6,0],[0,6],[0,-6],[8,3],[-8,-3]];
  const previous=isMonster?[]:Array.from({length:index},(_,i)=>spawnFor(mapIndex,false,i));
  for(const [dx,dz] of offsets){const x=base[0]+dx,z=base[1]+dz;
   if(Math.hypot(x,z)>SIZE-4||previous.some(([px,pz])=>Math.hypot(px-x,pz-z)<1.9))continue;
   if(m.cover.every(o=>Math.hypot(x-o.x,z-o.z)>o.r+.95))return [x,z];
  }
  return [base[0],base[1]];
 }
 return {SIZE,maps,spawns,monsterSpawns,spawnFor,weapons};
})();
if(typeof module!=='undefined'&&module.exports)module.exports=WorldData;
