'use strict';
/* Batched environmental meshes: one call per material instead of thousands of individual props. */
const FrogyDetails=(()=>{
 const cache=[null,null,null];
 function random(seed){let s=seed>>>0;return ()=>{s=(Math.imul(s,1664525)+1013904223)>>>0;return s/4294967296;};}
 function build(t){
  const rnd=random(49127+t*9181),world=WorldData.maps[t],radius=WorldData.SIZE-2;
  const groups=Array.from({length:8},()=>({v:[],n:[],idx:[]}));
  function tri(group,a,b,c){let g=groups[group],base=g.v.length/3;if(base>65000)return;g.v.push(...a,...b,...c);let ux=b[0]-a[0],uy=b[1]-a[1],uz=b[2]-a[2],vx=c[0]-a[0],vy=c[1]-a[1],vz=c[2]-a[2];let nx=uy*vz-uz*vy,ny=uz*vx-ux*vz,nz=ux*vy-uy*vx,l=Math.hypot(nx,ny,nz)||1;g.n.push(nx/l,ny/l,nz/l,nx/l,ny/l,nz/l,nx/l,ny/l,nz/l);g.idx.push(base,base+1,base+2);}
  function flat(group,x,z,sz,a){let dx=Math.cos(a)*sz,dz=Math.sin(a)*sz,y=.014+rnd()*.015;tri(group,[x-dx,y,z-dz],[x+dz,y,z-dx],[x+dx,y,z+dz]);}
  // Thick triangular grass with three separately shaded color families.
  const grassCount=t===2?9700:17000;
  for(let i=0;i<grassCount;i++){
   let x=(rnd()-.5)*2*radius,z=(rnd()-.5)*2*radius;if(Math.hypot(x,z)>radius || (t===2&&Math.abs(x)<51&&Math.abs(z)<51))continue;
   const group=t===2?Math.floor(rnd()*3):Math.floor(rnd()*4),h=(t===2?.10:.16)+rnd()*(t===0?.58:.37),w=.016+rnd()*.034;
   const angle=rnd()*Math.PI*2,c=Math.cos(angle),s=Math.sin(angle),bend=(rnd()-.5)*.20;
   tri(group,[x-c*w,.012,z-s*w],[x+c*w,.012,z+s*w],[x+bend+.04*s,h,z+bend-.04*c]);
  }
  // Rotting leaves, bark shreds, scattered gravel and moss patches.
  for(let i=0;i<5500;i++){
   const x=(rnd()-.5)*2*radius,z=(rnd()-.5)*2*radius;if(Math.hypot(x,z)>radius || (t===2&&Math.abs(x)<51&&Math.abs(z)<51))continue;
   flat(t===2?5:(rnd()<.45?4:5),x,z,.025+rnd()*.19,rnd()*6.28);
  }
  // Scrub bushes, dead reeds and bracken that break up silhouettes for hiding.
  for(let i=0;i<3200;i++){
   let x=(rnd()-.5)*2*radius,z=(rnd()-.5)*2*radius;if(Math.hypot(x,z)>radius || (t===2&&Math.abs(x)<51&&Math.abs(z)<51))continue;
   if(t===2&&Math.abs(x)<51&&Math.abs(z)<51)continue;
   const h=.38+rnd()*1.1,w=.13+rnd()*.25,a=rnd()*6.28,c=Math.cos(a),s=Math.sin(a),y=.015;
   tri(t===0?3:6,[x-w*c,y,z-w*s],[x+w*c,y,z+w*s],[x+.17*s,h,z-.17*c]);
   if(i%3===0)tri(t===0?2:5,[x-w*s,y,z+w*c],[x+w*s,y,z-w*c],[x+.18*c,h*.85,z+.18*s]);
  }
  // Extra map-specific silhouettes: thorn hedges, debris, rusty junk.
  for(const o of world.cover){
   if(o.type==='tree'&&t!==2){for(let i=0;i<25;i++){const a=rnd()*6.28,r=o.r*(.8+rnd()*2.4),x=o.x+Math.cos(a)*r,z=o.z+Math.sin(a)*r;if(Math.hypot(x,z)>radius || (t===2&&Math.abs(x)<51&&Math.abs(z)<51))continue;const h=.32+rnd()*.75;tri(3,[x-.085,.02,z],[x+.085,.02,z],[x+(rnd()-.5)*.23,h,z+(rnd()-.5)*.21]);}}
   if(t===1&&(o.type==='grave'||o.type==='crypt')){for(let i=0;i<9;i++){let a=i*6.28/9,r=o.r*(1.2+rnd()*1.8),x=o.x+Math.sin(a)*r,z=o.z+Math.cos(a)*r;flat(5,x,z,.10+rnd()*.38,a);}}
   if(t===2){for(let i=0;i<12;i++){let a=rnd()*6.28,r=o.r*(1.2+rnd()*2),x=o.x+Math.sin(a)*r,z=o.z+Math.cos(a)*r;flat(7,x,z,.12+rnd()*.30,a);}}
  }
  const colors=t===0?[
   [.12,.25,.16],[.075,.19,.14],[.22,.27,.16],[.09,.16,.12],[.20,.15,.11],[.09,.12,.11],[.17,.22,.15],[.18,.18,.16]
  ]:t===1?[
   [.19,.23,.21],[.13,.19,.18],[.12,.15,.17],[.17,.19,.18],[.22,.19,.17],[.21,.21,.22],[.14,.16,.15],[.18,.18,.17]
  ]:[
   [.13,.23,.21],[.11,.18,.17],[.18,.24,.19],[.19,.24,.19],[.22,.20,.17],[.17,.18,.18],[.12,.18,.15],[.31,.18,.13]
  ];
  return groups.map((g,i)=>g.idx.length?{geometry:mesh(g.v,g.n,g.idx),color:colors[i]}:null).filter(Boolean);
 }
 function drawDetail(t){if(!cache[t])cache[t]=build(t);for(const g of cache[t])draw(g.geometry,mat(0,0,0,1,1,1),g.color);}
 return {draw:drawDetail};
})();
window.FrogyDetails=FrogyDetails;
